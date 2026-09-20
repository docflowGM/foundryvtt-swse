import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 8: target-defense authority is
// now ONE shared function, not two independent implementations that
// happen to prioritize the same way (docs/audits/v2-math-integrity-
// authority-ledger.md, Grapple domain, "Certification-correction
// addendum 8").
//
// Round 7 fixed attacks.js#getTargetReflex()/getTargetDefense()'s priority
// order (derived before legacy), but it still read
// system.derived.defenses.<key>.total inline -- a second copy of exactly
// what SchemaAdapters.getDefenseTotal() also computes. The two were
// correct by coincidence (both happened to check the same path first), not
// by construction: nothing stopped them from drifting apart on a future
// edit to either file.
//
// Fixed: a new shared primitive, SchemaAdapters.getDefenseTotalIfPrepared(),
// returns the real derived value when this actor has actually run the V2
// derived pipeline, or null (never a default) when it hasn't --
// unlike getDefenseTotal(), which defaults to 10 and therefore can't tell
// a caller "prepared, genuinely 0" apart from "never prepared at all".
// SchemaAdapters.getDefenseTotal() itself is refactored to call this
// (`getDefenseTotalIfPrepared(actor, defense) ?? 10`), so it cannot drift
// from the shared primitive. attacks.js#getTargetReflex()/getTargetDefense()
// call the SAME primitive for their "is this a prepared V2 actor" branch,
// falling back to the legacy system.defenses.<key>.total/.value fields
// ONLY when it returns null -- an explicit, separately-scoped compatibility
// contract for actor types that genuinely never run the V2 derived
// pipeline, never competing with prepared derived data.
//
// This test uses realistic NPC-statblock-shaped and vehicle-shaped
// fixtures for the fallback cases (matching real legacy-field usage --
// GMApprovalsSurfaceService.js edits system.defenses.reflex.total directly
// for exactly this kind of actor) rather than one untyped "bare NPC/
// vehicle" fixture, while confirming the actual trigger for the fallback
// is objective (is there prepared derived data at all), not the actor's
// type tag -- a vehicle or NPC that DOES have prepared derived defenses
// must still use them, never the legacy field.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.window = globalThis.window ?? globalThis;

const { SchemaAdapters } = await import(
  '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js'
);
const { getTargetReflex, getTargetDefense } = await import(
  '/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js'
);

// ─── 1. SchemaAdapters.getDefenseTotalIfPrepared(): the shared primitive ──

{
  const prepared = { system: { derived: { defenses: { reflex: { total: 29 }, fortitude: { total: 0 } } } } };
  assert.equal(SchemaAdapters.getDefenseTotalIfPrepared(prepared, 'reflex'), 29, 'a prepared actor must return its real derived total');
  assert.equal(SchemaAdapters.getDefenseTotalIfPrepared(prepared, 'fortitude'), 0, 'a prepared actor with a genuine derived total of exactly 0 must return 0, not null or a default');

  const unprepared = { system: {} };
  assert.equal(SchemaAdapters.getDefenseTotalIfPrepared(unprepared, 'reflex'), null, 'an actor with no derived defenses at all must return null, never a silent default');
}

console.log('  [1/4] SchemaAdapters.getDefenseTotalIfPrepared(): real value when prepared (including exact 0), null (never a default) when not OK');

// ─── 2. SchemaAdapters.getDefenseTotal() cannot drift from the shared ─────
//        primitive -- it is now defined in terms of it.

{
  const prepared = { system: { derived: { defenses: { reflex: { total: 29 } } } } };
  const unprepared = { system: {} };
  assert.equal(SchemaAdapters.getDefenseTotal(prepared, 'reflex'), 29, 'getDefenseTotal() must agree with getDefenseTotalIfPrepared() when prepared');
  assert.equal(SchemaAdapters.getDefenseTotal(unprepared, 'reflex'), 10, "getDefenseTotal()'s own documented default (10) must still apply when unprepared -- its existing contract for its other callers is unchanged");
}

console.log('  [2/4] SchemaAdapters.getDefenseTotal() is now defined in terms of getDefenseTotalIfPrepared(), preserving its own existing default-10 contract OK');

// ─── 3. attacks.js: a prepared V2 actor always uses the canonical value,
//        for Reflex, Fortitude, and Will alike -- in parity with
//        SchemaAdapters, since both now read the same primitive. ──────────

{
  const actor = {
    type: 'character',
    system: { derived: { defenses: { reflex: { total: 29 }, fortitude: { total: 22 }, will: { total: 18 } } } }
  };
  assert.equal(getTargetReflex(actor), 29);
  assert.equal(getTargetDefense(actor, 'fortitude'), 22);
  assert.equal(getTargetDefense(actor, 'will'), 18);
  assert.equal(getTargetReflex(actor), SchemaAdapters.getDefenseTotal(actor, 'reflex'), 'attacks.js and SchemaAdapters must agree exactly for a prepared actor');
}

console.log('  [3/4] a prepared V2 character actor: attacks.js and SchemaAdapters.getDefenseTotal() agree exactly, for Reflex/Fortitude/Will OK');

// ─── 4. Legacy/statblock actor-type fallback: realistic NPC-statblock and
//        vehicle-shaped fixtures, each with NO prepared derived defenses
//        at all, correctly fall back to the legacy field -- and a vehicle/
//        NPC that DOES have prepared derived defenses must still ignore
//        the legacy field entirely (the trigger is "prepared or not", not
//        the actor's type tag). ───────────────────────────────────────────

{
  // A flat NPC statblock: system.defenses.reflex.total is a real, directly-
  // editable field for this actor shape (see GMApprovalsSurfaceService.js's
  // 'system.defenses.reflex.total' editable row) and this actor has never
  // run DerivedCalculator, so system.derived.defenses does not exist.
  const npcStatblock = { type: 'npc', system: { defenses: { reflex: { total: 22 }, fortitude: { total: 19 } } } };
  assert.equal(getTargetReflex(npcStatblock), 22, 'an NPC statblock actor with no prepared derived defenses must fall back to its legacy Reflex field');
  assert.equal(getTargetDefense(npcStatblock, 'fortitude'), 19, 'an NPC statblock actor with no prepared derived defenses must fall back to its legacy Fortitude field');

  // A vehicle actor using a flat/manual defense field, same shape.
  const vehicleStatblock = { type: 'vehicle', system: { defenses: { reflex: { total: 14 } } } };
  assert.equal(getTargetReflex(vehicleStatblock), 14, 'a vehicle actor with no prepared derived defenses must fall back to its legacy Reflex field');

  // The fallback must never compete with prepared data, regardless of the
  // actor's type tag -- an NPC or vehicle that DOES have prepared derived
  // defenses must use them, exactly like a character actor.
  const preparedNpc = { type: 'npc', system: { derived: { defenses: { reflex: { total: 31 } } }, defenses: { reflex: { total: 5 } } } };
  assert.equal(getTargetReflex(preparedNpc), 31, 'an NPC actor that DOES have prepared derived defenses must use them, never the legacy field, regardless of actor.type');
}

console.log('  [4/4] legacy/statblock-shaped NPC and vehicle actors fall back correctly when unprepared; prepared data always wins regardless of actor.type OK');

console.log('target-defense-shared-authority.test.mjs: all assertions passed');
