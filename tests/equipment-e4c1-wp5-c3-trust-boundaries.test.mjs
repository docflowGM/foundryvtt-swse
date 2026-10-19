import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E4-C1 WP5-C3: C3-R1 virtual-unarmed variants and actor-object provenance, C3-R2 Force Point transaction, C3-R3 truthful reload persistence.
// Every negative case is deterministic and was reproduced against the WP5-C2 head (8fbd863) before the fix.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const F = await import('./helpers/ready-weapon-fixture.mjs');
const { SpeciesRegistry } = await F.installReadinessEnvironment();
const A_ = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const FS = await import('/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js');
const CR = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const J = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-transaction-journal.js');
const { fingerprintIntent } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js');
const Unarmed = await import('/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); a.filter = Array.prototype.filter.bind(a); return a; };
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Simple Weapons)', 'Weapon Proficiency (Advanced Melee Weapons)'].map((name, i) => ({ id: `pf${i}`, type: 'feat', name, flags: {}, system: {} }));
const makeActor = (weapons, extra = {}) => {
  const actor = {
    id: 'a1', name: 'Tester', type: 'character', flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col([...PROF, ...weapons]),
    system: { species: 'Human', size: 'Medium', bab: 6, level: 6, attributes: { str: ab(3), dex: ab(4), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'simple', 'advanced-melee'] },
    ...extra,
  };
  for (const w of weapons) w.actor = actor;
  return actor;
};
const target = () => ({ id: 't1', name: 'Dummy', type: 'npc', flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; }, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } } } });

// ---- counters: every expenditure / roll / write / message ------------------------------------------------------------------------------------
const c = { ammo: 0, rolls: 0, chat: 0, econ: 0, itemWrites: 0 };
const zero = () => { for (const k of Object.keys(c)) c[k] = 0; notes.error.length = notes.warn.length = notes.info.length = 0; };
AmmoSystem.spendForWorkflow = async () => { c.ammo += 1; return { success: true, spent: false }; };
RollEngine.safeRoll = async (f) => { c.rolls += 1; return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
SWSEChat.postRoll = async () => { c.chat += 1; return {}; };
const REAL_AEC_SPEND = ActionEconomyConsumption.spend;   // the real consumption authority, restored for the action-economy tests below
ActionEconomyConsumption.spend = async () => { c.econ += 1; return { allowed: true, committed: false, rollback: async () => {} }; };
ActorEngine.updateOwnedItems = async () => { c.itemWrites += 1; return []; };
const noEffect = () => assert.deepEqual(c, { ammo: 0, rolls: 0, chat: 0, econ: 0, itemWrites: 0 }, 'a readiness refusal spends, rolls, writes and posts nothing');
const refusedBy = (re) => assert.ok(notes.warn.some((m) => re.test(m)), `refusal message ${re} in ${JSON.stringify(notes.warn)}`);
const opts = { suppressChat: true, target: target() };
const narrated = (a, w) => A_.rollAttackAndDamageWithNarration(a, w, { suppressChat: true, target: target() });


globalThis.foundry.utils = globalThis.foundry.utils ?? {}; globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);

globalThis.foundry.utils = globalThis.foundry.utils ?? {}; globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
const pistol = (id, o = {}) => F.readiedWeapon(id, { key: F.PISTOL_KEY, ...o });
const REC = F.REC;
const unready = (w) => { Object.assign(w.system, REC('STOWED', null, [])); };
const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
const { ROLL_HOOKS } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');

// ------------------------------------------------------------------------------------------------ C3-R1 variants + actor provenance
{
  const a = makeActor([]);
  const plain = Unarmed.buildVirtualUnarmedWeapon(a);
  // legacy / hostile option bags cannot enhance a strike or smuggle mechanics in
  const hostile = Unarmed.buildVirtualUnarmedWeapon(a, { extraDamageDieSteps: 8, flagMarks: { slammerCrushExtraDie: true, martialArtsStep: 9 }, attackOptions: { slammer: true, ignoreDR: true } });
  assert.equal(hostile.system.damage, plain.system.damage, 'extraDamageDieSteps is not an input');
  assert.equal(hostile.flags.swse.slammerCrushExtraDie, undefined); assert.equal(hostile.flags.swse.martialArtsStep, plain.flags.swse.martialArtsStep);
  assert.equal(hostile.system.attackOptions.slammer, undefined); assert.equal(hostile.system.attackOptions.ignoreDR, undefined);
  // a caller cannot ask for the Slammer enhancement either: eligibility is resolved from the actor
  const slamNoCrush = Unarmed.buildVirtualUnarmedWeapon(a, { variant: 'slammer', extraDamageDieSteps: 5, crush: true, flagMarks: { slammerCrushExtraDie: true } });
  assert.equal(slamNoCrush.system.damage, plain.system.damage); assert.equal(slamNoCrush.flags.swse.slammerCrushExtraDie, undefined);
  assert.equal(slamNoCrush.system.attackOptions.slammer, true); assert.equal(slamNoCrush.id, 'swse-virtual-slammer');
  // an eligible actor (the Crush feat, or the stored Slammer rule) keeps the intended Crush die
  const crushFeat = { id: 'cf1', type: 'feat', name: 'Crush', flags: {}, system: {} };
  const crusher = makeActor([crushFeat]);
  const crushed = Unarmed.buildVirtualUnarmedWeapon(crusher, { variant: 'slammer' });
  assert.equal(crushed.system.damage, Unarmed.increaseDamageDie(Unarmed.buildVirtualUnarmedWeapon(crusher).system.damage, 1), 'Crush: one die-step');
  assert.equal(crushed.flags.swse.slammerCrushExtraDie, true); assert.equal(A_.checkAttackSourceReadiness(crusher, crushed).ok, true, 'the eligible Slammer strike is an authenticated source');
  const ruled = makeActor([{ id: 'rt1', type: 'talent', name: 'Anything', flags: {}, system: { abilityMeta: { grappleRules: [{ type: 'SLAMMER_SPECIAL_ATTACK', crushFeatAddsUnarmedDamageDie: true }] } } }]);
  const ruledStrike = Unarmed.buildVirtualUnarmedWeapon(ruled, { variant: 'slammer' });
  assert.equal(ruledStrike.system.damage, Unarmed.increaseDamageDie(Unarmed.buildVirtualUnarmedWeapon(ruled).system.damage, 1)); assert.equal(ruledStrike.flags.swse.slammerCrushExtraDie, true);
  const disabled = makeActor([{ ...crushFeat, id: 'cf2', system: { disabled: true } }]);
  assert.equal(Unarmed.buildVirtualUnarmedWeapon(disabled, { variant: 'slammer' }).flags.swse.slammerCrushExtraDie, undefined, 'a disabled feat grants nothing');
  // post-construction enhancement is still refused
  const bumped = Unarmed.buildVirtualUnarmedWeapon(a); bumped.system.damage = Unarmed.increaseDamageDie(bumped.system.damage, 3);
  assert.equal(A_.checkAttackSourceReadiness(a, bumped).ok, false);
  const marked = Unarmed.buildVirtualUnarmedWeapon(a); marked.flags.swse.slammerCrushExtraDie = true;
  assert.equal(A_.checkAttackSourceReadiness(a, marked).ok, false);
  // an appendage the droid does not have is not honoured
  const droid = makeActor([], { type: 'droid' }); droid.system = { ...droid.system, droidSystems: { appendages: [] } };
  const baseDroid = Unarmed.buildVirtualUnarmedWeapon(droid);
  const bogus = Unarmed.buildVirtualUnarmedWeapon(droid, { appendage: { type: 'probe' } });
  assert.equal(bogus.system.damage, baseDroid.system.damage, 'an appendage the droid has not installed does not change the strike');
  ok('C3-R1: no caller-supplied bonus, flag or option can enhance a strike; Slammer/Crush eligibility is resolved from the actor and keeps its intended damage; post-construction edits are refused');
}
{
  // provenance is bound to the actor OBJECT, not to its id / uuid strings
  const a = makeActor([]); a.uuid = 'Actor.a1';
  const twin = { ...a }; twin.items = a.items;             // distinct object, same id AND same uuid
  const virt = Unarmed.buildVirtualUnarmedWeapon(a);
  assert.equal(twin.id, a.id); assert.equal(twin.uuid, a.uuid); assert.notEqual(twin, a);
  assert.equal(Unarmed.isGenuineVirtualUnarmed(a, virt), true);
  assert.equal(Unarmed.isGenuineVirtualUnarmed(twin, virt), false, 'a distinct object sharing id and uuid is not the actor the strike was built for');
  assert.equal(A_.checkAttackSourceReadiness(twin, virt).ok, false);
  zero(); assert.equal(await A_.rollAttack(twin, virt, opts), null); noEffect();
  const proxied = Object.create(a);
  assert.equal(Unarmed.isGenuineVirtualUnarmed(proxied, virt), false, 'an object inheriting from the actor is not the actor');
  const virtTwin = Unarmed.buildVirtualUnarmedWeapon(twin);
  assert.equal(A_.checkAttackSourceReadiness(twin, virtTwin).ok, true, 'a strike built for that object is its own');
  assert.equal(A_.checkAttackSourceReadiness(a, virtTwin).ok, false);
  ok('C3-R1: virtual-unarmed provenance is bound to the actor object; matching ids / uuids on distinct objects are refused');
}

// ------------------------------------------------------------------------------------------------ C3-R2 Force Point transaction
const fpLedger = { spends: 0, gains: [], restores: [], chats: [], attackRolls: 0, fpDice: 0 };
const fpActor = (weapons, balance = 3, bonusEntries = null) => { const a = makeActor(weapons); a.system.forcePoints = { value: balance, max: 5 }; a.__bonus = bonusEntries ? { entries: bonusEntries, value: bonusEntries.reduce((n, e) => n + e.value, 0), max: 9 } : undefined; a.getFlag = (s, k) => (k === 'bonusForcePoints' ? a.__bonus : undefined); return a; };
const realSpendFP = ActorEngine.spendForcePoints; const realGainFP = ActorEngine.gainForcePoints; const realUpdateActor = ActorEngine.updateActor; const realChatCreate = globalThis.ChatMessage.create; const realCreateMsg = null;
const fpHarness = (onSpend = null) => {
  fpLedger.spends = 0; fpLedger.gains = []; fpLedger.restores = []; fpLedger.chats = []; fpLedger.attackRolls = 0; fpLedger.fpDice = 0;
  // models ActorEngine.spendForcePoints: bonus entries are spent first, then the normal pool
  ActorEngine.spendForcePoints = async (actor) => {
    fpLedger.spends += 1; const entries = actor.__bonus?.entries ?? []; const first = entries.find((e) => e.value > 0); let bonusSpent = 0, normalSpent = 0;
    if (first) { first.value -= 1; bonusSpent = 1; actor.__bonus = { ...actor.__bonus, entries: entries.filter((e) => e.value > 0), value: entries.reduce((n, e) => n + e.value, 0) }; } else { actor.system.forcePoints.value -= 1; normalSpent = 1; }
    if (onSpend) onSpend(actor); return { spent: 1, bonusSpent, normalSpent };
  };
  ActorEngine.gainForcePoints = async (actor, n) => { fpLedger.gains.push(n); actor.system.forcePoints.value = Math.min(actor.system.forcePoints.max, actor.system.forcePoints.value + n); return {}; };
  ActorEngine.updateActor = async (actor, data) => { fpLedger.restores.push(data); if ('flags.swse.bonusForcePoints' in data) actor.__bonus = data['flags.swse.bonusForcePoints']; if ('system.forcePoints.value' in data) actor.system.forcePoints.value = data['system.forcePoints.value']; return actor; };
  globalThis.ChatMessage.create = async (m) => { fpLedger.chats.push(String(m?.content ?? '')); return {}; };
  RollEngine.safeRoll = async (f) => { if (/^1d20/.test(f)) { c.rolls += 1; fpLedger.attackRolls += 1; } else fpLedger.fpDice += 1; return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  SWSEDialogV2.prototype.render = function () { try { this.data?.buttons?.yes?.callback?.(); } catch { /* not the Force Point dialog */ } return this; };
};
const fpChats = () => fpLedger.chats.filter((m) => /Force Point Used/.test(m)).length;
const hookOnce = (name, fn) => { const real = globalThis.Hooks; globalThis.Hooks = { ...real, callAll: (n, ...rest) => { if (n === name) fn(); return real.callAll?.(n, ...rest); } }; return () => { globalThis.Hooks = real; }; };
{
  const origPreflight = AmmoSystem.preflightAmmunition; const origSpendWf = AmmoSystem.spendForWorkflow; const origRb = AmmoSystem.rollbackSpend; const realHooks = globalThis.Hooks;
  let ammoRollbacks = 0;
  try {
    // (0) baseline: a legitimate Force Point use is spent exactly once, announced once, and the attack is rolled
    { const w = pistol('fp0'); const a = fpActor([w]); fpHarness(); zero();
      const r = await SWSERoll.rollAttack(a, w, { ...opts, useForcePoint: true });
      assert.ok(r, 'the attack resolved'); assert.equal(fpLedger.spends, 1); assert.equal(a.system.forcePoints.value, 2); assert.equal(fpChats(), 1); assert.ok(fpLedger.attackRolls >= 1); assert.deepEqual(fpLedger.restores, []); assert.deepEqual(fpLedger.gains, []); }
    // (1) PRE_FORCE_POINT middleware changes the weapon after the player confirmed: refused, nothing spent, no message
    { const w = pistol('fp1'); const a = fpActor([w]); fpHarness(); zero(); const restore = hookOnce(ROLL_HOOKS.PRE_FORCE_POINT, () => unready(w));
      try { assert.equal(await SWSERoll.rollAttack(a, w, { ...opts, useForcePoint: true }), null); } finally { restore(); }
      assert.equal(a.system.forcePoints.value, 3, 'the Force Point balance is unchanged'); assert.equal(fpLedger.spends, 0); assert.equal(fpChats(), 0, 'no "Force Point Used" message'); assert.equal(fpLedger.attackRolls, 0); }
    // (2) the nested attack preparation invalidates readiness after the FP was confirmed and rolled
    { const w = pistol('fp2'); const a = fpActor([w]); fpHarness(); zero(); AmmoSystem.preflightAmmunition = () => { unready(w); return { ok: true }; };
      assert.equal(await SWSERoll.rollAttack(a, w, { ...opts, useForcePoint: true }), null);
      AmmoSystem.preflightAmmunition = origPreflight;
      assert.equal(a.system.forcePoints.value, 3); assert.equal(fpLedger.spends, 0); assert.equal(fpChats(), 0); assert.equal(fpLedger.attackRolls, 0); }
    // (3) readiness lost while the ammunition is being paid
    { const w = pistol('fp3'); const a = fpActor([w]); fpHarness(); zero(); ammoRollbacks = 0;
      AmmoSystem.spendForWorkflow = async () => { unready(w); return { success: true, spent: true }; }; AmmoSystem.rollbackSpend = async () => { ammoRollbacks += 1; };
      assert.equal(await SWSERoll.rollAttack(a, w, { ...opts, useForcePoint: true }), null);
      AmmoSystem.spendForWorkflow = origSpendWf; AmmoSystem.rollbackSpend = origRb;
      assert.equal(a.system.forcePoints.value, 3); assert.equal(fpLedger.spends, 0, 'the Force Point is committed only after the ammunition payment was re-checked'); assert.equal(fpChats(), 0); assert.equal(fpLedger.attackRolls, 0); assert.equal(ammoRollbacks, 1); }
    // (4) readiness lost WHILE the Force Point itself is being spent (the last asynchronous boundary): the spend is given back, and ONLY the spend:
    //     a Force Point regained concurrently (value 2 -> 3 during the spend) is preserved, so the final balance is 3 - 1 + 1 + 1 = 4, not an overwritten 3
    { const w = pistol('fp4'); const a = fpActor([w]); fpHarness((actor) => { unready(w); actor.system.forcePoints.value += 1; }); zero(); ammoRollbacks = 0;
      AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: true }); AmmoSystem.rollbackSpend = async () => { ammoRollbacks += 1; };
      assert.equal(await SWSERoll.rollAttack(a, w, { ...opts, useForcePoint: true }), null);
      AmmoSystem.spendForWorkflow = origSpendWf; AmmoSystem.rollbackSpend = origRb;
      assert.equal(fpLedger.spends, 1, 'the spend happened'); assert.deepEqual(fpLedger.gains, [1], 'one relative gain: exactly what the spend took'); assert.equal(a.system.forcePoints.value, 4, 'the concurrent regain survives; no absolute value was written'); assert.deepEqual(fpLedger.restores, []);
      assert.equal(fpChats(), 0, 'no Force Point message for an attack that did not happen'); assert.equal(fpLedger.attackRolls, 0); assert.equal(ammoRollbacks, 1, 'the ammunition payment is given back too'); }
    // (5) the Force Point cannot be spent: the attack is refused with nothing else spent
    { const w = pistol('fp5'); const a = fpActor([w]); fpHarness(); zero(); ammoRollbacks = 0; ActorEngine.spendForcePoints = async () => { throw new Error('no points'); };
      AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: true }); AmmoSystem.rollbackSpend = async () => { ammoRollbacks += 1; };
      const err = console.error; console.error = () => {};
      try { assert.equal(await SWSERoll.rollAttack(a, w, { ...opts, useForcePoint: true }), null); } finally { console.error = err; AmmoSystem.spendForWorkflow = origSpendWf; AmmoSystem.rollbackSpend = origRb; }
      assert.equal(fpChats(), 0); assert.equal(fpLedger.attackRolls, 0); assert.equal(ammoRollbacks, 1); }
    // (6) Full Attack: the Force Point is spent when the first attack is about to be rolled and used for the attacks that happen
    { const p = pistol('fp6a'); const o = F.readiedWeapon('fp6b', { key: F.PISTOL_KEY, appendageIds: ['natural-arm-2'], wielded: 'one-handed' }); const a = fpActor([p, o]);
      // 6a: the primary stops being ready during the Force Point middleware -> no attack, no Force Point
      fpHarness(); zero(); let restore = hookOnce(ROLL_HOOKS.PRE_FORCE_POINT, () => unready(p));
      try { const res = await SWSERoll.rollFullAttack(a, { primaryWeapon: p, offhandWeapon: o, skipDialog: true, target: target() }); assert.ok(!res || res.results.length === 0); } finally { restore(); }
      assert.equal(a.system.forcePoints.value, 3); assert.equal(fpLedger.spends, 0); assert.equal(fpChats(), 0); assert.equal(fpLedger.attackRolls, 0);
      // 6b: the offhand stops being ready after the first attack committed the Force Point: the attack that happened keeps it, once
      Object.assign(p.system, REC('READIED', 'wield', ['natural-arm-1'])); fpHarness(); zero();
      const origSafe = SWSERoll._safeRoll; let n = 0; SWSERoll._safeRoll = async (...args) => { const r = await origSafe.apply(SWSERoll, args); if (/^1d20/.test(args[0])) { n += 1; if (n === 1) unready(o); } return r; };
      let res2; try { res2 = await SWSERoll.rollFullAttack(a, { primaryWeapon: p, offhandWeapon: o, skipDialog: true, target: target() }); } finally { SWSERoll._safeRoll = origSafe; }
      assert.equal(res2.results.length, 1); assert.equal(fpLedger.spends, 1); assert.equal(a.system.forcePoints.value, 2); assert.equal(fpChats(), 1, 'announced once, for the attack that used it'); }
    // (7) the transaction itself: nothing happens before commit; rollback gives back only what the spend took (normal pool and bonus pool by entry id)
    { const w = pistol('fp7'); const a = fpActor([w], 4, [{ id: 'b1', source: 'Bonus', value: 1, max: 1 }]);
      fpHarness(); const tx = await SWSERoll.beginForcePointUse(a, 'test');
      assert.ok(tx && tx.result === 12); assert.equal(fpLedger.spends, 0); assert.equal(fpChats(), 0); assert.equal(a.system.forcePoints.value, 4, 'begin spends nothing');
      assert.equal(await tx.rollback(), false, 'nothing to roll back before a commit');
      assert.equal(await tx.commit(), true); assert.equal(fpLedger.spends, 1); assert.equal(await tx.commit(), true); assert.equal(fpLedger.spends, 1, 'commit is idempotent');
      assert.equal(a.system.forcePoints.value, 4, 'the bonus point was spent first'); assert.equal(a.__bonus.entries.length, 0);
      a.__bonus = { ...a.__bonus, entries: [{ id: 'b2', source: 'Granted meanwhile', value: 1, max: 1 }], value: 1, max: 1 };   // an unrelated grant arrives before the rollback
      assert.equal(await tx.rollback(), true);
      assert.deepEqual(a.__bonus.entries.map((e) => [e.id, e.value]).sort(), [['b1', 1], ['b2', 1]], 'b1 is given back by id and the concurrent grant b2 is untouched');
      assert.equal(a.system.forcePoints.value, 4); assert.deepEqual(fpLedger.gains, [], 'the normal pool was not touched'); assert.equal(fpChats(), 0); }
    // (7b) a normal-pool spend is given back relatively, clamped to the maximum
    { const w = pistol('fp7b'); const a = fpActor([w], 5); fpHarness(); const tx = await SWSERoll.beginForcePointUse(a, 'test'); await tx.commit(); assert.equal(a.system.forcePoints.value, 4); a.system.forcePoints.value = 5;   // refilled by a rest
      assert.equal(await tx.rollback(), true); assert.equal(a.system.forcePoints.value, 5, 'never above the maximum'); assert.deepEqual(fpLedger.gains, [1]); }
    // (7c) a refund is applied only if the expenditure actually succeeded; it is idempotent; the transaction is single-use
    { const w = pistol('fp7c'); const a = fpActor([w], 3); fpHarness();
      // the authority throws: nothing was spent, so there is nothing to refund
      let tx = await SWSERoll.beginForcePointUse(a, 'test'); ActorEngine.spendForcePoints = async () => { throw new Error('boom'); };
      const errLog = console.error; console.error = () => {};
      try { assert.equal(await tx.commit(), false); } finally { console.error = errLog; }
      assert.equal(await tx.rollback(), false, 'no refund for an expenditure that failed'); assert.deepEqual(fpLedger.gains, []); assert.equal(a.system.forcePoints.value, 3); assert.equal(await tx.announce(), false, 'no message for an unpaid use');
      // the authority reports that nothing was spent (e.g. no point left): not paid, not committed, nothing to refund
      fpHarness(); ActorEngine.spendForcePoints = async () => ({ spent: 0 }); tx = await SWSERoll.beginForcePointUse(a, 'test');
      console.error = () => {}; try { assert.equal(await tx.commit(), false); } finally { console.error = errLog; }
      assert.equal(tx.committed, false); assert.equal(await tx.rollback(), false); assert.deepEqual(fpLedger.gains, []); assert.equal(fpChats(), 0);
      // idempotent + single-use: a second rollback refunds nothing; a rolled-back transaction cannot be committed, announced or rolled back again
      fpHarness(); tx = await SWSERoll.beginForcePointUse(a, 'test'); assert.equal(await tx.commit(), true); assert.equal(a.system.forcePoints.value, 2);
      assert.equal(await tx.rollback(), true); assert.equal(a.system.forcePoints.value, 3); assert.equal(await tx.rollback(), false, 'never refunded twice'); assert.deepEqual(fpLedger.gains, [1]); assert.equal(a.system.forcePoints.value, 3);
      assert.equal(await tx.commit(), false, 'a finished transaction does not spend again'); assert.equal(fpLedger.spends, 1); assert.equal(await tx.announce(), false); assert.equal(fpChats(), 0); }
    // (7d) another Force Point transaction between the expenditure and the rollback: only this one's point is given back
    { const w = pistol('fp7d'); const a = fpActor([w], 3); fpHarness();
      const tx1 = await SWSERoll.beginForcePointUse(a, 'one'); const tx2 = await SWSERoll.beginForcePointUse(a, 'two');
      assert.equal(await tx1.commit(), true); assert.equal(await tx2.commit(), true); assert.equal(a.system.forcePoints.value, 1);
      assert.equal(await tx1.rollback(), true); assert.equal(a.system.forcePoints.value, 2, 'one point back; the other transaction\'s point stays spent');
      assert.equal(await tx2.announce(), true); assert.equal(fpChats(), 1, 'the surviving use is announced, the rolled-back one is not');
      assert.equal(await tx2.rollback(), true); assert.equal(a.system.forcePoints.value, 3); assert.deepEqual(fpLedger.gains, [1, 1]); }
    // (8) damage / skill Force Point use keeps its spend-then-announce behavior
    { const a = fpActor([pistol('fp8')]); fpHarness(); const bonusFP = await SWSERoll.promptForcePointUse(a, 'damage roll'); assert.equal(bonusFP, 12); assert.equal(fpLedger.spends, 1); assert.equal(fpChats(), 1); }
  } finally { globalThis.Hooks = realHooks; AmmoSystem.preflightAmmunition = origPreflight; AmmoSystem.spendForWorkflow = origSpendWf; AmmoSystem.rollbackSpend = origRb; ActorEngine.spendForcePoints = realSpendFP; ActorEngine.gainForcePoints = realGainFP; ActorEngine.updateActor = realUpdateActor; globalThis.ChatMessage.create = realChatCreate; }
  ok('C3-R2: a Force Point is spent only at the attack\'s commitment point, given back (relatively, preserving concurrent changes) if the attack is refused after the spend, announced only for an attack that happens (rollAttack, Full Attack, transaction)');
}

// ------------------------------------------------------------------------------------------------ C3-R3 reload persistence
const trackingOn = () => { globalThis.game = { ...(globalThis.game ?? {}), settings: { get: (sys, key) => key === 'trackBlasterCharges' } }; };
const EWEB = 'weapon-e-web-missile-launcher';
const ewebWeapon = (id, { current = 0, max = 1, needsReload = true } = {}) => { const w = F.readiedWeapon(id, { key: EWEB, appendageIds: ['natural-arm-1', 'natural-arm-2'], wielded: 'two-handed', system: { ammunition: { current, max } } }); w.flags.swse.fireState = { v: 1, wielded: 'two-handed', ...(needsReload ? { needsReload: true } : {}) }; return w; };
const applyPatch = (actor, updates) => updates.map((u) => { const item = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); return item; });
const setPath = (obj, path, value) => { const parts = path.split('.'); let node = obj; for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {}); const last = parts.at(-1); if (last.startsWith('-=')) delete node[last.slice(2)]; else node[last] = JSON.parse(JSON.stringify(value)); };
{
  trackingOn();
  const origUpdate = ActorEngine.updateOwnedItems; const warn = console.warn; const errLog = console.error; console.warn = () => {};
  const isStateWrite = (u) => Object.keys(u).some((k) => k.startsWith('flags.swse.fireState'));
  try {
    // (a) full pool + awaiting reload; the state write is rejected -> NOT a successful reload; nothing is claimed
    { const w = ewebWeapon('r1', { current: 1, max: 1 }); const a = makeActor([w]);
      ActorEngine.updateOwnedItems = async () => { throw new Error('write rejected'); };
      const r = await AmmoSystem.reloadWeapon(a, w);
      assert.equal(r.success, false); assert.equal(r.reason, 'reload-state-not-persisted'); assert.equal(r.ammunitionRestored, false); assert.equal(r.reloadStateCleared, false);
      assert.equal(w.flags.swse.fireState.needsReload, true, 'the weapon still records that it needs a reload'); assert.equal(w.system.ammunition.current, 1); }
    // (b) partially empty pool + awaiting reload; ammunition write succeeds, state write fails -> partial failure, truthfully reported, no duplicate on retry
    { const w = ewebWeapon('r2', { current: 0, max: 1 }); const a = makeActor([w]); const log = [];
      let failState = true; ActorEngine.updateOwnedItems = async (actor, updates) => { log.push(JSON.parse(JSON.stringify(updates))); if (failState && updates.some(isStateWrite)) throw new Error('state write rejected'); return applyPatch(actor, updates); };
      const r = await AmmoSystem.reloadWeapon(a, w);
      assert.equal(r.success, false); assert.equal(r.reason, 'reload-state-not-persisted'); assert.equal(r.ammunitionRestored, true); assert.equal(r.reloadStateCleared, false);
      assert.equal(w.system.ammunition.current, 1, 'the pool really is full'); assert.equal(w.flags.swse.fireState.needsReload, true, 'but the weapon does not claim to be loaded');
      const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js'); const runtime = rt.resolveAttackWeaponRuntime(w, {});
      assert.equal(FS.previewReadiness(a, w, runtime, {}).ready, false, 'the weapon cannot fire while it still awaits a reload');
      failState = false; log.length = 0;
      const retry = await AmmoSystem.reloadWeapon(a, w);
      assert.equal(retry.success, true); assert.equal(retry.reloadAmount, 0, 'the retry adds no ammunition'); assert.equal(w.system.ammunition.current, 1);
      assert.ok(!log.flat().some((u) => 'system.ammunition.current' in u), 'the retry writes no ammunition'); assert.equal(w.flags.swse.fireState.needsReload, undefined); }
    // (c) tracked second-crew reload: the same partial failure gives the crew action back and says so
    { const w = ewebWeapon('r3', { current: 0, max: 1 }); const g = makeActor([w]); g.id = 'gunner'; const crew = { ...makeActor([]), id: 'crew-1', name: 'Crew' };
      let failState = true; ActorEngine.updateOwnedItems = async (actor, updates) => { if (failState && updates.some(isStateWrite)) throw new Error('state write rejected'); return applyPatch(actor, updates); };
      let spent = 0, rolled = 0; const origEcon = ActionEconomyConsumption.spend; ActionEconomyConsumption.spend = async () => { spent += 1; return { allowed: true, permitted: true, committed: true, rollback: async () => { rolled += 1; } }; };
      try {
        const r = await FS.reloadBySecondCrew(g, w, crew);
        assert.equal(r.ok, false); assert.equal(r.reason, 'reload-failed'); assert.equal(r.ammunitionRestored, true); assert.equal(spent, 1); assert.equal(rolled, 1, 'the crew Move is given back'); assert.equal(w.flags.swse.fireState.needsReload, true);
        failState = false; const r2 = await FS.reloadBySecondCrew(g, w, crew);
        assert.equal(r2.ok, true); assert.equal(spent, 2); assert.equal(rolled, 1, 'the successful retry keeps its action'); assert.equal(w.system.ammunition.current, 1, 'no duplicate ammunition'); assert.equal(w.flags.swse.fireState.needsReload, undefined);
      } finally { ActionEconomyConsumption.spend = origEcon; } }
    // (d) an empty / non-confirming update result is a persistence failure, never "persisted"
    { const w = ewebWeapon('r4', { current: 0, max: 1 }); const bl = F.readiedWeapon('r4b', { key: 'weapon-vibroblade', wielded: 'one-handed', appendageIds: ['natural-arm-1'] }); const a = makeActor([w, bl]); ActorEngine.updateOwnedItems = async () => [];
      const stock = await FS.setStockState(a, bl, 'extended', { free: true }); assert.equal(stock.ok, false); assert.equal(stock.reason, 'persist-failed');
      const c1 = await FS.clearReload(a, w); assert.equal(c1.outcome, 'failed'); assert.equal(w.flags.swse.fireState.needsReload, true);
      const r = await AmmoSystem.reloadWeapon(a, w); assert.equal(r.success, false); assert.equal(r.reason, 'ammunition-not-updated'); assert.equal(w.system.ammunition.current, 0, 'nothing is claimed');
      // a no-diff update (Foundry returns nothing because the record already holds the state) is 'unchanged', not a failure
      const w2 = ewebWeapon('r4c', { current: 1, max: 1, needsReload: false }); const a2 = makeActor([w2]); w2.flags.swse.fireState.stock = 'extended';
      const same = await FS.setStockState(a2, w2, 'extended', { free: true }); assert.equal(same.ok, true); assert.equal(same.persistence, 'unchanged'); }
    // (e) a normal successful reload
    { const w = ewebWeapon('r5', { current: 0, max: 1 }); const a = makeActor([w]); ActorEngine.updateOwnedItems = async (actor, updates) => applyPatch(actor, updates);
      const r = await AmmoSystem.reloadWeapon(a, w); assert.equal(r.success, true); assert.equal(r.reloadAmount, 1); assert.equal(w.system.ammunition.current, 1); assert.equal(w.flags.swse.fireState.needsReload, undefined); }
    // (f) a coordinator grip change during the state write survives the reload
    { const w = ewebWeapon('r6', { current: 0, max: 1 }); const a = makeActor([w]); let release; const gate = new Promise((res) => { release = res; }); let reached; const atBarrier = new Promise((res) => { reached = res; }); const patches = [];
      ActorEngine.updateOwnedItems = async (actor, updates) => { patches.push(JSON.parse(JSON.stringify(updates))); if (updates.some(isStateWrite)) { reached(); await gate; } return applyPatch(actor, updates); };
      const done = AmmoSystem.reloadWeapon(a, w); await atBarrier;
      w.flags.swse.fireState = { ...w.flags.swse.fireState, wielded: 'one-handed', concurrent: 'kept' }; release(); const r = await done;
      assert.equal(r.success, true); assert.equal(w.flags.swse.fireState.wielded, 'one-handed', 'the coordinator-owned grip survives'); assert.equal(w.flags.swse.fireState.concurrent, 'kept');
      assert.ok(!patches.flat().some((u) => Object.keys(u).some((k) => /wielded/.test(k))), 'the write never names the grip'); }
  } finally { ActorEngine.updateOwnedItems = origUpdate; console.warn = warn; console.error = errLog; globalThis.game = { ...(globalThis.game ?? {}), settings: undefined }; }
  ok('C3-R3: a failed reload-state write is never a successful reload (full pool, partial pool, second crew); empty update results are failures; retries add no ammunition; the grip survives');
}
{
  // the sheet reload gives its action back when the reload could not be recorded
  globalThis.CONFIG = globalThis.CONFIG ?? { SWSE: {}, Actor: {}, Item: {}, statusEffects: [] };
  globalThis.localStorage = globalThis.localStorage ?? { getItem() { return null; }, setItem() {}, removeItem() {} };
  globalThis.foundry.applications.sheets = globalThis.foundry.applications.sheets ?? { ActorSheetV2: class {}, ItemSheetV2: class {}, JournalSheet: class {} };
  globalThis.foundry.applications.ux = globalThis.foundry.applications.ux ?? { DragDrop: { implementation: class {} }, TextEditor: { implementation: {} } };
  const realHooks = globalThis.Hooks; globalThis.Hooks = { callAll() {}, on() {}, once() {}, off() {} };
  const { SWSEV2CharacterLikeSheet } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-like-sheet.js');
  const proto = SWSEV2CharacterLikeSheet.prototype;
  const origUpdate = ActorEngine.updateOwnedItems; const warn = console.warn; console.warn = () => {};
  try {
    for (const tracked of [false, true]) {
      if (tracked) trackingOn(); else globalThis.game = { ...(globalThis.game ?? {}), settings: undefined };
      const w = ewebWeapon(`sh${tracked ? 1 : 0}`, { current: 0, max: 1 }); const a = makeActor([w]); let rolledBack = 0; let paid = 0;
      ActorEngine.updateOwnedItems = async () => { throw new Error('write rejected'); };
      const sheet = { actor: a, requestSurfaceRender: async () => {}, _deriveCombatActionEconomyType: () => 'standard', _chooseReloadMode: async () => ({ kind: 'ordinary' }),
        _spendActionEconomy: async () => { paid += 1; return { allowed: true, permitted: true, committed: true, rollback: async () => { rolledBack += 1; } }; } };
      zero(); const res = await proto._executeReloadCombatWorkflow.call(sheet, { action: { id: 'reload' }, weaponId: w.id }, {});
      assert.equal(res, null, `the reload is reported as failed (tracked ammunition ${tracked})`); assert.equal(paid, 1); assert.equal(rolledBack, 1, 'the reload action is given back'); assert.equal(w.flags.swse.fireState.needsReload, true);
      assert.ok(notes.error.some((m) => /could not be recorded|reload/i.test(m)), 'the player is told');
    }
  } finally { ActorEngine.updateOwnedItems = origUpdate; console.warn = warn; globalThis.Hooks = realHooks; globalThis.game = { ...(globalThis.game ?? {}), settings: undefined }; }
  ok('C3-R3: the sheet reload uses the action-economy rollback and gives the action back when the reload could not be recorded (tracked and untracked)');
}

// ------------------------------------------------------------------------------------------------ action-economy rollback undoes only its own spend
const { ActionEconomyPersistence: AEP } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');
const realAEC = ActionEconomyConsumption.spend;   // the harness counter (restored after the real-stack sections)
const AEC = { spend: (...args) => REAL_AEC_SPEND.apply(ActionEconomyConsumption, args) };
const aeActor = (id) => { const store = {}; return { id, name: id, type: 'character', system: {}, getFlag: (sc, k) => store[`${sc}.${k}`], setFlag: async (sc, k, v) => { store[`${sc}.${k}`] = JSON.parse(JSON.stringify(v)); } }; };
const remaining = (actor) => AEP.getTurnState(actor, 'cmb1').remaining;
{
  const priorGame = globalThis.game;
  try {
    globalThis.game = { ...(priorGame ?? {}), combat: { id: 'cmb1', combatants: [{ actor: { id: 'ae1' } }, { actor: { id: 'ae2' } }] }, settings: { get: () => 'loose' } };
    // (1) nothing else recorded: the rollback refunds the action
    { const actor = aeActor('ae1'); const a = await AEC.spend(actor, 'standard', { actionName: 'Reload' }, { notify: false });
      assert.equal(a.committed, true); assert.equal(remaining(actor).standard, 0);
      assert.ok(await a.rollback()); assert.equal(remaining(actor).standard, 1, 'refunded'); assert.equal(AEP.getTurnState(actor, 'cmb1').history.length, 0);
      assert.equal(await a.rollback(), false, 'a second rollback of the same spend does nothing'); assert.equal(AEP.getTurnState(actor, 'cmb1').history.length, 0); }
    // (2) another action was recorded after this one: this rollback must NOT undo it, and must not pretend to have refunded
    { const actor = aeActor('ae1'); const a = await AEC.spend(actor, 'standard', { actionName: 'Reload' }, { notify: false }); const b = await AEC.spend(actor, 'swift', { actionName: 'Other' }, { notify: false });
      assert.equal(remaining(actor).standard, 0); assert.equal(remaining(actor).swift, 0);
      assert.equal(await a.rollback(), false, 'superseded: not refunded');
      assert.equal(remaining(actor).swift, 0, 'the later action (swift) is NOT undone'); assert.equal(remaining(actor).standard, 0, 'and this one is left as it was'); assert.equal(AEP.getTurnState(actor, 'cmb1').history.length, 2);
      assert.ok(await b.rollback()); assert.equal(remaining(actor).swift, 1, 'the later spend can undo itself'); assert.equal(remaining(actor).standard, 0);
      assert.ok(await a.rollback(), 'once it is the last entry again it can undo itself'); assert.equal(remaining(actor).standard, 1); }
    // (3) another actor's spend is a different turn state and never interferes
    { const x = aeActor('ae1'); const y = aeActor('ae2'); const a = await AEC.spend(x, 'standard', { actionName: 'Reload' }, { notify: false }); await AEC.spend(y, 'standard', { actionName: 'Other actor' }, { notify: false });
      assert.ok(await a.rollback()); assert.equal(remaining(x).standard, 1); assert.equal(remaining(y).standard, 0); }
    // (3b) the three outcomes are told apart, strictly: refunded / superseded (nothing changed) / failed (never an "incorrect success")
    { const actor = aeActor('ae1'); notes.warn.length = 0;
      const a = await AEC.spend(actor, 'standard', { actionName: 'Reload' }, { notify: true }); assert.equal(a.rollbackStatus, 'none');
      assert.equal(await a.rollback(), true); assert.equal(a.rollbackStatus, 'refunded'); assert.equal(await a.rollback(), false, 'idempotent: never undone twice'); assert.equal(a.rollbackStatus, 'refunded'); assert.equal(notes.warn.length, 0, 'a clean refund is silent');
      const c1 = await AEC.spend(actor, 'standard', { actionName: 'Reload' }, { notify: true }); await AEC.spend(actor, 'swift', { actionName: 'Later' }, { notify: false });
      assert.strictEqual(await c1.rollback(), false); assert.equal(c1.rollbackStatus, 'superseded'); assert.ok(notes.warn.some((m) => /could not be refunded.*another action was recorded/.test(m)), 'the player is told');
      assert.equal(remaining(actor).standard, 0, 'superseded: this action stays spent and is reported as such');
      // an undo that reports failure, or "succeeds" without removing this spend's history entry, is never reported as a refund
      const origUndo = AEP.undoLast; const actor2 = aeActor('ae2'); notes.warn.length = 0;
      try {
        const d = await AEC.spend(actor2, 'standard', { actionName: 'Reload' }, { notify: true });
        AEP.undoLast = async () => ({ allowed: false, reason: 'NO_HISTORY' });
        assert.strictEqual(await d.rollback(), false); assert.equal(d.rollbackStatus, 'failed'); assert.equal(remaining(actor2).standard, 0);
        AEP.undoLast = async () => ({ allowed: true, undone: {} });   // claims success but removed nothing
        assert.strictEqual(await d.rollback(), false, 'a claimed undo that the history does not show is not a refund'); assert.equal(d.rollbackStatus, 'failed');
        assert.ok(notes.warn.filter((m) => /could not be refunded/.test(m)).length >= 2);
        AEP.undoLast = origUndo; assert.equal(await d.rollback(), true, 'a real undo afterwards still works'); assert.equal(d.rollbackStatus, 'refunded'); assert.equal(remaining(actor2).standard, 1);
      } finally { AEP.undoLast = origUndo; } }
    // (4) the sheet reload: its failure refunds only its own action, and tells the player when it cannot
    const { SWSEV2CharacterLikeSheet } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-like-sheet.js');
    const sproto = SWSEV2CharacterLikeSheet.prototype; const origUpd = ActorEngine.updateOwnedItems; const warn = console.warn; console.warn = () => {};
    const errLog = console.error; console.error = () => {};
    try {
      for (const interfering of [false, true]) {
        trackingOn(); globalThis.game = { ...globalThis.game, combat: { id: 'cmb1', combatants: [{ actor: { id: 'ae1' } }] }, settings: { get: (sys, key) => (key === 'trackBlasterCharges' ? true : 'loose') } };
        const w = ewebWeapon(`shx${interfering ? 1 : 0}`, { current: 0, max: 1 }); const actor = makeActor([w]); actor.id = 'ae1'; const store = {}; actor.getFlag = (sc, k) => store[`${sc}.${k}`]; actor.setFlag = async (sc, k, v) => { store[`${sc}.${k}`] = JSON.parse(JSON.stringify(v)); };
        ActorEngine.updateOwnedItems = async () => { if (interfering) await AEC.spend(actor, 'swift', { actionName: 'Another action' }, { notify: false }); throw new Error('write rejected'); };
        const sheet = { actor, requestSurfaceRender: async () => {}, _deriveCombatActionEconomyType: () => 'standard', _chooseReloadMode: async () => ({ kind: 'ordinary' }), _spendActionEconomy: (t, m) => sproto._spendActionEconomy.call({ actor }, t, m) };
        // the sheet spends through the real consumption authority (the module the harness re-imported is the same class for spend/rollback purposes)
        ActionEconomyConsumption.spend = REAL_AEC_SPEND;
        zero(); const res = await sproto._executeReloadCombatWorkflow.call(sheet, { action: { id: 'reload' }, weaponId: w.id }, {});
        ActionEconomyConsumption.spend = realAEC;
        const st = AEP.getTurnState(actor, 'cmb1').remaining;
        assert.equal(res, null);
        if (!interfering) { assert.equal(st.standard, 1, 'the failed reload gave its action back'); assert.ok(!notes.warn.some((m) => /could not be refunded/.test(m))); }
        else { assert.equal(st.swift, 0, 'the other action recorded meanwhile is not undone'); assert.equal(st.standard, 0, 'the reload action is left as it was'); assert.ok(notes.warn.some((m) => /could not be refunded/.test(m)), 'the player is told it was not refunded'); }
      }
    } finally { ActorEngine.updateOwnedItems = origUpd; ActionEconomyConsumption.spend = realAEC; console.warn = warn; console.error = errLog; globalThis.game = { ...(priorGame ?? {}), settings: undefined }; }
  } finally { globalThis.game = priorGame; ActionEconomyConsumption.spend = realAEC; }
  ok('Action economy: a rollback undoes only the expenditure that made it (unique spend id in its own history entry); a superseded rollback changes nothing and the sheet tells the player');
}

// ------------------------------------------------------------------------------------------------ one authority for the Crush / grapple-rule facts
{
  const fs = await import('node:fs'); const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const reader = read('scripts/engine/feats/grapple-rules-reader.js'); const actions = read('scripts/engine/feats/grapple-feat-actions.js'); const helper = read('scripts/engine/combat/unarmed-attack-helper.js');
  for (const fn of ['normalizeFeatName', 'actorHasFeat', 'actorGrappleRules', 'findGrappleRule']) {
    assert.match(reader, new RegExp(`export function ${fn}\\b`), `${fn} is defined once, in the reader`);
    assert.doesNotMatch(actions, new RegExp(`function ${fn}\\b`), `grapple-feat-actions no longer defines ${fn}`);
    if (fn !== 'actorHasFeat') assert.equal((helper.match(new RegExp(`function ${fn}\\b`, 'g')) ?? []).length, 0, `the unarmed helper does not define ${fn}`);
  }
  // The helper keeps its OWN, pre-existing actorHasFeat (slug match incl. system.slug, no disabled check) for the Martial Arts steps. WP5-C3 added no
  // feat matcher: Crush uses the reader's (the one Slammer always used) under an explicit alias. Unifying the two matchers would change which feats
  // count (disabled / system.slug) and is deliberately NOT done here; this pins the situation so it cannot grow unnoticed.
  assert.equal((helper.match(/function actorHasFeat\b/g) ?? []).length, 1, 'exactly the one pre-existing local matcher');
  assert.match(helper, /import \{ actorHasFeat as actorHasGrappleFeat, findGrappleRule \} from "[^"]*grapple-rules-reader\.js"/);
  assert.match(helper, /actorHasGrappleFeat\(actor, 'Crush'\)/); assert.doesNotMatch(helper, /actorHasFeat\(actor, 'Crush'\)/, 'Crush never goes through the helper\'s own matcher');
  assert.match(actions, /grapple-rules-reader\.js/); assert.match(helper, /grapple-rules-reader\.js/);
  // the Slammer / Crush eligibility the helper now resolves is identical to the condition Slammer evaluated before WP5-C2 (copied verbatim here)
  const legacyEligible = (actor) => { const slammerRule = Array.from(actor?.items ?? []).filter((i) => ['feat', 'talent'].includes(i?.type) && i?.system?.disabled !== true).flatMap((i) => Array.isArray(i?.system?.abilityMeta?.grappleRules) ? i.system.abilityMeta.grappleRules : []).find((r) => r?.type === 'SLAMMER_SPECIAL_ATTACK');
    const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const hasFeat = Array.from(actor?.items ?? []).some((i) => i?.type === 'feat' && i?.system?.disabled !== true && norm(i?.name) === 'crush');
    return hasFeat || slammerRule?.crushFeatAddsUnarmedDamageDie === true; };
  const mk = (items) => makeActor(items);
  const cases = {
    none: [], feat: [{ id: 'f', type: 'feat', name: 'Crush', flags: {}, system: {} }], punctuated: [{ id: 'f', type: 'feat', name: ' CRUSH! ', flags: {}, system: {} }],
    disabled: [{ id: 'f', type: 'feat', name: 'Crush', flags: {}, system: { disabled: true } }], talentNamed: [{ id: 't', type: 'talent', name: 'Crush', flags: {}, system: {} }],
    ruleTrue: [{ id: 't', type: 'talent', name: 'X', flags: {}, system: { abilityMeta: { grappleRules: [{ type: 'SLAMMER_SPECIAL_ATTACK', crushFeatAddsUnarmedDamageDie: true }] } } }],
    ruleFalse: [{ id: 't', type: 'talent', name: 'X', flags: {}, system: { abilityMeta: { grappleRules: [{ type: 'SLAMMER_SPECIAL_ATTACK', crushFeatAddsUnarmedDamageDie: false }] } } }],
    ruleOnWeapon: [{ id: 'w', type: 'weapon', name: 'X', flags: {}, system: { abilityMeta: { grappleRules: [{ type: 'SLAMMER_SPECIAL_ATTACK', crushFeatAddsUnarmedDamageDie: true }] } } }],
    otherRule: [{ id: 't', type: 'talent', name: 'X', flags: {}, system: { abilityMeta: { grappleRules: [{ type: 'OTHER', crushFeatAddsUnarmedDamageDie: true }] } } }],
  };
  for (const [label, items] of Object.entries(cases)) {
    const actor = mk(items); const built = Unarmed.buildVirtualUnarmedWeapon(actor, { variant: 'slammer' });
    assert.equal(built.flags.swse.slammerCrushExtraDie === true, legacyEligible(actor), `Crush eligibility for "${label}" is unchanged`);
  }
  ok('Crush / grapple-rule eligibility: the four readers have one definition (moved unchanged from grapple-feat-actions) imported by both consumers; Crush never uses the helper\'s own Martial Arts matcher (pinned); eligibility equals the pre-change condition on every fixture');
}

console.log(`\nE4-C1 WP5-C3 trust boundaries: ${n} checks passed.`);
