'use client';

import { useEffect, useState } from 'react';

// Utility functions to convert between HEX and HSL color formats
function hexToHsl(hex: string): string {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return `${h} ${s}% ${l}%`;
}

function hslStringToHex(hsl: string): string {
  const [hStr, sStr, lStr] = hsl.trim().split(/\s+/);
  const h = Number(hStr);
  const s = Number(sStr.replace('%', '')) / 100;
  const l = Number(lStr.replace('%', '')) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const COLOR_VARS: Array<{ label: string; variable: string }> = [
  { label: 'Background', variable: '--background' },
  { label: 'Foreground', variable: '--foreground' },
  { label: 'Chat Bubble', variable: '--primary' },
  { label: 'Accent', variable: '--accent' },
  { label: 'Sidebar Background', variable: '--sidebar-background' },
  { label: 'Sidebar Foreground', variable: '--sidebar-foreground' },
];

export function ThemeCustomizer() {
  const [colors, setColors] = useState<Record<string, string>>({});

  // Load initial colors from CSS variables or localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem('custom-theme');
    if (stored) {
      const parsed: Record<string, string> = JSON.parse(stored);
      setColors(parsed);
      Object.entries(parsed).forEach(([variable, hex]) => {
        document.documentElement.style.setProperty(variable, hexToHsl(hex));
      });
      return;
    }

    const initial: Record<string, string> = {};
    const styles = getComputedStyle(document.documentElement);
    COLOR_VARS.forEach(({ variable }) => {
      const hsl = styles.getPropertyValue(variable);
      if (hsl) initial[variable] = hslStringToHex(hsl);
    });
    setColors(initial);
  }, []);

  // Persist and apply colors when they change
  useEffect(() => {
    if (Object.keys(colors).length === 0) return;
    window.localStorage.setItem('custom-theme', JSON.stringify(colors));
    Object.entries(colors).forEach(([variable, hex]) => {
      document.documentElement.style.setProperty(variable, hexToHsl(hex));
    });
  }, [colors]);

  return (
    <div className="flex flex-col gap-6">
      {COLOR_VARS.map(({ label, variable }) => (
        <div key={variable} className="flex items-center gap-4">
          <label className="w-48" htmlFor={variable}>
            {label}
          </label>
          <input
            id={variable}
            type="color"
            value={colors[variable] || '#000000'}
            onChange={(e) =>
              setColors({ ...colors, [variable]: e.target.value })
            }
          />
        </div>
      ))}
    </div>
  );
}

export default ThemeCustomizer;
