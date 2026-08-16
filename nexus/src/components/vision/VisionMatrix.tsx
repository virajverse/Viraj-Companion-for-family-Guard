'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import PhoneViewport from './PhoneViewport';
import VisionDeck from './VisionDeck';
import { RotateCw, Maximize2, FlipHorizontal2, Flashlight, Camera } from 'lucide-react';
import { nexusWs } from '@/lib/websocket';

export default function VisionMatrix() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex);
  const devices = useNexusStore((state) => state.devices);
  const rotateFeed = useNexusStore((state) => state.rotateFeed);
  const toggleFillMode = useNexusStore((state) => state.toggleFillMode);
  const toggleMirrorMode = useNexusStore((state) => state.toggleMirrorMode);

  const deviceIndices = Object.keys(devices).map((k) => parseInt(k, 10));
  const isBroadcastMode = selectedIndex === null;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* 5-Way Vision Mode Deck */}
      <VisionDeck />

      {/* Viewports Grid */}
      <div className="flex flex-wrap items-center justify-center gap-6 w-full my-2">
        {isBroadcastMode ? (
          // In Broadcast Mode: Show up to 2 devices side-by-side
          <>
            <PhoneViewport deviceIndex={0} />
            {deviceIndices.includes(1) && <PhoneViewport deviceIndex={1} />}
          </>
        ) : (
          // In Single Mode: Show ONLY the targeted device
          <PhoneViewport deviceIndex={selectedIndex} />
        )}
      </div>

      {/* Auxiliary Controls Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-semibold">
        <button
          onClick={rotateFeed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
        </button>

        <button
          onClick={toggleFillMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" /> Fill Aspect
        </button>

        <button
          onClick={toggleMirrorMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          <FlipHorizontal2 className="w-3.5 h-3.5" /> Mirror Feed
        </button>

        <button
          onClick={() => nexusWs.sendDirectApi('TOGGLE_FLASHLIGHT')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
        >
          <Flashlight className="w-3.5 h-3.5" /> Torch
        </button>
      </div>
    </div>
  );
}
