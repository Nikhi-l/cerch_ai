'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

export interface CriteriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  criteria: Array<string>;
  onConfirm: (category: string, criteria: Array<string>) => void;
}

/**
 * Displays parsed criteria allowing the user to confirm or edit before search.
 */
export function CriteriaDialog({
  open,
  onOpenChange,
  category,
  criteria,
  onConfirm,
}: CriteriaDialogProps) {
  const [localCategory, setLocalCategory] = useState(category);
  const [localCriteria, setLocalCriteria] = useState(criteria);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm criteria</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <input
            className="border rounded-md px-2 py-1"
            value={localCategory}
            onChange={(e) => setLocalCategory(e.target.value)}
          />
          {localCriteria.map((c, i) => (
            <input
              key={c}
              className="border rounded-md px-2 py-1"
              value={c}
              onChange={(e) => {
                const arr = [...localCriteria];
                arr[i] = e.target.value;
                setLocalCriteria(arr);
              }}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(localCategory, localCriteria)}
            type="button"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
