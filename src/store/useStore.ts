import { create } from 'zustand';
import { Project, Step, AnnotationShape, AnnotationTool, BrandingProfile, Section } from '@/types';
import { api } from '@/services/api';

interface AppState {
  // Navigation
  currentView: 'dashboard' | 'editor' | 'settings';
  setCurrentView: (view: 'dashboard' | 'editor' | 'settings') => void;

  // Projects
  projects: Project[];
  activeProject: Project | null;
  loadProjects: () => Promise<void>;
  createProject: (title: string, category?: string, description?: string, version?: string) => Promise<Project>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string) => Promise<void>;

  // Steps
  steps: Step[];
  activeStepId: string | null;
  stepHistoryPast: Step[][];
  stepHistoryFuture: Step[][];
  undoStep: () => Promise<void>;
  redoStep: () => Promise<void>;
  loadSteps: (projectId: string) => Promise<void>;
  selectStep: (id: string) => void;
  updateStep: (step: Step) => Promise<void>;
  deleteStep: (id: string) => Promise<void>;
  reorderSteps: (startIndex: number, endIndex: number) => Promise<void>;
  mergeSteps: (step1Id: string, step2Id: string) => Promise<void>;
  addManualStep: () => Promise<Step | null>;
  addStepFromImage: (fileDataUrl: string, title?: string) => Promise<Step | null>;

  // Canvas & Annotations
  activeTool: AnnotationTool;
  setActiveTool: (tool: AnnotationTool) => void;
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  toolColor: string;
  setToolColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  blurIntensity: number;
  setBlurIntensity: (intensity: number) => void;

  // Recording State
  isRecording: boolean;
  isPaused: boolean;
  appLock: boolean;
  startRecording: (config?: any) => Promise<void>;
  stopRecording: () => Promise<void>;
  togglePause: () => void;
  toggleAppLock: () => void;
  triggerManualSnapshot: () => Promise<void>;

  // Branding Profile
  branding: BrandingProfile;
  updateBranding: (branding: BrandingProfile) => void;

  // AI BYOK Configuration
  aiConfig: import('@/types').AiConfig;
  setAiConfig: (config: Partial<import('@/types').AiConfig>) => void;
  applyAiWrittenContent: (
    updates: { id: string; title: string; richInstructions: string; sectionTitle?: string }[],
    projectTitle?: string
  ) => Promise<void>;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),

  projects: [],
  activeProject: null,

  loadProjects: async () => {
    const projects = await api.listProjects();
    set({ projects });
  },

  createProject: async (title, category = 'SOP', description = '', version = '1.0.0') => {
    const id = `proj_${Date.now()}`;
    const branding = get().branding;
    const newProj: Project = {
      id,
      title: title || 'Untitled Guide',
      version: version || '1.0.0',
      description,
      category: category as any,
      tags: [category],
      author: branding.author,
      companyName: branding.companyName,
      accentColor: branding.accentColor,
      logoUrl: branding.logoUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await api.saveProject(newProj);
    await get().loadProjects();
    await get().selectProject(id);
    return newProj;
  },

  updateProject: async (project) => {
    await api.saveProject(project);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === project.id ? project : p)),
      activeProject: state.activeProject?.id === project.id ? project : state.activeProject,
    }));
  },

  deleteProject: async (id) => {
    await api.deleteProject(id);
    const list = get().projects.filter((p) => p.id !== id);
    set({
      projects: list,
      activeProject: get().activeProject?.id === id ? null : get().activeProject,
      currentView: 'dashboard',
    });
  },

  selectProject: async (id) => {
    const project = await api.getProject(id);
    if (project) {
      set({ activeProject: project, currentView: 'editor' });
      await get().loadSteps(id);
    }
  },

  steps: [],
  activeStepId: null,
  stepHistoryPast: [],
  stepHistoryFuture: [],

  loadSteps: async (projectId) => {
    const steps = await api.listSteps(projectId);
    set({
      steps,
      activeStepId: steps.length > 0 ? steps[0].id : null,
      selectedShapeId: null,
      stepHistoryPast: [],
      stepHistoryFuture: [],
    });
  },

  undoStep: async () => {
    const { activeProject, steps, stepHistoryPast, stepHistoryFuture, activeStepId } = get();
    if (!activeProject || stepHistoryPast.length === 0) return;
    const previous = stepHistoryPast[stepHistoryPast.length - 1];
    const newPast = stepHistoryPast.slice(0, -1);
    set({
      steps: previous,
      stepHistoryPast: newPast,
      stepHistoryFuture: [steps, ...stepHistoryFuture],
      activeStepId: previous.find((s) => s.id === activeStepId) ? activeStepId : (previous[0]?.id ?? null),
    });
    await api.saveStepsBatch(activeProject.id, previous);
  },

  redoStep: async () => {
    const { activeProject, steps, stepHistoryPast, stepHistoryFuture, activeStepId } = get();
    if (!activeProject || stepHistoryFuture.length === 0) return;
    const next = stepHistoryFuture[0];
    const newFuture = stepHistoryFuture.slice(1);
    set({
      steps: next,
      stepHistoryPast: [...stepHistoryPast, steps],
      stepHistoryFuture: newFuture,
      activeStepId: next.find((s) => s.id === activeStepId) ? activeStepId : (next[0]?.id ?? null),
    });
    await api.saveStepsBatch(activeProject.id, next);
  },

  selectStep: (id) => {
    set({ activeStepId: id, selectedShapeId: null });
  },

  updateStep: async (step) => {
    await api.saveStep(step);
    set((state) => ({
      steps: state.steps.map((s) => (s.id === step.id ? step : s)),
    }));
  },

  deleteStep: async (id) => {
    const { activeProject, steps, activeStepId, stepHistoryPast } = get();
    if (!activeProject) return;
    set({
      stepHistoryPast: [...stepHistoryPast.slice(-10), steps],
      stepHistoryFuture: [],
    });
    await api.deleteStep(activeProject.id, id);
    const remaining = steps.filter((s) => s.id !== id);
    remaining.forEach((s, idx) => {
      s.stepNumber = idx + 1;
    });
    const nextActive = activeStepId === id ? (remaining[0]?.id ?? null) : activeStepId;
    set({ steps: remaining, activeStepId: nextActive, selectedShapeId: null });
  },

  reorderSteps: async (startIndex, endIndex) => {
    const { activeProject, steps, stepHistoryPast } = get();
    if (!activeProject) return;
    set({
      stepHistoryPast: [...stepHistoryPast.slice(-10), steps],
      stepHistoryFuture: [],
    });
    const reordered = Array.from(steps);
    const [moved] = reordered.splice(startIndex, 1);
    reordered.splice(endIndex, 0, moved);
    reordered.forEach((s, i) => {
      s.stepNumber = i + 1;
    });
    set({ steps: reordered });
    await api.saveStepsBatch(activeProject.id, reordered);
  },

  mergeSteps: async (step1Id, step2Id) => {
    const { activeProject, steps, stepHistoryPast } = get();
    if (!activeProject) return;
    const s1 = steps.find((s) => s.id === step1Id);
    const s2 = steps.find((s) => s.id === step2Id);
    if (!s1 || !s2) return;

    set({
      stepHistoryPast: [...stepHistoryPast.slice(-10), steps],
      stepHistoryFuture: [],
    });

    // Merge s2 into s1: copy s2 annotations, add a second hotspot on s1, combine instructions
    const nextHotspotNumber = (s1.annotations.filter((a) => a.type === 'hotspot').length || 1) + 1;
    const mergedAnnotations: AnnotationShape[] = [
      ...s1.annotations,
      {
        id: `h_merged_${Date.now()}`,
        type: 'hotspot',
        x: s2.clickX,
        y: s2.clickY,
        number: nextHotspotNumber,
        color: '#2563eb',
        label: s2.uiaName,
      },
      ...s2.annotations.filter((a) => a.type !== 'hotspot'),
    ];

    const mergedStep: Step = {
      ...s1,
      title: `${s1.title} & ${s2.title}`,
      richInstructions: `${s1.richInstructions}<p>Then ${s2.title.toLowerCase()}.</p>`,
      annotations: mergedAnnotations,
    };

    await api.saveStep(mergedStep);
    await api.deleteStep(activeProject.id, step2Id);
    await get().loadSteps(activeProject.id);
    set({ activeStepId: mergedStep.id });
  },

  addManualStep: async () => {
    const { activeProject, steps, stepHistoryPast } = get();
    if (!activeProject) return null;
    set({
      stepHistoryPast: [...stepHistoryPast.slice(-10), steps],
      stepHistoryFuture: [],
    });
    const step = await api.manualSnapshot(activeProject.id);
    await get().loadSteps(activeProject.id);
    if (step) {
      set({ activeStepId: step.id });
    }
    return step;
  },

  addStepFromImage: async (fileDataUrl: string, title?: string) => {
    const { activeProject, steps, stepHistoryPast } = get();
    if (!activeProject) return null;
    set({
      stepHistoryPast: [...stepHistoryPast.slice(-10), steps],
      stepHistoryFuture: [],
    });
    const now = Date.now();
    const stepNumber = steps.length + 1;
    const newStep: Step = {
      id: `step_${now}`,
      projectId: activeProject.id,
      stepNumber,
      title: title || `Step ${stepNumber}`,
      richInstructions: '<p>Perform actions as illustrated in the screenshot.</p>',
      actionType: 'snapshot',
      screenshotPath: fileDataUrl,
      originalWidth: 1920,
      originalHeight: 1080,
      clickX: 0,
      clickY: 0,
      uiaName: 'Uploaded Image',
      uiaControlType: 'Image',
      uiaAppName: 'Manual',
      annotations: [],
      isPassword: false,
      createdAt: now,
    };
    await api.saveStep(newStep);
    await get().loadSteps(activeProject.id);
    set({ activeStepId: newStep.id });
    return newStep;
  },

  // Canvas Tools
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),
  selectedShapeId: null,
  setSelectedShapeId: (id) => set({ selectedShapeId: id }),
  toolColor: '#2563eb',
  setToolColor: (color) => set({ toolColor: color }),
  strokeWidth: 3,
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  blurIntensity: 12,
  setBlurIntensity: (intensity) => set({ blurIntensity: intensity }),

  // Recording
  isRecording: false,
  isPaused: false,
  appLock: false,

  startRecording: async (config?: any) => {
    let project = get().activeProject;
    if (!project) {
      project = await get().createProject('New Captured Guide', 'SOP');
    }
    const currentSteps = get().steps;
    set({ isRecording: true, isPaused: false });
    await api.startRecording(project.id, {
      ...config,
      existingStepsCount: currentSteps.length,
    });
  },

  stopRecording: async () => {
    set({ isRecording: false, isPaused: false });
    await api.stopRecording();
    const pid = get().activeProject?.id;
    if (pid) {
      await get().loadSteps(pid);
    }
  },

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  toggleAppLock: () => set((state) => ({ appLock: !state.appLock })),

  triggerManualSnapshot: async () => {
    const pid = get().activeProject?.id;
    if (pid) {
      await api.manualSnapshot(pid);
      await get().loadSteps(pid);
    }
  },

  // Branding
  branding: api.getGlobalBranding(),
  updateBranding: (branding) => {
    api.saveGlobalBranding(branding);
    set({ branding });
  },

  // AI BYOK Configuration
  aiConfig: (() => {
    try {
      const raw = localStorage.getItem('scrcd_ai_config');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      provider: 'openai' as const,
      apiKey: '',
      model: 'gpt-4o-mini',
      customBaseUrl: '',
    };
  })(),

  setAiConfig: (partial) => {
    const updated = { ...get().aiConfig, ...partial };
    localStorage.setItem('scrcd_ai_config', JSON.stringify(updated));
    set({ aiConfig: updated });
  },

  applyAiWrittenContent: async (updates, projectTitle) => {
    const { activeProject, steps } = get();
    if (!activeProject) return;

    const updateMap = new Map(updates.map((u) => [u.id, u]));
    const updatedSteps = steps.map((s) => {
      const u = updateMap.get(s.id);
      if (u) {
        return {
          ...s,
          title: u.title || s.title,
          richInstructions: u.richInstructions || s.richInstructions,
          sectionTitle: u.sectionTitle !== undefined ? u.sectionTitle : s.sectionTitle,
        };
      }
      return s;
    });

    await api.saveStepsBatch(activeProject.id, updatedSteps);
    set({ steps: updatedSteps });

    if (projectTitle && projectTitle.trim()) {
      const updatedProj = { ...activeProject, title: projectTitle.trim() };
      await api.saveProject(updatedProj);
      set({ activeProject: updatedProj });
      await get().loadProjects();
    }
  },

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedCategory: 'All',
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
}));
