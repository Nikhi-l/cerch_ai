'use client';

import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export type ThemeVar =
  | '--background'
  | '--foreground'
  | '--card'
  | '--card-foreground'
  | '--popover'
  | '--popover-foreground'
  | '--primary'
  | '--primary-foreground'
  | '--secondary'
  | '--secondary-foreground'
  | '--muted'
  | '--muted-foreground'
  | '--accent'
  | '--accent-foreground'
  | '--destructive'
  | '--destructive-foreground'
  | '--border'
  | '--input'
  | '--ring'
  | '--chart-1'
  | '--chart-2'
  | '--chart-3'
  | '--chart-4'
  | '--chart-5'
  | '--radius'
  | '--sidebar-background'
  | '--sidebar-foreground'
  | '--sidebar-primary'
  | '--sidebar-primary-foreground'
  | '--sidebar-accent'
  | '--sidebar-accent-foreground'
  | '--sidebar-border'
  | '--sidebar-ring';

const themeVars: ThemeVar[] = [
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
  '--radius',
  '--sidebar-background',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
];

export default function ThemeSettingsPage() {
  const [colors, setColors] = useLocalStorage<Record<ThemeVar, string>>(
    'theme-colors',
    {} as Record<ThemeVar, string>,
  );

  useEffect(() => {
    const root = document.documentElement;
    if (Object.keys(colors).length === 0) {
      const defaults: Record<ThemeVar, string> = {} as Record<ThemeVar, string>;
      const styles = getComputedStyle(root);
      for (const key of themeVars) {
        const value = styles.getPropertyValue(key).trim();
        if (value) defaults[key] = value;
      }
      setColors(defaults);
      return;
    }
    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(key, value);
    }
  }, [colors, setColors]);

  const handleChange = (key: ThemeVar) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const resetColors = () => {
    const styles = getComputedStyle(document.documentElement);
    const defaults: Record<ThemeVar, string> = {} as Record<ThemeVar, string>;
    for (const key of themeVars) {
      const value = styles.getPropertyValue(key).trim();
      if (value) defaults[key] = value;
    }
    setColors(defaults);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Theme Settings</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {themeVars.map((key) => (
          <div key={key} className="flex items-center gap-4">
            <Label htmlFor={key}>{key.replace(/--/, '')}</Label>
            <Input
              id={key}
              type="color"
              value={colors[key] || '#ffffff'}
              onChange={handleChange(key)}
              className="h-8 w-16 p-0 border-none bg-transparent"
            />
          </div>
        ))}
      </div>
      <Button type="button" onClick={resetColors} variant="secondary">
        Reset to defaults
      </Button>
    </div>
  );
}
