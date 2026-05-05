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

import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { getHeroicLevel, getClassLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

export class LightsaberConstructionEngine {
  static _catalogCache = null;
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
      const chassis = items.filter(i => this.isLightsaberItem(i)).map(i => this.#summarizeOption(i));
      const crystals = items.filter(i => i.type === "weaponUpgrade" && i.system?.lightsaber?.category === "crystal").map(i => this.#summarizeOption(i));
      const accessories = items.filter(i => i.type === "weaponUpgrade" && i.system?.lightsaber?.category === "accessory").map(i => this.#summarizeOption(i));
      return { chassis, crystals, accessories };
    } catch (err) {
      SWSELogger.error("getConstructionOptions failed:", err);
      return { chassis: [], crystals: [], accessories: [] };
    }
  }

  static async getCatalogOptions() {
    if (this._catalogCache) return this._catalogCache;
    const getDocs = async (packId, fallback = []) => {
      try {
        const pack = game?.packs?.get(packId);
        if (!pack) return fallback;
        const docs = await pack.getDocuments();
        return docs || fallback;
      } catch (err) {
        SWSELogger.error(`getCatalogOptions failed for ${packId}:`, err);
        return fallback;
      }
    };

    const [chassis, crystals, accessories] = await Promise.all([
      getDocs('foundryvtt-swse.weapons-lightsabers'),
      getDocs('foundryvtt-swse.lightsaber-crystals'),
      getDocs('foundryvtt-swse.lightsaber-accessories')
    ]);

    this._catalogCache = {
      chassis: chassis.filter(i => this.isLightsaberItem(i) && i.system?.constructible === true).map(i => this.#summarizeOption(i)),
      crystals: crystals.filter(i => i.type === 'weaponUpgrade' && i.system?.lightsaber?.category === 'crystal').map(i => this.#summarizeOption(i)),
      accessories: accessories.filter(i => i.type === 'weaponUpgrade' && i.system?.lightsaber?.category === 'accessory').map(i => this.#summarizeOption(i))
    };
    return this._catalogCache;
  }

  static isLightsaberItem(item) {
    if (!item) return false;
    return item.type === 'lightsaber' || (item.type === 'weapon' && (item.system?.subtype === 'lightsaber' || item.system?.weaponCategory === 'lightsaber'));
  }

  static getOwnedLightsabers(actor) {
    return (actor?.items ?? []).filter(item => this.isLightsaberItem(item));
  }

  static hasSelfBuiltLightsaber(actor) {
    return this.getOwnedLightsabers(actor).some(item => (item.flags?.["foundryvtt-swse"]?.builtBy ?? item.flags?.swse?.builtBy) === actor?.id);
  }

  static getEligibility(actor) {
    return this.#validateEligibility(actor);
  }

  static getEditState(item) {
    const canonical = item?.flags?.["foundryvtt-swse"] ?? {};
    const legacy = item?.flags?.swse ?? {};
    const flags = { ...legacy, ...canonical };
    const cfg = flags.lightsaberConfig ?? {};
    // Extract saber state for edit mode rendering.
    // Existing/granted/found sabers have no builtBy flag and are edit-only (cannot attune).
    // Self-built sabers have builtBy set to the creator's actor ID.
    return {
      chassisId: cfg.chassisId ?? item?.system?.chassisId ?? null,
      crystalId: cfg.crystalId ?? null,
      accessoryIds: Array.isArray(cfg.accessoryIds) ? [...cfg.accessoryIds] : [],
      bladeColor: flags.bladeColor ?? 'blue',
      builtBy: flags.builtBy ?? null,
      attunedBy: flags.attunedBy ?? null,
      selfBuilt: !!flags.builtBy
    };
  }

  static async getBuildPreview(actor, config) {
    const eligibility = this.getEligibility(actor);
    if (!eligibility?.eligible) {
      return { success: false, reason: eligibility.reason, eligibility };
    }
    const resolved = await this.#resolveSelections(actor, config);
    if (!resolved.success) return resolved;

    const { chassis, crystal, accessories } = resolved;
    const baseDc = chassis.system?.baseBuildDc ?? 20;
    const crystalDcMod = crystal.system?.lightsaber?.buildDcModifier ?? 0;
    const accessoryDcMod = accessories.reduce((sum, a) => sum + (a.system?.lightsaber?.buildDcModifier ?? 0), 0);
    const finalDc = baseDc + crystalDcMod + accessoryDcMod;
    const baseCost = chassis.system?.baseCost ?? chassis.system?.cost ?? 0;
    const totalCost = baseCost + (crystal.system?.cost ?? 0) + accessories.reduce((sum, a) => sum + (a.system?.cost ?? 0), 0);
    const modifier = actor.system?.skills?.useTheForce?.total ?? 0;
    const take10Total = modifier + 10;
    return {
      success: true,
      chassis: this.#summarizeOption(chassis),
      crystal: this.#summarizeOption(crystal),
      accessories: accessories.map(a => this.#summarizeOption(a)),
      finalDc,
      totalCost,
      modifier,
      take10Total,
      canTake10: take10Total >= finalDc,
      timeHours: 24,
      eligibility
    };
  }

  static async applyEdits(actor, weapon, config) {
    if (!actor || !weapon || !this.isLightsaberItem(weapon)) {
      return { success: false, reason: 'invalid_target' };
    }

    const resolved = await this.#resolveSelections(actor, {
      chassisItemId: config?.chassisItemId ?? weapon.system?.chassisId,
      crystalItemId: config?.crystalItemId,
      accessoryItemIds: config?.accessoryItemIds || []
    });
    if (!resolved.success) return resolved;

    const { crystal, accessories } = resolved;
    const modifiers = [];
    if (Array.isArray(crystal.system?.modifiers)) modifiers.push(...crystal.system.modifiers);
    for (const accessory of accessories) {
      if (Array.isArray(accessory.system?.modifiers)) modifiers.push(...accessory.system.modifiers);
    }

    const baseName = weapon.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const accessoryNames = accessories.map(a => a.name).join(', ');
    const suffix = accessoryNames ? ` (${crystal.name} + ${accessoryNames})` : ` (${crystal.name})`;
    const damageTypeOverride = modifiers.find(m => m.type === 'DAMAGE_TYPE_CHANGE')?.value;
    const update = {
      _id: weapon.id,
      name: `${baseName}${suffix}`,
      'system.modifiers': modifiers,
      'flags.foundryvtt-swse.bladeColor': config?.bladeColor || 'blue',
      'flags.swse.bladeColor': config?.bladeColor || 'blue',
      'flags.foundryvtt-swse.lightsaberConfig': {
        chassisId: weapon.system?.chassisId ?? null,
        crystalId: crystal.id,
        accessoryIds: accessories.map(a => a.id)
      },
      'flags.swse.lightsaberConfig': {
        chassisId: weapon.system?.chassisId ?? null,
        crystalId: crystal.id,
        accessoryIds: accessories.map(a => a.id)
      }
    };
    if (damageTypeOverride) update['system.damageType'] = String(damageTypeOverride).toLowerCase();

    try {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [update]);
      return { success: true, itemId: weapon.id };
    } catch (err) {
      SWSELogger.error('applyEdits failed:', err);
      return { success: false, reason: 'mutation_failed', error: err.message };
    }
  }

  /**
   * Attempt lightsaber construction
   *
   * Flow:
   * 1. Basic input validation
   * 1.5. Check actor eligibility (level, feats, force sensitivity) - FAIL FAST
   * 2. Resolve items by ID and validate constructibility
   * 3. Validate compatibility (chassis vs upgrades)
   * 4. Calculate final DC
   * 5. Calculate total cost
   * 6. Validate credit availability
   * 7. Execute Use the Force roll (uses actor.system.skills.useTheForce.total with all modifiers)
   * 8. On success: atomic mutation (deduct credits, create item, inject metadata)
   *
   * @param {Actor} actor - Actor attempting construction
   * @param {Object} config - { chassisItemId, crystalItemId, accessoryItemIds: [], bladeColor?: string }
   * @returns {Promise<Object>} { success, reason?, itemId?, finalDc?, rollTotal?, modifier? }
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

      // Step 1.5: Check eligibility (fail fast, before item resolution)
      const eligibilityCheck = this.#validateEligibility(actor);
      if (!eligibilityCheck.eligible) {
        return { success: false, reason: eligibilityCheck.reason };
      }

      // Step 2: Resolve selections from compendium/actor inventory
      const resolved = await this.#resolveSelections(actor, config);
      if (!resolved.success) return resolved;
      const { chassis, crystal, accessories } = resolved;

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
      // Take 10 is only allowed if 10 + modifier >= DC (enforced by UI, but validated here too)
      // Take 20 is never allowed for lightsaber construction
      const skill = actor.system.skills?.useTheForce;
      const modifier = skill?.total ?? 0;
      let rollTotal = 0;
      const checkMode = config?.checkMode === 'take10' ? 'take10' : 'roll';
      if (checkMode === 'take10') {
        rollTotal = modifier + 10;
        if (rollTotal < finalDc) {
          return { success: false, reason: 'take10_insufficient', finalDc, rollTotal, modifier };
        }
      } else {
        const formula = `1d20 + ${modifier}`;
        let roll;
        try {
          roll = await RollEngine.safeRoll(formula);
          await roll.evaluate({ async: true });
        } catch (err) {
          SWSELogger.error("Construction roll failed:", err);
          return { success: false, reason: "roll_failed" };
        }
        rollTotal = roll.total;
      }

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
          game.time.worldTime,
          config.bladeColor
        );

        const created = await ActorEngine.createEmbeddedDocuments(actor, "Item", [newWeapon]);
        const itemId = created[0]?.id;

        if (!itemId) {
          throw new Error("Failed to create lightsaber item");
        }

        try {
          await actor.unsetFlag?.('foundryvtt-swse', 'lightsaberConstructionDeferred');
          await actor.unsetFlag?.('foundryvtt-swse', 'lightsaberConstructionAvailable');
        } catch (_err) {}

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

  static #summarizeOption(item) {
    return {
      id: item.id,
      _id: item.id,
      name: item.name,
      img: item.img,
      type: item.type,
      system: foundry.utils.deepClone(item.system ?? {}),
      flags: foundry.utils.deepClone(item.flags ?? {}),
      description: item.system?.description ?? '',
      rarity: item.system?.lightsaber?.rarity ?? item.system?.rarity ?? 'common',
      buildDcModifier: item.system?.lightsaber?.buildDcModifier ?? 0,
      cost: item.system?.cost ?? 0,
      compatibleChassis: item.system?.lightsaber?.compatibleChassis || [],
      bladeColor: item.system?.lightsaber?.bladeColor || 'Varies'
    };
  }

  static async #resolveSelections(actor, config) {
    const catalogs = await this.getCatalogOptions();
    const byId = (arr, id) => arr.find(entry => entry.id === id || entry._id === id || entry.system?.chassisId === id);
    const ownedById = id => actor?.items?.get?.(id);

    const chassis = ownedById(config?.chassisItemId) || byId(catalogs.chassis, config?.chassisItemId);
    if (!chassis) return { success: false, reason: 'chassis_not_found' };
    if (!(this.isLightsaberItem(chassis) && chassis.system?.constructible === true)) {
      return { success: false, reason: 'invalid_chassis' };
    }

    const crystal = ownedById(config?.crystalItemId) || byId(catalogs.crystals, config?.crystalItemId);
    if (!crystal) return { success: false, reason: 'crystal_not_found' };
    if (!(crystal.type === 'weaponUpgrade' && crystal.system?.lightsaber?.category === 'crystal')) {
      return { success: false, reason: 'invalid_crystal' };
    }

    const accessories = [];
    for (const accessoryId of (config?.accessoryItemIds || [])) {
      const accessory = ownedById(accessoryId) || byId(catalogs.accessories, accessoryId);
      if (!accessory) return { success: false, reason: 'accessory_not_found' };
      if (!(accessory.type === 'weaponUpgrade' && accessory.system?.lightsaber?.category === 'accessory')) {
        return { success: false, reason: 'invalid_accessory' };
      }
      accessories.push(accessory);
    }
    return { success: true, chassis, crystal, accessories };
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
  static #createBuiltLightsaber(chassis, crystal, accessories, builderId, builtAt, bladeColor = null) {
    // Clone chassis as base
    const baseData = typeof chassis.toObject === "function" ? chassis.toObject() : foundry.utils.deepClone(chassis);

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
        "foundryvtt-swse": {
          ...(baseData.flags?.["foundryvtt-swse"] || {}),
          builtBy: builderId,
          builtAt: builtAt,
          attunedBy: null,
          bladeColor: bladeColor || "blue",
          lightsaberConfig: {
            chassisId: chassis.system?.chassisId ?? null,
            crystalId: crystal.id,
            accessoryIds: accessories.map(a => a.id)
          }
        },
        swse: {
          ...(baseData.flags?.swse || {}),
          builtBy: builderId,
          builtAt: builtAt,
          attunedBy: null,
          bladeColor: bladeColor || "blue",
          lightsaberConfig: {
            chassisId: chassis.system?.chassisId ?? null,
            crystalId: crystal.id,
            accessoryIds: accessories.map(a => a.id)
          }
        }
      }
    };

    return newItem;
  }

  /**
   * Validate actor eligibility for lightsaber construction
   * Checks level gating and feat requirements based on construction mode setting
   *
   * @private
   * @param {Actor} actor - The actor to check
   * @returns {Object} { eligible: boolean, reason?: string }
   */
  static #validateEligibility(actor) {
    if (!actor) {
      return { eligible: false, reason: "no_actor" };
    }

    try {
      // Get construction mode setting
      const mode = game?.settings?.get?.(game.system.id, "lightsaberConstructionMode") || "raw";

      // Get level authorities (NOT raw field access)
      const heroicLevel = getHeroicLevel(actor);
      const jediLevel = getClassLevel(actor, "jedi");

      // Level gating based on mode
      switch (mode) {
        case "jediOnly":
          // Jedi class required, must be level 7+ in Jedi
          if (jediLevel < 7) {
            return {
              eligible: false,
              reason: "insufficient_jedi_level",
              details: { jediLevel, required: 7 }
            };
          }
          break;

        case "heroicAndJedi":
          // Requires heroic 7 AND Jedi 1
          if (heroicLevel < 7) {
            return {
              eligible: false,
              reason: "insufficient_heroic_level",
              details: { heroicLevel, required: 7 }
            };
          }
          if (jediLevel < 1) {
            return {
              eligible: false,
              reason: "insufficient_jedi_level",
              details: { jediLevel, required: 1 }
            };
          }
          break;

        case "raw":
        default:
          // Just needs heroic 7
          if (heroicLevel < 7) {
            return {
              eligible: false,
              reason: "insufficient_heroic_level",
              details: { heroicLevel, required: 7 }
            };
          }
          break;
      }

      // Check Force Sensitivity feat/flag
      // (Use the authoritative system.forceSensitive flag as primary)
      if (actor.system?.forceSensitive !== true) {
        // Check for feat by structured ID from uuid-map
        // Force Sensitivity → 'swse-feat-force-sensitivity'
        const hasForceSensitivity = actor.items?.some(
          item =>
            item.type === "feat" &&
            (item.system?.id === "swse-feat-force-sensitivity" ||
              item.system?.id === "force-sensitivity")
        );

        if (!hasForceSensitivity) {
          return {
            eligible: false,
            reason: "missing_force_sensitivity"
          };
        }
      }

      // Check Weapon Proficiency (Lightsabers)
      // Weapon Proficiency (Lightsabers) → 'swse-feat-weapon-proficiency-lightsabers'
      const hasLightsaberProficiency = actor.items?.some(
        item =>
          item.type === "feat" &&
          (item.system?.id === "swse-feat-weapon-proficiency-lightsabers")
      );

      if (!hasLightsaberProficiency) {
        return {
          eligible: false,
          reason: "missing_lightsaber_proficiency"
        };
      }

      // All checks passed
      return { eligible: true };

    } catch (err) {
      SWSELogger.error("eligibility check failed:", err);
      return {
        eligible: false,
        reason: "eligibility_check_error",
        error: err.message
      };
    }
  }
}
