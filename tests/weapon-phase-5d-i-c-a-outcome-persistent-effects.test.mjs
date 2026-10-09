import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-C-A -- attack OUTCOME / threshold / status / persistent-effect convergence (Apply Damage riders, effective threshold, target-class damage, poison,
// delayed damage, timed status effects, turn-owned lifecycle). The weapon declares the outcome; the existing engines execute it.
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


// ---- shared pieces ---------------------------------------------------------------------------------------------------------------------
const { evaluateRegisteredCondition, evaluateStructuralCondition, resolveTargetRequirements, evaluateConditionalDamage } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js');
const { resolveRangeEnvironment, canonicalDamageRangePenalty, resolveCanonicalRange } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/canonical-range.js');
const { resolveAutofireArea, resolveDetonation, validateDetonationTimer } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/area-shape.js');
const { markRerollWeaponDice } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const manifestIA = await import('../tools/census-weapon-phase-5d-i-a-inputs.mjs');
const manifestIB = await import('../tools/census-weapon-phase-5d-i-b-inputs.mjs');
const manifestICA = await import('../tools/census-weapon-phase-5d-i-c-a-inputs.mjs');
const { I_B_LEDGER } = await import('../tools/lib/weapon-phase-5d-i-b-ledger.mjs');
const I_B_LEDGER_OF = (k) => I_B_LEDGER.find((r) => r.key === k);
const OS = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/owned-state.js');
const AR = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/activation-requirements.js');
const { AttackOfOpportunityFeatRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/attack-of-opportunity-feat-rules.js');
const packDoc = (pack, name, rename = 'Qzx Renamed Label') => {
  const d = fs.readFileSync(pack, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((x) => x.name === name);
  return { ...JSON.parse(JSON.stringify(d)), id: `p${++uid}`, name: rename };
};
const corpus = JSON.parse(fs.readFileSync('data/canonical/weapons.json', 'utf8'));
const rec = (k) => corpus.identities.find((i) => i.identityKey === k);
const withAmmo = (k, max = 100, system = {}) => canon(k, { ammunition: { current: max, max }, ...system });
const form = (identityKey, profileId = 'primary', extra = {}) => ({ weaponForm: { identityKey, profileId, ...extra } });
const dmg = (A, w, ctx = {}) => resolveDamageComposition(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId: 'primary' }, ...ctx });
const mods = (A, w, extra = {}) => CombatOptionResolver.collectAttackModifiers(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId: 'primary' }, ...extra });
const fx = (f) => Number(Function(`return ${String(f).replace(/^\s*1d20/, '0')}`)());
const formulas = [];
const origSafe = { RE: RollEngine.safeRoll, S: SWSERoll._safeRoll, W: globalThis.SWSE };
const stubRolls = () => {
  const stub = async (f) => { formulas.push(f); return { total: 16, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  RollEngine.safeRoll = stub; SWSERoll._safeRoll = stub; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub } };
};
const unstubRolls = () => { RollEngine.safeRoll = origSafe.RE; SWSERoll._safeRoll = origSafe.S; globalThis.SWSE = origSafe.W; };
const bonusOf = async (A, w, extra = {}) => { reset(); formulas.length = 0; const r = await attack(A, w, extra); return r ? fx(formulas[0]) : null; };
const wfOf = () => posted.find((p) => p.context?.workflowContext)?.context.workflowContext;
const { WeaponAuthorityRegistry: WAR } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const registryClone = (mutate) => { const c = JSON.parse(JSON.stringify(registryData)); mutate(c); return new WAR(c); };

const reinstall = (opts) => { restoreHarness(); installHarness(opts); setRound(null); stubRolls(); AmmoSystem.consumeAmmunition = async (a, w, n) => ({ success: true, newAmmo: 50 - n, previousAmmo: 50 }); };
installHarness(); setRound(null); stubRolls();
AmmoSystem.consumeAmmunition = async (a, w, n) => ({ success: true, newAmmo: 50 - n, previousAmmo: 50 });
const FS = FireStateStoreRef;
const ewp = (rename, choice) => ({ ...packDoc('packs/feats.db', 'Exotic Weapon Proficiency', rename), flags: { swse: { ...packDoc('packs/feats.db', 'Exotic Weapon Proficiency').flags.swse, choices: { weaponProficiency: choice } } } });
const swifts = () => spent.actions.filter((a) => a === 'swift').length;
const state = (w) => w.flags?.swse?.fireState ?? {};
const ask = (fn) => { const asked = []; rt.setSpecialPromptProvider(async (q) => { asked.push(q.id); return fn(q); }); return asked; };

// ---- I-C-A pieces ------------------------------------------------------------------------------------------------------------------------
const { DamageResolutionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-resolution-engine.js');
const { ThresholdEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/threshold-engine.js');
const { finalizeDamagePacketForTarget, buildDamagePacket } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js');
const CSE = await import('/systems/foundryvtt-swse/scripts/engine/combat/canonical-special-effects.js');
const OE = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/outcome-effects.js');
const SM = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js');
const { PoisonEngine } = await import('/systems/foundryvtt-swse/scripts/engine/poison/poison-engine.js');
const { RecurringDamageEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/recurring-damage-engine.js');
const { EffectIntentEngine } = await import('/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js');
const { I_C_A_ROWS } = await import('../tools/lib/weapon-phase-5d-i-c-a-ledger.mjs');
const rowOf = (key) => I_C_A_ROWS.find((r) => r.key === key);

// a target with a REAL derived threshold (the stored value the engine must never modify)
const mkT = ({ id = 't1', type = 'npc', dt = 25, hp = 40, reflex = 12, fort = 12, evasion = false, improved = false, droid = false } = {}) => ({
  id, name: `Target ${id}`, type: droid ? 'droid' : type, flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; }, setFlag: async () => {},
  ...(evasion ? { system: undefined } : {}),
  system: { size: 'medium', hp: { value: hp, max: hp }, conditionTrack: { current: 0 }, ...(evasion ? { evasion: true } : {}), ...(improved ? { improvedEvasion: true } : {}),
    derived: { damageThreshold: dt, speed: { total: 6 }, defenses: { reflex: { total: reflex }, fortitude: { total: fort }, will: { total: 10 } } } },
});
const mkMsg = () => { const store = {}; return { id: `m${++uid}`, getFlag: (s, k) => store[`${s}.${k}`] ?? null, setFlag: async (s, k, v) => { store[`${s}.${k}`] = v; }, store }; };
// engine stubs that record what the executors delegate to (restored in `finally`)
const delegated = { effects: [], ct: [], damage: [], poison: [], weaponPoison: [], recurring: [], updates: [] };
const origEng = { create: ActorEngine.createActiveEffects, ct: ActorEngine.setConditionStep, persist: ActorEngine.setConditionPersistent, upd: ActorEngine.updateActor, dmg: ActorEngine.applyDamage,
  pApply: PoisonEngine.applyPoison, pWeapon: PoisonEngine.applyWeaponPoisonFromAttack, rq: RecurringDamageEngine.queueRecurringDamage };
const rolls = { map: {}, asked: [] };
const installOutcomeStubs = () => {
  for (const k of Object.keys(delegated)) delegated[k].length = 0;
  ActorEngine.createActiveEffects = async (actor, data, opts) => { const made = data.map((d) => ({ id: `e${++uid}`, ...d, statuses: new Set(d.statuses ?? []), disabled: false })); actor.effects.push(...made); delegated.effects.push({ actor: actor.id, data, opts }); return made; };
  ActorEngine.setConditionStep = async (actor, step, src) => { delegated.ct.push({ actor: actor.id, step, src }); actor.system.conditionTrack.current = step; return {}; };
  ActorEngine.setConditionPersistent = async () => ({});
  ActorEngine.updateActor = async (actor, upd) => { delegated.updates.push({ actor: actor.id, upd }); return {}; };
  ActorEngine.applyDamage = async (actor, packet) => { delegated.damage.push({ actor: actor.id, packet }); return { applied: packet.amount, resolution: { thresholdExceeded: false, conditionDelta: 0 } }; };
  PoisonEngine.applyPoison = async (a) => { delegated.poison.push(a); return { success: true, instance: { id: 'p1' } }; };
  PoisonEngine.applyWeaponPoisonFromAttack = async (a) => { delegated.weaponPoison.push(a); return origEng.pWeapon.call(PoisonEngine, a); };
  RecurringDamageEngine.queueRecurringDamage = async (actor, spec, o) => { delegated.recurring.push({ actor: actor.id, spec, o }); return { success: true, instance: spec }; };
  RollEngine.safeRoll = async (f) => { const t = /^\s*1d20/.test(String(f)) ? 16 : (rolls.map[String(f).replace(/\s+/g, '')] ?? 3); formulas.push(f); return { total: t, formula: f, dice: [{ results: [{ result: t }] }] }; };
};
const restoreOutcomeStubs = () => {
  ActorEngine.createActiveEffects = origEng.create; ActorEngine.setConditionStep = origEng.ct; ActorEngine.setConditionPersistent = origEng.persist; ActorEngine.updateActor = origEng.upd; ActorEngine.applyDamage = origEng.dmg;
  PoisonEngine.applyPoison = origEng.pApply; PoisonEngine.applyWeaponPoisonFromAttack = origEng.pWeapon; RecurringDamageEngine.queueRecurringDamage = origEng.rq;
};
// the apply-time call the chat bridge makes for one target
const applyFx = (special, t, { attacker = null, weapon = null, hpBefore = 40, hpAfter = 30, rawAmount = 10, appliedAmount = null, resolution = null, damageType = 'energy', message = mkMsg(), label = 'Weapon' } = {}) =>
  CSE.applyCanonicalSpecialEffects({ special, target: t, attacker, weapon, hpBefore, hpAfter, rawAmount, appliedAmount, resolution, damageType, message, weaponLabel: label });
const recs = () => wfOf()?.special?.records ?? [];
const attackRecords = async (A, w, t, extra = {}) => { reset(); const r = await attack(A, w, { target: t, ...extra }); return { r, special: wfOf()?.special, records: recs() }; };
const resolve = (t, damage, options = {}, damageType = 'energy') => DamageResolutionEngine.resolveDamage({ actor: t, damage, damageType, source: null, options });
const pkt = (weaponKey, t, { amount = 20, hit = true, special = null, area = false, type = 'ion', ruleData = {} } = {}) => finalizeDamagePacketForTarget(buildDamagePacket({
  attacker: null, target: t, weapon: null, amount, options: { damageType: type, hit },
  workflowContext: { damage: { hit, damageType: type }, ...(area ? { attack: { isArea: true }, isArea: true, ruleData: { areaAttack: true, evasionApplies: true, ...ruleData } } : {}), special },
}), t);
installOutcomeStubs();
const disruptor = (k = 'weapon-disruptor-pistol') => withAmmo(k, 50);
try {

// ======================================================================================================================================
// A. EFFECTIVE DAMAGE THRESHOLD -- the Disruptor lowers it for ITS damage event only                                           [points 1-5]
// ======================================================================================================================================
{
  const A = makeActor({ items: [] });
  const tgt = mkT({ dt: 25 });
  // 1: a disruptor attack carries the threshold-stage adjustment (structured operation.damageThresholdAdjustment) in the workflow; an ordinary weapon carries none
  for (const k of ['weapon-disruptor-pistol', 'weapon-disruptor-rifle', 'weapon-sonic-disruptor']) {
    const w = disruptor(k); const AA = makeActor({ items: [w] });
    const { special } = await attackRecords(AA, w, mkT());
    assert.equal(special?.thresholdAdjustment, -5, `${k}: the attack carries the -5 threshold adjustment`);
  }
  { const w = withAmmo('weapon-blaster-pistol', 50); const AA = makeActor({ items: [w] }); const { special } = await attackRecords(AA, w, mkT()); assert.equal(special?.thresholdAdjustment, undefined, 'an ordinary weapon carries none'); }
  // 2: the packet rule hands the adjustment to the damage event (options) and only when the weapon declared it
  const withAdj = pkt('d', tgt, { special: { thresholdAdjustment: -5 }, type: 'energy' });
  assert.equal(withAdj.options.thresholdAdjustment, -5);
  assert.equal(pkt('o', tgt, { special: null, type: 'energy' }).options.thresholdAdjustment, undefined);
  // 3: same target, same damage: the ordinary event does not exceed the threshold; the disruptor event does (Condition Track moves) ONLY because of the adjustment
  const ordinary = await resolve(mkT({ dt: 25 }), 22, {});
  const lowered = await resolve(mkT({ dt: 25 }), 22, { thresholdAdjustment: -5 });
  assert.deepEqual([ordinary.thresholdExceeded, ordinary.thresholdTotal, ordinary.conditionDelta], [false, 25, 0]);
  assert.deepEqual([lowered.thresholdExceeded, lowered.thresholdTotal, lowered.conditionDelta], [true, 20, 1]);
  // 4: the stored threshold is never modified; the effective value exists only in this event's result, and it is floored at 0
  assert.equal(tgt.system.derived.damageThreshold, 25);
  assert.equal(ThresholdEngine.evaluateThreshold({ target: tgt, damage: 20, thresholdAdjustment: -5 }).thresholdExceeded, true);
  assert.equal(ThresholdEngine.evaluateThreshold({ target: tgt, damage: 20 }).thresholdExceeded, false);
  assert.equal((await ThresholdEngine.getDamageThreshold(tgt, { thresholdAdjustment: -30 })).total, 0, 'never below 0');
  assert.equal(tgt.system.derived.damageThreshold, 25, 'still untouched after the lowered events');
  // 5: the disintegration trigger uses the SAME lowered threshold: a killing blow that only exceeds the adjusted threshold kills (dead) for the disruptor only
  const lethalOrdinary = await resolve(mkT({ dt: 25, hp: 20 }), 22, {});
  const lethalDisruptor = await resolve(mkT({ dt: 25, hp: 20 }), 22, { thresholdAdjustment: -5 });
  assert.equal(lethalOrdinary.dead, false); assert.equal(lethalDisruptor.dead, true);
  ok('Disruptor: the -5 adjustment travels in the workflow, shapes only this damage event\'s effective threshold (22 vs DT 25: no CT move for an ordinary weapon, CT +1 for the disruptor), never changes the stored threshold, floors at 0, and decides kill state the same way');
}

// ======================================================================================================================================
// B. EMBEDDED SHRAPNEL (Ripper) -- a separate immediate damage event after a proven threshold + condition-track result         [points 6-12]
// ======================================================================================================================================
{
  const w = withAmmo('weapon-ripper', 50); const A = makeActor({ items: [w] }); const tgt = mkT({ dt: 25 });
  const { records, special } = await attackRecords(A, w, tgt);
  const rec = records.find((r) => r.kind === 'bonus-damage');
  assert.ok(rec, 'the Ripper attack carries the shrapnel record'); assert.equal(rec.applyCondition, 'threshold-exceeded-and-condition-track-moved'); assert.equal(rec.payload.formula, '1d4');
  assert.deepEqual(rec.source, { identityKey: 'weapon-ripper', profileId: rec.source.profileId }); assert.ok(rec.source.profileId, 'provenance: canonical identity + profile');
  rolls.map['1d4'] = 3;
  const exceeded = { thresholdExceeded: true, conditionDelta: 1, dead: false, destroyed: false };
  // 6: threshold exceeded AND the Condition Track moved -> the extra 1d4 is a separate damage event of the same type, dealt once
  let msg = mkMsg(); let out = await applyFx(special, tgt, { weapon: w, resolution: exceeded, message: msg, damageType: 'piercing' });
  assert.equal(out.applied.length, 1); assert.equal(delegated.damage.length, 1);
  assert.deepEqual([delegated.damage[0].packet.amount, delegated.damage[0].packet.type], [3, 'piercing']);
  assert.equal(delegated.damage[0].packet.options.outcomeRider, rec.id, 'provenance of the extra event');
  // 7: replay of the same Apply Damage event deals nothing more (receipt)
  out = await applyFx(special, tgt, { weapon: w, resolution: exceeded, message: msg, damageType: 'piercing' });
  assert.equal(out.applied.length, 0); assert.equal(out.skipped[0].reason, 'already-applied'); assert.equal(delegated.damage.length, 1);
  // 8: threshold NOT exceeded / CT NOT moved / no damage / no resolution -> no shrapnel (never guessed)
  for (const [label, resolution, hpAfter, reason] of [
    ['below threshold', { thresholdExceeded: false, conditionDelta: 0 }, 30, 'condition-not-met'],
    ['exceeded but the Condition Track did not move', { thresholdExceeded: true, conditionDelta: 0 }, 30, 'condition-not-met'],
    ['no damage reached HP', exceeded, 40, 'no-damage-dealt'],
    ['no resolved damage event handed to the rider stage', null, 30, 'damage-event-unavailable'],
  ]) {
    delegated.damage.length = 0; out = await applyFx(special, tgt, { weapon: w, resolution, hpAfter, message: mkMsg() });
    assert.equal(out.applied.length, 0, label); assert.equal(out.skipped[0].reason, reason, label); assert.equal(delegated.damage.length, 0);
  }
  // 9: a miss never fires it (attack-time part of the trigger)
  const missT = mkT({ reflex: 40 }); const miss = await attackRecords(A, w, missT);
  assert.equal(miss.records.find((r) => r.kind === 'bonus-damage').fired, false);
  // 10: no recursion: the extra event is an ActorEngine.applyDamage call carrying no records of its own; the rider stage is entered once per Apply Damage
  delegated.damage.length = 0; msg = mkMsg(); await applyFx(special, tgt, { weapon: w, resolution: exceeded, message: msg });
  assert.equal(delegated.damage.length, 1); assert.equal(delegated.damage[0].packet.options.workflowContext, undefined); assert.equal(delegated.damage[0].packet.options.special, undefined);
  ok('Ripper: embedded shrapnel is one separate 1d4 event of the triggering damage type, only after a proven threshold-exceeded + Condition-Track-moved result; replay, no-damage, no-resolution, below-threshold and miss deal none; the extra event carries no riders (no recursion) and keeps provenance');
}

// ======================================================================================================================================
// C. EMP GRENADE target classes -- structural, composes with the area hit / miss / Evasion rules                               [points 13-20]
// ======================================================================================================================================
{
  const w = withAmmo('weapon-emp-grenade', 20); const A = makeActor({ items: [w] });
  const { special } = await attackRecords(A, w, mkT());
  assert.ok(special?.targetRules?.electronic && special.targetRules.nonCybernetic, 'the structured rules travel in the workflow');
  const sp = (answers = {}) => ({ ...special, answers });
  const dmgOf = (t, hit, answers, extra = {}) => pkt('emp', t, { special: sp(answers), hit, area: true, ...extra });
  // 13: electronic classes (droid) -- full on a hit, half on a miss (the profile's generic miss rule is replaced by the weapon's own)
  const droid = mkT({ id: 'd1', droid: true });
  assert.equal(dmgOf(droid, true, {}).amount, 20); assert.equal(dmgOf(droid, false, {}).amount, 10);
  // 14: a vehicle is electronic too
  const vehicle = { ...mkT({ id: 'v1' }), type: 'vehicle' };
  assert.equal(dmgOf(vehicle, true, {}).amount, 20); assert.equal(dmgOf(vehicle, false, {}).amount, 10);
  // 15: an ORGANIC target whose cybernetic status is unobserved is refused (never read as false); the question key is per target
  const organic = mkT({ id: 'o1' });
  const unresolved = dmgOf(organic, true, {});
  assert.equal(unresolved.disposition.damageAllowed, false); assert.equal(unresolved.flags.targetClassUnresolved, true); assert.equal(unresolved.amount, 0);
  // 16: answered non-cybernetic -- half on a hit, nothing on a miss; answered cybernetically enhanced -- electronic class (full / half), ion-eligible
  const key = 'target-class:cybernetic:o1';
  assert.equal(dmgOf(organic, true, { [key]: false }).amount, 10); assert.equal(dmgOf(organic, false, { [key]: false }).disposition.damageAllowed, false);
  assert.equal(dmgOf(organic, true, { [key]: true }).amount, 20); assert.equal(dmgOf(organic, false, { [key]: true }).amount, 10);
  assert.equal(dmgOf(organic, true, { [key]: true }).flags.ionEligibleByClass, true);
  // 17: Evasion modifies the area attack normally: Evasion on a miss -> none even for an electronic class; Improved Evasion on a hit halves
  const evDroid = { ...mkT({ id: 'd2', droid: true, evasion: true }) };
  assert.equal(dmgOf(evDroid, false, {}).amount, 0);
  const impDroid = mkT({ id: 'd3', droid: true, improved: true });
  assert.equal(dmgOf(impDroid, true, {}).amount, 10);
  // 18: the question is asked once, stored, and flows into the packet rule; an unanswered question leaves the target refused
  const msg = mkMsg(); const asked = ask(async (q) => (q.id === key ? false : null));
  let s2 = await CSE.resolveTargetClassFacts({ special, target: organic, message: msg, weaponLabel: 'EMP' });
  assert.equal(s2.answers[key], false); assert.deepEqual(asked, [key]);
  s2 = await CSE.resolveTargetClassFacts({ special: s2, target: organic, message: msg, weaponLabel: 'EMP' }); assert.equal(asked.length, 1, 'never re-asked');
  s2 = await CSE.resolveTargetClassFacts({ special, target: droid, message: msg }); assert.equal(s2, special, 'droids are classified structurally and never asked');
  rt.setSpecialPromptProvider(async () => null);
  assert.equal((await CSE.resolveTargetClassFacts({ special, target: mkT({ id: 'o2' }), message: mkMsg() })).answers?.['target-class:cybernetic:o2'], undefined);
  rt.setSpecialPromptProvider(null);
  // 19: the zero-HP rider: pre-halving ion damage that would reduce an electronic-class target to 0 HP -> -5 CT and disabled; not for non-cybernetic organics / smaller damage
  const zero = special.records.find((r) => r.kind === 'zero-hp-ct-disable');
  assert.ok(zero); assert.equal(zero.steps, 5);
  const dd = mkT({ id: 'd4', droid: true, hp: 8 });
  let out = await applyFx(special, dd, { hpBefore: 8, hpAfter: 0, rawAmount: 20, appliedAmount: 20, resolution: { destroyed: false } });
  assert.equal(out.applied.length, 1); assert.equal(delegated.ct.at(-1).step, 5);
  assert.ok(delegated.updates.some((u) => u.upd['system.droidState.status'] === 'disabled'), 'the droid is disabled (not destroyed)');
  out = await applyFx(special, mkT({ id: 'd5', droid: true, hp: 30 }), { hpBefore: 30, hpAfter: 20, rawAmount: 10, appliedAmount: 10 });
  assert.equal(out.skipped.find((x) => x.id === zero.id).reason, 'threshold-not-met');
  out = await applyFx({ ...special, answers: { [key]: false } }, organic, { hpBefore: 5, hpAfter: 0, rawAmount: 20, appliedAmount: 10, message: mkMsg() });
  assert.equal(out.skipped.find((x) => x.id === zero.id).reason, 'not-electronic-class');
  ok('EMP Grenade: electronic classes (droid / vehicle) take full-on-hit / half-on-miss, organics need the stored cybernetic answer (unanswered -> refused, never false), non-cybernetic half / none, Evasion composes, the zero-HP rider moves -5 CT and disables only an electronic-class target');
}

// ======================================================================================================================================
// D. CONDITION-TRACK RIDERS -- Gas Grenade (area hit / Evasion / immunity), Carbonite (moved by this damage), Aurial / CryoBan (> Fortitude)   [21-29]
// ======================================================================================================================================
{
  // Gas Grenade
  const gw = withAmmo('weapon-gas-grenade', 5); const GA = makeActor({ items: [gw] }); const t = mkT({ id: 'g1' });
  const { records } = await attackRecords(GA, gw, t, { areaAttack: true });
  const ct = records.filter((r) => r.kind === 'ct-rider');
  assert.equal(ct.length, 1, 'the operation carriers conditionTrackOnHit / conditionTrackWithEvasion are DUPLICATES: exactly ONE rider executes');
  assert.deepEqual([ct[0].steps, ct[0].payload.evasionSteps, ct[0].payload.immunity, ct[0].requiresDamage], [2, 1, 'protected-from-atmospheric-hazards', false]);
  const gasSpecial = { records: ct, answers: { [`immunity:protected-from-atmospheric-hazards:${t.id}`]: false } };
  // 21: hit -> -2 steps; a miss has no effect; the same message + target applies once
  let msg = mkMsg(); let out = await applyFx(gasSpecial, t, { message: msg });
  assert.equal(out.applied.length, 1); assert.equal(delegated.ct.at(-1).step, 2);
  out = await applyFx(gasSpecial, t, { message: msg }); assert.equal(out.skipped[0].reason, 'already-applied'); assert.equal(delegated.ct.filter((c) => c.actor === t.id).length, 1, 'CT moved once');
  assert.equal((await applyFx({ records: [{ ...ct[0], fired: false }], answers: gasSpecial.answers }, mkT({ id: 'g2' }), { message: mkMsg() })).skipped[0].reason, 'trigger-not-met');
  // 22: Evasion lowers the shift to -1
  const ev = mkT({ id: 'g3', evasion: true }); delegated.ct.length = 0;
  await applyFx({ records: ct, answers: { [`immunity:protected-from-atmospheric-hazards:g3`]: false } }, ev, { message: mkMsg() });
  assert.equal(delegated.ct.at(-1).step, 1, 'Evasion: -1 step');
  // 23: atmospheric protection is immune; the unobserved fact is asked once and an unanswered fact applies nothing
  out = await applyFx({ records: ct, answers: { [`immunity:protected-from-atmospheric-hazards:g4`]: true } }, mkT({ id: 'g4' }), { message: mkMsg() }); assert.equal(out.skipped[0].reason, 'immune');
  const askedG = ask(async () => null); out = await applyFx({ records: ct }, mkT({ id: 'g5' }), { message: mkMsg() });
  assert.equal(out.skipped[0].reason, 'unresolved'); assert.ok(askedG.some((i) => i.startsWith('immunity:')));
  rt.setSpecialPromptProvider(null);

  // Carbonite: immobilized ONLY when this damage proves it moved the target down the Condition Track
  const cw = withAmmo('weapon-carbonite-rifle', 20); const CA = makeActor({ items: [cw] });
  const carb = await attackRecords(CA, cw, mkT());
  const crec = carb.records.find((r) => r.kind === 'status-effect');
  assert.deepEqual([crec.applyCondition, crec.payload.status, crec.payload.duration], ['target-moved-down-condition-track', 'immobilized', { owner: 'target', through: 'end-of-next-turn' }]);
  const ctT = mkT({ id: 'c1' });
  out = await applyFx(carb.special, ctT, { resolution: { conditionDelta: 1 }, message: mkMsg() });
  assert.equal(out.applied.length, 1); const eff = ctT.effects.at(-1);
  assert.ok(eff.statuses.has('immobilized')); assert.equal(eff.flags['foundryvtt-swse'].effectIntent.duration, 'until-end-next-turn');
  assert.equal(eff.flags['foundryvtt-swse'].effectLifecycle.turnOwnerActorId, 'c1', 'timed by the TARGET\'s own next turn');
  assert.equal(eff.flags['foundryvtt-swse'].weaponEffect.source.identityKey, 'weapon-carbonite-rifle', 'provenance on the effect');
  out = await applyFx(carb.special, mkT({ id: 'c2' }), { resolution: { conditionDelta: 0 }, message: mkMsg() }); assert.equal(out.skipped[0].reason, 'condition-not-met');
  // 25: Aurial Blaster -- hit AND attack total EXCEEDS Fortitude (strict): -5 Perception until the end of the ATTACKER's next turn
  const aw = withAmmo('weapon-aurial-blaster', 50); const AAu = makeActor({ items: [aw] });
  const strict = await attackRecords(AAu, aw, mkT({ fort: 16 })); // total 16 vs Fortitude 16: equals, does NOT exceed
  assert.equal(strict.records.find((r) => r.kind === 'status-effect').fired, false, 'exceeds is strict');
  const above = await attackRecords(AAu, aw, mkT({ fort: 15 })); const arec = above.records.find((r) => r.kind === 'status-effect');
  assert.equal(arec.fired, true); assert.deepEqual(arec.payload.skillPenalty, { skill: 'perception', amount: 5 });
  const aT = mkT({ id: 'au1' }); await applyFx(above.special, aT, { attacker: AAu, weapon: aw, message: mkMsg() });
  const aeff = aT.effects.at(-1); const intent = aeff.flags['foundryvtt-swse'].effectIntent;
  assert.deepEqual([intent.category, intent.target, intent.operation, intent.amount], ['skill', 'perception', 'decrease', 5]);
  assert.equal(aeff.flags['foundryvtt-swse'].effectLifecycle.turnOwnerActorId, 'a1', 'timed by the ATTACKER\'s turns');
  // 26: CryoBan -- speed becomes 2 squares: a penalty equal to the difference with the speed observed (6 -> 2 = -4), never raising speed
  const cbw = withAmmo('weapon-cryoban-grenade', 5); const CBA = makeActor({ items: [cbw] });
  const cb = await attackRecords(CBA, cbw, mkT({ fort: 10 })); const cT = mkT({ id: 'cb1' });
  await applyFx(cb.special, cT, { message: mkMsg() });
  const ci = cT.effects.at(-1).flags['foundryvtt-swse'].effectIntent;
  assert.deepEqual([ci.category, ci.target, ci.operation, ci.amount], ['speed', 'base', 'decrease', 4]);
  const slow = mkT({ id: 'cb2' }); slow.system.derived.speed.total = 2;
  assert.equal((await applyFx(cb.special, slow, { message: mkMsg() })).skipped[0].reason, 'speed-already-at-or-below');
  ok('Condition-track riders: Gas Grenade (one rider; -2 / -1 with Evasion; immune / unresolved asked once and stored; applied once), Carbonite (immobilized only when THIS damage moved the track), Aurial (strict > Fortitude, -5 Perception, attacker-timed), CryoBan (speed to 2, never raised)');
}

// ======================================================================================================================================
// E. POISON / TOXIN -- delivery requires damage and a SELECTED poison; Neural Inhibitor on the PoisonEngine                    [points 30-38]
// ======================================================================================================================================
{
  // Darter: capability + damage requirement; no selected poison -> no effect (the real PoisonEngine function decides)
  const dw = withAmmo('weapon-darter', 20); const DA = makeActor({ items: [dw] }); const dT = mkT({ id: 'dt1' });
  const dart = await attackRecords(DA, dw, dT); const drec = dart.records.find((r) => r.kind === 'poison-delivery');
  assert.equal(drec.requiresDamage, true); assert.equal(drec.fired, true);
  let out = await applyFx(dart.special, dT, { attacker: DA, weapon: dw, hpBefore: 40, hpAfter: 30, message: mkMsg() });
  assert.equal(delegated.weaponPoison.length, 1); assert.equal(out.skipped[0].reason, 'no-poison-selected-or-no-damage', 'no poison selected -> no poison effect');
  // a damage requirement failure never reaches the engine
  delegated.weaponPoison.length = 0; out = await applyFx(dart.special, dT, { attacker: DA, weapon: dw, hpBefore: 40, hpAfter: 40, message: mkMsg() });
  assert.equal(out.skipped[0].reason, 'no-damage-dealt'); assert.equal(delegated.weaponPoison.length, 0);
  // a poison SELECTED on the owned weapon (PoisonEngine coating) is delivered once, through the engine, only when damage is dealt
  dw.flags.swse = { ...(dw.flags.swse ?? {}), appliedPoison: { poisonKey: 'paralytic-poison', delivery: 'contact', remainingTriggers: 1 } };
  PoisonEngine.applyWeaponPoisonFromAttack = async (a) => { delegated.weaponPoison.push(a); return { success: true, poison: { key: 'paralytic-poison' } }; };
  out = await applyFx(dart.special, dT, { attacker: DA, weapon: dw, hpBefore: 40, hpAfter: 30, message: mkMsg() });
  assert.equal(out.applied.length, 1); assert.equal(delegated.weaponPoison.at(-1).damage, 10); assert.equal(delegated.weaponPoison.at(-1).weapon, dw);
  // Needler: ammunition MAY carry contact poison -- capability only
  const nw = withAmmo('weapon-needler', 20); const NA = makeActor({ items: [nw] });
  const need = await attackRecords(NA, nw, mkT()); const nrec = need.records.find((r) => r.kind === 'poison-delivery');
  assert.equal(nrec.payload.capabilityOnly, true); assert.equal(nrec.source.identityKey, 'weapon-needler');
  PoisonEngine.applyWeaponPoisonFromAttack = origEng.pWeapon.bind(PoisonEngine);
  out = await applyFx(need.special, mkT({ id: 'n1' }), { attacker: NA, weapon: nw, message: mkMsg() });
  assert.equal(out.applied.length, 0, 'the needler with no selected poison creates none');
  // Neural Inhibitor: a hit starts a persistent secondary-attack toxin through the PoisonEngine definition built from the STRUCTURED effect
  const iw = withAmmo('weapon-neural-inhibitor', 20); const IA = makeActor({ items: [iw] }); const iT = mkT({ id: 'ni1' });
  const neural = await attackRecords(IA, iw, iT); const prec = neural.records.find((r) => r.kind === 'persistent-poison');
  assert.equal(prec.fired, true);
  const built = OE.poisonDefinitionFromPersistentEffect(prec.payload.effect, { key: 'k', name: 'N' });
  assert.equal(built.ok, true);
  const d = built.definition;
  assert.deepEqual([d.attack.bonus, d.attack.defense, d.treatment.skill, d.treatment.dc, d.damage.conditionTrack.steps, d.damage.conditionTrack.persistent, d.special.onFailure, d.special.endsWhenTargetUnconscious],
    [5, 'fortitude', 'treatInjury', 20, 1, true, { continues: true, attackBonusIncrement: 1, cumulative: true }, true]);
  out = await applyFx(neural.special, iT, { attacker: IA, weapon: iw, hpBefore: 40, hpAfter: 30, message: mkMsg() });
  assert.equal(delegated.poison.length, 1); assert.equal(delegated.poison[0].delivery, 'injected'); assert.equal(delegated.poison[0].sourceItem, iw);
  assert.deepEqual(delegated.poison[0].poisonDefinition.special.onFailure.attackBonusIncrement, 1);
  assert.equal(delegated.poison[0].poisonDefinition.key, 'weapon-neural-inhibitor-persistent-neurotoxin', 'stable source identity in the instance key');
  // an incomplete structure is unbuildable (never invented)
  assert.equal(OE.poisonDefinitionFromPersistentEffect({ ...prec.payload.effect, cure: null }, { key: 'k', name: 'N' }).ok, false);
  ok('Poison: delivery needs damage AND a poison selected on the owned weapon (none -> none, capability alone creates nothing); Neural Inhibitor runs through a PoisonEngine definition built from the structured effect (+5 vs Fortitude, -1 persistent, DC 20 Treat Injury, cumulative +1 on failure, ends if unconscious)');
}

// ---- the real PoisonEngine behaviours the neural toxin relies on ----------------------------------------------------------------------------------
{
  const def = OE.poisonDefinitionFromPersistentEffect(JSON.parse(fs.readFileSync('data/weapons/canonical-weapon-registry.json', 'utf8')).identities.find((i) => i.identityKey === 'weapon-neural-inhibitor').canonicalStats.attackProfiles[0].triggeredEffects[0], { key: 'neural', name: 'Neural' }).definition;
  const actor = { id: 'p1', type: 'npc', effects: [], flags: { swse: {} }, system: { hp: { value: 20 }, conditionTrack: { current: 0 } } };
  // 33: a persistent toxin that keeps attacking after a failure is tracked from the start
  assert.equal(PoisonEngine._shouldTrackInstance(def, { success: false }, false), true);
  // 34: a failed poison attack raises the NEXT attack by +1 (cumulative) and keeps the instance; success resets it
  const upserts = []; const origUp = PoisonEngine._upsertPoisonInstance; PoisonEngine._upsertPoisonInstance = async (a, i) => { upserts.push(JSON.parse(JSON.stringify(i))); };
  const inst = { id: 'i1', poisonKey: 'neural', definition: def, attackBonusAdjustment: 0, consecutiveFailures: 0 };
  await PoisonEngine._handlePoisonFailure(actor, def, inst, { hit: false, total: 5, defense: 15, margin: -10 });
  await PoisonEngine._handlePoisonFailure(actor, def, inst, { hit: false, total: 6, defense: 15, margin: -9 });
  assert.equal(inst.attackBonusAdjustment, 2, 'cumulative +1 per failure, set in place for the engine\'s own upsert');
  assert.equal(PoisonEngine._getPoisonAttackBonus({ poison: def, instance: inst, isInitial: false }), 7, '+5 base +2 cumulative');
  assert.equal(PoisonEngine._advanceInstanceAfterSuccess(inst, { hit: true, total: 20, defense: 15, margin: 5 }, def).attackBonusAdjustment, 0, 'until one succeeds');
  PoisonEngine._upsertPoisonInstance = origUp;
  // 35: it dissipates when the target falls unconscious (CT step 5 / unconscious status / 0 HP) and is not attacked again
  assert.equal(PoisonEngine._isUnconscious(actor), false);
  assert.equal(PoisonEngine._isUnconscious({ ...actor, system: { hp: { value: 20 }, conditionTrack: { current: 5 } } }), true);
  assert.equal(PoisonEngine._isUnconscious({ ...actor, system: { hp: { value: 0 }, conditionTrack: { current: 0 } } }), true);
  const cleared = []; const origClear = PoisonEngine.clearPoison; PoisonEngine.clearPoison = async (a, id, o) => { cleared.push([id, o.reason]); };
  const origRes = PoisonEngine.resolvePoisonAttack; let attacked = 0; PoisonEngine.resolvePoisonAttack = async () => { attacked += 1; return {}; };
  const sleeper = { ...actor, flags: { swse: { activePoisons: [{ id: 'i1', poisonKey: 'neural', definition: def }] } }, system: { hp: { value: 0 }, conditionTrack: { current: 5 } } };
  await PoisonEngine.tickPoisons(sleeper, { trigger: 'startOfTurn' });
  assert.deepEqual(cleared, [['i1', 'target fell unconscious']]); assert.equal(attacked, 0);
  const awake = { ...actor, flags: { swse: { activePoisons: [{ id: 'i2', poisonKey: 'neural', definition: def }] } } };
  await PoisonEngine.tickPoisons(awake, { trigger: 'startOfTurn' }); assert.equal(attacked, 1, 'an awake target is attacked again at the start of its turn');
  PoisonEngine.clearPoison = origClear; PoisonEngine.resolvePoisonAttack = origRes;
  // 36: a weapon-defined toxin carries its OWN definition on the instance (the registry does not know it) and cure metadata survives
  const instBuilt = PoisonEngine._buildPoisonInstance({ sourceActor: null, targetActor: actor, poison: def, delivery: 'injected', sourceItem: null, exposed: false });
  assert.deepEqual([instBuilt.definition.treatment.dc, instBuilt.treatment.dc, instBuilt.treatment.skill], [20, 20, 'treatInjury']);
  assert.equal(PoisonEngine._getTreatmentDC({ poison: instBuilt.definition, instance: instBuilt, sourceActor: null, healer: null }), 20);
  ok('PoisonEngine: persistent toxin tracked from the start, cumulative +1 on failure (reset on success), dissipates when the target is unconscious, awake targets are attacked again; a weapon-defined toxin carries its own definition and its DC 20 Treat Injury cure');
}

// ======================================================================================================================================
// F. TEHK'LA BLADE -- one delayed bleeding instance at the start of the target's next turn                                     [points 39-41]
// ======================================================================================================================================
{
  const w = withAmmo('unmapped::Tehkla Blade', 20); const A = makeActor({ items: [w] });
  const both = await attackRecords(A, w, mkT({ id: 'th1', reflex: 16, fort: 16 })); // total 16 equals BOTH defenses: "equals or exceeds"
  const rec = both.records.find((r) => r.kind === 'delayed-damage');
  assert.equal(rec.fired, true); assert.deepEqual(rec.payload, { formula: '1d6', qualifiers: ['bleeding'], timing: 'start-of-target-next-turn' });
  const tgt = mkT({ id: 'th1' }); const msg = mkMsg();
  await applyFx(both.special, tgt, { attacker: A, weapon: w, message: msg, label: 'Tehk\'la Blade' });
  assert.equal(delegated.recurring.length, 1);
  const q = delegated.recurring[0].spec;
  assert.deepEqual([q.formula, q.damageType, q.trigger, q.remainingTriggers], ['1d6', 'bleeding', 'startOfTurn', 1], 'one trigger at the start of the target\'s next turn; nothing else is invented');
  assert.equal(delegated.recurring[0].o.sourceItem, w);
  // replay: no second instance; a different hit (different message) is an independent instance (the entry does not say it stops stacking)
  await applyFx(both.special, tgt, { attacker: A, weapon: w, message: msg }); assert.equal(delegated.recurring.length, 1);
  await applyFx(both.special, tgt, { attacker: A, weapon: w, message: mkMsg() }); assert.equal(delegated.recurring.length, 2);
  assert.notEqual(delegated.recurring[0].spec.id, delegated.recurring[1].spec.id);
  // not both defenses -> no bleeding
  const one = await attackRecords(A, w, mkT({ id: 'th2', reflex: 12, fort: 20 }));
  assert.equal(one.records.find((r) => r.kind === 'delayed-damage').fired, false);
  delegated.recurring.length = 0; assert.equal((await applyFx(one.special, mkT({ id: 'th2' }), { attacker: A, weapon: w, message: mkMsg() })).skipped[0].reason, 'trigger-not-met'); assert.equal(delegated.recurring.length, 0);
  // the spec the real RecurringDamageEngine normalizes keeps the weapon provenance and ticks once (remainingTriggers 1)
  const norm = RecurringDamageEngine.normalizeRecurringDamageSpec(q, { sourceActor: A, sourceItem: w });
  assert.deepEqual([norm.formula, norm.damageType, norm.trigger, norm.remainingTriggers, norm.sourceItemId], ['1d6', 'bleeding', 'startOfTurn', 1, w.id]);
  ok('Tehk\'la Blade: equals-or-exceeds BOTH defenses queues exactly one 1d6 bleeding instance for the start of the target\'s next turn (replay-safe, independent per hit, provenance kept); one defense only -> none');
}

// ======================================================================================================================================
// G. STATUS EFFECTS -- Concussion (prone), Flash Canister / Flash Rocket (effect-only), Wrist Rocket nerve toxin, Verpine (blocked)    [points 42-52]
// ======================================================================================================================================
{
  // Concussion Rifle: the attack targets Fortitude; a successful attack knocks the target prone (no damage threshold / amount requirement)
  const w = withAmmo('weapon-concussion-rifle', 25); const A = makeActor({ items: [w] });
  const hit = await attackRecords(A, w, mkT({ id: 'cr1', fort: 10 }));
  const rec = hit.records.find((r) => r.kind === 'status-effect');
  assert.deepEqual([rec.fired, rec.payload.status, rec.requiresDamage], [true, 'prone', false]); assert.equal(rec.source.identityKey, 'weapon-concussion-rifle');
  const tgt = mkT({ id: 'cr1' }); let out = await applyFx(hit.special, tgt, { attacker: A, weapon: w, message: mkMsg() });
  assert.equal(out.applied.length, 1); const eff = tgt.effects.at(-1);
  assert.deepEqual([eff.statuses.has('prone'), eff.flags.swse.condition, eff.flags['foundryvtt-swse'].effectIntent.duration], [true, 'prone', 'until-deactivated']);
  // the same Prone status is never stacked on a target that already carries THIS effect
  const msgR = mkMsg(); delegated.effects.length = 0; await applyFx(hit.special, tgt, { attacker: A, weapon: w, message: msgR });
  assert.equal(delegated.effects.length, 0);
  // a miss (Fortitude not beaten) never knocks prone
  const miss = await attackRecords(A, w, mkT({ id: 'cr2', fort: 30 })); assert.equal(miss.records.find((r) => r.kind === 'status-effect').fired, false);
  assert.equal((await applyFx(miss.special, mkT({ id: 'cr2' }), { message: mkMsg() })).skipped[0].reason, 'trigger-not-met');

  // Flash Canister (effect-only): a hit creature gets the total-concealment-against-bearer effect until the START of the attacker's next turn; blind creatures are immune
  const fw = withAmmo('weapon-flash-canister', 3); const FA = makeActor({ items: [fw] });
  const flash = await attackRecords(FA, fw, mkT({ id: 'fc1' }), { profileId: 'throw', areaAttack: true });
  const frec = flash.records.find((r) => r.kind === 'status-effect');
  assert.deepEqual([frec.payload.status, frec.payload.duration, frec.payload.immunity, frec.fired], ['total-concealment-against-bearer', { owner: 'attacker', through: 'start-of-next-turn' }, 'blind-creatures', true]);
  assert.ok(wfOf().special.mechanics.some((m) => m.effectOnly === true), 'an effect-only form is flagged in the workflow');
  assert.equal(posted.at(-1).context.damageActionLabel, 'Apply Effects', 'the card action of an effect-only form applies its effects');
  const fT = mkT({ id: 'fc1' }); const blindT = mkT({ id: 'fc2' }); blindT.effects.push({ id: 'b', statuses: new Set(['blinded']), disabled: false, flags: {} });
  out = await CSE.applyEffectOnlyOutcome({ special: { ...flash.special, answers: { 'immunity:blind-creatures:fc1': false } }, target: fT, attacker: FA, weapon: fw, message: mkMsg(), weaponLabel: 'Flash' });
  assert.equal(out.applied.length, 1); const fi = fT.effects.at(-1).flags['foundryvtt-swse'];
  assert.deepEqual([fi.effectLifecycle.turnOwnerActorId, fi.effectLifecycle.phase, fi.effectIntent.duration], ['a1', 'start', 'until-start-next-turn']);
  out = await CSE.applyEffectOnlyOutcome({ special: flash.special, target: blindT, attacker: FA, weapon: fw, message: mkMsg(), weaponLabel: 'Flash' });
  assert.equal(out.skipped[0].reason, 'immune', 'a Blinded creature is structurally immune (never asked)');

  // Wrist Rocket flash payload: the SAME status-effect machinery; blinded for 1d4 rounds (rolled)
  const rw = canon('weapon-wrist-rocket-launcher', { ammunition: { current: 1, max: 1 } }); const RA = makeActor({ items: [rw] });
  const wr = await attackRecords(RA, rw, mkT({ id: 'wr1' }), { payloadId: 'flash', profileId: 'primary', areaAttack: true });
  const wrec = wr.records.find((r) => r.kind === 'status-effect');
  assert.deepEqual([wrec.payload.status, wrec.payload.duration, wrec.source.payloadId], ['blinded', { dice: '1d4', unit: 'rounds', owner: 'target' }, 'flash']);
  rolls.map['1d4'] = 3; const wT = mkT({ id: 'wr1' });
  out = await applyFx(wr.special, wT, { attacker: RA, weapon: rw, message: mkMsg() });
  assert.equal(out.applied.length, 1); const wi = wT.effects.at(-1);
  assert.deepEqual([wi.statuses.has('blinded'), wi.flags['foundryvtt-swse'].effectIntent.duration], [true, '3-rounds']);

  // Wrist Rocket nerve toxin: a hit is followed by a secondary attack the corpus gives NO bonus for -> the result is asked once, stored, never invented
  const rw2 = canon('weapon-wrist-rocket-launcher', { ammunition: { current: 1, max: 1 } }); const RA2 = makeActor({ items: [rw2] }); // single shot: a fresh launcher
  const nv = await attackRecords(RA2, rw2, mkT({ id: 'wn1' }), { payloadId: 'hollow-tip-nerve-toxin', profileId: 'primary' });
  const nrec = nv.records.find((r) => r.kind === 'ct-rider'); assert.deepEqual([nrec.fired ?? null, nrec.steps, nrec.payload.secondaryDefense], [null, 2, 'fortitude'], 'unobserved (the serialized workflow drops nulls)');
  const askedN = ask(async (q) => (q.id === nrec.id ? true : null)); const nT = mkT({ id: 'wn1' }); const nMsg = mkMsg();
  out = await applyFx(nv.special, nT, { attacker: RA, weapon: rw, message: nMsg }); assert.equal(out.applied.length, 1); assert.equal(delegated.ct.at(-1).step, 2);
  await applyFx(nv.special, nT, { attacker: RA, weapon: rw, message: nMsg }); assert.deepEqual(askedN, [nrec.id], 'asked once');
  rt.setSpecialPromptProvider(async () => null); out = await applyFx(nv.special, mkT({ id: 'wn2' }), { message: mkMsg() }); assert.equal(out.skipped[0].reason, 'unresolved'); rt.setSpecialPromptProvider(null);
  assert.equal(rowOf('weapon-wrist-rocket-launcher::nerve-toxin-secondary-attack-bonus').disposition, 'DATA_COMPLETENESS');

  // Verpine Shattergun: the weapon-takes-damage trigger is NOT a target outcome -> BLOCKED (no weapon-object damage path), no record fabricated
  const vw = withAmmo('weapon-verpine-shattergun', 20); const VA = makeActor({ items: [vw] });
  const verp = await attackRecords(VA, vw, mkT());
  assert.equal(verp.records.filter((r) => r.kind === 'status-effect').length, 0);
  assert.equal(rowOf('weapon-verpine-shattergun::fragile-disable-on-damage').disposition, 'BLOCKED_BY_MISSING_SUBSYSTEM');
  ok('Status effects: Concussion prone (successful hit only, not stacked), Flash Canister concealment + Flash Rocket blinded (1d4 rounds) through one effect-only machinery with immunity (structural Blinded / asked once), Wrist nerve toxin prompted once, Verpine fragile BLOCKED, all with provenance');
}

// ======================================================================================================================================
// H. AMPHISTAFF VENOM SPIT outcome (usage stays I-B), MICRO GRENADE LAUNCHER, DISINTEGRATION                                    [points 53-60]
// ======================================================================================================================================
{
  // Venom Spit: effect-only; the I-B usage ledger is intact; the outcome executes once
  rt.setSpecialPromptProvider(null);
  const mkAm = () => { const w = withAmmo('unmapped::Amphistaff', 20); return [makeActor({ items: [w, ewp('Qxz Label', 'Amphistaff')] }), w]; };
  let [A, w] = mkAm(); setRound(1); globalThis.game.time = { worldTime: 1000 };
  const sp = await attackRecords(A, w, mkT({ id: 'vs1', reflex: 12, fort: 12 }), { profileId: 'venom-spit' });
  assert.ok(sp.r, 'the first spit proceeds');
  const vrec = sp.records.find((r) => r.kind === 'ct-rider'); assert.deepEqual([vrec.fired, vrec.steps, vrec.persistent, vrec.requiresDamage], [true, 1, true, false]);
  assert.ok(sp.special.mechanics.some((m) => m.effectOnly === true));
  const vT = mkT({ id: 'vs1' }); const vMsg = mkMsg();
  let out = await CSE.applyEffectOnlyOutcome({ special: sp.special, target: vT, attacker: A, weapon: w, message: vMsg });
  assert.equal(out.applied.length, 1); assert.equal(delegated.ct.at(-1).step, 1);
  await CSE.applyEffectOnlyOutcome({ special: sp.special, target: vT, attacker: A, weapon: w, message: vMsg });
  assert.equal(delegated.ct.filter((c) => c.actor === 'vs1').length, 1, 'the venom target effect executes once');
  // 5D-I-B: the once-per-24-hours usage ledger is untouched by the outcome work: a second spit before the window ends is refused before any cost
  const again = await attackRecords(A, w, mkT({ id: 'vs2' }), { profileId: 'venom-spit' }); assert.equal(again.r, null, 'usage ledger from I-B intact');
  // both defenses must be matched: Fortitude not met -> no effect
  [A, w] = mkAm(); const half = await attackRecords(A, w, mkT({ id: 'vs3', reflex: 12, fort: 30 }), { profileId: 'venom-spit' });
  assert.equal(half.records.find((r) => r.kind === 'ct-rider').fired, false);
  setRound(null); delete globalThis.game.time;

  // Micro Grenade Launcher: delegates to the loaded grenade; only its own "two fewer dice on a successful hit" applies
  const ml = canon('weapon-micro-grenade-launcher', { ammunition: { current: 4, max: 4 } });
  const L = (k, hit) => ({ weaponForm: { identityKey: 'weapon-micro-grenade-launcher', profileId: 'primary', loadedIdentityKey: k }, ...(hit === undefined ? {} : { hit }) });
  const g = rt.resolveCanonicalDamage(canon('weapon-frag-grenade'), { weaponForm: { identityKey: 'weapon-frag-grenade', profileId: 'primary' } });
  const m = rt.resolveCanonicalDamage(ml, L('weapon-frag-grenade'));
  assert.deepEqual([g.base, m.base], ['4d6', '2d6']); assert.deepEqual(m.damageTypes, g.damageTypes); assert.equal(m.areaShape.isArea, g.areaShape.isArea);
  assert.equal(rt.resolveCanonicalDamage(ml, L('weapon-frag-grenade', false)).base, '4d6', 'a miss keeps the grenade\'s ordinary dice');
  assert.equal(rt.resolveCanonicalDamage(ml, L('weapon-stun-grenade')).base, '2d6'); assert.throws(() => rt.resolveCanonicalDamage(ml, L('weapon-blaster-pistol')), (e) => e.code === 'payload-not-accepted');

  // Disintegration (Disruptor / Sonic Disruptor / Incinerator Rifle): only after Apply Damage PROVES killed (creature) / destroyed (droid, vehicle, object); stun never; nothing deleted
  const dw = disruptor('weapon-disruptor-rifle'); const DA = makeActor({ items: [dw] });
  const dis = await attackRecords(DA, dw, mkT());
  const drec = dis.records.find((r) => r.payload?.status === 'disintegrated');
  assert.equal(drec.applyCondition, 'target-killed-or-destroyed');
  const victim = mkT({ id: 'dv1', hp: 5 });
  out = await applyFx(dis.special, victim, { attacker: DA, weapon: dw, hpBefore: 5, hpAfter: 0, resolution: { dead: true, destroyed: false }, message: mkMsg() });
  assert.equal(out.applied.length, 1); assert.equal(victim.effects.at(-1).flags.swse.condition, 'disintegrated'); assert.ok(victim.id, 'the actor itself is untouched (no deletion)');
  const droidV = mkT({ id: 'dv2', droid: true, hp: 5 });
  out = await applyFx(dis.special, droidV, { attacker: DA, weapon: dw, hpBefore: 5, hpAfter: 0, resolution: { dead: false, destroyed: true }, message: mkMsg() }); assert.equal(out.applied.length, 1);
  out = await applyFx(dis.special, mkT({ id: 'dv3' }), { attacker: DA, weapon: dw, hpBefore: 20, hpAfter: 0, resolution: { dead: false, destroyed: false, unconscious: true }, message: mkMsg() });
  assert.equal(out.skipped.find((x) => x.id === drec.id).reason, 'condition-not-met', 'reduced to 0 HP but not killed: not disintegrated');
  const iw = withAmmo('weapon-incinerator-rifle', 20); const IA = makeActor({ items: [iw] });
  assert.ok((await attackRecords(IA, iw, mkT())).records.some((r) => r.payload?.status === 'disintegrated'), 'the same declaration works for the other three weapons');
  ok('Venom Spit outcome executes once (usage ledger from I-B intact, both defenses required); Micro Grenade Launcher delegates with only its own -2 dice on a hit; disintegration only after a PROVEN kill / destruction, never for mere 0 HP, nothing deleted');
}

// ======================================================================================================================================
// I. TURN-OWNED LIFECYCLE -- an effect carried by one combatant and timed by another actor's turns                              [points 61-66]
// ======================================================================================================================================
{
  const att = { id: 'att', effects: [], items: [] }, tgtA = { id: 'tgt', effects: [], items: [] }, oth = { id: 'oth', effects: [], items: [] };
  const turns = [att, tgtA, oth];
  const combatAt = (round, turn, id = 'c1') => ({ id, round, turn, turns: turns.map((a) => ({ actor: a })), combatant: { actor: turns[turn], id: `cb${turn}` }, combatants: turns.map((a) => ({ actor: a })) });
  const build = (duration, owner, phase, bearer, at = combatAt(1, 0)) => {
    const data = EffectIntentEngine.stampLifecycle({ name: 'x', flags: { 'foundryvtt-swse': { effectIntent: { category: 'condition', target: 'custom-status', duration, scope: 'self', application: 'always' } } } }, { actor: bearer, combat: at, turnOwnerActorId: owner, phase });
    return { id: `fx${++uid}`, disabled: false, ...data };
  };
  const live = (fx, bearer, round, turn) => { bearer.effects = [fx]; const c = combatAt(round, turn); globalThis.game = { user: { isGM: true }, combat: c }; const disabledNow = []; bearer.updateEmbeddedDocuments = async (_k, ups) => { for (const u of ups) { disabledNow.push(u._id); fx.disabled = true; } }; return { c, disabledNow }; };
  const expiresAt = async (fx, bearer, round, turn) => { fx.disabled = false; const { c, disabledNow } = live(fx, bearer, round, turn); await EffectIntentEngine.expireManagedEffectsForActor(bearer, { combat: c, timing: 'turn-start' }); return disabledNow.length === 1; };
  // 61: "until the end of the ATTACKER's next turn" (created on the attacker's turn): it lasts THROUGH the attacker's next turn and ends right after it
  const endAtt = build('until-end-next-turn', 'att', 'end', tgtA);
  assert.deepEqual([endAtt.flags['foundryvtt-swse'].effectLifecycle.turnOwnerActorId, endAtt.flags['foundryvtt-swse'].effectLifecycle.phase], ['att', 'end']);
  const seq = [];
  for (const [r, t] of [[1, 1], [1, 2], [2, 0], [2, 1]]) seq.push(await expiresAt(endAtt, tgtA, r, t));
  assert.deepEqual(seq, [false, false, false, true], 'not at the target\'s turn, not on the attacker\'s own next turn, ended once combat moves past it');
  // 62: "until the START of the attacker's next turn": ends when that turn begins
  const startAtt = build('until-start-next-turn', 'att', 'start', tgtA);
  assert.deepEqual([await expiresAt(startAtt, tgtA, 1, 2), await expiresAt(startAtt, tgtA, 2, 0)], [false, true]);
  // 63: "until the end of ITS (the target's) next turn": created on the attacker's turn, it lasts through the target's turn of the same round
  const endTgt = build('until-end-next-turn', 'tgt', 'end', tgtA);
  assert.deepEqual([await expiresAt(endTgt, tgtA, 1, 1), await expiresAt(endTgt, tgtA, 1, 2)], [false, true]);
  // 64: an effect carried by the target is examined on EVERY turn change (the hook sweeps all combatants), and a turn owner outside the combat never expires it here
  const ghost = build('until-end-next-turn', 'ghost', 'end', tgtA);
  assert.equal(await expiresAt(ghost, tgtA, 5, 2), false);
  // 65: legacy lifecycles (no turn owner) behave exactly as before: they expire only on their OWN actor's next turn
  const legacy = EffectIntentEngine.stampLifecycle({ name: 'l', flags: { 'foundryvtt-swse': { effectIntent: { category: 'condition', target: 'custom-status', duration: 'until-end-next-turn' } } } }, { actor: tgtA, combat: combatAt(1, 0) });
  const lfx = { id: 'lx', disabled: false, ...legacy };
  assert.deepEqual([await expiresAt(lfx, tgtA, 1, 2), await expiresAt(lfx, tgtA, 2, 1)], [false, true]);
  // 66: a turn-owned effect cannot outlive its combat (combat end expires it), and encounter-less legacy effects are unaffected
  const c = combatAt(1, 0); const keep = build('until-end-next-turn', 'att', 'end', tgtA); tgtA.effects = [keep]; globalThis.game = { user: { isGM: true }, combat: c }; const gone = [];
  tgtA.updateEmbeddedDocuments = async (_k, ups) => { gone.push(...ups.map((u) => u._id)); };
  await EffectIntentEngine.expireManagedEffectsForActor(tgtA, { combat: c, timing: 'combat-end' }); assert.deepEqual(gone, [keep.id]);
  globalThis.game = { combat: null, user: { targets: { first: () => null } } };
  ok('Lifecycle: a turn-owned effect lasts through the attacker\'s next turn (or the target\'s own), ends right after it / at its start for the "start" variant, is examined on every turn change, an absent owner never expires it, combat end clears it, legacy lifecycles are unchanged');
}

// ======================================================================================================================================
// J. ORDER, IDEMPOTENCY, PROVENANCE, SERIALIZATION                                                                                [points 67-73]
// ======================================================================================================================================
{
  // 67: the deterministic Apply Damage order: the damage event first (the resolution is an INPUT to the rider stage), then riders in record order
  const rw = withAmmo('weapon-ripper', 50); const RA = makeActor({ items: [rw] });
  const rip = await attackRecords(RA, rw, mkT());
  const seqLog = []; const oc = ActorEngine.setConditionStep, od = ActorEngine.applyDamage;
  ActorEngine.applyDamage = async (a, p) => { seqLog.push('bonus-damage'); return od(a, p); };
  const special = { ...rip.special, records: [{ id: 'ct-1', kind: 'ct-rider', steps: 1, direction: 'down', fired: true, requiresDamage: false }, ...rip.special.records] };
  ActorEngine.setConditionStep = async (a, s, src) => { seqLog.push('ct'); return oc(a, s, src); };
  await applyFx(special, mkT({ id: 'ord1' }), { weapon: rw, resolution: { thresholdExceeded: true, conditionDelta: 1 }, message: mkMsg() });
  assert.deepEqual(seqLog, ['ct', 'bonus-damage'], 'riders run in record order, after the resolved damage event');
  ActorEngine.setConditionStep = oc; ActorEngine.applyDamage = od;
  // 68: idempotency across kinds: replaying the SAME Apply Damage event applies nothing twice (HP rider, CT rider, status, poison, delayed damage)
  const gw = withAmmo('weapon-gas-grenade', 5); const GA = makeActor({ items: [gw] }); const gt = mkT({ id: 'idem1' });
  const gas = await attackRecords(GA, gw, gt, { areaAttack: true });
  const msg = mkMsg(); const answers = { 'immunity:protected-from-atmospheric-hazards:idem1': false }; const sp = { ...gas.special, answers };
  delegated.ct.length = 0; await applyFx(sp, gt, { message: msg }); await applyFx(sp, gt, { message: msg }); await applyFx(sp, gt, { message: msg });
  assert.equal(delegated.ct.length, 1);
  // 69: provenance survives Attack -> workflow -> Apply: canonical identity / profile / payload on the record, the receipt and the created effect
  const cw = withAmmo('weapon-carbonite-rifle', 20); const CA = makeActor({ items: [cw] }); const ct1 = mkT({ id: 'prov1' }); const mm = mkMsg();
  const carb = await attackRecords(CA, cw, ct1);
  await applyFx(carb.special, ct1, { weapon: cw, resolution: { conditionDelta: 1 }, message: mm });
  const wfe = ct1.effects.at(-1).flags['foundryvtt-swse'].weaponEffect;
  assert.deepEqual([wfe.source.identityKey, wfe.recordKey, wfe.attackerActorId ?? null, wfe.targetActorId], ['weapon-carbonite-rifle', `operation.conditionTrackRider:prov1`, null, 'prov1']);
  const receipt = CSE.findSpecialReceipt(mm, CSE.specialReceiptKey('operation.conditionTrackRider', 'prov1')); assert.equal(receipt.source.identityKey, 'weapon-carbonite-rifle');
  // 70: the serializer round trip keeps the new record fields (plain JSON), the threshold adjustment and the target rules, and drops anything else
  const rt1 = ser.summarizeCombatWorkflowContext({ special: { records: [{ id: 'r', kind: 'status-effect', fired: true, applyCondition: 'x', payload: { status: 'prone', fn: () => 1 }, source: { identityKey: 'k', junk: 1 } }], thresholdAdjustment: -5, targetRules: { electronic: { hitMultiplier: 1 } }, evil: 1 } });
  assert.deepEqual([rt1.special.thresholdAdjustment, rt1.special.targetRules.electronic.hitMultiplier, rt1.special.records[0].applyCondition, rt1.special.records[0].payload.status, rt1.special.evil], [-5, 1, 'x', 'prone', undefined]);
  assert.equal(rt1.special.records[0].payload.fn, undefined, 'functions never ride along');
  // 71: every status effect is created through ActorEngine.createActiveEffects with a documented source (the only legal ActiveEffect writer), never actor flags
  assert.ok(delegated.effects.every((e) => typeof e.opts?.source === 'string')); assert.equal(delegated.updates.filter((u) => Object.keys(u.upd).some((k) => /^flags\./.test(k))).length, 0);
  ok('Order and integrity: riders run after the resolved damage event in record order, replay is idempotent, provenance (identity / profile / payload / record / target) survives record -> receipt -> effect, the serializer keeps plain JSON only, every effect goes through ActorEngine');
}

// ======================================================================================================================================
// K. LEGACY / HOMEBREW, REGRESSION CONTRACTS, DISPOSITIONS, MANIFEST                                                           [points 72-80]
// ======================================================================================================================================
{
  // 72: a legacy / homebrew weapon carries no outcome record and is untouched
  const hb = legacy({ weaponCategory: 'ranged' }); const HA = makeActor({ items: [hb] }); reset();
  assert.ok(await attack(HA, hb, { target: mkT() })); assert.equal(recs().length, 0); assert.equal(wfOf()?.special?.thresholdAdjustment, undefined);
  // 73: an existing AUTO rider is unchanged: the 5D-E condition-track rider still executes once (Amphistaff spear) and the overwhelming-stun record shape is intact
  const aw = withAmmo('unmapped::Amphistaff', 20); const AA = makeActor({ items: [aw, ewp('Qxz Label', 'Amphistaff')] });
  const spear = await attackRecords(AA, aw, mkT({ fort: 10 }), { profileId: 'spear-melee', configurationId: 'spear' });
  const srec = spear.records.find((r) => r.kind === 'ct-rider'); assert.deepEqual([srec.steps, srec.persistent, srec.requiresDamage, srec.fired], [1, true, true, true]);
  delegated.ct.length = 0; const sT = mkT({ id: 'sp1' }); await applyFx(spear.special, sT, { message: mkMsg() }); assert.equal(delegated.ct.at(-1).step, 1);
  // 74: the stock droid / NPC flat-stat contract: a flat NPC (no derived threshold, no items) and a droid take the unchanged packet path; the new rules only add fields when declared
  const flat = { id: 'f1', name: 'Flat', type: 'npc', flags: { swse: {} }, effects: [], items: col([]), system: { hp: { value: 10, max: 10 }, conditionTrack: { current: 0 }, derived: {} } };
  const p0 = pkt('x', flat, { special: null, type: 'energy' }); assert.equal(p0.options.thresholdAdjustment, undefined); assert.equal(p0.flags.targetClass, undefined);
  // 75: dispositions: every residual key of the seam is classified; the deferrals name the later owner and the ledger rows say why
  const m = manifestICA.buildManifest(); assert.deepEqual(m.problems, [], m.problems.join('\n'));
  assert.equal(m.counters.I_C_A_UNCLASSIFIED, 0);
  for (const k of ['blastEffect', 'ongoingStunWhileTrapped', 'ongoingEffect', 'hurledObjectDamageRule', 'attackTreatedAs']) assert.equal(rowOf(k).disposition, 'DEFERRED_TO_I_C_B', k);
  assert.equal(rowOf('lightsaberTalentCompatibility').disposition, 'DEFERRED_TO_I_C_C');
  assert.equal(rowOf('lineOfSightOriginHeightSquares').disposition, 'DEFERRED_TO_I_D'); assert.equal(rowOf('survivalBasicForestJungleBonusWhenProficientAndCarried').disposition, 'DEFERRED_TO_I_D');
  assert.equal(rowOf('powerAttackExtraDamageAppliesToObjectsAndVehicles').disposition, 'DATA_COMPLETENESS'); assert.equal(rowOf('grievousWound').disposition, 'DATA_COMPLETENESS');
  for (const k of ['damageThresholdAdjustment', 'embeddedShrapnel', 'targetRules', 'conditionTrackRider', 'fortitudeRider', 'poisonDeliveryRequiresDamage', 'disintegratesOnKillOrDestruction']) assert.equal(rowOf(k).disposition, 'IMPLEMENTED', k);
  for (const k of ['conditionTrackOnHit', 'conditionTrackWithEvasion', 'persistentUntilCured', 'secondaryPoisonAttackBaseBonus', 'secondaryPoisonDefense', 'treatInjuryCureDC', 'venomSpit']) assert.equal(rowOf(k).disposition, 'DUPLICATE', k);
  // 76: the manifest file is current and the counters are the reported ones
  assert.equal(fs.readFileSync(manifestICA.OUT_JSON, 'utf8'), `${JSON.stringify(m, null, 2)}\n`, 'the committed I-C-A manifest is current');
  assert.equal(m.counters.I_C_A_INPUT_MECHANICS, m.counters.I_C_A_IMPLEMENTED + m.counters.I_C_A_DUPLICATES + m.counters.I_C_A_DATA_DEFECT + m.counters.I_C_A_DATA_COMPLETENESS + m.counters.I_C_A_DEFERRED_I_C_B + m.counters.I_C_A_DEFERRED_I_C_C + m.counters.I_C_A_DEFERRED_I_D + m.counters.I_C_A_BLOCKED);
  // 77: the stale special-mechanic census is reconciled: no unowned DEFER remains, prepared attacks are consumed, and the headline is no longer 42
  const census = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5d-e-special-mechanic-census.json', 'utf8'));
  assert.deepEqual(census.deferredWithoutOwner, []); assert.ok(census.mechanicsByPolicy.DEFER < 42);
  assert.equal(census.taxonomy['prepared-attack'].policy, 'AUTO');
  // Phase 5D-I-C-B consumed every I-C-B deferral: only the I-C-C and I-D owners remain
  assert.deepEqual(Object.keys(census.deferredByOwner).sort(), ['I-C-C', 'I-D']);
  // 78: the I-A / I-B manifests (earlier phase records) remain current and fully classified; the canonical-name heuristic count stays zero
  assert.equal(manifestIA.buildManifest().counters.I_A_UNCLASSIFIED_KEYS, 0); assert.equal(manifestIB.buildManifest().counters.I_B_UNCLASSIFIED_KEYS, 0);
  const closure = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5d-h-closure-census.json', 'utf8'));
  assert.equal(closure.counters?.CANONICAL_NAME_TEXT_HEURISTIC_USAGE ?? closure.CANONICAL_NAME_TEXT_HEURISTIC_USAGE ?? 0, 0);
  ok('Legacy weapons carry no outcome records; the 5D-E rider is unchanged; flat NPC packets are untouched; every seam key / mechanic is classified with a later owner where deferred; the I-C-A manifest is current; the stale special census is reconciled (no unowned DEFER, prepared attacks consumed)');
}
} finally { restoreOutcomeStubs(); restoreHarness(); unstubRolls(); rt.setSpecialPromptProvider(null); }
console.log(`${step} I-C-A checks passed`);
