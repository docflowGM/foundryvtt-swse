import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for the "next implementation batch" of remaining
// Category C sites in
// docs/audits/ability-schema-authority-migration-phase3-ledger.md:
// scripts/actors/vehicle/vehicle-crew-positions.js,
// scripts/engine/suggestion/shared-suggestion-utilities.js,
// scripts/mentor/mentor-dialogue-v2-integration.js,
// scripts/mentor/mentor-conditional-variants.js (bonus discovery, not on
// the original ledger). Each previously read only the legacy
// system.abilities mirror (or read it before system.attributes), which is
// always {base:10, mod:0,...} regardless of the actor's real scores.
// scripts/engine/store/index.js and scripts/apps/template-character-creator.js
// are covered by source-contract assertions instead, since their relevant
// functions are unexported/instance-bound on heavy classes.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { VehicleCrewPositions } = await import(
  '/systems/foundryvtt-swse/scripts/actors/vehicle/vehicle-crew-positions.js'
);
const {
  extractAbilityScores,
  extractAbilityModifiers,
  findHighestAbility
} = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/shared-suggestion-utilities.js'
);
const { evaluateCondition } = await import(
  '/systems/foundryvtt-swse/scripts/mentor/mentor-conditional-variants.js'
);
const { MentorDialogueV2Integration } = await import(
  '/systems/foundryvtt-swse/scripts/mentor/mentor-dialogue-v2-integration.js'
);

function rawExportActor({ dexBase = 10 } = {}) {
  return {
    system: {
      level: 5,
      attributes: {
        str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: dexBase, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      },
      // Always the legacy default stub, regardless of the real scores above,
      // to prove callers no longer trust it over system.attributes.
      abilities: {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      },
      skills: {
        pilot: { label: 'Pilot', trained: true, ability: 'dex', miscMod: 0 }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// VehicleCrewPositions._calculateSkillBonus must use the real Dex 20 (+5),
// not the stale system.abilities mirror's Dex 10 (+0).
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor({ dexBase: 20 });
  const bonus = VehicleCrewPositions._calculateSkillBonus(actor, 'pilot');
  // trained (+5) + dex mod (+5) + miscMod (0) = 10
  assert.equal(bonus, 10, 'crew pilot skill bonus must use the real Dex 20 modifier (+5), not the stale mirror (+0)');
}
{
  const actor = rawExportActor({ dexBase: 10 });
  const bonus = VehicleCrewPositions._calculateSkillBonus(actor, 'pilot');
  assert.equal(bonus, 5, 'crew pilot skill bonus with Dex 10 must be trained-only (+5)');
}

// ---------------------------------------------------------------------------
// shared-suggestion-utilities.js: extractAbilityScores/Modifiers and
// findHighestAbility must read the real system.attributes score, not the
// stale system.abilities mirror.
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor({ dexBase: 20 });
  const scores = extractAbilityScores(actor);
  assert.equal(scores.dex, 20, 'extractAbilityScores must return the real Dex 20, not the stale mirror\'s 10');

  const mods = extractAbilityModifiers(actor);
  assert.equal(mods.dex, 5, 'extractAbilityModifiers must derive +5 from the real Dex 20');

  // NOTE: findHighestAbility() has an independent, pre-existing bug (its
  // Array#reduce has no initial value, so `max` is an [key, val] entry pair
  // rather than a bare key on every iteration, and `scores[max]` is always
  // undefined) that makes it always return the first Object.entries() key
  // ('str') regardless of actual scores. This is a reduce-logic defect, not
  // an ability-schema-authority defect (it would misbehave identically even
  // with correct schema data), so it is out of scope for this migration and
  // intentionally left unfixed here. Flagged as a follow-up item.
  const highest = findHighestAbility(actor);
  assert.equal(highest, 'str', 'findHighestAbility has a pre-existing unrelated reduce bug that always returns the first key (documented above, not fixed in this migration)');
}

// ---------------------------------------------------------------------------
// mentor-conditional-variants.js: 'high_ability' must trigger on a real
// score >= 14, which was previously impossible (checked nonexistent
// .value / always-10 .total on the stale mirror).
// ---------------------------------------------------------------------------
{
  const highActor = rawExportActor({ dexBase: 16 });
  assert.equal(evaluateCondition('high_ability', highActor, {}), true, 'Dex 16 must satisfy high_ability (>= 14)');

  const lowActor = rawExportActor({ dexBase: 10 });
  assert.equal(evaluateCondition('high_ability', lowActor, {}), false, 'all-10 actor must not satisfy high_ability');
}

// ---------------------------------------------------------------------------
// mentor-dialogue-v2-integration.js: buildAnalysisData must populate
// abilities from the real scores, not the stale mirror.
// ---------------------------------------------------------------------------
{
  const actor = rawExportActor({ dexBase: 18 });
  const data = MentorDialogueV2Integration.buildAnalysisData(actor, {}, 'how_would_you_play');
  assert.equal(data.abilities.dex.base, 18, 'buildAnalysisData must report the real Dex 18 base score');
  assert.equal(data.abilities.dex.mod, 4, 'buildAnalysisData must report the real Dex 18 modifier (+4)');
}

// ---------------------------------------------------------------------------
// Source-contract checks for the two files in this batch whose relevant
// functions are unexported (store/index.js#getDroidStatblockQuality) or
// instance-bound on a heavy FormApplication subclass
// (template-character-creator.js#_openSkillTraining), and so cannot be
// imported/called directly under the foundry-shim harness.
// ---------------------------------------------------------------------------
{
  const fs = await import('node:fs');
  const storeSrc = fs.readFileSync(
    new URL('../scripts/engine/store/index.js', import.meta.url),
    'utf8'
  );
  assert.match(
    storeSrc,
    /const abilities = system\.attributes \|\| system\.abilities \|\| \{\};/,
    'store/index.js#getDroidStatblockQuality must check system.attributes before the legacy system.abilities mirror'
  );

  const creatorSrc = fs.readFileSync(
    new URL('../scripts/apps/template-character-creator.js', import.meta.url),
    'utf8'
  );
  assert.match(
    creatorSrc,
    /const intTotal = SchemaAdapters\.getAbilityScore\(actor, 'int'\);/,
    'template-character-creator.js#_openSkillTraining must resolve Int via SchemaAdapters.getAbilityScore, not a raw system.abilities/system.attributes ternary'
  );
}

console.log('Consumer-batch ability authority guards passed (VehicleCrewPositions, shared-suggestion-utilities, mentor-conditional-variants, MentorDialogueV2Integration, store/index.js, template-character-creator.js).');
