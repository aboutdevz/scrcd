import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { isTauri } from '@/services/api';
import {
  Settings,
  Palette,
  ShieldCheck,
  HardDrive,
  Check,
  Sparkles,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { branding, updateBranding } = useStore();

  const [companyName, setCompanyName] = useState(branding.companyName);
  const [author, setAuthor] = useState(branding.author);
  const [accentColor, setAccentColor] = useState(branding.accentColor);
  const [footerText, setFooterText] = useState(branding.footerText);
  const [saved, setSaved] = useState(false);

  // Quality settings
  const [webpQuality, setWebpQuality] = useState(85);
  const [losslessPng, setLosslessPng] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding({
      companyName,
      author,
      accentColor,
      footerText,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Application Settings</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure global document branding, screenshot storage options, and local privacy parameters.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Global Branding */}
          <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Palette className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Global Documentation Branding</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Default Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Company / Organization</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-28 px-2 py-1 rounded bg-secondary/50 border border-border text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Document Footer Notice</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Screenshot Compression & Storage */}
          <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <HardDrive className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Screenshot Compression & Storage</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold">WebP Image Encoding Quality</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Recommended 85% for crisp text and ~70% smaller file sizes than PNG
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-primary">{webpQuality}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={100}
                value={webpQuality}
                onChange={(e) => setWebpQuality(Number(e.target.value))}
                className="w-full accent-primary"
              />

              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-xs font-semibold">Use Lossless PNG Format</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Saves uncompressed PNG files at the expense of larger disk usage
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={losslessPng}
                  onChange={(e) => setLosslessPng(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Privacy & System Environment */}
          <div className="rounded-xl border border-border bg-card/60 p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Offline Privacy & Environment</h3>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between py-1">
                <span>Network Connection Status:</span>
                <span className="font-semibold text-emerald-500 flex items-center gap-1">
                  ● 100% Offline (Zero Telemetry)
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span>Database Engine:</span>
                <span className="font-mono text-foreground">SQLite 3 (Local AppData)</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span>Runtime Mode:</span>
                <span className="font-semibold text-foreground">
                  {isTauri() ? 'Tauri v2 Desktop Native' : 'Browser Dev-Bridge Simulation'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {saved && (
                <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  Settings Saved Successfully
                </span>
              )}
            </div>

            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
