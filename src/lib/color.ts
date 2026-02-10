import { converter } from 'culori';
import type { Lab } from '../types';

const HEX_PATTERN = /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
const toLab = converter('lab');

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim();

  if (!HEX_PATTERN.test(trimmed)) {
    return null;
  }

  const withoutHash = trimmed.replace('#', '');
  const expanded =
    withoutHash.length === 3
      ? withoutHash
          .split('')
          .map((char) => char + char)
          .join('')
      : withoutHash;

  return `#${expanded.toUpperCase()}`;
}

export function isValidHex(input: string): boolean {
  return normalizeHex(input) !== null;
}

export function hexToLab(hex: string): Lab | null {
  const normalized = normalizeHex(hex);

  if (!normalized) {
    return null;
  }

  const lab = toLab(normalized);

  if (!lab || typeof lab.l !== 'number' || typeof lab.a !== 'number' || typeof lab.b !== 'number') {
    return null;
  }

  return [lab.l, lab.a, lab.b];
}
