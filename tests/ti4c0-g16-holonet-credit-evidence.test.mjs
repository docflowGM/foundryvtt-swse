/**
 * TI4-C0 / G16 — Holonet credit-transfer records must not display an unresolved (INDETERMINATE) credit movement as `failed`, and must keep the
 * evidence TransactionEngine.executeCreditTransfer returned.
 *
 * Real production functions under test (unmodified call paths): HolonetMessengerService._gmResolveCreditRequest (pay-credit-request),
 * _gmResolveCreditTransfer (accept/approve-transfer) → _executeCreditTransfer, and the credit-transfer view-model. The seam is
 * TransactionEngine.executeCreditTransfer / executeCreditAdjustment, which return the exact result shapes documented in transaction-engine.js
 * (TI-2: compensated / rollbackFailed / indeterminate + evidence). HolonetStorage and the publish helpers are recorded stubs.
 * Level: L1 (offline, single client). No Foundry runtime, cross-client or durable-recovery claim.
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
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.Hooks ??= { on() {}, once() {}, call() {}, callAll() {} };

const { HolonetMessengerService: Svc } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js');
const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const level of ['log', 'info', 'warn', 'error', 'debug']) if (swseLogger[level]) swseLogger[level] = () => {};

const saved = {
  getRecord: HolonetStorage.getRecord, saveRecord: HolonetStorage.saveRecord, sys: Svc._publishSystemMessage, rcpt: Svc._publishReceiptMessage,
  transfer: TransactionEngine.executeCreditTransfer, adjust: TransactionEngine.executeCreditAdjustment, game: globalThis.game
};
const clone = (v) => JSON.parse(JSON.stringify(v));

/* ---- result shapes exactly as transaction-engine.js returns them ---- */
const SHAPES = {
  plain: () => ({ success: false, transactionId: 'tx_t', debitTransactionId: 'tx_d', error: 'Insufficient credits' }),
  compensated: () => ({ success: false, transactionId: 'tx_t', debitTransactionId: 'tx_d', failedCreditTransactionId: 'tx_c', refundTransactionId: 'tx_r', compensated: true, error: 'credit leg failed' }),
  rollbackFailed: () => ({ success: false, transactionId: 'tx_t', debitTransactionId: 'tx_d', failedCreditTransactionId: 'tx_c', refundTransactionId: 'tx_r', rollbackFailed: true,
    error: 'Credit transfer could not be reconciled: the recipient leg failed (x), the sender\'s refund failed (y), and the snapshot restore did not succeed. The sender may still be debited 100. Reconcile transactions tx_d, tx_c and tx_r.',
    evidence: { debit: { transactionId: 'tx_d', success: true }, credit: { transactionId: 'tx_c', success: false }, refund: { transactionId: 'tx_r', success: false },
      restores: [{ actor: 'sender', restored: false, error: 'restore refused' }, { actor: 'recipient', restored: false, error: null }], snapshotsAvailable: true } }),
  unresolvedCredit: () => ({ success: false, transactionId: 'tx_t', debitTransactionId: 'tx_d', failedCreditTransactionId: 'tx_c', indeterminate: true, rollbackFailed: true,
    error: 'Credit transfer could not be reconciled: the recipient leg is unresolved (z). The sender was debited 100 and was NOT refunded automatically because the recipient may already hold the credits. Reconcile transactions tx_d and tx_c.',
    evidence: { debit: { transactionId: 'tx_d', success: true }, credit: { transactionId: 'tx_c', success: false, indeterminate: true } } }),
  indeterminateDebit: () => ({ success: false, transactionId: 'tx_t', debitTransactionId: 'tx_d', indeterminate: true, error: 'debit outcome unknown', evidence: { debit: { transactionId: 'tx_d', indeterminate: true } } })
};

const out = { saved: [], system: [], receipts: [], calls: { transfer: 0, adjust: 0 } };
function install(result) {
  out.saved.length = 0; out.system.length = 0; out.receipts.length = 0; out.calls.transfer = 0; out.calls.adjust = 0;
  HolonetStorage.getRecord = async () => out.message;
  HolonetStorage.saveRecord = async (m) => { out.saved.push(clone(m)); };
  Svc._publishSystemMessage = async (thread, body, meta) => { out.system.push({ body, meta }); };
  Svc._publishReceiptMessage = async (thread, r) => { out.receipts.push(r); };
  TransactionEngine.executeCreditTransfer = async () => { out.calls.transfer++; return typeof result === 'function' ? result() : result; };
  TransactionEngine.executeCreditAdjustment = async () => { out.calls.adjust++; return typeof result === 'function' ? result() : result; };
  const actors = { payer: { id: 'payer', name: 'Payer' }, req: { id: 'req', name: 'Requester' }, from: { id: 'from', name: 'From' }, to: { id: 'to', name: 'To' } };
  globalThis.game = { ...(saved.game ?? {}), user: { isGM: true, id: 'gm' }, users: { get: () => ({ isGM: true }) }, actors: { get: (id) => actors[id] } };
}
function restoreAll() {
  HolonetStorage.getRecord = saved.getRecord; HolonetStorage.saveRecord = saved.saveRecord; Svc._publishSystemMessage = saved.sys; Svc._publishReceiptMessage = saved.rcpt;
  TransactionEngine.executeCreditTransfer = saved.transfer; TransactionEngine.executeCreditAdjustment = saved.adjust; globalThis.game = saved.game;
}
const thread = { id: 'th1' };
function requestMessage() {
  out.message = { id: 'msg1', metadata: { creditTransfer: { kind: 'creditRequest', id: 'tr1', requesterLabel: 'Requester', requesterActorId: 'req', memo: '', status: 'pendingRecipient',
    entries: [{ id: 'e1', recipientId: 'r-payer', actorId: 'payer', label: 'Payer', amount: 100, status: 'pendingRecipient' }] } } };
}
function directMessage(kind = 'transfer') {
  out.message = { id: 'msg2', metadata: { creditTransfer: { kind, id: 'tr2', status: 'pendingRecipient', amount: 100, fromActorId: 'from', toActorId: 'to', fromLabel: 'From', toLabel: 'To', toRecipientId: 'r-to', fromRecipientId: 'r-from' } } };
}
const payRequest = () => Svc._gmResolveCreditRequest({ thread, recordId: 'msg1', action: 'pay-credit-request', actorId: 'payer', senderRecipientId: 'r-payer' });
const acceptTransfer = () => Svc._gmResolveCreditTransfer({ thread, recordId: 'msg2', action: 'accept-transfer', senderRecipientId: 'r-to' });
const lastEntry = () => out.saved.at(-1).metadata.creditTransfer.entries[0];
const lastTransfer = () => out.saved.at(-1).metadata.creditTransfer;

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

/* ---------------------------------------------------------------------------------------------- */
/* credit REQUEST entry                                                                              */
/* ---------------------------------------------------------------------------------------------- */
for (const key of ['rollbackFailed', 'unresolvedCredit', 'indeterminateDebit']) {
  await check(`request: ${key} is recorded as INDETERMINATE (never 'failed') with the evidence stored on the entry`, async () => {
    install(SHAPES[key]); requestMessage();
    const ok = await payRequest();
    assert.equal(ok, false, 'boolean contract unchanged');
    const e = lastEntry();
    assert.equal(e.status, 'indeterminate', "entry status must not be 'failed'");
    assert.notEqual(e.status, 'failed');
    const r = SHAPES[key]();
    assert.equal(e.transferEvidence.outcome, 'INDETERMINATE');
    assert.equal(e.transferEvidence.transactionId, 'tx_t');
    assert.equal(e.transferEvidence.debitTransactionId, 'tx_d');
    assert.deepEqual(e.transferEvidence.evidence, r.evidence, 'the engine evidence is kept verbatim');
    assert.equal(e.transferEvidence.level, 'L1');
    assert.match(e.failureReason, /could not be reconciled|unresolved|unknown/i, 'the engine reconciliation text is kept');
    const msg = out.system.at(-1);
    assert.doesNotMatch(msg.body, /payment failed/i, "the thread message must not say 'failed'");
    assert.match(msg.body, /GM|review|reconcile|unresolved/i);
    assert.equal(msg.meta.eventType, 'credit-request-indeterminate');
  });
}

await check('request: an INDETERMINATE entry cannot be paid again (no retry / second debit)', async () => {
  install(SHAPES.rollbackFailed); requestMessage();
  await payRequest();
  out.message = clone(out.saved.at(-1));
  const calls = out.calls.transfer;
  const again = await payRequest();
  assert.equal(again, false);
  assert.equal(out.calls.transfer, calls, 'executeCreditTransfer must not be called again');
});

await check('request: a COMPENSATED failure keeps the ordinary failed status and also stores its evidence', async () => {
  install(SHAPES.compensated); requestMessage();
  await payRequest();
  const e = lastEntry();
  assert.equal(e.status, 'failed');
  assert.equal(e.transferEvidence.outcome, 'FAILED_COMPENSATED');
  assert.equal(e.transferEvidence.refundTransactionId, 'tx_r');
  assert.match(out.system.at(-1).body, /payment failed/i);
});

await check('request: a plain failure keeps status failed + reason + evidence ids; success path is unchanged', async () => {
  install(SHAPES.plain); requestMessage();
  await payRequest();
  assert.equal(lastEntry().status, 'failed');
  assert.equal(lastEntry().failureReason, 'Insufficient credits');
  assert.equal(lastEntry().transferEvidence.outcome, 'FAILED');
  install({ success: true, transactionId: 'tx_t', debitTransactionId: 'tx_d', creditTransactionId: 'tx_c' }); requestMessage();
  const ok = await payRequest();
  assert.equal(ok, true);
  assert.equal(lastEntry().status, 'complete');
  assert.equal(lastEntry().transferEvidence, undefined);
  assert.equal(out.receipts.length, 1);
});

/* ---------------------------------------------------------------------------------------------- */
/* direct transfer                                                                                   */
/* ---------------------------------------------------------------------------------------------- */
for (const key of ['rollbackFailed', 'unresolvedCredit', 'indeterminateDebit']) {
  await check(`transfer: ${key} → status 'indeterminate' (not 'failed'), evidence stored, no complete/receipt message`, async () => {
    install(SHAPES[key]); directMessage();
    const ok = await acceptTransfer();
    assert.equal(ok, false);
    const t = lastTransfer();
    assert.equal(t.status, 'indeterminate');
    assert.equal(t.transferEvidence.outcome, 'INDETERMINATE');
    assert.equal(t.transferEvidence.debitTransactionId, 'tx_d');
    assert.deepEqual(t.transferEvidence.evidence, SHAPES[key]().evidence);
    assert.match(t.failureReason, /could not be reconciled|unresolved|unknown/i);
    assert.doesNotMatch(out.system.at(-1).body, /transfer failed/i);
    assert.equal(out.system.at(-1).meta.eventType, 'credit-transfer-indeterminate');
    assert.equal(out.receipts.length, 0);
  });
}

await check('transfer: an INDETERMINATE transfer is terminal — accept/approve cannot run it again', async () => {
  install(SHAPES.rollbackFailed); directMessage();
  await acceptTransfer();
  out.message = clone(out.saved.at(-1));
  const before = out.calls.transfer;
  assert.equal(await acceptTransfer(), false);
  assert.equal(await Svc._gmResolveCreditTransfer({ thread, recordId: 'msg2', action: 'approve-transfer', senderRecipientId: 'r-to' }), false);
  assert.equal(out.calls.transfer, before, 'no second executeCreditTransfer');
});

await check('transfer: compensated / plain failures keep status failed and store evidence; success unchanged', async () => {
  install(SHAPES.compensated); directMessage(); await acceptTransfer();
  assert.equal(lastTransfer().status, 'failed'); assert.equal(lastTransfer().transferEvidence.outcome, 'FAILED_COMPENSATED');
  install(SHAPES.plain); directMessage(); await acceptTransfer();
  assert.equal(lastTransfer().status, 'failed'); assert.equal(lastTransfer().failureReason, 'Insufficient credits'); assert.equal(lastTransfer().transferEvidence.outcome, 'FAILED');
  install({ success: true, transactionId: 'tx_t' }); directMessage();
  assert.equal(await acceptTransfer(), true);
  assert.equal(lastTransfer().status, 'complete'); assert.equal(lastTransfer().transferEvidence, undefined); assert.equal(out.receipts.length, 1);
});

await check('GM grant: an unresolved credit adjustment is also INDETERMINATE (not failed), with evidence', async () => {
  install({ success: false, transactionId: 'tx_g', rollbackFailed: true, error: 'Credit adjustment failed and rollback failed: x' }); directMessage('gmGrant');
  await acceptTransfer();
  assert.equal(lastTransfer().status, 'indeterminate');
  assert.equal(lastTransfer().transferEvidence.outcome, 'INDETERMINATE');
  assert.equal(lastTransfer().transferEvidence.transactionId, 'tx_g');
});

/* ---------------------------------------------------------------------------------------------- */
/* display                                                                                           */
/* ---------------------------------------------------------------------------------------------- */
await check('display: an INDETERMINATE transfer/request is labelled as needing GM review, offers no actions, and is never labelled Failed', async () => {
  install(SHAPES.rollbackFailed); directMessage(); await acceptTransfer();
  const vm = Svc._creditTransferVm({ id: 'msg2' }, lastTransfer(), { id: 'to' }, 'r-to');
  assert.notEqual(vm.statusLabel, 'Failed');
  assert.match(vm.statusLabel, /unresolved|review/i);
  assert.equal(vm.canAccept, false); assert.equal(vm.canDecline, false); assert.equal(vm.canApprove, false); assert.equal(vm.canCancel, false);
  assert.equal(vm.isResolved, true);
  install(SHAPES.rollbackFailed); requestMessage(); await payRequest();
  const rvm = Svc._creditTransferVm({ id: 'msg1' }, out.saved.at(-1).metadata.creditTransfer, { id: 'payer' }, 'r-payer');
  assert.notEqual(rvm.statusLabel, 'Failed');
  assert.match(rvm.statusLabel, /unresolved|review/i);
  assert.equal(rvm.canPay, false);
});

await check('display: a plain failed transfer is still labelled Failed', async () => {
  const vm = Svc._creditTransferVm({ id: 'm' }, { status: 'failed', amount: 100 }, { id: 'to' }, 'r-to');
  assert.equal(vm.statusLabel, 'Failed');
});

/* ---------------------------------------------------------------------------------------------- */
/* retention: unresolved credit records (the only copy of the reconciliation evidence) are not pruned    */
/* ---------------------------------------------------------------------------------------------- */
await check('maintenance: an INDETERMINATE credit transfer / request record is never a prune candidate (a plain failed one still is)', async () => {
  const { MessengerMaintenanceService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/messenger-maintenance-service.js');
  const mk = (n, extra = {}) => ({ id: `m${n}`, type: 'message', sourceFamily: 'messenger', createdAt: new Date(2024, 0, 1, 0, n).toISOString(), metadata: { threadId: 'th1', ...extra } });
  const records = [
    mk(0, { creditTransfer: { kind: 'transfer', status: 'failed' } }),
    mk(1, { creditTransfer: { kind: 'transfer', status: 'indeterminate', transferEvidence: { outcome: 'INDETERMINATE' } } }),
    mk(2, { creditTransfer: { kind: 'creditRequest', status: 'pendingRecipient', entries: [{ status: 'indeterminate' }] } }),
    ...Array.from({ length: 25 }, (_, i) => mk(i + 3))
  ];
  const thread = { id: 'th1', messageIds: records.map((r) => r.id), metadata: {} };
  const realThreads = HolonetStorage.getAllThreads; const realRecords = HolonetStorage.getAllRecords;
  HolonetStorage.getAllThreads = async () => [thread]; HolonetStorage.getAllRecords = async () => records;
  globalThis.game = { ...(saved.game ?? {}), user: { isGM: true } };
  try {
    const res = await MessengerMaintenanceService.pruneThreadMessages({ keepPerThread: 25, dryRun: true });
    const removed = (res.candidates ?? []).flatMap((c) => c.removeIds);
    assert.ok(removed.includes('m0'), 'a plain failed credit record is still prunable (unchanged)');
    assert.ok(!removed.includes('m1'), 'an indeterminate transfer record must be retained');
    assert.ok(!removed.includes('m2'), 'a request with an indeterminate entry must be retained');
  } finally { HolonetStorage.getAllThreads = realThreads; HolonetStorage.getAllRecords = realRecords; }
});

/* ---------------------------------------------------------------------------------------------- */
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0/G16 holonet credit evidence: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
