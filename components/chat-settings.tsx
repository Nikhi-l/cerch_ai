'use client';

import { ModelSelector } from '@/components/model-selector';
import { ApiKeyInput } from '@/components/api-key-input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Session } from 'next-auth';

export function ChatSettings({
  session,
  selectedModelId,
  apiKey,
  setApiKey,
  className,
}: {
  session: Session;
  selectedModelId: string;
  apiKey: string;
  setApiKey: (key: string) => void;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('rounded-md', className)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 flex flex-col gap-4">
        <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
        <ModelSelector
          session={session}
          selectedModelId={selectedModelId}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  );
}

