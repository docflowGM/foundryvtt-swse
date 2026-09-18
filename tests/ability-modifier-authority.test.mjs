import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for Defect B (see
// docs/audits/skill-roll-dialog-base-authority.md), a second, independent
// authority bug exposed while building the Gar'ee fixture for the skill-
// dialog baseBonus fix (tests/skill-roll-dialog-base-authority.test.mjs):
//
//   getAbilityModifier() in scripts/rolls/roll-config.js used to check
//   system.abilities[key].mod (a legacy, read-only compatibility mirror
//   that defaults to {base:10, mod:0} for every ability on every actor —
//   confirmed against template.json's Actor data model, line ~48) BEFORE
//   ever attempting to reconstruct a modifier from the canonical
//   system.attributes[key] score. On an actor with no
//   system.derived.attributes populated (true of any raw actor export,
//   since derived data is computed by prepareDerivedData() at runtime and
//   never serialized), this meant a real Dex 20 (mod +5) silently resolved
//   as +0, because the inert abilities-stub's mod:0 was a "valid" (finite)
//   candidate checked before the real system.attributes.dex.base=20 was
//   ever consulted.
//
// scripts/actors/derived/derived-calculator.js documents the actual V2
// authority contract directly in its own source (search "Canonical stored
// abilities path"): "system.attributes is canonical; system.abilities is a
// read-only compatibility mirror," resolved as a whole-block fallback
// (`actor.system.attributes || actor.system.abilities || {}`), with the
// modifier always computed as
// `Math.floor((base + racial + enhancement + temp - 10) / 2)`.
// getAbilityModifier() now follows that exact contract and formula so raw
// actor-export data and live-runtime derived data always agree.

registerFoundryPathLoader();
installFoundryShimGlobals({
  foundry: {
    applications: {
      api: {
        ApplicationV2: class {},
        HandlebarsApplicationMixin: (Base) => class extends (Base ?? Object) {}
      }
    }
  }
});

const { getSkillTotal } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');

// getAbilityModifier() itself is not exported (it is an internal helper of
// roll-config.js used by getSkillComponentTotal/getRollBaseTotal/etc.), so
// it is exercised the same way every production caller reaches it: through
// a skill whose ability modifier is the dominant, easily-isolated
// component. Untrained, unfocused, zero-misc skills reduce
// getSkillComponentTotal() to exactly `abilityMod + halfLevel`, so
// subtracting the known halfLevel isolates the ability modifier under
// test without needing to export or duplicate internal ability-resolution
// logic.
function abilityModifierViaUntrainedSkill(actor, skillKey, halfLevel) {
  return getSkillTotal(actor, skillKey) - halfLevel;
}

function actorWithAttributesAndAbilities({ attributes, abilities, derived, level = 0 }) {
  return {
    name: 'Ability Authority Fixture',
    items: [],
    system: {
      level,
      attributes: attributes ?? undefined,
      abilities: abilities ?? undefined,
      derived: derived ?? undefined,
      // pilot: dex-based, untrained/unfocused/no-misc by default —
      // getSkillComponentTotal reduces to abilityMod(dex) + halfLevel.
      skills: { pilot: { trained: false, focused: false, miscMod: 0, selectedAbility: '' } }
    }
  };
}

// ---------------------------------------------------------------------------
// Test A — raw canonical V2 attributes beat the legacy stub.
// ---------------------------------------------------------------------------
{
  const actor = actorWithAttributesAndAbilities({
    attributes: { dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } },
    abilities: { dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 } }
  });
  assert.equal(abilityModifierViaUntrainedSkill(actor, 'pilot', 0), 5, 'Dex 20 must resolve to +5, not the legacy stub\'s 0');
}

// ---------------------------------------------------------------------------
// Test B — a legitimate zero modifier must remain zero (not be mistaken for
// "absent" and fall through to some other source).
// ---------------------------------------------------------------------------
{
  const actor = actorWithAttributesAndAbilities({
    attributes: { dex: { base: 10, racial: 0, enhancement: 0, temp: 0 } },
    abilities: { dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 } }
  });
  assert.equal(abilityModifierViaUntrainedSkill(actor, 'pilot', 0), 0, 'Dex 10 must resolve to +0');
}

// ---------------------------------------------------------------------------
// Test C — negative modifiers reconstruct correctly (proves the fix is not
// merely "always prefer the higher/positive number").
// ---------------------------------------------------------------------------
{
  const actor = actorWithAttributesAndAbilities({
    attributes: { dex: { base: 8, racial: 0, enhancement: 0, temp: 0 } },
    abilities: { dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 } }
  });
  assert.equal(abilityModifierViaUntrainedSkill(actor, 'pilot', 0), -1, 'Dex 8 must resolve to -1, not be clamped to 0 or a positive value');
}

// ---------------------------------------------------------------------------
// Test D — live derived authority still wins over raw reconstruction. If
// something else (an effect, a temporary ability adjustment) has already
// computed a different modifier into system.derived.attributes, that must
// not be silently overwritten by re-deriving from the raw base score.
// ---------------------------------------------------------------------------
{
  const actor = actorWithAttributesAndAbilities({
    attributes: { dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } }, // would reconstruct to +5
    derived: { attributes: { dex: { mod: 7 } } } // but derived says +7
  });
  assert.equal(abilityModifierViaUntrainedSkill(actor, 'pilot', 0), 7, 'live derived data (+7) must win over raw reconstruction (+5)');
}

// ---------------------------------------------------------------------------
// Test E — legacy-only actor compatibility: an actor with no
// system.attributes block at all (not merely an empty per-key entry — see
// derived-calculator.js's own whole-block `attributes || abilities` fallback
// contract, which this mirrors) must still resolve from the legacy
// system.abilities mirror rather than defaulting to 0.
// ---------------------------------------------------------------------------
{
  const actor = actorWithAttributesAndAbilities({
    attributes: undefined,
    abilities: { dex: { base: 13, racial: 0, temp: 0, total: 13, mod: 3 } }
  });
  assert.equal(abilityModifierViaUntrainedSkill(actor, 'pilot', 0), 3, 'an actor with no system.attributes at all must fall back to the legacy system.abilities mirror');
}

// ---------------------------------------------------------------------------
// Gar'ee multi-ability proof — all six of Gar'ee's real ability scores,
// covering positive, zero, and negative modifiers simultaneously, plus a
// representative skill per ability.
// ---------------------------------------------------------------------------
{
  const gareeRaw = {
    name: "Gar'ee",
    items: [],
    system: {
      level: 8,
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 20, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 12, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 8, racial: 0, enhancement: 0, temp: 0 }
      },
      abilities: {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      },
      skills: {
        // Untrained/unfocused/no-misc skills, one per ability, each
        // isolating that ability's modifier via getSkillComponentTotal()
        // reducing to abilityMod + halfLevel (halfLevel = floor(8/2) = 4).
        climb: { trained: false, focused: false, miscMod: 0, selectedAbility: '' },       // str
        pilot: { trained: false, focused: false, miscMod: 0, selectedAbility: '' },       // dex
        endurance: { trained: false, focused: false, miscMod: 0, selectedAbility: '' },   // con
        useComputer: { trained: false, focused: false, miscMod: 0, selectedAbility: '' }, // int
        survival: { trained: false, focused: false, miscMod: 0, selectedAbility: '' },    // wis
        deception: { trained: false, focused: false, miscMod: 0, selectedAbility: '' }    // cha
      }
    }
  };

  const halfLevel = 4;
  const expectedMods = { climb: 2, pilot: 5, endurance: 2, useComputer: 1, survival: 0, deception: -1 };
  for (const [skillKey, expectedMod] of Object.entries(expectedMods)) {
    const total = getSkillTotal(gareeRaw, skillKey);
    assert.equal(total, expectedMod + halfLevel, `${skillKey}: expected ability mod ${expectedMod} (total ${expectedMod + halfLevel}), got total ${total}`);
  }
}

console.log('Ability-modifier authority guards passed (getAbilityModifier via getSkillTotal, Defect B / raw-vs-legacy attribute authority).');
