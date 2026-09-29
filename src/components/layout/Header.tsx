import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/common/Logo';
import {
  FolderOpen,
  Layers,
  Settings,
  Sun,
  Moon,
  Play,
  Download,
  Pencil,
} from 'lucide-react';

interface HeaderProps {
  onOpenExport: () => void;
  onOpenSimulator?: () => void;
  onOpenCaptureSetup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExport, onOpenSimulator, onOpenCaptureSetup }) => {
  const {
    currentView,
    setCurrentView,
    activeProject,
    updateProject,
    isRecording,
    startRecording,
    steps,
  } = useStore();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('scrcd_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('scrcd_theme', theme);
  }, [theme]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  useEffect(() => {
    if (activeProject) {
      setTitleValue(activeProject.title);
    }
  }, [activeProject?.title]);

  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    if (!activeProject) return;
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== activeProject.title) {
      await updateProject({
        ...activeProject,
        title: trimmed,
        updatedAt: Date.now(),
      });
    } else {
      setTitleValue(activeProject.title);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-6">
        <div
          onClick={() => setCurrentView('dashboard')}
          className="cursor-pointer flex items-center gap-2.5 hover:opacity-85 transition-opacity"
        >
          <Logo size="md" />
          <span className="font-bold text-base tracking-tight text-foreground">
            SCRCD
          </span>
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
      <div className="flex-1 max-w-md mx-6 text-center truncate flex items-center justify-center">
        {activeProject ? (
          isEditingTitle ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveTitle();
              }}
              className="w-full max-w-xs flex items-center gap-1.5"
            >
              <input
                type="text"
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setTitleValue(activeProject.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full px-2.5 py-1 text-xs font-medium rounded-md bg-secondary border border-primary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-secondary/70 transition-colors max-w-full truncate"
              title="Click to rename guide"
            >
              <span className="text-xs font-medium truncate text-foreground">
                {activeProject.title}
              </span>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          )
        ) : (
          <span className="text-xs text-muted-foreground">No guide selected</span>
        )}
      </div>

      {/* Right: Actions & Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Export Button */}
        <button
          disabled={!activeProject || steps.length === 0}
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-colors disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>

        {/* Record Trigger Button */}
        {!isRecording ? (
          <button
            onClick={() => {
              if (onOpenCaptureSetup) {
                onOpenCaptureSetup();
              } else {
                startRecording();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Record
          </button>
        ) : (
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording...
          </span>
        )}
      </div>
    </header>
  );
};
