import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Batch 2B -- regression guard for the "Bluebolt"
// weapon melee/ranged schema defect, run against real production code.
//
// This file originally proved the FAIL-BEFORE state (before any Batch 2B
// production code changes): combat-stat-rules.js#isRangedWeapon/isMeleeWeapon
// and weapon-range-profile-resolver.js#resolveForWeapon() both trusted the
// schema-defaulted meleeOrRanged field over the reliable weaponCategory
// field and misclassified Gar'ee's real Bluebolt Blaster Pistol as melee.
// That fail-before run was captured and reviewed before implementation, per
// the freeze charter's audit-then-fix sequencing. Now that the fix has
// landed (scripts/items/weapon-branch-resolver.js is the single canonical
// authority every consumer below delegates to), this file's assertions are
// flipped to assert the CORRECT state permanently, so this exact regression
// can never silently return.
//
// Gar'ee's real exported Bluebolt Blaster Pistol:
//   { meleeOrRanged: "melee", weaponCategory: "ranged", proficiency: "pistols",
//     subcategory: "pistol", attackAttribute: "dex", range: "18 squares" }
//
// Confirmed root cause (not just this one actor): template.json's own
// weapon schema defaults meleeOrRanged to "melee" for ANY weapon document
// whose source data omits the field. The shipped pack record for this
// exact weapon (packs/weapons-pistols.db#weapon-bluebolt-blaster-pistol)
// never declares meleeOrRanged at all -- Foundry's DataModel fills the gap
// at materialization time, not any bespoke JS bug. A full pack scan found
// 302 shipped ranged-categorized weapon records with the identical
// meleeOrRanged-absent shape, zero of them conflicting -- Bluebolt is the
// general case, not a special one.

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: { settings: { get: () => undefined, set: () => {}, settings: { has: () => true } } }
});

function bluebolt() {
  return {
    id: '8xBluebolt', name: 'Bluebolt Blaster Pistol', type: 'weapon',
    system: {
      damage: '3d8', damageType: 'energy', attackBonus: 0, attackAttribute: 'dex',
      range: '18 squares', weight: 1.6, cost: 850, equipped: true,
      properties: ['Military', 'Inaccurate'], ammunition: { type: 'none', current: 0, max: 0 },
      weaponCategory: 'ranged', proficiency: 'pistols', subcategory: 'pistol', category: 'pistol',
      // The exact schema-defaulted contradiction, matching Gar'ee's real actor export.
      meleeOrRanged: 'melee'
    }
  };
}

const { isRangedWeapon: statRulesIsRanged, isMeleeWeapon: statRulesIsMelee } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js'
);

console.log('weapon-branch-classification-fail-before.test.mjs (now a regression guard)');

// ─── 1. combat-stat-rules.js must no longer misclassify Bluebolt as melee ─

{
  const weapon = bluebolt();
  const ranged = statRulesIsRanged(weapon);
  const melee = statRulesIsMelee(weapon);
  assert.equal(ranged, true, 'combat-stat-rules.js must report Bluebolt as ranged (regression guard for the fixed "Bluebolt" defect)');
  assert.equal(melee, false, 'combat-stat-rules.js must not report Bluebolt as melee');
}

console.log('  [1/3] combat-stat-rules.js correctly identifies Bluebolt as ranged OK');

// ─── 2. weapon-range-profile-resolver.js must hydrate Bluebolt's range ────
//        bands instead of silently dropping them.

{
  const { WeaponRangeProfileResolver } = await import(
    '/systems/foundryvtt-swse/scripts/items/weapon-range-profile-resolver.js'
  );
  const profile = await WeaponRangeProfileResolver.resolveForWeapon(bluebolt());
  assert.ok(profile, 'the range-profile resolver must hydrate range bands for a real ranged pistol, not return null');
  assert.equal(profile.profileId, 'pistols');
}

console.log('  [2/3] weapon-range-profile-resolver.js correctly hydrates Bluebolt\'s pistol range bands OK');

// ─── 3. weapon-data-resolver.js remains correct (it was already correct, ──
//        conflict-aware, before this batch -- still true after delegating
//        to the shared canonical authority).

{
  const { default: resolveWeaponData } = await import(
    '/systems/foundryvtt-swse/scripts/items/weapon-data-resolver.js'
  );
  const resolved = resolveWeaponData(bluebolt());
  assert.equal(resolved.branch, 'ranged');
}

console.log('  [3/3] weapon-data-resolver.js still correctly resolves Bluebolt to ranged OK');

console.log('weapon-branch-classification-fail-before.test.mjs: all assertions passed');
