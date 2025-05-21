'use client';

import { createContext, useEffect } from 'react';
import { hexToHSL } from '@/lib/color-utils';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';

// Context to expose a helper for applying saved custom colors
export const CustomThemeContext = createContext({
  applyCustomColors: () => {},
});

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const applyCustomColors = () => {
    if (typeof window === 'undefined') return;

    const savedColors = localStorage.getItem('custom-theme-colors');
    if (savedColors) {
      const colors = JSON.parse(savedColors) as Record<string, string>;

      Object.entries(colors).forEach(([key, hex]) => {
        if (hex) {
          document.documentElement.style.setProperty(`--${key}`, hexToHSL(hex));
        }
      });
    }
  };

  useEffect(() => {
    applyCustomColors();
  }, []);

  return (
    <CustomThemeContext.Provider value={{ applyCustomColors }}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </CustomThemeContext.Provider>
  );
}
