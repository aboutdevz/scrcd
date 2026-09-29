import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Project, CategoryType } from '@/types';
import { parseProjectFromJson } from '@/services/exporters/exportJson';
import { api } from '@/services/api';
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Trash2,
  Copy,
  Download,
  Upload,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ProjectDashboardProps {
  onOpenExport: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ onOpenExport }) => {
  const {
    projects,
    createProject,
    selectProject,
    deleteProject,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    startRecording,
  } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryType>('SOP');
  const [newDesc, setNewDesc] = useState('');

  const categories: string[] = ['All', 'SOP', 'Tutorial', 'Onboarding', 'Troubleshooting'];

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createProject(newTitle.trim(), newCategory, newDesc.trim());
    setIsCreating(false);
    setNewTitle('');
    setNewDesc('');
  };

  const handleDuplicate = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    await createProject(`${p.title} (Copy)`, p.category, p.description);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this guide? This action cannot be undone.')) {
      await deleteProject(id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Banner / Quick Start */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              100% Offline & Private
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Create SOPs & Tutorials at Click Speed
            </h1>
            <p className="text-sm text-muted-foreground">
              Turn any desktop or web workflow into beautiful step-by-step guides with automated click capture, element inspection, and instant multi-format export.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold text-xs transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-muted-foreground" />
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Guide
            </button>
            <button
              onClick={() => startRecording(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
            >
              <Sparkles className="w-4 h-4" />
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
              placeholder="Search guides, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/40 space-y-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">No guides found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try adjusting your search criteria' : 'Create a guide or start recording to get started'}
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Guide
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => selectProject(project.id)}
                className="group relative rounded-xl border border-border bg-card/80 hover:bg-card hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col shadow-sm hover:shadow-md"
              >
                {/* Preview Banner */}
                <div className="h-40 bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-border">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
                  <div className="text-center p-4 z-20 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      {project.category}
                    </span>
                    <h3 className="text-sm font-semibold text-white line-clamp-2 px-2 mt-1">
                      {project.title}
                    </h3>
                  </div>

                  {/* Corner Accent */}
                  <div
                    className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20"
                    style={{
                      background: `radial-gradient(circle at top right, ${project.accentColor || '#2563eb'}, transparent 70%)`,
                    }}
                  />
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </div>

                    {/* Action buttons on hover */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
              </div>
            ))}
          </div>
        )}

        {/* Modal: New Guide */}
        {isCreating && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">Create New Guide</h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Guide Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. How to Submit an Expense Report in Concur"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Category / Template</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CategoryType)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="SOP">Standard Operating Procedure (SOP)</option>
                    <option value="Tutorial">User Tutorial / How-To</option>
                    <option value="Onboarding">Employee Onboarding</option>
                    <option value="Troubleshooting">IT Troubleshooting Guide</option>
                    <option value="General">General Documentation</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="A brief explanation of what this procedure achieves..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Create Guide
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
