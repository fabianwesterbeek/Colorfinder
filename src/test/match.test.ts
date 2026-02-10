import { describe, expect, it } from 'vitest';
import { findClosestColors } from '../lib/match';
import { hexToLab } from '../lib/color';
import type { NamedColor } from '../types';

function makeColor(name: string, hex: string): NamedColor {
  const lab = hexToLab(hex);

  if (!lab) {
    throw new Error(`Invalid fixture hex: ${hex}`);
  }

  return { name, hex, lab };
}

describe('findClosestColors', () => {
  it('returns results ordered by increasing deltaE00', () => {
    const colors: NamedColor[] = [
      makeColor('Blue', '#0000FF'),
      makeColor('Green', '#00FF00'),
      makeColor('Red', '#FF0000'),
      makeColor('White', '#FFFFFF'),
      makeColor('Black', '#000000')
    ];

    const results = findClosestColors('#FE0000', colors, 5);

    expect(results).toHaveLength(5);
    expect(results[0]).toBeDefined();
    expect(results[0]!.name).toBe('Red');

    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1]!.deltaE).toBeLessThanOrEqual(results[i]!.deltaE);
    }
  });

  it('uses alphabetical tie-breaker when deltaE00 is equal', () => {
    const tiedLab = hexToLab('#112233');
    if (!tiedLab) {
      throw new Error('Could not create tie fixture');
    }

    const colors: NamedColor[] = [
      { name: 'Zeta', hex: '#112233', lab: tiedLab },
      { name: 'Alpha', hex: '#112233', lab: tiedLab }
    ];

    const results = findClosestColors('#112233', colors, 2);
    expect(results.map((result) => result.name)).toEqual(['Alpha', 'Zeta']);
  });
});
