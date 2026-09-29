import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/layout/Header';
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard';
import { EditorView } from '@/components/editor/EditorView';
import { SettingsView } from '@/components/settings/SettingsView';
import { FloatingPill } from '@/components/recorder/FloatingPill';
import { ExportModal } from '@/components/export/ExportModal';
import { SimulatedCaptureModal } from '@/components/common/SimulatedCaptureModal';
import { api, isTauri } from '@/services/api';

export const App: React.FC = () => {
  const { currentView, loadProjects, activeProject, loadSteps, selectProject, projects } = useStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  useEffect(() => {
    // Initial load
    const init = async () => {
      await loadProjects();
    };
    init();

    // Listen to step-captured events from Rust core or dev simulation
    const unsub = api.onStepCaptured((step) => {
      if (activeProject && step.projectId === activeProject.id) {
        loadSteps(activeProject.id);
      }
    });

    return () => unsub();
  }, [activeProject]);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Top Header */}
      <Header
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Main Views */}
      <div className="flex-1 flex overflow-hidden">
        {currentView === 'dashboard' && (
          <ProjectDashboard onOpenExport={() => setIsExportOpen(true)} />
        )}
        {currentView === 'editor' && <EditorView />}
        {currentView === 'settings' && <SettingsView />}
      </div>

      {/* Floating Recorder Controller */}
      <FloatingPill />

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />

      {/* Browser Simulation Modal */}
      <SimulatedCaptureModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
};

export default App;
