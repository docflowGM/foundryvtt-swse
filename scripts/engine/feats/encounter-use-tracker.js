/**
 * EncounterUseTracker — Generic Once-Per-Encounter Feature Enforcement
 *
 * Metadata-driven tracker for features with oncePer: "encounter" constraint.
 * Used by reroll feats (Lucky Shot, Reactive Awareness, etc.) to prevent
 * multiple uses within a single combat encounter.
 *
 * CRITICAL: Separates read-only checks (canUse) from mutations (markUsed).
 * - canUse(): Check without spending (safe to call during chat UI rendering)
 * - markUsed(): Spend the use (only on confirmed execution)
 * - checkAndMarkUsed(): Atomic check+spend (safe for button click handlers)
 */

export class EncounterUseTracker {
  static FLAG_SCOPE = 'foundryvtt-swse';
  static FLAG_KEY = 'featureUsesThisEncounter';

  /**
   * Read-only check: can this feature be used this encounter?
   * Safe to call during chat UI rendering (does not spend the use).
   *
   * @param {Actor} actor - Target actor
   * @param {string} featureKey - Unique key for feature (e.g., "reroll-lucky-shot")
   * @param {Object} metadata - Feature metadata { oncePer?: string, ... }
   * @returns {boolean} True if feature can be used this encounter
   */
  static canUse(actor, featureKey, metadata = {}) {
    if (!actor || !featureKey) return false;

    const oncePer = metadata.oncePer || null;
    if (!oncePer || oncePer === 'atWill') return true; // No limit

    // Get current combat ID (null if no active combat)
    const activeCombatId = game.combat?.started ? game.combat.id : null;

    // Get usage flag (who has used this feature and in which combat)
    const usageFlag = actor.getFlag(this.FLAG_SCOPE, this.FLAG_KEY) || {};

    // Already used in current combat?
    const lastUsedInCombat = usageFlag[featureKey];
    if (lastUsedInCombat === activeCombatId) {
      return false; // Already spent
    }

    return true; // Available to use
  }

  /**
   * Mark feature as used this encounter.
   * Spends the use immediately (only call on confirmed execution).
   *
   * @param {Actor} actor - Target actor
   * @param {string} featureKey - Unique key for feature
   * @param {Object} metadata - Feature metadata { oncePer?: string, ... }
   * @returns {Promise<boolean>} True if marked successfully
   */
  static async markUsed(actor, featureKey, metadata = {}) {
    if (!actor || !featureKey) return false;

    const oncePer = metadata.oncePer || null;
    if (!oncePer || oncePer === 'atWill') return true; // No tracking needed

    // Get current combat ID
    const activeCombatId = game.combat?.started ? game.combat.id : null;

    // Update flag to mark as used in this combat
    const usageFlag = actor.getFlag(this.FLAG_SCOPE, this.FLAG_KEY) || {};
    usageFlag[featureKey] = activeCombatId;

    try {
      await actor.setFlag(this.FLAG_SCOPE, this.FLAG_KEY, usageFlag);
      return true;
    } catch (err) {
      console.error(`[EncounterUseTracker] Failed to mark ${featureKey} as used:`, err);
      return false;
    }
  }

  /**
   * Atomic check+mark operation.
   * Safe for button click handlers (checks before spending).
   *
   * @param {Actor} actor - Target actor
   * @param {string} featureKey - Unique key for feature
   * @param {Object} metadata - Feature metadata { oncePer?: string, ... }
   * @returns {Promise<Object>} {
   *   allowed: boolean,
   *   reason?: string (only if not allowed)
   * }
   */
  static async checkAndMarkUsed(actor, featureKey, metadata = {}) {
    if (!actor || !featureKey) {
      return { allowed: false, reason: 'Invalid actor or feature key' };
    }

    const oncePer = metadata.oncePer || null;
    if (!oncePer || oncePer === 'atWill') {
      return { allowed: true }; // No limit
    }

    // Check if available
    if (!this.canUse(actor, featureKey, metadata)) {
      const encounterType = oncePer === 'encounter' ? 'encounter' : oncePer;
      return {
        allowed: false,
        reason: `Already used once per ${encounterType}`
      };
    }

    // Mark as used
    const marked = await this.markUsed(actor, featureKey, metadata);
    if (!marked) {
      return {
        allowed: false,
        reason: 'Failed to record use'
      };
    }

    return { allowed: true };
  }

  /**
   * Reset all feature uses for an actor.
   * Called when combat ends (from handleCombatEnd hook).
   *
   * @param {Actor} actor - Target actor
   * @returns {Promise<void>}
   */
  static async resetAllUses(actor) {
    if (!actor) return;

    try {
      await actor.unsetFlag(this.FLAG_SCOPE, this.FLAG_KEY);
    } catch (err) {
      console.error(
        `[EncounterUseTracker] Failed to reset uses for ${actor.name}:`,
        err
      );
    }
  }
}

export default EncounterUseTracker;
