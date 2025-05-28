'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocalStorage } from 'usehooks-ts'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const THEME_VARS = [
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
] as const

type ThemeVar = (typeof THEME_VARS)[number]

const defaultColors: Record<ThemeVar, string> = Object.fromEntries(
  THEME_VARS.map((v) => [v, '']),
) as Record<ThemeVar, string>

function hexToHsl(hex: string): string {
  let r = 0,
    g = 0,
    b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16)
    g = parseInt(hex[3] + hex[4], 16)
    b = parseInt(hex[5] + hex[6], 16)
  }
  r /= 255
  g /= 255
  b /= 255
  const cmin = Math.min(r, g, b)
  const cmax = Math.max(r, g, b)
  const delta = cmax - cmin
  let h = 0
  let s = 0
  let l = 0

  if (delta !== 0) {
    if (cmax === r) {
      h = ((g - b) / delta) % 6
    } else if (cmax === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }

  l = (cmax + cmin) / 2
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  s = +(s * 100).toFixed(1)
  l = +(l * 100).toFixed(1)
  return `${h} ${s}% ${l}%`
}

function hslToHex(hsl: string): string {
  const [hStr, sStr, lStr] = hsl.trim().split(/\s+/)
  const h = parseFloat(hStr)
  const s = parseFloat(sStr) / 100
  const l = parseFloat(lStr) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function Page() {
  const [colors, setColors] = useLocalStorage<Record<ThemeVar, string>>(
    'theme-colors',
    { ...defaultColors },
  )

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const next: Record<ThemeVar, string> = { ...colors }
    let changed = false
    THEME_VARS.forEach((v) => {
      if (!colors[v]) {
        const hsl = style.getPropertyValue(v).trim()
        if (hsl) {
          next[v] = hslToHex(hsl)
          changed = true
        }
      }
    })
    if (changed) setColors(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    THEME_VARS.forEach((v) => {
      const value = colors[v]
      if (value) {
        document.documentElement.style.setProperty(v, hexToHsl(value))
      } else {
        document.documentElement.style.removeProperty(v)
      }
    })
  }, [colors])

  const updateColor = (key: ThemeVar, value: string) => {
    setColors({ ...colors, [key]: value })
  }

  const resetTheme = () => {
    setColors({ ...defaultColors })
    THEME_VARS.forEach((v) => {
      document.documentElement.style.removeProperty(v)
    })
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Theme Settings</h1>
      <form className="space-y-4">
        {THEME_VARS.map((key) => (
          <div key={key} className="flex items-center gap-4">
            <Label className="w-56" htmlFor={key}>
              {key.replace(/^--/, '')}
            </Label>
            <Input
              id={key}
              type="color"
              value={colors[key] || '#000000'}
              onChange={(e) => updateColor(key, e.target.value)}
              className="w-12 h-8 p-0 border-none bg-transparent"
            />
          </div>
        ))}
      </form>
      <div className="flex gap-4">
        <Button type="button" onClick={resetTheme} variant="secondary">
          Reset to default
        </Button>
        <Button asChild variant="link">
          <Link href="/">Back</Link>
        </Button>
      </div>
    </div>
  )
}
