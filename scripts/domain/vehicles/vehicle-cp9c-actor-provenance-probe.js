/**
 * CP9C inspection only: a controlled wizard import is not, by itself,
 * cryptographic/authenticated source provenance. This module compares a
 * real Foundry pack document with the current Actor and refuses to convert
 * editable source metadata into stock-attack authority.
 */
import { PILOT_SOURCE_DOCUMENTS } from './vehicle-cp9b-runtime-pack-verifier.js';

const fail=(reason)=>({verified:false,reason,stockAttackAuthorityGranted:false});
const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'
  ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const values=x=>Array.isArray(x)?x:Array.from(x??[]);

/** Observes exact published hardware, never trusts caller-supplied keys. */
export async function probeControlledVehicleImport({
  actor,sourceDocument,mode,game=globalThis.game
}={}){
  if(mode!=='replace')return fail('REPLACE_REQUIRED_MERGE_NOT_SOURCE_IDENTITY');
  if(!actor||actor.type!=='vehicle'||!actor.id||!sourceDocument||sourceDocument.type!=='vehicle')
    return fail('INVALID_VEHICLE_DOCUMENTS');
  if(!game?.actors?.get||game.actors.get(actor.id)!==actor)
    return fail('ACTOR_NOT_IN_WORLD_COLLECTION');
  const expected=PILOT_SOURCE_DOCUMENTS.find(e=>
    sourceDocument.id===e.id&&sourceDocument.pack===e.pack);
  if(!expected)return fail('SOURCE_NOT_ON_CERTIFIED_PILOT_ROSTER');
  const pack=game.packs?.get?.(expected.pack);
  if(!pack)return fail('SOURCE_PACK_NOT_REGISTERED');
  let reread;
  try{reread=await pack.getDocument(expected.id);}catch{return fail('SOURCE_PACK_READ_FAILED');}
  if(reread!==sourceDocument)return fail('SOURCE_DOCUMENT_NOT_PACK_IDENTITY');
  const ss=sourceDocument.system??{},as=actor.system??{};
  if(ss.stockSourceEntryKey!==expected.key||ss.sourcebook!=='Starships of the Galaxy'||
      ss.page!==expected.page||ss.weapons?.length!==expected.weapons)
    return fail('PUBLISHED_DOCUMENT_FIELDS_MISMATCH');
  if(as.stockSourceEntryKey!==expected.key||as.sourcebook!==ss.sourcebook||as.page!==ss.page)
    return fail('ACTOR_SOURCE_FIELDS_MISMATCH');
  if(!Array.isArray(as.weapons)||as.weapons.length!==expected.weapons)
    return fail('INSTALLED_GROUP_CARDINALITY_MISMATCH');
  // A replacement into an Actor containing a previous mounted Item cannot
  // be a clean stock clone. A name-equivalent item is still a separate gun.
  const items=values(actor.items);
  if(items.some(x=>x?.type==='weapon'||x?.system?.mounted===true))
    return fail('OWNED_WEAPON_ITEM_REQUIRES_RECONCILIATION');
  for(let i=0;i<expected.weapons;i++){
    const source=ss.weapons[i],installed=as.weapons[i];
    if(!source||!installed)return fail('MISSING_INSTALLED_PHYSICAL_GROUP');
    for(const key of [
      'id','name','sourceEntryKey','sourceWeaponGroupKey','mountId',
      'mountCount','hardwareCount','operatorStation','station','firingArc',
      'damage','printedAttackTotal','autofirePrintedTotal'
    ])if(!own(source,key)||!own(installed,key)||!equal(source[key],installed[key]))
      return fail('INSTALLED_PHYSICAL_GROUP_DRIFT:'+key);
    if(own(installed,'bonus')||own(installed,'attackBonus'))
      return fail('PUBLISHED_ATTACK_TOTAL_USED_AS_ADDEND');
  }
  // These are known printed values; never use null as a substitute for
  // explicit absence.
  if(as.carried_craft!=='None'||as.vehicleHasCarriedCraft!==false)
    return fail('PUBLISHED_CARRIED_CRAFT_ABSENCE_MISMATCH');
  const result={
    verified:true,
    status:'CONTROLLED_IMPORT_SNAPSHOT_FIELDS_MATCH',
    actorId:actor.id,pack:expected.pack,sourceDocumentId:expected.id,
    sourceEntryKey:expected.key,physicalStockGroups:expected.weapons,
    stockAttackAuthorityGranted:false,operationalCertification:false,
    reason:'EPHEMERAL_DIAGNOSTIC_NOT_PERSISTENT_AUTHORITY'
  };
  return result;
}
