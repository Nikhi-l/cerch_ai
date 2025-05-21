'use client';

import { ChevronUp } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useState } from 'react'; // Added

import { // Added CustomThemeEditor
  CustomThemeEditor,
} from '@/components/custom-theme-editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { toast } from './toast';
import { LoaderIcon } from './icons';
import { guestRegex } from '@/lib/constants';

// Helper function to apply styles from an object (similar to ThemeProvider)
function applyThemeStyles(styles: Record<string, string>) {
  if (typeof window !== 'undefined') {
    Object.entries(styles).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(`--${variable}`, value);
    });
  }
}

// Helper function to load and apply custom theme from local storage (similar to ThemeProvider)
function loadAndApplyCustomThemeFromLocalStorage() {
  if (typeof window !== 'undefined') {
    const savedColors = localStorage.getItem('custom-theme-colors');
    if (savedColors) {
      try {
        const parsedColors = JSON.parse(savedColors);
        applyThemeStyles(parsedColors);
        console.log('Custom theme loaded from local storage and applied via sidebar.');
      } catch (error) {
        console.error('Failed to parse custom theme from local storage in sidebar:', error);
      }
    } else {
      console.log('No custom theme found in local storage via sidebar.');
    }
  }
}


export function SidebarUserNav({ user }: { user: User }) {
  const router = useRouter();
  const { data, status } = useSession();
  const { setTheme, theme } = useTheme();
  const [isCustomThemeEditorOpen, setIsCustomThemeEditorOpen] = useState(false); // Added

  const isGuest = guestRegex.test(data?.user?.email ?? '');

  return (
    <> {/* Added Fragment */}
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {status === 'loading' ? (
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10 justify-between">
                <div className="flex flex-row gap-2">
                  <div className="size-6 bg-zinc-500/30 rounded-full animate-pulse" />
                  <span className="bg-zinc-500/30 text-transparent rounded-md animate-pulse">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                data-testid="user-nav-button"
                className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10"
              >
                <Image
                  src={`https://avatar.vercel.sh/${user.email}`}
                  alt={user.email ?? 'User Avatar'}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span data-testid="user-email" className="truncate">
                  {isGuest ? 'Guest' : user?.email}
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem
              data-testid="user-nav-item-theme"
              className="cursor-pointer"
              onSelect={() => {
                let nextTheme = 'light';
                if (theme === 'light') nextTheme = 'dark';
                else if (theme === 'dark') nextTheme = 'violet';
                else if (theme === 'violet') nextTheme = 'custom';
                // else, it's 'custom' or undefined, so it cycles to 'light'

                setTheme(nextTheme);

                if (nextTheme === 'custom') {
                  loadAndApplyCustomThemeFromLocalStorage();
                }
              }}
            >
              {`Switch to ${
                theme === 'light'
                  ? 'dark'
                  : theme === 'dark'
                    ? 'violet'
                    : theme === 'violet'
                      ? 'custom'
                      : 'light'
              } mode`}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="user-nav-item-customize-theme"
              className="cursor-pointer"
              onSelect={() => {
                setIsCustomThemeEditorOpen(true); // Updated
              }}
            >
              Customize Theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  if (status === 'loading') {
                    toast({
                      type: 'error',
                      description:
                        'Checking authentication status, please try again!',
                    });

                    return;
                  }

                  if (isGuest) {
                    router.push('/login');
                  } else {
                    signOut({
                      redirectTo: '/',
                    });
                  }
                }}
              >
                {isGuest ? 'Login to your account' : 'Sign out'}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
    {/* Added CustomThemeEditor instance */}
    <CustomThemeEditor
      isOpen={isCustomThemeEditorOpen}
      onClose={() => setIsCustomThemeEditorOpen(false)}
    />
    </>
  );
}
