import { describe, expect, it } from 'vitest';
import { COLOR_SETS } from '../data/colorSets';

describe('generated dataset integrity', () => {
  it('contains valid fields and matching counts', () => {
    for (const set of Object.values(COLOR_SETS)) {
      expect(set.count).toBe(set.colors.length);

      for (const color of set.colors) {
        expect(typeof color.name).toBe('string');
        expect(color.name.length).toBeGreaterThan(0);
        expect(color.hex).toMatch(/^#[A-F0-9]{6}$/);
        expect(Array.isArray(color.lab)).toBe(true);
        expect(color.lab).toHaveLength(3);
        expect(color.lab.every((value) => Number.isFinite(value))).toBe(true);
      }
    }
  });
});
