'use client';

import React, { useState, useEffect } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  ShieldCheck,
  Crown,
  Lock,
  Unlock,
  Save,
  Battery,
  Flame,
} from 'lucide-react';

export default function FleetTierMatrix() {
  const devices = useNexusStore((state) => state.devices);
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const selectTargetDevice = useNexusStore((state) => state.selectTargetDevice);
  const targetDevice = useNexusStore((state) => state.devices[selectedIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  const [ownerName, setOwnerName] = useState(targetDevice?.owner || 'Viraj');
  const [ownerPhone, setOwnerPhone] = useState('+91 7042793133');
  const [relation, setRelation] = useState(targetDevice?.relation || 'Viraj (Self)');
  const [role, setRole] = useState(targetDevice?.role || 'Primary Mobile Node');
  const [isLocked, setIsLocked] = useState(true);
  const [allowGps, setAllowGps] = useState(true);
  const [allowCalls, setAllowCalls] = useState(true);
  const [allowVideoCalls, setAllowVideoCalls] = useState(true);
  const [allowRouteAssist, setAllowRouteAssist] = useState(true);
  const [allowSosOverride, setAllowSosOverride] = useState(true);
  const [allowedViewDevices, setAllowedViewDevices] = useState<number[]>([0, 1]);

  useEffect(() => {
    if (targetDevice) {
      setOwnerName(targetDevice.owner || 'Viraj');
      setOwnerPhone('+91 7042793133');
      setRelation(targetDevice.relation || 'Viraj (Self)');
      setRole(targetDevice.role || 'Primary Mobile Node');
      setAllowedViewDevices([0, selectedIndex]);
    }
  }, [targetDevice, selectedIndex]);

  const toggleViewDevice = (devIdx: number) => {
    if (allowedViewDevices.includes(devIdx)) {
      setAllowedViewDevices(allowedViewDevices.filter((id) => id !== devIdx));
    } else {
      setAllowedViewDevices([...allowedViewDevices, devIdx]);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    nexusWs.sendDirectApi(
      'UPDATE_DEVICE_PROFILE',
      {
        owner_name: ownerName,
        owner_phone_number: ownerPhone,
        relation_viraj: relation,
        device_role: role,
        lock_editing: isLocked,
        allow_location_tracking: allowGps,
        allow_calling: allowCalls,
        allow_video_calling: allowVideoCalls,
        allow_route_assistant: allowRouteAssist,
        allow_sos_override: allowSosOverride,
        allowed_view_devices: allowedViewDevices.map((i) => `dev_${i}`).join(','),
      },
      selectedIndex
    );
    addLog('PROFILE', `Updated & Broadcasted Permissions for Device #${selectedIndex + 1}: ${ownerName} [Dropdown Devices: ${allowedViewDevices.length}, Calls=${allowCalls}, GPS=${allowGps}]`);
  };

  const deviceList = Object.values(devices);
  const isSelectedViraj = targetDevice?.owner?.toLowerCase().includes('viraj') || targetDevice?.relation?.toLowerCase().includes('self') || selectedIndex === 0;

  return (
    <div className="glass-card cyber-bracket flex flex-col justify-between p-4 w-full h-full gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs font-bold px-1">
        <div className="flex items-center gap-2 text-cyan-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>SOVEREIGN FLEET &amp; 2-TIER PRIVACY MATRIX</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-400">
          {deviceList.length} Active Node(s)
        </span>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
        {deviceList.length === 0 ? (
          <div className="col-span-2 p-4 text-center text-xs text-slate-500 rounded-xl bg-slate-950/60 border border-slate-900">
            Waiting for companion devices to connect...
          </div>
        ) : (
          deviceList.map((dev) => {
            const isViraj = dev.owner?.toLowerCase().includes('viraj') || dev.relation?.toLowerCase().includes('self') || dev.index === 0;
            const isSelected = dev.index === selectedIndex;

            return (
              <div
                key={dev.index}
                onClick={() => selectTargetDevice(dev.index)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isViraj ? (
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className="text-xs font-extrabold text-white truncate">
                      {dev.owner || `Phone #${dev.index + 1}`}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      isViraj ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isViraj ? 'SENTINEL' : 'GUARDIAN'}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {dev.relation} • {dev.model}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1 border-t border-slate-900">
                  <span className="flex items-center gap-1">
                    <Battery className="w-2.5 h-2.5 text-emerald-400" /> {dev.batteryPercent ?? 85}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-cyan-400" /> {dev.batteryTempC ?? 32}°C
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Remote Profile Lock Configurator */}
      <form onSubmit={handleSaveProfile} className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between font-bold text-slate-300 text-[11px]">
          <span>Remote Governance for Device #{selectedIndex + 1}</span>
          <button
            type="button"
            onClick={() => setIsLocked(!isLocked)}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px]"
          >
            {isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
            <span>{isLocked ? 'Profile Locked' : 'Unlocked'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400">Owner Name</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Relation with Viraj</label>
            <input
              type="text"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-amber-300 font-bold flex items-center justify-between">
            <span>Emergency Owner Phone Number</span>
            <span className="text-[9px] text-slate-400 font-normal">GSM / WhatsApp</span>
          </label>
          <input
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="+91..."
            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-amber-400 mt-0.5"
          />
        </div>

        {/* 1. App Dropdown Visibility Checklist */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
              👁️ App Dropdown Visibility (Ye Device Apne App Me Kisko Dekhega)
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {isSelectedViraj ? '👑 Admin (All Visible)' : `${allowedViewDevices.length} Permitted`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {deviceList.map((d) => (
              <label
                key={`view-${d.index}`}
                className={`flex items-center gap-2 p-1.5 rounded-md border text-[10px] cursor-pointer transition-all ${
                  allowedViewDevices.includes(d.index) || isSelectedViraj
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allowedViewDevices.includes(d.index) || isSelectedViraj}
                  disabled={isSelectedViraj}
                  onChange={() => toggleViewDevice(d.index)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="truncate">{d.owner || `Device #${d.index + 1}`}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2. Remote Feature Permissions & Calling Matrix */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
            📞 Calling &amp; Remote Permissions
          </span>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCalls}
                onChange={(e) => setAllowCalls(e.target.checked)}
                className="rounded border-slate-700 text-purple-500 focus:ring-0"
              />
              <span>Allow Voice Calling</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowVideoCalls}
                onChange={(e) => setAllowVideoCalls(e.target.checked)}
                className="rounded border-slate-700 text-purple-500 focus:ring-0"
              />
              <span>Allow Video Calling</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowGps}
                onChange={(e) => setAllowGps(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Live Location Radar</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowRouteAssist}
                onChange={(e) => setAllowRouteAssist(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Route Path Drawing</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer col-span-2">
              <input
                type="checkbox"
                checked={allowSosOverride}
                onChange={(e) => setAllowSosOverride(e.target.checked)}
                className="rounded border-slate-700 text-rose-500 focus:ring-0"
              />
              <span className="text-rose-300">Allow SOS Override on Silent/DND</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:opacity-95 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 mt-1"
        >
          <Save className="w-3.5 h-3.5" /> Save &amp; Broadcast Permissions to Companion
        </button>
      </form>
    </div>
  );
}
