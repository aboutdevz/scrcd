import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/common/Logo';
import { APP_VERSION } from '@/config/version';
import {
  FolderOpen,
  Layers,
  Settings,
  Sun,
  Moon,
  Play,
  Download,
  Pencil,
  Search,
  HelpCircle,
  Info,
  BookOpen,
} from 'lucide-react';

interface HeaderProps {
  onOpenExport: () => void;
  onOpenSimulator?: () => void;
  onOpenCaptureSetup?: () => void;
  onOpenWelcome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExport,
  onOpenSimulator,
  onOpenCaptureSetup,
  onOpenWelcome,
}) => {
  const {
    currentView,
    setCurrentView,
    activeProject,
    updateProject,
    isRecording,
    startRecording,
    steps,
    folders,
    setCommandPaletteOpen,
    setIsAboutOpen,
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeProject) {
      setTitleValue(activeProject.title);
    }
  }, [activeProject?.title]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
    };
    if (isHelpOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHelpOpen]);

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

  const activeProjectFolder = activeProject?.folderId
    ? folders.find((f) => f.id === activeProject.folderId)
    : null;

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-5">
        {/* Brand Click opens About dialog */}
        <div
          onClick={() => setIsAboutOpen(true)}
          className="cursor-pointer flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          title="Click to view About SCRCD and Version"
        >
          <Logo size="md" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-foreground leading-tight">
              SCRCD
            </span>
            <span className="font-mono text-[9px] text-muted-foreground leading-none">
              v{APP_VERSION}
            </span>
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
            <span>Guides</span>
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
            <span>Editor</span>
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
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Center: Active Guide Title & Folder Breadcrumb */}
      <div className="flex-1 max-w-md mx-4 text-center truncate flex items-center justify-center">
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
            <div className="flex items-center gap-1.5 max-w-full truncate">
              {activeProjectFolder && (
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: activeProjectFolder.color || '#2563eb' }}
                  />
                  <span>{activeProjectFolder.name}</span>
                  <span className="text-muted-foreground/60">/</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-secondary/70 transition-colors max-w-full truncate"
                title="Click to rename guide"
              >
                <span className="text-xs font-semibold truncate text-foreground">
                  {activeProject.title}
                </span>
                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border shrink-0"
                title={`Guide Version: ${activeProject.version || '1.0.0'}`}
              >
                v{activeProject.version || '1.0.0'}
              </span>
            </div>
          )
        ) : null}
      </div>

      {/* Right: Quick Search, Actions, Help Menu, Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Global Quick Search (Ctrl+K) */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Search guides, steps and folders (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">Search</span>
          <kbd className="font-mono text-[10px] px-1 rounded bg-secondary text-muted-foreground border border-border">
            Ctrl+K
          </kbd>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Help Menu Flyout */}
        <div ref={helpRef} className="relative">
          <button
            type="button"
            onClick={() => setIsHelpOpen((prev) => !prev)}
            className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Help & Onboarding"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {isHelpOpen && (
            <div className="absolute right-0 top-9 z-40 w-48 bg-card border border-border rounded-xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsHelpOpen(false);
                  setIsAboutOpen(true);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-left hover:bg-secondary text-foreground transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-primary" />
                <span>About SCRCD (v{APP_VERSION})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsHelpOpen(false);
                  onOpenWelcome?.();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-left hover:bg-secondary text-foreground transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Welcome Screen</span>
              </button>
            </div>
          )}
        </div>

        {/* Export Button (only when in editor with active steps) */}
        {currentView === 'editor' && (
          <button
            disabled={!activeProject || steps.length === 0}
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        )}

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
            <span>Record</span>
          </button>
        ) : (
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Recording...</span>
          </span>
        )}
      </div>
    </header>
  );
};
