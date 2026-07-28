'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Square, FileCode, Terminal as TerminalIcon, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { cn } from '@/lib/utils';
import type { ParsedAction } from '@/lib/streaming-parser';
import type { Message } from '@/lib/types';

interface Props {
  model: string;
  onModelChange: (id: string) => void;
  messages: Message[];
  streaming: boolean;
  partialAssistant: string;
  activeArtifactTitle: string | null;
  liveActions: ParsedAction[];
  onSend: (text: string) => void;
  onAbort: () => void;
}

export function ChatPanel({
  model,
  onModelChange,
  messages,
  streaming,
  partialAssistant,
  activeArtifactTitle,
  liveActions,
  onSend,
  onAbort,
}: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, partialAssistant, liveActions]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    onSend(text);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#0a0a0f]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">Chat</h2>
        <div className="w-[240px]">
          <ModelSelector value={model} onChange={onModelChange} />
        </div>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef as never}>
        <div className="space-y-4 px-4 py-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20">
                <Wrench className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="mb-1 text-sm font-medium text-white/80">Build something</h3>
              <p className="max-w-[240px] text-xs text-white/40">
                Describe the app you want and the AI will generate it, install dependencies,
                and run it live in your browser.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-blue-500 to-blue-600 px-3.5 py-2.5 text-sm text-white">
                  {m.content}
                </div>
              ) : (
                <AssistantBubble content={m.content} />
              )}
            </div>
          ))}

          {streaming && (
            <div className="flex justify-start">
              <div className="max-w-[90%]">
                {activeArtifactTitle && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-emerald-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Building: {activeArtifactTitle}
                  </div>
                )}
                {liveActions.length > 0 ? (
                  <div className="space-y-1.5">
                    {liveActions.map((a) => (
                      <ActionChip key={a.id} action={a} />
                    ))}
                  </div>
                ) : partialAssistant ? (
                  <AssistantBubble content={partialAssistant} />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-white/5 p-3">
        <div className="relative rounded-xl border border-white/10 bg-white/5 focus-within:border-blue-500/50">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the app you want to build..."
            disabled={streaming}
            className="min-h-[52px] resize-none border-0 bg-transparent pr-12 text-sm text-white placeholder:text-white/30 focus-visible:ring-0"
          />
          {streaming ? (
            <Button
              type="button"
              onClick={onAbort}
              size="icon"
              className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-lg bg-red-500/80 text-white hover:bg-red-500"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white hover:opacity-90"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  const stripped = content.replace(/<boltArtifact[\s\S]*?<\/boltArtifact>/g, '').trim();
  if (!stripped) {
    return (
      <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white/70">
        <span className="text-xs text-emerald-400/80">Generated project files</span>
      </div>
    );
  }
  return (
    <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white/80">
      {stripped}
    </div>
  );
}

function ActionChip({ action }: { action: ParsedAction }) {
  const isFile = action.type === 'file';
  const isShell = action.type === 'shell';
  const isStart = action.type === 'start';
  const label = isFile
    ? action.filePath ?? 'file'
    : isShell
      ? action.command ?? 'shell'
      : 'Start dev server';
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
        isFile && 'border-blue-500/20 bg-blue-500/5 text-blue-300',
        isShell && 'border-amber-500/20 bg-amber-500/5 text-amber-300',
        isStart && 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
      )}
    >
      {isFile && <FileCode className="h-3.5 w-3.5 shrink-0" />}
      {isShell && <TerminalIcon className="h-3.5 w-3.5 shrink-0" />}
      {isStart && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
      <span className="truncate font-mono">{label}</span>
      {!action.done && <span className="ml-auto text-white/30">...</span>}
    </div>
  );
}
