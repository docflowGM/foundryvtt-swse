import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Attack Bonus round 8 (Attack Context + Dynamic
// Combat Option Presentation Authority).
//
// The shared roll dialog (scripts/rolls/roll-config.js) had a hardcoded
// "Quick Toggles" panel (Aim/Charge/Flanking/Higher Ground/Point Blank)
// that rendered for every roll type except Initiative -- not just attacks
// -- and a non-attack live-preview fallback that re-read those same
// checkbox fields and added a flat +2/+1 per checked box to the preview
// total of a Skill/Force/Ability/Damage roll, even though the actual roll
// (rollSkill() and friends) never consumed them. A Stealth check's preview
// could therefore show a total the real roll would never produce. The
// panel also showed Charging/Flanking on every attack regardless of melee/
// ranged (the math already correctly ignored a mismatched toggle, but the
// UI offered meaningless controls), and Higher Ground -- a rule this
// project's own source comments call unverified/not automated -- was still
// an automated checkbox.
//
// Separately, four hardcoded "Unlocked Attack Options" checkboxes (Burst
// Fire, Rapid Shot, Power Attack, Flurry/Rapid Strike) duplicated real,
// already-live ATTACK_OPTION metadata records (confirmed directly against
// packs/feats.db: option ids burstFire/rapidShot/powerAttack/flurry) --
// and the Flurry checkbox was actively wrong: it always submitted under
// attackOptions.flurry regardless of whether the actor owned Flurry
// (requiresWeaponGroups light/lightsaber) or the differently-id'd Rapid
// Strike (option:'rapidStrike', no weapon restriction), and bypassed
// optionAllowedForWeapon()'s weapon-group gate entirely.
//
// This suite proves: (1) attack-context controls are absent, not merely
// inert, outside attack rolls; (2) a non-attack preview can never gain a
// contribution from attack-context state; (3) melee/ranged context
// visibility, including the Charging-Fire-style "charge context matters to
// my ranged attack even though the ordinary +2 doesn't" exception; (4) an
// owned, context-gated option (Careful Shot) is shown disabled with a
// reason before its gate is met, and becomes available after; (5) the four
// duplicate hardcoded checkboxes and Higher Ground are gone from the
// source entirely.

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

const { buildRollConfigModel } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

function itemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find((i) => i.id === id);
  return arr;
}

function makeActor({ items = [], skills = {} } = {}) {
  return {
    id: 'test-actor', name: 'Test Actor', type: 'character',
    items: itemsCollection(items),
    effects: [],
    flags: { swse: {} },
    system: {
      bab: 5,
      level: 6,
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 16, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      },
      abilities: {},
      skills: {
        stealth: { trained: true, focused: false, miscMod: 0, selectedAbility: 'dex', ...skills.stealth },
        useTheForce: { trained: true, focused: false, miscMod: 0, selectedAbility: 'cha', ...skills.useTheForce }
      },
      derived: {},
      forcePoints: { value: 1, max: 5 }
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

// Real ATTACK_OPTION rule shapes, copied verbatim from packs/feats.db
// (parsed directly, not inferred), for Careful Shot and Charging Fire.
function carefulShotFeat() {
  return {
    id: 'feat-careful-shot', name: 'Careful Shot', type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: 'carefulShot', label: 'Careful Shot', control: 'toggle', requiresAttackType: 'ranged', requiresAim: true, attackModifier: 1 }] } }
  };
}
function chargingFireFeat() {
  return {
    id: 'feat-charging-fire', name: 'Charging Fire', type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: 'chargingFire', label: 'Charging Fire', control: 'flag', requiresAttackType: 'ranged', requiresCharge: true, suppresses: ['chargeAttackBonus'] }] } }
  };
}
function powerfulChargeFeat() {
  return {
    id: 'feat-powerful-charge', name: 'Powerful Charge', type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: 'powerfulCharge', label: 'Powerful Charge', control: 'toggle', requiresAttackType: 'melee', requiresCharge: true, attackModifier: 2 }] } }
  };
}

// ─── SECTION 1 — Domain isolation: attack-context controls are ABSENT ─────
// (not merely inert) outside attack rolls.

{
  const actor = makeActor();
  for (const [rollType, extra] of [
    ['skill', { skillKey: 'stealth' }],
    ['force', { skillKey: 'useTheForce' }],
    ['force-power', { skillKey: 'useTheForce' }],
    ['initiative', {}],
    ['ability', { abilityKey: 'str' }]
  ]) {
    const model = await buildRollConfigModel({ actor, rollType, ...extra });
    assert.equal(model.isAttackRoll, false, `${rollType}: isAttackRoll must be false`);
    assert.deepEqual(model.combatOptions, [], `${rollType}: combatOptions must be empty (no actor-owned attack options surfaced)`);
    assert.deepEqual(model.attackContexts, { aim: false, charge: false, flanking: false }, `${rollType}: attackContexts must all be false`);
  }
}
ok('domain isolation: skill/force/force-power/initiative/ability roll models carry isAttackRoll:false, empty combatOptions, and all-false attackContexts');

// ─── SECTION 2 — Skill preview cannot gain a contribution from attack- ────
// context state: the stale non-attack fallback loop is gone from source.

{
  const source = fs.readFileSync(fileURLToPath(new URL('../scripts/rolls/roll-config.js', import.meta.url)), 'utf8');
  assert.doesNotMatch(
    source,
    /for \(const name of \['aiming','charging','flanking','higherGround','pointBlank'\]\)/,
    'the stale non-attack preview loop (re-reading aiming/charging/flanking/higherGround/pointBlank and adding +2/+1 per checked box) must be removed from source entirely'
  );
  assert.match(
    source,
    /const total = base \+ custom;/,
    'the non-attack preview total must be exactly base + custom -- no situational contribution'
  );
}
ok('the stale non-attack live-preview fallback arithmetic is removed from source; the non-attack preview total is exactly base + custom');

// ─── SECTION 3 — Higher Ground removed entirely ───────────────────────────

{
  const source = fs.readFileSync(fileURLToPath(new URL('../scripts/rolls/roll-config.js', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /name="higherGround"/, 'no checkbox named higherGround may exist in the template');
  assert.doesNotMatch(source, /higherGround: data\.get\('higherGround'\)/, 'the submit handler must no longer read a higherGround field');
  assert.match(source, /'higherGround' was\s*\n\s*\/\/ removed/, "the removal must be documented in source, not silently deleted (per the round-8 instruction 'do not delete historical documentation')");

  const actor = makeActor();
  const meleeModel = await buildRollConfigModel({ actor, rollType: 'attack', weapon: meleeWeapon() });
  const rangedModel = await buildRollConfigModel({ actor, rollType: 'attack', weapon: rangedWeapon() });
  assert.ok(!('higherGround' in meleeModel.attackContexts), 'attackContexts must not carry a higherGround key for a melee attack');
  assert.ok(!('higherGround' in rangedModel.attackContexts), 'attackContexts must not carry a higherGround key for a ranged attack');
}
ok('Higher Ground is removed from the template, the submit handler, and attackContexts, with its removal documented in source rather than silently deleted');

// ─── SECTION 4 — Melee/ranged attack-context visibility ───────────────────

{
  const actor = makeActor();
  const meleeModel = await buildRollConfigModel({ actor, rollType: 'attack', weapon: meleeWeapon() });
  assert.equal(meleeModel.isAttackRoll, true);
  assert.deepEqual(meleeModel.attackContexts, { aim: false, flanking: true, charge: true }, 'melee: Flanking and Charge visible, Aim absent; Point Blank is never a toggleable context (round 8 correction #1, Blocker 4)');

  const rangedModel = await buildRollConfigModel({ actor, rollType: 'attack', weapon: rangedWeapon() });
  assert.deepEqual(rangedModel.attackContexts, { aim: true, flanking: false, charge: false }, 'ranged, no Charging Fire owned: Aim visible, Flanking and Charge absent');
}
ok('melee weapon shows Flanking/Charge and hides Aim; ranged weapon (no ranged-charge capability owned) shows Aim and hides Flanking/Charge; Point Blank is never a toggleable attackContexts key');

// ─── SECTION 5 — Charge context becomes relevant for a ranged attacker ────
// who owns Charging Fire, without granting the ordinary melee +2.

{
  const actorWithChargingFire = makeActor({ items: [chargingFireFeat()] });
  const rangedModel = await buildRollConfigModel({ actor: actorWithChargingFire, rollType: 'attack', weapon: rangedWeapon() });
  assert.equal(rangedModel.attackContexts.charge, true, 'a ranged attacker who owns Charging Fire must see Charge context (even though the ordinary melee +2 still never applies to a ranged attack)');
  assert.equal(rangedModel.attackContexts.flanking, false, 'Flanking must still be absent for a ranged attack regardless of Charging Fire ownership');

  const actorWithoutChargingFire = makeActor();
  const plainRangedModel = await buildRollConfigModel({ actor: actorWithoutChargingFire, rollType: 'attack', weapon: rangedWeapon() });
  assert.equal(plainRangedModel.attackContexts.charge, false, 'an ordinary ranged attacker with no ranged-charge capability must not see Charge context');
}
ok('Charge context becomes relevant for a ranged attacker who owns Charging Fire (detected generically via requiresCharge, not hardcoded by feat name), without granting Flanking or the ordinary melee Charge bonus');

// ─── SECTION 6 — Option visibility state: disabled-with-reason before its ─
// gate is met, available after.

{
  const actor = makeActor({ items: [carefulShotFeat()] });
  const beforeAim = await buildRollConfigModel({ actor, rollType: 'attack', weapon: rangedWeapon() });
  const carefulBefore = beforeAim.combatOptions.find((o) => o.id === 'carefulShot');
  assert.ok(carefulBefore, 'Careful Shot must be surfaced (owned, correct attack type) even before Aim is checked');
  assert.equal(carefulBefore.state, 'disabled', 'Careful Shot must be presented as disabled, not omitted, before Aim is checked');
  assert.equal(carefulBefore.reason, 'Requires Aim', 'the disabled reason must name Aim specifically');

  const afterAim = CombatOptionResolver.getAttackOptionsWithState(actor, rangedWeapon(), { attackType: 'ranged', aim: true });
  const carefulAfter = afterAim.find((o) => o.id === 'carefulShot');
  assert.equal(carefulAfter.state, 'available', 'Careful Shot must become available once Aim is checked');
  assert.equal(carefulAfter.reason, null);

  // Actor does NOT own Careful Shot: must not be shown at all (not even
  // disabled), on either weapon type.
  const nonOwner = makeActor();
  const nonOwnerModel = await buildRollConfigModel({ actor: nonOwner, rollType: 'attack', weapon: rangedWeapon() });
  assert.ok(!nonOwnerModel.combatOptions.some((o) => o.id === 'carefulShot'), 'an actor who does not own Careful Shot must never see it, disabled or otherwise');

  // Wrong attack type (melee): Careful Shot requires ranged, so it must
  // never appear at all, not even disabled.
  const meleeModel = await buildRollConfigModel({ actor, rollType: 'attack', weapon: meleeWeapon() });
  assert.ok(!meleeModel.combatOptions.some((o) => o.id === 'carefulShot'), 'Careful Shot (requires ranged) must never appear on a melee attack, disabled or otherwise');
}
ok('an owned, context-gated option is shown disabled with a reason before its context is met and available after; an unowned or attack-type-mismatched option never appears at all, disabled or otherwise');

// ─── SECTION 7 — Powerful Charge: melee + Charge dependency ───────────────

{
  const actor = makeActor({ items: [powerfulChargeFeat()] });
  const beforeCharge = await buildRollConfigModel({ actor, rollType: 'attack', weapon: meleeWeapon() });
  const pcBefore = beforeCharge.combatOptions.find((o) => o.id === 'powerfulCharge');
  assert.equal(pcBefore.state, 'disabled');
  assert.equal(pcBefore.reason, 'Requires Charge');

  const afterCharge = CombatOptionResolver.getAttackOptionsWithState(actor, meleeWeapon(), { attackType: 'melee', charge: true });
  assert.equal(afterCharge.find((o) => o.id === 'powerfulCharge').state, 'available');
}
ok('Powerful Charge: disabled with reason "Requires Charge" before Charge is checked, available once it is');

// ─── SECTION 7b — Burst Fire: ranged + autofire dependency ────────────────
// (real record shape verified directly against packs/feats.db above)

function burstFireFeat() {
  return {
    id: 'feat-burst-fire', name: 'Burst Fire', type: 'feat',
    system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: 'burstFire', label: 'Burst Fire', control: 'toggle', requiresAttackType: 'ranged', requiresAutofire: true, attackModifier: -5, damageExtraWeaponDice: 2, ammunitionCost: 5 }] } }
  };
}

{
  const actor = makeActor({ items: [burstFireFeat()] });

  // No autofire context yet: shown disabled with a reason, not hidden.
  const beforeAutofire = await buildRollConfigModel({ actor, rollType: 'attack', weapon: rangedWeapon() });
  const bfBefore = beforeAutofire.combatOptions.find((o) => o.id === 'burstFire');
  assert.ok(bfBefore, 'an owned Burst Fire must be shown (disabled), not hidden, before autofire context is set');
  assert.equal(bfBefore.state, 'disabled');
  assert.equal(bfBefore.reason, 'Requires an autofire-capable weapon or autofire mode');

  // Autofire context set: becomes available/selectable.
  const afterAutofire = CombatOptionResolver.getAttackOptionsWithState(actor, rangedWeapon(), { attackType: 'ranged', autofire: true });
  assert.equal(afterAutofire.find((o) => o.id === 'burstFire').state, 'available');

  // Melee weapon: Burst Fire requires ranged, so it must never appear at
  // all (not even disabled), regardless of autofire context.
  const meleeModel = await buildRollConfigModel({ actor, rollType: 'attack', weapon: meleeWeapon() });
  assert.ok(!meleeModel.combatOptions.some((o) => o.id === 'burstFire'), 'Burst Fire (requires ranged) must never appear on a melee attack');

  // Not owned: never appears, even with autofire context set.
  const nonOwnerAfterAutofire = CombatOptionResolver.getAttackOptionsWithState(makeActor(), rangedWeapon(), { attackType: 'ranged', autofire: true });
  assert.ok(!nonOwnerAfterAutofire.some((o) => o.id === 'burstFire'), 'an actor who does not own Burst Fire must never see it, even with autofire context set');
}
ok('Burst Fire: disabled with reason "Requires an autofire-capable weapon or autofire mode" before autofire context is set, available once it is; absent on melee attacks and for non-owners');

// ─── SECTION 8 — Duplicate hardcoded attack-option checkboxes removed ─────

{
  const source = fs.readFileSync(fileURLToPath(new URL('../scripts/rolls/roll-config.js', import.meta.url)), 'utf8');
  for (const field of ['attackOptions.burstFire', 'attackOptions.rapidShot', 'attackOptions.powerAttack', 'attackOptions.flurry']) {
    assert.doesNotMatch(source, new RegExp(`name="${field.replace('.', '\\.')}"`), `no hardcoded checkbox named ${field} may remain in source (duplicates a live ATTACK_OPTION record)`);
  }
  // Double Strike / Triple Attack are NOT duplicates (no ATTACK_OPTION
  // metadata equivalent -- a separate multiattack-sequencing subsystem)
  // and must remain.
  assert.match(source, /name="attackOptions\.doubleStrike"/, 'Double Strike must remain (no metadata-driven equivalent)');
  assert.match(source, /name="attackOptions\.tripleStrike"/, 'Triple Strike must remain (no metadata-driven equivalent)');

  // The dynamic cards correctly surface the same mechanics instead.
  const actor = makeActor({ items: [carefulShotFeat()] });
  const model = await buildRollConfigModel({ actor, rollType: 'attack', weapon: rangedWeapon() });
  assert.ok(model.combatOptions.some((o) => o.id === 'carefulShot'), 'the dynamic combatOptions list is the live replacement for the removed hardcoded checkboxes');
}
ok('the four confirmed-duplicate hardcoded attack-option checkboxes (Burst Fire, Rapid Shot, Power Attack, Flurry) are removed from source; Double Strike/Triple Attack (no metadata equivalent) remain; the dynamic combatOptions list is the live replacement');

// ─── SECTION 9 — Preview/roll/chat parity for a dynamic attack option ─────

{
  const { computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const actor = makeActor({ items: [carefulShotFeat()] });
  const weapon = rangedWeapon();

  const without = await computeFinalAttackComposition(actor, weapon, { attackType: 'ranged' });
  const withAimAndOption = await computeFinalAttackComposition(actor, weapon, { attackType: 'ranged', aim: true, combatOptions: { carefulShot: true } });
  assert.equal(without.ok, true);
  assert.equal(withAimAndOption.ok, true);
  assert.equal(withAimAndOption.atkBonus, without.atkBonus + 1, 'Careful Shot (owned, Aim checked, option selected) must add exactly +1 -- the same total the dialog preview/roll/chat all share through computeFinalAttackComposition()');

  const aimWithoutOption = await computeFinalAttackComposition(actor, weapon, { attackType: 'ranged', aim: true, combatOptions: { carefulShot: false } });
  assert.equal(aimWithoutOption.atkBonus, without.atkBonus, 'Aim alone, without selecting the Careful Shot option itself, must not add the +1 -- being shown as available is not the same as being selected');
}
ok('a dynamically-surfaced, context-gated attack option composes correctly through computeFinalAttackComposition() -- the exact shared seam the dialog preview, the real roll, and the chat ledger all agree on');

console.log('attack-dialog-context-authority.test.mjs: all assertions passed');
