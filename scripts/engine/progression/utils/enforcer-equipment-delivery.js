/**
 * Enforcer Resources: equipment delivery authority.
 * The Force Unleashed Campaign Guide, p. 44.
 *
 * This is NOT a store purchase. It consumes a class-feature equipment
 * entitlement; there is no credit debit or cash refund.
 *
 * Only a GM may deliver a SOURCE COMPENDIUM item or vehicle. The Store V2
 * inventory provides canonical IDs, current published base costs,
 * availability and source documents. Vehicles are created as linked world
 * Actors through the established StoreAcquisitionService/ActorEngine path.
 */
import { StoreEngine } from '/systems/foundryvtt-swse/scripts/engine/store/store-engine.js';
import { storeItemDocumentData } from '/systems/foundryvtt-swse/scripts/engine/store/normalizer.js';
import { StoreAcquisitionService } from '/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { pendingEnforcerResources } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/enforcer-resources-entitlement.js';

import {
  enforcerEligibleInventory as planEligibleInventory,
  planEnforcerEquipmentDelivery as buildEnforcerEquipmentDeliveryPlan,
  planEnforcerEquipmentDeferral,
} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/enforcer-equipment-delivery-plan.js';

export {planEnforcerEquipmentDeferral};
export function enforcerEligibleInventory(index) {
  return planEligibleInventory(index, storeItemDocumentData);
}
export function planEnforcerEquipmentDelivery(options) {
  return buildEnforcerEquipmentDeliveryPlan({...options,resolveSourceDocument:storeItemDocumentData});
}

export class EnforcerEquipmentDelivery {
  static async getEligibleInventory() {
    const result=await StoreEngine.getInventory({useCache:false,ignorePolicies:true});
    if(!result?.success||!result.inventory)throw new Error(result?.error||'Store compendium is unavailable');
    return result.inventory;
  }
  static async defer({actor,classLevel}={}) {
    if(globalThis.game?.user?.isGM!==true)throw new Error('Enforcer resource deferral requires a GM');
    const plan=planEnforcerEquipmentDeferral({entries:pendingEnforcerResources(actor),classLevel});
    await ActorEngine.applyMutationPlan(actor,{set:{'flags.swse.classFeatures.enforcer.resources':plan.entries}},
      {source:'EnforcerEquipmentDelivery.defer',transactional:true});
    return plan.current;
  }
  static async deliver({actor,classLevel,selected,location}={}) {
    if(globalThis.game?.user?.isGM!==true)throw new Error('Enforcer equipment delivery requires a GM');
    if(!actor?.isOwner)throw new Error('GM lacks ownership rights to recipient actor');
    const index=await this.getEligibleInventory();
    const plan=planEnforcerEquipmentDelivery({
      actor,entries:pendingEnforcerResources(actor),classLevel,selected,index,location,
      approvalUserId:globalThis.game.user.id,
    });
    const create=StoreAcquisitionService.prepareCreateActorPlans(
      [{create:{actors:plan.create}}],
      {ownerActor:actor,transactionContext:'enforcer-resources',source:'Enforcer Resources'},
    ).createdSpecs;
    const links=create.length ? StoreAcquisitionService.buildOwnerLinkPlan(actor,create,{
      ownerActor:actor,transactionContext:'enforcer-resources',source:'Enforcer Resources',
    }) : null;
    const set={
      'flags.swse.classFeatures.enforcer.resources':plan.next,
      ...(links?.set||{}),
    };
    await ActorEngine.applyMutationPlan(actor,{
      create:{actors:create},set,add:{items:plan.add},
    },{source:'EnforcerEquipmentDelivery.deliver',transactional:true});
    return {spent:plan.total,budget:plan.budget,delivered:plan.receipt};
  }
}
