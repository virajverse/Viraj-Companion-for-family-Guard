'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { Smartphone, Radio } from 'lucide-react';

export default function DeviceSelector() {
  const devices = useNexusStore((state) => state.devices);
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex);
  const selectTargetDevice = useNexusStore((state) => state.selectTargetDevice);
  const addLog = useNexusStore((state) => state.addLog);

  const deviceList = Object.values(devices).sort((a, b) => a.index - b.index);
  const totalCount = deviceList.length;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'ALL') {
      selectTargetDevice(null);
      addLog('DEVICE', '📡 Target switched to ALL DEVICES (Broadcast Dual Mode)');
    } else {
      const idx = parseInt(val, 10);
      selectTargetDevice(isNaN(idx) ? null : idx);
      const dev = devices[idx];
      const label = dev ? `${dev.owner || 'Viraj'} (${dev.relation || 'Self'}) - ${dev.label}` : `Device #${idx + 1}`;
      addLog('DEVICE', `🎯 Target locked → ${label}`);
    }
  };

  // If 0 devices connected
  if (totalCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-inner backdrop-blur-md text-xs font-bold text-slate-500">
        <Radio className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
        <span>Waiting for Devices (0)</span>
      </div>
    );
  }

  // If exactly 1 device connected
  if (totalCount === 1) {
    const singleDev = deviceList[0];
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/40 shadow-inner backdrop-blur-md text-xs font-bold text-emerald-300">
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span className="truncate">Node #{singleDev.index + 1} {singleDev.owner || 'Viraj'} ({singleDev.relation || 'Self'}) - {singleDev.label}</span>
      </div>
    );
  }

  // If >= 2 devices connected (Provide Multi-Device Selection Dropdown)
  const currentValue = selectedIndex === null ? 'ALL' : String(selectedIndex);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 shadow-inner backdrop-blur-md">
      <Smartphone className="w-4 h-4 text-cyan-400 animate-pulse" />
      
      <select
        id="deviceTargetSelector"
        value={currentValue}
        onChange={handleChange}
        className="bg-transparent text-xs font-bold text-slate-100 cursor-pointer outline-none border-none pr-1 focus:ring-0"
      >
        <option value="ALL" className="bg-slate-900 text-cyan-400 font-semibold">
          Broadcast Matrix (All {totalCount} Nodes)
        </option>
        
        {deviceList.map((dev) => (
          <option key={dev.index} value={String(dev.index)} className="bg-slate-900 text-slate-100">
            Node #{dev.index + 1}: {dev.owner || 'Viraj'} [{dev.relation || 'Self'}] - {dev.label}
          </option>
        ))}
      </select>

      <span className="text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full border border-cyan-500/30">
        {totalCount}
      </span>
    </div>
  );
}
