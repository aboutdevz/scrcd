import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Project, CategoryType } from '@/types';
import { parseProjectFromJson } from '@/services/exporters/exportJson';
import { api } from '@/services/api';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
  Plus,
  Play,
  FileText,
  Search,
  Trash2,
  Copy,
  Calendar,
  Upload,
  BookOpen,
  Pencil,
  X,
} from 'lucide-react';

interface ProjectDashboardProps {
  onOpenExport?: () => void;
  onOpenCaptureSetup?: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ onOpenCaptureSetup }) => {
  const {
    projects,
    createProject,
    updateProject,
    selectProject,
    deleteProject,
    startRecording,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryType>('SOP');
  const [newDesc, setNewDesc] = useState('');
  const [guideToDelete, setGuideToDelete] = useState<string | null>(null);

  // Rename Guide State
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameCategory, setRenameCategory] = useState<CategoryType>('SOP');
  const [renameDesc, setRenameDesc] = useState('');

  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleOpenRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToRename(project);
    setRenameTitle(project.title);
    setRenameCategory(project.category);
    setRenameDesc(project.description || '');
  };

  const handleSaveRename = async () => {
    if (!projectToRename || !renameTitle.trim()) return;
    await updateProject({
      ...projectToRename,
      title: renameTitle.trim(),
      category: renameCategory,
      description: renameDesc.trim(),
      updatedAt: Date.now(),
    });
    setProjectToRename(null);
  };

  useEffect(() => {
    if (isCreating) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isCreating]);

  const categories: (CategoryType | 'All')[] = [
    'All',
    'SOP',
    'Tutorial',
    'Onboarding',
    'Troubleshooting',
  ];

  const filteredProjects = projects.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createProject(newTitle.trim(), newCategory, newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setIsCreating(false);
  };

  const handleDuplicate = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    await createProject(`${p.title} (Copy)`, p.category, p.description);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGuideToDelete(id);
  };

  const confirmDeleteGuide = async () => {
    if (guideToDelete) {
      const id = guideToDelete;
      setGuideToDelete(null);
      await deleteProject(id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Quick Start Bar */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1 max-w-xl">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Guides & Procedures
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Record your actions across any desktop or web application, snap screenshots on every click, and export into PDF, Word, PowerPoint, or HTML.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium text-xs transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const text = await file.text();
                      const pkg = parseProjectFromJson(text);
                      await api.saveProject(pkg.project);
                      await api.saveStepsBatch(pkg.project.id, pkg.steps);
                      await selectProject(pkg.project.id);
                    } catch (err) {
                      alert('Failed to parse project JSON: ' + (err as Error).message);
                    }
                  }
                }}
              />
            </label>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Guide
            </button>
            <button
              onClick={() => {
                if (onOpenCaptureSetup) {
                  onOpenCaptureSetup();
                } else {
                  startRecording();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Record Workflow
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/40 space-y-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">No guides found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try adjusting your search criteria' : 'Click "Record Workflow" or "New Guide" to create your first procedure.'}
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Guide
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => selectProject(project.id)}
                className="group relative rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col shadow-sm hover:shadow-md p-5 justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-medium text-muted-foreground">{project.category}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenRename(project, e)}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      title="Rename Guide"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(project, e)}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      title="Duplicate Guide"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Delete Guide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: New Guide */}
        {isCreating && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground">Create New Guide</h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    ref={titleInputRef}
                    required
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. How to Configure Database Backups"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CategoryType)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="SOP">Standard Operating Procedure (SOP)</option>
                    <option value="Tutorial">Tutorial / Walkthrough</option>
                    <option value="Onboarding">Employee Onboarding</option>
                    <option value="Troubleshooting">Troubleshooting Guide</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="A brief explanation of what this procedure achieves..."
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewTitle('');
                      setNewDesc('');
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Create Guide
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Rename Guide */}
        {projectToRename && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground">Rename Guide</h3>
                <button
                  onClick={() => setProjectToRename(null)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Title</label>
                  <input
                    type="text"
                    autoFocus
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') setProjectToRename(null);
                    }}
                    placeholder="e.g. Employee Onboarding Process"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Category</label>
                  <select
                    value={renameCategory}
                    onChange={(e) => setRenameCategory(e.target.value as CategoryType)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Description (Optional)</label>
                  <textarea
                    rows={3}
                    value={renameDesc}
                    onChange={(e) => setRenameDesc(e.target.value)}
                    placeholder="Brief summary of the procedural guide..."
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectToRename(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!renameTitle.trim()}
                  onClick={handleSaveRename}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={Boolean(guideToDelete)}
          title="Delete Guide"
          message="Are you sure you want to delete this guide? This action cannot be undone."
          confirmLabel="Delete Guide"
          isDestructive={true}
          onConfirm={confirmDeleteGuide}
          onCancel={() => setGuideToDelete(null)}
        />
      </div>
    </div>
  );
};
