'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { FileRecord } from '@/lib/types';

export function useFiles(projectId: string | null) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId);
    if (!error && data) setFiles(data as FileRecord[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertFile = useCallback(
    async (path: string, content: string) => {
      if (!projectId) return;
      const { error } = await supabase
        .from('files')
        .upsert({ project_id: projectId, path, content }, { onConflict: 'project_id,path' });
      if (error) console.error('upsertFile error', error);
    },
    [projectId],
  );

  const upsertMany = useCallback(
    async (entries: { path: string; content: string }[]) => {
      if (!projectId || entries.length === 0) return;
      const rows = entries.map((e) => ({
        project_id: projectId,
        path: e.path,
        content: e.content,
      }));
      const { error } = await supabase
        .from('files')
        .upsert(rows, { onConflict: 'project_id,path' });
      if (error) console.error('upsertMany error', error);
      await refresh();
    },
    [projectId, refresh],
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!projectId) return;
      await supabase.from('files').delete().eq('project_id', projectId).eq('path', path);
      await refresh();
    },
    [projectId, refresh],
  );

  return { files, loading, refresh, upsertFile, upsertMany, deleteFile };
}
