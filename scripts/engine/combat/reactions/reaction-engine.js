/**
 * ReactionEngine
 *
 * Handles reaction eligibility and resolution.
 * Phase 1: Skeleton only - eligibility checking and plumbing.
 * No behavior changes, no damage modification, no cost tracking yet.
 *
 * Governance:
 * - No direct ChatMessage.create()
 * - No actor.update() calls
 * - No DOM mutation
 * - Pure eligibility evaluation
 * - Handlers return result objects only
 */

import { ReactionRegistry } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-registry.js";

export class ReactionEngine {
  /**
   * Get available reactions for a defender in a given attack context
   *
   * Phase 1: Returns metadata only. Does not execute handlers.
   *
   * @param {Actor} defender - The defending actor
   * @param {Object} attackContext - Context of the attack
   *   - attacker: Actor
   *   - weapon: Item
   *   - attackType: 'melee' | 'ranged'
   *   - damageTypes: string[]
   *   - trigger: 'ON_ATTACK_DECLARED'
   * @returns {Object[]} Array of available reaction metadata
   */
  static getAvailableReactions(defender, attackContext = {}) {
    if (!defender) {
      return [];
    }

    // Get defender's reaction keys from derived data
    const reactionKeys = defender.system?.derived?.reactions || [];
    if (!Array.isArray(reactionKeys) || reactionKeys.length === 0) {
      return [];
    }

    const available = [];

    for (const reactionKey of reactionKeys) {
      const reactionDef = ReactionRegistry.getReaction(reactionKey);

      if (!reactionDef) {
        console.warn(`ReactionEngine: Reaction "${reactionKey}" not found in registry`);
        continue;
      }

      // Check if reaction's trigger matches
      if (reactionDef.trigger !== attackContext.trigger) {
        continue;
      }

      // Evaluate conditions
      if (!this._evaluateConditions(reactionDef.conditions, attackContext)) {
        continue;
      }

      // Passed all checks - reaction is available
      available.push({
        key: reactionDef.key,
        label: reactionDef.label,
        description: reactionDef.description,
        trigger: reactionDef.trigger
      });
    }

    return available;
  }

  /**
   * Evaluate reaction conditions against attack context
   * Phase 1: Basic condition checking only
   *
   * @private
   * @param {Object} conditions
   * @param {Object} attackContext
   * @returns {boolean}
   */
  static _evaluateConditions(conditions, attackContext) {
    if (!conditions) {
      return true;
    }

    // Check attack type restrictions
    if (conditions.validAttackTypes && Array.isArray(conditions.validAttackTypes)) {
      if (conditions.validAttackTypes.length > 0) {
        if (!conditions.validAttackTypes.includes(attackContext.attackType)) {
          return false;
        }
      }
    }

    // Check damage type restrictions
    if (conditions.validDamageTypes && Array.isArray(conditions.validDamageTypes)) {
      if (conditions.validDamageTypes.length > 0) {
        const attackDamageTypes = attackContext.damageTypes || [];
        const hasValidType = conditions.validDamageTypes.some(dt =>
          attackDamageTypes.includes(dt)
        );
        if (!hasValidType) {
          return false;
        }
      }
    }

    // Additional condition checks can go here as system grows
    // - requiresTalents
    // - requiresWeaponTag
    // - requiresDefense
    // etc.

    return true;
  }

  /**
   * Resolve a reaction
   * Phase 1: Call handler, return result. No side effects.
   *
   * @param {string} reactionKey - Reaction to resolve
   * @param {Object} attackContext - Attack context
   * @returns {Promise<Object>} Resolution result
   *   - modifiedDamage: number | null
   *   - additionalRoll: Roll | null
   *   - resultMessage: string | null
   */
  static async resolveReaction(reactionKey, attackContext = {}) {
    if (!reactionKey) {
      return {
        error: 'No reaction key provided',
        modifiedDamage: null,
        additionalRoll: null,
        resultMessage: null
      };
    }

    const reactionDef = ReactionRegistry.getReaction(reactionKey);

    if (!reactionDef) {
      return {
        error: `Reaction "${reactionKey}" not found`,
        modifiedDamage: null,
        additionalRoll: null,
        resultMessage: null
      };
    }

    // Phase 1: Call handler, but don't apply any effects
    let result = null;

    try {
      result = await reactionDef.handler(attackContext);
    } catch (err) {
      console.error(`ReactionEngine: Handler for "${reactionKey}" threw error:`, err);
      result = {
        error: err.message,
        modifiedDamage: null,
        additionalRoll: null,
        resultMessage: null
      };
    }

    return {
      reactionKey,
      result: result || {},
      timestamp: new Date().toISOString(),
      context: attackContext
    };
  }

  /**
   * Reset round-specific reaction state
   * Phase 1: Placeholder for future round tracking
   *
   * @param {Combat} combat
   */
  static resetRoundState(combat) {
    if (!combat) {
      return;
    }

    // Phase 1: No-op. Future phases will track per-round usage.
    // Placeholder for when reaction cost tracking is implemented.
  }

  /**
   * Get reactions available for an actor's turn in a combat
   * Phase 1: Simple eligibility check
   *
   * @param {Actor} actor
   * @param {Combat} combat
   * @returns {string[]} Reaction keys available to this actor
   */
  static getActorReactions(actor, combat = null) {
    if (!actor || !actor.system?.derived?.reactions) {
      return [];
    }

    return Array.isArray(actor.system.derived.reactions)
      ? actor.system.derived.reactions
      : [];
  }
}
