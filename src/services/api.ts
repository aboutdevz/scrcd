import { Project, Step, Section, BrandingProfile } from '@/types';
import { generateMockScreenshot } from './mockData';

// Check if running inside desktop Tauri runtime
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

// Initial sample projects for first-time use
const DEFAULT_BRANDING: BrandingProfile = {
  companyName: 'Acme Corporation',
  author: 'System Operations Team',
  accentColor: '#2563eb',
  footerText: 'Confidential - Standard Operating Procedure',
};

const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'proj_demo_chrome_security',
    title: 'How to Update Account Security Settings in Chrome',
    description: 'A standard operating procedure for navigating to user security settings, entering verification details, and saving modifications.',
    category: 'SOP',
    tags: ['Security', 'Browser', 'SOP'],
    author: 'IT Security Dept',
    companyName: 'Acme Global',
    accentColor: '#2563eb',
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'proj_demo_vscode_setup',
    title: 'Developer Onboarding: Configuring VS Code Workspace',
    description: 'Step-by-step walkthrough for opening the project workspace, configuring development dependencies, and verifying test suites.',
    category: 'Onboarding',
    tags: ['DevOps', 'VSCode', 'Onboarding'],
    author: 'Engineering Lead',
    companyName: 'Acme Global',
    accentColor: '#10b981',
    createdAt: Date.now() - 3600000 * 48,
    updatedAt: Date.now() - 3600000 * 5,
  },
];

const createSampleSteps = (projectId: string): Step[] => {
  if (projectId === 'proj_demo_chrome_security') {
    const shot1 = generateMockScreenshot('Google Chrome - Security Settings', 1280, 720, 520, 222, 'chrome');
    const shot2 = generateMockScreenshot('Google Chrome - Security Settings', 1280, 720, 230, 290, 'chrome');

    return [
      {
        id: 'step_1',
        projectId,
        stepNumber: 1,
        title: "Click on 'Current Password' input field in Google Chrome",
        richInstructions: '<p>Navigate to the Account Security tab and click inside the <strong>Current Password</strong> field to authenticate your session.</p>',
        actionType: 'click',
        screenshotPath: shot1,
        originalWidth: 1280,
        originalHeight: 720,
        clickX: 270,
        clickY: 222,
        uiaName: 'Current Password',
        uiaControlType: 'Input Field',
        uiaAppName: 'Google Chrome',
        annotations: [
          {
            id: 'h1',
            type: 'hotspot',
            x: 270,
            y: 222,
            number: 1,
            color: '#2563eb',
          },
          {
            id: 'arr1',
            type: 'arrow',
            points: [370, 270, 290, 235],
            color: '#2563eb',
            strokeWidth: 3,
          },
        ],
        isPassword: true,
        createdAt: Date.now() - 3600000 * 2,
      },
      {
        id: 'step_2',
        projectId,
        stepNumber: 2,
        title: "Click the 'Save Changes' button in Google Chrome",
        richInstructions: '<p>Confirm your security modifications by clicking the blue <strong>Save Changes</strong> button at the bottom of the form.</p>',
        actionType: 'click',
        screenshotPath: shot2,
        originalWidth: 1280,
        originalHeight: 720,
        clickX: 230,
        clickY: 290,
        uiaName: 'Save Changes',
        uiaControlType: 'Button',
        uiaAppName: 'Google Chrome',
        annotations: [
          {
            id: 'h2',
            type: 'hotspot',
            x: 230,
            y: 290,
            number: 2,
            color: '#2563eb',
          },
        ],
        isPassword: false,
        createdAt: Date.now() - 3600000 * 2 + 15000,
      },
    ];
  }

  const shotVS = generateMockScreenshot('Visual Studio Code', 1280, 720, 310, 105, 'vscode');
  return [
    {
      id: 'step_vs_1',
      projectId,
      stepNumber: 1,
      title: "Open App.tsx file in Visual Studio Code",
      richInstructions: '<p>In the Explorer panel, locate the <code>src/</code> directory and double click on <strong>App.tsx</strong>.</p>',
      actionType: 'double_click',
      screenshotPath: shotVS,
      originalWidth: 1280,
      originalHeight: 720,
      clickX: 135,
      clickY: 120,
      uiaName: 'App.tsx',
      uiaControlType: 'ListItem',
      uiaAppName: 'Visual Studio Code',
      annotations: [
        {
          id: 'hvs1',
          type: 'hotspot',
          x: 135,
          y: 120,
          number: 1,
          color: '#10b981',
        },
      ],
      isPassword: false,
      createdAt: Date.now() - 3600000 * 5,
    },
  ];
};

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
      localStorage.setItem('scrcd_projects', JSON.stringify(SAMPLE_PROJECTS));
      return SAMPLE_PROJECTS;
    }
    return JSON.parse(raw);
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
      const initial = createSampleSteps(projectId);
      localStorage.setItem(`scrcd_steps_${projectId}`, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
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

  async startRecording(projectId: string, appLock = false): Promise<void> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('start_recording', { projectId, appLock });
        return;
      } catch (err) {
        console.warn('Tauri invoke failed', err);
      }
    }
    console.log(`[Dev-Bridge] Simulated recording started for project: ${projectId} (appLock: ${appLock})`);
  },

  async stopRecording(): Promise<void> {
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

  async manualSnapshot(projectId: string): Promise<Step> {
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

  getGlobalBranding(): BrandingProfile {
    const raw = localStorage.getItem('scrcd_branding');
    if (!raw) return DEFAULT_BRANDING;
    return JSON.parse(raw);
  },

  saveGlobalBranding(branding: BrandingProfile): void {
    localStorage.setItem('scrcd_branding', JSON.stringify(branding));
  },
};
