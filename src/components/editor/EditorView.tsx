import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { CanvasStage } from './CanvasStage';
import { WysiwygEditor } from './WysiwygEditor';
import { AnnotationTool, Step } from '@/types';
import {
  MousePointer,
  CircleDot,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  Highlighter,
  EyeOff,
  ShieldAlert,
  Trash2,
  Plus,
  Combine,
  GripVertical,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';

export const EditorView: React.FC = () => {
  const {
    activeProject,
    steps,
    activeStepId,
    selectStep,
    updateStep,
    deleteStep,
    reorderSteps,
    mergeSteps,
    addManualStep,
    activeTool,
    setActiveTool,
    selectedShapeId,
    setSelectedShapeId,
    toolColor,
    setToolColor,
    strokeWidth,
    setStrokeWidth,
    blurIntensity,
    setBlurIntensity,
  } = useStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const activeStep = steps.find((s) => s.id === activeStepId) || steps[0] || null;

  const colorPalette = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff'];

  const tools: { id: AnnotationTool; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Select & Move', icon: <MousePointer className="w-3.5 h-3.5" /> },
    { id: 'hotspot', label: 'Click Hotspot', icon: <CircleDot className="w-3.5 h-3.5" /> },
    { id: 'arrow', label: 'Arrow', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    { id: 'rect', label: 'Highlight Box', icon: <Square className="w-3.5 h-3.5" /> },
    { id: 'oval', label: 'Oval Highlight', icon: <Circle className="w-3.5 h-3.5" /> },
    { id: 'text', label: 'Text Callout', icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'highlighter', label: 'Highlighter Pen', icon: <Highlighter className="w-3.5 h-3.5" /> },
    { id: 'blur', label: 'Blur / Redact', icon: <EyeOff className="w-3.5 h-3.5" /> },
    { id: 'redact', label: 'Solid Blackout', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  ];

  const handleStepTitleChange = (newTitle: string) => {
    if (!activeStep) return;
    updateStep({ ...activeStep, title: newTitle });
  };

  const handleRichInstructionsChange = (html: string) => {
    if (!activeStep) return;
    updateStep({ ...activeStep, richInstructions: html });
  };

  const handleDeleteSelectedShape = () => {
    if (!activeStep || !selectedShapeId) return;
    const remaining = activeStep.annotations.filter((a) => a.id !== selectedShapeId);
    updateStep({ ...activeStep, annotations: remaining });
    setSelectedShapeId(null);
  };

  if (!activeProject || steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm">No steps recorded yet</h3>
          <p className="text-xs text-muted-foreground">
            Click "Start Capture" or add a manual snapshot to begin creating your step-by-step SOP.
          </p>
          <button
            onClick={() => addManualStep()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Step
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* 1. Left Sidebar: Step List */}
      <aside className="w-72 border-r border-border bg-card/40 flex flex-col z-10 select-none">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-foreground">Steps</span>
            <span className="px-1.5 py-0.2 rounded-full bg-secondary text-[11px] text-muted-foreground">
              {steps.length}
            </span>
          </div>

          <button
            onClick={() => addManualStep()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-accent text-[11px] font-medium transition-colors"
            title="Add Manual Step"
          >
            <Plus className="w-3 h-3" />
            Add Step
          </button>
        </div>

        {/* Step Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {steps.map((step, idx) => {
            const isActive = step.id === activeStepId;
            return (
              <React.Fragment key={step.id}>
                {step.sectionTitle && (
                  <div className="pt-2 pb-1 px-1 flex items-center justify-between text-[11px] font-bold text-primary tracking-wide uppercase border-b border-border/60">
                    <span className="truncate">📂 {step.sectionTitle}</span>
                  </div>
                )}
                <div
                  draggable
                  onDragStart={() => setDraggedIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedIndex !== null && draggedIndex !== idx) {
                      reorderSteps(draggedIndex, idx);
                      setDraggedIndex(null);
                    }
                  }}
                  onClick={() => selectStep(step.id)}
                  className={`group relative flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-secondary border-primary/50 shadow-sm'
                      : 'bg-card/30 border-transparent hover:bg-secondary/40 hover:border-border'
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="pt-1 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  {/* Step Thumbnail */}
                  <div className="w-12 h-8 rounded border border-border bg-slate-900 overflow-hidden flex-shrink-0 relative">
                    {step.screenshotPath && (
                      <img
                        src={step.screenshotPath}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/70 text-[9px] font-bold text-white leading-none">
                      {step.stepNumber}
                    </span>
                  </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-xs font-medium truncate text-foreground leading-tight">
                    {step.title}
                  </h4>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <span className="uppercase font-semibold">{step.actionType}</span>
                    <span>•</span>
                    <span className="truncate">{step.uiaAppName || 'Desktop'}</span>
                  </div>
                </div>

                {/* Action Buttons on Hover */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  {idx < steps.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        mergeSteps(step.id, steps[idx + 1].id);
                      }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      title="Merge with Next Step"
                    >
                      <Combine className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStep(step.id);
                    }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Delete Step"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        </div>
      </aside>

      {/* 2. Center: Canvas Stage & Annotation Bar */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Annotation Toolbar */}
        <div className="h-11 border-b border-border bg-card/50 backdrop-blur-md px-3 flex items-center justify-between z-10 select-none">
          {/* Tool selectors */}
          <div className="flex items-center gap-0.5">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(t.id);
                  if (t.id !== 'select') setSelectedShapeId(null);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTool === t.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={t.label}
              >
                {t.icon}
                <span className="hidden xl:inline text-[11px]">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Color & Stroke Controls */}
          <div className="flex items-center gap-3">
            {/* Color Palette */}
            <div className="flex items-center gap-1 border-r border-border pr-3">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  onClick={() => setToolColor(c)}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    toolColor === c ? 'scale-125 ring-2 ring-primary/40' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c, borderColor: c === '#ffffff' ? '#cbd5e1' : c }}
                />
              ))}
            </div>

            {/* Stroke Width Slider */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-[11px]">Size</span>
              <input
                type="range"
                min={2}
                max={8}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-16 accent-primary"
              />
            </div>

            {/* Delete Selected Shape */}
            {selectedShapeId && (
              <button
                onClick={handleDeleteSelectedShape}
                className="flex items-center gap-1 px-2 py-1 rounded bg-destructive/10 text-destructive text-xs hover:bg-destructive/20 transition-colors"
                title="Delete Selected Shape"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Konva Stage */}
        {activeStep && (
          <CanvasStage
            step={activeStep}
            activeTool={activeTool}
            toolColor={toolColor}
            strokeWidth={strokeWidth}
            blurIntensity={blurIntensity}
            onUpdateStep={updateStep}
            selectedShapeId={selectedShapeId}
            onSelectShape={setSelectedShapeId}
          />
        )}
      </main>

      {/* 3. Right Sidebar: Step Metadata & Rich Text Editor */}
      {activeStep && (
        <aside className="w-80 border-l border-border bg-card/40 flex flex-col p-4 space-y-4 overflow-y-auto z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Step {activeStep.stepNumber} Details
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {activeStep.actionType.toUpperCase()}
            </span>
          </div>

          {/* Step Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Step Title</label>
            <input
              type="text"
              value={activeStep.title}
              onChange={(e) => handleStepTitleChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-secondary/60 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Section Divider Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Chapter / Section Heading</span>
              <span className="text-[10px] font-normal text-muted-foreground">Optional</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Phase 1: Initial Setup"
              value={activeStep.sectionTitle || ''}
              onChange={(e) => updateStep({ ...activeStep, sectionTitle: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-secondary/60 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Replace Screenshot */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Screenshot Image</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium cursor-pointer transition-colors text-foreground">
                <span>📷 Replace Screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          updateStep({
                            ...activeStep,
                            screenshotPath: event.target.result as string,
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Rich Instructions (WYSIWYG) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Detailed Instructions & Notes
            </label>
            <WysiwygEditor
              content={activeStep.richInstructions}
              onChange={handleRichInstructionsChange}
            />
          </div>

          {/* UI Automation Inspector Details */}
          <div className="pt-2 border-t border-border space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Element Inspector
            </span>

            <div className="bg-secondary/40 rounded-lg p-2.5 border border-border text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Element Name:</span>
                <span className="font-medium text-foreground truncate max-w-[140px]">
                  {activeStep.uiaName || 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Control Type:</span>
                <span className="font-medium text-foreground">
                  {activeStep.uiaControlType || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application:</span>
                <span className="font-medium text-foreground truncate max-w-[140px]">
                  {activeStep.uiaAppName || 'Desktop'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Click Coordinate:</span>
                <span className="font-mono text-foreground">
                  ({activeStep.clickX}, {activeStep.clickY})
                </span>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
