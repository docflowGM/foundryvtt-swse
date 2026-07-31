import assert from 'node:assert/strict';
import {
  DROID_CALCULATION_MODE,
  resolveDroidCalculationMode,
  isDroidStatblockMode,
  isStockImportedDroid,
  buildRepairLegacyCalculationModeUpdate,
  computeStatblockDerivedOverrides,
  getStockAttackFlatBonus,
  shouldSuppressComponentModifiers,
  evaluateProgressionGuard
} from '../scripts/actors/droid/droid-mode-adapter.js';

// Phase 3 — Droid Stock-Statblock Authority. A stock-imported droid has no
// class levels, so the normal derived pipeline would compute BAB 0 and base
// (10) defenses and silently replace the published statblock's displayed
// totals on every sheet render. resolveDroidCalculationMode()/
// isDroidStatblockMode() stop that recalculation from running at all;
// computeStatblockDerivedOverrides() supplies the actual published values
// the sheet should show instead; getStockAttackFlatBonus() stops the same
// published total from being double-counted on top of BAB in attack rolls.

function explicitStockDroid(overrides = {}) {
  return { type: 'droid', system: { droidCalculationMode: 'stock-statblock', ...overrides } };
}

function explicitPlayableDroid(overrides = {}) {
  return { type: 'droid', system: { droidCalculationMode: 'playable-derived', ...overrides } };
}

function legacyStatblockDroid(overrides = {}) {
  return {
    type: 'droid',
    flags: { swse: { stockDroidImport: { importMode: 'statblock', sourceId: 'abc', ...overrides } } }
  };
}

// ── resolveDroidCalculationMode — explicit field wins (Tests 1-2) ──────────

{
  const resolution = resolveDroidCalculationMode(explicitStockDroid());
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.STOCK_STATBLOCK);
  assert.equal(resolution.explicit, true);
  assert.equal(resolution.inferred, false);
  assert.equal(resolution.reason, 'explicit-system-field');
}

{
  const resolution = resolveDroidCalculationMode(explicitPlayableDroid());
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  assert.equal(resolution.explicit, true);
  assert.equal(resolution.inferred, false);
}

// Explicit field wins even when a contradicting legacy flag is also present.
{
  const actor = explicitPlayableDroid();
  actor.flags = { swse: { stockDroidImport: { importMode: 'statblock' } } };
  const resolution = resolveDroidCalculationMode(actor);
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  assert.equal(resolution.explicit, true);
}

// Test 3: malformed/unknown explicit value fails safely to playable-derived,
// not by throwing, and surfaces a warning.
{
  const actor = explicitStockDroid({ droidCalculationMode: 'garbage-value' });
  const resolution = resolveDroidCalculationMode(actor);
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  assert.equal(resolution.explicit, false);
  assert.equal(resolution.reason, 'malformed-explicit-value');
  assert.equal(resolution.warnings.length, 1);
}

// P2-1: malformed explicit value on an actor with legacy stock-import
// provenance (importMode: 'statblock') falls back to STOCK-STATBLOCK, not
// playable-derived — a corrupted field must never be a way to unfreeze a
// stock droid and lose its published totals.
{
  const actor = explicitStockDroid({ droidCalculationMode: 'garbage-value' });
  actor.flags = { swse: { stockDroidImport: { importMode: 'statblock', sourceId: 'abc' } } };
  const resolution = resolveDroidCalculationMode(actor);
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.STOCK_STATBLOCK);
  assert.equal(resolution.explicit, false);
  assert.equal(resolution.inferred, true);
  assert.equal(resolution.reason, 'malformed-explicit-value-stock-provenance');
  assert.equal(resolution.warnings.length, 1);
}

// P2-1: malformed explicit value on an actor whose legacy provenance says
// 'playable' (already converted) still falls back to playable-derived —
// the conservative fallback only protects genuine stock provenance.
{
  const actor = explicitStockDroid({ droidCalculationMode: 'garbage-value' });
  actor.flags = { swse: { stockDroidImport: { importMode: 'playable', sourceId: 'abc' } } };
  const resolution = resolveDroidCalculationMode(actor);
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  assert.equal(resolution.reason, 'malformed-explicit-value');
}

// Tests 4-5: legacy flag inference when no explicit field is present.
{
  const resolution = resolveDroidCalculationMode(legacyStatblockDroid());
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.STOCK_STATBLOCK);
  assert.equal(resolution.explicit, false);
  assert.equal(resolution.inferred, true);
  assert.equal(resolution.reason, 'legacy-stock-import-flag');
  assert.equal(resolution.warnings.length, 1);
}

{
  const resolution = resolveDroidCalculationMode(legacyStatblockDroid({ importMode: 'playable' }));
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  assert.equal(resolution.explicit, false);
  assert.equal(resolution.inferred, true);
  assert.equal(resolution.reason, 'legacy-playable-conversion-flag');
}

// Test 6: default — an ordinary hand-built droid (no signal at all) is
// never classified as stock merely for being type "droid".
{
  const resolution = resolveDroidCalculationMode({ type: 'droid', flags: {} });
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  assert.equal(resolution.explicit, false);
  assert.equal(resolution.inferred, false);
  assert.equal(resolution.reason, 'default-no-stock-signal');
}

// Test 7: non-droid actors (and null/undefined) always resolve playable,
// regardless of stray flags.
{
  const npc = legacyStatblockDroid();
  npc.type = 'npc';
  const resolution = resolveDroidCalculationMode(npc);
  assert.equal(resolution.mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  assert.equal(resolution.reason, 'not-a-droid-actor');
  assert.equal(resolveDroidCalculationMode(null).mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  assert.equal(resolveDroidCalculationMode(undefined).mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
}

// ── isDroidStatblockMode — thin predicate over the resolver ────────────────

{
  assert.equal(isDroidStatblockMode(explicitStockDroid()), true);
  assert.equal(isDroidStatblockMode(explicitPlayableDroid()), false);
  assert.equal(isDroidStatblockMode(legacyStatblockDroid()), true);
  assert.equal(isDroidStatblockMode({ type: 'droid', flags: {} }), false);
  assert.equal(isDroidStatblockMode(null), false);
}

// ── isStockImportedDroid — true regardless of current mode ─────────────────

{
  assert.equal(isStockImportedDroid(explicitStockDroid()), true);
  assert.equal(isStockImportedDroid(explicitPlayableDroid()), true);
  assert.equal(isStockImportedDroid(legacyStatblockDroid()), true);
  assert.equal(isStockImportedDroid({ type: 'droid', flags: {} }), false);
  assert.equal(isStockImportedDroid(null), false);
}

// ── buildRepairLegacyCalculationModeUpdate ──────────────────────────────────

{
  const update = buildRepairLegacyCalculationModeUpdate(legacyStatblockDroid());
  assert.deepEqual(update, { set: { 'system.droidCalculationMode': 'stock-statblock' } });
}

{
  const update = buildRepairLegacyCalculationModeUpdate(legacyStatblockDroid({ importMode: 'playable' }));
  assert.deepEqual(update, { set: { 'system.droidCalculationMode': 'playable-derived' } });
}

{
  // Refuses to "repair" an actor whose mode is already explicit — nothing to do.
  assert.throws(() => buildRepairLegacyCalculationModeUpdate(explicitStockDroid()));
}

// ── computeStatblockDerivedOverrides (Tests covering BAB/defenses/DT/Init) ──

{
  const system = {
    bab: 4,
    defenses: {
      fortitude: { total: 15 },
      reflex: { total: 13 },
      will: { total: 12 },
      flatFooted: { total: 11 }
    },
    damageThreshold: 20,
    initiative: 6
  };
  const overrides = computeStatblockDerivedOverrides(system);
  assert.equal(overrides.bab, 4);
  assert.deepEqual(overrides.defenses, { fortitude: 15, reflex: 13, will: 12, flatFooted: 11 });
  assert.equal(overrides.damageThreshold, 20);
  assert.equal(overrides.initiative, 6);
}

{
  // Falls back to baseAttackBonus when bab itself is missing.
  const overrides = computeStatblockDerivedOverrides({ baseAttackBonus: 7, defenses: {} });
  assert.equal(overrides.bab, 7);
}

{
  // Missing/non-numeric fields are omitted (null for scalars, absent key
  // for defenses) rather than defaulting to 0 — a caller must not mistake
  // "no published value" for "published value of zero".
  const overrides = computeStatblockDerivedOverrides({});
  assert.equal(overrides.bab, null);
  assert.deepEqual(overrides.defenses, {});
  assert.equal(overrides.damageThreshold, null);
  assert.equal(overrides.initiative, null);
}

{
  // Partial defenses: only the ones with a finite total are included.
  const overrides = computeStatblockDerivedOverrides({
    defenses: { fortitude: { total: 15 }, reflex: { total: 'not-a-number' } }
  });
  assert.deepEqual(overrides.defenses, { fortitude: 15 });
}

{
  // A published initiative of exactly 0 is preserved, not treated as "absent".
  const overrides = computeStatblockDerivedOverrides({ initiative: 0 });
  assert.equal(overrides.initiative, 0);
}

{
  // Pure: does not mutate its input.
  const system = { bab: 4, defenses: { fortitude: { total: 15 } }, damageThreshold: 20, initiative: 3 };
  const before = JSON.parse(JSON.stringify(system));
  computeStatblockDerivedOverrides(system);
  assert.deepEqual(system, before);
}

// ── getStockAttackFlatBonus (Tests 24, 26, 31) ──────────────────────────────

function stockWeapon(overrides = {}) {
  return { flags: { swse: { stockDroidAttack: { publishedAttackTotal: 9, publishedDamage: '2d6+3', mode: 'playable-derived', sourceStatblock: true, ...overrides } } } };
}

{
  // Test 24: a stock-mode droid with a properly-flagged weapon uses the
  // published total, exactly, instead of any BAB/ability composition.
  const bonus = getStockAttackFlatBonus(explicitStockDroid(), stockWeapon());
  assert.equal(bonus, 9);
}

{
  // Test 26: playable-derived mode never uses the flat override, even if a
  // weapon still happens to carry a stockDroidAttack contract (e.g. right
  // after conversion, before the contract is neutralized).
  const bonus = getStockAttackFlatBonus(explicitPlayableDroid(), stockWeapon());
  assert.equal(bonus, null);
}

{
  // Test 31: sourceStatblock: false (neutralized by conversion) must fall
  // through to normal composition even if the actor is somehow still in
  // stock mode.
  const bonus = getStockAttackFlatBonus(explicitStockDroid(), stockWeapon({ sourceStatblock: false }));
  assert.equal(bonus, null);
}

{
  // A weapon with no stock attack contract at all falls through.
  assert.equal(getStockAttackFlatBonus(explicitStockDroid(), { flags: {} }), null);
  assert.equal(getStockAttackFlatBonus(explicitStockDroid(), null), null);
}

{
  // Non-finite publishedAttackTotal is rejected rather than coerced to 0/NaN.
  const bonus = getStockAttackFlatBonus(explicitStockDroid(), stockWeapon({ publishedAttackTotal: 'not-a-number' }));
  assert.equal(bonus, null);
}

{
  // Non-droid actors never get the flat override even with a stock-shaped weapon.
  const npc = { type: 'npc', system: { droidCalculationMode: 'stock-statblock' } };
  assert.equal(getStockAttackFlatBonus(npc, stockWeapon()), null);
}

// ── shouldSuppressComponentModifiers (PHASE 4) ──────────────────────────────

{
  // Explicit per-component suppression always wins, in either mode.
  const suppressed = { sources: [{ kind: 'installedLedger' }], mechanicalState: { applyModifiers: false } };
  assert.equal(shouldSuppressComponentModifiers(explicitStockDroid(), suppressed), true);
  assert.equal(shouldSuppressComponentModifiers(explicitPlayableDroid(), suppressed), true);
}

{
  // Stock mode: a component with no installedLedger source at all (i.e.
  // it only ever came from the raw published droidSystems blob) is
  // suppressed — its bonus is already baked into the preserved published
  // totals. Confirmed via droid-installed-component-resolver.js, which
  // reports these as "active" even with zero ledger entries.
  const droidSystemsOnly = { sources: [{ kind: 'droidSystemsRecord' }] };
  assert.equal(shouldSuppressComponentModifiers(explicitStockDroid(), droidSystemsOnly), true);
}

{
  // Stock mode: a component that DOES have an installedLedger source (a
  // genuine post-import Garage/Workshop addition, or an already-reconciled
  // component) is never suppressed by the broad stock-mode rule.
  const ledgerBacked = { sources: [{ kind: 'installedLedger' }] };
  assert.equal(shouldSuppressComponentModifiers(explicitStockDroid(), ledgerBacked), false);
}

{
  // Playable-derived mode: the broad stock-mode suppression never applies,
  // regardless of source shape — published totals are no longer
  // authoritative once converted.
  const droidSystemsOnly = { sources: [{ kind: 'droidSystemsRecord' }] };
  assert.equal(shouldSuppressComponentModifiers(explicitPlayableDroid(), droidSystemsOnly), false);
}

{
  // Missing/malformed sources array is treated as "no ledger source" —
  // fails toward suppression (safer default) rather than throwing.
  assert.equal(shouldSuppressComponentModifiers(explicitStockDroid(), {}), true);
  assert.equal(shouldSuppressComponentModifiers(explicitStockDroid(), null), true);
}

// ── evaluateProgressionGuard (PHASE 5) ──────────────────────────────────────
//
// Extracted from scripts/apps/progression-framework/progression-entry.js's
// launchProgression() — that file's own transitive imports could not be
// loaded even through the Phase 4 Foundry-shim harness (confirmed by
// attempting it directly: "Cannot read properties of undefined (reading
// 'api')"), so this decision had zero automated coverage before Phase 5.

// Test 1: a stock-statblock droid is blocked with a clear, actor-named message.
{
  const actor = explicitStockDroid({ name: 'R2-Unit' });
  actor.name = 'R2-Unit';
  const result = evaluateProgressionGuard(actor);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'stock-statblock-mode');
  assert.match(result.message, /R2-Unit/);
  assert.match(result.message, /published stock statblock/i);
  assert.match(result.message, /Convert it to a playable droid/i);
}

// Test 2: a playable-derived droid is never blocked.
{
  const actor = explicitPlayableDroid({ name: 'Custom Unit' });
  actor.name = 'Custom Unit';
  assert.equal(evaluateProgressionGuard(actor).blocked, false);
}

// Test 3: an ordinary character actor is entirely unaffected (short-circuits
// before any droid-specific logic runs).
{
  const character = { type: 'character', name: 'Jax Trooper', system: { droidCalculationMode: 'stock-statblock' } };
  assert.equal(evaluateProgressionGuard(character).blocked, false);
}

// Test 4: an ordinary NPC actor is entirely unaffected, even one that
// happens to carry a droid-shaped flag from a data-entry mistake.
{
  const npc = { type: 'npc', name: 'Some NPC', flags: { swse: { stockDroidImport: { importMode: 'statblock' } } } };
  assert.equal(evaluateProgressionGuard(npc).blocked, false);
}

// Test 5: legacy inferred stock mode (no explicit system.droidCalculationMode,
// only the pre-Phase-3 legacy import flag) is still blocked.
{
  const actor = { type: 'droid', name: 'Legacy Unit', flags: { swse: { stockDroidImport: { importMode: 'statblock' } } } };
  const result = evaluateProgressionGuard(actor);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'stock-statblock-mode');
}

// Test 6: a malformed explicit mode value fails safely — resolves to
// playable-derived (per resolveDroidCalculationMode's own fail-safe
// behavior) rather than throwing or blocking on garbage data.
{
  const actor = explicitStockDroid({ droidCalculationMode: 'not-a-real-mode' });
  assert.doesNotThrow(() => evaluateProgressionGuard(actor));
  assert.equal(evaluateProgressionGuard(actor).blocked, false);
}

// Test 7: warning text is clear regardless of a missing actor name.
{
  const actor = { type: 'droid', system: { droidCalculationMode: 'stock-statblock' } };
  const result = evaluateProgressionGuard(actor);
  assert.equal(result.blocked, true);
  assert.equal(typeof result.message, 'string');
  assert.ok(result.message.length > 0);
}

// Test 10: conversion allows progression afterward — flipping the mode
// (as DroidStatblockConversionService's convertToPlayableDerived() does)
// is enough on its own to unblock the guard, with no other state needed.
{
  const actor = explicitStockDroid({ name: 'Convertible Unit' });
  actor.name = 'Convertible Unit';
  assert.equal(evaluateProgressionGuard(actor).blocked, true);
  actor.system.droidCalculationMode = DROID_CALCULATION_MODE.PLAYABLE_DERIVED;
  assert.equal(evaluateProgressionGuard(actor).blocked, false);
}

{
  // null/undefined actors never throw.
  assert.equal(evaluateProgressionGuard(null).blocked, false);
  assert.equal(evaluateProgressionGuard(undefined).blocked, false);
}
