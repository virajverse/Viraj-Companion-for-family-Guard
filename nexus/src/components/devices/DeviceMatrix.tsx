'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { Smartphone, Radio, UserCheck, ShieldCheck, Battery, Thermometer, Wifi } from 'lucide-react';

export default function DeviceMatrix() {
  const devices = useNexusStore((state) => state.devices);
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex);
  const selectTargetDevice = useNexusStore((state) => state.selectTargetDevice);

  const deviceList = Object.values(devices).sort((a, b) => a.index - b.index);

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span>CONNECTED MOBILE & HARDWARE MATRIX</span>
        </div>
        <span className="text-xs font-bold text-slate-400">
          {deviceList.length} Connected Node(s)
        </span>
      </div>

      {deviceList.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 border border-cyan-500/15 rounded-2xl">
          <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
          No phones connected yet. Launch the BrainCompanion app on your Android device.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {deviceList.map((dev) => {
            const isSelected = selectedIndex === dev.index;

            return (
              <div
                key={dev.index}
                onClick={() => selectTargetDevice(dev.index)}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                    : 'bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-400/50 hover:bg-slate-900/80'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-xs text-cyan-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <span>#{dev.index + 1} {dev.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {isSelected ? '🎯 SELECTED' : 'ONLINE'}
                  </span>
                </div>

                {/* Identity Badges */}
                <div className="flex flex-col gap-1 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>{dev.owner}</span>
                    <span className="text-slate-400 font-normal">({dev.relation})</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    🏷️ Role: <b className="text-slate-200">{dev.role}</b>
                  </div>
                </div>

                {/* Telemetry Micro Badges */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Battery className="w-3 h-3 text-emerald-400" /> {dev.batteryPercent ?? '--'}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-400" /> {dev.batteryTempC ?? '--'}°C
                  </span>
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-cyan-400" /> {dev.wifiSsid || 'Cellular'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
