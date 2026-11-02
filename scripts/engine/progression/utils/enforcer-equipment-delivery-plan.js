/** Canonical, Foundry-free Enforcer equipment delivery and deferral plan. Source-doc resolution is supplied by Store V2 at runtime. */
const permittedAvailability = new Set(['restricted','military']);
const assetTypes = new Set(['vehicle']); // Restricted/military vehicles, not droid minions.

// Store V2 also indexes world documents. Resources grants must use published
// compendium sources, not arbitrary GM/world entries with editable price tags.
function isCompendiumSource(item) {
  const pack = typeof item?.sourcePack === 'string' ? item.sourcePack.trim() : '';
  const uuid = typeof item?.sourceUuid === 'string' ? item.sourceUuid.trim() : '';
  const origin = item?.doc?.__storeSource;
  // The loader marks the ACTUAL collection from which it read the document.
  // Imported world copies may preserve flags.core.sourceId, so the derived
  // StoreItem sourcePack/sourceUuid alone cannot certify compendium origin.
  return !!pack && pack !== 'world' && uuid.startsWith(`Compendium.${pack}.`)
    && origin?.source === 'compendium'
    && origin.pack === pack && origin.uuid === uuid;
}

export function enforcerEligibleInventory(index, resolveSourceDocument) {
  if (typeof resolveSourceDocument !== 'function') throw new Error('Canonical source data resolver required');
  return Array.from(index?.allItems || []).filter(item =>
    isCompendiumSource(item)
    && permittedAvailability.has(String(item?.availability || '').toLowerCase().trim())
    && Number.isSafeInteger(Number(item?.cost)) && Number(item.cost) > 0
    && item?.costStatus === 'priced'
    && !!resolveSourceDocument(item)
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
  if (classLevel >= 10 || next.some(entry => entry.enforcerClassLevel > classLevel)) {
    throw new Error('Enforcer Resources can only be deferred to a future next Enforcer class level');
  }
  current.status='deferred-to-next-level';
  current.resolution='deferred';
  return {entries:next,current};
}

/**
 * Plan one delivery, with source IDs, quantities and actual base costs.
 * GM confirms the civilized accessible location before materialization.
 * No availability inference by names, no arbitrary free equipment, no change.
 */
export function planEnforcerEquipmentDelivery({actor,entries,classLevel,selected,index,location,approvalUserId,resolveSourceDocument}={}) {
  const next=clone(entries),current=locateEntitlement(next,classLevel);
  if(!actor?.id||typeof location!=='string'||!location.trim()||!approvalUserId){
    throw new Error('GM-approved owner actor and delivery location are required');
  }
  if(!Array.isArray(selected)||!selected.length)throw new Error('Select source-certified equipment before delivery');
  const catalog=new Map(enforcerEligibleInventory(index, resolveSourceDocument).map(x=>[String(x.id),x]));
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
    const raw=resolveSourceDocument(listing);
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

