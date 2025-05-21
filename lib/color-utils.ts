// Convert hex color to HSL format for CSS variables
export function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

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
    h = Math.round(h * 60);
  }

  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

// Convert an HSL string like "240 10% 50%" to hex
export function hslToHex(hsl: string): string {
  const [hStr, sStr, lStr] = hsl.split(/\s+/)
  const h = parseFloat(hStr)
  const s = parseFloat(sStr) / 100
  const l = parseFloat(lStr) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0,
    g = 0,
    b = 0

  if (h >= 0 && h < 60) {
    r = c
    g = x
  } else if (h >= 60 && h < 120) {
    r = x
    g = c
  } else if (h >= 120 && h < 180) {
    g = c
    b = x
  } else if (h >= 180 && h < 240) {
    g = x
    b = c
  } else if (h >= 240 && h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (v: number) => {
    const h = Math.round((v + m) * 255).toString(16).padStart(2, '0')
    return h
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
