import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { normalizeVehicleImportData } from "/systems/foundryvtt-swse/scripts/engine/import/vehicle-import-normalizer.js";
import { assertCP23C4CNoStagedSourceImport } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-cp23c4c-import-boundary.js";

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
    // CP23-C4C: forbid staged canonical SotG source documents before the
    // legacy normalizer fabricates defaults or strips approved Initiative.
    // ActorEngine is never entered for a forbidden source.
    assertCP23C4CNoStagedSourceImport(sourceActor);
    const mode = options.mode || 'replace';
    const preserve = options.preserve || {};
    // Phase 4B source Actors are generated from the single 429-claim SSOT.
    // They bypass legacy normalization (numeric Initiative and source silence
    // are otherwise corrupted). This is shape validation, NOT an authenticated
    // installation receipt or stock weapon approval.
    const universal = sourceActor.flags?.swse?.universalVehicleSource;
    if (universal !== undefined) {
      const printed = universal?.source;
      const evidence = sourceActor.flags?.swse?.canonicalPublication;
      const system = sourceActor.system;
      const sourceKey = printed?.identity?.sourceEntryKey;
      const id = sourceActor.id ?? sourceActor._id;
      const shield = printed?.defenses?.shieldRating;
      const valid = universal?.schema === 'swse.vehicle.universal.actor-source.v1' &&
        printed?.recordType === 'vehicle-source-entry' &&
        typeof sourceKey === 'string' && sourceKey.length > 0 &&
        /^([0-9a-f]{16})$/.test(id ?? '') &&
        evidence?.sourceEntryKey === sourceKey &&
        evidence?.sourceCertification === 'SOURCE_ONLY' &&
        evidence?.foundryStockAttackTrusted === false &&
        evidence?.physicalMountCertification === false &&
        system?.vehicleSourceEntryKey === sourceKey &&
        system?.initiative === printed?.abilities?.initiativePrinted &&
        system?.hp?.max === printed?.durability?.hitPoints &&
        system?.reflexDefense === printed?.defenses?.reflex &&
        system?.fortitudeDefense === printed?.defenses?.fortitude &&
        Array.isArray(system?.weapons) && system.weapons.length === 0 &&
        !Object.hasOwn(printed?.armament ?? {}, 'weaponMounts') &&
        (printed?.armament?.firingGroups ?? []).every(g => Array.isArray(g.mountKeys) && g.mountKeys.length === 0) &&
        (typeof shield === 'number'
          ? system?.shieldRating === shield && system?.shields?.max === shield
          : !Object.hasOwn(system ?? {}, 'shields') && !Object.hasOwn(system ?? {}, 'shieldRating'));
      if (!valid) throw new Error('UNIVERSAL_VEHICLE_SOURCE_INVALID_OR_UNTRUSTED');
      // No backward-compatibility migration or partial merge for new sources:
      // a deterministic replacement is the only permitted path.
      if (mode !== 'replace') throw new Error('UNIVERSAL_VEHICLE_SOURCE_REPLACE_ONLY');
      const update = {
        name: sourceActor.name,
        img: sourceActor.img,
        system: duplicate(system),
        'flags.swse.canonicalPublication': duplicate(evidence),
        'flags.swse.universalVehicleSource': duplicate(universal)
      };
      return update;
    }
    const isCanonicalPack = sourceActor.pack === 'foundryvtt-swse.vehicles-canonical-ships';
    if (isCanonicalPack) {
      // Canonical publication Actors bypass the legacy normalizer entirely.
      // Unknown values remain absent; no invented SR, Initiative or cargo.
      // Flags are a read-only evidence snapshot, never stock attack trust.
      const evidence = sourceActor.flags?.swse?.canonicalPublication;
      if (!evidence?.sourceEntryKey || evidence.foundryStockAttackTrusted !== false ||
          !/^swse\d{12}$/.test(sourceActor.id ?? sourceActor._id ?? '') ||
          !Array.isArray(sourceActor.system?.weapons) || sourceActor.system.weapons.length !== 0) {
        throw new Error('CANONICAL_SHIP_SOURCE_INVALID_OR_UNTRUSTED');
      }
      const update = {};
      if (!preserve.name) update.name = sourceActor.name;
      if (!preserve.image) update.img = sourceActor.img;
      if (mode === 'replace') update.system = duplicate(sourceActor.system);
      else for (const [key, value] of Object.entries(duplicate(sourceActor.system))) {
        update[`system.${key}`] = value;
      }
      update['flags.swse.canonicalPublication'] = duplicate(evidence);
      return update;
    }
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
