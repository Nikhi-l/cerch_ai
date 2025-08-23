'use client';

import { startTransition, useState } from 'react';
import { saveOpenAIApiKeyAsCookie } from '@/app/(chat)/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  const [value, setValue] = useState(apiKey);

  return (
    <div className={cn('flex items-center gap-2', className)}>
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
  );
}
