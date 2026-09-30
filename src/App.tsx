import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/layout/Header';
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard';
import { EditorView } from '@/components/editor/EditorView';
import { SettingsView } from '@/components/settings/SettingsView';
import { FloatingPill } from '@/components/recorder/FloatingPill';
import { ExportModal } from '@/components/export/ExportModal';
import { MasterBinderModal } from '@/components/export/MasterBinderModal';
import { SimulatedCaptureModal } from '@/components/common/SimulatedCaptureModal';
import { CaptureSetupModal } from '@/components/recorder/CaptureSetupModal';
import { SplashScreen } from '@/components/common/SplashScreen';
import { AboutModal } from '@/components/common/AboutModal';
import { CommandPalette } from '@/components/common/CommandPalette';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { api, isElectron, getElectron } from '@/services/api';
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
      <div className="w-screen h-screen bg-transparent p-1 overflow-hidden select-none">
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
        {currentView === 'editor' && <EditorView />}
        {currentView === 'settings' && <SettingsView />}
      </div>

      {/* Floating Recorder Controller for Browser/Dev mode fallback */}
      {!isElectron() && <FloatingPill isStandalone={false} />}

      {/* Export Modal (Single Guide) */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />

      {/* Master Binder Export Modal (Multi-guide Folder Handbook) */}
      <MasterBinderModal
        isOpen={isMasterBinderOpen}
        onClose={() => setIsMasterBinderOpen(false)}
        folderId={masterBinderFolderId}
      />

      {/* Browser Simulation Modal */}
      <SimulatedCaptureModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      {/* Capture Setup Modal */}
      <CaptureSetupModal
        isOpen={isCaptureSetupOpen}
        onClose={() => setIsCaptureSetupOpen(false)}
        onStart={async (config: CaptureConfig) => {
          setIsCaptureSetupOpen(false);
          await startRecording(config);
        }}
      />

      {/* "About SCRCD" Modal (v1.2.0) */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Onboarding Welcome Screen */}
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
    </div>
  );
};

export default App;
