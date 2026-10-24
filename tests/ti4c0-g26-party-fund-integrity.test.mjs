/**
 * TI4-C0 / G26 — Holonet Party Fund contribution and payout must never misreport failed, committed or uncertain credit movement, and an
 * uncertain outcome must never trigger an automatic compensation that could create credits.
 *
 * Real production code under test: HolonetMessengerService._gmContributeToPartyFund and _gmPayFromPartyFund (unmodified call paths, including the real
 * party-fund balance / ledger setting helpers). Narrowly injected: game.settings (an in-memory world-setting model whose writes can be made to fail, or to
 * persist and then throw), TransactionEngine.executeCreditAdjustment (a scriptable model that moves actor credits only on the outcomes that can move
 * them), the system-message publisher (recorded) and the recipient lookup. Level: L1 (one client, offline). No Foundry runtime, cross-client (L2)
 * or durable-recovery (L3) claim; not exactly-once.
 *
 * The economy invariant used throughout: fund balance + player credits + recipient credits is conserved by every correct outcome. A total ABOVE the
 * starting total means credits were created.
 *
 * The runner RECORDS each case's failure so a fail-before run shows exactly which behaviours are missing.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
window.addEventListener ??= () => {}; window.removeEventListener ??= () => {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.Hooks ??= { on() {}, once() {}, call() {}, callAll() {} };

const { HolonetMessengerService: Svc } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js');
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { swseLogger, SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const lg of [swseLogger, SWSELogger]) for (const level of ['log', 'info', 'warn', 'error', 'debug']) if (lg?.[level]) lg[level] = () => {};

const clone = (v) => JSON.parse(JSON.stringify(v));
const saved = { adjust: TransactionEngine.executeCreditAdjustment, sys: Svc._publishSystemMessage, recip: Svc._recipientFromStableId, game: globalThis.game };

const FUND_START = 500; const PLAYER_START = 1000; const RECIPIENT_START = 1000;
const world = { settings: {}, writes: [], failBalance: null, failLedger: false, persistOnFail: false };
const engine = { calls: [], script: [] };
const out = { system: [] };
let player; let recipient;

/** scripted outcomes: ok | fail (definitive) | indeterminate (credits MOVED, unresolved) | rollbackFailed (MOVED) | indeterminate-notmoved | throw | malformed | partial */
function nextOutcome() { return engine.script.length ? engine.script.shift() : 'ok'; }
function install({ script = [] } = {}) {
  world.settings = { holonetPartyFundEnabled: true, holonetPartyFundBalance: FUND_START, holonetPartyFundLedger: [] };
  Object.assign(world, { writes: [], failBalance: null, failLedger: false, persistOnFail: false });
  engine.calls = []; engine.script = [...script];
  out.system.length = 0;
  player = { id: 'P', name: 'Player', system: { credits: PLAYER_START } };
  recipient = { id: 'R', name: 'Recipient', system: { credits: RECIPIENT_START } };
  const actors = { P: player, R: recipient };
  const users = { u_gm: { isGM: true }, u_player: { isGM: false } };
  globalThis.game = { ...(saved.game ?? {}), user: { id: 'u_gm', isGM: true }, users: { get: (id) => users[id] ?? null }, actors: { get: (id) => actors[id] ?? null },
    settings: {
      get: (_ns, key) => world.settings[key],
      set: async (_ns, key, value) => {
        world.writes.push({ key, value: clone(value) });
        if (key === 'holonetPartyFundBalance' && world.failBalance?.(value, world.writes.filter((w) => w.key === key).length)) {
          if (world.persistOnFail) world.settings[key] = clone(value);          // the write reached storage and then the call rejected
          throw new Error('settings write refused');
        }
        if (key === 'holonetPartyFundLedger' && world.failLedger) throw new Error('ledger write refused');
        world.settings[key] = clone(value);
      }
    } };
  TransactionEngine.executeCreditAdjustment = async (ctx) => {
    const kind = ctx.amount < 0 ? 'debit' : (ctx.transactionContext === 'holonet-party-fund-payout' ? 'payout' : 'refund');
    const outcome = nextOutcome();
    engine.calls.push({ kind, outcome, actorId: ctx.actor.id, amount: ctx.amount, context: ctx.transactionContext });
    const apply = () => { ctx.actor.system.credits += ctx.amount; };
    const transactionId = `tx_${engine.calls.length}`;
    switch (outcome) {
      case 'ok': apply(); return { success: true, transactionId, error: null };
      case 'fail': return { success: false, transactionId, error: 'Credit adjustment refused' };
      case 'indeterminate': apply(); return { success: false, transactionId, rollbackFailed: true, indeterminate: true, partialMutationPossible: true, error: 'Credit adjustment failed and rollback failed' };
      case 'rollbackFailed': apply(); return { success: false, transactionId, rollbackFailed: true, error: 'Credit adjustment failed and rollback failed' };
      case 'indeterminate-notmoved': return { success: false, transactionId, indeterminate: true, error: 'outcome unknown' };
      case 'partial': apply(); return { success: false, transactionId, partialMutationPossible: true, error: 'partial mutation possible' };
      case 'throw': throw new Error('engine exploded');
      case 'malformed': return undefined;
      default: throw new Error(`unknown scripted outcome ${outcome}`);
    }
  };
  Svc._publishSystemMessage = async (_thread, body, meta) => { if (out.failPublish?.(body, meta)) throw new Error('publish refused'); out.system.push({ body, meta }); };
  Svc._recipientFromStableId = () => ({ actorId: 'R' });
  out.failPublish = null;
}
function restoreAll() { TransactionEngine.executeCreditAdjustment = saved.adjust; Svc._publishSystemMessage = saved.sys; Svc._recipientFromStableId = saved.recip; globalThis.game = saved.game; }
const thread = { id: 'th1' };
const fund = () => world.settings.holonetPartyFundBalance;
const economy = () => fund() + player.system.credits + recipient.system.credits;
const START = FUND_START + PLAYER_START + RECIPIENT_START;
const ledger = () => world.settings.holonetPartyFundLedger;
const callsOf = (kind) => engine.calls.filter((c) => c.kind === kind);
const contribute = (amount = 100) => Svc._gmContributeToPartyFund({ actorId: 'P', thread, amount, requesterId: 'u_player' });
const contributeAsGm = (amount = 100) => Svc._gmContributeToPartyFund({ actorId: null, thread, amount, requesterId: 'u_gm' });
const pay = (amount = 100) => Svc._gmPayFromPartyFund({ thread, amount, recipientId: 'actor:R', requesterId: 'u_gm' });
const lastBody = () => out.system.at(-1)?.body ?? '';
const bodies = () => out.system.map((m) => m.body).join(' | ');
const events = () => out.system.map((m) => m.meta?.eventType);

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

/* ============================================================================================== */
/* CONTRIBUTION                                                                                       */
/* ============================================================================================== */
await check('C1. a normal contribution debits the player once, credits the fund, writes a ledger entry and announces it', async () => {
  install();
  assert.equal(await contribute(100), true);
  assert.equal(fund(), 600); assert.equal(player.system.credits, 900); assert.equal(economy(), START);
  assert.deepEqual(engine.calls.map((c) => c.kind), ['debit']);
  assert.equal(ledger().length, 1); assert.equal(ledger()[0].type, 'contribution'); assert.equal(ledger()[0].amount, 100);
  assert.match(lastBody(), /contributed/); assert.equal(out.system.at(-1).meta.eventType, 'party-fund-contribution');
});

await check('C2. a DEFINITIVE debit failure changes nothing and refunds nothing', async () => {
  install({ script: ['fail'] });
  assert.equal(await contribute(100), false);
  assert.equal(fund(), FUND_START); assert.equal(player.system.credits, PLAYER_START); assert.deepEqual(engine.calls.map((c) => c.kind), ['debit']);
  assert.equal(world.writes.length, 0);
});

for (const outcome of ['indeterminate', 'rollbackFailed', 'partial', 'indeterminate-notmoved']) {
  await check(`C3. an UNRESOLVED debit (${outcome}) is not treated as "no credits moved": no fund credit, no automatic refund, and the GM is told it needs review`, async () => {
    install({ script: [outcome] });
    assert.equal(await contribute(100), false);
    assert.equal(fund(), FUND_START, 'the fund is not credited on an unresolved debit');
    assert.deepEqual(engine.calls.map((c) => c.kind), ['debit'], 'no automatic refund / replay');
    assert.ok(out.system.length >= 1, 'the uncertainty is surfaced (not a silent return)');
    assert.match(bodies(), /GM|review|reconcile/i); assert.doesNotMatch(bodies(), /revert/i);
    assert.equal(events().at(-1), 'party-fund-contribution-indeterminate');
  });
}

await check('C4. a debit call that THROWS is unresolved, not a clean failure: surfaced for GM review, no fund credit, no refund', async () => {
  install({ script: ['throw'] });
  assert.equal(await contribute(100), false);
  assert.equal(fund(), FUND_START); assert.deepEqual(engine.calls.map((c) => c.kind), ['debit']);
  assert.match(bodies(), /GM|review|reconcile/i);
});

await check('C5. fund update fails after the debit; restore and a VERIFIED refund succeed: reverted, economy conserved (preserved behaviour)', async () => {
  install(); world.failBalance = (value) => value === FUND_START + 100;
  assert.equal(await contribute(100), false);
  assert.equal(fund(), FUND_START); assert.equal(player.system.credits, PLAYER_START); assert.equal(economy(), START);
  assert.deepEqual(engine.calls.map((c) => c.kind), ['debit', 'refund']);
  assert.match(lastBody(), /failed and was reverted/); assert.equal(events().at(-1), 'party-fund-failed');
});

await check('C6. the refund returns success:false: the player is STILL CHARGED and the message must not claim the contribution was reverted', async () => {
  install({ script: ['ok', 'fail'] }); world.failBalance = (value) => value === FUND_START + 100;
  assert.equal(await contribute(100), false);
  assert.equal(player.system.credits, PLAYER_START - 100, 'the player really is still charged');
  assert.doesNotMatch(bodies(), /reverted/i, 'no false "reverted" claim');
  assert.match(lastBody(), /refund/i); assert.match(lastBody(), /GM|review/i);
  assert.equal(events().at(-1), 'party-fund-refund-failed');
  assert.equal(callsOf('refund').length, 1, 'no automatic second refund');
});

for (const outcome of ['indeterminate', 'rollbackFailed', 'throw', 'malformed']) {
  await check(`C7. the refund outcome is unresolved (${outcome}): "needs reconciliation", never "reverted", and it is not replayed`, async () => {
    install({ script: ['ok', outcome] }); world.failBalance = (value) => value === FUND_START + 100;
    assert.equal(await contribute(100), false);
    assert.doesNotMatch(bodies(), /reverted/i);
    assert.match(lastBody(), /GM|review|reconcile/i);
    assert.equal(events().at(-1), 'party-fund-refund-indeterminate');
    assert.equal(callsOf('refund').length, 1, 'no automatic second refund');
  });
}

await check('C8. the fund write PERSISTED then threw, and the restore ALSO fails: no refund is issued (it would create credits) and the GM is told', async () => {
  install(); world.persistOnFail = true;
  world.failBalance = () => true;                                 // every balance write persists and then rejects, including the restore
  assert.equal(await contribute(100), false);
  assert.ok(economy() <= START, `credits were created: total ${economy()} > ${START}`);
  assert.equal(callsOf('refund').length, 0, 'no automatic refund while the fund state is unknown');
  assert.doesNotMatch(bodies(), /reverted/i);
  assert.match(lastBody(), /GM|review/i);
  assert.equal(events().at(-1), 'party-fund-contribution-indeterminate');
});

await check('C9. the contribution COMMITTED (fund credited) but the ledger entry fails: it is not rolled back or reported as failed; the player is not refunded', async () => {
  install(); world.failLedger = true;
  assert.equal(await contribute(100), true);
  assert.equal(fund(), 600); assert.equal(player.system.credits, 900); assert.equal(economy(), START);
  assert.deepEqual(engine.calls.map((c) => c.kind), ['debit'], 'no refund of a committed contribution');
  assert.doesNotMatch(bodies(), /failed and was reverted/i);
});

await check('C10. the contribution COMMITTED but the announcement fails to publish: not rolled back, not reported as failed', async () => {
  install(); out.failPublish = (_b, meta) => meta?.eventType === 'party-fund-contribution';
  assert.equal(await contribute(100), true);
  assert.equal(fund(), 600); assert.equal(player.system.credits, 900);
  assert.deepEqual(engine.calls.map((c) => c.kind), ['debit']);
  assert.doesNotMatch(bodies(), /reverted/i);
});

await check('C11. a GM-ledger contribution (no debit): a failed fund write is restored and reported as reverted; a failed RESTORE is not reported as reverted', async () => {
  install(); world.failBalance = (value) => value === FUND_START + 100;
  assert.equal(await contributeAsGm(100), false);
  assert.equal(fund(), FUND_START); assert.equal(engine.calls.length, 0); assert.match(lastBody(), /reverted/);
  install(); world.persistOnFail = true; world.failBalance = () => true;
  assert.equal(await contributeAsGm(100), false);
  assert.doesNotMatch(bodies(), /reverted/i); assert.match(lastBody(), /GM|review/i);
  assert.equal(engine.calls.length, 0);
});

/* ============================================================================================== */
/* PAYOUT                                                                                             */
/* ============================================================================================== */
await check('P1. a normal payout reduces the fund once, credits the recipient once, writes a ledger entry and announces it', async () => {
  install();
  assert.equal(await pay(100), true);
  assert.equal(fund(), 400); assert.equal(recipient.system.credits, 1100); assert.equal(economy(), START);
  assert.deepEqual(engine.calls.map((c) => c.kind), ['payout']);
  assert.equal(ledger().at(-1).type, 'payout'); assert.equal(ledger().at(-1).amount, -100);
  assert.equal(out.system.at(-1).meta.eventType, 'party-fund-payout');
});

await check('P2. a DEFINITIVE payout failure restores the fund and reports it reverted; economy conserved (preserved behaviour)', async () => {
  install({ script: ['fail'] });
  assert.equal(await pay(100), false);
  assert.equal(fund(), FUND_START); assert.equal(recipient.system.credits, RECIPIENT_START); assert.equal(economy(), START);
  assert.match(lastBody(), /failed and was reverted/); assert.equal(events().at(-1), 'party-fund-payout-failed');
});

await check('P3. a definitive payout failure whose fund RESTORE fails: not reported as reverted; the shortfall is surfaced to the GM', async () => {
  install({ script: ['fail'] }); world.failBalance = (value) => value === FUND_START;      // the restore write (back to 500) is refused
  assert.equal(await pay(100), false);
  assert.equal(fund(), FUND_START - 100, 'the fund really is short');
  assert.doesNotMatch(bodies(), /reverted/i, 'no false "reverted" claim');
  assert.match(lastBody(), /not.*restored|short|GM|review/i);
  assert.equal(events().at(-1), 'party-fund-payout-restore-failed');
  assert.equal(callsOf('payout').length, 1);
});

for (const outcome of ['indeterminate', 'rollbackFailed', 'partial']) {
  await check(`P4. an UNRESOLVED payout (${outcome}; the recipient actually received the credits) does NOT restore the fund: credits are not created`, async () => {
    install({ script: [outcome] });
    assert.equal(await pay(100), false);
    assert.equal(recipient.system.credits, RECIPIENT_START + 100, 'the recipient did receive the payout');
    assert.equal(fund(), FUND_START - 100, 'the fund is NOT restored over an unresolved payout');
    assert.equal(economy(), START, `credits were created: total ${economy()} > ${START}`);
    assert.doesNotMatch(bodies(), /revert/i);
    assert.match(lastBody(), /GM|review|reconcile/i);
    assert.equal(events().at(-1), 'party-fund-payout-indeterminate');
    assert.equal(callsOf('payout').length, 1, 'no automatic retry');
    assert.ok(ledger().some((l) => l.type === 'payout-indeterminate' && l.amount === -100 && l.toActorId === 'R'), 'the uncertainty is recorded in the fund ledger');
  });
}

for (const outcome of ['throw', 'malformed', 'indeterminate-notmoved']) {
  await check(`P5. a payout whose outcome is unknown (${outcome}) is unresolved: the fund is not restored and the GM is told`, async () => {
    install({ script: [outcome] });
    assert.equal(await pay(100), false);
    assert.equal(fund(), FUND_START - 100);
    assert.doesNotMatch(bodies(), /revert/i);
    assert.equal(events().at(-1), 'party-fund-payout-indeterminate');
    assert.equal(callsOf('payout').length, 1);
  });
}

await check('P6. the payout COMMITTED but the ledger entry fails: not reported as failed, fund not restored, no exception', async () => {
  install(); world.failLedger = true;
  assert.equal(await pay(100), true);
  assert.equal(fund(), 400); assert.equal(recipient.system.credits, 1100); assert.equal(economy(), START);
  assert.doesNotMatch(bodies(), /reverted|failed/i);
});

await check('P7. the payout COMMITTED but the announcement fails to publish: not reported as failed, fund not restored, no exception', async () => {
  install(); out.failPublish = (_b, meta) => meta?.eventType === 'party-fund-payout';
  assert.equal(await pay(100), true);
  assert.equal(fund(), 400); assert.equal(recipient.system.credits, 1100);
});

await check('P8. an insufficient fund still fails before any credit movement', async () => {
  install();
  assert.equal(await pay(900), false);
  assert.equal(engine.calls.length, 0); assert.equal(fund(), FUND_START); assert.match(lastBody(), /below/);
});

await check('P9. a payout that is never attempted (non-GM, disabled fund, bad amount, unknown recipient) moves nothing', async () => {
  install();
  globalThis.game.user = { id: 'u_player', isGM: false };
  assert.equal(await Svc._gmPayFromPartyFund({ thread, amount: 100, recipientId: 'actor:R', requesterId: 'u_player' }), false);
  globalThis.game.user = { id: 'u_gm', isGM: true };
  world.settings.holonetPartyFundEnabled = false; assert.equal(await pay(100), false);
  world.settings.holonetPartyFundEnabled = true; assert.equal(await pay(0), false); assert.equal(await pay(-5), false);
  Svc._recipientFromStableId = () => null; assert.equal(await pay(100), false);
  assert.equal(engine.calls.length, 0); assert.equal(fund(), FUND_START);
});

const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0 G26 party fund integrity: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
