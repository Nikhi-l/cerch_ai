"use client";

import { useState } from 'react';
import { Coins } from 'lucide-react';
import { CreditsPopup } from '@/components/credits-popup';

export function CreditsButton({ credits, maxCredits = 10000 }: { credits: number; maxCredits?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-2 right-14 md:right-20 z-50">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border bg-background hover:bg-muted"
        aria-label="View credits"
      >
        <Coins className="h-4 w-4" />
        <span>Credits: {credits}</span>
      </button>

      <CreditsPopup isOpen={open} onClose={setOpen} currentCredits={credits} maxCredits={maxCredits} />
    </div>
  );
}
