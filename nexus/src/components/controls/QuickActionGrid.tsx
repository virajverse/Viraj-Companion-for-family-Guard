'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  Zap,
  Flashlight,
  FlashlightOff,
  Vibrate,
  Sun,
  Volume2,
  Volume1,
  Lock,
  Globe,
  Radio,
  Share2,
  Sparkles,
} from 'lucide-react';

export default function QuickActionGrid() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const storeTorch = useNexusStore((state) => state.torchState[selectedIndex]);
  const isTorchOn = storeTorch ?? false;
  const addLog = useNexusStore((state) => state.addLog);

  const [customTts, setCustomTts] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showTtsInput, setShowTtsInput] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleAction = (action: string, params: any = {}, logMsg: string = '') => {
    nexusWs.sendDirectApi(action, params, selectedIndex);
    addLog('ACTION', logMsg || `Dispatched [${action}] to Device #${selectedIndex + 1}`);
  };

  const handleToggleTorch = () => {
    const next = !isTorchOn;
    useNexusStore.getState().setTorchState(selectedIndex, next);
    handleAction('FLASHLIGHT', { enable: next }, `Flashlight ${next ? 'turned ON' : 'turned OFF'}`);
  };

  const handleSendTts = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTts) return;
    handleAction('SPEAK_TEXT', { text: customTts }, `TTS Announcement: "${customTts}"`);
    setCustomTts('');
    setShowTtsInput(false);
  };

  const handleOpenUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl) return;
    handleAction('OPEN_URL', { url: customUrl }, `Opening URL on phone: ${customUrl}`);
    setCustomUrl('');
    setShowUrlInput(false);
  };

  return (
    <div className="glass-card cyber-bracket p-3.5 flex flex-col justify-between gap-3 w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-extrabold text-cyan-300">
        <div className="flex items-center gap-1.5 truncate">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">SOVEREIGN COMMAND ARSENAL (16+ TOOLS)</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 shrink-0">INSTANT DISPATCH</span>
      </div>

      {/* Grid of 8 Tactical Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Flashlight Toggle */}
        <button
          onClick={handleToggleTorch}
          className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold active:scale-95 ${
            isTorchOn
              ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-200'
          }`}
        >
          {isTorchOn ? <Flashlight className="w-3.5 h-3.5 text-amber-400" /> : <FlashlightOff className="w-3.5 h-3.5 text-slate-400" />}
          <span className="truncate">{isTorchOn ? 'Torch OFF' : 'Torch ON'}</span>
        </button>

        {/* Vibrate Test */}
        <button
          onClick={() => handleAction('VIBRATE', { duration_ms: 1000 }, 'Vibration pulse dispatched (1s)')}
          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all flex items-center gap-2 text-xs font-bold text-slate-200 active:scale-95"
        >
          <Vibrate className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate">Vibrate</span>
        </button>

        {/* Max Brightness */}
        <button
          onClick={() => handleAction('BRIGHTNESS', { level: 255 }, 'Max Brightness 100% applied')}
          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-yellow-500/50 hover:bg-slate-900 transition-all flex items-center gap-2 text-xs font-bold text-slate-200 active:scale-95"
        >
          <Sun className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className="truncate">100% Bright</span>
        </button>

        {/* Lock Device */}
        <button
          onClick={() => handleAction('LOCK_SCREEN', {}, 'Screen locked remotely')}
          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-900 transition-all flex items-center gap-2 text-xs font-bold text-slate-200 active:scale-95"
        >
          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">Lock Screen</span>
        </button>

        {/* Volume UP */}
        <button
          onClick={() => handleAction('VOLUME', { subaction: 'UP' }, 'Volume UP')}
          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all flex items-center gap-2 text-xs font-bold text-slate-200 active:scale-95"
        >
          <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">Vol UP</span>
        </button>

        {/* Volume DOWN */}
        <button
          onClick={() => handleAction('VOLUME', { subaction: 'DOWN' }, 'Volume DOWN')}
          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all flex items-center gap-2 text-xs font-bold text-slate-200 active:scale-95"
        >
          <Volume1 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">Vol DOWN</span>
        </button>

        {/* TTS Voice Speech */}
        <button
          onClick={() => setShowTtsInput(!showTtsInput)}
          className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold active:scale-95 ${
            showTtsInput ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-cyan-400'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">Speak TTS</span>
        </button>

        {/* Open URL */}
        <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold active:scale-95 ${
            showUrlInput ? 'bg-blue-950 border-blue-400 text-blue-300' : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-blue-400'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">Open URL</span>
        </button>

        {/* 📸 Single Screenshot (0% Bandwidth) */}
        <button
          onClick={() => handleAction('TAKE_SCREENSHOT', {}, '📸 Requested On-Demand Single Screenshot (0% Bandwidth)')}
          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex items-center gap-2 text-xs font-bold text-slate-200 active:scale-95"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Snap Screen</span>
        </button>

        {/* 🚨 Emergency 100% Siren Alert */}
        <button
          onClick={() => handleAction('FIND_PHONE', { duration_sec: 30 }, '🚨 Emergency 100% Siren Triggered')}
          className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 hover:border-rose-500 hover:bg-rose-900/60 transition-all flex items-center gap-2 text-xs font-bold text-rose-200 active:scale-95 shadow-sm shadow-rose-950"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">Emergency Siren</span>
        </button>

        {/* 🎭 Fake Power-Off Anti-Theft Trap */}
        <button
          onClick={() => handleAction('START_FAKE_SHUTDOWN', {}, '🎭 Fake Power-Off Trap Triggered')}
          className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800 hover:border-amber-500 hover:bg-amber-900/40 transition-all flex items-center gap-2 text-xs font-bold text-amber-200 active:scale-95"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Fake Power-Off</span>
        </button>

        {/* 📸 Front-Cam Intruder Snap */}
        <button
          onClick={() => handleAction('CAPTURE_INTRUDER', { trigger_reason: 'STUDIO_MANUAL_SNAP' }, '📸 Dispatched Silent Front-Cam Intruder Snap')}
          className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800 hover:border-indigo-500 hover:bg-indigo-900/40 transition-all flex items-center gap-2 text-xs font-bold text-indigo-200 active:scale-95"
        >
          <Radio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">Intruder Snap</span>
        </button>
      </div>

      {/* Popups for TTS Speech and Open URL */}
      {showTtsInput && (
        <form onSubmit={handleSendTts} className="flex gap-2 p-2 rounded-xl bg-slate-950 border border-cyan-500/30">
          <input
            type="text"
            value={customTts}
            onChange={(e) => setCustomTts(e.target.value)}
            placeholder="Text to speak on phone..."
            className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black"
          >
            Speak
          </button>
        </form>
      )}

      {showUrlInput && (
        <form onSubmit={handleOpenUrl} className="flex gap-2 p-2 rounded-xl bg-slate-950 border border-blue-500/30">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-400"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
          >
            Launch
          </button>
        </form>
      )}
    </div>
  );
}
