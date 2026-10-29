/**
 * Phase 4D: GM-invoked runtime acceptance audit for native vehicle packs.
 *
 * Read-only by default. No import, world Actor creation, settings writes,
 * attack executions, repairs, or legacy pack fallback.
 *
 * In a real Foundry V13 test world:
 *   await SWSE.debug.vehicles.audit()
 *   await SWSE.debug.vehicles.audit({inspectAllDocuments:true})
 *   await SWSE.debug.vehicles.openSampleSheet('core-vulture-class-droid-starfighter')
 *
 * An incomplete / unverified result is NEVER a release certificate.
 */
import { UNIVERSAL_VEHICLE_PACKS } from './universal-vehicle-pack-registry.js';

export const VEHICLE_4D_EXPECTED_COUNT = 429;
export const VEHICLE_4D_REQUIRED_GENERATION = 13;
const MAX_ISSUES = 50;
const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const toPlain = document => typeof document?.toObject === 'function' ? document.toObject() : document;
const idOf = value => value?._id ?? value?.id ?? null;
const issue = (code, detail = '') => ({ code, detail: String(detail) });

/** Validate a native compendium Actor document without trusting its stock attacks. */
export function auditUniversalVehicleActor(document, { packName, sourceKey } = {}) {
  const errors = [];
  const raw = toPlain(document) ?? {};
  const sys = raw.system ?? {};
  const flags = raw.flags?.swse ?? {};
  const original = flags.universalVehicleSource?.source;
  const evidence = flags.canonicalPublication ?? {};
  const key = original?.identity?.sourceEntryKey ?? '';
  const printedSR = original?.defenses?.shieldRating;
  const actualKey = sys.vehicleSourceEntryKey;
  const mounted = original?.armament?.weaponMounts;
  const groups = original?.armament?.firingGroups ?? [];
  if (raw.type !== 'vehicle') errors.push(issue('NOT_VEHICLE', raw.type));
  if (!/^[0-9a-f]{16}$/.test(String(idOf(raw) ?? ''))) errors.push(issue('INVALID_ID', idOf(raw)));
  if (flags.universalVehicleSource?.schema !== 'swse.vehicle.universal.actor-source.v1' ||
      original?.recordType !== 'vehicle-source-entry') errors.push(issue('NO_CANONICAL_SOURCE'));
  if (!key || (sourceKey && key !== sourceKey) || actualKey !== key || evidence.sourceEntryKey !== key)
    errors.push(issue('IDENTITY_DRIFT', key));
  if (sys.vehiclePackName !== packName) errors.push(issue('PACK_OWNERSHIP_DRIFT', key));
  if (sys.vehicleSourceBook !== original?.publication?.book ||
      sys.vehicleSourcePage !== original?.publication?.page ||
      evidence.printedPage !== original?.publication?.page ||
      evidence.sourceBook !== original?.publication?.book) errors.push(issue('PUBLICATION_DRIFT', key));
  if (evidence.sourceCertification !== 'SOURCE_ONLY' ||
      evidence.foundryStockAttackTrusted !== false ||
      evidence.physicalMountCertification !== false)
    errors.push(issue('UNAUTHORIZED_STOCK_TRUST', key));
  if (!isNumber(sys.initiative) || sys.initiative !== original?.abilities?.initiativePrinted)
    errors.push(issue('INITIATIVE_DRIFT', key));
  if (sys.hp?.max !== original?.durability?.hitPoints ||
      sys.reflexDefense !== original?.defenses?.reflex ||
      sys.fortitudeDefense !== original?.defenses?.fortitude)
    errors.push(issue('CORE_STATS_DRIFT', key));
  if (Array.isArray(raw.items) ? raw.items.length > 0 : Number(document?.items?.size ?? 0) > 0)
    errors.push(issue('EMBEDDED_ITEMS_NOT_SOURCE_CERTIFIED', key));
  if (!Array.isArray(sys.weapons) || sys.weapons.length > 0 || mounted !== undefined ||
      groups.some(g => !Array.isArray(g.mountKeys) || g.mountKeys.length !== 0))
    errors.push(issue('EXECUTABLE_STOCK_ATTACK_RISK', key));
  if (isNumber(printedSR)) {
    if (sys.shieldRating !== printedSR || sys.shields?.max !== printedSR ||
        sys.vehiclePublishedShieldStatus !== 'published') errors.push(issue('PUBLISHED_SR_DRIFT', key));
  } else if (sys.vehiclePublishedShieldStatus !== 'unknown' ||
        (sys.shieldRating !== undefined && sys.shieldRating !== 0) ||
        (sys.shields !== undefined &&
          (sys.shields?.max !== 0 || sys.shields?.value !== 0))) {
    errors.push(issue('UNKNOWN_SR_COERCED', key));
  }
  return {
    sourceKey:key, documentId:idOf(raw), packName,
    publishedInitiative:original?.abilities?.initiativePrinted ?? null,
    currentInitiative:sys.initiative ?? null,
    sourceSR:isNumber(printedSR)?printedSR:null,
    shieldStatus:isNumber(printedSR)?'published':'unknown',
    certified:errors.length === 0,
    errors
  };
}

function requireGM(context) {
  if (!context?.user?.isGM) throw new Error('VEHICLE_PHASE4D_GM_ONLY');
  if (context?.system?.id !== 'foundryvtt-swse') throw new Error('VEHICLE_PHASE4D_WRONG_SYSTEM');
}

/**
 * Audit every native pack index and (optionally) every hydrated Document.
 * This is a *runtime* check, not another Phase 0-3 sourcebook audit.
 * A pass with inspectAllDocuments=false verifies only the index, so is not certified.
 */
export async function auditUniversalVehicleRuntime({
  context = globalThis.game,
  inspectAllDocuments = true,
  strict = false
} = {}) {
  requireGM(context);
  const generation=context.release?.generation ?? null;
  const failures=[], categories=[], seenKeys=new Set(), seenIds=new Set();
  let indexed=0,hydrated=0,verified=0;
  const add=(code,detail)=>{if(failures.length<MAX_ISSUES)failures.push(issue(code,detail));};
  if(generation !== VEHICLE_4D_REQUIRED_GENERATION)
    add('WRONG_FOUNDRY_GENERATION',String(generation));
  for(const spec of UNIVERSAL_VEHICLE_PACKS){
    const pack=context.packs?.get('foundryvtt-swse.'+spec.name);
    if (!pack) { add('PACK_MISSING',spec.name); categories.push({pack:spec.name,status:'missing',count:0}); continue; }
    if (pack.documentName !== 'Actor') { add('PACK_NOT_ACTOR',spec.name); categories.push({pack:spec.name,status:'wrong-type',count:0}); continue; }
    let index;
    try {
      index=await pack.getIndex({fields:[
        'name','system.vehicleSourceEntryKey','system.vehiclePackName',
        'system.vehicleSourcePrimaryCategory','system.vehicleSourceBook',
        'system.vehicleSourcePage','system.vehiclePublishedShieldStatus'
      ]});
    } catch (e) { add('PACK_INDEX_FAILURE',spec.name+': '+e.message); categories.push({pack:spec.name,status:'index-error',count:0}); continue; }
    const entries=Array.from(index ?? []);
    categories.push({pack:spec.name,status:'indexed',count:entries.length});
    indexed+=entries.length;
    for(const entry of entries){
      const id=idOf(entry),key=entry?.system?.vehicleSourceEntryKey;
      if (!key || seenKeys.has(key)) add('DUPLICATE_OR_MISSING_SOURCE_KEY',spec.name+': '+key);
      else seenKeys.add(key);
      if (!id || seenIds.has(id)) add('DUPLICATE_OR_MISSING_ACTOR_ID',spec.name+': '+id);
      else seenIds.add(id);
      if(entry?.system?.vehiclePackName !== spec.name ||
         !spec.categories.includes(entry?.system?.vehicleSourcePrimaryCategory))
        add('INDEX_CATEGORY_DRIFT',spec.name+': '+key);
      if (!inspectAllDocuments) continue;
      let doc;
      try { doc=await pack.getDocument(id); }
      catch (e) { add('ACTOR_READ_FAILURE',spec.name+': '+key+': '+e.message); continue; }
      if (!doc) { add('ACTOR_READ_EMPTY',spec.name+': '+key); continue; }
      hydrated++;
      const result=auditUniversalVehicleActor(doc,{packName:spec.name,sourceKey:key});
      if(result.certified)verified++;
      else for (const error of result.errors) add(error.code,spec.name+': '+key+': '+error.detail);
      // Effective typed model may silently erase or synthesize published data.
      if(doc.system?.initiative !== result.publishedInitiative)
        add('TYPED_MODEL_INITIATIVE_DRIFT',spec.name+': '+key);
      if(result.shieldStatus==='unknown' &&
         (doc.system?.shieldRating > 0 || doc.system?.shields?.max > 0))
        add('TYPED_MODEL_UNKNOWN_SR_DRIFT',spec.name+': '+key);
    }
  }
  if(indexed !== VEHICLE_4D_EXPECTED_COUNT) add('CATALOG_TOTAL_MISMATCH',indexed+'/'+VEHICLE_4D_EXPECTED_COUNT);
  if(seenKeys.size !== VEHICLE_4D_EXPECTED_COUNT) add('CATALOG_IDENTITY_MISMATCH',seenKeys.size);
  if(inspectAllDocuments && hydrated !== VEHICLE_4D_EXPECTED_COUNT)
    add('HYDRATION_TOTAL_MISMATCH',hydrated+'/'+VEHICLE_4D_EXPECTED_COUNT);
  const complete=failures.length===0 && inspectAllDocuments &&
    categories.length===UNIVERSAL_VEHICLE_PACKS.length &&
    indexed===VEHICLE_4D_EXPECTED_COUNT && verified===VEHICLE_4D_EXPECTED_COUNT;
  const report={
    phase:'4D',
    status:complete?'RUNTIME_DATA_VERIFIED':failures.length?'BLOCKED':'INCOMPLETE_INDEX_ONLY',
    exactReleaseCertified:false, // real sheet rendering + ActorEngine mutation remain separate
    foundryGeneration:generation, counts:{
      packs:categories.length,expectedPacks:UNIVERSAL_VEHICLE_PACKS.length,
      indexed,hydrated,verified,expected:VEHICLE_4D_EXPECTED_COUNT,
      uniqueSourceKeys:seenKeys.size,uniqueActorIds:seenIds.size
    }, categories, failures, truncatedFailures:failures.length===MAX_ISSUES,
    worldActorsCreated:0, worldActorsModified:0,
    next:'Run the V2 sheet smoke, ActorEngine scratch-world write/readback and gameplay acceptance separately.'
  };
  if(strict && !complete)throw new Error('VEHICLE_PHASE4D_RUNTIME_GATE_FAILED: '+JSON.stringify(report));
  return report;
}

/** Explicit UI smoke: opens one *compendium* sheet, never creates a world Actor. */
export async function openUniversalVehicleSampleSheet(sourceKey, { context = globalThis.game } = {}) {
  requireGM(context);
  if(typeof sourceKey!=='string'||!sourceKey.trim())
    throw new Error('VEHICLE_PHASE4D_SOURCE_KEY_REQUIRED');
  const {VehiclePackDataLoader}=await import('/systems/foundryvtt-swse/scripts/core/vehicle-pack-data-loader.js');
  const entries=await VehiclePackDataLoader.loadVehicleIndex();
  const entry=entries.find(x=>x.sourceEntryKey===sourceKey);
  if(!entry)throw new Error('VEHICLE_PHASE4D_SOURCE_NOT_IN_CATALOG: '+sourceKey);
  const doc=await VehiclePackDataLoader.loadVehicleDocument(entry);
  const verification=auditUniversalVehicleActor(doc,{packName:entry.packName,sourceKey});
  if(!verification.certified)throw new Error('VEHICLE_PHASE4D_SOURCE_UNVERIFIED: '+JSON.stringify(verification.errors));
  const sheet=doc.sheet;
  if(!sheet || typeof sheet.render!=='function')
    throw new Error('VEHICLE_PHASE4D_SHEET_MISSING: '+sourceKey);
  if(sheet.constructor?.name!=='SWSEV2VehicleSheet')
    throw new Error('VEHICLE_PHASE4D_WRONG_SHEET: '+(sheet.constructor?.name??'unknown'));
  // Render is explicitly opt-in and intentionally left open for visual QA.
  await sheet.render({force:true});
  if(sheet.rendered!==true)
    throw new Error('VEHICLE_PHASE4D_SHEET_NOT_RENDERED: '+sourceKey);
  return {
    sourceKey, pack:entry.packName, actorId:idOf(doc),
    sheetClass:sheet.constructor?.name??'unknown',
    rendered:true, worldActorCreated:false,
    instructions:'Visually inspect source badge, movement, SR, and disabled attacks. Close the compendium sheet normally.'
  };
}
