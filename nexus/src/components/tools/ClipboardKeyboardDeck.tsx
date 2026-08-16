'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  Keyboard,
  Clipboard,
  Radio,
  Send,
  Download,
  Upload,
  MessageSquare,
  Sparkles,
  Volume2,
} from 'lucide-react';

export default function ClipboardKeyboardDeck() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const liveClipboard = useNexusStore((state) => state.clipboardText[selectedIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  const [textToType, setTextToType] = useState('');
  const [clipboardText, setClipboardText] = useState('');
  const [popupTitle, setPopupTitle] = useState('Ultron Sovereign Alert');
  const [popupMessage, setPopupMessage] = useState('');
  const [speakTts, setSpeakTts] = useState(true);

  // Auto-fetch clipboard on mount
  React.useEffect(() => {
    nexusWs.sendDirectApi('GET_CLIPBOARD', {}, selectedIndex);
  }, [selectedIndex]);

  const handleInjectText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textToType) return;
    nexusWs.sendDirectApi('INPUT_TEXT', { text: textToType }, selectedIndex);
    addLog('KEYBOARD', `⌨️ Injected text into phone: "${textToType}"`);
    setTextToType('');
  };

  const handleReadClipboard = () => {
    nexusWs.sendDirectApi('GET_CLIPBOARD', {}, selectedIndex);
    addLog('CLIPBOARD', `Requested current clipboard content from Device #${selectedIndex + 1}`);
  };

  const handleSetClipboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipboardText) return;
    nexusWs.sendDirectApi('SET_CLIPBOARD', { text: clipboardText }, selectedIndex);
    addLog('CLIPBOARD', `Pushed text to phone clipboard: "${clipboardText}"`);
    setClipboardText('');
  };

  const handleDispatchPopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupMessage) return;
    nexusWs.sendDirectApi(
      'SHOW_POPUP',
      {
        title: popupTitle,
        message: popupMessage,
        speak: speakTts,
        notify: true,
      },
      selectedIndex
    );
    addLog('POPUP', `Dispatched Center Holographic Alert: "${popupMessage}" (TTS=${speakTts})`);
    setPopupMessage('');
  };

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-extrabold text-cyan-300 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Keyboard className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">REMOTE TYPING, CLIPBOARD &amp; POPUP DISPATCHER</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 shrink-0">INSTANT INJECTION</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto max-h-[580px] pr-1">
        {/* Remote Keystroke / Text Injection */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Keyboard className="w-3.5 h-3.5" /> Direct Text Injection
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Focused Field</span>
          </div>

          <form onSubmit={handleInjectText} className="flex flex-col gap-2 mt-auto">
            <textarea
              rows={2}
              value={textToType}
              onChange={(e) => setTextToType(e.target.value)}
              placeholder="Type message to inject directly into phone keyboard/chat..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
            <button
              type="submit"
              className="py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Inject into Active Field
            </button>
          </form>
        </div>

        {/* Live Clipboard Sync */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-purple-300">
              <Clipboard className="w-3.5 h-3.5" /> Live Clipboard Sync
            </span>
            <button
              onClick={handleReadClipboard}
              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
            >
              <Download className="w-3 h-3" /> Read Phone
            </button>
          </div>

          {liveClipboard && (
            <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 truncate">
              <span className="font-bold text-purple-400">Current on Phone: </span>
              <span className="font-mono">{liveClipboard}</span>
            </div>
          )}

          <form onSubmit={handleSetClipboard} className="flex flex-col gap-2 mt-auto">
            <input
              type="text"
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              placeholder="Paste text/link to push to phone clipboard..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              className="py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Push to Phone Clipboard
            </button>
          </form>
        </div>

        {/* Fullscreen Holographic Popup Alert Dispatcher */}
        <div className="col-span-1 md:col-span-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Radio className="w-3.5 h-3.5" /> Holographic Center Popup &amp; Loud Voice Announcement
            </span>
            <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={speakTts}
                onChange={(e) => setSpeakTts(e.target.checked)}
                className="rounded accent-cyan-400"
              />
              <Volume2 className="w-3 h-3 text-cyan-400" /> Loud Voice (TTS)
            </label>
          </div>

          <form onSubmit={handleDispatchPopup} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              placeholder="Popup Title..."
              className="w-full sm:w-1/3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={popupMessage}
              onChange={(e) => setPopupMessage(e.target.value)}
              placeholder="Message to display on phone screen..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> Broadcast Popup
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
