import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Project, Folder } from '@/types';
import { compileAndExportMasterBinder, MasterBinderOptions } from '@/services/exporters/exportMasterBinder';
import {
  BookOpen,
  X,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Layers,
  FileCode,
  FileCheck,
} from 'lucide-react';

interface MasterBinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string | null;
}

export const MasterBinderModal: React.FC<MasterBinderModalProps> = ({ isOpen, onClose, folderId }) => {
  const { folders, projects, branding } = useStore();

  const activeFolder = folders.find((f) => f.id === folderId) || null;
  const initialFolderProjects = projects.filter((p) =>
    folderId === '__unorganized__' ? !p.folderId : p.folderId === folderId
  );

  const [orderedProjects, setOrderedProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [format, setFormat] = useState<'pdf' | 'html' | 'docx'>('pdf');
  const [includeCover, setIncludeCover] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const folderProjects = projects.filter((p) =>
        folderId === '__unorganized__' ? !p.folderId : folderId ? p.folderId === folderId : true
      );
      setOrderedProjects(folderProjects);
      const defaultTitle = activeFolder
        ? `${activeFolder.name} Handbook`
        : folderId === '__unorganized__'
        ? 'Unorganized Guides Handbook'
        : 'All Guides Master Handbook';
      setTitle(defaultTitle);
      setSubtitle(activeFolder?.description || 'Standard Operating Procedures & Operational Manual');
      setIsExporting(false);
      setProgressMsg('');
      setExportError(null);
    }
  }, [isOpen, folderId, activeFolder, projects]);

  if (!isOpen) return null;

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...orderedProjects];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setOrderedProjects(next);
  };

  const handleMoveDown = (index: number) => {
    if (index >= orderedProjects.length - 1) return;
    const next = [...orderedProjects];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setOrderedProjects(next);
  };

  const handleExport = async () => {
    if (orderedProjects.length === 0) return;
    setIsExporting(true);
    setExportError(null);
    setProgressMsg('Initializing Master Binder...');

    const options: MasterBinderOptions = {
      title: title.trim() || 'Master Binder Handbook',
      subtitle: subtitle.trim(),
      author: branding.author,
      companyName: branding.companyName,
      accentColor: branding.accentColor,
      includeCoverPage: includeCover,
      includeTableOfContents: includeToc,
      format,
    };

    const res = await compileAndExportMasterBinder(
      activeFolder,
      orderedProjects,
      branding,
      options,
      (msg) => setProgressMsg(msg)
    );

    setIsExporting(false);
    setProgressMsg('');
    if (!res.success && res.error) {
      setExportError(res.error);
    } else if (!res.canceled) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Export Master Binder</h2>
              <p className="text-xs text-muted-foreground">
                Combine {orderedProjects.length} guides into a unified, publication-ready handbook
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Metadata */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Server Operations Master Handbook"
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Subtitle / Description</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Standard Operating Procedures for Cloud Infrastructure"
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  format === 'pdf'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <FileText className="w-4 h-4 text-primary" />
                  PDF Document
                </div>
                <span className="text-[11px] text-muted-foreground">Printable with classic Table of Contents</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('html')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  format === 'html'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <FileCode className="w-4 h-4 text-primary" />
                  HTML Handbook
                </div>
                <span className="text-[11px] text-muted-foreground">Standalone offline interactive book</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('docx')}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  format === 'docx'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <FileCheck className="w-4 h-4 text-primary" />
                  Word (.docx)
                </div>
                <span className="text-[11px] text-muted-foreground">Editable Microsoft Word publication</span>
              </button>
            </div>
          </div>

          {/* Options Toggles */}
          <div className="flex items-center gap-6 p-3 rounded-lg bg-secondary/30 border border-border text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={includeCover}
                onChange={(e) => setIncludeCover(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Include Formal Cover Page</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={includeToc}
                onChange={(e) => setIncludeToc(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Include Table of Contents (Dotted Leaders)</span>
            </label>
          </div>

          {/* Guide Order List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground">
                Guides Included in Binder ({orderedProjects.length})
              </label>
              <span className="text-[11px] text-muted-foreground">Use arrows to adjust document chapter order</span>
            </div>

            {orderedProjects.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No guides found in this folder. Move or create guides here first.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg max-h-48 overflow-y-auto bg-card">
                {orderedProjects.map((p, idx) => (
                  <div key={p.id} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-secondary/40">
                    <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                      <span className="font-mono text-[10px] text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground truncate">{p.title}</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-secondary text-muted-foreground flex-shrink-0">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0 || isExporting}
                        onClick={() => handleMoveUp(idx)}
                        className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground hover:text-foreground"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === orderedProjects.length - 1 || isExporting}
                        onClick={() => handleMoveDown(idx)}
                        className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground hover:text-foreground"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {exportError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {exportError}
            </div>
          )}

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progressMsg || 'Processing document compilation...'}</span>
              </div>
              <div className="w-full h-1.5 bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-secondary/10">
          <span className="text-xs text-muted-foreground">
            Annotations will be baked into all screenshots automatically
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isExporting || orderedProjects.length === 0}
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-40 transition-all shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling Binder...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Master Binder</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
