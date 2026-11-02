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

const permittedAvailability = new Set(['restricted','military']);
const assetTypes = new Set(['vehicle']); // Restricted/military vehicles, not droid minions.

export function enforcerEligibleInventory(index) {
  return Array.from(index?.allItems || []).filter(item =>
    permittedAvailability.has(String(item?.availability || '').toLowerCase().trim())
    && Number.isSafeInteger(Number(item?.cost)) && Number(item.cost) > 0
    && item?.costStatus === 'priced'
    && !!storeItemDocumentData(item)
    && !['droid','npc','character'].includes(String(item?.type || '').toLowerCase()));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function locateEntitlement(entries, level) {
  if (!Array.isArray(entries)) throw new Error('Malformed Enforcer Resources ledger');
  const rows=entries.filter(entry=>entry.enforcerClassLevel===level);
  if(rows.length!==1)throw new Error('No unique Enforcer Resources entitlement for that class level');
  if(rows[0].status!=='awaiting-equipment-selection'){
    throw new Error('Enforcer Resources entitlement is already resolved or not currently deliverable');
  }
  if(!Number.isSafeInteger(rows[0].amountCredits)||rows[0].amountCredits<0){
    throw new Error('Enforcer Resources allowance is invalid');
  }
  return rows[0];
}

/** A GM may defer an unspent entitlement once, to exactly the next class level. */
export function planEnforcerEquipmentDeferral({entries,classLevel}={}) {
  const next=clone(entries),current=locateEntitlement(next,classLevel);
  current.status='deferred-to-next-level';
  current.resolution='deferred';
  return {entries:next,current};
}

/**
 * Plan one delivery, with source IDs, quantities and actual base costs.
 * GM confirms the civilized accessible location before materialization.
 * No availability inference by names, no arbitrary free equipment, no change.
 */
export function planEnforcerEquipmentDelivery({actor,entries,classLevel,selected,index,location,approvalUserId}={}) {
  const next=clone(entries),current=locateEntitlement(next,classLevel);
  if(!actor?.id||typeof location!=='string'||!location.trim()||!approvalUserId){
    throw new Error('GM-approved owner actor and delivery location are required');
  }
  if(!Array.isArray(selected)||!selected.length)throw new Error('Select source-certified equipment before delivery');
  const catalog=new Map(enforcerEligibleInventory(index).map(x=>[String(x.id),x]));
  const add=[],create=[],receipt=[],selectionKeys=new Set();
  let total=0;
  for(let i=0;i<selected.length;i++){
    const choice=selected[i],id=String(choice?.id||''),qty=Number(choice?.quantity);
    if(!id||selectionKeys.has(id))throw new Error('Duplicate or missing equipment identity');
    selectionKeys.add(id);
    const listing=catalog.get(id);
    if(!listing)throw new Error(`Equipment ${id} is not an eligible restricted/military source item`);
    if(!Number.isInteger(qty)||qty<1||qty>100)throw new Error('Equipment quantity must be an integer 1–100');
    const unit=Number(listing.cost),amount=unit*qty;
    if(!Number.isSafeInteger(amount)||amount<=0||total+amount>current.amountCredits) {
      throw new Error('Equipment exceeds the available Enforcer Resources allowance');
    }
    total+=amount;
    const raw=storeItemDocumentData(listing);
    if(!raw)throw new Error('Source item cannot be copied canonically');
    delete raw._id;delete raw.id;delete raw._stats;
    const provenance={
      enforcerResources:{classLevel,sourceId:id,quantity:qty,unitValue:unit,gmId:approvalUserId,location:location.trim()}
    };
    if(assetTypes.has(listing.type)){
      if(qty>5)throw new Error('Too many vehicles in a single equipment delivery');
      for(let j=0;j<qty;j++){
        const temporaryId=`enforcer_${actor.id}_${classLevel}_${i}_${j}`;
        create.push({
          temporaryId,type:'vehicle',
          data:{
            ...clone(raw),type:'vehicle',
            flags:{...(raw.flags||{}),swse:{...(raw.flags?.swse||{}),...clone(provenance)}},
          },
        });
      }
    }else{
      add.push({
        ...raw,quantity:qty,
        system:{...(raw.system||{}),quantity:qty},
        flags:{...(raw.flags||{}),swse:{...(raw.flags?.swse||{}),...clone(provenance)}},
      });
    }
    receipt.push({id,name:listing.name,unitValue:unit,quantity:qty,subtotal:amount});
  }
  current.status='delivered';
  current.resolution='equipment';
  current.deliveryLocation=location.trim();
  current.approvedBy=approvalUserId;
  current.usedValueCredits=total;
  current.unusedValueCredits=current.amountCredits-total;
  current.deliveredItems=receipt;
  return {next,create,add,receipt,total,budget:current.amountCredits};
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
