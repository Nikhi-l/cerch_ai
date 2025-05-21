'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { hexToHSL } from '@/lib/color-utils';

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [customColors, setCustomColors] = useState({
    background: '',
    foreground: '',
    primary: '',
    secondary: '',
    accent: '',
    sidebar: '',
  });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const savedColors = localStorage.getItem('custom-theme-colors');
    if (savedColors) {
      setCustomColors(JSON.parse(savedColors));
    }
  }, []);

  if (!mounted) return null;

  const handleColorChange = (colorKey: string, value: string) => {
    const newColors = { ...customColors, [colorKey]: value };
    setCustomColors(newColors);
    localStorage.setItem('custom-theme-colors', JSON.stringify(newColors));
    document.documentElement.style.setProperty(
      `--${colorKey}`,
      hexToHSL(value),
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Theme settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Theme Settings</SheetTitle>
          <SheetDescription>
            Customize the colors of your chat interface.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="theme-selector">Theme Mode</Label>
            <select
              id="theme-selector"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="background-color">Background Color</Label>
            <div className="flex gap-2">
              <Input
                id="background-color"
                type="color"
                value={
                  customColors.background ||
                  (theme === 'dark' ? '#0a0a0c' : '#ffffff')
                }
                onChange={(e) =>
                  handleColorChange('background', e.target.value)
                }
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors.background ||
                  (theme === 'dark' ? '#0a0a0c' : '#ffffff')
                }
                onChange={(e) =>
                  handleColorChange('background', e.target.value)
                }
                className="flex-1"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <Button
            onClick={() => {
              localStorage.removeItem('custom-theme-colors');
              document.documentElement.removeAttribute('style');
              setCustomColors({
                background: '',
                foreground: '',
                primary: '',
                secondary: '',
                accent: '',
                sidebar: '',
              });
            }}
            variant="outline"
            className="mt-4"
          >
            Reset to Default
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
