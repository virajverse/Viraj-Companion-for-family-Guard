'use client';

import React, { useState } from 'react';
import { nexusWs } from '@/lib/websocket';
import {
  Volume2,
  VolumeX,
  Sun,
  Lock,
  Smartphone,
  PhoneCall,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function ActionDeck() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsRecipient, setSmsRecipient] = useState('');
  const [smsText, setSmsText] = useState('');

  const handleMakeCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    nexusWs.sendDirectApi('MAKE_CALL', { phone_number: phoneNumber });
  };

  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsRecipient || !smsText) return;
    nexusWs.sendDirectApi('SEND_SMS', { recipient: smsRecipient, message: smsText });
    setSmsText('');
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <span>HARDWARE CONTROLS, DIRECT DIALER & SMS DISPATCHER</span>
      </div>

      {/* 1-Click Hardware Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => nexusWs.sendDirectApi('VOLUME_UP')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
        >
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Vol Up
        </button>

        <button
          onClick={() => nexusWs.sendDirectApi('VOLUME_DOWN')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
        >
          <VolumeX className="w-3.5 h-3.5 text-cyan-400" /> Vol Down
        </button>

        <button
          onClick={() => nexusWs.sendDirectApi('SET_BRIGHTNESS_MAX')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" /> Max Brightness
        </button>

        <button
          onClick={() => nexusWs.sendDirectApi('LOCK_SCREEN')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
        >
          <Lock className="w-3.5 h-3.5 text-rose-400" /> Lock Screen
        </button>
      </div>

      {/* Direct Phone Dialer & SMS Messenger */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
        {/* Direct Call Form */}
        <form onSubmit={handleMakeCall} className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" /> Direct GSM Phone Call
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white shadow-md transition-all active:scale-95"
            >
              Dial Call
            </button>
          </div>
        </form>

        {/* SMS Messenger Form */}
        <form onSubmit={handleSendSms} className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Direct SMS Message
          </label>
          <div className="flex flex-col gap-2">
            <input
              type="tel"
              value={smsRecipient}
              onChange={(e) => setSmsRecipient(e.target.value)}
              placeholder="Recipient Phone Number"
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="Type SMS text..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-extrabold text-white shadow-md transition-all active:scale-95"
              >
                Send SMS
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
