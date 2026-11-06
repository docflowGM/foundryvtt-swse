/**
 * CP23-C1 conservative Actor source-snapshot integrity contract.
 *
 * This is a SOURCE-DRAFT COMPARISON, not installation authentication.
 * Actor flags, caller-supplied source keys and this snapshot may not grant
 * stock attack permission, physical mounts or actor hydration authority.
 *
 * Inputs are materialized from externally versioned CP23-B proposals.
 * Every Actor field change invalidates this draft parity proof (including
 * ordinary HP/shield changes). A later runtime phase may safely refine that
 * policy after proving Pure/Modified and mutation lifecycle behavior.
 */
export const CP23C_RECEIPT_STATE = Object.freeze({
  MATCH:'CP23C_UNARMED_DRAFT_PARITY_ONLY',
  DRIFT:'CP23C_DRAFT_SOURCE_DRIFT',
  INVALID:'CP23C_INVALID_DRAFT_OR_ACTOR'
});

const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj??{},key);
function assertJson(value) {
  if(value===null||typeof value==='string'||typeof value==='boolean')
    return value;
  if(typeof value==='number'){
    if(!Number.isFinite(value))throw Error('CP23C_NONFINITE_NUMBER');
    return value;
  }
  if(Array.isArray(value))return value.map(assertJson);
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)
    throw Error('CP23C_NONPLAIN_OBJECT');
  const out={};
  for(const key of Object.keys(value).sort()){
    if(['__proto__','constructor','prototype'].includes(key))
      throw Error('CP23C_UNSAFE_OBJECT_KEY');
    if(value[key]===undefined)throw Error('CP23C_UNDEFINED_IS_NOT_SOURCE_SILENCE');
    out[key]=assertJson(value[key]);
  }
  return out;
}
export function canonicalCP23CJson(value) {
  return JSON.stringify(assertJson(value));
}
/** No mutation of inputs; freeze is not a permission or security boundary. */
export function draftCP23CSnapshot(proposal){
  if(proposal?.draftState!=='NOT_DEPLOYABLE_SOURCE_PROPOSAL_ONLY'||
     proposal.physicalMountCertified!==false||
     proposal.stockAttackTrusted!==false||
     proposal.releaseDeploymentPermitted!==false||
     proposal.provenanceAuthentication!=='NOT_VERIFIED'||
     proposal.nativeV13Roundtrip!=='NOT_EXECUTED'||
     proposal?.draftActor?.type!=='vehicle'||
     proposal?.draftActor?.system?.vehicleArmamentSourceStatus!=='SOURCE_ATTACK_GROUPS_NOT_INSTALLED_OR_CERTIFIED'||
     !Array.isArray(proposal?.draftActor?.system?.weapons)||
     proposal.draftActor.system.weapons.length!==0||
     own(proposal.draftActor.system,'stockSourceEntryKey')||
     typeof proposal.sourceEntryKey!=='string'||!proposal.sourceEntryKey||
     proposal.sourceWeaponGroupCount<=0)
    throw Error('CP23C_UNVERIFIED_OR_ARMED_DRAFT');
  const actor=proposal.draftActor;
  if(!/^[A-Za-z0-9]{16}$/.test(actor._id)||
     typeof actor.name!=='string'||actor.name!==actor.system.model||
     actor.system.sourcebook!=='Starships of the Galaxy'||
     actor.system.page!==proposal.printedPage)
    throw Error('CP23C_DRAFT_IDENTITY_OR_PAGE_MISMATCH');
  return {
    sourceEntryKey:proposal.sourceEntryKey,
    decisionId:proposal.decisionId,
    queuePosition:proposal.queuePosition,
    isolatedDocumentId:actor._id,
    sourceActor:assertJson(actor),
    evidenceAttackGroupCount:proposal.sourceWeaponGroupCount,
    installedPhysicalWeaponCount:0,
    canonicalBindingAuthenticated:false,
    strictMechanicalCertificate:false,
    foundryStockAttackTrusted:false
  };
}
/**
 * Full-field conservative drift: name/id/type/img/system/owned Items.
 * Source actor has no embedded Items; an owned Item immediately invalidates
 * parity. No arbitrary Actor flag or player-editable field can turn MATCH into
 * a trusted stock attack.
 */
export function evaluateCP23CDraftParity(proposal,actor){
  let expected;
  try{expected=draftCP23CSnapshot(proposal);}catch(e){
    return {state:CP23C_RECEIPT_STATE.INVALID,
      reason:e?.message??'CP23C_BAD_PROPOSAL',
      stockAttackTrusted:false,sourceInstalled:false};
  }
  if(!actor||typeof actor!=='object'||!actor.system||!Array.isArray(actor.items))
    return {state:CP23C_RECEIPT_STATE.INVALID,reason:'CP23C_ACTOR_SHAPE_REQUIRED',
      stockAttackTrusted:false,sourceInstalled:false};
  const candidate={
    _id:actor._id??actor.id,name:actor.name,type:actor.type,img:actor.img,
    system:actor.system
  };
  try {
    const identical=canonicalCP23CJson(candidate)===canonicalCP23CJson(expected.sourceActor);
    if(!identical||actor.items.length>0)return {
      state:CP23C_RECEIPT_STATE.DRIFT,
      reason:actor.items.length>0?'CP23C_EMBEDDED_ITEMS_PRESENT':'CP23C_FULL_ACTOR_SNAPSHOT_CHANGED',
      decisionId:expected.decisionId,sourceEntryKey:expected.sourceEntryKey,
      sourceInstalled:false,stockAttackTrusted:false,
      physicalMountCertified:false,productionHydrationPermitted:false
    };
    return {
      state:CP23C_RECEIPT_STATE.MATCH,reason:'NON_DEPLOYABLE_DRAFT_PARITY_NOT_NATIVE_SOURCE_PROVENANCE',
      decisionId:expected.decisionId,sourceEntryKey:expected.sourceEntryKey,
      sourceInstalled:false,stockAttackTrusted:false,
      physicalMountCertified:false,productionHydrationPermitted:false
    };
  } catch(e){
    return {state:CP23C_RECEIPT_STATE.INVALID,
      reason:e?.message??'CP23C_SERIALIZATION_FAILED',
      sourceInstalled:false,stockAttackTrusted:false};
  }
}
