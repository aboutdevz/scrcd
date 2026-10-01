import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { GuideVersion, Step } from '@/types';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
  History,
  X,
  RotateCcw,
  Trash2,
  Eye,
  Calendar,
  Layers,
  FileText,
  ChevronRight,
  Clock,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeProject,
    projectVersions,
    restoreProjectVersion,
    deleteProjectVersion,
  } = useStore();

  const [selectedVersion, setSelectedVersion] = useState<GuideVersion | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<GuideVersion | null>(null);
  const [versionToDelete, setVersionToDelete] = useState<GuideVersion | null>(null);

  if (!isOpen || !activeProject) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleConfirmRestore = async () => {
    if (!versionToRestore) return;
    await restoreProjectVersion(versionToRestore.id);
    setVersionToRestore(null);
    setSelectedVersion(null);
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (!versionToDelete) return;
    await deleteProjectVersion(versionToDelete.id);
    if (selectedVersion?.id === versionToDelete.id) {
      setSelectedVersion(null);
    }
    setVersionToDelete(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end">
        <div className="w-full max-w-xl bg-card border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Version History</h2>
                <p className="text-[11px] text-muted-foreground truncate max-w-[320px]">
                  {activeProject.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {selectedVersion ? (
              /* Single Version Detail / Preview View */
              <div className="space-y-4 animate-in fade-in duration-150">
                <button
                  onClick={() => setSelectedVersion(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to all versions</span>
                </button>

                {/* Version Overview Card */}
                <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      v{selectedVersion.version}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(selectedVersion.createdAt)}
                    </span>
                  </div>

                  {selectedVersion.note && (
                    <p className="text-xs text-foreground bg-card/60 p-2.5 rounded-lg border border-border/60">
                      {selectedVersion.note}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {selectedVersion.stepsSnapshot.length} steps in this snapshot
                    </span>

                    <button
                      onClick={() => setVersionToRestore(selectedVersion)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore as Current Draft</span>
                    </button>
                  </div>
                </div>

                {/* Steps Preview List */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Snapshot Steps
                  </h3>

                  {selectedVersion.stepsSnapshot.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No steps recorded in this version.</p>
                  ) : (
                    selectedVersion.stepsSnapshot.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <span className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{step.title || `Step ${idx + 1}`}</span>
                        </div>

                        {step.screenshotPath && (
                          <div className="rounded border border-border/80 overflow-hidden bg-slate-950/20 max-h-48 flex items-center justify-center">
                            <img
                              src={step.screenshotPath}
                              alt={step.title}
                              className="max-h-48 w-auto object-contain"
                            />
                          </div>
                        )}

                        {step.richInstructions && (
                          <div
                            className="text-muted-foreground text-[11px] prose-xs [&_p]:text-muted-foreground [&_strong]:text-foreground"
                            dangerouslySetInnerHTML={{ __html: step.richInstructions }}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Version Timeline List */
              <div className="space-y-4">
                {/* Active Working Draft Indicator */}
                <div className="p-3.5 rounded-xl border border-primary/40 bg-primary/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-foreground">Current Working Draft</span>
                    </div>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border">
                      v{activeProject.version || '1.0.0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Live editable draft. Save a version snapshot to preserve a milestone in history.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Saved Version Snapshots ({projectVersions.length})
                  </h3>

                  {projectVersions.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border text-muted-foreground space-y-2">
                      <History className="w-8 h-8 mx-auto opacity-40" />
                      <p className="text-xs font-medium">No saved versions yet</p>
                      <p className="text-[11px] max-w-xs mx-auto">
                        Click "Save Version" in the top bar to record milestones for this guide.
                      </p>
                    </div>
                  ) : (
                    projectVersions.map((v) => (
                      <div
                        key={v.id}
                        className="group p-3.5 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              v{v.version}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(v.createdAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                            <button
                              onClick={() => setSelectedVersion(v)}
                              className="px-2 py-1 rounded text-xs font-medium hover:bg-secondary text-foreground flex items-center gap-1 transition-colors"
                              title="Preview version content"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => setVersionToRestore(v)}
                              className="px-2 py-1 rounded text-xs font-medium hover:bg-primary hover:text-primary-foreground text-primary flex items-center gap-1 transition-colors"
                              title="Restore this version as live draft"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => setVersionToDelete(v)}
                              className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
                              title="Delete snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {v.note && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {v.note}
                          </p>
                        )}

                        <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {v.stepsSnapshot.length} steps
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      <ConfirmModal
        isOpen={Boolean(versionToRestore)}
        title={`Restore Version v${versionToRestore?.version}?`}
        message="Restoring this snapshot will replace your active working draft with the steps and metadata from this version. Any unsaved edits will be superseded."
        confirmLabel="Restore Version"
        isDestructive={false}
        onConfirm={handleConfirmRestore}
        onCancel={() => setVersionToRestore(null)}
      />

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={Boolean(versionToDelete)}
        title={`Delete Version Snapshot v${versionToDelete?.version}?`}
        message="Are you sure you want to permanently delete this saved version snapshot? Your current working draft will not be affected."
        confirmLabel="Delete Snapshot"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setVersionToDelete(null)}
      />
    </>
  );
};
