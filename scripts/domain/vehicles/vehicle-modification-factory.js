/**
 * VehicleModificationFactory — Pure, Atomic Vehicle Modification Planning
 *
 * PHASE 5: Pure factory for atomic vehicle modifications
 * Mirrors DroidModificationFactory architecture
 */

import { VEHICLE_SYSTEM_DEFINITIONS, getVehicleSystemDefinition, isVehicleSystemCompatible } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-system-definitions.js";
import { VehicleSlotGovernanceEngine } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-slot-governance.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";

export class VehicleModificationFactory {
  /**
   * Build atomic modification plan for vehicle
   *
   * @param {Actor} actor - Vehicle actor to modify
   * @param {Object} changeSet - Proposed changes { add, remove }
   * @returns {Object} Factory result with plan or error
   */
  static planModifications(actor, changeSet = {}) {
    const details = [];

    if (!actor) {
      return {
        valid: false,
        error: 'No actor provided',
        details: ['Cannot plan modifications without a vehicle actor']
      };
    }

    if (actor.type !== 'vehicle') {
      return {
        valid: false,
        error: `Actor type must be "vehicle", got "${actor.type}"`,
        details: ['Only vehicles can have vehicle systems']
      };
    }

    const { add: systemsToAdd = [], remove: systemsToRemove = [] } = changeSet;

    if (!Array.isArray(systemsToAdd) || !Array.isArray(systemsToRemove)) {
      return {
        valid: false,
        error: 'Invalid changeSet structure',
        details: ['add and remove must be arrays of system IDs']
      };
    }

    // PHASE 5: Enforce domain slot governance for vehicles
    const vehicleType = actor.system?.type || 'transport';
    const currentSystems = Object.keys(actor.system?.installedSystems ?? {});
    const slotValidation = VehicleSlotGovernanceEngine.validateModifications(
      currentSystems,
      systemsToAdd,
      systemsToRemove,
      vehicleType
    );

    if (!slotValidation.valid) {
      return {
        valid: false,
        error: 'Modifications violate domain slot governance',
        details: slotValidation.violations
      };
    }

    // Check for add/remove conflicts
    const addSet = new Set(systemsToAdd);
    const removeSet = new Set(systemsToRemove);
    const conflicts = Array.from(addSet).filter(id => removeSet.has(id));

    if (conflicts.length > 0) {
      return {
        valid: false,
        error: `Cannot add and remove same systems: ${conflicts.join(', ')}`,
        details: conflicts.map(id => `System "${id}" listed in both add and remove`)
      };
    }

    // Get current installed systems
    const installedSystems = actor.system?.installedSystems ?? {};
    const currentSystemIds = Object.keys(installedSystems);

    // Validate systems exist and can be removed
    const removedSystemsData = [];
    for (const systemId of systemsToRemove) {
      if (!currentSystemIds.includes(systemId)) {
        details.push(`Cannot remove system "${systemId}": not currently installed`);
      } else {
        const systemDef = getVehicleSystemDefinition(systemId);
        if (!systemDef) {
          details.push(`Cannot remove system "${systemId}": no definition found`);
        } else {
          removedSystemsData.push({
            id: systemId,
            name: systemDef.name,
            cost: systemDef.cost
          });
        }
      }
    }

    // Validate systems exist and are compatible
    const addedSystemsData = [];
    for (const systemId of systemsToAdd) {
      const systemDef = getVehicleSystemDefinition(systemId);

      if (!systemDef) {
        details.push(`Cannot add system "${systemId}": no definition found`);
        continue;
      }

      const compatible = isVehicleSystemCompatible(systemDef, vehicleType);
      if (!compatible) {
        details.push(`Cannot add system "${systemId}": incompatible with vehicle type "${vehicleType}"`);
        continue;
      }

      addedSystemsData.push({
        id: systemId,
        name: systemDef.name,
        cost: systemDef.cost
      });
    }

    if (details.filter(d => d.includes('Cannot')).length > 0) {
      return {
        valid: false,
        error: 'Modifications failed validation',
        details
      };
    }

    // Calculate costs
    const totalPurchaseCost = LedgerService.calculateTotal(addedSystemsData);
    const totalResaleValue = normalizeCredits(
      removedSystemsData.reduce((sum, sys) => sum + LedgerService.calculateResale(sys.cost), 0)
    );
    const netCost = normalizeCredits(totalPurchaseCost - totalResaleValue);

    // Validate funds
    const currentCredits = Number(actor.system?.credits ?? 0) || 0;
    const fundValidation = LedgerService.validateFunds(actor, netCost);

    if (!fundValidation.ok) {
      return {
        valid: false,
        error: `Insufficient credits: ${fundValidation.reason}`,
        details: [
          `Current credits: ${currentCredits}`,
          `Net cost: ${netCost} credits`,
          `Short by: ${netCost - currentCredits} credits`
        ]
      };
    }

    try {
      const plan = this.#buildModificationPlan(
        actor,
        addedSystemsData,
        removedSystemsData,
        netCost,
        installedSystems
      );

      const newCredits = normalizeCredits(currentCredits - netCost);

      return {
        valid: true,
        plan,
        summary: {
          currentCredits,
          totalPurchaseCost,
          totalResaleValue,
          netCost,
          newCredits,
          systemsAdded: addedSystemsData,
          systemsRemoved: removedSystemsData
        },
        details
      };
    } catch (error) {
      swseLogger.error('VehicleModificationFactory: Failed to build plan', { error: error.message });
      return {
        valid: false,
        error: `Failed to build modification plan: ${error.message}`,
        details: [error.message]
      };
    }
  }

  static #buildModificationPlan(actor, addedSystems, removedSystems, netCost, installedSystems) {
    const plan = {
      set: {},
      delete: {},
      add: {}
    };

    const currentCredits = Number(actor.system?.credits ?? 0) || 0;
    const newCredits = normalizeCredits(currentCredits - netCost);
    plan.set['system.credits'] = newCredits;

    const nextInstalledSystems = { ...installedSystems };

    for (const removedSys of removedSystems) {
      delete nextInstalledSystems[removedSys.id];
    }

    for (const addedSys of addedSystems) {
      nextInstalledSystems[addedSys.id] = {
        id: addedSys.id,
        name: addedSys.name,
        cost: addedSys.cost,
        installedAt: new Date().toISOString()
      };
    }

    plan.set['system.installedSystems'] = nextInstalledSystems;

    if (Object.keys(plan.set).length === 0) delete plan.set;
    if (Object.keys(plan.delete).length === 0) delete plan.delete;
    if (Object.keys(plan.add).length === 0) delete plan.add;

    swseLogger.debug('VehicleModificationFactory: Built modification plan', {
      actor: actor.id,
      systemsAdded: addedSystems.length,
      systemsRemoved: removedSystems.length,
      netCost
    });

    return plan;
  }
}
