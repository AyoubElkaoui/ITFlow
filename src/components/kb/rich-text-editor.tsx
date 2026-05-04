"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Code,
  Quote,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Begin met schrijven...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[400px] w-full px-4 py-3 text-sm focus:outline-none prose prose-neutral dark:prose-invert max-w-none",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6",
          "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-4",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3",
          "[&_li]:mb-1",
          "[&_p]:mb-3 [&_p]:leading-relaxed",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
          "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono",
          "[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto",
          "[&_hr]:border-border [&_hr]:my-4",
          "[&_strong]:font-semibold",
        ),
      },
    },
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getText();
      onChange(md);
    },
  });

  // Sync external value changes (e.g. when editing existing article)
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getText();
    if (value !== current) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    disabled,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8",
        active && "bg-muted text-foreground",
        !active && "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className={cn("rounded-md border border-input", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Vet (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Cursief (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="Kop 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="Kop 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Opsomming"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Genummerde lijst"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Citaat"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Scheidingslijn"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Ongedaan maken (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Opnieuw (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto text-xs text-muted-foreground px-2">
          {placeholder && !editor.getText() && (
            <span className="text-muted-foreground/60">
              Klik om te beginnen met schrijven
            </span>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
