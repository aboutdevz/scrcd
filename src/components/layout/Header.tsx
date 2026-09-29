import React from 'react';
import { useStore } from '@/store/useStore';
import {
  FileText,
  Play,
  Square,
  Download,
  Settings,
  FolderOpen,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onOpenExport: () => void;
  onOpenSimulator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExport, onOpenSimulator }) => {
  const {
    currentView,
    setCurrentView,
    activeProject,
    isRecording,
    startRecording,
    stopRecording,
    triggerManualSnapshot,
    steps,
  } = useStore();

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-6">
        <div
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight">SCRCD</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-none">Auto-SOP Creator</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-lg border border-border">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === 'dashboard'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Guides
          </button>
          <button
            disabled={!activeProject}
            onClick={() => setCurrentView('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === 'editor'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground disabled:opacity-40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Editor
            {steps.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary">
                {steps.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </nav>
      </div>

      {/* Center: Active Guide Title */}
      <div className="flex-1 max-w-md mx-6 text-center truncate">
        {activeProject ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-medium truncate text-foreground/90">
              {activeProject.title}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
              {activeProject.category}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">No guide selected</span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Simulator Button for browser dev testing */}
        {onOpenSimulator && (
          <button
            onClick={onOpenSimulator}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent border border-border transition-colors"
            title="Simulate clicks to test automatic step capture"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Simulate Click
          </button>
        )}

        {/* Record Button */}
        {isRecording ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => triggerManualSnapshot()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary hover:bg-accent border border-border transition-colors text-foreground"
            >
              <Camera className="w-3.5 h-3.5" />
              Snap (F8)
            </button>
            <button
              onClick={() => stopRecording()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Finish Recording
            </button>
          </div>
        ) : (
          <button
            onClick={() => startRecording(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Capture
          </button>
        )}

        {/* Export Button */}
        <button
          disabled={!activeProject || steps.length === 0}
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/80 border border-border transition-colors disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          Export Guide
        </button>
      </div>
    </header>
  );
};
