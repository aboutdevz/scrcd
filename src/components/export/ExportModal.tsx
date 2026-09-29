import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { generateDocx } from '@/services/exporters/exportDocx';
import { generatePptx } from '@/services/exporters/exportPptx';
import { generateHtml } from '@/services/exporters/exportHtml';
import { generateMarkdownZip } from '@/services/exporters/exportMarkdown';
import { exportProjectToJson } from '@/services/exporters/exportJson';
import { generateAnimatedGif, generateAnimatedWalkthrough } from '@/services/exporters/exportGif';
import { bakeStepsForExport } from '@/services/imageBaker';
import { api, isElectron } from '@/services/api';
import {
  FileText,
  FileCode,
  Presentation,
  Globe,
  Archive,
  Film,
  CheckCircle,
  Loader2,
  X,
  Palette,
  Download,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportType = 'pdf' | 'docx' | 'pptx' | 'html' | 'md' | 'json' | 'gif';

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, steps, branding } = useStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportType>('pdf');
  const [walkthroughMode, setWalkthroughMode] = useState<'gif' | 'webm'>('gif');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Custom branding overrides
  const [customAuthor, setCustomAuthor] = useState(branding.author);
  const [customCompany, setCustomCompany] = useState(branding.companyName);
  const [customAccent, setCustomAccent] = useState(branding.accentColor);
  const [gifDuration, setGifDuration] = useState(1.2);

  if (!isOpen || !activeProject) return null;

  const formats: { id: ExportType; title: string; desc: string; icon: React.ReactNode; ext: string }[] = [
    {
      id: 'pdf',
      title: 'PDF Document',
      desc: 'Print-ready Standard Operating Procedure layout with Table of Contents',
      icon: <FileText className="w-5 h-5 text-red-500" />,
      ext: '.pdf',
    },
    {
      id: 'docx',
      title: 'Microsoft Word (DOCX)',
      desc: 'Fully formatted Word document with embedded high-res screenshots and steps',
      icon: <FileText className="w-5 h-5 text-blue-500" />,
      ext: '.docx',
    },
    {
      id: 'pptx',
      title: 'PowerPoint (PPTX)',
      desc: '16:9 widescreen presentation deck with structured cards and screenshots',
      icon: <Presentation className="w-5 h-5 text-amber-500" />,
      ext: '.pptx',
    },
    {
      id: 'html',
      title: 'Interactive HTML',
      desc: 'Self-contained offline guide with dark mode and step checklist',
      icon: <Globe className="w-5 h-5 text-emerald-500" />,
      ext: '.html',
    },
    {
      id: 'md',
      title: 'Markdown + Images (ZIP)',
      desc: 'Clean CommonMark file packaged with screenshots into a ZIP archive',
      icon: <Archive className="w-5 h-5 text-purple-500" />,
      ext: '.zip',
    },
    {
      id: 'json',
      title: 'Project JSON Backup',
      desc: 'Complete guide data and annotation layers for backup & restore',
      icon: <FileCode className="w-5 h-5 text-cyan-500" />,
      ext: '.json',
    },
    {
      id: 'gif',
      title: 'Animated Walkthrough (GIF / Video)',
      desc: 'Looping animated slideshow showing click hotspots with pulsating ripple effects',
      icon: <Film className="w-5 h-5 text-pink-500" />,
      ext: walkthroughMode === 'gif' ? '.gif' : '.webm',
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportSuccess(false);

    const mergedBranding = {
      ...branding,
      author: customAuthor,
      companyName: customCompany,
      accentColor: customAccent,
    };

    const sanitizedTitle = activeProject.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    try {
      // Bake all annotations and hotspots into screenshots for export
      const exportSteps = selectedFormat === 'json' ? steps : await bakeStepsForExport(steps);

      if (selectedFormat === 'pdf') {
        const htmlStr = generateHtml(activeProject, exportSteps, mergedBranding);

        if (isElectron()) {
          // Native Desktop printToPDF directly to user-chosen file
          const res = await api.exportPdf(htmlStr, `${sanitizedTitle}_sop`);
          if (res.canceled) {
            setIsExporting(false);
            return;
          }
          if (!res.success) {
            throw new Error(res.error || 'Failed to save PDF');
          }
        } else {
          // Browser fallback: open print window
          const printWin = window.open('', '_blank');
          if (printWin) {
            printWin.document.write(htmlStr);
            printWin.document.close();

            const triggerPrint = () => {
              try {
                printWin.focus();
                printWin.print();
              } catch (e) {
                console.error('Error invoking print dialog:', e);
              }
            };

            const checkAndPrint = async () => {
              try {
                const images = Array.from(printWin.document.images);
                await Promise.all(
                  images.map((img) => {
                    if (img.complete) return Promise.resolve();
                    return new Promise((r) => {
                      img.onload = r;
                      img.onerror = r;
                    });
                  })
                );
                setTimeout(triggerPrint, 350);
              } catch {
                setTimeout(triggerPrint, 800);
              }
            };

            if (printWin.document.readyState === 'complete') {
              checkAndPrint();
            } else {
              printWin.onload = checkAndPrint;
              setTimeout(checkAndPrint, 2000);
            }
          }
        }
      } else if (selectedFormat === 'html') {
        const htmlStr = generateHtml(activeProject, exportSteps, mergedBranding);
        const blob = new Blob([htmlStr], { type: 'text/html' });
        downloadBlob(blob, `${sanitizedTitle}.html`);
      } else if (selectedFormat === 'docx') {
        const blob = await generateDocx(activeProject, exportSteps, mergedBranding);
        downloadBlob(blob, `${sanitizedTitle}.docx`);
      } else if (selectedFormat === 'pptx') {
        const blob = await generatePptx(activeProject, exportSteps, mergedBranding);
        downloadBlob(blob, `${sanitizedTitle}.pptx`);
      } else if (selectedFormat === 'md') {
        const blob = await generateMarkdownZip(activeProject, exportSteps, mergedBranding);
        downloadBlob(blob, `${sanitizedTitle}_markdown.zip`);
      } else if (selectedFormat === 'json') {
        const jsonStr = exportProjectToJson(activeProject, steps);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        downloadBlob(blob, `${sanitizedTitle}_backup.json`);
      } else if (selectedFormat === 'gif') {
        if (walkthroughMode === 'gif') {
          const blob = await generateAnimatedGif(exportSteps, {
            durationPerStepSec: gifDuration,
            onProgress: (pct) => setExportProgress(pct),
          });
          downloadBlob(blob, `${sanitizedTitle}_walkthrough.gif`);
        } else {
          const blob = await generateAnimatedWalkthrough(exportSteps, gifDuration);
          downloadBlob(blob, `${sanitizedTitle}_walkthrough.webm`);
        }
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (err: any) {
      console.error('Export error:', err);
      alert(`Export failed: ${err.message || 'Please check console for details.'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base">Export Guide</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {steps.length} Steps
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Format Selection Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Output Format
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formats.map((fmt) => (
                <div
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    selectedFormat === fmt.id
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-border bg-secondary/30 hover:bg-secondary/60 hover:border-border'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-background border border-border flex-shrink-0">
                    {fmt.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {fmt.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {fmt.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branding & Presentation Customization */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Palette className="w-3.5 h-3.5 text-primary" />
              Document Branding & Style
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium">Author Name</label>
                <input
                  type="text"
                  value={customAuthor}
                  onChange={(e) => setCustomAuthor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium">Organization</label>
                <input
                  type="text"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{customAccent}</span>
                </div>
              </div>
            </div>

            {selectedFormat === 'gif' && (
              <div className="pt-3 border-t border-border/60 space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-foreground">Format:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="walkthroughFormat"
                      checked={walkthroughMode === 'gif'}
                      onChange={() => setWalkthroughMode('gif')}
                      className="accent-primary"
                    />
                    <span className="text-foreground">Animated GIF (.gif)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="walkthroughFormat"
                      checked={walkthroughMode === 'webm'}
                      onChange={() => setWalkthroughMode('webm')}
                      className="accent-primary"
                    />
                    <span className="text-foreground">WebM Video (.webm)</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Seconds per step:</span>
                    <span className="font-mono font-bold text-foreground">{gifDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={3.0}
                    step={0.1}
                    value={gifDuration}
                    onChange={(e) => setGifDuration(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                {isExporting && exportProgress > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Encoding frames:</span>
                      <span className="font-bold text-primary">{exportProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-150"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {exportSuccess && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-semibold animate-in fade-in">
                <CheckCircle className="w-4 h-4" />
                Export Generated Successfully!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              disabled={isExporting}
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {selectedFormat === 'gif' && exportProgress > 0
                    ? `Encoding GIF (${exportProgress}%)...`
                    : `Generating ${selectedFormat.toUpperCase()}...`}
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Download {selectedFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
