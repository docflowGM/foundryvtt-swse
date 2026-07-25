// scripts/engine/crew/vehicle-weapon-station-service.js
//
// Phase 7: mutation authority for a vehicle weapon mount's explicit operator
// station mapping (system.vehicleMount.operatorStation for item-based
// weapons, system.weapons[i].operatorStation for statblock-derived ones).
// ActorEngine is the sole mutation path — no direct actor.update()/item
// update outside it.

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { VehicleCrewAssignmentService } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-assignment-service.js";
import { resolveWeaponOperatorStation } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/weapon-station-mapping.js";
import { recordMutationReceipt } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-diagnostics-log.js";

function structuredResult({ ok, stationKey = null, mutationReceipt = null, error = null }) {
  return { ok, stationKey, mutationReceipt, error };
}

export class VehicleWeaponStationService {
  static canEdit(vehicle) {
    return vehicle?.isOwner === true;
  }

  /**
   * @param {Actor} vehicle
   * @param {Object} mount - a normalized weapon-mount entry (see
   *   vehicle-context-builder.js#normalizeVehicleWeaponEntry): needs
   *   .crewRole, .source ('item'|'system'), .id (item id, item mounts) or
   *   .index (statblock index, system mounts), and .operatorStationKey if
   *   already resolved by the caller's own explicit-key read.
   * @returns {{stationKey: string|null, source: string, reason?: string, candidates?: string[]}}
   */
  static resolveOperatorStation(vehicle, mount) {
    const stations = VehicleCrewAssignmentService.resolveStations(vehicle).stations;
    return resolveWeaponOperatorStation({
      stations,
      role: mount?.crewRole || 'gunner',
      explicitStationKey: mount?.explicitOperatorStation || null
    });
  }

  /**
   * Persist an explicit operator-station mapping for one weapon mount.
   * Passing stationKey === null clears the explicit mapping (falls back to
   * role-based resolution again).
   */
  static async setOperatorStation(vehicle, mount, stationKey) {
    if (!this.canEdit(vehicle)) {
      const error = `You do not have permission to modify ${vehicle?.name || 'this vehicle'}'s weapon mounts.`;
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    if (stationKey) {
      const stations = VehicleCrewAssignmentService.resolveStations(vehicle).stations;
      const match = stations.find((station) => station.storageKey === stationKey);
      if (!match) {
        const error = `"${stationKey}" is not a valid crew station on ${vehicle?.name || 'this vehicle'}.`;
        ui?.notifications?.error?.(error);
        return structuredResult({ ok: false, error });
      }
    }

    try {
      let mutationReceipt;
      if (mount?.source === 'item' && mount?.id) {
        mutationReceipt = await ActorEngine.updateOwnedItems(vehicle, [
          { _id: mount.id, 'system.vehicleMount.operatorStation': stationKey || null }
        ]);
      } else if (mount?.source === 'system' && Number.isInteger(mount?.index)) {
        mutationReceipt = await ActorEngine.updateActor(vehicle, {
          [`system.weapons.${mount.index}.operatorStation`]: stationKey || null
        }, { source: 'vehicle-weapon-station-mapping' });
      } else {
        const error = 'Could not identify this weapon mount for a station-mapping update.';
        ui?.notifications?.error?.(error);
        return structuredResult({ ok: false, error });
      }
      ui?.notifications?.info?.(stationKey
        ? `${mount?.name || 'Weapon'} operator station set to ${VehicleCrewAssignmentService.labelForStation(vehicle, stationKey)}.`
        : `${mount?.name || 'Weapon'} operator station mapping cleared.`);
      recordMutationReceipt(vehicle?.id, { ok: true, source: 'vehicle-weapon-station-mapping' });
      return structuredResult({ ok: true, stationKey, mutationReceipt });
    } catch (err) {
      const error = err?.message || 'Failed to update weapon operator station.';
      ui?.notifications?.error?.(`Failed to update weapon operator station: ${error}`);
      recordMutationReceipt(vehicle?.id, { ok: false, error, source: 'vehicle-weapon-station-mapping' });
      return structuredResult({ ok: false, error });
    }
  }
}
