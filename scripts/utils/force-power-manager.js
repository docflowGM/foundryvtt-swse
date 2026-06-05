import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ForceTrainingEngine } from "/systems/foundryvtt-swse/scripts/engine/force/ForceTrainingEngine.js";
import { ForceRules } from "/systems/foundryvtt-swse/scripts/engine/force/ForceRules.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";
import { launchProgressionSuiteStep } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-suite-launcher.js";

/**
 * Force Power Management System
 * Handles Force Sensitivity, Force Training, and automatic power grants
 */

export class ForcePowerManager {

  /**
   * Get the ability modifier used for Force Training
   * @param {Actor} actor - The actor
   * @returns {number} The modifier (WIS or CHA based on houserule)
   */
  static getForceAbilityModifier(actor) {
    return ForceTrainingEngine.getForceAbilityModifier(actor);
  }

  /**
   * Count how many Force Training feats an actor has
   * @param {Actor} actor - The actor
   * @returns {number} Number of Force Training feats
   */
  static countForceTrainingFeats(actor) {
    // SSOT ENFORCEMENT: replaced direct actor.items access with ActorAbilityBridge
    const feats = ActorAbilityBridge.getFeats(actor);
    return feats.filter(f =>
      f.name.toLowerCase().includes('force training')
    ).length;
  }

  /**
   * Check if actor has Force Sensitivity
   * @param {Actor} actor - The actor
   * @returns {boolean} True if has Force Sensitivity
   */
  static hasForceSensitivity(actor) {
    // SSOT ENFORCEMENT: replaced direct actor.items access with ActorAbilityBridge
    return ActorAbilityBridge.hasFeat(actor, 'Force Sensitivity') ||
           ActorAbilityBridge.hasFeat(actor, 'Force Sensitive');
  }

  /**
   * Calculate total Force Suite size
   * @param {Actor} actor - The actor
   * @returns {number} Total force suite slots
   */
  static calculateForceSuiteSize(actor) {
    const forceTrainingCount = this.countForceTrainingFeats(actor);
    const modifier = this.getForceAbilityModifier(actor);

    // Base: 1 per Force Training + modifier per Force Training
    // So if you have 2 Force Training feats and +3 WIS: (1 + 3) * 2 = 8 powers
    const powersPerTraining = 1 + Math.max(0, modifier);
    return forceTrainingCount * powersPerTraining;
  }

  /**
   * Get all available force powers from compendium
   * Uses cache when available for better performance
   * @returns {Promise<Array>} Array of force power items
   */
  static async getAvailablePowers() {
    try {
      await ForceRegistry.ensureInitialized?.();
      const powers = ForceRegistry.getByType?.('power') || [];
      const docs = [];
      for (const power of powers) {
        const doc = await ForceRegistry.getDocumentByRef?.(power, 'power');
        if (doc) docs.push(doc.toObject());
      }
      return docs;
    } catch (error) {
      SWSELogger.error('SWSE | Error loading force powers from registry:', error);
      return [];
    }
  }

  /**
   * Open the canonical V2 Force Power progression step.
   *
   * Legacy popup selection is intentionally retired: every non-custom force
   * power selection, reselection, or replacement must flow through the V2
   * progression step so slots, owned powers, and finalization stay canonical.
   *
   * @param {Actor} actor - The actor
   * @param {number} count - Number of powers requested
   * @param {string} reason - Reason shown to the progression step
   * @returns {Promise<Array>} Empty array; finalization owns item creation
   */
  static async selectForcePowers(actor, count, reason = 'Select Force Powers') {
    const requestedCount = Math.max(0, Number(count) || 0);
    const shell = await launchProgressionSuiteStep(actor, 'force-powers', {
      reason,
      requestedCount,
      source: 'force-power-manager',
    });

    if (!shell) {
      ui?.notifications?.warn?.('Force power training could not be opened.');
    }

    // Selection is completed by the V2 progression finalizer. Returning [] keeps
    // legacy callers from attempting duplicate direct grants.
    return [];
  }

  /**
   * Grant force powers to an actor
   * @param {Actor} actor - The actor
   * @param {Array} powerIds - Array of power IDs to grant
   * @returns {Promise<void>}
   */
  static async grantForcePowers(actor, powerIds) {
    if (!powerIds || powerIds.length === 0) {return;}

    const availablePowers = await this.getAvailablePowers();
    const powersToCreate = [];

    for (const powerId of powerIds) {
      const powerData = availablePowers.find(p => p._id === powerId);
      if (powerData) {
        // Create a copy without the _id so Foundry generates a new one
        const powerCopy = foundry.utils.deepClone(powerData);
        delete powerCopy._id;
        powersToCreate.push(powerCopy);
      }
    }

    if (powersToCreate.length > 0) {
      // Import ActorEngine dynamically to avoid circular dependencies
      const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
      // SOVEREIGNTY: Route item creation through ActorEngine
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', powersToCreate, { source: 'force-power-grant' });
      ui.notifications.info(`Granted ${powersToCreate.length} Force Power(s) to ${actor.name}`);
    }
  }

  /**
   * Handle Force Sensitivity feat being added
   * @param {Actor} actor - The actor
   * @returns {Promise<void>}
   */
  static async handleForceSensitivity(actor) {
    // RAW/default: Force Sensitivity unlocks Force rules access but does not
    // grant a Force Power. The optional house rule preserves the older +1 pick.
    if (ForceRules.forceSensitivityGrantsForcePower()) {
      await this.selectForcePowers(actor, 1, 'Force Sensitivity - Select 1 Power');
    } else {
      SWSELogger.debug('SWSE | Force Powers | Force Sensitivity added without power grant; house rule is disabled', {
        actor: actor?.name || null
      });
    }

    if (!actor.system.forceSuite) {
      await globalThis.SWSE.ActorEngine.updateActor(actor, {
        'system.forceSuite': {
          max: 0,
          powers: []
        }
      });
    }
  }

  /**
   * Handle Force Training feat being added
   * @param {Actor} actor - The actor
   * @returns {Promise<void>}
   */
  static async handleForceTraining(actor) {
    // Force Training grants 1 + modifier powers
    const modifier = this.getForceAbilityModifier(actor);
    const powerCount = 1 + Math.max(0, modifier);

    await this.selectForcePowers(
      actor,
      powerCount,
      `Force Training - Select ${powerCount} Power(s)`
    );

    // Update force suite maximum
    const newMax = this.calculateForceSuiteSize(actor);
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.forceSuite.max': newMax
    });
  }

  /**
   * Handle ability score increase (check if force modifier changed)
   * @param {Actor} actor - The actor
   * @param {Object} oldAbilities - Old ability scores
   * @param {Object} newAbilities - New ability scores
   * @returns {Promise<void>}
   */
  static async handleAbilityIncrease(actor, oldAbilities, newAbilities) {
    const attribute = ForceTrainingEngine.getTrainingAttribute();
    const abilityKey = attribute === 'charisma' ? 'cha' : 'wis';

    const oldMod = Math.floor((oldAbilities[abilityKey]?.total || 10) - 10) / 2;
    const newMod = Math.floor((newAbilities[abilityKey]?.total || 10) - 10) / 2;

    // Check if modifier increased
    if (newMod > oldMod) {
      const forceTrainingCount = this.countForceTrainingFeats(actor);

      if (forceTrainingCount > 0) {
        // Grant 1 power per Force Training feat
        const powerCount = forceTrainingCount;

        ui.notifications.info(
          `${actor.name}'s ${attribute === 'charisma' ? 'Charisma' : 'Wisdom'} modifier increased! ` +
          `Granting ${powerCount} Force Power(s) (${forceTrainingCount} Force Training feat${forceTrainingCount > 1 ? 's' : ''})`
        );

        await this.selectForcePowers(
          actor,
          powerCount,
          `Ability Increase - Select ${powerCount} Power(s)`
        );

        // Update force suite maximum
        const newMax = this.calculateForceSuiteSize(actor);
        await globalThis.SWSE.ActorEngine.updateActor(actor, {
          'system.forceSuite.max': newMax
        });
      }
    }
  }
}
