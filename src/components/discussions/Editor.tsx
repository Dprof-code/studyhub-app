'use client';

import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import { Button } from '@/components/ui/button';

type EditorProps = {
    onChange: (content: string) => void;
    content?: string;
    placeholder?: string;
    onMount?: (editor: TiptapEditor) => void;
};

const MenuBar = ({ editor }: { editor: TiptapEditor | null }) => {
    if (!editor) return null;

    return (
        <div className="border-b border-border p-2 flex flex-wrap gap-1">
            <Button
                size="sm"
                variant={editor.isActive('bold') ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <span className="material-symbols-outlined">format_bold</span>
            </Button>
            <Button
                size="sm"
                variant={editor.isActive('italic') ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <span className="material-symbols-outlined">format_italic</span>
            </Button>
            <Button
                size="sm"
                variant={editor.isActive('code') ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleCode().run()}
            >
                <span className="material-symbols-outlined">code</span>
            </Button>
            <Button
                size="sm"
                variant={editor.isActive('codeBlock') ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
                <span className="material-symbols-outlined">data_object</span>
            </Button>
            <Button
                size="sm"
                variant="outline"
                onClick={() => {
                    const url = window.prompt('Enter the URL:');
                    if (url) {
                        editor.chain().focus().setImage({ src: url }).run();
                    }
                }}
            >
                <span className="material-symbols-outlined">image</span>
            </Button>
            <Button
                size="sm"
                variant={editor.isActive('link') ? 'default' : 'outline'}
                onClick={() => {
                    const url = window.prompt('Enter the URL:');
                    if (url) {
                        editor.chain().focus().setLink({ href: url }).run();
                    }
                }}
            >
                <span className="material-symbols-outlined">link</span>
            </Button>
        </div>
    );
};

export function Editor({ onChange, content = '', placeholder, onMount }: EditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image,
            Link.configure({
                openOnClick: false,
            }),
            CodeBlock,
        ],
        content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onCreate: ({ editor }) => {
            onMount?.(editor);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
                'data-placeholder': placeholder || 'Start typing...',
            },
        },
    });

    return (
        <div className="border rounded-md overflow-hidden bg-card">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
}