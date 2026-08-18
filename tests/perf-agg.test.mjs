import assert from 'node:assert/strict';
import { freshAgg, recordAgg, aggSummary } from '../scripts/utils/perf-agg.js';

// Phase 1 actor authority + performance baseline: scripts/utils/
// actor-perf-diagnostics.js aggregates prepareDerivedData/cache-signature/
// sheet-context timings through these three pure helpers. The diagnostics
// module itself imports Foundry-only absolute paths (matching the rest of
// this codebase's convention for engine-facing files, see
// docs/audits/rolling-system-alignment-phase-5.md's Force-power-track
// exclusion notes) and so cannot be imported directly under plain Node —
// these tests instead lock in the aggregation math it depends on, and
// confirm none of it ever takes or mutates an actor/document reference.

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
