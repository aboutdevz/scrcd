import React from 'react';
import { useStore } from '@/store/useStore';
import {
  Pause,
  Play,
  Square,
  Camera,
  Lock,
  Unlock,
  X,
  GripHorizontal,
} from 'lucide-react';

export const FloatingPill: React.FC = () => {
  const {
    isRecording,
    isPaused,
    appLock,
    togglePause,
    toggleAppLock,
    stopRecording,
    triggerManualSnapshot,
    steps,
  } = useStore();

  if (!isRecording) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-2 rounded-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-white select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Drag handle */}
      <div className="pl-2 pr-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300">
        <GripHorizontal className="w-4 h-4" />
      </div>

      {/* Recording status indicator */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isPaused
              ? 'bg-amber-400'
              : 'bg-red-500 animate-pulse ring-4 ring-red-500/20'
          }`}
        />
        <span className="text-xs font-semibold tabular-nums">
          {steps.length} {steps.length === 1 ? 'Step' : 'Steps'}
        </span>
      </div>

      {/* Pause / Resume */}
      <button
        onClick={togglePause}
        className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        title={isPaused ? 'Resume Recording' : 'Pause Recording'}
      >
        {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
      </button>

      {/* Manual Snapshot */}
      <button
        onClick={() => triggerManualSnapshot()}
        className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        title="Manual Snapshot (for hover states and tooltips)"
      >
        <Camera className="w-4 h-4" />
      </button>

      {/* App Lock Toggle */}
      <button
        onClick={toggleAppLock}
        className={`p-2 rounded-full transition-colors ${
          appLock
            ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
        }`}
        title={appLock ? 'App Lock: Active (Only recording clicked window)' : 'App Lock: Inactive (Recording all desktop)'}
      >
        {appLock ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>

      <div className="w-[1px] h-5 bg-slate-700 my-auto mx-0.5" />

      {/* Finish Button */}
      <button
        onClick={() => stopRecording()}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-600/30"
      >
        <Square className="w-3.5 h-3.5 fill-current" />
        Finish
      </button>

      {/* Discard button */}
      <button
        onClick={() => stopRecording()}
        className="p-1.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
        title="Cancel & Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
