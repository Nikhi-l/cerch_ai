"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, Grid3X3, BarChart3, Copy, Users, ArrowUp } from 'lucide-react';

interface CreditsPopupProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  currentCredits: number;
  maxCredits?: number;
}

export function CreditsPopup({ isOpen, onClose, currentCredits, maxCredits = 100 }: CreditsPopupProps) {
  const safeMax = Math.max(1, maxCredits);
  const used = Math.max(0, Math.min(currentCredits, safeMax));
  const progressValue = Math.min((used / safeMax) * 100, 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {/* Accessibility title for screen readers */}
        <DialogHeader className="sr-only">
          <DialogTitle>Credits</DialogTitle>
        </DialogHeader>
        {/* Header (neutral, consistent with app) */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="w-4 h-4" />
            <span>Credits</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Plan */}
          <div>
            <h3 className="text-sm text-muted-foreground mb-1">Current plan</h3>
            <h2 className="text-2xl font-semibold">Free</h2>
          </div>

          {/* Credit Balance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-muted-foreground">Your credit balance</h3>
              <span className="text-lg font-medium">
                {used.toLocaleString()} / {safeMax.toLocaleString()}
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Grid3X3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">25 results per dataset</span>
            </div>

            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">3 enrichments per dataset</span>
            </div>

            <div className="flex items-center gap-3">
              <Copy className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">2 concurrent datasets</span>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">2 seats</span>
            </div>
          </div>

          {/* Upgrade Button */}
          <Button
            className="w-full"
            onClick={() => window.open('https://cal.com/cerchai', '_blank')}
          >
            <ArrowUp className="w-4 h-4 mr-2" /> Upgrade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
