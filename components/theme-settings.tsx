'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { hexToHSL, hslToHex } from '@/lib/color-utils';

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
    muted: '',
  });

  // Prevent hydration mismatch
  const getHex = (key: string) => {
    if (typeof window === 'undefined') return '#ffffff';
    const cssKey = key === 'sidebar' ? 'sidebar-background' : key;
    const hsl = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${cssKey}`)
      .trim();
    return hslToHex(hsl);
  };

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

    const cssKey = colorKey === 'sidebar' ? 'sidebar-background' : colorKey;
    document.documentElement.style.setProperty(
      `--${cssKey}`,
      hexToHSL(value),
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-md">
          <Settings className="size-4" />
          <span className="sr-only">Theme settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Theme Settings</DialogTitle>
          <DialogDescription>
            Customize the colors of your chat interface.
          </DialogDescription>
        </DialogHeader>
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

          {(
            [
              { key: 'background', label: 'Background' },
              { key: 'foreground', label: 'Foreground' },
              { key: 'primary', label: 'Primary' },
              { key: 'secondary', label: 'Secondary' },
              { key: 'accent', label: 'Accent' },
              { key: 'muted', label: 'Artifact Background' },
              { key: 'sidebar', label: 'Sidebar Background' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="grid gap-2">
              <Label htmlFor={`${key}-color`}>{label} Color</Label>
              <div className="flex gap-2">
                <Input
                  id={`${key}-color`}
                  type="color"
                  value={customColors[key] || getHex(key)}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="size-10 p-1"
                />
                <Input
                  type="text"
                  value={customColors[key] || getHex(key)}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="flex-1"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          ))}

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
                muted: '',
              });
            }}
            variant="outline"
            className="mt-4"
          >
            Reset to Default
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
