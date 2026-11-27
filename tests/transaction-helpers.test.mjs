import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTransactionType, legSummary, assetApprovalLockKey, sourceRollbackRefusal } from '../scripts/engine/store/transaction-helpers.js';

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
