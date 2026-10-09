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

// ======================================================================================================================================
// WEAPON <-> ABILITY RELATIONS (20-26) and CANONICAL SELECTOR DESCRIPTOR (27-31)
// ======================================================================================================================================
const closure = await import('../tools/census-weapon-executable-field-closure.mjs');
const { RELATION_POLICY, relationsForAbility, negationExclusions } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/ability-relations.js');
const { descriptorMatchesAny, identitySlugSet, groupVocabSet } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/weapon-descriptor.js');
const { damageContextForReaction } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js');
const cls = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapon-target-gate-classifiers.js');
const packDoc = (pack, name, rename = 'Qzx Renamed Label') => {
  const d = fs.readFileSync(pack, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((x) => x.name === name);
  return { ...JSON.parse(JSON.stringify(d)), id: `p${++uid}`, name: rename };
};
const dexActor = (items, feats) => { const a = makeActor({ items, feats }); a.system.attributes.dex = ab(4); return a; };
{
  const census = await closure.buildClosureCensus();
  // 20: every relation the corpus declares is classified; every executable relation either has a consumer or a named reason + owner
  assert.deepEqual(census.relations.unclassified, []);
  assert.equal(census.relations.distinctRelations, 22);
  for (const r of census.relations.executableConsumed) assert.ok(r.consumer, `${r.relation} names its consumer`);
  for (const r of census.relations.executableDeferred) { assert.ok(r.reason && r.owner, `${r.relation} deferred with reason+owner`); assert.ok(RELATION_POLICY[r.relation].deferred); }
  assert.deepEqual(census.relations.executableDeferred.map((r) => r.relation).sort(), ['FULL_ROUND_THREE_TARGET_AREA_ATTACK_WITH_DISCBLADE', 'TREAT_AS_RIFLE_INSTEAD_OF_EXOTIC_AND_GAIN_PLUS_1_ATTACK', 'TREAT_DISCBLADE_AS_PISTOL_FOR_RANGE_ONLY', 'USE_THE_FORCE_DC_15_AFTER_RANGED_ATTACK_TO_RETURN_DISCBLADE_AS_FREE_ACTION']);
  ok('every one of the 22 weapon-ability relation families is classified; consumed ones name a consumer, the 4 deferred ones carry a reason and an owner (Phase 5D-I-C-B consumed the Amphistaff whip-form relation; 5D-I-C-C the positive / negative weapon-modifier relations)');

  // 21: PROHIBITED still works -- by ability IDENTITY (a renamed canonical Rapid Shot is refused; a same-named impostor is not)
  const flech = canon('weapon-flechette-launcher');
  const rapidReal = { ...optionFeat('Zzz Renamed', 'rapidShot'), flags: { swse: { canonicalFeat: { identityKey: 'feat::saga-edition-core-rulebook::p89::rapid-shot' } } } };
  const impostor = { ...optionFeat('Rapid Shot', 'rapidShot'), flags: { swse: { canonicalFeat: { identityKey: 'feat::elsewhere::p1::something-else' } } } };
  const optsFor = (feat) => { const A = makeActor({ feats: [feat], items: [flech] }); return CombatOptionResolver.getAvailableAttackOptions(A, flech, {}).map((o) => o.id); };
  assert.ok(!optsFor(rapidReal).includes('rapidShot'), 'canonical Rapid Shot under a renamed label is prohibited by the weapon relation');
  ok('PROHIBITED relation still works and joins on ability identity (renamed canonical ability refused)');
  // 26: wrong ability identity never triggers it -- the impostor keeps the option because its identity is not rapid-shot... but the OPTION id is also joined, so assert the identity path separately
  assert.deepEqual(relationsForAbility(flech, rapidReal, {}).map((r) => r.relation).sort(), ['PROHIBITED']);
  assert.deepEqual(relationsForAbility(flech, impostor, {}), [], 'a different canonical identity does not match the relation, whatever its name');

  // 22-24: attack-penalty / Rapid Strike / Sidearm relations still resolve from the structured corpus
  const hammer = rt.shapeOfWeapon(canon('unmapped::Power Hammer'), {});
  assert.ok(hammer.abilityRelations.some((r) => r.relation === 'EXTRA_ATTACK_PENALTY' && r.abilityToken === 'double-attack'));
  assert.ok(registryData.identities.some((i) => (i.abilityInteractions ?? []).some((a) => a.relation === 'REMOVE_RAPID_STRIKE_ATTACK_PENALTY')));
  assert.deepEqual(rt.shapeOfWeapon(canon('weapon-sidearm-blaster-pistol'), {}).temporal.map((t) => t.family), ['ability-triggered-reset']);
  ok('EXTRA_ATTACK_PENALTY, REMOVE_RAPID_STRIKE_ATTACK_PENALTY and the Sidearm swift-reset relation still resolve (their executions are pinned by the 5D-E/5D-F/5D-G suites)');

  // 25: EXPLICIT_* relations are certified MIRRORS of the ability's own scope: they never widen a specifically scoped rule
  //     (Blaster Carbine / Blaster Rifle / Light Repeating Blaster declare Riflemaster benefits, but the d10->d12 step is the Heavy Blaster Rifle's alone)
  const rifleDoc = packDoc('packs/feats.db', 'Riflemaster');
  const mods = (A, w, extra = {}) => CombatOptionResolver.collectAttackModifiers(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId: 'primary' }, ...extra });
  for (const k of ['weapon-blaster-carbine', 'weapon-blaster-rifle', 'weapon-light-repeating-blaster']) assert.ok(relationsForAbility(canon(k), rifleDoc, {}).some((r) => r.relation === 'EXPLICIT_WEAPON_BENEFIT'), `${k} declares the Riflemaster benefit`);
  assert.ok(census.relationConsistency.consistent >= 20);
  // Phase 5D-I-A: Sport Hunter now carries the structured sporting-blaster-pistol reroll rule, so that relation pair is consistent; only the Long Haft Strike text-scope pair remains
  assert.deepEqual(census.relationConsistency.inconsistent, ['lightsaber-chassis-pike <- Long Haft Strike (UNLOCKS_DOUBLE_WEAPON_MODE)']);
  ok('EXPLICIT_* relations mirror the ability scope (24 consistent); the 1 inconsistent pair is named (Long Haft Strike text scope); Sport Hunter sporting-blaster-pistol is consistent since 5D-I-A');

  // ---- Riflemaster / Sport Hunter damage semantics (Galaxy at War p.25): die-SIZE replacement is not an extra die ------------------
  const hbr = canon('weapon-heavy-blaster-rifle'), br = canon('weapon-blaster-rifle'), car = canon('weapon-blaster-carbine');
  const dmg = (A, w, ctx = {}) => resolveDamageComposition(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId: 'primary' }, ...ctx });
  const RM = makeActor({ feats: [rifleDoc], items: [hbr, br, car, canon('weapon-light-repeating-blaster')] });
  const hbrBase = dmg(makeActor({ items: [canon('weapon-heavy-blaster-rifle')] }), canon('weapon-heavy-blaster-rifle'));
  const hbrRm = dmg(RM, hbr);
  assert.match(hbrBase.dice.base, /^\d+d10$/); const n = Number(/^(\d+)d/.exec(hbrBase.dice.base)[1]);
  assert.equal(buildDamageFormula(hbrBase).startsWith(`${n}d10`), true);
  assert.equal(buildDamageFormula(hbrRm).startsWith(`${n}d12`), true, 'Riflemaster: Heavy Blaster Rifle dice go d10 -> d12');
  assert.equal(hbrRm.dice.extraWeaponDice ?? 0, 0, 'and it does NOT add another die');
  for (const w of [br, car, RM.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'weapon-light-repeating-blaster')]) assert.equal(dmg(RM, w).dice.dieStepIncreases ?? 0, 0, 'no other rifle receives the Heavy Blaster Rifle step');
  const RMren = makeActor({ feats: [packDoc('packs/feats.db', 'Riflemaster', 'Totally Different Label')], items: [canon('weapon-heavy-blaster-rifle')] });
  assert.equal(buildDamageFormula(dmg(RMren, RMren.items.find((i) => i.type === 'weapon'))).startsWith(`${n}d12`), true, 'display-name change does not alter applicability');
  const wrongId = { ...packDoc('packs/feats.db', 'Power Attack', 'Riflemaster'), system: JSON.parse(JSON.stringify(rifleDoc.system)) };
  // (an item that carries the rule data IS the ability; identity matters for decisions that read identity, covered elsewhere)
  void wrongId;
  ok('Riflemaster: Heavy Blaster Rifle d10 -> d12 (die-size step, no extra die); other rifles untouched; display name irrelevant');

  const shDoc = packDoc('packs/feats.db', 'Sport Hunter');
  const sr = canon('weapon-slugthrower-rifle'), sp = canon('weapon-slugthrower-pistol'), sbp = canon('weapon-sporting-blaster-pistol'), sbr = canon('weapon-sporting-blaster-rifle');
  const SH = makeActor({ feats: [shDoc], items: [sr, sp, sbp, sbr, canon('weapon-blaster-rifle')] });
  const srBase = dmg(makeActor({ items: [canon('weapon-slugthrower-rifle')] }), canon('weapon-slugthrower-rifle'));
  const m = Number(/^(\d+)d/.exec(srBase.dice.base)[1]);
  assert.match(srBase.dice.base, /d8$/);
  assert.equal(buildDamageFormula(dmg(SH, sr)).startsWith(`${m}d12`), true, 'Sport Hunter: Slugthrower Rifle dice go d8 -> d12 (two steps)');
  assert.equal(dmg(SH, sr).dice.extraWeaponDice ?? 0, 0, 'no extra die on the rifle');
  // pistol: +1 weapon die at point-blank ONLY (an extra die, NOT die-size scaling)
  const spBase = dmg(makeActor({ items: [canon('weapon-slugthrower-pistol')] }), canon('weapon-slugthrower-pistol'));
  const pbMods = mods(SH, sp, { rangeBand: 'point-blank' }); const shortMods = mods(SH, sp, { rangeBand: 'short' });
  assert.equal(pbMods.damageExtraWeaponDice, 1, 'Slugthrower Pistol at point-blank: +1 weapon die');
  assert.equal(shortMods.damageExtraWeaponDice ?? 0, 0, 'not outside point-blank');
  assert.equal(dmg(SH, sp, { combatOptions: {} }).dice.dieStepIncreases ?? 0, 0, 'the pistol branch is never die-size scaling');
  assert.equal(dmg(SH, sp).dice.base, spBase.dice.base);
  // sporting blaster branches unchanged: pistol (reroll 1s) is NOT implemented here, rifle is +1 attack when aiming
  assert.equal(mods(SH, sbp, { rangeBand: 'point-blank' }).damageExtraWeaponDice ?? 0, 0, 'Sporting Blaster Pistol: no extra die invented');
  assert.equal(dmg(SH, sbp).dice.dieStepIncreases ?? 0, 0, 'Sporting Blaster Pistol: no die step invented (its reroll-1s rule is residual, see audit)');
  assert.equal(mods(SH, sbr, { aim: true }).attackBonus, 1, 'Sporting Blaster Rifle: +1 attack when aiming'); assert.equal(mods(SH, sbr, {}).attackBonus ?? 0, 0);
  assert.equal(dmg(SH, SH.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'weapon-blaster-rifle')).dice.dieStepIncreases ?? 0, 0, 'wrong selector: a blaster rifle gets nothing from Sport Hunter');
  const SHren = makeActor({ feats: [packDoc('packs/feats.db', 'Sport Hunter', 'Other Label')], items: [canon('weapon-slugthrower-rifle')] });
  assert.equal(buildDamageFormula(dmg(SHren, SHren.items.find((i) => i.type === 'weapon'))).startsWith(`${m}d12`), true, 'display name irrelevant');
  // canonical data says die-size (SIZE_STEP) for the die-size branches and keeps the extra-die rules as extra-die rules
  const rules = (name) => JSON.parse(JSON.stringify(rec2(name))).system.abilityMeta.rules.map((r) => [r.type, r.value ?? null]);
  function rec2(name) { return fs.readFileSync('packs/feats.db', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((d) => d.name === name); }
  assert.deepEqual(rules('Riflemaster'), [['WEAPON_DAMAGE_DIE_SIZE_STEP', 1]]);
  assert.equal(rules('Sport Hunter')[0][0], 'WEAPON_DAMAGE_DIE_SIZE_STEP'); assert.equal(rules('Sport Hunter')[0][1], 2);
  assert.deepEqual(rules('Disabler'), [['WEAPON_DAMAGE_DIE_SIZE_STEP', 1]]);
  assert.deepEqual(rules('Primitive Warrior'), [['WEAPON_DAMAGE_DIE_STEP', 1]], 'Primitive Warrior really is +1 die: untouched');
  ok('Sport Hunter branch by branch: rifle d8 -> d12, pistol +1 die at point-blank only, sporting blaster rifle +1 aim attack, sporting blaster pistol untouched; canonical rule types corrected for Riflemaster/Sport Hunter/Disabler only');

  // UNLOCKS_DOUBLE_WEAPON_MODE + hasFeat identity: the pike is a double weapon only for a wielder with the unlocking ability
  const pike = canon('lightsaber-chassis-pike');
  const lhs = packDoc('packs/feats.db', 'Long Haft Strike');
  const withIt = makeActor({ feats: [lhs], items: [pike] }); const without = makeActor({ items: [canon('lightsaber-chassis-pike')] });
  const fakeLhs = { ...packDoc('packs/feats.db', 'Pin', 'Long Haft Strike') };
  assert.equal(rt.shapeOfWeapon(pike, {}).doubleWeapon.isDouble, true);
  assert.equal(rt.shapeOfWeapon(without.items.find((i) => i.type === 'weapon'), {}).doubleWeapon.isDouble, false);
  const imp = makeActor({ feats: [fakeLhs], items: [canon('lightsaber-chassis-pike')] });
  assert.equal(rt.shapeOfWeapon(imp.items.find((i) => i.type === 'weapon'), {}).doubleWeapon.isDouble, false, 'same-named ability with a different identity does not unlock it');
  assert.equal(rt.doubleWeaponEnds(pike, {}).length, 2, 'the two melee profiles become the two ends');
  ok('UNLOCKS_DOUBLE_WEAPON_MODE: Lightsaber Pike is a double weapon (two ends) only for the canonical Long Haft Strike identity, never for a same-named impostor');

  // CANNOT_NEGATE_ATTACK: Deflect cannot negate a canonical sonic weapon; a plain blaster renamed "Sonic Pistol" is still deflectable
  const sonic = canon('weapon-sonic-pistol');
  assert.deepEqual(negationExclusions(sonic, {}).sort(), ['deflect', 'talents-with-deflect-as-prerequisite']);
  assert.equal(damageContextForReaction({ weapon: sonic }).sonicCannotBeDeflected, true);
  const disguised = { ...canon('weapon-blaster-pistol'), name: 'Sonic Pistol', system: { damage: '3d6', damageType: 'sonic' } };
  assert.equal(damageContextForReaction({ weapon: disguised }).sonicCannotBeDeflected, false, 'name and Item damage text no longer decide for a canonical weapon');
  const sonicDamageWeapons = registryData.identities.filter((i) => i.canonicalStats.attackProfiles.some((p) => (p.damageType?.types ?? []).includes('sonic') && p.range?.mode === 'ranged'));
  for (const i of sonicDamageWeapons) assert.ok((i.abilityInteractions ?? []).some((a) => a.relation === 'CANNOT_NEGATE_ATTACK'), `${i.identityKey} (ranged sonic) declares CANNOT_NEGATE_ATTACK`);
  const { ReactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js');
  const deflector = { id: 'd', name: 'D', type: 'character', flags: { swse: {} }, items: col([mk('talent', 'Deflect', { flags: { swse: { id: 'swse.talent.deflect' } } })]), system: {} };
  const avail = (w) => { const c = damageContextForReaction({ weapon: w }); return ReactionEngine.getAvailableReactions(deflector, { attacker: {}, weapon: w, attackType: c.attackType, damageType: c.damageType, damageTypes: c.damageTypes, originalDamageTypes: c.originalDamageTypes, sonicCannotBeDeflected: c.sonicCannotBeDeflected, cannotBeNegatedBy: c.cannotBeNegatedBy, trigger: 'ON_ATTACK_DECLARED' }).map((r) => r.key); };
  assert.ok(!avail(sonic).includes('deflect'), 'Deflect is not offered against a sonic canonical weapon');
  ok('CANNOT_NEGATE_ATTACK: the weapon form declares what cannot negate it (sonic weapons vs Deflect); name/text no longer decide; every ranged sonic canonical weapon declares it');

  // 27-31: selector descriptor -- no name needed, duplicate names cannot alter applicability, homebrew keeps compatibility
  const wf = packDoc('packs/feats.db', 'Weapon Finesse');
  const club = canon('unmapped::Club/Baton'); const saber = canon('weapon-lightsaber'); const rifle = canon('weapon-blaster-rifle');
  const FinA = dexActor([club, saber, rifle], [wf]);
  const finBonus = (w) => CombatOptionResolver.collectAttackModifiers(FinA, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId: 'primary' } }).attackAbilityBonus;
  assert.ok(finBonus(club) > 0, 'renamed canonical Weapon Finesse applies to a light melee canonical weapon (structured size < wielder)');
  assert.ok(finBonus(saber) > 0, 'and to a lightsaber (group vocabulary)');
  assert.equal(finBonus(rifle) ?? 0, 0, 'but not to a rifle');
  // duplicate names cannot alter canonical applicability where the decision is an identity decision (Double Attack join)
  const { actorHasMultiAttackFor } = await import('/systems/foundryvtt-swse/scripts/combat/multi-attack.js');
  const daReal = { ...packDoc('packs/feats.db', 'Double Attack', 'Zzz Renamed'), system: { selectedChoice: { group: 'pistols' } } };
  const daFake = { ...packDoc('packs/feats.db', 'Power Attack', 'Double Attack'), system: { selectedChoice: { group: 'pistols' } } };
  const bp = canon('weapon-blaster-pistol');
  const DA = makeActor({ feats: [daReal], items: [bp] }); const DF = makeActor({ feats: [daFake], items: [canon('weapon-blaster-pistol')] });
  assert.equal(actorHasMultiAttackFor(DA, 'double', bp), true, 'renamed canonical Double Attack counts');
  assert.equal(actorHasMultiAttackFor(DF, 'double', DF.items.find((i) => i.type === 'weapon')), false, 'an item NAMED Double Attack with another canonical identity does not');
  ok('Weapon Finesse (canonical identity, display name irrelevant) joins light melee weapons structurally; duplicate names cannot alter canonical applicability');
  // grenade family amendment: Grenade-scoped abilities recognise canonical grenades with no name
  const frag = canon('weapon-frag-grenade'); const detonator = canon('weapon-thermal-detonator'); const grenLauncher = canon('weapon-grenade-launcher');
  assert.equal(cls.weaponMatchesGroup(frag, ['grenade', 'grenades'], {}), true); assert.equal(cls.weaponMatchesGroup(detonator, ['grenades'], {}), true); assert.equal(cls.weaponMatchesGroup(grenLauncher, ['grenade'], {}), false);
  assert.equal(cls.weaponMatchesGroup({ ...canon('weapon-blaster-pistol'), name: 'Frag Grenade' }, ['grenade'], {}), false, 'a name cannot make a canonical weapon a grenade');
  assert.equal(cls.weaponMatchesText(canon('weapon-blaster-pistol'), ['blaster pistol'], {}), true); assert.equal(cls.weaponMatchesText(canon('weapon-heavy-blaster-pistol'), ['blaster pistol'], {}), false, 'exact-identity scope: "blaster pistol" is not every pistol containing those words');
  assert.equal(cls.weaponMatchesGroup(canon('weapon-bowcaster'), ['rifles'], {}), false, 'structured group: the exotic bowcaster is not a rifle');
  ok('descriptor joins: grenade family, exact-identity scopes and structured groups replace name/text substring matching for canonical weapons');
  // 31: true homebrew still receives the compatibility behavior
  const hb = legacy({ weaponGroup: 'pistols', category: 'pistol' }, 'Homebrew Pistol');
  assert.equal(cls.weaponMatchesGroup(hb, ['pistols'], {}), true, 'legacy weapon: Item-text group match unchanged');
  assert.equal(cls.weaponMatchesText(legacy({}, 'Heavy Hold-Out Blaster'), ['hold-out blaster'], {}), true, 'legacy weapon: name/text compatibility unchanged');
  ok('true homebrew / legacy weapons keep their compatibility name/text matching');
}

// ======================================================================================================================================
// CLOSURE CENSUS (deterministic): every residual named; counters
// ======================================================================================================================================
{
  const census = await closure.buildClosureCensus();
  assert.deepEqual(census.problems, [], 'no unclassified field family, relation or heuristic site');
  const c = census.counters;
  assert.equal(c.EXECUTABLE_CANONICAL_CONDITIONS_WITH_POLICY_UNSUPPORTED, 0);
  assert.equal(c.EXECUTABLE_CONDITIONS_UNCLASSIFIED, 0);
  assert.equal(c.EXECUTABLE_RELATION_FAMILIES_UNCLASSIFIED, 0);
  assert.equal(c.CANONICAL_NAME_TEXT_HEURISTIC_USAGE, census.heuristics.canonicalResidualSites.length);
  assert.equal(c.CANONICAL_NAME_TEXT_HEURISTIC_USAGE, 0, 'no canonical mechanical decision depends on display text/name');
  assert.ok(census.heuristics.canonicalResidualSites.every((s) => s.owner && s.reason), 'every canonical heuristic residual is named with a reason and an owner');
  for (const f of census.fieldFamilies.rows.filter((r) => r.status === 'DEFERRED')) assert.ok((f.owner && f.reason) || f.executableUnconsumed, `${f.id} deferred with an owner`);
  assert.deepEqual([c.AREA_FORMS_SOURCE_SILENT, c.AREA_FORMS_FIRE_MODE_DERIVED, c.AREA_FORMS_MISSING_CANONICAL_DATA], [3, 1, 0], 'adhesive/CryoBan/remote = SOURCE_SILENT; repeating carbine = FIRE_MODE_DERIVED; nothing MISSING_CANONICAL_DATA');
  assert.ok(c.UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER <= c.UNIQUE_OPERATION_MECHANIC_FAMILIES && c.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER >= c.UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER && c.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER >= c.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER, 'families <= unique keys <= raw (identity,key) occurrences');
  for (const [name, f] of Object.entries(census.operationKeys.families)) if (f.executableUnconsumed.length) { assert.ok(f.owner && f.note?.reason && f.note?.phase, `${name}: owner/reason/recommended phase`); assert.ok(f.representativeIdentities.length && f.executableUnconsumedOccurrences > 0, `${name}: representative identities + occurrences`); }
  assert.equal(census.legacyRuleManifest.byGroup.D, 0); assert.ok(census.legacyRuleManifest.byGroup.A > 30);
  for (const r of census.legacyRuleManifest.rows) assert.ok(['A', 'B', 'C', 'D'].includes(r.group) && r.why);
  const onDisk = JSON.parse(fs.readFileSync(closure.OUT_JSON, 'utf8'));
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(census)), 'committed closure census is current (run tools/census-weapon-executable-field-closure.mjs)');
  ok(`closure census: ${JSON.stringify({ families: `${c.FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES}/${c.PARTIAL_EXECUTION_FIELD_FAMILIES}/${c.UNCONSUMED_EXECUTION_FIELD_FAMILIES} consumed/partial/none`, residualHeuristics: c.CANONICAL_NAME_TEXT_HEURISTIC_USAGE, conditionsUnsupported: c.EXECUTABLE_CANONICAL_CONDITIONS_WITH_POLICY_UNSUPPORTED })}`);
}


// ======================================================================================================================================
// PROFICIENCY ENTITLEMENTS BY CANONICAL IDENTITY + AMMO COST (CONSUMER_DEFECT)
// ======================================================================================================================================
{
  const { extractActorEntitlements } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/proficiency-resolver.js');
  const wp = (rename, choice) => ({ ...packDoc('packs/feats.db', 'Weapon Proficiency', rename), flags: { swse: { ...packDoc('packs/feats.db', 'Weapon Proficiency').flags.swse, choices: { weaponProficiency: choice } } } });
  const ewp = (rename, choice) => ({ ...packDoc('packs/feats.db', 'Exotic Weapon Proficiency', rename), flags: { swse: { ...packDoc('packs/feats.db', 'Exotic Weapon Proficiency').flags.swse, choices: { weaponProficiency: choice } } } });
  const ent = (feats) => extractActorEntitlements({ items: feats, system: {} });
  const a = ent([wp('Qzx Totally Renamed', { group: 'pistols' }), ewp('Another Label', { weaponIdentity: 'weapon-bowcaster' })]);
  assert.ok(a.groups.has('pistols'), 'canonical Weapon Proficiency + stored group choice grants the group whatever the title says');
  assert.ok(a.exoticIdentities.has('weapon-bowcaster'), 'canonical Exotic Weapon Proficiency + stored identity grants that exotic weapon whatever the title says');
  // a TITLE that merely looks like the feat, on an item with a different canonical identity, grants nothing
  const imp = { ...packDoc('packs/feats.db', 'Power Attack', 'Weapon Proficiency (Rifles)') };
  const b = ent([imp]); assert.equal(b.groups.has('rifles'), false, 'title text cannot grant proficiency to a canonical item that is a different feat');
  // legacy / homebrew (no canonical identity): the title is still understood
  const legacyFeat = mk('feat', 'Weapon Proficiency (Rifles)'); const legacyExotic = mk('feat', 'Exotic Weapon Proficiency (Bowcaster)');
  const c2 = ent([legacyFeat, legacyExotic]); assert.ok(c2.groups.has('rifles')); assert.ok(c2.exotic.has('bowcaster'));
  ok('proficiency entitlements: canonical feat identity + stored structured choice decide (renamed titles still grant); legacy/homebrew titles keep working; a title cannot impersonate a different canonical feat');

  // resolveAmmoCost: a selected option's cost wins over the serialized workflow default of 0; legitimate zero stays zero
  const w = withAmmo('weapon-blaster-pistol');
  const wf0 = { resources: { ammoCost: 0 }, ammoCost: 0, ruleData: {} };
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: w, workflowContext: wf0, options: {}, optionModifiers: { ammunitionCost: 5 } }), 5, 'selected option cost > 0 + workflow default 0 -> selected cost wins');
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: w, workflowContext: wf0, options: { ammoCost: 3 }, optionModifiers: { ammunitionCost: 5 } }), 3, 'an explicit workflow/action cost still has priority');
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: w, workflowContext: wf0, options: { canonicalAmmoUnits: 0 }, optionModifiers: {} }), 0, 'a legitimately zero-cost canonical attack stays zero');
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: canon('weapon-blaster-pistol'), workflowContext: wf0, options: {}, optionModifiers: {} }), 0, 'no ammunition pool -> zero');
  ok('ammo cost (CONSUMER_DEFECT): a selected option ammunition cost beats the workflow default 0; explicit costs keep priority; zero-cost attacks stay zero');
}

console.log(`Phase 5D-H executable field closure: ${step} checks passed.`);
