'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import { ShieldCheck, Thermometer, Gauge, Smartphone } from 'lucide-react';

interface PhoneViewportProps {
  deviceIndex: number;
}

export default function PhoneViewport({ deviceIndex }: PhoneViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const device = useNexusStore((state) => state.devices[deviceIndex]);
  const activeVisionMode = useNexusStore((state) => state.activeVisionMode);
  const manualRotationDeg = useNexusStore((state) => state.manualRotationDeg);
  const isFillMode = useNexusStore((state) => state.isFillMode);
  const isMirrored = useNexusStore((state) => state.isMirrored);

  const [fps, setFps] = useState<number>(0);
  const [hasStream, setHasStream] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<string>('9 / 19.5');

  // FPS tracking
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());

  useEffect(() => {
    const unsubscribe = nexusWs.onVideoFrame((devIdx, frameBuffer) => {
      if (devIdx !== deviceIndex) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Track FPS
      frameCountRef.current++;
      const now = Date.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      const blob = new Blob([frameBuffer], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const isRotated = manualRotationDeg === 90 || manualRotationDeg === 270;
        const outW = isRotated ? img.height : img.width;
        const outH = isRotated ? img.width : img.height;

        canvas.width = outW;
        canvas.height = outH;
        setAspectRatio(`${outW} / ${outH}`);

        ctx.save();
        if (isMirrored) {
          ctx.translate(outW, 0);
          ctx.scale(-1, 1);
        }

        if (manualRotationDeg !== 0) {
          ctx.translate(outW / 2, outH / 2);
          ctx.rotate((manualRotationDeg * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
        } else {
          ctx.drawImage(img, 0, 0, outW, outH);
        }
        ctx.restore();

        URL.revokeObjectURL(url);
        if (!hasStream) setHasStream(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
      };

      img.src = url;
    });

    return () => {
      unsubscribe();
    };
  }, [deviceIndex, manualRotationDeg, isMirrored, hasStream]);

  // Touch handler for SCREEN_TOUCH mode
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeVisionMode !== 'SCREEN_TOUCH') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;

    nexusWs.sendDirectApi('INPUT_TAP_NORMALIZED', { x: Math.round(x), y: Math.round(y) }, deviceIndex);
  };

  const ownerLabel = device?.owner || 'Viraj';
  const relationLabel = device?.relation || 'Self / Owner';
  const modelLabel = device?.model || `Device #${deviceIndex + 1}`;
  const temp = device?.batteryTempC !== undefined ? `${device.batteryTempC}°C` : '--°C';

  return (
    <div
      ref={containerRef}
      style={{ aspectRatio }}
      className={`relative flex flex-col justify-between w-full max-w-[420px] rounded-[40px] p-3 transition-all duration-300 shadow-2xl ${
        deviceIndex === 0
          ? 'bg-slate-950 border-[6px] border-slate-800 shadow-cyan-500/20'
          : 'bg-slate-950 border-[6px] border-purple-950 shadow-purple-500/20'
      }`}
    >
      {/* Device Badge */}
      <div className="absolute top-2 left-4 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-[10px] font-extrabold text-cyan-300 shadow">
        📱 #{deviceIndex + 1} {ownerLabel} ({relationLabel})
      </div>

      {/* Dynamic Notch */}
      <div className="mx-auto w-24 h-4 bg-slate-900 rounded-full z-20 shadow-inner flex items-center justify-center">
        <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
      </div>

      {/* HUD Chips */}
      <div className="absolute top-10 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 backdrop-blur-md">
          <ShieldCheck className="w-3 h-3" /> {activeVisionMode}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 backdrop-blur-md">
            <Thermometer className="w-3 h-3" /> {temp}
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 backdrop-blur-md">
            <Gauge className="w-3 h-3" /> {fps} FPS
          </div>
        </div>
      </div>

      {/* Screen Frame Content */}
      <div className="relative flex-1 w-full h-full rounded-[28px] overflow-hidden bg-slate-900/90 flex items-center justify-center">
        {!hasStream && (
          <div className="flex flex-col items-center text-center p-6 text-slate-400">
            <Smartphone className="w-12 h-12 text-cyan-400 mb-3 animate-pulse" />
            <div className="text-sm font-bold text-white mb-1">{modelLabel}</div>
            <div className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
              Select any Vision Mode above to start real-time perception stream.
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className={`w-full h-full cursor-crosshair ${isFillMode ? 'object-cover' : 'object-contain'} ${
            !hasStream ? 'hidden' : 'block'
          }`}
        />
      </div>

      {/* Bottom Bar Indicator */}
      <div className="mx-auto w-32 h-1 bg-slate-700 rounded-full z-20 mt-1" />
    </div>
  );
}
