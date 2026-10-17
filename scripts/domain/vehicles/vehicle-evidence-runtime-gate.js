/**
 * Phase 2C Foundry-facing gate for GM encounter exceptions. This is a staged
 * adapter, not an automatic registration into the current roll pipeline.
 * It derives all authority from the actual Foundry session, never from a
 * caller-supplied isGM flag or user/instance IDs. A receipt must be persisted
 * before an exception is returned. No compendium or source file is mutated.
 */
import { decideArcDependentAttack, decideConflictedAttackValue } from './vehicle-evidence-authority.js';

const FLAG_SCOPE = 'foundryvtt-swse';
const FLAG_NAME = 'phase2cVehicleEvidenceReceipt';
const ALLOWED = new Set(['ALLOW_GM_INSTANCE_EXCEPTION','ALLOW_GM_INSTANCE_ADJUDICATION']);
const blocked = reason => ({status:'BLOCK',reason,canonicalMutationAllowed:false});

function trustedContext() {
  const g = globalThis.game;
  const u = g?.user;
  if (!u?.isGM || typeof u.id !== 'string' || !u.id) return null;
  const combatId = g?.combat?.id;
  const sceneId = g?.scenes?.current?.id ?? g?.canvas?.scene?.id;
  const instanceId = combatId ? `combat:${combatId}` : sceneId ? `scene:${sceneId}` : null;
  if (!instanceId) return null;
  return {verifiedUserIsGM:true,userId:u.id,instanceId};
}

function scopeFromArgs(args) {
  const {vehicleId,attackId,weaponGroupKey,targetId} = args ?? {};
  if (![vehicleId,attackId,weaponGroupKey,targetId].every(x=>typeof x==='string' && x.trim())) return null;
  return {vehicleId,attackId,weaponGroupKey,targetId};
}

function makeOverride({context,scope,decision}) {
  if (decision?.confirmed !== true || typeof decision.reason !== 'string' || !decision.reason.trim()) return null;
  const randomId = globalThis.foundry?.utils?.randomID?.();
  if (typeof randomId !== 'string' || !randomId) return null;
  return {...scope,instanceId:context.instanceId,approvedByUserId:context.userId,
    reason:decision.reason.trim(),receiptId:randomId,
    ...(Object.hasOwn(decision,'selectedArc')?{selectedArc:decision.selectedArc}:{}),
    ...(Object.hasOwn(decision,'selectedValue')?{selectedValue:decision.selectedValue}:{})};
}

async function persistReceipt(receipt) {
  const create = globalThis.ChatMessage?.create;
  if (typeof create !== 'function') return null;
  try {
    const msg = await create.call(globalThis.ChatMessage,{
      user:receipt.gmUserId,
      content:'Vehicle evidence adjudication (GM-only audit receipt)',
      whisper:[receipt.gmUserId],
      flags:{[FLAG_SCOPE]:{[FLAG_NAME]:receipt}}
    });
    return msg?.id ? msg.id : null;
  } catch {return null;}
}

/**
 * Returns a *provisional eligibility* decision. A confirmed printed arc still
 * requires the live geometry check and resolved crew/target before rolling.
 * An unknown arc has no automatic eligibility; only explicit GM adjudication
 * can produce a scoped exception, after receipt creation succeeds.
 */
export async function authorizeVehicleArcEvidence(args) {
  const scope=scopeFromArgs(args);
  if (!scope) return blocked('ATTACK_SCOPE_UNRESOLVED');
  const raw=decideArcDependentAttack({...args,...scope,context:undefined,override:undefined});
  if (raw.status==='ALLOW_VERIFIED_ARC') return {...raw,requiresGeometryCheck:true};
  if (args?.arcEvidence!=='SOURCE_SILENT_CONFIRMED') return raw;
  const context=trustedContext();
  if (!context) return blocked('TRUSTED_GM_CONTEXT_REQUIRED');
  const override=makeOverride({context,scope,decision:args?.gmDecision});
  if (!override) return blocked('EXPLICIT_GM_CONFIRMATION_REQUIRED');
  const result=decideArcDependentAttack({...args,...scope,context,override});
  if (!ALLOWED.has(result.status)) return result;
  const receiptDocumentId=await persistReceipt(result.receipt);
  if (!receiptDocumentId) return blocked('GM_RECEIPT_PERSISTENCE_FAILED');
  return {...result,receiptDocumentId,requiresGeometryCheck:true};
}

export async function authorizeVehicleConflictEvidence(args) {
  const scope=scopeFromArgs(args);
  if (!scope) return blocked('ATTACK_SCOPE_UNRESOLVED');
  const context=trustedContext();
  if (!context) return blocked('TRUSTED_GM_CONTEXT_REQUIRED');
  const override=makeOverride({context,scope,decision:args?.gmDecision});
  if (!override) return blocked('EXPLICIT_GM_CONFIRMATION_REQUIRED');
  const result=decideConflictedAttackValue({...args,...scope,context,override});
  if (!ALLOWED.has(result.status)) return result;
  const receiptDocumentId=await persistReceipt(result.receipt);
  if (!receiptDocumentId) return blocked('GM_RECEIPT_PERSISTENCE_FAILED');
  return {...result,receiptDocumentId};
}

export const VEHICLE_EVIDENCE_RECEIPT_FLAG = Object.freeze({scope:FLAG_SCOPE,key:FLAG_NAME});