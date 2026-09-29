import React, { useEffect } from 'react';
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
} from 'lucide-react';

interface WysiwygEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({ content, onChange }) => {
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

  return (
    <div className="rounded-lg border border-border bg-card/60 overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-primary/30">
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
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};
