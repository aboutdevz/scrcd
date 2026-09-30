import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlertTriangle,
  Lightbulb,
  Info,
  Bot,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { rewriteStepInstructions } from '@/services/aiHarness';
import { Step } from '@/types';

interface WysiwygEditorProps {
  content: string;
  onChange: (html: string) => void;
  step?: Step;
  stepContext?: {
    title: string;
    actionType: string;
    uiaName?: string;
    uiaControlType?: string;
    uiaAppName?: string;
    stepNumber?: number;
  };
  projectContext?: {
    title?: string;
    description?: string;
  };
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  content,
  onChange,
  step,
  stepContext,
  projectContext,
}) => {
  const { aiConfig } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Add detailed instructions, tips, or expected outcomes for this step...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] p-3 text-xs leading-relaxed',
      },
    },
  });

  // Keep editor content in sync when active step changes
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) return null;

  const insertCallout = (type: 'tip' | 'warning' | 'note') => {
    const title = type.toUpperCase();
    editor
      .chain()
      .focus()
      .insertContent(
        `<blockquote><p><strong>[${title}]:</strong> Insert guidance here...</p></blockquote>`
      )
      .run();
  };

  const handleAiRewriteClick = async () => {
    setErrorMessage(null);
    if (!aiConfig.apiKey && aiConfig.provider !== 'custom') {
      setErrorMessage('Please configure an API key in Settings or AI Writer to use AI Rewrite.');
      return;
    }

    setIsGenerating(true);
    try {
      const currentHtml = editor.getHTML();
      const stepToRewrite: Step = step || {
        id: 'temp',
        projectId: 'temp',
        stepNumber: stepContext?.stepNumber || 1,
        title: stepContext?.title || 'Current Step',
        richInstructions: currentHtml,
        actionType: (stepContext?.actionType as any) || 'click',
        screenshotPath: '',
        originalWidth: 1920,
        originalHeight: 1080,
        clickX: 0,
        clickY: 0,
        annotations: [],
        uiaAppName: stepContext?.uiaAppName || '',
        uiaName: stepContext?.uiaName || '',
        uiaControlType: stepContext?.uiaControlType || '',
        isPassword: false,
        createdAt: Date.now(),
      };

      const result = await rewriteStepInstructions(stepToRewrite, aiConfig, {
        projectTitle: projectContext?.title || 'User Guide',
        currentContent: currentHtml,
      });

      setSuggestedContent(result.richInstructions);
      setIsReviewOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to rewrite instructions with AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyRewrite = () => {
    if (suggestedContent) {
      editor.commands.setContent(suggestedContent);
      onChange(suggestedContent);
    }
    setIsReviewOpen(false);
  };

  const handleDiscardRewrite = () => {
    setSuggestedContent('');
    setIsReviewOpen(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card/60 overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-primary/30 relative">
      {/* Editor Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 p-1 border-b border-border bg-secondary/30">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-secondary transition-colors ${
            editor.isActive('bold') ? 'bg-secondary text-primary font-bold' : 'text-muted-foreground'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-secondary transition-colors ${
            editor.isActive('italic') ? 'bg-secondary text-primary' : 'text-muted-foreground'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded hover:bg-secondary transition-colors ${
            editor.isActive('code') ? 'bg-secondary text-primary' : 'text-muted-foreground'
          }`}
          title="Inline Code"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-secondary transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-secondary text-primary font-bold' : 'text-muted-foreground'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-secondary transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-secondary text-primary font-bold' : 'text-muted-foreground'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-secondary transition-colors ${
            editor.isActive('bulletList') ? 'bg-secondary text-primary' : 'text-muted-foreground'
          }`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-secondary transition-colors ${
            editor.isActive('orderedList') ? 'bg-secondary text-primary' : 'text-muted-foreground'
          }`}
          title="Ordered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-secondary transition-colors ${
            editor.isActive('blockquote') ? 'bg-secondary text-primary' : 'text-muted-foreground'
          }`}
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        {/* Callout Quick Actions */}
        <button
          type="button"
          onClick={() => insertCallout('tip')}
          className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          title="Insert Tip Callout"
        >
          <Lightbulb className="w-3 h-3" />
          Tip
        </button>

        <button
          type="button"
          onClick={() => insertCallout('warning')}
          className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] text-amber-500 hover:bg-amber-500/10 transition-colors"
          title="Insert Warning Callout"
        >
          <AlertTriangle className="w-3 h-3" />
          Warning
        </button>

        <button
          type="button"
          onClick={() => insertCallout('note')}
          className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] text-blue-500 hover:bg-blue-500/10 transition-colors"
          title="Insert Note Callout"
        >
          <Info className="w-3 h-3" />
          Note
        </button>

        <div className="flex-1" />

        {/* AI Rewrite Action Button */}
        <button
          type="button"
          onClick={handleAiRewriteClick}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-primary hover:bg-primary/10 border border-primary/20 transition-colors disabled:opacity-50"
          title="Rewrite instructions with AI"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>Rewriting...</span>
            </>
          ) : (
            <>
              <Bot className="w-3 h-3 text-primary" />
              <span>AI Rewrite</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-destructive/10 text-destructive text-[11px] border-b border-destructive/20">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-0.5 rounded hover:bg-destructive/20"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      {/* Review Guardrail Modal (Rule 7: Never mutate silently) */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Review AI Rewritten Instructions
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Inspect the proposed changes before applying them to this step.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDiscardRewrite}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Side-by-Side Review */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Original */}
              <div className="flex flex-col border border-border rounded-lg bg-secondary/10 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-border bg-secondary/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Original Content
                </div>
                <div
                  className="p-3 text-xs leading-relaxed overflow-y-auto max-h-[300px] prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: content && content.trim() ? content : '<em class="text-muted-foreground">No original instructions</em>',
                  }}
                />
              </div>

              {/* Right: AI Proposal */}
              <div className="flex flex-col border border-primary/30 rounded-lg bg-primary/5 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-primary/20 bg-primary/10 text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center justify-between">
                  <span>AI Proposal</span>
                  <span className="text-[10px] lowercase text-primary/70 font-normal">preview</span>
                </div>
                <div
                  className="p-3 text-xs leading-relaxed overflow-y-auto max-h-[300px] prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: suggestedContent || '<em class="text-muted-foreground">No content generated</em>',
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-3 border-t border-border bg-secondary/20">
              <button
                type="button"
                onClick={handleDiscardRewrite}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleApplyRewrite}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
