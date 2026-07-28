'use client';

import { useCallback, useRef, useState } from 'react';
import { StreamingParser, resetActionCounter, type ParsedAction } from '@/lib/streaming-parser';

interface UseStreamingChatArgs {
  model: string;
  onActionComplete?: (action: ParsedAction) => void;
  onActionDelta?: (action: ParsedAction) => void;
  onArtifactStart?: (id: string, title: string) => void;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useStreamingChat({
  model,
  onActionComplete,
  onActionDelta,
  onArtifactStart,
}: UseStreamingChatArgs) {
  const [streaming, setStreaming] = useState(false);
  const [partialAssistant, setPartialAssistant] = useState('');
  const [activeArtifactTitle, setActiveArtifactTitle] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (messages: ChatMessage[]) => {
      if (streaming) return;
      setStreaming(true);
      setPartialAssistant('');
      setActiveArtifactTitle(null);
      resetActionCounter();

      const parser = new StreamingParser((event) => {
        switch (event.type) {
          case 'artifact-start':
            if (event.artifactTitle) setActiveArtifactTitle(event.artifactTitle);
            if (event.artifactId && event.artifactTitle) {
              onArtifactStart?.(event.artifactId, event.artifactTitle);
            }
            break;
          case 'action-start':
            onActionDelta?.(event.action!);
            break;
          case 'action-delta':
            onActionDelta?.(event.action!);
            break;
          case 'action-end':
            onActionComplete?.(event.action!);
            break;
          case 'artifact-end':
            setActiveArtifactTitle(null);
            break;
        }
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, model }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => 'Unknown error');
          throw new Error(errText);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          parser.feed(chunk);
          setPartialAssistant(full);
        }
        parser.end();
        return full;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return '';
        }
        throw err;
      } finally {
        setStreaming(false);
        setActiveArtifactTitle(null);
        abortRef.current = null;
      }
    },
    [streaming, model, onActionComplete, onActionDelta, onArtifactStart],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    send,
    abort,
    streaming,
    partialAssistant,
    activeArtifactTitle,
  };
}
