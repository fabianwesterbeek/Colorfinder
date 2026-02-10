import { performance } from 'node:perf_hooks';
import { COLOR_SETS } from '../src/data/colorSets';
import {
  findClosestColors,
  findClosestColorsLegacy,
  findClosestColorsPrepared,
  findClosestColorsPreparedCulori,
  prepareColorSet
} from '../src/lib/match';
import type { ColorSetId, MatchResult } from '../src/types';

const QUERIES = ['#FF5733', '#00AACC', '#7D3C98', '#F1C40F', '#2ECC71', '#123456', '#ABCDEF', '#0F0F0F', '#FA8072', '#4B0082'];
const MATCH_LIMIT = 10;

const CASES: Array<{ setId: ColorSetId; iterations: number }> = [
  { setId: 'small', iterations: 2500 },
  { setId: 'medium', iterations: 1000 },
  { setId: 'large', iterations: 120 }
];

interface BenchResult {
  averageMs: number;
  opsPerSecond: number;
}

function runBench(iterations: number, matcher: (query: string) => MatchResult[]): BenchResult {
  for (let i = 0; i < 20; i += 1) {
    matcher(QUERIES[i % QUERIES.length]!);
  }

  const start = performance.now();

  for (let i = 0; i < iterations; i += 1) {
    matcher(QUERIES[i % QUERIES.length]!);
  }

  const end = performance.now();
  const averageMs = (end - start) / iterations;

  return {
    averageMs,
    opsPerSecond: 1000 / averageMs
  };
}

function formatSpeedup(baselineMs: number, variantMs: number): string {
  return `${(baselineMs / variantMs).toFixed(2)}x`;
}

let failed = false;

for (const benchCase of CASES) {
  const set = COLOR_SETS[benchCase.setId];
  const prepared = prepareColorSet(set.colors);

  const baseline = runBench(benchCase.iterations, (query) => findClosestColorsLegacy(query, set.colors, MATCH_LIMIT));
  const phase1 = runBench(benchCase.iterations, (query) => findClosestColorsPreparedCulori(query, prepared, MATCH_LIMIT));
  const phase2 = runBench(benchCase.iterations, (query) => findClosestColorsPrepared(query, prepared, MATCH_LIMIT));
  const current = runBench(benchCase.iterations, (query) => findClosestColors(query, set.colors, MATCH_LIMIT));

  console.log(`\n${benchCase.setId.toUpperCase()} (${set.count} colors)`);
  console.log(
    `  baseline (legacy): ${baseline.averageMs.toFixed(3)} ms/query (${baseline.opsPerSecond.toFixed(1)} ops/s)`,
  );
  console.log(
    `  phase1 (prepared+culori): ${phase1.averageMs.toFixed(3)} ms/query (${phase1.opsPerSecond.toFixed(
      1,
    )} ops/s) speedup ${formatSpeedup(baseline.averageMs, phase1.averageMs)}`,
  );
  console.log(
    `  phase2 (numeric): ${phase2.averageMs.toFixed(3)} ms/query (${phase2.opsPerSecond.toFixed(1)} ops/s) speedup ${formatSpeedup(
      baseline.averageMs,
      phase2.averageMs,
    )}`,
  );
  console.log(`  current exported matcher: ${current.averageMs.toFixed(3)} ms/query (${current.opsPerSecond.toFixed(1)} ops/s)`);

  if (benchCase.setId === 'large') {
    const phase1Pass = phase1.averageMs < 8;
    const phase2Pass = phase2.averageMs < 5;
    console.log(`  target phase1 (< 8ms): ${phase1Pass ? 'PASS' : 'FAIL'}`);
    console.log(`  target phase2 (< 5ms): ${phase2Pass ? 'PASS' : 'FAIL'}`);

    if (!phase1Pass || !phase2Pass) {
      failed = true;
    }
  }
}

if (failed) {
  process.exitCode = 1;
}
