'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { Cpu, Power, Activity, Wifi, Zap } from 'lucide-react';

export default function EspHardwareDeck() {
  const [nodeIp, setNodeIp] = useState('192.168.4.1');
  const [isRelayOn, setIsRelayOn] = useState(false);
  const addLog = useNexusStore((state) => state.addLog);

  const toggleRelay = () => {
    const nextState = !isRelayOn;
    setIsRelayOn(nextState);
    addLog('ARDUINO', `⚡ Relay toggled → ${nextState ? 'HIGH (ON)' : 'LOW (OFF)'}`);
  };

  return (
    <div className="flex flex-col justify-between p-2 w-full h-full gap-3">
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs font-bold px-1">
        <div className="flex items-center gap-2 text-amber-300">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>ARDUINO ESP8266 HARDWARE NODE</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-400">
          LOCAL AP • 192.168.4.1
        </span>
      </div>

      {/* Grid: Config, Relay, ADC */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Node IP Config */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Wifi className="w-3 h-3 text-amber-400" /> Node IP
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={nodeIp}
              onChange={(e) => setNodeIp(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none"
            />
            <button
              onClick={() => addLog('ARDUINO', `Ping request sent to ${nodeIp}`)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200"
            >
              Ping
            </button>
          </div>
        </div>

        {/* Relay Switch */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> Relay 1
            </span>
            <span className={isRelayOn ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {isRelayOn ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
          <button
            onClick={toggleRelay}
            className={`w-full py-1.5 rounded-lg text-xs font-extrabold text-white transition-all shadow-md active:scale-95 ${
              isRelayOn
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Power className="w-3 h-3 inline mr-1" /> Toggle Power
          </button>
        </div>

        {/* ADC Sensor */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-400" /> Analog ADC (A0)
            </span>
            <span className="font-mono text-purple-300">512 / 1024</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full w-1/2" />
          </div>
          <div className="text-[9px] text-slate-500 flex justify-between">
            <span>0V</span>
            <span>3.3V Max</span>
          </div>
        </div>
      </div>
    </div>
  );
}
