/**
 * Sith Lord Temptation, Core Rulebook p.224.
 * A GM confirms LOS; target player owns the eventual resource-spend
 * consequence. All operations use existing V2 authorities.
 */
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { ActionEconomyConsumption } from '/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js';
import { rollSkill } from '/systems/foundryvtt-swse/scripts/rolls/skills.js';
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { DSPEngine } from '/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js';
import { ConditionTrackRules } from '/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js';
import { registerForcePointTriggerConsumer, registerSpendEvidenceProvider } from '/systems/foundryvtt-swse/scripts/engine/force/force-point-trigger-registry.js';
import { apexClassFeatureAccess } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js';
import {
  TEMPTATION_PATH,TEMPTATION_EVENTS_PATH,actorIdentity,
  currentTemptations,currentTemptationEvents,
  planTemptationMark,planTemptationSpend,planTemptationSpendFromEvidence,temptationSpendEvidence,expireTemptationEntries,
} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/sith-lord-temptation-state.js';

const locks=new Set();
function key(actor){return actorIdentity(actor);}
async function locked(actor,action){
 const id=key(actor);if(!id||locks.has(id))throw new Error('Temptation action already running');
 locks.add(id);try{return await action();}finally{locks.delete(id);}
}
function permission(target){
 return globalThis.game?.user?.isGM===true
   || target?.testUserPermission?.(globalThis.game?.user,'OWNER')===true;
}
function activeCombat(){const combat=globalThis.game?.combat;return combat?.started?combat:null;}
function isCurrentTurn(actor,combat){
 return Boolean(combat?.combatant?.actor&&
   actorIdentity(combat.combatant.actor)===actorIdentity(actor)
   &&combat.combatant.canAct!==false);
}
function targetWill(target) {
 const value=target?.system?.derived?.defenses?.will?.total
   ??target?.system?.defenses?.will?.total;
 return Number.isFinite(Number(value))?Number(value):null;
}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);}
/**
 * A Force Point trigger is trusted ONLY when it matches the target's own finalized ledger receipt: same receipt id,
 * same owner, FINALIZED state, same positive amount, and it came from the finalize outbox. A caller-supplied
 * `committed:true` payload is never enough on its own.
 */
export function verifyFinalizedForceReceipt(target,event){
 const ledger=target?.getFlag?.('swse','forcePointLedger')??target?.flags?.swse?.forcePointLedger;
 const rows=Array.isArray(ledger?.receipts)?ledger.receipts:[];
 const receipt=rows.find(r=>r.receiptId===event?.receiptId&&r.actorId===target?.id);
 if(!receipt)return {ok:false,reason:'receipt-not-in-actor-ledger'};
 if(receipt.state!=='finalized')return {ok:false,reason:'receipt-not-finalized'};
 if(!Number.isSafeInteger(receipt.spent)||receipt.spent<1||receipt.spent!==event.spent)
   return {ok:false,reason:'receipt-amount-mismatch'};
 if(event.source!=='ActorEngine.finalizeForcePointSpend')return {ok:false,reason:'untrusted-event-source'};
 return {ok:true,receipt};
}
function readActorPool(target,resource){
 return Number(resource==='force'?target?.system?.forcePoints?.value:
   target?.system?.destinyPoints?.value);
}

export class SithLordTemptationService {
  /** GM adjudication selects one enemy and confirms LOS; never infer sight. */
  static async activate({sith,target,confirmedLineOfSight=false,combat=activeCombat()}={}){
    if(!sith?.id||!target?.id)throw new Error('Temptation requires Sith Lord and enemy Actors');
    if(globalThis.game?.user?.isGM!==true)
      throw new Error('GM must confirm Temptation target and line of sight');
    return locked(sith,async()=>{
      if(!apexClassFeatureAccess(sith,'sith_lord').allowed)
        throw new Error('Sith Lord class features are unavailable at current Dark Side Score');
      if(!combat?.id||globalThis.game?.combat?.id!==combat.id||!isCurrentTurn(sith,combat))
        throw new Error('Temptation requires the Sith Lord current turn');
      if(!confirmedLineOfSight)throw new Error('GM line-of-sight confirmation required');
      const will=targetWill(target);
      if(will===null)throw new Error('Target Will Defense is not verified');
      // Pay action BEFORE the skill check. A failed check consumes the
      // standard action and installs no pending target effect.
      const paid=await ActionEconomyConsumption.spend(sith,'standard',{
        source:'sithLord.temptation',actionName:'Temptation',encounterId:combat.id,
        targetActorId:actorIdentity(target)
      },{notify:true});
      if(paid?.committed!==true||paid?.engineResult?.allowed===false)
        throw new Error('Temptation standard action was not committed');
      let rolled=false;
      try{
        const roll=await rollSkill(sith,'persuasion',{
          skillUse:{key:'sith-lord-temptation',label:'Temptation'},
        });
        if(!roll||!Number.isFinite(Number(roll.total)))
          throw new Error('Temptation Persuasion roll was not completed');
        rolled=true;
        const plan=planTemptationMark({
          caster:sith,target,combat,checkTotal:Number(roll.total),
          willDefense:will,confirmedLineOfSight:true
        });
        if(plan.reason==='persuasion-failed')return {
          success:true,applied:false,checkTotal:Number(roll.total),willDefense:will
        };
        if(!plan.allowed)throw new Error('Temptation mark rejected: '+plan.reason);
        if(!isCurrentTurn(sith,combat)||!apexClassFeatureAccess(sith,'sith_lord').allowed)
          throw new Error('Temptation authority changed after roll');
        await ActorEngine.applyMutationPlan(target,{
          set:plan.updates
        },{source:'SithLordTemptationService.activate',transactional:true});
        return {success:true,applied:true,checkTotal:Number(roll.total),
          willDefense:will,targetActorId:actorIdentity(target),encounterId:combat.id};
      }catch(error){
        // Never refund a valid rolled skill failure. If mutation after a
        // successful check failed, the status requires GM reconciliation.
        if(rolled)throw new Error('Temptation post-roll outcome requires GM review: '+error.message);
        const rollback=await paid.rollback?.();
        if(rollback!==true)throw new Error('Temptation action INDETERMINATE: '+error.message);
        throw error;
      }
    });
  }

  /** An authenticated post-spend event is stored before prompting. */
  static async consumeSpendReceipt(event){
    const target=event?.actor;
    if(!target?.id||!permission(target))return {handled:false};
    return locked(target,async()=>{
      let plan;
      if(event?.resource==='force'){
        // Trust only the target's own FINALIZED ledger receipt and the SPEND-TIME evidence persisted on it (Decision C):
        // never the event payload, never live combat state at delivery time.
        const verified=verifyFinalizedForceReceipt(target,event);
        if(!verified.ok)return {handled:false,reason:verified.reason};
        plan=planTemptationSpendFromEvidence({target,evidence:verified.receipt.spendEvidence?.temptation,event});
      }else{
        const combat=activeCombat();
        if(!combat?.id)return {handled:false};
        plan=planTemptationSpend({target,combat,event});
      }
      if(!plan.eligible)return {handled:false,reason:plan.reason};
      const prior=currentTemptationEvents(target);
      const pending=plan.consequences.map(x=>({
        ...x,eventKey:x.receiptId+':'+x.id,
        spent:event.spent,state:'pending-target-choice',
      }));
      await ActorEngine.applyMutationPlan(target,{
        set:{[TEMPTATION_EVENTS_PATH]:[...prior,...pending]}
      },{source:'SithLordTemptationService.pendingSpend',transactional:true});
      return {handled:true,pending:pending.length,actorId:actorIdentity(target)};
    });
  }

  /** The affected target or GM, NOT the Sith Lord, chooses the consequence. */
  static async resolvePending(target,{dialog=SWSEDialogV2}={}){
    if(!target?.id||!permission(target))
      throw new Error('Only the affected target owner or GM may choose Temptation consequences');
    const reports=[];
    const pending=currentTemptationEvents(target).filter(x=>x.state==='pending-target-choice');
    for(const event of pending) {
      const choice=await dialog.wait({
        title:'Temptation — '+esc(target.name),
        content:`<p>You spent a ${event.resource==='destiny'?'Destiny':'Force'} Point while under Sith Lord Temptation.</p>
        <p>Choose one consequence: add <strong>${event.steps} Dark Side Score</strong>,
        or move <strong>-${event.steps}</strong> step(s) on the condition track.</p>`,
        buttons:{
          dark:{label:'Increase Dark Side Score',callback:()=> 'dark'},
          condition:{label:'Worsen Condition',callback:()=> 'condition'},
          later:{label:'GM adjudication later',callback:()=>null}
        },default:'later'
      },{width:510,classes:['swse-temptation-consequence']});
      if(choice!=='dark'&&choice!=='condition') {
        reports.push({eventKey:event.eventKey,status:'pending-GM'});continue;
      }
      reports.push(await locked(target,async()=>{
        const rows=currentTemptationEvents(target);
        const current=rows.find(x=>x.eventKey===event.eventKey);
        if(current?.state!=='pending-target-choice')
          return {eventKey:event.eventKey,status:'already-resolved'};
        const set={};
        if(choice==='dark'){
          if(!Number.isFinite(DSPEngine.getValue(target)))
            throw new Error('Dark Side Score unavailable');
          set['system.darkSide.value']=DSPEngine.getNextValue(target,event.steps);
          set['system.dspLog']=[...(target.system?.dspLog??[]),{
            round:globalThis.game?.combat?.round??0,
            reason:'Sith Lord Temptation ('+event.resource+' spend)',
            timestamp:Date.now(),steps:event.steps,
          }];
        }else{
          const shift=ConditionTrackRules.resolveConditionShift(target,event.steps);
          if(!Number.isSafeInteger(shift.next))throw new Error('Condition Track unavailable');
          // A blocked/capped condition track cannot be used to evade the
          // printed penalty. Leave this choice pending for DSP or GM review.
          if(shift.appliedShift<event.steps)
            throw new Error('Temptation condition consequence cannot fully apply; choose DSP or GM review');
          set['system.conditionTrack.current']=shift.next;
        }
        set[TEMPTATION_EVENTS_PATH]=rows.map(x=>x.eventKey===event.eventKey
          ? {...x,state:'resolved',choice,appliedSteps:event.steps,
              resolvedRound:globalThis.game?.combat?.round??null}
          : x);
        await ActorEngine.applyMutationPlan(target,{set},{
          source:'SithLordTemptationService.resolve',transactional:true
        });
        return {eventKey:event.eventKey,status:'resolved',choice,steps:event.steps};
      }));
    }
    return reports;
  }

  /** Re-deliver any finalized Force Point receipt whose trigger is still pending (listener failure, reload, disconnect). */
  static async reconcileForcePointTriggers(){
    const out={actors:0,delivered:0};
    for(const actor of Array.from(globalThis.game?.actors??[])){
      const ledger=actor?.getFlag?.('swse','forcePointLedger')??actor?.flags?.swse?.forcePointLedger;
      const any=Array.isArray(ledger?.receipts)&&ledger.receipts.some(r=>r.state==='finalized'&&r.trigger?.state==='pending');
      if(!any||!permission(actor))continue;
      out.actors++;
      try{out.delivered+=(await ActorEngine.dispatchForcePointTriggers(actor)).delivered;}
      catch(error){globalThis.ui?.notifications?.error?.('Temptation reconciliation requires GM review: '+error.message);}
    }
    return out;
  }

  static async expireCombat(combat,{encounterEnd=false,nextTurn=false}={}){
    if(globalThis.game?.user?.isGM!==true||!combat?.id)return;
    const actors=[
      ...Array.from(globalThis.game?.actors??[]),
      ...Array.from(combat.combatants??[]).map(c=>c.actor).filter(Boolean),
      ...Array.from(globalThis.canvas?.tokens?.placeables??[]).map(t=>t.actor).filter(Boolean),
    ];
    for(const target of new Map(actors.filter(x=>x?.id).map(x=>[actorIdentity(x),x])).values()){
      const plan=expireTemptationEntries(target,combat,{encounterEnd,nextTurn});
      if(!plan.changed)continue;
      try{
        await locked(target,()=>ActorEngine.applyMutationPlan(target,{
          set:{[TEMPTATION_PATH]:plan.entries}
        },{source:'SithLordTemptationService.expire',transactional:true}));
      }catch(error){
        globalThis.ui?.notifications?.error?.(
          'Temptation expiry requires GM review: '+error.message);
      }
    }
  }
}

let registered=false;
export function registerSithLordTemptationHooks(){
 if(registered||!globalThis.Hooks?.on)return;
 registered=true;
 // Spend-time evidence: ActorEngine snapshots the active marks, encounter and round/turn onto the spending actor's OWN
 // receipt at the spend commit, so eligibility never depends on when finalization or delivery later runs.
 registerSpendEvidenceProvider('temptation',actor=>temptationSpendEvidence(actor,activeCombat()));
 // Force Point triggers arrive ONLY from V2's finalized-receipt outbox (ActorEngine.finalizeForcePointSpend).
 registerForcePointTriggerConsumer(async event=>{
   const report=await SithLordTemptationService.consumeSpendReceipt(event);
   // The consequence is now stored durably on the target as pending-target-choice; acknowledging the
   // trigger does not wait on the prompt.
   if(report?.handled)void SithLordTemptationService.resolvePending(event.actor).catch(error=>
     globalThis.ui?.notifications?.error?.('Temptation consequence pending GM review: '+error.message));
 });
 if(globalThis.game?.ready===true)void SithLordTemptationService.reconcileForcePointTriggers();
 else globalThis.Hooks.once?.('ready',()=>SithLordTemptationService.reconcileForcePointTriggers());
 // Destiny Points have no V2 receipt ledger; they keep their own post-commit event (see integration matrix).
 globalThis.Hooks.on('swse.resourceSpent',async event=>{
   if(event?.resource!=='destiny')return;
   try{
     const report=await SithLordTemptationService.consumeSpendReceipt(event);
     if(report?.handled)await SithLordTemptationService.resolvePending(event.actor);
   }catch(error){
     globalThis.ui?.notifications?.error?.(
       'Temptation consequence pending GM review: '+error.message);
   }
 });
 globalThis.Hooks.on('combatTurn',combat=>
   SithLordTemptationService.expireCombat(combat,{nextTurn:true}));
 globalThis.Hooks.on('deleteCombat',combat=>
   SithLordTemptationService.expireCombat(combat,{encounterEnd:true}));
 globalThis.Hooks.on('updateCombat',(combat,changes)=>{
   if(changes?.started===false)return SithLordTemptationService.expireCombat(combat,{encounterEnd:true});
 });
}
