/**
 * Vehicle crew assignment authority shared by the crew sheet and combat
 * preflight. Preserve actor / unassigned / invalid distinctions.
 * Crew assignments do not themselves certify a stock weapon group.
 */
function resolveActorId(id) {
  if (!id) return null;
  return globalThis.game?.actors?.get?.(id) ?? null;
}
async function resolveActorUuid(uuid) {
  if (!uuid) return null;
  try {
    if (typeof globalThis.fromUuid !== 'function') return null;
    return await globalThis.fromUuid(uuid);
  } catch (err) {
    console.warn('SWSE | Could not resolve vehicle crew UUID', uuid, err);
    return null;
  }
}
export function getVehicleCrewEntry(vehicle, stationKey) {
  const system=vehicle?.system ?? {};
  const entry=system.crewPositions?.[stationKey];
  if (entry) return entry;
  const owned=Array.isArray(system.ownedActors)?system.ownedActors:[];
  return owned.find(x=>x?.position===stationKey || x?.role===stationKey) ?? null;
}
/**
 * @returns {Promise<{actor:object|null,entry:object|string|null,label:string,source:'actor'|'unassigned'|'invalid'}>}
 */
export async function resolveVehicleCrewActor(vehicle, stationKey) {
  const entry=getVehicleCrewEntry(vehicle,stationKey);
  if(!entry) return {actor:null,entry:null,label:'Crew Quality',source:'unassigned'};
  if(typeof entry==='string'){
    const actor=await resolveActorUuid(entry) || resolveActorId(entry);
    return {actor,entry,label:actor?.name || entry,source:actor?'actor':'invalid'};
  }
  const actor=await resolveActorUuid(entry.uuid) || resolveActorId(entry.id) || resolveActorId(entry.actorId);
  return {actor,entry,label:actor?.name || entry.name || entry.label || 'Crew Quality',source:actor?'actor':'invalid'};
}
