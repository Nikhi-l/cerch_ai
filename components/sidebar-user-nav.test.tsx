// @vitest-environment jsdom
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { SidebarUserNav } from './sidebar-user-nav'; // Adjust path
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

// Mock sub-components or utilities used by SidebarUserNav if they are complex
// For example, CustomThemeEditor is opened but its internal logic isn't the focus here.
// We only care that it *can* be opened.
vi.mock('@/components/custom-theme-editor', () => ({
  CustomThemeEditor: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mock-custom-theme-editor">Editor Open</div> : null,
}));

// Mock global objects
const mockLocalStorageGetItem = vi.fn();
const mockDocumentElementStyleSetProperty = vi.fn();
const mockSetTheme = vi.fn();

const mockUser = {
  email: 'test@example.com',
  name: 'Test User',
  image: '',
};

describe('SidebarUserNav', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    (useTheme as vi.Mock).mockReturnValue({
      setTheme: mockSetTheme,
      theme: 'light', // Default mock theme
    });

    (useSession as vi.Mock).mockReturnValue({
      data: { user: mockUser, expires: 'some-date' },
      status: 'authenticated',
    });

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockLocalStorageGetItem,
        setItem: vi.fn(), // Not directly used by this component's loading logic
      },
      writable: true,
    });

    Object.defineProperty(document, 'documentElement', {
      value: {
        ...document.documentElement,
        style: {
          setProperty: mockDocumentElementStyleSetProperty,
          getPropertyValue: vi.fn().mockReturnValue(''),
        },
      },
      writable: true,
      configurable: true,
    });
  });

  describe('Theme Switching Logic', () => {
    test('should cycle through themes: light -> dark -> violet -> custom -> light', () => {
      // 1. Render SidebarUserNav.
      // 2. Open the dropdown menu (e.g., click user nav button).
      // 3. Find the theme switching menu item.
      // 4. Click it multiple times and verify setTheme is called with the correct sequence.
      //    - Initial theme 'light'
      //    - Click 1: setTheme('dark')
      //    - Click 2: setTheme('violet')
      //    - Click 3: setTheme('custom')
      //    - Click 4: setTheme('light')
    });

    test('when switching to "custom" theme, should load and apply styles from localStorage', async () => {
      // 1. Mock useTheme to initially return { theme: 'violet', setTheme: mockSetTheme }
      // 2. Mock localStorage.getItem('custom-theme-colors') to return saved custom theme data.
      //    e.g., const mockColors = { background: '10 20 30', primary: '40 50 60' };
      //    mockLocalStorageGetItem.mockReturnValue(JSON.stringify(mockColors));
      // 3. Render SidebarUserNav.
      // 4. Open the dropdown menu.
      // 5. Click the theme switching menu item (which should switch from 'violet' to 'custom').
      // 6. Assert mockSetTheme was called with 'custom'.
      // 7. Wait for async operations if any (e.g., if style application is debounced or async).
      // 8. Assert document.documentElement.style.setProperty was called for each variable in mockColors.
      //    e.g., expect(mockDocumentElementStyleSetProperty).toHaveBeenCalledWith('--background', '10 20 30');
      //    expect(mockDocumentElementStyleSetProperty).toHaveBeenCalledWith('--primary', '40 50 60');
    });

    test('should not apply localStorage styles if switching to a theme other than "custom"', () => {
      // 1. Mock useTheme to initially return { theme: 'light', setTheme: mockSetTheme }
      // 2. Mock localStorage.getItem('custom-theme-colors') to return some data.
      // 3. Render SidebarUserNav.
      // 4. Open dropdown, click theme switch (goes to 'dark').
      // 5. Assert mockSetTheme was called with 'dark'.
      // 6. Assert mockDocumentElementStyleSetProperty was NOT called with the localStorage values.
    });
  });

  describe('CustomThemeEditor Integration', () => {
    test('should open CustomThemeEditor when "Customize Theme" is clicked', () => {
      // 1. Render SidebarUserNav.
      // 2. Open the dropdown menu.
      // 3. Click the "Customize Theme" menu item.
      // 4. Verify the mocked CustomThemeEditor is rendered (e.g., check for its data-testid).
      //    expect(screen.getByTestId('mock-custom-theme-editor')).toBeInTheDocument();
    });
  });
});
