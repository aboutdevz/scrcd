import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/layout/Header';
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard';
import { FloatingPill } from '@/components/recorder/FloatingPill';
import { SplashScreen } from '@/components/common/SplashScreen';
import { CommandPalette } from '@/components/common/CommandPalette';
import { api, isElectron, getElectron } from '@/services/api';

// Code-split heavy views and modals to keep initial boot bundle lean (<200 kB)
const EditorView = lazy(() => import('@/components/editor/EditorView').then((m) => ({ default: m.EditorView })));
const SettingsView = lazy(() => import('@/components/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const ExportModal = lazy(() => import('@/components/export/ExportModal').then((m) => ({ default: m.ExportModal })));
const MasterBinderModal = lazy(() => import('@/components/export/MasterBinderModal').then((m) => ({ default: m.MasterBinderModal })));
const SimulatedCaptureModal = lazy(() => import('@/components/common/SimulatedCaptureModal').then((m) => ({ default: m.SimulatedCaptureModal })));
const CaptureSetupModal = lazy(() => import('@/components/recorder/CaptureSetupModal').then((m) => ({ default: m.CaptureSetupModal })));
const AboutModal = lazy(() => import('@/components/common/AboutModal').then((m) => ({ default: m.AboutModal })));
const WelcomeModal = lazy(() => import('@/components/onboarding/WelcomeModal').then((m) => ({ default: m.WelcomeModal })));
import { generateMockScreenshot } from '@/services/mockData';
import { Step, CaptureConfig } from '@/types';

export const App: React.FC = () => {
  const isPillMode = window.location.hash === '#pill';

  const {
    currentView,
    loadProjects,
    loadFolders,
    activeProject,
    loadSteps,
    selectProject,
    startRecording,
    createProject,
    isAboutOpen,
    setIsAboutOpen,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    hasCompletedOnboarding,
    isMasterBinderOpen,
    setIsMasterBinderOpen,
    masterBinderFolderId,
    setMasterBinderFolderId,
  } = useStore();

  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCaptureSetupOpen, setIsCaptureSetupOpen] = useState(false);

  // Global keybindings (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!useStore.getState().isCommandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    if (isPillMode) {
      document.documentElement.classList.add('pill-mode');
      document.body.classList.add('pill-mode');
      document.documentElement.style.background = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.background = 'transparent';
      document.body.style.backgroundColor = 'transparent';
    }
  }, [isPillMode]);

  // Recording listener
  useEffect(() => {
    if (isPillMode) return;

    if (isElectron()) {
      const electron = getElectron();
      if (electron && electron.ipcRenderer) {
        const onFinished = async (_e: any, data: { projectId: string; steps: Step[] }) => {
          if (data && data.projectId) {
            if (data.steps && data.steps.length > 0) {
              const existingSteps = await api.listSteps(data.projectId);
              const existingIds = new Set(existingSteps.map((s) => s.id));
              const newSteps = data.steps.filter((s) => !existingIds.has(s.id));
              const combined = [...existingSteps, ...newSteps];
              await api.saveStepsBatch(data.projectId, combined);
            }
            await selectProject(data.projectId);
            useStore.setState({ isRecording: false, currentView: 'editor' });
          }
        };

        const onCancelled = () => {
          useStore.setState({ isRecording: false });
        };

        electron.ipcRenderer.on('recording-finished', onFinished);
        electron.ipcRenderer.on('recording-cancelled', onCancelled);

        return () => {
          electron.ipcRenderer.removeListener('recording-finished', onFinished);
          electron.ipcRenderer.removeListener('recording-cancelled', onCancelled);
        };
      }
    }

    const unsub = api.onStepCaptured((step) => {
      if (activeProject && step.projectId === activeProject.id) {
        loadSteps(activeProject.id);
      }
    });

    return () => unsub();
  }, [activeProject, isPillMode, selectProject, loadSteps]);

  // Handle splash completion
  const handleSplashComplete = React.useCallback(() => {
    setIsSplashComplete(true);
    // If user has not completed onboarding, trigger the Welcome Modal!
    if (!useStore.getState().hasCompletedOnboarding) {
      setIsWelcomeOpen(true);
    }
  }, []);

  // Helper to load sample procedure
  const handleLoadSample = async () => {
    const sample = await createProject(
      'System Setup & Backup Configuration',
      'SOP',
      'Standard procedure for configuring database cluster replicas and disaster recovery retention policies.',
      '1.0.0',
      null,
      ['setup', 'database', 'sample']
    );

    const shot1 = generateMockScreenshot('PostgreSQL Cluster Admin', 1280, 720, 640, 360, 'vscode');
    const shot2 = generateMockScreenshot('Disaster Recovery Console', 1280, 720, 480, 280, 'chrome');

    const step1: Step = {
      id: `step_${Date.now()}_1`,
      projectId: sample.id,
      stepNumber: 1,
      title: 'Open Cluster Settings',
      richInstructions: '<p>Navigate to the <strong>Replication Engine</strong> dashboard and verify node health status.</p>',
      actionType: 'click',
      screenshotPath: shot1,
      originalWidth: 1280,
      originalHeight: 720,
      clickX: 640,
      clickY: 360,
      uiaName: 'Replication Node Tab',
      uiaControlType: 'TabItem',
      uiaAppName: 'ClusterManager',
      annotations: [
        {
          id: `h_${Date.now()}_1`,
          type: 'hotspot',
          x: 640,
          y: 360,
          number: 1,
          color: '#2563eb',
          variant: 'spotlight',
        },
      ],
      isPassword: false,
      createdAt: Date.now(),
    };

    const step2: Step = {
      id: `step_${Date.now()}_2`,
      projectId: sample.id,
      stepNumber: 2,
      title: 'Configure Daily Snapshot Retention',
      richInstructions: '<p>Select the <strong>Daily Snapshots</strong> dropdown and set retention policy to <em>30 Days</em>.</p>',
      actionType: 'click',
      screenshotPath: shot2,
      originalWidth: 1280,
      originalHeight: 720,
      clickX: 480,
      clickY: 280,
      uiaName: 'Retention Dropdown',
      uiaControlType: 'ComboBox',
      uiaAppName: 'Console',
      annotations: [
        {
          id: `h_${Date.now()}_2`,
          type: 'hotspot',
          x: 480,
          y: 280,
          number: 2,
          color: '#2563eb',
          variant: 'badge',
        },
      ],
      isPassword: false,
      createdAt: Date.now() + 100,
    };

    await api.saveStepsBatch(sample.id, [step1, step2]);
    await selectProject(sample.id);
  };

  // If in floating pill window mode, render ONLY the floating pill on transparent background
  if (isPillMode) {
    return (
      <div className="w-screen h-screen bg-transparent p-0 overflow-hidden select-none flex items-center justify-center">
        <FloatingPill isStandalone={true} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Functional Startup Splash Screen */}
      {!isSplashComplete && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Top Header */}
      <Header
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenCaptureSetup={() => setIsCaptureSetupOpen(true)}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
      />

      {/* Main Views */}
      <div className="flex-1 flex overflow-hidden">
        {currentView === 'dashboard' && (
          <ProjectDashboard
            onOpenExport={() => setIsExportOpen(true)}
            onOpenCaptureSetup={() => setIsCaptureSetupOpen(true)}
          />
        )}
        <Suspense fallback={null}>
          {currentView === 'editor' && <EditorView />}
          {currentView === 'settings' && <SettingsView />}
        </Suspense>
      </div>

      {/* Floating Recorder Controller for Browser/Dev mode fallback */}
      {!isElectron() && <FloatingPill isStandalone={false} />}

      <Suspense fallback={null}>
        {/* Export Modal (Single Guide) */}
        {isExportOpen && <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />}

        {/* Master Binder Export Modal (Multi-guide Folder Handbook) */}
        {isMasterBinderOpen && (
          <MasterBinderModal
            isOpen={isMasterBinderOpen}
            onClose={() => setIsMasterBinderOpen(false)}
            folderId={masterBinderFolderId}
          />
        )}

        {/* Browser Simulation Modal */}
        {isSimulatorOpen && (
          <SimulatedCaptureModal
            isOpen={isSimulatorOpen}
            onClose={() => setIsSimulatorOpen(false)}
          />
        )}

        {/* Capture Setup Modal */}
        {isCaptureSetupOpen && (
          <CaptureSetupModal
            isOpen={isCaptureSetupOpen}
            onClose={() => setIsCaptureSetupOpen(false)}
            onStart={async (config: CaptureConfig) => {
              setIsCaptureSetupOpen(false);
              await startRecording(config);
            }}
          />
        )}

        {/* "About SCRCD" Modal (v1.2.0) */}
        {isAboutOpen && (
          <AboutModal
            isOpen={isAboutOpen}
            onClose={() => setIsAboutOpen(false)}
          />
        )}

        {/* Onboarding Welcome Screen */}
        {isWelcomeOpen && (
          <WelcomeModal
            isOpen={isWelcomeOpen}
            onClose={() => setIsWelcomeOpen(false)}
            onStartRecording={() => {
              setIsWelcomeOpen(false);
              setIsCaptureSetupOpen(true);
            }}
            onOpenCreateGuide={() => {
              setIsWelcomeOpen(false);
              useStore.getState().setCurrentView('dashboard');
            }}
            onLoadSample={handleLoadSample}
          />
        )}
      </Suspense>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />
    </div>
  );
};

export default App;
