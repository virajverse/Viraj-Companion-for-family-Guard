#!/usr/bin/env python3
"""
VirajVerse Companion Studio Server & Relay Engine
Serves WebSocket relay, Studio Web UI, and Centralized Versioned APKs.
Location: companion_studio/server.py
"""
import sys
import os
import json
import time
import glob
import tempfile
import asyncio
import logging
from aiohttp import web

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

try:
    import speech_recognition as sr
    HAS_SPEECH_RECOGNITION = True
except ImportError:
    HAS_SPEECH_RECOGNITION = False

try:
    from faster_whisper import WhisperModel
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False

import subprocess

TTS_CACHE_DIR = os.path.join(tempfile.gettempdir(), "ultron_tts_cache")
os.makedirs(TTS_CACHE_DIR, exist_ok=True)

# Active audio playback process on dev PC
_current_pc_audio_proc = None

def play_audio_locally_pc(filepath: str, text: str):
    """Plays synthesized MP3 audio on Windows PC via PowerShell MediaPlayer without blocking server."""
    global _current_pc_audio_proc
    if os.name != 'nt':
        return
    try:
        if _current_pc_audio_proc and _current_pc_audio_proc.poll() is None:
            try:
                subprocess.run(f"taskkill /F /T /PID {_current_pc_audio_proc.pid}", shell=True, capture_output=True)
            except Exception:
                pass
        sleep_sec = max(int(len(text) * 0.08) + 3, 6)
        clean_path = filepath.replace('\\', '/')
        ps_play = f"""
        Add-Type -AssemblyName PresentationCore
        $p = New-Object System.Windows.Media.MediaPlayer
        $p.Open('{clean_path}')
        $p.Play()
        Start-Sleep -Seconds {sleep_sec}
        $p.Close()
        """
        _current_pc_audio_proc = subprocess.Popen(["powershell", "-ExecutionPolicy", "Bypass", "-Command", ps_play])
    except Exception as e:
        logger.warning(f"Local PC audio playback error: {e}")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CompanionStudio")

phone_sockets = []   # Ordered list — index = device slot number (stable per session)
device_id_to_slot = {}  # device_id/fingerprint -> slot index
browser_sockets = set()
device_registry = {}  # dev_idx -> cached DEVICE_HELLO / telemetry metadata

async def safe_send_bytes(target_ws: web.WebSocketResponse, payload: bytes):
    try:
        if not target_ws.closed:
            await target_ws.send_bytes(payload)
    except Exception:
        browser_sockets.discard(target_ws)

async def safe_send_json(target_ws: web.WebSocketResponse, payload: dict):
    try:
        if not target_ws.closed:
            await target_ws.send_json(payload)
    except Exception:
        browser_sockets.discard(target_ws)

def get_local_ip_addresses():
    import socket
    ips = ["127.0.0.1"]
    try:
        hostname = socket.gethostname()
        for item in socket.getaddrinfo(hostname, None):
            ip = item[4][0]
            if "." in ip and ip not in ips and not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    return ips

import collections

class AntiDdosShield:
    """
    High-Performance Anti-DDoS, Rate Limiter & Slowloris Defense Engine.
    - Cloudflare Real IP inspection (CF-Connecting-IP / X-Forwarded-For).
    - Auto-bans abusive IPs with temporary lockout.
    - Limits requests per second (burst) and requests per minute (sustained).
    - Enforces maximum concurrent WebSocket sockets per remote IP.
    """
    def __init__(self):
        self.request_history = collections.defaultdict(list)  # ip -> list of timestamps
        self.banned_ips = {}  # ip -> unban_timestamp
        self.active_ip_connections = collections.defaultdict(int)  # ip -> count
        self.BAN_DURATION_SEC = 600  # 10 minute ban
        self.MAX_BURST_PER_SEC = 25  # Max 25 reqs in 1 second
        self.MAX_PER_MINUTE = 150    # Max 150 reqs in 60 seconds
        self.MAX_CONCURRENT_WS_PER_IP = 6  # Max simultaneous WS connections per external IP

    def get_real_ip(self, request: web.Request) -> str:
        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip.strip()
        xf = request.headers.get("X-Forwarded-For")
        if xf:
            return xf.split(",")[0].strip()
        if request.remote:
            return request.remote.strip()
        return "127.0.0.1"

    def is_whitelisted(self, ip: str) -> bool:
        if ip in ("127.0.0.1", "::1", "localhost"):
            return True
        if ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172.16."):
            return True
        return False

    def check_request(self, request: web.Request) -> tuple[bool, str]:
        ip = self.get_real_ip(request)
        if self.is_whitelisted(ip):
            return True, "WHITELISTED"

        now = time.time()

        # 1. Check if IP is currently banned
        if ip in self.banned_ips:
            if now < self.banned_ips[ip]:
                remaining = int(self.banned_ips[ip] - now)
                return False, f"BANNED (Retry after {remaining}s)"
            else:
                del self.banned_ips[ip]

        # 2. Sliding window rate limit check
        history = self.request_history[ip]
        # Keep only timestamps within last 60 seconds
        valid_history = [t for t in history if now - t < 60.0]
        valid_history.append(now)
        self.request_history[ip] = valid_history

        # Check 1-second burst count
        last_1s_count = sum(1 for t in valid_history if now - t < 1.0)
        if last_1s_count > self.MAX_BURST_PER_SEC:
            self.banned_ips[ip] = now + self.BAN_DURATION_SEC
            logger.warning(f"🛡️ [ANTI-DDOS SHIELD] IP {ip} triggered BURST FLOOD ({last_1s_count} req/s). Banned for 10 min.")
            return False, "BURST_LIMIT_EXCEEDED"

        # Check 60-second sustained count
        if len(valid_history) > self.MAX_PER_MINUTE:
            self.banned_ips[ip] = now + self.BAN_DURATION_SEC
            logger.warning(f"🛡️ [ANTI-DDOS SHIELD] IP {ip} triggered SUSTAINED FLOOD ({len(valid_history)} req/min). Banned for 10 min.")
            return False, "RATE_LIMIT_EXCEEDED"

        return True, "OK"

    def register_ws_open(self, request: web.Request) -> bool:
        ip = self.get_real_ip(request)
        if self.is_whitelisted(ip):
            return True
        current = self.active_ip_connections[ip]
        if current >= self.MAX_CONCURRENT_WS_PER_IP:
            logger.warning(f"🛡️ [ANTI-DDOS SHIELD] IP {ip} exceeded max concurrent WebSockets ({current}). Connection rejected.")
            return False
        self.active_ip_connections[ip] += 1
        return True

    def register_ws_close(self, request: web.Request):
        ip = self.get_real_ip(request)
        if ip in self.active_ip_connections and self.active_ip_connections[ip] > 0:
            self.active_ip_connections[ip] -= 1

ddos_shield = AntiDdosShield()

async def ws_handler(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse(
        max_msg_size=16 * 1024 * 1024,
        autoping=True,
        receive_timeout=60
    )
    await ws.prepare(request)

    if not ddos_shield.register_ws_open(request):
        await ws.close(code=4008, message=b"Too Many Concurrent Connections")
        return ws

    query_client = request.query.get("client", "")
    path = request.path
    user_agent = request.headers.get("User-Agent", "")
    is_browser = (query_client in ("PRO_VISION_STUDIO", "ULTRON_NEXUS", "ULTRON_NEXUS_STUDIO")) or (path == "/browser_ws") or ("Mozilla" in user_agent)

    if is_browser:
        browser_sockets.add(ws)
        logger.info(f"🌐 [Browser Studio Connected] Total browsers: {len(browser_sockets)}")
        
        # Send instant status & cached device metadata to the newly connected studio browser
        active_count = len([p for p in phone_sockets if not getattr(p, 'closed', False)])
        await safe_send_json(ws, {
            "type": "PHONE_STATUS",
            "connected": active_count > 0,
            "count": active_count
        })

        # Replay cached metadata for all active phones so new browser gets exact names/profiles immediately
        for d_idx, dev_data in list(device_registry.items()):
            if d_idx < len(phone_sockets) and not getattr(phone_sockets[d_idx], 'closed', False):
                await safe_send_json(ws, {
                    "type": "PHONE_EVENT",
                    "device_index": d_idx,
                    "data": dev_data
                })

        # Request fresh Hello metadata from all active phones
        for pws in list(phone_sockets):
            if not getattr(pws, 'closed', False):
                try:
                    await pws.send_json({"type": "DIRECT_API", "action": "GET_DEVICE_HELLO"})
                except Exception:
                    pass
    else:
        # ANDROID COMPANION PHONE SOCKET REGISTRATION
        device_index = -1
        for idx, pws in enumerate(phone_sockets):
            if getattr(pws, 'closed', False):
                phone_sockets[idx] = ws
                device_index = idx
                break
        if device_index == -1:
            phone_sockets.append(ws)
            device_index = len(phone_sockets) - 1

        active_count = len([p for p in phone_sockets if not getattr(p, 'closed', False)])
        logger.info(f"📱 [Android Phone Connected] Device #{device_index + 1} | Total active phones: {active_count}")
        
        for bws in list(browser_sockets):
            if not bws.closed:
                asyncio.create_task(safe_send_json(bws, {
                    "type": "PHONE_STATUS",
                    "connected": True,
                    "count": active_count,
                    "device_index": device_index
                }))

    frame_count = 0
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.BINARY:
                frame_count += 1
                is_audio = len(msg.data) > 0 and msg.data[0] == 2
                if frame_count % 30 == 1:
                    tag = "🎙️ [Audio Stream]" if is_audio else "📸 [Video Frame]"
                    logger.info(f"{tag} Received #{frame_count} ({len(msg.data)} bytes) -> Relaying to {len(browser_sockets)} studio browsers")

                try:
                    dev_idx = phone_sockets.index(ws) if ws in phone_sockets else 0
                except ValueError:
                    dev_idx = 0

                if len(msg.data) > 0 and msg.data[0] in (0xFB, 0xFA):
                    # Direct Peer-to-Peer Circle Call Frame (Voice 0xFB or Video 0xFA)
                    # Forward directly to all other connected peer phones
                    for pws in list(phone_sockets):
                        if pws != ws and not getattr(pws, 'closed', False):
                            asyncio.create_task(safe_send_bytes(pws, msg.data))
                    continue

                if is_audio:
                    relay_bytes = msg.data
                else:
                    # Prefix 2-byte header: 0xFD (video marker), dev_idx
                    relay_bytes = bytes([0xFD, dev_idx]) + msg.data

                for bws in list(browser_sockets):
                    if bws.closed:
                        browser_sockets.discard(bws)
                    else:
                        asyncio.create_task(safe_send_bytes(bws, relay_bytes))

            elif msg.type == web.WSMsgType.TEXT:
                data_text = msg.data
                try:
                    data = msg.json()
                except Exception:
                    data = {}

                if is_browser:
                    if data.get('type') == 'SUBSCRIBE_STREAM':
                        active_phones = [p for p in phone_sockets if not getattr(p, 'closed', False)]
                        await safe_send_json(ws, {
                            "type": "PHONE_STATUS",
                            "connected": len(active_phones) > 0,
                            "count": len(active_phones)
                        })
                        for pws in active_phones:
                            try:
                                await pws.send_json({"action": "START_STREAM"})
                            except Exception:
                                pass
                        continue
                    
                    cmd_name = data.get('action') or data.get('type')
                    target_idx = data.get('target_device_index')
                    phone_list = [p for p in phone_sockets if not getattr(p, 'closed', False)]
                    
                    if target_idx is not None and isinstance(target_idx, int) and 0 <= target_idx < len(phone_sockets) and not getattr(phone_sockets[target_idx], 'closed', False):
                        target_ws = phone_sockets[target_idx]
                        logger.info(f"🕹️ [Targeted Control → Device #{target_idx + 1}]: {cmd_name}")
                        try:
                            await target_ws.send_str(data_text)
                        except Exception as ex:
                            logger.warning(f"Failed sending targeted command to Device #{target_idx + 1}: {ex}")
                    else:
                        logger.info(f"🕹️ [Broadcast ({len(phone_list)} devices)]: {cmd_name}")
                        for pws in phone_list:
                            try:
                                await pws.send_str(data_text)
                            except Exception:
                                pass
                else:
                    msg_type = data.get('type', 'PACKET')
                    if msg_type == 'HEARTBEAT':
                        continue

                    # ── WEBSOCKET TTS SYNTHESIS REQUEST (Phone asks server to synthesize HD speech) ──
                    if msg_type == 'TTS_SYNTHESIZE_REQUEST':
                        tts_text = data.get('text', '')
                        tts_voice = data.get('voice', 'hi-IN-MadhurNeural')
                        tts_rate = data.get('rate', '+0%')
                        tts_pitch = data.get('pitch', '+0Hz')
                        play_pc = data.get('play_local_pc', False)
                        if tts_text and HAS_EDGE_TTS:
                            try:
                                fname = await synthesize_speech_helper(tts_text, tts_voice, tts_rate, tts_pitch)
                                fpath = os.path.join(TTS_CACHE_DIR, fname)
                                if play_pc:
                                    play_audio_locally_pc(fpath, tts_text)
                                audio_url = f"/static/tts/{fname}"
                                await ws.send_json({
                                    "type": "PLAY_TTS_AUDIO",
                                    "audio_url": audio_url,
                                    "text": tts_text,
                                    "voice": tts_voice
                                })
                                logger.info(f"🔊 [WS TTS Streamed]: '{tts_text[:35]}...' -> {audio_url}")
                            except Exception as ex:
                                logger.error(f"WS TTS synthesis failed: {ex}")
                        continue

                    try:
                        dev_idx = phone_sockets.index(ws)
                    except ValueError:
                        dev_idx = -1

                    # Reconcile physical phone identity to prevent ghost device slots
                    raw_dev_id = data.get('device_id') or data.get('payload', {}).get('device_name') or data.get('device_name') or data.get('device_owner')
                    if raw_dev_id:
                        if raw_dev_id in device_id_to_slot:
                            target_slot = device_id_to_slot[raw_dev_id]
                            if dev_idx != target_slot:
                                if target_slot < len(phone_sockets):
                                    old_pws = phone_sockets[target_slot]
                                    if old_pws != ws and not getattr(old_pws, 'closed', False):
                                        try:
                                            asyncio.create_task(old_pws.close())
                                        except Exception:
                                            pass
                                    phone_sockets[target_slot] = ws
                                if 0 <= dev_idx < len(phone_sockets) and dev_idx != target_slot:
                                    phone_sockets[dev_idx] = type('_ClosedSlot', (), {'closed': True})()
                                dev_idx = target_slot
                        else:
                            if dev_idx >= 0:
                                device_id_to_slot[raw_dev_id] = dev_idx

                    if dev_idx >= 0:
                        if msg_type in ('DEVICE_HELLO', 'TELEMETRY_DATA', 'SYSTEM_TELEMETRY'):
                            if dev_idx not in device_registry:
                                device_registry[dev_idx] = {}
                            if isinstance(data, dict):
                                device_registry[dev_idx].update(data)

                    if msg_type in ('CIRCLE_CALL_SIGNAL', 'SIREN_ALERT_SIGNAL'):
                        logger.info(f"📞 [Circle Signal]: {msg_type} -> {data.get('action')} from Device #{dev_idx + 1}")
                        for pws in list(phone_sockets):
                            if pws != ws and not getattr(pws, 'closed', False):
                                asyncio.create_task(pws.send_str(data_text))

                    logger.info(f"📱 [Device #{dev_idx + 1} → Browser]: {msg_type}")
                    for bws in list(browser_sockets):
                        if bws.closed:
                            browser_sockets.discard(bws)
                        else:
                            asyncio.create_task(safe_send_json(bws, {
                                "type": "PHONE_EVENT",
                                "device_index": dev_idx,
                                "data": data
                            }))

            elif msg.type == web.WSMsgType.ERROR:
                logger.error(f"WebSocket connection closed with exception {ws.exception()}")

    finally:
        if is_browser:
            browser_sockets.discard(ws)
            logger.info(f"🌐 Browser disconnected. Remaining browsers: {len(browser_sockets)}")
            if len(browser_sockets) == 0:
                logger.info("⚡ [Data Saver Active]: Zero studio browsers. Enforcing Tier-based privacy rules.")
                for d_idx, pws in enumerate(list(phone_sockets)):
                    if not getattr(pws, 'closed', False):
                        meta = device_registry.get(d_idx, {})
                        owner_name = str(meta.get('device_owner') or meta.get('payload', {}).get('device_owner') or '').lower()
                        relation = str(meta.get('relation_with_viraj') or meta.get('payload', {}).get('relation_with_viraj') or '').lower()
                        is_self_owner = (d_idx == 0) or ('viraj' in owner_name) or ('self' in relation)

                        if is_self_owner:
                            # Self Owner: Keep projection token alive in Standby Mode (0 bandwidth, instant resume)
                            try:
                                await pws.send_json({"type": "DIRECT_API", "action": "STREAM_MODE", "mode": "STANDBY"})
                                logger.info(f"👑 [Sentinel Owner]: Phone #{d_idx + 1} switched to Standby (persistent alive token).")
                            except Exception:
                                pass
                        else:
                            # Family & Friends / Guardian Tier: Full privacy freeze & stop stream
                            try:
                                await pws.send_json({"type": "DIRECT_API", "action": "STOP_SCREEN_MIRROR"})
                                await pws.send_json({"type": "DIRECT_API", "action": "STOP_CAMERA_STREAM"})
                                logger.info(f"🛡️ [Guardian Tier]: Phone #{d_idx + 1} ({owner_name or 'Family'}) stream stopped for privacy.")
                            except Exception:
                                pass
        else:
            try:
                dev_idx = phone_sockets.index(ws)
            except ValueError:
                dev_idx = -1
            if 0 <= dev_idx < len(phone_sockets):
                phone_sockets[dev_idx] = type('_ClosedSlot', (), {'closed': True})()
            active_count = len([p for p in phone_sockets if not getattr(p, 'closed', False)])
            logger.info(f"📱 Device #{dev_idx + 1} disconnected. Active phones: {active_count}")
            for bws in list(browser_sockets):
                if not bws.closed:
                    await bws.send_json({
                        "type": "DEVICE_DISCONNECTED",
                        "connected": active_count > 0,
                        "count": active_count,
                        "device_index": dev_idx
                    })

        ddos_shield.register_ws_close(request)

    return ws

def init_app() -> web.Application:
    @web.middleware
    async def anti_ddos_middleware(request, handler):
        # 1. Anti-DDoS Rate & Ban Check
        allowed, reason = ddos_shield.check_request(request)
        if not allowed:
            return web.json_response({
                "status": "FORBIDDEN",
                "error": "Too Many Requests / DDoS Protection Triggered.",
                "reason": reason
            }, status=429, headers={"Retry-After": "600"})
        return await handler(request)

    @web.middleware
    async def cors_middleware(request, handler):
        if request.method == "OPTIONS":
            return web.Response(status=200, headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            })
        try:
            resp = await handler(request)
            resp.headers["Access-Control-Allow-Origin"] = "*"
            return resp
        except Exception:
            raise

    app = web.Application(middlewares=[anti_ddos_middleware, cors_middleware], client_max_size=10 * 1024 * 1024)
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/browser_ws", ws_handler)

    suite_dir = os.path.dirname(__file__)

    def is_trusted_local_request(request: web.Request) -> bool:
        host = request.headers.get("Host", "").lower().split(":")[0]
        # Check if requested from localhost or private LAN
        if host in ("localhost", "127.0.0.1") or host.startswith("192.168.") or host.startswith("10.") or host.startswith("172."):
            return True
        # Check if explicit admin access token is provided (e.g. ?auth=viraj)
        auth_param = request.query.get("auth", "") or request.query.get("token", "")
        if auth_param in ("viraj", "boss", "ultron"):
            return True
        return False

    async def serve_index(request):
        if not is_trusted_local_request(request):
            # Return secure gateway status page on public domain
            secure_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VirajVerse Neural Gateway</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07090e; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 36px 28px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; padding: 5px 14px; border-radius: 999px; margin-bottom: 20px; text-transform: uppercase; }
        .dot { width: 7px; height: 7px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }
        h1 { font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 10px; }
        p { font-size: 13.5px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; text-align: left; }
        .stat { background: #1e293b; border-radius: 12px; padding: 12px 14px; }
        .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .stat-val { font-size: 13px; color: #cbd5e1; font-weight: 600; margin-top: 2px; }
        .footer { font-size: 11px; color: #475569; border-top: 1px solid #1e293b; padding-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge"><span class="dot"></span> RELAY ACTIVE & ENCRYPTED</div>
        <h1>VirajVerse Neural Gateway</h1>
        <p>Sovereign Cognitive Mind & Companion Telemetry Tunnel. Public controlling interfaces are restricted to authorized local nodes.</p>
        <div class="grid">
            <div class="stat"><div class="stat-label">Tunnel Protocol</div><div class="stat-val">WSS Encrypted</div></div>
            <div class="stat"><div class="stat-label">Access State</div><div class="stat-val">Protected</div></div>
        </div>
        <div class="footer">Cloudflare Secure Tunnel • Node #01 Active</div>
    </div>
</body>
</html>"""
            return web.Response(text=secure_html, content_type="text/html")

        # Local network or authenticated: serve real controlling studio
        index_file = os.path.join(suite_dir, "index.html")
        if os.path.exists(index_file):
            return web.FileResponse(index_file)
        return web.Response(status=404, text="Studio index.html not found")

    async def health_check_handler(request):
        return web.json_response({
            "status": "UP",
            "service": "ultron-companion-server",
            "version": "11.3.46",
            "timestamp": int(time.time()),
            "connected_phones": len(phone_sockets)
        })

    app.router.add_get("/health", health_check_handler)
    app.router.add_get("/api/health", health_check_handler)
    app.router.add_get("/", serve_index)

    async def serve_apk(request):
        version = request.match_info.get("version", "latest")
        apk_base = os.path.abspath(os.path.join(suite_dir, "apk"))
        
        candidates = [
            os.path.join(apk_base, version, "BrainCompanion.apk"),
            os.path.join(apk_base, "latest", "BrainCompanion.apk"),
            os.path.abspath(os.path.join(suite_dir, "..", "BrainCompanion.apk"))
        ]

        if os.path.exists(apk_base):
            for vdir in sorted(os.listdir(apk_base), reverse=True):
                vpath = os.path.join(apk_base, vdir, "BrainCompanion.apk")
                if vpath not in candidates:
                    candidates.append(vpath)

        for apk_path in candidates:
            if os.path.exists(apk_path):
                return web.FileResponse(apk_path, headers={
                    "Content-Type": "application/vnd.android.package-archive",
                    "Content-Disposition": 'attachment; filename="BrainCompanion.apk"',
                    "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0"
                })
        return web.Response(status=404, text="BrainCompanion.apk not found in repository")

    app.router.add_get("/BrainCompanion.apk", serve_apk)
    app.router.add_get("/apk/{version}/BrainCompanion.apk", serve_apk)
    app.router.add_get("/apk/latest/BrainCompanion.apk", serve_apk)

    async def notify_apk_update_handler(request):
        broadcast_msg = {
            "action": "OTA_APK_UPDATE_AVAILABLE",
            "download_url": "/BrainCompanion.apk"
        }
        notified = 0
        for pws in list(phone_sockets):
            if not pws.closed:
                try:
                    await pws.send_json(broadcast_msg)
                    notified += 1
                except Exception as e:
                    logger.warning(f"Failed sending update notification to phone: {e}")
        logger.info(f"⚡ [OTA APK BROADCAST]: Notified {notified} connected phone(s) about new BrainCompanion.apk build!")
        return web.json_response({"success": True, "notified_phones": notified, "download_url": "/BrainCompanion.apk"})

    app.router.add_post("/api/notify_apk_update", notify_apk_update_handler)
    app.router.add_get("/api/notify_apk_update", notify_apk_update_handler)

    async def clean_old_apks_handler(request):
        """
        1-Click Storage Cleanup: Deletes all older versioned APK folders in companion_studio/apk/,
        keeping only the newest active version and 'latest/' pointer.
        """
        import shutil
        apk_base = os.path.abspath(os.path.join(suite_dir, "apk"))
        deleted_versions = []
        freed_bytes = 0

        if os.path.exists(apk_base):
            # Sort version folders: v11.3.1, v11.3.2, etc.
            vdirs = [d for d in os.listdir(apk_base) if os.path.isdir(os.path.join(apk_base, d)) and d.startswith("v")]
            def _vkey(s):
                try:
                    return [int(u) for u in s.replace("v", "").split(".")]
                except Exception:
                    return [0]
            vdirs.sort(key=_vkey)

            # Keep the newest 1 version, delete the older ones
            if len(vdirs) > 1:
                old_dirs = vdirs[:-1]
                for od in old_dirs:
                    target_dir = os.path.join(apk_base, od)
                    try:
                        for root, _, files in os.walk(target_dir):
                            for f in files:
                                freed_bytes += os.path.getsize(os.path.join(root, f))
                        shutil.rmtree(target_dir)
                        deleted_versions.append(od)
                    except Exception as ex:
                        logger.warning(f"Error removing old APK dir {od}: {ex}")

        # Also clean build artifacts if any
        build_aligned = os.path.abspath(os.path.join(suite_dir, "..", "Connector", "android_companion_project", "build", "aligned.apk"))
        if os.path.exists(build_aligned):
            try:
                freed_bytes += os.path.getsize(build_aligned)
                os.remove(build_aligned)
            except Exception:
                pass

        freed_mb = round(freed_bytes / (1024 * 1024), 2)
        logger.info(f"🧹 [Storage Cleanup]: Removed {len(deleted_versions)} old APK versions, freed {freed_mb} MB.")
        return web.json_response({
            "status": "SUCCESS",
            "deleted_versions": deleted_versions,
            "deleted_count": len(deleted_versions),
            "freed_mb": freed_mb,
            "message": f"Successfully deleted {len(deleted_versions)} old APK versions! Freed {freed_mb} MB storage."
        })

    app.router.add_post("/api/apk/clean_old", clean_old_apks_handler)
    app.router.add_get("/api/apk/clean_old", clean_old_apks_handler)

    async def ota_info_handler(request):
        apk_base = os.path.abspath(os.path.join(suite_dir, "apk"))
        vinfo_path = os.path.join(apk_base, "version_info.json")
        if os.path.exists(vinfo_path):
            try:
                with open(vinfo_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return web.json_response(data)
            except Exception:
                pass
        return web.json_response({"version_code": 0, "version_name": "1.0.0", "download_url": "/BrainCompanion.apk"})

    app.router.add_get("/api/ota_info", ota_info_handler)

    async def wake_phone_handler(request):
        import socket
        try:
            sock = socket.socket(socket.AF_INET, socket.SO_BROADCAST, 1)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            magic_packet = b"ULTRON_WAKEUP_PING_IMMORTAL_RESURRECT"
            sock.sendto(magic_packet, ("255.255.255.255", 9999))
            sock.close()
            logger.info("⚡ [Wake-Up Broadcast Sent]: UDP resurrection pulse sent across local network.")
            return web.json_response({"success": True, "message": "UDP wake-up pulse broadcasted successfully!"})
        except Exception as ex:
            logger.error(f"Failed sending UDP wake-up: {ex}")
            return web.json_response({"success": False, "error": str(ex)})

    app.router.add_post("/api/wake_phone", wake_phone_handler)
    app.router.add_get("/api/wake_phone", wake_phone_handler)

    _esp_ip_cache = {}

    async def esp8266_proxy_handler(request):
        import aiohttp
        path = request.match_info.get("path", "sensors")

        candidates = []
        custom_host = request.query.get("host") or os.environ.get("BRAIN_ESP_IP", "").strip()
        if custom_host:
            host_clean = custom_host.replace("http://", "").replace("https://", "").strip()
            candidates.append(f"http://{host_clean}/api/v1/{path}")

        if path in _esp_ip_cache:
            cached_url = f"http://{_esp_ip_cache[path]}/api/v1/{path}"
            if cached_url not in candidates:
                candidates.append(cached_url)

        if "http://192.168.4.1/api/v1/" + path not in candidates:
            candidates.append(f"http://192.168.4.1/api/v1/{path}")

        async with aiohttp.ClientSession() as session:
            for url in candidates:
                try:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=1.5)) as resp:
                        if resp.status == 200:
                            data = await resp.json(content_type=None)
                            winning_ip = url.split("//")[1].split("/")[0]
                            _esp_ip_cache[path] = winning_ip
                            logger.debug(f"[ESP PROXY] ✅ {url}")
                            return web.json_response(data)
                except Exception:
                    pass

            # Fast Auto-Discovery Probe if no custom IP and no cached IP
            if not custom_host and path not in _esp_ip_cache:
                local_ips = get_local_ip_addresses()
                subnet_candidates = []
                for lip in local_ips:
                    if lip != "127.0.0.1" and "." in lip:
                        prefix = ".".join(lip.split(".")[:3]) + "."
                        for i in range(1, 255):
                            candidate_ip = f"{prefix}{i}"
                            if candidate_ip != lip:
                                subnet_candidates.append(f"http://{candidate_ip}/api/v1/{path}")

                async def probe(url):
                    try:
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=0.5)) as resp:
                            if resp.status == 200:
                                data = await resp.json(content_type=None)
                                winning_ip = url.split("//")[1].split("/")[0]
                                _esp_ip_cache[path] = winning_ip
                                logger.info(f"⚡ [ESP AUTO-DISCOVERED]: Found Arduino node at http://{winning_ip}")
                                return data
                    except Exception:
                        return None

                tasks = [probe(url) for url in subnet_candidates[:50]]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for res in results:
                    if isinstance(res, dict) and res.get("online") != False:
                        return web.json_response(res)

    # ── FREE NEURAL HD EDGE-TTS SYNTHESIS ENDPOINTS ─────────────────────────
    async def synthesize_speech_helper(text: str, voice: str = "hi-IN-MadhurNeural", rate: str = "+0%", pitch: str = "+0Hz") -> str:
        if not HAS_EDGE_TTS:
            raise RuntimeError("edge-tts module is not installed.")
        
        now = time.time()
        for f in glob.glob(os.path.join(TTS_CACHE_DIR, "tts_*.mp3")):
            try:
                if now - os.path.getmtime(f) > 3600:
                    os.remove(f)
            except Exception:
                pass
        
        filename = f"tts_{int(now * 1000)}_{abs(hash(text)) % 10000}.mp3"
        filepath = os.path.join(TTS_CACHE_DIR, filename)
        
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(filepath)
        return filename

    async def tts_synthesize_handler(request: web.Request):
        try:
            data = await request.json()
            text = data.get("text", "Greetings Master Viraj")
            voice = data.get("voice", "hi-IN-MadhurNeural")
            rate = data.get("rate", "+0%")
            pitch = data.get("pitch", "+0Hz")
            target_device = data.get("target_device", data.get("device_index", 0))
            broadcast = data.get("broadcast", False)

            filename = await synthesize_speech_helper(text, voice, rate, pitch)
            audio_url = f"/static/tts/{filename}"

            tts_packet = {
                "type": "PLAY_TTS_AUDIO",
                "audio_url": audio_url,
                "text": text,
                "voice": voice
            }
            
            if broadcast:
                for pws in list(phone_sockets):
                    if not getattr(pws, 'closed', False):
                        asyncio.create_task(pws.send_json(tts_packet))
            elif target_device is not None and 0 <= target_device < len(phone_sockets):
                pws = phone_sockets[target_device]
                if not getattr(pws, 'closed', False):
                    asyncio.create_task(pws.send_json(tts_packet))

            return web.json_response({
                "status": "SUCCESS",
                "audio_url": audio_url,
                "voice": voice,
                "text": text,
                "filename": filename
            })
        except Exception as e:
            logger.error(f"TTS synthesis error: {e}")
            return web.json_response({"status": "ERROR", "error": str(e)}, status=500)

    async def tts_voices_handler(request: web.Request):
        voices = [
            {"id": "hi-IN-MadhurNeural", "name": "Madhur (Hindi Male Neural HD)", "lang": "hi-IN", "gender": "Male"},
            {"id": "hi-IN-SwaraNeural", "name": "Swara (Hindi Female Neural HD)", "lang": "hi-IN", "gender": "Female"},
            {"id": "en-US-ChristopherNeural", "name": "Christopher (Ultron AI Male Neural HD)", "lang": "en-US", "gender": "Male"},
            {"id": "en-US-GuyNeural", "name": "Guy (Natural English Male HD)", "lang": "en-US", "gender": "Male"},
            {"id": "en-US-JennyNeural", "name": "Jenny (Natural English Female HD)", "lang": "en-US", "gender": "Female"},
            {"id": "en-IN-PrabhatNeural", "name": "Prabhat (Indian English Male HD)", "lang": "en-IN", "gender": "Male"},
            {"id": "en-IN-NeerjaNeural", "name": "Neerja (Indian English Female HD)", "lang": "en-IN", "gender": "Female"}
        ]
        return web.json_response({"status": "SUCCESS", "voices": voices})

    async def serve_tts_static(request: web.Request):
        filename = request.match_info.get("filename", "")
        filepath = os.path.join(TTS_CACHE_DIR, filename)
        if os.path.exists(filepath):
            return web.FileResponse(filepath, headers={
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*"
            })
        return web.Response(status=404, text="Audio file not found")

    async def tts_stream_synthesize_handler(request: web.Request):
        """Streams raw MP3 audio bytes directly in response for lowest-latency client playback."""
        try:
            data = await request.json() if request.can_read_body else {}
            text = data.get("text") or request.query.get("text", "Namaste Viraj")
            voice = data.get("voice") or request.query.get("voice", "hi-IN-MadhurNeural")
            rate = data.get("rate") or request.query.get("rate", "+0%")
            pitch = data.get("pitch") or request.query.get("pitch", "+0Hz")
            play_pc = data.get("play_local_pc", False)

            filename = await synthesize_speech_helper(text, voice, rate, pitch)
            filepath = os.path.join(TTS_CACHE_DIR, filename)

            if play_pc:
                play_audio_locally_pc(filepath, text)

            return web.FileResponse(filepath, headers={
                "Content-Type": "audio/mpeg",
                "Access-Control-Allow-Origin": "*"
            })
        except Exception as e:
            return web.json_response({"status": "ERROR", "error": str(e)}, status=500)

    async def stt_handler(request: web.Request):
        """
        High-Performance, Privacy-First Speech-to-Text Endpoint.
        Accepts:
          - multipart/form-data (field 'audio' or 'file')
          - application/octet-stream (raw PCM / WAV / MP3 / OGG audio bytes)
          - application/json ({"audio_base64": "...", "language": "hi-IN"})
        Returns:
          {"status": "SUCCESS", "text": "...", "language": "hi-IN", "confidence": 0.95, "duration_ms": 120}
        """
        start_time = time.time()
        audio_bytes = b""
        language = request.query.get("lang", request.query.get("language", "en-IN"))

        # 1. Size Limit & Payload Guard (max 10MB)
        if request.content_length and request.content_length > 10 * 1024 * 1024:
            return web.json_response({"status": "ERROR", "error": "Payload exceeds 10MB limit"}, status=413)

        try:
            content_type = request.content_type.lower()
            if "multipart" in content_type:
                reader = await request.multipart()
                while True:
                    part = await reader.next()
                    if part is None:
                        break
                    if part.name in ("audio", "file", "voice"):
                        audio_bytes = await part.read()
                        break
                    elif part.name in ("lang", "language"):
                        language = (await part.text()).strip()
            elif "json" in content_type:
                data = await request.json()
                import base64
                b64 = data.get("audio_base64") or data.get("audio", "")
                if b64:
                    audio_bytes = base64.b64decode(b64)
                language = data.get("language") or data.get("lang") or language
            else:
                # Raw binary stream
                audio_bytes = await request.read()

            if not audio_bytes:
                return web.json_response({"status": "ERROR", "error": "No audio payload received"}, status=400)

            # 2. Transcription via SpeechRecognition (Google STT) with auto-fallback
            if not HAS_SPEECH_RECOGNITION:
                return web.json_response({"status": "ERROR", "error": "SpeechRecognition library not installed on server"}, status=503)

            def _sync_transcribe(raw_bytes: bytes, lang: str):
                import speech_recognition as sr
                import io
                recognizer = sr.Recognizer()
                recognizer.energy_threshold = 300
                recognizer.dynamic_energy_threshold = True

                audio_data = None
                if raw_bytes.startswith(b"RIFF"):
                    try:
                        with io.BytesIO(raw_bytes) as bio:
                            with sr.AudioFile(bio) as source:
                                audio_data = recognizer.record(source)
                    except Exception as ex:
                        logger.warning(f"Error parsing WAV header: {ex}")
                        audio_data = None

                if audio_data is None:
                    # Fallback raw 16kHz 16-bit Mono PCM
                    try:
                        audio_data = sr.AudioData(raw_bytes, 16000, 2)
                    except Exception as e:
                        logger.warning(f"Failed to wrap raw PCM: {e}")
                        return {"status": "ERROR", "text": "", "error": "Invalid audio format"}

                try:
                    text = recognizer.recognize_google(audio_data, language=lang)
                    return {"status": "SUCCESS", "text": text, "language": lang, "confidence": 0.95}
                except sr.UnknownValueError:
                    # Bidirectional fallback between en-IN and hi-IN
                    fallback_lang = "hi-IN" if lang.startswith("en") else "en-IN"
                    try:
                        text = recognizer.recognize_google(audio_data, language=fallback_lang)
                        return {"status": "SUCCESS", "text": text, "language": fallback_lang, "confidence": 0.90}
                    except Exception:
                        pass
                    return {"status": "NO_SPEECH", "text": "", "language": lang, "confidence": 0.0}
                except sr.RequestError as re:
                    logger.error(f"Google STT service error: {re}")
                    return {"status": "ERROR", "text": "", "error": f"STT backend error: {re}"}
                except Exception as e:
                    logger.error(f"STT unexpected error: {e}")
                    return {"status": "ERROR", "text": "", "error": str(e)}

            loop = asyncio.get_event_loop()
            res = await loop.run_in_executor(None, _sync_transcribe, audio_bytes, language)
            res["duration_ms"] = int((time.time() - start_time) * 1000)
            return web.json_response(res, headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            })

        except Exception as e:
            logger.error(f"STT handler error: {e}")
            return web.json_response({"status": "ERROR", "error": str(e)}, status=500, headers={
                "Access-Control-Allow-Origin": "*"
            })

    async def stt_options_handler(request: web.Request):
        return web.Response(status=200, headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        })

    app.router.add_post("/api/tts/synthesize", tts_synthesize_handler)
    app.router.add_post("/api/synthesize", tts_synthesize_handler)  # Backward-compat with Voice Studio
    app.router.add_get("/api/tts/voices", tts_voices_handler)
    app.router.add_get("/api/tts/stream", tts_stream_synthesize_handler)
    app.router.add_post("/api/tts/stream", tts_stream_synthesize_handler)
    app.router.add_get("/static/tts/{filename}", serve_tts_static)

    # ── STT SPEECH-TO-TEXT ENDPOINTS (with CORS) ──
    app.router.add_post("/stt", stt_handler)
    app.router.add_post("/api/stt", stt_handler)
    app.router.add_post("/api/stt/transcribe", stt_handler)
    app.router.add_options("/stt", stt_options_handler)
    app.router.add_options("/api/stt", stt_options_handler)
    app.router.add_options("/api/stt/transcribe", stt_options_handler)

    app.router.add_get("/api/esp8266/{path:.*}", esp8266_proxy_handler)

    # Render health check — required for cloud deployment
    async def health_handler(request):
        return web.json_response({"status": "ok", "service": "Ultrino Companion Studio"})
    app.router.add_get("/health", health_handler)

    return app

def main():
    port = int(os.environ.get("PORT", 8080))
    local_ips = get_local_ip_addresses()

    print("=" * 66)
    print(f"[SERVER INITIALIZING] VIRAJVERSE COMPANION STUDIO SERVER ON PORT {port}")
    print("=" * 66)
    print(f"[LOCAL NETWORK ACCESS (0.0.0.0:{port})]:")
    for ip in local_ips:
        print(f"   - Studio UI: http://{ip}:{port}/")
        print(f"   - WebSocket: ws://{ip}:{port}/ws")
        print(f"   - APK Pull:  http://{ip}:{port}/BrainCompanion.apk")
    print(f"[CLOUD TUNNEL]:")
    print(f"   - wss://brain-stream.taliyotechnologies.com")
    print("=" * 66)

    app = init_app()
    web.run_app(app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    main()
