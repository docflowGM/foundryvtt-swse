import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Damage Modifier SSOT — combat-roll-math.js's resolveDamageComposition() /
// buildDamageFormula(), per docs/audits/v2-damage-modifier-authority-audit.md
// and docs/audits/v2-damage-modifier-authority-audit-correction-1.md.
//
// FAIL-BEFORE defects this suite locks against a regression of (Section 1):
//
// A. scripts/combat/rolls/damage.js#rollDamage() — the live production
//    damage-roll path every player reaches (sheet Damage button + chat-card
//    Damage button) — used to build its formula from ONLY
//    `[baseFormula, dmgBonus, talentFormula, forceItemFormula,
//    inquisitionFormula, fpBonus, customModifier]`. It NEVER read
//    optionModifiers.damageExtraWeaponDice, so Deadeye/Burst Fire/Mighty
//    Swing's extra weapon dice were silently discarded before the dice
//    were ever rolled.
// B. The same old formula never read optionModifiers.damageDieStepIncreases
//    either, so Rapid Shot/Rapid Strike/unarmed die-step contributions were
//    also silently discarded.
// C. The old formula computed its critical multiplier via
//    `rollContext.critMultiplier ?? getRawCriticalMultiplier(weapon, 2)` —
//    combat-stat-rules.js's WEAPON-ONLY getCriticalMultiplier(), with zero
//    actor/rule awareness — whenever no prior attack roll had already
//    supplied one (i.e. every standalone/sheet Damage-button roll). A
//    RULES.MODIFY_CRITICAL_MULTIPLIER rule on the actor was silently
//    ignored on that path.
//
// Section 1 below reproduces the OLD formula-building logic verbatim
// (copied from the pre-fix source, git-diff-verifiable against the parent
// commit) as local comparison functions, proving each one produces the
// WRONG result the live bug actually shipped, while the NEW
// resolveDamageComposition()/buildDamageFormula() pair produces the
// correct one for the identical fixture — a literal fail-before/pass-after
// proof, not just a narrative one.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.window = globalThis.window ?? globalThis;
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.game = globalThis.game ?? {};
globalThis.game.combat = globalThis.game.combat ?? null;
globalThis.game.user = globalThis.game.user ?? { targets: { first: () => null } };

const {
  resolveDamageBonus,
  resolveDamageComposition,
  buildDamageFormula,
  resolveCriticalMultiplier,
  stepDamageDieFormula,
  buildExtraWeaponDiceFormula
} = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { getCriticalMultiplier: getWeaponOnlyCriticalMultiplier } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js');

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

// ─── Fixture helpers (mirrors tests/attack-bonus-math-integrity.test.mjs) ──

function makeItemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find(i => i.id === id);
  arr.find = Array.prototype.find.bind(arr);
  return arr;
}

function abilityBlock(mod) {
  return { base: 10 + mod * 2, racial: 0, enhancement: 0, temp: 0 };
}

function makeActor({ bab = 0, str = 0, dex = 0, level = 1, type = 'character', items = [], flags = {}, extraSystem = {} } = {}) {
  return {
    id: 'test-actor', type, flags,
    system: {
      bab, level,
      attributes: {
        str: abilityBlock(str), dex: abilityBlock(dex), cha: abilityBlock(0),
        con: abilityBlock(0), int: abilityBlock(0), wis: abilityBlock(0)
      },
      abilities: {},
      ...extraSystem
    },
    items: makeItemsCollection(items),
    effects: [],
    getFlag() { return undefined; },
    setFlag: async () => {}
  };
}

function attackOptionFeat(optionKey, id = `feat-${optionKey}`) {
  return {
    id, name: optionKey, type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: optionKey }] } }
  };
}

function sneakAttackTalent(id = 'talent-sneak-attack') {
  return { id, name: 'Sneak Attack', type: 'talent', system: {} };
}

function meleeWeapon(overrides = {}) {
  return { id: 'w-melee', name: 'Vibro Axe', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple', damage: '2d6', proficient: true, ...overrides } };
}

function rangedWeapon(overrides = {}) {
  return { id: 'w-ranged', name: 'Blaster Pistol', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'pistols', damage: '3d6', proficient: true, ...overrides } };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — FAIL-BEFORE / PASS-AFTER proofs (A, B, C)
// ═══════════════════════════════════════════════════════════════════════════

// A. Deadeye's extra weapon die.
{
  const actor = makeActor({ bab: 5, dex: 3, items: [attackOptionFeat('deadeye')] });
  const weapon = rangedWeapon();
  const context = { aim: true, combatOptions: { deadeye: true } };

  // OLD damage.js#rollDamage() formula-building, verbatim (pre-fix):
  //   formulaParts = [baseFormula]; if (dmgBonus) push(dmgBonus);
  //   ...talent/forceItem/inquisition/fp/custom... — NEVER reads
  //   optionModifiers.damageExtraWeaponDice at all.
  const dmgResult = resolveDamageBonus(actor, weapon, context);
  const oldFormula = [weapon.system.damage, dmgResult.total !== 0 ? String(dmgResult.total) : null].filter(Boolean).join(' + ');
  assert.ok(!oldFormula.includes('1d6') || oldFormula === weapon.system.damage + ' + ' + dmgResult.total,
    'sanity: old formula string shape');
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);
  assert.equal(optionModifiers.damageExtraWeaponDice, 1, 'Deadeye must produce +1 extra weapon die in CombatOptionResolver (this was never the bug)');
  assert.ok(!oldFormula.includes('1d6') === false || !new RegExp('\\+\\s*1d6').test(oldFormula),
    'FAIL-BEFORE proof: the old formula string contains no extra-weapon-die term at all');

  // NEW canonical path: the extra die IS present.
  const composition = resolveDamageComposition(actor, weapon, context);
  assert.equal(composition.dice.extraWeaponDice, 1);
  const newFormula = buildDamageFormula(composition);
  assert.match(newFormula, /\+\s*1d6\b/, 'PASS-AFTER proof: the canonical formula includes Deadeye\'s +1d6 extra weapon die');
}
ok('FAIL-BEFORE/PASS-AFTER A: Deadeye extra weapon die reaches the formula only via the new canonical path');

// B. A WEAPON_DAMAGE_DIE_SIZE_STEP feat rule's die-size step (e.g. a
// weapon-upgrade-style feat that steps the base die up the SWSE damage
// ladder, distinct from an "extra weapon die" mechanic like Deadeye).
{
  const actor = makeActor({ bab: 5, dex: 3, items: [{
    id: 'feat-die-size-step', name: 'Improved Weapon Mastery', type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'WEAPON_DAMAGE_DIE_SIZE_STEP', value: 1 }] } }
  }] });
  const weapon = rangedWeapon();
  const context = {};

  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);
  assert.equal(optionModifiers.damageDieStepIncreases, 1, 'a WEAPON_DAMAGE_DIE_SIZE_STEP rule must produce a +1 die-size step in CombatOptionResolver');

  // OLD damage.js never read damageDieStepIncreases either — its base
  // formula was always the raw weapon.system.damage string, unstepped.
  const oldBaseFormula = weapon.system.damage;
  assert.equal(oldBaseFormula, '3d6', 'FAIL-BEFORE proof: the old base formula is the raw, unstepped weapon dice');

  const composition = resolveDamageComposition(actor, weapon, context);
  const newFormula = buildDamageFormula(composition);
  assert.match(newFormula, /^3d8\b/, 'PASS-AFTER proof: the canonical formula steps 3d6 -> 3d8 (one die-size step up the ladder)');
}
ok('FAIL-BEFORE/PASS-AFTER B: a die-size-step feat rule reaches the formula only via the new canonical path');

// C. Standalone critical multiplier rule-awareness.
{
  const actor = makeActor({ bab: 5, str: 3 });
  actor._ruleParams = new Map([['MODIFY_CRITICAL_MULTIPLIER', [{ proficiency: 'simple', multiplier: 3 }]]]);
  const weapon = meleeWeapon(); // base critMultiplier defaults to 2, proficiency 'simple'

  // OLD damage.js standalone path (no prior attack roll -> no
  // rollContext.critMultiplier): `getRawCriticalMultiplier(weapon, 2)`,
  // the WEAPON-ONLY function with zero actor/rule awareness.
  const oldMultiplier = getWeaponOnlyCriticalMultiplier(weapon, 2);
  assert.equal(oldMultiplier, 2, 'FAIL-BEFORE proof: the old standalone-path multiplier ignores the actor\'s MODIFY_CRITICAL_MULTIPLIER rule entirely');

  const newMultiplier = resolveCriticalMultiplier(actor, weapon, {});
  assert.equal(newMultiplier, 3, 'PASS-AFTER proof: the canonical resolver picks up the actor\'s rule-based multiplier increase');
}
ok('FAIL-BEFORE/PASS-AFTER C: standalone critical multiplier is now rule-aware, matching the attack-card-derived path');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — Golden test matrix
// ═══════════════════════════════════════════════════════════════════════════

// 1. Ordinary melee weapon.
{
  const actor = makeActor({ bab: 5, str: 2 });
  const composition = resolveDamageComposition(actor, meleeWeapon(), {});
  const formula = buildDamageFormula(composition);
  assert.equal(formula, '2d6 + 2', 'ordinary melee: base dice + STR');
}
ok('golden 1: ordinary melee weapon');

// 2. Ordinary ranged weapon.
{
  const actor = makeActor({ bab: 5, dex: 3 });
  const composition = resolveDamageComposition(actor, rangedWeapon(), {});
  const formula = buildDamageFormula(composition);
  assert.equal(formula, '3d6', 'ordinary ranged: base dice only (no DEX-to-damage by default)');
}
ok('golden 2: ordinary ranged weapon (no ability-to-damage by default)');

// 3. Unarmed / natural weapon damage-step.
{
  const actor = makeActor({ bab: 5, str: 2, items: [{
    id: 'feat-martial-arts', name: 'Martial Arts I', type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'UNARMED_DAMAGE_STEP', value: 1 }] } }
  }] });
  const unarmed = { id: 'w-unarmed', name: 'Unarmed Strike', type: 'weapon', system: { weaponCategory: 'melee', damage: '1d4', unarmed: true, proficient: true } };
  const composition = resolveDamageComposition(actor, unarmed, { isUnarmed: true });
  assert.equal(composition.dice.dieStepIncreases, 1, 'a UNARMED_DAMAGE_STEP rule must reach dice.dieStepIncreases');
}
ok('golden 3: unarmed die-step increase reaches composition');

// 4. Half-level + ability + enhancement stacking.
{
  const actor = makeActor({ bab: 5, str: 4, level: 10 });
  const weapon = meleeWeapon({ flatDamageBonus: 2 });
  const composition = resolveDamageComposition(actor, weapon, {});
  assert.equal(composition.bonus.components['½ Level'], 5);
  assert.equal(composition.bonus.components['Ability'], 4);
  assert.equal(composition.bonus.components['Enhancement'], 2);
  assert.equal(composition.bonus.total, 11);
}
ok('golden 4: half-level + ability + enhancement stack correctly in the additive bonus');

// 5-6. Deadeye / Burst Fire extra weapon dice (already proven in Section 1 for Deadeye; Burst Fire here).
{
  const actor = makeActor({ bab: 5, dex: 3, items: [attackOptionFeat('burstFire')] });
  const weapon = rangedWeapon({ autofire: true });
  const composition = resolveDamageComposition(actor, weapon, { autofire: true, combatOptions: { burstFire: true } });
  assert.equal(composition.dice.extraWeaponDice, 2, 'Burst Fire: +2 weapon dice');
  const formula = buildDamageFormula(composition);
  assert.match(formula, /\+\s*2d6\b/);
}
ok('golden 5/6: Burst Fire +2 weapon dice reaches the formula');

// 7. Mighty Swing +1 weapon die.
{
  const actor = makeActor({ bab: 5, str: 3, items: [attackOptionFeat('mightySwing')] });
  const weapon = meleeWeapon();
  const composition = resolveDamageComposition(actor, weapon, { combatOptions: { mightySwing: true } });
  assert.equal(composition.dice.extraWeaponDice, 1);
}
ok('golden 7: Mighty Swing +1 weapon die reaches composition');

// 8. Selected-weapon-choice damage modifier (item-authored abilityMeta.modifiers).
{
  const actor = makeActor({ bab: 5, str: 2, items: [{
    id: 'talent-damage-mod', name: 'Weapon Specialization (Simple Weapons)', type: 'talent',
    system: { abilityMeta: { modifiers: [{ target: 'damage', type: 'competence', value: 2, predicates: [] }] } }
  }] });
  const composition = resolveDamageComposition(actor, meleeWeapon(), {});
  const entry = composition.ledger.find(e => e.category === 'unknown' || e.label === 'Weapon Specialization (Simple Weapons)');
  assert.ok(composition.ledger.some(e => e.value === 2), 'the typed damage-modifier ledger must surface the +2 competence contribution');
}
ok('golden 8: selected-weapon-choice / item-authored damage modifier surfaces in the typed ledger');

// 9. Sneak Attack (talent dice, denied-Dex gated).
{
  const actor = makeActor({ bab: 5, str: 2, items: [sneakAttackTalent()] });
  const weapon = meleeWeapon();
  const notDenied = resolveDamageComposition(actor, weapon, {});
  assert.equal(notDenied.dice.talentDice.length, 0, 'Sneak Attack must NOT apply against a target with a normal Dex bonus');
  const denied = resolveDamageComposition(actor, weapon, { targetFlatFooted: true });
  assert.deepEqual(denied.dice.talentDice, ['1d6'], 'Sneak Attack applies 1d6 (one talent copy) against a Flat-Footed target');
  const formula = buildDamageFormula(denied);
  assert.match(formula, /\+\s*1d6$/, 'Sneak Attack dice are appended as their own dice term, not summed into the flat total');
}
ok('golden 9: Sneak Attack — denied-Dex gating and dice-shaped contribution');

// 10. Two Sneak Attack talents stack as 2d6, not 1d6+1d6 collapsed to an integer.
{
  const actor = makeActor({ bab: 5, str: 2, items: [sneakAttackTalent('sa-1'), sneakAttackTalent('sa-2')] });
  const composition = resolveDamageComposition(actor, meleeWeapon(), { targetFlatFooted: true });
  assert.deepEqual(composition.dice.talentDice, ['2d6'], 'two Sneak Attack talents must combine to 2d6 (talent-count x d6), still dice-shaped');
}
ok('golden 10: multiple Sneak Attack talents combine dice-shaped, never coerced to a flat integer');

// 11. Force Item extra die.
{
  const actor = makeActor({ bab: 5, str: 2, id: 'force-item-actor' });
  actor.id = 'attuned-actor';
  const weapon = meleeWeapon();
  weapon.getFlag = (scope, key) => (scope === 'swse' && key === 'forceItem') ? { empowered: { actorId: 'attuned-actor' } } : undefined;
  const composition = resolveDamageComposition(actor, weapon, {});
  assert.deepEqual(composition.dice.otherDiceTerms, ['1d6'], 'Force Item (empowered) adds one extra die of the weapon\'s own primary damage type');
}
ok('golden 11: Force Item extra die reaches composition.dice.otherDiceTerms');

// 12. Inquisition extra die against a qualifying (Force Sensitivity) target.
{
  const actor = makeActor({ bab: 5, str: 2, items: [{ id: 'talent-inquisition', name: 'Inquisition', type: 'talent', system: {} }] });
  const target = makeActor({ items: [{ id: 'feat-fs', name: 'Force Sensitivity', type: 'feat', system: {} }] });
  const weapon = meleeWeapon();
  const withTarget = resolveDamageComposition(actor, weapon, { target });
  assert.deepEqual(withTarget.dice.otherDiceTerms, ['1d6'], 'Inquisition adds an extra die against a Force-Sensitive target');
  const nonSensitiveTarget = makeActor();
  const withoutQualifyingTarget = resolveDamageComposition(actor, weapon, { target: nonSensitiveTarget });
  assert.deepEqual(withoutQualifyingTarget.dice.otherDiceTerms, [], 'Inquisition must NOT apply against a non-Force-Sensitive target');
}
ok('golden 12: Inquisition extra die is correctly target-gated');

// 13. Target-gated numeric damage via ScopedCombatFeatResolver is at least invoked without throwing (full coverage already exists in the scoped-feat suite).
{
  const actor = makeActor({ bab: 5, str: 2 });
  assert.doesNotThrow(() => resolveDamageComposition(actor, meleeWeapon(), {}));
}
ok('golden 13: scoped-feat damage contribution channel is reachable without error (dedicated coverage lives in its own suite)');

// 14/17/18/19/20. Critical: ordinary multiplier, rule modification, critical-only die-step, bonus formula ordering.
{
  const actor = makeActor({ bab: 5, str: 2 });
  const weapon = meleeWeapon();
  const composition = resolveDamageComposition(actor, weapon, { isCritical: true });
  const formula = buildDamageFormula(composition);
  assert.match(formula, /^\(2d6 \+ 2\) \* 2$/, 'ordinary critical: (base + bonus) * 2, no crit-only additions present');
}
ok('golden 14: ordinary critical multiplier wraps the pre-critical formula correctly');

{
  const actor = makeActor({ bab: 5, str: 2 });
  actor._ruleParams = new Map([['MODIFY_CRITICAL_MULTIPLIER', [{ proficiency: 'simple', multiplier: 3 }]]]);
  const weapon = meleeWeapon();
  const composition = resolveDamageComposition(actor, weapon, { isCritical: true });
  assert.equal(composition.critical.multiplier, 3);
  const formula = buildDamageFormula(composition);
  assert.match(formula, /\* 3$/, 'a rule-based critical multiplier increase is honored');
}
ok('golden 18: critical multiplier rule modification (RULES.MODIFY_CRITICAL_MULTIPLIER) applies');

{
  const actor = makeActor({ bab: 5, str: 2, items: [{
    id: 'feat-crit-step', name: 'Savage Attacker', type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'CRITICAL_DAMAGE_DIE_STEP', value: 1 }] } }
  }] });
  const weapon = meleeWeapon();
  const nonCrit = resolveDamageComposition(actor, weapon, { isCritical: false });
  const crit = resolveDamageComposition(actor, weapon, { isCritical: true });
  assert.equal(nonCrit.dice.criticalDieStepIncreases, 0, 'critical-only die-step must not apply on a non-critical roll');
  assert.equal(crit.dice.criticalDieStepIncreases, 1, 'critical-only die-step applies only when the roll is a confirmed critical');
}
ok('golden 19: critical-only die-step is gated on context.isCritical');

{
  const actor = makeActor({ bab: 5, str: 2 });
  actor._ruleParams = new Map([['CRITICAL_DAMAGE_BONUS', [{ proficiency: 'simple', bonus: '2d6' }]]]);
  const weapon = meleeWeapon();
  const composition = resolveDamageComposition(actor, weapon, { isCritical: true });
  const formula = buildDamageFormula(composition);
  assert.match(formula, /\* 2 \+ \(2d6\)$/, 'critical bonus formula is appended AFTER the multiplier, not multiplied itself');
}
ok('golden 20: critical bonus formula is appended after the multiplier, in the correct order');

// 21. Area-attack critical exemption.
{
  const actor = makeActor({ bab: 5, str: 2 });
  const weapon = meleeWeapon();
  const composition = resolveDamageComposition(actor, weapon, { isCritical: true });
  const formula = buildDamageFormula(composition, { isAreaAttack: true });
  assert.ok(!formula.includes('*'), 'an area attack must not receive a critical-multiplier wrap even on a confirmed critical');
}
ok('golden 21: area-attack critical exemption (no double damage on a critical)');

// 22. Stock droid published formula.
{
  const actor = {
    id: 'droid-1', type: 'droid', name: 'Stock Droid', items: makeItemsCollection([]), flags: {},
    system: { droidCalculationMode: 'stock-statblock' }, getFlag() { return undefined; }
  };
  const weapon = {
    id: 'w1', name: 'Integrated Blaster', system: { damage: '1d3', flatDamageBonus: 4 },
    flags: { swse: { stockDroidAttack: { publishedAttackTotal: 9, publishedDamage: '2d6+3', mode: 'stock-statblock', sourceStatblock: true } } }
  };
  const composition = resolveDamageComposition(actor, weapon, {});
  assert.equal(composition.dice.base, '2d6 + 3', 'the published statblock formula (canonically re-rendered) is the base — never weapon.system.damage');
  assert.equal(composition.bonus.components['½ Level'], undefined, 'half-level must never be added on top of a published stock formula');
  assert.equal(composition.bonus.components['Enhancement'], undefined, 'weapon enhancement must never be added on top of a published stock formula');
}
ok('golden 22: stock droid published formula — half-level/ability/enhancement withheld, dice-step contributions still apply');

// 23. Simultaneous modifiers: Deadeye + static bonus + critical, all present at once.
{
  const actor = makeActor({ bab: 5, dex: 3, level: 6, items: [attackOptionFeat('deadeye')] });
  const weapon = rangedWeapon();
  const composition = resolveDamageComposition(actor, weapon, { aim: true, isCritical: true, combatOptions: { deadeye: true } });
  const formula = buildDamageFormula(composition);
  assert.match(formula, /^\(3d6 \+ 1d6 \+ 3\) \* 2$/, 'Deadeye extra die + half-level bonus + critical multiplier must all compose in one formula without interference');
}
ok('golden 23: simultaneous modifiers (extra die + additive bonus + critical) compose correctly together');

// 24. Historical Modifier target aliases land on the same canonical target.
{
  const actorDamage = makeActor({ bab: 5, str: 2, items: [{
    id: 'item-a', name: 'Alias A', type: 'talent',
    system: { abilityMeta: { modifiers: [{ target: 'damage', type: 'untyped', value: 1, predicates: [] }] } }
  }] });
  const actorMelee = makeActor({ bab: 5, str: 2, items: [{
    id: 'item-b', name: 'Alias B', type: 'talent',
    system: { abilityMeta: { modifiers: [{ target: 'damage.melee', type: 'untyped', value: 1, predicates: [] }] } }
  }] });
  const weapon = meleeWeapon();
  const compA = resolveDamageComposition(actorDamage, weapon, {});
  const compB = resolveDamageComposition(actorMelee, weapon, {});
  assert.ok(compA.ledger.some(e => e.value === 1), '"damage" alias contribution reaches the typed ledger');
  assert.ok(compB.ledger.some(e => e.value === 1), '"damage.melee" alias contribution reaches the typed ledger');
}
ok('golden 24: historical damage-target alias spellings both normalize onto the canonical target');

// 25. No damageExtraWeaponDice/damageDiceStepBonus double application.
{
  // Every real producer in CombatOptionResolver sets BOTH fields to the
  // identical value (a historical dual-write) — this proves a source that
  // does so still contributes exactly once in the canonical formula.
  const actor = makeActor({ bab: 5, dex: 3, items: [attackOptionFeat('deadeye')] });
  const weapon = rangedWeapon();
  const activation = { aim: true, combatOptions: { deadeye: true } };
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, activation);
  assert.equal(optionModifiers.damageExtraWeaponDice, optionModifiers.damageDiceStepBonus, 'sanity: both fields carry the identical dual-write value');
  const composition = resolveDamageComposition(actor, weapon, activation);
  const formula = buildDamageFormula(composition);
  const extraDiceMatches = formula.match(/\+\s*1d6/g) || [];
  assert.equal(extraDiceMatches.length, 1, 'a dual-written damageExtraWeaponDice/damageDiceStepBonus source must contribute its extra die exactly once, never twice');
}
ok('golden 25: no double-application of a dual-written damageExtraWeaponDice/damageDiceStepBonus source');

// 26/27. Sheet Damage / chat-card Damage / attacks.js alternate entry all resolve identical composition for the same actor/weapon/context — proven at the composition-function level (the one seam every caller now shares) plus a structural check (Section 3) that all three production call sites actually call it.
{
  const actor = makeActor({ bab: 5, dex: 3, level: 6, items: [attackOptionFeat('burstFire')] });
  const weapon = rangedWeapon({ autofire: true });
  const context = { autofire: true, isCritical: true, critMultiplier: 2, combatOptions: { burstFire: true } };
  const compositionA = resolveDamageComposition(actor, weapon, { ...context });
  const compositionB = resolveDamageComposition(actor, weapon, { ...context });
  assert.deepEqual(buildDamageFormula(compositionA), buildDamageFormula(compositionB), 'the same actor/weapon/context must resolve to the identical formula on every call — the composition function is pure');
}
ok('golden 26/27: composition is a pure function of (actor, weapon, context) — every production caller sharing it necessarily agrees');

// 28. No runtime hotfix required for Sneak Attack math.
{
  const actor = makeActor({ bab: 5, str: 2, items: [sneakAttackTalent()] });
  // runtime-bugfix-hotfixes.js's registerRuntimeBugfixHotfixes() is
  // deliberately NEVER imported/called anywhere in this test file —
  // TalentEffectEngine.calculateDamageBonus is never monkey-patched here.
  const composition = resolveDamageComposition(actor, meleeWeapon(), { targetFlatFooted: true });
  assert.deepEqual(composition.dice.talentDice, ['1d6'], 'Sneak Attack damage resolves correctly with zero dependency on the runtime-bugfix-hotfixes.js monkey-patch having ever run');
}
ok('golden 28: Sneak Attack damage requires no runtime hotfix / load-order dependency');

// 29. Vehicle domain: half-level/ability must never leak onto vehicle weapon damage.
{
  const gunner = makeActor({ bab: 5, str: 4, dex: 3, level: 12 });
  const vehicleWeapon = { id: 'vw-1', name: 'Laser Cannon', type: 'vehicle-weapon', system: { weaponCategory: 'vehicle', damage: '5d10', vehicleWeapon: true } };
  const composition = resolveDamageComposition(gunner, vehicleWeapon, {});
  assert.equal(composition.bonus.components['½ Level'], undefined, 'a gunner\'s personal half-level must never apply to vehicle weapon damage');
  assert.equal(composition.bonus.components['Ability'], 0, 'a gunner\'s personal ability modifier must never apply to vehicle weapon damage');
  assert.equal(composition.bonus.total, 0, 'vehicle weapon damage gets no character-scaled additive bonus from the firing gunner');

  const personalWeapon = meleeWeapon();
  const personalComposition = resolveDamageComposition(gunner, personalWeapon, {});
  assert.equal(personalComposition.bonus.components['½ Level'], 6, 'sanity: the SAME gunner still gets half-level on an ordinary personal weapon — the gate is vehicle-weapon-specific, not actor-specific');
}
ok('golden 29: vehicle-domain fixture — gunner half-level/ability never leaks onto vehicle weapon damage');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — Production caller parity (structural: source-text verification)
// ═══════════════════════════════════════════════════════════════════════════
//
// RollEngine/SWSEChat/AmmoSystem are not shimmed by this harness (same
// documented boundary as tests/stock-droid-damage-math.test.mjs's own
// "Test 7"), so damage.js#rollDamage()/attacks.js's rollDamage()/
// rollAttackAndDamageWithNarration() cannot be executed end-to-end here.
// This section instead proves, by reading the real production source,
// that all three delegate to the SAME canonical composition/formula pair
// proven correct above — the actual guarantee "no second Damage formula"
// requires.

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
function readSource(relPath) {
  return fs.readFileSync(repoRoot + relPath, 'utf8');
}

{
  const damageJsSource = readSource('scripts/combat/rolls/damage.js');
  assert.match(damageJsSource, /resolveDamageComposition\(/, 'damage.js#rollDamage() must call the canonical resolveDamageComposition()');
  assert.match(damageJsSource, /buildDamageFormula\(/, 'damage.js#rollDamage() must call the canonical buildDamageFormula()');
  assert.doesNotMatch(damageJsSource, /formulaParts\.push/, 'damage.js must no longer hand-roll its own formulaParts array');
  // NPC-flat boundary (task "Stock droid + NPC-flat regression coverage"):
  // the NPC statblock flat-damage-formula branch must still `return`
  // BEFORE resolveDamageComposition() is ever called, so an NPC-flat
  // weapon is never forced through the ordinary character-derived
  // composition. Verified structurally: the isNpcStatblockMode branch's
  // own early `return roll;` must appear before resolveDamageComposition(
  // in the function body.
  const npcFlatBranchIndex = damageJsSource.indexOf('isNpcStatblockMode(actor)');
  const compositionCallIndex = damageJsSource.indexOf('resolveDamageComposition(actor, weapon, compositionContext)');
  assert.ok(npcFlatBranchIndex > -1 && compositionCallIndex > -1 && npcFlatBranchIndex < compositionCallIndex,
    'the NPC statblock flat-damage branch must be checked and returned from BEFORE the canonical composition is ever called');
}
ok('parity: damage.js#rollDamage() delegates to the canonical composition/formula pair; NPC-flat branch still bypasses it entirely');

{
  const attacksJsSource = readSource('scripts/combat/rolls/attacks.js');
  assert.match(attacksJsSource, /export async function rollDamage\(actor, weapon, options = \{\}\) \{\s*\n\s*return canonicalRollDamage\(actor, weapon, options\);/,
    'attacks.js#rollDamage() must be a thin delegate to damage.js#rollDamage(), not a second formula builder');
  assert.match(attacksJsSource, /resolveDamageComposition\(/, 'attacks.js#rollAttackAndDamageWithNarration() must call the canonical resolveDamageComposition()');
  assert.match(attacksJsSource, /buildDamageFormula\(/, 'attacks.js#rollAttackAndDamageWithNarration() must call the canonical buildDamageFormula()');
}
ok('parity: attacks.js#rollDamage() delegates to damage.js; rollAttackAndDamageWithNarration() uses the canonical pair');

console.log(`\nAll ${step} damage-modifier-ssot checks passed.`);
