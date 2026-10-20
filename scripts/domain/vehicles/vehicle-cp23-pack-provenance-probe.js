/**
 * CP23 native-pack/import identity OBSERVATION, not certification.
 *
 * The checked-in legacy packs lack the CP16/CP21 source binding. This proves
 * that the selected document was really read from a registered Foundry pack
 * and that an observed world Actor still matches its imported legacy snapshot.
 * It cannot prove canonical stock origin, installation history or persisted
 * mount identity. No trust flags or attack registry writes occur.
 */
import {CP22_SOTG_REFERENCE_CATALOG} from './vehicle-cp22-source-catalog.generated.js';

const fail=reason=>({
  status:'CP23_SOURCE_PACK_NOT_AUTHENTICATED',reason,observedLegacyPack:false,
  strictMechanicalCertified:false,stockAttackAuthorityGranted:false,
  canonicalSourceBindingGranted:false,productionHydrationPermitted:false
});
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x??{},k);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fields=['sourcebook','page','stockSourceEntryKey','weapons','initiative','flatFooted','reflexDefense'];
const ID='foundryvtt-swse';

export async function probeCP23LegacyPackImport({
  actor,sourceDocument,mode,packName,game=globalThis.game
}={}){
  if(mode!=='replace')return fail('REPLACE_REQUIRED');
  if(!actor||actor.type!=='vehicle'||!actor.id||
     !sourceDocument||sourceDocument.type!=='vehicle')
    return fail('INVALID_ACTOR_OR_SOURCE_DOCUMENT');
  const hint=CP22_SOTG_REFERENCE_CATALOG.legacyPackCandidates.find(x=>
    x.packName===packName&&sourceDocument.id===x.documentId&&
    sourceDocument.name===x.name);
  if(!hint)return fail('UNKNOWN_LEGACY_PACK_DOCUMENT');
  if(!game?.actors?.get||game.actors.get(actor.id)!==actor)
    return fail('ACTOR_NOT_PRESENT_IN_WORLD_COLLECTION');
  const expectedPack=(game.system?.id===ID?game.system.id:ID)+'.'+packName;
  if(sourceDocument.pack!==expectedPack)return fail('PACK_IDENTITY_MISMATCH');
  const pack=game.packs?.get?.(expectedPack);
  if(!pack)return fail('NATIVE_PACK_NOT_REGISTERED');
  let reread;
  try{reread=await pack.getDocument(hint.documentId);}catch{
    return fail('NATIVE_PACK_READ_FAILED');
  }
  if(!reread||reread!==sourceDocument)return fail('PACK_DOCUMENT_OBJECT_IDENTITY_MISMATCH');
  const sourceSystem=sourceDocument.system??{},actorSystem=actor.system??{};
  if(sourceSystem.sourcebook!==''||sourceSystem.page!==null||
     own(sourceSystem,'stockSourceEntryKey'))
    return fail('UNEXPECTED_SOURCE_FIELDS_REQUIRE_REAUDIT');
  const drift=fields.filter(k=>{
    const a=own(sourceSystem,k),v=own(actorSystem,k);
    return a!==v||(a&&!equal(sourceSystem[k],actorSystem[k]));
  });
  if(drift.length)return {...fail('IMPORTED_ACTOR_LEGACY_SNAPSHOT_DRIFT'),
    candidateSourceEntryKey:hint.sourceEntryKey,driftFields:drift};
  return {
    status:'CP23_LEGACY_NATIVE_PACK_SNAPSHOT_OBSERVED',
    reason:'SOURCE_REBUILD_AND_DURABLE_PROVENANCE_STILL_REQUIRED',
    observedLegacyPack:true,worldActorId:actor.id,pack:expectedPack,
    sourceDocumentId:hint.documentId,candidateSourceEntryKey:hint.sourceEntryKey,
    inspectedFieldNames:fields,
    strictMechanicalCertified:false,stockAttackAuthorityGranted:false,
    canonicalSourceBindingGranted:false,productionHydrationPermitted:false
  };
}
/** Live adapter: never honors a caller-supplied fake game context. */
export async function observeCP23ImportedVehicle({actor,sourceDocument,mode,packName}={}){
  return probeCP23LegacyPackImport({
    actor,sourceDocument,mode,packName,game:globalThis.game
  });
}
