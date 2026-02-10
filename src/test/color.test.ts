import { describe, expect, it } from 'vitest';
import { hexToLab, isValidHex, normalizeHex } from '../lib/color';

describe('hex normalization and validation', () => {
  it('accepts valid hex formats', () => {
    expect(normalizeHex('#fff')).toBe('#FFFFFF');
    expect(normalizeHex('fff')).toBe('#FFFFFF');
    expect(normalizeHex('#1a2b3c')).toBe('#1A2B3C');
    expect(normalizeHex('1A2B3C')).toBe('#1A2B3C');
  });

  it('rejects invalid hex formats', () => {
    expect(normalizeHex('#12')).toBeNull();
    expect(normalizeHex('gggggg')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });

  it('can convert valid hex to lab', () => {
    expect(hexToLab('#FF0000')).not.toBeNull();
    expect(isValidHex('#abc')).toBe(true);
    expect(isValidHex('xyz')).toBe(false);
  });
});
