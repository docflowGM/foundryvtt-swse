import {UNIVERSAL_VEHICLE_PACK_NAMES,getUniversalVehiclePack} from '/systems/foundryvtt-swse/scripts/domain/vehicles/universal-vehicle-pack-registry.js';

const EXPECTED_PUBLICATION_CLAIMS=429;
let _cache=null;
function systemId(){return game?.system?.id??'foundryvtt-swse';}
function packId(name){return systemId()+'.'+name;}
function lower(value){return String(value??'').trim().toLowerCase();}
function displayQuantity(value){
  if(value===undefined||value===null)return '';
  if(typeof value!=='object')return String(value);
  if(typeof value.raw==='string'&&value.raw.trim())return value.raw;
  return value.value===undefined?'':String(value.value)+(value.unit?' '+value.unit:'');
}
function normalizeIndexEntry(doc,packName,pack){
  const sys=doc.system??{};
  const key=sys.vehicleSourceEntryKey;
  if(typeof key!=='string'||!key)throw new Error('UNIVERSAL_VEHICLE_INDEX_MISSING_SOURCE_KEY: '+packName+':'+(doc._id??doc.id));
  if(sys.vehiclePackName!==packName)throw new Error('UNIVERSAL_VEHICLE_INDEX_PACK_MISMATCH: '+key);
  const spec=getUniversalVehiclePack(packName);
  if(!spec?.categories.includes(sys.vehicleSourcePrimaryCategory??sys.category))
    throw new Error('UNIVERSAL_VEHICLE_INDEX_CATEGORY_MISMATCH: '+key);
  const id=doc._id??doc.id;
  if(typeof id!=='string'||!id)throw new Error('UNIVERSAL_VEHICLE_INDEX_MISSING_ACTOR_ID: '+key);
  const knownShield=sys.vehiclePublishedShieldStatus==='published';
  if(sys.vehiclePublishedShieldStatus!=='published'&&sys.vehiclePublishedShieldStatus!=='unknown')
    throw new Error('UNIVERSAL_VEHICLE_INDEX_SHIELD_PROVENANCE_MISSING: '+key);
  const crew=sys.vehicleCrewLabel??sys.vehicleCrewCount;
  const cargo=displayQuantity(sys.vehiclePublishedCargo);
  const consumables=displayQuantity(sys.vehiclePublishedConsumables);
  const book=sys.vehicleSourceBook??'';
  const page=sys.vehicleSourcePage??null;
  const category=sys.vehicleSourcePrimaryCategory??sys.category;
  return {
    id:packName+':'+id,uuid:'Compendium.'+packId(packName)+'.'+id,
    packName,packLabel:pack.metadata?.label??spec.label,documentId:id,
    sourceEntryKey:key,sourceBook:book,sourcePage:page,
    name:doc.name??'Unnamed Vehicle',model:sys.model??doc.name??'',
    img:doc.img??'icons/svg/mystery-man.svg',
    category,vehicleBucket:sys.vehicleBucket??packName.slice('vehicles-'.length),
    vehicleBucketLabel:spec.label,vehicleFamily:spec.family,
    vehicleFamilyLabel:spec.family,
    type:spec.family,
    size:sys.size??'',crew:crew===undefined?'':String(crew),
    cargo,consumables,hyperdrive:sys.vehicleHyperdriveLabel??'',
    astrogation:sys.vehicleAstrogationSupportLabel??'',
    sr:knownShield?sys.shieldRating:null,
    srStatus:sys.vehiclePublishedShieldStatus,
    cl:sys.challengeLevel??'',cost:sys.cost??'',
    speed:sys.vehicleMovementRaw??'',
    searchText:lower([doc.name,category,book,page,key,spec.label,sys.size,crew,cargo].join(' ')),
    raw:doc
  };
}

export class VehiclePackDataLoader {
  static get PACK_NAMES(){return [...UNIVERSAL_VEHICLE_PACK_NAMES];}
  static clearCache(){_cache=null;}
  static async loadVehicleIndex(){
    if(_cache)return _cache;
    const results=[],keys=new Set(),actorIds=new Set();
    for(const name of UNIVERSAL_VEHICLE_PACK_NAMES){
      const pack=game?.packs?.get(packId(name));
      // Never offer a partial catalog or fall back to obsolete aggregate packs.
      if(!pack)throw new Error('UNIVERSAL_VEHICLE_PACK_MISSING: '+name);
      if(pack.documentName!=='Actor')throw new Error('UNIVERSAL_VEHICLE_PACK_NOT_ACTORS: '+name);
      const index=await pack.getIndex({fields:[
        'name','img','system.model','system.category','system.vehicleSourcePrimaryCategory',
        'system.vehicleSourceEntryKey','system.vehicleSourceBook','system.vehicleSourcePage',
        'system.vehiclePackName','system.vehicleBucket','system.vehicleFamily',
        'system.vehiclePublishedShieldStatus','system.shieldRating',
        'system.size','system.vehicleCrewLabel','system.vehicleCrewCount',
        'system.vehiclePublishedCargo','system.vehiclePublishedConsumables',
        'system.vehicleMovementRaw','system.challengeLevel','system.cost'
      ]});
      for(const doc of index){
        const entry=normalizeIndexEntry(doc,name,pack);
        if(keys.has(entry.sourceEntryKey)||actorIds.has(entry.id))
          throw new Error('UNIVERSAL_VEHICLE_DUPLICATE_SOURCE_IDENTITY: '+entry.sourceEntryKey);
        keys.add(entry.sourceEntryKey);actorIds.add(entry.id);
        results.push(entry);
      }
    }
    if(results.length!==EXPECTED_PUBLICATION_CLAIMS||keys.size!==EXPECTED_PUBLICATION_CLAIMS)
      throw new Error('UNIVERSAL_VEHICLE_INCOMPLETE_CATALOG: '+results.length+'/'+EXPECTED_PUBLICATION_CLAIMS);
    results.sort((a,b)=>a.name.localeCompare(b.name)||a.sourceEntryKey.localeCompare(b.sourceEntryKey));
    _cache=results;
    return results;
  }
  static async loadVehicleDocument(entry){
    if(!entry||!UNIVERSAL_VEHICLE_PACK_NAMES.includes(entry.packName))return null;
    const pack=game?.packs?.get(packId(entry.packName));
    if(!pack)throw new Error('UNIVERSAL_VEHICLE_PACK_MISSING: '+entry.packName);
    const doc=await pack.getDocument(entry.documentId);
    const sourceKey=doc?.flags?.swse?.canonicalPublication?.sourceEntryKey;
    if(!doc||sourceKey!==entry.sourceEntryKey||doc.type!=='vehicle')
      throw new Error('UNIVERSAL_VEHICLE_DOCUMENT_MISMATCH: '+entry.sourceEntryKey);
    return doc;
  }
}

Hooks.once('ready',()=>VehiclePackDataLoader.clearCache());
