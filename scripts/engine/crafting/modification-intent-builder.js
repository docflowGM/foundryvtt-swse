/**
 * MODIFICATION INTENT BUILDER
 *
 * Converts UI selections from customization modals into standardized modification intents
 * Acts as adapter between UI layer and modification engine layer
 *
 * All customization flows (lightsaber, blaster, armor, gear) must produce intents here
 * Intent → Modification Engine → Mutation Plan → ActorEngine → Persistence
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";

/**
 * @typedef {Object} ModificationIntent
 * @property {string} type - Intent type: "weapon-customization", "armor-upgrade", etc.
 * @property {string} targetId - Item ID being modified
 * @property {Array<{path: string, value: any}>} changes - Delta changes to apply
 * @property {Object} [costContext] - Cost/credit info if applicable
 * @property {Object} [metadata] - Optional tracking data (modifiedBy, modifiedAt, etc.)
 */

export class ModificationIntentBuilder {
  /**
   * Build intent for blaster customization
   * @param {Actor} actor - Owner of the weapon
   * @param {Item} item - Blaster weapon
   * @param {Object} config - { boltColor, fxType }
   * @returns {ModificationIntent}
   */
  static buildBlasterIntent(actor, item, config) {
    return {
      type: "blaster-customization",
      targetId: item.id,
      changes: [
        { path: "flags.swse.boltColor", value: config.boltColor },
        { path: "flags.swse.fxType", value: config.fxType },
        { path: "flags.swse.modifiedAt", value: game.time.worldTime },
        { path: "flags.swse.modifiedBy", value: actor.id }
      ],
      metadata: {
        source: "blaster-customization-modal",
        actor: actor.id,
        item: item.id
      }
    };
  }

  /**
   * Build intent for lightsaber construction (creates new item)
   * Note: Lightsaber uses LightsaberConstructionEngine directly (item creation flow)
   * This is here for reference and future refactoring
   *
   * @param {Actor} actor
   * @param {Item} weapon - Created weapon item
   * @param {string} bladeColor
   * @returns {ModificationIntent}
   */
  static buildLightsaberIntent(actor, weapon, bladeColor) {
    return {
      type: "lightsaber-construction",
      targetId: weapon.id,
      changes: [
        { path: "flags.swse.bladeColor", value: bladeColor },
        { path: "flags.swse.builtBy", value: actor.id },
        { path: "flags.swse.builtAt", value: game.time.worldTime }
      ],
      metadata: {
        source: "lightsaber-construction-modal",
        actor: actor.id,
        newItem: true
      }
    };
  }

  /**
   * Build intent for armor upgrade installation
   * @param {Actor} actor
   * @param {Item} armor
   * @param {Array<string>} installedUpgradeIds - Upgrade items installed
   * @param {number} tokenCost - Tokens consumed
   * @returns {ModificationIntent}
   */
  static buildArmorIntent(actor, armor, installedUpgradeIds, tokenCost = 0) {
    const intent = {
      type: "armor-upgrade",
      targetId: armor.id,
      changes: [
        { path: "system.installedUpgrades", value: installedUpgradeIds },
        { path: "flags.swse.modifiedAt", value: game.time.worldTime }
      ],
      metadata: {
        source: "armor-customization-modal",
        actor: actor.id,
        upgradesAdded: installedUpgradeIds.length,
        tokensCost: tokenCost
      }
    };

    // Add token deduction if applicable
    if (tokenCost > 0) {
      const currentTokens = actor.system.modifications?.tokens?.current ?? 0;
      intent.changes.push({
        path: "system.modifications.tokens.current",
        value: Math.max(0, currentTokens - tokenCost)
      });
    }

    return intent;
  }

  /**
   * Build intent for generic gear/weapon modification
   * @param {Actor} actor
   * @param {Item} item
   * @param {Array<{path: string, value: any}>} changes
   * @param {Object} [costContext] - { type: "credits", amount: number }
   * @returns {ModificationIntent}
   */
  static buildGenericIntent(actor, item, changes, costContext = null) {
    return {
      type: "item-modification",
      targetId: item.id,
      changes: [
        ...changes,
        { path: "flags.swse.modifiedAt", value: game.time.worldTime },
        { path: "flags.swse.modifiedBy", value: actor.id }
      ],
      costContext,
      metadata: {
        source: "customization-modal",
        actor: actor.id,
        item: item.id,
        changeCount: changes.length
      }
    };
  }

  /**
   * Execute modification intent through the authorized pathway
   * @param {Actor} actor - Actor being modified
   * @param {Item} item - Item being modified
   * @param {ModificationIntent} intent - The intent to apply
   * @returns {Promise<{success: boolean, reason?: string}>}
   */
  static async executeIntent(actor, item, intent) {
    try {
      // Build mutation plan from changes
      const mutationPlan = {
        set: {}
      };

      // Add item changes to plan
      for (const change of intent.changes) {
        mutationPlan.set[change.path] = change.value;
      }

      // Apply mutation through authorized pathway
      await ActorEngine.applyMutationPlan(actor, mutationPlan, item);

      SWSELogger.log(`Modification intent executed: ${intent.type} on ${item.name}`);
      return { success: true };
    } catch (err) {
      SWSELogger.error(`Modification intent failed: ${intent.type}`, err);
      return { success: false, reason: "engine_error" };
    }
  }

  /**
   * Execute intent with credit cost validation
   * @param {Actor} actor
   * @param {Item} item
   * @param {ModificationIntent} intent - Must have costContext.type === "credits"
   * @param {number} costAmount
   * @returns {Promise<{success: boolean, reason?: string}>}
   */
  static async executeIntentWithCost(actor, item, intent, costAmount) {
    try {
      // Validate funds
      const hasCredits = LedgerService.validateFunds(actor, costAmount);
      if (!hasCredits) {
        return { success: false, reason: "insufficient_credits" };
      }

      // Build mutation plan with credit deduction
      const creditDelta = LedgerService.buildCreditDelta(actor, costAmount);
      const mutationPlan = {
        set: {
          ...creditDelta.set
        }
      };

      // Add item changes
      for (const change of intent.changes) {
        mutationPlan.set[change.path] = change.value;
      }

      // Apply atomically
      await ActorEngine.applyMutationPlan(actor, mutationPlan, item);

      SWSELogger.log(`Modification with cost executed: ${intent.type} (${costAmount}cr)`);
      return { success: true };
    } catch (err) {
      SWSELogger.error(`Modification with cost failed: ${intent.type}`, err);
      return { success: false, reason: "engine_error" };
    }
  }
}
