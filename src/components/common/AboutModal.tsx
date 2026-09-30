import React from 'react';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/common/Logo';
import { APP_VERSION } from '@/config/version';
import {
  X,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  BookOpen,
  FileCode,
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { setCurrentView } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-6 border-b border-border flex flex-col items-center text-center relative bg-secondary/15">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-3 rounded-2xl bg-card border border-border shadow-sm mb-3">
            <Logo size="lg" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-foreground">SCRCD</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step-by-Step SOP & Procedural Guide Creator
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
              Version {APP_VERSION}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
              Stable Release
            </span>
          </div>
        </div>

        {/* System & Architecture Info */}
        <div className="p-6 space-y-4 text-xs">
          <div className="rounded-lg bg-secondary/30 border border-border p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                Runtime Engine
              </span>
              <span className="font-mono text-foreground font-medium">Electron Desktop / React 18</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Capture Engine
              </span>
              <span className="font-mono text-foreground font-medium">Windows Native UIA / C#</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Architecture
              </span>
              <span className="font-mono text-foreground font-medium">100% Local-First & Private</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-primary" />
                License
              </span>
              <span className="font-mono text-foreground font-medium">MIT License</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Record workflows, snap on click, mosaic-redact sensitive credentials, and compile procedures into master PDF, Word, PowerPoint, and HTML binders.
          </p>

          {/* Quick Actions */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
