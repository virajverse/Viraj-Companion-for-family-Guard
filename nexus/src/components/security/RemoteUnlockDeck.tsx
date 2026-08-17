'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  Unlock,
  Lock,
  KeyRound,
  Grid3X3,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Smartphone,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Sun,
  Trash2,
  X,
  Camera,
} from 'lucide-react';

const EMPTY_INTRUDER_LIST: any[] = [];

export default function RemoteUnlockDeck() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const targetDevice = useNexusStore((state) => state.devices[selectedIndex]);
  const vaultStatus = useNexusStore((state) => state.unlockVaultStatus[selectedIndex]);
  const rawIntruders = useNexusStore((state) => state.intruderPhotos[selectedIndex]);
  const intruderList = rawIntruders || EMPTY_INTRUDER_LIST;
  const isFakeShutdown = useNexusStore((state) => state.fakeShutdownState[selectedIndex]) ?? false;
  const addLog = useNexusStore((state) => state.addLog);

  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [patternDots, setPatternDots] = useState<number[]>([]);
  const [lockBannerMessage, setLockBannerMessage] = useState('Phone Secured by Ultron Sovereign Matrix');
  const [autoUnlockEnabled, setAutoUnlockEnabled] = useState(true);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<any | null>(null);
  const [isSirenActive, setIsSirenActive] = useState(false);

  // Auto-fetch vault status on mount
  React.useEffect(() => {
    nexusWs.sendDirectApi('GET_UNLOCK_VAULT_STATUS', {}, selectedIndex);
  }, [selectedIndex]);

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode) return;
    nexusWs.sendDirectApi('UNLOCK_SCREEN', { pin: pinCode }, selectedIndex);
    addLog('SECURITY', `Dispatched PIN Unlock to Device #${selectedIndex + 1}`);
    setPinCode('');
  };

  const handleSavePinToVault = () => {
    if (!pinCode) return;
    nexusWs.sendDirectApi('SAVE_UNLOCK_VAULT', { method: 'PIN', pin: pinCode, auto_unlock: autoUnlockEnabled }, selectedIndex);
    addLog('VAULT', `🔒 Saved Master PIN to Secure Phone Vault for Device #${selectedIndex + 1}`);
  };

  const handleDotClick = (dot: number) => {
    if (!patternDots.includes(dot)) {
      setPatternDots([...patternDots, dot]);
    }
  };

  const handleClearPattern = () => {
    setPatternDots([]);
  };

  const handleExecutePattern = () => {
    if (patternDots.length === 0) return;
    nexusWs.sendDirectApi(
      'UNLOCK_PATTERN',
      {
        pattern: patternDots,
        offset_y: 0.65,
        scale: 0.28,
      },
      selectedIndex
    );
    addLog('SECURITY', `Executed Pattern Unlock sequence [${patternDots.join(' -> ')}] on Device #${selectedIndex + 1}`);
    setPatternDots([]);
  };

  const handleSavePatternToVault = () => {
    if (patternDots.length === 0) return;
    nexusWs.sendDirectApi(
      'SAVE_UNLOCK_VAULT',
      {
        method: 'PATTERN',
        pattern: patternDots,
        auto_unlock: autoUnlockEnabled,
      },
      selectedIndex
    );
    addLog('VAULT', `🔒 Saved Pattern [${patternDots.join('-')}] to Secure Phone Vault for Device #${selectedIndex + 1}`);
  };

  const handleAutoUnlockWithVault = () => {
    nexusWs.sendDirectApi('AUTO_UNLOCK', {}, selectedIndex);
    addLog('SECURITY', `⚡ Sovereign Auto-Unlock triggered using Saved Vault Credentials`);
  };

  const handleLockWithBanner = (e: React.FormEvent) => {
    e.preventDefault();
    nexusWs.sendDirectApi('LOCK_SCREEN', { message: lockBannerMessage }, selectedIndex);
    addLog('SECURITY', `Dispatched Native Lock with Banner: "${lockBannerMessage}"`);
  };

  const handleWakeScreen = () => {
    nexusWs.sendDirectApi('WAKE_SCREEN', {}, selectedIndex);
    addLog('SECURITY', `💡 Screen Wake Signal sent to Device #${selectedIndex + 1}`);
  };

  const handleTriggerSiren = () => {
    setIsSirenActive(true);
    nexusWs.sendDirectApi('RING_PHONE', { duration_sec: 30 }, selectedIndex);
    addLog('SECURITY', `🚨 Emergency Anti-Theft Siren triggered on Device #${selectedIndex + 1} (DND Bypass)`);
  };

  const handleStopSiren = () => {
    setIsSirenActive(false);
    nexusWs.sendDirectApi('STOP_RINGING', {}, selectedIndex);
    addLog('SECURITY', `🔕 Emergency Siren stopped on Device #${selectedIndex + 1}`);
  };

  const handleClearIntruderPhotos = () => {
    useNexusStore.setState((state) => ({
      intruderPhotos: {
        ...state.intruderPhotos,
        [selectedIndex]: [],
      },
    }));
    addLog('SECURITY', `🧹 Cleared intruder photo history for Device #${selectedIndex + 1}`);
  };

  const isConfigured = vaultStatus?.configured || vaultStatus?.has_pin || vaultStatus?.has_pattern;
  const isDeviceLocked = vaultStatus?.is_device_locked ?? true;

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5 overflow-hidden">
      {/* Header & Device Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-cyan-300 shrink-0 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 truncate">
          <KeyRound className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">SOVEREIGN SECURITY &amp; ANTI-THEFT COMMAND DECK</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isDeviceLocked
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {isDeviceLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isConfigured
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            {isConfigured ? `VAULT: ${vaultStatus?.method || 'ACTIVE'}` : 'VAULT: EMPTY'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto max-h-[580px] pr-1">
        {/* 1. Sovereign Auto-Unlock Smart Assistant Vault Card */}
        <div className="col-span-1 md:col-span-2 p-3 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-white">Autonomous Voice &amp; Remote Command Auto-Unlock</span>
                <span
                  className={`text-[9px] px-2 py-0.2 rounded-full font-mono font-bold ${
                    isConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isConfigured ? `Vault Active (${vaultStatus?.method || 'PIN'})` : 'Vault Empty'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate mt-0.5">
                When phone is locked, companion auto-unlocks using saved credentials to execute voice commands and background tasks.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={handleWakeScreen}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
              title="Turn on device screen"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" /> Wake
            </button>
            <button
              onClick={handleAutoUnlockWithVault}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black transition-all shadow-md shadow-cyan-500/25 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-slate-950" /> 1-Click Auto-Unlock
            </button>
          </div>
        </div>

        {/* 2. Emergency Anti-Theft Siren & Sound Alarm Card */}
        <div className="col-span-1 md:col-span-2 p-3 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/30 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
              <Volume2 className="w-5 h-5 text-rose-400 animate-bounce" />
            </div>
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-white">Emergency Anti-Theft Siren Alarm</span>
                <span className="text-[9px] px-2 py-0.2 rounded-full font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  DND Bypass • Max Volume
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate mt-0.5">
                Bypasses Silent / DND mode and blares a 100% maximum volume emergency alarm to locate or deter thieves.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {isSirenActive ? (
              <button
                onClick={handleStopSiren}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <VolumeX className="w-4 h-4" /> Stop Siren Alarm
              </button>
            ) : (
              <button
                onClick={handleTriggerSiren}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black transition-all shadow-md shadow-rose-600/30 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" /> 🚨 Trigger Loud Siren
              </button>
            )}
          </div>
        </div>

        {/* 3. PIN / Password Vault Card */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Unlock className="w-3.5 h-3.5" /> PIN / Password Vault
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Wake &amp; Type</span>
          </div>

          <form onSubmit={handleUnlockPin} className="flex flex-col gap-2">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Enter 4-6 digit PIN or Password..."
                className="w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="submit"
                className="py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
              >
                <Unlock className="w-3 h-3" /> Unlock Now
              </button>
              <button
                type="button"
                onClick={handleSavePinToVault}
                className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" /> Save to Vault
              </button>
            </div>
          </form>

          {/* Quick PIN Presets */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-auto">
            <span>Presets:</span>
            {['1234', '0000', '1122', '2580'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPinCode(p)}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 4. 3x3 Robotic Pattern Unlock Matrix */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-purple-300">
              <Grid3X3 className="w-3.5 h-3.5" /> 3x3 Pattern Matrix Vault
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-purple-400 font-mono">
                Seq: {patternDots.length > 0 ? patternDots.join('-') : 'None'}
              </span>
              {patternDots.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearPattern}
                  className="text-slate-400 hover:text-white p-0.5"
                  title="Clear pattern dots"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                </button>
              )}
            </div>
          </div>

          {/* 3x3 Dot Grid */}
          <div className="grid grid-cols-3 gap-2 w-36 mx-auto py-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
              const isSelected = patternDots.includes(dot);
              const order = patternDots.indexOf(dot) + 1;
              return (
                <button
                  key={dot}
                  type="button"
                  onClick={() => handleDotClick(dot)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/40 scale-105 border border-purple-300'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800 hover:border-purple-400'
                  }`}
                >
                  {isSelected ? order : dot}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleExecutePattern}
              disabled={patternDots.length === 0}
              className="py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Draw Now
            </button>
            <button
              type="button"
              onClick={handleSavePatternToVault}
              disabled={patternDots.length === 0}
              className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" /> Save to Vault
            </button>
          </div>
        </div>

        {/* 5. 📸 Intruder Selfie & Failed Unlock Tracker Gallery */}
        <div className="col-span-1 md:col-span-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <Eye className="w-3.5 h-3.5" /> Intruder Selfie &amp; Unauthorized Attempt Snaps ({intruderList.length})
            </span>
            <div className="flex items-center gap-1.5">
              {intruderList.length > 0 && (
                <button
                  onClick={handleClearIntruderPhotos}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-500/40 text-[10px] text-slate-400 hover:text-rose-300 flex items-center gap-1 transition-all"
                  title="Clear photo log"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
              <button
                onClick={() => {
                  nexusWs.sendDirectApi('CAPTURE_INTRUDER', { trigger_reason: 'STUDIO_MANUAL_SNAP' }, selectedIndex);
                  addLog('SECURITY', `📸 Triggered instant silent front-cam snapshot`);
                }}
                className="px-2.5 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-500/40 text-[10px] text-indigo-200 font-bold flex items-center gap-1 transition-all active:scale-95"
              >
                <Camera className="w-3 h-3" /> Snap Now
              </button>
            </div>
          </div>

          {intruderList.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500 rounded-lg bg-slate-900/40 border border-slate-800/60 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero unauthorized lockscreen attempts detected. Device secure.</span>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto py-1">
              {intruderList.map((photo: any) => (
                <div
                  key={photo.id || photo.timestamp}
                  onClick={() => setSelectedPhotoModal(photo)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-indigo-400 cursor-pointer flex flex-col gap-1 min-w-[120px] max-w-[140px] shrink-0 transition-all hover:scale-105"
                >
                  <div className="w-full h-24 rounded bg-black overflow-hidden flex items-center justify-center">
                    {photo.imageBase64 ? (
                      <img
                        src={`data:image/jpeg;base64,${photo.imageBase64}`}
                        alt="Intruder"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <EyeOff className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-rose-400 truncate">{photo.reason || 'Attempt'}</span>
                  <span className="text-[8px] text-slate-400 font-mono">
                    {photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString() : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. 🎭 Fake Power-Off Anti-Theft Trap (Chakravyuh Mode) Card */}
        <div className="col-span-1 md:col-span-2 p-3 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 truncate">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                isFakeShutdown
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/40 animate-pulse'
                  : 'bg-slate-900 text-amber-400 border border-amber-500/30'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-white">Fake Power-Off Deception Trap (Chakravyuh Mode)</span>
                <span
                  className={`text-[9px] px-2 py-0.2 rounded-full font-mono font-bold ${
                    isFakeShutdown ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isFakeShutdown ? '⚡ TRAP ACTIVE (0% BRIGHTNESS)' : 'STANDBY'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate mt-0.5">
                Blacks out screen and mutes audio to deceive thieves, while keeping GPS blackbox tracking and CPU 100% alive. Exit: 4x Vol-Down.
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (isFakeShutdown) {
                nexusWs.sendDirectApi('STOP_FAKE_SHUTDOWN', {}, selectedIndex);
                addLog('SECURITY', `🟢 Deactivated Fake Power-Off Trap`);
              } else {
                nexusWs.sendDirectApi('START_FAKE_SHUTDOWN', {}, selectedIndex);
                addLog('SECURITY', `🎭 Triggered Fake Power-Off Anti-Theft Trap`);
              }
            }}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center gap-1.5 ${
              isFakeShutdown
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> {isFakeShutdown ? 'Exit Fake Shutdown' : 'Activate Fake Shutdown'}
          </button>
        </div>

        {/* 7. Lock Screen with Public Announcement Banner */}
        <div className="col-span-1 md:col-span-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-rose-400">
              <Lock className="w-3.5 h-3.5" /> Instant Native Lock &amp; Public Banner Announcement
            </span>
            <span className="text-[9px] text-slate-500 font-mono">DevicePolicyManager</span>
          </div>

          <form onSubmit={handleLockWithBanner} className="flex gap-2">
            <input
              type="text"
              value={lockBannerMessage}
              onChange={(e) => setLockBannerMessage(e.target.value)}
              placeholder="Public message to display on lock screen..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-400"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Lock Phone
            </button>
          </form>
        </div>
      </div>

      {/* Lightbox Modal for Intruder Snapshot Inspection */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-md w-full p-4 flex flex-col gap-3 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-400" /> Intruder Snapshot Evidence
              </span>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full aspect-square rounded-xl bg-black overflow-hidden flex items-center justify-center border border-slate-800">
              {selectedPhotoModal.imageBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${selectedPhotoModal.imageBase64}`}
                  alt="Intruder Snapshot"
                  className="w-full h-full object-contain"
                />
              ) : (
                <EyeOff className="w-12 h-12 text-slate-600" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div>⏰ Time: <span className="text-white">{selectedPhotoModal.timestamp ? new Date(selectedPhotoModal.timestamp).toLocaleString() : 'N/A'}</span></div>
              <div>⚡ Event: <span className="text-rose-400 font-bold">{selectedPhotoModal.reason || 'Unauthorized Attempt'}</span></div>
            </div>

            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
