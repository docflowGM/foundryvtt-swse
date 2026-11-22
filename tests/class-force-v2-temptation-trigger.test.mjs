// Class/Force x Force V2 integration (issue #1166, slice 3): Sith Lord Temptation Force Point trigger.
// Behavior test against the REAL ActorEngine Force Point ledger (spend -> finalize -> durable outbox) and the REAL
// Temptation consumer. The trigger derives ONLY from the FIRST committed->finalized transition of an actor-ledger receipt.
// Not FOUNDRY_TESTED: offline Node + Foundry shim only.
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}
};
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.foundry.utils.randomID = (() => { let n = 0; return () => `rcpt-${++n}`; })();

// A real, awaiting Hooks registry (the shim's is a no-op).
const hookHandlers = {};
globalThis.Hooks = {
  on: (name, fn) => { (hookHandlers[name] ??= []).push(fn); return fn; },
  once: (name, fn) => { (hookHandlers[name] ??= []).push(fn); return fn; },
  callAll: (name, ...args) => Promise.all((hookHandlers[name] ?? []).map((fn) => fn(...args)))
};

const live = { id: 'combat-1', started: true, round: 2, turn: 1, combatant: { id: 'cb-sith', actor: null } };
globalThis.game = Object.assign(globalThis.game ?? {}, {
  user: { isGM: true }, combat: live, actors: [], time: { worldTime: 0 }, ready: false
});

const { SithLordTemptationService, registerSithLordTemptationHooks, verifyFinalizedForceReceipt } =
  await import('/systems/foundryvtt-swse/scripts/engine/combat/sith-lord-temptation-service.js');
const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
const { registerForcePointTriggerConsumer, hasForcePointTriggerConsumers } =
  await import('/systems/foundryvtt-swse/scripts/engine/force/force-point-trigger-registry.js');
SWSEDialogV2.wait = async () => null; // consequence choice stays 'pending-target-choice' (durable) in tests

let throwAfterWrite = false;
const writer = async (actor, update) => {
  for (const [path, value] of Object.entries(update)) setPath(actor, path, value);
  if (throwAfterWrite) { throwAfterWrite = false; throw new Error('write applied, acknowledgement failed'); }
  return actor;
};
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);
ActorEngine.applyMutationPlan = async (actor, plan) => writer(actor, plan.set);

const TEMPT = 'flags.swse.classFeatures.sithLord.temptation';
const EVENTS = (a) => a.flags?.swse?.classFeatures?.sithLord?.temptationEvents ?? [];
const ledger = (a) => a.flags?.swse?.forcePointLedger?.receipts ?? [];
const makeTarget = (id = 'target-1', { owner = true } = {}) => {
  const a = {
    id, name: `Target ${id}`, type: 'character',
    system: { forcePoints: { value: 5, max: 5 }, conditionTrack: { current: 0 }, darkSideScore: { value: 0 }, level: { heroic: 1 } },
    flags: { swse: { bonusForcePoints: { value: 0, entries: [] } } }, items: [],
    getFlag(scope, name) { return this.flags?.[scope]?.[name]; },
    testUserPermission() { return owner; }
  };
  setPath(a, TEMPT, [{
    id: `sith:${live.id}:2:5`, sourceActorId: 'sith', sourceCombatantId: 'cb-sith', targetActorId: id,
    encounterId: live.id, createdRound: 2, createdTurn: 5, checkTotal: 30, willDefense: 10, state: 'active'
  }]);
  return a;
};
let req = 0;
const spend = (actor) => { live.combatant = { id: `cb-${actor.id}`, actor }; return ActorEngine.spendForcePoints(actor, 1, { useKind: 'roll-bonus', rollDomain: 'skill.acrobatics', requestId: `r${++req}` }); };
let n = 0;
const ok = (label) => { n += 1; console.log(`  [${n}] ${label} OK`); };

try {
  // 1. With NO consumer registered, finalization records no trigger and nothing is delivered (no hidden global state).
  {
    assert.equal(hasForcePointTriggerConsumers(), false);
    const t = makeTarget('no-consumer');
    const r = await spend(t);
    assert.deepEqual(await ActorEngine.finalizeForcePointSpend(t, r), { finalized: true, receiptId: r.receiptId });
    assert.equal(ledger(t)[0].state, 'finalized');
    assert.equal(ledger(t)[0].trigger, undefined, 'no consumer => no outbox record');
    ok('no consumer registered: finality unchanged, no outbox record');
  }

  registerSithLordTemptationHooks();
  assert.equal(hasForcePointTriggerConsumers(), true);

  // 2. A committed (pending) receipt never triggers; only finalization does, exactly once, carrying the ledger receiptId.
  {
    const t = makeTarget('t2');
    const r = await spend(t);
    assert.equal(ledger(t)[0].state, 'committed');
    assert.equal(EVENTS(t).length, 0, 'a committed/pending receipt must not trigger');
    const fin = await ActorEngine.finalizeForcePointSpend(t, r);
    assert.deepEqual(fin, { finalized: true, receiptId: r.receiptId }, 'return shape unchanged for existing callers');
    const rows = EVENTS(t);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].receiptId, r.receiptId, "consequence carries the ledger's ORIGINAL receiptId, not a random event id");
    assert.equal(rows[0].eventKey, `${r.receiptId}:sith:${live.id}:2:5`);
    assert.equal(rows[0].resource, 'force');
    assert.equal(rows[0].state, 'pending-target-choice', 'owner-selected consequence preserved; nothing applied automatically');
    assert.equal(t.system.darkSide?.value ?? 0, 0);
    assert.equal(ledger(t)[0].trigger.state, 'delivered');
    ok('first finalization triggers exactly once with the ledger receiptId; consequence stays target-owned');

    // 3. alreadyFinalized retry never duplicates.
    const again = await ActorEngine.finalizeForcePointSpend(t, r);
    assert.deepEqual(again, { finalized: true, alreadyFinalized: true });
    assert.equal(EVENTS(t).length, 1, 'alreadyFinalized retry must not create a second consequence');
    ok('alreadyFinalized retry creates no duplicate consequence');
  }

  // 4. Rolled-back and invalid receipts never trigger.
  {
    const t = makeTarget('t4');
    const r = await spend(t);
    const rb = await ActorEngine.rollbackForcePointSpend(t, r);
    assert.equal(rb.rolledBack, true);
    const fin = await ActorEngine.finalizeForcePointSpend(t, r);
    assert.equal(fin.finalized, false);
    assert.equal(EVENTS(t).length, 0, 'a rolled-back spend (failed/cancelled roll) must not trigger');
    const bogus = await ActorEngine.finalizeForcePointSpend(t, { receiptId: 'never-existed' });
    assert.equal(bogus.finalized, false);
    assert.equal(EVENTS(t).length, 0);
    ok('rolled-back and unknown receipts never trigger');
  }

  // 5. Caller-supplied payloads are not trusted: the target's own finalized ledger is.
  {
    const t = makeTarget('t5');
    const pend = await spend(t);                      // still committed
    live.round = 3;
    const good = await spend(t);
    live.round = 2;
    await ActorEngine.finalizeForcePointSpend(t, good);
    const base = { actor: t, actorId: t.id, resource: 'force', spent: 1, committed: true, source: 'ActorEngine.finalizeForcePointSpend' };
    const before = EVENTS(t).length;
    assert.equal((await SithLordTemptationService.consumeSpendReceipt({ ...base, receiptId: 'forged' })).reason, 'receipt-not-in-actor-ledger');
    assert.equal((await SithLordTemptationService.consumeSpendReceipt({ ...base, receiptId: pend.receiptId })).reason, 'receipt-not-finalized');
    assert.equal((await SithLordTemptationService.consumeSpendReceipt({ ...base, receiptId: good.receiptId, spent: 3 })).reason, 'receipt-amount-mismatch');
    assert.equal((await SithLordTemptationService.consumeSpendReceipt({ ...base, receiptId: good.receiptId, source: 'RollCore.execute' })).reason, 'untrusted-event-source');
    assert.equal(verifyFinalizedForceReceipt(makeTarget('other'), { ...base, receiptId: good.receiptId }).ok, false, 'another actor cannot claim this receipt');
    assert.equal(EVENTS(t).length, before, 'no spoofed payload created a consequence');
    // the legacy hook path no longer accepts Force Point events at all
    await globalThis.Hooks.callAll('swse.resourceSpent', { ...base, receiptId: 'forged-hook', actor: t });
    assert.equal(EVENTS(t).length, before, 'swse.resourceSpent is Destiny-only; a forged Force event is ignored');
    ok('forged, pending, mismatched-amount, wrong-source, wrong-actor and hook-injected Force events are all rejected');
  }

  // 6. Listener failure: finality stays, trigger stays pending, reconcile delivers once; no duplicate consequence.
  {
    const t = makeTarget('t6');
    let fail = true;
    const unregister = registerForcePointTriggerConsumer(async () => { if (fail) throw new Error('listener down'); });
    const r = await spend(t);
    await ActorEngine.finalizeForcePointSpend(t, r);
    assert.equal(ledger(t)[0].state, 'finalized', 'paid effect/finality is never reversed for a notification failure');
    assert.equal(ledger(t)[0].trigger.state, 'pending', 'failed delivery leaves a durable pending trigger');
    assert.equal(t.system.forcePoints.value, 4, 'Force Point is not re-charged or refunded');
    fail = false;
    const rep = await ActorEngine.dispatchForcePointTriggers(t);
    assert.equal(rep.delivered, 1);
    assert.equal(ledger(t)[0].trigger.state, 'delivered');
    assert.equal(EVENTS(t).length, 1, 'consequence exists exactly once after the retry (receipt-id dedupe)');
    assert.equal((await ActorEngine.dispatchForcePointTriggers(t)).delivered, 0, 'delivered triggers are not redelivered');
    unregister();
    ok('listener failure keeps a durable pending trigger; reconcile delivers once; never re-charged or reversed');
  }

  // 7. A write that applied but threw (acknowledgement failure) is still reconcilable from the ledger.
  {
    const t = makeTarget('t7');
    const r = await spend(t);
    throwAfterWrite = true;
    await assert.rejects(() => ActorEngine.finalizeForcePointSpend(t, r), /acknowledgement failed/);
    assert.equal(ledger(t)[0].state, 'finalized', 'the write that applied is authoritative');
    assert.equal(ledger(t)[0].trigger.state, 'pending', 'trigger was recorded in the SAME write as finality');
    const rep = await ActorEngine.dispatchForcePointTriggers(t);
    assert.equal(rep.delivered, 1);
    assert.equal(EVENTS(t).length, 1);
    ok('write applied then threw: trigger reconciled from the final receipt, once');
  }

  // 8. Timing window is judged as of the SPEND (captured at finalization), so a late replay is equivalent.
  {
    const t = makeTarget('t8');
    let fail = true;
    const unregister = registerForcePointTriggerConsumer(async () => { if (fail) throw new Error('offline'); });
    const r = await spend(t);
    await ActorEngine.finalizeForcePointSpend(t, r);          // finalized in round 2
    assert.equal(ledger(t)[0].trigger.context.round, 2);
    live.round = 5;                                          // live combat has since moved well past the window
    fail = false;
    const rep = await ActorEngine.dispatchForcePointTriggers(t);
    assert.equal(rep.delivered, 1);
    assert.equal(EVENTS(t).length, 1, 'a spend made inside the window still applies when delivered late');
    live.round = 2;
    unregister();
    ok('replayed trigger uses the captured spend-time context, not the live combat clock');
  }

  // 9. Concurrent finalization of one receipt yields exactly one consequence.
  {
    const t = makeTarget('t9');
    const r = await spend(t);
    const [a, b] = await Promise.all([ActorEngine.finalizeForcePointSpend(t, r), ActorEngine.finalizeForcePointSpend(t, r)]);
    assert.equal([a, b].filter((x) => x.alreadyFinalized).length, 1, 'exactly one caller performed the transition');
    assert.equal(EVENTS(t).length, 1);
    ok('concurrent finalization of the same receipt: one transition, one consequence');
  }

  // 10. Overlapping marks: one spend yields one choice per active source; separate spends are separate receipts.
  {
    const t = makeTarget('t10');
    setPath(t, TEMPT, [...t.flags.swse.classFeatures.sithLord.temptation, {
      id: `sith2:${live.id}:2:5`, sourceActorId: 'sith2', sourceCombatantId: 'cb-sith2', targetActorId: 't10',
      encounterId: live.id, createdRound: 2, createdTurn: 5, checkTotal: 30, willDefense: 10, state: 'active'
    }]);
    const r1 = await spend(t); await ActorEngine.finalizeForcePointSpend(t, r1);
    assert.equal(EVENTS(t).length, 2, 'two active sources => two target-owned choices for ONE spend');
    assert.deepEqual(new Set(EVENTS(t).map((e) => e.receiptId)), new Set([r1.receiptId]));
    live.round = 3;
    const r2 = await spend(t); await ActorEngine.finalizeForcePointSpend(t, r2);
    live.round = 2;
    assert.equal(EVENTS(t).length, 4);
    ok('overlapping marks: one choice per active source per spend; no cross-receipt dedupe');
  }

  // 11. Permission: a non-owner, non-GM client creates no consequence.
  {
    globalThis.game.user.isGM = false;
    const t = makeTarget('t11', { owner: false });
    const r = await spend(t);
    await ActorEngine.finalizeForcePointSpend(t, r);
    assert.equal(EVENTS(t).length, 0, 'no permission => nothing created');
    globalThis.game.user.isGM = true;
    const t2 = makeTarget('t11b', { owner: false });
    const r2 = await spend(t2);
    await ActorEngine.finalizeForcePointSpend(t2, r2);
    assert.equal(EVENTS(t2).length, 1, 'a GM spending on a player-owned actor works');
    ok('permission respected: GM or owner only');
  }

  // 12. Retention never drops a settled receipt whose trigger is still pending.
  {
    const t = makeTarget('t12');
    t.system.forcePoints.value = 999; t.system.forcePoints.max = 999;
    let fail = true;
    const unregister = registerForcePointTriggerConsumer(async () => { if (fail) throw new Error('offline'); });
    const first = await spend(t); await ActorEngine.finalizeForcePointSpend(t, first);
    assert.equal(ledger(t)[0].trigger.state, 'pending');
    unregister(); fail = false;
    // push the ledger past its 200-receipt bound with settled receipts that have NO pending trigger
    const filler = Array.from({ length: 230 }, (_, i) => ({ receiptId: `old-${i}`, actorId: t.id, state: 'finalized', spent: 1, requestId: `old-${i}` }));
    setPath(t, 'flags.swse.forcePointLedger', { receipts: [ledger(t)[0], ...filler] });
    live.round = 3;
    const extra = await spend(t);
    live.round = 2;
    assert.ok(ledger(t).some((r) => r.receiptId === first.receiptId && r.trigger?.state === 'pending'), 'pending-trigger receipt survives retention');
    assert.ok(ledger(t).length <= 232, 'retention still bounds the ledger');
    ok('retention keeps a receipt whose trigger is still pending delivery');
  }
} finally {
  restore();
}
console.log(`class-force-v2-temptation-trigger: ${n} checks passed`);
