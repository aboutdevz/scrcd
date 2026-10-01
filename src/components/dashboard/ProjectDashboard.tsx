import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Project, CategoryType, Folder } from '@/types';
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
  Folder as FolderIcon,
  FolderPlus,
  ChevronRight,
  Tag as TagIcon,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Layers,
  ArrowRight,
  MoreVertical,
  MoreHorizontal,
  MoveRight,
  Check,
} from 'lucide-react';

interface ProjectDashboardProps {
  onOpenExport?: () => void;
  onOpenCaptureSetup?: () => void;
}

const FOLDER_COLORS = [
  { label: 'Blue', value: '#2563eb' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Rose', value: '#ec4899' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Slate', value: '#64748b' },
];

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ onOpenCaptureSetup }) => {
  const {
    projects,
    folders,
    activeFolderId,
    setActiveFolderId,
    createFolder,
    updateFolder,
    deleteFolder,
    moveProjectToFolder,
    createProject,
    updateProject,
    selectProject,
    deleteProject,
    startRecording,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    addCategory,
    selectedTag,
    setSelectedTag,
    getAllTags,
    setMasterBinderFolderId,
  } = useStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // New Guide Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>('SOP');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [customCatInput, setCustomCatInput] = useState('');
  const [newVersion, setNewVersion] = useState('1.0.0');
  const [newDesc, setNewDesc] = useState('');
  const [newFolderId, setNewFolderId] = useState<string | null>(null);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Rename/Edit Guide State
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameCategory, setRenameCategory] = useState<string>('SOP');
  const [isAddingRenameCat, setIsAddingRenameCat] = useState(false);
  const [customRenameCatInput, setCustomRenameCatInput] = useState('');
  const [renameVersion, setRenameVersion] = useState('1.0.0');
  const [renameDesc, setRenameDesc] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameTags, setRenameTags] = useState<string[]>([]);
  const [renameTagInput, setRenameTagInput] = useState('');

  // Folder Modals
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderColor, setFolderColor] = useState('#2563eb');

  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderDesc, setEditFolderDesc] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#2563eb');

  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deleteFolderGuides, setDeleteFolderGuides] = useState(false);

  // Guide Deletion
  const [guideToDelete, setGuideToDelete] = useState<string | null>(null);

  // Guide Move Popover
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null);

  // More Options Menu Popover
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen]);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating) {
      setNewFolderId(
        activeFolderId && activeFolderId !== '__unorganized__' ? activeFolderId : null
      );
      setNewTags([newCategory]);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isCreating, activeFolderId, newCategory]);

  const allAvailableTags = getAllTags();
  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;

  const handleOpenRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToRename(project);
    setRenameTitle(project.title);
    setRenameCategory(project.category);
    setRenameVersion(project.version || '1.0.0');
    setRenameDesc(project.description || '');
    setRenameFolderId(project.folderId || null);
    setRenameTags(Array.isArray(project.tags) ? [...project.tags] : [project.category]);
    setRenameTagInput('');
  };

  const handleSaveRename = async () => {
    if (!projectToRename || !renameTitle.trim()) return;
    await updateProject({
      ...projectToRename,
      title: renameTitle.trim(),
      category: renameCategory,
      version: renameVersion.trim() || '1.0.0',
      description: renameDesc.trim(),
      folderId: renameFolderId,
      tags: renameTags.length > 0 ? renameTags : [renameCategory],
      updatedAt: Date.now(),
    });
    setProjectToRename(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createProject(
      newTitle.trim(),
      newCategory,
      newDesc.trim(),
      newVersion.trim() || '1.0.0',
      newFolderId,
      newTags.length > 0 ? newTags : [newCategory]
    );
    setNewTitle('');
    setNewDesc('');
    setNewVersion('1.0.0');
    setNewTags([]);
    setTagInput('');
    setIsCreating(false);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    const created = await createFolder(folderName.trim(), folderDesc.trim(), folderColor);
    setFolderName('');
    setFolderDesc('');
    setFolderColor('#2563eb');
    setIsCreatingFolder(false);
    setActiveFolderId(created.id);
  };

  const handleSaveEditFolder = async () => {
    if (!folderToEdit || !editFolderName.trim()) return;
    await updateFolder({
      ...folderToEdit,
      name: editFolderName.trim(),
      description: editFolderDesc.trim(),
      color: editFolderColor,
      updatedAt: Date.now(),
    });
    setFolderToEdit(null);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    const id = folderToDelete.id;
    setFolderToDelete(null);
    await deleteFolder(id, deleteFolderGuides);
  };

  const handleDuplicate = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    await createProject(
      `${p.title} (Copy)`,
      p.category,
      p.description,
      p.version,
      p.folderId,
      p.tags
    );
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

  // Tag chip helper
  const addTagToNew = (tag: string) => {
    const clean = tag.trim().replace(/^#/, '');
    if (clean && !newTags.includes(clean)) {
      setNewTags([...newTags, clean]);
    }
    setTagInput('');
  };

  const removeTagFromNew = (tag: string) => {
    setNewTags(newTags.filter((t) => t !== tag));
  };

  const addTagToRename = (tag: string) => {
    const clean = tag.trim().replace(/^#/, '');
    if (clean && !renameTags.includes(clean)) {
      setRenameTags([...renameTags, clean]);
    }
    setRenameTagInput('');
  };

  const removeTagFromRename = (tag: string) => {
    setRenameTags(renameTags.filter((t) => t !== tag));
  };

  const categoryFilterList: string[] = ['All', ...categories];

  // Filtering Logic
  const filteredProjects = projects.filter((p) => {
    // 1. Folder
    if (activeFolderId === '__unorganized__') {
      if (p.folderId) return false;
    } else if (activeFolderId) {
      if (p.folderId !== activeFolderId) return false;
    }

    // 2. Category
    const matchesCat =
      selectedCategory === 'All' ||
      (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

    // 3. Custom Tag
    const matchesTag = !selectedTag || (Array.isArray(p.tags) && p.tags.includes(selectedTag));

    // 4. Search Query
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/^#/, '');
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(cleanQ)));

    return matchesCat && matchesTag && matchesSearch;
  });

  const totalCount = projects.length;
  const unorganizedCount = projects.filter((p) => !p.folderId).length;

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* 1. Folders Left Sidebar */}
      <aside
        className={`border-r border-border bg-card/60 flex flex-col transition-all duration-200 select-none ${
          isSidebarOpen ? 'w-64 min-w-[16rem]' : 'w-12 min-w-[3rem]'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-12 border-b border-border px-3 flex items-center justify-between">
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FolderIcon className="w-4 h-4 text-primary" />
                <span>Folders</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="New Folder"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="w-full flex items-center justify-center p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Expand Folders Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sidebar Folders List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isSidebarOpen ? (
            <>
              {/* All Guides */}
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeFolderId === null
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">All Guides</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeFolderId === null
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {totalCount}
                </span>
              </button>

              {/* Unorganized Guides */}
              <button
                type="button"
                onClick={() => setActiveFolderId('__unorganized__')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeFolderId === '__unorganized__'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Unorganized</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeFolderId === '__unorganized__'
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {unorganizedCount}
                </span>
              </button>

              {/* Divider */}
              <div className="pt-2 pb-1 px-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                <span>Folders</span>
                <span className="font-mono">{folders.length}</span>
              </div>

              {/* Custom Folders */}
              {folders.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-muted-foreground/60 italic">
                  No folders yet
                </div>
              ) : (
                folders.map((f) => {
                  const isActive = activeFolderId === f.id;
                  const count = projects.filter((p) => p.folderId === f.id).length;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setActiveFolderId(f.id)}
                      className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden pr-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: f.color || '#2563eb' }}
                        />
                        <span className="truncate">{f.name}</span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            isActive
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {count}
                        </span>

                        <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderToEdit(f);
                              setEditFolderName(f.name);
                              setEditFolderDesc(f.description || '');
                              setEditFolderColor(f.color || '#2563eb');
                            }}
                            className={`p-1 rounded hover:bg-black/10 transition-colors ${
                              isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Rename Folder"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderToDelete(f);
                              setDeleteFolderGuides(false);
                            }}
                            className={`p-1 rounded hover:bg-destructive/20 transition-colors ${
                              isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-destructive'
                            }`}
                            title="Delete Folder"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          ) : (
            /* Collapsed Icons */
            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                className={`p-2 rounded-lg transition-colors ${
                  activeFolderId === null ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
                }`}
                title="All Guides"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveFolderId('__unorganized__')}
                className={`p-2 rounded-lg transition-colors ${
                  activeFolderId === '__unorganized__'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
                title="Unorganized Guides"
              >
                <Layers className="w-4 h-4" />
              </button>
              <div className="w-6 h-px bg-border my-1" />
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolderId(f.id)}
                  className={`p-2 rounded-lg transition-colors relative ${
                    activeFolderId === f.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary'
                  }`}
                  title={`${f.name} (${projects.filter((p) => p.folderId === f.id).length} guides)`}
                >
                  <span
                    className="w-3 h-3 rounded-full block border border-card"
                    style={{ backgroundColor: f.color || '#2563eb' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* 2. Main Guides Area */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Minimalist Top Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            {/* View Title & Stats / Breadcrumbs */}
            <div className="flex items-center gap-2.5">
              {activeFolder ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFolderId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    All Guides
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeFolder.color || '#2563eb' }}
                  />
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate max-w-xs">
                    {activeFolder.name}
                  </h1>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/80">
                    {filteredProjects.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setFolderToEdit(activeFolder);
                      setEditFolderName(activeFolder.name);
                      setEditFolderDesc(activeFolder.description || '');
                      setEditFolderColor(activeFolder.color || '#2563eb');
                    }}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors ml-1"
                    title="Edit Folder Name & Color"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFolderToDelete(activeFolder);
                      setDeleteFolderGuides(false);
                    }}
                    className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    {activeFolderId === '__unorganized__'
                      ? 'Unorganized Guides'
                      : 'All Guides'}
                  </h1>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/80">
                    {filteredProjects.length}
                  </span>
                </div>
              )}
            </div>

            {/* Right Action Bar: Search, Master Binder (if folder), New Guide, More (...) */}
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter guides & tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary/70 focus:bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Master Binder Export Button (When inside a folder) */}
              {activeFolder && (
                <button
                  type="button"
                  onClick={() => setMasterBinderFolderId(activeFolder.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium text-xs transition-colors whitespace-nowrap"
                  title="Export this folder as a unified Master Handbook (PDF, Word, HTML)"
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden md:inline">Master Binder</span>
                </button>
              )}

              {/* New Guide Button */}
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors whitespace-nowrap shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Guide</span>
              </button>

              {/* More Actions Menu (...) */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((v) => !v)}
                  className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-9 z-30 w-48 bg-card border border-border rounded-xl shadow-xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    {!activeFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setMasterBinderFolderId(null);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-left hover:bg-secondary text-foreground transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        <span>Export Master Binder</span>
                      </button>
                    )}
                    <label className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-left hover:bg-secondary text-foreground transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Import JSON Guide</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={async (e) => {
                          setIsMoreMenuOpen(false);
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Unified Filter Strip: Categories & Inline Tags */}
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {categoryFilterList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Custom Tag Pills (Compact & Inline) */}
            {allAvailableTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-[11px] text-muted-foreground/80 font-medium">Tags:</span>
                {allAvailableTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60'
                      }`}
                    >
                      <span>#{tag}</span>
                    </button>
                  );
                })}

                {selectedTag && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                    title="Clear tag filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
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
                  {searchQuery || selectedTag
                    ? 'Try adjusting your search criteria or tag filters'
                    : 'Click "Record" or "New Guide" to author your first procedure.'}
                </p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Guide</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const projectFolder = folders.find((f) => f.id === project.folderId);
                const isMoveOpen = movingProjectId === project.id;
                const visibleTags = (project.tags || []).filter(
                  (t) => t.toLowerCase() !== project.category.toLowerCase()
                );

                return (
                  <div
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                    className="group relative rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col p-4 sm:p-5 justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-primary">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-semibold text-muted-foreground">
                            {project.category}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                            v{project.version || '1.0.0'}
                          </span>
                        </div>

                        {projectFolder && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-secondary/60 text-foreground"
                            title={`In folder: ${projectFolder.name}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: projectFolder.color || '#2563eb' }}
                            />
                            <span className="truncate max-w-[80px]">{projectFolder.name}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {project.title}
                      </h3>

                      {project.description?.trim() ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      ) : null}

                      {/* Custom Tags on Card (excluding duplicate category) */}
                      {visibleTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {visibleTags.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(selectedTag === t ? null : t);
                              }}
                              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/80 transition-colors"
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Controls */}
                    <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>

                      <div
                        className={`flex items-center gap-0.5 transition-opacity relative ${
                          isMoveOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {/* Move To Folder Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingProjectId(isMoveOpen ? null : project.id);
                          }}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          title="Move to Folder"
                        >
                          <MoveRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Dropdown Popover */}
                        {isMoveOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-8 z-30 w-48 bg-card border border-border rounded-lg shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                              Move to folder
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await moveProjectToFolder(project.id, null);
                                setMovingProjectId(null);
                              }}
                              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                                !project.folderId
                                  ? 'bg-primary/10 text-primary font-semibold'
                                  : 'hover:bg-secondary text-foreground'
                              }`}
                            >
                              <span>Unorganized</span>
                              {!project.folderId && <Check className="w-3 h-3 text-primary" />}
                            </button>

                            {folders.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={async () => {
                                  await moveProjectToFolder(project.id, f.id);
                                  setMovingProjectId(null);
                                }}
                                className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                                  project.folderId === f.id
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'hover:bg-secondary text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: f.color || '#2563eb' }}
                                  />
                                  <span className="truncate">{f.name}</span>
                                </div>
                                {project.folderId === f.id && <Check className="w-3 h-3 text-primary" />}
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={(e) => handleOpenRename(project, e)}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          title="Edit Guide & Tags"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDuplicate(project, e)}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          title="Duplicate Guide"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(project.id, e)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete Guide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal: Create New Guide */}
          {isCreating && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3">
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
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Category
                      </label>
                      {isAddingNewCat ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Category name..."
                            value={customCatInput}
                            onChange={(e) => setCustomCatInput(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = customCatInput.trim();
                                if (trimmed) {
                                  await addCategory(trimmed);
                                  setNewCategory(trimmed);
                                  setCustomCatInput('');
                                  setIsAddingNewCat(false);
                                }
                              } else if (e.key === 'Escape') {
                                setIsAddingNewCat(false);
                                setCustomCatInput('');
                              }
                            }}
                            className="w-full px-2 py-1.5 rounded-lg bg-secondary/70 border border-primary text-xs text-foreground focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const trimmed = customCatInput.trim();
                              if (trimmed) {
                                await addCategory(trimmed);
                                setNewCategory(trimmed);
                                setCustomCatInput('');
                                setIsAddingNewCat(false);
                              }
                            }}
                            className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors shrink-0"
                            title="Save Category"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewCat(false);
                              setCustomCatInput('');
                            }}
                            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={newCategory}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setIsAddingNewCat(true);
                            } else {
                              setNewCategory(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="__new__">+ Add Category...</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Version
                      </label>
                      <input
                        type="text"
                        value={newVersion}
                        onChange={(e) => setNewVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Folder
                      </label>
                      <select
                        value={newFolderId || ''}
                        onChange={(e) => setNewFolderId(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">(None / Root)</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Custom Tags Section */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Custom Tags
                    </label>
                    <div className="p-2 rounded-lg bg-secondary/30 border border-border space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {newTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTagFromNew(tag)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addTagToNew(tagInput);
                            }
                          }}
                          placeholder={newTags.length === 0 ? 'Type tag and press Enter...' : 'Add another tag...'}
                          className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none flex-1 min-w-[120px]"
                        />
                      </div>

                      {allAvailableTags.length > 0 && (
                        <div className="pt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground border-t border-border/50">
                          <span className="text-[10px] mr-1">Suggestions:</span>
                          {allAvailableTags
                            .filter((t) => !newTags.includes(t))
                            .slice(0, 5)
                            .map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => addTagToNew(t)}
                                className="px-2 py-0.2 rounded bg-secondary hover:bg-secondary/80 text-[10px] text-muted-foreground hover:text-foreground border border-border"
                              >
                                +#{t}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="A brief explanation of what this procedure achieves..."
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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

          {/* Modal: Edit / Rename Guide */}
          {projectToRename && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Edit Guide Properties</h3>
                  <button
                    onClick={() => setProjectToRename(null)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Title</label>
                    <input
                      type="text"
                      autoFocus
                      value={renameTitle}
                      onChange={(e) => setRenameTitle(e.target.value)}
                      placeholder="e.g. Employee Onboarding Process"
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1.5 block">Category</label>
                      {isAddingRenameCat ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Category name..."
                            value={customRenameCatInput}
                            onChange={(e) => setCustomRenameCatInput(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = customRenameCatInput.trim();
                                if (trimmed) {
                                  await addCategory(trimmed);
                                  setRenameCategory(trimmed);
                                  setCustomRenameCatInput('');
                                  setIsAddingRenameCat(false);
                                }
                              } else if (e.key === 'Escape') {
                                setIsAddingRenameCat(false);
                                setCustomRenameCatInput('');
                              }
                            }}
                            className="w-full px-2 py-1.5 rounded-lg bg-secondary/70 border border-primary text-xs text-foreground focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const trimmed = customRenameCatInput.trim();
                              if (trimmed) {
                                await addCategory(trimmed);
                                setRenameCategory(trimmed);
                                setCustomRenameCatInput('');
                                setIsAddingRenameCat(false);
                              }
                            }}
                            className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors shrink-0"
                            title="Save Category"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingRenameCat(false);
                              setCustomRenameCatInput('');
                            }}
                            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={renameCategory}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setIsAddingRenameCat(true);
                            } else {
                              setRenameCategory(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="__new__">+ Add Category...</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1.5 block">Version</label>
                      <input
                        type="text"
                        value={renameVersion}
                        onChange={(e) => setRenameVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1.5 block">Folder</label>
                      <select
                        value={renameFolderId || ''}
                        onChange={(e) => setRenameFolderId(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">(None / Root)</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Custom Tags Section */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Custom Tags
                    </label>
                    <div className="p-2 rounded-lg bg-secondary/30 border border-border space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {renameTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTagFromRename(tag)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={renameTagInput}
                          onChange={(e) => setRenameTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addTagToRename(renameTagInput);
                            }
                          }}
                          placeholder={renameTags.length === 0 ? 'Type tag and press Enter...' : 'Add another tag...'}
                          className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none flex-1 min-w-[120px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={renameDesc}
                      onChange={(e) => setRenameDesc(e.target.value)}
                      placeholder="Brief summary of the procedural guide..."
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Create Folder */}
          {isCreatingFolder && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Create New Folder</h3>
                  <button
                    onClick={() => setIsCreatingFolder(false)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Folder Name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="e.g. DevOps Operations"
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={folderDesc}
                      onChange={(e) => setFolderDesc(e.target.value)}
                      placeholder="Procedures related to cloud servers and CI/CD..."
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Accent Color</label>
                    <div className="flex items-center gap-2">
                      {FOLDER_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setFolderColor(c.value)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            folderColor === c.value ? 'scale-110 border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!folderName.trim()}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-sm"
                    >
                      Create Folder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Edit Folder */}
          {folderToEdit && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Edit Folder</h3>
                  <button
                    onClick={() => setFolderToEdit(null)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Folder Name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      placeholder="e.g. Customer Support"
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={editFolderDesc}
                      onChange={(e) => setEditFolderDesc(e.target.value)}
                      placeholder="Procedures for support desk..."
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Accent Color</label>
                    <div className="flex items-center gap-2">
                      {FOLDER_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditFolderColor(c.value)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            editFolderColor === c.value ? 'scale-110 border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setFolderToEdit(null)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!editFolderName.trim()}
                    onClick={handleSaveEditFolder}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Folder Modal with Guide Preservation Option */}
          {folderToDelete && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Delete Folder</h3>
                  <button
                    onClick={() => setFolderToDelete(null)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-foreground">
                    Are you sure you want to delete folder{' '}
                    <strong className="text-primary font-bold">"{folderToDelete.name}"</strong>?
                  </p>

                  <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={deleteFolderGuides}
                        onChange={(e) => setDeleteFolderGuides(e.target.checked)}
                        className="rounded border-border text-destructive focus:ring-destructive"
                      />
                      <span>Also permanently delete all guides inside this folder</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      {deleteFolderGuides
                        ? 'Warning: All guides in this folder will be permanently erased.'
                        : 'Safe: Guides will be kept and safely moved to Unorganized root.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setFolderToDelete(null)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteFolder}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
                  >
                    Delete Folder
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Single Guide Confirmation Modal */}
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
    </div>
  );
};
