'use client';

import { startTransition, useState } from 'react';
import { saveOpenAIApiKeyAsCookie } from '@/app/(chat)/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function ApiKeyInput({
  apiKey,
  setApiKey,
  className,
}: {
  apiKey: string;
  setApiKey: (key: string) => void;
  className?: string;
}) {
  const [mode, setMode] = useState(apiKey ? 'custom' : 'auto');
  const [value, setValue] = useState(apiKey);

  const handleModeChange = (val: string) => {
    setMode(val);
    if (val === 'auto') {
      setValue('');
      setApiKey('');
      startTransition(() => {
        saveOpenAIApiKeyAsCookie('');
      });
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Select value={mode} onValueChange={handleModeChange}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="API Key" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
      {mode === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="password"
            placeholder="API Key"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="md:w-48"
          />
          <Button
            variant="outline"
            onClick={() => {
              setApiKey(value);
              startTransition(() => {
                saveOpenAIApiKeyAsCookie(value);
              });
            }}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

