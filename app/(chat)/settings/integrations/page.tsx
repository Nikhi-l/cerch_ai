import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { IntegrationsGrid } from '@/components/integrations-grid';

type IntegrationItem = {
  key: string;
  name: string;
  description?: string;
};

const INTEGRATIONS: IntegrationItem[] = [
  { key: 'hubspot', name: 'HubSpot', description: 'Sync contacts & companies' },
  { key: 'salesforce', name: 'Salesforce', description: 'Sync leads, contacts & accounts' },
  { key: 'pipedrive', name: 'Pipedrive', description: 'Sync people & organizations' },
  { key: 'zoho', name: 'Zoho CRM', description: 'Sync leads & contacts' },
  { key: 'close', name: 'Close CRM', description: 'Sync contacts & opportunities' },
  { key: 'webhooks', name: 'Webhooks', description: 'Send updates to your endpoints' },
];

export default function IntegrationsSettingsPage() {
  return (
    <>
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2 z-10">
        <SidebarToggle />
      </header>
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold">Settings / CRM Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            You are currently on the free plan. Subscribe to enable CRM integrations.
          </p>
        </div>

      <IntegrationsGrid />

      <div className="mt-6 flex items-center justify-between">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Integrations are disabled on Free plan.</span>
        </div>
        <Link href="/credits">
          <Button>View plans</Button>
        </Link>
      </div>
      </div>
    </>
  );
}
