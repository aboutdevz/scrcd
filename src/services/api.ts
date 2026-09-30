import { Project, Step, Section, BrandingProfile } from '@/types';
import { generateMockScreenshot } from './mockData';

// Check if running inside desktop Tauri runtime
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

// Check if running inside Electron runtime
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).require);
};

export const getElectron = () => {
  if (isElectron()) {
    try {
      return (window as any).require('electron');
    } catch {
      return null;
    }
  }
  return null;
};

// Initial branding
const DEFAULT_BRANDING: BrandingProfile = {
  companyName: 'Acme Corporation',
  author: 'System Operations Team',
  accentColor: '#2563eb',
  footerText: 'Confidential - Standard Operating Procedure',
};

// Empty default projects (no hardcoded demos)
const SAMPLE_PROJECTS: Project[] = [];

type StepCallback = (step: Step) => void;
const stepListeners: StepCallback[] = [];

// Dev-Bridge API Client
export const api = {
  async listProjects(): Promise<Project[]> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<Project[]>('list_projects');
      } catch (err) {
        console.warn('Tauri invoke failed, falling back to local storage', err);
      }
    }
    const raw = localStorage.getItem('scrcd_projects');
    if (!raw) {
      localStorage.setItem('scrcd_projects', JSON.stringify([]));
      return [];
    }
    try {
      let parsed: Project[] = JSON.parse(raw);
      // Clean up legacy demo projects and ensure version exists
      const filtered = parsed
        .filter((p) => !p.id.startsWith('proj_demo_'))
        .map((p) => ({ ...p, version: p.version || '1.0.0' }));
      if (filtered.length !== parsed.length) {
        localStorage.setItem('scrcd_projects', JSON.stringify(filtered));
      }
      return filtered;
    } catch {
      return [];
    }
  },

  async getProject(id: string): Promise<Project | null> {
    const list = await this.listProjects();
    return list.find((p) => p.id === id) || null;
  },

  async saveProject(project: Project): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_project', { project });
        return;
      } catch (err) {
        console.warn('Tauri invoke failed, falling back to local storage', err);
      }
    }
    const list = await this.listProjects();
    const idx = list.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      list[idx] = { ...project, updatedAt: Date.now() };
    } else {
      list.unshift({ ...project, createdAt: Date.now(), updatedAt: Date.now() });
    }
    localStorage.setItem('scrcd_projects', JSON.stringify(list));
  },

  async deleteProject(id: string): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_project', { id });
        return;
      } catch (err) {
        console.warn('Tauri invoke failed, falling back to local storage', err);
      }
    }
    const list = await this.listProjects();
    const filtered = list.filter((p) => p.id !== id);
    localStorage.setItem('scrcd_projects', JSON.stringify(filtered));
    localStorage.removeItem(`scrcd_steps_${id}`);
  },

  async listSteps(projectId: string): Promise<Step[]> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<Step[]>('list_steps', { projectId });
      } catch (err) {
        console.warn('Tauri invoke failed, falling back to local storage', err);
      }
    }
    const raw = localStorage.getItem(`scrcd_steps_${projectId}`);
    if (!raw) {
      localStorage.setItem(`scrcd_steps_${projectId}`, JSON.stringify([]));
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async saveStep(step: Step): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_step', { step });
        return;
      } catch (err) {
        console.warn('Tauri invoke failed, falling back to local storage', err);
      }
    }
    const steps = await this.listSteps(step.projectId);
    const idx = steps.findIndex((s) => s.id === step.id);
    if (idx >= 0) {
      steps[idx] = step;
    } else {
      steps.push(step);
    }
    // Update step numbers sequentially
    steps.forEach((s, i) => {
      s.stepNumber = i + 1;
    });
    localStorage.setItem(`scrcd_steps_${step.projectId}`, JSON.stringify(steps));
  },

  async saveStepsBatch(projectId: string, steps: Step[]): Promise<void> {
    steps.forEach((s, i) => {
      s.stepNumber = i + 1;
    });
    localStorage.setItem(`scrcd_steps_${projectId}`, JSON.stringify(steps));
  },

  async deleteStep(projectId: string, id: string): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_step', { id });
        return;
      } catch (err) {
        console.warn('Tauri invoke failed, falling back to local storage', err);
      }
    }
    const steps = await this.listSteps(projectId);
    const filtered = steps.filter((s) => s.id !== id);
    filtered.forEach((s, i) => {
      s.stepNumber = i + 1;
    });
    localStorage.setItem(`scrcd_steps_${projectId}`, JSON.stringify(filtered));
  },

  async getCaptureSources(): Promise<{ displays: any[]; isMultiMonitor: boolean }> {
    if (isElectron()) {
      const electron = getElectron();
      if (electron) {
        return await electron.ipcRenderer.invoke('get-capture-sources');
      }
    }
    return {
      displays: [{ id: 1, index: 1, isPrimary: true, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, label: 'Primary Monitor (1920×1080)' }],
      isMultiMonitor: false,
    };
  },

  async startRecording(projectId: string, config?: any): Promise<void> {
    if (isElectron()) {
      const electron = getElectron();
      if (electron) {
        await electron.ipcRenderer.invoke('start-recording', { projectId, config });
        return;
      }
    }
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('start_recording', { projectId });
        return;
      } catch (err) {
        console.warn('Tauri invoke failed', err);
      }
    }
    console.log(`[Dev-Bridge] Simulated recording started for project: ${projectId}`);
  },

  async stopRecording(): Promise<void> {
    if (isElectron()) {
      const electron = getElectron();
      if (electron) {
        await electron.ipcRenderer.invoke('finish-recording');
        return;
      }
    }
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('stop_recording');
        return;
      } catch (err) {
        console.warn('Tauri invoke failed', err);
      }
    }
    console.log('[Dev-Bridge] Simulated recording stopped.');
  },

  async manualSnapshot(projectId: string): Promise<Step | null> {
    if (isElectron()) {
      const electron = getElectron();
      if (electron) {
        const existingSteps = await this.listSteps(projectId);
        const step = await electron.ipcRenderer.invoke('manual-snapshot', {
          projectId,
          stepNumber: existingSteps.length + 1,
        });
        if (step) {
          await this.saveStep(step);
          stepListeners.forEach((cb) => cb(step));
          return step;
        }
        return null;
      }
    }
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<Step>('manual_snapshot', { projectId });
      } catch (err) {
        console.warn('Tauri invoke failed', err);
      }
    }
    const steps = await this.listSteps(projectId);
    const now = Date.now();
    const shot = generateMockScreenshot('Manual Screenshot', 1280, 720, 640, 360, 'chrome');
    const newStep: Step = {
      id: `step_${now}`,
      projectId,
      stepNumber: steps.length + 1,
      title: `Manual Snapshot ${steps.length + 1}`,
      richInstructions: '<p>Manual screen capture taken during workflow execution.</p>',
      actionType: 'snapshot',
      screenshotPath: shot,
      originalWidth: 1280,
      originalHeight: 720,
      clickX: 640,
      clickY: 360,
      uiaName: 'Manual Screen',
      uiaControlType: 'Window',
      uiaAppName: 'Desktop',
      annotations: [
        {
          id: `h_${now}`,
          type: 'hotspot',
          x: 640,
          y: 360,
          number: steps.length + 1,
          color: '#2563eb',
        },
      ],
      isPassword: false,
      createdAt: now,
    };
    await this.saveStep(newStep);
    stepListeners.forEach((cb) => cb(newStep));
    return newStep;
  },

  onStepCaptured(callback: StepCallback): () => void {
    stepListeners.push(callback);
    return () => {
      const idx = stepListeners.indexOf(callback);
      if (idx >= 0) stepListeners.splice(idx, 1);
    };
  },

  async exportPdf(
    htmlContent: string,
    defaultFilename: string
  ): Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }> {
    if (isElectron()) {
      const electron = getElectron();
      if (electron && electron.ipcRenderer) {
        return await electron.ipcRenderer.invoke('export-pdf', { htmlContent, defaultFilename });
      }
    }
    return { success: false, error: 'Native PDF export is available in Desktop mode' };
  },

  getGlobalBranding(): BrandingProfile {
    const raw = localStorage.getItem('scrcd_branding');
    if (!raw) return DEFAULT_BRANDING;
    return JSON.parse(raw);
  },

  saveGlobalBranding(branding: BrandingProfile): void {
    localStorage.setItem('scrcd_branding', JSON.stringify(branding));
  },
};
