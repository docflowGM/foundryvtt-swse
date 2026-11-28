import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
registerFoundryPathLoader();
const { deriveTransactionType, legSummary, assetApprovalLockKey, sourceRollbackRefusal, normalizeTransactionRecord } = await import('../scripts/engine/store/transaction-helpers.js');

// 3N-TE.2: characterization of the pure helpers extracted verbatim from TransactionEngine.
test('transaction type: context keywords win in a fixed order, then the sign of the amount', () => {
  const t = deriveTransactionType;
  assert.equal(t('store-refund', -5), 'Refund');
  assert.equal(t('gm-grant', 5), 'Refund');
  assert.equal(t('rollback-correction'), 'Correction');
  assert.equal(t('store-sale'), 'Sell');
  assert.equal(t('custom-approval'), 'Approval Purchase');
  assert.equal(t('store-purchase', 10), 'Buy');
  assert.equal(t('', -1), 'Buy');
  assert.equal(t('x', 1), 'Credit');
  assert.equal(t('x', 0), 'Transaction');
  assert.equal(t(undefined, undefined), 'Transaction');
});
test('leg summary normalizes every field', () => {
  assert.deepEqual(legSummary(), { transactionId: null, success: false, error: null, rollbackFailed: false, indeterminate: false });
  assert.deepEqual(legSummary({ transactionId: 't', success: true, error: 'e', rollbackFailed: true, indeterminate: true }), { transactionId: 't', success: true, error: 'e', rollbackFailed: true, indeterminate: true });
  assert.equal(legSummary({ success: 'yes' }).success, false, 'only strict true counts as success');
});
test('approval lock key is stable and context-qualified', () => {
  assert.equal(assetApprovalLockKey('o', 'a'), 'o:a:store-custom-approval:asset-approval');
  assert.equal(assetApprovalLockKey('o', 'a', 'x'), 'o:a:x:asset-approval');
});
test('source rollback refusal: fails closed with a stable code per condition', () => {
  const actor = (records) => ({ getFlag: () => records });
  assert.equal(sourceRollbackRefusal(actor({}), undefined), null);
  assert.equal(sourceRollbackRefusal(actor({}), ''), null);
  for (const bad of ['a.b', ' x', 5, '__proto__', 'constructor', '   ']) assert.equal(sourceRollbackRefusal(actor({}), bad).code, 'SOURCE_TRANSACTION_ID_INVALID', String(bad));
  assert.equal(sourceRollbackRefusal(actor({}), 'tx1').code, 'SOURCE_TRANSACTION_NOT_FOUND');
  assert.equal(sourceRollbackRefusal(actor({ tx1: 'oops' }), 'tx1').code, 'SOURCE_TRANSACTION_MALFORMED');
  assert.equal(sourceRollbackRefusal(actor({ tx1: [] }), 'tx1').code, 'SOURCE_TRANSACTION_MALFORMED');
  const done = sourceRollbackRefusal(actor({ tx1: { status: ' Rolled Back ', rolledBackByTransactionId: 'tx2' } }), 'tx1');
  assert.equal(done.code, 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK');
  assert.equal(done.alreadyRolledBack, true);
  assert.equal(done.rolledBackByTransactionId, 'tx2');
  assert.match(done.error, /by tx2/);
  assert.equal(sourceRollbackRefusal(actor({ tx1: { status: 'Committed' } }), 'tx1'), null);
  // flag read that throws falls back to actor.flags
  const throwing = { getFlag() { throw new Error('x'); }, flags: { 'foundryvtt-swse': { transactions: { tx1: { status: 'Committed' } } } } };
  assert.equal(sourceRollbackRefusal(throwing, 'tx1'), null);
});

test('record normalization (receipt view model): amounts, cost, item names, type derivation, rollback links and defaults', () => {
  globalThis.game = { users: { get: (id) => (id === 'u1' ? { name: 'Alice' } : null) } };
  const actor = { id: 'a1', name: 'Buyer' };
  const purchase = normalizeTransactionRecord(actor, { id: 'tx1', context: 'store-purchase', createdAt: 5, cost: 100, userId: 'u1', audit: { items: [{ name: 'Blaster', quantity: 2 }, { name: 'Medpac' }] } });
  assert.equal(purchase.transactionId, 'tx1');
  assert.equal(purchase.amount, -100, 'a positive cost with no amount is a debit');
  assert.equal(purchase.cost, 100);
  assert.equal(purchase.type, 'Buy');
  assert.equal(purchase.userName, 'Alice');
  assert.deepEqual(purchase.itemNames, ['Blaster', 'Medpac']);
  assert.equal(purchase.itemName, 'Blaster, Medpac');
  assert.equal(purchase.itemCount, 3);
  assert.equal(purchase.status, 'Success');
  assert.equal(purchase.actorName, 'Buyer');
  const grant = normalizeTransactionRecord(actor, { id: 't2', context: 'gm-grant', amount: 50 });
  assert.equal(grant.amount, 50);
  assert.equal(grant.cost, 50);
  assert.equal(grant.type, 'Refund');
  assert.equal(grant.itemName, 'Credit Transaction');
  assert.equal(grant.userName, '—');
  const rb = normalizeTransactionRecord(actor, { id: 't3', context: 'rollback', amount: 100, audit: { rollback: { sourceTransactionId: 'tx1', reason: 'GM' } }, rolledBackByTransactionId: 'x' });
  assert.equal(rb.rollbackOf, 'tx1');
  assert.equal(rb.rollbackReason, 'GM');
  assert.equal(rb.rolledBackByTransactionId, 'x');
  assert.equal(rb.type, 'Correction');
  delete globalThis.game;
});
