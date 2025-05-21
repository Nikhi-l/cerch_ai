'use client';

import { useEffect } from 'react'; // Added
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'; // Added useTheme
import type { ThemeProviderProps } from 'next-themes/dist/types';

// Helper function to apply styles from an object
function applyThemeStyles(styles: Record<string, string>) {
  if (typeof window !== 'undefined') {
    Object.entries(styles).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(`--${variable}`, value);
    });
  }
}

// Helper function to load and apply custom theme from local storage
function loadAndApplyCustomTheme() {
  if (typeof window !== 'undefined') {
    const savedColors = localStorage.getItem('custom-theme-colors');
    if (savedColors) {
      try {
        const parsedColors = JSON.parse(savedColors);
        applyThemeStyles(parsedColors);
        console.log('Custom theme loaded from local storage and applied.');
      } catch (error) {
        console.error('Failed to parse custom theme from local storage:', error);
      }
    }
  }
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { theme, resolvedTheme } = useTheme();

  // Effect to load custom theme from local storage if 'custom' is the active theme
  useEffect(() => {
    // `theme` can be 'system', `resolvedTheme` gives the actual theme (light/dark)
    // We want to apply custom styles if the *intended* theme is 'custom'.
    if (theme === 'custom') {
      loadAndApplyCustomTheme();
    }
  }, [theme]); // Rerun when theme changes

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
