/**
 * Sith Lord Temptation, Core Rulebook p.224.
 * A GM confirms LOS; target player owns the eventual resource-spend
 * consequence. All operations use existing V2 authorities.
 */
import {shouldAutoPromptTemptationChoice} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/temptation-choice-routing.js';
import {createTemptationActorSerializer} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/temptation-actor-serializer.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { ActionEconomyConsumption } from '/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js';
import { rollSkill } from '/systems/foundryvtt-swse/scripts/rolls/skills.js';
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { DSPEngine } from '/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js';
import { ConditionTrackRules } from '/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js';
import { registerSpendTriggerConsumer, registerSpendEvidenceProvider } from '/systems/foundryvtt-swse/scripts/engine/force/force-point-trigger-registry.js';
import { apexClassFeatureAccess } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js';
import {
  TEMPTATION_PATH,TEMPTATION_EVENTS_PATH,actorIdentity,
  currentTemptations,currentTemptationEvents,
  planTemptationMark,planTemptationSpendFromEvidence,temptationSpendEvidence,expireTemptationEntries,
} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/sith-lord-temptation-state.js';

// Per-actor serialization (slice 6W re-derived): two receipts for the same target must QUEUE, not drop the second. Execution order only;
// every work function re-reads the actor's persisted state inside the turn it is given.
const serializeActor=createTemptationActorSerializer();
function key(actor){return actorIdentity(actor);}
async function locked(actor,action){
 const id=key(actor);if(!id)throw new Error('Temptation requires a stable Actor identity');
 return serializeActor(id,action);
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
 * A spend trigger is trusted ONLY when it matches the target's own FINALIZED receipt in that RESOURCE's OWN ledger: same
 * receipt id, same owner, FINALIZED state, same positive amount, and it came from that resource's finalize outbox. A
 * caller-supplied `committed:true` payload is never enough on its own. Force Point and Destiny Point receipts live in
 * separate ledgers and are never interchangeable.
 */
const SPEND_LEDGERS={
  force:{flag:'forcePointLedger',source:'ActorEngine.finalizeForcePointSpend'},
  destiny:{flag:'destinyPointLedger',source:'ActorEngine.finalizeDestinyPointSpend'},
};
export function verifyFinalizedSpendReceipt(target,event){
 const spec=SPEND_LEDGERS[event?.resource];
 if(!spec)return {ok:false,reason:'unsupported-resource'};
 const ledger=target?.getFlag?.('swse',spec.flag)??target?.flags?.swse?.[spec.flag];
 const rows=Array.isArray(ledger?.receipts)?ledger.receipts:[];
 const receipt=rows.find(r=>r.receiptId===event?.receiptId&&r.actorId===target?.id);
 if(!receipt)return {ok:false,reason:'receipt-not-in-actor-ledger'};
 if(receipt.state!=='finalized')return {ok:false,reason:'receipt-not-finalized'};
 if(!Number.isSafeInteger(receipt.spent)||receipt.spent<1||receipt.spent!==event.spent)
   return {ok:false,reason:'receipt-amount-mismatch'};
 if(event.source!==spec.source)return {ok:false,reason:'untrusted-event-source'};
 return {ok:true,receipt};
}
export const verifyFinalizedForceReceipt=(target,event)=>verifyFinalizedSpendReceipt(target,{...event,resource:'force'});
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
    // Two stages, never nested (slices 6AC/6AD re-derived): stage 1 holds only the CASTER's turn (authority, action payment, roll);
    // stage 2 holds only the TARGET's turn (fresh plan + write), so two Sith Lords marking each other cannot deadlock and two marks on
    // one target cannot overwrite each other. The exact combat turn is captured before any async step and re-verified before the write.
    const turnSnapshot=c=>({id:c?.id??null,round:c?.round??null,turn:c?.turn??null,
      combatantId:c?.combatant?.id??null});
    const sameTurn=(a,b)=>a.id===b.id&&a.round===b.round&&a.turn===b.turn&&a.combatantId===b.combatantId;
    const stage1=await locked(sith,async()=>{
      if(!apexClassFeatureAccess(sith,'sith_lord').allowed)
        throw new Error('Sith Lord class features are unavailable at current Dark Side Score');
      if(!combat?.id||globalThis.game?.combat?.id!==combat.id||!isCurrentTurn(sith,combat))
        throw new Error('Temptation requires the Sith Lord current turn');
      if(!confirmedLineOfSight)throw new Error('GM line-of-sight confirmation required');
      const will=targetWill(target);
      if(will===null)throw new Error('Target Will Defense is not verified');
      const turnAtAction=turnSnapshot(combat);
      // Pay action BEFORE the skill check. A failed check consumes the
      // standard action and installs no pending target effect.
      const paid=await ActionEconomyConsumption.spend(sith,'standard',{
        source:'sithLord.temptation',actionName:'Temptation',encounterId:combat.id,
        targetActorId:actorIdentity(target)
      },{notify:true});
      if(paid?.committed!==true||paid?.engineResult?.allowed===false)
        throw new Error('Temptation standard action was not committed');
      try{
        const roll=await rollSkill(sith,'persuasion',{
          skillUse:{key:'sith-lord-temptation',label:'Temptation'},
        });
        if(!roll||!Number.isFinite(Number(roll.total)))
          throw new Error('Temptation Persuasion roll was not completed');
        return {will,turnAtAction,total:Number(roll.total)};
      }catch(error){
        // Never refund a valid rolled skill failure; here the roll itself did not complete, so the action is returned.
        const rollback=await paid.rollback?.();
        if(rollback!==true)throw new Error('Temptation action INDETERMINATE: '+error.message);
        throw error;
      }
    });
    return locked(target,async()=>{
      try{
        // The mark is stamped from the CURRENT combat state, so it must be the very turn the action was taken on.
        if(!sameTurn(stage1.turnAtAction,turnSnapshot(combat)))
          throw new Error('combat turn advanced during the Temptation roll');
        const plan=planTemptationMark({
          caster:sith,target,combat,checkTotal:stage1.total,
          willDefense:stage1.will,confirmedLineOfSight:true
        });
        if(plan.reason==='persuasion-failed')return {
          success:true,applied:false,checkTotal:stage1.total,willDefense:stage1.will
        };
        if(!plan.allowed)throw new Error('Temptation mark rejected: '+plan.reason);
        if(!isCurrentTurn(sith,combat)||!apexClassFeatureAccess(sith,'sith_lord').allowed)
          throw new Error('Temptation authority changed after roll');
        await ActorEngine.applyMutationPlan(target,{
          set:plan.updates
        },{source:'SithLordTemptationService.activate',transactional:true});
        return {success:true,applied:true,checkTotal:stage1.total,
          willDefense:stage1.will,targetActorId:actorIdentity(target),encounterId:combat.id};
      }catch(error){
        // The skill check already happened and is never refunded: the outcome needs GM reconciliation.
        throw new Error('Temptation post-roll outcome requires GM review: '+error.message);
      }
    });
  }

  /** An authenticated post-spend event is stored before prompting. */
  static async consumeSpendReceipt(event){
    const target=event?.actor;
    if(!target?.id||!permission(target))return {handled:false};
    return locked(target,async()=>{
      // Trust only the target's own FINALIZED receipt in that resource's ledger and the SPEND-TIME evidence persisted on it
      // (Decision C): never the event payload, never live combat state at delivery time.
      const verified=verifyFinalizedSpendReceipt(target,event);
      if(!verified.ok)return {handled:false,reason:verified.reason};
      const plan=planTemptationSpendFromEvidence({target,evidence:verified.receipt.spendEvidence?.temptation,event});
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
          if(!Number.isSafeInteger(shift.appliedShift)||shift.appliedShift<event.steps)
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

  /**
   * GM control: end a mark early, or correct a mark that was expired incorrectly (rules-aware, GM-controlled time).
   * The GM is the authority over narrative time; this never invents elapsed time. It changes ONLY the mark's state and
   * appends an identifiable override record (who, when on the CAMPAIGN clock - never wall-clock - why, from -> to). It never
   * touches Force/Destiny receipts, stored consequences, or resource pools, so a correction cannot duplicate resource
   * consumption or re-apply a finalized consequence. Spends already finalized keep the eligibility they had when they were
   * made (their spend-time evidence is immutable); only FUTURE spends see the corrected state.
   */
  static async gmSetMarkState(target,markId,state,{reason}={}){
    if(globalThis.game?.user?.isGM!==true)throw new Error('Only the GM may override a Temptation mark');
    if(!['active','expired'].includes(state))throw new Error('A Temptation mark can be set to active or expired');
    if(typeof reason!=='string'||!reason.trim())throw new Error('A GM override requires a recorded reason');
    if(!target?.id)throw new Error('GM override requires the marked target actor');
    return locked(target,async()=>{
      const marks=currentTemptations(target);
      const index=marks.findIndex(m=>m.id===markId);
      if(index<0)throw new Error('Temptation mark not found on this actor');
      if(marks[index].state===state)return {changed:false,state};
      const clock=Number(globalThis.game?.time?.worldTime);
      const override={
        by:String(globalThis.game?.user?.id??''),
        // campaign clock only; with no world clock this is null, never a wall-clock stand-in
        atWorldTime:Number.isFinite(clock)?clock:null,
        reason:reason.trim(),from:marks[index].state,to:state,
      };
      const updated=marks.map((m,i)=>i===index?{...m,state,overrides:[...(Array.isArray(m.overrides)?m.overrides:[]),override]}:m);
      await ActorEngine.applyMutationPlan(target,{
        set:{[TEMPTATION_PATH]:updated}
      },{source:'SithLordTemptationService.gmOverride',transactional:true});
      return {changed:true,state,override};
    });
  }

  /** Re-deliver any finalized receipt (Force or Destiny, each from its OWN ledger) whose trigger is still pending. */
  static async reconcileSpendTriggers(){
    const out={actors:0,delivered:0};
    const pendingIn=(actor,flag)=>{
      const ledger=actor?.getFlag?.('swse',flag)??actor?.flags?.swse?.[flag];
      return Array.isArray(ledger?.receipts)&&ledger.receipts.some(r=>r.state==='finalized'&&r.trigger?.state==='pending');
    };
    for(const actor of Array.from(globalThis.game?.actors??[])){
      const force=pendingIn(actor,'forcePointLedger'),destiny=pendingIn(actor,'destinyPointLedger');
      if(!(force||destiny)||!permission(actor))continue;
      out.actors++;
      try{
        if(force)out.delivered+=(await ActorEngine.dispatchForcePointTriggers(actor)).delivered;
        if(destiny)out.delivered+=(await ActorEngine.dispatchDestinyPointTriggers(actor)).delivered;
      }catch(error){globalThis.ui?.notifications?.error?.('Temptation reconciliation requires GM review: '+error.message);}
    }
    return out;
  }
  static async reconcileForcePointTriggers(){return SithLordTemptationService.reconcileSpendTriggers();}

  static async expireCombat(combat,{encounterEnd=false,nextTurn=false}={}){
    if(globalThis.game?.user?.isGM!==true||!combat?.id)return;
    const actors=[
      ...Array.from(globalThis.game?.actors??[]),
      ...Array.from(combat.combatants??[]).map(c=>c.actor).filter(Boolean),
      ...Array.from(globalThis.canvas?.tokens?.placeables??[]).map(t=>t.actor).filter(Boolean),
    ];
    for(const target of new Map(actors.filter(x=>x?.id).map(x=>[actorIdentity(x),x])).values()){
      // Read-only prefilter (slice 6AB): world actors with nothing to expire never take a lock; the authoritative plan is still
      // recomputed from fresh state inside the actor's turn.
      if(!expireTemptationEntries(target,combat,{encounterEnd,nextTurn}).changed)continue;
      try{
        // The plan is computed INSIDE the actor's turn from fresh state, so a queued expiry never overwrites a newer write.
        await locked(target,async()=>{
          const plan=expireTemptationEntries(target,combat,{encounterEnd,nextTurn});
          if(!plan.changed)return;
          await ActorEngine.applyMutationPlan(target,{
            set:{[TEMPTATION_PATH]:plan.entries}
          },{source:'SithLordTemptationService.expire',transactional:true});
        });
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
 // Triggers arrive ONLY from each resource's finalized-receipt outbox (ActorEngine.finalize{Force,Destiny}PointSpend).
 const deliver=async event=>{
   const report=await SithLordTemptationService.consumeSpendReceipt(event);
   // The consequence is now stored durably on the target as pending-target-choice; acknowledging the
   // trigger does not wait on the prompt.
   if(!report?.handled)return;
   // Slice 6AE: the consequence belongs to the AFFECTED actor. A GM who happened to perform the spend must not be prompted to choose
   // for a connected player-owner; the durable pending choice stays on the actor for that owner (or an explicit GM review).
   if(shouldAutoPromptTemptationChoice(event.actor,{user:globalThis.game?.user,users:globalThis.game?.users})){
     void SithLordTemptationService.resolvePending(event.actor).catch(error=>
       globalThis.ui?.notifications?.error?.('Temptation consequence pending GM review: '+error.message));
   }else{
     globalThis.ui?.notifications?.info?.('Temptation consequence recorded; awaiting target-owner or GM review');
   }
 };
 // Each resource has its own ledger and outbox; Destiny is never treated as a Force Point.
 registerSpendTriggerConsumer('force',deliver);
 registerSpendTriggerConsumer('destiny',deliver);
 if(globalThis.game?.ready===true)void SithLordTemptationService.reconcileSpendTriggers();
 else globalThis.Hooks.once?.('ready',()=>SithLordTemptationService.reconcileSpendTriggers());
 globalThis.Hooks.on('combatTurn',combat=>
   SithLordTemptationService.expireCombat(combat,{nextTurn:true}));
 globalThis.Hooks.on('deleteCombat',combat=>
   SithLordTemptationService.expireCombat(combat,{encounterEnd:true}));
 globalThis.Hooks.on('updateCombat',(combat,changes)=>{
   if(changes?.started===false)return SithLordTemptationService.expireCombat(combat,{encounterEnd:true});
 });
}
