/**
 * CP23-C4: GM-owned WORLD-SCOPED observation log for legacy vehicle imports.
 *
 * Not a provenance receipt or a source-pack trust authority. Durable observations
 * are explicitly unverified, cannot be promoted by editing Actor flags or
 * a setting value, and never permit stock attacks/hydration.
 *
 * Each write: single active GM, exact native pack document object, world Actor,
 * serialized local operation, whole-store revision recheck, post-write readback.
 * Foundry world settings have no cross-client CAS transaction; even a successful
 * readback cannot establish consensus across concurrently connected GMs.
 */
import { inspectCP21LegacyPackCandidate }
  from './vehicle-cp22-source-view.js';

export const CP23C4_NAMESPACE = 'foundryvtt-swse';
export const CP23C4_KEY = 'vehicleImportObservationsCP23C4';
export const CP23C4_SCHEMA = 'swse.vehicle.cp23c4.gm-import-observations.v1';
const MAX_OBSERVATIONS = 200;
const own = (obj,key) => Object.prototype.hasOwnProperty.call(obj ?? {},key);
const plain = x => Boolean(x && typeof x === 'object' &&
  !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype);
const result = (status,reason,extra={}) => ({
  ...extra,status,reason,authenticatedSourceInstallation:false,
  durableVerifiedSourceReceipt:false,physicalMountCertified:false,
  foundryStockAttackTrusted:false,productionHydrationPermitted:false
});
const cleanId = x => typeof x==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(x);
const cleanText = x => typeof x==='string' && x.length>0 && x.length<=256 &&
  !/[<>]/.test(x);

export function emptyCP23C4Ledger(){
  return {schema:CP23C4_SCHEMA,revision:0,observations:[]};
}
function checkEntry(o){
  return plain(o) && o.state==='UNVERIFIED_LEGACY_NATIVE_IMPORT' &&
    cleanId(o.actorId) && cleanId(o.worldId) &&
    cleanId(o.gmUserId) && cleanId(o.sourceDocumentId) &&
    cleanId(o.packName) && cleanId(o.candidateSourceKey) &&
    cleanText(o.sourceName) && ['replace','merge'].includes(o.mode) &&
    Number.isSafeInteger(o.sequence) && o.sequence>=1 &&
    Number.isSafeInteger(o.observedAt) && o.observedAt>0 &&
    o.authenticatedSourceInstallation===false &&
    o.durableVerifiedSourceReceipt===false &&
    o.foundryStockAttackTrusted===false;
}
export function validateCP23C4Ledger(ledger){
  if(!plain(ledger) || Object.keys(ledger).sort().join('|')!==
    ['observations','revision','schema'].sort().join('|') ||
    ledger.schema!==CP23C4_SCHEMA ||
    !Number.isSafeInteger(ledger.revision) || ledger.revision<0 ||
    !Array.isArray(ledger.observations) ||
    ledger.observations.length>MAX_OBSERVATIONS ||
    !ledger.observations.every(checkEntry) ||
    ledger.observations.some(e=>e.sequence>ledger.revision))
    return false;
  const ids=new Set(ledger.observations.map(x=>x.sequence));
  return ids.size===ledger.observations.length;
}
function copy(value){return JSON.parse(JSON.stringify(value));}

export function registerCP23C4ObservationSetting(game=globalThis.game){
  if(!game?.settings?.register || !game?.settings?.settings?.has)
    return false;
  const key=CP23C4_NAMESPACE+'.'+CP23C4_KEY;
  if(game.settings.settings.has(key))return true;
  game.settings.register(CP23C4_NAMESPACE,CP23C4_KEY,{
    name:'SWSE vehicle import observations (unverified)',
    hint:'Hidden GM-owned audit observations only. Never stock source authority.',
    scope:'world',config:false,type:Object,default:emptyCP23C4Ledger()
  });
  return true;
}
/** Read-only; no Actor flags, user data or untrusted stored "granted" state can promote trust. */
export function readCP23C4ObservationLedger(game=globalThis.game){
  try{
    const raw=game?.settings?.get?.(CP23C4_NAMESPACE,CP23C4_KEY);
    if(!validateCP23C4Ledger(raw))
      return result('DENIED','UNREGISTERED_OR_INVALID_WORLD_LEDGER');
    return result('UNVERIFIED_OBSERVATIONS_ONLY',
      'WORLD_LOG_DOES_NOT_CONSTITUTE_CANONICAL_SOURCE_PROVENANCE',
      {revision:raw.revision,observations:copy(raw.observations)});
  }catch{return result('DENIED','WORLD_LEDGER_READ_FAILED');}
}
function gmContext(game){
  if(game?.system?.id!==CP23C4_NAMESPACE || !game?.user?.isGM ||
    !cleanId(game.user.id))return false;
  // Single elected active GM, not just any user with permission to edit world settings.
  if(game?.users?.activeGM?.id!==game.user.id)return false;
  return Boolean(game?.world?.id && cleanId(game.world.id));
}
let localQueue=Promise.resolve();
const serialize = fn => {
  const next=localQueue.then(fn,fn);
  localQueue=next.then(()=>undefined,()=>undefined);
  return next;
};
/**
 * Record only a verified NATIVE LEGACY PACK READ after a completed import.
 * "candidateSourceKey" is an untrusted discovery hint and explicitly not
 * an approved source binding. No call to ActorEngine, no trust flags.
 */
export async function recordCP23C4UnverifiedImport({
  actor,sourceDocument,packName,mode,game=globalThis.game
}={}){
  return serialize(async()=>{
    if(!gmContext(game))return result('DENIED','ACTIVE_GM_WORLD_REQUIRED');
    if(!['replace','merge'].includes(mode))
      return result('DENIED','IMPORT_MODE_INVALID');
    if(actor?.type!=='vehicle' || !cleanId(actor?.id) ||
       game.actors?.get?.(actor.id)!==actor)
      return result('DENIED','WORLD_ACTOR_IDENTITY_INVALID');
    if(sourceDocument?.type!=='vehicle' || !cleanId(sourceDocument.id) ||
      !cleanId(packName) || sourceDocument.pack!==CP23C4_NAMESPACE+'.'+packName)
      return result('DENIED','SOURCE_DOCUMENT_PACK_IDENTITY_INVALID');
    const candidate=inspectCP21LegacyPackCandidate({
      packName,documentId:sourceDocument.id,name:sourceDocument.name
    });
    if(candidate?.status!=='LEGACY_PACK_MATCH_UNVERIFIED_SOURCE_BINDING')
      return result('DENIED','NO_APPROVED_LEGACY_CANDIDATE');
    const pack=game.packs?.get?.(sourceDocument.pack);
    if(!pack?.getDocument)return result('DENIED','NATIVE_PACK_UNAVAILABLE');
    let readback;
    try{readback=await pack.getDocument(sourceDocument.id);}
    catch{return result('DENIED','NATIVE_PACK_READ_FAILED');}
    if(readback!==sourceDocument)return result('DENIED','NATIVE_DOCUMENT_REFERENCE_MISMATCH');
    // World membership can change while the pack read is in flight.
    if(game.actors?.get?.(actor.id)!==actor || !gmContext(game))
      return result('DENIED','WORLD_IDENTITY_CHANGED_DURING_READ');
    const before=game.settings?.get?.(CP23C4_NAMESPACE,CP23C4_KEY);
    if(!validateCP23C4Ledger(before))
      return result('DENIED','INVALID_OR_UNREGISTERED_WORLD_LEDGER');
    const now=Date.now();
    if(!Number.isSafeInteger(now)||now<=0)
      return result('DENIED','CLOCK_INVALID');
    const sequence=before.revision+1;
    if(!Number.isSafeInteger(sequence))
      return result('DENIED','LEDGER_REVISION_OVERFLOW');
    const entry={
      state:'UNVERIFIED_LEGACY_NATIVE_IMPORT',
      sequence,observedAt:now,worldId:game.world.id,
      gmUserId:game.user.id,actorId:actor.id,
      packName,sourceDocumentId:sourceDocument.id,
      sourceName:sourceDocument.name,
      candidateSourceKey:candidate.sourceEntryKey ?? '',
      mode,
      authenticatedSourceInstallation:false,
      durableVerifiedSourceReceipt:false,
      foundryStockAttackTrusted:false
    };
    // The legacy candidate reader does not surface its raw key as a trust
    // binding. Resolve a narrowly scoped, pinned key from its decision ID.
    if(!entry.candidateSourceKey) {
      const exact=CP23C4_LEGACY_HINTS.find(x=>x.decisionId===candidate.decisionId);
      if(!exact)return result('DENIED','PINNED_LEGACY_ID_MISSING');
      entry.candidateSourceKey=exact.sourceEntryKey;
    }
    if(!checkEntry(entry))
      return result('DENIED','MALFORMED_UNVERIFIED_OBSERVATION');
    // Recheck before writing. Settings are not CAS across browser sessions.
    const current=game.settings.get(CP23C4_NAMESPACE,CP23C4_KEY);
    if(!validateCP23C4Ledger(current) || current.revision!==before.revision ||
      JSON.stringify(current)!==JSON.stringify(before))
      return result('DENIED','CONCURRENT_WORLD_LEDGER_CHANGE');
    const updated={schema:CP23C4_SCHEMA,revision:sequence,
      observations:[...before.observations,entry].slice(-MAX_OBSERVATIONS)};
    try{
      await game.settings.set(CP23C4_NAMESPACE,CP23C4_KEY,updated);
      const saved=game.settings.get(CP23C4_NAMESPACE,CP23C4_KEY);
      if(!validateCP23C4Ledger(saved) || saved.revision!==sequence ||
        JSON.stringify(saved.observations.at(-1))!==JSON.stringify(entry))
        return result('DENIED','POST_WRITE_WORLD_LEDGER_READBACK_MISMATCH');
    }catch{return result('DENIED','WORLD_LEDGER_WRITE_FAILED');}
    return result('UNVERIFIED_OBSERVATION_RECORDED',
      'LEGACY_PACK_OBSERVATION_ONLY_NO_CANONICAL_RECEIPT',
      {sequence,actorId:entry.actorId});
  });
}
// Runtime references share the same compiled CP22 immutable discovery catalogue.
// These are fixed historical hints, not cryptographic proof of pack origin.
import {CP22_SOTG_REFERENCE_CATALOG}
  from './vehicle-cp22-source-catalog.generated.js';
const CP23C4_LEGACY_HINTS=CP22_SOTG_REFERENCE_CATALOG.legacyPackCandidates;
