'use client';

import { useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Mode = 'existing' | 'new';

export function EnrichmentDialog({
  headers,
  onConfirm,
  trigger,
  variant,
}: {
  headers: string[];
  variant?: 'people' | 'company' | 'webset';
  onConfirm: (opts: { mode: Mode; targetColumn?: string; newColumnName?: string; sourceField: string }) => void | Promise<void>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('existing');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [sourceField, setSourceField] = useState<string>('profile_image_url');

  const availableColumns = useMemo(() => headers.filter(Boolean), [headers]);
  const sourceFields = useMemo(() => {
    if (variant === 'people') {
      return [
        { key: 'profile_image_url', label: 'Profile Image URL' },
        { key: 'description', label: 'Headline / Description' },
        { key: 'location', label: 'Location' },
        { key: 'linkedin_url', label: 'LinkedIn URL (canonical)' },
      ];
    }
    return [
      { key: 'description', label: 'Description' },
      { key: 'website', label: 'Website' },
    ];
  }, [variant]);

  const canConfirm = useMemo(() => {
    if (mode === 'existing') return Boolean(targetColumn);
    return newColumnName.trim().length > 0;
  }, [mode, targetColumn, newColumnName]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="h-8 gap-1">Add Enrichment</Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="w-full h-dvh sm:h-auto sm:max-w-xl sm:rounded-lg p-0 sm:p-6">
        <div className="flex flex-col h-full">
          <AlertDialogHeader className="border-b px-6 py-4">
            <AlertDialogTitle>Add Enrichment</AlertDialogTitle>
            <AlertDialogDescription>
              Enrich missing values. Choose a target column or create a new column.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            <section className="space-y-2">
              <Label className="text-sm">What do you want to enrich?</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  className={`border rounded-md px-3 py-2 text-left ${mode === 'existing' ? 'border-primary' : ''}`}
                  onClick={() => setMode('existing')}
                >
                  Enrich existing column
                </button>
                <button
                  className={`border rounded-md px-3 py-2 text-left ${mode === 'new' ? 'border-primary' : ''}`}
                  onClick={() => setMode('new')}
                >
                  Create new column
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <Label className="text-sm">Source (from integration)</Label>
              <select
                className="border rounded-md px-3 py-2 text-sm w-full"
                value={sourceField}
                onChange={(e) => setSourceField(e.target.value)}
              >
                {sourceFields.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">People uses Crustdata’s basic profile enrichment.</p>
            </section>

            {mode === 'existing' ? (
              <section className="space-y-2">
                <Label className="text-sm">Choose column to enrich</Label>
                <select
                  className="border rounded-md px-3 py-2 text-sm w-full"
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                >
                  <option value="">Select a column</option>
                  {availableColumns.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </section>
            ) : (
              <section className="space-y-2">
                <Label className="text-sm">New column name</Label>
                <input
                  className="border rounded-md px-3 py-2 text-sm w-full"
                  placeholder="e.g., email, profile_image_url"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                />
              </section>
            )}
          </div>

          <AlertDialogFooter className="border-t px-6 py-4">
            <AlertDialogCancel onClick={() => setOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canConfirm}
              onClick={async () => {
                await onConfirm({ mode, targetColumn, newColumnName: newColumnName.trim(), sourceField });
                setOpen(false);
              }}
            >
              Enrich now
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

