'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import DeviceSelector from './DeviceSelector';
import {
  Zap,
  Cloud,
  Volume2,
  VolumeX,
  Trash2,
  Radio,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function Header() {
  const isWsConnected = useNexusStore((state) => state.isWsConnected);
  const isAudioStreaming = useNexusStore((state) => state.isAudioStreaming);
  const masterVolume = useNexusStore((state) => state.masterVolume);
  const setAudioStreaming = useNexusStore((state) => state.setAudioStreaming);
  const setMasterVolume = useNexusStore((state) => state.setMasterVolume);
  const addLog = useNexusStore((state) => state.addLog);

  const toggleAudio = () => {
    const next = !isAudioStreaming;
    setAudioStreaming(next);
    if (next) {
      nexusWs.sendDirectApi('START_AUDIO_STREAM');
      addLog('AUDIO', '🔊 Master Audio Stream Started & Unmuted');
    } else {
      nexusWs.sendDirectApi('STOP_AUDIO_STREAM');
      addLog('AUDIO', '🔇 Master Audio Stream Stopped & Muted');
    }
  };

  const handleWakeUp = () => {
    nexusWs.sendDirectApi('WAKE_UP_PULSE');
    addLog('SYSTEM', '⚡ Broadcasted UDP Wake-Up pulse across local LAN');
  };

  const handleCleanStorage = () => {
    nexusWs.sendDirectApi('CLEAN_STORAGE');
    addLog('SYSTEM', '🧹 Cleaning phone cache, obsolete APKs and temporary memory');
  };

  const handleCleanOldApks = async () => {
    if (!confirm('Are you sure you want to delete all older APK versions from server storage to free disk space?\n\n(The latest active version will be preserved!)')) {
      return;
    }
    try {
      addLog('SERVER', '🧹 Triggering 1-Click Server Old APKs Cleanup...');
      const res = await fetch('/api/apk/clean_old', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        addLog('SERVER', `🎉 ${data.message} (Freed ${data.freed_mb} MB)`);
        alert(`🎉 Server Storage Cleaned!\n\n${data.message}\nDeleted ${data.deleted_count} older APK versions.`);
      } else {
        addLog('SERVER', `⚠️ Cleanup: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      addLog('SERVER', `❌ Failed to clean APKs: ${err.message}`);
      alert(`Failed to clean APKs: ${err.message}`);
    }
  };

  const handleOtaUpdate = () => {
    const timestamp = Date.now();
    const cloudUrl = `https://viraj-companion-for-family-guard.onrender.com/BrainCompanion.apk?t=${timestamp}`;
    nexusWs.sendDirectApi('AUTO_UPDATE', {
      download_url: cloudUrl,
      apk_url: cloudUrl,
      timestamp,
    });
    addLog('OTA UPDATE', `🚀 OTA Update push broadcasted (t=${timestamp})`);
  };

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-950/85 backdrop-blur-2xl border-b border-cyan-500/20 shadow-2xl">
      {/* Brand Identity */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/40">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-base font-extrabold tracking-wide bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
            ULTRON NEXUS • COMMAND DECK
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Universe #1 Brain • Sovereign Multi-Device Perception Matrix
          </div>
        </div>
      </div>

      {/* Center Controls & Device Selector */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Master Audio Controller */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80">
          <button
            onClick={toggleAudio}
            title={isAudioStreaming ? 'Mute Master Audio' : 'Unmute Master Audio'}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {isAudioStreaming ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Dynamic Safe Device Target Selector */}
        <DeviceSelector />

        {/* Live Status & Bridge Connect/Disconnect Button */}
        <button
          onClick={() => {
            if (isWsConnected) {
              nexusWs.disconnect();
              addLog('SYSTEM', '🔌 Mobile Bridge Disconnected by User');
            } else {
              nexusWs.connect();
              addLog('SYSTEM', '⚡ Connecting Mobile Bridge...');
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md active:scale-95 border ${
            isWsConnected
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-500/50'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-300'
          }`}
          title={isWsConnected ? 'Click to Disconnect Bridge' : 'Click to Connect Bridge'}
        >
          <div className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
          <span>{isWsConnected ? 'Bridge Active (Online)' : 'Connect Bridge'}</span>
        </button>

        {/* Endpoint Relay Mode Switcher (Render Cloud vs Localhost) */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-700">
          <button
            onClick={() => {
              nexusWs.setTargetMode('RENDER');
              addLog('NETWORK', '☁️ Switched target relay to Render Cloud (viraj-companion-for-family-guard.onrender.com)');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              nexusWs.getTargetMode() === 'RENDER'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Connect directly to Render Cloud Server where your phone is online"
          >
            <Cloud className="w-3.5 h-3.5" /> Render Cloud
          </button>
          <button
            onClick={() => {
              nexusWs.setTargetMode('LOCAL');
              addLog('NETWORK', '💻 Switched target relay to Localhost (127.0.0.1:8080)');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              nexusWs.getTargetMode() === 'LOCAL'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Connect to local Python server (127.0.0.1:8080)"
          >
            <Radio className="w-3.5 h-3.5" /> Localhost
          </button>
        </div>

        {/* Wake-up LAN Broadcast */}
        <button
          onClick={handleWakeUp}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg border border-emerald-400/40 shadow-md transition-all active:scale-95"
        >
          <Radio className="w-3.5 h-3.5" /> ⚡ Wake Up
        </button>

        {/* 1-Click Server Old APK Cleanup */}
        <button
          onClick={handleCleanOldApks}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-lg border border-rose-400/40 shadow-md transition-all active:scale-95"
          title="Delete all older APK versions from server to free disk space"
        >
          <Trash2 className="w-3.5 h-3.5" /> 🗑️ Clean Old APKs
        </button>

        {/* 1-Click OTA Push */}
        <button
          onClick={handleOtaUpdate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg border border-purple-400/40 shadow-md transition-all active:scale-95"
        >
          <DownloadCloud className="w-3.5 h-3.5" /> 1-Click OTA
        </button>
      </div>
    </header>
  );
}
