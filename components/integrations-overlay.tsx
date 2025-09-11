'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function IntegrationsOverlay({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className={cn('h-fit py-1.5 px-2', className)}
      onClick={() => router.push('/settings/integrations')}
    >
      Integrations
    </Button>
  );
}
