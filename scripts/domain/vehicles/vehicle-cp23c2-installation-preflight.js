/**
 * CP23-C2: conservative configuration-versus-gameplay-state comparison and
 * native source import PRE-FLIGHT. No system pack is registered by this module.
 * All outcomes deny durable provenance, mechanical mounts, hydration, and
 * automated stock weapon actions.
 */
import {canonicalCP23CJson,draftCP23CSnapshot}
  from './vehicle-cp23c-source-integrity.js';

const OWN=(obj,key)=>Object.prototype.hasOwnProperty.call(obj??{},key);
const PACK='foundryvtt-swse.sotg-cp23b-isolated-proposals';

export const CP23C2_STATUS=Object.freeze({
  EXACT:'CP23C2_EXACT_UNARMED_DRAFT',
  TRANSIENT:'CP23C2_TRANSIENT_GAMEPLAY_STATE_ONLY',
  DRIFT:'CP23C2_STOCK_CONFIGURATION_DRIFT',
  INVALID:'CP23C2_INVALID_OR_UNVERIFIED_SOURCE_DRAFT'
});
const denied=(status,reason,extra={})=>({
  status,reason,...extra,
  canonicalSourceBindingAuthenticated:false,
  durableGMWorldReceiptIssued:false,
  actorMutationAllowed:false,
  productionHydrationPermitted:false,
  physicalMountCertified:false,
  foundryStockAttackTrusted:false
});
const clone=x=>JSON.parse(canonicalCP23CJson(x));
const maxValue=(x,max)=>Number.isSafeInteger(x)&&x>=0&&
  Number.isSafeInteger(max)&&max>=0&&x<=max;

function scopeTransient(baseline,candidate){
  const variations=[];
  for(const [container,leaf,limit] of [
    ['hp','value','max'],['hp','temp',null],['shields','value','max']
  ]){
    const reference=baseline.system?.[container],current=candidate.system?.[container];
    if(!OWN(reference,leaf)||!OWN(current,leaf))continue;
    const expected=reference[leaf],actual=current[leaf];
    if(Object.is(actual,expected))continue;
    const upper=limit===null?Number.MAX_SAFE_INTEGER:reference[limit];
    if(!maxValue(actual,upper))return {
      valid:false,reason:'CP23C2_OUT_OF_RANGE_TRANSIENT:'+container+'.'+leaf
    };
    current[leaf]=expected;
    variations.push('system.'+container+'.'+leaf);
  }
  return {valid:true,variations};
}

/**
 * Structural comparison for Actor-like data only. The baseline is the approved
 * UNINSTALLED draft. Permitting current HP/shields to vary does not certify
 * where the Actor came from. All additional system fields, owned Items,
 * Pure/Modified structural changes, mounted weapons and renames are DRIFT.
 */
export function assessCP23C2ConfigurationParity(proposal,actor){
  let expected;
  try{expected=draftCP23CSnapshot(proposal);}
  catch(e){return denied(CP23C2_STATUS.INVALID,e?.message??'INVALID_APPROVED_DRAFT');}
  if(!actor||typeof actor!=='object'||!actor.system||
    !Array.isArray(actor.items))
    return denied(CP23C2_STATUS.INVALID,'ACTOR_DATA_OR_ITEMS_REQUIRED');
  if(actor.items.length!==0)
    return denied(CP23C2_STATUS.DRIFT,'EMBEDDED_ITEM_COLLECTION_CHANGED');
  let candidate,baseline;
  try {
    candidate=clone({
      _id:actor._id??actor.id,name:actor.name,type:actor.type,
      img:actor.img,system:actor.system
    });
    baseline=clone(expected.sourceActor);
  }catch(e){return denied(CP23C2_STATUS.INVALID,e?.message??'UNSERIALIZABLE_ACTOR');}
  if(OWN(actor,'id')&&OWN(actor,'_id')&&actor.id!==actor._id)
    return denied(CP23C2_STATUS.DRIFT,'ACTOR_DOCUMENT_IDENTITY_CHANGED');
  const scoped=scopeTransient(baseline,candidate);
  if(!scoped.valid)
    return denied(CP23C2_STATUS.DRIFT,scoped.reason);
  if(canonicalCP23CJson(candidate)!==canonicalCP23CJson(baseline))
    return denied(CP23C2_STATUS.DRIFT,'NON_TRANSIENT_STOCK_CONFIGURATION_CHANGED');
  return denied(
    scoped.variations.length?CP23C2_STATUS.TRANSIENT:CP23C2_STATUS.EXACT,
    'ONLY_UNARMED_DRAFT_STRUCTURE_COMPARED_NOT_INSTALLATION_AUTHORITY',
    {decisionId:proposal.decisionId,sourceEntryKey:proposal.sourceEntryKey,
      permittedTransientPaths:scoped.variations}
  );
}
function asPlainActor(doc){
  if(!doc||typeof doc!=='object')return null;
  try {
    const data=typeof doc.toObject==='function'?doc.toObject():doc;
    return {
      _id:data._id??data.id??doc.id,name:data.name??doc.name,
      type:data.type??doc.type,img:data.img??doc.img,
      system:data.system??doc.system,items:Array.isArray(data.items)?data.items:
        Array.isArray(doc.items)?doc.items:Array.from(doc.items??[])
    };
  }catch{return null;}
}
/**
 * A diagnostic of the future registered pack/Actor import contract. The
 * current CP23-B pack is NOT registered. Even a forged/mock "matching" pack
 * cannot mint a receipt because this path has no issuer, no persistence, and
 * never sets trust. Future code must pin registered native pack bytes from a
 * separate audited builder before enabling that issuer.
 */
export async function inspectCP23C2NativeInstallCandidate({
  proposal,actor,sourceDocument,mode,game
}={}){
  let draft;
  try{draft=draftCP23CSnapshot(proposal);}
  catch(e){return denied('CP23C2_BLOCKED','UNAPPROVED_OR_MUTATED_DRAFT');}
  if(mode!=='replace')return denied('CP23C2_BLOCKED','REPLACE_REQUIRED');
  if(!game?.user?.isGM||!game?.user?.id)
    return denied('CP23C2_BLOCKED','GM_CONTEXT_REQUIRED');
  if(game?.system?.id!=='foundryvtt-swse')
    return denied('CP23C2_BLOCKED','WRONG_SYSTEM');
  if(!actor?.id||game.actors?.get?.(actor.id)!==actor)
    return denied('CP23C2_BLOCKED','ACTOR_NOT_AUTHENTICATED_IN_WORLD');
  if(!sourceDocument||sourceDocument.pack!==PACK||
    sourceDocument.id!==draft.isolatedDocumentId||
    sourceDocument.name!==draft.sourceActor.name)
    return denied('CP23C2_BLOCKED','SOURCE_DOCUMENT_NOT_EXPECTED_PROPOSAL');
  const pack=game.packs?.get?.(PACK);
  if(!pack)return denied('CP23C2_BLOCKED','CANONICAL_SOURCE_PACK_NOT_REGISTERED');
  let readBack;
  try{readBack=await pack.getDocument(draft.isolatedDocumentId);}
  catch{return denied('CP23C2_BLOCKED','NATIVE_SOURCE_PACK_READ_FAILED');}
  if(readBack!==sourceDocument)
    return denied('CP23C2_BLOCKED','NATIVE_SOURCE_DOCUMENT_IDENTITY_DRIFT');
  const source=asPlainActor(sourceDocument);
  const sourceResult=assessCP23C2ConfigurationParity(proposal,source);
  if(sourceResult.status!==CP23C2_STATUS.EXACT)
    return denied('CP23C2_BLOCKED','REGISTERED_SOURCE_IS_NOT_EXACT_ISOLATED_DRAFT');
  const installed=assessCP23C2ConfigurationParity(proposal,asPlainActor(actor));
  if(![CP23C2_STATUS.EXACT,CP23C2_STATUS.TRANSIENT].includes(installed.status))
    return denied('CP23C2_BLOCKED','WORLD_ACTOR_CONFIGURATION_NOT_APPROVED_DRAFT');
  return denied('CP23C2_OBSERVATION_ONLY',
    'NO_PINNED_REGISTERED_PACK_OR_DURABLE_GM_RECEIPT_AUTHORITY',
    {observedNativePackSnapshot:true,decisionId:proposal.decisionId,
      sourceEntryKey:proposal.sourceEntryKey,
      actorId:actor.id,sourceDocumentId:sourceDocument.id,
      configurationParity:installed.status,
      permittedTransientPaths:installed.permittedTransientPaths});
}
