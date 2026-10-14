import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Project, Folder, GuideVersion } from '@/types';
import { api } from '@/services/api';
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
  User,
  Building2,
  Image,
  Upload,
  UserCheck,
  Tag,
  Shield,
  Trash2,
} from 'lucide-react';

interface MasterBinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string | null;
}

const ROLE_SUGGESTIONS = [
  'Administrator',
  'Operator',
  'DevOps',
  'Security',
  'Manager',
  'Analyst',
  'Support',
  'End User',
];

export const MasterBinderModal: React.FC<MasterBinderModalProps> = ({ isOpen, onClose, folderId }) => {
  const { folders, projects, branding, updateFolder } = useStore();

  const activeFolder = folders.find((f) => f.id === folderId) || null;

  const [orderedProjects, setOrderedProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState('');
  const [format, setFormat] = useState<'pdf' | 'html' | 'docx'>('pdf');
  const [includeCover, setIncludeCover] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  // Per-guide version selection and meta
  const [projectVersionsMap, setProjectVersionsMap] = useState<Record<string, GuideVersion[]>>({});
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
  const [projectChapterMap, setProjectChapterMap] = useState<Record<string, number>>({});
  const [projectStepMap, setProjectStepMap] = useState<Record<string, number>>({});

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
      setAuthor(branding.author || projects.find((p) => p.author)?.author || 'System Operations Team');
      setCompanyName(branding.companyName || projects.find((p) => p.companyName)?.companyName || 'Acme Corporation');
      setLogoUrl(branding.logoUrl || projects.find((p) => p.logoUrl)?.logoUrl || '');
      setTargetRoles(activeFolder?.targetRoles || []);
      setRoleInput('');
      setIsExporting(false);
      setProgressMsg('');
      setExportError(null);
    }
  }, [isOpen, folderId, activeFolder, projects, branding]);

  useEffect(() => {
    if (isOpen && orderedProjects.length > 0) {
      const loadAllVersionsAndMeta = async () => {
        const vMap: Record<string, GuideVersion[]> = {};
        const chMap: Record<string, number> = {};
        const stMap: Record<string, number> = {};
        for (const p of orderedProjects) {
          try {
            const vers = await api.listProjectVersions(p.id);
            vMap[p.id] = vers;
          } catch {
            vMap[p.id] = [];
          }
          try {
            const steps = await api.listSteps(p.id);
            stMap[p.id] = steps.length;
            const chapters = new Set(steps.map((s) => s.sectionTitle?.trim()).filter(Boolean));
            chMap[p.id] = chapters.size;
          } catch {
            stMap[p.id] = 0;
            chMap[p.id] = 0;
          }
        }
        setProjectVersionsMap(vMap);
        setProjectChapterMap(chMap);
        setProjectStepMap(stMap);
      };
      loadAllVersionsAndMeta();
    }
  }, [isOpen, orderedProjects]);

  if (!isOpen) return null;

  const handleAddRole = (roleToAdd: string) => {
    const trimmed = roleToAdd.trim();
    if (!trimmed || targetRoles.includes(trimmed)) return;
    setTargetRoles([...targetRoles, trimmed]);
    setRoleInput('');
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setTargetRoles(targetRoles.filter((r) => r !== roleToRemove));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setLogoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

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

    // Persist designated roles to folder if activeFolder
    if (activeFolder && JSON.stringify(activeFolder.targetRoles || []) !== JSON.stringify(targetRoles)) {
      await updateFolder({
        ...activeFolder,
        targetRoles,
        updatedAt: Date.now(),
      });
    }

    const options: MasterBinderOptions = {
      title: title.trim() || 'Master Binder Handbook',
      subtitle: subtitle.trim(),
      author: author.trim() || branding.author || 'System Operations Team',
      companyName: companyName.trim() || branding.companyName || 'Acme Corporation',
      logoUrl: logoUrl.trim() || undefined,
      accentColor: branding.accentColor,
      targetRoles,
      includeCoverPage: includeCover,
      includeTableOfContents: includeToc,
      format,
      versionSelections: selectedVersions,
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Document Title & Subtitle */}
          <div className="grid grid-cols-1 gap-3.5">
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

          {/* Author, Company, & Logo Section */}
          <div className="p-3.5 rounded-lg bg-secondary/20 border border-border space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Author / Team</span>
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. DevOps Operations Team"
                  className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>Company / Organization</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Logo Preview & Upload */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-primary" />
                <span>Publication Logo</span>
              </label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="relative group flex items-center gap-2 p-1.5 rounded-lg bg-background border border-border">
                    <img
                      src={logoUrl}
                      alt="Handbook Logo"
                      className="h-8 max-w-[140px] object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                    No logo selected (optional)
                  </div>
                )}

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-foreground cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Designated Roles Tagging Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>Designated Roles (Target Audience)</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                Specifies who this handbook is meant for
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-secondary/30 border border-border space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {targetRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>{role}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="p-0.5 hover:text-destructive transition-colors ml-0.5"
                      title={`Remove ${role}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddRole(roleInput);
                    }
                  }}
                  placeholder={
                    targetRoles.length === 0
                      ? 'Type role and press Enter (e.g. Administrator, DevOps)...'
                      : 'Add another role...'
                  }
                  className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none flex-1 min-w-[160px] py-0.5"
                />
              </div>

              {/* Suggestions */}
              <div className="pt-1.5 flex flex-wrap items-center gap-1 border-t border-border/40 text-[11px]">
                <span className="text-[10px] text-muted-foreground font-medium mr-1">Suggestions:</span>
                {ROLE_SUGGESTIONS.filter((r) => !targetRoles.includes(r)).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleAddRole(sug)}
                    className="px-2 py-0.5 rounded bg-background hover:bg-secondary text-[10px] text-muted-foreground hover:text-foreground border border-border/80 transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
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

          {/* Guide Order List with Chapters & Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground">
                Guides Included in Binder ({orderedProjects.length})
              </label>
              <span className="text-[11px] text-muted-foreground">Adjust chapter sequence with arrows</span>
            </div>

            {orderedProjects.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No guides found in this folder. Move or create guides here first.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg max-h-48 overflow-y-auto bg-card">
                {orderedProjects.map((p, idx) => (
                  <div key={p.id} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-secondary/40">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <span className="font-mono text-[10px] text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground truncate">{p.title}</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-secondary text-muted-foreground flex-shrink-0">
                        {p.category}
                      </span>
                      {projectChapterMap[p.id] > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium border border-primary/20 flex-shrink-0">
                          {projectChapterMap[p.id]} {projectChapterMap[p.id] === 1 ? 'Chapter' : 'Chapters'}
                        </span>
                      )}
                      {projectStepMap[p.id] !== undefined && (
                        <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                          {projectStepMap[p.id]} steps
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {projectVersionsMap[p.id] && projectVersionsMap[p.id].length > 0 ? (
                        <select
                          value={selectedVersions[p.id] || 'latest'}
                          onChange={(e) => {
                            setSelectedVersions((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }));
                          }}
                          disabled={isExporting}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary/80 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[170px] truncate"
                          title="Select version of this guide to include in the handbook"
                        >
                          <option value="latest">Latest Draft (v{p.version})</option>
                          {projectVersionsMap[p.id].map((ver) => (
                            <option key={ver.id} value={ver.id}>
                              v{ver.version} ({ver.stepsSnapshot.length} steps)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                          v{p.version || '1.0.0'}
                        </span>
                      )}

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
            Annotations baked automatically &bull; Clean publication layout
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
