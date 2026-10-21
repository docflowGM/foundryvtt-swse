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
  const ok = install({ status: 'payout-failed', escrowExtra: { payouts: [{ success: true, transactionId: 'p1', seatId: 'seat_A', actorId: 'A', approvedPayout: 150 }], payoutRollbacks: [{ success: true, transactionId: 'pr1', seatId: 'seat_A' }] } });
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
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0/G22 wager refund replay: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
