'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { Battery, Thermometer, HardDrive, Cpu, Wifi, Smartphone, Zap } from 'lucide-react';

export default function TelemetryHUD() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex);
  const devices = useNexusStore((state) => state.devices);
  const targetDevice = selectedIndex !== null ? devices[selectedIndex] : Object.values(devices)[0];

  const batt = targetDevice?.batteryPercent !== undefined ? `${targetDevice.batteryPercent}%` : '--%';
  const temp = targetDevice?.batteryTempC !== undefined ? `${targetDevice.batteryTempC}°C` : '--°C';
  const storage = targetDevice?.storageFreeGb || '-- GB';
  const wifi = targetDevice?.wifiSsid || 'Cellular';
  const ram = targetDevice?.ramUsedMb ? `${targetDevice.ramUsedMb} MB` : '-- MB';
  const res = targetDevice?.screenResolution || '1080x2400';
  const isCharging = !!targetDevice?.isCharging;

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>REAL-TIME SYSTEM TELEMETRY HUD</span>
        </div>
        <div className="text-xs font-bold text-slate-400">
          {targetDevice?.model || 'Device Target'}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {/* Battery */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Battery className="w-3.5 h-3.5 text-emerald-400" /> Battery
          </div>
          <div className="text-sm font-extrabold text-white flex items-center gap-1 font-mono">
            {batt} {isCharging && <span className="text-[10px] text-amber-400">⚡</span>}
          </div>
        </div>

        {/* Temperature */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" /> Temperature
          </div>
          <div className="text-sm font-extrabold text-white font-mono">{temp}</div>
        </div>

        {/* Storage */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Free Storage
          </div>
          <div className="text-sm font-extrabold text-white font-mono">{storage}</div>
        </div>

        {/* Wi-Fi */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-indigo-400" /> Network
          </div>
          <div className="text-xs font-bold text-white truncate">{wifi}</div>
        </div>

        {/* RAM */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-purple-400" /> App Memory
          </div>
          <div className="text-sm font-extrabold text-white font-mono">{ram}</div>
        </div>

        {/* Screen */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Smartphone className="w-3.5 h-3.5 text-pink-400" /> Resolution
          </div>
          <div className="text-xs font-mono text-white truncate">{res}</div>
        </div>
      </div>
    </div>
  );
}
