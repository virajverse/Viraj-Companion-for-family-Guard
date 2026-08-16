'use client';

import React, { useEffect, useState } from 'react';
import DynamicIsland from '@/components/header/DynamicIsland';
import HoloViewport from '@/components/vision/HoloViewport';
import TacticalRadarDeck from '@/components/sensory/TacticalRadarDeck';
import FleetTierMatrix from '@/components/devices/FleetTierMatrix';
import DeepTelemetryDeck from '@/components/telemetry/DeepTelemetryDeck';
import QuickActionGrid from '@/components/controls/QuickActionGrid';
import HoloAppDrawer from '@/components/apps/HoloAppDrawer';
import TacticalSmsDeck from '@/components/sms/TacticalSmsDeck';
import AppUsageDeck from '@/components/analytics/AppUsageDeck';
import RemoteUnlockDeck from '@/components/security/RemoteUnlockDeck';
import NotificationStream from '@/components/notifs/NotificationStream';
import RadioManagerDeck from '@/components/network/RadioManagerDeck';
import ContactsDeck from '@/components/contacts/ContactsDeck';
import HoloFileManager from '@/components/files/HoloFileManager';
import StorageOptimizerDeck from '@/components/storage/StorageOptimizerDeck';
import ClipboardKeyboardDeck from '@/components/tools/ClipboardKeyboardDeck';
import EspHardwareDeck from '@/components/hardware/EspHardwareDeck';
import MacroDeck from '@/components/automation/MacroDeck';
import OmniDock from '@/components/controls/OmniDock';
import { nexusWs } from '@/lib/websocket';
import { useNexusStore } from '@/lib/deviceStore';
import {
  LayoutGrid,
  MessageSquare,
  BarChart3,
  KeyRound,
  Bell,
  Radio,
  Users,
  FolderOpen,
  Trash2,
  Keyboard,
  Cpu,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';

export default function NexusStudioPage() {
  const [subsystemTab, setSubsystemTab] = useState<
    | 'APPS'
    | 'SMS'
    | 'USAGE'
    | 'UNLOCK'
    | 'NOTIFS'
    | 'RADIOS'
    | 'CALLS'
    | 'FILES'
    | 'CLEAN'
    | 'TOOLS'
    | 'ESP'
    | 'MACROS'
  >('APPS');

  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const systemLogs = useNexusStore((state) => state.systemLogs);

  // Auto-connect bridge on initial load
  useEffect(() => {
    nexusWs.connect();
    return () => {
      nexusWs.disconnect();
    };
  }, []);

  const tabs = [
    { id: 'APPS', label: 'Apps', icon: LayoutGrid },
    { id: 'SMS', label: 'SMS', icon: MessageSquare },
    { id: 'USAGE', label: 'Usage', icon: BarChart3 },
    { id: 'UNLOCK', label: 'Unlock', icon: KeyRound },
    { id: 'NOTIFS', label: 'Notifs', icon: Bell },
    { id: 'RADIOS', label: 'Radios', icon: Radio },
    { id: 'CALLS', label: 'Calls', icon: Users },
    { id: 'FILES', label: 'Files', icon: FolderOpen },
    { id: 'CLEAN', label: 'Clean', icon: Trash2 },
    { id: 'TOOLS', label: 'Tools', icon: Keyboard },
    { id: 'ESP', label: 'IoT', icon: Cpu },
    { id: 'MACROS', label: 'Macros', icon: Sparkles },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 relative pb-20 select-none">
      {/* 🛸 Top Floating Dynamic Island */}
      <DynamicIsland />

      {/* 🌌 Master High-Density Sci-Fi Cockpit Matrix */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* COLUMN 1 (4 Cols): Master Sensory Viewport & Deep Telemetry */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <HoloViewport />
          <DeepTelemetryDeck />
        </div>

        {/* COLUMN 2 (4 Cols): Tactical Radar, Fleet Shield & 16-Tool Quick Arsenal */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <TacticalRadarDeck />
          <QuickActionGrid />
          <FleetTierMatrix />
        </div>

        {/* COLUMN 3 (4 Cols): Complete 12-Subsystem Mission Deck */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-card cyber-bracket p-3.5 flex flex-col gap-3 w-full max-h-[820px] overflow-hidden">
            {/* Subsystem Micro-Tabs Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
                {tabs.map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = subsystemTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSubsystemTab(tab.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 active:scale-95 ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <IconComp className="w-3 h-3" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Subsystem Panel */}
            <div className="flex-1 overflow-hidden">
              {subsystemTab === 'APPS' && <HoloAppDrawer />}
              {subsystemTab === 'SMS' && <TacticalSmsDeck />}
              {subsystemTab === 'USAGE' && <AppUsageDeck />}
              {subsystemTab === 'UNLOCK' && <RemoteUnlockDeck />}
              {subsystemTab === 'NOTIFS' && <NotificationStream />}
              {subsystemTab === 'RADIOS' && <RadioManagerDeck />}
              {subsystemTab === 'CALLS' && <ContactsDeck />}
              {subsystemTab === 'FILES' && <HoloFileManager />}
              {subsystemTab === 'CLEAN' && <StorageOptimizerDeck />}
              {subsystemTab === 'TOOLS' && <ClipboardKeyboardDeck />}
              {subsystemTab === 'ESP' && <EspHardwareDeck />}
              {subsystemTab === 'MACROS' && <MacroDeck />}
            </div>
          </div>
        </div>
      </main>

      {/* 🕹️ Floating Bottom Omni-Dock */}
      <OmniDock
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
      />

      {/* 💻 Collapsible System Event Terminal Drawer */}
      {isTerminalOpen && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in slide-in-from-bottom duration-200">
          <div className="glass-panel rounded-2xl p-3 flex flex-col gap-2 border border-cyan-500/40 shadow-2xl">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Terminal className="w-3.5 h-3.5" /> Ultron Nexus Sovereign System Log
              </span>
              <button
                onClick={() => setIsTerminalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-32 overflow-y-auto font-mono text-[10px] p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-1">
              {systemLogs.length === 0 ? (
                <span className="text-slate-600">Sovereign Bridge online. No abnormal alerts.</span>
              ) : (
                systemLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-1.5">
                    <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="px-1 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[9px]">
                      {log.tag}
                    </span>
                    <span className="text-slate-300 truncate">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
