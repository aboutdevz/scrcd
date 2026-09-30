import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { CanvasStage } from './CanvasStage';
import { WysiwygEditor } from './WysiwygEditor';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { AiHarnessModal } from './AiHarnessModal';
import { AnnotationTool, AnnotationShape, Step, ActionType } from '@/types';
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
  Undo2,
  Redo2,
  ChevronDown,
  Play,
  Camera,
  ImagePlus,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Bot,
} from 'lucide-react';

export const EditorView: React.FC = () => {
  const {
    activeProject,
    steps,
    activeStepId,
    stepHistoryPast,
    stepHistoryFuture,
    undoStep,
    redoStep,
    selectStep,
    updateStep,
    deleteStep,
    reorderSteps,
    mergeSteps,
    addManualStep,
    addStepFromImage,
    startRecording,
    activeTool,
    setActiveTool,
    selectedShapeId,
    setSelectedShapeId,
    toolColor,
    setToolColor,
    strokeWidth,
    blurIntensity,
  } = useStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isAddStepMenuOpen, setIsAddStepMenuOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  const addStepMenuRef = useRef<HTMLDivElement>(null);

  // Resizable and Collapsible Sidebars
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        const newWidth = Math.max(260, Math.min(480, e.clientX));
        setLeftSidebarWidth(newWidth);
      } else if (isDraggingRight) {
        const newWidth = Math.max(250, Math.min(520, window.innerWidth - e.clientX));
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight]);

  // Undo / Redo History for annotations
  const [history, setHistory] = useState<{ past: AnnotationShape[][]; future: AnnotationShape[][] }>({
    past: [],
    future: [],
  });

  const activeStep = steps.find((s) => s.id === activeStepId) || steps[0] || null;

  // Reset history when switching active step
  const lastActiveStepIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeStepId !== lastActiveStepIdRef.current) {
      lastActiveStepIdRef.current = activeStepId;
      setHistory({ past: [], future: [] });
    }
  }, [activeStepId]);

  const colorPalette = ['#f59e0b', '#2563eb', '#ef4444', '#10b981', '#8b5cf6', '#ffffff'];

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

  // Update step annotations while pushing to undo stack
  const handleUpdateAnnotations = (updatedStep: Step) => {
    if (!activeStep) return;
    setHistory((prev) => ({
      past: [...prev.past.slice(-30), activeStep.annotations],
      future: [],
    }));
    updateStep(updatedStep);
  };

  const handleUndo = () => {
    if (!activeStep || history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    setHistory({
      past: newPast,
      future: [activeStep.annotations, ...history.future],
    });
    updateStep({ ...activeStep, annotations: previous });
    setSelectedShapeId(null);
  };

  const handleRedo = () => {
    if (!activeStep || history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    setHistory({
      past: [...history.past, activeStep.annotations],
      future: newFuture,
    });
    updateStep({ ...activeStep, annotations: next });
    setSelectedShapeId(null);
  };

  const handleDeleteSelectedShape = () => {
    if (!activeStep || !selectedShapeId) return;
    const remaining = activeStep.annotations.filter((a) => a.id !== selectedShapeId);
    handleUpdateAnnotations({ ...activeStep, annotations: remaining });
    setSelectedShapeId(null);
  };

  // Click outside for Add Step dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addStepMenuRef.current && !addStepMenuRef.current.contains(e.target as Node)) {
        setIsAddStepMenuOpen(false);
      }
    };
    if (isAddStepMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddStepMenuOpen]);

  // Keyboard shortcuts: Delete, Undo (Ctrl+Z), Redo (Ctrl+Y), Step Undo (Ctrl+Alt+Z), Step Redo (Ctrl+Alt+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoStep();
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoStep();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShapeId) {
          e.preventDefault();
          handleDeleteSelectedShape();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShapeId, activeStep, history, undoStep, redoStep]);

  // Selected shape details if any
  const selectedShape = activeStep?.annotations.find((a) => a.id === selectedShapeId);

  const toggleHotspotVariant = () => {
    if (!activeStep || !selectedShape || selectedShape.type !== 'hotspot') return;
    const nextVariant: 'spotlight' | 'badge' = selectedShape.variant === 'badge' ? 'spotlight' : 'badge';
    const updated: AnnotationShape[] = activeStep.annotations.map((a) =>
      a.id === selectedShape.id ? ({ ...a, variant: nextVariant } as AnnotationShape) : a
    );
    handleUpdateAnnotations({ ...activeStep, annotations: updated });
  };

  if (!activeProject || steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">No steps recorded yet</h3>
          <p className="text-xs text-muted-foreground">
            Start recording or add a manual step to begin creating your step-by-step SOP.
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
      {!isLeftCollapsed ? (
        <aside
          style={{ width: `${leftSidebarWidth}px` }}
          className="border-r border-border bg-card flex flex-col z-10 select-none flex-shrink-0"
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-foreground">Steps</span>
                <span className="px-1.5 py-0.2 rounded-full bg-secondary text-[11px] text-muted-foreground">
                  {steps.length}
                </span>
              </div>

              {/* Step-Level Undo & Redo */}
              <div className="flex items-center gap-0.5 border-l border-border pl-1.5">
                <button
                  onClick={undoStep}
                  disabled={stepHistoryPast.length === 0}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                  title="Undo Step Action (Ctrl+Alt+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={redoStep}
                  disabled={stepHistoryFuture.length === 0}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                  title="Redo Step Action (Ctrl+Alt+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Add Step Dropdown */}
              <div className="relative" ref={addStepMenuRef}>
                <button
                  onClick={() => setIsAddStepMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-[11px] font-semibold text-foreground transition-colors whitespace-nowrap flex-shrink-0"
                  title="Add Step Options"
                >
                  <span>Add Step</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                </button>

            {isAddStepMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-border bg-card shadow-2xl p-1.5 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStepMenuOpen(false);
                    startRecording();
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-left transition-colors text-foreground"
                >
                  <div className="p-1 rounded-md bg-primary/10 text-primary mt-0.5">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs">Resume Recording</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      Continue capturing clicks as subsequent steps
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsAddStepMenuOpen(false);
                    await addManualStep();
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-left transition-colors text-foreground"
                >
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 mt-0.5">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs">Capture Snapshot</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      Take a single screen capture right now
                    </div>
                  </div>
                </button>

                <label className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-left transition-colors text-foreground cursor-pointer">
                  <div className="p-1 rounded-md bg-blue-500/10 text-blue-500 mt-0.5">
                    <ImagePlus className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-xs">Upload Image</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      Select JPG/PNG from your computer
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                          if (evt.target?.result) {
                            await addStepFromImage(evt.target.result as string, file.name.replace(/\.[^/.]+$/, ''));
                            setIsAddStepMenuOpen(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsLeftCollapsed(true)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-1"
            title="Collapse Steps Sidebar"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

        {/* Step Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {steps.map((step, idx) => {
            const isActive = step.id === activeStepId;
            return (
              <React.Fragment key={step.id}>
                {step.sectionTitle && (
                  <div className="pt-2 pb-1 px-1 flex items-center justify-between text-[11px] font-bold text-primary tracking-wide uppercase border-b border-border/60">
                    <span className="truncate">{step.sectionTitle}</span>
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
                      : 'bg-card border-transparent hover:bg-secondary/40 hover:border-border'
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="pt-1 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  {/* Step Thumbnail */}
                  <div className="relative w-14 h-9 rounded bg-slate-900 border border-border overflow-hidden flex-shrink-0">
                    {step.screenshotPath && (
                      <img
                        src={step.screenshotPath}
                        alt={`Step ${step.stepNumber}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <span className="absolute bottom-0 right-0 px-1 text-[9px] font-bold bg-slate-900/90 text-white rounded-tl">
                      {step.stepNumber}
                    </span>
                  </div>

                  {/* Step Title & Summary */}
                  <div className="flex-1 min-w-0 pr-6">
                    <h4 className="text-xs font-medium text-foreground truncate">
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {step.uiaName || step.actionType}
                    </p>
                  </div>

                  {/* Quick Action: Delete Step */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStepToDelete(step.id);
                    }}
                    className="absolute right-2 top-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete step"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  {/* Merge with next step */}
                  {idx < steps.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        mergeSteps(step.id, steps[idx + 1].id);
                      }}
                      className="absolute right-2 bottom-2 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Merge into next step"
                    >
                      <Combine className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </aside>
      ) : (
        <div className="w-10 border-r border-border bg-card flex flex-col items-center py-3 z-10 flex-shrink-0 select-none">
          <button
            onClick={() => setIsLeftCollapsed(false)}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Expand Steps Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-primary" />
          </button>
          <div className="mt-8 text-[11px] font-semibold text-muted-foreground -rotate-90 whitespace-nowrap tracking-wider uppercase select-none">
            Steps ({steps.length})
          </div>
        </div>
      )}

      {/* Left Resize Splitter Handle */}
      {!isLeftCollapsed && (
        <div
          onMouseDown={() => setIsDraggingLeft(true)}
          className={`w-1 cursor-col-resize z-20 transition-colors flex-shrink-0 ${
            isDraggingLeft ? 'bg-primary' : 'bg-transparent hover:bg-primary/50'
          }`}
          title="Drag to resize Steps sidebar"
        />
      )}

      {/* 2. Main Center Canvas Studio */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Canvas Toolbar */}
        <div className="h-12 border-b border-border bg-card px-3 flex items-center justify-between z-20 select-none gap-2">
          {/* Action Tools: Select, Undo, Redo, Delete */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <button
              onClick={() => {
                setActiveTool('select');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTool === 'select'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
              title="Select & Move (V)"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Select</span>
            </button>

            <button
              onClick={handleUndo}
              disabled={history.past.length === 0}
              className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRedo}
              disabled={history.future.length === 0}
              className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDeleteSelectedShape}
              disabled={!selectedShapeId}
              className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors"
              title="Delete Selected Element (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Annotation Creation Tools */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {tools.filter((t) => t.id !== 'select').map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(t.id);
                  setSelectedShapeId(null);
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTool === t.id
                    ? 'bg-secondary text-foreground border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
                title={t.label}
              >
                {t.icon}
                <span className="hidden xl:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Color & Stroke Controls */}
          <div className="flex items-center gap-2">
            {/* Hotspot variant toggle if hotspot selected */}
            {selectedShape && selectedShape.type === 'hotspot' && (
              <button
                onClick={toggleHotspotVariant}
                className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-accent border border-border text-[11px] text-foreground font-medium"
                title="Switch between Glowing Spotlight and Numbered Badge"
              >
                <span>{selectedShape.variant === 'badge' ? 'Numbered Badge' : 'Spotlight'}</span>
              </button>
            )}

            {/* Color Palette */}
            <div className="flex items-center gap-1 border-r border-border pr-2">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  onClick={() => setToolColor(c)}
                  className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                    toolColor === c ? 'scale-125 ring-2 ring-primary/40' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c, borderColor: c === '#ffffff' ? '#cbd5e1' : c }}
                />
              ))}
            </div>

            {/* Preview Document Button */}
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap flex-shrink-0"
              title="Preview complete SOP document output"
            >
              <span>Preview Document</span>
            </button>

            {/* Auto-write with AI Button */}
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap flex-shrink-0"
              title="Automatically write SOP titles and rich instructions with AI"
            >
              <span>Auto-write with AI</span>
            </button>
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
            onUpdateStep={handleUpdateAnnotations}
            selectedShapeId={selectedShapeId}
            onSelectShape={setSelectedShapeId}
          />
        )}
      </main>

      {/* Right Resize Splitter Handle */}
      {!isRightCollapsed && activeStep && (
        <div
          onMouseDown={() => setIsDraggingRight(true)}
          className={`w-1 cursor-col-resize z-20 transition-colors flex-shrink-0 ${
            isDraggingRight ? 'bg-primary' : 'bg-transparent hover:bg-primary/50'
          }`}
          title="Drag to resize Inspector sidebar"
        />
      )}

      {/* 3. Right Sidebar: Collapsed Rail */}
      {isRightCollapsed && activeStep && (
        <div className="w-12 border-l border-border bg-card flex flex-col items-center py-3 z-10 flex-shrink-0">
          <button
            onClick={() => setIsRightCollapsed(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Expand Inspector Sidebar"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
          <div className="mt-8 text-[11px] font-semibold text-muted-foreground -rotate-90 whitespace-nowrap tracking-wider uppercase select-none">
            Inspector
          </div>
        </div>
      )}

      {/* 3. Right Sidebar: Step Metadata & Rich Text Editor */}
      {!isRightCollapsed && activeStep && (
        <aside
          style={{ width: `${rightSidebarWidth}px` }}
          className="border-l border-border bg-card flex flex-col p-4 space-y-4 overflow-y-auto z-10 flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step {activeStep.stepNumber}
              </span>
              <select
                value={activeStep.actionType}
                onChange={(e) =>
                  updateStep({ ...activeStep, actionType: e.target.value as ActionType })
                }
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-primary/20 transition-colors"
                title="Change Action Type"
              >
                <option value="click">CLICK</option>
                <option value="double_click">DOUBLE CLICK</option>
                <option value="right_click">RIGHT CLICK</option>
                <option value="navigation">NAVIGATION</option>
                <option value="keypress">KEYPRESS</option>
                <option value="snapshot">SNAPSHOT</option>
              </select>
            </div>
            <button
              onClick={() => setIsRightCollapsed(true)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Collapse Inspector Sidebar"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Step Title</label>
            <input
              type="text"
              value={activeStep.title}
              onChange={(e) => handleStepTitleChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Chapter / Section Header */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Chapter / Section</label>
            <input
              type="text"
              placeholder="e.g. Phase 1: Authentication"
              value={activeStep.sectionTitle || ''}
              onChange={(e) =>
                updateStep({ ...activeStep, sectionTitle: e.target.value || undefined })
              }
              className="w-full px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Rich Text WYSIWYG Instructions */}
          <div className="space-y-1.5 flex-1 flex flex-col">
            <label className="text-xs font-semibold text-foreground">Detailed Instructions</label>
            <WysiwygEditor
              content={activeStep.richInstructions}
              onChange={handleRichInstructionsChange}
              step={activeStep}
              stepContext={{
                title: activeStep.title,
                actionType: activeStep.actionType,
                uiaName: activeStep.uiaName,
                uiaControlType: activeStep.uiaControlType,
                uiaAppName: activeStep.uiaAppName,
                stepNumber: activeStep.stepNumber,
              }}
              projectContext={{
                title: activeProject?.title,
                description: activeProject?.description,
              }}
            />
          </div>

          {/* Windows UIA Metadata Inspector */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <span className="font-semibold text-foreground">Element Metadata</span>
              {activeStep.isPassword && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[10px] font-bold">
                  Masked
                </span>
              )}
            </div>
            <div className="space-y-1.5 text-muted-foreground text-[11px]">
              <div className="flex justify-between items-center">
                <span>Element:</span>
                <span className="font-medium text-foreground truncate max-w-[130px]" title={activeStep.uiaName || 'None'}>
                  {activeStep.uiaName || 'None'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Control Type:</span>
                <span className="text-foreground">{activeStep.uiaControlType || 'Window'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                <span className="shrink-0 text-muted-foreground">Application:</span>
                <input
                  type="text"
                  placeholder="e.g. Google Chrome"
                  value={activeStep.uiaAppName || ''}
                  onChange={(e) =>
                    updateStep({ ...activeStep, uiaAppName: e.target.value })
                  }
                  className="px-2 py-0.5 rounded bg-secondary/70 border border-border text-foreground text-xs w-full text-right focus:outline-none focus:ring-1 focus:ring-primary/40"
                  title="Target Application (Editable)"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Click Coordinates:</span>
                <span className="font-mono text-foreground">
                  ({Math.round(activeStep.clickX)}, {Math.round(activeStep.clickY)})
                </span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* AI Content Writer Harness Modal */}
      <AiHarnessModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onOpenSettings={() => useStore.getState().setCurrentView('settings')}
      />

      {/* Delete Step Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(stepToDelete)}
        title="Delete Step"
        message="Are you sure you want to delete this step? You can undo this change using the Undo button in the Steps sidebar."
        confirmLabel="Delete Step"
        isDestructive={true}
        onConfirm={async () => {
          if (stepToDelete) {
            const id = stepToDelete;
            setStepToDelete(null);
            await deleteStep(id);
          }
        }}
        onCancel={() => setStepToDelete(null)}
      />
    </div>
  );
};
