// TX-11 — runFollowerMutationTransaction judges a step failed only if commit() THROWS, and a rollback failed only if rollback() THROWS.
// Real function; synthetic steps.
import { header, report } from './_boot.mjs';
header('TX-11 follower mutation transaction contract');
const { runFollowerMutationTransaction } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-mutation-transaction.js');
let rolledBack = [];
{
  const steps = [
    { name: 'one', commit: async () => ({ written: true }), rollback: async () => { rolledBack.push('one'); } },
    { name: 'two', commit: async () => ({ ok: false, reason: 'refused' }), rollback: async () => { rolledBack.push('two'); } },
  ];
  const result = await runFollowerMutationTransaction(steps);
  report('TX-11a', result.ok === true, "a commit() that RETURNS { ok:false } counts as success (only a thrown error is a failure)", `result.ok=${result.ok}; rolled back=${JSON.stringify(rolledBack)}`);
}
{
  const steps = [
    { name: 'one', commit: async () => 'done', rollback: async () => false },          // reports that it could NOT restore
    { name: 'two', commit: async () => { throw new Error('boom'); } },
  ];
  const result = await runFollowerMutationTransaction(steps);
  report('TX-11b', result.ok === false && result.rollbackFailed === false, 'a rollback() that RETURNS false (could not restore) is not recorded as a failed rollback', `rollbackFailed=${result.rollbackFailed}`);
}
