import { differenceCiede2000 } from 'culori';
import type { MatchResult, NamedColor } from '../types';
import { hexToLab } from './color';

const deltaE00 = differenceCiede2000();

function compareMatches(left: MatchResult, right: MatchResult): number {
  if (left.deltaE !== right.deltaE) {
    return left.deltaE - right.deltaE;
  }

  return left.name.localeCompare(right.name);
}

function asLabColor(lab: [number, number, number]) {
  return {
    mode: 'lab' as const,
    l: lab[0],
    a: lab[1],
    b: lab[2]
  };
}

export function findClosestColors(inputHex: string, colors: NamedColor[], limit = 10): MatchResult[] {
  if (limit <= 0) {
    return [];
  }

  const inputLab = hexToLab(inputHex);

  if (!inputLab) {
    return [];
  }

  const input = asLabColor(inputLab);
  const topMatches: MatchResult[] = [];

  for (const color of colors) {
    const deltaE = deltaE00(input, asLabColor(color.lab));
    const match: MatchResult = {
      ...color,
      deltaE
    };

    if (topMatches.length === 0) {
      topMatches.push(match);
      continue;
    }

    let insertIndex = topMatches.length;
    for (let i = 0; i < topMatches.length; i += 1) {
      const existing = topMatches[i];
      if (existing && compareMatches(match, existing) < 0) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex < limit || topMatches.length < limit) {
      topMatches.splice(insertIndex, 0, match);
      if (topMatches.length > limit) {
        topMatches.pop();
      }
    }
  }

  return topMatches;
}
