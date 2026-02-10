import { differenceCiede2000 } from 'culori';
import type { Lab, MatchResult, NamedColor } from '../types';
import { hexToLab, labToLab65 } from './color';

interface LabColor {
  mode: 'lab';
  l: number;
  a: number;
  b: number;
}

interface Lab65Color {
  mode: 'lab65';
  l: number;
  a: number;
  b: number;
}

export interface PreparedColorSet {
  names: string[];
  hexes: string[];
  labs: Lab[];
  lab65Values: Float64Array;
  lab65Objects: Lab65Color[];
}

const deltaE00 = differenceCiede2000();
const PREPARED_CACHE = new WeakMap<NamedColor[], PreparedColorSet>();
const CIE25_POW_7 = 6103515625; // 25^7

function compareByDeltaAndName(deltaE: number, name: string, existing: MatchResult): number {
  if (deltaE !== existing.deltaE) {
    return deltaE - existing.deltaE;
  }

  return name.localeCompare(existing.name);
}

function asLabColor(lab: Lab): LabColor {
  return {
    mode: 'lab',
    l: lab[0],
    a: lab[1],
    b: lab[2]
  };
}

function asLab65Color(lab: Lab): Lab65Color {
  return {
    mode: 'lab65',
    l: lab[0],
    a: lab[1],
    b: lab[2]
  };
}

export function prepareColorSet(colors: NamedColor[]): PreparedColorSet {
  const cached = PREPARED_CACHE.get(colors);
  if (cached) {
    return cached;
  }

  const names: string[] = [];
  const hexes: string[] = [];
  const labs: Lab[] = [];
  const lab65Values = new Float64Array(colors.length * 3);
  const lab65Objects: Lab65Color[] = [];

  for (let index = 0; index < colors.length; index += 1) {
    const color = colors[index];
    if (!color) {
      continue;
    }

    const preparedIndex = names.length;
    names.push(color.name);
    hexes.push(color.hex);
    labs.push(color.lab);

    const lab65 = labToLab65(color.lab);
    const offset = preparedIndex * 3;
    lab65Values[offset] = lab65[0];
    lab65Values[offset + 1] = lab65[1];
    lab65Values[offset + 2] = lab65[2];
    lab65Objects.push(asLab65Color(lab65));
  }

  const prepared: PreparedColorSet = {
    names,
    hexes,
    labs,
    lab65Values,
    lab65Objects
  };

  PREPARED_CACHE.set(colors, prepared);
  return prepared;
}

export function ciede2000Lab65(l1: number, a1: number, b1: number, l2: number, a2: number, b2: number): number {
  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const cBar = (c1 + c2) * 0.5;
  const cBar7 = cBar * cBar * cBar * cBar * cBar * cBar * cBar;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + CIE25_POW_7)));

  const a1Prime = a1 * (1 + g);
  const a2Prime = a2 * (1 + g);
  const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  let h1Prime = Math.abs(a1Prime) + Math.abs(b1) === 0 ? 0 : Math.atan2(b1, a1Prime);
  if (h1Prime < 0) {
    h1Prime += 2 * Math.PI;
  }

  let h2Prime = Math.abs(a2Prime) + Math.abs(b2) === 0 ? 0 : Math.atan2(b2, a2Prime);
  if (h2Prime < 0) {
    h2Prime += 2 * Math.PI;
  }

  const deltaLPrime = l2 - l1;
  const deltaCPrime = c2Prime - c1Prime;

  let deltaHPrimeAngle = c1Prime * c2Prime === 0 ? 0 : h2Prime - h1Prime;
  if (deltaHPrimeAngle > Math.PI) {
    deltaHPrimeAngle -= 2 * Math.PI;
  } else if (deltaHPrimeAngle < -Math.PI) {
    deltaHPrimeAngle += 2 * Math.PI;
  }

  const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(deltaHPrimeAngle / 2);
  const lPrimeAverage = (l1 + l2) * 0.5;
  const cPrimeAverage = (c1Prime + c2Prime) * 0.5;

  let hPrimeAverage: number;
  if (c1Prime * c2Prime === 0) {
    hPrimeAverage = h1Prime + h2Prime;
  } else {
    hPrimeAverage = (h1Prime + h2Prime) * 0.5;
    if (Math.abs(h1Prime - h2Prime) > Math.PI) {
      hPrimeAverage -= Math.PI;
    }
    if (hPrimeAverage < 0) {
      hPrimeAverage += 2 * Math.PI;
    }
  }

  const lPrimeMinus50Squared = (lPrimeAverage - 50) * (lPrimeAverage - 50);
  const t =
    1 -
    0.17 * Math.cos(hPrimeAverage - Math.PI / 6) +
    0.24 * Math.cos(2 * hPrimeAverage) +
    0.32 * Math.cos(3 * hPrimeAverage + Math.PI / 30) -
    0.2 * Math.cos(4 * hPrimeAverage - (63 * Math.PI) / 180);

  const sL = 1 + (0.015 * lPrimeMinus50Squared) / Math.sqrt(20 + lPrimeMinus50Squared);
  const sC = 1 + 0.045 * cPrimeAverage;
  const sH = 1 + 0.015 * cPrimeAverage * t;

  const deltaTheta = (Math.PI / 6) * Math.exp(-Math.pow(((180 / Math.PI) * hPrimeAverage - 275) / 25, 2));
  const cPrimeAverage7 =
    cPrimeAverage *
    cPrimeAverage *
    cPrimeAverage *
    cPrimeAverage *
    cPrimeAverage *
    cPrimeAverage *
    cPrimeAverage;
  const rC = 2 * Math.sqrt(cPrimeAverage7 / (cPrimeAverage7 + CIE25_POW_7));
  const rT = -Math.sin(2 * deltaTheta) * rC;

  const dL = deltaLPrime / sL;
  const dC = deltaCPrime / sC;
  const dH = deltaHPrime / sH;

  return Math.sqrt(dL * dL + dC * dC + dH * dH + rT * dC * dH);
}

export function findClosestColorsLegacy(inputHex: string, colors: NamedColor[], limit = 10): MatchResult[] {
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
    const match: MatchResult = { ...color, deltaE };

    let insertIndex = topMatches.length;
    for (let i = 0; i < topMatches.length; i += 1) {
      const existing = topMatches[i];
      if (existing && compareByDeltaAndName(match.deltaE, match.name, existing) < 0) {
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

export function findClosestColorsPreparedCulori(inputHex: string, prepared: PreparedColorSet, limit = 10): MatchResult[] {
  if (limit <= 0) {
    return [];
  }

  const inputLab = hexToLab(inputHex);
  if (!inputLab) {
    return [];
  }
  const inputLab65 = labToLab65(inputLab);

  const input = asLab65Color(inputLab65);
  const names = prepared.names;
  const hexes = prepared.hexes;
  const labs = prepared.labs;
  const lab65Objects = prepared.lab65Objects;
  const topMatches: MatchResult[] = [];

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index]!;
    const deltaE = deltaE00(input, lab65Objects[index]!);

    if (topMatches.length === limit) {
      const worstMatch = topMatches[topMatches.length - 1];
      if (worstMatch && compareByDeltaAndName(deltaE, name, worstMatch) >= 0) {
        continue;
      }
    }

    let insertIndex = topMatches.length;
    for (let i = 0; i < topMatches.length; i += 1) {
      const existing = topMatches[i];
      if (existing && compareByDeltaAndName(deltaE, name, existing) < 0) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex < limit || topMatches.length < limit) {
      topMatches.splice(insertIndex, 0, {
        name,
        hex: hexes[index]!,
        lab: labs[index]!,
        deltaE
      });
      if (topMatches.length > limit) {
        topMatches.pop();
      }
    }
  }

  return topMatches;
}

export function findClosestColorsPrepared(inputHex: string, prepared: PreparedColorSet, limit = 10): MatchResult[] {
  if (limit <= 0) {
    return [];
  }

  const inputLab = hexToLab(inputHex);
  if (!inputLab) {
    return [];
  }
  const inputLab65 = labToLab65(inputLab);

  const [l1, a1, b1] = inputLab65;
  const names = prepared.names;
  const hexes = prepared.hexes;
  const labs = prepared.labs;
  const lab65Values = prepared.lab65Values;
  const topMatches: MatchResult[] = [];

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index]!;
    const offset = index * 3;
    const l2 = lab65Values[offset];
    const a2 = lab65Values[offset + 1];
    const b2 = lab65Values[offset + 2];

    if (l2 === undefined || a2 === undefined || b2 === undefined) {
      continue;
    }

    const deltaE = ciede2000Lab65(
      l1,
      a1,
      b1,
      l2,
      a2,
      b2,
    );

    if (topMatches.length === limit) {
      const worstMatch = topMatches[topMatches.length - 1];
      if (worstMatch && compareByDeltaAndName(deltaE, name, worstMatch) >= 0) {
        continue;
      }
    }

    let insertIndex = topMatches.length;
    for (let i = 0; i < topMatches.length; i += 1) {
      const existing = topMatches[i];
      if (existing && compareByDeltaAndName(deltaE, name, existing) < 0) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex < limit || topMatches.length < limit) {
      topMatches.splice(insertIndex, 0, {
        name,
        hex: hexes[index]!,
        lab: labs[index]!,
        deltaE
      });
      if (topMatches.length > limit) {
        topMatches.pop();
      }
    }
  }

  return topMatches;
}

export function findClosestColors(inputHex: string, colors: NamedColor[], limit = 10): MatchResult[] {
  return findClosestColorsPrepared(inputHex, prepareColorSet(colors), limit);
}
