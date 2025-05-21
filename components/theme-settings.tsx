'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
    'sidebar-background': '',
    'artifact-background': '',
    'artifact-heading': '',
  });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const savedColors = localStorage.getItem('custom-theme-colors');
    if (savedColors) {
      setCustomColors(JSON.parse(savedColors));
    }
  }, []);

  const getDefaultHex = (name: string, fallback: string) => {
    if (!mounted) return fallback;
    const hsl = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
    return hsl ? hslToHex(hsl) : fallback;
  };

  if (!mounted) return null;

  const handleColorChange = (colorKey: string, hex: string) => {
    const newColors = { ...customColors, [colorKey]: hex };
    setCustomColors(newColors);
    localStorage.setItem('custom-theme-colors', JSON.stringify(newColors));
    document.documentElement.style.setProperty(`--${colorKey}`, hexToHSL(hex));
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
        <div className="space-y-2 pb-2">
          <h2 className="text-lg font-semibold">Theme Settings</h2>
          <p className="text-sm text-muted-foreground">
            Customize the colors of your chat interface.
          </p>
        </div>
        <div className="grid gap-4 py-2">
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
                  getDefaultHex('background', theme === 'dark' ? '#0a0a0c' : '#ffffff')
                }
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors.background ||
                  getDefaultHex('background', theme === 'dark' ? '#0a0a0c' : '#ffffff')
                }
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="flex-1"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="foreground-color">Foreground Color</Label>
            <div className="flex gap-2">
              <Input
                id="foreground-color"
                type="color"
                value={
                  customColors['foreground'] ||
                  getDefaultHex('foreground', '#000000')
                }
                onChange={(e) => handleColorChange('foreground', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors['foreground'] ||
                  getDefaultHex('foreground', '#000000')
                }
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
                value={
                  customColors['primary'] ||
                  getDefaultHex('primary', '#0000ff')
                }
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors['primary'] ||
                  getDefaultHex('primary', '#0000ff')
                }
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="flex-1"
                placeholder="#0000ff"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="secondary-color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                type="color"
                value={
                  customColors['secondary'] ||
                  getDefaultHex('secondary', '#dddddd')
                }
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors['secondary'] ||
                  getDefaultHex('secondary', '#dddddd')
                }
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="flex-1"
                placeholder="#dddddd"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="accent-color">Accent Color</Label>
            <div className="flex gap-2">
              <Input
                id="accent-color"
                type="color"
                value={
                  customColors['accent'] ||
                  getDefaultHex('accent', '#888888')
                }
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors['accent'] ||
                  getDefaultHex('accent', '#888888')
                }
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="flex-1"
                placeholder="#888888"
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
                  getDefaultHex('sidebar-background', '#f0f0f0')
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
                  getDefaultHex('sidebar-background', '#f0f0f0')
                }
                onChange={(e) =>
                  handleColorChange('sidebar-background', e.target.value)
                }
                className="flex-1"
                placeholder="#f0f0f0"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="artifact-bg-color">Artifact Background</Label>
            <div className="flex gap-2">
              <Input
                id="artifact-bg-color"
                type="color"
                value={
                  customColors['artifact-background'] ||
                  getDefaultHex('artifact-background', '#1e1a2e')
                }
                onChange={(e) =>
                  handleColorChange('artifact-background', e.target.value)
                }
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors['artifact-background'] ||
                  getDefaultHex('artifact-background', '#1e1a2e')
                }
                onChange={(e) =>
                  handleColorChange('artifact-background', e.target.value)
                }
                className="flex-1"
                placeholder="#1e1a2e"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="artifact-head-color">Artifact Heading</Label>
            <div className="flex gap-2">
              <Input
                id="artifact-head-color"
                type="color"
                value={
                  customColors['artifact-heading'] ||
                  getDefaultHex('artifact-heading', '#8a57db')
                }
                onChange={(e) =>
                  handleColorChange('artifact-heading', e.target.value)
                }
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={
                  customColors['artifact-heading'] ||
                  getDefaultHex('artifact-heading', '#8a57db')
                }
                onChange={(e) =>
                  handleColorChange('artifact-heading', e.target.value)
                }
                className="flex-1"
                placeholder="#8a57db"
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
                'sidebar-background': '',
                'artifact-background': '',
                'artifact-heading': '',
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
