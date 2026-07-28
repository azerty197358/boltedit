'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useModels } from '@/hooks/use-models';
import type { OpenRouterModel } from '@/lib/types';

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const { models, freeModels, paidModels, loading, isFree } = useModels();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => models.find((m) => m.id === value), [models, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 hover:text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading models...
            </>
          ) : selected ? (
            <span className="flex items-center gap-2 truncate">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="truncate">{selected.name}</span>
              {isFree(selected) && (
                <Badge variant="secondary" className="shrink-0 bg-emerald-500/20 text-[10px] text-emerald-300">
                  FREE
                </Badge>
              )}
            </span>
          ) : (
            'Select a model'
          )}
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] border-white/10 bg-[#12121a] p-0" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search models..." className="text-white/80" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty className="text-white/40">No model found.</CommandEmpty>
            {freeModels.length > 0 && (
              <CommandGroup heading="Free Models" className="text-emerald-400/80">
                {freeModels.slice(0, 50).map((m: OpenRouterModel) => (
                  <ModelItem key={m.id} model={m} selected={value === m.id} free onSelect={() => { onChange(m.id); setOpen(false); }} />
                ))}
              </CommandGroup>
            )}
            {paidModels.length > 0 && (
              <CommandGroup heading="All Models" className="text-white/50">
                {paidModels.slice(0, 80).map((m: OpenRouterModel) => (
                  <ModelItem key={m.id} model={m} selected={value === m.id} onSelect={() => { onChange(m.id); setOpen(false); }} />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ModelItem({
  model,
  selected,
  free,
  onSelect,
}: {
  model: OpenRouterModel;
  selected: boolean;
  free?: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      onSelect={onSelect}
      className="gap-2 text-xs text-white/70 data-[selected=true]:bg-white/10"
    >
      <Check className={cn('h-3.5 w-3.5', selected ? 'opacity-100' : 'opacity-0')} />
      <span className="flex-1 truncate">{model.name}</span>
      {free && (
        <Badge variant="secondary" className="bg-emerald-500/20 text-[10px] text-emerald-300">
          FREE
        </Badge>
      )}
      {model.context_length ? (
        <span className="text-[10px] text-white/30">
          {Math.round(model.context_length / 1000)}k
        </span>
      ) : null}
    </CommandItem>
  );
}
