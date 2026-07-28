'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  url: string | null;
}

export function Preview({ url }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setReloadKey((k) => k + 1);
  }, [url]);

  if (!url) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0a0a0f] text-white/30">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-xs">Waiting for dev server to start...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0a0a0f]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <div className="flex flex-1 items-center gap-2 rounded-md bg-white/5 px-2.5 py-1 text-xs text-white/40">
          <span className="truncate">{url}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/50 hover:text-white"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50 hover:text-white" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
      <iframe
        key={reloadKey}
        ref={iframeRef}
        src={url}
        className="flex-1 border-0 bg-white"
        title="Live Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
