import { describe, expect, it } from 'vitest';
import { hexToHsv, hsvToHex } from '../lib/colorPicker';

function channel(hex: string, offset: number): number {
  return parseInt(hex.slice(offset, offset + 2), 16);
}

function maxChannelDelta(a: string, b: string): number {
  const red = Math.abs(channel(a, 1) - channel(b, 1));
  const green = Math.abs(channel(a, 3) - channel(b, 3));
  const blue = Math.abs(channel(a, 5) - channel(b, 5));
  return Math.max(red, green, blue);
}

describe('color picker HSV conversions', () => {
  it('maps edge colors exactly', () => {
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#FFFFFF');
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe('#000000');
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#FF0000');
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00FF00');
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000FF');
  });

  it('normalizes out-of-range HSV values', () => {
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#FF0000');
    expect(hsvToHex({ h: -120, s: 1, v: 1 })).toBe('#0000FF');
    expect(hsvToHex({ h: 120, s: 4, v: 2 })).toBe('#00FF00');
    expect(hsvToHex({ h: 120, s: -1, v: -1 })).toBe('#000000');
  });

  it('round-trips common hex colors through HSV within 1 channel value', () => {
    const samples = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#156B74', '#DDAA33', '#ABCDEF'];

    for (const hex of samples) {
      const hsv = hexToHsv(hex);
      expect(hsv).not.toBeNull();
      const back = hsvToHex(hsv!);
      expect(maxChannelDelta(back, hex)).toBeLessThanOrEqual(1);
    }
  });

  it('returns null for invalid hex', () => {
    expect(hexToHsv('nope')).toBeNull();
    expect(hexToHsv('#12345')).toBeNull();
  });
});
