'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const COLOR_VARS = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--ring',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--sidebar-background',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
];

type Colors = Record<string, string>;

function hslToHex(hsl: string): string {
  const [h, sStr, lStr] = hsl.split(' ');
  const hNum = parseFloat(h);
  const s = parseFloat(sStr) / 100;
  const l = parseFloat(lStr) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hNum / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hue = 0,
    sat = 0,
    light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      case b:
        hue = (r - g) / d + 4;
        break;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

export function ThemeSettings() {
  const { theme } = useTheme();
  const [colors, setColors] = useState<Colors>({});
  const [open, setOpen] = useState(false);

  const applyColors = (c: Colors) => {
    Object.entries(c).forEach(([key, val]) => {
      document.documentElement.style.setProperty(key, val);
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem(`customColors-${theme}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setColors(parsed);
      applyColors(parsed);
    } else {
      const style = getComputedStyle(document.documentElement);
      const defaults: Colors = {};
      COLOR_VARS.forEach((v) => {
        defaults[v] = style.getPropertyValue(v).trim();
      });
      setColors(defaults);
    }
  }, [theme]);

  const onColorChange = (varName: string, hex: string) => {
    const hsl = hexToHsl(hex);
    const newColors = { ...colors, [varName]: hsl };
    setColors(newColors);
    applyColors(newColors);
    localStorage.setItem(`customColors-${theme}`, JSON.stringify(newColors));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
          Theme Settings
        </DropdownMenuItem>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize Theme</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {COLOR_VARS.map((varName) => (
            <div key={varName} className="flex items-center justify-between">
              <label className="text-sm capitalize">{varName.replace('--', '')}</label>
              <input
                type="color"
                value={hslToHex(colors[varName] ?? '0 0% 0%')}
                onChange={(e) => onColorChange(varName, e.target.value)}
              />
            </div>
          ))}
          <Button
            className="mt-4"
            onClick={() => {
              localStorage.removeItem(`customColors-${theme}`);
              const style = getComputedStyle(document.documentElement);
              const defaults: Colors = {};
              COLOR_VARS.forEach((v) => {
                const val = style.getPropertyValue(v).trim();
                defaults[v] = val;
                document.documentElement.style.setProperty(v, val);
              });
              setColors(defaults);
            }}
          >
            Reset Colors
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ThemeSettings;
