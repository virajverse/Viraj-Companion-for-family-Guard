'use client';

import React, { useState, useEffect } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import { Shield, Send, CheckCircle2 } from 'lucide-react';

export default function RemoteProfileLock() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex);
  const devices = useNexusStore((state) => state.devices);
  const targetDevice = selectedIndex !== null ? devices[selectedIndex] : Object.values(devices)[0];

  const [ownerName, setOwnerName] = useState(targetDevice?.owner || 'Viraj');
  const [relation, setRelation] = useState(targetDevice?.relation || 'Viraj (Self)');
  const [feedback, setFeedback] = useState(targetDevice?.role || 'Primary Mobile Node');
  const [isLocked, setIsLocked] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const addLog = useNexusStore((state) => state.addLog);

  // Sync with active device updates
  useEffect(() => {
    if (targetDevice) {
      if (targetDevice.owner) setOwnerName(targetDevice.owner);
      if (targetDevice.relation) setRelation(targetDevice.relation);
      if (targetDevice.role) setFeedback(targetDevice.role);
    }
  }, [targetDevice]);

  const handleSaveProfile = () => {
    nexusWs.sendDirectApi('UPDATE_DEVICE_PROFILE', {
      owner_name: ownerName,
      relation_viraj: relation,
      feedback: feedback,
      lock_editing: isLocked,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);

    addLog(
      'PROFILE',
      `🔒 Dispatched Profile Update & Studio Lock → ${ownerName} (${relation}) [Locked=${isLocked}]`
    );
  };

  const targetLabel = targetDevice
    ? `📱 #${targetDevice.index + 1} ${targetDevice.owner || 'Viraj'} (${targetDevice.label})`
    : 'ALL DEVICES';

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>REMOTE DEVICE OWNER & RELATION LOCK MANAGER</span>
        </div>
        <div className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-300">
          Target: {targetLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Name */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Apna Naam (Owner Name)</label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="e.g. Viraj, Mom, Dad, Priya"
            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Relation */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Relation with Viraj</label>
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="Viraj (Self)">Viraj (Self)</option>
            <option value="Mom / Mummy">Mom / Mummy</option>
            <option value="Dad / Papa">Dad / Papa</option>
            <option value="Sister">Sister</option>
            <option value="Brother">Brother</option>
            <option value="Friend">Friend</option>
            <option value="Girlfriend">Girlfriend</option>
          </select>
        </div>

        {/* Feedback / Note */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Feedback / Note for Viraj</label>
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Daily phone, test node"
            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Lock Toggle & Dispatch Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
          <input
            type="checkbox"
            checked={isLocked}
            onChange={(e) => setIsLocked(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
          />
          <span>🔒 Lock editing on phone (Permanent Studio Lock)</span>
        </label>

        <button
          onClick={handleSaveProfile}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
        >
          {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Send className="w-3.5 h-3.5" />}
          {isSaved ? 'Saved & Locked!' : 'Save & Lock Remote Profile'}
        </button>
      </div>
    </div>
  );
}
