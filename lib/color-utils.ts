// Convert hex color to HSL format for CSS variables
export function hexToHSL(hex: string): string {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  let l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h = Math.round(h * 60)
  }
  s = Math.round(s * 100)
  l = Math.round(l * 100)
  return `${h} ${s}% ${l}%`
}

export function hslToHex(hsl: string): string {
  const [h, sPart, lPart] = hsl.split(/\s+/)
  const s = parseFloat(sPart) / 100
  const l = parseFloat(lPart) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hh = parseFloat(h) / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  let r = 0, g = 0, b = 0
  if (hh >= 0 && hh < 1) {
    r = c
    g = x
  } else if (hh >= 1 && hh < 2) {
    r = x
    g = c
  } else if (hh >= 2 && hh < 3) {
    g = c
    b = x
  } else if (hh >= 3 && hh < 4) {
    g = x
    b = c
  } else if (hh >= 4 && hh < 5) {
    r = x
    b = c
  } else if (hh >= 5 && hh < 6) {
    r = c
    b = x
  }
  const m = l - c / 2
  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16).padStart(2, '0')
    return hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
