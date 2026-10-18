import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { normalizeVehicleImportData } from "/systems/foundryvtt-swse/scripts/engine/import/vehicle-import-normalizer.js";

function duplicate(value) {
  return foundry.utils.deepClone(value ?? {});
}

function hasCrewAssignments(system = {}) {
  const positions = system.crewPositions ?? {};
  return Object.values(positions).some((entry) => {
    if (!entry) return false;
    if (typeof entry === 'string') return !!entry.trim();
    return Boolean(entry.uuid || entry.id || entry.actorId || entry.name);
  });
}

function hasShipyardData(system = {}) {
  return Boolean(
    system.shipyard ||
    system.customization ||
    system.vehicleModifications ||
    system.installedSystems ||
    system.hangar?.length ||
    system.carriedCraft?.length
  );
}

export class VehicleImportEngine {
  static requiresReplaceConfirmation(targetActor) {
    if (!targetActor) return false;
    const hasItems = Number(targetActor.items?.size ?? 0) > 0;
    const system = targetActor.system ?? {};
    return hasItems || hasCrewAssignments(system) || hasShipyardData(system);
  }

  static buildImportPlan(targetActor, sourceActor, options = {}) {
    if (!targetActor || !sourceActor) return null;
    const mode = options.mode || 'replace';
    const preserve = options.preserve || {};
    const rawSystem = duplicate(sourceActor.system);
    const normalized = normalizeVehicleImportData(rawSystem, { sourceName: sourceActor.name }) ?? {};
    // The normalizer produces a runtime-shape projection, NOT a complete
    // published stock record. Replacing with it alone discards source-backed
    // attributes, size-specific facts and CP8 certification metadata.
    // Preserve every known source field, including meaningful zero, explicit
    // None and genuinely unknown nulls; overlay only runtime projections.
    const normalizedSystem = { ...rawSystem, ...normalized };
    if (!normalizedSystem.model) normalizedSystem.model = sourceActor.name || rawSystem.model || rawSystem.vehicleModel || '';
    const update = {};

    if (!preserve.name) update.name = sourceActor.name;
    if (!preserve.image) update.img = sourceActor.img;

    if (mode === 'replace') {
      update.system = normalizedSystem;
    } else {
      for (const [key, value] of Object.entries(normalizedSystem)) {
        update[`system.${key}`] = value;
      }
    }

    return update;
  }

  static async apply(targetActor, sourceActor, options = {}) {
    const update = this.buildImportPlan(targetActor, sourceActor, options);
    if (!update) throw new Error('Vehicle import could not build an update plan.');
    await ActorEngine.updateActor(targetActor, update, { source: 'vehicle-import-wizard' });
    return { actor: targetActor, update };
  }
}
