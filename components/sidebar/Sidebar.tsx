'use client';

import { useState } from 'react';
import { Plus, Trash2, MessageSquare, Loader2, Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

interface Props {
  projects: Project[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar({ projects, activeId, loading, onSelect, onNew, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#0d0d14]">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">BoltEdit</span>
      </div>

      <div className="px-3 pt-3">
        <Button
          onClick={onNew}
          className="w-full justify-start gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-white/30">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-white/30">
            No projects yet. Create one to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {projects.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors',
                  activeId === p.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                )}
              >
                <button
                  onClick={() => onSelect(p.id)}
                  className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{p.title}</span>
                </button>
                {confirmId === p.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onDelete(p.id);
                        setConfirmId(null);
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-[10px] text-white/40 hover:text-white/70"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(p.id)}
                    className="hidden shrink-0 text-white/30 hover:text-red-400 group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-white/5 p-3">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-white/40 hover:text-white/70"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
