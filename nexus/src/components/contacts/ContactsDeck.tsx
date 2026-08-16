'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import { Users, PhoneCall, MessageSquare, Search, RefreshCw, UserCheck } from 'lucide-react';

export default function ContactsDeck() {
  const [search, setSearch] = useState('');
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const liveContacts = useNexusStore((state) => state.contactsList[selectedIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  // Auto-fetch real contacts on mount and device change
  React.useEffect(() => {
    nexusWs.sendDirectApi('GET_CONTACTS', { query: search, limit: 100 }, selectedIndex);
  }, [selectedIndex]);

  const handleRefresh = () => {
    nexusWs.sendDirectApi('GET_CONTACTS', { query: search, limit: 100 }, selectedIndex);
    addLog('CONTACTS', `Querying phone contacts for Device #${selectedIndex + 1}`);
  };

  const handleCall = (num: string, name: string) => {
    nexusWs.sendDirectApi('DIAL_PHONE', { phone_number: num }, selectedIndex);
    addLog('DIALER', `📞 Initiating call to ${name} (${num}) from Device #${selectedIndex + 1}`);
  };

  const handleSms = (num: string, name: string) => {
    nexusWs.sendDirectApi('SEND_SMS', { recipient: num, message: 'Hello, this is Viraj.' }, selectedIndex);
    addLog('SMS', `✉️ Quick SMS dispatched to ${name} (${num})`);
  };

  const contactsList = Array.isArray(liveContacts) ? liveContacts : [];

  const filtered = contactsList.filter(
    (c: any) => (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.phone || c.number || '').includes(search)
  );

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-cyan-300 shrink-0">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>CONTACTS DIRECTORY ({contactsList.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 w-24 sm:w-32"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 hover:text-white"
            title="Refresh Contacts"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[640px] pr-1">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 rounded-xl bg-slate-950/70 border border-slate-900 flex flex-col items-center justify-center gap-1">
            <Users className="w-5 h-5 text-slate-600 animate-pulse" />
            <span>No contacts loaded yet. Click Refresh to query phonebook.</span>
          </div>
        ) : (
          filtered.map((c: any, idx: number) => {
            const phoneNum = c.phone || c.number || c.phone_number || '';
            const contactName = c.name || c.display_name || 'Contact';
            return (
              <div
                key={`contact-${c.id || ''}-${phoneNum}-${idx}`}
                className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/30 flex items-center justify-between gap-2 text-xs transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-[10px] font-bold shrink-0">
                    {contactName[0] || '#'}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-slate-200 truncate">{contactName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{phoneNum}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCall(phoneNum, contactName)}
                    className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 transition-all active:scale-95"
                    title="Call Contact"
                  >
                    <PhoneCall className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleSms(phoneNum, contactName)}
                    className="p-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 transition-all active:scale-95"
                    title="Send SMS"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
