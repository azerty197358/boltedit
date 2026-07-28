'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileEntry {
  path: string;
  content: string;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: Map<string, TreeNode>;
}

function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isDir: true, children: new Map() };
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: !isLast,
          children: new Map(),
        };
        node.children.set(part, child);
      }
      node = child;
    }
  }
  return root;
}

interface Props {
  files: FileEntry[];
  activePath: string | null;
  onSelect: (path: string) => void;
}

export function FileExplorer({ files, activePath, onSelect }: Props) {
  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-white/30">
        No files yet. Generate a project from the chat.
      </div>
    );
  }

  return (
    <div className="py-2 text-xs">
      <TreeView node={tree} depth={0} activePath={activePath} onSelect={onSelect} />
    </div>
  );
}

function TreeView({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const entries = Array.from(node.children.values()).sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return (
    <>
      {entries.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function TreeItem({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.isDir && node.name) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={pad}
          className="flex w-full items-center gap-1 py-1 pr-2 text-white/60 hover:bg-white/5 hover:text-white/90"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 text-blue-400/70" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-blue-400/70" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open && <TreeView node={node} depth={depth + 1} activePath={activePath} onSelect={onSelect} />}
      </div>
    );
  }

  if (!node.isDir && node.name) {
    const isActive = activePath === node.path;
    return (
      <button
        onClick={() => onSelect(node.path)}
        style={pad}
        className={cn(
          'flex w-full items-center gap-1 py-1 pr-2',
          isActive ? 'bg-blue-500/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/90',
        )}
      >
        <span className="w-3" />
        <FileIcon className="h-3.5 w-3.5 text-white/40" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return <TreeView node={node} depth={depth} activePath={activePath} onSelect={onSelect} />;
}
