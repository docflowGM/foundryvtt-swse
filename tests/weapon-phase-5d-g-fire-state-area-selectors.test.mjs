import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-G -- canonical ability selectors, temporal firing state, area attack shape.
// Every weapon below is a canonical weapon under a deliberately WRONG name/Item projection; every ability that matters carries a
// canonical identity under a deliberately WRONG display name, so a pass cannot come from a name.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { resolveDamageComposition, buildDamageFormula } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { rollAttack, computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { resolveDamageDisposition } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js');
const ser = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js');
const { buildCensus, OUT_JSON } = await import('../tools/census-weapon-fire-state-area-selectors.mjs');
const { registry, registryData } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
let uid = 0;
const FOCUS_ID = 'feat::saga-edition-core-rulebook::p89::weapon-focus';
const mk = (type, name, extra = {}) => ({ id: `i${++uid}`, type, name, flags: extra.flags ?? {}, system: extra.system ?? {} });
const focus = (choice, { name = 'Zxq Renamed Display Label', modifiers = true } = {}) => mk('feat', name, {
  flags: { swse: { canonicalFeat: { identityKey: FOCUS_ID } } },
  system: { selectedChoice: choice, ...(modifiers ? { abilityMeta: { modifiers: [{ target: 'attack.bonus', value: 1, type: 'untyped', enabled: true, predicates: ['attack.weapon-matches-selected-choice'] }] } } : {}) },
});
const specTalent = (choice, name = 'Qwv Another Label') => mk('talent', name, { flags: { swse: { id: 'swse.talent.weapon_specialization' } }, system: { selectedChoice: choice } });
const specFeat = (choice, name = 'Zxq Spec') => mk('feat', name, { flags: { swse: { canonicalFeat: { identityKey: 'feat::saga-edition-core-rulebook::p91::weapon-specialization' } } }, system: { selectedChoice: choice } });
const optionFeat = (name, optionId) => mk('feat', name, { system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: optionId }] } } });
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Simple Weapons)', 'Weapon Proficiency (Heavy Weapons)', 'Weapon Proficiency (Advanced Melee Weapons)'].map((n) => mk('feat', n));
const canon = (k, system = {}, extra = {}) => ({ id: `w${++uid}-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', damageType: 'sonic', equipped: true, ...system }, ...extra });
const legacy = (system = {}, name = 'Homebrew') => ({ id: `hb${++uid}`, name, type: 'weapon', flags: {}, system: { weaponCategory: 'ranged', damage: '2d6', damageType: 'energy', equipped: true, proficient: true, ...system } });
const makeActor = ({ feats = [], items = [], level = 6, type = 'character', size = 'medium' } = {}) => {
  const actor = {
    id: 'a1', name: 'Tester', type, flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col([...PROF, ...feats, ...items]),
    system: { bab: 6, level, size, attributes: { str: ab(0), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'rifles', 'simple', 'heavy-weapons', 'advanced-melee'] },
  };
  for (const w of items) w.actor = actor;
  return actor;
};
const target = (id = 't1') => ({ id, name: `Dummy ${id}`, type: 'npc', flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; }, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } } } });
const setPath = (obj, path, value) => { const keys = path.split('.'); let o = obj; for (const k of keys.slice(0, -1)) o = (o[k] ??= {}); o[keys.at(-1)] = value; };
const total = async (actor, weapon, ctx = {}) => (await computeFinalAttackComposition(actor, weapon, ctx)).atkBonus;

// harness: roll stubs, owned-item writes, action economy, combat clock
const spent = { ammo: 0, actions: [], rolls: 0 };
const origs = { RE: RollEngine.safeRoll, post: SWSEChat.postRoll, spendAmmo: AmmoSystem.spendForWorkflow, upd: ActorEngine.updateOwnedItems, econ: ActionEconomyConsumption.spend, consume: AmmoSystem.consumeAmmunition, track: AmmoSystem.isTrackingEnabled };
let posted = [];
function installHarness({ econAllowed = true } = {}) {
  RollEngine.safeRoll = async (f) => { spent.rolls += 1; return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => { spent.ammo += 1; return { success: true, spent: false }; };
  ActorEngine.updateOwnedItems = async (actor, updates) => { for (const u of updates) { const item = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); } };
  ActionEconomyConsumption.spend = async (actor, type) => { if (!econAllowed) return { allowed: false, permitted: false, rollback: async () => {} }; spent.actions.push(type); return { allowed: true, committed: true, rollback: async () => { spent.actions.pop(); } }; };
}
const restoreHarness = () => { RollEngine.safeRoll = origs.RE; SWSEChat.postRoll = origs.post; AmmoSystem.spendForWorkflow = origs.spendAmmo; ActorEngine.updateOwnedItems = origs.upd; ActionEconomyConsumption.spend = origs.econ; AmmoSystem.consumeAmmunition = origs.consume; AmmoSystem.isTrackingEnabled = origs.track; globalThis.game = undefined; };
const setRound = (round) => { globalThis.game = round === null ? { combat: null, user: { targets: { first: () => null } } } : { combat: { id: 'c1', started: true, round, combatants: [{ actor: { id: 'a1' } }] }, user: { targets: { first: () => null } } }; };
const reset = () => { spent.ammo = 0; spent.actions.length = 0; spent.rolls = 0; posted = []; notes.warn.length = 0; notes.error.length = 0; };
const attack = (actor, weapon, extra = {}) => rollAttack(actor, weapon, { target: target(), suppressChat: false, ...extra });

// ======================================================================================================================================
// SELECTOR IDENTITY (1-8)
// ======================================================================================================================================
{
  const pistol = canon('weapon-blaster-pistol'), rifle = canon('weapon-blaster-rifle');
  const none = makeActor({ items: [pistol, rifle] });
  const base = await total(none, pistol);
  // 1, 7: canonical Weapon Focus identity applies even though its display name is nonsense
  const A = makeActor({ feats: [focus({ id: 'pistols', group: 'pistols', label: 'Pistols' })], items: [pistol, rifle] });
  assert.equal((await total(A, pistol)) - base, 1, 'canonical identity + group choice -> +1 attack');
  // 4: wrong choice does not apply
  assert.equal((await total(A, rifle)) - (await total(none, rifle)), 0, 'a Pistols choice does not apply to a rifle');
  const feat = A.items.find((i) => i.name === 'Zxq Renamed Display Label');
  feat.name = 'Weapon Focus (Rifles)'; // the NAME now lies; identity + structured choice still say Pistols
  assert.equal((await total(A, pistol)) - base, 1, 'name is display only'); assert.equal((await total(A, rifle)) - (await total(none, rifle)), 0);
  ok('Weapon Focus: canonical identity + structured group choice applies to the selected form, wrong group does not, display name irrelevant');
}
{
  const pistol = canon('weapon-blaster-pistol'), rifle = canon('weapon-blaster-rifle');
  const dmg = (actor, w) => resolveDamageComposition(actor, w, {}).bonus.components['Scoped Feat'] ?? 0;
  // 2: Weapon Specialization (a TALENT in the shipped data, stable id swse.talent.weapon_specialization), renamed display label
  const T = makeActor({ feats: [specTalent({ id: 'pistols', group: 'pistols' })], items: [pistol, rifle] });
  assert.equal(dmg(T, pistol), 2); assert.equal(dmg(T, rifle), 0);
  // the same selector works when it is carried as a canonical FEAT identity
  const F = makeActor({ feats: [specFeat({ group: 'rifles' })], items: [pistol, rifle] });
  assert.equal(dmg(F, rifle), 2); assert.equal(dmg(F, pistol), 0);
  // 3: group / category choices
  for (const [choice, hit, miss] of [[{ group: 'lightsabers' }, 'weapon-lightsaber', 'weapon-blaster-pistol'], [{ group: 'simple' }, 'unmapped::Club/Baton', 'weapon-blaster-rifle'], [{ group: 'advanced melee weapons' }, 'unmapped::Vibrobayonet', 'unmapped::Club/Baton']]) {
    const A = makeActor({ feats: [specFeat(choice)] });
    assert.equal(dmg(A, canon(hit)), 2, `${JSON.stringify(choice)} -> ${hit}`); assert.equal(dmg(A, canon(miss)), 0, `${JSON.stringify(choice)} !-> ${miss}`);
  }
  ok('Weapon Specialization: canonical talent/feat identity + structured group choice (pistols/rifles/lightsabers/simple/advanced melee) applies only to matching canonical forms');
}
{
  // 5, 6: exact exotic identity; display-name ambiguity cannot change the result
  const sith = canon('weapon-sith-lanvarok'), massassi = canon('weapon-massassi-lanvarok'), pistol = canon('weapon-blaster-pistol');
  const dmg = (actor, w) => resolveDamageComposition(actor, w, {}).bonus.components['Scoped Feat'] ?? 0;
  const exact = makeActor({ feats: [specTalent({ id: 'exotic:ranged:sith-lanvarok', group: 'exotic', weapon: 'Sith Lanvarok', weaponIdentity: 'Sith Lanvarok' })] });
  assert.equal(dmg(exact, sith), 2); assert.equal(dmg(exact, massassi), 0, 'a different exotic weapon is not matched'); assert.equal(dmg(exact, pistol), 0);
  // a SUBSTRING label ("Lanvarok") used to match both lanvaroks through text includes(); the structured join matches neither
  const vague = makeActor({ feats: [specTalent({ weapon: 'Lanvarok' })] });
  assert.equal(dmg(vague, sith), 0); assert.equal(dmg(vague, massassi), 0, 'identity equality, not substring matching');
  // an Item whose NAME equals the stored choice but whose canonical identity is something else does not match
  const impostor = canon('weapon-blaster-pistol', {}, { name: 'Sith Lanvarok' });
  assert.equal(dmg(exact, impostor), 0, 'a weapon NAMED like the choice does not match; canonical identity decides');
  ok('exact Exotic choice matches only the correct canonical weapon; substring/display-name ambiguity cannot change the result');
}
{
  // 8: legacy/homebrew fallback remains functional
  const hb = legacy({ proficiency: 'pistols', weaponGroup: 'pistols' }, 'Homebrew Pistol');
  const A = makeActor({ feats: [mk('feat', 'Weapon Specialization (Pistols)', { system: { selectedChoice: 'Pistols' } })], items: [hb] });
  A.items.find((i) => /Specialization/.test(i.name)).system.slug = 'weapon-specialization';
  assert.equal(resolveDamageComposition(A, hb, {}).bonus.components['Scoped Feat'], 2, 'legacy name + choice text still works for a non-canonical weapon');
  const other = legacy({ proficiency: 'rifles', weaponGroup: 'rifles' }, 'Homebrew Rifle');
  assert.equal(resolveDamageComposition(A, other, {}).bonus.components['Scoped Feat'] ?? 0, 0);
  ok('legacy/homebrew fallback (name + choice text) remains functional where no canonical identity exists');
}

// ======================================================================================================================================
// TEMPORAL FIRING STATE (9-17)
// ======================================================================================================================================
{
  installHarness();
  try {
    // 9: an unconstrained weapon is immediately reusable, and never gets state written
    setRound(3);
    const pistol = canon('weapon-blaster-pistol'); const A = makeActor({ items: [pistol] });
    assert.ok(await attack(A, pistol)); assert.ok(await attack(A, pistol), 'fires again in the same round');
    assert.equal(pistol.flags.swse.fireState, undefined, 'unconstrained form: nothing written');
    ok('unrestricted weapon remains immediately reusable (no state written)');

    // 10, 11, 12: alternate-round weapon (Disruptor pistol): round 3 fires, round 4 refused, round 5 fires; state survives between attacks
    reset(); setRound(3);
    const dis = canon('weapon-disruptor-pistol'); const D = makeActor({ items: [dis] });
    assert.ok(await attack(D, dis), 'round 3: fires');
    assert.deepEqual({ ...dis.flags.swse.fireState }, { v: 1, combatId: 'c1', shots: 1, lastRound: 3, unavailableThroughRound: 4 }, 'cooldown state persisted on the OWNED item');
    setRound(4); reset(); const before = JSON.stringify(dis.flags.swse.fireState);
    assert.equal(await attack(D, dis), null, 'round 4: refused'); assert.ok(notes.warn.some((m) => /cannot fire in round 4; it is ready again in round 5/.test(m)));
    assert.equal(spent.rolls, 0); assert.equal(JSON.stringify(dis.flags.swse.fireState), before, 'a refused attack mutates nothing');
    setRound(5); reset();
    assert.ok(await attack(D, dis), 'round 5: available again');
    assert.equal(dis.flags.swse.fireState.unavailableThroughRound, 6);
    // a NEW encounter does not inherit the old cooldown
    globalThis.game = { combat: { id: 'c2', started: true, round: 1, combatants: [{ actor: { id: 'a1' } }] }, user: { targets: { first: () => null } } };
    assert.ok(await attack(D, dis), 'new combat: state keyed to the combat');
    // no active combat: no round number is invented, the round-based restriction is not enforced
    setRound(null); assert.ok(await attack(D, dis)); assert.ok(await attack(D, dis), 'no combat -> no fake round: not enforced');
    ok('alternate-round: unavailable in the forbidden round, available again two rounds later, state persisted on the owned item, keyed to the combat, no invented clock out of combat');

    // 13, 14: reload-after-each-shot (Crossbow): second shot refused until the reload action restores it
    setRound(3); reset();
    const xbow = canon('weapon-crossbow', { ammunition: { current: 5, max: 5 } }); const X = makeActor({ items: [xbow] });
    assert.ok(await attack(X, xbow)); assert.equal(xbow.flags.swse.fireState.needsReload, true);
    reset(); assert.equal(await attack(X, xbow), null); assert.ok(notes.warn.some((m) => /must be reloaded/.test(m)));
    assert.equal(spent.ammo, 0, 'ammunition pool is NOT empty -- readiness is separate from ammunition');
    // 16: nothing spent: no ammo, no action costs, no roll
    assert.equal(spent.rolls, 0); assert.deepEqual(spent.actions, []);
    // 17: the preview reports it without mutating state
    const snap = JSON.stringify(xbow.flags.swse.fireState);
    const prev = await computeFinalAttackComposition(X, xbow, {});
    assert.equal(prev.readiness.ready, false); assert.ok(prev.readiness.blockers.some((b) => b.reason === 'awaiting-reload')); assert.equal(JSON.stringify(xbow.flags.swse.fireState), snap);
    // 14: the existing reload action restores mechanical readiness
    const res = await AmmoSystem.reloadWeapon(X, xbow);
    assert.equal(res.success, true); assert.equal(xbow.flags.swse.fireState.needsReload, undefined);
    setRound(4); reset(); assert.ok(await attack(X, xbow), 'reloaded (next round) -> fires again');
    ok('reload-after-each-shot: second shot refused with a full ammunition pool, preview reflects it without mutating, the reload action restores readiness, nothing spent when refused');

    // 15: structured reset family (Sidearm Pistol): firing WITH Rapid Shot requires a swift action before the next shot
    setRound(3); reset();
    const side = canon('weapon-sidearm-blaster-pistol'); const rapid = optionFeat('Rapid Shot', 'rapidShot'); const S = makeActor({ feats: [rapid], items: [side] });
    assert.ok(await attack(S, side, { combatOptions: { rapidShot: true } }));
    assert.equal(side.flags.swse.fireState.resetPending.action, 'swift'); assert.equal(side.flags.swse.fireState.resetPending.family, 'ability-triggered-reset');
    assert.deepEqual(spent.actions, [], 'no reset yet');
    assert.ok(await attack(S, side, {})); assert.deepEqual(spent.actions, ['swift'], 'the swift reset is paid through the existing action economy, automatically');
    assert.equal(side.flags.swse.fireState.resetPending, undefined);
    reset(); assert.ok(await attack(S, side, {})); assert.deepEqual(spent.actions, [], 'no reset when Rapid Shot was not used');
    // a firing WITHOUT Rapid Shot never sets a reset
    reset(); const side2 = canon('weapon-sidearm-blaster-pistol'); const S2 = makeActor({ feats: [rapid], items: [side2] });
    assert.ok(await attack(S2, side2, {})); assert.equal(side2.flags.swse.fireState?.resetPending, undefined);
    // a failed reset payment refuses the attack before ammunition / rolls
    restoreHarness(); installHarness({ econAllowed: false }); setRound(3); reset();
    const side3 = canon('weapon-sidearm-blaster-pistol', {}, {}); side3.flags.swse.fireState = { v: 1, combatId: 'c1', shots: 1, lastRound: 3, resetPending: { family: 'ability-triggered-reset', action: 'swift', ability: 'Rapid Shot' } };
    const S3 = makeActor({ feats: [rapid], items: [side3] });
    assert.equal(await attack(S3, side3, {}), null); assert.equal(spent.ammo, 0); assert.equal(spent.rolls, 0);
    ok('Sidearm Pistol: the structured reset relation uses the generic reset family; paid via the action economy; failure refuses before any spend');
    restoreHarness(); installHarness();

    // preparation (Deck Sweeper prime / Heavy Blaster Cannon brace): required action paid once per round, wielder-size exemption
    setRound(3); reset();
    const sweeper = canon('weapon-deck-sweeper'); const W = makeActor({ items: [sweeper] });
    assert.ok(await attack(W, sweeper, { damageMode: 'stun' })); assert.deepEqual(spent.actions, ['swift'], 'prime once');
    assert.ok(await attack(W, sweeper, { damageMode: 'stun' })); assert.deepEqual(spent.actions, ['swift'], 'already primed this round');
    setRound(4); assert.ok(await attack(W, sweeper, { damageMode: 'stun' })); assert.deepEqual(spent.actions, ['swift', 'swift'], 'primed again next round');
    reset(); setRound(3);
    const hbc = canon('weapon-heavy-blaster-cannon'); const med = makeActor({ items: [hbc], size: 'medium' });
    assert.ok(await attack(med, hbc, {})); assert.deepEqual(spent.actions, ['swift', 'swift'], 'brace = two swift actions for a Medium wielder');
    reset(); const hbc2 = canon('weapon-heavy-blaster-cannon'); const big = makeActor({ items: [hbc2], size: 'large' });
    assert.ok(await attack(big, hbc2, {})); assert.deepEqual(spent.actions, [], 'a Large wielder is exempt from the brace requirement');
    ok('prepared-required family (prime / brace): paid through the action economy once per round, wielder size exemption honored');
  } finally { restoreHarness(); }
}

// ======================================================================================================================================
// AREA SHAPE (18-27)
// ======================================================================================================================================
{
  installHarness(); setRound(null);
  try {
    const A = makeActor({});
    const ctx = async (w, sel = {}) => { reset(); if (!A.items.get(w.id)) { A.items.push(w); w.actor = A; } await attack(A, w, sel); return posted.find((p) => p.context?.workflowContext)?.context.workflowContext; };
    // 18: single-target profile stays single target
    const pt = canon('weapon-miniature-proton-torpedo-launcher');
    const single = await ctx(pt, { profileId: 'single-target' });
    assert.equal(rt.resolveCanonicalDamage(pt, { weaponForm: { identityKey: 'weapon-miniature-proton-torpedo-launcher', profileId: 'single-target' } }).areaShape.kind, 'single');
    assert.notEqual(single.attack?.isArea, true); assert.equal(single.attackShape?.area, undefined);
    // 19, 22: splash profile exposes splash geometry and selects the EXISTING area rules; the selected profile (not the default) decides
    const lcm = canon('weapon-light-concussion-missile-launcher');
    const splash = await ctx(lcm, { profileId: 'light-concussion-missile' });
    assert.equal(splash.attackShape.area.kind, 'splash'); assert.equal(splash.attackShape.area.radiusSquares, 2); assert.equal(splash.attack.isArea, true); assert.equal(splash.ruleData.halfDamageOnMiss, true);
    // 20: blast / burst
    const blast = await ctx(pt, { profileId: 'area' });
    assert.equal(blast.attackShape.area.kind, 'blast'); assert.equal(blast.attackShape.area.radiusSquares, 2); assert.equal(blast.attack.isArea, true);
    const gren = await ctx(canon('weapon-concussion-grenade'), {});
    assert.equal(gren.attackShape.area.kind, 'burst'); assert.equal(gren.ruleData.halfDamageOnMiss, true);
    const cone = rt.resolveCanonicalDamage(canon('weapon-deck-sweeper'), { weaponForm: { identityKey: 'weapon-deck-sweeper', profileId: 'primary' } }).areaShape;
    assert.equal(cone.kind, 'cone'); assert.equal(cone.halfDamageOnMiss, true);
    // source-unspecified miss rules stay GM-adjudicated (nothing invented); explicit 'none' deals nothing on a miss
    const unspecified = rt.resolveCanonicalDamage(canon('weapon-frag-grenade'), {}).areaShape;
    assert.equal(unspecified.kind, 'area-unspecified'); assert.equal(unspecified.halfDamageOnMiss, undefined); assert.equal(unspecified.completeness, 'area-enabled-without-geometry');
    assert.equal(rt.resolveCanonicalDamage(canon('weapon-gas-grenade'), {}).areaShape.noDamageOnMiss, true);
    ok('single-target stays single; splash / blast / burst / cone expose their canonical geometry and drive the existing area rules; unspecified miss rules are not invented');

    // 21: a selected payload changes the shape where the schema says so
    const wr = canon('weapon-wrist-rocket-launcher');
    const shapeOf = (payloadId) => rt.resolveCanonicalDamage(wr, { weaponForm: { identityKey: 'weapon-wrist-rocket-launcher', profileId: 'primary', payloadId } }).areaShape;
    assert.equal(shapeOf('antipersonnel').kind, 'single'); assert.equal(shapeOf('flash').kind, 'burst'); assert.equal(shapeOf('flash').geometry.radiusSquares, 3); assert.equal(shapeOf('hollow-tip-stun-gas').kind, 'cloud');
    const ml = canon('weapon-missile-launcher');
    assert.equal(rt.resolveCanonicalDamage(ml, { weaponForm: { identityKey: 'weapon-missile-launcher', profileId: 'primary', payloadId: 'standard-missile' } }).areaShape.kind, 'burst');
    ok('the selected payload changes the attack shape (wrist rocket: single vs burst r3 vs gas cloud)');

    // 26: existing half-damage / area rules unchanged; a critical on an area form is not doubled (existing rule)
    const hitCtx = (c) => ser.summarizeCombatWorkflowContext(c, { hit: false });
    assert.equal(resolveDamageDisposition(hitCtx(splash)).multiplier, 0.5, 'half damage on a miss (existing disposition rule)');
    assert.equal(resolveDamageDisposition(ser.summarizeCombatWorkflowContext(single, { hit: false })).multiplier, 0, 'a single-target miss deals nothing');
    const areaCtx = { weaponForm: { identityKey: 'weapon-light-concussion-missile-launcher', profileId: 'light-concussion-missile' }, areaAttack: true };
    const critArea = buildDamageFormula(resolveDamageComposition(A, lcm, { ...areaCtx, isCritical: true }), { isAreaAttack: true });
    const plainArea = buildDamageFormula(resolveDamageComposition(A, lcm, areaCtx), { isAreaAttack: true });
    assert.equal(critArea, plainArea, 'area attack: no critical doubling');
    // legacy: an Item-projection area weapon keeps its legacy rules
    const hb = legacy({ areaAttack: true });
    const hbCtx = await ctx(hb, {});
    ok('existing disposition rules unchanged: half damage on an area miss, nothing on a single-target miss, no critical doubling for area attacks');
  } finally { restoreHarness(); }
}
{
  // 23, 24, 25, 27: autofire against several targets -- one attack, one expenditure, every target keeps the originating canonical context
  const arc = canon('weapon-arc-9965-blaster', { ammunition: { current: 40, max: 40 } });
  const A = makeActor({ items: [arc] });
  installHarness();
  let consumed = []; AmmoSystem.isTrackingEnabled = () => true; AmmoSystem.consumeAmmunition = async (a, w, n) => { consumed.push(n); return { success: true, newAmmo: 40 - n, previousAmmo: 40 }; };
  const origSafe = SWSERoll._safeRoll, origSWSE = globalThis.SWSE; const formulas = [];
  const stub = async (f) => { formulas.push(f); return { total: 16, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  SWSERoll._safeRoll = stub; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub } };
  try {
    setRound(null);
    const targets = ['t1', 't2', 't3', 't4'].map(target);
    const r = await SWSERoll.rollAutofire(A, arc, { targets, skipFP: true });
    assert.ok(r?.success); assert.deepEqual(consumed, [10], 'ONE autofire expenditure for four affected targets');
    const cards = posted.filter((p) => p.context?.type === 'damage');
    assert.equal(cards.length, 4, 'one damage card per affected target');
    const ctxs = cards.map((c) => ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(c.context.workflowContext)));
    assert.deepEqual(ctxs.map((c) => c.targetId), ['t1', 't2', 't3', 't4']);
    for (const c of ctxs) {
      assert.equal(c.weaponForm.identityKey, 'weapon-arc-9965-blaster'); assert.equal(c.weaponForm.profileId, 'primary');
      assert.equal(c.attackShape.fireMode, 'autofire'); assert.equal(c.attackShape.area.kind, 'autofire-area'); assert.equal(c.attack.isArea, true); assert.equal(c.ruleData.halfDamageOnMiss, true);
    }
    // 25: later damage from any target's context resolves the ORIGINATING canonical form (3d8, not the stale Item 9d9)
    formulas.length = 0; posted = [];
    await rollDamage(A, arc, { combatContext: ctxs[2], workflowContext: ctxs[2], suppressChat: true });
    assert.match(formulas[0], /^3d8/);
    ok('autofire against 4 targets: one ammunition expenditure; every target keeps form + fire mode + autofire-area shape + its own target/hit; later damage uses the originating form');
  } finally { SWSERoll._safeRoll = origSafe; globalThis.SWSE = origSWSE; restoreHarness(); }
}

// ======================================================================================================================================
// REMAINING FINDINGS (28-32)
// ======================================================================================================================================
{
  // 28: Sith Lanvarok rangeTreatedAs: Pistol has a consumer (structural family treated-as, validated against the profile range block)
  const lan = canon('weapon-sith-lanvarok');
  const runtime = rt.resolveAttackWeaponRuntime(lan, {});
  assert.equal(runtime.range.treatedAs, 'pistols'); assert.equal(runtime.range.family, 'pistols'); assert.equal(runtime.range.status, 'banded');
  assert.deepEqual([...runtime.range.allowedBands], ['pointBlank', 'short', 'medium'], 'pistol band table; the lanvarok itself disallows long');
  assert.equal(rt.canonicalRangePenalty(runtime.range, 'short'), -2); assert.equal(rt.canonicalRangePenalty(runtime.range, 'medium'), -5);
  assert.equal(rt.resolveAttackWeaponRuntime(canon('weapon-aurial-blaster'), {}).range.treatedAs, 'pistols');
  // a contradiction between rangeTreatedAs and the profile's own family is refused, never guessed
  const real = registry.getByIdentityKey('weapon-sith-lanvarok');
  const tampered = new rt.WeaponAuthorityRegistry({ ...JSON.parse(JSON.stringify({ identitiesSha256: 'x', counts: {}, inputs: {}, phase: '5B', productionIdIndex: {}, purpose: 'x', role: 'x', schemaVersion: 1, unresolvedModeIdentities: [] })), identities: registryData.identities.map((r) => (r.identityKey === 'weapon-sith-lanvarok' ? { ...r, operation: { ...r.operation, rangeTreatedAs: 'Rifle' } } : r)) });
  let threw = null;
  try { rt.setSharedWeaponAuthorityRegistry(tampered); rt.resolveAttackWeaponRuntime(lan, {}); } catch (e) { threw = e; } finally { rt.setSharedWeaponAuthorityRegistry(registry); }
  assert.equal(threw?.code, 'range-family-mismatch');
  ok('Sith Lanvarok rangeTreatedAs: Pistol is consumed as the canonical range family (validated against the profile; pistol bands/penalties; mismatch refused)');

  // 29, 30, 31: Heavy Assault Blaster Rifle -- Rate of Fire A (Legacy Era Campaign Guide): autofire only, d10 -> d12 on a critical
  const hab = canon('weapon-heavy-assault-blaster', { ammunition: { current: 50, max: 50 } });
  assert.deepEqual([...registry.getByIdentityKey('weapon-heavy-assault-blaster').canonicalStats.attackProfiles[0].rateOfFire], ['A'], 'canonical data untouched: source-backed Rate of Fire A');
  installHarness(); setRound(null);
  try {
    const A = makeActor({ items: [hab] });
    reset(); assert.equal(await attack(A, hab, {}), null, 'ordinary single-fire attack refused'); assert.ok(notes.error.some((m) => /autofire mode/.test(m))); assert.equal(spent.rolls, 0);
    reset(); assert.ok(await attack(A, hab, { autofire: true, attackMode: 'autofire' }), 'an attack in autofire mode is legal');
  } finally { restoreHarness(); }
  {
    const A = makeActor({ items: [hab] });
    let consumed = []; AmmoSystem.isTrackingEnabled = () => true; AmmoSystem.consumeAmmunition = async (a, w, n) => { consumed.push(n); return { success: true, newAmmo: 50 - n, previousAmmo: 50 }; };
    installHarness(); setRound(null); const o1 = SWSERoll._safeRoll, o2 = globalThis.SWSE; const stub = async (f) => ({ total: 16, formula: f, dice: [{ results: [{ result: 12 }] }] }); SWSERoll._safeRoll = stub; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub } };
    try { const r = await SWSERoll.rollAutofire(A, hab, { targets: [target()], skipFP: true }); assert.ok(r?.success, 'autofire remains functional'); assert.equal(consumed.length, 1); }
    finally { SWSERoll._safeRoll = o1; globalThis.SWSE = o2; restoreHarness(); }
  }
  const habForm = { weaponForm: { identityKey: 'weapon-heavy-assault-blaster', profileId: 'primary' } };
  assert.equal(resolveDamageComposition(makeActor({}), hab, habForm).dice.base, '3d10');
  assert.equal(resolveDamageComposition(makeActor({}), hab, { ...habForm, isCritical: true }).dice.base, '3d12', 'critical die replacement (d10 -> d12) intact');
  // the other autofire-only profiles: recorded rate of fire A only (their published text says autofire-only); none changed
  for (const k of ['weapon-e-web-repeating-blaster', 'weapon-heavy-repeating-blaster', 'weapon-light-repeating-blaster', 'weapon-repeating-blaster-carbine', 'weapon-subrepeating-blaster']) {
    assert.equal(rt.shapeOfWeapon(canon(k)).fireModes.autofireOnly, true, k);
    assert.match(registry.getByIdentityKey(k).canonicalPlayerText, /autofire/i, `${k}: the published text itself says autofire`);
  }
  ok('Heavy Assault Blaster Rifle: Rate of Fire A -> single attack refused, autofire works, d10 -> d12 critical intact; the other autofire-only forms are consistent with their published text');

  // 32: stock droid / NPC flat contract unchanged
  const droid = makeActor({ type: 'droid' });
  const stock = { ...canon('weapon-blaster-pistol'), flags: { swse: { canonicalWeapon: { identityKey: 'weapon-blaster-pistol' }, stockDroidAttack: { sourceStatblock: true, publishedDamage: '4d4' } } } };
  const c = resolveDamageComposition(droid, stock, {});
  if (c.flags?.stockDamageFormula) assert.equal(c.dice.base, c.flags.stockDamageFormula);
  assert.equal(c.dice.baseMultiplier, 1);
  ok('stock droid / NPC flat contracts unchanged');
}

// ======================================================================================================================================
// CENSUS
// ======================================================================================================================================
{
  const census = await buildCensus();
  const committed = JSON.parse(fs.readFileSync(new URL(`../${OUT_JSON}`, import.meta.url), 'utf8'));
  assert.deepEqual(census, committed, 'committed 5D-G census is current (run tools/census-weapon-fire-state-area-selectors.mjs)');
  assert.equal(census.totals.identities, 203);
  assert.ok(census.temporalConstraints.families['alternate-round'] >= 3 && census.temporalConstraints.families['reload-required'] >= 5);
  assert.ok(census.attackShape.areaKinds.splash >= 3 && census.attackShape.fireModes['autofire-only'] === 7);
  ok(`census over ${census.totals.forms} forms: area ${JSON.stringify(census.attackShape.areaKinds)}; temporal ${JSON.stringify(census.temporalConstraints.families)}`);
}

console.log(`Phase 5D-G fire state / area shape / selectors: ${step} checks passed.`);
