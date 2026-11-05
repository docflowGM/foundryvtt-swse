// TX-08 — TransactionEngine.executeMutationTransaction: (a) continues when the recovery snapshot cannot be created, (b) reports "Rollback successful"
// when SnapshotManager.restoreSnapshot returned false, (c) writes credits as an ABSOLUTE value (lost-update exposure). Real TransactionEngine,
// LedgerService and SnapshotManager; the ActorEngine is the shim's fake whose applyMutationPlan is replaced to fail AFTER applying (a late failure).
import { header, report, setPath } from './_boot.mjs';
header('TX-08 store / customization transaction recovery');
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
const mkActor = () => { const a = { id: 'buyer', name: 'Buyer', type: 'character', isOwner: true, system: { credits: 1000 }, flags: {}, items: [] }; a.items.get = () => null; return a; };
let actor = mkActor();
globalThis.game = { ...(globalThis.game ?? {}), actors: { get: (id) => (id === actor.id ? actor : null) }, user: { isGM: true }, settings: { get: () => undefined } };
const infos = []; const realInfo = swseLogger.info; swseLogger.info = (...a) => { infos.push(a.map(String).join(' ')); return realInfo?.apply(swseLogger, a); };
const lateFailure = async (a, plan) => { for (const [k, v] of Object.entries(plan.set ?? {})) setPath(a, k, v); throw new Error('late failure after the credit write'); };
const plan = { set: { 'flags.swse.purchased': true } };
const run = () => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan, cost: 100, transactionContext: 'owned-customization', audit: { itemName: 'x' } }, { source: 'repro', validate: true, rederive: false });

// (a) snapshot cannot be created
{
  actor = mkActor(); ActorEngine.applyMutationPlan = lateFailure;
  const realCreate = SnapshotManager.createSnapshot; SnapshotManager.createSnapshot = async () => { throw new Error('snapshot store unavailable'); };
  const result = await run(); SnapshotManager.createSnapshot = realCreate;
  report('TX-08a', result.success === false && actor.system.credits === 900,
    'when the snapshot cannot be created the transaction STILL mutates; a later failure leaves the actor charged with no recovery and no indication',
    `result=${JSON.stringify({ success: result.success, error: result.error })}; credits ${1000} -> ${actor.system.credits}`);
}
// (b) the snapshot exists but the restore did not happen
{
  actor = mkActor(); ActorEngine.applyMutationPlan = lateFailure; infos.length = 0;
  const realCreate = SnapshotManager.createSnapshot; const realRestore = SnapshotManager.restoreSnapshot;
  SnapshotManager.createSnapshot = async () => ({ timestamp: 111 }); SnapshotManager.restoreSnapshot = async () => false;   // the documented non-throwing failure return
  const result = await run(); SnapshotManager.createSnapshot = realCreate; SnapshotManager.restoreSnapshot = realRestore;
  const claimed = infos.some((m) => /Rollback successful/.test(m));
  report('TX-08b', result.success === false && claimed && actor.system.credits === 900 && !/rollback failed/i.test(result.error ?? ''),
    'restoreSnapshot() returned false (not restored) yet the engine logs "Rollback successful" and returns the ORIGINAL error with no rollback-failed signal',
    `logged "Rollback successful": ${claimed}; result.error="${result.error}"; credits now ${actor.system.credits} (charged, not restored)`);
}
// (c) credits are written as an absolute value computed from a READ made before the write
{
  actor = mkActor(); let seen = null;
  ActorEngine.applyMutationPlan = async (a, p) => { seen = JSON.parse(JSON.stringify(p.set ?? {})); a.system.credits = 1000 + 500;   /* a concurrent +500 lands before our write */ for (const [k, v] of Object.entries(p.set ?? {})) setPath(a, k, v); };
  const realCreate = SnapshotManager.createSnapshot; SnapshotManager.createSnapshot = async () => ({ timestamp: 1 });
  const result = await run(); SnapshotManager.createSnapshot = realCreate;
  report('TX-08c', result.success === true && seen?.['system.credits'] === 900 && actor.system.credits === 900,
    'credits are written as an absolute value (1000-100=900) computed before the write: a concurrent +500 is overwritten (final 900, correct is 1400)',
    `plan.set['system.credits']=${seen?.['system.credits']}; final credits=${actor.system.credits}`);
}
