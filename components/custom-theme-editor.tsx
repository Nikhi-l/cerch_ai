'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes'; // Added
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface CustomThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const themeVariables = [
  { name: 'background', label: 'Background' },
  { name: 'foreground', label: 'Foreground' },
  { name: 'card', label: 'Card Background' },
  { name: 'card-foreground', label: 'Card Foreground' },
  { name: 'popover', label: 'Popover Background' },
  { name: 'popover-foreground', label: 'Popover Foreground' },
  { name: 'primary', label: 'Primary' },
  { name: 'primary-foreground', label: 'Primary Foreground' },
  { name: 'secondary', label: 'Secondary' },
  { name: 'secondary-foreground', label: 'Secondary Foreground' },
  { name: 'muted', label: 'Muted' },
  { name: 'muted-foreground', label: 'Muted Foreground' },
  { name: 'accent', label: 'Accent' },
  { name: 'accent-foreground', label: 'Accent Foreground' },
  { name: 'destructive', label: 'Destructive' },
  { name: 'destructive-foreground', label: 'Destructive Foreground' },
  { name: 'border', label: 'Border' },
  { name: 'input', label: 'Input Background' },
  { name: 'ring', label: 'Ring' },
  { name: 'radius', label: 'Border Radius (e.g., 0.5rem)' },
  // Chart colors
  { name: 'chart-1', label: 'Chart Color 1' },
  { name: 'chart-2', label: 'Chart Color 2' },
  { name: 'chart-3', label: 'Chart Color 3' },
  { name: 'chart-4', label: 'Chart Color 4' },
  { name: 'chart-5', label: 'Chart Color 5' },
  // Sidebar specific colors
  { name: 'sidebar-background', label: 'Sidebar Background' },
  { name: 'sidebar-foreground', label: 'Sidebar Foreground' },
  { name: 'sidebar-primary', label: 'Sidebar Primary' },
  { name: 'sidebar-primary-foreground', label: 'Sidebar Primary Foreground' },
  { name: 'sidebar-accent', label: 'Sidebar Accent' },
  { name: 'sidebar-accent-foreground', label: 'Sidebar Accent Foreground' },
  { name: 'sidebar-border', label: 'Sidebar Border' },
  { name: 'sidebar-ring', label: 'Sidebar Ring' },
];

export function CustomThemeEditor({ isOpen, onClose }: CustomThemeEditorProps) {
  const { setTheme } = useTheme(); // Added
  const [currentThemeValues, setCurrentThemeValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const styles = getComputedStyle(document.documentElement);
      const initialValues: Record<string, string> = {};
      themeVariables.forEach(variable => {
        // Ensure variable name has '--' prefix for CSS lookup
        initialValues[variable.name] = styles.getPropertyValue(`--${variable.name}`).trim();
      });
      setCurrentThemeValues(initialValues);
    }
  }, [isOpen]);

  const handleInputChange = (name: string, value: string) => {
    setCurrentThemeValues(prev => ({ ...prev, [name]: value }));
    // Apply change directly to the document's root style
    document.documentElement.style.setProperty(`--${name}`, value);
  };

  const handleSave = () => {
    // Save to local storage
    localStorage.setItem('custom-theme-colors', JSON.stringify(currentThemeValues));
    // Set the theme to 'custom' using next-themes
    setTheme('custom');
    // The live updates are already visible.
    // next-themes will add class="custom" to html. Our inline styles will persist.
    console.log('Custom theme values saved to local storage and theme set to "custom".');
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Theme</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {themeVariables.map(variable => (
            <div key={variable.name} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={variable.name} className="text-right">
                {variable.label}
              </Label>
              <Input
                id={variable.name}
                name={variable.name}
                value={currentThemeValues[variable.name] || ''}
                onChange={(e) => handleInputChange(variable.name, e.target.value)}
                placeholder={variable.name === 'radius' ? 'e.g., 0.5rem' : 'e.g., 0 0% 100%'}
                className="col-span-2"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomThemeEditor;
