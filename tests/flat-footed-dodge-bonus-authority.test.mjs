import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for the Math Integrity Freeze's first confirmed-fix
// batch (docs/audits/v2-math-integrity-authority-ledger.md, Flat-Footed
// Reflex domain): DefenseCalculator.calculate()'s flatFootedTotal formula
// only stripped `Math.max(0, reflexAbilityMod)` from reflexTotal --
// leaving any dodge-type Reflex bonus (Martial Arts I/II/III, Defense
// Avoidance line, Area Explosives, Rebellion Combat, core attack-option
// feats -- all tagged `type:'dodge'`/`bonusType:'dodge'` at their source)
// fully intact. SWSE RAW: a flat-footed character loses dodge bonuses
// along with their Dexterity bonus, not just the Dexterity bonus.
//
// Fail-before proof (captured before this fix): a +3 dodge-type Reflex
// bonus made reflex.total=18 (10+dex5+dodge3) and flatFooted.total=13
// (18-5, i.e. only Dex stripped) instead of the correct 10.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { DefenseCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js'
);

function baseActor(items) {
  return {
    type: 'character',
    system: {
      attributes: { dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } },
      abilities: {},
      defenses: {},
      conditionTrack: { current: 0 }
    },
    items
  };
}

// ---------------------------------------------------------------------------
// Test 1 — a dodge-type Reflex bonus (matching Martial Arts I's real shape,
// martial-arts-feat-normalization-hooks.js) must NOT survive flat-footed.
// ---------------------------------------------------------------------------
{
  const martialArtsItem = {
    type: 'feat',
    name: 'Martial Arts I',
    system: {
      executionModel: 'PASSIVE',
      subType: 'STATE',
      abilityMeta: {
        modifiers: [
          { target: 'defense.reflex', value: 3, type: 'dodge', bonusType: 'dodge' }
        ]
      }
    }
  };
  const result = await DefenseCalculator.calculate(baseActor([martialArtsItem]), [], {}, {});
  assert.equal(result.reflex.total, 18, 'reflex.total must include the dodge bonus (10 + dex5 + dodge3)');
  assert.equal(result.flatFooted.total, 10, 'flat-footed must strip BOTH the Dex bonus and the dodge bonus, leaving just the base');
}

// ---------------------------------------------------------------------------
// Test 2 — a non-dodge PASSIVE/STATE Reflex bonus (no type/bonusType tag)
// must still survive flat-footed -- proves the fix targets dodge
// specifically, not every state modifier.
// ---------------------------------------------------------------------------
{
  const genericBonusItem = {
    type: 'talent',
    name: 'Generic +2 Reflex Talent',
    system: {
      executionModel: 'PASSIVE',
      subType: 'STATE',
      abilityMeta: {
        modifiers: [
          { target: 'defense.reflex', value: 2 }
        ]
      }
    }
  };
  const result = await DefenseCalculator.calculate(baseActor([genericBonusItem]), [], {}, {});
  assert.equal(result.reflex.total, 17, 'reflex.total must include the non-dodge bonus (10 + dex5 + 2)');
  assert.equal(result.flatFooted.total, 12, 'flat-footed must keep the non-dodge bonus (10 + 2), stripping only Dex');
}

// ---------------------------------------------------------------------------
// Test 3 — no dodge/state bonuses at all: unaffected, matches prior behavior.
// ---------------------------------------------------------------------------
{
  const result = await DefenseCalculator.calculate(baseActor([]), [], {}, {});
  assert.equal(result.reflex.total, 15, 'reflex.total with no modifiers (10 + dex5)');
  assert.equal(result.flatFooted.total, 10, 'flat-footed with no modifiers (10, Dex stripped)');
}

console.log('flat-footed-dodge-bonus-authority.test.mjs: all assertions passed');
