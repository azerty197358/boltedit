'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Message } from '@/lib/types';

export function useMessages(projectId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data as Message[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMessage = useCallback(
    async (role: Message['role'], content: string): Promise<Message | null> => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('messages')
        .insert({ project_id: projectId, role, content })
        .select()
        .single();
      if (error) {
        console.error('addMessage error', error);
        return null;
      }
      const msg = data as Message;
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    [projectId],
  );

  return { messages, loading, refresh, addMessage };
}
