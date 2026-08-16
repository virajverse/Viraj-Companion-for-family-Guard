# VirajVerse Companion Studio Pro Suite

Root suite for Web Studio UI, Relay Server, Cloud Tunneling, and Versioned APK Compiler.

---

## 🚀 Quick Commands

### 📍 Running from Project Root (`Brain_Mind\`)

#### 1. Launch Studio Pro (Server + Auto Browser UI)
```powershell
.venv\Scripts\python.exe companion_studio/run_studio.py
```
*Starts local relay server on port 8080 and opens Studio UI in default browser.*

#### 2. Run Relay Server Only (Local + Cloud Tunnel Ready)
```powershell
.venv\Scripts\python.exe companion_studio/server.py
```
*Starts backend WebSocket relay server supporting Local Wi-Fi network and Cloud Tunnel connections.*

#### 3. Run Production Cloud Tunnel
```powershell
cloudflared tunnel run brain-sensory-tunnel
```
*Connects local server to production domain (`wss://brain-stream.taliyotechnologies.com`).*

#### 4. Build & Sign Companion APK
```powershell
.venv\Scripts\python.exe companion_studio/build_apk.py
```
*Compiles Android APK, auto-increments version, and saves to `companion_studio/apk/`.*

---

### 📍 Running from inside `companion_studio\` folder

If you `cd companion_studio`:

```powershell
..\.venv\Scripts\python.exe run_studio.py    # Launch Studio UI + Server
..\.venv\Scripts\python.exe server.py        # Server Only
..\.venv\Scripts\python.exe build_apk.py     # Build APK
```

---

## 🌐 Endpoints & Cloud Architecture

- **Studio Web UI:** `http://localhost:8080/`
- **Local WebSocket:** `ws://<LAPTOP_IP>:8080/ws`
- **Cloud WebSocket:** `wss://brain-stream.taliyotechnologies.com/ws`
- **Cloud Browser WebSocket:** `wss://brain-stream.taliyotechnologies.com/browser_ws`
- **APK Download:** `http://localhost:8080/BrainCompanion.apk`

---

## 📂 Suite Directory Layout

- `run_studio.py` — 1-Click Studio Launcher (Server + Browser UI)
- `server.py` — WebSocket relay & HTTP server engine
- `build_apk.py` — 1-Click Android APK build compiler
- `index.html` — Multi-device Companion Studio UI frontend
- `apk/` — Centralized versioned APK builds repository (`v11.2.23/`, `latest/`)
