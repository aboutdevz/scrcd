import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/common/Logo';
import {
  Play,
  Plus,
  BookOpen,
  X,
  CheckCircle2,
  FolderPlus,
  ArrowRight,
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: () => void;
  onOpenCreateGuide: () => void;
  onLoadSample: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartRecording,
  onOpenCreateGuide,
  onLoadSample,
}) => {
  const { setHasCompletedOnboarding } = useStore();
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (dontShowAgain) {
      setHasCompletedOnboarding(true);
    }
    onClose();
  };

  const handleAction = (action: () => void) => {
    if (dontShowAgain) {
      setHasCompletedOnboarding(true);
    }
    onClose();
    action();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/15">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-card border border-border shadow-sm">
              <Logo size="md" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Welcome to SCRCD</h2>
              <p className="text-xs text-muted-foreground">
                Local-first procedural guide & standard operating procedure generator
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Pathways */}
        <div className="p-6 space-y-3">
          <p className="text-xs text-muted-foreground mb-4">
            Choose how you would like to get started today:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Action 1: Record Workflow */}
            <div
              onClick={() => handleAction(onStartRecording)}
              className="group p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-secondary/40 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-sm hover:shadow"
            >
              <div className="flex items-center gap-2.5 text-primary">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Record Workflow
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Automatically capture screenshots and generate instructions on every click.
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <span>Start recording</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Action 2: Create Guide */}
            <div
              onClick={() => handleAction(onOpenCreateGuide)}
              className="group p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-secondary/40 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-sm hover:shadow"
            >
              <div className="flex items-center gap-2.5 text-primary">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Create Guide Manually
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Create a guide from scratch with custom tags and assign it into a folder.
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <span>New guide</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Action 4: Load Sample Demo */}
            <div
              onClick={() => handleAction(onLoadSample)}
              className="group p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-secondary/40 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-sm hover:shadow"
            >
              <div className="flex items-center gap-2.5 text-primary">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Explore Sample Guide
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Load a pre-configured multi-step procedure to test canvas annotations and export formats.
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <span>Load sample</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/10 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Don't show this welcome screen on startup</span>
          </label>

          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border transition-colors"
          >
            Go to Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
