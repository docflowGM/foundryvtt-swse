/**
 * Bonus Hit Points Engine
 * Manages bonus HP from multiple sources (Species Traits, Talents, etc.)
 *
 * Core Rules:
 * - Bonus HP acts as a damage buffer consumed before regular HP
 * - Multiple sources use MAXIMUM bonus amount, not sum
 * - Example: 10 BHP + 15 BHP ability = 15 BHP (not 25)
 * - Bonus HP resets at end of encounter
 */

import { SWSELogger } from '../utils/logger.js';

export class BonusHitPointsEngine {

  /**
   * Apply bonus HP to an actor
   * If actor already has bonus HP, uses the maximum of old and new
   * @param {Actor} actor - The actor to apply bonus HP to
   * @param {number} amount - The bonus HP amount
   * @param {Object} options - Additional options
   * @param {string} options.source - Source of the bonus HP (e.g., 'talent-name', 'species-trait')
   * @param {string} options.reason - Human-readable reason for the bonus
   */
  static async applyBonusHP(actor, amount, options = {}) {
    if (!actor || typeof amount !== 'number' || amount <= 0) {
      return false;
    }

    const currentBonus = actor.system.hp.bonus || 0;

    // Take the maximum of current and new bonus HP (don't stack)
    const newBonus = Math.max(currentBonus, amount);

    if (newBonus === currentBonus) {
      // No change needed, bonus HP is already equal or higher
      if (currentBonus >= amount) {
        SWSELogger.log(
          `BonusHitPointsEngine | ${actor.name} already has ${currentBonus} bonus HP ` +
          `(source: ${options.source || 'unknown'}, ignoring ${amount} BHP)`
        );
        return false;
      }
    }

    // Apply the new bonus HP
    await actor.update({ 'system.hp.bonus': newBonus }, { diff: true });

    const action = currentBonus > 0 ? 'updated' : 'gained';
    const sourceText = options.source ? ` from ${options.source}` : '';
    const reasonText = options.reason ? ` (${options.reason})` : '';

    SWSELogger.log(
      `BonusHitPointsEngine | ${actor.name} ${action} ${newBonus} bonus HP${sourceText}${reasonText}`
    );

    ui.notifications.info(
      `${actor.name} ${action} ${newBonus} bonus HP${sourceText}!`
    );

    return true;
  }

  /**
   * Reset bonus HP (typically at end of encounter)
   * @param {Actor} actor - The actor to reset
   */
  static async resetBonusHP(actor) {
    if (!actor) return false;

    const currentBonus = actor.system.hp.bonus || 0;
    if (currentBonus === 0) return false;

    await actor.update({ 'system.hp.bonus': 0 }, { diff: true });

    SWSELogger.log(`BonusHitPointsEngine | ${actor.name} bonus HP reset (encounter ended)`);
    ui.notifications.info(`${actor.name}'s bonus HP expired at the end of the encounter.`);

    return true;
  }

  /**
   * Get the total bonus HP available
   * @param {Actor} actor - The actor
   * @returns {number} The bonus HP amount
   */
  static getBonusHP(actor) {
    return actor?.system?.hp?.bonus || 0;
  }

  /**
   * Check if actor has any bonus HP
   * @param {Actor} actor - The actor
   * @returns {boolean} True if actor has bonus HP
   */
  static hasBonusHP(actor) {
    return this.getBonusHP(actor) > 0;
  }

  /**
   * Create an Active Effect that grants bonus HP via talent or ability
   * This effect contributes to the bonus HP pool but uses MAX mode to avoid stacking
   *
   * @param {Actor} actor - The actor to create the effect on
   * @param {Object} config - Configuration for the effect
   * @param {string} config.name - Name of the effect
   * @param {number} config.amount - Amount of bonus HP
   * @param {Object} config.duration - Duration config (rounds, combat end, etc.)
   * @param {string} config.source - Source identifier (talent-name, species-trait, etc.)
   * @param {string} config.sourceActorId - ID of source actor (if different)
   */
  static async createBonusHPEffect(actor, config = {}) {
    if (!actor || !config.amount || config.amount <= 0) {
      return null;
    }

    const effectData = {
      name: config.name || `Bonus Hit Points (${config.amount})`,
      icon: "icons/svg/shield.svg",
      changes: [
        {
          key: "system.hp.bonus",
          mode: "OVERRIDE", // Use OVERRIDE to take max, not sum
          value: config.amount,
          priority: 100 // High priority to ensure bonus HP is set
        }
      ],
      duration: config.duration || {
        rounds: 1 // Default to 1 round
      },
      flags: {
        swse: {
          source: 'bonus-hp',
          sourceId: config.source || 'unknown',
          sourceActorId: config.sourceActorId || null,
          bonusHPAmount: config.amount
        }
      }
    };

    try {
      const created = await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
      return created[0] || null;
    } catch (err) {
      SWSELogger.error(`BonusHitPointsEngine | Failed to create bonus HP effect on ${actor.name}:`, err);
      return null;
    }
  }

  /**
   * Apply bonus HP from multiple sources, taking the maximum
   * Used during effect application to consolidate multiple bonus HP sources
   * @param {Actor} actor - The actor
   * @returns {number} The final bonus HP amount (maximum of all sources)
   */
  static consolidateBonusHP(actor) {
    if (!actor) return 0;

    // Get all active effects that grant bonus HP
    const bonusHPEffects = actor.effects?.filter(eff =>
      !eff.disabled &&
      eff.flags?.swse?.source === 'bonus-hp'
    ) || [];

    if (bonusHPEffects.length === 0) {
      return 0;
    }

    // Find the maximum bonus HP value among all sources
    let maxBonus = 0;
    for (const effect of bonusHPEffects) {
      const amount = effect.flags?.swse?.bonusHPAmount || 0;
      maxBonus = Math.max(maxBonus, amount);
    }

    return maxBonus;
  }
}

/**
 * Hook: Reset bonus HP when combat ends
 * This ensures bonus HP expires at the end of encounters as per the rules
 */
Hooks.on('deleteCombat', async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;

    // Reset bonus HP for all actors in combat
    await BonusHitPointsEngine.resetBonusHP(actor);
  }
});

/**
 * Hook: Consolidate bonus HP from multiple sources
 * This runs during derived data preparation to ensure only the maximum bonus HP is applied
 */
Hooks.on('prepareDerivedData', (actor) => {
  if (!actor.system?.hp) return;

  // Consolidate bonus HP from effects (take maximum, not sum)
  const maxBonus = BonusHitPointsEngine.consolidateBonusHP(actor);
  actor.system.hp.bonus = maxBonus;
});

/**
 * USAGE EXAMPLES FOR TALENTS AND SPECIES TRAITS
 * ===============================================
 *
 * Example 1: Talent granting bonus HP
 * -----------------------------------
 * In a talent mechanic file:
 *
 *   static async triggerTalentName(actor, amount) {
 *     await BonusHitPointsEngine.applyBonusHP(actor, amount, {
 *       source: 'talent-noble-bolster-ally',
 *       reason: 'Bolster Ally talent'
 *     });
 *   }
 *
 * Example 2: Species trait with bonus HP
 * ----------------------------------------
 * In species trait engine:
 *
 *   if (trait.type === 'BONUS_HIT_POINTS') {
 *     await BonusHitPointsEngine.applyBonusHP(actor, trait.amount, {
 *       source: `species-${speciesName}-${trait.id}`,
 *       reason: trait.name
 *     });
 *   }
 *
 * Example 3: Creating a bonus HP effect with Active Effects
 * -----------------------------------------------------------
 *   await BonusHitPointsEngine.createBonusHPEffect(actor, {
 *     name: 'Talent Name - Bonus HP',
 *     amount: 15,
 *     source: 'talent-name',
 *     duration: { rounds: 1 }
 *   });
 *
 * Key Points:
 * -----------
 * - Multiple sources use MAXIMUM amount, not sum
 * - Always provide 'source' for tracking
 * - Bonus HP is consumed before regular HP
 * - Bonus HP expires at end of encounter
 * - Use createBonusHPEffect for time-limited bonuses
 * - Use applyBonusHP for persistent source consolidation
 */

export default BonusHitPointsEngine;
