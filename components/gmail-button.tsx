"use client";
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import type { UseChatHelpers } from '@ai-sdk/react';
import { cn } from '@/lib/utils';

export function GmailButton({
  chatId,
  append,
  className,
}: {
  chatId: string;
  append: UseChatHelpers['append'];
  className?: string;
}) {
  const [connected, setConnected] = useState<boolean>(false);
  const [oauthConfigured, setOauthConfigured] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/gmail/status')
      .then((r) => r.json())
      .then((d) => {
        setConnected(Boolean(d.connected));
        setOauthConfigured(Boolean(d.oauthConfigured));
      })
      .catch(() => {
        setConnected(false);
        setOauthConfigured(false);
      });
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'p-[7px] h-fit rounded-md dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200',
            className,
          )}
          title={connected ? 'Gmail connected' : 'Connect Gmail'}
        >
          <Mail size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 flex flex-col gap-3">
        {!connected ? (
          <div className="space-y-2">
            {oauthConfigured ? (
              <a href="/api/gmail/auth">
                <Button className="w-full">Connect Gmail</Button>
              </a>
            ) : (
              <Button disabled className="w-full">
                Configure Google OAuth to connect
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              After connecting, you can ask the assistant to read or search your inbox.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block size-2 rounded-full bg-green-500" />
              Gmail connected
            </div>
            <Button
              variant="outline"
              onClick={() => {
                window.history.replaceState({}, '', `/chat/${chatId}`);
                append({
                  role: 'user',
                  content:
                    'Use Gmail to list my 5 most recent emails with sender, subject, and date as a bullet list.',
                });
              }}
            >
              Summarize recent emails
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

