// scripts/utils/perf-agg.js
//
// Pure count/total/max aggregation helpers used by
// scripts/utils/actor-perf-diagnostics.js. Split into their own
// dependency-free module (no absolute /systems/foundryvtt-swse/... imports)
// so the aggregation math itself is unit-testable under plain Node, matching
// the convention used elsewhere in this codebase (e.g.
// scripts/actors/droid/droid-mode-adapter.js, scripts/actors/v2/
// actor-item-index.js) for logic that needs to run outside Foundry.

export function freshAgg() {
  return { count: 0, totalMs: 0, maxMs: 0 };
}

export function recordAgg(agg, durationMs) {
  agg.count += 1;
  agg.totalMs += durationMs;
  if (durationMs > agg.maxMs) agg.maxMs = durationMs;
}

export function aggSummary(agg) {
  return {
    count: agg.count,
    totalMs: Number(agg.totalMs.toFixed(2)),
    avgMs: agg.count ? Number((agg.totalMs / agg.count).toFixed(2)) : 0,
    maxMs: Number(agg.maxMs.toFixed(2))
  };
}
