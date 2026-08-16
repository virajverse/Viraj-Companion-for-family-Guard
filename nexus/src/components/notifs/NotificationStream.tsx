'use client';

import React from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import {
  Bell,
  RefreshCw,
  Trash2,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export default function NotificationStream() {
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const liveNotifs = useNexusStore((state) => state.notifications[selectedIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  // Auto-fetch real live notifications on mount and device change
  React.useEffect(() => {
    nexusWs.sendDirectApi('PULL_NOTIFICATIONS', {}, selectedIndex);
  }, [selectedIndex]);

  const handleRefresh = () => {
    nexusWs.sendDirectApi('PULL_NOTIFICATIONS', {}, selectedIndex);
    addLog('NOTIFS', `Pulled latest Android notifications from Device #${selectedIndex + 1}`);
  };

  const notifsList = Array.isArray(liveNotifs) ? liveNotifs : [];

  const getNotifMeta = (pkg: string) => {
    const p = (pkg || '').toLowerCase();
    if (p.includes('whatsapp') || p.includes('chat') || p.includes('message')) return { icon: MessageSquare, color: 'text-emerald-400' };
    if (p.includes('bank') || p.includes('pay') || p.includes('upi')) return { icon: CreditCard, color: 'text-amber-400' };
    if (p.includes('security') || p.includes('google')) return { icon: ShieldCheck, color: 'text-cyan-400' };
    return { icon: Smartphone, color: 'text-purple-400' };
  };

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-extrabold text-cyan-300 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">LIVE ANDROID NOTIFICATIONS ({notifsList.length})</span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 hover:text-white shrink-0"
        >
          <RefreshCw className="w-3 h-3 text-cyan-400" /> Pull Notifs
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto max-h-[580px] pr-1">
        {notifsList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-slate-950/70 border border-slate-900 flex flex-col items-center justify-center gap-2">
            <Bell className="w-6 h-6 text-slate-600 animate-pulse" />
            <span>No notifications currently active on this device.</span>
            <button
              onClick={handleRefresh}
              className="mt-1 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold hover:bg-cyan-900 transition-all"
            >
              Check Incoming Alerts
            </button>
          </div>
        ) : (
          notifsList.map((n: any, idx: number) => {
            const meta = getNotifMeta(n.package || n.app || '');
            const IconComp = meta.icon;
            const title = n.title || n.header || 'Notification';
            const text = n.text || n.body || n.content || '';
            const app = n.app || n.package || 'System';
            const timeStr = n.time || (n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now');

            return (
              <div
                key={`notif-${n.id || idx}-${title}-${idx}`}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/30 flex items-start justify-between gap-3 text-xs transition-all"
              >
                <div className="flex items-start gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComp className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="flex flex-col truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">{title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono shrink-0">
                        {app}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 truncate mt-0.5">{text}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                  <button
                    onClick={() => addLog('NOTIFS', `Notification dismissed: ${title}`)}
                    className="hover:text-rose-400 text-slate-500 transition-colors p-1 rounded hover:bg-slate-900"
                    title="Dismiss"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
