import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '../(auth)/auth';
import Script from 'next/script';
import { getRemainingUserCredits } from '@/lib/db/queries';
import { CreditsButton } from '@/components/credits-button';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const cookieStore = await cookies();

  // Get user-specific credits from database
  const credits = session?.user?.id
    ? await getRemainingUserCredits({ userId: session.user.id }).catch(() => null)
    : null;
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <div className="chat-theme">
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar user={session?.user} />
          {/* Top-right credits button with popup */}
          {typeof credits === 'number' && <CreditsButton credits={credits} />}
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
