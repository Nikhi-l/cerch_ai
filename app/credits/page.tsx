import { auth } from '@/app/(auth)/auth';
import { getRemainingCredits } from '@/lib/providers/crustdata/client';
import { redirect } from 'next/navigation';

export default async function CreditsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const credits = await getRemainingCredits().catch(() => null);

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Credits</h1>
      <div className="rounded-md border p-4 bg-background">
        <div className="text-sm text-muted-foreground">Crust Data remaining credits</div>
        <div className="text-3xl font-bold mt-1">{typeof credits === 'number' ? credits : '—'}</div>
      </div>
    </main>
  );
}

