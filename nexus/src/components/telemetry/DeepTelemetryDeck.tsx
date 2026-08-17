'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  Battery,
  Flame,
  HardDrive,
  Cpu,
  Wifi,
  Zap,
  Activity,
  Gauge,
} from 'lucide-react';

export default function DeepTelemetryDeck() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const targetDevice = useNexusStore((state) => state.devices[selectedIndex]);

  // Query real device telemetry on mount / node switch
  React.useEffect(() => {
    nexusWs.sendDirectApi('GET_TELEMETRY', {}, selectedIndex);
  }, [selectedIndex]);

  const battery = targetDevice?.batteryPercent;
  const temp = targetDevice?.batteryTempC;
  const ramUsed = targetDevice?.ramUsedMb;
  const storageFree = targetDevice?.storageFreeGb;
  const isCharging = targetDevice?.isCharging;
  const wifiSsid = targetDevice?.wifiSsid;

  return (
    <div className="glass-card cyber-bracket p-3.5 flex flex-col justify-between gap-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-extrabold text-cyan-300">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span>DEEP TELEMETRY &amp; HARDWARE VITALS</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">NODE #{selectedIndex + 1}</span>
      </div>

      {/* 4 Core Vitals Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Battery Vital */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Battery className={`w-3.5 h-3.5 ${battery && battery > 20 ? 'text-emerald-400' : 'text-rose-400'}`} /> Battery
            </span>
            {isCharging && (
              <span className="flex items-center gap-1 text-[9px] text-amber-400 font-extrabold animate-pulse">
                <Zap className="w-2.5 h-2.5" /> CHARGING
              </span>
            )}
          </div>
          <div className="text-base font-black font-mono text-white flex items-baseline gap-1">
            <span>{battery !== undefined ? `${battery}%` : 'Reading...'}</span>
            <span className="text-[10px] text-slate-500 font-normal">Li-Ion</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${battery && battery > 20 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'}`}
              style={{ width: `${battery ?? 50}%` }}
            />
          </div>
        </div>

        {/* Thermal Vital */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-cyan-400" /> Thermal
            </span>
            <span className="text-[9px] text-cyan-300 font-mono font-bold">LIVE</span>
          </div>
          <div className="text-base font-black font-mono text-cyan-300 flex items-baseline gap-1">
            <span>{temp !== undefined ? `${temp}°C` : 'Active'}</span>
            <span className="text-[10px] text-slate-500 font-normal">Battery Core</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full"
              style={{ width: `${temp !== undefined ? Math.min(100, (temp / 50) * 100) : 60}%` }}
            />
          </div>
        </div>

        {/* RAM Usage Vital */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Memory
            </span>
            <span className="text-[9px] text-purple-300 font-mono">{ramUsed ? `${ramUsed} MB` : 'Dynamic'}</span>
          </div>
          <div className="text-base font-black font-mono text-purple-300">
            {ramUsed ? `${Math.round((ramUsed / 8192) * 100)}%` : 'Allocated'}
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
              style={{ width: `${ramUsed ? Math.min(100, (ramUsed / 8192) * 100) : 40}%` }}
            />
          </div>
        </div>

        {/* Storage Vital */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" /> Storage
            </span>
            <span className="text-[9px] text-amber-300 font-mono">Internal</span>
          </div>
          <div className="text-base font-black font-mono text-amber-300 truncate">
            {storageFree || 'Querying...'}
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full w-2/3" />
          </div>
        </div>
      </div>

      {/* Network & Hardware Details Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold">{wifiSsid || 'Connected (Protected Link)'}</span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span>{targetDevice?.model || 'Android Companion'}</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" /> Real-Time Telemetry
          </span>
        </div>
      </div>
    </div>
  );
}
