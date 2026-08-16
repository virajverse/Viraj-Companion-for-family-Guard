'use client';

import React, { useState } from 'react';
import { nexusWs } from '@/lib/websocket';
import { useNexusStore } from '@/lib/deviceStore';
import { Folder, FileText, Trash2, Download, RefreshCw, HardDrive } from 'lucide-react';

export default function FileManager() {
  const [currentPath, setCurrentPath] = useState('/sdcard/Download');
  const addLog = useNexusStore((state) => state.addLog);

  const sampleFiles = [
    { name: 'BrainCompanion.apk', size: '14.2 MB', isDir: false, date: 'Today' },
    { name: 'DCIM', size: '--', isDir: true, date: 'Yesterday' },
    { name: 'Documents', size: '--', isDir: true, date: '3 days ago' },
    { name: 'Ultron_Snapshot_1786.jpg', size: '1.8 MB', isDir: false, date: '10 mins ago' },
  ];

  const handleRefresh = () => {
    nexusWs.sendDirectApi('LIST_FILES', { path: currentPath });
    addLog('FILES', `Listing files in ${currentPath}`);
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-4 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>REMOTE FILE EXPLORER & STORAGE BROWSER</span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-cyan-400" /> Refresh Dir
        </button>
      </div>

      {/* Path Breadcrumb */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-cyan-300">
        <span>Path:</span>
        <input
          type="text"
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          className="flex-1 bg-transparent border-none text-white focus:outline-none"
        />
      </div>

      {/* Files List */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {sampleFiles.map((f) => (
          <div
            key={f.name}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-900 transition-all text-xs"
          >
            <div className="flex items-center gap-2.5">
              {f.isDir ? <Folder className="w-4 h-4 text-amber-400" /> : <FileText className="w-4 h-4 text-cyan-400" />}
              <span className="font-semibold text-slate-200">{f.name}</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400 text-[11px] font-mono">
              <span>{f.size}</span>
              <span>{f.date}</span>
              <button
                onClick={() => nexusWs.sendDirectApi('DELETE_FILE', { path: `${currentPath}/${f.name}` })}
                title="Delete File"
                className="hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
