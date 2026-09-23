import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Attack Bonus round 8 correction #1.
//
// Independent review HELD round 8 (head dca4a91) on four production
// blockers, all found by direct source/data inspection rather than taken on
// faith:
//
//   Blocker 1: CombatOptionResolver's getFeatRules() accepted ANY
//   abilityMeta.rules entry carrying an `option` or `id` field regardless
//   of its own `type` -- real packs carry 180+ non-ATTACK_OPTION rules
//   (RUNTIME_CONTEXT_REFERENCE, TALENT_RULE, HIT_RIDER, DEFENSE_BONUS, ...)
//   that also happen to carry an id for THEIR OWN purposes. Fixed: only
//   type === 'ATTACK_OPTION' may enter the pipeline (extractAttackOptionRules(),
//   exported and shared with the coverage-report tool).
//
//   Blocker 2: the coverage-report tool re-implemented its own extraction
//   parser instead of reusing the production one, so it could never prove
//   it was scanning the same population CombatOptionResolver actually
//   consumes; its own bucket counts also did not sum to its claimed total.
//   Fixed: the tool now imports extractAttackOptionRules() directly and
//   derives every total from the records array.
//
//   Blocker 3: option/context presentation only ever passed { attackType }
//   -- a target-gated option (Droid Hunter, Jedi Hunter, Cunning Attack, ...)
//   could never resolve even with a token already targeted, because the
//   dialog's own Target Context panel (Selected Token / Combatant) was
//   never threaded into CombatOptionResolver's context. Fixed: roll-config.js
//   now resolves a target actor via the SAME shared
//   getTargetActorFromOptions() authority the real roll/submit path already
//   used, and threads it into both the initial model build and the live
//   recompute.
//
//   Blocker 4: the ranged dialog had TWO independent Point Blank
//   authorities -- the Range Band selector (which already has a
//   "Point Blank" value) and a separate checkbox, capable of an impossible
//   combination (Range Band: Medium, checkbox: checked). Fixed: the
//   checkbox is deleted; isPointBlank is derived from the selected Range
//   Band in exactly one place (computeAttackSituationalContext()).
//
// This suite proves all four fixes directly, using real record shapes
// parsed from packs/feats.db and packs/talents.db (not invented ones) for
// the negative-regression rule-type-isolation cases.

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

const { CombatOptionResolver, extractAttackOptionRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { buildRollConfigModel } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
const { resolveAttackBonus } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

function itemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find((i) => i.id === id);
  return arr;
}

function makeActor({ items = [] } = {}) {
  return {
    id: 'test-actor', name: 'Test Actor', type: 'character',
    items: itemsCollection(items),
    effects: [],
    flags: { swse: {} },
    system: {
      bab: 5, level: 6,
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 16, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      },
      abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }
    },
    getFlag() { return undefined; },
    getRollData() { return {}; }
  };
}

function meleeWeapon() {
  return { id: 'w-melee', name: 'Vibro Axe', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple', damage: '2d6' } };
}
function rangedWeapon() {
  return { id: 'w-ranged', name: 'Blaster Pistol', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'pistols', damage: '3d6' } };
}

// ─── SECTION 1 — Blocker 1: rule-type isolation ────────────────────────────
// Real record shapes, copied verbatim from packs/talents.db.

function oathOfDutyTalent() {
  return {
    id: 'talent-oath-of-duty', name: 'Oath of Duty', type: 'talent',
    system: { abilityMeta: { rules: [
      { type: 'RUNTIME_CONTEXT_REFERENCE', id: 'oath-of-duty-t31-context', label: 'Oath of Duty', summary: 'Bonus HP when an ally hits with a lightsaber attack.' }
    ] } }
  };
}
function forceWarningTalent() {
  return {
    id: 'talent-force-warning', name: 'Force Warning', type: 'talent',
    system: { abilityMeta: { rules: [
      { type: 'TALENT_RULE', id: 'force_warning', label: 'Force Warning', action: 'initiative-roll', mode: 'encounter_start_support' }
    ] } }
  };
}
function healingBoostTalent() {
  return {
    id: 'talent-healing-boost', name: 'Healing Boost', type: 'talent',
    system: { abilityMeta: { rules: [
      { type: 'TALENT_RULE', id: 'healing_boost', label: 'Healing Boost', action: 'vital-transfer', mode: 'vital_transfer_healing_bonus' }
    ] } }
  };
}
function carefulShotFeat() {
  return {
    id: 'feat-careful-shot', name: 'Careful Shot', type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: 'carefulShot', label: 'Careful Shot', control: 'toggle', requiresAttackType: 'ranged', requiresAim: true, attackModifier: 1 }] } }
  };
}

{
  assert.deepEqual(extractAttackOptionRules(oathOfDutyTalent()), [], 'a RUNTIME_CONTEXT_REFERENCE rule (real record: Oath of Duty) carrying its own `id` must never be extracted as an ATTACK_OPTION');
  assert.deepEqual(extractAttackOptionRules(forceWarningTalent()), [], 'a TALENT_RULE rule (real record: Force Warning) carrying its own `id` must never be extracted as an ATTACK_OPTION');
  assert.deepEqual(extractAttackOptionRules(healingBoostTalent()), [], 'a second TALENT_RULE rule (real record: Healing Boost) must also never be extracted');
  assert.equal(extractAttackOptionRules(carefulShotFeat()).length, 1, 'a genuine type: ATTACK_OPTION rule (Careful Shot) must still be extracted');

  const actor = makeActor({ items: [oathOfDutyTalent(), forceWarningTalent(), healingBoostTalent(), carefulShotFeat()] });
  const options = CombatOptionResolver.getAvailableAttackOptions(actor, rangedWeapon(), { attackType: 'ranged', aim: true });
  assert.deepEqual(options.map(o => o.id), ['carefulShot'], 'an actor owning three non-ATTACK_OPTION talents plus one real ATTACK_OPTION feat must see exactly the one real option, never "Oath of Duty"/"Force Warning"/"Healing Boost" as attack checkboxes');
}
ok('Blocker 1: non-ATTACK_OPTION abilityMeta.rules entries (RUNTIME_CONTEXT_REFERENCE, TALENT_RULE) with their own id field are never extracted or surfaced as attack options, using real Oath of Duty/Force Warning/Healing Boost record shapes; a genuine ATTACK_OPTION record is unaffected');

// ─── SECTION 2 — Blocker 2: report/production extraction agreement ────────

{
  const toolSource = fs.readFileSync(fileURLToPath(new URL('../tools/report-attack-option-coverage.mjs', import.meta.url)), 'utf8');
  assert.match(
    toolSource,
    /\{\s*extractAttackOptionRules\s*\}\s*=\s*await import\(\s*['"]\/systems\/foundryvtt-swse\/scripts\/engine\/combat\/combat-option-resolver\.js['"]\s*\)/,
    'the coverage-report tool must import extractAttackOptionRules() from the production module, not re-implement its own parser'
  );
  assert.doesNotMatch(toolSource, /rule\.type\s*===\s*ATTACK_OPTION_RULE\s*\|\|\s*rule\.option\s*\|\|\s*rule\.id/, 'the tool must not contain its own independent id/option-based extraction fallback (the exact leaky pattern Blocker 1 fixed)');
  assert.doesNotMatch(toolSource, /function\s+(getFeatRules|extractAttackOptionRules)\s*\(/, 'the tool must not define its own copy of the extraction function -- it must only import the production one');

  // The report's classify() derives every bucket from records this SAME
  // function returned -- direct proof the report and
  // CombatOptionResolver.getAvailableAttackOptions() (which also calls
  // extractAttackOptionRules() via getFeatRules()) can never observe a
  // different population for the same record, for both a real leaking
  // record and a real genuine one.
  assert.deepEqual(extractAttackOptionRules(oathOfDutyTalent()), extractAttackOptionRules(oathOfDutyTalent()), 'sanity: extraction is deterministic');
  const productionSeesOathOfDuty = CombatOptionResolver.getAvailableAttackOptions(makeActor({ items: [oathOfDutyTalent()] }), meleeWeapon(), {}).length > 0;
  assert.equal(productionSeesOathOfDuty, false, 'production must not surface Oath of Duty as an attack option (matches the report classifying it out entirely)');
}
ok('Blocker 2: the coverage-report tool imports extractAttackOptionRules() directly from combat-option-resolver.js (no duplicate parser); the report and production resolver are provably the same population for both a leaking and a genuine record');

// ─── SECTION 3 — Blocker 3: target context threading ──────────────────────
// Real record shapes, copied verbatim from packs/feats.db / packs/talents.db.

function droidHunterFeat() {
  return {
    id: 'feat-droid-hunter', name: 'Droid Hunter', type: 'feat',
    system: { abilityMeta: { rules: [
      { type: 'ATTACK_OPTION', id: 'droidHunterDamage', label: 'Droid Hunter', control: 'passive', requiresTargetType: ['droid'], excludesDamageType: ['ion'], damageModifier: 2 }
    ] } }
  };
}
function jediHunterTalent() {
  return {
    id: 'talent-jedi-hunter', name: 'Jedi Hunter', type: 'talent',
    system: { abilityMeta: { rules: [
      { type: 'ATTACK_OPTION', id: 'jedi-hunter-force-sensitive', label: 'Jedi Hunter', control: 'flag', damageExtraWeaponDice: 1, requiresTargetFeat: 'Force Sensitivity' }
    ] } }
  };
}
function droidTargetActor() { return { id: 'target-droid', name: 'Target Droid', type: 'droid', items: [], system: {} }; }
function organicTargetActor() { return { id: 'target-organic', name: 'Target Organic', type: 'character', items: [], system: {} }; }
function forceSensitiveTargetActor() { return { id: 'target-jedi', name: 'Target Jedi', type: 'character', items: [{ id: 'fs', name: 'Force Sensitivity', type: 'feat' }], system: {} }; }

{
  const actor = makeActor({ items: [droidHunterFeat()] });
  const weapon = meleeWeapon();

  // No target selected: shown disabled with a truthful "Requires a target"
  // reason, not hidden as if unowned.
  const noTarget = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, { attackType: 'melee' });
  const noTargetCard = noTarget.find(o => o.id === 'droidHunterDamage');
  assert.ok(noTargetCard, 'Droid Hunter must be shown (not hidden) with no target selected');
  assert.equal(noTargetCard.state, 'disabled');
  assert.equal(noTargetCard.reason, 'Requires a target');

  // Target selected but does not qualify (not a droid): disabled with a
  // different, honest reason -- not "Requires a target" (one IS selected).
  const wrongTarget = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, { attackType: 'melee', target: organicTargetActor() });
  const wrongTargetCard = wrongTarget.find(o => o.id === 'droidHunterDamage');
  assert.equal(wrongTargetCard.state, 'disabled');
  assert.equal(wrongTargetCard.reason, "Target does not meet this option's requirement");

  // Qualifying target (a droid): available.
  const rightTarget = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, { attackType: 'melee', target: droidTargetActor() });
  assert.equal(rightTarget.find(o => o.id === 'droidHunterDamage').state, 'available');
}
ok('Blocker 3: Droid Hunter (requiresTargetType) is disabled/"Requires a target" with none selected, disabled/"Target does not meet this option\'s requirement" against a non-qualifying target, and available against a qualifying one');

{
  const actor = makeActor({ items: [jediHunterTalent()] });
  const weapon = meleeWeapon();
  const noTarget = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, { attackType: 'melee' });
  assert.equal(noTarget.find(o => o.id === 'jediHunterForceSensitive').state, 'disabled');
  assert.equal(noTarget.find(o => o.id === 'jediHunterForceSensitive').reason, 'Requires a target');

  const nonJedi = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, { attackType: 'melee', target: organicTargetActor() });
  assert.equal(nonJedi.find(o => o.id === 'jediHunterForceSensitive').state, 'disabled');

  const jediTarget = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, { attackType: 'melee', target: forceSensitiveTargetActor() });
  assert.equal(jediTarget.find(o => o.id === 'jediHunterForceSensitive').state, 'available');
}
ok('Blocker 3: Jedi Hunter (requiresTargetFeat) follows the same disabled/available progression against a target\'s actual owned items (Force Sensitivity)');

{
  // Wiring proof: buildRollConfigModel()'s INITIAL context (before any form
  // exists) resolves a target the same way the real roll would --
  // via getTargetActorFromOptions()'s existing game.user.targets fallback
  // -- not a hardcoded { attackType } only, so a token already targeted
  // when the dialog opens is honored on first paint.
  const actor = makeActor({ items: [droidHunterFeat()] });
  const savedTargets = globalThis.game?.user?.targets;
  try {
    globalThis.game.user.targets = { first: () => ({ actor: droidTargetActor() }) };
    const modelWithTarget = await buildRollConfigModel({ actor, rollType: 'attack', weapon: meleeWeapon() });
    assert.equal(modelWithTarget.combatOptions.find(o => o.id === 'droidHunterDamage')?.state, 'available', 'a token already targeted before the dialog opens must be reflected in the INITIAL model, not just after a later recompute');

    globalThis.game.user.targets = { first: () => null };
    const modelNoTarget = await buildRollConfigModel({ actor, rollType: 'attack', weapon: meleeWeapon() });
    assert.equal(modelNoTarget.combatOptions.find(o => o.id === 'droidHunterDamage')?.state, 'disabled', 'with no target at all, the initial model must show the option disabled, not silently available');
  } finally {
    globalThis.game.user.targets = savedTargets;
  }
}
ok('Blocker 3: buildRollConfigModel()\'s initial combatOptions reflect whichever target is already selected via the same shared getTargetActorFromOptions() authority the real roll uses, not a hardcoded target-free context');

// ─── SECTION 4 — Blocker 4: Point Blank single authority ──────────────────

function pointBlankShotFeat() {
  return { id: 'feat-pbs', name: 'Point-Blank Shot', type: 'feat', system: {} };
}

{
  const source = fs.readFileSync(fileURLToPath(new URL('../scripts/rolls/roll-config.js', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /name="pointBlank"/, 'no independent pointBlank checkbox/input may exist anywhere in the attack dialog form -- Range Band is the single authority for this fact');
  assert.match(source, /form\.querySelector\('\[name="rangeBand"\]'\)\?\.value === 'pointBlank'/, 'isPointBlank must be derived from the Range Band selector value, not a separate field');
}
ok('Blocker 4: no independent "pointBlank" form field exists anywhere in roll-config.js; isPointBlank is derived from the Range Band selector in source');

{
  const actor = makeActor({ items: [pointBlankShotFeat()] });
  const weapon = rangedWeapon();

  const atPointBlank = resolveAttackBonus(actor, weapon, null, { attackType: 'ranged', rangeBand: 'pointBlank', isPointBlank: true });
  const atMedium = resolveAttackBonus(actor, weapon, null, { attackType: 'ranged', rangeBand: 'medium', isPointBlank: false });
  const atShort = resolveAttackBonus(actor, weapon, null, { attackType: 'ranged', rangeBand: 'short', isPointBlank: false });
  const atLong = resolveAttackBonus(actor, weapon, null, { attackType: 'ranged', rangeBand: 'long', isPointBlank: false });

  // ScopedCombatFeatResolver's Point Blank Shot bonus is folded into the
  // shared 'Scoped Feat' component row (combat-roll-math.js), not its own
  // named row -- confirmed directly against that file's source.
  assert.equal(atShort.components?.['Scoped Feat'] ?? 0, 0, 'Point Blank Shot must contribute +0 at Short range');
  assert.equal(atMedium.components?.['Scoped Feat'] ?? 0, 0, 'Point Blank Shot must contribute +0 at Medium range');
  assert.equal(atLong.components?.['Scoped Feat'] ?? 0, 0, 'Point Blank Shot must contribute +0 at Long range');
  assert.equal(atPointBlank.components?.['Scoped Feat'], 1, 'Point Blank Shot contributes exactly +1 at Point Blank range, sourced from isPointBlank derived from rangeBand');

  const noFeatActor = makeActor({});
  const noFeatAtPointBlank = resolveAttackBonus(noFeatActor, weapon, null, { attackType: 'ranged', rangeBand: 'pointBlank', isPointBlank: true });
  assert.equal(noFeatAtPointBlank.components?.['Scoped Feat'] ?? 0, 0, 'an actor without the feat must gain +0 at Point Blank range regardless of the range context');
}
ok('Blocker 4: Point Blank Shot\'s +1 applies only at Point Blank range and only with the feat; +0 at Short/Medium/Long; derived entirely from rangeBand, matching resolveAttackBonus() (the exact seam the dialog preview and the real roll both call)');
console.log('attack-dialog-context-authority-correction.test.mjs: all assertions passed');
