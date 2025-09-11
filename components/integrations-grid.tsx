"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useMemo, useState } from 'react';
import Link from 'next/link';

export type IntegrationItem = {
  key: string;
  name: string;
  description: string;
  category: 'CRM' | 'Email Sequencing' | 'Other';
  icon: string; // emoji placeholder
  colorClass: string; // bg/text classes for icon chip
};

const DEFAULT_ITEMS: IntegrationItem[] = [
  {
    key: 'hubspot',
    name: 'HubSpot',
    description:
      'CRM platform for managing your pipeline and customer relationships. Export datasets directly to HubSpot.',
    category: 'CRM',
    icon: '🟠',
    colorClass: 'bg-orange-100 text-orange-600',
  },
  {
    key: 'salesforce',
    name: 'Salesforce',
    description:
      'Leading CRM for the full sales funnel and customer lifecycle. Enrich and export datasets to Salesforce.',
    category: 'CRM',
    icon: '☁️',
    colorClass: 'bg-blue-100 text-blue-600',
  },
  {
    key: 'pipedrive',
    name: 'Pipedrive',
    description: 'Deal‑centric CRM. Sync people and organizations from datasets.',
    category: 'CRM',
    icon: '🟩',
    colorClass: 'bg-emerald-100 text-emerald-600',
  },
  {
    key: 'zoho',
    name: 'Zoho CRM',
    description: 'Flexible CRM for leads and contacts. Export datasets to Zoho modules.',
    category: 'CRM',
    icon: '🟥',
    colorClass: 'bg-red-100 text-red-600',
  },
  {
    key: 'close',
    name: 'Close CRM',
    description: 'CRM built for inside sales. Send contacts and opportunities.',
    category: 'CRM',
    icon: '🟪',
    colorClass: 'bg-violet-100 text-violet-600',
  },
  {
    key: 'instantly',
    name: 'Instantly',
    description:
      'Cold email platform for high‑volume outreach and inbox rotation. Send datasets to campaigns.',
    category: 'Email Sequencing',
    icon: '📧',
    colorClass: 'bg-blue-100 text-blue-600',
  },
  {
    key: 'lemlist',
    name: 'Lemlist',
    description:
      'Personalize cold email outreach at scale with sequences. Push datasets for targeting.',
    category: 'Email Sequencing',
    icon: '🔵',
    colorClass: 'bg-blue-100 text-blue-600',
  },
  {
    key: 'smartlead',
    name: 'Smartlead.ai',
    description: 'AI‑powered cold email built for deliverability at scale. Fuel outbound campaigns.',
    category: 'Email Sequencing',
    icon: '🟣',
    colorClass: 'bg-violet-100 text-violet-600',
  },
];

export function IntegrationsGrid({ items }: { items?: IntegrationItem[] }) {
  const integrations = useMemo(() => items ?? DEFAULT_ITEMS, [items]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [warningOpen, setWarningOpen] = useState(false);

  const handleToggle = (key: string, next: boolean) => {
    if (next) {
      // Gated: show warning and do not enable
      setWarningOpen(true);
      setEnabled((s) => ({ ...s, [key]: false }));
    } else {
      setEnabled((s) => ({ ...s, [key]: false }));
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.key} className="hover:bg-muted/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${integration.colorClass} flex items-center justify-center text-lg`}> 
                      {integration.icon}
                    </div>
                    <h3 className="text-sm font-medium truncate">{integration.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-4">
                    {integration.description}
                  </p>
                  <Badge variant="secondary" className="bg-muted text-foreground/80 hover:bg-muted">
                    {integration.category}
                  </Badge>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <Switch
                    aria-label={`Enable ${integration.name}`}
                    checked={Boolean(enabled[integration.key])}
                    onCheckedChange={(next) => handleToggle(integration.key, next)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade required</AlertDialogTitle>
            <AlertDialogDescription>
              Integrations are available on paid plans. Please subscribe to enable CRM & email integrations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWarningOpen(false)}>Close</AlertDialogCancel>
            <Link href="/credits" className="inline-flex">
              <button className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">View plans</button>
            </Link>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

