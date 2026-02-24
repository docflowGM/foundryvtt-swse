/**
 * DroidModificationFactory — Pure, Atomic Droid Modification Planning
 *
 * PHASE 4 STEP 2: Pure factory for atomic droid modifications
 *
 * Responsibilities:
 * - Accept actor + proposedChangeSet (systems to add/remove)
 * - Validate slot availability and compatibility against DROID_SYSTEM_DEFINITIONS
 * - Compute cost delta (purchase costs - resale of removed systems)
 * - Build atomic MutationPlan (systems + credit updates)
 * - Return result WITHOUT mutating anything
 *
 * Non-goals:
 * - No actor mutations
 * - No database access
 * - No side effects
 * - Pure domain math only
 *
 * Result Structure:
 * {
 *   valid: boolean,
 *   plan?: MutationPlan { set, delete, add },
 *   summary?: {
 *     currentCredits: number,
 *     totalPurchaseCost: number,
 *     totalResaleValue: number,
 *     netCost: number,
 *     newCredits: number,
 *     systemsAdded: Array<{ id, name, cost }>,
 *     systemsRemoved: Array<{ id, name, resaleValue }>
 *   },
 *   error?: string,
 *   details?: Array<string>
 * }
 */

import { DROID_SYSTEM_DEFINITIONS, getDroidSystemDefinition, isSystemCompatible, getSystemsBySlot } from './droid-system-definitions.js';
import { DroidSlotGovernanceEngine } from './droid-slot-governance.js';
import { LedgerService } from '../../engines/store/ledger-service.js';
import { swseLogger } from '../../utils/logger.js';
import { normalizeCredits } from '../../utils/credit-normalization.js';

export class DroidModificationFactory {
  /**
   * Build atomic modification plan for droid
   *
   * @param {Actor} actor - Droid actor to modify
   * @param {Object} changeSet - Proposed changes
   * @param {Array<string>} changeSet.add - System IDs to add
   * @param {Array<string>} changeSet.remove - System IDs to remove
   * @returns {Object} Factory result with plan or error
   */
  static planModifications(actor, changeSet = {}) {
    const details = [];

    // Validate actor
    if (!actor) {
      return {
        valid: false,
        error: 'No actor provided',
        details: ['Cannot plan modifications without a droid actor']
      };
    }

    if (actor.type !== 'droid') {
      return {
        valid: false,
        error: `Actor type must be "droid", got "${actor.type}"`,
        details: ['Only droids can have droid systems']
      };
    }

    const { add: systemsToAdd = [], remove: systemsToRemove = [] } = changeSet;

    // Validate changeset structure
    if (!Array.isArray(systemsToAdd) || !Array.isArray(systemsToRemove)) {
      return {
        valid: false,
        error: 'Invalid changeSet structure',
        details: ['add and remove must be arrays of system IDs']
      };
    }

    // PHASE 4 STEP 6: Enforce domain slot governance
    const chassisType = actor.system?.droidSystems?.size || 'medium';
    const currentSystems = Object.keys(actor.system?.installedSystems ?? {});
    const slotValidation = DroidSlotGovernanceEngine.validateModifications(
      currentSystems,
      systemsToAdd,
      systemsToRemove,
      chassisType
    );

    if (!slotValidation.valid) {
      return {
        valid: false,
        error: 'Modifications violate domain slot governance',
        details: slotValidation.violations
      };
    }

    // Check for add+remove conflicts
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
        const systemDef = getDroidSystemDefinition(systemId);
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
    const slotOccupancy = new Map();

    // Track current slot occupancy
    for (const [sysId, installed] of Object.entries(installedSystems)) {
      if (!systemsToRemove.includes(sysId)) {
        const sysDef = getDroidSystemDefinition(sysId);
        if (sysDef) {
          const slot = sysDef.slot;
          slotOccupancy.set(slot, (slotOccupancy.get(slot) ?? 0) + 1);
        }
      }
    }

    for (const systemId of systemsToAdd) {
      const systemDef = getDroidSystemDefinition(systemId);

      if (!systemDef) {
        details.push(`Cannot add system "${systemId}": no definition found`);
        continue;
      }

      // Check slot availability
      const slot = systemDef.slot;
      const currentSlotCount = slotOccupancy.get(slot) ?? 0;

      // Most slots allow only 1 system (processors, shields, power cores)
      // Multi-slot systems like locomotion/appendages allow multiple
      const isMultiSlot = ['locomotion', 'appendage'].includes(slot);
      const maxPerSlot = isMultiSlot ? 999 : 1;

      if (currentSlotCount >= maxPerSlot) {
        details.push(`Cannot add system "${systemId}": slot "${slot}" is full (max ${maxPerSlot})`);
        continue;
      }

      // Check compatibility
      const compatible = isSystemCompatible(systemDef, actor);
      if (!compatible) {
        details.push(`Cannot add system "${systemId}": incompatible with droid chassis`);
        continue;
      }

      // If all validation passed, add to list
      addedSystemsData.push({
        id: systemId,
        name: systemDef.name,
        cost: systemDef.cost
      });

      slotOccupancy.set(slot, currentSlotCount + 1);
    }

    // If any validation failed, return error
    if (details.length > 0) {
      const validationFailed = details.some(d =>
        d.includes('Cannot remove') || d.includes('Cannot add')
      );

      if (validationFailed) {
        return {
          valid: false,
          error: 'Modifications failed validation',
          details
        };
      }
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

    // Build atomic MutationPlan
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
      swseLogger.error('DroidModificationFactory: Failed to build plan', { error: error.message });
      return {
        valid: false,
        error: `Failed to build modification plan: ${error.message}`,
        details: [error.message]
      };
    }
  }

  /**
   * Build the actual MutationPlan structure
   * Private helper for planModifications
   *
   * @private
   * @returns {Object} MutationPlan { set, delete, add }
   */
  static #buildModificationPlan(actor, addedSystems, removedSystems, netCost, installedSystems) {
    const plan = {
      set: {},
      delete: {},
      add: {}
    };

    // Update credit balance
    const currentCredits = Number(actor.system?.credits ?? 0) || 0;
    const newCredits = normalizeCredits(currentCredits - netCost);
    plan.set['system.credits'] = newCredits;

    // Build new installedSystems object
    const nextInstalledSystems = { ...installedSystems };

    // Remove systems
    for (const removedSys of removedSystems) {
      delete nextInstalledSystems[removedSys.id];
    }

    // Add systems
    for (const addedSys of addedSystems) {
      nextInstalledSystems[addedSys.id] = {
        id: addedSys.id,
        name: addedSys.name,
        cost: addedSys.cost,
        installedAt: new Date().toISOString()
      };
    }

    // Update installedSystems as entire object
    plan.set['system.installedSystems'] = nextInstalledSystems;

    // Clean empty buckets
    if (Object.keys(plan.set).length === 0) {
      delete plan.set;
    }
    if (Object.keys(plan.delete).length === 0) {
      delete plan.delete;
    }
    if (Object.keys(plan.add).length === 0) {
      delete plan.add;
    }

    swseLogger.debug('DroidModificationFactory: Built modification plan', {
      actor: actor.id,
      systemsAdded: addedSystems.length,
      systemsRemoved: removedSystems.length,
      netCost,
      hasSets: !!plan.set && Object.keys(plan.set).length > 0
    });

    return plan;
  }
}
