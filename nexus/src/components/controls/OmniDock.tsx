'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  Volume2,
  Volume1,
  Flashlight,
  Lock,
  PhoneCall,
  Terminal,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Clipboard,
} from 'lucide-react';

interface OmniDockProps {
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
}

export default function OmniDock({ isTerminalOpen, onToggleTerminal }: OmniDockProps) {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const addLog = useNexusStore((state) => state.addLog);
  const [dialNumber, setDialNumber] = useState('');
  const [showDialer, setShowDialer] = useState(false);

  const handleVolume = (direction: 'UP' | 'DOWN') => {
    nexusWs.sendDirectApi('VOLUME', { subaction: direction }, selectedIndex);
    addLog('HARDWARE', `🔊 Volume ${direction} dispatched to Device #${selectedIndex + 1}`);
  };

  const handleLock = () => {
    nexusWs.sendDirectApi('LOCK_SCREEN', {}, selectedIndex);
    addLog('HARDWARE', `🔒 Remote Screen Lock dispatched to Device #${selectedIndex + 1}`);
  };

  const handleDial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialNumber) return;
    nexusWs.sendDirectApi('DIAL_PHONE', { phone_number: dialNumber }, selectedIndex);
    addLog('DIALER', `📞 Initiating GSM Call to ${dialNumber} from Device #${selectedIndex + 1}`);
    setShowDialer(false);
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-2xl px-4">
      {/* Quick Dialer Popup */}
      {showDialer && (
        <form
          onSubmit={handleDial}
          className="pointer-events-auto p-3 rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl flex items-center gap-2 w-full max-w-sm"
        >
          <PhoneCall className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="tel"
            autoFocus
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value)}
            placeholder="Dial number (+91...)"
            className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md active:scale-95"
          >
            Call
          </button>
        </form>
      )}

      {/* Floating Glass Dock */}
      <div className="pointer-events-auto flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/50">
        <button
          onClick={() => handleVolume('UP')}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition-all active:scale-95"
          title="Hardware Volume UP"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleVolume('DOWN')}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition-all active:scale-95"
          title="Hardware Volume DOWN"
        >
          <Volume1 className="w-4 h-4" />
        </button>

        <button
          onClick={handleLock}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-all active:scale-95"
          title="Instant Remote Lock"
        >
          <Lock className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowDialer(!showDialer)}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-all active:scale-95"
          title="Direct GSM Call Dialer"
        >
          <PhoneCall className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-1" />

        {/* Terminal Toggle Button */}
        <button
          onClick={onToggleTerminal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            isTerminalOpen
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-md shadow-cyan-500/25'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Events</span>
          {isTerminalOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
