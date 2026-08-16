'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  LayoutGrid,
  Search,
  Play,
  RefreshCw,
  MessageSquare,
  MapPin,
  Camera,
  Settings,
  Globe,
  Phone,
  Mail,
  Folder,
  Image as ImageIcon,
  PlaySquare,
} from 'lucide-react';

export default function HoloAppDrawer() {
  const [searchQuery, setSearchQuery] = useState('');
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const liveApps = useNexusStore((state) => state.installedApps[selectedIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  // Auto-fetch real installed apps on mount & device switch
  React.useEffect(() => {
    nexusWs.sendDirectApi('GET_INSTALLED_APPS', {}, selectedIndex);
  }, [selectedIndex]);

  const defaultApps = [
    { name: 'WhatsApp', package: 'com.whatsapp', icon: MessageSquare, color: 'text-emerald-400' },
    { name: 'Google Maps', package: 'com.google.android.apps.maps', icon: MapPin, color: 'text-rose-400' },
    { name: 'YouTube', package: 'com.google.android.youtube', icon: PlaySquare, color: 'text-red-500' },
    { name: 'Camera', package: 'com.android.camera', icon: Camera, color: 'text-cyan-400' },
    { name: 'Settings', package: 'com.android.settings', icon: Settings, color: 'text-slate-400' },
    { name: 'Chrome', package: 'com.android.chrome', icon: Globe, color: 'text-amber-400' },
    { name: 'Dialer Phone', package: 'com.google.android.dialer', icon: Phone, color: 'text-blue-400' },
    { name: 'Messages SMS', package: 'com.google.android.apps.messaging', icon: Mail, color: 'text-teal-400' },
    { name: 'Files Manager', package: 'com.google.android.apps.nbu.files', icon: Folder, color: 'text-amber-500' },
    { name: 'Photos Gallery', package: 'com.google.android.apps.photos', icon: ImageIcon, color: 'text-purple-400' },
  ];

  const appList = (liveApps && Array.isArray(liveApps) && liveApps.length > 0)
    ? liveApps.map((a: any) => ({
        name: typeof a === 'string' ? a.split('.').pop() || a : a.name || a.label || a.appName || a.package || 'App',
        package: typeof a === 'string' ? a : a.package || a.package_name || a.packageName || '',
        icon: LayoutGrid,
        color: 'text-cyan-400',
      }))
    : defaultApps;

  const handleLaunch = (pkgName: string, appName: string) => {
    nexusWs.sendDirectApi('LAUNCH_APP', { package_name: pkgName }, selectedIndex);
    addLog('APPS', `Launching ${appName} on Device #${selectedIndex + 1}`);
  };

  const handleScanApps = () => {
    nexusWs.sendDirectApi('GET_INSTALLED_APPS', {}, selectedIndex);
    addLog('APPS', `Scanning installed packages on Device #${selectedIndex + 1}...`);
  };

  const filtered = appList.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.package.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold px-1 shrink-0">
        <div className="flex items-center gap-2 text-cyan-300">
          <LayoutGrid className="w-4 h-4 text-cyan-400" />
          <span>APP DRAWER &amp; EXECUTOR ({appList.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps..."
              className="pl-7 pr-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 w-28 sm:w-36"
            />
          </div>

          <button
            onClick={handleScanApps}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" /> Scan
          </button>
        </div>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 flex-1 min-h-0 overflow-y-auto max-h-[580px] pr-1">
        {filtered.map((app, idx) => {
          const IconComp = app.icon;
          return (
            <div
              key={`app-${app.package || idx}-${idx}`}
              onClick={() => handleLaunch(app.package, app.name)}
              className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-400 hover:bg-slate-900 cursor-pointer transition-all flex flex-col items-center text-center gap-2 group shadow-sm active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <IconComp className={`w-5 h-5 ${app.color}`} />
              </div>
              <div className="text-xs font-bold text-slate-200 truncate w-full">{app.name}</div>
              <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-2.5 h-2.5" /> Open
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
