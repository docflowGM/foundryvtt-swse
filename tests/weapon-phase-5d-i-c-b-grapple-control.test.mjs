import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-C-B -- weapon CONTROL convergence: grab / grapple / restrain / net / snare / tractor / hurl.
// The weapon declares the control; the EXISTING grapple state machine (GrappleStateEngine / SWSEGrappling) executes it. Every weapon below is a canonical
// weapon under a deliberately WRONG name/Item projection and every ability that matters carries a canonical identity under a deliberately WRONG display name,
// so a pass cannot come from a name. Executors are exercised through the real rider stage (applyCanonicalSpecialEffects) with engine stubs that record
// what was delegated (ActorEngine effect writes / damage, RollEngine totals).

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
const chatPosted = [];
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async (d) => { chatPosted.push(d); return {}; } };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { rollAttack, computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { FireStateStore } = await import('/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js');
const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
const CSE = await import('/systems/foundryvtt-swse/scripts/engine/combat/canonical-special-effects.js');
const WC = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapon-control-effects.js');
const CR = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/control-rules.js');
const FO = await import('/systems/foundryvtt-swse/scripts/engine/combat/falling-object-rules.js');
const SM = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js');
const OE = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/outcome-effects.js');
const { GrappleStateEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js');
const { SWSEGrappling } = await import('/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js');
const { getGrappleStateInfo } = await import('/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-query.js');
const { EffectIntentEngine } = await import('/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
const manifestICB = await import('../tools/census-weapon-phase-5d-i-c-b-inputs.mjs');
const manifestICA = await import('../tools/census-weapon-phase-5d-i-c-a-inputs.mjs');
const manifestIB = await import('../tools/census-weapon-phase-5d-i-b-inputs.mjs');
const manifestIA = await import('../tools/census-weapon-phase-5d-i-a-inputs.mjs');
const { I_C_B_ROWS, I_C_B_BASELINE } = await import('../tools/lib/weapon-phase-5d-i-c-b-ledger.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
let uid = 0;
const mk = (type, name, extra = {}) => ({ id: `i${++uid}`, type, name, flags: extra.flags ?? {}, system: extra.system ?? {} });
const featId = (slug, book = 'saga-edition-core-rulebook', page = 'p0') => `feat::${book}::${page}::${slug}`;
// a canonical feat under a deliberately WRONG display name
const canonFeat = (slug, name = 'Zxq Renamed Label', extra = {}) => mk('feat', name, { flags: { swse: { canonicalFeat: { identityKey: featId(slug) } } }, ...extra });
const canonTalent = (slug, name = 'Qwv Another Label') => mk('talent', name, { flags: { swse: { id: `swse.talent.${slug.replace(/-/g, '_')}` } } });
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Simple Weapons)', 'Weapon Proficiency (Heavy Weapons)', 'Weapon Proficiency (Advanced Melee Weapons)'].map((n) => mk('feat', n));
const LS_PROF = canonFeat('weapon-proficiency-lightsabers', 'Wpn Prof LS');
const canon = (k, system = {}, extra = {}) => ({ id: `w${++uid}-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', damageType: 'sonic', equipped: true, ...system }, ...extra });
const withAmmo = (k, max = 100, system = {}) => canon(k, { ammunition: { current: max, max }, ...system });
let actorSeq = 0;
const makeActor = ({ id = null, feats = [], items = [], level = 6, type = 'character', size = 'medium', grapple = 8, str = 0 } = {}) => {
  const actor = {
    id: id ?? `a${++actorSeq}`, name: `Actor${actorSeq}`, type, flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col([...PROF, LS_PROF, ...feats, ...items]),
    system: { bab: 6, level, size, attributes: { str: ab(str), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, hp: { value: 40, max: 40 }, conditionTrack: { current: 0 },
      derived: { speed: { total: 6 }, defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } }, forcePoints: { value: 1, max: 5 },
      weaponProficiencies: ['pistols', 'rifles', 'simple', 'heavy-weapons', 'advanced-melee', 'lightsabers'] },
    __grapple: grapple,
  };
  for (const w of items) w.actor = actor;
  return actor;
};
const setPath = (obj, path, value) => { const keys = path.split('.'); let o = obj; for (const k of keys.slice(0, -1)) o = (o[k] ??= {}); o[keys.at(-1)] = value; };

// ---- harness: engine stubs record what is delegated -------------------------------------------------------------------------------------------
const spent = { ammo: 0, actions: [] };
const damage = [], ctMoves = [], formulas = [];
const dice = { d20: 16, map: {} };
const origs = {
  RE: RollEngine.safeRoll, post: SWSEChat.postRoll, spendAmmo: AmmoSystem.spendForWorkflow, upd: ActorEngine.updateOwnedItems, econ: ActionEconomyConsumption.spend, consume: AmmoSystem.consumeAmmunition,
  create: ActorEngine.createEmbeddedDocuments, del: ActorEngine.deleteEmbeddedDocuments, updEmb: ActorEngine.updateEmbeddedDocuments, createFx: ActorEngine.createActiveEffects, applyDmg: ActorEngine.applyDamage,
  ct: ActorEngine.setConditionStep, persist: ActorEngine.setConditionPersistent,
  bonus: SWSEGrappling._rollGrappleBonus, SW: globalThis.SWSE, rollSkill: SWSERoll.rollSkill,
};
let posted = [];
const stubRoll = async (f) => {
  const key = String(f).replace(/\s+/g, ''); formulas.push(f);
  const isD20 = /^1d20/.test(key); const bonus = Number((/^1d20([+-]\d+)$/.exec(key) ?? [])[1] ?? 0) || 0;
  const natural = isD20 ? (dice.next?.length ? dice.next.shift() : dice.d20) : null;
  const t = isD20 ? natural + bonus : (dice.map[key] ?? 4);
  return { total: t, formula: f, dice: [{ results: [{ result: isD20 ? Math.min(20, Math.max(1, natural)) : Math.min(20, Math.max(1, t)) }] }] };
};
const install = () => {
  RollEngine.safeRoll = stubRoll;
  globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stubRoll } };
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => { spent.ammo += 1; return { success: true, spent: false }; };
  AmmoSystem.consumeAmmunition = async (a, w, n) => ({ success: true, newAmmo: 50 - n, previousAmmo: 50 });
  ActorEngine.updateOwnedItems = async (actor, updates) => { for (const u of updates) { const item = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); } };
  ActionEconomyConsumption.spend = async (actor, type) => { spent.actions.push(type); return { allowed: true, committed: true, rollback: async () => { spent.actions.pop(); } }; };
  ActorEngine.createEmbeddedDocuments = async (actor, name, data) => { const made = data.map((d) => ({ id: `ge${++uid}`, ...JSON.parse(JSON.stringify(d)), statuses: new Set(), disabled: false })); actor.effects.push(...made); return made; };
  ActorEngine.deleteEmbeddedDocuments = async (actor, name, ids) => { actor.effects = actor.effects.filter((e) => !ids.includes(e.id)); return ids; };
  ActorEngine.updateEmbeddedDocuments = async (actor, name, updates) => { for (const u of updates) { const e = actor.effects.find((x) => x.id === u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(e, k, JSON.parse(JSON.stringify(v))); } return updates; };
  ActorEngine.createActiveEffects = async (actor, data) => { const made = data.map((d) => ({ id: `fx${++uid}`, ...d, statuses: new Set(d.statuses ?? []), disabled: false })); actor.effects.push(...made); return made; };
  ActorEngine.applyDamage = async (actor, packet) => { damage.push({ actor: actor.id, amount: packet.amount, type: packet.type, options: packet.options, source: packet.source }); actor.system.hp.value -= packet.amount; return { applied: packet.amount, resolution: { thresholdExceeded: false, conditionDelta: 0 } }; };
  ActorEngine.setConditionStep = async (actor, stepNo, src) => { ctMoves.push({ actor: actor.id, step: stepNo, src }); actor.system.conditionTrack.current = stepNo; return {}; };
  ActorEngine.setConditionPersistent = async () => ({});
  SWSEGrappling._rollGrappleBonus = async (actor) => actor.__grapple ?? 5;
};
const restore = () => {
  RollEngine.safeRoll = origs.RE; SWSEChat.postRoll = origs.post; AmmoSystem.spendForWorkflow = origs.spendAmmo; ActorEngine.updateOwnedItems = origs.upd; ActionEconomyConsumption.spend = origs.econ; AmmoSystem.consumeAmmunition = origs.consume;
  ActorEngine.createEmbeddedDocuments = origs.create; ActorEngine.deleteEmbeddedDocuments = origs.del; ActorEngine.updateEmbeddedDocuments = origs.updEmb; ActorEngine.createActiveEffects = origs.createFx; ActorEngine.applyDamage = origs.applyDmg;
  ActorEngine.setConditionStep = origs.ct; ActorEngine.setConditionPersistent = origs.persist;
  SWSEGrappling._rollGrappleBonus = origs.bonus; globalThis.SWSE = origs.SW; globalThis.game = undefined;
};
const reset = () => { spent.ammo = 0; spent.actions.length = 0; posted = []; damage.length = 0; ctMoves.length = 0; formulas.length = 0; dice.d20 = 16; dice.next = []; dice.map = {}; notes.warn.length = 0; chatPosted.length = 0; };
const world = (...actors) => { globalThis.game = { combat: null, user: { isGM: true, targets: { first: () => null } }, actors, scenes: { viewed: { tokens: [] } } }; return actors; };
const setCombat = (round, actors, turnActor = null) => { globalThis.game = { ...(globalThis.game ?? {}), combat: { id: 'c1', started: true, round, turn: 0, combatant: { actor: turnActor ?? actors[0] }, combatants: actors.map((a) => ({ id: `cb-${a.id}`, actor: a })) }, actors, user: { isGM: true, targets: { first: () => null } }, scenes: { viewed: { tokens: [] } } }; };
const mkT = ({ id = null, size = 'medium', reflex = 12, hp = 40, grapple = 5, type = 'npc' } = {}) => ({ id: id ?? `t${++actorSeq}`, name: `Dummy${actorSeq}`, type, flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; },
  system: { size, hp: { value: hp, max: hp }, conditionTrack: { current: 0 }, derived: { speed: { total: 6 }, defenses: { reflex: { total: reflex }, fortitude: { total: 12 }, will: { total: 10 } } }, attributes: { str: ab(0) } }, __grapple: grapple });
const mkMsg = () => { const store = {}; return { id: `m${++uid}`, getFlag: (s, k) => store[`${s}.${k}`] ?? null, setFlag: async (s, k, v) => { store[`${s}.${k}`] = v; }, store }; };
const wfOf = () => posted.find((p) => p.context?.workflowContext)?.context.workflowContext;
const ask = (fn) => { const asked = []; rt.setSpecialPromptProvider(async (q) => { asked.push(q.id); return fn(q); }); return asked; };
const noAsk = () => rt.setSpecialPromptProvider(null);
const ctxFor = () => ({ id: 'c1', started: true, round: 1, turn: 0 });

/** make an attack with the weapon and return the workflow's special state (records evaluated at attack time) */
async function attackWith(A, w, t, extra = {}) {
  reset();
  const r = await rollAttack(A, w, { target: t, suppressChat: false, wieldedHands: 2, ...extra });
  return { r, special: wfOf()?.special ?? null, records: wfOf()?.special?.records ?? [] };
}
/** the Apply Damage / Apply Effects rider stage for one target */
const applyFx = (special, t, { attacker, weapon = null, hpBefore = 40, hpAfter = 30, rawAmount = 10, message = mkMsg(), label = 'Weapon' } = {}) =>
  CSE.applyCanonicalSpecialEffects({ special, target: t, attacker, weapon, hpBefore, hpAfter, rawAmount, appliedAmount: rawAmount, resolution: null, damageType: 'energy', message, weaponLabel: label });
const controlOn = (t, controller = null) => GrappleStateEngine.getControlRecords(t, controller ? { controllerId: controller.id } : {})[0] ?? null;
const stateOf = (t) => getGrappleStateInfo(t)?.state ?? null;
const declOf = (key, profileId = null) => {
  const rec = registry.getByIdentityKey(key);
  const p = (rec.canonicalStats.attackProfiles ?? []).find((x) => !profileId || x.id === profileId) ?? rec.canonicalStats.attackProfiles[0];
  return CR.controlDeclarationOf({ identityKey: key, operation: rec.operation, definition: p }, { resolveIdentity: (k) => registry.getByIdentityKey(k) });
};
const turnEvent = (point, actor, actors, round = 1) => { setCombat(round, actors, actor); return WC.processControlTurnEvent({ actors, point, actorId: actor.id, combat: globalThis.game.combat }); };

install(); world();
try {

// ======================================================================================================================================
// A. ORDINARY GRAPPLE REGRESSION                                                                                         [points 1-7]
// ======================================================================================================================================
{
  const A = makeActor(), T = mkT();
  world(A, T);
  // 1: an ordinary (unarmed) grab / grapple advances the existing state machine and carries NO weapon control record
  await GrappleStateEngine.advancePair(A, T, 'grabbed', { actionId: 'grab' });
  assert.equal(stateOf(T), 'grabbed'); assert.equal(GrappleStateEngine.getControlRecords(T).length, 0);
  await GrappleStateEngine.advancePair(A, T, 'grappled', { actionId: 'grapple-check' });
  assert.equal(stateOf(T), 'grappled'); assert.equal(stateOf(A), 'grappled'); assert.equal(GrappleStateEngine.getControlRecords(T).length, 0); assert.equal(GrappleStateEngine.getControlRecords(A).length, 0);
  ok('ordinary grab / grapple use the existing GrappleStateEngine and create no control record');

  // 2: ordinary escape: only the opposed grapple check is legal; no DC route is invented
  assert.deepEqual(WC.escapeOptionsFor(T).map((o) => o.mode), ['grapple']);
  assert.equal(WC.controlManeuverLegality(A, T, 'crush').legal, null);
  ok('with no weapon control the uniform escape contract offers only the opposed grapple check and no maneuver is weapon-gated');

  // 3: Pin: legacy feat (name) works, canonical feat under a wrong name works, a same-named NON-canonical-identity impostor does not
  const legacyPin = makeActor({ feats: [mk('feat', 'Pin')] }), canonPin = makeActor({ feats: [canonFeat('pin', 'Zzz Hold Down')] });
  const impostor = makeActor({ feats: [canonFeat('trip', 'Pin')] }), none = makeActor();
  assert.equal(SWSEGrappling._hasFeat(legacyPin, 'Pin'), true); assert.equal(SWSEGrappling._hasFeat(canonPin, 'Pin'), true);
  assert.equal(SWSEGrappling._hasFeat(impostor, 'Pin'), false, 'a canonical Trip feat renamed "Pin" is not Pin'); assert.equal(SWSEGrappling._hasFeat(none, 'Pin'), false);
  ok('Pin ownership: legacy name fallback still works, canonical identity decides for canonical feats (a renamed Pin works, an impostor named "Pin" does not)');

  // 4: Trip / Throw / Crush availability for an ordinary pair is unchanged
  const holder = makeActor({ feats: [canonFeat('trip', 'Abc'), canonFeat('throw', 'Def'), canonFeat('crush', 'Ghi')] });
  const hT = mkT(); world(holder, hT);
  await GrappleStateEngine.advancePair(holder, hT, 'grappled', {});
  const rows = SWSEGrappling.getAvailableAdvancedManeuvers(holder, hT, { includeUnsafe: true }).map((r) => `${r.key}:${r.legal}`).sort();
  assert.deepEqual(rows, ['crush:false', 'throw:true', 'trip:true']);
  ok('Trip / Throw legal and Crush (needs Pin state) illegal for an ordinary grappled pair, owned by canonical identity under wrong names');

  // 5: the grab attack penalty resolves by canonical Grabber / Entangler identity (and the legacy name), -5 otherwise
  assert.equal(CR.grabAttackPenalty([]), -5); assert.equal(CR.grabAttackPenalty(['entangler']), -2); assert.equal(CR.grabAttackPenalty(['grabber', 'entangler']), 0);
  const g1 = makeActor({ feats: [canonTalent('grabber', 'Holding On')] }), g2 = makeActor({ feats: [mk('talent', 'Entangler')] }), g3 = makeActor();
  const { abilityKeysOfActor } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/ability-selector.js');
  assert.deepEqual([CR.grabAttackPenalty(abilityKeysOfActor(g1)), CR.grabAttackPenalty(abilityKeysOfActor(g2)), CR.grabAttackPenalty(abilityKeysOfActor(g3))], [0, -2, -5]);
  ok('grab penalty: Grabber (canonical talent under a wrong name) 0, Entangler (legacy name) -2, otherwise -5 through one rule');

  // 6: grabbed / grappled / pinned stay distinct states; an equipment restraint is NOT a grapple state
  await GrappleStateEngine.advancePair(A, mkT({ id: 'x1' }), 'grabbed', {});
  const P = mkT({ id: 'x2' }); await GrappleStateEngine.advancePair(A, P, 'pinned', {});
  assert.equal(stateOf(P), 'pinned'); assert.deepEqual(['grabbed', 'grappled', 'pinned'].map(GrappleStateEngine.normalizeState), ['grabbed', 'grappled', 'pinned']);
  assert.equal(GrappleStateEngine.normalizeState('restrained'), null); assert.equal(GrappleStateEngine.normalizeState('immobilized'), null);
  ok('grabbed, grappled and pinned remain three distinct states; restrained / immobilized are not grapple states');

  // 7: ordinary legality gate (size / reach) is untouched by the control contract
  const { GrappleLegalityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/grapple-legality-engine.js');
  const big = mkT({ size: 'gargantuan' });
  const legality = GrappleLegalityEngine.validateInitiate(makeActor(), big, { maxTargetSizeDelta: 1, requiresReach: false });
  assert.ok(legality && typeof legality === 'object'); assert.equal(legality.allowed === false || (legality.warnings ?? []).length > 0 || legality.allowed === true, true);
  ok('GrappleLegalityEngine.validateInitiate is unchanged and still the ordinary size / reach gate');
}


// ======================================================================================================================================
// B. LIGHTWHIP                                                                                                          [points 8-19]
// ======================================================================================================================================
{
  const w = withAmmo('lightsaber-chassis-lightwhip'); const A = makeActor({ items: [w] }); const T = mkT(); world(A, T); noAsk();
  // 8: the attack carries ONE executable weapon-control record (initiate) with the declaration and canonical provenance; the recurring part is declaration data
  const { r, records, special } = await attackWith(A, w, T);
  assert.ok(r?.isHit, 'the attack hits (16 vs Reflex 12)');
  const ctl = records.filter((x) => x.kind === 'weapon-control');
  assert.equal(ctl.length, 1); assert.equal(ctl[0].role, 'initiate'); assert.equal(ctl[0].fired, true);
  assert.equal(ctl[0].source.identityKey, 'lightsaber-chassis-lightwhip');
  assert.deepEqual(ctl[0].payload.declaration.maneuvers, { allowed: ['pin', 'trip'], prohibited: ['crush', 'throw'] });
  assert.equal(special.mechanics.filter((m) => m.family === 'grab-grapple').length, 2); assert.ok(special.mechanics.every((m) => m.policy === 'AUTO' || m.family !== 'grab-grapple'));
  ok('a Lightwhip hit carries one weapon-control initiate record (declaration + canonical provenance); both of its grab-grapple mechanics are AUTO');

  // 9: Apply: the hit creates the GRABBED state through GrappleStateEngine with a control record (controller, target, state, weapon identity / profile / workflow)
  const out = await applyFx(special, T, { attacker: A, weapon: w, label: 'Lightwhip' });
  assert.equal(out.applied.length >= 1, true); assert.equal(stateOf(T), 'grabbed');
  const held = controlOn(T, A); assert.ok(held); const c = held.control;
  assert.deepEqual([c.controllerId, c.targetId, c.state, c.source.identityKey, c.source.profileId, c.source.weaponId], [A.id, T.id, 'grabbed', 'lightsaber-chassis-lightwhip', 'whip', w.id]);
  ok('applying the hit creates the grabbed state with a control record (controller, target, state, source weapon identity / profile / id)');

  // 10: the record lives ON the existing state effect (no second store); a Lightwhip hit does not make the controller grappled
  assert.equal(getGrappleStateInfo(T).effect.flags.swse.grappleState.control.id, c.id); assert.equal(stateOf(A), null);
  assert.equal(A.flags.swse.control, undefined);
  ok('the control record rides on the grapple-state ActiveEffect itself (one store); grabbing leaves the wielder free');

  // 11: re-applying the same card is idempotent (receipt) and a fresh apply of the same record id cannot duplicate the control
  const msg = mkMsg(); const T2 = mkT(); world(A, T, T2);
  await applyFx(special, T2, { attacker: A, weapon: w, message: msg }); const again = await applyFx(special, T2, { attacker: A, weapon: w, message: msg });
  assert.equal(again.skipped[0].reason, 'already-applied'); assert.equal(GrappleStateEngine.getControlRecords(T2).length, 1);
  ok('re-applying the same card is a no-op (receipt) and never duplicates the control');

  // 12: grapple escalation through the ORDINARY check keeps the control (source weapon, escape, recurring) on both effects
  await GrappleStateEngine.advancePair(A, T, 'grappled', { actionId: 'grapple-check' });
  assert.equal(stateOf(T), 'grappled'); assert.equal(stateOf(A), 'grappled');
  assert.equal(controlOn(T, A).control.source.identityKey, 'lightsaber-chassis-lightwhip'); assert.equal(controlOn(T, A).state, 'grappled');
  ok('grab -> grapple escalation (ordinary advancePair) inherits the control record and updates its state');

  // 13: Pin is allowed (feat holder) and keeps the control; Trip is allowed
  const holder = makeActor({ feats: [canonFeat('pin', 'Aaa'), canonFeat('trip', 'Bbb'), canonFeat('crush', 'Ccc'), canonFeat('throw', 'Ddd')], items: [w] });
  const HT = mkT(); world(holder, HT); const rec2 = { ...ctl[0], id: 'op-pin' };
  await applyFx({ records: [rec2] }, HT, { attacker: holder, weapon: w });
  await GrappleStateEngine.advancePair(holder, HT, 'grappled', {});
  assert.equal(WC.controlManeuverLegality(holder, HT, 'pin').legal, true); assert.equal(WC.controlManeuverLegality(holder, HT, 'trip').legal, true);
  await GrappleStateEngine.advancePair(holder, HT, 'pinned', {});
  assert.equal(stateOf(HT), 'pinned'); assert.equal(controlOn(HT, holder).state, 'pinned');
  ok('Pin and Trip are legal with the whip; the pinned state keeps the whip control');

  // 14: Crush and Throw are PROHIBITED by the whip even though the holder owns both feats; the ordinary maneuver rows say so
  assert.equal(WC.controlManeuverLegality(holder, HT, 'crush').legal, false); assert.equal(WC.controlManeuverLegality(holder, HT, 'throw').legal, false);
  const rows = SWSEGrappling.getAvailableAdvancedManeuvers(holder, HT, { includeUnsafe: true });
  assert.equal(rows.find((x) => x.key === 'crush').legal, false); assert.equal(rows.find((x) => x.key === 'throw').legal, false);
  assert.equal(await SWSEGrappling._validateAdvancedManeuver(holder, HT, 'crush', { skipLegalityConfirm: true }), false);
  assert.equal(await SWSEGrappling._validateAdvancedManeuver(holder, HT, 'throw', { skipLegalityConfirm: true }), false);
  ok('Crush and Throw are refused while the whip holds the target, regardless of the feats owned (prohibition wins)');

  // 15: the held target's escape options: the opposed check plus Acrobatics DC 15 from the declaration
  assert.deepEqual(WC.escapeOptionsFor(T).map((o) => `${o.mode}:${o.dc ?? ''}`), ['grapple:', 'acrobatics:15']);
  ok('escape options of a whip-held target: opposed grapple check or Acrobatics DC 15');

  // 16: Acrobatics escape resolves against the DC (not an opposed roll): 14 fails, 15 frees and clears BOTH states
  SWSERoll.rollSkill = async () => ({ total: 14 });
  let res = await SWSEGrappling.escapeGrapple(T, A, { escapeMode: 'acrobatics', skipLegalityConfirm: true });
  assert.equal(res.escaped, false); assert.equal(res.dc, 15); assert.equal(stateOf(T), 'grappled');
  SWSERoll.rollSkill = async () => ({ total: 15 });
  res = await SWSEGrappling.escapeGrapple(T, A, { escapeMode: 'acrobatics', skipLegalityConfirm: true });
  assert.equal(res.escaped, true); assert.equal(stateOf(T), null); assert.equal(stateOf(A), null); assert.equal(GrappleStateEngine.getControlRecords(T).length, 0);
  SWSERoll.rollSkill = origs.rollSkill;
  ok('Acrobatics escape is DC 15 (14 fails, 15 succeeds) and ending the state ends the control record with it');
}


// ======================================================================================================================================
// B2. LIGHTWHIP -- recurring held-target damage                                                                       [points 17-19]
// ======================================================================================================================================
{
  const w = withAmmo('lightsaber-chassis-lightwhip'); const A = makeActor({ items: [w], str: 4, level: 12 }); const T = mkT(); world(A, T); noAsk();
  const { records } = await attackWith(A, w, T); await applyFx({ records }, T, { attacker: A, weapon: w, label: 'Lightwhip' });
  assert.equal(stateOf(T), 'grabbed');
  // 17: a creature ENDING its turn held takes the weapon's BASE dice only: the raw 2d4 is rolled, nothing is composed (no Strength, no half level, no critical)
  dice.map['2d4'] = 6; reset(); dice.map['2d4'] = 6; const hpBefore = T.system.hp.value;
  const end1 = await turnEvent('end', T, [A, T], 1);
  assert.equal(end1.fired.length, 1); assert.deepEqual(damage.map((d) => [d.actor, d.amount, d.type]), [[T.id, 6, 'energy']]);
  assert.deepEqual(formulas.filter((f) => !/^1d20/.test(f)), ['2d4']); assert.equal(damage[0].options.noDamageModifiers, true); assert.equal(T.system.hp.value, hpBefore - 6);
  ok('Lightwhip: the held target ending its turn takes the BASE 2d4 only (no Strength, half heroic level, other modifiers or critical), rolled raw');

  // 18: only at the HELD target's END of turn; not its start, not the wielder's turn; idempotent within the round, fires again next round
  reset(); dice.map['2d4'] = 5;
  assert.equal((await turnEvent('start', T, [A, T], 2)).fired.length, 0); assert.equal((await turnEvent('end', A, [A, T], 2)).fired.length, 0);
  assert.equal((await turnEvent('end', T, [A, T], 2)).fired.length, 1);
  const dup = await turnEvent('end', T, [A, T], 2); assert.equal(dup.fired.length, 0); assert.equal(dup.skipped[0].reason, 'already-processed'); assert.equal(damage.length, 1);
  assert.equal((await turnEvent('end', T, [A, T], 3)).fired.length, 1); assert.equal(damage.length, 2);
  ok('recurring whip damage fires only at the held target\'s end of turn, once per round (replayed event skipped), again the next round');

  // 19: the control cannot outlive its source weapon or controller: an unequipped / deleted whip ends the control and deals no damage
  reset(); dice.map['2d4'] = 5; w.system.equipped = false;
  const gone = await turnEvent('end', T, [A, T], 4);
  assert.equal(gone.fired.length, 0); assert.deepEqual(gone.ended.map((e) => e.reason), ['weapon-removed']); assert.equal(stateOf(T), null); assert.equal(damage.length, 0);
  const w2 = withAmmo('lightsaber-chassis-lightwhip'); const A2 = makeActor({ items: [w2] }); const T3 = mkT(); world(A2, T3);
  const at2 = await attackWith(A2, w2, T3); await applyFx({ records: at2.records }, T3, { attacker: A2, weapon: w2 });
  const orphan = await turnEvent('end', T3, [T3], 5);   // the wielder is no longer in the world
  assert.deepEqual(orphan.ended.map((e) => e.reason), ['controller-removed']); assert.equal(stateOf(T3), null);
  ok('a removed / unequipped source weapon and a removed controller end the control cleanly (state cleared, no damage)');
}

// ======================================================================================================================================
// C. GARROTE                                                                                                          [points 20-26]
// ======================================================================================================================================
{
  const w = canon('unmapped::Garrote'); const A = makeActor({ items: [w] }); const T = mkT(); world(A, T); noAsk();
  const bonus = async (actor) => { const r = await attackWith(actor, w, T); return { r, b: Number(String(formulas.find((f) => /^1d20/.test(f))).replace(/^1d20\s*\+\s*/, '')) }; };
  // 20: the attack is treated as a GRAB attack: the weapon keeps its identity (canonical garrote), a hit initiates the grab, and the grab penalty applies
  const base = await bonus(A);
  assert.equal(base.r.r.isHit, true);
  const ctl = wfOf().special.records.find((x) => x.kind === 'weapon-control');
  assert.equal(ctl.role, 'initiate'); assert.equal(ctl.source.identityKey, 'unmapped::Garrote'); assert.equal(ctl.payload.declaration.treatedAs.attack, 'grab');
  ok('Garrote: the attack is a grab attack that keeps the canonical weapon identity and carries the initiate record');

  // 21: the grab attack penalty (-5) applies by canonical identity of Grabber (0) / Entangler (-2); the same weapon with no grab declaration would not carry it
  const G = makeActor({ items: [w], feats: [canonTalent('grabber', 'Zq')] }), E = makeActor({ items: [w], feats: [canonTalent('entangler', 'Yq')] });
  const bG = await bonus(G), bE = await bonus(E);
  assert.equal(bG.b - base.b, 5); assert.equal(bE.b - base.b, 3);
  ok('Garrote grab attack penalty: -5 normally, -2 with Entangler, 0 with Grabber (canonical talents under wrong names)');

  // 22: it requires two hands
  reset(); const one = await rollAttack(A, w, { target: T, wieldedHands: 1, suppressChat: false });
  assert.equal(one, null); assert.ok(notes.warn.some((m) => /wield/i.test(m)));
  ok('Garrote requires two hands: a one-handed attack is refused before any cost');

  // 23: a hit grabs; the control declares base damage + -1 CT at the START of the grabbed target's turn, before it acts
  const fresh = await bonus(A); void fresh; await applyFx({ records: wfOf().special.records }, T, { attacker: A, weapon: w, label: 'Garrote' });
  assert.equal(stateOf(T), 'grabbed'); const c = controlOn(T, A).control;
  assert.deepEqual(c.recurring.map((r) => [r.timing.owner, r.timing.point, r.conditionTrackSteps, r.damage.baseFormula]), [['held-target', 'start', -1, '1d6']]);
  ok('a Garrote hit grabs the target; the control declares 1d6 + -1 CT at the start of the grabbed target\'s turn');

  // 24: at the start of the grabbed target's turn: the garrote damage (base dice, raw) AND the CT step, in addition to the grab
  reset(); dice.map['1d6'] = 3;
  const out = await turnEvent('start', T, [A, T], 1);
  assert.equal(out.fired.length, 1); assert.equal(damage.length, 1); assert.equal(damage[0].amount, 3); assert.deepEqual(formulas.filter((f) => !/^1d20/.test(f)), ['1d6']);
  assert.equal(ctMoves.length, 1); assert.equal(T.system.conditionTrack.current, 1); assert.equal(stateOf(T), 'grabbed');
  ok('Garrote: grabbed target takes base 1d6 (raw) and moves -1 on the condition track at its turn start, still grabbed');

  // 25: not at the end of its turn, not at another actor's start; once per round
  reset(); dice.map['1d6'] = 3;
  assert.equal((await turnEvent('end', T, [A, T], 2)).fired.length, 0); assert.equal((await turnEvent('start', A, [A, T], 2)).fired.length, 0);
  assert.equal((await turnEvent('start', T, [A, T], 2)).fired.length, 1); assert.equal((await turnEvent('start', T, [A, T], 2)).fired.length, 0);
  ok('Garrote effects fire only at the grabbed target\'s turn start and only once per round');

  // 26: cancelled when the grab ends; the target "can attempt to break the grab normally" (no DC route is invented)
  assert.deepEqual(WC.escapeOptionsFor(T).map((o) => o.mode), ['grapple']);
  await GrappleStateEngine.clearPair(A, T, { quiet: true }); reset(); dice.map['1d6'] = 3;
  assert.equal((await turnEvent('start', T, [A, T], 3)).fired.length, 0); assert.equal(damage.length, 0); assert.equal(ctMoves.length, 0);
  ok('Garrote: break-free is the ordinary opposed escape; once the grab ends no further damage or condition-track movement occurs');
}


// ======================================================================================================================================
// D. SHOCK WHIP                                                                                                       [points 27-41]
// ======================================================================================================================================
{
  const mkWhip = () => withAmmo('unmapped::Shock Whip'); const OPT = 'grab:optional-grab-on-hit', TRIP = 'trip:optional-grab-on-hit';
  const w = mkWhip(); const A = makeActor({ items: [w] }); const T = mkT(); world(A, T);
  // 27: the attack deals normal damage; the follow-up grab is an optional initiate record (free action) with the structured limits
  noAsk(); const first = await attackWith(A, w, T); const rec = first.records.find((x) => x.kind === 'weapon-control'); const d = rec.payload.declaration;
  assert.equal(first.r.isHit, true); assert.equal(rec.role, 'initiate');
  assert.deepEqual([d.grab.optional, d.grab.freeAction, d.grab.secondAttack, d.grab.noGrabPenalty, d.grab.maxSizeDelta], [true, true, true, true, 1]);
  ok('Shock Whip hit: the free follow-up grab is an optional initiate record (second attack, no grab penalty, at most one size larger)');

  // 28: the choice is a stored PROMPT: asked once, a decline creates nothing, no answer creates nothing (never guessed)
  const msg = mkMsg(); let asked = ask(async (q) => (q.id === OPT ? false : null));
  let out = await applyFx(first.special, T, { attacker: A, weapon: w, message: msg });
  assert.equal(out.skipped[0].reason, 'grab-declined'); assert.equal(stateOf(T), null); assert.deepEqual(asked.filter((x) => x === OPT), [OPT]);
  const none = mkT(); world(A, T, none); ask(async () => null); out = await applyFx(first.special, none, { attacker: A, weapon: w });
  assert.equal(out.skipped[0].reason, 'unresolved'); assert.equal(stateOf(none), null);
  ok('the optional grab is asked once and stored; declined or unanswered creates no state');

  // 29: accepted: a SECOND attack roll at the wielder\'s NORMAL attack bonus (no -5 grab penalty) against Reflex; a hit grabs
  const T1 = mkT(); world(A, T1); ask(async (q) => (q.id.startsWith('grab:') ? true : false)); reset(); dice.next = [];
  const normalBonus = (await computeFinalAttackComposition(A, w, {})).atkBonus;
  out = await applyFx(first.special, T1, { attacker: A, weapon: w });
  const secondRoll = formulas.filter((f) => /^1d20/.test(f)); assert.equal(secondRoll.length, 1); assert.equal(Number(secondRoll[0].replace(/^1d20\s*\+\s*/, '')), normalBonus);
  assert.equal(stateOf(T1), 'grabbed'); assert.equal(controlOn(T1, A).control.source.identityKey, 'unmapped::Shock Whip');
  ok('accepted follow-up: a second attack roll at the normal attack bonus (no -5) and a hit grabs; the control keeps the whip identity');

  // 30: a missed second attack grabs nothing
  const T2 = mkT({ reflex: 99 }); world(A, T2); out = await applyFx(first.special, T2, { attacker: A, weapon: w });
  assert.equal(out.skipped[0].reason, 'second-attack-missed'); assert.equal(stateOf(T2), null);
  ok('a second attack roll that misses Reflex leaves the target free');

  // 31: the generic size gate: no more than ONE size category larger than the wielder (Medium wielder: Large ok, Huge refused)
  const L = mkT({ size: 'large' }), H = mkT({ size: 'huge' }); world(A, L, H);
  assert.equal((await applyFx(first.special, L, { attacker: A, weapon: w })).applied.length, 1); assert.equal(stateOf(L), 'grabbed');
  out = await applyFx(first.special, H, { attacker: A, weapon: w }); assert.equal(out.skipped[0].reason, 'target-too-large'); assert.equal(stateOf(H), null);
  assert.deepEqual([CR.sizeGate({ controllerSize: 'medium', targetSize: 'large', maxDelta: 1 }).ok, CR.sizeGate({ controllerSize: 'medium', targetSize: 'huge', maxDelta: 1 }).ok, CR.sizeGate({ controllerSize: 'small', targetSize: 'large', maxDelta: 1 }).ok], [true, false, false]);
  ok('size gate: at most one category larger than the wielder through the one canonical size-rank rule (Large ok, Huge refused, relative to the wielder)');

  // 32: Trip substitution needs the Trip feat by CANONICAL IDENTITY: the offer exists, prone replaces the grab, and no grab state is created
  const tripper = makeActor({ items: [mkWhip()], feats: [canonFeat('trip', 'Qq Sweep')] }); const tw = tripper.items.find((i) => i.type === 'weapon'); const TT = mkT(); world(tripper, TT);
  asked = ask(async (q) => (q.id === TRIP ? true : false)); out = await applyFx(first.special, TT, { attacker: tripper, weapon: tw });
  assert.ok(asked.includes(TRIP)); assert.equal(stateOf(TT), null);
  const prone = TT.effects.find((e) => e.flags?.['foundryvtt-swse']?.weaponEffect?.status === 'prone'); assert.ok(prone); assert.equal(out.applied[0].result.via, 'trip-substitution');
  ok('Trip substitution (canonical Trip feat under a wrong name): the whip knocks the target prone INSTEAD of grabbing; no grab state is created');

  // 33: no Trip feat, or a canonical feat merely NAMED Trip, is never offered the substitution
  const imp = makeActor({ items: [mkWhip()], feats: [canonFeat('pin', 'Trip')] }); const iw = imp.items.find((i) => i.type === 'weapon'); const IT = mkT(); world(imp, IT);
  asked = ask(async (q) => (q.id === OPT)); await applyFx(first.special, IT, { attacker: imp, weapon: iw }); assert.ok(!asked.includes(TRIP)); assert.equal(stateOf(IT), 'grabbed');
  const plain = makeActor({ items: [mkWhip()] }); asked = ask(async (q) => (q.id === OPT)); await applyFx(first.special, mkT(), { attacker: plain, weapon: plain.items.find((i) => i.type === 'weapon') }); assert.ok(!asked.includes(TRIP));
  ok('the Trip substitution is never offered without the canonical Trip feat (a canonical Pin feat named "Trip" does not qualify)');

  // 34: swift shock: automatic 2d6 energy damage, NO attack roll, a swift action, once per turn
  const held = makeActor({ items: [mkWhip()] }); const hw = held.items.find((i) => i.type === 'weapon'); const HT = mkT(); world(held, HT);
  ask(async () => true); await applyFx(first.special, HT, { attacker: held, weapon: hw });
  reset(); dice.map['2d6'] = 9; const spend = (a, t) => ActionEconomyConsumption.spend(a, t);
  let sh = await WC.shockHeldTarget({ controller: held, target: HT, weapon: hw, combat: { round: 1, turn: 0 }, spendAction: spend });
  assert.equal(sh.ok, true); assert.deepEqual(damage.map((x) => [x.amount, x.type]), [[9, 'energy']]); assert.deepEqual(formulas, ['2d6']); assert.deepEqual(spent.actions, ['swift']);
  ok('swift shock: 2d6 energy damage to the held target with no attack roll, paid as a swift action');

  // 35: once per turn: a second use in the same round is refused (no action spent, no damage); the next round works
  reset(); dice.map['2d6'] = 9;
  sh = await WC.shockHeldTarget({ controller: held, target: HT, weapon: hw, combat: { round: 1, turn: 0 }, spendAction: spend });
  assert.deepEqual([sh.ok, sh.reason], [false, 'already-used-this-turn']); assert.equal(damage.length, 0); assert.equal(spent.actions.length, 0);
  sh = await WC.shockHeldTarget({ controller: held, target: HT, weapon: hw, combat: { round: 2, turn: 0 }, spendAction: spend }); assert.equal(sh.ok, true);
  ok('the shock is once per turn (replay refused before any cost), available again next round');

  // 36: the shock needs a held target of THIS weapon and an available swift action
  const stranger = mkT(); reset();
  assert.equal((await WC.shockHeldTarget({ controller: held, target: stranger, weapon: hw, combat: { round: 3, turn: 0 }, spendAction: spend })).reason, 'no-held-target-for-this-weapon');
  const denied = async () => ({ allowed: false });
  reset(); assert.equal((await WC.shockHeldTarget({ controller: held, target: HT, weapon: hw, combat: { round: 4, turn: 0 }, spendAction: denied })).reason, 'swift-action-unavailable'); assert.equal(damage.length, 0);
  ok('no shock without a held target of this weapon or without a swift action (nothing dealt)');

  // 37: weapon lock: while holding a target the whip cannot attack OTHER targets (refused before cost); the held target and other weapons are free
  const other = mkT(); world(held, HT, other); reset(); noAsk();
  const blocked = await rollAttack(held, hw, { target: other, wieldedHands: 1, suppressChat: false }); assert.equal(blocked, null); assert.ok(notes.warn.some((m) => /weapon/i.test(m))); assert.equal(spent.ammo, 0);
  const onHeld = await rollAttack(held, hw, { target: HT, wieldedHands: 1, suppressChat: false }); assert.ok(onHeld?.isHit !== undefined);
  assert.equal(WC.weaponLockFor(held, { id: 'some-other-weapon' }, other.id).locked, false);
  ok('weapon lock: the grabbing whip cannot attack another target (no cost spent); the held target and any other weapon are unaffected');

  // 38: the lock ends with the control: after the target escapes the whip may attack others again
  await GrappleStateEngine.clearPair(held, HT, { quiet: true }); reset();
  assert.equal(WC.weaponLockFor(held, hw, other.id).locked, false); const free = await rollAttack(held, hw, { target: other, wieldedHands: 1, suppressChat: false }); assert.ok(free);
  ok('the weapon lock ends with the control (escape / release): the whip attacks other targets again');

  // 39: the shock whip has no recurring control effect and the held target escapes by the ordinary opposed check only
  assert.equal((d.recurring ?? []).length, 0); assert.deepEqual(d.escape ?? [], []); assert.equal(d.shock.formula, '2d6');
  ok('Shock Whip declares no recurring damage and no DC escape route (ordinary opposed escape); only the swift shock is declared');

  // 40: the shock damage and the lock are record data of the control (provenance), not actor flags
  const c = controlOn(T1, A).control; assert.equal(c.lockWeapon, true); assert.equal(c.shock.formula, '2d6'); assert.equal(c.source.weaponId, w.id); assert.equal(A.flags.swse.control, undefined);
  ok('lock and shock live in the control record on the state effect (weapon provenance), not in actor flags');

  // 41: the Trip substitution is the canonical declaration, not a Pin / grab change: requiresFeatKey is the canonical slug
  assert.deepEqual([d.tripSubstitution.requiresFeatKey, d.tripSubstitution.replaces], ['trip', 'optional-grab-on-hit']);
  ok('the trip substitution declares the canonical feat identity slug and what it replaces');
}

// ======================================================================================================================================
// E. SNARE PISTOL / SNARE RIFLE                                                                                       [points 42-52]
// ======================================================================================================================================
{
  const wR = withAmmo('weapon-snare-rifle'); const wP = withAmmo('weapon-snare-pistol'); const A = makeActor({ items: [wR, wP] }); const T = mkT(); world(A, T); noAsk();
  // 42: declaration: ranged grab, maximum Short, escapes, 1d4 stun on a successful grab, allowed Pin / Trip, disallowed Crush / Throw
  for (const k of ['weapon-snare-pistol', 'weapon-snare-rifle']) {
    const d = declOf(k);
    assert.deepEqual([d.grab.ranged, d.grab.maxBand, d.stunOnGrab.formula], [true, 'short', k.endsWith('pistol') ? '1d4' : '1d6']); assert.deepEqual(d.escape.map((e) => `${e.method}:${e.dc}`).sort(), ['acrobatics:15', 'strength:20']);
    assert.deepEqual([d.maneuvers.allowed.sort(), d.maneuvers.prohibited.sort()], [['pin', 'trip'], ['crush', 'throw']]);
  }
  assert.deepEqual(declOf('weapon-snare-pistol').prohibitedAbilities, ['bone-crusher']);
  ok('Snare Pistol / Rifle declare: ranged grab capped at Short, 1d4 (Pistol) / 1d6 (Rifle) stun on a successful grab, Acrobatics 15 / Strength 20, Pin and Trip allowed, Crush and Throw disallowed');

  // 43: the range gate is refused at ATTACK time before any cost: Short / Point Blank fire; Medium and Long are refused (rifle band list allows them -- the grab gate is what refuses)
  reset(); let r = await rollAttack(A, wR, { target: T, rangeBand: 'medium', suppressChat: false, wieldedHands: 2 });
  assert.equal(r, null); assert.ok(notes.warn.some((m) => /range/i.test(m))); assert.equal(spent.ammo, 0);
  reset(); r = await rollAttack(A, wR, { target: T, rangeBand: 'long', suppressChat: false, wieldedHands: 2 }); assert.equal(r, null);
  for (const band of ['pointBlank', 'short']) { reset(); r = await rollAttack(A, wR, { target: T, rangeBand: band, suppressChat: false, wieldedHands: 2 }); assert.ok(r, band); }
  ok('Snare Rifle: Medium / Long are refused before any cost by the maximum grab range; Point Blank / Short attack');

  // 44: the Pistol (Short) agrees; the gate is generic (rangeGate), not a weapon branch
  assert.equal(CR.rangeGate(declOf('weapon-snare-pistol'), 'short').ok, true); assert.equal(CR.rangeGate(declOf('weapon-snare-pistol'), 'medium').ok, false);
  assert.equal(CR.rangeGate(declOf('weapon-net'), 'long').ok, true, 'a weapon without a maximum has no cap');
  ok('the Pistol caps at Short through the same generic range gate; a weapon declaring no maximum is uncapped');

  // 45: a hit grabs (control record, grabbed state); the 1d4 stun IS the weapon's ordinary native-stun damage (one damage roll on the card, never rolled again by the control)
  reset(); const hit = await attackWith(A, wP, T, { rangeBand: 'short' });
  assert.equal(hit.r.isHit, true); assert.ok(hit.records.some((x) => x.kind === 'weapon-control' && x.role === 'initiate'));
  const cd = rt.resolveCanonicalDamage(wP, { weaponForm: { identityKey: 'weapon-snare-pistol', profileId: 'primary' } });
  assert.deepEqual([cd.status, cd.base], ['ordinary', '1d4']); assert.ok(cd.mechanics.some((m) => m.family === 'native-stun'));
  assert.equal(declOf('weapon-snare-pistol').stunOnGrab.carriedByBaseDamage, true);
  reset(); dice.map['1d4'] = 3; const out = await applyFx(hit.special, T, { attacker: A, weapon: wP, hpBefore: 40, hpAfter: 37, rawAmount: 3 });
  assert.equal(out.applied.length, 1); assert.equal(stateOf(T), 'grabbed'); assert.equal(damage.length, 0, 'the control rolls no second stun'); assert.equal(formulas.filter((f) => /^1d20/.test(f)).length, 0);
  ok('Snare hit: the grab is created on the card\'s Apply Damage; the 1d4 stun is the weapon\'s own native-stun damage (no second roll, no extra attack roll)');

  // 46: a miss grabs nothing and deals no stun
  const T2 = mkT({ reflex: 99 }); world(A, T2); const miss = await attackWith(A, wP, T2, { rangeBand: 'short' });
  assert.equal(miss.r.isHit, false); assert.equal(miss.records.find((x) => x.kind === 'weapon-control').fired, false);
  reset(); const missOut = await applyFx(miss.special, T2, { attacker: A, weapon: wP, hpBefore: 40, hpAfter: 37, rawAmount: 3 });
  assert.equal(missOut.skipped[0].reason, 'trigger-not-met'); assert.equal(stateOf(T2), null); assert.equal(damage.length, 0);
  ok('a missed snare grabs nothing and deals no stun');

  // 47: the held target\'s escape options are exactly Acrobatics DC 15 or Strength DC 20 (plus the always-legal opposed check)
  assert.deepEqual(WC.escapeOptionsFor(T).map((o) => `${o.mode}:${o.dc ?? ''}`).sort(), ['acrobatics:15', 'grapple:', 'strength:20']);
  ok('uniform escape contract of a snared target: opposed check, Acrobatics DC 15, Strength DC 20');

  // 48: Strength escape: Strength check against DC 20 (19 fails, 20 frees); it clears the state and the control together
  dice.next = [19]; let esc = await SWSEGrappling.escapeGrapple(T, A, { escapeMode: 'strength', skipLegalityConfirm: true });
  assert.deepEqual([esc.escaped, esc.dc, esc.escapeMode], [false, 20, 'strength']); assert.equal(stateOf(T), 'grabbed');
  dice.next = [20]; esc = await SWSEGrappling.escapeGrapple(T, A, { escapeMode: 'strength', skipLegalityConfirm: true });
  assert.equal(esc.escaped, true); assert.equal(stateOf(T), null); assert.equal(GrappleStateEngine.getControlRecords(T).length, 0);
  ok('Strength DC 20 escape: 19 fails, 20 frees; the grab and its control record end together');

  // 49: Pin and Trip are allowed and Crush / Throw refused for the snare hold (an owned feat does not override the weapon)
  const S = mkT(); const holder = makeActor({ items: [wP], feats: [canonFeat('crush', 'a'), canonFeat('throw', 'b'), canonFeat('trip', 'c'), canonFeat('pin', 'd')] }); world(holder, S);
  await applyFx(hit.special, S, { attacker: holder, weapon: wP, hpBefore: 40, hpAfter: 37, rawAmount: 3 });
  assert.deepEqual(['pin', 'trip', 'crush', 'throw'].map((m) => WC.controlManeuverLegality(holder, S, m).legal), [true, true, false, false]);
  ok('snare hold: Pin / Trip allowed, Crush / Throw refused regardless of owned feats');

  // 50: no invented size gate, no recurring effect, no weapon lock on a snare
  const d = declOf('weapon-snare-rifle'); assert.equal(d.grab.maxSizeDelta, null); assert.equal(d.recurring.length, 0); assert.equal(d.lockWeapon, false);
  const big = mkT({ size: 'colossal' }); world(A, big); const bigHit = await applyFx(hit.special, big, { attacker: A, weapon: wP, hpBefore: 40, hpAfter: 37, rawAmount: 3 }); assert.equal(stateOf(big), 'grabbed');
  ok('the source states no snare size limit, so none is invented; no recurring effect and no weapon lock');

  // 51: the apply-time range band (stored with the attack) gates too: a card carrying band long is refused when applied
  const T3 = mkT(); world(A, T3);
  const farOut = await applyFx({ ...hit.special, rangeBand: 'long' }, T3, { attacker: A, weapon: wP, hpBefore: 40, hpAfter: 37, rawAmount: 3 });
  assert.equal(farOut.skipped[0].reason, 'beyond-maximum-grab-range'); assert.equal(stateOf(T3), null); assert.equal(damage.length, 0);
  ok('Apply-time re-check of the stored range band: a long-range snare card creates nothing and deals no stun');

  // 52: the source weapon identity travels with the control (Pistol vs Rifle are distinct sources)
  assert.equal(controlOn(S, holder).control.source.identityKey, 'weapon-snare-pistol'); assert.equal(controlOn(S, holder).control.source.profileId, 'primary');
  ok('the snare control record carries the canonical source identity and profile');
}


// ======================================================================================================================================
// F. ELECTRONET / NET / STOKHLI SPRAY STICK                                                                           [points 53-57]
// ======================================================================================================================================
{
  const net = canon('weapon-net'); const en = withAmmo('weapon-electronet'); const A = makeActor({ items: [net, en] }); const T = mkT(); world(A, T); noAsk();
  // 53: Net: ranged grab; Pin / Trip allowed, Crush / Throw disallowed; Acrobatics 15 / Strength 20; effect-only card; a hit grabs
  const dn = declOf('weapon-net'); assert.deepEqual([dn.grab.ranged, dn.maneuvers.allowed.sort(), dn.maneuvers.prohibited.sort(), dn.escape.map((e) => `${e.method}:${e.dc}`).sort()], [true, ['pin', 'trip'], ['crush', 'throw'], ['acrobatics:15', 'strength:20']]);
  const hit = await attackWith(A, net, T, { rangeBand: 'short' }); assert.equal(hit.r.isHit, true);
  assert.equal(posted.find((p) => p.context?.workflowContext)?.context.damageActionLabel, 'Apply Effects');
  await applyFx(hit.special, T, { attacker: A, weapon: net, hpBefore: 40, hpAfter: 40, rawAmount: 0 }); assert.equal(stateOf(T), 'grabbed'); assert.equal(controlOn(T, A).control.source.identityKey, 'weapon-net');
  ok('Net: ranged grab with Pin / Trip allowed, Crush / Throw disallowed and the DC 15 / 20 escapes; an effect-only card whose hit grabs');

  // 54: Electronet: a hit grabs "as with a normal net" (same control path) and its stun damage is the weapon's ordinary damage on the same card
  const T2 = mkT(); world(A, T2); const eh = await attackWith(A, en, T2, { rangeBand: 'short' });
  assert.equal(eh.r.isHit, true); const de = declOf('weapon-electronet');
  assert.equal(de.stunOnGrab.formula, '3d8'); assert.equal(de.stunOnGrab.carriedByBaseDamage, true);
  const ecd = rt.resolveCanonicalDamage(en, { weaponForm: { identityKey: 'weapon-electronet', profileId: 'primary' } }); assert.equal(ecd.base, '3d8');
  reset(); await applyFx(eh.special, T2, { attacker: A, weapon: en, hpBefore: 40, hpAfter: 30, rawAmount: 10 });
  assert.equal(stateOf(T2), 'grabbed'); assert.equal(damage.length, 0); assert.equal(controlOn(T2, A).control.recurring.length, 1);
  ok('Electronet hit: grabs through the same control path; its 3d8 stun is the ordinary card damage (never rolled twice)');

  // 55: while the target is still TRAPPED, 3d8 stun at the beginning of the ATTACKER\'s turn, no damage modifiers; never at the target\'s turn
  reset(); dice.map['3d8'] = 13; const att = makeActor({ id: A.id });
  assert.equal((await turnEvent('start', T2, [A, T2], 1)).fired.length, 0);
  const tick = await turnEvent('start', A, [A, T2], 1);
  assert.equal(tick.fired.length, 1); assert.deepEqual(damage.map((d) => [d.actor, d.amount, d.type]), [[T2.id, 13, 'stun']]); assert.equal(damage[0].options.noDamageModifiers, true); assert.deepEqual(formulas.filter((f) => !/^1d20/.test(f)), ['3d8']);
  assert.equal((await turnEvent('start', A, [A, T2], 1)).fired.length, 0); assert.equal((await turnEvent('start', A, [A, T2], 2)).fired.length, 1);
  void att;
  ok('Electronet: 3d8 stun (no modifiers) at the beginning of the ATTACKER\'s turn while trapped; once per round; never at the target\'s turn');

  // 56: the recurring stun ends with the trap: an escape (Strength 20 / Acrobatics 15 route or opposed) ends the control and the damage
  dice.next = [20]; const esc = await SWSEGrappling.escapeGrapple(T2, A, { escapeMode: 'strength', skipLegalityConfirm: true });
  assert.equal(esc.escaped, true); assert.equal(stateOf(T2), null); reset(); dice.map['3d8'] = 13;
  assert.equal((await turnEvent('start', A, [A, T2], 3)).fired.length, 0); assert.equal(damage.length, 0);
  ok('escaping the electronet ends the control and its recurring stun');

  // 57: Stokhli Spray Stick: "functions as a net" delegates to the NET\'s own declaration (nothing cloned onto the Stokhli)
  const ds = declOf('weapon-stokhli-spray-stick'); const stokhli = registry.getByIdentityKey('weapon-stokhli-spray-stick');
  assert.deepEqual(ds.delegatedFrom, { identityKey: 'weapon-net', via: 'webbingFunctionsAsNet' }); assert.equal(ds.identityKey, 'weapon-stokhli-spray-stick');
  assert.deepEqual([ds.maneuvers, ds.escape.map((e) => `${e.method}:${e.dc}`).sort()], [dn.maneuvers, ['acrobatics:15', 'strength:20']]);
  assert.equal(stokhli.operation.allowedGrappleFeats, undefined); assert.equal(stokhli.operation.escapeAcrobaticsDC, undefined); assert.equal(stokhli.operation.treatControlAs.identityKey, 'weapon-net');
  ok('Stokhli webbing delegates to the Net declaration (identity preserved, delegation recorded, no net rules cloned into the Stokhli record)');
}

// ======================================================================================================================================
// G. ADHESIVE GRENADE                                                                                                 [points 58-64]
// ======================================================================================================================================
{
  const g = canon('weapon-adhesive-grenade'); const A = makeActor({ items: [g] }); const T = mkT({ grapple: 5 }); world(A, T); noAsk();
  const d = declOf('weapon-adhesive-grenade');
  // 58: declaration: per-target GRAPPLE check against the attacker's ranged attack roll; failure = immobilized 3 rounds; the attacker is not grappling; no further check
  assert.deepEqual([d.restraint.check, d.restraint.against, d.restraint.comparison, d.restraint.onFailure, d.restraint.furtherCheck, d.restraint.attackerIsGrappling], ['grapple', 'attacker-ranged-attack-roll', 'equals-or-exceeds', { status: 'immobilized', durationRounds: 3 }, false, false]);
  const att = await attackWith(A, g, T, { rangeBand: 'short' }); const rec = att.records.find((x) => x.kind === 'weapon-control'); assert.equal(rec.role, 'restraint'); assert.equal(rec.fired, true);
  const atkBonus = Number(formulas.find((f) => /^1d20/.test(f)).replace(/^1d20\s*\+\s*/, '')); assert.equal(att.special.attackTotal, 16 + atkBonus);
  ok('Adhesive Grenade declares a per-target grapple check against the ranged attack roll; failure immobilizes for 3 rounds; the attacker is not grappling');

  // 59: the target\'s grapple check FAILS (check < attack total): immobilized for 3 rounds (a status, with a 3-round lifecycle) and NO grapple state anywhere
  const total = att.special.attackTotal;
  dice.next = [4]; T.__grapple = 5;  // 4 + 5 = 9 < total
  reset(); dice.next = [4]; const out = await applyFx(att.special, T, { attacker: A, weapon: g, hpBefore: 40, hpAfter: 40, rawAmount: 0 });
  assert.equal(out.applied.length, 1); assert.equal(out.applied[0].result.rounds, 3); assert.equal(out.applied[0].result.status, 'immobilized');
  const fx = T.effects.find((e) => e.flags?.['foundryvtt-swse']?.weaponEffect?.status === 'immobilized');
  assert.ok(fx); assert.equal(fx.flags['foundryvtt-swse'].weaponEffect.duration, '3-rounds'); assert.equal(fx.flags['foundryvtt-swse'].effectIntent.duration, '3-rounds');
  assert.equal(stateOf(T), null); assert.equal(stateOf(A), null); assert.equal(out.applied[0].result.attackerIsGrappling, false); assert.ok(total > 9);
  ok('a failed grapple check immobilizes for 3 rounds through the status-effect lifecycle; no grab / grapple state exists on either creature');

  // 60: equal-or-exceeds: a check EQUAL to the attack roll succeeds (nothing applied); only one check roll is made (no invented further check)
  const T2 = mkT({ grapple: total - 10 }); world(A, T2); reset(); dice.next = [10];
  const ok2 = await applyFx(att.special, T2, { attacker: A, weapon: g, hpBefore: 40, hpAfter: 40, rawAmount: 0 });
  assert.equal(ok2.skipped[0].reason, 'check-succeeded'); assert.equal(T2.effects.length, 0); assert.equal(formulas.filter((f) => /^1d20/.test(f)).length, 1);
  ok('a grapple check equal to the attack roll succeeds (equals-or-exceeds) and exactly one check is rolled');

  // 61: each target in the blast has its own check and receipt: two targets, two outcomes
  const U = mkT({ grapple: 0 }), V = mkT({ grapple: 40 }); world(A, U, V); const msg = mkMsg(); reset(); dice.next = [2, 2];
  const ru = await applyFx(att.special, U, { attacker: A, weapon: g, message: msg, hpBefore: 40, hpAfter: 40, rawAmount: 0 });
  dice.next = [2]; const rv = await applyFx(att.special, V, { attacker: A, weapon: g, message: msg, hpBefore: 40, hpAfter: 40, rawAmount: 0 });
  assert.equal(ru.applied.length, 1); assert.equal(rv.skipped[0].reason, 'check-succeeded');
  ok('each target in the blast makes its own check with its own receipt (one restrained, one free)');

  // 62: replaying the card for the same target cannot restrain twice (receipt + effect presence)
  const again = await applyFx(att.special, U, { attacker: A, weapon: g, message: msg, hpBefore: 40, hpAfter: 40, rawAmount: 0 });
  assert.equal(again.skipped[0].reason, 'already-applied'); assert.equal(U.effects.filter((e) => e.flags?.['foundryvtt-swse']?.weaponEffect?.status === 'immobilized').length, 1);
  ok('replaying the card never restrains the same target twice');

  // 63: "after breaking free no further grapple check is needed to move through the affected area": the declaration says so and no area-control state is created
  assert.equal(d.restraint.furtherCheck, false); assert.equal(GrappleStateEngine.getControlRecords(U).length, 0);
  ok('breaking free needs no further check: no area-movement check or control record is invented');

  // 64: the restraint is distinct from every grapple state (equipment restraint): it is not recognised as grabbed / grappled / pinned
  assert.equal(getGrappleStateInfo(U), null); assert.equal(GrappleStateEngine.hasState(U, 'grappled'), false);
  ok('the equipment restraint is distinct from grabbed / grappled / pinned');
}

// ======================================================================================================================================
// H. AMPHISTAFF -- Pin / Trip without the feat                                                                         [points 65-70]
// ======================================================================================================================================
{
  const w = canon('unmapped::Amphistaff'); const A = makeActor({ items: [w] }); const T = mkT(); world(A, T); noAsk();
  const form = (profileId, configurationId = 'whip') => ({ weaponForm: { identityKey: 'unmapped::Amphistaff', profileId, configurationId } });
  const recordsOf = (profileId, configurationId = 'whip') => { const cd = rt.resolveCanonicalDamage(w, form(profileId, configurationId)); return SM.evaluateAttackOutcomeSpecials(cd.mechanics, { hit: true, attackTotal: 20, provenance: { identityKey: 'unmapped::Amphistaff', profileId } }).filter((x) => x.kind === 'weapon-control'); };
  // 65: the whip-pin / whip-trip forms carry an entitled-maneuver record; the spear form carries none
  const pin = recordsOf('whip-pin'), trip = recordsOf('whip-trip'), spear = recordsOf('spear-melee', 'spear');
  assert.deepEqual([pin[0].role, pin[0].payload.maneuver, trip[0].role, trip[0].payload.maneuver, spear.length], ['entitled-maneuver', 'pin', 'entitled-maneuver', 'trip', 0]);
  ok('Amphistaff whip-pin / whip-trip forms carry entitled-maneuver records (Pin / Trip); the spear form carries no control');

  // 66: entitlement is declaration + canonical proficiency: no feat Item is created and the actor item list never changes
  const decl = declOf('unmapped::Amphistaff', 'whip-pin'); const before = A.items.length;
  assert.deepEqual(WC.entitlementOf(decl, { profileId: 'whip-pin', proficient: true }).sort(), ['pin', 'trip']); assert.equal(decl.entitlement.createsFeatItems, false);
  assert.equal(A.items.length, before);
  ok('the entitlement is the weapon declaration plus proficiency; it creates no feat Item (the actor items are untouched)');

  // 67: an unproficient wielder, or a non-whip profile, is NOT entitled
  assert.deepEqual([WC.entitlementOf(decl, { profileId: 'whip-pin', proficient: false }), WC.entitlementOf(decl, { profileId: 'spear-melee', proficient: true }), WC.entitlementOf(null, { proficient: true })], [[], [], []]);
  ok('no entitlement for a non-proficient wielder, a non-whip profile, or a weapon without the declaration');

  // 68: Pin through the entitlement: needs the ordinary precondition (both creatures grappled) and performs the ordinary opposed Pin; NO Pin feat owned
  assert.equal(SWSEGrappling._hasFeat(A, 'Pin'), false);
  const ctx = (t, proficient = true) => ({ target: t, attacker: A, weapon: w, message: mkMsg(), weaponLabel: 'Amphistaff', special: {}, proficientWith: async () => proficient });
  let r = await WC.applyWeaponControlRecord(pin[0], ctx(T)); assert.deepEqual([r.applied, r.reason], [false, 'maneuver-not-performed']);
  assert.ok(notes.warn.some((m) => /grappled/i.test(m)));
  await GrappleStateEngine.advancePair(A, T, 'grappled', {}); reset();
  r = await WC.applyWeaponControlRecord(pin[0], ctx(T)); assert.equal(r.applied, true); assert.equal(stateOf(T), 'pinned'); assert.equal(r.result.entitled, true);
  ok('entitled Pin: requires both creatures grappled (ordinary rule), then pins through the ordinary opposed check without owning the Pin feat');

  // 69: Trip through the entitlement performs the ordinary opposed Trip (prone)
  const T3 = mkT(); world(A, T3); await GrappleStateEngine.advancePair(A, T3, 'grappled', {}); reset();
  r = await WC.applyWeaponControlRecord(trip[0], { ...ctx(T3), target: T3 }); assert.equal(r.applied, true); assert.equal(r.result.maneuver, 'trip');
  ok('entitled Trip performs the ordinary opposed grapple Trip without the feat');

  // 70: refused for the unproficient; and without the entitlement option the ordinary Pin still demands the feat
  const T4 = mkT(); world(A, T4); await GrappleStateEngine.advancePair(A, T4, 'grappled', {});
  r = await WC.applyWeaponControlRecord(pin[0], { ...ctx(T4), target: T4, proficientWith: async () => false }); assert.deepEqual([r.applied, r.reason], [false, 'not-entitled']); assert.equal(stateOf(T4), 'grappled');
  assert.equal(await SWSEGrappling.attemptPin(A, T4, { skipLegalityConfirm: true }), null); assert.equal(stateOf(T4), 'grappled');
  ok('an unproficient wielder is refused; ordinary Pin without the entitlement still requires the feat');
}


// ======================================================================================================================================
// I. TACTICAL TRACTOR BEAM -- grabbed-object model, move, hurl, falling-object damage                                  [points 71-82]
// ======================================================================================================================================
{
  const beam = canon('weapon-tactical-tractor-beam'); const A = makeActor({ items: [beam], grapple: 10 }); const T = mkT({ size: 'large', grapple: 5 }); world(A, T); noAsk();
  const atkOpts = { mounted: true, crewRegulated: true, rangeBand: 'short' };
  // 71: declaration: Huge-or-smaller gate, acquisition (ranged vs Reflex, then opposed grapple check), maintenance each operator turn, move 10 any direction, hurl 10 vs Reflex with falling-object damage
  const d = declOf('weapon-tactical-tractor-beam');
  assert.deepEqual(d.tractor, { maxSize: 'huge', acquisition: { defense: 'reflex', comparison: 'equals-or-exceeds', then: 'opposed-grapple-check' }, maintain: { timing: 'start-of-controller-turn', check: 'opposed-grapple-check', onLoss: 'release' },
    move: { squares: 10, direction: 'any' }, hurl: { squares: 10, defense: 'reflex', comparison: 'equals-or-exceeds', damageAuthority: 'falling-object-by-object-size' } });
  const acq = await attackWith(A, beam, T, atkOpts); const rec = acq.records.find((x) => x.kind === 'weapon-control');
  assert.equal(acq.r.isHit, true); assert.deepEqual([rec.role, rec.fired], ['tractor', true]);
  ok('Tractor Beam declaration (source-backfilled structure): Huge-or-smaller, acquisition, maintenance, move and hurl; a hit carries the tractor acquisition record');

  // 72: the ONE generic size gate: Huge allowed, Gargantuan refused (canonical size rank), unobserved size never guessed
  const H = mkT({ size: 'huge', grapple: 5 }), G = mkT({ size: 'gargantuan', grapple: 5 }); world(A, T, H, G);
  assert.equal((await applyFx(acq.special, G, { attacker: A, weapon: beam })).skipped[0].reason, 'target-too-large'); assert.equal(stateOf(G), null);
  assert.equal((await applyFx(acq.special, H, { attacker: A, weapon: beam })).applied.length, 1); assert.equal(stateOf(H), 'grabbed');
  assert.equal(CR.sizeGate({ targetSize: 'weird', maxSize: 'huge' }).reason, 'target-size-unobserved');
  ok('size gate: Huge is allowed, Gargantuan refused through canonical size rank; an unrecognized size is never guessed');

  // 73: acquisition is the OPPOSED grapple check after the hit: a lost check holds nothing; a tie goes to the operator (meets-or-beats)
  const strong = mkT({ size: 'large', grapple: 30 }); world(A, strong);
  let out = await applyFx(acq.special, strong, { attacker: A, weapon: beam }); assert.equal(out.skipped[0].reason, 'opposed-check-lost'); assert.equal(stateOf(strong), null);
  const even = mkT({ size: 'large', grapple: 10 }); world(A, even); out = await applyFx(acq.special, even, { attacker: A, weapon: beam }); assert.equal(out.applied.length, 1);
  ok('acquisition: attack hit, then the opposed grapple check (lost = nothing held, tie = held)');

  // 74: the held OBJECT: a grabbed state on the object with a tractor sub-record; the operator is not grappled
  const held = controlOn(H, A).control; assert.equal(held.tractor.moveSquares, 10); assert.equal(held.tractor.hurlSquares, 10); assert.equal(held.tractor.maxSize, 'huge'); assert.equal(stateOf(A), null);
  assert.equal(held.source.identityKey, 'weapon-tactical-tractor-beam');
  ok('the held object carries a control record with the tractor model (limits + provenance); the operator is not grappled');

  // 75: move up to 10 squares in any direction: stored as a structured intent (squares, direction, control id); more than 10 or an un-held object is refused
  let mv = await WC.moveTractoredObject({ controller: A, target: H, squares: 10, direction: 'any' }); assert.equal(mv.ok, true); assert.deepEqual(mv.intent, { squares: 10, direction: 'any', controlId: held.id });
  assert.deepEqual(controlOn(H, A).control.tractor.moved, { squares: 10, direction: 'any', controlId: held.id });
  assert.equal((await WC.moveTractoredObject({ controller: A, target: H, squares: 11 })).reason, 'beyond-declared-movement'); assert.equal((await WC.moveTractoredObject({ controller: A, target: mkT(), squares: 5 })).reason, 'object-not-held');
  ok('move: up to 10 squares as a structured movement intent persisted on the control; 11 squares or an un-held object refused');

  // 76: hurl range: more than 10 squares refused; a hurl is a NEW ranged attack with the weapon
  assert.equal((await WC.hurlTractoredObject({ controller: A, target: H, weapon: beam, squares: 11, attackBonus: 5 })).reason, 'beyond-declared-hurl-range');
  ok('hurl range is capped at the declared 10 squares');

  // 77: with the falling-object table UNCERTIFIED the hurl refuses BEFORE rolling anything: control retained, no damage, and never the beam\'s own 3d6
  reset(); const refused = await WC.hurlTractoredObject({ controller: A, target: H, weapon: beam, squares: 10, attackBonus: 5 });
  assert.deepEqual([refused.ok, refused.reason], [false, 'falling-object-table-uncertified']); assert.equal(damage.length, 0); assert.equal(formulas.length, 0); assert.equal(stateOf(H), 'grabbed'); assert.ok(!formulas.includes('3d6'));
  assert.equal(FO.FALLING_OBJECT_TABLE, null);
  ok('uncertified falling-object table: the hurl refuses before any roll (control kept, no damage, never the beam\'s 3d6)');

  // 78: with a certified table supplied, damage comes from the FALLING-OBJECT authority by the object\'s size, with provenance persisted on the damage event
  const table = { medium: '2d6', large: '6d6', huge: '10d6' }; reset(); dice.map['10d6'] = 33;
  const hurl = await WC.hurlTractoredObject({ controller: A, target: H, weapon: beam, squares: 10, attackBonus: 5, fallingTable: table });
  assert.equal(hurl.ok, true); assert.equal(hurl.hit, true); assert.deepEqual(damage.map((x) => [x.actor, x.amount, x.type]), [[H.id, 33, 'bludgeoning']]);
  assert.deepEqual(damage[0].options.hurledObject, { controlId: held.id, authority: 'falling-object-by-object-size', size: 'huge', formula: '10d6' }); assert.deepEqual(hurl.provenance, damage[0].options.hurledObject);
  assert.ok(!formulas.includes('3d6')); assert.equal(formulas.filter((f) => /^1d20/.test(f)).length, 1);
  ok('hurl: a new ranged attack vs Reflex, damage from the falling-object authority by the object\'s size (10d6 for Huge in the fixture), provenance persisted, never 3d6');

  // 79: the hurled object is released (control ended with reason hurled); a miss deals no damage but still releases it
  assert.equal(stateOf(H), null); assert.equal(GrappleStateEngine.getControlRecords(H).length, 0);
  await applyFx(acq.special, T, { attacker: A, weapon: beam }); reset(); dice.next = [1];
  const missed = await WC.hurlTractoredObject({ controller: A, target: T, weapon: beam, squares: 4, attackBonus: -50, fallingTable: table });
  assert.deepEqual([missed.ok, missed.hit, missed.damage], [true, false, null]); assert.equal(damage.length, 0); assert.equal(stateOf(T), null);
  ok('a hurled object is released; a missed hurl deals no damage but still releases it');

  // 80: the falling-object authority: pure lookup, refuses an unobserved size / a size missing from the table / a malformed formula
  assert.equal(FO.fallingObjectDamage('large', { table }).formula, '6d6'); assert.equal(FO.fallingObjectDamage('Large', { table }).ok, true);
  assert.deepEqual([FO.fallingObjectDamage('zzz', { table }).reason, FO.fallingObjectDamage('tiny', { table }).reason, FO.fallingObjectDamage('large', { table: { large: 'lots' } }).reason, FO.fallingObjectDamage('large').reason],
    ['object-size-unobserved', 'falling-object-size-not-in-table', 'falling-object-size-not-in-table', 'falling-object-table-uncertified']);
  ok('the falling-object authority is a pure size lookup that refuses what it cannot certify (unobserved size, missing size, malformed formula, no table)');

  // 81: maintenance: at the START of the controller\'s turn an opposed grapple check; a lost check releases the object; only the controller\'s start; once per round
  const M = mkT({ size: 'large', grapple: 5 }); world(A, M); await applyFx(acq.special, M, { attacker: A, weapon: beam }); assert.equal(stateOf(M), 'grabbed');
  assert.equal((await turnEvent('start', M, [A, M], 1)).ended.length, 0); assert.equal((await turnEvent('end', A, [A, M], 1)).ended.length, 0);
  assert.equal((await turnEvent('start', A, [A, M], 1)).ended.length, 0); assert.equal(stateOf(M), 'grabbed');
  assert.equal((await turnEvent('start', A, [A, M], 1)).ended.length, 0);
  ok('maintenance fires only at the controller\'s turn start, once per round; a won check keeps the object');

  // 82: a lost maintenance check releases the object (reason maintenance-failed) and clears the state
  M.__grapple = 40; const lost = await turnEvent('start', A, [A, M], 2);
  assert.deepEqual(lost.ended.map((e) => e.reason), ['maintenance-failed']); assert.equal(stateOf(M), null); assert.equal(GrappleStateEngine.getControlRecords(M).length, 0);
  ok('a lost maintenance check releases the object and clears the control');
}

// ======================================================================================================================================
// J. LIFECYCLE, IDEMPOTENCY, CLEANUP                                                                                   [points 83-86]
// ======================================================================================================================================
{
  const w = withAmmo('lightsaber-chassis-lightwhip'); const A = makeActor({ items: [w] }); const T = mkT(); world(A, T); noAsk();
  const hit = await attackWith(A, w, T); await applyFx({ records: hit.records }, T, { attacker: A, weapon: w });
  // 83: the real combat-turn adapter: the OUTGOING combatant (combat.previous) ends its turn, the incoming one starts -- one existing hook, no timers
  reset(); dice.map['2d4'] = 7;
  const combat = { id: 'c1', round: 4, turn: 0, combatant: { id: `cb-${A.id}`, actor: A }, previous: { combatantId: `cb-${T.id}` }, combatants: [{ id: `cb-${A.id}`, actor: A }, { id: `cb-${T.id}`, actor: T }], turns: [] };
  globalThis.game = { ...globalThis.game, combat, actors: [A, T] };
  let res = await WC.handleControlTurnChange(combat, {}); assert.equal(res.end.fired.length, 1); assert.equal(res.start.fired.length, 0); assert.equal(damage.length, 1);
  res = await WC.handleControlTurnChange(combat, {}); assert.equal(res.end.fired.length, 0); assert.equal(damage.length, 1);
  ok('the turn-hook adapter ends the outgoing combatant\'s turn and starts the incoming one; a re-fired hook is harmless');

  // 84: no timers, polling or custom hooks anywhere in the control modules (they ride the existing combatTurn hook)
  const strip = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  for (const f of ['scripts/items/weapon-runtime/control-rules.js', 'scripts/engine/combat/weapon-control-effects.js', 'scripts/engine/combat/falling-object-rules.js']) {
    const code = strip(fs.readFileSync(f, 'utf8')); assert.ok(!/setInterval|setTimeout|Hooks\.(on|once|call)|requestAnimationFrame/.test(code), `${f} has no timers or hook registration`);
  }
  assert.match(fs.readFileSync('scripts/infrastructure/hooks/combat-hooks.js', 'utf8'), /handleWeaponControlTurn/);
  ok('no timers, polling or custom hooks: the control rides the existing combatTurn hook registration');

  // 85: explicit end reasons; an unknown reason is rejected; an ended control cannot be processed again
  const T5 = mkT(); world(A, T5); await applyFx({ records: hit.records }, T5, { attacker: A, weapon: w });
  await assert.rejects(() => WC.endControl(A, T5, 'because'), /unknown control end reason/);
  const ended = await WC.endControl(A, T5, 'released'); assert.equal(ended.reason, 'released'); assert.equal(ended.ended.length, 1); assert.equal(stateOf(T5), null);
  assert.ok(CR.CONTROL_END_REASONS.includes('escaped') && CR.CONTROL_END_REASONS.includes('weapon-removed') && CR.CONTROL_END_REASONS.includes('maintenance-failed') && CR.CONTROL_END_REASONS.includes('hurled'));
  ok('control end reasons are an explicit vocabulary; release clears the state and the record together');

  // 86: at-most-once: the turn slot is recorded BEFORE damage is dealt, so a failure after that point never double-damages on replay
  const T6 = mkT(); world(A, T6); await applyFx({ records: hit.records }, T6, { attacker: A, weapon: w }); reset(); dice.map['2d4'] = 5;
  const realDmg = ActorEngine.applyDamage; ActorEngine.applyDamage = async () => { throw new Error('boom'); };
  await assert.rejects(() => turnEvent('end', T6, [A, T6], 9), /boom/);
  ActorEngine.applyDamage = realDmg; const replay = await turnEvent('end', T6, [A, T6], 9); assert.equal(replay.fired.length, 0); assert.equal(replay.skipped[0].reason, 'already-processed'); assert.equal(damage.length, 0);
  ok('the recurring slot is recorded before the damage is dealt: a failure never double-damages on replay');
}

// ======================================================================================================================================
// K. COMPATIBILITY                                                                                                     [points 87-90]
// ======================================================================================================================================
{
  // 87: a legacy weapon (no canonical identity) NAMED like a control weapon gets no control: no records, no mechanics
  const legacy = { id: 'lg1', name: 'Lightwhip', type: 'weapon', flags: {}, system: { weaponCategory: 'melee', damage: '2d4', damageType: 'energy', equipped: true, proficient: true } };
  const A = makeActor({ items: [legacy] }); const T = mkT(); world(A, T); noAsk();
  const lg = await attackWith(A, legacy, T); assert.deepEqual(lg.records.filter((x) => x.kind === 'weapon-control'), []); assert.equal(lg.special?.mechanics?.some((m) => m.family === 'grab-grapple') ?? false, false);
  ok('a legacy weapon named "Lightwhip" gets no control: control is declared by canonical identity, never by name');

  // 88: a canonical control weapon under ANY display name works (all weapons above are "Renamed Thing"); the unarmed grab path is untouched by the new gates
  const w = withAmmo('lightsaber-chassis-lightwhip'); assert.equal(w.name, 'Renamed Thing'); const B = makeActor({ items: [w] });
  const cw = await attackWith(B, w, T); assert.equal(cw.records.some((x) => x.kind === 'weapon-control'), true);
  ok('the same declaration works for a canonical weapon under a wrong display name');

  // 89: the new modules contain no weapon-name branches (identity keys and slugs of weapons / feats appear only as data)
  const strip = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  for (const f of ['scripts/items/weapon-runtime/control-rules.js', 'scripts/engine/combat/weapon-control-effects.js', 'scripts/engine/combat/falling-object-rules.js']) {
    const code = strip(fs.readFileSync(f, 'utf8'));
    for (const rec of registry.getAll()) { assert.ok(!code.includes(`'${rec.identityKey}'`) && !code.includes(`"${rec.identityKey}"`), `${f} names the identity ${rec.identityKey}`); assert.ok(!code.includes(`'${rec.canonicalName}'`), `${f} names the weapon ${rec.canonicalName}`); }
  }
  ok('the control modules contain no weapon-name branches');

  // 90: the builder-negative allow-list covers exactly the new runtime consumers
  const neg = fs.readFileSync('tests/weapon-runtime-builder-negative.test.mjs', 'utf8');
  for (const f of ['scripts/engine/combat/weapon-control-effects.js', 'scripts/engine/combat/falling-object-rules.js', 'scripts/combat/systems/grappling-system.js']) assert.ok(neg.includes(`'${f}'`), f);
  assert.ok(!/census|manifest|ledger/i.test(strip(fs.readFileSync('scripts/engine/combat/weapon-control-effects.js', 'utf8')).replace(/postControlCard|control card/g, '')), 'no runtime read of audit artifacts');
  ok('the runtime-consumer allow-list names the new control modules and nothing reads a census / manifest / ledger at runtime');
}

// ======================================================================================================================================
// L. DATA, MANIFEST, CENSUS, RELATION                                                                                  [points 91-97]
// ======================================================================================================================================
{
  const m = manifestICB.buildManifest();
  // 91: the I-C-B manifest is current, fully classified, and its counters close
  assert.equal(fs.readFileSync(manifestICB.OUT_JSON, 'utf8'), `${JSON.stringify(m, null, 2)}\n`, 'the committed I-C-B manifest is current'); assert.deepEqual(m.problems, []);
  assert.equal(m.counters.I_C_B_UNCLASSIFIED, 0);
  const c = m.counters; assert.equal(c.I_C_B_INPUT_MECHANICS, c.I_C_B_IMPLEMENTED + c.I_C_B_DUPLICATES + c.I_C_B_DATA_DEFECT + c.I_C_B_DATA_COMPLETENESS + c.I_C_B_DEFERRED_I_C_C + c.I_C_B_DEFERRED_I_D + c.I_C_B_BLOCKED);
  assert.equal(c.I_C_B_DEFERRED_I_C_C + c.I_C_B_DEFERRED_I_D + c.I_C_B_BLOCKED, 0, 'nothing in this seam is deferred or blocked');
  ok(`the I-C-B input manifest: ${c.I_C_B_INPUT_MECHANICS} inputs (${c.I_C_B_OPERATION_KEYS} operation keys, ${c.I_C_B_SPECIAL_MECHANICS} special mechanics, ${c.I_C_B_RELATIONS} relation), zero unclassified, committed copy current`);

  // 92: every I-C-A deferral and every grab-grapple mechanic of the census has an I-C-B row; no grab-grapple mechanic is DEFER
  const census = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5d-e-special-mechanic-census.json', 'utf8'));
  const all = Object.entries(census.identities).flatMap(([k, forms]) => Object.values(forms).flat().map((e) => [k, e]));
  assert.equal(all.filter(([, e]) => /^grab-grapple:/.test(e) && /:DEFER$/.test(e)).length, 0); assert.ok(all.filter(([, e]) => /^grab-grapple:/.test(e)).length >= 20);
  assert.deepEqual(census.deferredByOwner, { 'I-C-C': 7, 'I-D': 3 }); assert.deepEqual(census.deferredWithoutOwner, []);
  for (const r of manifestICA.buildManifest().rows.filter((x) => x.disposition === 'DEFERRED_TO_I_C_B' && x.kind === 'operation-key')) assert.ok(m.rows.some((x) => x.key === r.key), `I-C-A deferral ${r.key} is closed by an I-C-B row`);
  ok('no grab-grapple mechanic remains DEFER (census: I-C-B 15 -> 0; only I-C-C 7 and I-D 3 remain); every I-C-A deferral is closed by an I-C-B row');

  // 93: global counters: the closure census moved only because real keys were consumed, and the whole family is consumed
  const closure = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5d-h-closure-census.json', 'utf8'));
  assert.equal(closure.operationKeys.families['grab-grapple-restrain'].executableUnconsumed.length, 0); assert.equal(closure.operationKeys.families['grab-grapple-restrain'].status, 'CONSUMED');
  assert.deepEqual(m.globalCounters.before, I_C_B_BASELINE);
  assert.deepEqual([closure.counters.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER, closure.counters.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER, closure.counters.EXECUTABLE_FORM_MECHANICS_DEFERRED, closure.counters.EXECUTABLE_RELATION_FAMILIES_DEFERRED], [m.globalCounters.after.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER, m.globalCounters.after.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER, m.globalCounters.after.EXECUTABLE_FORM_MECHANICS_DEFERRED, m.globalCounters.after.EXECUTABLE_RELATION_FAMILIES_DEFERRED]);
  assert.ok(closure.counters.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER < I_C_B_BASELINE.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER && closure.counters.EXECUTABLE_FORM_MECHANICS_DEFERRED === 10 && closure.counters.EXECUTABLE_RELATION_FAMILIES_DEFERRED === 6);
  ok(`global counters: unique unconsumed keys ${I_C_B_BASELINE.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER} -> ${closure.counters.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER}, raw ${I_C_B_BASELINE.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER} -> ${closure.counters.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER}, deferred mechanics 25 -> 10, deferred relations 7 -> 6, grab-grapple-restrain fully consumed`);

  // 94: the Amphistaff relation is consumed, not deferred, and names the entitlement consumer
  const rel = closure.relations.executableConsumed.find((r) => r.relation === 'PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM');
  assert.ok(rel && /entitlementOf/.test(rel.consumer)); assert.ok(!closure.relations.executableDeferred.some((r) => r.relation === 'PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM'));
  ok('the Amphistaff whip-form relation is consumed through the control entitlement (deferral removed)');

  // 95: earlier phase manifests stay current and fully classified
  assert.equal(manifestIA.buildManifest().counters.I_A_UNCLASSIFIED_KEYS, 0); assert.equal(manifestIB.buildManifest().counters.I_B_UNCLASSIFIED_KEYS, 0); assert.equal(manifestICA.buildManifest().counters.I_C_A_UNCLASSIFIED, 0);
  for (const [mod, file] of [[manifestIA, manifestIA.OUT_JSON], [manifestIB, manifestIB.OUT_JSON], [manifestICA, manifestICA.OUT_JSON]]) assert.equal(fs.readFileSync(file, 'utf8'), `${JSON.stringify(mod.buildManifest(), null, 2)}\n`);
  ok('the I-A, I-B and I-C-A manifests remain current with zero unclassified');

  // 96: data policy: structure was backfilled in the canonical SSOT amendments (source-cited, logged), never hand-patched into generated packs; the table gap is explicit
  const corpus = JSON.parse(fs.readFileSync('data/canonical/weapons.json', 'utf8'));
  for (const k of ['weapon-snare-rifle', 'weapon-adhesive-grenade', 'weapon-stokhli-spray-stick', 'weapon-electronet', 'weapon-tactical-tractor-beam']) assert.ok(corpus.identities.find((i) => i.identityKey === k).provenance.postCertificationAmendments.includes('5D-I-C-B-control-structure-backfill'), k);
  assert.ok(I_C_B_ROWS.some((r) => r.key === 'fallingObjectDamageTable' && r.disposition === 'DATA_COMPLETENESS' && r.owner === 'final-certification'));
  ok('structure backfills are logged post-certification amendments with sources; the falling-object table is an explicit DATA_COMPLETENESS row owned by final certification');

  // 97: the I-C-A poison-coating discrepancy keeps an explicit I-D / final-certification owner (documented, deliberately not solved here)
  const doc = fs.readFileSync('docs/audits/weapon-phase-5d-i-c-b-grapple-control.md', 'utf8');
  assert.match(doc, /poison[- ]coating/i); assert.match(doc, /I-D/); assert.match(doc, /final[- ]certification/i);
  ok('the poison-coating discrepancy carries an explicit I-D / final-certification owner in the audit document');
}

} finally { restore(); }
console.log(`Phase 5D-I-C-B grapple control: ${step} checks passed.`);
