'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  Crosshair,
  MapPin,
  BellRing,
  Lock,
  RefreshCw,
  Compass,
  Radio,
  ShieldAlert,
} from 'lucide-react';

const EMPTY_GPS_ARRAY: any[] = [];

export default function TacticalRadarDeck() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [distanceThreshold, setDistanceThreshold] = useState<number>(50);

  const handleSetThreshold = (meters: number) => {
    setDistanceThreshold(meters);
    nexusWs.sendDirectApi('SET_GPS_DISTANCE_THRESHOLD', { distance_meters: meters }, selectedIndex);
    addLog('TACTICAL', `⚡ Dynamic Movement Delta set to ${meters}m on Device #${selectedIndex + 1}`);
  };
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const targetDevice = useNexusStore((state) => state.devices[selectedIndex]);
  const rawGpsHistory = useNexusStore((state) => state.gpsHistory[selectedIndex]);
  const gpsHistory = rawGpsHistory || EMPTY_GPS_ARRAY;
  const addLog = useNexusStore((state) => state.addLog);

  const lat = targetDevice?.latitude ?? 28.6139;
  const lon = targetDevice?.longitude ?? 77.209;
  const accuracy = targetDevice?.gpsAccuracyM ?? 12.5;

  // 60 FPS 2D Canvas Radar Sweep Animation
  useEffect(() => {
    let angle = 0;
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(cx, cy) - 15;

      ctx.clearRect(0, 0, w, h);

      // Background radial gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius);
      bgGrad.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      bgGrad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Concentric Range Rings
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      for (let r = radius / 4; r <= radius; r += radius / 4) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshairs
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.stroke();

      // Radar Sweep Laser Cone
      const sweepGrad = ctx.createConicGradient(angle, cx, cy);
      sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      sweepGrad.addColorStop(0.12, 'rgba(6, 182, 212, 0.01)');
      sweepGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Device Blip Target
      const blipX = cx + Math.cos(1.2) * (radius * 0.55);
      const blipY = cy + Math.sin(1.2) * (radius * 0.55);

      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(blipX, blipY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Blip Ring
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.beginPath();
      ctx.arc(blipX, blipY, 10 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
      ctx.stroke();

      angle += 0.035;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Auto-fetch GPS & Trajectory on mount and date change
  useEffect(() => {
    nexusWs.sendDirectApi('GET_GPS_LOCATION', {}, selectedIndex);
    const isRange = selectedDate === 'LATEST_7_DAYS';
    nexusWs.sendDirectApi(
      'QUERY_LOCATION_TRAJECTORY',
      { date: isRange ? '' : selectedDate, days: 7, compressed: true },
      selectedIndex
    );
    const gpsInterval = setInterval(() => {
      nexusWs.sendDirectApi('GET_GPS_LOCATION', {}, selectedIndex);
    }, 20000);
    return () => clearInterval(gpsInterval);
  }, [selectedIndex, selectedDate]);

  const handleRingPhone = () => {
    nexusWs.sendDirectApi('RING_PHONE', { duration_sec: 30 }, selectedIndex);
    addLog('TACTICAL', `🚨 Loud Emergency Siren triggered on Device #${selectedIndex + 1}`);
  };

  const handleLockDevice = () => {
    nexusWs.sendDirectApi('LOCK_SCREEN', {}, selectedIndex);
    addLog('TACTICAL', `🔒 Sovereign Screen Lock dispatched to Device #${selectedIndex + 1}`);
  };

  const handleRefreshGps = () => {
    nexusWs.sendDirectApi('GET_GPS_LOCATION', {}, selectedIndex);
    const isRange = selectedDate === 'LATEST_7_DAYS';
    nexusWs.sendDirectApi(
      'QUERY_LOCATION_TRAJECTORY',
      { date: isRange ? '' : selectedDate, days: 7, compressed: true },
      selectedIndex
    );
    addLog('TACTICAL', `📍 GPS coordinate & movement trail refresh requested for Device #${selectedIndex + 1}`);
  };

  const handleOpenGoogleMaps = (targetLat: number = lat, targetLon: number = lon) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLon}`, '_blank');
  };

  const handleOpenFullRouteMap = () => {
    if (gpsHistory.length === 0) return;
    const start = gpsHistory[0];
    const end = gpsHistory[gpsHistory.length - 1];
    const waypoints = gpsHistory
      .slice(1, Math.min(gpsHistory.length - 1, 9))
      .map((p: any) => `${p.latitude},${p.longitude}`)
      .join('|');
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="glass-card cyber-bracket flex flex-col justify-between p-4 w-full h-full gap-3">
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs font-bold px-1">
        <div className="flex items-center gap-2 text-cyan-300">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span>TACTICAL 50M ORBITAL RADAR & GPS</span>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px]">
          <button
            onClick={() => setActiveView('RADAR')}
            className={`px-2 py-0.5 rounded-lg transition-all ${
              activeView === 'RADAR' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D Radar
          </button>
          <button
            onClick={() => setActiveView('MAP')}
            className={`px-2 py-0.5 rounded-lg transition-all ${
              activeView === 'MAP' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setActiveView('TRAIL')}
            className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 ${
              activeView === 'TRAIL' ? 'bg-rose-500 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>50m Trail</span>
          </button>
        </div>
      </div>

      {/* Main Visual Display (Radar Canvas, Satellite Map, or 50m Blackbox Movement Trail) */}
      <div className="relative flex items-center justify-center w-full aspect-square max-h-[360px] rounded-2xl bg-black/90 border border-cyan-500/20 overflow-hidden shadow-inner">
        {activeView === 'RADAR' && (
          <canvas ref={canvasRef} width={400} height={400} className="w-full h-full object-contain" />
        )}

        {activeView === 'MAP' && (
          <iframe
            title="Google Satellite View"
            src={`https://maps.google.com/maps?q=${lat},${lon}&t=k&z=17&ie=UTF8&iwloc=&output=embed`}
            className="w-full h-full border-none opacity-90"
          />
        )}

        {activeView === 'TRAIL' && (
          <div className="w-full h-full p-2.5 flex flex-col gap-2 overflow-y-auto bg-slate-950/95 text-xs">
            {/* Date-Picker & Trajectory Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedDate.startsWith('20') ? 'CUSTOM' : selectedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'CUSTOM') {
                      setSelectedDate(val);
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-cyan-300 focus:outline-none"
                >
                  <option value="LATEST_7_DAYS">Latest 7 Days (5 kbps Compressed)</option>
                  <option value={new Date().toISOString().split('T')[0]}>Today ({new Date().toISOString().split('T')[0]})</option>
                  <option value={new Date(Date.now() - 86400000).toISOString().split('T')[0]}>Yesterday</option>
                  <option value="CUSTOM">Specific Calendar Date...</option>
                </select>

                <input
                  type="date"
                  value={selectedDate.startsWith('20') ? selectedDate : ''}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="px-1.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-mono text-white focus:outline-none"
                />
              </div>

              {gpsHistory.length > 1 && (
                <button
                  onClick={handleOpenFullRouteMap}
                  className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-extrabold text-emerald-300 transition-all"
                  title="Plot complete road route on Google Maps"
                >
                  🗺️ Open Full Route
                </button>
              )}
            </div>

            {/* Checkpoints Count & Dynamic Geodesic Threshold Selector */}
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 font-mono">
              <span className="text-cyan-400 font-bold">{gpsHistory.length} Point(s) Recorded</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Threshold:</span>
                {[25, 50, 70, 100, 200].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSetThreshold(m)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                      distanceThreshold === m
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                    title={`Log a new coordinate every ${m} meters of physical movement`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Checkpoint Detailed Inspector Modal / Banner */}
            {selectedPoint && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 shadow-lg flex flex-col gap-1.5 text-[11px] animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-cyan-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Checkpoint Details
                  </span>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-slate-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-300">
                  <div>📅 <span className="text-white">{selectedPoint.timestamp ? new Date(selectedPoint.timestamp).toLocaleString() : 'N/A'}</span></div>
                  <div>⚡ Delta: <span className="text-cyan-300 font-bold">{selectedPoint.trigger_reason || selectedPoint.reason || 'Travel Point'}</span></div>
                  <div>📍 Lat/Lon: <span className="text-white">{selectedPoint.latitude?.toFixed(5)}°, {selectedPoint.longitude?.toFixed(5)}°</span></div>
                  <div>🏎️ Speed: <span className="text-emerald-400">{Math.round((selectedPoint.speed || 0) * 3.6)} km/h</span></div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleOpenGoogleMaps(selectedPoint.latitude, selectedPoint.longitude)}
                    className="flex-1 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] text-center"
                  >
                    🗺️ Open in Google Maps ↗
                  </button>
                  <button
                    onClick={() => window.open(`https://maps.google.com/maps?q=${selectedPoint.latitude},${selectedPoint.longitude}&t=k&z=19`, '_blank')}
                    className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] text-center border border-slate-700"
                  >
                    🛰️ Satellite Zoom ↗
                  </button>
                </div>
              </div>
            )}

            {gpsHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-[11px]">
                <MapPin className="w-6 h-6 mb-1 text-slate-600 animate-pulse" />
                <span>Zero coordinates logged yet for this date.</span>
                <span className="text-[10px] text-slate-600 mt-1">Coordinates log automatically on every {distanceThreshold}m movement!</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-52 pr-1">
                {gpsHistory.slice().reverse().map((crumb: any, idx: number) => {
                  const isShutdown = crumb.isShutdown || crumb.is_shutdown_event || crumb.trigger_reason?.includes('SHUTDOWN');
                  const isSelected = selectedPoint && selectedPoint.latitude === crumb.latitude && selectedPoint.longitude === crumb.longitude;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedPoint(crumb)}
                      className={`p-2 rounded-xl border flex flex-col gap-0.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-500/30'
                          : isShutdown
                          ? 'bg-rose-950/40 border-rose-500/60 shadow-md shadow-rose-950/50 hover:border-rose-400'
                          : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold flex items-center gap-1 ${isShutdown ? 'text-rose-400 animate-pulse' : isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                          <MapPin className="w-3 h-3" />
                          {isShutdown ? '🚨 THEFT SHUTDOWN POINT' : `Point #${gpsHistory.length - idx}`}
                          {crumb.trigger_reason && <span className="text-[9px] font-normal text-slate-400">({crumb.trigger_reason})</span>}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {crumb.formattedTime || (crumb.timestamp ? new Date(crumb.timestamp).toLocaleTimeString() : 'Recent')}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-white flex items-center justify-between pt-0.5">
                        <span>{crumb.latitude?.toFixed(5)}°, {crumb.longitude?.toFixed(5)}°</span>
                        <span className="text-[9px] text-cyan-400 font-bold">Inspect Details ➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Coordinates Chip */}
        {activeView !== 'TRAIL' && (
          <div 
            onClick={() => handleOpenGoogleMaps(lat, lon)}
            className="absolute bottom-2.5 left-2.5 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center gap-2 cursor-pointer hover:border-cyan-300 transition-colors shadow-lg"
            title="Click to open exact location in Google Maps"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-bold">{lat.toFixed(5)}° N, {lon.toFixed(5)}° E</span>
            <span className="text-slate-400">(±{accuracy}m)</span>
          </div>
        )}
      </div>

      {/* Emergency Action Buttons */}
      <div className="grid grid-cols-3 gap-2 w-full">
        <button
          onClick={handleRingPhone}
          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-extrabold transition-all active:scale-95 shadow-sm"
          title="Bypass DND and ring phone at 100% volume"
        >
          <BellRing className="w-3.5 h-3.5" /> Siren
        </button>

        <button
          onClick={handleLockDevice}
          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-all active:scale-95 shadow-sm"
          title="Remotely lock device immediately"
        >
          <Lock className="w-3.5 h-3.5" /> Lock
        </button>

        <button
          onClick={handleRefreshGps}
          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-extrabold transition-all active:scale-95 shadow-sm"
          title="Refresh GPS coordinates and fetch movement trail"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Pin GPS
        </button>
      </div>
    </div>
  );
}
