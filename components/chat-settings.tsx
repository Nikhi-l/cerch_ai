'use client';

import { useState } from 'react';

import { ModelSelector } from '@/components/model-selector';
import { ApiKeyInput } from '@/components/api-key-input';
import { CrustdataApiKeyInput } from '@/components/crustdata-api-key-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Session } from 'next-auth';

export function ChatSettings({
  session,
  selectedModelId,
  apiKey,
  setApiKey,
  crustdataApiKey,
  setCrustdataApiKey,
  className,
}: {
  session: Session;
  selectedModelId: string;
  apiKey: string;
  setApiKey: (key: string) => void;
  crustdataApiKey: string;
  setCrustdataApiKey: (key: string) => void;
  className?: string;
}) {
  const [temperature, setTemperature] = useState('1');
  const [maxTokens, setMaxTokens] = useState('1024');
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'p-[7px] h-fit rounded-md dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200',
            className,
          )}
        >
          <Settings size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 flex flex-col gap-4">
        <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
        <CrustdataApiKeyInput
          apiKey={crustdataApiKey}
          setApiKey={setCrustdataApiKey}
        />
        <ModelSelector
          session={session}
          selectedModelId={selectedModelId}
          className="w-full"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            id="temperature"
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="max-tokens">Max Tokens</Label>
          <Input
            id="max-tokens"
            type="number"
            min="1"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

