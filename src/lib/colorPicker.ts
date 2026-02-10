import { normalizeHex } from './color';

export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHue(hue: number): number {
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function toHexChannel(value: number): string {
  const rounded = Math.round(clamp(value, 0, 1) * 255);
  return rounded.toString(16).padStart(2, '0').toUpperCase();
}

export function hsvToHex(color: HsvColor): string {
  const hue = normalizeHue(color.h);
  const saturation = clamp(color.s, 0, 1);
  const value = clamp(color.v, 0, 1);

  const chroma = value * saturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = value - chroma;
  const r = red + match;
  const g = green + match;
  const b = blue + match;

  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

export function hexToHsv(hex: string): HsvColor | null {
  const normalized = normalizeHex(hex);

  if (!normalized) {
    return null;
  }

  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;

  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
  }

  const h = normalizeHue(hue * 60);
  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}
