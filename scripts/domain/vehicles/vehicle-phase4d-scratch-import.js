/**
 * Explicit Phase 4D test-world-only scratch Actor import.
 * This is NOT a migration. It creates exactly one GM-owned throwaway Actor,
 * routes source replacement through VehicleImportEngine/ActorEngine, validates
 * persisted fields, and deletes the Actor in finally.
 *
 * Call ONLY in a disposable Foundry V13 test world:
 * await SWSE.debug.vehicles.scratchImport({ sourceKey: 'core-vulture-class-droid-starfighter', allowWrite: true })
 *
 * A failed deletion returns MANUAL_CLEANUP_REQUIRED with the actor id.
 * Never creates embedded Item mounts or triggers attacks.
 */
import { auditUniversalVehicleActor } from './vehicle-phase4d-runtime-audit.js';

export function assessUniversalVehicleWorldImport(world, source) {
  const original=source?.flags?.swse?.universalVehicleSource?.source;
  const stored=world?.flags?.swse?.universalVehicleSource?.source;
  const system=world?.system??{};
  const failures=[];
  if(!original?.identity?.sourceEntryKey)failures.push('SOURCE_MISSING');
  else if(stored?.identity?.sourceEntryKey!==original.identity.sourceEntryKey ||
      world?.flags?.swse?.canonicalPublication?.sourceEntryKey!==original.identity.sourceEntryKey)
    failures.push('SOURCE_IDENTITY_LOST');
  if(system.initiative!==original?.abilities?.initiativePrinted)failures.push('NUMERIC_INITIATIVE_LOST');
  if(system.hp?.max!==original?.durability?.hitPoints)failures.push('HULL_LOST');
  if(system.reflexDefense!==original?.defenses?.reflex ||
     system.fortitudeDefense!==original?.defenses?.fortitude)failures.push('DEFENSES_LOST');
  const rated=original?.defenses?.shieldRating;
  if(typeof rated==='number') {
    if(system.shieldRating!==rated||system.shields?.max!==rated)failures.push('PUBLISHED_SR_LOST');
  } else if(system.vehiclePublishedShieldStatus!=='unknown' ||
     (typeof system.shieldRating==='number'&&system.shieldRating>0)||
     (typeof system.shields?.max==='number'&&system.shields.max>0))
    failures.push('UNKNOWN_SR_FABRICATED');
  if(!Array.isArray(system.weapons)||system.weapons.length!==0 ||
     Number(world?.items?.size ?? world?.items?.length ?? 0)!==0)
    failures.push('UNAUTHORIZED_INSTALLED_WEAPONS');
  if(world?.flags?.swse?.canonicalPublication?.foundryStockAttackTrusted!==false)
    failures.push('STOCK_ATTACK_TRUST_PROMOTED');
  return {valid:failures.length===0,failures,sourceKey:original?.identity?.sourceEntryKey??null};
}

export async function runUniversalVehicleScratchImport({
  sourceKey='core-vulture-class-droid-starfighter',
  allowWrite=false,
  context=globalThis.game,
  actors=globalThis.Actor,
  sourceDocument=null,
  importEngine=null
}={}){
  if(!context?.user?.isGM)throw new Error('VEHICLE_PHASE4D_GM_ONLY');
  if(context.system?.id!=='foundryvtt-swse'||context.release?.generation!==13)
    throw new Error('VEHICLE_PHASE4D_REQUIRES_SWSE_V13');
  if(allowWrite!==true)throw new Error('VEHICLE_PHASE4D_EXPLICIT_WRITE_OPT_IN_REQUIRED');
  if(typeof actors?.create!=='function')throw new Error('VEHICLE_PHASE4D_ACTOR_CREATION_UNAVAILABLE');

  let created=null;
  let errors=[];
  let cleaned=false;
  let result=null;
  let cleanupError=null;
  let actorId=null;

  try{
    const document=sourceDocument??await (async()=>{
      const {VehiclePackDataLoader}=await import('/systems/foundryvtt-swse/scripts/core/vehicle-pack-data-loader.js');
      const all=await VehiclePackDataLoader.loadVehicleIndex();
      const row=all.find(x=>x.sourceEntryKey===sourceKey);
      if(!row)throw new Error('VEHICLE_PHASE4D_SOURCE_NOT_FOUND: '+sourceKey);
      return VehiclePackDataLoader.loadVehicleDocument(row);
    })();
    const packName=document?.system?.vehiclePackName;
    const certified=auditUniversalVehicleActor(document,{packName,sourceKey});
    if(!certified.certified)throw new Error('VEHICLE_PHASE4D_UNVERIFIED_SOURCE: '+JSON.stringify(certified.errors));
    created=await actors.create({
      name:'[SWSE PHASE4D SCRATCH] '+sourceKey,
      type:'vehicle',system:{},
      flags:{swse:{vehiclePhase4dScratch:{sourceKey}}}
    });
    if(!created?.id)throw new Error('VEHICLE_PHASE4D_SCRATCH_CREATION_FAILED');
    actorId=created.id;

    const importer=importEngine??(await import('/systems/foundryvtt-swse/scripts/engine/import/vehicle-import-engine.js')).VehicleImportEngine;
    await importer.apply(created,document,{mode:'replace'});
    const persisted=context.actors?.get(actorId)??created;
    result=assessUniversalVehicleWorldImport(persisted,document);
    if(!result.valid)errors.push(...result.failures);
  }catch(e){errors.push('SCRATCH_IMPORT_ERROR: '+String(e?.message??e));}
  finally{
    if(created?.id){
      try{
        await created.delete();
        cleaned=true;
      }catch(e){
        cleanupError=String(e?.message??e);
        errors.push('SCRATCH_CLEANUP_FAILED: '+cleanupError);
      }
    }
  }
  return {
    phase:'4D',
    status:errors.length===0&&cleaned?'ACTOR_ENGINE_SCRATCH_PASSED':
      !cleaned&&actorId?'MANUAL_CLEANUP_REQUIRED':'BLOCKED',
    sourceKey, actorId,created:Boolean(actorId),deleted:cleaned,
    errors,assessment:result,
    cleanupError,
    runtimeCertified:false, // one controlled import is not all 429 readback or sheet QA
    reminder:!cleaned&&actorId?'Delete the scratch Actor manually from the test world.':'No scratch Actor remains.'
  };
}
