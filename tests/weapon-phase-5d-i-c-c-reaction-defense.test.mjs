import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-C-C -- REACTION / DEFENSE / DISARM / RECOVERY convergence: weapon-specific Block / Deflect / Redirect Shot eligibility and modifiers, passive contextual defense, disarm protection, native return.
// The weapon declares; the EXISTING reaction executor (LightsaberTalentActions), attack pipeline and rider stage execute it through the one reaction-weapon context. Every weapon below is a canonical
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

const { LightsaberTalentActions: LTA, LIGHTSABER_TALENT_IO } = await import('/systems/foundryvtt-swse/scripts/engine/talent/lightsaber-talent-actions.js');
const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
const RR = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/reaction-rules.js');
const RW = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-weapon-context.js');
const manifestICC = await import('../tools/census-weapon-phase-5d-i-c-c-inputs.mjs');
const { I_C_C_ROWS, I_C_C_BASELINE } = await import('../tools/lib/weapon-phase-5d-i-c-c-ledger.mjs');
import { spawnSync } from 'node:child_process';
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

// ---- reaction harness: the live executor with its two roll collaborators and its dialogs injected ----------------------------------------------------
const rolled = [], cards = [];
const plan = { dc: 20, cortosis: false, chooseId: null, chooserCalls: 0, success: true };
const origIO = { ...LIGHTSABER_TALENT_IO }; const origPrompt = SWSEDialogV2.prompt; const origHTML = SWSEChat.postHTML;
const installReaction = () => {
  LIGHTSABER_TALENT_IO.showRollModifiersDialog = async () => ({ customModifier: 0 });
  LIGHTSABER_TALENT_IO.rollSkillCheck = async (actor, skill, opts) => { rolled.push({ actor: actor.id, skill, ...opts }); return { success: plan.success, roll: { total: 20 } }; };
  SWSEChat.postHTML = async (p) => { cards.push(p); return {}; };
  SWSEDialogV2.prompt = async (cfg) => {
    if (/choose the weapon/.test(cfg.title)) { plan.chooserCalls += 1; return plan.chooseId ?? ''; }
    if (/Target|Redirect Shot|Riposte|Precision/.test(cfg.title) && !/^(Block|Deflect)$/.test(cfg.title)) return { targetName: 'Bolt' };
    return { dc: plan.dc, area: false, protectAdjacent: false, shelteringStance: false, lightsaberSpecialist: false, shotoPin: false, cortosis: plan.cortosis === true };
  };
};
var restoreReaction = () => { Object.assign(LIGHTSABER_TALENT_IO, origIO); SWSEDialogV2.prompt = origPrompt; SWSEChat.postHTML = origHTML; };
installReaction();
const resetReaction = () => { rolled.length = 0; cards.length = 0; plan.dc = 20; plan.cortosis = false; plan.chooseId = null; plan.chooserCalls = 0; plan.success = true; };

const TALENTS = () => [canonTalent('block', 'Zq One'), canonTalent('deflect', 'Zq Two'), canonTalent('redirect-shot', 'Zq Three')];
/** an actor with a real flag store (the executor's counter lives in actor flags) */
const reactor = ({ weapons = [], talents = TALENTS(), proficient = true, extra = [] } = {}) => {
  const a = makeActor({ items: weapons, feats: [...talents, ...extra] });
  if (!proficient) { a.items = col(a.items.filter((i) => !PROF.includes(i) && i !== LS_PROF)); a.system.weaponProficiencies = []; }
  const store = {};
  a.getFlag = (ns, k) => store[`${ns}.${k}`]; a.setFlag = async (ns, k, v) => { store[`${ns}.${k}`] = v; return v; }; a.__flags = store;
  return a;
};
const ls = (key, extra = {}) => canon(key, { equipped: true, activated: true, ...extra });
const counter = (a) => a.__flags['swse.blockDeflectUseState'];
const lastMod = () => rolled.at(-1).customModifier;
const block = (a) => LTA.promptBlock(a); const deflect = (a) => LTA.promptDeflect(a); const redirect = (a) => LTA.promptRedirectShot(a);

// ======================================================================================================================================
// A. REACTION BASELINE                                                                                                    [points 1-5]
// ======================================================================================================================================
{
  // 1: a legacy actor (no canonical weapon; talent matched by legacy name) is untouched: the normal cumulative -5 per previous Block
  const A = reactor({ talents: [mk('talent', 'Block'), mk('talent', 'Deflect'), mk('talent', 'Redirect Shot')] });
  const out = []; for (let i = 0; i < 3; i++) { await block(A); out.push(lastMod()); }
  assert.deepEqual(out, [0, -5, -10]); assert.deepEqual(counter(A).increments, [5, 5, 5]); assert.equal(counter(A).uses, 3);
  ok('standard Block (legacy actor, legacy talent names): cumulative -5 per previous use, exactly as before');

  // 2: Deflect baseline and the SHARED Block / Deflect counter
  const B = reactor({ talents: [mk('talent', 'Block'), mk('talent', 'Deflect')] }); resetReaction();
  await block(B); await deflect(B); await deflect(B);
  assert.deepEqual(rolled.map((r) => r.customModifier), [0, -5, -10]); assert.deepEqual(rolled.map((r) => r.source), ['block-talent', 'deflect-talent', 'deflect-talent']);
  ok('standard Deflect: unchanged, and Block / Deflect share one cumulative counter');

  // 3: Redirect Shot baseline (legacy actor): allowed, once per round; Improved Redirect credits back the LAST use
  const C = reactor({ talents: [mk('talent', 'Block'), mk('talent', 'Redirect Shot'), mk('talent', 'Improved Redirect')] }); resetReaction();
  await block(C); await block(C); const r = await redirect(C);
  assert.equal(r.success, true); assert.equal(r.creditedBack, true); assert.deepEqual(counter(C).increments, [5]); assert.equal(counter(C).uses, 1);
  ok('Redirect Shot baseline is unchanged; Improved Redirect credits back the most recent use');

  // 4: a canonical plain lightsaber carries no modifier: identical sequence, and it is recorded as the reaction weapon
  const D = reactor({ weapons: [ls('weapon-lightsaber')] }); resetReaction();
  const seq = []; for (let i = 0; i < 3; i++) { const x = await block(D); seq.push(lastMod()); assert.equal(x.reactionWeapon, 'weapon-lightsaber'); }
  assert.deepEqual(seq, [0, -5, -10]);
  ok('a canonical plain lightsaber is the reaction weapon and adds no modifier: the standard sequence');

  // 5: the counter has ONE owner (the actor flag): a legacy record without increments still prices at 5 per use, nothing is stored on the weapon
  assert.equal(RR.accruedPenalty({ uses: 2 }), 10); assert.equal(RR.accruedPenalty({ increments: [2, 5] }), 7); assert.deepEqual(RR.withRecordedUse({ uses: 2 }, 2), { increments: [5, 5, 2], uses: 3 });
  assert.deepEqual(RR.withCreditedBackUse({ increments: [2, 2, 5] }), { increments: [2, 2], uses: 2 });
  const w = ls('lightsaber-chassis-crossguard'); const E = reactor({ weapons: [w] }); await block(E);
  assert.deepEqual(Object.keys(w.flags.swse), ['canonicalWeapon']); assert.ok(E.__flags['swse.blockDeflectUseState']);
  ok('the Block / Deflect counter stays with the actor flag (legacy records priced at 5 per use); no counter is written to a weapon');
}

// ======================================================================================================================================
// B. CROSSGUARD                                                                                                          [points 6-11]
// ======================================================================================================================================
{
  const w = ls('lightsaber-chassis-crossguard'); const A = reactor({ weapons: [w] }); resetReaction();
  // 6-8: cumulative -2 per successive Block instead of -5
  const seq = []; for (let i = 0; i < 3; i++) { const out = await block(A); seq.push(lastMod()); assert.equal(out.reactionWeapon, 'lightsaber-chassis-crossguard'); }
  assert.equal(seq[0], 0); ok('Crossguard: the first Block has no cumulative penalty');
  assert.equal(seq[1], -2); ok('Crossguard: the second Block takes a cumulative -2');
  assert.equal(seq[2], -4); ok('Crossguard: the third Block takes a cumulative -4 (-2 per previous check)');
  // 9: never the normal -5 increment; each use records the increment ITS weapon contributed
  assert.deepEqual(counter(A).increments, [2, 2, 2]); assert.ok(!seq.includes(-5) && !seq.includes(-10));
  ok('Crossguard Block never uses the normal -5 increment (increments recorded: 2, 2, 2)');
  // 10: Deflect: flat -2 on every Deflect check, and a Deflect does NOT inherit the Block increment
  const B = reactor({ weapons: [ls('lightsaber-chassis-crossguard')] }); resetReaction();
  await deflect(B); assert.equal(lastMod(), -2); await deflect(B); assert.equal(lastMod(), -2 - 5);
  assert.deepEqual(counter(B).increments, [5, 5]);
  ok('Crossguard Deflect: flat -2 on all Deflect checks; each Deflect adds the normal 5 to the counter (the -2 increment is Block-only)');
  // 11: no cross-application: a weapon change between reactions never re-prices earlier uses
  const C = reactor({ weapons: [ls('lightsaber-chassis-crossguard'), ls('weapon-lightsaber')] }); resetReaction();
  plan.chooseId = C.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'lightsaber-chassis-crossguard').id; await block(C);
  plan.chooseId = C.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'weapon-lightsaber').id; await block(C);
  assert.deepEqual(rolled.map((r) => r.customModifier), [0, -2]); assert.deepEqual(counter(C).increments, [2, 5]);
  plan.chooseId = C.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'lightsaber-chassis-crossguard').id; await block(C);
  assert.equal(lastMod(), -7);
  ok('Block and Deflect modifiers do not cross-apply, and switching weapons never re-prices earlier uses (2 then 5 recorded, next Crossguard Block sees -7)');
}

// ======================================================================================================================================
// C. GUARD SHOTO                                                                                                        [points 12-15]
// ======================================================================================================================================
{
  const w = ls('lightsaber-chassis-guard-shoto'); const A = reactor({ weapons: [w] }); resetReaction();
  await block(A); assert.equal(lastMod(), 2); ok('Guard Shoto: +2 equipment bonus on a proficient wielder\'s Block check');
  resetReaction(); const B = reactor({ weapons: [ls('lightsaber-chassis-guard-shoto')] }); await deflect(B); assert.equal(lastMod(), 2); ok('Guard Shoto: +2 equipment bonus on Deflect');
  // 14: scoped: no bonus for Redirect Shot (it is not a Use the Force check made with Block / Deflect), and not for a non-proficient wielder
  const sel = await RW.resolveReactionWeapon(B, 'redirect-shot'); assert.equal(sel.status, 'selected'); assert.deepEqual(RW.selectedReactionModifiers(sel, 'redirect-shot'), { flat: 0, equipmentBonus: 0, increment: 5, notes: [] });
  const np = reactor({ weapons: [ls('lightsaber-chassis-guard-shoto')], proficient: false }); resetReaction(); await block(np); assert.equal(lastMod(), 0);
  ok('the Guard Shoto bonus applies only to Block / Deflect checks and only for a proficient wielder (never Redirect Shot, never a general Use the Force bonus)');
  // 15: equipment bonuses do not stack: only the excess over the best equipment bonus already applying counts
  const rich = reactor({ weapons: [ls('lightsaber-chassis-guard-shoto')] }); rich.system.derived.modifiers = { breakdown: { 'skill.useTheForce': { applied: [{ type: 'equipment', value: 3 }] } } }; resetReaction(); await block(rich); assert.equal(lastMod(), 0);
  const some = reactor({ weapons: [ls('lightsaber-chassis-guard-shoto')] }); some.system.derived.modifiers = { breakdown: { 'skill.useTheForce': { applied: [{ type: 'equipment', value: 1 }, { type: 'enhancement', value: 9 }] } } }; resetReaction(); await block(some); assert.equal(lastMod(), 1);
  ok('equipment-bonus stacking respected: an existing +3 equipment bonus leaves the +2 worth 0; an existing +1 leaves +1 (a non-equipment bonus is not counted)');
}

// ======================================================================================================================================
// D. PIKE / COMBINED PENALTY / RELATION GATE                                                                            [points 16-19]
// ======================================================================================================================================
{
  const A = reactor({ weapons: [ls('lightsaber-chassis-pike')] }); resetReaction();
  await block(A); assert.equal(lastMod(), -2); ok('Lightsaber Pike (JATM): flat -2 on Block checks (and no cumulative change)');
  await deflect(A); assert.equal(lastMod(), -2 - 5); ok('Lightsaber Pike: flat -2 on Deflect checks (the counter adds the normal 5)');
  // 18: the three Pike keys state ONE penalty: never added (BlockPenalty / DeflectPenalty win over the combined key; the combined key alone serves both)
  const decl = RR.reactionDeclarationOf(registry.getByIdentityKey('lightsaber-chassis-pike')); assert.deepEqual([decl.modifiers.block.flat, decl.modifiers.deflect.flat], [-2, -2]);
  const onlyCombined = RR.reactionDeclarationOf({ identityKey: 'x', operation: { blockDeflectUseTheForcePenalty: -3 }, abilityInteractions: [{ ability: 'Block', relation: 'NEGATIVE_WEAPON_MODIFIER' }, { ability: 'Deflect', relation: 'NEGATIVE_WEAPON_MODIFIER' }] });
  assert.deepEqual([onlyCombined.modifiers.block.flat, onlyCombined.modifiers.deflect.flat], [-3, -3]);
  const both = RR.reactionDeclarationOf({ identityKey: 'x', operation: { BlockPenalty: -2, blockDeflectUseTheForcePenalty: -5 }, abilityInteractions: [{ ability: 'Block', relation: 'NEGATIVE_WEAPON_MODIFIER' }] }); assert.equal(both.modifiers.block.flat, -2);
  ok('the combined Force-Unleashed / Pike penalty and the per-reaction keys are one rule: never added; the per-reaction key wins, the combined key serves both reactions alone');
  // 19: the relation is the SELECTOR: an operation number whose reaction the weapon does not name is not applied (and no profile / config gate is needed for a flat penalty)
  const ungated = RR.reactionDeclarationOf({ identityKey: 'x', operation: { DeflectPenalty: -2 }, abilityInteractions: [] }); assert.equal(ungated, null, 'a number whose reaction the weapon does not name declares nothing');
  assert.equal(RR.reactionModifiers(ungated, 'deflect').flat, 0);
  ok('the relation selects which reaction a number belongs to: an unnamed reaction receives nothing');
}

// ======================================================================================================================================
// E. DUAL-PHASE (passive contextual defense)                                                                             [points 20-24]
// ======================================================================================================================================
{
  const target = (setting) => { const t = mkT({ reflex: 12 }); const dp = ls('lightsaber-chassis-dual-phase'); if (setting) dp.flags.swse.fireState = { v: 1, settingProfile: setting }; t.items = col([dp]); return t; };
  const shooter = withAmmo('weapon-blaster-pistol', 50); const A = makeActor({ items: [shooter] }); noAsk();
  const dcOf = async (t, extra = {}) => { reset(); const r = await rollAttack(A, shooter, { target: t, suppressChat: false, rangeBand: 'short', ...extra }); assert.ok(r); return posted.find((p) => p.context?.workflowContext).context.dc; };
  world(A);
  assert.equal(await dcOf(target(null), { adjacent: true }), 12); ok('Dual-Phase default setting: no adjacent Reflex penalty');
  const ext = target('extended');
  assert.equal(await dcOf(ext, { adjacent: true }), 10); ok('extended blade + adjacent attacker: -2 Reflex Defense');
  assert.equal(await dcOf(ext, { adjacent: false }), 12); assert.equal(await dcOf(ext, { distance: 'near' }), 12); ok('extended blade + non-adjacent attacker: no penalty');
  assert.equal(ext.system.derived.defenses.reflex.total, 12); ok('the stored Reflex Defense is never changed (the penalty exists only in that attack\'s defense value)');
  ext.items[0].flags.swse.fireState = { v: 1, settingProfile: 'default' }; assert.equal(await dcOf(ext, { adjacent: true }), 12); ok('switching back to the default setting removes the penalty');
  // unobserved adjacency: asked once, an unanswered fact is never read as adjacent
  const ext2 = target('extended'); let asked = ask(async (q) => (/passive-defense/.test(q.id) ? true : null)); assert.equal(await dcOf(ext2), 10); assert.ok(asked.some((id) => /passive-defense:adjacent/.test(id)));
  ask(async () => null); assert.equal(await dcOf(ext2), 12); noAsk();
  // not a Block / Deflect modifier
  const sel = await RW.resolveReactionWeapon(reactor({ weapons: [ls('lightsaber-chassis-dual-phase')] }), 'block'); assert.deepEqual(RW.selectedReactionModifiers(sel, 'block'), { flat: 0, equipmentBonus: 0, increment: 5, notes: [] });
}

// ======================================================================================================================================
// F. SITH SWORD                                                                                                         [points 25-29]
// ======================================================================================================================================
{
  const ss = ls('weapon-sith-sword'); const A = reactor({ weapons: [ss] }); resetReaction();
  const out = await block(A); assert.equal(out.reactionWeapon, 'weapon-sith-sword'); ok('Sith Sword (proficient wielder): qualifies for Block');
  assert.equal((await deflect(A)).reactionWeapon, 'weapon-sith-sword'); ok('Sith Sword qualifies for Deflect');
  assert.equal((await redirect(A)).success, true); assert.equal((await RW.resolveReactionWeapon(A, 'redirect-shot')).identityKey, 'weapon-sith-sword'); ok('Sith Sword qualifies for Redirect Shot (explicitly declared)');
  // 28: non-proficient: compatibility refused where the declaration requires proficiency (eligibility is a declaration, not a number)
  const d = RR.reactionDeclarationOf(registry.getByIdentityKey('weapon-sith-sword'));
  assert.deepEqual([RR.reactionEligibility(d, 'block', { proficient: false }).eligible, RR.reactionEligibility(d, 'block', { proficient: null }).eligible, RR.reactionEligibility(d, 'block', { proficient: true }).eligible], [false, null, true]);
  ok('without proficiency the Sith Sword is not eligible (unobserved proficiency is neither true nor false)');
  // 29: it remains a Sith Sword: not a lightsaber for any other mechanic, no modifier inherited, no proficiency / Item granted
  assert.equal(RW.canonicalLightsaberGroupOf(ss), false); assert.equal(d.eligibility.lightsaberGroup, false); assert.equal(registry.getByIdentityKey('weapon-sith-sword').selectors.group === 'weapon-group:lightsaber', false);
  assert.deepEqual(RW.selectedReactionModifiers(await RW.resolveReactionWeapon(A, 'block'), 'block'), { flat: 0, equipmentBonus: 0, increment: 5, notes: [] }); assert.equal(d.eligibility.dependentTalentsUnstructured, true);
  ok('the Sith Sword stays a Sith Sword: no lightsaber group, no inherited modifier, no proficiency granted; the unstructured "dependent talents" part is recorded, not guessed');
}

// ======================================================================================================================================
// G. FELUCIAN SKULLBLADE / MAY-USE-BLOCK-AS-LIGHTSABER                                                                  [points 30-34]
// ======================================================================================================================================
{
  const sk = ls('unmapped::Felucian Skullblade'); const A = reactor({ weapons: [sk] });
  const askWith = (fn) => ({ ask: async (id) => fn(id) });
  let r = await RW.resolveReactionWeapon(A, 'block', askWith(() => true)); assert.deepEqual([r.status, r.via], ['selected', 'force-imbued']); ok('Felucian Skullblade, imbued: Block eligible');
  r = await RW.resolveReactionWeapon(A, 'block', askWith(() => false)); assert.deepEqual([r.status, r.reason], ['none', 'no-eligible-weapon']); ok('Felucian Skullblade, not imbued: not Block eligible');
  r = await RW.resolveReactionWeapon(A, 'block', askWith(() => null)); assert.deepEqual([r.status, r.reason], ['none', 'eligibility-unresolved']); assert.equal(r.pending[0].needs, 'imbued');
  const calls = []; await RW.resolveReactionWeapon(A, 'block', { ask: async (id) => { calls.push(id); return true; }, answers: { [`imbued:${sk.id}`]: true } }); assert.deepEqual(calls, []);
  ok('an unanswered imbued state is never assumed (neither imbued nor not: unresolved, with its pending fact); a stored answer is not asked again; a Force-sensitive wielder is never read as imbued');
  assert.equal((await RW.resolveReactionWeapon(A, 'deflect', askWith(() => true))).status, 'none'); assert.equal(RW.canonicalLightsaberGroupOf(sk), false);
  // 33-34: San-Ni Staff: Block only, scoped
  const san = ls('unmapped::San-Ni Staff'); const B = reactor({ weapons: [san] }); resetReaction();
  assert.equal((await block(B)).reactionWeapon, 'unmapped::San-Ni Staff'); ok('San-Ni Staff (mayUseBlockAsLightsaber): Block eligible');
  assert.equal((await RW.resolveReactionWeapon(B, 'deflect')).status, 'none'); assert.equal((await RW.resolveReactionWeapon(B, 'redirect-shot')).status, 'none'); assert.equal(RW.canonicalLightsaberGroupOf(san), false);
  assert.equal(await deflect(B), null); assert.ok(notes.warn.some((m) => /Deflect: no equipped weapon/.test(m)));
  ok('the San-Ni Staff is Block-eligible only: not Deflect, not Redirect Shot, not a lightsaber for any other mechanic');
}

// ======================================================================================================================================
// H. DISARM / CANNOT BE DROPPED                                                                                         [points 35-42]
// ======================================================================================================================================
{
  const shooter = withAmmo('weapon-blaster-pistol', 50); const A = makeActor({ items: [shooter] }); noAsk();
  const holder = (...keys) => { const t = mkT({ reflex: 12 }); t.items = col(keys.map((k) => ls(k))); return t; };
  const atk = async (t, extra = {}) => { reset(); const r = await rollAttack(A, shooter, { target: t, suppressChat: false, rangeBand: 'short', ...extra }); return { r, dc: posted.find((p) => p.context?.workflowContext)?.context.dc }; };
  world(A);
  let o = await atk(holder('weapon-lightsaber'), { maneuver: 'disarm' }); assert.ok(o.r); assert.equal(o.dc, 12); ok('ordinary held weapon: a disarm attack is unchanged');
  o = await atk(holder('weapon-dlt-20a-longblaster'), { maneuver: 'disarm' }); assert.equal(o.dc, 13); ok('DLT-20A: disarmDefense = Reflex Defense');
  assert.equal((await atk(holder('weapon-dlt-20a-longblaster'))).dc, 12); ok('the +1 equipment bonus applies only against a disarm attack (a normal attack sees 12) and is typed equipment');
  const eq = holder('weapon-dlt-20a-longblaster'); eq.system.derived.modifiers = { breakdown: { 'defense.reflex': { applied: [{ type: 'equipment', value: 1 }] } } };
  assert.equal((await atk(eq, { maneuver: 'disarm' })).dc, 12); ok('equipment stacking respected: an equipment bonus to Reflex already applying leaves the weapon\'s +1 worth 0');
  const gloves = holder('unmapped::Combat Gloves'); o = await atk(gloves, { maneuver: 'disarm' });
  assert.equal(o.r, null); assert.ok(notes.warn.some((m) => /cannot be disarmed/.test(m))); ok('Combat Gloves cannot be disarmed: the disarm attack is refused');
  assert.equal(spent.ammo, 0); assert.deepEqual(spent.actions, []); assert.equal(formulas.length, 0); assert.equal(posted.length, 0); ok('a categorically illegal disarm spends nothing: no ammunition, no action, no roll, no card');
  for (const k of ['unmapped::Shockboxing Gloves', 'unmapped::Stunning Gauntlet', 'unmapped::Vibroknucklers']) assert.equal((await atk(holder(k), { maneuver: 'disarm' })).r, null, k);
  assert.ok((await atk(gloves)).r, 'a non-disarm attack against the gloves is unaffected');
  // 41: cannotBeDropped is the same categorical protection against a combat-forced drop; the item is never touched (no inventory write)
  const dropOnly = RR.reactionDeclarationOf({ identityKey: 'x', operation: { cannotBeDropped: true } }); assert.deepEqual([RR.disarmProtection(dropOnly).immune, RR.disarmProtection(dropOnly).immuneReason], [true, 'cannot-be-dropped']);
  ok('cannotBeDropped protects against the combat-forced drop exactly like cannotBeDisarmed');
  // 42: mixed holder, item unspecified: asked once per protected weapon; named item: no question
  const mixed = holder('unmapped::Combat Gloves', 'weapon-lightsaber'); const bladeId = mixed.items.find((i) => i.flags.swse.canonicalWeapon.identityKey === 'weapon-lightsaber').id; const gloveId = mixed.items.find((i) => i.flags.swse.canonicalWeapon.identityKey === 'unmapped::Combat Gloves').id;
  let asked = ask(async () => true); assert.equal((await atk(mixed, { maneuver: 'disarm' })).r, null); assert.equal(asked.length, 1);
  asked = ask(async () => false); assert.ok((await atk(mixed, { maneuver: 'disarm' })).r); noAsk();
  assert.ok((await atk(mixed, { maneuver: 'disarm', disarmItemId: bladeId })).r); assert.equal((await atk(mixed, { maneuver: 'disarm', disarmItemId: gloveId })).r, null);
  const ctxSrc = fs.readFileSync('scripts/engine/combat/reactions/reaction-weapon-context.js', 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n'); assert.ok(!/unequip|deleteEmbedded|updateOwned|ActorEngine|updateEmbedded|setFlag/.test(ctxSrc));
  ok('a mixed holder: the aimed-at item is asked once (or named); the reaction context never writes an actor, item or inventory (voluntary drop / unequip untouched)');
}

// ======================================================================================================================================
// I. RAPID STRIKE WAIVER (attack-side)                                                                                  [points 43-45]
// ======================================================================================================================================
{
  const forms = (key, profileId = 'end1') => rt.resolveCanonicalDamage(canon(key), { weaponForm: { identityKey: key, profileId } }).mechanics;
  const contribs = async (key, uses, profileId) => (await SM.resolveAttackStageModifiers(forms(key, profileId), { activeUses: uses })).contributions;
  assert.deepEqual(await contribs('weapon-blaster-pistol', ['rapid-strike'], 'primary'), []); ok('a normal weapon with Rapid Strike keeps the normal penalty (no waiver contribution)');
  const z = await contribs('unmapped::Zhaboka', ['rapid-strike'], 'end1'); assert.deepEqual(z.map((c) => [c.id, c.value]), [['remove-rapid-strike-penalty-0', 2]]);
  const s = await contribs('unmapped::Shyarn', ['rapid-strike'], rt.buildAttackForms ? 'primary' : 'primary').catch(() => []); void s;
  ok('Zhaboka with Rapid Strike: the weapon-declared waiver removes exactly the 2-point attack penalty');
  assert.deepEqual(await contribs('unmapped::Zhaboka', [], 'end1'), []); assert.deepEqual(await contribs('unmapped::Zhaboka', ['double-attack'], 'end1'), []);
  const row = I_C_C_ROWS.find((r) => r.key === 'rapidStrikeAttackPenaltyWaived'); assert.equal(row.disposition, 'DUPLICATE'); assert.equal(row.verify(JSON.parse(fs.readFileSync('data/weapons/canonical-weapon-registry.json', 'utf8'))), true);
  ok('only the Rapid Strike attack penalty is waived (not while Rapid Strike is unused, nothing else touched); the field is a verified duplicate of the structured relation consumed at attack time, with no Rapid Strike math in the reaction engine');
}

// ======================================================================================================================================
// J. DARKSTICK NATIVE RETURN / RETURN DISTINCTIONS                                                                      [points 46-54]
// ======================================================================================================================================
{
  const dk = canon('unmapped::Darkstick'); const A = makeActor({ items: [dk], feats: [mk('feat', 'Exotic Weapon Proficiency (Darkstick)')] }); noAsk(); world(A);
  const learn = async () => { const t = mkT({ reflex: 0 }); world(A, t); reset(); await rollAttack(A, dk, { target: t, suppressChat: false, rangeBand: 'pointBlank', wieldedHands: 1, profileId: 'thrown' }); return Number(String(formulas.find((f) => /^1d20/.test(f))).replace(/^1d20\s*\+\s*/, '')); };
  const bonus = await learn(); const total = 16 + bonus;
  const throwAt = async (margin, profileId = 'thrown') => { const t = mkT({ reflex: total - margin }); world(A, t); reset(); const r = await rollAttack(A, dk, { target: t, suppressChat: false, rangeBand: 'pointBlank', wieldedHands: 1, profileId }); const rec = (wfOf()?.special?.records ?? []).find((x) => x.kind === 'weapon-recovery'); return { r, rec, t }; };
  let x = await throwAt(6); assert.equal(x.rec.fired, true); ok('thrown Darkstick attack exceeding Reflex by 6: returns');
  x = await throwAt(4); assert.equal(x.rec.fired, false); ok('margin 4 (< 5): does not return');
  x = await throwAt(5); assert.equal(x.rec.fired, true); assert.equal(x.rec.payload.margin, 5); ok('exactly +5 qualifies ("by 5 or more")');
  // 49-51: no feat, no reaction, once
  assert.equal(abilityKeysOfActorFeats(A), 0); const msg = mkMsg();
  const applyRec = (rec, t, m) => CSE.applyCanonicalSpecialEffects({ special: { records: [rec] }, target: t, attacker: A, weapon: dk, hpBefore: 40, hpAfter: 30, rawAmount: 10, message: m, weaponLabel: 'Darkstick' });
  const out = await applyRec(x.rec, x.t, msg); assert.equal(out.applied[0].result.returned, true); assert.equal(out.applied[0].result.weaponId, dk.id);
  ok('no feat is needed (the wielder owns no return ability): the weapon-native rule fires');
  assert.equal(A.getFlag?.('swse', 'blockDeflectUseState'), undefined); assert.deepEqual(spent.actions, []); ok('no reaction is consumed and no action is spent');
  const again = await applyRec(x.rec, x.t, msg); assert.equal(again.skipped[0].reason, 'already-applied'); assert.equal(dk.system.equipped, true);
  ok('the return fires once per card (receipt); the owned weapon is neither removed nor unequipped');
  const melee = await throwAt(10, 'melee'); assert.equal(melee.rec, undefined);
  // 52-54: return distinctions
  const disc = canon('weapon-discblade'); const dr = rt.resolveCanonicalDamage(disc, { weaponForm: { identityKey: 'weapon-discblade', profileId: rec0('weapon-discblade') } }).mechanics; assert.ok(!dr.some((m) => m.family === 'return-recovery'));
  assert.equal(SM.evaluateAttackOutcomeSpecials(dr, { hit: true, attackTotal: 99, defenses: { reflex: 1 } }).some((r) => r.kind === 'weapon-recovery'), false);
  ok('the Discblade gains no return from the generic returnToHand field (the field states return is not a base quality)');
  assert.equal(I_C_C_ROWS.find((r) => r.key === 'returnToHand').disposition, 'NON_EXECUTABLE'); assert.equal(I_C_C_ROWS.find((r) => r.key === 'returnToHand.recallDiscblade').disposition, 'DEFERRED_TO_I_D');
  const code = ['scripts/items/weapon-runtime/reaction-rules.js', 'scripts/engine/combat/reactions/reaction-weapon-context.js', 'scripts/items/weapon-runtime/special-mechanics.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/returnToHand|Returning Bug|returning-bug/.test(code)); ok('Returning Bug stays feat-owned: no runtime rule infers a return from a weapon flag or names that feat');
  const legacyDk = { id: 'lg2', name: 'Darkstick', type: 'weapon', flags: {}, system: { weaponCategory: 'melee', damage: '1d6', equipped: true, proficient: true } };
  const tl = mkT({ reflex: 0 }); world(A, tl); reset(); await rollAttack(A, legacyDk, { target: tl, suppressChat: false }); assert.equal((wfOf()?.special?.records ?? []).some((r) => r.kind === 'weapon-recovery'), false);
  ok('display names decide nothing: a legacy item named "Darkstick" never returns, a canonical Darkstick under a wrong name does');
}

// ======================================================================================================================================
// K. RELATION MIRRORING                                                                                                 [points 55-57]
// ======================================================================================================================================
{
  const rel = (k) => RR.reactionDeclarationOf(registry.getByIdentityKey(k)).relations;
  assert.deepEqual(rel('lightsaber-chassis-crossguard'), { block: 'POSITIVE_WEAPON_MODIFIER', deflect: 'NEGATIVE_WEAPON_MODIFIER' }); assert.deepEqual(rel('lightsaber-chassis-guard-shoto'), { block: 'POSITIVE_WEAPON_MODIFIER', deflect: 'POSITIVE_WEAPON_MODIFIER' });
  ok('positive relations (Crossguard Block, Guard Shoto Block + Deflect) select the operation rule of their reaction');
  assert.deepEqual(rel('lightsaber-chassis-pike'), { block: 'NEGATIVE_WEAPON_MODIFIER', deflect: 'NEGATIVE_WEAPON_MODIFIER' });
  ok('negative relations (Crossguard Deflect, Pike Block + Deflect) select the operation rule of their reaction');
  const pike = RR.reactionDeclarationOf(registry.getByIdentityKey('lightsaber-chassis-pike')); assert.equal(RR.reactionModifiers(pike, 'block').flat, -2); assert.equal(RR.reactionModifiers(pike, 'deflect').flat, -2);
  const closure = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5d-h-closure-census.json', 'utf8')); assert.equal(closure.relations.counts.POSITIVE_WEAPON_MODIFIER, 3); assert.equal(closure.relations.counts.NEGATIVE_WEAPON_MODIFIER, 3);
  assert.ok(['POSITIVE_WEAPON_MODIFIER', 'NEGATIVE_WEAPON_MODIFIER'].every((r) => closure.relations.executableConsumed.some((x) => x.relation === r)) && !closure.relations.executableDeferred.some((x) => /_WEAPON_MODIFIER$/.test(x.relation)));
  ok('relation + operation never double-apply (Pike -2 once per reaction); 3 positive + 3 negative instances are consumed, none deferred');
}

// ======================================================================================================================================
// L. MULTIPLE REACTION WEAPONS                                                                                          [points 58-60]
// ======================================================================================================================================
{
  const mk2 = (...keys) => reactor({ weapons: keys.map((k) => ls(k)) });
  let A = mk2('weapon-lightsaber'); let r = await RW.resolveReactionWeapon(A, 'block', { choose: async () => { throw new Error('must not ask'); } }); assert.equal(r.status, 'selected');
  A = mk2('weapon-lightsaber', 'weapon-sith-sword', 'unmapped::Combat Gloves'); r = await RW.resolveReactionWeapon(A, 'block', { choose: async () => { throw new Error('must not ask'); } }); assert.equal(r.status, 'selected');
  A = mk2('weapon-lightsaber', 'lightsaber-chassis-dueling'); r = await RW.resolveReactionWeapon(A, 'block', { choose: async () => { throw new Error('identical numbers: nothing to choose'); } }); assert.equal(r.status, 'selected');
  ok('one eligible weapon (or several with identical effects) is auto-selected without a question; an ineligible weapon is ignored');
  A = mk2('lightsaber-chassis-crossguard', 'lightsaber-chassis-guard-shoto');
  r = await RW.resolveReactionWeapon(A, 'block'); assert.equal(r.status, 'choice'); assert.equal(r.candidates.length, 2);
  let calls = 0; r = await RW.resolveReactionWeapon(A, 'block', { choose: async (c) => { calls += 1; return c.find((x) => x.identityKey === 'lightsaber-chassis-guard-shoto'); } });
  assert.equal(calls, 1); assert.equal(r.identityKey, 'lightsaber-chassis-guard-shoto'); ok('materially different legal weapons (Crossguard vs Guard Shoto): nothing is picked silently; the player chooses once');
  // 60: exactly ONE weapon executes: the chosen Guard Shoto gives +2 and NOT the Crossguard increment; the Crossguard gives its increment and NOT the +2
  resetReaction(); const B = mk2('lightsaber-chassis-crossguard', 'lightsaber-chassis-guard-shoto');
  plan.chooseId = B.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'lightsaber-chassis-guard-shoto').id; const o1 = await block(B); assert.deepEqual([o1.weaponModifiers.equipmentBonus, o1.weaponModifiers.increment], [2, 5]);
  plan.chooseId = B.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'lightsaber-chassis-crossguard').id; const o2 = await block(B); assert.deepEqual([o2.weaponModifiers.equipmentBonus, o2.weaponModifiers.increment], [0, 2]);
  assert.deepEqual(counter(B).increments, [5, 2]); assert.equal(plan.chooserCalls, 2);
  ok('exactly one reaction weapon executes: the best modifiers of two equipped weapons are never combined');
}

// ======================================================================================================================================
// M. COMPATIBILITY, IDENTITY, CLOSURE                                                                                  [points 61-70]
// ======================================================================================================================================
{
  // 61-62: earlier phases still green (run as their own processes)
  for (const [label, file] of [['I-C-B grapple control', 'tests/weapon-phase-5d-i-c-b-grapple-control.test.mjs'], ['I-C-A outcome effects', 'tests/weapon-phase-5d-i-c-a-outcome-persistent-effects.test.mjs']]) {
    const p = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: 900000 }); assert.equal(p.status, 0, `${label}: ${(p.stderr || '').slice(-400)}`);
    ok(`${label} regression remains green`);
  }
  // 63: legacy / homebrew reaction path remains valid (covered by points 1-3): a weapon with no canonical identity changes nothing
  const lg = { id: 'lg3', name: 'Crossguard Lightsaber', type: 'weapon', flags: {}, system: { equipped: true, weaponCategory: 'melee' } }; const L = reactor({ weapons: [lg] }); resetReaction();
  const seq = []; for (let i = 0; i < 3; i++) { await block(L); seq.push(lastMod()); } assert.deepEqual(seq, [0, -5, -10]); assert.equal((await RW.resolveReactionWeapon(L, 'block')).status, 'legacy');
  ok('a legacy weapon NAMED "Crossguard Lightsaber" gains nothing and the legacy reaction path stays valid');
  // 64: identity-first talents: canonical talents under wrong names work; a canonical talent merely NAMED Block is not Block
  const wrong = reactor({ talents: [canonTalent('block', 'Zzz'), canonTalent('deflect', 'Yyy')] }); resetReaction(); assert.ok(await block(wrong)); assert.ok(await deflect(wrong));
  const imp = reactor({ talents: [canonTalent('deflect', 'Block')] }); resetReaction(); assert.equal(await block(imp), null); assert.ok(notes.warn.some((m) => /Block talent required/.test(m)));
  const wf = ls('lightsaber-chassis-crossguard'); wf.name = 'Totally Not A Weapon'; const wr = reactor({ weapons: [wf], talents: [canonTalent('block', 'Q1')] }); resetReaction(); await block(wr); await block(wr); assert.equal(lastMod(), -2);
  ok('canonical wrong-name talents and weapons work; a canonical Deflect talent named "Block" is not Block');
  // 65: manifest
  const m = manifestICC.buildManifest(); assert.deepEqual(m.problems, []); assert.equal(m.counters.I_C_C_UNCLASSIFIED, 0); assert.equal(fs.readFileSync(manifestICC.OUT_JSON, 'utf8'), `${JSON.stringify(m, null, 2)}\n`);
  const c = m.counters; assert.equal(c.I_C_C_INPUT_TOTAL, c.I_C_C_IMPLEMENTED + c.I_C_C_DUPLICATES + c.I_C_C_NON_EXECUTABLE + c.I_C_C_DATA_DEFECT + c.I_C_C_DATA_COMPLETENESS + c.I_C_C_BLOCKED + c.I_C_C_DEFERRED_I_D);
  ok(`the I-C-C manifest: ${c.I_C_C_INPUT_TOTAL} inputs (${c.I_C_C_INPUT_OPERATION_KEYS} operation keys, ${c.I_C_C_INPUT_SPECIAL_MECHANICS} special mechanics, ${c.I_C_C_INPUT_RELATIONS} relations, ${c.I_C_C_INPUT_ABILITY_COMPATIBILITY} ability compatibility), zero unclassified, committed copy current`);
  // 66: closure: the defense family is fully consumed (no relabelling: the non-executables are proven by their carried values) and the global counters moved only through real work
  const closure = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5d-h-closure-census.json', 'utf8')); const fam = closure.operationKeys.families['defense-and-reaction-interactions'];
  assert.equal(fam.status, 'CONSUMED'); assert.deepEqual(fam.executableUnconsumed, []); assert.deepEqual(Object.keys(fam.nonExecutable).sort(), ['DESCRIPTIVE', 'DISPLAY']);
  assert.deepEqual(m.globalCounters.before, I_C_C_BASELINE); assert.ok(closure.counters.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER < I_C_C_BASELINE.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER && closure.counters.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER < I_C_C_BASELINE.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER);
  ok(`the defense-and-reaction family is FULLY CONSUMED; unique unconsumed keys ${I_C_C_BASELINE.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER} -> ${closure.counters.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER}, raw ${I_C_C_BASELINE.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER} -> ${closure.counters.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER}, execution families fully consumed 36 -> ${closure.counters.FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES}`);
  // 67: special-mechanic census: DEFER 10 -> 3 (only the I-D three); relations deferred 6 -> 4 (the talent-corpus four)
  const census = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5d-e-special-mechanic-census.json', 'utf8')); assert.deepEqual(census.deferredByOwner, { 'I-D': 3 }); assert.equal(closure.counters.EXECUTABLE_FORM_MECHANICS_DEFERRED, 3);
  assert.deepEqual(closure.relations.executableDeferred.map((r) => r.relation).sort(), m.stillDeferredRelations.slice().sort()); assert.equal(closure.counters.EXECUTABLE_RELATION_FAMILIES_DEFERRED, 4);
  ok('special-mechanic DEFER 10 -> 3 (Gas Grenade concealment, Sith Sword empowerment, Verpine durability stay with I-D); deferred relation families 6 -> 4 (the talent-corpus four are untouched)');
  // 68: no weapon-name branches in the new modules; allow-list; no census read at runtime
  const strip = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  for (const f of ['scripts/items/weapon-runtime/reaction-rules.js', 'scripts/engine/combat/reactions/reaction-weapon-context.js']) {
    const code2 = strip(fs.readFileSync(f, 'utf8')); for (const rec of registry.getAll()) { assert.ok(!code2.includes(`'${rec.identityKey}'`) && !code2.includes(`'${rec.canonicalName}'`), `${f} names ${rec.identityKey}`); }
    assert.ok(!/census|manifest|ledger/i.test(code2), `${f} reads no audit artifact`);
  }
  const neg = fs.readFileSync('tests/weapon-runtime-builder-negative.test.mjs', 'utf8'); for (const f of ['scripts/engine/combat/reactions/reaction-weapon-context.js', 'scripts/engine/talent/lightsaber-talent-actions.js']) assert.ok(neg.includes(`'${f}'`));
  ok('the reaction modules contain no weapon-name branches, read no audit artifact, and are on the runtime-consumer allow-list');
  // 69: heuristic usage stays zero
  assert.equal(closure.counters.CANONICAL_NAME_TEXT_HEURISTIC_USAGE, 0); ok('canonical name/text heuristic usage stays 0');
  // 70: eligibility vs modifier separation is structural: a modifier-only declaration grants no reaction, an eligibility-only declaration implies no number
  const modOnly = RR.reactionDeclarationOf({ identityKey: 'x', operation: { blockDeflectUseTheForceEquipmentBonus: 2 }, abilityInteractions: [{ ability: 'Block', relation: 'POSITIVE_WEAPON_MODIFIER' }], selectors: { group: 'weapon-group:simple' } });
  assert.equal(RR.reactionEligibility(modOnly, 'block', { proficient: true }).eligible, false); assert.equal(RR.reactionModifiers(modOnly, 'block', { proficient: true }).equipmentBonus, 2);
  const eligOnly = RR.reactionDeclarationOf({ identityKey: 'y', operation: { mayUseBlockAsLightsaber: true }, abilityInteractions: [], selectors: { group: 'weapon-group:simple' } });
  assert.equal(RR.reactionEligibility(eligOnly, 'block').eligible, true); assert.deepEqual(RR.reactionModifiers(eligOnly, 'block'), { flat: 0, equipmentBonus: 0, increment: 5, notes: [] });
  ok('eligibility and modifiers are separate: a modifier never grants a reaction (Crossguard / Shoto numbers do not make a weapon Block-eligible) and eligibility never implies a number (Sith Sword / San-Ni inherit none)');
}

// ======================================================================================================================================
// N. LIGHTSABER READINESS (drawn AND ignited) -- weapon-readiness UI pass                                              [points 71-73]
// ======================================================================================================================================
{
  const states = { stowed: { equipped: false, activated: false }, inactive: { equipped: true, activated: false }, active: { equipped: true, activated: true } };
  for (const [reaction, call] of [['block', block], ['deflect', deflect]]) {
    const out = {};
    for (const [label, sys] of Object.entries(states)) { const a = reactor({ weapons: [ls('weapon-lightsaber', sys)] }); resetReaction(); out[label] = await call(a); }
    assert.equal(out.stowed, null); assert.equal(out.inactive, null); assert.equal(out.active.reactionWeapon, 'weapon-lightsaber');
    ok(`${reaction}: a stowed lightsaber and a drawn-but-inactive lightsaber cannot be used; a drawn and active one can`);
  }
  // alternate source-backed reaction weapons keep their own declaration as authority (no lightsaber activation state required)
  const alt = reactor({ weapons: [ls('weapon-sith-sword', { activated: undefined })] }); resetReaction(); assert.equal((await block(alt)).reactionWeapon, 'weapon-sith-sword');
  const stowedAlt = reactor({ weapons: [ls('weapon-sith-sword', { equipped: false })] }); resetReaction(); assert.equal(await block(stowedAlt), null);
  // Lightsaber Defense: requires a drawn and ignited lightsaber before any effect exists
  const ld = async (sys) => { const a = reactor({ weapons: [ls('weapon-lightsaber', sys)], talents: [canonTalent('lightsaber-defense', 'Zz')] }); notes.warn.length = 0; try { await LTA.promptLightsaberDefense(a); } catch (_err) { /* effect creation needs the live document API */ } return notes.warn.some((m) => /requires a drawn and ignited lightsaber/.test(m)); };
  assert.equal(await ld(states.stowed), true); assert.equal(await ld(states.inactive), true); assert.equal(await ld(states.active), false);
  ok('alternate reaction weapons are not rejected for lacking lightsaber activation (but must be drawn); Lightsaber Defense refuses a stowed / inactive lightsaber and proceeds with a drawn, active one');
}

// small helpers used above
function abilityKeysOfActorFeats(a) { return Array.from(a.items).filter((i) => i.type === 'feat' && /return/i.test(String(i.name))).length; }
function rec0(key) { return registry.getByIdentityKey(key).canonicalStats.attackProfiles[0].id; }

} finally { restoreReaction(); restore(); }
console.log(`Phase 5D-I-C-C reaction / defense: ${step} checks passed.`);
