'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  BellRing,
  ShieldCheck,
  Lock,
  BatteryCharging,
  Sparkles,
  Play,
} from 'lucide-react';

export default function MacroDeck() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const addLog = useNexusStore((state) => state.addLog);

  const runMacro = (name: string, description: string, commands: () => void) => {
    addLog('MACRO', `Executing Autonomous Macro: [${name}]`);
    commands();
  };

  const macros = [
    {
      id: 'FIND_MY_PHONE',
      name: 'Find Phone Beacon',
      desc: 'Rings 100% volume siren and flashes strobe beacon',
      icon: BellRing,
      color: 'border-amber-500/40 text-amber-300',
      action: () => {
        nexusWs.sendDirectApi('RING_PHONE', { duration_sec: 30 }, selectedIndex);
        nexusWs.sendDirectApi('FLASHLIGHT', { enable: true }, selectedIndex);
      },
    },
    {
      id: 'STEALTH_SOS',
      name: 'Stealth SOS Beacon',
      desc: 'Silently captures GPS and prepares emergency alert',
      icon: ShieldCheck,
      color: 'border-emerald-500/40 text-emerald-300',
      action: () => {
        nexusWs.sendDirectApi('GET_GPS_LOCATION', {}, selectedIndex);
        nexusWs.sendDirectApi('TAKE_SCREENSHOT', {}, selectedIndex);
      },
    },
    {
      id: 'LOCKDOWN',
      name: 'Sovereign Lockdown',
      desc: 'Instantly locks screen, mutes audio, and engages guard',
      icon: Lock,
      color: 'border-rose-500/40 text-rose-300',
      action: () => {
        nexusWs.sendDirectApi('LOCK_SCREEN', {}, selectedIndex);
        nexusWs.sendDirectApi('STOP_CAMERA_STREAM', {}, selectedIndex);
        nexusWs.sendDirectApi('STREAM_MODE', { stream_mode: 'STANDBY' }, selectedIndex);
      },
    },
    {
      id: 'BATTERY_SAVER',
      name: 'Ultra Battery Saver',
      desc: 'Drops to pure standby and reduces screen brightness',
      icon: BatteryCharging,
      color: 'border-cyan-500/40 text-cyan-300',
      action: () => {
        nexusWs.sendDirectApi('BRIGHTNESS', { level: 20 }, selectedIndex);
        nexusWs.sendDirectApi('STREAM_MODE', { stream_mode: 'STANDBY' }, selectedIndex);
      },
    },
  ];

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-extrabold text-cyan-300 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">AUTONOMOUS SECURITY MACROS</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 shrink-0">1-CLICK EXECUTION</span>
      </div>

      {/* Macros List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto max-h-[580px] pr-1">
        {macros.map((m) => {
          const IconComp = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => runMacro(m.name, m.desc, m.action)}
              className={`p-3 rounded-xl bg-slate-950/80 border ${m.color} hover:bg-slate-900 cursor-pointer transition-all flex flex-col justify-between gap-1.5 shadow-sm group active:scale-95`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-white">{m.name}</span>
                </div>
                <Play className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{m.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
