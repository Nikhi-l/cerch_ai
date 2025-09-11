import { auth } from '@/app/(auth)/auth';
import { getDocumentsByUserId } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import { SidebarToggle } from '@/components/sidebar-toggle';

export const metadata = {
  title: 'Dashboard – Artifacts',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  let docs: Awaited<ReturnType<typeof getDocumentsByUserId>> = [];
  let dbError: string | null = null;
  try {
    docs = await getDocumentsByUserId({
      id: session.user.id,
      kinds: ['people', 'company'],
    });
  } catch (_) {
    dbError = 'Could not load datasets due to a database error.';
  }

  const people = docs.filter((d) => d.kind === 'people');
  const company = docs.filter((d) => d.kind === 'company');

  return (
    <>
      {/* Keep sidebar toggle in the same position as chat */}
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2 z-10">
        <SidebarToggle />
      </header>
      <div className="flex w-full justify-center p-6 sm:p-10">
        <div className="w-full max-w-5xl">
          {dbError && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-sm">
              {dbError}
            </div>
          )}
          <Dashboard people={people} company={company} />
        </div>
      </div>
    </>
  );
}
