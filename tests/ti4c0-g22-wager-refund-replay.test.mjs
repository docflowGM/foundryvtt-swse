/**
 * TI4-C0 / G22 — GameCreditEscrowService.refundSession() must not refund a wager entry that was already refunded, must keep per-entry refund
 * evidence across partial failure, and must never silently repeat an unresolved (indeterminate / rollbackFailed / interrupted) refund.
 *
 * Real production code under test: GameCreditEscrowService (refundSession, prepareEscrow) and GameSessionStore (over an in-memory world-setting
 * model whose `set` can be made to fail). Narrowly injected: TransactionEngine.executeCreditAdjustment (a recorded, scriptable model that moves
 * actor credits only on the outcomes that can move them) and game.actors. Level: L1 (one client, offline). Not exactly-once, not cross-client, not
 * durable.
 *
 * The runner RECORDS each case's failure so a fail-before run shows exactly which behaviours are missing.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= (n = 8) => Math.random().toString(36).slice(2, 2 + n);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.Hooks = { callAll() {}, on() {}, once() {} };

const { GameCreditEscrowService: Svc } = await import('/systems/foundryvtt-swse/scripts/games/wagers/game-credit-escrow-service.js');
const { GameSessionStore } = await import('/systems/foundryvtt-swse/scripts/games/game-session-store.js');
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');

const clone = (v) => JSON.parse(JSON.stringify(v));
const savedAdjust = TransactionEngine.executeCreditAdjustment;
const savedGame = globalThis.game;

/* ---- harness ---- */
const world = { sessions: [], setCalls: 0, failSetWhen: null };
const engine = { calls: [], script: {}, txCounter: 0, credits: {}, throwFor: new Set() };
let actorsById = {};
const outcomeMoves = new Set(['ok', 'rollbackFailed', 'indeterminate']);

function install({ seats = ['A', 'B'], credits = { A: 900, B: 900 }, status = 'escrowed', escrowExtra = {}, missingActors = [] } = {}) {
  world.sessions = []; world.setCalls = 0; world.failSetWhen = null;
  Object.assign(engine, { calls: [], script: {}, txCounter: 0, credits: { ...credits }, throwFor: new Set() });
  actorsById = Object.fromEntries(seats.filter((id) => !missingActors.includes(id)).map((id) => [id, { id, name: `Actor ${id}`, system: { credits: credits[id] } }]));
  globalThis.game = { ...(savedGame ?? {}), user: { id: 'gm', isGM: true }, actors: { get: (id) => actorsById[id] ?? null },
    settings: { get: (_m, key) => (key === 'gamesSessions' ? world.sessions : ({ gamesEnabled: true, gamesAllowWagers: true, gamesAllowCreditWagers: true }[key])),
      set: async (_m, key, value) => { world.setCalls++; if (world.failSetWhen?.(value, world.setCalls)) throw new Error('settings write refused'); if (key === 'gamesSessions') world.sessions = clone(value); } } };
  TransactionEngine.executeCreditAdjustment = async (ctx, opts) => {
    const id = ctx.actor.id; const n = engine.calls.filter((c) => c.actorId === id).length;
    const scripted = engine.script[id]?.[n] ?? 'ok';
    const call = { actorId: id, amount: ctx.amount, context: ctx.transactionContext, audit: ctx.audit, outcome: scripted, source: opts?.source };
    engine.calls.push(call);
    if (scripted === 'throw') throw new Error('engine exploded');
    const transactionId = `rtx_${++engine.txCounter}`;
    if (outcomeMoves.has(scripted)) engine.credits[id] = (engine.credits[id] ?? 0) + ctx.amount;
    if (scripted === 'ok') return { success: true, transactionId, creditsBefore: engine.credits[id] - ctx.amount, creditsAfter: engine.credits[id], error: null };
    if (scripted === 'fail') return { success: false, transactionId, error: 'Credit adjustment refused' };
    if (scripted === 'rollbackFailed') return { success: false, transactionId, rollbackFailed: true, error: 'Credit adjustment failed and rollback failed' };
    if (scripted === 'indeterminate') return { success: false, transactionId, indeterminate: true, error: 'outcome unknown' };
    if (scripted === 'malformed') return { transactionId };
    throw new Error(`unknown scripted outcome ${scripted}`);
  };
  const entries = seats.map((id) => ({ seatId: `seat_${id}`, seatLabel: `Seat ${id}`, actorId: id, actorName: `Actor ${id}`, amount: 100, transactionId: `dtx_${id}`, creditsBefore: 1000, creditsAfter: 900 }));
  const session = {
    id: 'game1', gameId: 'pazaak', title: 'Pazaak Night', status: 'cancelled', rulesMode: 'wagered', wagerProfile: { mode: 'credits', buyIn: 100 },
    seats: seats.map((id) => ({ seatId: `seat_${id}`, type: 'player', actorId: id, displayName: `Seat ${id}`, status: 'accepted' })),
    escrow: { credits: { escrowId: 'esc1', status, buyIn: 100, pot: 100 * seats.length, entries, transactions: [], refunds: [], ...escrowExtra } }, log: []
  };
  world.sessions = [clone(session)];
  return session;
}
const stored = () => clone(world.sessions.find((s) => s.id === 'game1'));
const refundCalls = (id) => engine.calls.filter((c) => c.context === 'game-credit-refund' && (!id || c.actorId === id));
const refundOf = (res) => res.session?.escrow?.credits ?? stored().escrow.credits;
const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { TransactionEngine.executeCreditAdjustment = savedAdjust; globalThis.game = savedGame; }
}

/* ---------------------------------------------------------------------------------------------- */
await check('1. two escrowed entries are each refunded exactly once; the session is marked refunded; evidence is kept', async () => {
  const s = install();
  const r = await Svc.refundSession(s, 'cancelled');
  assert.equal(r.ok, true);
  assert.equal(refundCalls('A').length, 1); assert.equal(refundCalls('B').length, 1);
  assert.equal(engine.credits.A, 1000); assert.equal(engine.credits.B, 1000);
  assert.equal(stored().escrow.credits.status, 'refunded');
  assert.equal(stored().status, 'refunded');
  const credits = stored().escrow.credits;
  assert.equal(credits.refunds.filter((x) => x.success === true).length, 2);
  assert.ok(credits.refunds.every((x) => x.transactionId && x.seatId && x.amount === 100));
  assert.ok(Array.isArray(r.refunds) && r.refunds.length === 2, 'the existing return structure keeps `refunds`');
});

await check('2. first refund succeeds, second fails → refund-failed with the first refund recorded as completed', async () => {
  const s = install(); engine.script.B = ['fail'];
  const r = await Svc.refundSession(s, 'cancelled');
  assert.equal(r.ok, false);
  assert.equal(stored().escrow.credits.status, 'refund-failed');
  assert.equal(engine.credits.A, 1000); assert.equal(engine.credits.B, 900);
  assert.ok(r.error);
});

await check('3. a retry from refund-failed does NOT refund the already-refunded first entry again', async () => {
  const s = install(); engine.script.B = ['fail', 'ok'];
  await Svc.refundSession(s, 'cancelled');
  const retry = await Svc.refundSession(stored(), 'retry');
  assert.equal(refundCalls('A').length, 1, 'A is refunded exactly once across both attempts');
  assert.equal(engine.credits.A, 1000, 'A is not over-refunded');
  assert.equal(retry.ok, true);
});

await check('4. the second entry is refunded exactly once after a definitive failure; the session then becomes refunded', async () => {
  const s = install(); engine.script.B = ['fail', 'ok'];
  await Svc.refundSession(s, 'cancelled');
  await Svc.refundSession(stored(), 'retry');
  assert.equal(refundCalls('B').length, 2, 'one failed attempt + one successful retry');
  assert.equal(engine.credits.B, 1000);
  assert.equal(stored().escrow.credits.status, 'refunded');
});

await check('5. any further call after completion issues no credit movement', async () => {
  const s = install();
  await Svc.refundSession(s, 'cancelled');
  const calls = engine.calls.length;
  const again = await Svc.refundSession(stored(), 'again');
  assert.equal(again.ok, true);
  assert.equal(engine.calls.length, calls);
  const staleAgain = await Svc.refundSession(s, 'stale again');
  assert.equal(engine.calls.length, calls, 'even the original (stale) object does not move credits');
  assert.equal(engine.credits.A, 1000);
});

await check('6. a stale caller session cannot bypass the persisted refund evidence', async () => {
  const s = install(); engine.script.B = ['fail', 'ok'];
  const stale = clone(s);                                   // escrowed, no refund evidence
  await Svc.refundSession(s, 'cancelled');                  // A refunded, B failed
  const r = await Svc.refundSession(stale, 'stale retry');  // a caller still holding the pre-refund copy
  assert.equal(refundCalls('A').length, 1, 'A was not refunded again');
  assert.equal(engine.credits.A, 1000);
  assert.equal(engine.credits.B, 1000, 'B (not yet refunded) was completed once');
  assert.equal(stored().escrow.credits.status, 'refunded');
});

await check('7. completed refunds keep their transaction ids and audit evidence through later attempts (history is never overwritten)', async () => {
  const s = install(); engine.script.B = ['fail', 'ok'];
  await Svc.refundSession(s, 'cancelled');
  const firstA = stored().escrow.credits.refunds.find((x) => x.seatId === 'seat_A' && x.success === true);
  assert.ok(firstA?.transactionId);
  await Svc.refundSession(stored(), 'retry');
  const credits = stored().escrow.credits;
  const aRecords = credits.refunds.filter((x) => x.seatId === 'seat_A');
  assert.equal(aRecords.length, 1);
  assert.equal(aRecords[0].transactionId, firstA.transactionId, 'A\'s original refund transaction id survives');
  const bRecords = credits.refunds.filter((x) => x.seatId === 'seat_B');
  assert.equal(bRecords.length, 2, 'B keeps the failed attempt AND the successful retry');
  assert.deepEqual(bRecords.map((x) => x.success), [false, true]);
  assert.ok(refundCalls('A')[0].audit.refundOfTransactionId === 'dtx_A', 'the audit names the original debit transaction');
  const ledgerA = Object.values(credits.refundLedger ?? {}).find((x) => x.seatId === 'seat_A');
  assert.ok(ledgerA, 'a per-entry refund ledger exists');
  assert.equal(ledgerA.debitTransactionId, 'dtx_A'); assert.equal(ledgerA.refundTransactionId, firstA.transactionId); assert.equal(ledgerA.status, 'refunded'); assert.equal(ledgerA.actorId, 'A'); assert.equal(ledgerA.amount, 100);
});

for (const outcome of ['rollbackFailed', 'indeterminate', 'throw', 'malformed']) {
  await check(`8/9. a ${outcome} refund is unresolved: it is NOT retried automatically, the other entry is still refunded once, the session is not marked refunded`, async () => {
    const s = install(); engine.script.B = [outcome, 'ok'];
    const r = await Svc.refundSession(s, 'cancelled');
    assert.equal(r.ok, false);
    assert.equal(stored().escrow.credits.status, 'refund-failed');
    assert.notEqual(stored().escrow.credits.status, 'refunded');
    assert.equal(r.indeterminate, true, 'the unresolved outcome is explicit');
    const bBefore = refundCalls('B').length;
    const retry = await Svc.refundSession(stored(), 'retry');
    assert.equal(refundCalls('B').length, bBefore, 'no automatic retry of the unresolved entry');
    assert.equal(refundCalls('A').length, 1, 'A was refunded once and never again');
    assert.equal(retry.ok, false);
    assert.notEqual(stored().escrow.credits.status, 'refunded');
  });
}

await check('10. missing / malformed / ambiguous legacy refund evidence fails closed (no retry of that entry)', async () => {
  // legacy session shape: refunds[] only (no ledger). B's record is malformed; A's "success" has no transaction id.
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [
    { success: true, actorId: 'A', seatId: 'seat_A', amount: 100 },
    { actorId: 'B', seatId: 'seat_B', amount: 100, note: 'no success flag' }
  ] } });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0, 'neither ambiguous entry is refunded');
  assert.equal(r.ok, false);
  assert.notEqual(stored().escrow.credits.status, 'refunded');
  // legacy proven state: A has a real success record; B has a definitive failure → only B is retried
  const s2 = install({ status: 'refund-failed', escrowExtra: { refunds: [
    { success: true, transactionId: 'old_A', actorId: 'A', seatId: 'seat_A', amount: 100 },
    { success: false, transactionId: 'old_B', error: 'Credit adjustment refused', actorId: 'B', seatId: 'seat_B', amount: 100 }
  ] } });
  const r2 = await Svc.refundSession(s2, 'retry');
  assert.equal(refundCalls('A').length, 0, 'A\'s legacy success is recognised');
  assert.equal(refundCalls('B').length, 1);
  assert.equal(r2.ok, true);
  // two entries claiming the same debit transaction id are ambiguous
  const s3 = install();
  const dup = stored(); dup.escrow.credits.entries[1].transactionId = 'dtx_A'; world.sessions = [dup];
  await Svc.refundSession(s3, 'x');
  assert.equal(engine.calls.length, 0, 'ambiguous entry identity is not refunded');
});

await check('11. a missing Actor is reported without erasing evidence; the other entry is refunded once; a later retry refunds only the now-resolvable entry', async () => {
  const s = install({ missingActors: ['B'] });
  const r = await Svc.refundSession(s, 'cancelled');
  assert.equal(r.ok, false);
  assert.equal(refundCalls('A').length, 1); assert.equal(refundCalls('B').length, 0);
  assert.match(r.error, /no actor-backed wallet/i);
  assert.equal(stored().escrow.credits.refunds.filter((x) => x.seatId === 'seat_A' && x.success === true).length, 1, 'A\'s success is kept');
  actorsById.B = { id: 'B', name: 'Actor B', system: { credits: 900 } };
  const retry = await Svc.refundSession(stored(), 'retry');
  assert.equal(retry.ok, true);
  assert.equal(refundCalls('A').length, 1, 'A is not refunded again');
  assert.equal(refundCalls('B').length, 1);
  assert.equal(stored().escrow.credits.status, 'refunded');
});

await check('12a. persistence failure AFTER a refund moved credits: processing stops, no immediate second adjustment, the transaction id is surfaced, and a later call does not repeat it', async () => {
  const s = install();
  // fail the write that records A's OUTCOME (the 2nd settings write of the call; the 1st is the intent marker)
  world.failSetWhen = (_v, n) => n === 2;
  const r = await Svc.refundSession(s, 'cancelled');
  assert.equal(r.ok, false);
  assert.equal(r.indeterminate, true);
  assert.equal(refundCalls('A').length, 1, 'exactly one adjustment for A');
  assert.equal(refundCalls('B').length, 0, 'automatic processing stopped');
  assert.match(r.error, /settings write refused|persist/i);
  assert.ok(JSON.stringify(r).includes('rtx_1'), 'the refund transaction id is preserved in the result');
  world.failSetWhen = null;
  const retry = await Svc.refundSession(stored(), 'retry');
  assert.equal(refundCalls('A').length, 1, 'A is NOT refunded again (the interrupted attempt is treated as unresolved)');
  assert.equal(engine.credits.A, 1000, 'A not over-refunded');
  assert.equal(retry.ok, false);
  assert.notEqual(stored().escrow.credits.status, 'refunded');
});

await check('12b. if the refund INTENT cannot be recorded, no credit is moved for that entry and processing stops', async () => {
  const s = install();
  world.failSetWhen = (_v, n) => n === 1;
  const r = await Svc.refundSession(s, 'cancelled');
  assert.equal(r.ok, false);
  assert.equal(engine.calls.length, 0, 'no credit adjustment was issued');
  assert.equal(engine.credits.A, 900);
});

await check('13. the final refunded status requires every entry to be positively refunded', async () => {
  const s = install({ seats: ['A', 'B', 'C'], credits: { A: 900, B: 900, C: 900 } });
  engine.script.B = ['fail']; engine.script.C = ['indeterminate'];
  await Svc.refundSession(s, 'cancelled');
  const c = stored().escrow.credits;
  assert.equal(c.status, 'refund-failed'); assert.equal(c.refundedAt ?? null, null);
  assert.ok(String(c.refundError).length > 0);
  // zero-amount / no entries is legitimately complete (unchanged)
  const e = install({ seats: [] });
  const r = await Svc.refundSession(e, 'x');
  assert.equal(r.ok, true); assert.equal(stored().escrow.credits.status, 'refunded');
});

await check('14a. escrow-preparation rollback refunds are not duplicated by a later refundSession (prep refunded A, failed leg C)', async () => {
  const s = install({ seats: ['A', 'B', 'C'], credits: { A: 1000, B: 1000, C: 1000 }, status: 'pending' });
  const prep = clone(s); prep.status = 'pending-escrow'; prep.escrow.credits = { status: 'pending', refunds: [], entries: [], transactions: [] };
  world.sessions = [clone(prep)];
  // debits: A ok, B ok, C fails; prepare refunds A and B (B's refund fails)
  const origAdj = TransactionEngine.executeCreditAdjustment;
  let n = 0;
  TransactionEngine.executeCreditAdjustment = async (ctx, opts) => {
    n++; engine.calls.push({ actorId: ctx.actor.id, amount: ctx.amount, context: ctx.transactionContext, audit: ctx.audit });
    if (ctx.transactionContext === 'game-credit-escrow') return ctx.actor.id === 'C' ? { success: false, transactionId: 'dtx_fail', error: 'insufficient' } : { success: true, transactionId: `dtx_${ctx.actor.id}`, creditsBefore: 1000, creditsAfter: 900 };
    const bRefunds = engine.calls.filter((c) => c.actorId === 'B' && c.context === 'game-credit-refund').length;
    return (ctx.actor.id === 'B' && bRefunds === 1) ? { success: false, transactionId: 'rtx_b1', error: 'Credit adjustment refused' } : { success: true, transactionId: `rtx_${ctx.actor.id}_${bRefunds}`, creditsAfter: 1000 };
  };
  const p = await Svc.prepareEscrow(prep, {});
  assert.equal(p.ok, false);
  assert.equal(stored().escrow.credits.status, 'refund-failed');
  const refundsBefore = engine.calls.filter((c) => c.context === 'game-credit-refund');
  assert.deepEqual(refundsBefore.map((c) => c.actorId), ['A', 'B']);
  const later = await Svc.refundSession(stored(), 'GM retry');
  const refundsAfter = engine.calls.filter((c) => c.context === 'game-credit-refund');
  assert.equal(refundsAfter.filter((c) => c.actorId === 'A').length, 1, 'A\'s preparation refund is not repeated');
  assert.equal(refundsAfter.filter((c) => c.actorId === 'B').length, 2, 'B (definitive failure) is retried once');
  assert.equal(later.ok, true);
  TransactionEngine.executeCreditAdjustment = origAdj;
});

await check('14b. a session whose escrow preparation failed cleanly (status failed) stays non-refundable', async () => {
  const s = install({ status: 'failed' });
  const r = await Svc.refundSession(s, 'x');
  assert.equal(r.ok, false);
  assert.equal(engine.calls.length, 0);
});

await check('15. existing behaviour stays compatible: payout-failed with a definitive payout failure is refundable; return shape {ok, session, refunds, error}', async () => {
  const s = install({ status: 'payout-failed', escrowExtra: { payout: { success: false, transactionId: 'p1', error: 'Credit adjustment refused' } } });
  const r = await Svc.refundSession(s, 'cancelled');
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r).filter((k) => ['ok', 'session', 'refunds', 'error'].includes(k)).sort(), ['error', 'ok', 'refunds', 'session']);
  assert.equal(r.error, null);
  assert.equal(r.session.status, 'refunded');
  assert.equal(engine.credits.A, 1000);
});

await check('16. payout-failed with UNRESOLVED payout activity is not refunded (a payout may already have moved credits)', async () => {
  for (const extra of [
    { payout: { success: false, rollbackFailed: true, transactionId: 'p1', error: 'x' } },
    { payout: { success: false, indeterminate: true, transactionId: 'p1', error: 'x' } },
    { payouts: [{ success: true, transactionId: 'p1', seatId: 'seat_A', actorId: 'A', approvedPayout: 150 }], payoutRollbacks: [] },
    { payouts: [{ success: true, transactionId: 'p1', seatId: 'seat_A', actorId: 'A', approvedPayout: 150 }], payoutRollbacks: [{ success: false, rollbackFailed: true, seatId: 'seat_A' }] }
  ]) {
    const s = install({ status: 'payout-failed', escrowExtra: extra });
    const r = await Svc.refundSession(s, 'cancelled');
    assert.equal(r.ok, false);
    assert.equal(engine.calls.length, 0, 'no refund is issued over unresolved payout activity');
    assert.match(String(r.error), /payout/i);
    assert.equal(stored().escrow.credits.status, 'payout-failed', 'the unresolved payout state is preserved');
  }
  // a payout that WAS rolled back successfully leaves the buy-in refundable
  const ok = install({ status: 'payout-failed', escrowExtra: { payouts: [{ success: true, transactionId: 'p1', seatId: 'seat_A', actorId: 'A', approvedPayout: 150 }], payoutRollbacks: [{ success: true, transactionId: 'pr1', seatId: 'seat_A', actorId: 'A', amount: -150 }] } });
  assert.equal((await Svc.refundSession(ok, 'cancelled')).ok, true);
});

await check('17. a session missing from the store fails closed (no refund from a caller-supplied copy)', async () => {
  const s = install();
  world.sessions = [];
  const r = await Svc.refundSession(s, 'x');
  assert.equal(r.ok, false);
  assert.equal(engine.calls.length, 0);
});

await check('18. concurrent refunds of the same session in one client do not interleave (the second is refused)', async () => {
  const s = install();
  let release; const gate = new Promise((res) => { release = res; });
  const realAdj = TransactionEngine.executeCreditAdjustment;
  TransactionEngine.executeCreditAdjustment = async (ctx, o) => { await gate; return realAdj(ctx, o); };
  const first = Svc.refundSession(s, 'a');
  await new Promise((res) => setTimeout(res, 0));
  const secondP = Svc.refundSession(clone(s), 'b');
  const second = await Promise.race([secondP, new Promise((res) => setTimeout(() => res({ timedOut: true }), 50))]);
  release();
  await first; await secondP;
  assert.notEqual(second.timedOut, true, 'the second call was refused immediately instead of running concurrently');
  assert.equal(second.ok, false);
  assert.match(String(second.error), /in progress/i);
  assert.equal(refundCalls('A').length, 1); assert.equal(refundCalls('B').length, 1);
});

/* ---------------------------------------------------------------------------------------------- */
/* review correction 1: refund / payout evidence must belong to the debit being evaluated              */
/* ---------------------------------------------------------------------------------------------- */
const patchStored = (fn) => { const w = stored(); fn(w.escrow.credits, w); world.sessions = [w]; };
const statusOf = (key) => stored().escrow.credits.refundLedger?.[key]?.status;

await check('C1-R1a. a legacy success recorded for a DIFFERENT actor on the same seat is not ignored: the entry needs review and nothing is refunded', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_A', actorId: 'A_previous', seatId: 'seat_A', amount: 100 }] } });
  patchStored((c) => { c.entries = [c.entries[0]]; });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0, 'no credit adjustment on conflicting evidence');
  assert.equal(r.ok, false);
  assert.notEqual(stored().escrow.credits.status, 'refunded');
  assert.equal(r.indeterminate, true);
});

await check('C1-R1b. two distinct debits on one seat cannot both be certified refunded by one legacy success record', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_1', actorId: 'A', seatId: 'seat_A', amount: 100 }] } });
  patchStored((c) => { c.entries = [{ ...c.entries[0], transactionId: 'dtx_A1' }, { ...c.entries[0], transactionId: 'dtx_A2' }]; });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0, 'ambiguous evidence: neither debit is refunded again');
  assert.notEqual(stored().escrow.credits.status, 'refunded', 'the session is NOT certified refunded');
  assert.equal(r.ok, false);
});

await check('C1-R1b2. with an explicit debit id the success belongs to exactly one of two debits on a seat; the other is refunded once', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_1', actorId: 'A', seatId: 'seat_A', amount: 100, debitTransactionId: 'dtx_A1' }] } });
  patchStored((c) => { c.entries = [{ ...c.entries[0], transactionId: 'dtx_A1' }, { ...c.entries[0], transactionId: 'dtx_A2' }]; });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(refundCalls('A').length, 1, 'only the unrefunded debit is refunded');
  assert.equal(refundCalls('A')[0].audit.refundOfTransactionId, 'dtx_A2');
  assert.equal(r.ok, true);
});

await check('C1-R1c. a legacy refund naming a DIFFERENT debit id cannot satisfy this entry (orphan or foreign id ⇒ review, no credit movement)', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_x', actorId: 'A', seatId: 'seat_A', amount: 100, debitTransactionId: 'dtx_UNKNOWN' }] } });
  patchStored((c) => { c.entries = [c.entries[0]]; });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0);
  assert.equal(r.ok, false);
  assert.notEqual(stored().escrow.credits.status, 'refunded');
  // and a record that names ANOTHER entry's debit id does not satisfy this one
  const s2 = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_B', actorId: 'A', seatId: 'seat_A', amount: 100, debitTransactionId: 'dtx_B' }] } });
  const r2 = await Svc.refundSession(s2, 'retry');
  assert.equal(refundCalls().length, 0, 'contradictory cross-seat evidence: NEITHER affected entry (seat A, which the record names, nor seat B, whose debit it names) is refunded automatically');
  assert.equal(r2.ok, false);
  assert.notEqual(stored().escrow.credits.status, 'refunded');
});

await check('C2-R4a. a refund record on seat A naming seat B\'s debit is conflicting evidence for BOTH seats: neither is refunded, neither is certified refunded', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_x', actorId: 'A', seatId: 'seat_A', amount: 100, debitTransactionId: 'dtx_B' }] } });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(refundCalls().length, 0);
  assert.equal(r.ok, false); assert.equal(r.indeterminate, true);
  const reviewed = (r.unresolvedEntries ?? []).map((u) => u.seatId).sort();
  assert.deepEqual(reviewed, ['seat_A', 'seat_B']);
  assert.notEqual(stored().escrow.credits.status, 'refunded');
});

await check('C2-R4b. legitimate explicit identities on two debits of the SAME seat still attribute correctly (each refunded exactly once)', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [
    { success: true, transactionId: 'old_1', actorId: 'A', seatId: 'seat_A', amount: 100, debitTransactionId: 'dtx_A1' },
    { success: true, transactionId: 'old_2', actorId: 'A', seatId: 'seat_A', amount: 100, debitTransactionId: 'dtx_A2' }] } });
  patchStored((c) => { c.entries = [{ ...c.entries[0], transactionId: 'dtx_A1' }, { ...c.entries[0], transactionId: 'dtx_A2' }]; });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0);
  assert.equal(r.ok, true);
  assert.equal(stored().escrow.credits.status, 'refunded');
});

await check('C2-R4c. a record with neither a usable debit id nor a seat is unattributable: it blocks automatic refunds', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_x', actorId: 'A', amount: 100 }] } });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(refundCalls().length, 0); assert.equal(r.ok, false);
  assert.notEqual(stored().escrow.credits.status, 'refunded');
});

for (const [label, drop] of [['actorId', 'actorId'], ['amount', 'amount'], ['seatId', 'seatId']]) {
  for (const named of [false, true]) {
    await check(`C2-R5a. a legacy SUCCESS with missing ${label}${named ? ' (debit id named)' : ''} does not certify the refund and does not allow a retry`, async () => {
      const rec = { success: true, transactionId: 'old_A', actorId: 'A', seatId: 'seat_A', amount: 100, ...(named ? { debitTransactionId: 'dtx_A' } : {}) };
      delete rec[drop];
      const s = install({ status: 'refund-failed', escrowExtra: { refunds: [rec] } });
      patchStored((c) => { c.entries = [c.entries[0]]; });
      const r = await Svc.refundSession(s, 'retry');
      assert.equal(engine.calls.length, 0, 'no credit adjustment');
      assert.equal(r.ok, false);
      assert.notEqual(stored().escrow.credits.status, 'refunded');
    });
  }
}

await check('C2-R5b. a legacy FAILED record with missing identity cannot enable a retry (it may be an unattributed indeterminate attempt)', async () => {
  for (const drop of ['actorId', 'amount']) {
    const rec = { success: false, transactionId: 'old_A', error: 'Credit adjustment refused', actorId: 'A', seatId: 'seat_A', amount: 100 };
    delete rec[drop];
    const s = install({ status: 'refund-failed', escrowExtra: { refunds: [rec] } });
    patchStored((c) => { c.entries = [c.entries[0]]; });
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0, `missing ${drop}`); assert.equal(r.ok, false);
  }
});

await check('C2-R5c. a legacy record with a mismatched actor, amount or seat (debit id named) is conflicting evidence, never proof', async () => {
  for (const patch of [{ actorId: 'Z' }, { amount: 55 }, { seatId: 'seat_Z' }]) {
    const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_A', actorId: 'A', seatId: 'seat_A', amount: 100, debitTransactionId: 'dtx_A', ...patch }] } });
    patchStored((c) => { c.entries = [c.entries[0]]; });
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0, JSON.stringify(patch)); assert.equal(r.ok, false);
    assert.notEqual(stored().escrow.credits.status, 'refunded');
  }
});

for (const drop of ['actorId', 'amount', 'seatId', 'debitTransactionId']) {
  await check(`C2-R5d. a refundLedger record missing ${drop} is refused (review), not skipped as refunded and not re-refunded`, async () => {
    const s = install({ status: 'refund-failed' });
    patchStored((c) => { c.entries = [c.entries[0]]; const led = { key: 'dtx_A', seatId: 'seat_A', actorId: 'A', amount: 100, debitTransactionId: 'dtx_A', status: 'refunded', refundTransactionId: 'rtx_old', attempts: [] }; delete led[drop]; c.refundLedger = { dtx_A: led }; });
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0); assert.equal(r.ok, false);
    assert.notEqual(stored().escrow.credits.status, 'refunded');
  });
}

await check('C2-R6a. an explicit rollbackOfTransactionId is not enough: wrong actor, wrong amount, missing actor, missing amount or wrong seat does not reverse the payout', async () => {
  const payout = { success: true, transactionId: 'p1', seatId: 'seat_A', actorId: 'A', approvedPayout: 150 };
  const good = { success: true, transactionId: 'r', seatId: 'seat_A', actorId: 'A', amount: -150, rollbackOfTransactionId: 'p1' };
  for (const [label, rb, expectOk] of [
    ['complete', good, true],
    ['wrong actor', { ...good, actorId: 'B' }, false],
    ['wrong amount', { ...good, amount: -100 }, false],
    ['positive amount', { ...good, amount: 150 }, false],
    ['missing actor', (() => { const x = { ...good }; delete x.actorId; return x; })(), false],
    ['missing amount', (() => { const x = { ...good }; delete x.amount; return x; })(), false],
    ['wrong seat', { ...good, seatId: 'seat_B' }, false]
  ]) {
    const s = install({ status: 'payout-failed', escrowExtra: { payouts: [payout], payoutRollbacks: [rb] } });
    const r = await Svc.refundSession(s, 'x');
    assert.equal(r.ok, expectOk, label);
    if (!expectOk) assert.equal(engine.calls.length, 0, label);
  }
});

await check('C2-R6b. legacy (id-less) rollback evidence needs actor AND amount AND seat: a missing actor or amount does not reverse the payout', async () => {
  const payout = { success: true, transactionId: 'p1', seatId: 'seat_A', actorId: 'A', approvedPayout: 150 };
  const good = { success: true, transactionId: 'r', seatId: 'seat_A', actorId: 'A', amount: -150 };
  for (const [label, rb, expectOk] of [
    ['complete', good, true],
    ['missing actor', (() => { const x = { ...good }; delete x.actorId; return x; })(), false],
    ['missing amount', (() => { const x = { ...good }; delete x.amount; return x; })(), false]
  ]) {
    const s = install({ status: 'payout-failed', escrowExtra: { payouts: [payout], payoutRollbacks: [rb] } });
    const r = await Svc.refundSession(s, 'x');
    assert.equal(r.ok, expectOk, label);
  }
});

await check('C2-R6c. one rollback still cannot reverse two payouts, even with explicit ids (one-rollback-per-payout)', async () => {
  const p = { success: true, seatId: 'seat_A', actorId: 'A', approvedPayout: 150 };
  const s = install({ status: 'payout-failed', escrowExtra: { payouts: [{ ...p, transactionId: 'p1' }, { ...p, transactionId: 'p2' }],
    payoutRollbacks: [{ success: true, transactionId: 'r1', seatId: 'seat_A', actorId: 'A', amount: -150, rollbackOfTransactionId: 'p1' }] } });
  const r = await Svc.refundSession(s, 'x');
  assert.equal(r.ok, false); assert.equal(engine.calls.length, 0);
});

await check('C3-R7. a legacy record naming an UNKNOWN debit id with no usable seat is unattributable evidence: it must not vanish, every entry fails closed', async () => {
  for (const seatId of [undefined, null, '']) {
    const rec = { success: true, transactionId: 'old_x', actorId: 'A', amount: 100, debitTransactionId: 'dtx_UNKNOWN', seatId };
    if (seatId === undefined) delete rec.seatId;
    const s = install({ status: 'refund-failed', escrowExtra: { refunds: [rec] } });
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(refundCalls().length, 0, `seatId=${JSON.stringify(seatId)}: nothing refunded`);
    assert.equal(r.ok, false);
    assert.notEqual(stored().escrow.credits.status, 'refunded');
    assert.deepEqual((r.unresolvedEntries ?? []).map((u) => u.seatId).sort(), ['seat_A', 'seat_B']);
  }
});

for (const [label, patch] of [['missing', 'delete'], ['null', null], ['empty', ''], ['whitespace', '   ']]) {
  for (const ledStatus of [null, 'failed', 'refunded']) {
    await check(`C3-R8. an escrow entry whose debit transaction id is ${label} is never refunded or trusted as refunded (ledger: ${ledStatus ?? 'none'})`, async () => {
      const s = install({ status: 'refund-failed' });
      patchStored((c) => {
        c.entries = [c.entries[0]];
        if (patch === 'delete') delete c.entries[0].transactionId; else c.entries[0].transactionId = patch;
        if (ledStatus) c.refundLedger = { 'seat:seat_A': { key: 'seat:seat_A', seatId: 'seat_A', actorId: 'A', amount: 100, debitTransactionId: patch === 'delete' ? null : patch, status: ledStatus, ...(ledStatus === 'refunded' ? { refundTransactionId: 'rtx_old' } : {}), attempts: [] } };
      });
      const r = await Svc.refundSession(s, 'retry');
      assert.equal(engine.calls.length, 0, 'no automatic credit adjustment without an identifiable debit');
      assert.equal(r.ok, false);
      assert.notEqual(stored().escrow.credits.status, 'refunded', 'not certified refunded');
      assert.equal(r.indeterminate, true);
    });
  }
}

await check('C3-R8b. an ID-less legacy refund history record is still honoured when the escrow entry itself HAS a valid debit id and attribution is unambiguous', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_A', actorId: 'A', seatId: 'seat_A', amount: 100 }] } });
  patchStored((c) => { c.entries = [c.entries[0]]; });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0); assert.equal(r.ok, true);
  assert.equal(stored().escrow.credits.status, 'refunded');
});

/* ---- correction 4: a refund ledger must agree with the legacy refund history; contradictions fail closed ---- */
const ledgerA = (status, extra = {}) => ({ key: 'dtx_A', seatId: 'seat_A', actorId: 'A', amount: 100, debitTransactionId: 'dtx_A', status, attempts: [], ...extra });
const histA = (over = {}) => ({ success: true, transactionId: 'old_A', actorId: 'A', seatId: 'seat_A', amount: 100, debitTransactionId: 'dtx_A', ...over });
const setupC4 = (led, history) => { const s = install({ status: 'refund-failed', escrowExtra: { refunds: history } }); patchStored((c) => { c.entries = [c.entries[0]]; c.refundLedger = led ? { dtx_A: led } : undefined; }); return s; };

await check('C4-a. ledger says FAILED but history proves the debit WAS refunded ⇒ review, and credits are NOT moved a second time (actual duplicate movement: 1000 → 1100 without the fix)', async () => {
  for (const withId of [true, false]) {
    const s = setupC4(ledgerA('failed'), [histA(withId ? {} : { debitTransactionId: undefined })]);
    engine.credits.A = 1000;                                     // the refund the history records DID move credits: the actor is already whole
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.credits.A, 1000, `the actor is not credited a second time (debit id ${withId ? 'named' : 'implicit'}; balance ${engine.credits.A}, expected 1000)`);
    assert.equal(refundCalls().length, 0, 'no automatic credit adjustment');
    assert.equal(r.ok, false); assert.equal(r.indeterminate, true);
    assert.notEqual(stored().escrow.credits.status, 'refunded', 'not certified refunded on contradictory records');
  }
});

await check('C4-b. a ledger entry does not bypass unattributable or conflicting history (R7 / R4 / R5 evidence) ⇒ review, no credit movement', async () => {
  for (const [label, hist] of [
    ['unknown debit id, no seat', { success: true, transactionId: 'old_x', actorId: 'A', amount: 100, debitTransactionId: 'dtx_UNKNOWN' }],
    ['names this debit but records another seat', histA({ seatId: 'seat_B' })],
    ['names this debit but another actor', histA({ actorId: 'Z' })],
    ['names this debit but another amount', histA({ amount: 40 })],
    ['neither a debit id nor a seat', { success: true, transactionId: 'old_x', actorId: 'A', amount: 100 }]
  ]) {
    for (const status of ['failed', 'refunded']) {
      const s = setupC4(ledgerA(status, status === 'refunded' ? { refundTransactionId: 'rtx_old' } : {}), [hist]);
      const r = await Svc.refundSession(s, 'retry');
      assert.equal(engine.calls.length, 0, `${label} / ledger ${status}`);
      assert.equal(r.ok, false, `${label} / ledger ${status}`);
      assert.notEqual(stored().escrow.credits.status, 'refunded', `${label} / ledger ${status}`);
    }
  }
});

await check('C4-c. ledger FAILED + history INDETERMINATE or MALFORMED for the same debit ⇒ review (never an automatic retry)', async () => {
  for (const hist of [histA({ success: false, rollbackFailed: true, transactionId: 'old_A' }), histA({ success: false, indeterminate: true }), histA({ transactionId: undefined })]) {
    const s = setupC4(ledgerA('failed'), [hist]);
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0, JSON.stringify(hist)); assert.equal(r.ok, false);
  }
});

await check('C4-d. ledger REFUNDED must agree with history: a different refund transaction id, or history with no success, is contradictory ⇒ review', async () => {
  for (const hist of [[histA({ transactionId: 'old_DIFFERENT' })], [histA({ success: false, transactionId: 'old_A', error: 'refused' })]]) {
    const s = setupC4(ledgerA('refunded', { refundTransactionId: 'rtx_old' }), hist);
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0); assert.equal(r.ok, false);
    assert.notEqual(stored().escrow.credits.status, 'refunded');
  }
});

await check('C4-e. ledger INDETERMINATE / ATTEMPTING + history success ⇒ review (contradictory), never refunded and never retried', async () => {
  for (const status of ['indeterminate', 'attempting']) {
    const s = setupC4(ledgerA(status), [histA()]);
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0, status); assert.equal(r.ok, false);
    assert.notEqual(stored().escrow.credits.status, 'refunded');
    assert.deepEqual((r.unresolvedEntries ?? []).map((u) => u.status), ['review'], `${status}: contradictory records are review, not a trusted unresolved state`);
  }
});

await check('C4-f. agreeing ledger and history keep their normal behaviour: failed+failed ⇒ retried once; refunded+same success ⇒ skipped; indeterminate/attempting alone ⇒ unresolved; ledger with no history ⇒ trusted', async () => {
  let s = setupC4(ledgerA('failed'), [histA({ success: false, transactionId: 'old_A', error: 'refused' })]);
  let r = await Svc.refundSession(s, 'retry');
  assert.equal(refundCalls('A').length, 1); assert.equal(r.ok, true); assert.equal(engine.credits.A, 1000);
  s = setupC4(ledgerA('refunded', { refundTransactionId: 'old_A' }), [histA()]);
  r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0); assert.equal(r.ok, true); assert.equal(stored().escrow.credits.status, 'refunded');
  for (const status of ['indeterminate', 'attempting']) {
    s = setupC4(ledgerA(status), []);
    r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0, status); assert.equal(r.ok, false); assert.equal(r.indeterminate, true);
  }
  s = setupC4(ledgerA('failed'), []);
  r = await Svc.refundSession(s, 'retry');
  assert.equal(refundCalls('A').length, 1, 'a failed ledger with no history is retryable'); assert.equal(r.ok, true);
  s = setupC4(ledgerA('refunded', { refundTransactionId: 'rtx_old' }), []);
  r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0); assert.equal(r.ok, true);
});

await check('C4-g. history written by refundSession itself stays consistent with its ledger across a fail-then-retry (no false review)', async () => {
  const s = install(); engine.script.B = ['fail', 'fail', 'ok'];
  await Svc.refundSession(s, 'a'); await Svc.refundSession(stored(), 'b'); const r = await Svc.refundSession(stored(), 'c');
  assert.equal(r.ok, true); assert.equal(refundCalls('A').length, 1); assert.equal(refundCalls('B').length, 3);
  assert.equal(engine.credits.A, 1000); assert.equal(engine.credits.B, 1000);
});

/* ---- correction 5: all attributable history is reconciled (R9); a session already marked refunded does not bypass the checks (R10) ---- */
await check('C5-R9a. two DIFFERENT successful refund transactions for the same debit are conflicting evidence ⇒ review (never certified refunded); a duplicate record of the SAME refund is harmless', async () => {
  for (const withLedger of [false, true]) {
    const s = setupC4(withLedger ? ledgerA('refunded', { refundTransactionId: 'R1' }) : null, [histA({ transactionId: 'R1' }), histA({ transactionId: 'R2' })]);
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0, `ledger=${withLedger}`); assert.equal(r.ok, false, `ledger=${withLedger}`);
    assert.notEqual(stored().escrow.credits.status, 'refunded', `ledger=${withLedger}`);
    assert.deepEqual((r.unresolvedEntries ?? []).map((u) => u.status), ['review'], `ledger=${withLedger}`);
  }
  const same = setupC4(null, [histA({ transactionId: 'R1' }), histA({ transactionId: 'R1' })]);
  const ok = await Svc.refundSession(same, 'retry');
  assert.equal(engine.calls.length, 0); assert.equal(ok.ok, true); assert.equal(stored().escrow.credits.status, 'refunded');
});

await check('C5-R9b. a matching success does not conceal an unresolved or malformed record for the same debit ⇒ review', async () => {
  for (const [label, other] of [
    ['rollbackFailed', histA({ success: false, rollbackFailed: true, transactionId: 'R0' })],
    ['indeterminate', histA({ success: false, indeterminate: true, transactionId: 'R0' })],
    ['success without a transaction id', histA({ transactionId: undefined })],
    ['no success flag', histA({ success: undefined, transactionId: 'R0' })]
  ]) {
    const s = setupC4(null, [histA({ transactionId: 'R1' }), other]);
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0, label); assert.equal(r.ok, false, label);
    assert.notEqual(stored().escrow.credits.status, 'refunded', label);
  }
});

await check('C5-R9c. an earlier DEFINITIVE failure followed by one success is the normal retry history ⇒ still refunded', async () => {
  const s = setupC4(null, [histA({ success: false, transactionId: 'F1', error: 'refused' }), histA({ transactionId: 'R1' })]);
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0); assert.equal(r.ok, true); assert.equal(stored().escrow.credits.status, 'refunded');
});

await check('C5-R10a. a session ALREADY marked refunded does not return success when its refund records contradict one another', async () => {
  for (const [label, led, hist] of [
    ['two different successes', null, [histA({ transactionId: 'R1' }), histA({ transactionId: 'R2' })]],
    ['ledger failed + history success', ledgerA('failed'), [histA()]],
    ['success + unresolved record', null, [histA({ transactionId: 'R1' }), histA({ success: false, rollbackFailed: true, transactionId: 'R0' })]],
    ['unattributable history', null, [histA(), { success: true, transactionId: 'x', actorId: 'A', amount: 100 }]]
  ]) {
    const s = setupC4(led, hist);
    patchStored((c) => { c.status = 'refunded'; });
    const r = await Svc.refundSession(s, 'again');
    assert.equal(engine.calls.length, 0, label);
    assert.equal(r.ok, false, `${label}: must not report success`);
    assert.equal(r.skipped, undefined, label);
    assert.equal(r.indeterminate, true, label);
    assert.equal(stored().escrow.credits.status, 'refunded', `${label}: the stored session is not rewritten`);
  }
});

await check('C5-R10b. a session marked refunded with NO verifiable refund evidence is not reported as a verified success and no credits move', async () => {
  const s = install({ status: 'refunded' });
  const r = await Svc.refundSession(s, 'again');
  assert.equal(engine.calls.length, 0); assert.equal(r.ok, false); assert.equal(r.indeterminate, true);
});

await check('C5-R10c. a session marked refunded whose evidence is consistent keeps its harmless skipped success (also for a stale caller copy)', async () => {
  const s = install();
  await Svc.refundSession(s, 'first');
  const calls = engine.calls.length;
  for (const copy of [stored(), s]) {
    const r = await Svc.refundSession(copy, 'again');
    assert.equal(r.ok, true); assert.equal(r.skipped, true);
  }
  assert.equal(engine.calls.length, calls);
});

await check('C1-R1d. a legacy record whose amount differs from the debit is not proof of that debit\'s refund (review)', async () => {
  const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_A', actorId: 'A', seatId: 'seat_A', amount: 40 }] } });
  patchStored((c) => { c.entries = [c.entries[0]]; });
  await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0);
  assert.notEqual(stored().escrow.credits.status, 'refunded');
});

for (const [label, mutate] of [
  ['a different debit transaction id', (led) => { led.debitTransactionId = 'dtx_X'; }],
  ['a different amount', (led) => { led.amount = 50; }],
  ['a different actor', (led) => { led.actorId = 'someone_else'; }],
  ['a different seat', (led) => { led.seatId = 'seat_Z'; }]
]) {
  await check(`C1-R1e. a refundLedger record with ${label} is refused (review), never skipped as refunded and never re-refunded`, async () => {
    const s = install({ status: 'refund-failed' });
    patchStored((c) => { c.entries = [c.entries[0]]; c.refundLedger = { dtx_A: { key: 'dtx_A', seatId: 'seat_A', actorId: 'A', amount: 100, debitTransactionId: 'dtx_A', status: 'refunded', refundTransactionId: 'rtx_old', attempts: [] } }; mutate(c.refundLedger.dtx_A); });
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0);
    assert.notEqual(stored().escrow.credits.status, 'refunded');
    assert.equal(r.ok, false);
  });
}

await check('C1-R1f. an unambiguous legacy refund (single entry, same actor and amount, valid transaction id) is still recognised, with or without a debit id', async () => {
  for (const extra of [{}, { debitTransactionId: 'dtx_A' }]) {
    const s = install({ status: 'refund-failed', escrowExtra: { refunds: [{ success: true, transactionId: 'old_A', actorId: 'A', seatId: 'seat_A', amount: 100, ...extra }] } });
    patchStored((c) => { c.entries = [c.entries[0]]; });
    const r = await Svc.refundSession(s, 'retry');
    assert.equal(engine.calls.length, 0, 'already refunded: skipped');
    assert.equal(r.ok, true);
    assert.equal(stored().escrow.credits.status, 'refunded');
  }
});

await check('C1-R2a. a stale caller copy that says "not a credit wager" cannot cause a false successful skip: the stored session decides', async () => {
  const s = install();
  const stale = clone(s); stale.wagerProfile = { mode: 'none' }; stale.rulesMode = 'republic-senate';
  const r = await Svc.refundSession(stale, 'retry');
  assert.equal(r.skipped, undefined, 'not skipped');
  assert.equal(refundCalls().length, 2, 'the stored credit wager is refunded');
  assert.equal(r.ok, true);
});

await check('C1-R2b. a stale caller copy that says "credit wager" cannot enable a refund when the stored session is not a credit wager', async () => {
  const s = install();
  patchStored((c, w) => { w.wagerProfile = { mode: 'none' }; w.rulesMode = 'republic-senate'; });
  const r = await Svc.refundSession(s, 'retry');
  assert.equal(engine.calls.length, 0);
  assert.equal(r.ok, true);
  assert.equal(r.skipped, true);
});

await check('C1-R2c. a missing stored session stays a refusal for a credit wager; a genuine non-credit game keeps its skip', async () => {
  const s = install(); world.sessions = [];
  const refused = await Svc.refundSession(s, 'x');
  assert.equal(refused.ok, false); assert.equal(engine.calls.length, 0);
  const none = { id: 'game9', rulesMode: 'republic-senate', wagerProfile: { mode: 'none' }, escrow: {}, seats: [] };
  const skipped = await Svc.refundSession(none, 'x');
  assert.equal(skipped.ok, true); assert.equal(skipped.skipped, true);
});

await check('C1-R3a. an unrelated payout rollback (a different payout, same seat) cannot establish that this payout was reversed', async () => {
  const s = install({ status: 'payout-failed', escrowExtra: {
    payouts: [{ success: true, transactionId: 'p1', seatId: 'seat_A', actorId: 'A', approvedPayout: 150 }],
    payoutRollbacks: [{ success: true, transactionId: 'pr_other', seatId: 'seat_A', actorId: 'A', amount: -150, rollbackOfTransactionId: 'p_OTHER' }] } });
  const r = await Svc.refundSession(s, 'x');
  assert.equal(r.ok, false); assert.equal(engine.calls.length, 0);
  assert.match(String(r.error), /payout/i);
});

await check('C1-R3b. a legacy-shaped rollback with the wrong amount or actor does not match; a matching one (seat, actor, amount) or an explicit-id one does; each rollback is used once', async () => {
  const payout = { success: true, transactionId: 'p1', seatId: 'seat_A', actorId: 'A', approvedPayout: 150 };
  for (const [rb, expectOk] of [
    [{ success: true, transactionId: 'r', seatId: 'seat_A', actorId: 'A', amount: -100 }, false],
    [{ success: true, transactionId: 'r', seatId: 'seat_A', actorId: 'B', amount: -150 }, false],
    [{ success: true, transactionId: 'r', seatId: 'seat_A', actorId: 'A', amount: -150 }, true],
    [{ success: true, transactionId: 'r', seatId: 'seat_A', actorId: 'A', amount: -150, rollbackOfTransactionId: 'p1' }, true]
  ]) {
    const s = install({ status: 'payout-failed', escrowExtra: { payouts: [payout], payoutRollbacks: [rb] } });
    const r = await Svc.refundSession(s, 'x');
    assert.equal(r.ok, expectOk, JSON.stringify(rb));
  }
  // two payouts of the same size on one seat, only ONE rollback: the second payout is unmatched
  const two = install({ status: 'payout-failed', escrowExtra: { payouts: [payout, { ...payout, transactionId: 'p2' }], payoutRollbacks: [{ success: true, transactionId: 'r1', seatId: 'seat_A', actorId: 'A', amount: -150 }] } });
  const r2 = await Svc.refundSession(two, 'x');
  assert.equal(r2.ok, false); assert.equal(engine.calls.length, 0);
});

await check('C1-R3c. new payout rollbacks record WHICH payout they reverse (rollbackOfTransactionId)', async () => {
  const s = install({ status: 'escrowed', escrowExtra: { payoutMode: 'table-credit-balances' } });
  patchStored((c, w) => { w.gameState = { phase: 'complete' }; });
  // seat_A cashout succeeds, seat_B cashout fails -> A's payout is rolled back
  const origAdj = TransactionEngine.executeCreditAdjustment; let n = 0;
  TransactionEngine.executeCreditAdjustment = async (ctx, o) => {
    n++; engine.calls.push({ actorId: ctx.actor.id, amount: ctx.amount, context: ctx.transactionContext });
    if (ctx.actor.id === 'B' && ctx.amount > 0) return { success: false, transactionId: 'pb_fail', error: 'payout refused' };
    return { success: true, transactionId: `t${n}`, error: null };
  };
  const out = await Svc.settleTableCreditBalances(stored(), { balances: { seat_A: 50, seat_B: 50 }, reason: 'cashout' });
  TransactionEngine.executeCreditAdjustment = origAdj;
  const c = stored().escrow.credits;
  assert.equal(c.status, 'payout-failed', JSON.stringify({ ok: out.ok, err: out.error }));
  const payoutA = c.payouts.find((p) => p.seatId === 'seat_A');
  const rb = c.payoutRollbacks.find((r) => r.seatId === 'seat_A');
  assert.ok(payoutA?.transactionId && rb, 'payout A and its rollback were recorded');
  assert.equal(rb.rollbackOfTransactionId, payoutA.transactionId);
});

/* ---------------------------------------------------------------------------------------------- */
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0/G22 wager refund replay: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
