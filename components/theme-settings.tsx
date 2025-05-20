'use client';

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
    'sidebar-background': '',
    'artifact-background': '',
    'artifact-border': '',
    'artifact-table': '',
  })

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    const savedColors = localStorage.getItem('custom-theme-colors')
    if (savedColors) {
      setCustomColors(JSON.parse(savedColors))
    } else if (typeof window !== 'undefined') {
      const computed = getComputedStyle(document.documentElement)
      setCustomColors({
        background: hslToHex(computed.getPropertyValue('--background').trim()),
        foreground: hslToHex(computed.getPropertyValue('--foreground').trim()),
        primary: hslToHex(computed.getPropertyValue('--primary').trim()),
        secondary: hslToHex(computed.getPropertyValue('--secondary').trim()),
        accent: hslToHex(computed.getPropertyValue('--accent').trim()),
        'sidebar-background': hslToHex(
          computed.getPropertyValue('--sidebar-background').trim(),
        ),
        'artifact-background': hslToHex(
          computed.getPropertyValue('--artifact-background').trim(),
        ),
        'artifact-border': hslToHex(
          computed.getPropertyValue('--artifact-border').trim(),
        ),
        'artifact-table': hslToHex(
          computed.getPropertyValue('--artifact-table').trim(),
        ),
      })
    }
  }, [])

  if (!mounted) return null;

  const handleColorChange = (colorKey: string, hex: string) => {
    const newColors = { ...customColors, [colorKey]: hex }
    setCustomColors(newColors)
    localStorage.setItem('custom-theme-colors', JSON.stringify(newColors))
    document.documentElement.style.setProperty(`--${colorKey}`, hexToHSL(hex))
  }

  const fields = [
    { key: 'background', label: 'Background' },
    { key: 'foreground', label: 'Foreground' },
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' },
    { key: 'sidebar-background', label: 'Sidebar Background' },
    { key: 'artifact-background', label: 'Artifact Background' },
    { key: 'artifact-border', label: 'Artifact Border' },
    { key: 'artifact-table', label: 'Artifact Table' },
  ] as const

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
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

          {fields.map(({ key, label }) => (
            <div className="grid gap-2" key={key}>
              <Label htmlFor={`${key}-color`}>{label} Color</Label>
              <div className="flex gap-2">
                <Input
                  id={`${key}-color`}
                  type="color"
                  value={customColors[key as keyof typeof customColors] || '#ffffff'}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={customColors[key as keyof typeof customColors] || '#ffffff'}
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
                'sidebar-background': '',
                'artifact-background': '',
                'artifact-border': '',
                'artifact-table': '',
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
