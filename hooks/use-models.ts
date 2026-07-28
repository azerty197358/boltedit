'use client';

import { useEffect, useState } from 'react';
import type { OpenRouterModel } from '@/lib/types';

export function useModels() {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/models');
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = await res.json();
        if (!mounted) return;
        const list = (json.data ?? json) as OpenRouterModel[];
        setModels(list);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isFree = (m: OpenRouterModel) => {
    const p = m.pricing;
    if (!p) return false;
    return parseFloat(p.prompt) === 0 && parseFloat(p.completion) === 0;
  };

  const freeModels = models.filter(isFree);
  const paidModels = models.filter((m) => !isFree(m));

  return { models, freeModels, paidModels, loading, error, isFree };
}
