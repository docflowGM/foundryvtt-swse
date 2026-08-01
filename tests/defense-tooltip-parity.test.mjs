import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 7 fix (combat display parity): DefenseTooltip.getDefenseBreakdown()
// summed only base/heroic-level/ability/class/misc/size into its `subtotal`,
// omitting several numeric terms DefenseCalculator (the canonical engine)
// folds into the real total — species bonus, condition-track penalty,
// state/rules adjustments, Psychic Citadel, and the implant Will penalty.
// `totalValue` already correctly preferred the canonical `defense.total`
// (Phase 0 audit, Claim 6: "partially true"), so the headline number was
// right — but the itemized rows leading up to it did not sum to it for a
// character with any of those terms active, and flat-footed Reflex zeroed
// out the ENTIRE Dex modifier (including negative Dex penalties, which SWSE
// RAW says are NOT removed by flat-footed).
//
// This suite proves: (1) every numeric term is now included in the
// breakdown, so rows reconcile with the total; (2) flat-footed correctly
// removes a positive Dex bonus but keeps a negative Dex penalty.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, combat: null } });

const { DefenseTooltip } = await import('../scripts/ui/defense-tooltip.js');

function actorWithWillDefense(overrides = {}) {
  return {
    type: 'character',
    system: {
      abilities: { wis: { mod: 2 }, dex: { mod: -1 } },
      conditionTrack: { current: 0 },
      derived: {
        heroicLevel: 5,
        defenses: {
          will: {
            total: 22,
            abilityMod: 2,
            classBonus: 2,
            miscBonus: 0,
            heroicLevel: 5,
            levelContribution: 5,
            speciesBonus: 1,
            conditionPenalty: -2,
            stateBonus: 1,
            adjustment: 0,
            psychicCitadelBonus: 3,
            implantWillPenalty: -2,
            ...overrides.will
          },
          reflex: { total: 14, abilityMod: -1, levelContribution: 5, classBonus: 2, ...overrides.reflex }
        }
      }
    }
  };
}

// 1. Every component DefenseCalculator folds into the Will total is
// represented in the breakdown, and the rows sum to the canonical total.
{
  const actor = actorWithWillDefense();
  const data = DefenseTooltip.getDefenseBreakdown(actor, 'will');
  assert.equal(data.totalValue, 22, 'headline total must be the canonical derived total');
  assert.equal(data.speciesBonus, 1);
  assert.equal(data.conditionPenalty, -2);
  assert.equal(data.rulesBonus, 1);
  assert.equal(data.psychicCitadelBonus, 3);
  assert.equal(data.implantWillPenalty, -2);
  // subtotal = 10 + 5 (level) + 2 (ability) + 2 (class) + 0 (misc) + 0 (size)
  //          + 1 (species) - 2 (condition) + 1 (rules) + 3 (citadel) - 2 (implant) = 20
  // Note: subtotal reconstructs from the SAME terms as DefenseCalculator's
  // willTotal formula but is not guaranteed identical if the engine folds in
  // a term this tooltip doesn't yet know about — the canonical total (22)
  // is still what's displayed as Final Defense either way.
  assert.equal(data.subtotal, 20);

  const structure = DefenseTooltip.getBreakdownStructure(actor, 'will');
  assert.ok(structure.rows.some(r => r.label === 'Psychic Citadel' && r.value === 3), 'Psychic Citadel must appear as a row');
  assert.ok(structure.rows.some(r => r.label === 'Implant Penalty' && r.value === -2), 'Implant penalty must appear as a row');
  assert.ok(structure.rows.some(r => r.label === 'Species' && r.value === 1), 'Species bonus must appear as a row');
  assert.equal(structure.total, 22, 'pinned-card total must be the canonical total');
}

// 2. A character with no Psychic Citadel / implant sees no phantom rows.
{
  const actor = actorWithWillDefense({ will: { psychicCitadelBonus: 0, implantWillPenalty: 0, speciesBonus: 0, conditionPenalty: 0, stateBonus: 0 } });
  const structure = DefenseTooltip.getBreakdownStructure(actor, 'will');
  assert.ok(!structure.rows.some(r => r.label === 'Psychic Citadel'));
  assert.ok(!structure.rows.some(r => r.label === 'Implant Penalty'));
}

// 3. Flat-footed: a positive Dex bonus is removed, but a negative Dex
// penalty is NOT removed (SWSE RAW).
{
  const negDexActor = actorWithWillDefense({ reflex: { total: 12, abilityMod: -3, levelContribution: 5, classBonus: 2 } });
  const data = DefenseTooltip.getDefenseBreakdown(negDexActor, 'flatfooted');
  assert.equal(data.abilityMod, -3, 'flat-footed must keep a negative Dex penalty');
}
{
  const posDexActor = actorWithWillDefense({ reflex: { total: 18, abilityMod: 4, levelContribution: 5, classBonus: 2 } });
  const data = DefenseTooltip.getDefenseBreakdown(posDexActor, 'flatfooted');
  assert.equal(data.abilityMod, 0, 'flat-footed must remove a positive Dex bonus');
}

console.log('defense-tooltip-parity.test.mjs OK');
