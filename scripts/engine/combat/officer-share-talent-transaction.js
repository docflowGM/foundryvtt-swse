/**
 * Execute one Officer Share Talent activation transaction.
 *
 * Foundry document APIs are injected so cross-actor recovery can be exercised
 * with actual failure-injection tests. ActorEngine is authoritative for each
 * actor leg. Foundry does NOT provide global multi-actor atomicity.
 */
import { uniqueOfficerShareTalentActors } from './officer-share-talent-grant-plan.js';

const actorKey = actor => String(actor?.uuid || actor?.id || '');

export async function executeOfficerShareTalentTransaction({
  officer, additions, usage, actorEngine, validateBeforeSpend, spendStandardAction,
}={}) {
  if(!officer?.id || !Array.isArray(additions) || !Array.isArray(usage)
    || typeof actorEngine?.captureRecoverySnapshot!=='function'
    || typeof actorEngine?.applyMutationPlan!=='function'
    || typeof actorEngine?.restoreSnapshotVerified!=='function'
    || typeof validateBeforeSpend!=='function'
    || typeof spendStandardAction!=='function') {
    throw new Error('Incomplete Officer Share Talent mutation authority');
  }
  const actors=uniqueOfficerShareTalentActors([officer,...additions.map(entry=>entry?.actor)]);
  const snapshots=new Map();
  for(const actor of actors) {
    snapshots.set(actorKey(actor),await actorEngine.captureRecoverySnapshot(actor));
  }
  const touched=[];
  try {
    for(const entry of additions) {
      if(!entry?.item)continue; // permanent talent already held; do not duplicate
      if(!entry.actor?.id)throw new Error('Invalid Officer Share Talent recipient Actor');
      // Mark BEFORE entering a transactional actor leg; even a failed call may
      // have altered the actor or produced an indeterminate inner rollback.
      touched.push(entry.actor);
      await actorEngine.applyMutationPlan(entry.actor,{add:{items:[entry.item]}},{
        source:'OfficerShareTalentService.activate.grant',transactional:true,
      });
    }
    touched.push(officer);
    await actorEngine.applyMutationPlan(officer,{
      set:{'flags.swse.classFeatures.officer.dailyShares':usage},
    },{source:'OfficerShareTalentService.activate.usage',transactional:true});
    validateBeforeSpend();
    const spent=await spendStandardAction();
    if(spent?.committed!==true || spent?.engineResult?.allowed===false) {
      throw new Error('Officer Share Talent standard action was not committed');
    }
    return spent;
  } catch(error) {
    const recovery=await Promise.allSettled([...touched].reverse().map(async actor=>{
      const snapshot=snapshots.get(actorKey(actor));
      return actorEngine.restoreSnapshotVerified(actor,snapshot,'OfficerShareTalentService.rollback');
    }));
    if(recovery.some(r=>r.status!=='fulfilled'||r.value?.verdict!=='EXACT')) {
      throw new Error(`Share Talent mutation INDETERMINATE; GM review required: ${error?.message||error}`);
    }
    throw error;
  }
}
