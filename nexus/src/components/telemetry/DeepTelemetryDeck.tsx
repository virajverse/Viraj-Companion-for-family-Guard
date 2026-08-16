'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
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

  const battery = targetDevice?.batteryPercent ?? 88;
  const temp = targetDevice?.batteryTempC ?? 33;
  const ramUsed = targetDevice?.ramUsedMb ?? 4280;
  const storageFree = targetDevice?.storageFreeGb ?? '64.5 GB';
  const isCharging = targetDevice?.isCharging ?? false;
  const wifiSsid = targetDevice?.wifiSsid ?? 'VirajVerse_Mesh_5G';

  return (
    <div className="glass-card cyber-bracket p-3.5 flex flex-col justify-between gap-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-extrabold text-cyan-300">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span>DEEP TELEMETRY & HARDWARE VITALS</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">NODE #{selectedIndex + 1}</span>
      </div>

      {/* 4 Core Vitals Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Battery Vital */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Battery className={`w-3.5 h-3.5 ${battery > 20 ? 'text-emerald-400' : 'text-rose-400'}`} /> Battery
            </span>
            {isCharging && (
              <span className="flex items-center gap-1 text-[9px] text-amber-400 font-extrabold animate-pulse">
                <Zap className="w-2.5 h-2.5" /> CHARGING
              </span>
            )}
          </div>
          <div className="text-base font-black font-mono text-white flex items-baseline gap-1">
            <span>{battery}%</span>
            <span className="text-[10px] text-slate-500 font-normal">4.1V</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${battery > 20 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'}`}
              style={{ width: `${battery}%` }}
            />
          </div>
        </div>

        {/* Thermal Vital */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-cyan-400" /> Thermal
            </span>
            <span className="text-[9px] text-cyan-300 font-mono font-bold">NORMAL</span>
          </div>
          <div className="text-base font-black font-mono text-cyan-300 flex items-baseline gap-1">
            <span>{temp}°C</span>
            <span className="text-[10px] text-slate-500 font-normal">Core</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (temp / 50) * 100)}%` }}
            />
          </div>
        </div>

        {/* RAM Usage Vital */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Memory
            </span>
            <span className="text-[9px] text-purple-300 font-mono">{(ramUsed / 1024).toFixed(1)}/8.0 GB</span>
          </div>
          <div className="text-base font-black font-mono text-purple-300">
            {Math.round((ramUsed / 8192) * 100)}%
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
              style={{ width: `${(ramUsed / 8192) * 100}%` }}
            />
          </div>
        </div>

        {/* Storage Vital */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" /> Storage
            </span>
            <span className="text-[9px] text-amber-300 font-mono">UFS 3.1</span>
          </div>
          <div className="text-base font-black font-mono text-amber-300 truncate">
            {storageFree}
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
          <span className="font-bold">{wifiSsid}</span>
          <span className="text-[10px] text-slate-500">(-48 dBm • 5GHz)</span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span>Android 14 (SDK 34)</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" /> Neural Bridge Sync
          </span>
        </div>
      </div>
    </div>
  );
}
