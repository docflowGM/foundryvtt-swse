import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { assertCP23C4CNoStagedSourceImport } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-cp23c4c-import-boundary.js";

const duplicate = value => foundry.utils.deepClone(value ?? {});

function hasCrewAssignments(system={}) {
  return Object.values(system.crewPositions??{}).some(entry=>!!(entry && (
    typeof entry==='string' ? entry.trim() : entry.uuid||entry.id||entry.actorId||entry.name
  )));
}
function hasShipyardData(system={}) {
  return Boolean(system.shipyard||system.customization||system.vehicleModifications||
    system.installedSystems||system.hangar?.length||system.carriedCraft?.length);
}

/** One canonical source-aware vehicle import authority. No legacy normalization. */
export class VehicleImportEngine {
  static requiresReplaceConfirmation(targetActor){
    if(!targetActor)return false;
    const hasItems=Number(targetActor.items?.size??0)>0;
    return hasItems||hasCrewAssignments(targetActor.system??{})||hasShipyardData(targetActor.system??{});
  }

  static buildImportPlan(targetActor,sourceActor,options={}){
    if(!targetActor||!sourceActor)return null;
    if(targetActor.type!=='vehicle')throw new Error('UNIVERSAL_VEHICLE_TARGET_TYPE_REQUIRED');
    // Existing embedded weapon Items must not survive a statblock replacement.
    // There is no player-world migration in this clean-break cutover.
    if(Number(targetActor.items?.size??0)>0)
      throw new Error('UNIVERSAL_VEHICLE_REQUIRES_EMPTY_TARGET_ITEMS');
    // Historical CP23 reserved drafts are still forbidden before every other
    // check. Their old numeric Initiative/default-synthesis audit remains valid.
    assertCP23C4CNoStagedSourceImport(sourceActor);
    if(options.mode && options.mode!=='replace')
      throw new Error('UNIVERSAL_VEHICLE_SOURCE_REPLACE_ONLY');

    const universal=sourceActor.flags?.swse?.universalVehicleSource;
    if(!universal)throw new Error('UNIVERSAL_VEHICLE_SOURCE_REQUIRED');
    const printed=universal.source;
    const evidence=sourceActor.flags?.swse?.canonicalPublication;
    const system=sourceActor.system;
    const key=printed?.identity?.sourceEntryKey;
    const id=sourceActor.id??sourceActor._id;
    const shield=printed?.defenses?.shieldRating;
    const valid=sourceActor.type==='vehicle' &&
      universal.schema==='swse.vehicle.universal.actor-source.v1' &&
      printed?.recordType==='vehicle-source-entry' &&
      typeof key==='string'&&key.length>0 &&
      /^[0-9a-f]{16}$/.test(id??'') &&
      evidence?.sourceEntryKey===key &&
      evidence?.sourceBook===printed?.publication?.book &&
      evidence?.printedPage===printed?.publication?.page &&
      evidence?.sourceCertification==='SOURCE_ONLY' &&
      evidence?.foundryStockAttackTrusted===false &&
      evidence?.physicalMountCertification===false &&
      system?.vehicleSourceEntryKey===key &&
      system?.vehicleSourceBook===printed?.publication?.book &&
      system?.vehicleSourcePage===printed?.publication?.page &&
      system?.initiative===printed?.abilities?.initiativePrinted &&
      system?.hp?.max===printed?.durability?.hitPoints &&
      system?.reflexDefense===printed?.defenses?.reflex &&
      system?.fortitudeDefense===printed?.defenses?.fortitude &&
      Array.isArray(system?.weapons)&&system.weapons.length===0 &&
      !Object.hasOwn(printed?.armament??{},'weaponMounts') &&
      (printed?.armament?.firingGroups??[]).every(group=>
        Array.isArray(group.mountKeys)&&group.mountKeys.length===0) &&
      (typeof shield==='number'
        ?system?.vehiclePublishedShieldStatus==='published' &&
          system?.shieldRating===shield&&system?.shields?.max===shield
        :system?.vehiclePublishedShieldStatus==='unknown' &&
          (!Object.hasOwn(system??{},'shields') ||
           (system?.shields?.max===0&&system?.shields?.value===0)) &&
          (!Object.hasOwn(system??{},'shieldRating')||system?.shieldRating===0));
    if(!valid)throw new Error('UNIVERSAL_VEHICLE_SOURCE_INVALID_OR_UNTRUSTED');

    // No merge and no preservation of obsolete equipment/fields: no players
    // or old-world vehicle data exist to migrate.
    return {
      name:sourceActor.name,
      img:sourceActor.img,
      system:duplicate(system),
      'flags.swse.canonicalPublication':duplicate(evidence),
      'flags.swse.universalVehicleSource':duplicate(universal)
    };
  }

  static async apply(targetActor,sourceActor,options={}){
    const update=this.buildImportPlan(targetActor,sourceActor,options);
    if(!update)throw new Error('Vehicle import could not build an update plan.');
    await ActorEngine.updateActor(targetActor,update,{source:'vehicle-import-wizard'});
    return {actor:targetActor,update};
  }
}
