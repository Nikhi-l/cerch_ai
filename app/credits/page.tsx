import { auth } from '@/app/(auth)/auth';
import { getRemainingUserCredits } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CreditsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const remainingCredits = await getRemainingUserCredits({ userId: session.user.id });
  const usedPercentage = Math.min(100, ((100 - remainingCredits) / 100) * 100);

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your Credits</h1>
        <Link
          href="/settings/integrations"
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Integrations
        </Link>
      </div>

      <div className="rounded-lg border p-6 bg-card mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-4xl font-bold">{remainingCredits}</div>
          <div className="text-lg text-muted-foreground">/ 100</div>
        </div>
        <div className="text-sm text-muted-foreground mb-4">Credits remaining</div>

        {/* Progress bar */}
        <div className="w-full bg-secondary rounded-full h-2 mb-4">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${100 - usedPercentage}%` }}
          />
        </div>

        {remainingCredits < 20 && remainingCredits > 0 && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ You&apos;re running low on credits. Upgrade your plan to continue using people and company search features.
            </p>
          </div>
        )}

        {remainingCredits === 0 && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
              ❌ You&apos;ve used all your free credits
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-3">
              Upgrade your plan to get more credits and continue using advanced search features.
            </p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              Upgrade Plan
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-6 bg-card">
        <h2 className="text-lg font-semibold mb-3">How Credits Work</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Every new account starts with <strong className="text-foreground">100 free credits</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>People search costs approximately <strong className="text-foreground">10 credits</strong> per search</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Company search costs approximately <strong className="text-foreground">5 credits</strong> per search</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Chat and other features are <strong className="text-foreground">unlimited and free</strong></span>
          </li>
        </ul>
      </div>
    </main>
  );
}
