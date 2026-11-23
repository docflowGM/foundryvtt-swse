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
let failMutation = false;
ActorEngine.applyMutationPlan = async (actor, plan) => {
  if (failMutation) { failMutation = false; throw new Error('mutation write failed'); }
  return writer(actor, plan.set);
};

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
    assert.equal(ledger(t)[0].spendEvidence.temptation.round, 2, 'evidence captured at the SPEND, on the receipt');
    assert.equal(ledger(t)[0].trigger.context, undefined, 'finalize-time context is gone');
    live.round = 5;                                          // live combat has since moved well past the window
    fail = false;
    const rep = await ActorEngine.dispatchForcePointTriggers(t);
    assert.equal(rep.delivered, 1);
    assert.equal(EVENTS(t).length, 1, 'a spend made inside the window still applies when delivered late');
    live.round = 2;
    unregister();
    ok('replayed trigger uses the spend-time evidence on the receipt, not the live combat clock');
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

  // ===================== Decision C: eligibility is judged at the SPEND commit =====================
  const marks = (t) => t.flags.swse.classFeatures.sithLord.temptation;
  const expireMarks = (t) => setPath(t, TEMPT, marks(t).map((m) => ({ ...m, state: 'expired' })));
  const withMark = (t, over = {}) => setPath(t, TEMPT, [...marks(t), {
    id: `sithX:${live.id}:${over.createdRound ?? 2}:${over.createdTurn ?? 5}`, sourceActorId: 'sithX', sourceCombatantId: 'cb-sithX',
    targetActorId: t.id, encounterId: live.id, createdRound: 2, createdTurn: 5, checkTotal: 30, willDefense: 10, state: 'active', ...over
  }]);
  const bareTarget = (id) => { const t = makeTarget(id); setPath(t, TEMPT, []); return t; };
  const setClock = (round, turn) => { live.round = round; live.turn = turn; };

  // 13. valid spend -> listener fails -> mark expires -> recovery creates exactly one pending choice.
  {
    const t = makeTarget('c13');
    const r = await spend(t);
    failMutation = true;                                         // the Temptation consumer's own write fails
    await ActorEngine.finalizeForcePointSpend(t, r);
    assert.equal(ledger(t)[0].trigger.state, 'pending');
    assert.equal(EVENTS(t).length, 0, 'nothing recorded yet');
    expireMarks(t);                                              // GM cleanup runs before recovery
    live.round = 9;                                              // and the encounter has moved on
    const rep = await ActorEngine.dispatchForcePointTriggers(t);
    assert.equal(rep.delivered, 1);
    assert.equal(EVENTS(t).length, 1, 'exactly one pending choice, from the spend-time evidence');
    assert.equal(EVENTS(t)[0].state, 'pending-target-choice');
    assert.equal(marks(t).every((m) => m.state === 'expired'), true, 'the expired mark was NOT reactivated');
    setClock(2, 1);
    ok('C1: spend -> listener fails -> mark expires -> recovery yields exactly one pending choice; mark stays expired');
  }

  // 14. finalize long after the round/turn advanced (and even after combat ended) still qualifies from the spend snapshot.
  {
    const t = makeTarget('c14');
    const r = await spend(t);
    setClock(7, 0);
    const savedCombat = globalThis.game.combat; globalThis.game.combat = null;     // encounter over
    await ActorEngine.finalizeForcePointSpend(t, r);
    globalThis.game.combat = savedCombat; setClock(2, 1);
    assert.equal(EVENTS(t).length, 1, 'late finalization qualifies from the spend-time snapshot');
    ok('C2: finalization after the turn/round advanced and combat ended still qualifies from the spend snapshot');
  }

  // 15. mark created AFTER the spend but BEFORE finalization is NOT eligible.
  {
    const t = bareTarget('c15');
    const r = await spend(t);                                    // no mark exists yet
    withMark(t);                                                 // mark appears afterwards
    await ActorEngine.finalizeForcePointSpend(t, r);
    assert.equal(EVENTS(t).length, 0, 'a spend made before the mark began never qualifies');
    ok('C3: mark-then-spend ordering: a mark created after the spend does not qualify it');
  }

  // 16. spend AFTER the mark expired, or after the Sith Lord\'s next turn began, is NOT eligible.
  {
    const a = makeTarget('c16a'); expireMarks(a);
    const ra = await spend(a); await ActorEngine.finalizeForcePointSpend(a, ra);
    assert.equal(EVENTS(a).length, 0, 'spend after expiration never qualifies');
    const b = makeTarget('c16b'); setClock(3, 5);                // round createdRound+1 and turn >= createdTurn: window closed
    const rb = await spend(b); await ActorEngine.finalizeForcePointSpend(b, rb);
    setClock(2, 1);
    assert.equal(EVENTS(b).length, 0, "spend once the source's next turn has begun never qualifies");
    ok('C4: spend after expiry, or after the window closed, never qualifies');
  }

  // 17. same-round / next-round / initiative-order boundaries (createdRound 2, createdTurn 5).
  {
    const cases = [[2, 0, 1], [2, 5, 1], [2, 9, 1], [3, 4, 1], [3, 5, 0], [3, 9, 0], [4, 0, 0], [1, 9, 0]];
    for (const [round, turn, expected] of cases) {
      const t = makeTarget(`c17-${round}-${turn}`);
      setClock(round, turn);
      const r = await spend(t); await ActorEngine.finalizeForcePointSpend(t, r);
      assert.equal(EVENTS(t).length, expected, `round ${round} turn ${turn} => ${expected ? 'qualifies' : 'does not qualify'}`);
    }
    setClock(2, 1);
    ok('C5: round/turn/initiative-order boundary: window closes exactly when the source\'s next turn begins');
  }

  // 18. multiple marks: only marks valid at the spend produce choices; one choice per mark.
  {
    const t = makeTarget('c18');
    withMark(t, { sourceActorId: 'sithB', sourceCombatantId: 'cb-sithB', id: `sithB:${live.id}:2:5` });
    withMark(t, { sourceActorId: 'sithOld', sourceCombatantId: 'cb-old', id: `sithOld:${live.id}:1:0`, createdRound: 1, createdTurn: 0 }); // window ended
    const r = await spend(t); await ActorEngine.finalizeForcePointSpend(t, r);
    assert.deepEqual(EVENTS(t).map((e) => e.sourceActorId).sort(), ['sith', 'sithB'], 'the out-of-window mark yields no choice');
    expireMarks(t);
    assert.equal(marks(t).length, 3, 'historical marks are retained');
    ok('C6: multiple marks: one choice per mark valid at the spend; stale marks excluded; history retained');
  }

  // 19. exact receipt-id replay creates no duplicate; dispatching again is a no-op.
  {
    const t = makeTarget('c19');
    const r = await spend(t); await ActorEngine.finalizeForcePointSpend(t, r);
    const again = await SithLordTemptationService.consumeSpendReceipt({
      actor: t, actorId: t.id, resource: 'force', spent: 1, committed: true, receiptId: r.receiptId, source: 'ActorEngine.finalizeForcePointSpend'
    });
    assert.equal(again.handled, false);
    assert.equal(again.reason, 'duplicate-spend-receipt');
    assert.equal(EVENTS(t).length, 1);
    ok('C7: exact receipt-id replay produces no duplicate consequence');
  }

  // 20. adversarial payloads and tampered evidence.
  {
    const base = (t, r) => ({ actor: t, actorId: t.id, resource: 'force', spent: 1, committed: true, receiptId: r.receiptId, source: 'ActorEngine.finalizeForcePointSpend' });
    // (a) payload-supplied evidence/context is ignored: a bare actor with a forged event context gets nothing
    const t1 = bareTarget('c20a'); const r1 = await spend(t1);
    await ActorEngine.finalizeForcePointSpend(t1, r1);
    const forged = { ...base(t1, r1), receiptId: r1.receiptId + '-x', spendEvidence: { temptation: { version: 1, combatId: live.id, round: 2, turn: 1, marks: [{ id: 'x', sourceActorId: 'x' }] } }, context: { combatId: live.id, round: 2, turn: 1 } };
    assert.equal((await SithLordTemptationService.consumeSpendReceipt(forged)).handled, false);
    // (b) tampered evidence on a real receipt: invented mark id / out-of-window mark / wrong encounter are all ignored
    const t2 = bareTarget('c20b'); const r2 = await spend(t2);
    const rec = ledger(t2).find((x) => x.receiptId === r2.receiptId);
    rec.spendEvidence.temptation = { version: 1, combatId: live.id, round: 2, turn: 1, marks: [
      { id: 'forged-id', sourceActorId: 'sithZ', sourceCombatantId: 'c', encounterId: live.id, createdRound: 2, createdTurn: 5 },
      { id: `sithZ:${live.id}:0:0`, sourceActorId: 'sithZ', sourceCombatantId: 'c', encounterId: live.id, createdRound: 0, createdTurn: 0 },
      { id: 'sithZ:other-combat:2:5', sourceActorId: 'sithZ', sourceCombatantId: 'c', encounterId: 'other-combat', createdRound: 2, createdTurn: 5 },
      { id: `${t2.id}:${live.id}:2:5`, sourceActorId: t2.id, sourceCombatantId: 'c', encounterId: live.id, createdRound: 2, createdTurn: 5 }
    ] };
    await ActorEngine.finalizeForcePointSpend(t2, r2);
    assert.equal(EVENTS(t2).length, 0, 'forged id, out-of-window, wrong-encounter and self-sourced marks all rejected');
    // (c) no spend-time evidence at all (spent outside combat) fails closed
    const t3 = makeTarget('c20c'); const savedC = globalThis.game.combat; globalThis.game.combat = null;
    const r3 = await spend(t3); globalThis.game.combat = savedC;
    await ActorEngine.finalizeForcePointSpend(t3, r3);
    assert.equal(ledger(t3).find((x) => x.receiptId === r3.receiptId).spendEvidence.temptation, undefined);
    assert.equal(EVENTS(t3).length, 0, 'a spend made outside combat never qualifies');
    ok('C8: adversarial payloads and tampered evidence are rejected; no evidence fails closed');
  }

  // 21. a mutation that cannot be persisted never loses the trigger or re-charges (uncertain write).
  {
    const t = makeTarget('c21');
    const r = await spend(t);
    const poolBefore = t.system.forcePoints.value;
    failMutation = true;
    await ActorEngine.finalizeForcePointSpend(t, r);
    assert.equal(t.system.forcePoints.value, poolBefore, 'no re-charge or refund on a failed consequence write');
    assert.equal(ledger(t)[0].trigger.state, 'pending');
    await ActorEngine.dispatchForcePointTriggers(t);
    assert.equal(EVENTS(t).length, 1);
    assert.equal(t.system.forcePoints.value, poolBefore);
    ok('C9: a failed consequence write keeps the trigger pending; recovery succeeds without re-charging');
  }

  // 22. Adding a NEW mark must not prune historical (expired) marks: retention is real, bounded, and never reactivates them.
  {
    const { planTemptationMark } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/sith-lord-temptation-state.js');
    const t = makeTarget('c22');
    expireMarks(t);
    const caster = { id: 'sithNew' };
    const plan = planTemptationMark({
      caster, target: t, combat: { id: live.id, started: true, round: 4, turn: 2, combatant: { id: 'cb-new' } },
      checkTotal: 30, willDefense: 10, confirmedLineOfSight: true
    });
    assert.equal(plan.allowed, true);
    const stored = plan.updates[TEMPT];
    assert.equal(stored.filter((m) => m.state === 'expired').length, 1, 'the expired mark survives a new mark being added');
    assert.equal(stored.filter((m) => m.state === 'active').length, 1, 'only the new mark is active; the old one is not reactivated');
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `old${i}`, state: 'expired', sourceActorId: 'x', targetActorId: t.id, encounterId: 'e', createdRound: 1, createdTurn: i }));
    setPath(t, TEMPT, many);
    const bounded = planTemptationMark({
      caster, target: t, combat: { id: live.id, started: true, round: 4, turn: 2, combatant: { id: 'cb-new' } },
      checkTotal: 30, willDefense: 10, confirmedLineOfSight: true
    }).updates[TEMPT];
    assert.ok(bounded.length <= 26, 'historical marks are retained but bounded');
    ok('C10: a new mark does not prune expired marks (bounded history), and never reactivates them');
  }
} finally {
  restore();
}
console.log(`class-force-v2-temptation-trigger: ${n} checks passed`);
