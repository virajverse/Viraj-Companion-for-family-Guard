'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import { VisionMode } from '@/lib/types';
import { Eye, Gamepad2, Camera, User, Power } from 'lucide-react';

export default function VisionDeck() {
  const activeVisionMode = useNexusStore((state) => state.activeVisionMode);
  const setVisionMode = useNexusStore((state) => state.setVisionMode);
  const addLog = useNexusStore((state) => state.addLog);

  const handleModeChange = (mode: VisionMode) => {
    setVisionMode(mode);

    if (mode === 'SCREEN_VIEW') {
      nexusWs.sendDirectApi('STOP_CAMERA_STREAM');
      nexusWs.sendDirectApi('START_SCREEN_MIRROR');
      addLog('VISION', 'Activated View-Only Screen Stream');
    } else if (mode === 'SCREEN_TOUCH') {
      nexusWs.sendDirectApi('STOP_CAMERA_STREAM');
      nexusWs.sendDirectApi('START_SCREEN_MIRROR');
      addLog('VISION', 'Activated Interactive Screen Stream (Remote Touch Active)');
    } else if (mode === 'CAM_BACK') {
      nexusWs.sendDirectApi('STOP_SCREEN_MIRROR');
      nexusWs.sendDirectApi('START_CAMERA_STREAM', { facing: 'BACK' });
      addLog('VISION', 'Activated Back Camera Perception Stream');
    } else if (mode === 'CAM_FRONT') {
      nexusWs.sendDirectApi('STOP_SCREEN_MIRROR');
      nexusWs.sendDirectApi('START_CAMERA_STREAM', { facing: 'FRONT' });
      addLog('VISION', 'Activated Front Camera (Selfie) Stream');
    } else {
      nexusWs.sendDirectApi('STOP_SCREEN_MIRROR');
      nexusWs.sendDirectApi('STOP_CAMERA_STREAM');
      addLog('VISION', 'Stopped all video feeds. Operating in Pure API Mode.');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 backdrop-blur-xl shadow-lg">
      {/* 1. View-Only */}
      <button
        onClick={() => handleModeChange('SCREEN_VIEW')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
          activeVisionMode === 'SCREEN_VIEW'
            ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105 border border-cyan-300'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
        }`}
      >
        <Eye className="w-4 h-4" /> View Only
      </button>

      {/* 2. Touch Control */}
      <button
        onClick={() => handleModeChange('SCREEN_TOUCH')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
          activeVisionMode === 'SCREEN_TOUCH'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-105 border border-emerald-300'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
        }`}
      >
        <Gamepad2 className="w-4 h-4" /> Touch Ctrl
      </button>

      {/* 3. Back Cam */}
      <button
        onClick={() => handleModeChange('CAM_BACK')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
          activeVisionMode === 'CAM_BACK'
            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 scale-105 border border-purple-300'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
        }`}
      >
        <Camera className="w-4 h-4" /> Back Cam
      </button>

      {/* 4. Front Cam */}
      <button
        onClick={() => handleModeChange('CAM_FRONT')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
          activeVisionMode === 'CAM_FRONT'
            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105 border border-pink-300'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
        }`}
      >
        <User className="w-4 h-4" /> Front Cam
      </button>

      {/* 5. Stop Feed */}
      <button
        onClick={() => handleModeChange('STOP')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
          activeVisionMode === 'STOP'
            ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30 scale-105 border border-rose-400'
            : 'text-slate-300 hover:text-rose-400 hover:bg-slate-800/80'
        }`}
      >
        <Power className="w-4 h-4" /> Stop Feed
      </button>
    </div>
  );
}
