'use client';

import React, { useState } from 'react';
import { useNexusStore } from '@/lib/deviceStore';
import { nexusWs } from '@/lib/websocket';
import { HardDrive, Folder, FileText, Trash2, RefreshCw } from 'lucide-react';

export default function HoloFileManager() {
  const [currentPath, setCurrentPath] = useState('/sdcard/Download');
  const selectedIndex = useNexusStore((state) => state.selectedDeviceIndex ?? 0);
  const liveFilesData = useNexusStore((state) => state.fileList[selectedIndex]);
  const addLog = useNexusStore((state) => state.addLog);

  // Auto-fetch real file tree on mount and path change
  React.useEffect(() => {
    nexusWs.sendDirectApi('LIST_FILES', { path: currentPath }, selectedIndex);
  }, [selectedIndex, currentPath]);

  const handleRefresh = () => {
    nexusWs.sendDirectApi('LIST_FILES', { path: currentPath }, selectedIndex);
    addLog('FILES', `Listing files in ${currentPath} on Device #${selectedIndex + 1}`);
  };

  const handleNavigate = (folderName: string) => {
    const newPath = currentPath.endsWith('/') ? `${currentPath}${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
  };

  const handleGoUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      setCurrentPath('/' + parts.join('/'));
    } else {
      setCurrentPath('/sdcard');
    }
  };

  const filesArray: any[] = Array.isArray(liveFilesData?.files)
    ? liveFilesData.files
    : Array.isArray(liveFilesData?.data?.files)
    ? liveFilesData.data.files
    : Array.isArray(liveFilesData)
    ? liveFilesData
    : [];

  return (
    <div className="flex flex-col p-2 w-full h-full min-h-0 gap-2.5 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs font-bold px-1 shrink-0">
        <div className="flex items-center gap-2 text-cyan-300">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>STORAGE &amp; FILE EXPLORER ({filesArray.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleGoUp}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-cyan-300 hover:text-white"
          >
            ⬆ Up
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" /> Refresh
          </button>
        </div>
      </div>

      {/* Path Bar */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 shrink-0">
        <span>Path:</span>
        <input
          type="text"
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRefresh()}
          className="flex-1 bg-transparent border-none text-white focus:outline-none"
        />
      </div>

      {/* File List */}
      <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto max-h-[580px] pr-1">
        {filesArray.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-slate-950/70 border border-slate-900 flex flex-col items-center justify-center gap-2">
            <Folder className="w-6 h-6 text-slate-600 animate-pulse" />
            <span>No files found or querying directory...</span>
            <button
              onClick={handleRefresh}
              className="mt-1 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold hover:bg-cyan-900 transition-all"
            >
              Scan Directory
            </button>
          </div>
        ) : (
          filesArray.map((f: any, idx: number) => {
            const fileName = f.name || f.filename || 'File';
            const isDirectory = f.is_dir || f.isDirectory || f.isDir || false;
            const sizeStr = isDirectory ? 'Folder' : f.formatted_size || f.size_str || `${Math.round((f.size || 0) / 1024)} KB`;
            const dateStr = f.last_modified || f.date || 'Recent';

            return (
              <div
                key={`file-${fileName}-${idx}`}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/30 text-xs transition-all cursor-pointer"
                onClick={() => isDirectory && handleNavigate(fileName)}
              >
                <div className="flex items-center gap-2 truncate">
                  {isDirectory ? (
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-200 truncate">{fileName}</span>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[10px] font-mono shrink-0">
                  <span>{sizeStr}</span>
                  <span>{dateStr}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nexusWs.sendDirectApi('DELETE_FILE', { path: `${currentPath}/${fileName}` }, selectedIndex);
                      addLog('FILES', `Deleted ${fileName}`);
                    }}
                    className="hover:text-rose-400 transition-colors p-1"
                    title="Delete File"
                  >
                    <Trash2 className="w-3 h-3" />
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
