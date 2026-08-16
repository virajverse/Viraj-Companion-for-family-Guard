'use client';

import React, { useState } from 'react';
import { nexusWs } from '@/lib/websocket';
import { useNexusStore } from '@/lib/deviceStore';
import { MessageSquare, Send, RefreshCw, User, Clock } from 'lucide-react';

export default function SmsManager() {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const addLog = useNexusStore((state) => state.addLog);

  // Mock initial threads
  const sampleThreads = [
    { id: '1', sender: 'Mom', preview: 'Kaha ho beta? Ghar kab aaoge?', time: '10 mins ago', unread: true },
    { id: '2', sender: 'Dad', preview: 'Call me when you are free.', time: '1 hour ago', unread: false },
    { id: '3', sender: 'Bank Alert', preview: 'Txn of Rs. 500.00 completed successfully.', time: 'Yesterday', unread: false },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !message) return;
    nexusWs.sendDirectApi('SEND_SMS', { recipient, message });
    addLog('SMS', `✉️ SMS dispatched to ${recipient}: "${message}"`);
    setMessage('');
  };

  const handleFetchThreads = () => {
    nexusWs.sendDirectApi('GET_SMS_THREADS');
    addLog('SMS', 'Fetching SMS conversations from device...');
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>SMS CONVERSATION THREADS & MESSENGER</span>
        </div>
        <button
          onClick={handleFetchThreads}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-cyan-400" /> Refresh SMS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent SMS Threads List */}
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          {sampleThreads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => setRecipient(thread.sender)}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 cursor-pointer transition-all flex flex-col gap-1"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <User className="w-3 h-3" /> {thread.sender}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {thread.time}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{thread.preview}</p>
            </div>
          ))}
        </div>

        {/* Quick SMS Dispatch Form */}
        <form onSubmit={handleSend} className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-400">Recipient Contact / Phone Number</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Mom, +91 9876543210"
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />

            <label className="text-[11px] font-bold text-slate-400 mt-1">Message Content</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-extrabold text-white shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" /> Send Native SMS
          </button>
        </form>
      </div>
    </div>
  );
}
