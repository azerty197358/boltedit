'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Workbench, type FileEntry } from '@/components/workbench/Workbench';
import { useProjects } from '@/hooks/use-projects';
import { useMessages } from '@/hooks/use-messages';
import { useFiles } from '@/hooks/use-files';
import { useWebContainer } from '@/hooks/use-webcontainer';
import { useStreamingChat } from '@/hooks/use-streaming-chat';
import { supabase } from '@/lib/supabase/client';
import type { ParsedAction } from '@/lib/streaming-parser';
import type { ChatMessage } from '@/hooks/use-streaming-chat';

const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { projects, loading: projectsLoading, createProject, deleteProject } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { messages, addMessage } = useMessages(activeProjectId);
  const { files, upsertMany, upsertFile, refresh: refreshFiles } = useFiles(activeProjectId);
  const wc = useWebContainer();
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [liveActions, setLiveActions] = useState<ParsedAction[]>([]);

  // When a project is loaded, write its persisted files into the WebContainer.
  useEffect(() => {
    if (!wc.booted || !activeProjectId) return;
    if (files.length > 0) {
      wc.writeFiles(files.map((f) => ({ path: f.path, content: f.content })));
    }
  }, [wc.booted, activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleActionComplete = useCallback(
    async (action: ParsedAction) => {
      if (action.type === 'file' && action.filePath) {
        await upsertFile(action.filePath, action.content);
        await wc.writeFile(action.filePath, action.content);
      } else if (action.type === 'shell' && action.command) {
        await wc.runCommand(action.command);
      } else if (action.type === 'start') {
        await wc.startDevServer();
      }
    },
    [upsertFile, wc],
  );

  const handleActionDelta = useCallback((action: ParsedAction) => {
    setLiveActions((prev) => {
      const idx = prev.findIndex((a) => a.id === action.id);
      if (idx === -1) return [...prev, action];
      const copy = [...prev];
      copy[idx] = action;
      return copy;
    });
  }, []);

  const { send, abort, streaming, partialAssistant, activeArtifactTitle } = useStreamingChat({
    model,
    onActionComplete: handleActionComplete,
    onActionDelta: handleActionDelta,
  });

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeProjectId) return;
      setLiveActions([]);

      // Persist the user message.
      await addMessage('user', text);

      // Build the message history for the API.
      const history: ChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
        { role: 'user' as const, content: text },
      ];

      // Optionally include current files as context.
      if (files.length > 0) {
        const fileContext =
          'Current project files:\n' +
          files.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n');
        history.splice(history.length - 1, 0, {
          role: 'system',
          content: fileContext,
        });
      }

      try {
        const full = await send(history);
        if (full) {
          await addMessage('assistant', full);
          await refreshFiles();
        }
      } catch (err) {
        await addMessage('assistant', `Error: ${(err as Error).message}`);
      } finally {
        setLiveActions([]);
      }
    },
    [activeProjectId, addMessage, messages, files, send, refreshFiles],
  );

  const handleNewProject = useCallback(async () => {
    const title = `New Project ${new Date().toLocaleString()}`;
    const project = await createProject(title);
    if (project) {
      setActiveProjectId(project.id);
    }
  }, [createProject]);

  const handleFileChange = useCallback(
    (path: string, content: string) => {
      upsertFile(path, content);
      wc.writeFile(path, content);
    },
    [upsertFile, wc],
  );

  const fileEntries: FileEntry[] = useMemo(
    () => files.map((f) => ({ path: f.path, content: f.content })),
    [files],
  );

  // Loading + auth gates.
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-white/40">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0f] text-center">
        <h1 className="text-2xl font-bold text-white">BoltEdit</h1>
        <p className="max-w-sm text-sm text-white/50">
          Sign in to start generating and running full-stack apps in your browser.
        </p>
        <a
          href="/auth"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <LogIn className="h-4 w-4" />
          Sign In / Sign Up
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f] text-white">
      <div className="w-[260px] shrink-0 border-r border-white/5">
        <Sidebar
          projects={projects}
          activeId={activeProjectId}
          loading={projectsLoading}
          onSelect={setActiveProjectId}
          onNew={handleNewProject}
          onDelete={deleteProject}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {!activeProjectId ? (
          <EmptyState onCreate={handleNewProject} />
        ) : (
          <PanelGroup direction="horizontal" autoSaveId="boltedit-main">
            <Panel defaultSize={38} minSize={28}>
              <ChatPanel
                model={model}
                onModelChange={setModel}
                messages={messages}
                streaming={streaming}
                partialAssistant={partialAssistant}
                activeArtifactTitle={activeArtifactTitle}
                liveActions={liveActions}
                onSend={handleSend}
                onAbort={abort}
              />
            </Panel>
            <PanelResizeHandle className="w-px bg-white/5 transition-colors data-[resize-handle-state=drag]:bg-blue-500/50" />
            <Panel defaultSize={62} minSize={35}>
              <Workbench
                files={fileEntries}
                previewUrl={wc.previewUrl}
                terminalLines={wc.lines}
                onClearTerminal={wc.reset}
                onFileChange={handleFileChange}
              />
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0a0a0f] text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20">
        <Loader2 className="h-8 w-8 text-emerald-400" />
      </div>
      <h2 className="text-xl font-semibold text-white">Start a new project</h2>
      <p className="max-w-sm text-sm text-white/50">
        Create a project, then describe the app you want to build. The AI will generate the
        code, install dependencies, and run it live in your browser.
      </p>
      <button
        onClick={onCreate}
        className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Create Project
      </button>
    </div>
  );
}
