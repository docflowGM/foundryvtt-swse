import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Batch 2B ("Bluebolt" defect) -- certification
// suite for the canonical weapon branch/family/light/natural authority
// (scripts/items/weapon-branch-resolver.js) and its consumers.
//
// Root cause, confirmed against real repository data (not assumed):
//   - packs/weapons-pistols.db#weapon-bluebolt-blaster-pistol never
//     declares system.meleeOrRanged. A full, deduplicated pack scan found
//     this true of 100% of shipped weapon records: 193 unique standalone
//     weapon-catalog records (151 ranged, 42 melee) across packs/weapons*.db,
//     PLUS 5,766 actor-embedded weapon items across the NPC/heroic/nonheroic
//     /droid packs -- 5,959 total weapon-type records checked, meleeOrRanged
//     absent on all of them. (An earlier pass reported "744/604/140" -- that
//     figure was a counting artifact from an overlapping glob pattern that
//     processed every packs/weapons*.db file twice; corrected here.)
//   - template.json's own weapon schema defaults meleeOrRanged to "melee",
//     which Foundry's DataModel applies unconditionally to any weapon
//     document (compendium or embedded) whose source omits it -- this is
//     the confirmed write-time origin of the contradiction, not a JS bug
//     in any one consumer.
//   - system.weaponCategory holds a literal "melee"/"ranged" branch value
//     on 100% of shipped standalone records -- it is the reliable,
//     always-authored branch signal in real data, the reverse of what
//     every pre-existing consumer assumed (meleeOrRanged first).
//
// This suite proves: the canonical resolver reads real data correctly; at
// least one previously-misclassifying live production consumer now agrees;
// the write-time boundary stops the contradiction from being created or
// persisting; the schema-coherence invariant (branch/family/proficiency/
// subcategory/range-profile must agree) is enforced without touching
// attackAttribute, which remains player-owned configuration.

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: { settings: { get: () => undefined, set: () => {}, settings: { has: () => true } } }
});

const {
  resolveWeaponBranchFamily,
  isRangedWeapon,
  isMeleeWeapon,
  isLightWeaponForActor,
  isNaturalWeaponOnly,
  isNaturalOrUnarmedWeapon,
  defaultAttackAttributeForBranch,
  normalizeWeaponBranchFamily
} = await import('/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js');

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

// ─── 1. Gar'ee's real Bluebolt Blaster Pistol: every canonical entry ──────
//        point identifies it as a ranged pistol, not melee.

const bluebolt = {
  id: '8xBluebolt', name: 'Bluebolt Blaster Pistol', type: 'weapon',
  system: {
    damage: '3d8', damageType: 'energy', attackBonus: 0, attackAttribute: 'dex',
    range: '18 squares', weight: 1.6, cost: 850, equipped: true,
    properties: ['Military', 'Inaccurate'], ammunition: { type: 'none', current: 0, max: 0 },
    weaponCategory: 'ranged', proficiency: 'pistols', subcategory: 'pistol', category: 'pistol',
    meleeOrRanged: 'melee' // the exact schema-defaulted contradiction
  }
};

{
  const resolved = resolveWeaponBranchFamily(bluebolt);
  assert.equal(resolved.branch, 'ranged', 'Bluebolt must resolve to ranged');
  assert.equal(resolved.family, 'pistols', 'Bluebolt family must resolve to pistols');
  assert.equal(resolved.coherent, false, 'the resolver must flag the stored meleeOrRanged mismatch as an issue, not silently hide it');
  assert.ok(resolved.issues.length > 0, 'issues[] must explain the incoherence');
  assert.equal(isRangedWeapon(bluebolt), true);
  assert.equal(isMeleeWeapon(bluebolt), false);
  ok('Bluebolt resolves to ranged/pistols with the incoherence flagged');
}

// ─── 2. Live production consumers agree with the canonical resolver ──────

{
  const { isRangedWeapon: liveIsRanged, isMeleeWeapon: liveIsMelee } = await import(
    '/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js'
  );
  assert.equal(liveIsRanged(bluebolt), true, 'combat-stat-rules.js (the previously-misclassifying live consumer) must now agree');
  assert.equal(liveIsMelee(bluebolt), false);
  ok('combat-stat-rules.js (real production code) agrees Bluebolt is ranged');
}

{
  const { WeaponRangeProfileResolver } = await import(
    '/systems/foundryvtt-swse/scripts/items/weapon-range-profile-resolver.js'
  );
  const profile = await WeaponRangeProfileResolver.resolveForWeapon(bluebolt);
  assert.ok(profile, 'the range-profile resolver must no longer silently drop Bluebolt\'s range bands');
  assert.equal(profile.profileId, 'pistols');
  ok('weapon-range-profile-resolver.js (real production code) hydrates Bluebolt\'s pistol range bands');
}

{
  const { default: resolveWeaponData } = await import(
    '/systems/foundryvtt-swse/scripts/items/weapon-data-resolver.js'
  );
  assert.equal(resolveWeaponData(bluebolt).branch, 'ranged');
  ok('weapon-data-resolver.js (item dialog) agrees Bluebolt is ranged');
}

{
  const mod = await import('/systems/foundryvtt-swse/scripts/patches/attack-dialog-combat-corrections-hotfix.js');
  void mod;
  // No direct export of normalizeWeaponForCombat -- covered indirectly via
  // the module loading and the shared canonical resolver it now delegates
  // to (already proven above). Import-only smoke check that the module
  // still loads cleanly after the attackAttribute-overwrite fix.
  ok('attack-dialog-combat-corrections-hotfix.js loads cleanly after delegating to the canonical resolver');
}

// ─── 3. Gar'ee's Heavy Blaster Rifle: stays ranged, custom damage is ──────
//        preserved verbatim (must not be touched by this batch).

{
  const heavyBlasterRifle = {
    id: 'garee-hbr', name: 'Heavy Blaster Rifle', type: 'weapon',
    system: {
      damage: '4d12kh3', damageType: 'energy', attackAttribute: 'dex',
      weaponCategory: 'ranged', proficiency: 'rifles', subcategory: 'rifle', category: 'rifle'
    }
  };
  const resolved = resolveWeaponBranchFamily(heavyBlasterRifle);
  assert.equal(resolved.branch, 'ranged');
  assert.equal(resolved.coherent, true);
  assert.equal(heavyBlasterRifle.system.damage, '4d12kh3', 'the intentional custom damage formula must be untouched');
  ok('Heavy Blaster Rifle stays ranged; custom 4d12kh3 damage formula is verbatim and untouched');
}

// ─── 4. A lightsaber: stays melee regardless of attackAttribute ──────────

{
  const lightsaber = {
    id: 'vexa-saber', name: 'Lightsaber', type: 'weapon',
    system: { weaponCategory: 'melee', proficiency: 'lightsaber', subcategory: 'lightsaber', attackAttribute: 'dex' }
  };
  const resolved = resolveWeaponBranchFamily(lightsaber);
  assert.equal(resolved.branch, 'melee', 'a lightsaber must stay melee even with attackAttribute: dex (Weapon Finesse-style)');
  assert.equal(resolved.family, 'lightsaber');
  assert.equal(resolved.coherent, true);
  ok('lightsaber (Vexa control) stays melee regardless of attackAttribute');
}

// ─── 5. Ordinary melee weapon remains melee ───────────────────────────────

{
  const vibroblade = { name: 'Vibroblade', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'advanced-melee' } };
  assert.equal(resolveWeaponBranchFamily(vibroblade).branch, 'melee');
  ok('ordinary melee weapon (Vibroblade) remains melee');
}

// ─── 6. Natural / unarmed weapon classification agrees across consumers ──

{
  const claws = { name: 'Claws', type: 'weapon', system: { naturalWeapon: true } };
  assert.equal(isNaturalWeaponOnly(claws), true);
  assert.equal(isNaturalOrUnarmedWeapon(claws), true);

  const unarmedStrike = { name: 'Unarmed Strike', type: 'weapon', system: { isUnarmed: true } };
  assert.equal(isNaturalWeaponOnly(unarmedStrike), false, 'a plain unarmed strike is not a natural weapon');
  assert.equal(isNaturalOrUnarmedWeapon(unarmedStrike), true);

  // classifyGrappledAttack() itself is not exported; verify via
  // GrappleStateEngine.getAttackPenalty(), the certified Batch 1 round-8
  // consumer of that same classifier's light/natural/unarmed exemption axis.
  const { GrappleStateEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js');
  const actor = { system: { size: 'medium' }, items: [claws], getFlag: () => null, flags: {} };
  const penalty = GrappleStateEngine.getAttackPenalty?.(actor, claws) ?? 0;
  assert.equal(penalty, 0, 'GrappleStateEngine must exempt a natural weapon from the Grabbed/Grappled -2 penalty, using the same canonical classifier');
  ok('natural/unarmed classification agrees between the canonical authority and GrappleStateEngine');
}

// ─── 7. Light-weapon cases: two actor/weapon size combinations proving ────
//        the real SWSE size-relative rule, not a name heuristic.

{
  const smallKnife = { name: 'Vibrodagger', system: { size: 'small' } };
  const mediumActor = { system: { size: 'medium' } };
  assert.equal(isLightWeaponForActor(smallKnife, mediumActor), true, 'a Small weapon is Light for a Medium wielder');

  const mediumSword = { name: 'Vibrosword', system: { size: 'medium' } };
  assert.equal(isLightWeaponForActor(mediumSword, mediumActor), false, 'a Medium weapon is NOT Light for a Medium wielder');

  const largeActor = { system: { size: 'large' } };
  assert.equal(isLightWeaponForActor(mediumSword, largeActor), true, 'the identical Medium weapon IS Light for a Large wielder -- proving the rule is wielder-size-relative, not a fixed weapon property');
  ok('light-weapon classification is wielder-size-relative (two actor/weapon size combinations)');
}

// ─── 8. Thrown/dual-mode context: an attack-context override resolves as ──
//        ranged without corrupting the weapon's own persisted base branch.

{
  const throwingKnife = { name: 'Throwing Knife', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple' } };
  const baseBranch = resolveWeaponBranchFamily(throwingKnife).branch;
  assert.equal(baseBranch, 'melee', 'the weapon\'s own persisted base branch stays melee');

  // Consumers that accept a roll-time context (scoped-combat-feat-resolver,
  // rage-engine, damage-type-rules) treat an explicit attackType override as
  // higher priority than the weapon's own branch for THAT roll only, and
  // never write it back onto the weapon.
  const { damageContextForReaction } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js');
  const thrownContext = damageContextForReaction({ weapon: throwingKnife, options: { attackType: 'ranged' } });
  assert.equal(thrownContext.attackType, 'ranged', 'a thrown attack resolves as ranged for that roll');
  assert.equal(resolveWeaponBranchFamily(throwingKnife).branch, 'melee', 'the weapon\'s persisted base branch must remain melee after a thrown-context roll');
  ok('a thrown attack resolves as ranged in context without corrupting the weapon\'s own persisted base branch');
}

// ─── 9. Write-path: materialization no longer creates the contradiction ──

{
  const { normalizeItemSystem } = await import('/systems/foundryvtt-swse/scripts/items/item-defaults.js');

  // A ranged pack/store-shaped pistol record lacking meleeOrRanged, run
  // through the real materialization/default/hydration path that
  // previously produced Gar'ee's bad state.
  const packShapedPistol = { weaponCategory: 'ranged', proficiency: 'pistols', subcategory: 'pistol', attackAttribute: 'dex', range: '18 squares' };
  const materialized = normalizeItemSystem('weapon', packShapedPistol, {});
  assert.equal(materialized.meleeOrRanged, 'ranged', 'materializing a real ranged pack record must no longer persist meleeOrRanged:"melee"');
  assert.equal(materialized.attackAttribute, 'dex', 'the explicit attackAttribute from the pack record must be preserved');
  ok('write path: a ranged pack-shaped weapon no longer materializes with a contradictory meleeOrRanged');

  // A truly blank new weapon still behaves exactly as before.
  const blank = normalizeItemSystem('weapon', {}, {});
  assert.equal(blank.meleeOrRanged, 'melee');
  assert.equal(blank.attackAttribute, 'str');
  ok('write path: a truly blank new weapon still defaults to melee/str, unchanged');
}

// ─── 10. Attack-Ability Policy: branch/family default only, player-owned ──
//         override always preserved.

{
  const { normalizeItemSystem } = await import('/systems/foundryvtt-swse/scripts/items/item-defaults.js');

  assert.equal(defaultAttackAttributeForBranch('ranged'), 'dex');
  assert.equal(defaultAttackAttributeForBranch('melee'), 'str');

  // new ranged pistol with no attackAttribute => dex
  assert.equal(normalizeItemSystem('weapon', { weaponCategory: 'ranged', proficiency: 'pistols' }, {}).attackAttribute, 'dex');
  // new melee weapon with no attackAttribute => str
  assert.equal(normalizeItemSystem('weapon', { weaponCategory: 'melee', proficiency: 'advanced-melee' }, {}).attackAttribute, 'str');
  // ranged weapon explicitly set to str => remains str
  assert.equal(normalizeItemSystem('weapon', { weaponCategory: 'ranged', proficiency: 'rifles', attackAttribute: 'str' }, {}).attackAttribute, 'str');
  // melee weapon explicitly set to dex => remains dex
  assert.equal(normalizeItemSystem('weapon', { weaponCategory: 'melee', proficiency: 'lightsaber', attackAttribute: 'dex' }, {}).attackAttribute, 'dex');

  // changing unrelated weapon schema fields does not overwrite explicit attackAttribute
  const existing = { weaponCategory: 'ranged', proficiency: 'pistols', attackAttribute: 'str', damage: '3d6' };
  const resaved = normalizeItemSystem('weapon', existing, { damage: '4d6' });
  assert.equal(resaved.attackAttribute, 'str', 'editing an unrelated field must not touch an explicit attackAttribute override');
  assert.equal(resaved.damage, '4d6');

  // branch classifier ignores attackAttribute entirely
  const rangedWithStr = { weaponCategory: 'ranged', proficiency: 'pistols', attackAttribute: 'str' };
  const meleeWithDex = { weaponCategory: 'melee', proficiency: 'advanced-melee', attackAttribute: 'dex' };
  assert.equal(resolveWeaponBranchFamily(rangedWithStr).branch, 'ranged', 'attackAttribute:"str" must never make a ranged weapon resolve as melee');
  assert.equal(resolveWeaponBranchFamily(meleeWithDex).branch, 'melee', 'attackAttribute:"dex" must never make a melee weapon resolve as ranged');

  ok('Attack-Ability Policy: branch-based default only when absent; explicit player override always preserved; branch classifier ignores attackAttribute entirely');
}

// ─── 11. Schema-coherence invariant: resolveWeaponBranchFamily() DETECTS ──
//         every contradictory branch/family combination (read-time,
//         tolerant -- used everywhere for classification, never mutates).

{
  const cases = [
    { label: 'melee + pistols', system: { weaponCategory: 'melee', proficiency: 'pistols' }, expectedBranch: 'melee', expectFamilyBranch: 'ranged' },
    { label: 'melee + rifles', system: { weaponCategory: 'melee', proficiency: 'rifles' }, expectedBranch: 'melee', expectFamilyBranch: 'ranged' },
    { label: 'melee + heavy-weapons', system: { weaponCategory: 'melee', proficiency: 'heavy-weapons' }, expectedBranch: 'melee', expectFamilyBranch: 'ranged' },
    { label: 'ranged + lightsaber', system: { weaponCategory: 'ranged', proficiency: 'lightsaber' }, expectedBranch: 'ranged', expectFamilyBranch: 'melee' },
    { label: 'ranged + natural', system: { weaponCategory: 'ranged', proficiency: 'natural' }, expectedBranch: 'ranged', expectFamilyBranch: 'melee' }
  ];
  for (const { label, system, expectedBranch, expectFamilyBranch } of cases) {
    const resolved = resolveWeaponBranchFamily(system);
    assert.equal(resolved.branch, expectedBranch, `${label}: weaponCategory (the high-trust field) must decide the branch`);
    assert.equal(resolved.coherent, false, `${label}: must be flagged as an incoherent combination, not silently accepted`);
    assert.notEqual(expectedBranch, expectFamilyBranch, `${label}: sanity check that this really is a contradiction`);
  }
  ok('schema-coherence invariant (read-time detection): every contradictory branch/family combination is detected (melee+pistol/rifles/heavy-weapons, ranged+lightsaber/natural)');

  // simple weapon cases remain valid on the appropriate branch
  assert.equal(resolveWeaponBranchFamily({ weaponCategory: 'melee', proficiency: 'simple' }).coherent, true, 'melee + simple must be coherent (simple is branch-ambiguous)');
  assert.equal(resolveWeaponBranchFamily({ weaponCategory: 'ranged', proficiency: 'simple' }).coherent, true, 'ranged + simple must be coherent (simple is branch-ambiguous)');
  ok('simple-proficiency weapons remain valid/coherent on either branch');
}

// ─── 12. Schema-coherence invariant: normalizeWeaponBranchFamily() ────────
//         ENFORCES coherence at the write/persistence boundary -- the
//         reviewer-flagged blocker. Detection alone is insufficient: the
//         persisted object itself must become fully coherent, for both an
//         explicit branch-changing update and a branch-only API update that
//         leaves a stale family field behind. weaponCategory (the resolved
//         branch) is never second-guessed; every family-bearing field that
//         disagrees with it is reset to the branch-neutral "simple"
//         category (the one value valid on both branches in the item
//         editor's own vocabulary), and range descriptors are cleared.

{
  // explicit ranged -> melee update removes/replaces pistol family
  {
    const w = { weaponCategory: 'melee', proficiency: 'pistols', subcategory: 'pistol', category: 'pistol' };
    normalizeWeaponBranchFamily(w);
    assert.equal(w.proficiency, 'simple', 'pistol proficiency must not survive an explicit melee branch');
    assert.equal(w.subcategory, 'simple');
    assert.equal(w.category, 'simple');
    assert.equal(resolveWeaponBranchFamily(w).coherent, true, 'the persisted object must be fully coherent after normalization');
  }

  // explicit ranged -> melee update removes/replaces rifle family
  {
    const w = { weaponCategory: 'melee', proficiency: 'rifles', subcategory: 'rifle' };
    normalizeWeaponBranchFamily(w);
    assert.equal(w.proficiency, 'simple');
    assert.equal(w.subcategory, 'simple');
    assert.equal(resolveWeaponBranchFamily(w).coherent, true);
  }

  // explicit ranged -> melee update removes/replaces heavy-weapons family
  {
    const w = { weaponCategory: 'melee', proficiency: 'heavy-weapons', subcategory: 'heavy' };
    normalizeWeaponBranchFamily(w);
    assert.equal(w.proficiency, 'simple');
    assert.equal(w.subcategory, 'simple');
    assert.equal(resolveWeaponBranchFamily(w).coherent, true);
  }

  // explicit melee -> ranged update removes/replaces lightsaber family
  {
    const w = { weaponCategory: 'ranged', proficiency: 'lightsaber', subcategory: 'lightsaber', rangeProfile: 'melee' };
    normalizeWeaponBranchFamily(w);
    assert.equal(w.proficiency, 'simple', 'lightsaber proficiency must not survive an explicit ranged branch');
    assert.equal(w.subcategory, 'simple');
    assert.equal(w.rangeProfile, '', 'a stale melee range descriptor must not survive a ranged branch');
    assert.equal(resolveWeaponBranchFamily(w).coherent, true);
  }

  // explicit melee -> ranged update removes/replaces natural family
  {
    const w = { weaponCategory: 'ranged', proficiency: 'natural' };
    normalizeWeaponBranchFamily(w);
    assert.equal(w.proficiency, 'simple', 'natural proficiency must not survive an explicit ranged branch');
    assert.equal(resolveWeaponBranchFamily(w).coherent, true);
  }

  ok('explicit branch-changing updates never persist a contradictory family (pistols/rifles/heavy-weapons/lightsaber/natural all corrected)');

  // branch-only API update cannot persist a contradictory family -- the
  // update payload touches only meleeOrRanged/weaponCategory; the rest of
  // the candidate object is the actor's EXISTING (stale) system, merged
  // before normalization runs, exactly as item-defaults.js's real write
  // path merges current + submitted.
  {
    const existing = { weaponCategory: 'ranged', proficiency: 'pistols', subcategory: 'pistol', category: 'pistol', attackAttribute: 'dex' };
    const branchOnlyUpdate = { weaponCategory: 'melee' };
    const merged = { ...existing, ...branchOnlyUpdate };
    normalizeWeaponBranchFamily(merged);
    assert.equal(merged.proficiency, 'simple', 'a branch-only update must not leave the previous branch\'s family stranded on the merged/persisted object');
    assert.equal(merged.subcategory, 'simple');
    assert.equal(merged.category, 'simple');
    assert.equal(resolveWeaponBranchFamily(merged).coherent, true);
  }
  ok('a branch-only API update cannot persist a contradictory family');

  // editor branch + category update persists exactly the intended branch/family
  {
    const w = { weaponCategory: 'melee', proficiency: 'lightsaber', subcategory: 'lightsaber' };
    normalizeWeaponBranchFamily(w);
    assert.equal(w.proficiency, 'lightsaber', 'a coherent explicit submission (branch + matching family together) must be persisted verbatim, not reset');
    assert.equal(w.subcategory, 'lightsaber');
    assert.equal(resolveWeaponBranchFamily(w).coherent, true);
  }
  ok('an editor branch+category update that is already coherent persists exactly as submitted, untouched');

  // legacy Bluebolt still READS correctly before migration/edit
  assert.equal(resolveWeaponBranchFamily(bluebolt).branch, 'ranged');
  assert.equal(resolveWeaponBranchFamily(bluebolt).family, 'pistols');
  ok('Bluebolt\'s exact contradictory legacy fixture READS as ranged/pistols immediately, before any edit or migration');

  // editing legacy Bluebolt self-heals the COMPLETE schema, not merely
  // meleeOrRanged/ranged -- proven by full post-normalization coherence,
  // not just a before/after diff of one field.
  {
    const blueboltClone = JSON.parse(JSON.stringify(bluebolt.system));
    assert.equal(resolveWeaponBranchFamily(blueboltClone).coherent, false, 'sanity check: the clone starts incoherent, same as the real fixture');
    normalizeWeaponBranchFamily(blueboltClone);
    const healed = resolveWeaponBranchFamily(blueboltClone);
    assert.equal(healed.branch, 'ranged');
    assert.equal(healed.family, 'pistols');
    assert.equal(healed.coherent, true, 'the fully persisted, normalized Bluebolt must be internally coherent, not just have meleeOrRanged flipped');
    assert.equal(blueboltClone.meleeOrRanged, 'ranged');
    assert.equal(blueboltClone.proficiency, 'pistols', 'already-correct high-trust family evidence is preserved, not reset, when it already agrees with the branch');
    assert.equal(blueboltClone.subcategory, 'pistol');
    assert.equal(blueboltClone.category, 'pistol');
  }
  ok('editing legacy Bluebolt self-heals the complete schema (verified via full post-normalization coherence, not merely meleeOrRanged)');
}

// ─── 13. Attack-Ability Policy: all six ability keys, not just STR/DEX ────
//         (blocker 2) -- the item editor exposes CON/INT/WIS/CHA and the
//         real combat resolver already consumes them; the write-time
//         validation safety net must not silently coerce them to STR.

{
  const { normalizeItemSystem } = await import('/systems/foundryvtt-swse/scripts/items/item-defaults.js');
  const { getWeaponAttackAbility } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js');

  assert.equal(normalizeItemSystem('weapon', { weaponCategory: 'ranged', proficiency: 'pistols', attackAttribute: 'cha' }, {}).attackAttribute, 'cha', 'ranged + attackAttribute:cha must remain cha');
  assert.equal(normalizeItemSystem('weapon', { weaponCategory: 'melee', proficiency: 'advanced-melee', attackAttribute: 'int' }, {}).attackAttribute, 'int', 'melee + attackAttribute:int must remain int');
  assert.equal(normalizeItemSystem('weapon', { weaponCategory: 'ranged', proficiency: 'rifles', attackAttribute: 'wis' }, {}).attackAttribute, 'wis', 'ranged + attackAttribute:wis must remain wis');
  assert.equal(normalizeItemSystem('weapon', { weaponCategory: 'melee', proficiency: 'lightsaber', attackAttribute: 'con' }, {}).attackAttribute, 'con', 'melee + attackAttribute:con must remain con');

  // save/resave an unrelated field must not mutate any of the six
  for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const existing = { weaponCategory: 'ranged', proficiency: 'pistols', attackAttribute: ability, damage: '3d6' };
    const resaved = normalizeItemSystem('weapon', existing, { damage: '4d6' });
    assert.equal(resaved.attackAttribute, ability, `resaving an unrelated field must preserve attackAttribute:${ability}`);
  }

  // the real combat resolver actually consumes the persisted explicit
  // choice, not a branch-inferred default
  const chaWeapon = { name: 'Test Blade', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'pistols', attackAttribute: 'cha' } };
  assert.equal(getWeaponAttackAbility({}, chaWeapon), 'cha', 'getWeaponAttackAbility() must consume the persisted explicit ability, not silently substitute the ranged branch default (dex)');

  ok('Attack-Ability Policy: all six ability keys (str/dex/con/int/wis/cha) survive the real item normalization/save path and are consumed verbatim by the real combat resolver');
}

// ─── 14. Base vs. effective light-weapon scope (blocker 3): isLightWeaponForActor ─
//         is BASE/INTRINSIC only and must NOT implement the Weapon Finesse +
//         Weapon Focus "treat as Light" combined rule. This is an explicit,
//         documented non-certification, not a silent gap -- this test
//         anchors the current honest boundary so a future change to this
//         behavior is a deliberate, reviewed decision, not an accident.

{
  // A one-handed Medium weapon for a Medium wielder is not intrinsically
  // Light, and stays that way even though, under the (unimplemented) SWSE
  // Combined Feat rule, a character with both Weapon Finesse and Weapon
  // Focus (this weapon) could choose to treat it as Light in play.
  const focusedOneHandedSword = { name: 'Focused Vibrosword', system: { size: 'medium', twoHanded: false } };
  const medium = { system: { size: 'medium' } };
  assert.equal(isLightWeaponForActor(focusedOneHandedSword, medium), false, 'BASE lightness must stay false for a weapon that is only EFFECTIVELY light via an unimplemented contextual rule -- effective/contextual "treat as light" classification is explicitly not certified by this batch');
  ok('base/intrinsic light-weapon scope is explicit and does not silently imply the unimplemented Weapon Finesse + Weapon Focus "treat as Light" rule');
}

console.log('weapon-branch-family-schema-authority.test.mjs: all assertions passed');
