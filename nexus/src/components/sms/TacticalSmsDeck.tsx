'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import { MessageSquare, Send, RefreshCw, User, Clock, ShieldAlert } from 'lucide-react';

export default function TacticalSmsDeck() {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const liveThreads = useNexusStore((state) => state.smsThreads[selectedIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  // Auto-fetch real SMS messages on mount and device change
  React.useEffect(() => {
    nexusWs.sendDirectApi('GET_SMS_THREADS', {}, selectedIndex);
  }, [selectedIndex]);

  const presets = [
    'I am safe and on my way.',
    '🚨 EMERGENCY: Need assistance at current location!',
    'Please call me back immediately.',
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !message) return;
    nexusWs.sendDirectApi('SEND_SMS', { recipient, message }, selectedIndex);
    addLog('SMS', `✉️ Dispatched SMS to ${recipient} from Device #${selectedIndex + 1}`);
    setMessage('');
  };

  const threadsList = Array.isArray(liveThreads) ? liveThreads : [];

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5">
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs font-bold px-1 shrink-0">
        <div className="flex items-center gap-2 text-cyan-300">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>TACTICAL REAL SMS INBOX</span>
        </div>
        <button
          onClick={() => nexusWs.sendDirectApi('GET_SMS_THREADS', {}, selectedIndex)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-cyan-400" /> Refresh ({threadsList.length})
        </button>
      </div>

      {/* Main Grid: Threads & Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto">
        {/* Threads List */}
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-48 pr-1">
          {threadsList.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 rounded-xl bg-slate-950/70 border border-slate-900 flex flex-col items-center justify-center gap-1">
              <MessageSquare className="w-5 h-5 text-slate-600 animate-pulse" />
              <span>No SMS messages synced yet. Click Refresh to query phone inbox.</span>
            </div>
          ) : (
            threadsList.map((t: any, idx: number) => {
              const sender = t.sender || t.address || 'Unknown';
              const body = t.preview || t.body || '';
              const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent';
              return (
                <div
                  key={t.id || idx}
                  onClick={() => setRecipient(sender)}
                  className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-400/50 cursor-pointer transition-all flex flex-col gap-0.5 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span className="text-cyan-300 flex items-center gap-1 truncate">
                      <User className="w-3 h-3 text-cyan-400 shrink-0" /> {sender}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">{timeStr}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{body}</p>
                </div>
              );
            })
          )}

          {/* Quick Presets */}
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[10px] font-bold text-slate-500">Quick Presets:</span>
            <div className="flex flex-wrap gap-1">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(p)}
                  className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-slate-300 truncate max-w-full text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 🛰️ Stealth Anti-Theft SMS Command Arsenal */}
          <div className="flex flex-col gap-1 mt-2 p-2 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/30 border border-rose-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-rose-300 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" /> Offline Stealth Anti-Theft SMS:
              </span>
              <span className="text-[8px] font-mono text-slate-400">0% Internet Needed</span>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {[
                { cmd: '!ULTRON_LOC', label: '📍 GPS Location Link' },
                { cmd: '!ULTRON_SIREN', label: '🚨 100% Loud Siren' },
                { cmd: '!ULTRON_LOCK', label: '🔒 Lock Device' },
                { cmd: '!ULTRON_FAKEOFF', label: '🎭 Fake Power-Off' },
                { cmd: '!ULTRON_PHOTO', label: '📸 Snap Intruder' },
              ].map((c) => (
                <button
                  key={c.cmd}
                  type="button"
                  onClick={() => {
                    setMessage(c.cmd);
                    addLog('SMS', `Prepared Stealth Command: ${c.cmd}`);
                  }}
                  className="px-1.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-rose-500/30 hover:border-rose-400 text-[9px] text-rose-200 font-mono text-left truncate flex items-center justify-between"
                >
                  <span className="truncate">{c.label}</span>
                  <span className="text-[8px] text-rose-400 font-bold ml-1">{c.cmd}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Send Form */}
        <form onSubmit={handleSend} className="flex flex-col justify-between gap-2 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs">
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient (e.g. Mom, +91...)"
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type message or click stealth command above..."
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none font-mono"
            />
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-xs font-bold text-white shadow-md transition-all active:scale-95"
          >
            <Send className="w-3 h-3" /> Send SMS
          </button>
        </form>
      </div>
    </div>
  );
}
