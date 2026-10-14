import React, { useEffect } from 'react';
import { Combine, ArrowRight, X, Layers, MousePointer, Info } from 'lucide-react';
import { Step } from '@/types';

interface MergeStepsModalProps {
  isOpen: boolean;
  s1: Step | null;
  s2: Step | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MergeStepsModal: React.FC<MergeStepsModalProps> = ({
  isOpen,
  s1,
  s2,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen || !s1 || !s2) return null;

  const s1Hotspots = s1.annotations.filter((a) => a.type === 'hotspot').length;
  const s2Hotspots = s2.annotations.filter((a) => a.type === 'hotspot').length;
  const s1Shapes = s1.annotations.filter((a) => a.type !== 'hotspot').length;
  const s2Shapes = s2.annotations.filter((a) => a.type !== 'hotspot').length;

  const stripHtml = (html?: string) => {
    if (!html) return 'No instructions';
    return html.replace(/<[^>]*>?/gm, '').trim() || 'No instructions';
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-foreground">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Combine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Merge Steps</h3>
              <p className="text-xs text-muted-foreground">
                Combine Step {s1.stepNumber} and Step {s2.stepNumber} into a single unified step
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground text-xs p-1 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Comparison: Step 1 + Step 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative items-stretch">
          {/* Step 1 Card (Base) */}
          <div className="rounded-xl border-2 border-primary/40 bg-secondary/30 p-3.5 flex flex-col justify-between space-y-3 relative overflow-hidden">
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold tracking-wider uppercase">
              Target Step
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {s1.stepNumber}
                </span>
                <span className="font-semibold text-xs text-foreground truncate" title={s1.title || 'Untitled'}>
                  {s1.title || 'Untitled Step'}
                </span>
              </div>

              {/* Thumbnail */}
              <div className="w-full h-36 rounded-lg bg-background border border-border overflow-hidden relative flex items-center justify-center">
                {s1.screenshotPath ? (
                  <img
                    src={s1.screenshotPath}
                    alt={s1.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground text-xs flex flex-col items-center gap-1">
                    <Layers className="w-6 h-6 opacity-40" />
                    <span>No image</span>
                  </div>
                )}
              </div>

              {/* Step 1 Metadata */}
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5">
                  <MousePointer className="w-3 h-3 text-primary" />
                  <span>Action: </span>
                  <span className="font-medium text-foreground uppercase">{s1.actionType || 'click'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-primary" />
                  <span>Annotations: </span>
                  <span className="font-medium text-foreground">
                    {s1Hotspots} hotspot{s1Hotspots !== 1 ? 's' : ''}, {s1Shapes} shape{s1Shapes !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="line-clamp-2 text-[11px] text-muted-foreground/90 italic pt-1 border-t border-border/50">
                  "{stripHtml(s1.richInstructions)}"
                </p>
              </div>
            </div>
          </div>

          {/* Merge Direction Icon between columns */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card border-2 border-primary text-primary items-center justify-center shadow-lg">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Step 2 Card (To be absorbed) */}
          <div className="rounded-xl border border-border bg-secondary/20 p-3.5 flex flex-col justify-between space-y-3 relative overflow-hidden">
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              Will Be Merged
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-muted-foreground/30 text-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {s2.stepNumber}
                </span>
                <span className="font-semibold text-xs text-foreground truncate" title={s2.title || 'Untitled'}>
                  {s2.title || 'Untitled Step'}
                </span>
              </div>

              {/* Thumbnail */}
              <div className="w-full h-36 rounded-lg bg-background border border-border overflow-hidden relative flex items-center justify-center">
                {s2.screenshotPath ? (
                  <img
                    src={s2.screenshotPath}
                    alt={s2.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground text-xs flex flex-col items-center gap-1">
                    <Layers className="w-6 h-6 opacity-40" />
                    <span>No image</span>
                  </div>
                )}
              </div>

              {/* Step 2 Metadata */}
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5">
                  <MousePointer className="w-3 h-3 text-muted-foreground" />
                  <span>Action: </span>
                  <span className="font-medium text-foreground uppercase">{s2.actionType || 'click'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-muted-foreground" />
                  <span>Annotations: </span>
                  <span className="font-medium text-foreground">
                    {s2Hotspots} hotspot{s2Hotspots !== 1 ? 's' : ''}, {s2Shapes} shape{s2Shapes !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="line-clamp-2 text-[11px] text-muted-foreground/90 italic pt-1 border-t border-border/50">
                  "{stripHtml(s2.richInstructions)}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold text-foreground">What happens when merged?</span>
            <p>
              All annotations and click hotspots from Step {s2.stepNumber} will be sequentially renumbered and transferred to Step {s1.stepNumber}. Rich text instructions will be appended, Step {s2.stepNumber} will be removed, and the editor will immediately display the combined result. You can undo anytime with <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border text-foreground">Ctrl+Z</kbd>.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-colors"
          >
            <Combine className="w-3.5 h-3.5" />
            <span>Merge Steps</span>
          </button>
        </div>
      </div>
    </div>
  );
};
