/**
 * Defect C — Derived Class Stat Audit multiclass "Expected +0" fabrication.
 *
 * Alpha report: a Noble 1 / Jedi 3 actor's Derived Class Stat Audit showed
 *   BAB Current +3 Expected +0 / Fort +1 Expected +0 / Reflex +1 Expected +0
 *   / Will +2 Expected +0
 * while HP correctly showed "Expected Unavailable". This looked like the
 * audit's expected-value computation was losing canonical class authority
 * and fabricating zero instead of reporting non-computable state.
 *
 * ROOT CAUSE (confirmed in scripts/apps/progression-framework/shell/
 * progression-reconciler.js's `_computeExpectedDerivedStats`):
 *  - HP already fails closed correctly: `knownMinimum` is `null` when no
 *    heroic class base HP can be resolved, and `Number(null ?? undefined)`
 *    is NaN downstream, so it can never be mistaken for a real value.
 *  - BAB used `0`, not `null`, as its "could not resolve" sentinel: when a
 *    class's BAB couldn't be read, `babStatus` correctly flipped to
 *    'unavailable', but the accumulated `babValue` itself stayed at its
 *    initial fabricated `0` instead of becoming non-representable.
 *  - Class defenses (`_readClassDefenseBonuses`) had NO "unavailable" path
 *    at all: a missing `defenses` object on the resolved class model always
 *    defaulted every key to `0` and reported `status: 'ok'` — structurally
 *    worse than the BAB bug, since "unavailable" was never representable.
 *
 * A SECOND bug compounded this in progression-reconciliation-report-builder.js
 * (`_normalizeDerivedStatsAudit`): its BAB-capping block ran unconditionally,
 * without checking `babRow.status === 'unavailable'` first. Once BAB's
 * value stopped being a fabricated 0 (this fix), the block's own
 * `Number.isFinite(...)` guards already skip a `null` expected value — but
 * the block's *current-vs-expected comparison* had its own latent bug: if
 * `currentBab` was finite while `cappedExpected` was not, neither
 * conditional branch matched, so it fell through to an `else` that reset
 * `status` back to `'ok'`, silently erasing the correctly-computed
 * "Unavailable" state. This is fixed with an explicit
 * `babRow.status !== 'unavailable'` guard around the whole block, mirroring
 * how HP already needed no such guard.
 *
 * THE FIX:
 *  - `_readClassDefenseBonuses()` now returns `null` (not a zeroed object)
 *    when no `defenses` object can be found on either the resolved model or
 *    the owned item.
 *  - `_computeExpectedDerivedStats()` now marks BAB `value: null` (not `0`)
 *    once any contributing class fails to resolve, and marks each affected
 *    defense key `value: null, status: 'unavailable'` the same way — exact
 *    parity with HP's existing `knownMinimum: null` discipline.
 *  - `_normalizeDerivedStatsAudit()`'s BAB block is now skipped entirely
 *    once `babRow.status === 'unavailable'`, so nothing downstream can
 *    recompute/relabel/"ok" it back into a numeric value.
 *
 * These tests drive the REAL `ProgressionReconciler`/
 * `ProgressionReconciliationReportBuilder`/`ProgressionEntitlementCalculator`
 * production methods directly with hand-built class-summary fixtures (no
 * compendium/registry mocking needed — these are pure functions of the
 * `classSummaries` array already resolved upstream), so behavior is
 * verified against the actual audit code, not a reimplementation.
 */

import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };

const { ProgressionReconciler } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js'
);
const { ProgressionReconciliationReportBuilder } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/progression-reconciliation-report-builder.js'
);
const { ProgressionEntitlementCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/progression-entitlement-calculator.js'
);

const reconciler = new ProgressionReconciler();

const NOBLE_MODEL = {
  name: 'Noble',
  system: {
    defenses: { fortitude: 0, reflex: 1, will: 2 },
    level_progression: [{ level: 1, bab: 0 }],
  },
};
const JEDI_MODEL = {
  name: 'Jedi',
  system: {
    defenses: { fortitude: 1, reflex: 1, will: 0 },
    level_progression: [{ level: 1, bab: 1 }, { level: 2, bab: 2 }, { level: 3, bab: 3 }],
  },
};

/* ==================================================================== *
 * 1. Noble 1 / Jedi 3 — canonical authority resolves for every class:
 * expected BAB/defenses must be the real computed values, never
 * "Unavailable" and never fabricated from a resolution failure that did
 * not actually occur.
 * ==================================================================== */
{
  const classSummaries = [
    { classId: 'noble', className: 'Noble', level: 1, model: NOBLE_MODEL, isNonheroic: false },
    { classId: 'jedi', className: 'Jedi', level: 3, model: JEDI_MODEL, isNonheroic: false },
  ];
  const actor = { system: { level: 4 } };
  const expected = reconciler._computeExpectedDerivedStats(actor, classSummaries, 4);

  assert.equal(expected.bab.status, 'ok');
  assert.equal(expected.bab.value, 3, 'BAB must be additive across class levels: Noble L1 (0) + Jedi L3 (3) = 3');
  assert.equal(expected.defenses.fortitude.value, 1, 'class defenses are the max across contributing classes, not additive');
  assert.equal(expected.defenses.reflex.value, 1);
  assert.equal(expected.defenses.will.value, 2);
  for (const key of ['fortitude', 'reflex', 'will']) {
    assert.equal(expected.defenses[key].status, 'ok');
  }
}

/* ==================================================================== *
 * 2. Deliberately unresolved class fixture — one class's model has
 * degraded to a thin ledger row (no `system` object at all, exactly what
 * canonicalClassSummaries()'s re-keying fallback produces on a miss).
 * Expected values MUST become "Unavailable"/null, never fabricated 0 —
 * verified at both the raw computation layer and after the audit row +
 * report-builder normalization pipeline runs (the report-builder's own
 * BAB-capping/status logic must not resurrect a numeric value).
 * ==================================================================== */
{
  const thinJediRow = { classId: 'jedi', className: 'Jedi', level: 3 }; // no .system -> unresolved
  const mixedSummaries = [
    { classId: 'noble', className: 'Noble', level: 1, model: NOBLE_MODEL, isNonheroic: false },
    { classId: 'jedi', className: 'Jedi', level: 3, model: thinJediRow, isNonheroic: false },
  ];
  const actor = { system: { level: 4 } };
  const expected = reconciler._computeExpectedDerivedStats(actor, mixedSummaries, 4);

  assert.equal(expected.bab.status, 'unavailable');
  assert.equal(expected.bab.value, null, 'unresolved BAB must be null, never a fabricated 0');
  for (const key of ['fortitude', 'reflex', 'will']) {
    assert.equal(expected.defenses[key].status, 'unavailable', `${key} defense must report unavailable when class authority cannot resolve`);
    assert.equal(expected.defenses[key].value, null, `${key} defense value must be null, never a fabricated 0`);
  }

  // Full pipeline: build the actual audit rows, then run them through the
  // report-builder's normalization exactly as the real reconciliation flow
  // does — with a realistic CURRENT bab of +3 (the alpha tester's exact
  // report shape: a real nonzero current value alongside unresolved
  // expected authority), to catch the report-builder's own "fell through
  // to the ok branch" regression.
  const audit = reconciler._buildDerivedStatsAudit(actor, mixedSummaries, { totalHeroicLevel: 4 });
  const babRow = audit.rows.find(r => r.id === 'bab');
  assert.equal(babRow.status, 'unavailable');
  assert.equal(babRow.expectedLabel, 'Unavailable');

  babRow.current = 3;
  babRow.currentValue = 3;
  const reportBuilder = new ProgressionReconciliationReportBuilder();
  const report = { totalLevel: 4, totalHeroicLevel: 4, derivedStats: audit };
  reportBuilder._normalizeDerivedStatsAudit(report);

  const normalizedBabRow = report.derivedStats.rows.find(r => r.id === 'bab');
  assert.equal(normalizedBabRow.status, 'unavailable',
    'report-builder normalization must not flip an unavailable BAB row back to "ok" just because current BAB happens to be finite');
  assert.equal(normalizedBabRow.expectedLabel, 'Unavailable',
    'report-builder normalization must not relabel an unavailable BAB row to a numeric "+N"');
  assert.equal(normalizedBabRow.expected, null);

  for (const key of ['fortitude-class-defense', 'reflex-class-defense', 'will-class-defense']) {
    const row = audit.rows.find(r => r.id === key);
    assert.equal(row.status, 'unavailable');
    assert.equal(row.expectedLabel, 'Unavailable');
  }
}

/* ==================================================================== *
 * 3. Single-class fixture — non-regression: ordinary single-class actors
 * must keep resolving correctly (no fabricated Unavailable, no altered
 * math from this fix).
 * ==================================================================== */
{
  const classSummaries = [
    { classId: 'jedi', className: 'Jedi', level: 3, model: JEDI_MODEL, isNonheroic: false },
  ];
  const actor = { system: { level: 3 } };
  const expected = reconciler._computeExpectedDerivedStats(actor, classSummaries, 3);

  assert.equal(expected.bab.status, 'ok');
  assert.equal(expected.bab.value, 3);
  assert.equal(expected.defenses.fortitude.value, 1);
  assert.equal(expected.defenses.reflex.value, 1);
  assert.equal(expected.defenses.will.value, 0, 'a legitimate class-granted +0 defense bonus must still read as 0/ok, not unavailable');
  assert.equal(expected.defenses.will.status, 'ok');
}

/* ==================================================================== *
 * 4. Duplicate/thin ledger representation — semantic class merge (the
 * multiclass exposure point named in the task) must not double-count or
 * erase progression when the same class is represented twice (an owned
 * class Item AND a system.progression.classLevels ledger row).
 * ==================================================================== */
{
  const jediItem = { id: 'item-1', type: 'class', name: 'Jedi', system: { classId: 'jedi', level: 3 } };
  const actor = {
    id: 'dup-actor',
    items: [jediItem],
    system: { level: 3, progression: { classLevels: [{ classId: 'jedi', class: 'Jedi', level: 3 }] } },
  };
  const rawSummaries = [
    { classId: 'jedi', className: 'Jedi', level: 3, model: JEDI_MODEL, item: jediItem, isNonheroic: false },
  ];
  const calc = new ProgressionEntitlementCalculator({ helpers: { buildClassSummaries: () => rawSummaries } });
  const result = calc.calculate(actor, {});

  assert.equal(result.internalClassSummaries.length, 1,
    'the same class represented as both an owned item and a classLevels ledger row must merge into exactly one summary, not two');
  assert.equal(result.internalClassSummaries[0].level, 3, 'the merged summary must keep the real level, not sum duplicate representations (3+3=6 would be wrong)');
  assert.equal(result.totalLevel, 3, 'totalLevel must not double-count a duplicated class representation');
  assert.equal(result.totalHeroicLevel, 3);
}

console.log('progression-derived-class-stat-audit-contract: all assertions passed');
