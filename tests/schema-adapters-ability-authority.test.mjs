import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for Phase 5 of the V2 ability-schema-authority
// migration (see docs/audits/ability-schema-authority-migration-phase3-ledger.md):
// SchemaAdapters.getAbilityMod()/getAbilityScore() had the identical Defect B
// bug already fixed in scripts/rolls/roll-config.js#getAbilityModifier() —
// system.abilities[key].mod was checked as a "direct candidate" in the same
// tier as system.attributes[key].mod, and more consequentially,
// system.abilities[key].base was checked BEFORE system.attributes[key].base
// in the score-reconstruction fallback. Since the real schema never puts
// .mod/.total/.score/.value on system.attributes (only .base/.racial/
// .enhancement/.temp — see template.json), this let the legacy
// system.abilities mirror's stale default (mod:0, base:10 for every ability
// on every actor) silently win over a real ability score whenever
// system.derived.attributes was not yet populated.
//
// This adapter is the shared ability-modifier authority for a wide swath of
// core mechanics: scripts/engine/combat/combat-stat-rules.js (lightsaber
// form to-hit stats), scripts/engine/combat/vehicle-attack-math.js (vehicle
// gunnery), scripts/engine/combat/combat-roll-math.js (general attack
// ability modifier), scripts/combat/systems/grappling-system.js,
// scripts/rolls/custom-skill-roller.js, scripts/utils/force-points.js,
// scripts/engine/darkside/dsp-engine.js (Dark Side Score, four call sites),
// scripts/data/prerequisite-checker.js, and defense/combat tooltips — so
// this fix has broad, mostly-transitive reach without needing to touch each
// of those call sites individually.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { SchemaAdapters } = await import('/systems/foundryvtt-swse/scripts/utils/schema-adapters.js');

function rawExportActor(overrides = {}) {
  return {
    name: 'Fixture Actor',
    system: {
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 20, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 12, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 8, racial: 0, enhancement: 0, temp: 0 }
      },
      // The legacy stub template.json puts on every actor by default —
      // always {base:10, mod:0} regardless of the real score.
      abilities: {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      },
      ...overrides
    }
  };
}

// ---------------------------------------------------------------------------
// Test A — raw canonical system.attributes beats the legacy system.abilities
// stub, for both getAbilityMod() and getAbilityScore().
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor();
  assert.equal(SchemaAdapters.getAbilityMod(actor, 'dex'), 5, 'Dex 20 must resolve to +5, not the legacy stub\'s 0');
  assert.equal(SchemaAdapters.getAbilityScore(actor, 'dex'), 20, 'Dex score must reconstruct to 20, not the legacy stub\'s 10');
}

// ---------------------------------------------------------------------------
// Test B — a legitimate zero modifier is preserved.
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor();
  assert.equal(SchemaAdapters.getAbilityMod(actor, 'wis'), 0, 'Wis 10 must resolve to +0');
}

// ---------------------------------------------------------------------------
// Test C — negative modifiers reconstruct correctly.
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor();
  assert.equal(SchemaAdapters.getAbilityMod(actor, 'cha'), -1, 'Cha 8 must resolve to -1');
}

// ---------------------------------------------------------------------------
// Test D — live derived data still wins over raw reconstruction.
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor({
    derived: { attributes: { dex: { mod: 7, total: 24 } } }
  });
  assert.equal(SchemaAdapters.getAbilityMod(actor, 'dex'), 7, 'live derived mod (+7) must win over raw reconstruction (+5)');
  assert.equal(SchemaAdapters.getAbilityScore(actor, 'dex'), 24, 'live derived total (24) must win over raw reconstruction (20)');
}

// ---------------------------------------------------------------------------
// Test E — legacy-only actor (no system.attributes at all) still resolves
// from the compatibility mirror, preserving old-actor-shape support.
// ---------------------------------------------------------------------------
{
  const actor = { name: 'Legacy Actor', system: { abilities: { dex: { base: 13, racial: 0, temp: 0, total: 13, mod: 3 } } } };
  assert.equal(SchemaAdapters.getAbilityMod(actor, 'dex'), 3, 'an actor with no system.attributes at all must fall back to system.abilities');
  assert.equal(SchemaAdapters.getAbilityScore(actor, 'dex'), 13, 'ability score must also fall back correctly');
}

// ---------------------------------------------------------------------------
// Gar'ee multi-ability proof, mirroring tests/ability-modifier-authority.test.mjs
// but against SchemaAdapters directly, since it is the shared accessor real
// combat/skill/darkside/prerequisite code actually calls.
// ---------------------------------------------------------------------------
{
  const gareeRaw = rawExportActor();
  const expectedMods = { str: 2, dex: 5, con: 2, int: 1, wis: 0, cha: -1 };
  for (const [key, expectedMod] of Object.entries(expectedMods)) {
    assert.equal(SchemaAdapters.getAbilityMod(gareeRaw, key), expectedMod, `${key}: expected mod ${expectedMod}`);
  }
}

// ---------------------------------------------------------------------------
// Test F — an actor with neither system.attributes nor system.abilities at
// all (nor derived data) must resolve to modifier 0 (score 10), not -5.
// Found via tests/phase-2b-closure-fixes.test.mjs while fixing an unrelated
// caller (talent-ability-helpers.js): numeric()'s fallback logic used
// `Number(value)`, and Number(null) === 0 is finite, so
// scoreToMod(firstFinite([...all-missing...])) — which is supposed to
// signal "no value" via a null sentinel — silently computed
// Math.floor((0-10)/2) = -5 instead of falling through to the real
// base/racial/enhancement/temp reconstruction (10 -> mod 0).
// ---------------------------------------------------------------------------
{
  const actor = { system: {} };
  assert.equal(SchemaAdapters.getAbilityMod(actor, 'str'), 0, 'a totally empty actor must resolve to modifier 0 (score 10), not -5');
  assert.equal(SchemaAdapters.getAbilityScore(actor, 'str'), 10, 'a totally empty actor must resolve to score 10');
}

console.log('SchemaAdapters ability-authority guards passed (getAbilityMod/getAbilityScore, Phase 5 of the ability-schema-authority migration).');
