import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Batch 2A correction — ArmorAxisBEngine (the store
// mobility-fit advisory scoring axis) previously maintained private,
// incorrect shield rules independent of the live authority:
//   - EVERY Energy Shield was classified as category 'light', regardless of
//     its real required proficiency (SR15/20 require Medium, SR25/30
//     require Heavy).
//   - EVERY Energy Shield was treated as `proficient = true` unconditionally.
//   - Armor Mastery's +1 Max Dex was applied to shields, contradicting the
//     live DefenseCalculator ruling that Armor Mastery does not extend to
//     Energy Shields.
//   - `Number.isFinite(Number(maxDex))` silently turned an uncapped
//     (null) Max Dex into "capped to +0" (Number(null) === 0).
// This suite proves all four are fixed.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { ArmorAxisBEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/armor-axis-b-engine.js'
);

function heavyShield(overrides = {}) {
  return {
    type: 'armor',
    system: {
      armorType: 'shield', armorProficiencyRequired: 'heavy', shieldRating: 25,
      armorCheckPenalty: -10, maxDexBonus: 2, ...overrides
    }
  };
}

// ─── 1. A shield's real required category (Heavy), not a hardcoded Light ───

{
  const proficientHeavy = ArmorAxisBEngine.computeMobilityCostAxis(
    heavyShield(),
    { attributes: { dex: 3, str: 2 }, proficiencies: { heavy: true }, talents: {} }
  );
  assert.equal(proficientHeavy.category, 'heavy', "a Heavy-required shield must be classified 'heavy', not hardcoded 'light'");
  assert.equal(proficientHeavy.proficient, true, 'an actor with real Heavy proficiency must be recognized as proficient with this shield');

  const nonproficientHeavy = ArmorAxisBEngine.computeMobilityCostAxis(
    heavyShield(),
    { attributes: { dex: 3, str: 2 }, proficiencies: { light: true }, talents: {} }
  );
  assert.equal(nonproficientHeavy.proficient, false, 'an actor with only Light proficiency must NOT be proficient with a Heavy-required shield -- shields are no longer unconditionally treated as proficient');
  // The shield's ACP must apply identically either way (proficiency never
  // suppresses an active shield's ACP) -- only in this simulator, real
  // shields are evaluated as active.
  assert.equal(proficientHeavy.armorCheckPenalty, 10);
  assert.equal(nonproficientHeavy.armorCheckPenalty, 10);
}

console.log('  [1/3] a shield\'s real required proficiency category (e.g. Heavy) is used, not a hardcoded Light, and proficiency is genuinely checked OK');

// ─── 2. Armor Mastery does not extend to shields in this axis either ──────

{
  const withMastery = ArmorAxisBEngine.computeMobilityCostAxis(
    heavyShield({ maxDexBonus: 2 }),
    { attributes: { dex: 5, str: 2 }, proficiencies: { heavy: true }, talents: { armorMastery: true } }
  );
  const withoutMastery = ArmorAxisBEngine.computeMobilityCostAxis(
    heavyShield({ maxDexBonus: 2 }),
    { attributes: { dex: 5, str: 2 }, proficiencies: { heavy: true }, talents: {} }
  );
  assert.equal(withMastery.dexCapLoss, withoutMastery.dexCapLoss, 'Armor Mastery must not change a shield\'s effective Max Dex cap in this axis, matching the live DefenseCalculator ruling');
  assert.equal(withMastery.dexCapLoss, 3, 'sanity: Dex 5 against a +2 Max Dex cap loses exactly 3, uninflated by Armor Mastery');
}

console.log('  [2/3] Armor Mastery does not increase an Energy Shield\'s effective Max Dex in this advisory axis, matching the live ruling OK');

// ─── 3. An uncapped Max Dex must not be silently treated as capped to +0 ───

{
  const uncapped = ArmorAxisBEngine.computeMobilityCostAxis(
    heavyShield({ maxDexBonus: null }),
    { attributes: { dex: 8, str: 2 }, proficiencies: { heavy: true }, talents: {} }
  );
  assert.equal(uncapped.dexCapLoss, 0, 'an explicitly uncapped Max Dex (null) must lose nothing to a Dex cap, not be silently treated as capped to +0');
}

console.log('  [3/3] an uncapped (null) Max Dex is never silently coerced into "capped to +0" OK');

console.log('armor-axis-b-shield-authority.test.mjs: all assertions passed');
