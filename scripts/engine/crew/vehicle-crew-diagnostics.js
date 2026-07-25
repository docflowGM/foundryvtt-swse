// scripts/engine/crew/vehicle-crew-diagnostics.js
//
// Phase 7: GM-only, read-only vehicle crew diagnostics snapshot.
// SWSE.debug.vehicleCrew.inspect(vehicleUuid) — never mutates anything;
// returns a plain, serializable object suitable for console.log/JSON.

import { VehicleCrewAssignmentService } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-assignment-service.js";
import { VehicleWeaponStationService } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-weapon-station-service.js";
import { getDiagnosticsLogEntry } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-diagnostics-log.js";

const VEHICLE_WEAPON_ITEM_TYPES = new Set(['weapon', 'vehicle-weapon', 'vehicleWeapon', 'vehicleWeaponRange']);

function actorRefFromCrewEntry(entry) {
  if (!entry) return { uuid: null, id: null, name: null };
  if (typeof entry === 'string') return { uuid: entry.startsWith('Actor.') ? entry : null, id: null, name: entry };
  return { uuid: entry.uuid ?? null, id: entry.id ?? entry.actorId ?? null, name: entry.name ?? null };
}

async function resolveActorRef(ref) {
  try {
    if (ref.uuid) return await fromUuid(ref.uuid);
    if (ref.id) return game.actors?.get?.(ref.id) ?? null;
  } catch (_err) { /* ignored — resolution failure is itself the diagnostic */ }
  return null;
}

function listWeaponMounts(vehicle) {
  const mounts = [];
  for (const item of Array.from(vehicle.items ?? [])) {
    if (!VEHICLE_WEAPON_ITEM_TYPES.has(item?.type)) continue;
    const vehicleMount = item.system?.vehicleMount ?? {};
    mounts.push({
      weaponId: item.id,
      name: item.name,
      crewRole: vehicleMount.crewRole || 'gunner',
      explicitOperatorStation: vehicleMount.operatorStation || null
    });
  }
  const systemWeapons = Array.isArray(vehicle.system?.weapons) ? vehicle.system.weapons : [];
  systemWeapons.forEach((weapon, index) => {
    if (!weapon?.name) return;
    mounts.push({
      weaponId: `system-weapons-${index}`,
      name: weapon.name,
      crewRole: weapon.crewRole || 'gunner',
      explicitOperatorStation: weapon.operatorStation || null
    });
  });
  return mounts;
}

/**
 * Build a complete, serializable, non-mutating diagnostics snapshot for one
 * vehicle's crew/station/weapon-mapping state. GM-only.
 *
 * @param {string} vehicleUuid
 * @returns {Promise<Object|null>}
 */
export async function inspectVehicleCrew(vehicleUuid) {
  if (!game.user?.isGM) {
    ui?.notifications?.warn?.('Vehicle crew diagnostics are GM-only.');
    return null;
  }

  const vehicle = await fromUuid(vehicleUuid);
  if (!vehicle || vehicle.type !== 'vehicle') {
    console.warn(`SWSE | inspectVehicleCrew: "${vehicleUuid}" is not a vehicle actor.`);
    return null;
  }

  const resolved = VehicleCrewAssignmentService.resolveStations(vehicle);
  const brokenReferences = [];
  const stations = [];
  for (const station of resolved.stations) {
    let resolvable = null;
    if (station.assigned) {
      const ref = actorRefFromCrewEntry(station.crew);
      const actor = await resolveActorRef(ref);
      resolvable = Boolean(actor);
      if (!resolvable) brokenReferences.push({ stationKey: station.storageKey, reference: ref.uuid || ref.id || ref.name || null });
    }
    stations.push({
      key: station.key,
      storageKey: station.storageKey,
      role: station.role,
      label: station.label,
      custom: station.custom,
      assigned: station.assigned,
      occupantUuid: station.crew?.uuid ?? null,
      occupantName: station.crew?.name ?? null,
      resolvable
    });
  }

  const weaponMappings = listWeaponMounts(vehicle).map((mount) => ({
    ...mount,
    ...VehicleWeaponStationService.resolveOperatorStation(vehicle, mount)
  }));

  const diagnostics = getDiagnosticsLogEntry(vehicle.id);

  return {
    vehicleUuid: vehicle.uuid,
    vehicleName: vehicle.name,
    isToken: Boolean(vehicle.isToken),
    tokenUuid: vehicle.token?.uuid ?? null,
    editable: vehicle.isOwner === true,
    stations,
    crewPositions: foundry.utils.deepClone(vehicle.system?.crewPositions ?? {}),
    compatibilityMirrors: {
      ownedActors: foundry.utils.deepClone(vehicle.system?.ownedActors ?? []),
      relationships: foundry.utils.deepClone(vehicle.system?.relationships ?? [])
    },
    customStations: foundry.utils.deepClone(vehicle.system?.stations ?? []),
    brokenReferences,
    weaponMappings,
    lastAssignmentEvent: diagnostics.lastAssignmentEvent ?? null,
    lastMutationReceipt: diagnostics.lastMutationReceipt ?? null,
    lastFireResult: diagnostics.lastFireResult ?? null
  };
}

globalThis.SWSE ??= {};
globalThis.SWSE.debug ??= {};
globalThis.SWSE.debug.vehicleCrew = {
  inspect: inspectVehicleCrew
};
