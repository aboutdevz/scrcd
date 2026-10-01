import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { isElectron, getElectron } from '@/services/api';
import {
  Pause,
  Play,
  Square,
  Camera,
  X,
  GripHorizontal,
} from 'lucide-react';

interface FloatingPillProps {
  isStandalone?: boolean;
}

export const FloatingPill: React.FC<FloatingPillProps> = ({ isStandalone = false }) => {
  const {
    isRecording,
    isPaused: storePaused,
    togglePause: storeTogglePause,
    stopRecording: storeStopRecording,
    triggerManualSnapshot: storeSnapshot,
    steps,
  } = useStore();

  const [stepCount, setStepCount] = useState(steps.length);
  const [isPaused, setIsPaused] = useState(storePaused);
  const [hookActive, setHookActive] = useState(true);
  const [captureScope, setCaptureScope] = useState<'monitor' | 'cursor'>('cursor');

  useEffect(() => {
    if (isElectron()) {
      const electron = getElectron();
      if (electron && electron.ipcRenderer) {
        const onCount = (_e: any, count: number) => {
          setStepCount(count);
        };
        const onPause = (_e: any, paused: boolean) => {
          setIsPaused(paused);
        };
        const onHookStatus = (_e: any, status: { active: boolean; message?: string }) => {
          if (typeof status?.active === 'boolean') {
            setHookActive(status.active);
          }
        };
        const onScope = (_e: any, scope: string) => {
          if (scope === 'monitor' || scope === 'cursor') {
            setCaptureScope(scope);
          }
        };

        electron.ipcRenderer.on('pill-step-count', onCount);
        electron.ipcRenderer.on('pill-pause-state', onPause);
        electron.ipcRenderer.on('hook-status', onHookStatus);
        electron.ipcRenderer.on('pill-scope-change', onScope);

        electron.ipcRenderer.invoke('get-capture-scope').then((scope: string) => {
          if (scope === 'monitor' || scope === 'cursor') {
            setCaptureScope(scope);
          }
        }).catch(() => {});

        return () => {
          electron.ipcRenderer.removeListener('pill-step-count', onCount);
          electron.ipcRenderer.removeListener('pill-pause-state', onPause);
          electron.ipcRenderer.removeListener('hook-status', onHookStatus);
          electron.ipcRenderer.removeListener('pill-scope-change', onScope);
        };
      }
    } else {
      setStepCount(steps.length);
      setIsPaused(storePaused);
    }
  }, [steps.length, storePaused]);

  // When not standalone and not recording in browser, don't render
  if (!isStandalone && !isRecording) return null;

  const handlePause = async () => {
    if (isElectron()) {
      const electron = getElectron();
      if (electron) {
        const paused = await electron.ipcRenderer.invoke('pause-recording');
        setIsPaused(paused);
        return;
      }
    }
    storeTogglePause();
  };

  const handleSnapshot = async () => {
    if (isElectron()) {
      const electron = getElectron();
      if (electron) {
        await electron.ipcRenderer.invoke('manual-snapshot');
        return;
      }
    }
    storeSnapshot();
  };

  const handleFinish = async () => {
    if (isElectron()) {
      const electron = getElectron();
      if (electron) {
        await electron.ipcRenderer.invoke('finish-recording');
        return;
      }
    }
    storeStopRecording();
  };

  const handleCancel = async () => {
    if (isElectron()) {
      const electron = getElectron();
      if (electron) {
        await electron.ipcRenderer.invoke('cancel-recording');
        return;
      }
    }
    storeStopRecording();
  };

  const handleToggleScope = async (targetScope: 'monitor' | 'cursor') => {
    setCaptureScope(targetScope);
    if (isElectron()) {
      const electron = getElectron();
      if (electron && electron.ipcRenderer) {
        await electron.ipcRenderer.invoke('set-capture-scope', targetScope);
      }
    }
  };

  const containerClasses = isStandalone
    ? "fixed inset-0 w-full h-full flex items-center justify-between px-3 py-1.5 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl text-white select-none overflow-hidden"
    : "fixed bottom-6 right-6 z-50 flex items-center gap-2 p-2 rounded-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-white select-none animate-in fade-in slide-in-from-bottom-4 duration-300";

  return (
    <div
      style={{ WebkitAppRegion: isStandalone ? 'drag' : undefined } as any}
      className={containerClasses}
    >
      {/* Drag handle */}
      <div className="pl-1 pr-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-200">
        <GripHorizontal className="w-4 h-4" />
      </div>

      {/* Recording status indicator & step counter */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isPaused
              ? 'bg-amber-400'
              : 'bg-red-500 animate-pulse ring-2 ring-red-500/30'
          }`}
        />
        <span className="text-xs font-semibold tabular-nums">
          {stepCount} {stepCount === 1 ? 'Step' : 'Steps'}
        </span>
      </div>

      {/* Mode Toggle: Segmented Full vs Cursor */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as any}
        className="flex items-center p-0.5 bg-slate-800/90 rounded-full border border-slate-700/60 text-[10px] font-semibold tracking-tight"
        title="Toggle capture mode: Full Screen or Area Near Cursor"
      >
        <button
          onClick={() => handleToggleScope('monitor')}
          className={`px-2 py-0.5 rounded-full transition-all ${
            captureScope === 'monitor'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Full Screen capture mode"
        >
          Full
        </button>
        <button
          onClick={() => handleToggleScope('cursor')}
          className={`px-2 py-0.5 rounded-full transition-all ${
            captureScope === 'cursor'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Near Cursor capture mode (1200x750 viewport)"
        >
          Cursor
        </button>
      </div>

      {/* Pause / Resume */}
      <button
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onClick={handlePause}
        className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        title={isPaused ? 'Resume Recording' : 'Pause Recording'}
      >
        {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
      </button>

      {/* Manual Snapshot */}
      <button
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onClick={handleSnapshot}
        className={`p-1.5 rounded-full transition-colors ${
          !hookActive
            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 ring-1 ring-amber-400/50'
            : 'hover:bg-slate-800 text-slate-300 hover:text-white'
        }`}
        title={
          !hookActive
            ? 'Automatic click hook restricted by AV. Click here or press Ctrl+Shift+C / F10 to capture screenshot.'
            : 'Take Screen Snapshot (or press Ctrl+Shift+C / F10)'
        }
      >
        <Camera className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-slate-700 my-auto mx-0.5" />

      {/* Finish Button */}
      <button
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onClick={handleFinish}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-md shadow-red-600/30"
        title="Finish Recording"
      >
        <Square className="w-3 h-3 fill-current" />
        Finish
      </button>

      {/* Discard / Cancel button */}
      <button
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onClick={handleCancel}
        className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Cancel Recording"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
