import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for a significant defect found while investigating
// the "remaining" Category C sites in
// docs/audits/ability-schema-authority-migration-phase3-ledger.md:
// scripts/data/prerequisite-checker.js#PrerequisiteChecker._checkAbilityRequirement()
// resolved a real actor's ability score for feat/talent ability-score
// prerequisites (e.g. "requires Str 13") via
// `actor.system.attributes[key].total ?? .value ?? actor.system.abilities[key].value ?? 10`.
// None of those first three candidates ever exist on the real V2 schema
// (system.attributes only ever has .base/.racial/.enhancement/.temp;
// system.abilities has no .value field either), so outside an active
// progression-shell draft context this silently evaluated EVERY
// ability-score prerequisite against a hardcoded 10, regardless of the
// actor's real score. Fail-before proof: a Str 16 actor failed a "requires
// Str 13" check (10 < 13). Fixed to use the canonical
// SchemaAdapters.getAbilityScore() as the real-actor fallback, after the
// existing draft-state-priority logic (unchanged).
//
// This was found investigating scripts/engine/suggestion/AttributeIncreaseScorer.js's
// _createHypotheticalActor(), which builds a simulated actor with modified
// ability scores to preview "what feats would this unlock" -- it patched
// system.abilities (the legacy read-only mirror), which stopped
// influencing anything once canonical accessors (SchemaAdapters, and this
// prerequisite check once fixed) correctly prefer system.attributes. Fixed
// to patch system.attributes instead, and to clear the corresponding
// system.derived.attributes entries so a live derived snapshot of the
// REAL score cannot shadow the hypothetical one (SchemaAdapters checks
// derived data before system.attributes).

registerFoundryPathLoader();
installFoundryShimGlobals();

const { PrerequisiteChecker } = await import(
  '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js'
);
const { _createHypotheticalActor } = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/AttributeIncreaseScorer.js'
);
const { SchemaAdapters } = await import(
  '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js'
);

function rawExportActor(strBase = 16) {
  return {
    system: {
      attributes: { str: { base: strBase, racial: 0, enhancement: 0, temp: 0 } },
      abilities: { str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 } }
    }
  };
}

// ---------------------------------------------------------------------------
// Test 1 — a real Str 16 actor must pass a "requires Str 13" prerequisite
// with no draft/pending state (the exact scenario that used to silently
// evaluate as Str 10).
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor(16);
  const result = PrerequisiteChecker._checkAbilityRequirement({ ability: 'str', minimum: 13 }, actor, 10, {});
  assert.equal(result.met, true, 'Str 16 must satisfy a Str 13 prerequisite');
}

// ---------------------------------------------------------------------------
// Test 2 — a real Str 10 actor must still correctly FAIL a "requires Str
// 13" prerequisite (proves the fix isn't "always pass").
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor(10);
  const result = PrerequisiteChecker._checkAbilityRequirement({ ability: 'str', minimum: 13 }, actor, 10, {});
  assert.equal(result.met, false, 'Str 10 must not satisfy a Str 13 prerequisite');
}

// ---------------------------------------------------------------------------
// Test 3 — draft/pending progression state still takes priority over
// committed actor data (unchanged behavior).
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor(10);
  const pending = { attributes: { finalValues: { str: 14 } } };
  const result = PrerequisiteChecker._checkAbilityRequirement({ ability: 'str', minimum: 13 }, actor, 10, pending);
  assert.equal(result.met, true, 'draft finalValues (Str 14) must win over committed actor data (Str 10)');
}

// ---------------------------------------------------------------------------
// Test 4 — _createHypotheticalActor() patches system.attributes (the path
// SchemaAdapters and the fixed prerequisite check actually read), not just
// the legacy system.abilities mirror.
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor(10);
  actor.system.derived = { attributes: { str: { mod: 0, total: 10 } } }; // live derived snapshot of the REAL score
  const hypothetical = _createHypotheticalActor(actor, { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });

  assert.equal(hypothetical.system.attributes.str.base, 18, 'hypothetical must patch system.attributes.str.base');
  assert.equal(
    SchemaAdapters.getAbilityScore(hypothetical, 'str'), 18,
    'SchemaAdapters must read the hypothetical Str 18, not the real actor\'s derived snapshot (Str 10)'
  );
  const prereqResult = PrerequisiteChecker._checkAbilityRequirement({ ability: 'str', minimum: 15 }, hypothetical, 10, {});
  assert.equal(prereqResult.met, true, 'a Str-15 prerequisite must be unlocked by the hypothetical Str 18 actor');
}

// ---------------------------------------------------------------------------
// Test 5 — the real source actor passed into _createHypotheticalActor()
// must not be mutated.
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor(10);
  _createHypotheticalActor(actor, { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  assert.equal(actor.system.attributes.str.base, 10, 'the real actor object must not be mutated by building a hypothetical');
}

console.log('Prerequisite ability-score authority guards passed (PrerequisiteChecker._checkAbilityRequirement, AttributeIncreaseScorer._createHypotheticalActor).');
