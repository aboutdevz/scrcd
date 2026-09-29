import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { generateMockScreenshot } from '@/services/mockData';
import { Step } from '@/types';
import { X, Workflow, MousePointer, ShieldCheck, FileCode, Terminal, GitBranch, Play } from 'lucide-react';

interface SimulatedCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulatedCaptureModal: React.FC<SimulatedCaptureModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, updateStep, loadSteps, steps, selectStep } = useStore();
  const [selectedApp, setSelectedApp] = useState<'chrome' | 'vscode' | 'excel'>('chrome');
  const [lastAction, setLastAction] = useState<string | null>(null);

  if (!isOpen || !activeProject) return null;

  const handleSimulatedClick = async (
    elementName: string,
    controlType: string,
    appName: string,
    relX: number,
    relY: number
  ) => {
    const screenshot = generateMockScreenshot(
      `${appName} - Active Window`,
      1280,
      720,
      relX,
      relY,
      selectedApp
    );

    const now = Date.now();
    const nextStepNum = steps.length + 1;
    const actionTitle = `Click on '${elementName}' in ${appName}`;

    const newStep: Step = {
      id: `step_${now}`,
      projectId: activeProject.id,
      stepNumber: nextStepNum,
      title: actionTitle,
      richInstructions: `<p>In ${appName}, locate and click on the <strong>${elementName}</strong> ${controlType.toLowerCase()} to proceed with the workflow.</p>`,
      actionType: 'click',
      screenshotPath: screenshot,
      originalWidth: 1280,
      originalHeight: 720,
      clickX: relX,
      clickY: relY,
      uiaName: elementName,
      uiaControlType: controlType,
      uiaAppName: appName,
      annotations: [
        {
          id: `h_${now}`,
          type: 'hotspot',
          x: relX,
          y: relY,
          number: nextStepNum,
          color: '#2563eb',
        },
      ],
      isPassword: elementName.toLowerCase().includes('password'),
      createdAt: now,
    };

    await updateStep(newStep);
    await loadSteps(activeProject.id);
    selectStep(newStep.id);

    setLastAction(`Captured: ${actionTitle}`);
    setTimeout(() => setLastAction(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Interactive Workflow Click Simulator</h3>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
              Dev-Bridge
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <p className="text-xs text-muted-foreground">
            Click on any interactive element below to simulate an automated mouse-click capture. A screenshot will be snapped, UIA element metadata extracted, and a new step appended to <strong>{activeProject.title}</strong>.
          </p>

          {/* App Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <span className="text-xs font-semibold text-muted-foreground mr-2">Target App:</span>
            <button
              onClick={() => setSelectedApp('chrome')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedApp === 'chrome'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
              }`}
            >
              Google Chrome (Web App)
            </button>
            <button
              onClick={() => setSelectedApp('vscode')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedApp === 'vscode'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
              }`}
            >
              VS Code (Desktop IDE)
            </button>
          </div>

          {/* Simulated App Screen */}
          <div className="border border-border rounded-xl bg-slate-950 p-6 space-y-4 shadow-inner">
            {selectedApp === 'chrome' ? (
              <div className="space-y-4 max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-lg p-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Google Chrome - Security</span>
                  <span className="text-[10px] text-slate-400">https://company.internal</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[11px] text-slate-400">Username</label>
                    <div
                      onClick={() =>
                        handleSimulatedClick('Username', 'Input Field', 'Google Chrome', 200, 180)
                      }
                      className="p-2 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-blue-500 cursor-pointer flex items-center justify-between group"
                    >
                      <span>admin@company.com</span>
                      <MousePointer className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">Password</label>
                    <div
                      onClick={() =>
                        handleSimulatedClick('Password', 'Input Field', 'Google Chrome', 200, 240)
                      }
                      className="p-2 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-blue-500 cursor-pointer flex items-center justify-between group"
                    >
                      <span>••••••••••••</span>
                      <MousePointer className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() =>
                        handleSimulatedClick('Sign In', 'Button', 'Google Chrome', 230, 310)
                      }
                      className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MousePointer className="w-3.5 h-3.5" />
                      Click "Sign In"
                    </button>
                    <button
                      onClick={() =>
                        handleSimulatedClick('Reset 2FA', 'Button', 'Google Chrome', 350, 310)
                      }
                      className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Reset 2FA
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-lg p-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Visual Studio Code</span>
                  <span className="text-[10px] text-slate-400">Workspace: scrcd</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div
                    onClick={() =>
                      handleSimulatedClick('package.json', 'ListItem', 'VS Code', 150, 140)
                    }
                    className="p-3 rounded bg-slate-800 border border-slate-700 hover:border-emerald-500 cursor-pointer text-xs group"
                  >
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                        package.json
                      </span>
                      <MousePointer className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Open configuration</p>
                  </div>

                  <div
                    onClick={() =>
                      handleSimulatedClick('Terminal Tab', 'TabItem', 'VS Code', 300, 140)
                    }
                    className="p-3 rounded bg-slate-800 border border-slate-700 hover:border-emerald-500 cursor-pointer text-xs group"
                  >
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        Terminal
                      </span>
                      <MousePointer className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Open integrated bash</p>
                  </div>

                  <div
                    onClick={() =>
                      handleSimulatedClick('Git Commit Button', 'Button', 'VS Code', 150, 240)
                    }
                    className="p-3 rounded bg-slate-800 border border-slate-700 hover:border-emerald-500 cursor-pointer text-xs group"
                  >
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                        Commit Changes
                      </span>
                      <MousePointer className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Stage and commit</p>
                  </div>

                  <div
                    onClick={() =>
                      handleSimulatedClick('Run Tests', 'Button', 'VS Code', 300, 240)
                    }
                    className="p-3 rounded bg-slate-800 border border-slate-700 hover:border-emerald-500 cursor-pointer text-xs group"
                  >
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-purple-400" />
                        Run Test Suite
                      </span>
                      <MousePointer className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Execute cargo test</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between">
          <span className="text-xs text-emerald-500 font-semibold">
            {lastAction || `Current Steps in Guide: ${steps.length}`}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Done Simulating
          </button>
        </div>
      </div>
    </div>
  );
};
