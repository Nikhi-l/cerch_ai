'use client';

import { useMemo, useState, startTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { saveCrustdataApiTokenAsCookie } from '@/app/(chat)/actions';

export function CrustdataTokenInput({ className }: { className?: string }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);

  const looksNonEmpty = useMemo(() => value.trim().length > 0, [value]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex w-full items-center gap-2">
        <Input
          type={show ? 'text' : 'password'}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste your Crustdata API token"
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
            startTransition(() => {
              saveCrustdataApiTokenAsCookie(trimmed);
            });
          }}
          disabled={!looksNonEmpty}
        >
          Save
        </Button>
        {value && (
          <Button
            variant="ghost"
            onClick={() => {
              setValue('');
              startTransition(() => {
                saveCrustdataApiTokenAsCookie('');
              });
            }}
            title="Clear token"
          >
            Clear
          </Button>
        )}
      </div>
      <p className={cn('text-xs', looksNonEmpty ? 'text-muted-foreground' : 'text-amber-600')}>
        {looksNonEmpty ? 'Token length looks ok.' : 'Tip: paste your Crustdata token to enable data searches.'}
      </p>
    </div>
  );
}

