/**
 * CP23-C4B: world-target-aware, read-time source/Actor structural validation.
 *
 * The SOURCE document ID and WORLD Actor ID are deliberately distinct.
 * Read-time matching cannot establish a historical import transaction.
 * CP23-C3 native staging is not registered, and NO GM installation receipt
 * issuer or audited deployed-pack byte pin currently exists.
 *
 * Never grant canonical provenance, item mounts, hydration or stock attacks
 * from this module or from a caller-supplied setting / Actor flag.
 */
import {CP23C4B_WORLD_ANCHORS}
  from './vehicle-cp23c4b-source-anchors.generated.js';
import {CP23C2_STATUS,assessCP23C2ConfigurationParity}
  from './vehicle-cp23c2-installation-preflight.js';

export const CP23C4B_SOURCE_PACK = 'foundryvtt-swse.sotg-canonical-stock-source';
export const CP23C4B_STATUS=Object.freeze({
  DENIED:'CP23C4B_DENIED',
  MATCH:'CP23C4B_MATCHED_UNAUTHENTICATED_NATIVE_CANDIDATE'
});

const entryBySourceId=new Map(CP23C4B_WORLD_ANCHORS.entries.map(x=>[x.sourceDocumentId,x]));
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj??{},key);
const idOK=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
const refuse=(reason,extras={})=>({
  status:CP23C4B_STATUS.DENIED,reason,...extras,
  verifiedInstallationReceipt:false,provenanceAuthenticated:false,
  installTransactionAuthenticated:false,compiledPackBytesAuthenticated:false,
  physicalMountCertified:false,productionHydrationPermitted:false,
  foundryStockAttackTrusted:false
});
function sourceProposal(entry){
  return {
    draftState:'NOT_DEPLOYABLE_SOURCE_PROPOSAL_ONLY',
    sourceEntryKey:entry.sourceEntryKey,
    decisionId:entry.decisionId,
    printedPage:entry.draftActor.system.page,
    draftActor:entry.draftActor,
    sourceWeaponGroupCount:entry.sourceAttackRows,
    physicalMountCertified:false,
    stockAttackTrusted:false,
    releaseDeploymentPermitted:false,
    provenanceAuthentication:'NOT_VERIFIED',
    nativeV13Roundtrip:'NOT_EXECUTED'
  };
}
function actorData(document,expectedId,{world=false}={}){
  if(!document||typeof document!=='object')return null;
  let data;
  try {
    data=typeof document.toObject==='function'?document.toObject():document;
  }catch{return null;}
  if(!data||typeof data!=='object'||!data.system)return null;
  const actualId=document.id??document._id;
  if(!idOK(actualId)||!idOK(data._id??data.id)||
    actualId!==(data._id??data.id))return null;
  if(!world&&actualId!==expectedId)return null;
  if(world&&!idOK(expectedId))return null;
  let items;
  try {
    const embedded=data.items??document.items??[];
    items=Array.isArray(embedded)?embedded:Array.from(embedded);
  }catch{return null;}
  if(!Array.isArray(items))return null;
  return {
    _id:world?expectedId:actualId,
    name:data.name??document.name,
    type:data.type??document.type,
    img:data.img??document.img,
    system:data.system,
    items
  };
}
const approvedParity=x=>x===CP23C2_STATUS.EXACT||x===CP23C2_STATUS.TRANSIENT;

/**
 * Operates on real Foundry document references supplied by a controlled GM
 * import workflow, but returns ONLY an UNAUTHENTICATED observation.
 *
 * A caller passing fake game objects can produce the same structural match,
 * which is why this function DOES NOT issue verified receipts. The final
 * receipt issuer must separately verify deployed native bytes, controlled
 * ActorEngine transaction, world context and out-of-Actor ledger authority.
 */
export async function inspectCP23C4BWorldInstallationCandidate({
  actor,sourceDocument,mode,preserve={},game=globalThis.game
}={}){
  if(mode!=='replace')return refuse('REPLACE_REQUIRED');
  if(preserve&&Object.values(preserve).some(Boolean))
    return refuse('PARTIAL_PRESERVATION_NOT_CERTIFIED');
  if(game?.system?.id!=='foundryvtt-swse'||!game?.user?.isGM||
     !idOK(game.user.id)||game?.users?.activeGM?.id!==game.user.id||
     !idOK(game?.world?.id))
    return refuse('ACTIVE_GM_WORLD_CONTEXT_REQUIRED');
  const actorId=actor?.id??actor?._id;
  if(!idOK(actorId)||actor?.type!=='vehicle'||
    game.actors?.get?.(actorId)!==actor)
    return refuse('WORLD_ACTOR_REFERENCE_NOT_AUTHENTICATED');
  if(!sourceDocument?.id||
    sourceDocument.pack!==CP23C4B_SOURCE_PACK||
    sourceDocument.type!=='vehicle')
    return refuse('SOURCE_DOCUMENT_NOT_FROM_EXPECTED_PACK');
  const entry=entryBySourceId.get(sourceDocument.id);
  if(!entry||sourceDocument.name!==entry.name)
    return refuse('DOCUMENT_NOT_IN_PINNED_CP23C3_SOURCE_SET');
  const pack=game.packs?.get?.(CP23C4B_SOURCE_PACK);
  if(!pack||pack.documentName!=='Actor'||typeof pack.getDocument!=='function')
    return refuse('CERTIFIED_CANONICAL_SOURCE_PACK_NOT_REGISTERED');
  let readBack;
  try{readBack=await pack.getDocument(sourceDocument.id);}
  catch{return refuse('SOURCE_PACK_READ_FAILED');}
  if(readBack!==sourceDocument)
    return refuse('NATIVE_SOURCE_OBJECT_REFERENCE_CHANGED');
  if(game.actors?.get?.(actorId)!==actor||
     game?.users?.activeGM?.id!==game.user.id)
    return refuse('WORLD_ACTOR_OR_GM_CHANGED_DURING_NATIVE_READ');

  const proposal=sourceProposal(entry);
  const source=actorData(sourceDocument,entry.sourceDocumentId);
  if(!source)return refuse('SOURCE_DOCUMENT_SHAPE_OR_ID_MISMATCH');
  const sourceParity=assessCP23C2ConfigurationParity(proposal,source);
  if(sourceParity.status!==CP23C2_STATUS.EXACT)
    return refuse('NATIVE_SOURCE_DOCUMENT_DIFFERS_FROM_UNARMED_AUDITED_DRAFT',
      {sourceParity:sourceParity.status});
  // Crucial: world Actor identity is authenticated *separately*. Only its
  // comparable configuration is re-keyed to the original source ID.
  const worldData=actorData(actor,entry.sourceDocumentId,{world:true});
  if(!worldData)return refuse('WORLD_ACTOR_DOCUMENT_IDENTITY_MISMATCH');
  const installedParity=assessCP23C2ConfigurationParity(proposal,worldData);
  if(!approvedParity(installedParity.status))
    return refuse('WORLD_ACTOR_CONFIGURATION_DRIFT',
      {installedParity:installedParity.status});
  if(game.actors?.get?.(actorId)!==actor||
     game?.users?.activeGM?.id!==game.user.id)
    return refuse('WORLD_ACTOR_OR_GM_CHANGED_AFTER_INSPECTION');
  return {
    ...refuse('NO_REGISTERED_PACK_BYTE_CERTIFICATE_OR_GOVERNED_IMPORT_RECEIPT',{
      actorId,worldId:game.world.id,sourceDocumentId:entry.sourceDocumentId,
      sourceEntryKey:entry.sourceEntryKey,decisionId:entry.decisionId,
      registeredPackID:CP23C4B_SOURCE_PACK,
      sourceDraftGitBlobSha:entry.sourceDocumentGitBlobSha,
      sourceParity:sourceParity.status,
      installedParity:installedParity.status,
      permittedTransientPaths:installedParity.permittedTransientPaths??[],
      observedPackAndWorldReferences:true
    }),
    status:CP23C4B_STATUS.MATCH
  };
}
/**
 * Read-time check of a claimed receipt is FAIL-CLOSED in CP23-C4B. Neither a
 * world setting nor an Actor flag can be used as a substitute for a trusted
 * native import transaction. A future issuer requires a new explicit gate.
 */
export function verifyCP23C4BClaimedReceipt(_claimedReceipt,_actor,_game){
  return refuse('VERIFIED_RECEIPT_ISSUER_NOT_DEPLOYED');
}
