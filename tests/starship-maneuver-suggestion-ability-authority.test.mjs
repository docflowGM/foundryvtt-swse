import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for a defect found while investigating
// docs/audits/ability-schema-authority-migration-phase3-ledger.md's row 19
// (the WISDOM_MOD path-string constant in suggestion-constants.js): that
// constant itself turned out to have ZERO consumers anywhere in the repo
// (confirmed by a repo-wide grep for SYSTEM_PATHS/WISDOM_MOD) -- it isn't
// fed through a generic property-path reader as originally hypothesized,
// so there was no "authority-aware resolver" to build. Its value was
// still corrected (system.abilities -> system.derived.attributes.wis.mod)
// so it can't silently reintroduce the bug if something starts consuming
// it later.
//
// The investigation did surface a real, live defect in the same file that
// imports from suggestion-constants.js:
// StarshipManeuverSuggestionEngine._intelligentSuggest() (starship-maneuver-
// suggestion-engine.js) read `actor.system?.abilities?.wis?.mod || 0`
// directly -- the legacy, always-{mod:0} compatibility mirror -- for its
// "boost Deflector maneuvers by Wis mod" suggestion logic. A real pilot
// with a high Wis score never got credit for it. Fixed to use
// SchemaAdapters.getAbilityMod(actor, 'wis').

registerFoundryPathLoader();
installFoundryShimGlobals();

const { StarshipManeuverSuggestionEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/progression/engine/starship-maneuver-suggestion-engine.js'
);

function pilotActor({ wisBase = 10 } = {}) {
  return {
    id: 'pilot-1',
    type: 'character',
    items: [],
    system: {
      skills: { piloting: { bonus: 0 } },
      attributes: {
        wis: { base: wisBase, racial: 0, enhancement: 0, temp: 0 }
      },
      // Always the legacy default stub, deliberately divergent from the
      // real Wis score above.
      abilities: {
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      }
    }
  };
}

const candidates = [
  { id: 'evasive', name: 'Evasive Action' },
  { id: 'deflector', name: 'Angle Deflector Shields' }
];

// ---------------------------------------------------------------------------
// Test 1 — with a real Wis 20 (+5), the Deflector-boost math must push
// "Angle Deflector Shields" (base score 3, +5 from wisdomMod = 8) above
// "Evasive Action" (base score 4, +3 low-piloting boost = 7, no Wis
// interaction). Pre-fix, wisdomMod always read 0 from the stale mirror,
// so Deflector never got its boost and Evasive Action always won.
// ---------------------------------------------------------------------------
{
  const actor = pilotActor({ wisBase: 20 });
  const result = StarshipManeuverSuggestionEngine._intelligentSuggest(actor, candidates, new Set());
  assert.equal(result.name, 'Angle Deflector Shields', 'a real Wis 20 pilot must have Deflector Shields boosted above Evasive Action');
}

// ---------------------------------------------------------------------------
// Test 2 — a genuinely average-Wis (10) pilot still gets Evasive Action
// (proves the fix isn't "always suggest Deflector").
// ---------------------------------------------------------------------------
{
  const actor = pilotActor({ wisBase: 10 });
  const result = StarshipManeuverSuggestionEngine._intelligentSuggest(actor, candidates, new Set());
  assert.equal(result.name, 'Evasive Action', 'an average-Wis pilot must not get an undeserved Deflector boost');
}

console.log('starship-maneuver-suggestion-ability-authority.test.mjs: all assertions passed');
