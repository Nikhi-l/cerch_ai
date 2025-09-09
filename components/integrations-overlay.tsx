'use client';

import { useState } from 'react';
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
import { cn } from '@/lib/utils';

type IntegrationItem = {
  key: string;
  name: string;
  description?: string;
  status?: 'available' | 'coming-soon';
};

const DEFAULT_INTEGRATIONS: IntegrationItem[] = [
  { key: 'hubspot', name: 'HubSpot', description: 'Sync contacts & lists', status: 'coming-soon' },
  { key: 'salesforce', name: 'Salesforce', description: 'Sync leads & contacts', status: 'coming-soon' },
  { key: 'clearbit', name: 'Clearbit', description: 'Firmographic enrichment', status: 'coming-soon' },
  { key: 'apollo', name: 'Apollo', description: 'Contact enrichment', status: 'coming-soon' },
];

export function IntegrationsOverlay({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className={cn('h-fit py-1.5 px-2', className)}>Integrations</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-full h-dvh sm:h-auto sm:max-w-3xl sm:rounded-lg p-0 sm:p-6">
        <div className="flex flex-col h-full">
          <AlertDialogHeader className="border-b px-6 py-4">
            <AlertDialogTitle>Integrations</AlertDialogTitle>
            <AlertDialogDescription>
              Connect with your tools. Minimal UI today; more coming soon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEFAULT_INTEGRATIONS.map((i) => (
                <div key={i.key} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    {i.description && (
                      <div className="text-xs text-muted-foreground mt-1">{i.description}</div>
                    )}
                  </div>
                  <Button variant={i.status === 'available' ? 'default' : 'outline'} disabled={i.status !== 'available'}>
                    {i.status === 'available' ? 'Connect' : 'Coming soon'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <AlertDialogFooter className="border-t px-6 py-4">
            <AlertDialogCancel onClick={() => setOpen(false)}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

