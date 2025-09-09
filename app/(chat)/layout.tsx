import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '../(auth)/auth';
import Script from 'next/script';
import { getRemainingCredits } from '@/lib/providers/crustdata/client';
import { Coins } from 'lucide-react';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore, credits] = await Promise.all([
    auth(),
    cookies(),
    getRemainingCredits().catch(() => null),
  ]);
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
          {/* Top-right credits pill */}
          {typeof credits === 'number' && (
            <div className="fixed top-2 right-14 md:right-20 z-50">
              <div className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border bg-background">
                <Coins className="h-4 w-4" />
                <span>Credits: {credits}</span>
              </div>
            </div>
          )}
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
