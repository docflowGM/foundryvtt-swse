import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Batch 2A — active Energy Shield Reflex/Max Dex
// authority in DefenseCalculator, the "Energy Shields never reduce speed"
// regression, InventoryEngine.toggleActivated() idempotence, and the
// Gar'ee real-actor golden case.
//
// FAIL-BEFORE: DefenseCalculator's Reflex computation modeled body armor's
// Max Dex cap and Armored-Defense-style level term, but had NO layer at all
// for an active Energy Shield's own Max Dex restriction or its
// nonproficiency Reflex consequences (-5 Reflex, deny positive Dex bonus to
// Reflex) -- an active shield changed nothing in Reflex Defense math
// whatsoever. Separately, several Energy Shield pack records (SR 15/20/25/
// 30) carried a stale speedPenalty: 2 despite their own description text
// saying shields do not reduce speed.
//
// This suite live-executes DefenseCalculator.calculate(), ModifierEngine,
// resolveAttackBonus, resolveArmorUsageEffects, and InventoryEngine
// (not reimplementations).

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const { DefenseCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js'
);
const { resolveArmorUsageEffects, ACP_AFFECTED_SKILLS } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/armor-usage-resolver.js'
);
const { ModifierEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js'
);
const { resolveAttackBonus } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js'
);
const { InventoryEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js'
);
const { ActorEngine } = await import(
  '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js'
);
const { registerArmorHydrationDefenseHotfix } = await import(
  '/systems/foundryvtt-swse/scripts/patches/armor-hydration-defense-hotfix.js'
);

function shieldItem(overrides = {}) {
  return {
    id: 'shield-1', name: 'Energy Shield (SR 10)', type: 'armor',
    system: {
      equipped: true, armorType: 'shield', armorProficiencyRequired: 'light',
      maxDexBonus: 4, armorCheckPenalty: -2, activated: true, shieldRating: 10, currentSR: 10,
      charges: { current: 4, max: 5 },
      ...overrides
    }
  };
}

function bodyArmorItem(maxDexBonus, overrides = {}) {
  return {
    id: 'armor-1', name: 'Body Armor', type: 'armor',
    system: { equipped: true, armorType: 'light', maxDexBonus, armorCheckPenalty: 0, reflexBonus: 0, fortitudeBonus: 0, ...overrides }
  };
}

function proficiencyFeat(type) {
  return { id: `feat-${type}`, name: `Armor Proficiency (${type})`, type: 'feat', system: {} };
}

function reflexActor(items, dexBase, { miscExtra = 0 } = {}) {
  return {
    type: 'character', items, effects: [],
    system: {
      attributes: { dex: { base: dexBase, racial: 0, enhancement: 0, temp: 0 } },
      abilities: {},
      defenses: { reflex: { misc: { user: { extra: miscExtra } } } },
      conditionTrack: { current: 0 }
    }
  };
}

// ─── 1. Item 9: simple Max Dex fixture, no body armor ──────────────────────
//        Dex +5, SR10 shield Max Dex +4: inactive uses +5 Dex; active
//        (proficient or not -- Max Dex applies regardless of proficiency)
//        uses +4 Dex.

{
  const inactive = await DefenseCalculator.calculate(reflexActor([shieldItem({ activated: false, currentSR: 0 })], 20), [], {}, {});
  const active = await DefenseCalculator.calculate(reflexActor([shieldItem(), proficiencyFeat('light')], 20), [], {}, {});
  assert.equal(inactive.reflex.total, 15, 'inactive shield: Reflex uses the full +5 Dex (10 + 5)');
  assert.equal(active.reflex.total, 14, 'active shield: Reflex is capped to +4 Dex by the shield\'s own Max Dex (10 + 4)');
  assert.equal(active.reflex.abilityMod, 4, 'the shield\'s Max Dex must clamp abilityMod itself, not just the total');
}

console.log('  [1/8] simple no-body-armor Max Dex fixture: inactive=+5 Dex, active=+4 Dex (shield cap) OK');

// ─── 2. Item 9: most restrictive of body-armor cap vs shield cap wins ──────

{
  const tighterBodyArmor = await DefenseCalculator.calculate(
    reflexActor([bodyArmorItem(2), shieldItem(), proficiencyFeat('light')], 20), [], {}, {}
  );
  assert.equal(tighterBodyArmor.reflex.abilityMod, 2, 'when body armor\'s cap (+2) is tighter than the shield\'s (+4), body armor\'s cap wins');

  const tighterShield = await DefenseCalculator.calculate(
    reflexActor([bodyArmorItem(6), shieldItem(), proficiencyFeat('light')], 20), [], {}, {}
  );
  assert.equal(tighterShield.reflex.abilityMod, 4, 'when the shield\'s cap (+4) is tighter than body armor\'s (+6), the shield\'s cap wins');
}

console.log('  [2/8] body armor and an active shield both impose Max Dex: the MORE RESTRICTIVE cap wins in either direction OK');

// ─── 3. Item 10: full nonproficiency Reflex math, Reflex-before-ability=20 ─

{
  const cases = [
    { label: 'Dex +5', dexBase: 20, inactive: 25, activeProficient: 24, activeNonproficient: 15 },
    { label: 'Dex +1', dexBase: 12, inactive: 21, activeProficient: 21, activeNonproficient: 15 },
    { label: 'Dex +0', dexBase: 10, inactive: 20, activeProficient: 20, activeNonproficient: 15 },
    { label: 'Dex -1 (a penalty, must never be removed)', dexBase: 8, inactive: 19, activeProficient: 19, activeNonproficient: 14 }
  ];
  for (const { label, dexBase, inactive, activeProficient, activeNonproficient } of cases) {
    const inactiveResult = await DefenseCalculator.calculate(reflexActor([shieldItem({ activated: false, currentSR: 0 })], dexBase, { miscExtra: 10 }), [], {}, {});
    const activeProfResult = await DefenseCalculator.calculate(reflexActor([shieldItem(), proficiencyFeat('light')], dexBase, { miscExtra: 10 }), [], {}, {});
    const activeNonprofResult = await DefenseCalculator.calculate(reflexActor([shieldItem()], dexBase, { miscExtra: 10 }), [], {}, {});
    assert.equal(inactiveResult.reflex.total, inactive, `[${label}] inactive`);
    assert.equal(activeProfResult.reflex.total, activeProficient, `[${label}] active, proficient`);
    assert.equal(activeNonprofResult.reflex.total, activeNonproficient, `[${label}] active, NOT proficient`);
    assert.equal(activeNonprofResult.reflex.shieldReflexPenalty, -5, `[${label}] the flat -5 nonproficiency penalty must be an explicit line item`);
  }
}

console.log('  [3/8] active-nonproficient-shield Reflex math matches the full required matrix (Dex +5/+1/0/-1) OK');

// ─── 4. Speed regression: SR15/20/25/30 (the confirmed stale pack data) ────
//        must never reduce speed, active or inactive, and never appear as a
//        speed.base modifier from ModifierEngine (which only ever reads
//        body armor for speed, but this proves the shared resolver and the
//        corrected pack/SSOT data agree it is exactly 0).

{
  for (const sr of [15, 20, 25, 30]) {
    const active = shieldItem({ shieldRating: sr, activated: true, currentSR: sr, speedPenalty: 2 });
    const effects = resolveArmorUsageEffects({ items: [active, proficiencyFeat('light')] });
    assert.equal(effects.activeEnergyShields[0].data.speedPenalty, 0, `SR ${sr} shield's resolved speedPenalty must be 0 even if the raw item record says 2`);
  }

  const actorNoBodyArmor = { items: [shieldItem({ shieldRating: 20, activated: true, currentSR: 20 }), proficiencyFeat('light')] };
  const modifiers = ModifierEngine._getItemModifiers(actorNoBodyArmor);
  assert.equal(modifiers.filter(m => m.target === 'speed.base').length, 0, 'an active Energy Shield must never register a speed.base modifier');
}

console.log('  [4/8] Energy Shields (including the previously-stale SR15/20/25/30 records) never reduce speed OK');

// ─── 5. InventoryEngine.toggleActivated(): idempotent activation cycle ─────
//        through the real production mutation path (ActorEngine.updateOwnedItems).

{
  const shield = shieldItem({ activated: false, currentSR: 0, charges: { current: 5, max: 5 } });
  const items = [shield];
  items.get = (id) => items.find(i => i.id === id);
  const actor = { id: 'toggle-actor', items, system: {} };

  const originalUpdateOwnedItems = ActorEngine.updateOwnedItems;
  ActorEngine.updateOwnedItems = async (targetActor, updates) => {
    for (const patch of updates) {
      const item = targetActor.items.get(patch._id);
      for (const [dotPath, value] of Object.entries(patch)) {
        if (dotPath === '_id') continue;
        const parts = dotPath.split('.');
        let node = item;
        for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {});
        node[parts[parts.length - 1]] = value;
      }
    }
  };

  try {
    const countShieldContributions = () => resolveArmorUsageEffects(actor).activeEnergyShields.length;

    assert.equal(countShieldContributions(), 0, 'baseline: inactive shield contributes nothing');

    await InventoryEngine.toggleActivated(actor, 'shield-1');
    assert.equal(shield.system.activated, true, 'activate: system.activated must flip true');
    assert.equal(shield.system.currentSR, 10, 'activate: currentSR must be set to the shield rating exactly once');
    assert.equal(shield.system.charges.current, 4, 'activate: exactly one charge must be consumed');
    assert.equal(countShieldContributions(), 1, 'after activation, the shield contributes exactly once');

    await InventoryEngine.toggleActivated(actor, 'shield-1');
    assert.equal(shield.system.activated, false, 'deactivate: system.activated must flip false');
    assert.equal(shield.system.currentSR, 0, 'deactivate: currentSR must return to 0');
    assert.equal(countShieldContributions(), 0, 'after deactivation, the shield contributes nothing');

    await InventoryEngine.toggleActivated(actor, 'shield-1');
    assert.equal(shield.system.activated, true, 'reactivate: system.activated must flip true again');
    assert.equal(shield.system.currentSR, 10, 'reactivate: currentSR must be set to the shield rating again');
    assert.equal(shield.system.charges.current, 3, 'reactivate: a second charge must be consumed, not the first re-applied');
    assert.equal(countShieldContributions(), 1, 'after reactivation, the shield contributes exactly once, not twice');

    // Repeated re-derivation (simulating prepareData/rerender/save-reload)
    // must not duplicate or lose the contribution.
    assert.equal(countShieldContributions(), 1);
    assert.equal(countShieldContributions(), 1);
  } finally {
    ActorEngine.updateOwnedItems = originalUpdateOwnedItems;
  }
}

console.log('  [5/8] InventoryEngine.toggleActivated(): inactive->activate->deactivate->reactivate leaves exactly one contribution each active state, never accumulated OK');

// ─── 6. Gar'ee real actor golden case ───────────────────────────────────────
//        Real exported item data (armor-energy-shield "Energy Shield (SR
//        10)" and "M1-10 Stalker Armor") and real "Armor Proficiency
//        (light)"/"Armor Proficiency (medium)" feats -- Gar'ee is proficient
//        with both. His shield's own listed fields: maxDexBonus 4,
//        armorCheckPenalty -2, armorProficiencyRequired "light". His body
//        armor's own listed armorCheckPenalty is `false` (0) -- a real
//        example of a per-item 0 that proficiency (he has it) suppresses
//        entirely regardless.

{
  const gareeShield = {
    id: '1xMjvsWJzcQ9Cl5L', name: 'Energy Shield (SR 10)', type: 'armor',
    system: {
      armorType: 'shield', reflexBonus: 0, fortitudeBonus: 0, maxDex: 4, shieldRating: 10,
      armorProficiencyRequired: 'light', charges: { current: 4, max: 5 }, activated: true,
      defenseBonus: 0, maxDexBonus: 4, armorCheckPenalty: -2, fortBonus: 0, speedPenalty: 0,
      equipped: true
    }
  };
  const gareeArmor = {
    id: '8ebDcuzqZNUfWCzD', name: 'M1-10 Stalker Armor', type: 'armor',
    system: {
      armorType: 'medium', reflexBonus: 8, fortitudeBonus: 3, maxDex: 4, shieldRating: 0,
      armorProficiencyRequired: '', charges: { current: 5, max: 5 }, activated: true,
      defenseBonus: 8, maxDexBonus: 4, armorCheckPenalty: false, fortBonus: 3, speedPenalty: 2,
      equipped: true, installedUpgrades: []
    }
  };
  const lightFeat = { id: 'garee-feat-light', name: 'Armor Proficiency (light)', type: 'feat', system: {} };
  const mediumFeat = { id: 'garee-feat-medium', name: 'Armor Proficiency (medium)', type: 'feat', system: {} };

  function gareeActor(shieldActive) {
    const shield = JSON.parse(JSON.stringify(gareeShield));
    shield.system.activated = shieldActive;
    shield.system.currentSR = shieldActive ? 10 : 0;
    const items = [shield, gareeArmor, lightFeat, mediumFeat];
    items.get = (id) => items.find(i => i.id === id);
    return {
      id: 'garee', type: 'character', flags: {}, items,
      system: { bab: 6, attributes: { str: { base: 14, racial: 0, enhancement: 0, temp: 0 }, dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } }, abilities: {}, speed: 6 },
      getFlag() { return undefined; }
    };
  }

  // 6a. Body armor ACP: proficient, so 0 -- even though the item's own
  // listed value is literally `false` (0), proving proficiency suppression
  // is checked first and never falls through to a category default when
  // proficient.
  const activeEffects = resolveArmorUsageEffects(gareeActor(true));
  const inactiveEffects = resolveArmorUsageEffects(gareeActor(false));
  assert.equal(activeEffects.bodyArmor.acp, 0, "Gar'ee is proficient with his Medium body armor: its ACP must be 0");
  assert.equal(activeEffects.bodyArmor.proficient, true);

  // 6b. Shield ACP: -2 while active, 0 while inactive, despite his real
  // proficiency (proficiency never suppresses an active shield's ACP).
  assert.equal(activeEffects.attackCheckPenalty, -2, "Gar'ee's active shield ACP must apply despite his proficiency");
  assert.equal(inactiveEffects.attackCheckPenalty, 0, "Gar'ee's inactive shield must contribute no ACP at all");

  // 6c. Skill deltas: every ACP-affected skill must shift by exactly the
  // shield's ACP (-2) between active and inactive, and no unaffected skill
  // may be touched at all -- proving the "every unaffected skill remains
  // identical" requirement directly against real item data.
  const activeModifiers = ModifierEngine._getItemModifiers(gareeActor(true));
  const inactiveModifiers = ModifierEngine._getItemModifiers(gareeActor(false));
  const activeSkillMods = activeModifiers.filter(m => m.target.startsWith('skill.'));
  const inactiveSkillMods = inactiveModifiers.filter(m => m.target.startsWith('skill.'));
  const activeSkillKeys = new Set(activeSkillMods.map(m => m.target.replace('skill.', '')));
  assert.equal(inactiveSkillMods.length, 0, "Gar'ee's inactive shield must add no skill modifiers");
  assert.equal(activeSkillMods.length, ACP_AFFECTED_SKILLS.length, "Gar'ee's active shield must add exactly the 7 canonical skill modifiers");
  for (const skill of ACP_AFFECTED_SKILLS) assert.ok(activeSkillKeys.has(skill), `${skill} must receive Gar'ee's active shield ACP`);
  for (const mod of activeSkillMods) assert.equal(mod.value, -2, `${mod.target} must shift by exactly -2 when the shield activates`);

  // 6d. Attack delta: active = inactive - 2, for the same weapon/context.
  const weapon = { id: 'w1', name: 'Blaster Pistol', type: 'weapon', system: { weaponType: 'ranged', damage: '3d6' } };
  const activeAttack = resolveAttackBonus(gareeActor(true), weapon, null, {});
  const inactiveAttack = resolveAttackBonus(gareeActor(false), weapon, null, {});
  assert.equal(activeAttack.total, inactiveAttack.total - 2, "Gar'ee's attack roll must drop by exactly 2 when his shield activates");

  // 6e. Speed invariant: his body armor's own legitimate -2 speed penalty
  // (a real, separate, correct effect) is identical whether or not the
  // shield is active -- the shield itself contributes no speed change.
  const activeSpeedMods = activeModifiers.filter(m => m.target === 'speed.base');
  const inactiveSpeedMods = inactiveModifiers.filter(m => m.target === 'speed.base');
  assert.deepEqual(activeSpeedMods.map(m => m.value), inactiveSpeedMods.map(m => m.value), "Gar'ee's speed-affecting modifiers must be identical whether his shield is active or inactive");
  assert.ok(activeSpeedMods.every(m => m.sourceId !== gareeShield.id), "Gar'ee's shield itself must never contribute a speed.base modifier");
}

console.log('  [6/8] Gar\'ee real-actor golden case: proficient body armor ACP=0 despite listed `false`, active shield ACP=-2 applies anyway, exactly the 7 canonical skills shift by -2, attack drops by exactly 2, speed unaffected OK');

// ─── 7. Certification parity: expected === resolveArmorUsageEffects === ───
//        ModifierEngine-registered skill modifiers === resolveAttackBonus,
//        for the combined "body armor + active shield" golden case (matrix
//        item 7/8).

{
  // Both proficiencies present: body armor ACP suppressed (0), shield ACP
  // always applies (-2) -> combined -2.
  const bothProficient = resolveArmorUsageEffects({ items: [bodyArmorItem(5, { armorCheckPenalty: -2 }), shieldItem(), proficiencyFeat('light')] });
  assert.equal(bothProficient.bodyArmor.acp, 0);
  assert.equal(bothProficient.attackCheckPenalty, -2);

  // Shield proficiency missing (but body armor's own proficiency present):
  // requires the shield's required category to differ from body armor's, so
  // "Armor Proficiency (light)" covers the body armor but not a
  // heavy-rated shield. Shield ACP is still the SAME -2 (proficiency never
  // changes an active shield's ACP) -- only the Reflex consequences (tested
  // above) differ.
  const shieldNonproficient = resolveArmorUsageEffects({
    items: [bodyArmorItem(5, { armorCheckPenalty: -2 }), shieldItem({ armorProficiencyRequired: 'heavy' }), proficiencyFeat('light')]
  });
  assert.equal(shieldNonproficient.bodyArmor.acp, 0, 'body armor proficiency is unaffected by the shield requiring a different category');
  assert.equal(shieldNonproficient.attackCheckPenalty, -2, 'a shield worn without its proficiency must still apply the same -2 ACP as when proficient');
  assert.equal(shieldNonproficient.activeEnergyShields[0].reflexPenalty, -5);
}

console.log('  [7/8] combined body-armor + active-shield golden matrix cases (both proficiencies vs shield proficiency missing) OK');

// ─── 8. Regression: DefenseCalculator's active-shield Reflex layer (body ──
//        armor ALSO worn) survives armor-hydration-defense-hotfix.js being
//        registered, and an uncapped body armor's Dex bonus is not silently
//        zeroed. armor-hydration-defense-hotfix.js no longer reconstructs
//        Reflex/Fortitude at all (Batch 2A correction -- see
//        tests/armor-hydration-hotfix-shadow-authority-removal.test.mjs for
//        the full invariant/fail-before suite covering that removal); it
//        now only normalizes armor equipped-state before calling the real,
//        untouched DefenseCalculator.calculate(), so this result is
//        DefenseCalculator's own canonical output, unmodified. Also guards
//        a defect this investigation surfaced directly in
//        DefenseCalculator: resolveArmorData() reports an "uncapped" Max
//        Dex as exactly `null`, but Number(null) is 0 (not NaN) --
//        wrapping it in Number() before Number.isFinite() silently turned
//        "uncapped" into "capped to +0", discarding the actor's entire
//        positive Dex bonus for any armor with no Max Dex limit.

{
  registerArmorHydrationDefenseHotfix();

  const uncappedBodyArmor = {
    id: 'armor-1', name: 'Uncapped Body Armor', type: 'armor',
    system: { equipped: true, armorType: 'light', armorCheckPenalty: 0, reflexBonus: 2, fortitudeBonus: 0 } // no maxDexBonus at all -> resolves to null ("uncapped")
  };
  const nonproficientShield = shieldItem({ armorProficiencyRequired: 'heavy' }); // actor below is only proficient in light

  const actorWithBoth = reflexActor([uncappedBodyArmor, nonproficientShield, proficiencyFeat('light')], 20);
  const result = await DefenseCalculator.calculate(actorWithBoth, [], {}, {});

  assert.equal(result.reflex.abilityMod, 4, 'uncapped body armor must not silently zero the Dex bonus; the shield\'s own +4 cap must still apply');
  assert.equal(result.reflex.shieldReflexPenalty, -5, 'the active-nonproficient-shield -5 Reflex penalty must survive with the hotfix registered');
  assert.equal(result.reflex.shieldDexReduction, -4, 'the shield\'s positive-Dex-bonus denial must survive with the hotfix registered');
  assert.equal(result.reflex.total, 10 + 2 /* levelContribution from reflexArmorBonus */ + 4 - 5 - 4, 'the canonical total must still include the shield\'s Reflex effects when body armor is also worn, with the hotfix registered');
}

console.log('  [8/8] DefenseCalculator\'s active-shield Reflex layer (body armor also worn) and the uncapped-Max-Dex fix both survive the hotfix being registered OK');

console.log('energy-shield-defense-and-activation-authority.test.mjs: all assertions passed');
