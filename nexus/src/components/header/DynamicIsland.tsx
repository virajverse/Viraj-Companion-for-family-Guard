'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import DeviceSelector from './DeviceSelector';
import {
  Zap,
  Volume2,
  VolumeX,
  Wifi,
  Cloud,
  ArrowUpCircle,
  Activity,
} from 'lucide-react';

export default function DynamicIsland() {
  const isWsConnected = useNexusStore((state) => state.isWsConnected);
  const activeEndpoint = useNexusStore((state) => state.activeEndpoint);
  const latencyMs = useNexusStore((state) => state.latencyMs);
  const isAudioStreaming = useNexusStore((state) => state.isAudioStreaming);
  const masterVolume = useNexusStore((state) => state.masterVolume);
  const setMasterVolume = useNexusStore((state) => state.setMasterVolume);
  const setAudioStreaming = useNexusStore((state) => state.setAudioStreaming);
  const addLog = useNexusStore((state) => state.addLog);

  const toggleAudio = () => {
    const nextState = !isAudioStreaming;
    setAudioStreaming(nextState);
    if (nextState) {
      nexusWs.sendDirectApi('START_AUDIO_STREAM');
      addLog('AUDIO', '🎙️ Master Audio Stream Engaged');
    } else {
      nexusWs.sendDirectApi('STOP_AUDIO_STREAM');
      addLog('AUDIO', '🔇 Master Audio Muted');
    }
  };

  const handlePushOta = () => {
    const timestamp = Date.now();
    nexusWs.sendPacket({
      type: 'DIRECT_API',
      action: 'UPDATE_COMPANION_APK',
      apk_url: `/BrainCompanion.apk?t=${timestamp}`,
      version_code: timestamp,
      force_install: true,
    });
    addLog('OTA UPDATE', `🚀 Broadcasted 1-Click OTA Update (t=${timestamp})`);
  };

  return (
    <header className="sticky top-2 z-50 flex items-center justify-center w-full px-4 pointer-events-none">
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 max-w-6xl w-full">
        {/* Brand & Neural Pulse */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/30 border border-cyan-400/40">
            <Zap className="w-4 h-4 text-white animate-pulse" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div className="flex flex-col">
            <div className="text-xs font-black tracking-wider bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
              ULTRON NEXUS
            </div>
            <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 text-cyan-400" />
              <span>SOVEREIGN MATRIX</span>
            </div>
          </div>
        </div>

        {/* Dynamic Safe Device Target Dropdown */}
        <div className="flex items-center">
          <DeviceSelector />
        </div>

        {/* Master Controls: Audio, Bridge, Cloud, OTA */}
        <div className="flex items-center gap-2">
          {/* Master Audio Slider */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <button
              onClick={toggleAudio}
              title={isAudioStreaming ? 'Mute Master Audio' : 'Unmute Master Audio'}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {isAudioStreaming ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="w-12 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Sovereign Bridge Toggle */}
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
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold transition-all shadow-md active:scale-95 border ${
              isWsConnected
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 hover:bg-rose-950/90 hover:text-rose-300 hover:border-rose-500/50'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-300'
            }`}
            title={isWsConnected ? 'Click to Disconnect Bridge' : 'Click to Connect Bridge'}
          >
            <div className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
            <span>{isWsConnected ? 'Bridge Active' : 'Connect Bridge'}</span>
          </button>

          {/* Cloud Endpoint Toggle */}
          <button
            onClick={() => nexusWs.connect(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-400/50 transition-all active:scale-95"
            title="Switch to Cloud Endpoint"
          >
            <Cloud className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Cloud</span>
          </button>

          {/* 1-Click OTA Push */}
          <button
            onClick={handlePushOta}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl border border-cyan-400/40 shadow-sm transition-all active:scale-95"
            title="Push 1-Click OTA Update to Connected Devices"
          >
            <ArrowUpCircle className="w-3 h-3" />
            <span className="hidden sm:inline">OTA Push</span>
          </button>
        </div>
      </div>
    </header>
  );
}
