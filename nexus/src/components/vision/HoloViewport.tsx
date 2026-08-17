'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  Camera,
  Smartphone,
  Eye,
  Hand,
  Maximize2,
  Minimize2,
  RotateCw,
  Zap,
  Flashlight,
  FlashlightOff,
  Square,
  Circle,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Power,
} from 'lucide-react';

interface HoloViewportProps {
  deviceIndex?: number;
}

export default function HoloViewport({ deviceIndex: propDeviceIndex }: HoloViewportProps) {
  const storeSelectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const deviceIndex = propDeviceIndex !== undefined ? propDeviceIndex : storeSelectedIndex;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenWrapperRef = useRef<HTMLDivElement | null>(null);

  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState('1080x2400');
  const [streamAspect, setStreamAspect] = useState<number>(9 / 20);
  const [isFill, setIsFill] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);

  // Visual Touch Ripple Feedback
  const [touchRipple, setTouchRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const storeTorchState = useNexusStore((state) => state.torchState[deviceIndex]);
  const isTorchOn = storeTorchState ?? false;

  // Drag-to-Swipe Tracking
  const [dragStart, setDragStart] = useState<{ normX: number; normY: number; time: number } | null>(null);

  const activeVisionMode = useNexusStore((state) => state.activeVisionMode);
  const isMirrored = useNexusStore((state) => state.isMirrored);
  const setVisionMode = useNexusStore((state) => state.setVisionMode);
  const toggleMirrorMode = useNexusStore((state) => state.toggleMirrorMode);
  const activeDevice = useNexusStore((state) => state.devices[deviceIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  // Parse phone real physical resolution (e.g. 1080x2400)
  const getDeviceDimensions = () => {
    if (activeDevice?.screenResolution) {
      const parts = activeDevice.screenResolution.split('x').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
        return { width: parts[0], height: parts[1] };
      }
    }
    const canvas = canvasRef.current;
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      return { width: canvas.width, height: canvas.height };
    }
    return { width: 1080, height: 2400 };
  };

  // Optimized Frame Listener & GPU Desynchronized Rendering
  useEffect(() => {
    let frameCount = 0;
    let animId: number | null = null;
    let latestBitmap: ImageBitmap | null = null;
    let isRendering = false;
    const lastDims = { width: 0, height: 0 };

    const fpsTimer = setInterval(() => {
      setFps(frameCount);
      frameCount = 0;
    }, 1000);

    const renderLoop = () => {
      if (latestBitmap) {
        const canvas = canvasRef.current;
        if (canvas) {
          let ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
          if (ctx) {
            if (canvas.width !== latestBitmap.width || canvas.height !== latestBitmap.height) {
              canvas.width = latestBitmap.width;
              canvas.height = latestBitmap.height;
              if (latestBitmap.height > 0 && (lastDims.width !== latestBitmap.width || lastDims.height !== latestBitmap.height)) {
                lastDims.width = latestBitmap.width;
                lastDims.height = latestBitmap.height;
                setResolution(`${latestBitmap.width}x${latestBitmap.height}`);
                setStreamAspect(latestBitmap.width / latestBitmap.height);
              }
            }
            ctx.imageSmoothingEnabled = false; // Nearest neighbor for crisp zero-blur rendering
            ctx.drawImage(latestBitmap, 0, 0);
            frameCount++;
          }
          latestBitmap.close();
          latestBitmap = null;
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    const unsubscribe = nexusWs.onVideoFrame((targetDevIdx, frameBuffer) => {
      if (targetDevIdx !== deviceIndex) return;

      const blob = new Blob([frameBuffer], { type: 'image/jpeg' });
      if ('createImageBitmap' in window) {
        createImageBitmap(blob)
          .then((bitmap) => {
            if (latestBitmap) {
              latestBitmap.close(); // Discard dropped intermediate frame for lowest latency
            }
            latestBitmap = bitmap;
          })
          .catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
              }
              ctx.drawImage(img, 0, 0);
              frameCount++;
            }
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    });

    return () => {
      clearInterval(fpsTimer);
      if (animId) cancelAnimationFrame(animId);
      if (latestBitmap) latestBitmap.close();
      unsubscribe();
    };
  }, [deviceIndex]);

  // Keep-alive heartbeat: ONLY active when user explicitly engages live stream mode
  useEffect(() => {
    if (activeVisionMode !== 'SCREEN_VIEW' && activeVisionMode !== 'SCREEN_TOUCH') {
      return;
    }

    nexusWs.sendDirectApi('STREAM_MODE', { stream_mode: 'ACTIVE' }, deviceIndex);

    const heartbeat = setInterval(() => {
      nexusWs.sendDirectApi('STREAM_MODE', { stream_mode: 'ACTIVE' }, deviceIndex);
    }, 8000);

    return () => {
      clearInterval(heartbeat);
    };
  }, [deviceIndex, activeVisionMode]);

  const isAudioStreaming = useNexusStore((state) => state.isAudioStreaming);

  // 🎙️ Live Real-Time Microphone & Audio Stream Player via Web Audio API
  useEffect(() => {
    if (!isAudioStreaming) return;
    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    } catch (e) {}

    let nextPlayTime = 0;

    const unsubscribeAudio = nexusWs.onAudioChunk((chunk) => {
      if (!isAudioStreaming || !audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      try {
        const int16Array = new Int16Array(chunk.buffer, chunk.byteOffset, Math.floor(chunk.byteLength / 2));
        if (int16Array.length === 0) return;

        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 16000);
        audioBuffer.copyToChannel(float32Array, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (nextPlayTime < now) {
          nextPlayTime = now + 0.05;
        }
        source.start(nextPlayTime);
        nextPlayTime += audioBuffer.duration;
      } catch (err) {}
    });

    return () => {
      unsubscribeAudio();
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [isAudioStreaming]);

  // Convert Client Pointer Event (X, Y) to Precise Normalized [0..1] on the ACTUAL Image
  const getNormalizedCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = screenWrapperRef.current || canvasRef.current;
    if (!el) return { normX: 0.5, normY: 0.5, clickX: 0, clickY: 0, width: 0, height: 0 };

    const rect = el.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, clickX / rect.width));
    const normY = Math.max(0, Math.min(1, clickY / rect.height));

    return { normX, normY, clickX, clickY, width: rect.width, height: rect.height };
  };

  // Touch / Drag / Swipe Event Handlers with Millimeter Precision
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();

    const { normX, normY, clickX, clickY } = getNormalizedCoords(e);
    setDragStart({ normX, normY, time: Date.now() });

    // Show visual touch ripple
    setTouchRipple({ x: clickX, y: clickY, id: Date.now() });
    setTimeout(() => setTouchRipple(null), 400);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    e.preventDefault();

    const { normX: endNormX, normY: endNormY } = getNormalizedCoords(e);
    const { width: realWidth, height: realHeight } = getDeviceDimensions();

    const dx = endNormX - dragStart.normX;
    const dy = endNormY - dragStart.normY;
    const pixelDist = Math.hypot(dx * realWidth, dy * realHeight);
    const duration = Math.max(120, Math.min(500, Date.now() - dragStart.time));

    // If moved > 25 physical pixels, execute real SWIPE gesture; otherwise execute TAP
    if (pixelDist > 25) {
      const isVertical = Math.abs(dy) > Math.abs(dx);
      let direction = 'UP';
      if (isVertical) {
        direction = dy > 0 ? 'DOWN' : 'UP';
      } else {
        direction = dx > 0 ? 'RIGHT' : 'LEFT';
      }

      const pixelStartX = Math.round(dragStart.normX * realWidth);
      const pixelStartY = Math.round(dragStart.normY * realHeight);
      const pixelEndX = Math.round(endNormX * realWidth);
      const pixelEndY = Math.round(endNormY * realHeight);

      nexusWs.sendDirectApi(
        'SWIPE',
        {
          direction,
          normStartX: dragStart.normX,
          normStartY: dragStart.normY,
          normEndX: endNormX,
          normEndY: endNormY,
          startX: pixelStartX,
          startY: pixelStartY,
          endX: pixelEndX,
          endY: pixelEndY,
          duration,
        },
        deviceIndex
      );
      addLog('TOUCH', `Swipe ${direction} dispatched (${(endNormX * 100).toFixed(1)}%, ${(endNormY * 100).toFixed(1)}%)`);
    } else {
      // 100% Precise TAP at exact normalized & pixel coordinates (Universal Phone & Tablet)
      const pixelX = Math.round(endNormX * realWidth);
      const pixelY = Math.round(endNormY * realHeight);

      nexusWs.sendDirectApi(
        'TAP',
        {
          normX: endNormX,
          normY: endNormY,
          x: pixelX,
          y: pixelY,
        },
        deviceIndex
      );
      addLog('TOUCH', `Precise Tap dispatched at (${(endNormX * 100).toFixed(1)}%, ${(endNormY * 100).toFixed(1)}%) -> [${pixelX}px, ${pixelY}px]`);
    }

    setDragStart(null);
  };

  const handleNavAction = (action: string, params: any = {}, label: string = '') => {
    nexusWs.sendDirectApi(action, params, deviceIndex);
    addLog('NAV', label || `Dispatched [${action}]`);
  };

  const handleSnapshot = () => {
    nexusWs.sendDirectApi('TAKE_SCREENSHOT', {}, deviceIndex);
    addLog('PERCEPTION', `1-Shot HD Snapshot requested for Device #${deviceIndex + 1}`);
  };

  const setMode = (mode: 'SCREEN_VIEW' | 'SCREEN_TOUCH' | 'CAM_BACK' | 'CAM_FRONT' | 'STOP') => {
    setVisionMode(mode);
    if (mode === 'SCREEN_VIEW' || mode === 'SCREEN_TOUCH') {
      nexusWs.sendDirectApi('STOP_CAMERA_STREAM', {}, deviceIndex);
      nexusWs.sendDirectApi('START_SCREEN_MIRROR', {}, deviceIndex);
      nexusWs.sendDirectApi('STREAM_MODE', { stream_mode: 'ACTIVE' }, deviceIndex);
      addLog('VISION', `Engaged Screen Mirror [${mode}] on Device #${deviceIndex + 1}`);
    } else if (mode === 'CAM_BACK') {
      nexusWs.sendDirectApi('STOP_SCREEN_MIRROR', {}, deviceIndex);
      nexusWs.sendDirectApi('START_CAMERA_STREAM', { facing: 'BACK' }, deviceIndex);
      addLog('VISION', `Engaged Back Camera on Device #${deviceIndex + 1}`);
    } else if (mode === 'CAM_FRONT') {
      nexusWs.sendDirectApi('STOP_SCREEN_MIRROR', {}, deviceIndex);
      nexusWs.sendDirectApi('START_CAMERA_STREAM', { facing: 'FRONT' }, deviceIndex);
      addLog('VISION', `Engaged Front Camera on Device #${deviceIndex + 1}`);
    } else {
      nexusWs.sendDirectApi('STOP_SCREEN_MIRROR', {}, deviceIndex);
      nexusWs.sendDirectApi('STOP_CAMERA_STREAM', {}, deviceIndex);
      nexusWs.sendDirectApi('STREAM_MODE', { stream_mode: 'STANDBY' }, deviceIndex);
      addLog('VISION', `Standby / Sleep mode active on Device #${deviceIndex + 1}`);
    }
  };

  const toggleTorch = () => {
    const nextState = !isTorchOn;
    useNexusStore.getState().setTorchState(deviceIndex, nextState);
    nexusWs.sendDirectApi('FLASHLIGHT', { enable: nextState }, deviceIndex);
    addLog('HARDWARE', `Flashlight ${nextState ? 'ENABLED' : 'DISABLED'}`);
  };

  return (
    <div className="glass-card cyber-bracket relative flex flex-col items-center justify-between p-3.5 w-full h-full gap-3 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full text-xs font-bold px-1">
        <div className="flex items-center gap-2 truncate">
          <div className={`w-2 h-2 rounded-full shrink-0 ${activeVisionMode !== 'STOP' ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
          <span className="text-cyan-300 font-extrabold tracking-wide truncate">
            {activeDevice?.owner ? `${activeDevice.owner} (${activeDevice.relation || 'Sentinel'})` : `NODE #${deviceIndex + 1}`}
          </span>
          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            [{activeDevice?.model || activeDevice?.label || `Phone #${deviceIndex + 1}`}]
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0">
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
            {fps} FPS
          </span>
          <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
            {resolution}
          </span>
        </div>
      </div>

      {/* 📱 Exact Aspect-Fitted Smartphone Frame (Zero Black Sidebars) */}
      <div className="relative flex items-center justify-center w-full min-h-[380px] max-h-[460px] bg-slate-950/60 rounded-2xl p-1 overflow-hidden">
        <div
          ref={screenWrapperRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          style={{
            aspectRatio: `${streamAspect}`,
            transform: `rotate(${rotationDeg}deg) ${isMirrored ? 'scaleX(-1)' : ''}`,
            transition: 'transform 0.2s ease',
          }}
          className={`relative flex items-center justify-center h-full max-h-[450px] w-auto bg-black rounded-2xl border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 cursor-crosshair overflow-hidden select-none touch-none`}
        >
          <canvas ref={canvasRef} className="w-full h-full object-fill pointer-events-none" />

          {/* Visual Touch Ripple Effect */}
          {touchRipple && (
            <div
              key={touchRipple.id}
              style={{ left: touchRipple.x, top: touchRipple.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cyan-400/40 border-2 border-cyan-300 animate-ping pointer-events-none"
            />
          )}
        </div>
      </div>

      {/* 📱 Android Hardware Navigation & Gesture Bar */}
      <div className="flex items-center justify-between w-full px-2 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 gap-1 text-slate-300">
        <button
          onClick={() => handleNavAction('KEY_BACK', {}, 'Back Pressed')}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-colors active:scale-95"
          title="Back Button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleNavAction('KEY_HOME', {}, 'Home Pressed')}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-colors active:scale-95"
          title="Home Button"
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleNavAction('KEY_RECENTS', {}, 'Recents Pressed')}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-colors active:scale-95"
          title="Recents Apps"
        >
          <Square className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

        <button
          onClick={() => handleNavAction('SWIPE', { direction: 'UP' }, 'Swipe UP')}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-colors active:scale-95"
          title="Swipe Up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleNavAction('SWIPE', { direction: 'DOWN' }, 'Swipe DOWN')}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-colors active:scale-95"
          title="Swipe Down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleNavAction('SWIPE', { direction: 'LEFT' }, 'Swipe LEFT')}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-colors active:scale-95"
          title="Swipe Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleNavAction('SWIPE', { direction: 'RIGHT' }, 'Swipe RIGHT')}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-colors active:scale-95"
          title="Swipe Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

        <button
          onClick={toggleTorch}
          className={`p-1.5 rounded-lg transition-colors active:scale-95 ${
            isTorchOn ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title={isTorchOn ? 'Turn Flashlight OFF' : 'Turn Flashlight ON'}
        >
          {isTorchOn ? <Flashlight className="w-4 h-4 text-amber-400" /> : <FlashlightOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Vision Selector Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
        <button
          onClick={handleSnapshot}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-slate-200 transition-all active:scale-95"
        >
          <Camera className="w-3.5 h-3.5 text-cyan-400" /> Snapshot
        </button>

        <button
          onClick={() => setMode('SCREEN_VIEW')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
            activeVisionMode === 'SCREEN_VIEW'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" /> View
        </button>

        <button
          onClick={() => setMode('SCREEN_TOUCH')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
            activeVisionMode === 'SCREEN_TOUCH'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-200'
          }`}
        >
          <Hand className="w-3.5 h-3.5" /> Touch Ctrl
        </button>

        <button
          onClick={() => setMode('CAM_BACK')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
            activeVisionMode === 'CAM_BACK'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> Back Cam
        </button>

        <button
          onClick={() => setMode('CAM_FRONT')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
            activeVisionMode === 'CAM_FRONT'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Front Cam
        </button>

        <button
          onClick={() => setMode('STOP')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
            activeVisionMode === 'STOP'
              ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
              : 'bg-slate-900 border-slate-700 hover:border-rose-500 text-rose-400'
          }`}
        >
          <Power className="w-3.5 h-3.5" /> Stop
        </button>
      </div>

      {/* Viewport Control Tools Footer */}
      <div className="flex items-center justify-between w-full text-[10px] font-mono text-slate-400 px-1 border-t border-slate-900 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRotationDeg((prev) => (prev + 90) % 360)}
            className="hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <RotateCw className="w-3 h-3" /> Rotate
          </button>
          <button
            onClick={() => setIsFill(!isFill)}
            className="hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            {isFill ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />} {isFill ? 'Fit' : 'Fill'}
          </button>
          <button onClick={toggleMirrorMode} className="hover:text-cyan-300 transition-colors">
            {isMirrored ? 'Unmirror' : 'Mirror'}
          </button>
        </div>

        <div className="flex items-center gap-1 text-slate-500">
          <span>Target #{deviceIndex + 1}</span>
        </div>
      </div>
    </div>
  );
}
