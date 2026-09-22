import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Batch 2A — ordinary body armor's Armor Check
// Penalty (ACP) and Energy Shield ACP, unified under one shared authority
// (scripts/engine/effects/armor-usage-resolver.js).
//
// FAIL-BEFORE (the confirmed defect this suite locks against a regression
// of): ModifierEngine._getItemModifiers() computed
//   acp = armor.armorCheckPenalty; if (!proficient) acp += categoryPenalty;
// For a Light armor item with its own listed armorCheckPenalty: -2 (light's
// own category default is also -2), this gave:
//   proficient:     acp = -2   (WRONG -- SWSE RAW: proficiency suppresses
//                               ordinary armor's ACP entirely; expected 0)
//   not proficient: acp = -2 + -2 = -4  (WRONG -- double-counted the
//                               armor's own listed penalty against the
//                               category default; expected -2)
// Separately, Energy Shields were excluded from this computation, from
// resolveAttackBonus() (which had NO armor/shield ACP term at all), and
// from armor-benefit-simulator.js's effectiveArmorCheckPenalty() (which
// returned 0 whenever proficient -- correct for ordinary armor, backwards
// for an active Energy Shield, whose listed ACP always applies once active).
//
// This suite live-executes the real production authorities (not
// reimplementations): armor-usage-resolver.js, ModifierEngine._getItemModifiers,
// combat-roll-math.js#resolveAttackBonus, and armor-benefit-simulator.js.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const { resolveArmorUsageEffects, ACP_AFFECTED_SKILLS } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/armor-usage-resolver.js'
);
const { ModifierEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js'
);
const { resolveAttackBonus } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js'
);
const { evaluateArmorBenefit } = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/armor-benefit-simulator.js'
);

function makeItemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find(i => i.id === id);
  return arr;
}

function lightArmor(overrides = {}) {
  return {
    id: 'armor-1', name: 'Test Light Armor', type: 'armor',
    system: { equipped: true, armorType: 'light', armorCheckPenalty: -2, maxDexBonus: 5, reflexBonus: 2, fortitudeBonus: 0, ...overrides }
  };
}

function shieldItem(overrides = {}) {
  return {
    id: 'shield-1', name: 'Energy Shield (SR 10)', type: 'armor',
    system: {
      equipped: true, armorType: 'shield', armorProficiencyRequired: 'light',
      maxDexBonus: 4, armorCheckPenalty: -2, activated: true, shieldRating: 10, currentSR: 10,
      ...overrides
    }
  };
}

function proficiencyFeat(type) {
  return { id: `feat-${type}`, name: `Armor Proficiency (${type})`, type: 'feat', system: {} };
}

function actorWith(items) {
  return { id: 'test-actor', type: 'character', flags: {}, system: {}, items: makeItemsCollection(items), getFlag() { return undefined; } };
}

// ─── 1. Fail-before-documented: ordinary Light armor ACP ───────────────────

{
  const proficientActor = actorWith([lightArmor(), proficiencyFeat('light')]);
  const nonproficientActor = actorWith([lightArmor()]);

  const proficientEffects = resolveArmorUsageEffects(proficientActor);
  const nonproficientEffects = resolveArmorUsageEffects(nonproficientActor);

  assert.equal(proficientEffects.bodyArmor.acp, 0, 'proficient Light armor ACP must be 0, not the old buggy -2');
  assert.equal(nonproficientEffects.bodyArmor.acp, -2, "nonproficient Light armor ACP must be the armor's own listed -2, not the old buggy double-counted -4");
}

console.log('  [1/9] fail-before-documented body armor ACP double-count bug is fixed: proficient=0, nonproficient=-2 (not -4) OK');

// ─── 2. Nonproficient armor with NO listed ACP falls back to the category ──
//        default (light/medium/heavy -2/-5/-10), matching the existing
//        armor-benefit-simulator.js convention rather than inventing a new one.

{
  const actor = actorWith([lightArmor({ armorCheckPenalty: 0 })]);
  const effects = resolveArmorUsageEffects(actor);
  assert.equal(effects.bodyArmor.acp, -2, 'an item with no listed ACP must fall back to its category default when nonproficient');
}

console.log('  [2/9] missing per-item ACP falls back to the light/medium/heavy category default OK');

// ─── 3. Energy Shields were excluded from body-armor ACP; now contribute ───
//        independently, and are NOT found by the body-armor lookup.

{
  const actor = actorWith([shieldItem(), proficiencyFeat('light')]);
  const effects = resolveArmorUsageEffects(actor);
  assert.equal(effects.bodyArmor, null, 'a shield must never be picked up by the body-armor lookup');
  assert.equal(effects.activeEnergyShields.length, 1);
  assert.equal(effects.activeEnergyShields[0].acp, -2, "an active shield's listed ACP applies even though this actor IS proficient");
  assert.equal(effects.attackCheckPenalty, -2);
}

console.log('  [3/9] active Energy Shield contributes its own ACP independently of the (absent) body armor lookup OK');

// ─── 4. Canonical ACP composition controls (rule contract item 6) ──────────

{
  const cases = [
    { label: 'proficient normal Light armor', items: [lightArmor(), proficiencyFeat('light')], expected: 0 },
    { label: 'nonproficient normal Light armor', items: [lightArmor()], expected: -2 },
    { label: 'proficient active Light shield', items: [shieldItem(), proficiencyFeat('light')], expected: -2 },
    { label: 'nonproficient active Light shield', items: [shieldItem()], expected: -2 }
  ];
  for (const { label, items, expected } of cases) {
    const effects = resolveArmorUsageEffects(actorWith(items));
    assert.equal(effects.attackCheckPenalty, expected, `[${label}] attackCheckPenalty`);
    assert.equal(effects.skillCheckPenalty, expected, `[${label}] skillCheckPenalty must equal attackCheckPenalty (same authority, same value)`);
  }

  // Body armor (proficient, ACP suppressed) + active shield (ACP always
  // applies): total is exactly the shield's ACP, not double-counted through
  // two independent authorities.
  const combined = resolveArmorUsageEffects(actorWith([lightArmor(), shieldItem(), proficiencyFeat('light')]));
  assert.equal(combined.bodyArmor.acp, 0);
  assert.equal(combined.activeEnergyShields[0].acp, -2);
  assert.equal(combined.attackCheckPenalty, -2, 'proficient body armor (0) + active shield (-2) must sum to -2, not be double-counted');
}

console.log('  [4/9] canonical ACP composition controls (proficient/nonproficient armor x proficient/nonproficient active shield, plus combined wear) OK');

// ─── 5. Inactive shield contributes nothing at all ─────────────────────────

{
  const actor = actorWith([shieldItem({ activated: false, currentSR: 0 })]);
  const effects = resolveArmorUsageEffects(actor);
  assert.equal(effects.activeEnergyShields.length, 0, 'an inactive shield must not appear in activeEnergyShields at all');
  assert.equal(effects.attackCheckPenalty, 0);
  assert.equal(effects.maxDexCap, null);
  assert.equal(effects.reflexPenalty, 0);
  assert.equal(effects.denyPositiveDexToReflex, false);
}

console.log('  [5/9] an inactive Energy Shield contributes zero ACP, Max Dex restriction, Reflex penalty, and Dex denial OK');

// ─── 6. ModifierEngine: exactly the canonical 7-skill list, no more ────────
//        (fixes the 'athletics' inclusion and the armor-upgrade list's own
//        differing 8-skill set -- "do not invent another affected-skill
//        list").

{
  const actor = actorWith([shieldItem()]); // nonproficient active shield, ACP -2
  const modifiers = ModifierEngine._getItemModifiers(actor);
  const skillTargets = new Set(modifiers.filter(m => m.target.startsWith('skill.')).map(m => m.target.replace('skill.', '')));
  assert.equal(skillTargets.size, ACP_AFFECTED_SKILLS.length, `expected exactly the ${ACP_AFFECTED_SKILLS.length} canonical ACP-affected skills`);
  for (const skill of ACP_AFFECTED_SKILLS) assert.ok(skillTargets.has(skill), `${skill} must receive the shield's ACP`);
  assert.ok(!skillTargets.has('athletics'), 'athletics must NOT receive armor/shield ACP -- it is not in the canonical SWSE list');
  assert.ok(!skillTargets.has('perception'), 'Perception must be unaffected');
  assert.ok(!skillTargets.has('mechanics'), 'Mechanics must be unaffected');
  assert.ok(!skillTargets.has('useComputer'), 'Use Computer must be unaffected');
  for (const m of modifiers.filter(t => t.target.startsWith('skill.'))) {
    assert.equal(m.value, -2, `${m.target} must carry exactly the shield's -2 ACP`);
    assert.equal(m.sourceId, 'shield-1');
  }
}

console.log('  [6/9] ModifierEngine applies the shield ACP to exactly the 7 canonical skills and no others OK');

// ─── 7. Attack-roll integration: active shield reduces attack by exactly ───
//        its ACP, regardless of proficiency; the breakdown names it
//        explicitly rather than hiding it in misc.

{
  function actorForAttack(items) {
    return {
      id: 'attack-actor', type: 'character', items, flags: {},
      system: { bab: 5, attributes: { str: { base: 14, racial: 0, enhancement: 0, temp: 0 }, dex: { base: 14, racial: 0, enhancement: 0, temp: 0 } }, abilities: {} },
      getFlag() { return undefined; }
    };
  }
  const meleeWeapon = { id: 'w1', name: 'Vibroblade', type: 'weapon', system: { weaponType: 'melee', damage: '2d6' } };
  const rangedWeapon = { id: 'w2', name: 'Blaster Pistol', type: 'weapon', system: { weaponType: 'ranged', damage: '3d6' } };

  for (const [label, weapon] of [['melee', meleeWeapon], ['ranged', rangedWeapon]]) {
    for (const proficient of [true, false]) {
      const items = (active) => {
        const list = [shieldItem({ activated: active, currentSR: active ? 10 : 0 })];
        if (proficient) list.push(proficiencyFeat('light'));
        return list;
      };
      const inactive = resolveAttackBonus(actorForAttack(items(false)), weapon, null, {});
      const active = resolveAttackBonus(actorForAttack(items(true)), weapon, null, {});
      assert.equal(active.total, inactive.total - 2, `[${label}, proficient=${proficient}] active attack must be exactly inactive - 2`);
      assert.equal(active.components['Energy Shield (SR 10) (Armor Check Penalty)'], -2, `[${label}, proficient=${proficient}] the shield's ACP must be an explicit named component, not hidden in misc`);
      assert.equal(inactive.components['Energy Shield (SR 10) (Armor Check Penalty)'], undefined, `[${label}, proficient=${proficient}] an inactive shield must not appear in the breakdown at all`);
    }
  }
}

console.log('  [8/9] resolveAttackBonus(): active shield ACP applies to melee and ranged attacks alike, proficient or not, as an explicit named component OK');

// ─── 8. armor-benefit-simulator.js: an active/simulated proficient shield ──
//        no longer scores as if it had zero ACP (the confirmed backwards
//        `if (isProficient) return 0` for shields).

{
  const shieldActor = actorWith([proficiencyFeat('light')]);
  const evaluation = evaluateArmorBenefit(shieldItem(), shieldActor, {});
  assert.equal(evaluation.isEnergyShield, true);
  assert.equal(evaluation.proficient, true);
  assert.equal(evaluation.armorCheckPenalty, -2, 'a proficient actor evaluating an Energy Shield must still see its ACP -- proficiency never suppresses an active shield ACP');
  assert.equal(evaluation.simulatedState, 'active', 'the simulator must state which state (active) it is simulating');
  assert.equal(evaluation.speedPenalty, 0, 'Energy Shields never reduce speed, even if a stale item record says otherwise');

  const nonproficientActor = actorWith([]);
  const nonprofEval = evaluateArmorBenefit(shieldItem(), nonproficientActor, {});
  assert.equal(nonprofEval.armorCheckPenalty, -2, 'nonproficient evaluation must show the same ACP as proficient (proficiency changes Reflex consequences, not the ACP)');
  assert.equal(nonprofEval.nonproficiencyReflexPenalty, -5);
  assert.equal(nonprofEval.denyPositiveDexToReflex, true);
  assert.equal(evaluation.nonproficiencyReflexPenalty, 0, 'a proficient evaluation must show no nonproficiency Reflex penalty');
  assert.equal(evaluation.denyPositiveDexToReflex, false);
}

console.log('  [9/9] armor-benefit-simulator.js scores an active shield\'s ACP regardless of proficiency, and states its simulated state explicitly OK');

console.log('armor-shield-acp-authority.test.mjs: all assertions passed');
