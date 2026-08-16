'use client';

import React, { useRef, useEffect } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { Crosshair, BellRing, Lock, MapPin, RefreshCw } from 'lucide-react';
import { nexusWs } from '@/lib/websocket';

export default function TacticalRadar() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex);
  const devices = useNexusStore((state) => state.devices);
  const targetDevice = selectedIndex !== null ? devices[selectedIndex] : Object.values(devices)[0];

  const hasGps = targetDevice?.latitude !== undefined && targetDevice?.longitude !== undefined;
  const lat = targetDevice?.latitude ?? 28.6139;
  const lon = targetDevice?.longitude ?? 77.209;
  const owner = targetDevice?.owner || 'Viraj';
  const relation = targetDevice?.relation || 'Self / Owner';

  // 60 FPS 2D Radar Canvas Animation Engine
  useEffect(() => {
    let animId: number;
    let angle = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(cx, cy) - 16;

      ctx.clearRect(0, 0, width, height);

      // Radar Dark Circular Background
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
      bgGrad.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      bgGrad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Concentric Range Rings
      [0.25, 0.5, 0.75, 1.0].forEach((ratio, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * ratio, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 3 ? 'rgba(6, 182, 212, 0.6)' : 'rgba(6, 182, 212, 0.18)';
        ctx.lineWidth = idx === 3 ? 1.5 : 1;
        ctx.stroke();

        // Distance Labels
        ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText(`${Math.round(ratio * 500)}m`, cx + 4, cy - maxR * ratio + 10);
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Rotating Laser Sweep Cone
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
      sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxR, 0, Math.PI / 4);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Laser Sweep Leading Edge Line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxR, 0);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // Animated Target Blip
      const blipPulse = Math.sin(Date.now() / 250) * 3 + 6;
      ctx.beginPath();
      ctx.arc(cx + 25, cy - 35, blipPulse, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      angle = (angle + 0.025) % (Math.PI * 2);
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleRingPhone = () => {
    nexusWs.sendDirectApi('TRIGGER_ALARM');
  };

  const handleSecureDevice = () => {
    nexusWs.sendDirectApi('SECURE_LOCK_DEVICE');
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
          <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>2D SCI-FI TACTICAL RADAR & FIND MY DEVICE</span>
        </div>
        <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
          👤 Target: {owner} ({relation})
        </div>
      </div>

      {/* Radar Canvas / Satellite Viewport */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/30 flex items-center justify-center shadow-inner">
        {hasGps ? (
          <iframe
            title="Google Satellite Map"
            src={`https://maps.google.com/maps?q=${lat},${lon}&t=k&z=17&ie=UTF8&iwloc=&output=embed`}
            className="w-full h-full border-0 filter contrast-125 saturate-150"
          />
        ) : (
          <canvas ref={canvasRef} width={500} height={280} className="w-full h-full" />
        )}

        {/* Tactical Coordinates Overlay */}
        <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 backdrop-blur-md">
          🛰️ LAT: {lat.toFixed(5)} • LON: {lon.toFixed(5)}
        </div>
      </div>

      {/* Find My Device 1-Click Action Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={handleRingPhone}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md transition-all active:scale-95"
        >
          <BellRing className="w-3.5 h-3.5" /> 🔔 Ring Phone
        </button>

        <button
          onClick={handleSecureDevice}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-md transition-all active:scale-95"
        >
          <Lock className="w-3.5 h-3.5" /> 🔒 Secure Device
        </button>

        <button
          onClick={() => nexusWs.sendDirectApi('REQUEST_GPS_LOCATION')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-md transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 🔄 Refresh GPS
        </button>

        <a
          href={`https://www.google.com/maps?q=${lat},${lon}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md transition-all active:scale-95 text-center"
        >
          <MapPin className="w-3.5 h-3.5" /> 🗺️ Google Maps
        </a>
      </div>
    </div>
  );
}
