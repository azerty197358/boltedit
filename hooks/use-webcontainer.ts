'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';
import type { FileSystemTree, WebContainer as WC } from '@webcontainer/api';

export interface TerminalLine {
  id: number;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
}

interface RunFile {
  path: string;
  content: string;
}

let lineCounter = 0;
function nextLineId() {
  lineCounter += 1;
  return lineCounter;
}

export function useWebContainer() {
  const [booted, setBooted] = useState(false);
  const [booting, setBooting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const containerRef = useRef<WC | null>(null);

  const log = useCallback((stream: TerminalLine['stream'], text: string) => {
    setLines((prev) => [...prev, { id: nextLineId(), stream, text }]);
  }, []);

  const boot = useCallback(async () => {
    if (containerRef.current || booting) return;
    setBooting(true);
    log('system', 'Booting WebContainer runtime...');
    try {
      const container = await WebContainer.boot();
      containerRef.current = container;
      container.on('server-ready', (port, url) => {
        log('system', `Server ready on port ${port}`);
        setPreviewUrl(url);
      });
      setBooted(true);
      log('system', 'WebContainer ready.');
    } catch (err) {
      log('stderr', `Failed to boot WebContainer: ${(err as Error).message}`);
    } finally {
      setBooting(false);
    }
  }, [booting, log]);

  // Boot once on mount.
  useEffect(() => {
    boot();
  }, [boot]);

  const buildTree = useCallback((files: RunFile[]): FileSystemTree => {
    const tree: FileSystemTree = {};
    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean);
      let node = tree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          node[part] = {
            file: {
              contents: file.content,
            },
          };
        } else {
          const existing = node[part];
          if (!existing || !('directory' in existing)) {
            const dir: FileSystemTree = {};
            node[part] = { directory: dir };
            node = dir;
          } else {
            node = existing.directory;
          }
        }
      }
    }
    return tree;
  }, []);

  const writeFiles = useCallback(
    async (files: RunFile[]) => {
      const container = containerRef.current;
      if (!container) {
        log('stderr', 'WebContainer not ready yet.');
        return;
      }
      const tree = buildTree(files);
      try {
        await container.mount(tree);
        log('system', `Wrote ${files.length} file(s) to virtual filesystem.`);
      } catch (err) {
        log('stderr', `Failed to write files: ${(err as Error).message}`);
      }
    },
    [buildTree, log],
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      const container = containerRef.current;
      if (!container) return;
      try {
        const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
        await container.fs.mkdir(dir, { recursive: true }).catch(() => {});
        await container.fs.writeFile(path, content);
      } catch (err) {
        log('stderr', `Failed to write ${path}: ${(err as Error).message}`);
      }
    },
    [log],
  );

  const runCommand = useCallback(
    async (command: string): Promise<number> => {
      const container = containerRef.current;
      if (!container) {
        log('stderr', 'WebContainer not ready yet.');
        return 1;
      }
      const tokens = command.trim().split(/\s+/);
      const cmd = tokens[0];
      const args = tokens.slice(1);
      log('system', `$ ${command}`);
      setIsRunning(true);
      try {
        const process = await container.spawn(cmd, args);
        const reader = process.output.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const ln of (value ?? '').split('\n')) {
              if (ln.length) log('stdout', ln);
            }
          }
        };
        pump();
        const code = await process.exit;
        setIsRunning(false);
        return code;
      } catch (err) {
        log('stderr', `Command failed: ${(err as Error).message}`);
        setIsRunning(false);
        return 1;
      }
    },
    [log],
  );

  const startDevServer = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    log('system', 'Starting dev server...');
    setIsRunning(true);
    try {
      const process = await container.spawn('npm', ['run', 'dev']);
      const reader = process.output.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const ln of (value ?? '').split('\n')) {
            if (ln.length) log('stdout', ln);
          }
        }
      };
      pump();
    } catch (err) {
      log('stderr', `Dev server failed: ${(err as Error).message}`);
      setIsRunning(false);
    }
  }, [log]);

  const reset = useCallback(() => {
    setLines([]);
    setPreviewUrl(null);
    log('system', 'Terminal cleared.');
  }, [log]);

  return {
    booted,
    booting,
    previewUrl,
    lines,
    isRunning,
    writeFiles,
    writeFile,
    runCommand,
    startDevServer,
    reset,
    log,
  };
}
