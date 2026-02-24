/**
 * SecondWindEngine
 *
 * Manages Second Wind recovery timing and houserule integration.
 * Authority over when and how Second Wind uses are restored.
 *
 * PHASE B FIX 7: Centralizes Second Wind recovery logic to respect houserule settings.
 * PHASE D FIX 1: Use HouseRuleService instead of direct game.settings.get()
 */

import { HouseRuleService } from '../system/HouseRuleService.js';

export const SecondWindEngine = {
  /**
   * Determine if Second Wind should reset based on recovery setting
   *
   * @param {string} triggerEvent - Event type: 'encounter', 'combat-end', 'short-rest', 'extended-rest'
   * @returns {boolean} true if reset should occur
   */
  shouldResetSecondWind(triggerEvent = 'encounter') {
    const recoveryMode = HouseRuleService.get('secondWindRecovery') ?? 'encounter';

    const rules = {
      encounter: (trigger) => trigger === 'encounter' || trigger === 'combat-end',
      short: (trigger) => trigger === 'short-rest' || trigger === 'extended-rest',
      extended: (trigger) => trigger === 'extended-rest'
    };

    const checker = rules[recoveryMode] ?? rules['encounter'];
    return checker(triggerEvent);
  },

  /**
   * Get human-readable recovery timing label
   *
   * @returns {string} Display label for current recovery mode
   */
  getRecoveryLabel() {
    const mode = HouseRuleService.get('secondWindRecovery') ?? 'encounter';
    const labels = {
      encounter: 'After Each Encounter',
      short: 'After Short or Extended Rest',
      extended: 'After Extended Rest Only'
    };
    return labels[mode] ?? 'After Each Encounter';
  },

  /**
   * Reset all active combatants' Second Wind uses
   *
   * Respects houserule setting for recovery timing.
   * Atomic operation on all combatants.
   *
   * @param {string} triggerEvent - Event type triggering reset
   * @returns {Promise<{updated, skipped, reason?}>}
   */
  async resetAllSecondWind(triggerEvent = 'encounter') {
    const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');

    if (!this.shouldResetSecondWind(triggerEvent)) {
      return {
        updated: 0,
        skipped: 0,
        reason: `Recovery mode doesn't reset on ${triggerEvent}`
      };
    }

    let updated = 0;
    let skipped = 0;

    // Reset all combatants in active combat
    if (game.combat && game.combat.active) {
      for (const combatant of game.combat.combatants) {
        try {
          const actor = combatant.actor;
          if (!actor) {
            skipped++;
            continue;
          }

          await ActorEngine.resetSecondWind(actor);
          updated++;
        } catch (err) {
          skipped++;
        }
      }
    }

    return { updated, skipped };
  }
};
