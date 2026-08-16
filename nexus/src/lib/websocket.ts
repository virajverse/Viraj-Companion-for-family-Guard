/**
 * Ultron Nexus — Enterprise Multi-Device WebSocket Relay Client
 * VirajVerse Universe #1 Brain
 */

import { useNexusStore } from './deviceStore';
import { OutboundPacket } from './types';

type VideoFrameCallback = (devIdx: number, frameBuffer: ArrayBuffer) => void;
type AudioChunkCallback = (audioData: Uint8Array) => void;

class NexusWebSocketClient {
  private ws: WebSocket | null = null;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private videoCallbacks: Set<VideoFrameCallback> = new Set();
  private audioCallbacks: Set<AudioChunkCallback> = new Set();

  public readonly CLOUD_ENDPOINT = 'wss://brain-stream.taliyotechnologies.com/ws';

  public getLocalEndpoint(): string {
    if (typeof window === 'undefined') return 'ws://127.0.0.1:8080/ws';
    let host = window.location.hostname || '127.0.0.1';
    if (host === 'localhost') host = '127.0.0.1';
    return `ws://${host}:8080/ws`;
  }

  private userIntentClosed: boolean = false;

  public connect(forceCloud: boolean = false) {
    if (typeof window === 'undefined') return;
    this.userIntentClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (!forceCloud) return;
      this.disconnect();
    }

    this.isConnecting = true;
    const baseUrl = forceCloud ? this.CLOUD_ENDPOINT : this.getLocalEndpoint();
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const ticketParam = urlParams?.get('ticket') || '';
    const authParam = urlParams?.get('auth') || '';

    let targetUrl = baseUrl.includes('?') ? `${baseUrl}&client=ULTRON_NEXUS` : `${baseUrl}?client=ULTRON_NEXUS`;
    if (ticketParam) targetUrl += `&ticket=${encodeURIComponent(ticketParam)}`;
    if (authParam) targetUrl += `&auth=${encodeURIComponent(authParam)}`;

    useNexusStore.getState().addLog('NETWORK', `Initiating connection to ${targetUrl}...`);

    try {
      this.ws = new WebSocket(targetUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnecting = false;
        useNexusStore.getState().setWsConnected(true, targetUrl);
        useNexusStore.getState().addLog('NETWORK', `⚡ Connected successfully to ${targetUrl}`);
        
        // Request fresh device metadata without auto-forcing high-bandwidth streams
        this.sendPacket({
          type: 'DIRECT_API',
          action: 'GET_DEVICE_HELLO',
          client: 'ULTRON_NEXUS_STUDIO',
          timestamp: Date.now(),
        });

        this.sendPacket({
          type: 'DIRECT_API',
          action: 'GET_TELEMETRY',
          timestamp: Date.now(),
        });

        this.startHeartbeat();
      };

      this.ws.onmessage = (evt) => {
        if (typeof evt.data === 'string') {
          try {
            const data = JSON.parse(evt.data);
            this.handleJsonMessage(data);
          } catch (e) {
            console.error('Failed to parse text message:', e);
          }
        } else if (evt.data instanceof ArrayBuffer) {
          this.handleBinaryMessage(evt.data);
        }
      };

      this.ws.onerror = () => {
        // Silently handled by onclose reconnection loop
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        useNexusStore.getState().setWsConnected(false);
        this.stopHeartbeat();

        if (!this.userIntentClosed) {
          this.scheduleReconnect();
        } else {
          useNexusStore.getState().addLog('NETWORK', `🔌 Studio Bridge Disconnected by User`);
        }
      };
    } catch (err: any) {
      this.isConnecting = false;
      useNexusStore.getState().setWsConnected(false);
      if (!this.userIntentClosed) this.scheduleReconnect();
    }
  }

  private handleJsonMessage(data: any) {
    const store = useNexusStore.getState();

    // 1. Phone Status Update from server
    if (data.type === 'PHONE_STATUS') {
      const isConnected = !!data.connected;
      const count = data.count || 0;
      const devIdx = data.device_index !== undefined ? data.device_index : 0;
      if (isConnected && count > 0) {
        store.registerDevice(devIdx, { isOnline: true });
      }
      store.addLog('SYSTEM', `📱 Active phones online: ${count}`);
      return;
    }

    // 2. Explicit Disconnect Event
    if (data.type === 'DEVICE_DISCONNECTED') {
      const disconnectedIdx = data.device_index;
      if (disconnectedIdx !== undefined && disconnectedIdx !== null) {
        store.unregisterDevice(disconnectedIdx);
        store.addLog('DEVICE', `Device #${disconnectedIdx + 1} disconnected`);
      }
      return;
    }

    // 3. Unpack PHONE_EVENT wrapper
    let packet = data;
    let sourceIdx = data.device_index !== undefined ? data.device_index : null;
    if (data.type === 'PHONE_EVENT' && data.data) {
      packet = data.data;
      if (sourceIdx !== null) packet._sourceIndex = sourceIdx;
    }

    const devIndex = packet._sourceIndex ?? sourceIdx ?? 0;

    // 4. Auto-register & sync device state
    if (packet.type === 'DEVICE_HELLO' || packet.device_id || packet.owner_name || packet.device_model) {
      store.registerDevice(devIndex, packet);
      store.addLog('HELLO', `Device #${devIndex + 1} synchronized: ${packet.device_owner || packet.owner_name || 'Viraj'}`);
    }
    
    if (packet.type === 'TELEMETRY_DATA' || packet.type === 'SYSTEM_TELEMETRY' || packet.battery_level !== undefined || packet.battery_percent !== undefined) {
      const d = packet.data || packet.telemetry || packet.payload || packet;
      store.updateTelemetry(devIndex, d);
    }
    
    if (packet.type === 'GPS_LOCATION' || packet.latitude !== undefined || packet.lat !== undefined) {
      const loc = packet.data || packet.payload || packet;
      store.updateLocation(devIndex, loc);
    }

    if (packet.type === 'GPS_HISTORY_DATA' || packet.type === 'LOCATION_HISTORY') {
      const crumbs = packet.breadcrumbs || packet.data || [];
      store.setGpsHistory(devIndex, Array.isArray(crumbs) ? crumbs : [crumbs]);
      store.addLog('TACTICAL', `📍 Loaded ${crumbs.length} Blackbox Movement Logs from Device #${devIndex + 1}`);
    }

    if (packet.type === 'LOCATION_TRAJECTORY_DATA') {
      const traj = packet.data || packet;
      if (traj && traj.compressed_base64) {
        import('@/lib/trajectoryDecoder').then(({ decompressTrajectoryPayload }) => {
          decompressTrajectoryPayload(traj.compressed_base64).then((points) => {
            store.setGpsHistory(devIndex, points);
            store.addLog(
              'TACTICAL',
              `📍 Loaded ${points.length} 50m Points (${traj.total_distance_km || 0} km, ${traj.compressed_size_bytes || 0} B) for Device #${devIndex + 1}`
            );
          });
        });
      } else if (Array.isArray(traj?.breadcrumbs)) {
        store.setGpsHistory(devIndex, traj.breadcrumbs);
      }
    }

    if (packet.type === 'THEFT_SHUTDOWN_ALERT') {
      store.addLog('ALERT', `🚨 CRITICAL THEFT ALERT: Device #${devIndex + 1} powered off at (${packet.latitude}, ${packet.longitude})!`);
      store.updateLocation(devIndex, packet);
    }

    // 5. Multi-Subsystem Real Data Dispatchers
    if (packet.type === 'INSTALLED_APPS' || packet.type === 'APPS_LIST') {
      const apps = packet.apps || packet.data || [];
      store.setInstalledApps(devIndex, apps);
      store.addLog('APPS', `Loaded ${apps.length} installed apps from Device #${devIndex + 1}`);
    }

    if (packet.type === 'SMS_THREADS' || packet.type === 'SMS_DATA' || packet.type === 'SMS_LIST') {
      const threads = packet.threads || packet.messages || packet.data || [];
      store.setSmsThreads(devIndex, threads);
      store.addLog('SMS', `Loaded ${threads.length} SMS threads/messages from Device #${devIndex + 1}`);
    }

    if (packet.type === 'APP_USAGE_DATA' || packet.type === 'SCREEN_TIME') {
      const usage = packet.data || packet;
      store.setAppUsage(devIndex, usage);
      store.addLog('ANALYTICS', `Updated App Usage & Screen Time for Device #${devIndex + 1}`);
    }

    if (packet.type === 'FILE_LIST' || packet.type === 'STORAGE_INFO') {
      const files = packet.data || packet;
      store.setFileList(devIndex, files);
      store.addLog('FILES', `Updated File System tree for Device #${devIndex + 1}`);
    }

    if (packet.type === 'WIFI_SCAN_RESULT' || packet.type === 'WIFI_INFO') {
      const nets = packet.networks || packet.data || [];
      store.setWifiNetworks(devIndex, Array.isArray(nets) ? nets : [nets]);
      store.addLog('RADIO', `Scanned Wi-Fi spectrum on Device #${devIndex + 1}`);
    }

    if (packet.type === 'RECENT_MEDIA_DATA') {
      const media = packet.media || packet.data || [];
      store.setRecentMedia(devIndex, media);
      store.addLog('MEDIA', `Received ${media.length} recent photos/media from Device #${devIndex + 1}`);
    }

    if (packet.type === 'CLIPBOARD_CONTENT') {
      const text = packet.text || packet.content || '';
      store.setClipboardText(devIndex, text);
      store.addLog('CLIPBOARD', `Read phone clipboard: "${text.substring(0, 30)}..."`);
    }

    if (packet.type === 'TELEPHONY_DATA' || packet.type === 'SIM_INFO') {
      const tel = packet.telephony || packet.data || {};
      store.setTelephonyState(devIndex, tel);
      store.addLog('RADIO', `Updated Telephony & Dual SIM carrier state`);
    }

    if (packet.type === 'CONTACTS_DATA') {
      const contacts = packet.contacts || packet.data || [];
      store.setContactsList(devIndex, contacts);
      store.addLog('CONTACTS', `Loaded ${contacts.length} contacts from Device #${devIndex + 1}`);
    }

    if (packet.type === 'NOTIFICATIONS_DATA' || packet.type === 'NOTIF_EVENT' || packet.type === 'NOTIFICATIONS') {
      const notifs = packet.notifications || packet.data || [];
      store.setNotifications(devIndex, Array.isArray(notifs) ? notifs : [notifs]);
      store.addLog('NOTIFS', `Received ${Array.isArray(notifs) ? notifs.length : 1} notification(s) from Device #${devIndex + 1}`);
    }

    if (packet.type === 'TORCH_STATE') {
      store.setTorchState(devIndex, !!packet.enabled);
      store.addLog('HARDWARE', `Torch state confirmed: ${packet.enabled ? 'ON' : 'OFF'}`);
    }

    if (packet.type === 'UNLOCK_VAULT_STATUS') {
      store.setUnlockVaultStatus(devIndex, packet);
      store.addLog('SECURITY', `Unlock Vault status synced for Device #${devIndex + 1} (Method=${packet.method}, AutoUnlock=${packet.auto_unlock_enabled})`);
    }

    if (packet.type === 'INTRUDER_PHOTO_CAPTURED' || packet.type === 'INTRUDER_SELFIE') {
      const photo = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: packet.timestamp || Date.now(),
        reason: packet.trigger_reason || packet.reason || 'FAILED_UNLOCK',
        imageBase64: packet.image_base64 || packet.image || '',
        deviceIndex: devIndex,
      };
      store.addIntruderPhoto(devIndex, photo);
      store.addLog('ALERT', `📸 [INTRUDER ALERT]: Captured snapshot from Device #${devIndex + 1}! (${photo.reason})`);
    }

    if (packet.type === 'FAKE_SHUTDOWN_STATUS') {
      const isActive = !!packet.active;
      store.setFakeShutdownState(devIndex, isActive);
      store.addLog('SECURITY', `🎭 [Fake Shutdown]: Mode is now ${isActive ? 'ACTIVE' : 'DEACTIVATED'} on Device #${devIndex + 1}`);
    }

    if (packet.type === 'AUTH_SUCCESS') {
      const authorizer = packet.authorized_by || 'Sovereign Node';
      const expireMin = packet.expires_in_sec ? Math.round(packet.expires_in_sec / 60) : 120;
      store.addLog('SECURITY', `👑 Access Verified via ${authorizer} (Active for ${expireMin} min)`);
    }

    if (packet.type === 'SECURITY_BLOCK' || packet.type === 'AUTH_FAILED') {
      store.addLog('SECURITY', `🔒 Access Blocked: 2-Hour Companion Passkey required from Mummy/Sister/Owner app.`);
    }
  }

  private handleBinaryMessage(buffer: ArrayBuffer) {
    if (buffer.byteLength < 2) return;
    const view = new Uint8Array(buffer);
    const marker = view[0];

    // 0xFD = Video Frame (Byte 0: 0xFD, Byte 1: devIdx, Rest: JPEG Frame)
    if (marker === 0xFD) {
      const devIdx = view[1];
      const frameData = buffer.slice(2);
      this.videoCallbacks.forEach((cb) => cb(devIdx, frameData));
    }
    // 0x02 = Audio PCM Stream
    else if (marker === 0x02) {
      const audioData = view.slice(1);
      this.audioCallbacks.forEach((cb) => cb(audioData));
    }
  }

  public onVideoFrame(callback: VideoFrameCallback) {
    this.videoCallbacks.add(callback);
    return () => {
      this.videoCallbacks.delete(callback);
    };
  }

  public onAudioChunk(callback: AudioChunkCallback) {
    this.audioCallbacks.add(callback);
    return () => {
      this.audioCallbacks.delete(callback);
    };
  }

  public sendPacket(packet: OutboundPacket, explicitTargetIdx: number | null = null) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      useNexusStore.getState().addLog('ERROR', 'Cannot send packet: WebSocket is disconnected.');
      return;
    }

    const store = useNexusStore.getState();
    const targetIdx = explicitTargetIdx !== null ? explicitTargetIdx : store.selectedDeviceIndex;
    const payload = { ...packet };

    if (targetIdx !== null) {
      payload.target_device_index = targetIdx;
    }

    this.ws.send(JSON.stringify(payload));
  }

  public sendDirectApi(action: string, params: Record<string, any> = {}, explicitTargetIdx: number | null = null) {
    this.sendPacket({ type: 'DIRECT_API', action, ...params }, explicitTargetIdx);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: Date.now() }));
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  public disconnect() {
    this.userIntentClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const nexusWs = new NexusWebSocketClient();
