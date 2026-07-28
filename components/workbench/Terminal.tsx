'use client';

import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TerminalLine } from '@/hooks/use-webcontainer';

interface Props {
  lines: TerminalLine[];
  onClear: () => void;
}

export function Terminal({ lines, onClear }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  return (
    <div className="flex h-full flex-col bg-[#0d0d14]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <TerminalIcon className="h-3.5 w-3.5" />
          Terminal
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white/30 hover:text-white"
          onClick={onClear}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1" ref={scrollRef as never}>
        <div className="p-3 font-mono text-xs leading-relaxed">
          {lines.length === 0 ? (
            <p className="text-white/20">Terminal output will appear here...</p>
          ) : (
            lines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  'whitespace-pre-wrap break-all',
                  line.stream === 'stderr' && 'text-red-400/80',
                  line.stream === 'system' && 'text-emerald-400/70',
                  line.stream === 'stdout' && 'text-white/70',
                )}
              >
                {line.text}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
