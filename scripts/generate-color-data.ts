import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { converter } from 'culori';
import { colornames } from 'color-name-list';
import cssColorName from 'color-name';
import xkcdColors from 'xkcd-colors';
import type { NamedColor } from '../src/types';

interface SourceEntry {
  name: string;
  hex: string;
}

interface XkcdDataset {
  colors: Array<{
    name: string;
    hex: string;
  }>;
}

const toLab = converter('lab');
const currentFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(currentFile);
const rootDir = path.resolve(scriptDir, '..');
const outputDir = path.join(rootDir, 'src', 'data', 'generated');

function normalizeHex(hex: string): string | null {
  const cleaned = hex.trim().replace(/^#/, '');

  if (!/^[A-Fa-f0-9]{6}$/.test(cleaned)) {
    return null;
  }

  return `#${cleaned.toUpperCase()}`;
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb
    .map((value) => {
      const clamped = Math.max(0, Math.min(255, value));
      return clamped.toString(16).padStart(2, '0');
    })
    .join('')
    .toUpperCase()}`;
}

function toNamedColor(entry: SourceEntry): NamedColor | null {
  const hex = normalizeHex(entry.hex);
  if (!hex) {
    return null;
  }

  const lab = toLab(hex);
  if (!lab || typeof lab.l !== 'number' || typeof lab.a !== 'number' || typeof lab.b !== 'number') {
    return null;
  }

  return {
    name: entry.name.trim(),
    hex,
    lab: [lab.l, lab.a, lab.b]
  };
}

function normalizeEntries(entries: SourceEntry[]): NamedColor[] {
  return entries
    .map(toNamedColor)
    .filter((value): value is NamedColor => value !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function writeDataset(filename: string, colors: NamedColor[]) {
  const outPath = path.join(outputDir, filename);
  await writeFile(outPath, `${JSON.stringify(colors)}\n`, 'utf8');
  console.log(`${filename}: ${colors.length} colors`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const largeSource: SourceEntry[] = colornames.map((entry) => ({
    name: entry.name,
    hex: entry.hex
  }));

  const mediumSource: SourceEntry[] = (xkcdColors as XkcdDataset).colors.map((entry) => ({
    name: entry.name,
    hex: entry.hex
  }));

  const smallSource: SourceEntry[] = Object.entries(cssColorName).map(([name, rgb]) => ({
    name,
    hex: rgbToHex(rgb as [number, number, number])
  }));

  const large = normalizeEntries(largeSource);
  const medium = normalizeEntries(mediumSource);
  const small = normalizeEntries(smallSource);

  await Promise.all([
    writeDataset('large.json', large),
    writeDataset('medium.json', medium),
    writeDataset('small.json', small)
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
