/**
 * Lightsaber Construction Engine
 * Pure orchestration layer for lightsaber construction.
 *
 * Responsibilities:
 * - Query available chassis and upgrades
 * - Validate compatibility
 * - Calculate DC and cost
 * - Execute construction roll
 * - Create final item with metadata (atomic mutation only on success)
 *
 * Zero UI logic. Zero chat rendering. Zero modifier logic.
 * All mutations routed through ActorEngine.
 * Deterministic and testable.
 */

import { RollEngine } from "../roll-engine.js";
import { LedgerService } from "../store/ledger-service.js";
import { ActorEngine } from "../../governance/actor-engine/actor-engine.js";
import { SWSELogger } from "../../core/logger.js";

export class LightsaberConstructionEngine {
  /**
   * Get all available construction options for an actor
   * Returns chassis, crystals, and accessories the actor could potentially select
   *
   * No eligibility checks. No slot enforcement. Pure query.
   *
   * @param {Actor} actor - The actor attempting construction
   * @returns {Object} { chassis: [], crystals: [], accessories: [] }
   */
  static getConstructionOptions(actor) {
    if (!actor) {
      return { chassis: [], crystals: [], accessories: [] };
    }

    try {
      const items = actor.items || [];

      // Query constructible chassis
      const chassis = items
        .filter(i =>
          i.type === "weapon" &&
          i.system?.constructible === true &&
          i.system?.subtype === "lightsaber"
        )
        .map(i => ({
          id: i.id,
          name: i.name,
          chassisId: i.system.chassisId,
          baseBuildDc: i.system.baseBuildDc,
          baseCost: i.system.baseCost
        }));

      // Query crystals
      const crystals = items
        .filter(i =>
          i.type === "weaponUpgrade" &&
          i.system?.lightsaber?.category === "crystal"
        )
        .map(i => ({
          id: i.id,
          name: i.name,
          compatibleChassis: i.system.lightsaber.compatibleChassis || [],
          buildDcModifier: i.system.lightsaber?.buildDcModifier ?? 0,
          cost: i.system.cost ?? 0,
          rarity: i.system.lightsaber?.rarity ?? "common"
        }));

      // Query accessories
      const accessories = items
        .filter(i =>
          i.type === "weaponUpgrade" &&
          i.system?.lightsaber?.category === "accessory"
        )
        .map(i => ({
          id: i.id,
          name: i.name,
          compatibleChassis: i.system.lightsaber.compatibleChassis || [],
          buildDcModifier: i.system.lightsaber?.buildDcModifier ?? 0,
          cost: i.system.cost ?? 0,
          rarity: i.system.lightsaber?.rarity ?? "common"
        }));

      return { chassis, crystals, accessories };
    } catch (err) {
      SWSELogger.error("getConstructionOptions failed:", err);
      return { chassis: [], crystals: [], accessories: [] };
    }
  }

  /**
   * Attempt lightsaber construction
   *
   * Flow:
   * 1. Resolve items by ID and validate constructibility
   * 2. Validate compatibility (chassis vs upgrades)
   * 3. Calculate final DC
   * 4. Calculate total cost
   * 5. Validate credit availability
   * 6. Execute Use the Force roll
   * 7. On success: atomic mutation (deduct credits, create item, inject metadata)
   *
   * @param {Actor} actor - Actor attempting construction
   * @param {Object} config - { chassisItemId, crystalItemId, accessoryItemIds: [] }
   * @returns {Promise<Object>} { success, reason?, itemId?, finalDc?, rollTotal? }
   */
  static async attemptConstruction(actor, config) {
    try {
      // Step 1: Validate input
      if (!actor) {
        return { success: false, reason: "no_actor" };
      }

      if (!config?.chassisItemId) {
        return { success: false, reason: "no_chassis_selected" };
      }

      // Step 2: Resolve items
      const chassis = actor.items.get(config.chassisItemId);
      if (!chassis) {
        return { success: false, reason: "chassis_not_found" };
      }

      // Validate chassis is constructible
      if (chassis.type !== "weapon" || chassis.system?.constructible !== true) {
        return { success: false, reason: "invalid_chassis" };
      }

      // Resolve crystal
      const crystal = actor.items.get(config.crystalItemId);
      if (!crystal) {
        return { success: false, reason: "crystal_not_found" };
      }

      if (crystal.type !== "weaponUpgrade" || crystal.system?.lightsaber?.category !== "crystal") {
        return { success: false, reason: "invalid_crystal" };
      }

      // Resolve accessories
      const accessories = (config.accessoryItemIds || [])
        .map(id => actor.items.get(id))
        .filter(a => a !== undefined);

      // Validate each accessory
      for (const accessory of accessories) {
        if (accessory.type !== "weaponUpgrade" || accessory.system?.lightsaber?.category !== "accessory") {
          return { success: false, reason: "invalid_accessory" };
        }
      }

      // Step 3: Validate compatibility
      const chassisId = chassis.system.chassisId;

      // Check crystal compatibility
      const crystalCompat = crystal.system.lightsaber?.compatibleChassis || [];
      if (!this.#isCompatible(crystalCompat, chassisId)) {
        return { success: false, reason: "crystal_incompatible_chassis" };
      }

      // Check each accessory compatibility
      for (const accessory of accessories) {
        const accessoryCompat = accessory.system.lightsaber?.compatibleChassis || [];
        if (!this.#isCompatible(accessoryCompat, chassisId)) {
          return { success: false, reason: "accessory_incompatible_chassis" };
        }
      }

      // Step 4: Calculate final DC
      const baseDc = chassis.system.baseBuildDc ?? 20;
      const crystalDcMod = crystal.system.lightsaber?.buildDcModifier ?? 0;
      const accessoryDcMod = accessories.reduce(
        (sum, a) => sum + (a.system.lightsaber?.buildDcModifier ?? 0),
        0
      );
      const finalDc = baseDc + crystalDcMod + accessoryDcMod;

      // Step 5: Calculate total cost
      const baseCost = chassis.system.baseCost ?? 0;
      const crystalCost = crystal.system.cost ?? 0;
      const accessoryCost = accessories.reduce(
        (sum, a) => sum + (a.system.cost ?? 0),
        0
      );
      const totalCost = baseCost + crystalCost + accessoryCost;

      // Step 6: Check credit availability
      const fundValidation = LedgerService.validateFunds(actor, totalCost);
      if (!fundValidation.ok) {
        return { success: false, reason: "insufficient_credits" };
      }

      // Step 7: Execute Use the Force roll
      const skill = actor.system.skills?.useTheForce;
      const modifier = skill?.total ?? 0;
      const formula = `1d20 + ${modifier}`;

      let roll;
      try {
        roll = await RollEngine.safeRoll(formula);
        await roll.evaluate({ async: true });
      } catch (err) {
        SWSELogger.error("Construction roll failed:", err);
        return { success: false, reason: "roll_failed" };
      }

      const rollTotal = roll.total;

      // Step 8: Check roll result
      if (rollTotal < finalDc) {
        return {
          success: false,
          reason: "roll_failed",
          finalDc,
          rollTotal,
          modifier
        };
      }

      // Step 9: ATOMIC MUTATION - Only on success
      try {
        // 9a: Deduct credits
        const creditPlan = LedgerService.buildCreditDelta(actor, totalCost);
        await ActorEngine.applyMutationPlan(actor, creditPlan);

        // 9b: Create new weapon from chassis template
        const newWeapon = this.#createBuiltLightsaber(
          chassis,
          crystal,
          accessories,
          actor.id,
          game.time.worldTime
        );

        const created = await ActorEngine.createEmbeddedDocuments(actor, "Item", [newWeapon]);
        const itemId = created[0]?.id;

        if (!itemId) {
          throw new Error("Failed to create lightsaber item");
        }

        return {
          success: true,
          itemId,
          finalDc,
          rollTotal,
          modifier,
          cost: totalCost
        };
      } catch (err) {
        SWSELogger.error("Construction mutation failed:", err);
        return { success: false, reason: "mutation_failed" };
      }

    } catch (err) {
      SWSELogger.error("attemptConstruction failed:", err);
      return { success: false, reason: "internal_error" };
    }
  }

  /**
   * Check if an upgrade is compatible with a chassis
   * @private
   */
  static #isCompatible(compatibleChassis, chassisId) {
    if (!compatibleChassis || !Array.isArray(compatibleChassis)) {
      return false;
    }
    return compatibleChassis.includes("*") || compatibleChassis.includes(chassisId);
  }

  /**
   * Create a new lightsaber item cloned from the chassis template
   * Applies crystal and accessory modifiers
   * Injects builder metadata
   * @private
   */
  static #createBuiltLightsaber(chassis, crystal, accessories, builderId, builtAt) {
    // Clone chassis as base
    const baseData = chassis.toObject();

    // Generate unique name combining components
    const crystalName = crystal.name;
    const accessoryNames = accessories.map(a => a.name).join(", ");
    const accessorySuffix = accessoryNames ? ` with ${accessoryNames}` : "";
    const newName = `${baseData.name} (${crystalName}${accessorySuffix})`;

    // Build modifier array from upgrades
    const modifiers = [];

    // Add crystal modifiers
    if (crystal.system.modifiers && Array.isArray(crystal.system.modifiers)) {
      modifiers.push(...crystal.system.modifiers);
    }

    // Add accessory modifiers
    for (const accessory of accessories) {
      if (accessory.system.modifiers && Array.isArray(accessory.system.modifiers)) {
        modifiers.push(...accessory.system.modifiers);
      }
    }

    // Prepare new item data
    const newItem = {
      ...baseData,
      _id: undefined, // Let Foundry generate new ID
      name: newName,
      system: {
        ...baseData.system,
        modifiers
      },
      flags: {
        ...baseData.flags,
        swse: {
          ...(baseData.flags?.swse || {}),
          builtBy: builderId,
          builtAt: builtAt,
          attunedBy: null
        }
      }
    };

    return newItem;
  }
}
