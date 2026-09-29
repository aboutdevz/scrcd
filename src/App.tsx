import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/layout/Header';
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard';
import { EditorView } from '@/components/editor/EditorView';
import { SettingsView } from '@/components/settings/SettingsView';
import { FloatingPill } from '@/components/recorder/FloatingPill';
import { ExportModal } from '@/components/export/ExportModal';
import { SimulatedCaptureModal } from '@/components/common/SimulatedCaptureModal';
import { CaptureSetupModal } from '@/components/recorder/CaptureSetupModal';
import { api, isElectron, getElectron } from '@/services/api';
import { Step, CaptureConfig } from '@/types';

export const App: React.FC = () => {
  const isPillMode = window.location.hash === '#pill';

  const { currentView, loadProjects, activeProject, loadSteps, selectProject, startRecording } = useStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCaptureSetupOpen, setIsCaptureSetupOpen] = useState(false);

  useEffect(() => {
    if (isPillMode) return;

    // Initial load of projects
    loadProjects();

    // Listen to Electron recording finished event
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

    // Step captured callback for web dev mode
    const unsub = api.onStepCaptured((step) => {
      if (activeProject && step.projectId === activeProject.id) {
        loadSteps(activeProject.id);
      }
    });

    return () => unsub();
  }, [activeProject, isPillMode]);

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
      {/* Top Header */}
      <Header
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenCaptureSetup={() => setIsCaptureSetupOpen(true)}
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

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />

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
    </div>
  );
};

export default App;
