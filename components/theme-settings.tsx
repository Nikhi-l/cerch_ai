'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { hexToHSL, hslToHex } from '@/lib/color-utils'

const colorKeys = [
  'background',
  'foreground',
  'primary',
  'secondary',
  'accent',
  'sidebar-background',
  'sidebar-foreground',
  'artifact-background',
  'artifact-heading',
] as const

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [customColors, setCustomColors] = useState<Record<string, string>>({})
  const [defaultColors, setDefaultColors] = useState<Record<string, string>>({})

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('custom-theme-colors')
    if (saved) setCustomColors(JSON.parse(saved))

    const style = getComputedStyle(document.documentElement)
    const defaults: Record<string, string> = {}
    colorKeys.forEach((key) => {
      const hsl = style.getPropertyValue(`--${key}`).trim()
      defaults[key] = hslToHex(hsl)
    })
    setDefaultColors(defaults)
  }, [])

  if (!mounted) return null

  const handleColorChange = (key: string, hex: string) => {
    const next = { ...customColors, [key]: hex }
    setCustomColors(next)
    localStorage.setItem('custom-theme-colors', JSON.stringify(next))
    document.documentElement.style.setProperty(`--${key}`, hexToHSL(hex))
  }

  const resetColors = () => {
    localStorage.removeItem('custom-theme-colors')
    colorKeys.forEach((key) =>
      document.documentElement.style.removeProperty(`--${key}`),
    )
    setCustomColors({})
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Theme settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="theme-mode">Theme Mode</Label>
          <select
            id="theme-mode"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
        {colorKeys.map((key) => (
          <div key={key} className="grid gap-2">
            <Label className="capitalize" htmlFor={key}>{key.replace(/-/g, ' ')}</Label>
            <div className="flex gap-2">
              <Input
                id={key}
                type="color"
                value={customColors[key] || defaultColors[key] || '#ffffff'}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="h-10 w-12 p-1"
              />
              <Input
                type="text"
                value={customColors[key] || defaultColors[key] || '#ffffff'}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        ))}
        <Button onClick={resetColors} variant="outline">
          Reset to Default
        </Button>
      </DialogContent>
    </Dialog>
  )
}
