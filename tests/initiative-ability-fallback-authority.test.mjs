import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for a Category C site found in
// docs/audits/ability-schema-authority-migration-phase3-ledger.md:
// getActorInitiativeSkillTotal()'s last-resort ability-modifier fallback
// (reached only when none of system.derived.skills.initiative.total,
// system.derived.initiative.total/.skillTotal, or system.skills.initiative.total/
// .value are populated — i.e. an actor whose derived data genuinely has not
// run yet) went straight from system.derived.attributes[key].mod to the
// legacy system.abilities[key].mod, skipping system.attributes[key].base
// entirely. It now uses SchemaAdapters.getAbilityMod() (fixed in the
// companion Phase 4/5 commit), which tries system.attributes reconstruction
// before ever consulting system.abilities.
//
// Note: in normal live play this fallback is rarely reached at all, since
// DerivedCalculator populates the skill-total candidates checked first —
// this is a defense-in-depth fix for a genuine but low-probability path,
// not the live-gameplay-critical bug the initial audit pass mistakenly
// flagged (see the ledger's correction: scripts/combat/rolls/enhanced-rolls.js's
// SWSERoll.rollInitiative(), which had the same bug, is dead code with no
// callers in the sheet/talent/macro source — confirmed by grepping every
// call site — though still reachable via the window.SWSERoll global export,
// so it was hardened the same way for defense in depth).

registerFoundryPathLoader();
installFoundryShimGlobals();

const { getActorInitiativeSkillTotal } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/SWSEInitiative.js'
);

// ---------------------------------------------------------------------------
// No derived skill-total data at all (forces the ability-mod fallback path):
// raw system.attributes must win over the legacy system.abilities stub.
// ---------------------------------------------------------------------------
{
  const actor = {
    system: {
      level: 8,
      skills: { initiative: { selectedAbility: '', ability: '' } },
      attributes: { dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } },
      abilities: { dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 } }
      // no system.derived at all
    }
  };
  const total = getActorInitiativeSkillTotal(actor);
  assert.equal(total, 5 + 4, 'Dex 20 (+5) + half level (4) = 9, not the legacy stub\'s 0 + 4 = 4');
}

// ---------------------------------------------------------------------------
// Live derived data still wins when present.
// ---------------------------------------------------------------------------
{
  const actor = {
    system: {
      level: 8,
      skills: { initiative: {} },
      attributes: { dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } },
      derived: { attributes: { dex: { mod: 7 } } }
    }
  };
  const total = getActorInitiativeSkillTotal(actor);
  assert.equal(total, 7 + 4, 'live derived dex mod (+7) must win over raw reconstruction (+5)');
}

// ---------------------------------------------------------------------------
// A populated system.derived.skills.initiative.total still short-circuits
// everything else, as before this fix (unchanged behavior check).
// ---------------------------------------------------------------------------
{
  const actor = {
    system: {
      derived: { skills: { initiative: { total: 42 } } }
    }
  };
  assert.equal(getActorInitiativeSkillTotal(actor), 42);
}

console.log('Initiative ability-fallback authority guard passed.');
