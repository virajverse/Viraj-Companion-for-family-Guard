'use client';

import React, { useState } from 'react';
import { nexusWs } from '@/lib/websocket';
import { useNexusStore } from '@/lib/deviceStore';
import { LayoutGrid, Play, RefreshCw, Search, ShieldCheck } from 'lucide-react';

export default function AppsManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const addLog = useNexusStore((state) => state.addLog);

  // Common Android packages
  const defaultApps = [
    { name: 'WhatsApp', package: 'com.whatsapp', icon: '💬' },
    { name: 'Google Maps', package: 'com.google.android.apps.maps', icon: '🗺️' },
    { name: 'YouTube', package: 'com.google.android.youtube', icon: '▶️' },
    { name: 'Camera', package: 'com.android.camera', icon: '📷' },
    { name: 'Settings', package: 'com.android.settings', icon: '⚙️' },
    { name: 'Chrome', package: 'com.android.chrome', icon: '🌐' },
    { name: 'Dialer Phone', package: 'com.google.android.dialer', icon: '📞' },
    { name: 'Messages SMS', package: 'com.google.android.apps.messaging', icon: '✉️' },
    { name: 'File Manager', package: 'com.google.android.apps.nbu.files', icon: '📁' },
    { name: 'Gallery', package: 'com.google.android.apps.photos', icon: '🖼️' },
  ];

  const handleLaunch = (pkgName: string, appName: string) => {
    nexusWs.sendDirectApi('LAUNCH_APP', { package_name: pkgName });
    addLog('APPS', `🚀 Launching app: ${appName} [${pkgName}]`);
  };

  const handleScanApps = () => {
    nexusWs.sendDirectApi('GET_INSTALLED_APPS');
    addLog('APPS', 'Scanning installed packages on device...');
  };

  const filtered = defaultApps.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.package.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
          <LayoutGrid className="w-4 h-4 text-cyan-400" />
          <span>INSTALLED APPS DRAWER & 1-CLICK LAUNCHER</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            onClick={handleScanApps}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" /> Scan Apps
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {filtered.map((app) => (
          <div
            key={app.package}
            onClick={() => handleLaunch(app.package, app.name)}
            className="p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-400/60 hover:bg-slate-900 cursor-pointer transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
          >
            <div className="text-2xl group-hover:scale-110 transition-transform">{app.icon}</div>
            <div className="text-xs font-bold text-slate-200 truncate w-full">{app.name}</div>
            <div className="text-[9px] font-mono text-slate-400 truncate w-full">{app.package}</div>
            <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-2.5 h-2.5" /> Launch
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
