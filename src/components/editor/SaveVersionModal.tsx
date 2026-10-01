import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { generateRandomVersionCode } from '@/config/version';
import { Bookmark, X, Check, Sparkles } from 'lucide-react';

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (version: string) => void;
}

export const SaveVersionModal: React.FC<SaveVersionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { activeProject, saveCurrentVersion } = useStore();
  const [versionInput, setVersionInput] = useState('');
  const [defaultCode, setDefaultCode] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const code = generateRandomVersionCode();
      setDefaultCode(code);
      setVersionInput(code);
      setNote('');
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen || !activeProject) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    const finalVersion = versionInput.trim() || defaultCode;
    try {
      await saveCurrentVersion(finalVersion, note);
      onSaved?.(finalVersion);
      onClose();
    } catch (err) {
      console.error('Failed to save version', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateNewRandom = () => {
    const code = generateRandomVersionCode();
    setDefaultCode(code);
    setVersionInput(code);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Save Guide Version</h2>
              <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Version Tag / Identifier
              </label>
              <button
                type="button"
                onClick={handleGenerateNewRandom}
                className="text-[11px] text-primary hover:underline font-mono"
                title="Generate another 4-character random code"
              >
                Randomize
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={versionInput}
              onChange={(e) => setVersionInput(e.target.value)}
              placeholder={defaultCode}
              className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono tracking-wide"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter a semantic version (e.g. <span className="font-mono">1.1.0</span>) or leave as the 4-char random code (<span className="font-mono">{defaultCode}</span>).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Version Note <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Summary of modifications, changes, or revisions in this snapshot..."
              className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Version'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
