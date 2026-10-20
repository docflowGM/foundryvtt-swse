import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E4-C1 WP5-C3 independent-review follow-up: C3-R4 announcement idempotency, C3-R5 concurrent transaction calls, C3-R6 announcement failure after
// payment, and the transaction lifecycle (a finalized use is never refunded). Runs against the REAL ActorEngine.spendForcePoints / gainForcePoints
// (grafted; see tests/helpers/real-force-point-engine.mjs). Every negative case was reproduced against 961f4bc before the fix.
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
const { graftRealForcePointMethods, setPath } = await import('./helpers/real-force-point-engine.mjs');
const { createForcePointTransaction } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/force-point-transaction.js');
const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
const { ROLL_HOOKS } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
const pistol = (id, o = {}) => F.readiedWeapon(id, { key: F.PISTOL_KEY, ...o });

// --- a controllable persistence layer under the REAL spend/gain methods ----------------------------------------------------------------------
const ctl = { gate: null, failWrite: null, applyThenThrow: false, writes: 0, spends: 0, gains: [] };
const writer = async (actor, data) => {
  ctl.writes += 1;
  if (ctl.gate) await ctl.gate;
  if (ctl.applyThenThrow) { for (const [k, v] of Object.entries(data)) setPath(actor, k, v); throw new Error('write applied but the call threw'); }
  if (ctl.failWrite) throw new Error('write rejected');
  for (const [k, v] of Object.entries(data)) setPath(actor, k, v);
  return actor;
};
const { fake: engine, restore } = await graftRealForcePointMethods(writer);
const realSpend = engine.spendForcePoints; const realGain = engine.gainForcePoints;
engine.spendForcePoints = async (...a) => { ctl.spends += 1; return realSpend.apply(engine, a); };
engine.gainForcePoints = async (actor, n) => { ctl.gains.push(n); return realGain.call(engine, actor, n); };
const reset = () => { Object.assign(ctl, { gate: null, failWrite: null, applyThenThrow: false, writes: 0, spends: 0, gains: [] }); };
const mk = ({ normal = 3, bonus = null } = {}) => { const a = makeActor([]); a.system.forcePoints = { value: normal, max: 5 }; a.flags = { swse: bonus ? { bonusForcePoints: bonus } : {} }; a.getFlag = (s, k) => a.flags?.[s]?.[k]; return a; };
const tx = (a, extra = {}) => createForcePointTransaction({ actor: a, result: 7, formula: '1d6', reason: 'review follow-up', roll: { total: 7 }, ...extra });
// presentation side effects
const present = { chats: 0, hooks: 0, chatMode: 'ok', hookMode: 'ok' };
const realCreate = globalThis.ChatMessage.create; const realHooks = globalThis.Hooks;
const installPresentation = () => {
  present.chats = 0; present.hooks = 0; present.chatMode = 'ok'; present.hookMode = 'ok';
  globalThis.ChatMessage.create = async (m) => { if (!/Force Point Used/.test(String(m?.content))) return {}; present.chats += 1; if (present.chatMode === 'throw') throw new Error('chat store unavailable'); if (present.chatMode === 'null') { present.chats -= 1; return undefined; } return {}; };
  globalThis.Hooks = { ...realHooks, callAll: (name, ...rest) => { if (name === ROLL_HOOKS.POST_FORCE_POINT) { present.hooks += 1; if (present.hookMode === 'throw') throw new Error('post hook listener threw'); } return realHooks.callAll?.(name, ...rest); } };
};
const uninstallPresentation = () => { globalThis.ChatMessage.create = realCreate; globalThis.Hooks = realHooks; };
// Deterministic wait: the first step of commit()/rollback() is a dynamic import, whose duration varies under load, so a single timer tick is not enough.
const until = async (cond) => { for (let i = 0; i < 5000 && !cond(); i += 1) { await new Promise((r) => setTimeout(r, 1)); } assert.ok(cond(), 'the awaited persistence write was reached'); };
const silent = async (fn) => { const e = console.error; const w = console.warn; console.error = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.error = e; console.warn = w; } };

try {
  // ------------------------------------------------------------------------------------------------ C3-R4 announcement idempotency
  {
    reset(); installPresentation(); const a = mk(); const t = tx(a);
    assert.equal(await t.commit(), true);
    assert.equal(await t.announce(), true); assert.equal(await t.announce(), true, 'a second announce reports the same truthful outcome');
    assert.equal(present.chats, 1, 'two sequential announcements create ONE chat card'); assert.equal(present.hooks, 1, 'and run the POST hook ONCE');
    // concurrent announcements
    reset(); installPresentation(); const b = mk(); const t2 = tx(b); await t2.commit();
    const [x, y, z] = await Promise.all([t2.announce(), t2.announce(), t2.announce()]);
    assert.deepEqual([x, y, z], [true, true, true]); assert.equal(present.chats, 1); assert.equal(present.hooks, 1);
    // announce before any commit is refused and has no side effects
    reset(); installPresentation(); const c = mk(); const t3 = tx(c);
    assert.equal(await t3.announce(), false); assert.equal(present.chats, 0); assert.equal(present.hooks, 0);
    ok('C3-R4: announce() is once-only (sequential and concurrent) and has no side effect before a commit');
  }
  // announce failure is distinguishable from spend failure, and retries never repeat a completed step
  {
    reset(); installPresentation(); present.chatMode = 'null';   // createChatMessage returns null on failure (it does not throw)
    const a = mk(); const t = tx(a); await t.commit();
    const w = []; const realWarn = ui.notifications.warn; ui.notifications.warn = (m) => w.push(m);
    const first = await silent(() => t.announce()); ui.notifications.warn = realWarn;
    assert.equal(first, false, 'a chat message that was not created is NOT reported as announced');
    assert.equal(t.committed, true, 'the Force Point is still mechanically committed'); assert.equal(a.system.forcePoints.value, 2); assert.equal(ctl.gains.length, 0, 'and was not refunded');
    assert.equal(t.chatPosted, false); assert.equal(t.hookRan, true, 'the mechanical POST hook still ran'); assert.ok(t.announceError, 'the presentation failure is recorded');
    assert.ok(w.some((m) => /spent and applied/i.test(m)), 'the player is told the point was spent and the message failed');
    present.chatMode = 'ok'; assert.equal(await t.announce(), true, 'a retry completes only the failed step'); assert.equal(present.chats, 1); assert.equal(present.hooks, 1, 'the completed POST hook is not run again');
    // a throwing hook listener
    reset(); installPresentation(); present.hookMode = 'throw'; const b = mk(); const t2 = tx(b); await t2.commit();
    assert.equal(await silent(() => t2.announce()), false); assert.equal(present.chats, 1); assert.equal(t2.committed, true);
    present.hookMode = 'ok'; assert.equal(await t2.announce(), true); assert.equal(present.chats, 1, 'the chat card is not posted twice'); assert.equal(present.hooks, 2, 'only the failed hook step is retried');
    ok('C3-R4: announcement failure (null message / throwing hook) is distinguishable from a spend failure, leaves the spend intact, and retries repeat only the failed step');
  }
  // ------------------------------------------------------------------------------------------------ C3-R5 concurrent invocation
  {
    reset(); const a = mk(); const t = tx(a); let release; ctl.gate = new Promise((r) => { release = r; });
    const p1 = t.commit(); const p2 = t.commit(); await until(() => ctl.writes >= 1);
    assert.equal(ctl.spends, 1, 'two simultaneous commit() calls reach the spend authority ONCE'); release(); const [r1, r2] = await Promise.all([p1, p2]); ctl.gate = null;
    assert.deepEqual([r1, r2], [true, true], 'both callers get the same truthful outcome'); assert.equal(ctl.spends, 1); assert.equal(a.system.forcePoints.value, 2); assert.equal(t.committed, true);
    // failed concurrent commit: both false, no fabricated success, a later clean retry is possible
    reset(); const b = mk(); const t2 = tx(b); ctl.failWrite = true;
    const f = await silent(() => Promise.all([t2.commit(), t2.commit()])); assert.deepEqual(f, [false, false]); assert.equal(ctl.spends, 1); assert.equal(t2.committed, false); assert.equal(b.system.forcePoints.value, 3);
    ctl.failWrite = false; assert.equal(await t2.commit(), true, 'a clean failure (nothing deducted) may be retried'); assert.equal(b.system.forcePoints.value, 2);
    // spend that APPLIED and then threw: uncertain -> indeterminate, never a fabricated success, never spent twice
    reset(); const c = mk(); const t3 = tx(c); ctl.applyThenThrow = true;
    const e = await silent(() => Promise.all([t3.commit(), t3.commit()])); assert.deepEqual(e, [false, false], 'an uncertain commit is not reported as successful'); assert.equal(t3.committed, false);
    assert.equal(c.system.forcePoints.value, 2, 'the deduction is observable'); assert.equal(t3.state, 'indeterminate'); ctl.applyThenThrow = false;
    assert.equal(await t3.commit(), false, 'an indeterminate transaction is closed: no second spend'); assert.equal(ctl.spends, 1); assert.equal(c.system.forcePoints.value, 2);
    assert.equal(await t3.rollback(), false, 'and no automatic refund of an expenditure that was never confirmed');
    ok('C3-R5: concurrent commit() calls spend once with a shared truthful outcome; clean failures are retryable; an applied-then-threw spend is indeterminate (closed, not fabricated, not repeated)');
  }
  {
    reset(); const a = mk(); const t = tx(a); await t.commit(); let release; ctl.gate = new Promise((r) => { release = r; });
    const w0 = ctl.writes; const r1 = t.rollback(); const r2 = t.rollback(); await until(() => ctl.writes > w0); release(); const [x, y] = await Promise.all([r1, r2]); ctl.gate = null;
    assert.deepEqual([x, y], [true, true], 'concurrent rollbacks share one outcome'); assert.deepEqual(ctl.gains, [1], 'the point is given back ONCE'); assert.equal(a.system.forcePoints.value, 3);
    assert.equal(await t.rollback(), false, 'a later rollback does nothing'); assert.deepEqual(ctl.gains, [1]);
    // rollback requested while the commit is still in flight waits for it, then refunds exactly once
    reset(); const b = mk(); const t2 = tx(b); let rel2; ctl.gate = new Promise((r) => { rel2 = r; });
    const c1 = t2.commit(); const rb = t2.rollback(); await until(() => ctl.writes >= 1); assert.equal(ctl.gains.length, 0, 'nothing is refunded before the commit settles'); rel2(); ctl.gate = null;
    const [cr, rr] = await Promise.all([c1, rb]); assert.equal(cr, true); assert.equal(rr, true); assert.equal(b.system.forcePoints.value, 3); assert.deepEqual(ctl.gains, [1]);
    assert.equal(await t2.commit(), false, 'a rolled-back transaction cannot be committed again'); assert.equal(ctl.spends, 1);
    ok('C3-R5: concurrent rollbacks refund once; a rollback requested during an in-flight commit waits for it; a rolled-back transaction is finished');
  }
  // ------------------------------------------------------------------------------------------------ lifecycle: a finalized use is never refunded
  {
    reset(); installPresentation(); const a = mk(); const t = tx(a); await t.commit();
    assert.equal(t.final, false); assert.equal(await t.announce(), true); assert.equal(t.final, true, 'announce() finalizes the use');
    assert.equal(await t.rollback(), false, 'a completed, announced use is never refunded'); assert.equal(a.system.forcePoints.value, 2); assert.deepEqual(ctl.gains, []);
    // finalization does not depend on the presentation succeeding
    reset(); installPresentation(); present.chatMode = 'null'; const b = mk(); const t2 = tx(b); await t2.commit(); await silent(() => t2.announce());
    assert.equal(t2.final, true); assert.equal(await t2.rollback(), false, 'a presentation failure does not reopen the mechanical commitment'); assert.deepEqual(ctl.gains, []);
    // explicit finalize(), and a rollback requested while announcement is in flight is refused
    reset(); installPresentation(); const c = mk(); const t3 = tx(c); assert.equal(t3.finalize(), false, 'nothing to finalize before a commit'); await t3.commit();
    assert.equal(t3.finalize(), true); assert.equal(await t3.rollback(), false);
    reset(); installPresentation(); const d = mk(); const t4 = tx(d); await t4.commit(); const an = t4.announce(); const rb = t4.rollback(); assert.equal(await rb, false, 'refused while the announcement is under way'); await an; assert.deepEqual(ctl.gains, []);
    // the authorized refund path for an attack refused BEFORE completion is intact
    reset(); installPresentation(); const e = mk(); const t5 = tx(e); await t5.commit(); assert.equal(t5.final, false); assert.equal(await t5.rollback(), true); assert.equal(e.system.forcePoints.value, 3); assert.equal(present.chats, 0);
    ok('C3 lifecycle: announce()/finalize() make a completed use final (even if presentation fails); a refusal before completion still refunds exactly what the spend took');
  }
  // ------------------------------------------------------------------------------------------------ C3-R7 cross-operation interleaving
  {
    // rollback accepted first: while its refund write is pending, announce / finalize / commit must not claim a completed or independently committed use
    reset(); installPresentation(); const a = mk(); const t = tx(a); assert.equal(await t.commit(), true); assert.equal(a.system.forcePoints.value, 2);
    let release; ctl.gate = new Promise((r) => { release = r; });
    const rb = t.rollback();   // NOT awaited
    const [an, fin, cm] = [await t.announce(), t.finalize(), await t.commit()];
    assert.deepEqual([an, fin, cm], [false, false, false], 'no competing caller may announce, finalize or claim a commitment once rollback was accepted');
    assert.equal(t.final, false); assert.equal(present.chats, 0, 'no announcement for a spend that is being refunded'); assert.equal(present.hooks, 0);
    release(); ctl.gate = null; assert.equal(await rb, true);
    assert.equal(a.system.forcePoints.value, 3, 'the refund completed'); assert.equal(t.state, 'rolled-back'); assert.equal(t.closed, true); assert.equal(t.final, false);
    assert.deepEqual(ctl.gains, [1], 'refunded exactly once'); assert.equal(present.chats, 0); assert.equal(present.hooks, 0); assert.equal(ctl.spends, 1, 'no second spend');
    assert.equal(await t.announce(), false); assert.equal(await t.commit(), false); assert.equal(t.finalize(), false);
    // a rollback that FAILS part-way still bars finalization/announcement (the spend is neither cleanly refunded nor cleanly final) and can be retried
    reset(); installPresentation(); const b = mk(); const t2 = tx(b); await t2.commit(); ctl.failWrite = true;
    assert.equal(await silent(() => t2.rollback()), false); ctl.failWrite = false;
    assert.equal(await t2.announce(), false, 'an attempted-but-failed refund is not announced as a completed use'); assert.equal(t2.finalize(), false); assert.equal(await t2.commit(), false); assert.equal(present.chats, 0);
    assert.equal(await t2.rollback(), true, 'the refund may be retried'); assert.equal(b.system.forcePoints.value, 3);
    // rollback requested while a commit is still in flight, then announce right after the commit settles: refused
    reset(); installPresentation(); const c = mk(); const t3 = tx(c); let rel3; ctl.gate = new Promise((r) => { rel3 = r; });
    const c1 = t3.commit(); const rb3 = t3.rollback(); const an3 = t3.announce(); await until(() => ctl.writes >= 1); rel3(); ctl.gate = null;
    assert.equal(await an3, false); await c1; assert.equal(await rb3, true); assert.equal(t3.final, false); assert.equal(c.system.forcePoints.value, 3); assert.equal(present.chats, 0);
    // reverse ordering: announce / finalize first make the use final, so a later rollback is refused
    reset(); installPresentation(); const d = mk(); const t4 = tx(d); await t4.commit(); const an4 = t4.announce();
    assert.equal(await t4.rollback(), false, 'rollback refused while announcement is in flight'); assert.equal(await an4, true); assert.equal(await t4.rollback(), false); assert.deepEqual(ctl.gains, []); assert.equal(d.system.forcePoints.value, 2);
    reset(); installPresentation(); const e = mk(); const t5 = tx(e); await t5.commit(); assert.equal(t5.finalize(), true); assert.equal(await t5.rollback(), false); assert.equal(e.system.forcePoints.value, 2); assert.deepEqual(ctl.gains, []);
    ok('C3-R7: once rollback is accepted no competing announce/finalize/commit succeeds (state, chat, hook and balance stay consistent); announce/finalize first bars a later rollback');
  }
  // ------------------------------------------------------------------------------------------------ C3-R6 presentation failure after payment
  {
    SWSEDialogV2.prototype.render = function () { try { this.data?.buttons?.yes?.callback?.(); } catch { /* not the Force Point dialog */ } return this; };
    const realSafe = RollEngine.safeRoll; RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
    const attempt = async (mode) => {
      reset(); installPresentation(); present[mode.kind] = mode.value; const a = mk(); a.getRollData = () => ({});
      const w = []; const rw = ui.notifications.warn; ui.notifications.warn = (m) => w.push(m);
      const bonus = await silent(() => SWSERoll.promptForcePointUse(a, 'damage roll')); ui.notifications.warn = rw;
      return { bonus, a, w };
    };
    // chat message not created
    let r = await attempt({ kind: 'chatMode', value: 'null' });
    assert.equal(r.a.system.forcePoints.value, 2, 'the Force Point was spent'); assert.equal(r.bonus, 12, 'so the bonus that was paid for is reported as APPLIED, not 0'); assert.deepEqual(ctl.gains, [], 'and is not refunded');
    assert.ok(r.w.some((m) => /spent and applied/i.test(m)), 'the player is told the chat message failed');
    // throwing chat operation
    r = await attempt({ kind: 'chatMode', value: 'throw' }); assert.equal(r.a.system.forcePoints.value, 2); assert.equal(r.bonus, 12); assert.deepEqual(ctl.gains, []);
    // throwing POST hook
    r = await attempt({ kind: 'hookMode', value: 'throw' }); assert.equal(r.a.system.forcePoints.value, 2); assert.equal(r.bonus, 12); assert.deepEqual(ctl.gains, []); assert.equal(present.chats, 1, 'the card that could be posted was posted once');
    // the spend itself failing still returns 0 (nothing was paid)
    reset(); installPresentation(); const f = mk(); ctl.failWrite = true; const fb = await silent(() => SWSERoll.promptForcePointUse(f, 'damage roll')); assert.equal(fb, 0); assert.equal(f.system.forcePoints.value, 3); assert.equal(present.chats, 0);
    // and the healthy path is unchanged
    reset(); installPresentation(); const g = mk(); const gb = await SWSERoll.promptForcePointUse(g, 'damage roll'); assert.equal(gb, 12); assert.equal(g.system.forcePoints.value, 2); assert.equal(present.chats, 1); assert.equal(present.hooks, 1);
    RollEngine.safeRoll = realSafe;
    ok('C3-R6: a chat/hook failure AFTER payment never turns a paid bonus into 0 or refunds the completed use; a failed spend still returns 0');
  }
  // attack path: presentation failure after the attack must not refund or hide the spent point
  {
    reset(); installPresentation(); present.chatMode = 'null';
    SWSEDialogV2.prototype.render = function () { try { this.data?.buttons?.yes?.callback?.(); } catch { /* not the Force Point dialog */ } return this; };
    const realSafe = RollEngine.safeRoll; RollEngine.safeRoll = async (f) => { if (/^1d20/.test(f)) c.rolls += 1; return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
    const w = pistol('atk'); const a = makeActor([w]); a.system.forcePoints = { value: 3, max: 5 }; a.flags = { swse: {} }; a.getFlag = () => undefined; zero();
    const res = await silent(() => SWSERoll.rollAttack(a, w, { ...opts, useForcePoint: true }));
    assert.ok(res, 'the attack resolved'); assert.equal(a.system.forcePoints.value, 2, 'the Force Point stays spent'); assert.deepEqual(ctl.gains, [], 'a completed attack is not refunded because the card failed'); assert.ok(c.rolls >= 1);
    RollEngine.safeRoll = realSafe;
    ok('C3-R6 (attack path): a presentation failure after a completed attack leaves the Force Point spent and applied');
  }
} finally { uninstallPresentation(); restore(); }

console.log(`\nE4-C1 WP5-C3 follow-up (Force Point lifecycle): ${n} checks passed.`);
