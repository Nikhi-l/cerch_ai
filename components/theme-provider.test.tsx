// @vitest-environment jsdom
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ThemeProvider } from './theme-provider'; // Adjust path
import { useTheme } from 'next-themes';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>, // Mocked NextThemesProvider
}));

// Mock global objects
const mockLocalStorageGetItem = vi.fn();
const mockDocumentElementStyleSetProperty = vi.fn();

describe('ThemeProvider Custom Theme Loading', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockLocalStorageGetItem,
        // setItem is not directly used by ThemeProvider loading logic but good to have for completeness
        setItem: vi.fn(),
      },
      writable: true,
    });

    Object.defineProperty(document, 'documentElement', {
      value: {
        ...document.documentElement,
        style: {
          setProperty: mockDocumentElementStyleSetProperty,
          getPropertyValue: vi.fn().mockReturnValue(''), // Mock for getPropertyValue
        },
      },
      writable: true,
      configurable: true,
    });
  });

  test('should load and apply custom theme from localStorage if current theme is "custom"', async () => {
    // 1. Mock useTheme to return { theme: 'custom' }
    //    (useTheme as vi.Mock).mockReturnValue({ theme: 'custom', resolvedTheme: 'custom' });
    // 2. Mock localStorage.getItem('custom-theme-colors') to return a stringified object of theme values.
    //    e.g., const mockColors = { background: '0 0 0', foreground: '255 255 255' };
    //    mockLocalStorageGetItem.mockReturnValue(JSON.stringify(mockColors));
    // 3. Render ThemeProvider (with a child, as it's a provider)
    //    render(<ThemeProvider attribute="class" defaultTheme="system" enableSystem><div>Test Child</div></ThemeProvider>);
    // 4. Wait for useEffect to execute.
    // 5. Assert document.documentElement.style.setProperty was called for each variable in mockColors.
    //    e.g., expect(mockDocumentElementStyleSetProperty).toHaveBeenCalledWith('--background', '0 0 0');
    //    expect(mockDocumentElementStyleSetProperty).toHaveBeenCalledWith('--foreground', '255 255 255');
  });

  test('should not apply custom theme if current theme is not "custom"', () => {
    // 1. Mock useTheme to return { theme: 'light' }
    // 2. Mock localStorage.getItem to return some custom theme data.
    // 3. Render ThemeProvider.
    // 4. Assert document.documentElement.style.setProperty was NOT called with the custom theme values.
  });

  test('should handle errors when parsing custom theme from localStorage (e.g., malformed JSON)', () => {
    // 1. Mock useTheme to return { theme: 'custom' }
    // 2. Mock localStorage.getItem to return malformed JSON (e.g., "invalid-json").
    // 3. Spy on console.error.
    // 4. Render ThemeProvider.
    // 5. Assert console.error was called with a relevant message.
    // 6. Assert document.documentElement.style.setProperty was NOT called.
  });

   test('should not attempt to load if no custom theme is in localStorage', () => {
    // 1. Mock useTheme to return { theme: 'custom' }
    // 2. Mock localStorage.getItem to return null (no item found).
    // 3. Render ThemeProvider.
    // 4. Assert document.documentElement.style.setProperty was NOT called.
  });
});
