'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GmailButton({
  setInput,
  className,
}: {
  setInput: (value: string | ((prev: string) => string)) => void;
  className?: string;
}) {
  const [connected, setConnected] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(true);

  useEffect(() => {
    fetch('/api/gmail/status')
      .then((res) => res.json())
      .then((data) => {
        setConnected(data.connected);
        setOauthConfigured(data.oauthConfigured);
      })
      .catch(() => setOauthConfigured(false));
  }, []);

  if (!oauthConfigured) {
    return (
      <Button
        variant="ghost"
        disabled
        title="Gmail OAuth not configured"
        className={cn(
          'p-[7px] h-fit rounded-md dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200',
          className,
        )}
      >
        <Mail size={14} />
      </Button>
    );
  }

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
          <Mail size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 flex flex-col gap-2">
        {connected ? (
          <Button
            onClick={() =>
              setInput((prev) =>
                `${prev ? `${prev}\n` : ''}Summarize my recent emails.`
              )
            }
          >
            Summarize recent emails
          </Button>
        ) : (
          <Button asChild>
            <a href="/api/gmail/auth">Connect Gmail</a>
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
