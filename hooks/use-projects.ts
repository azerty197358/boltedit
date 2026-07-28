'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/lib/types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) setProjects(data as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProject = useCallback(
    async (title: string, description?: string): Promise<Project | null> => {
      const { data, error } = await supabase
        .from('projects')
        .insert({ title, description: description ?? null })
        .select()
        .single();
      if (error) {
        console.error('createProject error', error);
        return null;
      }
      await refresh();
      return data as Project;
    },
    [refresh],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await supabase.from('projects').delete().eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const renameProject = useCallback(
    async (id: string, title: string) => {
      await supabase.from('projects').update({ title }).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  return { projects, loading, refresh, createProject, deleteProject, renameProject };
}
