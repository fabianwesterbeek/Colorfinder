import { converter } from 'culori';
import type { Lab } from '../types';

const HEX_PATTERN = /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
const toLab = converter('lab');
const toLab65 = converter('lab65');

function asLabTuple(value: { l?: number; a?: number; b?: number } | undefined): Lab | null {
  if (!value || typeof value.l !== 'number' || typeof value.a !== 'number' || typeof value.b !== 'number') {
    return null;
  }

  return [value.l, value.a, value.b];
}

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

  return asLabTuple(toLab(normalized));
}

export function labToLab65(lab: Lab): Lab {
  const converted = asLabTuple(
    toLab65({
      mode: 'lab',
      l: lab[0],
      a: lab[1],
      b: lab[2]
    }),
  );

  if (!converted) {
    throw new Error('Could not convert Lab to Lab65');
  }

  return converted;
}

export function hexToLab65(hex: string): Lab | null {
  const normalized = normalizeHex(hex);

  if (!normalized) {
    return null;
  }

  return asLabTuple(toLab65(normalized));
}
