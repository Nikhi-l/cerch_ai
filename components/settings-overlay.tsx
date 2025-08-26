'use client';

import { useState, startTransition } from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ModelSelector } from '@/components/model-selector';
import { ApiKeyInput } from '@/components/api-key-input';
import { Settings } from 'lucide-react';
import type { Session } from 'next-auth';
import { cn } from '@/lib/utils';

export function SettingsOverlay({
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
  const [open, setOpen] = useState(false);
  const [temperature, setTemperature] = useState('1');
  const [maxTokens, setMaxTokens] = useState('1024');

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'p-[7px] h-fit rounded-md dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200',
            className,
          )}
          aria-label="Settings"
        >
          <Settings size={14} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        // Full-screen on mobile, modal on larger screens
        className="w-full h-[100dvh] sm:h-auto sm:max-w-2xl sm:rounded-lg p-0 sm:p-6"
      >
        <div className="flex flex-col h-full">
          <AlertDialogHeader className="border-b px-6 py-4">
            <AlertDialogTitle>Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Configure your API key, model, and preferences.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-medium">OpenAI API Key</h3>
              <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
              <p className="text-xs text-muted-foreground">
                Your key is stored as a browser cookie for this app only. You can clear it anytime.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">Model</h3>
              <ModelSelector session={session} selectedModelId={selectedModelId} />
              <p className="text-xs text-muted-foreground">
                GPT-5 supports tool calling for artifacts (text, code, sheet, webset).
              </p>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </section>
          </div>

          <AlertDialogFooter className="border-t px-6 py-4">
            <AlertDialogCancel onClick={() => setOpen(false)}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

