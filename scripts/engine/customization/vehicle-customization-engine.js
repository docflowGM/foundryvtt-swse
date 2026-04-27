/**
 * Vehicle Customization Engine
 *
 * Phase 5: Dedicated vehicle customization lane
 *
 * This engine handles real-time vehicle system modifications (add/remove systems).
 * Vehicles have their own customization path separate from:
 * - Generic first-wave weapon/armor/gear customization
 * - Droid customization
 * - Lightsaber construction/edit flows
 *
 * CRITICAL REUSE RULE:
 * This engine REUSES the existing vehicle modification authority for all system definitions,
 * prices, compatibility, and eligibility rules. The VEHICLE_SYSTEM_DEFINITIONS registry
 * is the single source of truth. If the vehicle system already knows what a system costs,
 * customization asks that source instead of inventing the value.
 *
 * MUTATION AUTHORITY:
 * All mutations route through ActorEngine.applyMutationPlan().
 * The UI is purely requester/viewer; no direct actor.update() or item.update().
 *
 * Storage model:
 * Uses canonical actor.system.installedSystems for actual vehicle configuration.
 * This avoids parallel truth and keeps compatibility with existing vehicle systems.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';
import { VEHICLE_SYSTEM_DEFINITIONS } from '/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-system-definitions.js';
import { VehicleSlotGovernanceEngine } from '/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-slot-governance.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { LedgerService } from '/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js';

export class VehicleCustomizationEngine {
  /**
   * Get normalized vehicle profile for customization purposes
   * REUSE: Leverages canonical vehicle system definitions from existing authority
   */
  static getNormalizedVehicleProfile(actor) {
    if (!actor || actor.type !== 'vehicle') {
      return { success: false, error: 'Not a vehicle actor' };
    }

    const vehicleType = actor.system?.type || 'transport';
    const installedSystems = actor.system?.installedSystems ?? {};

    return {
      success: true,
      profile: {
        actorId: actor.id,
        actorName: actor.name,
        vehicleType,
        speed: actor.system?.speed?.base ?? 0,
        armor: actor.system?.defense?.armor ?? 0,
        installedSystems: Object.keys(installedSystems),
        credits: actor.system?.credits ?? 0
      }
    };
  }

  /**
   * Get customization state for vehicle
   * REUSE: Pulls from canonical VEHICLE_SYSTEM_DEFINITIONS authority
   */
  static getVehicleCustomizationState(actor) {
    if (!actor || actor.type !== 'vehicle') {
      return { success: false, error: 'Not a vehicle actor' };
    }

    const profile = this.getNormalizedVehicleProfile(actor);
    if (!profile.success) {
      return { success: false, error: 'Failed to get vehicle profile' };
    }

    const vehicleType = profile.profile.vehicleType;
    const installed = new Set(profile.profile.installedSystems);
    const available = [];

    // Collect all available systems from canonical VEHICLE_SYSTEM_DEFINITIONS
    for (const [key, systemDef] of Object.entries(VEHICLE_SYSTEM_DEFINITIONS)) {
      const isInstalled = installed.has(systemDef.id);
      const isCompatible = this.#isSystemCompatible(systemDef, vehicleType);

      available.push({
        id: systemDef.id,
        name: systemDef.name,
        slot: systemDef.slot,
        cost: systemDef.cost,
        resale: Math.floor(systemDef.cost * (systemDef.resaleMultiplier ?? 0.5)),
        installed: isInstalled,
        compatible: isCompatible,
        description: systemDef.description || ''
      });
    }

    return {
      success: true,
      profile: profile.profile,
      systems: available
    };
  }

  /**
   * Preview proposed vehicle customization changes
   * Shows what would happen if user adds/removes systems
   * REUSE: Uses canonical VEHICLE_SYSTEM_DEFINITIONS for costs and validation
   */
  static previewVehicleCustomization(actor, changeSet = {}) {
    const warnings = [];

    if (!actor || actor.type !== 'vehicle') {
      return { success: false, error: 'Not a vehicle actor', blockingReason: 'Invalid actor type' };
    }

    const profile = this.getNormalizedVehicleProfile(actor);
    if (!profile.success) {
      return { success: false, error: 'Failed to get vehicle profile' };
    }

    const { add: systemsToAdd = [], remove: systemsToRemove = [] } = changeSet;
    const vehicleType = profile.profile.vehicleType;
    const currentCredits = profile.profile.credits;
    const currentSystems = profile.profile.installedSystems;

    let totalAddCost = 0;
    let totalRemoveSale = 0;
    const addedSystems = [];
    const removedSystems = [];

    // Validate systems to add
    for (const systemId of systemsToAdd) {
      const systemDef = VEHICLE_SYSTEM_DEFINITIONS[systemId];
      if (!systemDef) {
        return { success: false, error: `Unknown system: ${systemId}`, blockingReason: 'System not found' };
      }

      if (!this.#isSystemCompatible(systemDef, vehicleType)) {
        return {
          success: false,
          error: `System "${systemDef.name}" is not compatible with ${vehicleType}`,
          blockingReason: 'Incompatible system'
        };
      }

      // Check slot governance
      const tempSystems = [...currentSystems, systemId];
      const slotCheck = VehicleSlotGovernanceEngine.validateModifications(
        currentSystems,
        [systemId],
        [],
        vehicleType
      );

      if (!slotCheck.valid) {
        return {
          success: false,
          error: slotCheck.violations.join('; '),
          blockingReason: 'Slot governance violation'
        };
      }

      totalAddCost += systemDef.cost;
      addedSystems.push({ id: systemId, name: systemDef.name, cost: systemDef.cost });
    }

    // Validate systems to remove
    for (const systemId of systemsToRemove) {
      const systemDef = VEHICLE_SYSTEM_DEFINITIONS[systemId];
      if (!systemDef) {
        return { success: false, error: `Unknown system: ${systemId}`, blockingReason: 'System not found' };
      }

      if (!currentSystems.includes(systemId)) {
        return {
          success: false,
          error: `System "${systemDef.name}" is not currently installed`,
          blockingReason: 'System not installed'
        };
      }

      const resale = Math.floor(systemDef.cost * (systemDef.resaleMultiplier ?? 0.5));
      totalRemoveSale += resale;
      removedSystems.push({ id: systemId, name: systemDef.name, resale });
    }

    const netCost = totalAddCost - totalRemoveSale;
    const newCredits = currentCredits - netCost;

    if (newCredits < 0) {
      return {
        success: false,
        error: `Insufficient credits: need ${netCost}, have ${currentCredits}`,
        blockingReason: 'Insufficient funds',
        preview: {
          currentCredits,
          netCost,
          newCredits
        }
      };
    }

    return {
      success: true,
      preview: {
        actorId: actor.id,
        currentCredits,
        systemsAdded: addedSystems,
        systemsRemoved: removedSystems,
        totalAddCost,
        totalRemoveSale,
        netCost,
        newCredits
      }
    };
  }

  /**
   * Apply vehicle customization changes through ActorEngine
   * MUTATION AUTHORITY: ActorEngine is the sole mutation authority
   */
  static async applyVehicleCustomization(actor, changeSet = {}) {
    if (!actor || actor.type !== 'vehicle') {
      return { success: false, error: 'Not a vehicle actor' };
    }

    const preview = this.previewVehicleCustomization(actor, changeSet);
    if (!preview.success) {
      return preview;
    }

    try {
      const { add: systemsToAdd = [], remove: systemsToRemove = [] } = changeSet;
      const installedSystems = { ...actor.system.installedSystems };

      // Apply removals
      for (const systemId of systemsToRemove) {
        delete installedSystems[systemId];
      }

      // Apply additions
      for (const systemId of systemsToAdd) {
        const systemDef = VEHICLE_SYSTEM_DEFINITIONS[systemId];
        installedSystems[systemId] = {
          id: systemId,
          name: systemDef.name,
          installedAt: Date.now()
        };
      }

      // Build mutation plan
      const creditDelta = LedgerService.buildCreditDelta(actor, preview.preview.netCost);

      // MUTATION AUTHORITY: ActorEngine is the sole path for committing state changes
      // This is the only point where vehicle/actor data is written
      // UI must never bypass this through direct update() calls
      const mutationPlan = {
        set: {
          ...creditDelta.set,
          'system.installedSystems': installedSystems
        }
      };

      await ActorEngine.applyMutationPlan(actor, mutationPlan);

      return {
        success: true,
        applied: {
          systemsAdded: preview.preview.systemsAdded,
          systemsRemoved: preview.preview.systemsRemoved,
          netCost: preview.preview.netCost,
          newCredits: preview.preview.newCredits
        }
      };
    } catch (err) {
      SWSELogger.error('Vehicle customization apply failed:', err);
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if a system is compatible with vehicle type
   * REUSE: Uses compatibility rules from VEHICLE_SYSTEM_DEFINITIONS
   */
  static #isSystemCompatible(systemDef, vehicleType) {
    if (!systemDef.compatibility) return true;
    if (!systemDef.compatibility.type) return true;
    return systemDef.compatibility.type.includes(vehicleType);
  }
}
