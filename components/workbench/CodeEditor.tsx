'use client';

import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

interface Props {
  path: string | null;
  value: string;
  onChange: (value: string) => void;
}

function languageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    py: 'python',
    sh: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    env: 'ini',
  };
  return map[ext ?? ''] ?? 'plaintext';
}

export function CodeEditor({ path, value, onChange }: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('boltedit-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0a0a0f',
        'editor.lineHighlightBackground': '#ffffff0a',
        'editorLineNumber.foreground': '#ffffff30',
        'editorGutter.background': '#0a0a0f',
      },
    });
    monaco.editor.setTheme('boltedit-dark');
  };

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        editorRef.current.setValue(value);
      }
    }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/30">
        Select a file to view its contents
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#0a0a0f]">
      <Editor
        height="100%"
        path={path}
        language={languageFromPath(path)}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        theme="boltedit-dark"
        options={{
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          fontLigatures: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          renderLineHighlight: 'all',
          lineNumbersMinChars: 3,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          tabSize: 2,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
