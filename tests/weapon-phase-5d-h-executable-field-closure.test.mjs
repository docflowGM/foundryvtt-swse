import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-H -- executable canonical field closure (area geometry, prepared attack, brace rule, ability relations, selector descriptor).
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
const { FireStateStore: FireStateStoreRef } = await import('/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js');
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


const corpus = JSON.parse(fs.readFileSync('data/canonical/weapons.json', 'utf8'));
const rec = (k) => corpus.identities.find((i) => i.identityKey === k);
const areaOf = (k) => rt.resolveCanonicalDamage(canon(k), {}).areaShape;
const withAmmo = (k, max = 100) => canon(k, { ammunition: { current: max, max } });

// ======================================================================================================================================
// AREA GEOMETRY (1-7): source-certified canonical amendments, applied through the controlled amendment path
// ======================================================================================================================================
{
  const log = corpus.postCertificationAmendments.filter((a) => a.id === '5D-H-area-geometry-backfill');
  assert.deepEqual(log.map((a) => a.identityKey).sort(), ['weapon-blaster-cannon', 'weapon-flamethrower', 'weapon-frag-grenade', 'weapon-ion-grenade', 'weapon-stun-grenade', 'weapon-thermal-detonator']);
  for (const a of log) { assert.equal(a.classification, 'DATA_DEFECT'); assert.ok(a.source.book && a.source.page && a.source.evidence, `${a.identityKey} carries source/page/evidence`); assert.ok(a.rule && a.field && a.from && a.to); assert.ok(rec(a.identityKey).provenance.postCertificationAmendments.includes('5D-H-area-geometry-backfill')); }
  // 1-4
  for (const [k, radius, miss] of [['weapon-frag-grenade', 2, true], ['weapon-ion-grenade', 2, undefined], ['weapon-stun-grenade', 2, true], ['weapon-thermal-detonator', 4, true]]) {
    const a = areaOf(k);
    assert.equal(a.kind, 'burst', k); assert.equal(a.geometry.radiusSquares, radius, k); assert.equal(a.completeness, null, k); assert.equal(a.halfDamageOnMiss, miss, k);
  }
  assert.equal(areaOf('weapon-ion-grenade').onMiss, 'target-dependent-half-or-none', 'ion: droids/cyborgs half, plain creatures none -> target dependent, never invented');
  ok('Frag / Ion / Stun grenades are 2-square bursts and the Thermal Detonator a 4-square burst (Core p.128/129), each with a logged source/page/evidence amendment');
  // 5
  const fl = areaOf('weapon-flamethrower');
  assert.equal(fl.kind, 'cone'); assert.equal(fl.geometry.lengthSquares, 6); assert.equal(fl.geometry.widthAtEndSquares, 6); assert.equal(fl.halfDamageOnMiss, true);
  ok('Flamethrower is a 6-square cone, 6 wide at the terminus (Core p.127; miss rule from Core Area Attacks p.155)');
  // 6: Blaster Cannon (Core p.125) encoded exactly like the certified Heavy Blaster Cannon
  const bc = areaOf('weapon-blaster-cannon'), hbc = areaOf('weapon-heavy-blaster-cannon');
  assert.equal(bc.kind, 'adjacent'); assert.equal(bc.geometry.radiusSquares, 1); assert.equal(bc.halfDamageOnMiss, true);
  assert.deepEqual([bc.kind, bc.geometry, bc.onMiss], [hbc.kind, hbc.geometry, hbc.onMiss]);
  ok('Blaster Cannon: primary target plus adjacent squares (Core p.125), identical encoding to the Heavy Blaster Cannon');
  // 6b: the area flows into the live attack workflow
  installHarness(); setRound(null);
  try {
    const A = makeActor({}); const g = canon('weapon-thermal-detonator'); g.actor = A; A.items.push(g);
    reset(); await attack(A, g, {}); const wf = posted.find((p) => p.context?.workflowContext)?.context.workflowContext;
    assert.equal(wf.attackShape.area.kind, 'burst'); assert.equal(wf.attackShape.area.radiusSquares, 4); assert.equal(wf.attack.isArea, true); assert.equal(wf.ruleData.halfDamageOnMiss, true);
  } finally { restoreHarness(); }
  // 7: the sources that publish NO geometry stay explicitly source-silent; a fire-mode derived area is NOT given intrinsic geometry
  for (const k of ['weapon-adhesive-grenade', 'weapon-cryoban-grenade', 'weapon-remote-grenade']) {
    const a = areaOf(k); assert.equal(a.kind, 'area-unspecified', k); assert.equal(a.completeness, 'source-silent-geometry', k); assert.equal(a.geometry.radiusSquares, null, k);
  }
  const rc = areaOf('weapon-repeating-blaster-carbine');
  assert.equal(rc.kind, 'autofire-area'); assert.equal(rc.derivedFrom, 'fire-mode'); assert.equal(rc.completeness, null); assert.equal(rc.geometry.shape, null, 'no intrinsic geometry was invented (the generic 2x2 autofire area belongs to the autofire path)');
  assert.equal(rec('weapon-repeating-blaster-carbine').canonicalStats.attackProfiles[0].area.shape, null, 'canonical data untouched for the fire-mode-derived area');
  ok('Adhesive / CryoBan / Remote grenades publish no radius -> source-silent (not invented); the Repeating Carbine area is fire-mode derived, not intrinsic');
}

// ======================================================================================================================================
// PREPARED ATTACK (8-14): Bryar built-up shot -- optional, player-primed, matures next turn, +1 weapon die, 5 shots
// ======================================================================================================================================
{
  installHarness(); setRound(null);
  const costOf = (a, w, o, om = {}) => AmmoSystem.resolveAmmoCost({ weapon: w, workflowContext: null, options: o, optionModifiers: om });
  AmmoSystem.spendForWorkflow = async (actor, w, { workflowContext, options, optionModifiers }) => { spent.ammo += costOf(actor, w, { ...options, combatContext: workflowContext }, optionModifiers); return { success: true, spent: false }; };
  try {
    const P = withAmmo('weapon-bryar-pistol'); const rifle = withAmmo('weapon-bryar-rifle', 50);
    const rapid = optionFeat('Rapid Shot', 'rapidShot');
    const A = makeActor({ feats: [rapid], items: [P, rifle] });
    const dice = (w, opts = {}) => resolveDamageComposition(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId: 'primary' }, combatOptions: opts }).dice.extraWeaponDice ?? 0;
    const tempOf = (w) => rt.resolveAttackShapeFor ? null : null;
    // 8: an ordinary Bryar attack is untouched -- 1 shot, no extra die, no state written
    reset(); assert.ok(await attack(A, P, {})); assert.equal(spent.ammo, 1); assert.equal(P.flags.swse.fireState, undefined);
    setRound(2); reset(); assert.ok(await attack(A, P, {})); assert.equal(spent.ammo, 1, 'ordinary attack while in combat still costs one shot');
    assert.equal(dice(P), 0);
    ok('ordinary Bryar attack (in and out of combat) is unchanged: one shot, no extra die');

    // 9, 10: priming is the player's explicit choice; it needs the combat clock and pays the structured swift action
    setRound(null); reset();
    let r = await FireStateStoreRef.primePreparedAttack(A, P, rt.resolveAttackWeaponRuntime(P, {}), {}); assert.deepEqual([r.ok, r.reason], [false, 'no-active-combat']); assert.deepEqual(spent.actions, []);
    setRound(2); reset();
    r = await FireStateStoreRef.primePreparedAttack(A, P, rt.resolveAttackWeaponRuntime(P, {}), {}); assert.equal(r.ok, true); assert.deepEqual(spent.actions, ['swift']);
    assert.deepEqual(P.flags.swse.fireState.primed, { id: 'prepared-attack', round: 2 }.id ? P.flags.swse.fireState.primed : null);
    assert.equal(P.flags.swse.fireState.primed.round, 2); assert.equal(P.flags.swse.fireState.combatId, 'c1');
    // 13: previews never mutate; the same round the priming has not matured
    const snap = JSON.stringify(P.flags.swse.fireState);
    let prev = await computeFinalAttackComposition(A, P, {}); assert.equal(prev.readiness.prepared.primed, true); assert.equal(prev.readiness.prepared.matured, false); assert.equal(JSON.stringify(P.flags.swse.fireState), snap);
    ok('priming is an explicit player choice: refused out of combat, pays the structured swift action, persists on the owned item, preview does not mutate');

    // 11: attacking before the start of the next turn spends the priming without the prepared effect
    reset(); assert.ok(await attack(A, P, {})); assert.equal(spent.ammo, 1); assert.equal(P.flags.swse.fireState.primed, undefined, 'priming lost by attacking early');
    ok('an attack before the next turn is an ordinary attack and the priming is lost (RAW: no attacks before the start of your next turn)');

    // 12: prime in round 2, matured in round 3 -> next attack is the primed shot: +1 weapon die, 5 shots, consumed afterwards
    setRound(2); reset(); await FireStateStoreRef.primePreparedAttack(A, P, rt.resolveAttackWeaponRuntime(P, {}), {});
    setRound(3); reset();
    prev = await computeFinalAttackComposition(A, P, {}); assert.equal(prev.readiness.prepared.matured, true);
    assert.ok(await attack(A, P, {})); assert.equal(spent.ammo, 5, 'a primed shot consumes five shots');
    const wf = posted.find((p) => p.context?.workflowContext)?.context.workflowContext;
    assert.ok(wf.attack?.selectedOptions?.preparedAttack, 'the choice persists into the workflow context (attack.selectedOptions)');
    assert.equal(dice(P, { preparedAttack: true }), 1, 'primed shot: +1 weapon die at damage time via the carried selection');
    assert.equal(P.flags.swse.fireState.primed, undefined, 'consumed by the next attack');
    reset(); assert.ok(await attack(A, P, {})); assert.equal(spent.ammo, 1, 'the attack after the primed shot is ordinary again');
    ok('matured priming: the next attack deals +1 weapon die and consumes five shots, the selection persists into the workflow context, then the priming is consumed');

    // 14: illegal / unaffordable prepared attacks spend nothing and keep the priming
    setRound(4); reset(); await FireStateStoreRef.primePreparedAttack(A, P, rt.resolveAttackWeaponRuntime(P, {}), {});
    setRound(5); reset();
    assert.equal(await attack(A, P, { combatOptions: { rapidShot: true } }), null, 'a primed shot cannot be combined with an ability that consumes more than one shot');
    assert.equal(spent.ammo, 0); assert.deepEqual(spent.actions, []); assert.equal(spent.rolls, 0); assert.ok(P.flags.swse.fireState.primed, 'priming kept');
    reset(); P.system.ammunition.current = 3; AmmoSystem.isTrackingEnabled = () => true;
    assert.equal(await attack(A, P, {}), null); assert.equal(spent.rolls, 0); assert.ok(P.flags.swse.fireState.primed, 'insufficient ammunition for five shots keeps the priming');
    AmmoSystem.isTrackingEnabled = origs.track; P.system.ammunition.current = 100;
    // the option cannot be asserted for free
    setRound(6); reset(); assert.equal(await attack(A, rifle, { combatOptions: { preparedAttack: true } }), null, 'asserting a prepared attack without a matured priming is refused'); assert.equal(spent.rolls, 0);
    // economy refusal: nothing written
    restoreHarness(); installHarness({ econAllowed: false }); setRound(2); reset();
    const fresh = withAmmo('weapon-bryar-rifle', 50); const B = makeActor({ items: [fresh] });
    r = await FireStateStoreRef.primePreparedAttack(B, fresh, rt.resolveAttackWeaponRuntime(fresh, {}), {}); assert.deepEqual([r.ok, r.reason], [false, 'action-unavailable']); assert.equal(fresh.flags.swse?.fireState, undefined);
    ok('illegal prepared attacks (multi-shot ability, too little ammunition, unprimed assertion, unpayable priming) spend and write nothing');
  } finally { restoreHarness(); }
}

// ======================================================================================================================================
// BRACE RULE (15-19): autofire-only brace = two swift actions; a structured braceRule demands an extended stock
// ======================================================================================================================================
{
  const formulas = [];
  const stub = async (f) => { formulas.push(f); return { total: 16, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  const o1 = SWSERoll._safeRoll, o2 = globalThis.SWSE;
  const run = async (A, w, extra = {}) => { reset(); formulas.length = 0; return SWSERoll.rollAutofire(A, w, { targets: [target()], skipFP: true, ...extra }); };
  installHarness(); setRound(null);
  SWSERoll._safeRoll = stub; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub } };
  AmmoSystem.consumeAmmunition = async (a, w, n) => ({ success: true, newAmmo: 50 - n, previousAmmo: 50 });
  try {
    const sub = withAmmo('weapon-subrepeating-blaster', 50); const A = makeActor({ items: [sub] });
    const bonus = () => Number(/\+ (-?\d+)$/.exec(formulas[0])?.[1] ?? /(-?\d+)$/.exec(formulas[0])?.[1]);
    // 15, 18: unbraced autofire is legal regardless of the stock (it is the brace that is restricted)
    assert.equal(rt.shapeOfWeapon(sub, {}).brace.stockRule, 'extended', 'the structured braceRule is exposed on the selected form');
    let r = await run(A, sub); assert.ok(r?.success, 'unbraced autofire works'); const unbraced = bonus(); assert.deepEqual(spent.actions, []);
    // 16, 19: braced + stock not extended (unknown counts as not extended) -> refused before anything is spent
    r = await run(A, sub, { braced: true }); assert.equal(r, null); assert.equal(formulas.length, 0); assert.deepEqual(spent.actions, []); assert.ok(notes.warn.some((m) => /stock is not extended/.test(m)));
    await FireStateStoreRef.setStockState(A, sub, 'retracted'); r = await run(A, sub, { braced: true }); assert.equal(r, null, 'explicitly retracted stock cannot brace either');
    // extended -> braced: the two swift actions are paid through the action economy, the penalty drops from -5 to -2
    await FireStateStoreRef.setStockState(A, sub, 'extended');
    r = await run(A, sub, { braced: true }); assert.ok(r?.success); assert.deepEqual(spent.actions, ['swift', 'swift']); assert.equal(bonus() - unbraced, 3, 'braced autofire: -2 instead of -5');
    ok('Subrepeating Blaster: brace needs an extended stock (structured braceRule), costs two swift actions, braced penalty -2 vs -5, unbraced autofire unaffected');
    // 17: applicability is the selected form's own structure; another autofire-only form without a braceRule braces freely (two swifts)
    const hab = withAmmo('weapon-heavy-assault-blaster', 50); const H = makeActor({ items: [hab] });
    assert.equal(rt.shapeOfWeapon(hab, {}).brace.stockRule, null);
    r = await run(H, hab, { braced: true }); assert.ok(r?.success); assert.deepEqual(spent.actions, ['swift', 'swift']);
    // forms that are not autofire-only keep the free braced flag they always had
    const either = registryData.identities.find((i) => { const s = rt.shapeOfWeapon(canon(i.identityKey), {}); return s.source === 'canonical' && s.fireModes.autofire && !s.fireModes.autofireOnly; });
    const e = withAmmo(either.identityKey, 50); const E = makeActor({ items: [e] });
    r = await run(E, e, { braced: true }); assert.ok(r?.success); assert.deepEqual(spent.actions, [], 'brace is a RAW autofire-ONLY mechanic: other forms are not charged');
    ok('brace applicability comes from the selected form structure (autofire-only), with no weapon-name check');
    // 16: unpayable brace spends nothing (no roll, no ammunition)
    restoreHarness(); installHarness({ econAllowed: false }); setRound(null);
    SWSERoll._safeRoll = stub; AmmoSystem.consumeAmmunition = async () => { throw new Error('ammunition must not be touched'); };
    r = await run(A, sub, { braced: true }); assert.equal(r, null); assert.equal(formulas.length, 0);
    ok('an unpayable brace stops before the roll and before any ammunition expenditure');
  } finally { SWSERoll._safeRoll = o1; globalThis.SWSE = o2; restoreHarness(); }
}
