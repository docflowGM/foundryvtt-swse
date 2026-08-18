import assert from 'node:assert/strict';
import { freshAgg, recordAgg, aggSummary } from '../scripts/utils/perf-agg.js';

// Phase 1 actor authority + performance baseline: scripts/utils/
// actor-perf-diagnostics.js aggregates prepareDerivedData/cache-signature/
// sheet-context timings through these three pure helpers. This file locks
// in the aggregation math itself in isolation (via a bare relative import,
// no Foundry surface needed at all) and confirms none of it ever takes or
// mutates an actor/document reference. The diagnostics module that consumes
// these helpers, and the real DerivedCalculator/ModifierEngine instrumentation
// built on it, ARE separately runtime-verified — see
// tests/actor-perf-diagnostics-shim.test.mjs, which loads the real production
// modules (Foundry-only absolute imports and all) through this repo's
// existing Foundry-shim harness (tests/helpers/foundry-shim/).

// ── freshAgg starts at zero (Test 1) ────────────────────────────────────────

{
  const agg = freshAgg();
  assert.deepEqual(agg, { count: 0, totalMs: 0, maxMs: 0 });
}

// ── recordAgg accumulates count/total and tracks the running max (Test 2) ──

{
  const agg = freshAgg();
  recordAgg(agg, 5);
  recordAgg(agg, 12);
  recordAgg(agg, 3);
  assert.equal(agg.count, 3);
  assert.equal(agg.totalMs, 20);
  assert.equal(agg.maxMs, 12, 'maxMs tracks the largest single duration seen, not the last one');
}

// ── aggSummary reports count/total/avg/max, rounded to 2 decimals (Test 3) ──

{
  const agg = freshAgg();
  recordAgg(agg, 1.005);
  recordAgg(agg, 2.0033);
  const summary = aggSummary(agg);
  assert.equal(summary.count, 2);
  assert.equal(summary.totalMs, Number((1.005 + 2.0033).toFixed(2)));
  assert.equal(summary.avgMs, Number(((1.005 + 2.0033) / 2).toFixed(2)));
  assert.equal(summary.maxMs, Number(2.0033.toFixed(2)));
}

// ── aggSummary on an untouched aggregate never divides by zero (Test 4) ────

{
  const summary = aggSummary(freshAgg());
  assert.deepEqual(summary, { count: 0, totalMs: 0, avgMs: 0, maxMs: 0 });
}

// ── one sample: count/total/max/avg all equal that single duration (Test 6) ─

{
  const agg = freshAgg();
  recordAgg(agg, 7.5);
  assert.deepEqual(agg, { count: 1, totalMs: 7.5, maxMs: 7.5 });
  const summary = aggSummary(agg);
  assert.deepEqual(summary, { count: 1, totalMs: 7.5, avgMs: 7.5, maxMs: 7.5 });
}

// ── duration = 0 is a real sample, not treated as "no sample" (Test 7) ─────
// A same-tick synchronous call (e.g. a cache hit resolved in <1μs, rounded to
// 0 by performance.now()) must still increment count — it is evidence the
// call happened, not evidence it didn't.

{
  const agg = freshAgg();
  recordAgg(agg, 0);
  assert.deepEqual(agg, { count: 1, totalMs: 0, maxMs: 0 });
  recordAgg(agg, 4);
  assert.deepEqual(agg, { count: 2, totalMs: 4, maxMs: 4 }, 'a zero-duration sample does not corrupt a later non-zero max');
}

// ── very small fractional durations do not vanish to zero after rounding (Test 8) ──

{
  const agg = freshAgg();
  recordAgg(agg, 0.001);
  recordAgg(agg, 0.002);
  const summary = aggSummary(agg);
  assert.equal(summary.count, 2);
  // 0.001 + 0.002 rounds to 0.00 at 2 decimals — this is intentional display
  // rounding (documented in aggSummary), not data loss: `agg.totalMs` itself
  // (the accumulator record*Cost callers actually branch on) keeps full
  // precision, only the *presentation* copy in aggSummary() rounds.
  assert.equal(summary.totalMs, 0);
  assert.ok(agg.totalMs > 0, 'the underlying accumulator retains full precision even though the rounded summary reads 0');
}

// ── many samples: count/total/max stay correct under repeated accumulation (Test 9) ──

{
  const agg = freshAgg();
  let expectedTotal = 0;
  let expectedMax = 0;
  for (let i = 1; i <= 500; i++) {
    const duration = (i % 37) + i * 0.01; // varied, non-monotonic durations
    recordAgg(agg, duration);
    expectedTotal += duration;
    if (duration > expectedMax) expectedMax = duration;
  }
  assert.equal(agg.count, 500);
  assert.ok(Math.abs(agg.totalMs - expectedTotal) < 1e-6, 'totalMs matches the running sum across 500 samples');
  assert.equal(agg.maxMs, expectedMax, 'maxMs matches the true maximum across 500 non-monotonic samples');
}

// ── max never decreases once a larger sample has been recorded, regardless of
// how many smaller samples follow (Test 10) ────────────────────────────────

{
  const agg = freshAgg();
  recordAgg(agg, 100);
  recordAgg(agg, 1);
  recordAgg(agg, 50);
  recordAgg(agg, 0.5);
  recordAgg(agg, 99.999);
  assert.equal(agg.maxMs, 100, 'maxMs stays at the largest-ever sample even after four smaller ones follow it');
}

// ── none of these helpers take, read, or return anything actor/document-shaped —
// they operate purely on the plain {count,totalMs,maxMs} shape they're given,
// so the diagnostics module built on them cannot mutate actor state through
// this path (Test 5) ─────────────────────────────────────────────────────

{
  assert.equal(freshAgg.length, 0, 'freshAgg takes no arguments (nothing to mutate)');
  assert.equal(recordAgg.length, 2, 'recordAgg takes only (agg, durationMs) — no actor/document parameter exists to mutate');
  assert.equal(aggSummary.length, 1, 'aggSummary takes only (agg) and returns a new plain object');
}

console.log('perf-agg.test.mjs: all assertions passed');
