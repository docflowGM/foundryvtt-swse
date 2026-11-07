/**
 * Jedi Master Serenity runtime.
 * Core Rulebook p.220 — full-round enter, swift exit, first qualifying
 * next-round attack/UtF check treated as NATURAL 20.
 *
 * All actor state writes use ActorEngine. Actions use the V2 economy.
 * A successful roll retains the regular Foundry d20 term: V13
 * Roll.evaluate({maximize:true}) produces an evaluated die of 20.
 */
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { ActionEconomyConsumption } from '/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js';
import { apexClassFeatureAccess } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js';
import {
  SERENITY_PATH,readSerenityState,planSerenityTransition,
  serenityNatural20Eligible,serenityConsumedState,
} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/serenity-state.js';

const locks=new Set();
function actorKey(actor){return String(actor?.uuid??actor?.id??'');}
async function locked(actor,fn){
  const key=actorKey(actor);
  if(!key||locks.has(key))throw new Error('Serenity action/roll already in progress for this Actor');
  locks.add(key);
  try{return await fn();}finally{locks.delete(key);}
}
function requireTurn(actor,combat){
  if(!combat?.started||globalThis.game?.combat?.id!==combat.id)
    throw new Error('Serenity requires the active combat');
  const combatant=Array.from(combat.combatants||[]).find(c=>
    c.actor?.uuid===actor.uuid||c.actor?.id===actor.id);
  if(!combatant||combat.combatant?.id!==combatant.id||combatant.canAct===false)
    throw new Error('Serenity requires this Jedi Master to act on their current turn');
}
function requirePermission(actor){
  if(globalThis.game?.user?.isGM===true)return;
  if(!actor?.testUserPermission?.(globalThis.game?.user,'OWNER'))
    throw new Error('Only the Actor owner or GM can activate Serenity');
}

export class JediMasterSerenityService{
  static async act(actor,action,{combat=globalThis.game?.combat}={}){
    if(!actor?.id)throw new Error('Serenity requires an Actor');
    return locked(actor,async()=>{
      requirePermission(actor);
      if(!apexClassFeatureAccess(actor,'jedi_master').allowed)
        throw new Error('Jedi Master class feature not accessible');
      requireTurn(actor,combat);
      const plan=planSerenityTransition(actor,combat,action);
      if(!plan.allowed)throw new Error('Serenity: '+plan.reason);
      const spend=await ActionEconomyConsumption.spend(actor,plan.actionType,{
        source:'jediMaster.serenity',actionName:'Serenity '+action,encounterId:combat.id,
      },{notify:true});
      if(spend?.committed!==true||spend?.engineResult?.allowed===false)
        throw new Error('Serenity '+plan.actionType+' action was not committed');
      try{
        // Guard against a combat turn advancing while the spend awaited.
        requireTurn(actor,combat);
        await ActorEngine.applyMutationPlan(actor,{
          set:{[SERENITY_PATH]:plan.next}
        },{source:'JediMasterSerenityService.'+action,transactional:true});
        return {success:true,action,phase:plan.next.phase,
          eligibleRound:plan.next.eligibleRound??null,encounterId:combat.id};
      }catch(error){
        try{
          const refund=await spend.rollback?.();
          if(refund!==true)throw new Error('rollback not verified');
        }catch(refundError){
          throw new Error('Serenity action INDETERMINATE: '+error.message+
            '; action refund failed: '+refundError.message);
        }
        throw error;
      }
    });
  }

  /**
   * Wrap the canonical check-roll creation. Serializes same-client attempts,
   * claims the next-round benefit before the die is evaluated, and restores
   * the claim if the roll cannot be completed. No fake +20 modifiers, no
   * synthetic critical hit or alternative roll-authority path.
   */
  static async roll(actor,domain,formula,rollFactory,{combat=globalThis.game?.combat}={}){
    if(typeof rollFactory!=='function')throw new Error('Serenity rollFactory required');
    if(!serenityNatural20Eligible(actor,combat,domain,formula))
      return rollFactory({maximize:false});
    return locked(actor,async()=>{
      if(!apexClassFeatureAccess(actor,'jedi_master').allowed
        ||!serenityNatural20Eligible(actor,combat,domain,formula))
        return rollFactory({maximize:false});
      const prior=readSerenityState(actor);
      const consumed=serenityConsumedState(prior,combat.round);
      await ActorEngine.applyMutationPlan(actor,{
        set:{[SERENITY_PATH]:consumed}
      },{source:'JediMasterSerenityService.consumeNatural20',transactional:true});
      try{
        const roll=await rollFactory({maximize:true});
        // Foundry 13 supports Roll.evaluate({maximize:true}); explicitly
        // confirm the *actual* d20 result so consumers interpret natural20.
        const die=roll?.dice?.find?.(d=>Number(d.faces)===20);
        const result=die?.results?.find?.(r=>r.active!==false)??die?.results?.[0];
        if(Number(result?.result)!==20)
          throw new Error('Serenity roll did not produce an evaluated natural 20');
        return roll;
      }catch(error){
        const now=readSerenityState(actor);
        if(now?.phase!=='consumed'||now?.encounterId!==prior.encounterId
          ||now?.consumedRound!==consumed.consumedRound)
          throw new Error('Serenity roll INDETERMINATE; actor state changed during refund: '+error.message);
        try{
          await ActorEngine.applyMutationPlan(actor,{
            set:{[SERENITY_PATH]:prior}
          },{source:'JediMasterSerenityService.rollbackNatural20',transactional:true});
        }catch(refundError){
          throw new Error('Serenity roll INDETERMINATE; state refund failed: '+
            refundError.message+'; original: '+error.message);
        }
        throw error;
      }
    });
  }
}
