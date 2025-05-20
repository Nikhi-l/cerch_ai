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
  const [customColors, setCustomColors] = useState<Record<string, string>>({
    background: '',
    foreground: '',
    primary: '',
    secondary: '',
    accent: '',
    muted: '',
    'sidebar-background': '',
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

  const getDefaultColor = (key: string) =>
    hslToHex(
      getComputedStyle(document.documentElement)
        .getPropertyValue(`--${key}`)
        .trim(),
    );

  const handleColorChange = (colorKey: string, hex: string) => {
    const newColors = { ...customColors, [colorKey]: hex };
    setCustomColors(newColors);
    localStorage.setItem('custom-theme-colors', JSON.stringify(newColors));
    document.documentElement.style.setProperty(
      `--${colorKey}`,
      hexToHSL(hex),
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
          <Settings className="h-4 w-4" />
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

          <div className="grid gap-2">
            <Label htmlFor="foreground-color">Foreground Color</Label>
            <div className="flex gap-2">
              <Input
                id="foreground-color"
                type="color"
                value={customColors.foreground || getDefaultColor('foreground')}
                onChange={(e) => handleColorChange('foreground', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={customColors.foreground || getDefaultColor('foreground')}
                onChange={(e) => handleColorChange('foreground', e.target.value)}
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                type="color"
                value={customColors.primary || getDefaultColor('primary')}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={customColors.primary || getDefaultColor('primary')}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="secondary-color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                type="color"
                value={customColors.secondary || getDefaultColor('secondary')}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={customColors.secondary || getDefaultColor('secondary')}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="accent-color">Accent Color</Label>
            <div className="flex gap-2">
              <Input
                id="accent-color"
                type="color"
                value={customColors.accent || getDefaultColor('accent')}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={customColors.accent || getDefaultColor('accent')}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="muted-color">Artifact Background</Label>
            <div className="flex gap-2">
              <Input
                id="muted-color"
                type="color"
                value={customColors.muted || getDefaultColor('muted')}
                onChange={(e) => handleColorChange('muted', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={customColors.muted || getDefaultColor('muted')}
                onChange={(e) => handleColorChange('muted', e.target.value)}
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sidebar-color">Sidebar Background</Label>
            <div className="flex gap-2">
              <Input
                id="sidebar-color"
                type="color"
                value={
                  customColors['sidebar-background'] ||
                  getDefaultColor('sidebar-background')
                }
                onChange={(e) =>
                  handleColorChange('sidebar-background', e.target.value)
                }
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors['sidebar-background'] ||
                  getDefaultColor('sidebar-background')
                }
                onChange={(e) =>
                  handleColorChange('sidebar-background', e.target.value)
                }
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="background-color">Background Color</Label>
            <div className="flex gap-2">
              <Input
                id="background-color"
                type="color"
                value={
                  customColors.background || getDefaultColor('background')
                }
                onChange={(e) =>
                  handleColorChange('background', e.target.value)
                }
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors.background || getDefaultColor('background')
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
                muted: '',
                'sidebar-background': '',
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
