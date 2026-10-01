import { create } from 'zustand';
import { Project, Step, AnnotationShape, AnnotationTool, BrandingProfile, Section, Folder, GuideVersion } from '@/types';
import { api, DEFAULT_CATEGORIES } from '@/services/api';

interface AppState {
  // Navigation
  currentView: 'dashboard' | 'editor' | 'settings';
  setCurrentView: (view: 'dashboard' | 'editor' | 'settings') => void;

  // Categories
  categories: string[];
  loadCategories: () => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (category: string) => Promise<void>;

  // Versions & Change Detection
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (val: boolean) => void;
  projectVersions: GuideVersion[];
  loadProjectVersions: (projectId: string) => Promise<void>;
  saveCurrentVersion: (versionTag: string, note?: string) => Promise<GuideVersion | null>;
  restoreProjectVersion: (versionId: string) => Promise<void>;
  deleteProjectVersion: (versionId: string) => Promise<void>;

  // Folders
  folders: Folder[];
  activeFolderId: string | null; // null = all, '__unorganized__' = unorganized, or folder id
  loadFolders: () => Promise<void>;
  createFolder: (name: string, description?: string, color?: string) => Promise<Folder>;
  updateFolder: (folder: Folder) => Promise<void>;
  deleteFolder: (id: string, deleteGuides?: boolean) => Promise<void>;
  setActiveFolderId: (id: string | null) => void;
  moveProjectToFolder: (projectId: string, folderId: string | null) => Promise<void>;

  // Projects
  projects: Project[];
  activeProject: Project | null;
  loadProjects: () => Promise<void>;
  createProject: (
    title: string,
    category?: string,
    description?: string,
    version?: string,
    folderId?: string | null,
    tags?: string[]
  ) => Promise<Project>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string) => Promise<void>;

  // Custom Tags
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  getAllTags: () => string[];

  // Command Palette & Global Search
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Onboarding & Modals
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (val: boolean) => void;
  isAboutOpen: boolean;
  setIsAboutOpen: (val: boolean) => void;
  isMasterBinderOpen: boolean;
  setIsMasterBinderOpen: (val: boolean) => void;
  masterBinderFolderId: string | null;
  setMasterBinderFolderId: (id: string | null) => void;

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

  // Categories
  categories: DEFAULT_CATEGORIES,
  loadCategories: async () => {
    const categories = await api.listCategories();
    set({ categories });
  },
  addCategory: async (category: string) => {
    const categories = await api.addCategory(category);
    set({ categories });
  },
  deleteCategory: async (category: string) => {
    const categories = await api.deleteCategory(category);
    set({ categories });
  },

  // Versions & Change Detection
  hasUnsavedChanges: false,
  setHasUnsavedChanges: (val) => set({ hasUnsavedChanges: val }),
  projectVersions: [],
  loadProjectVersions: async (projectId: string) => {
    const projectVersions = await api.listProjectVersions(projectId);
    set({ projectVersions });
  },
  saveCurrentVersion: async (versionTag: string, note?: string) => {
    const { activeProject, steps } = get();
    if (!activeProject) return null;

    const versionStr = versionTag.trim();
    const verId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const versionRecord: GuideVersion = {
      id: verId,
      projectId: activeProject.id,
      version: versionStr,
      note: note ? note.trim() : undefined,
      createdAt: Date.now(),
      projectSnapshot: { ...activeProject, version: versionStr },
      stepsSnapshot: steps.map((s) => ({ ...s })),
    };

    await api.saveProjectVersion(versionRecord);
    const updatedProj: Project = { ...activeProject, version: versionStr, updatedAt: Date.now() };
    await api.saveProject(updatedProj);

    set((state) => ({
      activeProject: updatedProj,
      projects: state.projects.map((p) => (p.id === updatedProj.id ? updatedProj : p)),
      hasUnsavedChanges: false,
    }));

    await get().loadProjectVersions(activeProject.id);
    return versionRecord;
  },
  restoreProjectVersion: async (versionId: string) => {
    const { activeProject } = get();
    if (!activeProject) return;
    const restored = await api.restoreProjectVersion(activeProject.id, versionId);
    if (restored) {
      set({
        activeProject: restored.project,
        steps: restored.steps,
        activeStepId: restored.steps[0]?.id ?? null,
        hasUnsavedChanges: false,
      });
      await get().loadProjects();
      await get().loadProjectVersions(activeProject.id);
    }
  },
  deleteProjectVersion: async (versionId: string) => {
    const { activeProject } = get();
    if (!activeProject) return;
    await api.deleteProjectVersion(activeProject.id, versionId);
    await get().loadProjectVersions(activeProject.id);
  },

  // Folders
  folders: [],
  activeFolderId: null,

  loadFolders: async () => {
    const folders = await api.listFolders();
    set({ folders });
  },

  createFolder: async (name, description = '', color = '#2563eb') => {
    const id = `folder_${Date.now()}`;
    const newFolder: Folder = {
      id,
      name: name.trim(),
      description: description.trim(),
      color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await api.saveFolder(newFolder);
    await get().loadFolders();
    return newFolder;
  },

  updateFolder: async (folder) => {
    await api.saveFolder(folder);
    set((state) => ({
      folders: state.folders.map((f) => (f.id === folder.id ? folder : f)),
    }));
  },

  deleteFolder: async (id, deleteGuides = false) => {
    await api.deleteFolder(id, { deleteGuides });
    const folders = get().folders.filter((f) => f.id !== id);
    const activeFolderId = get().activeFolderId === id ? null : get().activeFolderId;
    set({ folders, activeFolderId });
    await get().loadProjects();
  },

  setActiveFolderId: (id) => set({ activeFolderId: id }),

  moveProjectToFolder: async (projectId, folderId) => {
    const project = await api.getProject(projectId);
    if (project) {
      const updated: Project = { ...project, folderId: folderId || null, updatedAt: Date.now() };
      await api.saveProject(updated);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? updated : p)),
        activeProject: state.activeProject?.id === projectId ? updated : state.activeProject,
      }));
    }
  },

  // Projects
  projects: [],
  activeProject: null,

  loadProjects: async () => {
    const projects = await api.listProjects();
    set({ projects });
  },

  createProject: async (title, category = 'SOP', description = '', version = '1.0.0', folderId, tags) => {
    const id = `proj_${Date.now()}`;
    const branding = get().branding;
    const currentActiveFolder = get().activeFolderId;
    const assignedFolderId =
      folderId !== undefined
        ? folderId
        : currentActiveFolder && currentActiveFolder !== '__unorganized__'
        ? currentActiveFolder
        : null;
    const assignedTags = tags && tags.length > 0 ? tags : (category ? [category] : ['SOP']);

    const newProj: Project = {
      id,
      folderId: assignedFolderId,
      title: title || 'Untitled Guide',
      version: version || '1.0.0',
      description,
      category: category as any,
      tags: assignedTags,
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
      hasUnsavedChanges: true,
    }));
  },

  deleteProject: async (id) => {
    await api.deleteProject(id);
    const list = get().projects.filter((p) => p.id !== id);
    set({
      projects: list,
      activeProject: get().activeProject?.id === id ? null : get().activeProject,
      currentView: 'dashboard',
      hasUnsavedChanges: false,
    });
  },

  selectProject: async (id) => {
    const project = await api.getProject(id);
    if (project) {
      set({ activeProject: project, currentView: 'editor', hasUnsavedChanges: false });
      await get().loadSteps(id);
      await get().loadProjectVersions(id);
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
      hasUnsavedChanges: true,
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
    set({ steps: remaining, activeStepId: nextActive, selectedShapeId: null, hasUnsavedChanges: true });
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
    set({ steps: reordered, hasUnsavedChanges: true });
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
    set({ activeStepId: mergedStep.id, hasUnsavedChanges: true });
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
      set({ activeStepId: step.id, hasUnsavedChanges: true });
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
    set({ activeStepId: newStep.id, hasUnsavedChanges: true });
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
    set({ steps: updatedSteps, hasUnsavedChanges: true });

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

  // Custom Tags
  selectedTag: null,
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  getAllTags: () => {
    const all = new Set<string>();
    get().projects.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t && t.trim()) all.add(t.trim());
        });
      }
    });
    return Array.from(all);
  },

  // Command Palette
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  // Onboarding & Modals
  hasCompletedOnboarding: (() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('scrcd_onboarded') === 'true';
  })(),
  setHasCompletedOnboarding: (val) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scrcd_onboarded', val ? 'true' : 'false');
    }
    set({ hasCompletedOnboarding: val });
  },
  isAboutOpen: false,
  setIsAboutOpen: (val) => set({ isAboutOpen: val }),
  isMasterBinderOpen: false,
  setIsMasterBinderOpen: (val) => set({ isMasterBinderOpen: val }),
  masterBinderFolderId: null,
  setMasterBinderFolderId: (id) => set({ masterBinderFolderId: id, isMasterBinderOpen: Boolean(id) }),
}));
