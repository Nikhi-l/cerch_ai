'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DEFAULT_INTEGRATIONS, type IntegrationItem } from '@/components/integrations-grid';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

type EnabledMap = Record<string, boolean>;

export function IntegrationsOverlay({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState<EnabledMap>({});
  const [gatedKey, setGatedKey] = useState<string | null>(null);

  // Load persisted integration toggles from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('integrations:enabled');
      if (raw) setEnabled(JSON.parse(raw) as EnabledMap);
    } catch {}
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem('integrations:enabled', JSON.stringify(enabled));
    } catch {}
  }, [enabled]);

  const integrations = useMemo<IntegrationItem[]>(() => DEFAULT_INTEGRATIONS, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('h-fit py-1.5 px-2', className)}>
          Integrations
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[260px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Integrations</span>
          <span className="text-xs text-muted-foreground">
            {Object.values(enabled).filter(Boolean).length} active
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {integrations.map((i) => (
          <DropdownMenuItem
            key={i.key}
            onSelect={(e) => e.preventDefault()}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-sm">{i.name}</span>
            <Switch
              aria-label={`Enable ${i.name}`}
              checked={Boolean(enabled[i.key])}
              onCheckedChange={(next) => {
                if (next) {
                  // Gate enabling behind paid plan: show dialog and keep OFF
                  setGatedKey(i.key);
                  setEnabled((prev) => ({ ...prev, [i.key]: false }));
                } else {
                  setEnabled((prev) => ({ ...prev, [i.key]: false }));
                }
              }}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
      <AlertDialog open={Boolean(gatedKey)} onOpenChange={(open) => !open && setGatedKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade required</AlertDialogTitle>
            <AlertDialogDescription>
              Integrations are available on paid plans. Please subscribe to enable CRM & email integrations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGatedKey(null)}>Close</AlertDialogCancel>
            <Link href="/credits" className="inline-flex">
              <button className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">View plans</button>
            </Link>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
