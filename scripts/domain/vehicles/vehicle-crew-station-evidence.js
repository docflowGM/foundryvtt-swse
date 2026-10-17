/**
 * Combat-side station evidence. Uses the EXISTING crew assignment authority
 * (also used by the sheet), rather than trusting rollOptions.crewStation
 * or hardcoding false. This does not grant canonical stock weapon authority.
 */
import { resolveVehicleCrewActor } from '../../engine/crew/vehicle-crew-actor-authority.js';

const fail = reason => ({crewStationResolved:false,reason});
const same = (a,b) => typeof a==='string' && typeof b==='string' &&
  a.trim().toLowerCase()===b.trim().toLowerCase();
const VALID_STATIONS = new Set(['pilot','gunner']);

export async function resolveVehicleCrewStationEvidence({
  vehicle, weapon, domainResolution, requestedCrewStation = null
} = {}) {
  if(!vehicle || vehicle.type!=='vehicle' || !weapon || !domainResolution?.ok)
    return fail('VEHICLE_CREW_CONTEXT_MISSING');
  const virtual=/^system-weapons-(\d+)$/.exec(weapon.id ?? '');
  let station = null;
  if(virtual){
    const row=vehicle.system?.weapons?.[Number(virtual[1])];
    if(!row || !same(row.name,weapon.name))return fail('INSTALLED_WEAPON_ROW_MISMATCH');
    station=String(row.operatorStation ?? row.crewRole ?? '').trim().toLowerCase();
  }else{
    const owned=vehicle.items?.get?.(weapon.id) ?? Array.from(vehicle.items ?? []).find(x=>x?.id===weapon.id);
    if(owned!==weapon)return fail('WEAPON_NOT_OWNED_BY_VEHICLE');
    station=String(weapon.system?.operatorStation ?? weapon.system?.crewRole ?? '').trim().toLowerCase();
  }
  if(!VALID_STATIONS.has(station))return fail('WEAPON_OPERATOR_STATION_UNRESOLVED');
  if(requestedCrewStation && !same(requestedCrewStation,station))
    return fail('REQUESTED_CREW_STATION_CONTRADICTS_INSTALLED_MOUNT');
  const assignment=await resolveVehicleCrewActor(vehicle,station);
  if(assignment.source==='invalid')return fail('ASSIGNED_CREW_ACTOR_INVALID');
  if(assignment.source==='actor'){
    const gunner=domainResolution.normalizedContext?.gunnerActor;
    if(domainResolution.domain!=='vehicle-actor-gunner' || !gunner || gunner!==assignment.actor)
      return fail('GUNNER_NOT_ASSIGNED_TO_WEAPON_STATION');
    return {crewStationResolved:true,stationKey:station,operatorActorId:gunner.id??null,assignmentKind:'named'};
  }
  if(assignment.source==='unassigned' && domainResolution.domain==='vehicle-abstract-crew')
    return {crewStationResolved:true,stationKey:station,operatorActorId:null,assignmentKind:'abstract-crew'};
  return fail('CREW_STATION_DOMAIN_MISMATCH');
}
