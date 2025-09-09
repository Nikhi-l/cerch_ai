'use client';

import { startTransition, useMemo, useState } from 'react';
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
  const [show, setShow] = useState(false);

  const isLikelyKey = useMemo(() => /^(sk|rk|sess)-/.test(value.trim()), [value]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex w-full items-center gap-2">
        <Input
          type={show ? 'text' : 'password'}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste your OpenAI API key (sk-...)"
          value={value}
          onChange={(e) => setValue(e.target.value.trim())}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={() => setShow((s) => !s)}
          title={show ? 'Hide' : 'Show'}
        >
          {show ? 'Hide' : 'Show'}
        </Button>
        <Button
          variant="default"
          onClick={() => {
            const trimmed = value.trim();
            setApiKey(trimmed);
            startTransition(() => {
              saveOpenAIApiKeyAsCookie(trimmed);
            });
          }}
          disabled={!isLikelyKey}
        >
          Save
        </Button>
        {(value || apiKey) && (
          <Button
            variant="ghost"
            onClick={() => {
              setValue('');
              setApiKey('');
              startTransition(() => {
                saveOpenAIApiKeyAsCookie('');
              });
            }}
            title="Clear key"
          >
            Clear
          </Button>
        )}
      </div>
      <p className={cn('text-xs', isLikelyKey ? 'text-muted-foreground' : 'text-amber-600')}>
        {isLikelyKey ? 'Looks like a valid key format.' : 'Tip: keys usually start with sk-'}
      </p>
    </div>
  );
}
