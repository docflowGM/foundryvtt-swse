/**
 * Droid Customization Engine
 *
 * Phase 4: Dedicated droid customization lane
 *
 * This engine handles real-time droid system modifications (add/remove systems).
 * Unlike generic first-wave customization (weapons/armor/gear), droids have:
 * - Their own system types (locomotion, processor, armor, appendages, sensors)
 * - Their own pricing authority (DROID_SYSTEMS from droid chargen)
 * - Chassis/degree restrictions on system eligibility
 * - Distinct mutation model (installed systems, not slots)
 *
 * CRITICAL REUSE RULE:
 * This engine REUSES the existing droid chargen authority for all system definitions,
 * prices, and eligibility rules. If chargen knows what a system costs, customization
 * asks chargen instead of inventing the value. This avoids drift between chargen and
 * later droid editing.
 *
 * MUTATION AUTHORITY:
 * All mutations route through ActorEngine.applyMutationPlan().
 * The UI is purely requester/viewer; no direct item.update() or actor.update().
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';
import { DROID_SYSTEMS } from '/systems/foundryvtt-swse/scripts/data/droid-systems.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { LedgerService } from '/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js';

export class DroidCustomizationEngine {
  /**
   * Get normalized droid profile for customization purposes
   * REUSE: Leverages canonical droid systems definitions from chargen authority
   */
  static getNormalizedDroidProfile(actor) {
    if (!actor || actor.type !== 'droid') {
      return { success: false, error: 'Not a droid actor' };
    }

    const droidSystems = actor.system?.droidSystems ?? {};
    const installedSystems = actor.system?.installedSystems ?? {};
    const degree = actor.system?.degree ?? 'independent';
    const size = droidSystems.size ?? 'medium';

    return {
      success: true,
      profile: {
        actorId: actor.id,
        actorName: actor.name,
        degree,
        size,
        chassis: droidSystems.chassis,
        locomotion: droidSystems.locomotion,
        processor: droidSystems.processor,
        armor: droidSystems.armor,
        appendages: droidSystems.appendages ?? [],
        sensors: droidSystems.sensors ?? [],
        installedSystems: Object.keys(installedSystems)
      }
    };
  }

  /**
   * Get available droid systems for customization
   * REUSE: Pulls from canonical DROID_SYSTEMS chargen authority
   */
  static getAvailableSystems(actor) {
    if (!actor || actor.type !== 'droid') {
      return {
        success: false,
        error: 'Not a droid actor',
        systems: []
      };
    }

    const profile = this.getNormalizedDroidProfile(actor);
    if (!profile.success) {
      return {
        success: false,
        error: 'Failed to get droid profile',
        systems: []
      };
    }

    const installed = new Set(profile.profile.installedSystems);
    const available = [];

    // Collect all installable systems from chargen authority (DROID_SYSTEMS)
    // These are the systems that can be added/removed during customization
    for (const [key, system] of Object.entries(DROID_SYSTEMS)) {
      if (key === 'locomotion' || key === 'processors' || key === 'appendages' || key === 'armor' || key === 'sensors') {
        // Skip structural systems (they're part of droid chassis, not customizable modifications)
        continue;
      }

      if (Array.isArray(system)) {
        for (const option of system) {
          available.push({
            id: option.id,
            name: option.name,
            description: option.description,
            type: key,
            installed: installed.has(option.id),
            cost: this.#computeSystemCost(actor, option),
            resale: this.#computeSystemResale(actor, option)
          });
        }
      }
    }

    return {
      success: true,
      systems: available
    };
  }

  /**
   * Preview proposed droid customization changes
   * Shows what would happen if user adds/removes systems
   * REUSE: Uses chargen-authority costs for preview
   */
  static previewDroidCustomization(actor, changeSet = {}) {
    const warnings = [];

    if (!actor || actor.type !== 'droid') {
      return { success: false, error: 'Not a droid actor', blockingReason: 'Invalid actor type' };
    }

    const profile = this.getNormalizedDroidProfile(actor);
    if (!profile.success) {
      return { success: false, error: 'Failed to get droid profile' };
    }

    const { add: systemsToAdd = [], remove: systemsToRemove = [] } = changeSet;
    const currentCredits = actor.system?.credits ?? 0;
    let totalAddCost = 0;
    let totalRemoveSale = 0;

    const addedSystems = [];
    const removedSystems = [];

    // Validate systems to add
    for (const systemId of systemsToAdd) {
      const systemDef = this.#findSystemDefinition(systemId);
      if (!systemDef) {
        return { success: false, error: `Unknown system: ${systemId}`, blockingReason: 'System not found' };
      }

      const cost = this.#computeSystemCost(actor, systemDef);
      totalAddCost += cost;
      addedSystems.push({ id: systemId, name: systemDef.name, cost });
    }

    // Validate systems to remove
    for (const systemId of systemsToRemove) {
      const systemDef = this.#findSystemDefinition(systemId);
      if (!systemDef) {
        return { success: false, error: `Unknown system: ${systemId}`, blockingReason: 'System not found' };
      }

      const resale = this.#computeSystemResale(actor, systemDef);
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
   * Apply droid customization changes through ActorEngine
   * MUTATION AUTHORITY: ActorEngine is the sole mutation authority
   */
  static async applyDroidCustomization(actor, changeSet = {}) {
    if (!actor || actor.type !== 'droid') {
      return { success: false, error: 'Not a droid actor' };
    }

    const preview = this.previewDroidCustomization(actor, changeSet);
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
        const systemDef = this.#findSystemDefinition(systemId);
        installedSystems[systemId] = {
          id: systemId,
          name: systemDef.name,
          installedAt: Date.now()
        };
      }

      // Build mutation plan
      const creditDelta = LedgerService.buildCreditDelta(actor, preview.preview.netCost);

      // MUTATION AUTHORITY: ActorEngine is the sole path for committing state changes
      // This is the only point where droid/actor data is written
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
      SWSELogger.error('Droid customization apply failed:', err);
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find system definition in canonical DROID_SYSTEMS authority
   * REUSE: Searches chargen source for system definition
   */
  static #findSystemDefinition(systemId) {
    for (const [key, systems] of Object.entries(DROID_SYSTEMS)) {
      if (Array.isArray(systems)) {
        for (const sys of systems) {
          if (sys.id === systemId) {
            return sys;
          }
        }
      }
    }
    return null;
  }

  /**
   * Compute cost of a system for a specific droid actor
   * REUSE: Uses chargen cost formulas and factors
   */
  static #computeSystemCost(actor, systemDef) {
    if (!systemDef) return 0;

    // If system has flat cost, use it
    if (typeof systemDef.cost === 'number') {
      return systemDef.cost;
    }

    // If system has cost formula (e.g., for size-dependent locomotion)
    if (typeof systemDef.costFormula === 'function') {
      const droidSystems = actor.system?.droidSystems ?? {};
      const size = droidSystems.size ?? 'medium';
      const costFactor = this.#getCostFactor(size);
      const baseSpeed = systemDef.baseSpeed?.[size] ?? 6;
      return systemDef.costFormula(baseSpeed, costFactor);
    }

    // If system has cost multiplier (enhancement on existing system)
    if (typeof systemDef.costMultiplier === 'number') {
      // TODO: Get base system cost and apply multiplier
      return 0;
    }

    return 0;
  }

  /**
   * Compute resale value of a system (50% of purchase cost)
   */
  static #computeSystemResale(actor, systemDef) {
    const purchaseCost = this.#computeSystemCost(actor, systemDef);
    return Math.floor(purchaseCost * 0.5);
  }

  /**
   * Get cost factor for droid size
   * Used by chargen cost formulas
   */
  static #getCostFactor(size) {
    const factors = {
      tiny: 0.25,
      small: 0.5,
      medium: 1,
      large: 2,
      huge: 4,
      gargantuan: 8,
      colossal: 16
    };
    return factors[size] ?? 1;
  }
}
