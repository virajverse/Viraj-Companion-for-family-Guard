'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  BarChart3,
  Clock,
  RefreshCw,
  Sliders,
  PlaySquare,
  MessageSquare,
  Globe,
  Camera,
  Smartphone,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

export default function AppUsageDeck() {
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const rawUsage = useNexusStore((state) => state.appUsage[selectedIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  // Auto-fetch real live usage statistics on mount and period change
  React.useEffect(() => {
    nexusWs.sendDirectApi('GET_APP_USAGE', { period, limit: 35 }, selectedIndex);
  }, [selectedIndex, period]);

  const handleRefreshUsage = () => {
    nexusWs.sendDirectApi('GET_APP_USAGE', { period, limit: 35 }, selectedIndex);
    addLog('ANALYTICS', `Fetched real App Screen Time analytics (${period}) for Device #${selectedIndex + 1}`);
  };

  const handleOpenSettings = () => {
    nexusWs.sendDirectApi('OPEN_USAGE_SETTINGS', {}, selectedIndex);
    addLog('SETTINGS', `Opened Usage Access Settings on phone`);
  };

  const isLauncher = (pkg: string, name: string) => {
    const p = (pkg || '').toLowerCase();
    const n = (name || '').toLowerCase();
    return (
      p.includes('launcher') ||
      n.includes('launcher') ||
      p.includes('one ui home') ||
      n.includes('one ui home') ||
      p.includes('sec.android.app.launcher') ||
      p.includes('miui.home') ||
      p.includes('nexuslauncher') ||
      p.includes('quickstep') ||
      p.includes('trebuchet') ||
      n.includes('home screen')
    );
  };

  const getAppMeta = (pkg: string, name: string) => {
    const p = (pkg || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (p.includes('youtube') || n.includes('youtube')) return { icon: PlaySquare, color: 'text-red-500', barColor: 'bg-red-500' };
    if (p.includes('whatsapp') || n.includes('whatsapp')) return { icon: MessageSquare, color: 'text-emerald-400', barColor: 'bg-emerald-500' };
    if (p.includes('chrome') || p.includes('browser')) return { icon: Globe, color: 'text-amber-400', barColor: 'bg-amber-500' };
    if (p.includes('camera') || p.includes('gallery') || p.includes('photos')) return { icon: Camera, color: 'text-cyan-400', barColor: 'bg-cyan-500' };
    if (p.includes('mtp') || n.includes('mtp')) return { icon: HardDrive, color: 'text-blue-400', barColor: 'bg-blue-500' };
    return { icon: Smartphone, color: 'text-purple-400', barColor: 'bg-purple-500' };
  };

  // Parse raw usage response (both direct and nested 'data' key)
  const usageRoot = rawUsage?.data || rawUsage || {};
  const isPermGranted = usageRoot?.permission_granted !== false && rawUsage?.permission_granted !== false;
  const totalScreenTimeStr = usageRoot?.total_screen_time || rawUsage?.total_screen_time || '';
  
  const appsData: any[] = Array.isArray(usageRoot?.apps)
    ? usageRoot.apps
    : Array.isArray(rawUsage?.apps)
    ? rawUsage.apps
    : [];

  const usageList = appsData
    .map((a: any) => {
      const timeMs = Number(a.screen_time_ms || a.foreground_time_ms || a.total_time_in_foreground || a.time_ms || 0);
      const minutes = Math.round(timeMs / 60000);
      const hours = Math.floor(minutes / 60);
      const remMins = minutes % 60;
      const calculatedFormat = hours > 0 ? `${hours}h ${remMins}m` : `${remMins}m`;
      const displayTime = a.screen_time || a.formatted_time || (timeMs > 0 ? calculatedFormat : '0s');

      const pkgName = a.package || a.package_name || '';
      const appName = a.app_name || a.name || (pkgName ? pkgName.split('.').pop() : 'App');
      const meta = getAppMeta(pkgName, appName);

      let lastUsedStr = 'Active';
      if (a.last_used) {
        lastUsedStr = `Last used: ${a.last_used.includes(' ') ? a.last_used.split(' ')[1] : a.last_used}`;
      } else if (a.last_time_used) {
        lastUsedStr = `Last used: ${a.last_time_used}`;
      }

      return {
        name: appName,
        package: pkgName,
        time: displayTime,
        rawMs: timeMs,
        minutes: Math.max(minutes, timeMs > 1000 ? 1 : 0),
        launches: lastUsedStr,
        ...meta,
      };
    })
    .filter((u) => (u.rawMs > 0 || u.minutes > 0) && !isLauncher(u.package, u.name))
    .sort((a, b) => b.rawMs - a.rawMs);

  const maxMs = usageList.length > 0 ? Math.max(...usageList.map((u) => u.rawMs), 1000) : 1000;

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-cyan-300 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">
            REAL SCREEN TIME &amp; USAGE ({usageList.length})
            {totalScreenTimeStr && <span className="text-slate-400 font-mono font-normal ml-2">• Total: {totalScreenTimeStr}</span>}
          </span>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['24h', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                period === p ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={handleRefreshUsage}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Refresh Usage Data"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Permission Warning Banner if not enabled */}
      {!isPermGranted && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-[11px] leading-tight">
              Android Usage Access permission is required to read real-time app screen times.
            </span>
          </div>
          <button
            onClick={handleOpenSettings}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black shrink-0 transition-all shadow-md active:scale-95"
          >
            Grant on Phone
          </button>
        </div>
      )}

      {/* App Usage List */}
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto max-h-[580px] pr-1">
        {usageList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-slate-950/70 border border-slate-900 flex flex-col items-center justify-center gap-2">
            <BarChart3 className="w-6 h-6 text-slate-600 animate-pulse" />
            <span>
              {!isPermGranted
                ? 'Usage access not granted yet on this device.'
                : 'No foreground app usage recorded for this period yet.'}
            </span>
            <button
              onClick={handleRefreshUsage}
              className="mt-1 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold hover:bg-cyan-900 transition-all"
            >
              Fetch Live Usage Now
            </button>
          </div>
        ) : (
          usageList.map((app, idx) => {
            const IconComp = app.icon;
            const percent = Math.max(3, Math.min(100, Math.round((app.rawMs / maxMs) * 100)));
            return (
              <div
                key={`usage-${app.package}-${idx}`}
                className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1.5 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <IconComp className={`w-3.5 h-3.5 ${app.color}`} />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-xs text-white truncate">{app.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{app.launches}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className="text-xs font-black text-cyan-300">{app.time}</div>
                    <div className="text-[9px] text-slate-500">Screen Time</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${app.barColor} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 border-t border-slate-900 pt-2 shrink-0">
        <span className={`flex items-center gap-1 ${isPermGranted ? 'text-emerald-400' : 'text-amber-400'}`}>
          <CheckCircle2 className="w-3 h-3" /> {isPermGranted ? 'UsageStatsManager Active' : 'Access Required'}
        </span>
        <button
          onClick={handleOpenSettings}
          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
        >
          <Sliders className="w-3 h-3" /> Usage Settings
        </button>
      </div>
    </div>
  );
}
