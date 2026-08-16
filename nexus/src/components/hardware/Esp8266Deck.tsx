'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { Cpu, Power, Activity, Wifi, RefreshCw, Zap } from 'lucide-react';

export default function Esp8266Deck() {
  const [nodeIp, setNodeIp] = useState('192.168.4.1');
  const [isRelayOn, setIsRelayOn] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const addLog = useNexusStore((state) => state.addLog);

  const toggleRelay = () => {
    const nextState = !isRelayOn;
    setIsRelayOn(nextState);
    addLog('ARDUINO', `⚡ Relay state toggled → ${nextState ? 'HIGH (ON)' : 'LOW (OFF)'}`);
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>⚡ ARDUINO ESP8266 LOCAL HARDWARE NODE</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
          {isOnline ? 'LOCAL AP • 192.168.4.1' : 'OFFLINE'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Node IP Config */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-amber-400" /> Node IP Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nodeIp}
              onChange={(e) => setNodeIp(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none"
            />
            <button
              onClick={() => addLog('ARDUINO', `Ping request sent to ${nodeIp}`)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              Ping
            </button>
          </div>
        </div>

        {/* Relay Controller */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Relay Switch 1
            </span>
            <span className={isRelayOn ? 'text-emerald-400' : 'text-slate-500'}>
              {isRelayOn ? 'ACTIVE (ON)' : 'OFF'}
            </span>
          </div>
          <button
            onClick={toggleRelay}
            className={`w-full py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-md active:scale-95 ${
              isRelayOn
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5 inline mr-1.5" /> Toggle Power Relay
          </button>
        </div>

        {/* ADC Sensor Telemetry */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-purple-400" /> Analog ADC (A0)
            </span>
            <span className="font-mono text-purple-300">512 / 1024</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full w-1/2" />
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>0V</span>
            <span>3.3V Max</span>
          </div>
        </div>
      </div>
    </div>
  );
}
