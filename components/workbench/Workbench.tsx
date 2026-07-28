'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileCode, Eye, Terminal as TerminalIcon, FolderTree } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileExplorer } from '@/components/workbench/FileExplorer';
import { CodeEditor } from '@/components/workbench/CodeEditor';
import { Preview } from '@/components/workbench/Preview';
import { Terminal } from '@/components/workbench/Terminal';
import type { TerminalLine } from '@/hooks/use-webcontainer';

export interface FileEntry {
  path: string;
  content: string;
}

interface Props {
  files: FileEntry[];
  previewUrl: string | null;
  terminalLines: TerminalLine[];
  onClearTerminal: () => void;
  onFileChange: (path: string, content: string) => void;
}

export function Workbench({
  files,
  previewUrl,
  terminalLines,
  onClearTerminal,
  onFileChange,
}: Props) {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [tab, setTab] = useState('code');

  const fileList = useMemo(() => files, [files]);

  useEffect(() => {
    if (files.length > 0) {
      if (!activePath || !files.find((f) => f.path === activePath)) {
        const preferred =
          files.find((f) => f.path === 'src/App.tsx') ??
          files.find((f) => f.path === 'src/App.jsx') ??
          files.find((f) => f.path === 'index.html') ??
          files.find((f) => f.path.endsWith('.tsx')) ??
          files.find((f) => f.path.endsWith('.jsx')) ??
          files[0];
        setActivePath(preferred?.path ?? null);
      }
    } else {
      setActivePath(null);
    }
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFile = files.find((f) => f.path === activePath);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0f]">
      <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/5">
          <TabsList className="h-9 bg-transparent px-2">
            <TabsTrigger
              value="code"
              className="gap-1.5 bg-transparent text-xs text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <FileCode className="h-3.5 w-3.5" />
              Code
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="gap-1.5 bg-transparent text-xs text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="terminal"
              className="gap-1.5 bg-transparent text-xs text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <TerminalIcon className="h-3.5 w-3.5" />
              Terminal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="code" className="mt-0 flex-1 overflow-hidden">
          <div className="flex h-full">
            <div className="w-[220px] shrink-0 overflow-auto border-r border-white/5 bg-[#0d0d14]">
              <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
                <FolderTree className="h-3 w-3" />
                Files
              </div>
              <FileExplorer files={fileList} activePath={activePath} onSelect={setActivePath} />
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                path={activePath}
                value={activeFile?.content ?? ''}
                onChange={(v) => {
                  if (activePath) onFileChange(activePath, v);
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0 flex-1 overflow-hidden">
          <Preview url={previewUrl} />
        </TabsContent>

        <TabsContent value="terminal" className="mt-0 flex-1 overflow-hidden">
          <Terminal lines={terminalLines} onClear={onClearTerminal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
