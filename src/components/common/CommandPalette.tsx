import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Project, Folder } from '@/types';
import { api } from '@/services/api';
import { APP_VERSION } from '@/config/version';
import {
  Search,
  Folder as FolderIcon,
  FileText,
  Play,
  Plus,
  Info,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SearchResultItem {
  id: string;
  type: 'folder' | 'guide' | 'step' | 'action';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    folders,
    projects,
    selectProject,
    setActiveFolderId,
    setCurrentView,
    setIsAboutOpen,
    startRecording,
  } = useStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stepResults, setStepResults] = useState<SearchResultItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Deep search in steps when query has 3+ chars
  useEffect(() => {
    let isCancelled = false;
    const searchSteps = async () => {
      const q = query.trim().toLowerCase();
      if (q.length < 3) {
        setStepResults([]);
        return;
      }

      const matchingStepItems: SearchResultItem[] = [];
      for (const p of projects.slice(0, 10)) {
        if (isCancelled) return;
        try {
          const steps = await api.listSteps(p.id);
          for (const s of steps) {
            if (
              s.title.toLowerCase().includes(q) ||
              s.richInstructions.toLowerCase().includes(q)
            ) {
              matchingStepItems.push({
                id: `step_${s.id}`,
                type: 'step',
                title: s.title,
                subtitle: `Inside "${p.title}" • Step ${s.stepNumber}`,
                icon: <FileText className="w-4 h-4 text-emerald-500" />,
                onSelect: async () => {
                  setCommandPaletteOpen(false);
                  await selectProject(p.id);
                  useStore.getState().selectStep(s.id);
                },
              });
              if (matchingStepItems.length >= 6) break;
            }
          }
        } catch {}
      }

      if (!isCancelled) {
        setStepResults(matchingStepItems);
      }
    };

    const timeout = setTimeout(searchSteps, 150);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [query, projects, selectProject, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const q = query.trim().toLowerCase();

  // 1. Folders Matching
  const folderItems: SearchResultItem[] = folders
    .filter((f) => f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)))
    .slice(0, 4)
    .map((f) => ({
      id: `folder_${f.id}`,
      type: 'folder',
      title: f.name,
      subtitle: `${projects.filter((p) => p.folderId === f.id).length} guides`,
      icon: <FolderIcon className="w-4 h-4 text-primary" />,
      onSelect: () => {
        setCommandPaletteOpen(false);
        setActiveFolderId(f.id);
        setCurrentView('dashboard');
      },
    }));

  // 2. Guides Matching
  const guideItems: SearchResultItem[] = projects
    .filter((p) => {
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchDesc = p.description && p.description.toLowerCase().includes(q);
      const matchTag = p.tags && p.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchTag;
    })
    .slice(0, 6)
    .map((p) => ({
      id: `guide_${p.id}`,
      type: 'guide',
      title: p.title,
      subtitle: `${p.category} • v${p.version || '1.0.0'}${p.tags?.length ? ` • [${p.tags.join(', ')}]` : ''}`,
      icon: <FileText className="w-4 h-4 text-primary" />,
      onSelect: async () => {
        setCommandPaletteOpen(false);
        await selectProject(p.id);
      },
    }));

  // 3. Quick Actions
  const actionItems: SearchResultItem[] = ([
    {
      id: 'action_record',
      type: 'action' as const,
      title: 'Record Workflow',
      subtitle: 'Launch screen recorder and capture clicks',
      icon: <Play className="w-4 h-4 text-primary" />,
      onSelect: () => {
        setCommandPaletteOpen(false);
        startRecording();
      },
    },
    {
      id: 'action_new_guide',
      type: 'action' as const,
      title: 'Create New Guide',
      subtitle: 'Author a new procedural guide manually',
      icon: <Plus className="w-4 h-4 text-primary" />,
      onSelect: () => {
        setCommandPaletteOpen(false);
        setCurrentView('dashboard');
      },
    },
    {
      id: 'action_about',
      type: 'action' as const,
      title: `About SCRCD (Version ${APP_VERSION})`,
      subtitle: 'View application runtime, version and build details',
      icon: <Info className="w-4 h-4 text-primary" />,
      onSelect: () => {
        setCommandPaletteOpen(false);
        setIsAboutOpen(true);
      },
    },
  ] as SearchResultItem[]).filter((a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q));

  const allItems = [...folderItems, ...guideItems, ...stepResults, ...actionItems];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev + 1) % allItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev - 1 + allItems.length) % allItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Header */}
        <div className="p-3.5 border-b border-border flex items-center gap-3 bg-secondary/20">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a guide, step text, folder name, or command..."
            className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-border/40">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching folders, guides, or commands found for "{query}".
            </div>
          ) : (
            <div className="space-y-0.5">
              {allItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                      <div className={isSelected ? 'text-primary-foreground' : 'text-primary'}>
                        {item.icon}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold truncate">{item.title}</div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-border bg-secondary/10 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-secondary border border-border">↑</kbd>{' '}
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-secondary border border-border">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border">↵</kbd> Select
            </span>
          </div>
          <span className="font-mono text-[10px]">SCRCD Quick Switcher</span>
        </div>
      </div>
    </div>
  );
};
