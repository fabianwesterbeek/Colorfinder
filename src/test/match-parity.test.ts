import { describe, expect, it } from 'vitest';
import { COLOR_SETS } from '../data/colorSets';
import { hexToLab } from '../lib/color';
import {
  findClosestColors,
  findClosestColorsLegacy,
  findClosestColorsPrepared,
  findClosestColorsPreparedCulori,
  prepareColorSet
} from '../lib/match';
import type { MatchResult, NamedColor } from '../types';

const FIXED_QUERIES = ['#FF5733', '#00AACC', '#7D3C98', '#F1C40F', '#2ECC71', '#123456', '#ABCDEF', '#0F0F0F'];
const MAX_DELTA_DIFF = 1e-12;

function expectEquivalentMatches(left: MatchResult[], right: MatchResult[]) {
  expect(left).toHaveLength(right.length);

  for (let i = 0; i < left.length; i += 1) {
    const leftMatch = left[i];
    const rightMatch = right[i];

    expect(leftMatch).toBeDefined();
    expect(rightMatch).toBeDefined();
    if (!leftMatch || !rightMatch) {
      continue;
    }

    expect(leftMatch.name).toBe(rightMatch.name);
    expect(Math.abs(leftMatch.deltaE - rightMatch.deltaE)).toBeLessThanOrEqual(MAX_DELTA_DIFF);
  }
}

function makeRandomHexes(count: number, seed: number): string[] {
  let state = seed >>> 0;
  const queries: string[] = [];

  for (let i = 0; i < count; i += 1) {
    state = (1664525 * state + 1013904223) >>> 0;
    const value = state & 0xffffff;
    queries.push(`#${value.toString(16).padStart(6, '0').toUpperCase()}`);
  }

  return queries;
}

describe('matcher parity gates', () => {
  it('matches legacy, phase1, and phase2 on fixed queries for all datasets', () => {
    for (const set of Object.values(COLOR_SETS)) {
      const prepared = prepareColorSet(set.colors);

      for (const query of FIXED_QUERIES) {
        const legacy = findClosestColorsLegacy(query, set.colors, 10);
        const phase1 = findClosestColorsPreparedCulori(query, prepared, 10);
        const phase2 = findClosestColorsPrepared(query, prepared, 10);
        const current = findClosestColors(query, set.colors, 10);

        expectEquivalentMatches(legacy, phase1);
        expectEquivalentMatches(legacy, phase2);
        expectEquivalentMatches(phase2, current);
      }
    }
  });

  it(
    'matches legacy, phase1, and phase2 on randomized large-set queries',
    { timeout: 30000 },
    () => {
      const colors = COLOR_SETS.large.colors;
      const prepared = prepareColorSet(colors);
      const randomQueries = makeRandomHexes(200, 0xC0FFEE);

      for (const query of randomQueries) {
        const legacy = findClosestColorsLegacy(query, colors, 10);
        const phase1 = findClosestColorsPreparedCulori(query, prepared, 10);
        const phase2 = findClosestColorsPrepared(query, prepared, 10);

        expectEquivalentMatches(legacy, phase1);
        expectEquivalentMatches(legacy, phase2);
      }
    },
  );

  it('keeps alphabetical tie-break behavior in all matcher variants', () => {
    const tiedLab = hexToLab('#112233');

    if (!tiedLab) {
      throw new Error('Could not build tie-break fixture');
    }

    const colors: NamedColor[] = [
      { name: 'Zeta', hex: '#112233', lab: tiedLab },
      { name: 'Alpha', hex: '#112233', lab: tiedLab }
    ];
    const prepared = prepareColorSet(colors);

    const legacy = findClosestColorsLegacy('#112233', colors, 2);
    const phase1 = findClosestColorsPreparedCulori('#112233', prepared, 2);
    const phase2 = findClosestColorsPrepared('#112233', prepared, 2);
    const current = findClosestColors('#112233', colors, 2);

    expect(legacy.map((result) => result.name)).toEqual(['Alpha', 'Zeta']);
    expect(phase1.map((result) => result.name)).toEqual(['Alpha', 'Zeta']);
    expect(phase2.map((result) => result.name)).toEqual(['Alpha', 'Zeta']);
    expect(current.map((result) => result.name)).toEqual(['Alpha', 'Zeta']);
  });
});
