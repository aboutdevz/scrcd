import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Step, ActionType } from '@/types';
import { bakeStepsForExport } from '@/services/imageBaker';
import {
  FileText,
  Printer,
  Download,
  X,
  Sun,
  Moon,
  Loader2,
  Layers,
  ChevronRight,
  Pencil,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
}

const ACTION_CYCLE: ActionType[] = [
  'click',
  'double_click',
  'right_click',
  'navigation',
  'keypress',
  'snapshot',
];

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  onOpenExport,
}) => {
  const { activeProject, steps, branding, updateStep } = useStore();
  const [bakedSteps, setBakedSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');

  // Inline badge editing
  const [editingAppStepId, setEditingAppStepId] = useState<string | null>(null);
  const [editingAppText, setEditingAppText] = useState('');

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
        if (editingAppStepId) {
          setEditingAppStepId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingAppStepId]);

  if (!isOpen || !activeProject) return null;

  const accent = activeProject.accentColor || branding.accentColor || '#2563eb';
  const logo = activeProject.logoUrl || branding.logoUrl;
  const version = activeProject.version || '1.0.0';

  const handlePrint = () => {
    window.print();
  };

  const scrollToStep = (stepNumber: number) => {
    const el = document.getElementById(`preview-step-${stepNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveAppName = async (step: Step) => {
    const trimmed = editingAppText.trim();
    setEditingAppStepId(null);
    if (trimmed && trimmed !== step.uiaAppName) {
      const updated = { ...step, uiaAppName: trimmed };
      await updateStep(updated);
      setBakedSteps((prev) => prev.map((s) => (s.id === step.id ? updated : s)));
    }
  };

  const handleCycleActionType = async (step: Step) => {
    const currentIdx = ACTION_CYCLE.indexOf(step.actionType);
    const nextIdx = (currentIdx + 1) % ACTION_CYCLE.length;
    const nextAction = ACTION_CYCLE[nextIdx];
    const updated = { ...step, actionType: nextAction };
    await updateStep(updated);
    setBakedSteps((prev) => prev.map((s) => (s.id === step.id ? updated : s)));
  };

  // Group steps by section for Chapter Table of Contents
  interface ChapterGroup {
    title: string;
    steps: Step[];
  }
  const chapters: ChapterGroup[] = [];
  let currentChapter: ChapterGroup = { title: '', steps: [] };

  for (const step of bakedSteps) {
    if (step.sectionTitle && step.sectionTitle !== currentChapter.title) {
      if (currentChapter.steps.length > 0) {
        chapters.push(currentChapter);
      }
      currentChapter = { title: step.sectionTitle, steps: [step] };
    } else {
      currentChapter.steps.push(step);
    }
  }
  if (currentChapter.steps.length > 0) {
    chapters.push(currentChapter);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
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

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3 min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Baking annotations & rendering preview...</p>
          </div>
        ) : (
          <div
            className={`w-full max-w-4xl mx-auto rounded-2xl shadow-2xl transition-colors duration-200 p-8 sm:p-12 space-y-8 min-h-full ${
              previewTheme === 'dark'
                ? 'bg-slate-900 border border-slate-800 text-slate-100'
                : 'bg-white border border-slate-200 text-slate-900'
            }`}
          >
            {/* Guide Header Banner */}
            <div
              className={`pb-8 border-b ${
                previewTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <h1
                    className={`text-3xl font-extrabold tracking-tight ${
                      previewTheme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {activeProject.title}
                  </h1>
                  {activeProject.description && (
                    <p
                      className={`text-sm leading-relaxed ${
                        previewTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
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
                    : 'border-slate-100 text-slate-600'
                }`}
              >
                <div>
                  Version: <strong className={previewTheme === 'dark' ? 'text-white' : 'text-slate-900'}>{version}</strong>
                </div>
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

            {/* Chapter-based Table of Contents (Classic Dotted Leader Style) */}
            {bakedSteps.length > 1 && (
              <div
                className={`my-8 p-6 sm:p-8 rounded-xl border ${
                  previewTheme === 'dark'
                    ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                    : 'bg-slate-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-center mb-6">
                  <h2
                    className={`text-xl font-bold tracking-tight ${
                      previewTheme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Table of Contents
                  </h2>
                </div>

                <div className="space-y-1.5 max-w-2xl mx-auto">
                  {chapters.some((c) => c.title) ? (
                    chapters.map((ch, idx) => (
                      <div key={idx} className="space-y-1 pt-2 first:pt-0">
                        {ch.title && (
                          <button
                            type="button"
                            onClick={() => scrollToStep(ch.steps[0].stepNumber)}
                            className={`w-full group flex items-baseline gap-2 py-1.5 px-2 rounded-md transition-colors text-left font-bold text-sm ${
                              previewTheme === 'dark'
                                ? 'hover:bg-slate-800 text-slate-100'
                                : 'hover:bg-slate-100 text-slate-900'
                            }`}
                          >
                            <span
                              className="flex-shrink-0 max-w-[78%] truncate uppercase tracking-wider font-bold"
                              style={{ color: accent }}
                            >
                              {ch.title}
                            </span>
                            <span
                              className={`flex-1 border-b-2 border-dotted mb-1 ${
                                previewTheme === 'dark' ? 'border-slate-700' : 'border-slate-300'
                              }`}
                            />
                            <span
                              className="flex-shrink-0 tabular-nums font-bold"
                              style={{ color: accent }}
                            >
                              {ch.steps[0].stepNumber}
                            </span>
                          </button>
                        )}
                        <div className={ch.title ? 'pl-4 space-y-1' : 'space-y-1'}>
                          {ch.steps.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => scrollToStep(s.stepNumber)}
                              className={`w-full group flex items-baseline gap-2 py-1 px-2 rounded-md transition-colors text-left text-xs sm:text-sm ${
                                previewTheme === 'dark'
                                  ? 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                                  : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              <span className="flex-shrink-0 max-w-[78%] truncate font-medium">
                                {s.title}
                              </span>
                              <span
                                className={`flex-1 border-b border-dotted mb-1 transition-colors ${
                                  previewTheme === 'dark'
                                    ? 'border-slate-800 group-hover:border-slate-600'
                                    : 'border-slate-300 group-hover:border-slate-400'
                                }`}
                              />
                              <span className="flex-shrink-0 tabular-nums font-semibold text-muted-foreground group-hover:text-foreground">
                                {s.stepNumber}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    bakedSteps.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => scrollToStep(s.stepNumber)}
                        className={`w-full group flex items-baseline gap-2 py-1 px-2 rounded-md transition-colors text-left text-xs sm:text-sm ${
                          previewTheme === 'dark'
                            ? 'hover:bg-slate-800 text-slate-200 hover:text-white'
                            : 'hover:bg-slate-100 text-slate-800 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex-shrink-0 max-w-[78%] truncate font-medium">
                          {s.title}
                        </span>
                        <span
                          className={`flex-1 border-b border-dotted mb-1 transition-colors ${
                            previewTheme === 'dark'
                              ? 'border-slate-700 group-hover:border-slate-500'
                              : 'border-slate-300 group-hover:border-slate-400'
                          }`}
                        />
                        <span className="flex-shrink-0 tabular-nums font-semibold text-muted-foreground group-hover:text-foreground">
                          {s.stepNumber}
                        </span>
                      </button>
                    ))
                  )}
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
                  {/* Step Section Header if present */}
                  {step.sectionTitle && (
                    <div
                      className={`text-xs font-bold uppercase tracking-wider pb-1 border-b ${
                        previewTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'
                      }`}
                      style={{ color: accent }}
                    >
                      {step.sectionTitle}
                    </div>
                  )}

                  {/* Step Header */}
                  <div className="flex items-start gap-3">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: accent }}
                    >
                      Step {step.stepNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h2
                        className={`text-lg font-bold tracking-tight ${
                          previewTheme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {step.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5">
                        {/* Target Application Badge (Editable inline) */}
                        {editingAppStepId === step.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingAppText}
                            onChange={(e) => setEditingAppText(e.target.value)}
                            onBlur={() => handleSaveAppName(step)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveAppName(step);
                              if (e.key === 'Escape') setEditingAppStepId(null);
                            }}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded border border-primary bg-background text-foreground focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAppStepId(step.id);
                              setEditingAppText(step.uiaAppName || 'Application');
                            }}
                            className={`group inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded transition-colors ${
                              previewTheme === 'dark'
                                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title="Click to edit application name"
                          >
                            <span>{step.uiaAppName || 'Application'}</span>
                            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                          </button>
                        )}

                        {/* Action Type Badge (Click to cycle / edit) */}
                        <button
                          type="button"
                          onClick={() => handleCycleActionType(step)}
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded transition-all hover:scale-105 active:scale-95 ${
                            previewTheme === 'dark'
                              ? 'bg-blue-950/80 text-blue-300 border border-blue-800/80'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                          title="Click to cycle action type (Click, Double Click, Navigation, etc.)"
                        >
                          {step.actionType}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step Instructions */}
                  <div
                    className={`text-sm leading-relaxed pl-1 ${
                      previewTheme === 'dark'
                        ? 'text-slate-200 [&_p]:text-slate-200 [&_strong]:text-white [&_strong]:font-semibold [&_em]:text-slate-300 [&_code]:text-amber-300 [&_code]:bg-slate-800 [&_a]:text-blue-400'
                        : 'text-slate-800 [&_p]:text-slate-800 [&_strong]:text-slate-900 [&_strong]:font-semibold [&_em]:text-slate-700 [&_code]:text-blue-700 [&_code]:bg-slate-100 [&_a]:text-blue-600'
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
