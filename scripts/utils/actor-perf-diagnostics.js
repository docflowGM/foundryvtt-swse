// scripts/utils/actor-perf-diagnostics.js
//
// Phase 1 (actor authority + performance baseline) instrumentation.
//
// This module does NOT introduce a new profiler. It is a thin aggregation
// layer built on the existing `isPerformanceDiagnosticsEnabled()` gate and
// `performance.now()`, following the same shape as the pre-existing
// `HookPerformanceMonitor` (scripts/utils/hook-performance.js) and the
// progression render-stats module (scripts/apps/progression-framework/debug/
// progression-render-stats.js): plain counters/aggregates behind a single
// enabled-check, read via SWSE.debug.performance.* console commands.
//
// Disabled by default (game.settings 'performanceDiagnostics' / 'debugMode').
// Every record* method bails out before touching a Map or calling
// performance.now() when diagnostics are off, so the steady-state cost is a
// single boolean settings read per call site — see
// docs/audits/v2-actor-authority-performance-phase-1.md for measurements.
//
// This module never mutates actor documents; it only reads timings/labels
// passed in by callers and stores them in module-local aggregate state.

import { isPerformanceDiagnosticsEnabled } from "/systems/foundryvtt-swse/scripts/utils/performance-utils.js";
import { freshAgg, recordAgg, aggSummary } from "./perf-agg.js";

function now() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
}

// ---------------------------------------------------------------------------
// Per-actor prepareDerivedData timings (sync mirror pass + async
// DerivedCalculator.computeAll pass). Keyed by actor id so
// SWSE.debug.performance.actor(actor) can report just that actor's history.
// ---------------------------------------------------------------------------
const _prepareByActor = new Map();

function getActorBucket(actorId) {
  let bucket = _prepareByActor.get(actorId);
  if (!bucket) {
    bucket = { sync: freshAgg(), async: freshAgg(), lastSyncMs: 0, lastAsyncMs: 0 };
    _prepareByActor.set(actorId, bucket);
  }
  return bucket;
}

// ---------------------------------------------------------------------------
// DerivedCalculator cache + signature-generation cost.
// ---------------------------------------------------------------------------
const _derivedCache = { hits: 0, misses: 0, inFlightJoins: 0 };
const _derivedSignature = freshAgg();

// ---------------------------------------------------------------------------
// ModifierEngine cache + signature-generation cost (three independent caches:
// source/aggregate/breakdown — see ModifierEngine.js).
// ---------------------------------------------------------------------------
const _modifierCache = {
  source: { hits: 0, misses: 0 },
  aggregate: { hits: 0, misses: 0 },
  breakdown: { hits: 0, misses: 0 }
};
const _modifierSignature = freshAgg();

// ---------------------------------------------------------------------------
// Sheet context-build durations, per actor type.
// ---------------------------------------------------------------------------
const _sheetContext = new Map(); // sheetType -> agg

// ---------------------------------------------------------------------------
// Async-derived follow-up render bookkeeping (how many renders were actually
// queued after DerivedCalculator.computeAll() resolved, vs. how many were
// suppressed/coalesced by the existing depth/timestamp guard in base-actor.js).
// ---------------------------------------------------------------------------
const _renders = { queued: 0, suppressed: 0, skippedNoChange: 0 };

export const ActorPerfDiagnostics = {
  /**
   * Record one prepareDerivedData phase for an actor.
   * @param {string} actorId
   * @param {'sync'|'async'} phase
   * @param {number} durationMs
   */
  recordPreparePhase(actorId, phase, durationMs) {
    if (!isPerformanceDiagnosticsEnabled() || !actorId) return;
    const bucket = getActorBucket(actorId);
    if (phase === 'async') {
      recordAgg(bucket.async, durationMs);
      bucket.lastAsyncMs = durationMs;
    } else {
      recordAgg(bucket.sync, durationMs);
      bucket.lastSyncMs = durationMs;
    }
  },

  /** @param {'hit'|'miss'|'inflight'} event */
  recordDerivedCacheEvent(event) {
    if (!isPerformanceDiagnosticsEnabled()) return;
    if (event === 'hit') _derivedCache.hits += 1;
    else if (event === 'inflight') _derivedCache.inFlightJoins += 1;
    else _derivedCache.misses += 1;
  },

  recordDerivedSignatureCost(durationMs) {
    if (!isPerformanceDiagnosticsEnabled()) return;
    recordAgg(_derivedSignature, durationMs);
  },

  /**
   * @param {'source'|'aggregate'|'breakdown'} cacheName
   * @param {'hit'|'miss'} event
   */
  recordModifierCacheEvent(cacheName, event) {
    if (!isPerformanceDiagnosticsEnabled()) return;
    const bucket = _modifierCache[cacheName];
    if (!bucket) return;
    if (event === 'hit') bucket.hits += 1;
    else bucket.misses += 1;
  },

  recordModifierSignatureCost(durationMs) {
    if (!isPerformanceDiagnosticsEnabled()) return;
    recordAgg(_modifierSignature, durationMs);
  },

  /** @param {'character'|'npc'|'droid'|'vehicle'} sheetType */
  recordSheetContext(sheetType, durationMs) {
    if (!isPerformanceDiagnosticsEnabled() || !sheetType) return;
    let agg = _sheetContext.get(sheetType);
    if (!agg) {
      agg = freshAgg();
      _sheetContext.set(sheetType, agg);
    }
    recordAgg(agg, durationMs);
  },

  recordRenderQueued() {
    if (!isPerformanceDiagnosticsEnabled()) return;
    _renders.queued += 1;
  },

  recordRenderSuppressed() {
    if (!isPerformanceDiagnosticsEnabled()) return;
    _renders.suppressed += 1;
  },

  recordRenderSkippedNoChange() {
    if (!isPerformanceDiagnosticsEnabled()) return;
    _renders.skippedNoChange += 1;
  },

  /**
   * Time a synchronous or async function body, recording the duration under
   * `label` via `recorder` only when diagnostics are enabled. Cheap no-op
   * wrapper when disabled — still calls fn, just skips the timing.
   */
  time(recorder, fn) {
    if (!isPerformanceDiagnosticsEnabled()) return fn();
    const start = now();
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        value => { recorder(now() - start); return value; },
        err => { recorder(now() - start); throw err; }
      );
    }
    recorder(now() - start);
    return result;
  },

  /** Console entry point: SWSE.debug.performance.actor(actor) */
  actor(actor) {
    const actorId = actor?.id ?? actor;
    const bucket = _prepareByActor.get(actorId);
    if (!bucket) {
      console.warn(`[SWSE PERF] No recorded prepareDerivedData timings for actor ${actorId}. Enable the 'performanceDiagnostics' setting and re-render the sheet.`);
      return null;
    }
    const snapshot = {
      actorId,
      name: actor?.name ?? null,
      sync: aggSummary(bucket.sync),
      async: aggSummary(bucket.async),
      lastSyncMs: Number(bucket.lastSyncMs.toFixed(2)),
      lastAsyncMs: Number(bucket.lastAsyncMs.toFixed(2))
    };
    console.group(`[SWSE PERF] prepareDerivedData — ${snapshot.name ?? actorId}`);
    console.log('sync mirror pass  :', snapshot.sync, `last=${snapshot.lastSyncMs}ms`);
    console.log('async DerivedCalc :', snapshot.async, `last=${snapshot.lastAsyncMs}ms`);
    console.groupEnd();
    return snapshot;
  },

  /** Console entry point: SWSE.debug.performance.summary() */
  summary({ quiet = false } = {}) {
    const snapshot = {
      enabled: isPerformanceDiagnosticsEnabled(),
      actorsTracked: _prepareByActor.size,
      derivedCache: {
        ..._derivedCache,
        hitRatio: (_derivedCache.hits + _derivedCache.misses)
          ? Number((_derivedCache.hits / (_derivedCache.hits + _derivedCache.misses)).toFixed(3))
          : 0,
        signature: aggSummary(_derivedSignature)
      },
      modifierCache: {
        source: { ..._modifierCache.source },
        aggregate: { ..._modifierCache.aggregate },
        breakdown: { ..._modifierCache.breakdown },
        signature: aggSummary(_modifierSignature)
      },
      sheetContext: Object.fromEntries(
        Array.from(_sheetContext.entries()).map(([type, agg]) => [type, aggSummary(agg)])
      ),
      renders: { ..._renders }
    };

    if (!quiet) {
      console.group('[SWSE PERF] Actor/derived/sheet performance summary');
      console.log('diagnostics enabled     :', snapshot.enabled);
      console.log('actors with prepare data:', snapshot.actorsTracked);
      console.log('DerivedCalculator cache  :', snapshot.derivedCache);
      console.log('ModifierEngine cache     :', snapshot.modifierCache);
      console.log('sheet context builds     :', snapshot.sheetContext);
      console.log('async-derived renders    :', snapshot.renders);
      console.groupEnd();
    }

    return snapshot;
  },

  /** Console entry point: SWSE.debug.performance.reset() */
  reset() {
    _prepareByActor.clear();
    _derivedCache.hits = 0;
    _derivedCache.misses = 0;
    _derivedCache.inFlightJoins = 0;
    _derivedSignature.count = 0;
    _derivedSignature.totalMs = 0;
    _derivedSignature.maxMs = 0;
    for (const bucket of Object.values(_modifierCache)) {
      bucket.hits = 0;
      bucket.misses = 0;
    }
    _modifierSignature.count = 0;
    _modifierSignature.totalMs = 0;
    _modifierSignature.maxMs = 0;
    _sheetContext.clear();
    _renders.queued = 0;
    _renders.suppressed = 0;
    _renders.skippedNoChange = 0;
    return true;
  }
};

/** Register the helpers on the SWSE debug namespace (same pattern as the
 * progression render-stats module). */
export function registerActorPerfDiagnostics() {
  const root = globalThis;
  root.SWSE ??= {};
  root.SWSE.debug ??= {};
  root.SWSE.debug.performance = {
    actor: (actor) => ActorPerfDiagnostics.actor(actor),
    summary: (options) => ActorPerfDiagnostics.summary(options),
    reset: () => ActorPerfDiagnostics.reset()
  };
}
