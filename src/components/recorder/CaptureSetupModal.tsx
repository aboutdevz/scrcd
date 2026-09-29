import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { DisplaySource, CaptureConfig, CaptureScope } from '@/types';
import {
  Monitor,
  AppWindow,
  Crosshair,
  CircleDot,
  MousePointer,
  Sparkles,
} from 'lucide-react';

interface CaptureSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: CaptureConfig) => void;
}

export const CaptureSetupModal: React.FC<CaptureSetupModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const [displays, setDisplays] = useState<DisplaySource[]>([]);
  const [isMultiMonitor, setIsMultiMonitor] = useState(false);
  const [scope, setScope] = useState<CaptureScope>('window');
  const [selectedDisplayId, setSelectedDisplayId] = useState<number | undefined>(undefined);
  const [hotspotVariant, setHotspotVariant] = useState<'spotlight' | 'badge'>('spotlight');

  useEffect(() => {
    if (!isOpen) return;
    const loadSources = async () => {
      try {
        const res = await api.getCaptureSources();
        setDisplays(res.displays || []);
        setIsMultiMonitor(res.isMultiMonitor || false);
        if (res.displays && res.displays.length > 0) {
          setSelectedDisplayId(res.displays[0].id);
        }
      } catch (e) {
        console.error('Failed to load capture sources', e);
      }
    };
    loadSources();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    let monitorBounds: { x: number; y: number; width: number; height: number } | undefined;
    if (scope === 'monitor' && selectedDisplayId !== undefined) {
      const d = displays.find((item) => item.id === selectedDisplayId);
      if (d) monitorBounds = d.bounds;
    }

    onStart({
      scope,
      displayId: selectedDisplayId,
      monitorBounds,
      hotspotVariant,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div>
          <h2 className="text-base font-bold text-foreground">Recording Configuration</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose what area of your screen to record on each mouse click.
          </p>
        </div>

        {/* Capture Scope Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-foreground">Capture Scope</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Active Window */}
            <div
              onClick={() => setScope('window')}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                scope === 'window'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <AppWindow className="w-4 h-4" />
                <span className="text-xs font-semibold">Active Window</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                Snaps only the application window being clicked (Chrome, VS Code, etc.).
              </p>
            </div>

            {/* 2. Cursor Area */}
            <div
              onClick={() => setScope('cursor')}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                scope === 'cursor'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4" />
                <span className="text-xs font-semibold">Area Near Cursor</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                Snaps a focused 1200×750 viewport centered directly around your click.
              </p>
            </div>

            {/* 3. Specific Monitor (If Multi-Monitor or Single Monitor) */}
            <div
              onClick={() => setScope('monitor')}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                scope === 'monitor'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <span className="text-xs font-semibold">
                  {isMultiMonitor ? 'Specific Monitor' : 'Full Screen'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                {isMultiMonitor
                  ? 'Capture a single selected monitor instead of spanning all screens.'
                  : 'Capture the full primary display.'}
              </p>
            </div>

            {/* 4. All Monitors */}
            {isMultiMonitor && (
              <div
                onClick={() => setScope('all')}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  scope === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/40 hover:bg-secondary/70 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  <span className="text-xs font-semibold">All Monitors</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                  Span entire multi-monitor desktop.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Monitor Dropdown when Scope === 'monitor' */}
        {scope === 'monitor' && displays.length > 1 && (
          <div className="space-y-1.5 animate-in fade-in duration-150">
            <label className="text-xs font-semibold text-foreground">Select Display</label>
            <select
              value={selectedDisplayId}
              onChange={(e) => setSelectedDisplayId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {displays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Hotspot Style Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Click Hotspot Style</label>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => setHotspotVariant('spotlight')}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                hotspotVariant === 'spotlight'
                  ? 'border-amber-500/80 bg-amber-500/10 text-foreground'
                  : 'border-border bg-secondary/40 hover:bg-secondary/70 text-muted-foreground'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-500 flex items-center justify-center text-amber-500">
                <MousePointer className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold">Glowing Spotlight</div>
                <div className="text-[10px] text-muted-foreground">Translucent halo with pointer</div>
              </div>
            </div>

            <div
              onClick={() => setHotspotVariant('badge')}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                hotspotVariant === 'badge'
                  ? 'border-primary/80 bg-primary/10 text-foreground'
                  : 'border-border bg-secondary/40 hover:bg-secondary/70 text-muted-foreground'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-bold">
                1
              </div>
              <div>
                <div className="text-xs font-semibold">Numbered Badge</div>
                <div className="text-[10px] text-muted-foreground">Sequential numbered circle</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm"
          >
            Start Recording
          </button>
        </div>
      </div>
    </div>
  );
};
