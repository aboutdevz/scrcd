import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Step } from '@/types';
import { bakeStepsForExport } from '@/services/imageBaker';
import {
  FileText,
  Printer,
  Download,
  X,
  Sun,
  Moon,
  Loader2,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  onOpenExport,
}) => {
  const { activeProject, steps, branding } = useStore();
  const [bakedSteps, setBakedSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!isOpen || !activeProject) return;

    let isMounted = true;
    setIsLoading(true);

    bakeStepsForExport(steps)
      .then((res) => {
        if (isMounted) {
          setBakedSteps(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error baking steps for preview:', err);
        if (isMounted) {
          setBakedSteps(steps);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, steps, activeProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeProject) return null;

  const accent = activeProject.accentColor || branding.accentColor || '#2563eb';
  const logo = branding.logoUrl;

  const handlePrint = () => {
    window.print();
  };

  const scrollToStep = (stepNumber: number) => {
    const el = document.getElementById(`preview-step-${stepNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      {/* Top Floating Control Bar */}
      <div className="h-14 bg-card/95 border-b border-border px-6 flex items-center justify-between shadow-md z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <span>Document Preview</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-normal">
                {steps.length} Steps
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground truncate max-w-sm sm:max-w-md">
              {activeProject.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setPreviewTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors"
            title="Toggle Preview Theme"
          >
            {previewTheme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dark Preview</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Preview</span>
              </>
            )}
          </button>

          {/* Quick Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          {/* Export Full Guide Button */}
          {onOpenExport && (
            <button
              onClick={() => {
                onClose();
                onOpenExport();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Guide</span>
            </button>
          )}

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors ml-1"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-900/60">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-medium">Baking annotations and generating document preview...</p>
          </div>
        ) : (
          <div
            className={`w-full max-w-4xl rounded-2xl shadow-2xl transition-colors duration-200 p-8 sm:p-12 space-y-8 my-auto ${
              previewTheme === 'dark'
                ? 'bg-[#0f172a] text-[#f8fafc] border border-slate-800'
                : 'bg-white text-slate-900 border border-slate-200 shadow-xl'
            }`}
          >
            {/* Guide Header Banner */}
            <div
              className={`pb-8 border-b ${
                previewTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: accent }}
                  >
                    {activeProject.category || 'SOP'}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                    {activeProject.title}
                  </h1>
                  {activeProject.description && (
                    <p
                      className={`text-sm leading-relaxed ${
                        previewTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {activeProject.description}
                    </p>
                  )}
                </div>

                {logo && (
                  <div className="flex-shrink-0">
                    <img
                      src={logo}
                      alt="Organization Logo"
                      className="max-h-16 max-w-[200px] object-contain rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Metadata Bar */}
              <div
                className={`mt-6 pt-4 border-t flex flex-wrap gap-x-6 gap-y-2 text-xs ${
                  previewTheme === 'dark'
                    ? 'border-slate-800/80 text-slate-400'
                    : 'border-slate-100 text-slate-500'
                }`}
              >
                <div>
                  Author: <strong className={previewTheme === 'dark' ? 'text-white' : 'text-slate-900'}>{activeProject.author || branding.author}</strong>
                </div>
                <div>
                  Organization: <strong className={previewTheme === 'dark' ? 'text-white' : 'text-slate-900'}>{activeProject.companyName || branding.companyName}</strong>
                </div>
                <div>
                  Total Steps: <strong className={previewTheme === 'dark' ? 'text-white' : 'text-slate-900'}>{steps.length}</strong>
                </div>
                <div>
                  Updated: <strong className={previewTheme === 'dark' ? 'text-white' : 'text-slate-900'}>{new Date(activeProject.updatedAt).toLocaleDateString()}</strong>
                </div>
              </div>
            </div>

            {/* Table of Contents Jump Bar */}
            {steps.length > 3 && (
              <div
                className={`p-4 rounded-xl border ${
                  previewTheme === 'dark'
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs font-semibold mb-2.5 flex items-center gap-1.5 opacity-80">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Table of Contents ({steps.length} steps)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {steps.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => scrollToStep(s.stepNumber)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        previewTheme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      Step {s.stepNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-Step Procedure */}
            <div className="space-y-10">
              {bakedSteps.map((step) => (
                <div
                  key={step.id}
                  id={`preview-step-${step.stepNumber}`}
                  className={`scroll-mt-6 pb-8 border-b last:border-b-0 space-y-4 ${
                    previewTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  {/* Step Header */}
                  <div className="flex items-start gap-3">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: accent }}
                    >
                      Step {step.stepNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold tracking-tight">
                        {step.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            previewTheme === 'dark'
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {step.uiaAppName || 'Application'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            previewTheme === 'dark'
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {step.actionType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step Instructions */}
                  <div
                    className={`text-sm leading-relaxed pl-1 prose prose-sm max-w-none ${
                      previewTheme === 'dark' ? 'prose-invert text-slate-300' : 'text-slate-700'
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: step.richInstructions || `<p>${step.title}</p>`,
                    }}
                  />

                  {/* Step Screenshot Image */}
                  {step.screenshotPath && (
                    <div
                      className={`rounded-xl overflow-hidden border shadow-md ${
                        previewTheme === 'dark'
                          ? 'border-slate-800 bg-slate-950'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <img
                        src={step.screenshotPath}
                        alt={`Step ${step.stepNumber} screenshot`}
                        className="w-full h-auto object-contain block"
                        loading="eager"
                        decoding="sync"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Document Footer Notice */}
            <div
              className={`pt-6 border-t text-center text-xs ${
                previewTheme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}
            >
              <p>{branding.footerText || 'Confidential - Standard Operating Procedure'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
