import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Fail-before proof for Category C row 20 in
// docs/audits/ability-schema-authority-migration-phase3-ledger.md:
// getTalentAbilityMod() (scripts/engine/talent/talent-ability-helpers.js)
// was documented as INTENTIONALLY checking system.abilities before
// system.attributes, with a comment explicitly reasoning that swapping to
// SchemaAdapters' order "would be a behavior change for actors whose
// attributes/abilities mirrors have diverged." Per explicit project
// direction: a deliberate historical choice does not make an order
// correct, and this file proves it was not -- using a deliberately
// divergent actor, exercised through the real exported helper (not a
// reimplementation), before any fix is applied to talent-ability-helpers.js
// itself in this commit.
//
// A second, independent bug in the same function: even its "system.attributes"
// tier only ever checked a `.mod` field
// (actor?.system?.attributes?.[key]?.mod), which never exists on the real
// V2 schema (system.attributes only ever has .base/.racial/.enhancement/.temp
// -- see docs/systems/ABILITY_SCHEMA_AUTHORITY.md). So that tier was
// permanently dead regardless of ordering: the effective priority was
// always derived.attributes.mod -> system.abilities.mod -> 0, with
// system.attributes never actually consulted.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { getTalentAbilityMod } = await import(
  '/systems/foundryvtt-swse/scripts/engine/talent/talent-ability-helpers.js'
);

// A raw-export-style actor (no system.derived at all, matching how a real
// Foundry actor export looks -- derived data is computed at runtime and
// never serialized, per docs/audits/skill-roll-dialog-base-authority.md).
// Real Dex 20 (mod should be +5) vs. the legacy default stub's Dex mod 0.
const actor = {
  system: {
    attributes: {
      dex: { base: 20, racial: 0, enhancement: 0, temp: 0 }
    },
    abilities: {
      dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
    }
  }
};

// ---------------------------------------------------------------------------
// Test 1 — the fail-before proof itself, now asserted post-fix: a real Dex
// 20 with no system.derived data must resolve to +5, not the stale
// mirror's 0.
// ---------------------------------------------------------------------------
{
  const result = getTalentAbilityMod(actor, 'dex');
  assert.equal(result, 5, 'getTalentAbilityMod() must resolve the real Dex 20 (+5), not the stale system.abilities mirror (+0)');
}

// ---------------------------------------------------------------------------
// Test 2 — system.derived.attributes, when present, still wins (unchanged
// authority tier 1).
// ---------------------------------------------------------------------------
{
  const derivedActor = {
    system: {
      derived: { attributes: { dex: { mod: 7 } } },
      attributes: { dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } },
      abilities: { dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 } }
    }
  };
  assert.equal(getTalentAbilityMod(derivedActor, 'dex'), 7, 'computed system.derived.attributes must still take priority when present');
}

// ---------------------------------------------------------------------------
// Test 3 — an actor with no system.attributes block at all still falls
// through to the legacy system.abilities mirror (unchanged last-resort
// compatibility tier).
// ---------------------------------------------------------------------------
{
  const legacyOnlyActor = {
    system: {
      abilities: { dex: { base: 16, racial: 0, temp: 0, total: 16, mod: 3 } }
    }
  };
  assert.equal(getTalentAbilityMod(legacyOnlyActor, 'dex'), 3, 'an actor with no system.attributes at all must still fall through to system.abilities');
}

console.log('talent-ability-helpers-fail-before-proof.test.mjs: all assertions passed');
