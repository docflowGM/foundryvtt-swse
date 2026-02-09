/**
 * Enhanced Condition Track House Rule
 * Expands and improves condition track functionality
 */

import { SWSELogger } from '../utils/logger.js';
import { StatusEffectsMechanics } from './houserule-status-effects.js';

const NS = 'foundryvtt-swse';

export class ConditionTrackMechanics {
  static initialize() {
    Hooks.on('preUpdateActor', (actor, data) => this.onActorPreUpdate(actor, data));
    SWSELogger.debug('Condition track mechanics initialized');
  }

  /**
   * Get current condition track level for an actor
   * @param {Actor} actor - The actor
   * @returns {number} - Current track level (0-4)
   */
  static getConditionTrackLevel(actor) {
    if (!actor) {return 0;}

    return actor.getFlag(NS, 'conditionTrackLevel') || 0;
  }

  /**
   * Calculate condition track level based on damage
   * @param {Actor} actor - The actor
   * @returns {number} - Calculated track level
   */
  static calculateTrackLevel(actor) {
    if (!game.settings.get(NS, 'conditionTrackEnabled') || !actor) {return 0;}

    const maxHP = actor.system?.health?.hp?.max || 1;
    const currentHP = actor.system?.health?.hp?.value || 0;
    const damageThreshold = game.settings.get(NS, 'conditionTrackStartDamage');
    const damagePerStep = game.settings.get(NS, 'conditionTrackProgression');
    const variant = game.settings.get(NS, 'conditionTrackVariant');

    const totalDamage = Math.max(0, maxHP - currentHP);

    if (totalDamage < damageThreshold) {
      return 0; // Not yet on the track
    }

    const damageAboveThreshold = totalDamage - damageThreshold;
    let level = Math.floor(damageAboveThreshold / damagePerStep) + 1;

    // Apply variant-specific rules
    switch (variant) {
      case 'simplified':
        level = Math.min(level, 4); // Max 4 levels
        break;
      case 'swseStandard':
        level = Math.min(level, 5); // Max 5 levels in standard
        break;
      case 'criticalConditions':
        level = Math.min(level, 6); // Extended track
        break;
    }

    return level;
  }

  /**
   * Update condition track level and apply effects
   * @param {Actor} actor - The actor
   * @returns {Promise<boolean>} - Success status
   */
  static async updateConditionTrack(actor) {
    if (!game.settings.get(NS, 'conditionTrackEnabled') || !actor) {return false;}

    const newLevel = this.calculateTrackLevel(actor);
    const oldLevel = this.getConditionTrackLevel(actor);

    if (newLevel === oldLevel) {return false;}

    try {
      // Update the flag
      await actor.setFlag(NS, 'conditionTrackLevel', newLevel);

      // Apply status effects if enabled
      if (game.settings.get(NS, 'conditionTrackAutoApply')) {
        if (newLevel > oldLevel) {
          // Advancing on track - apply new effects
          await StatusEffectsMechanics.autoApplyConditionEffects(actor, newLevel);
        } else {
          // Recovering - might remove effects
          await this.removeTrackEffects(actor, oldLevel, newLevel);
        }
      }

      return true;
    } catch (err) {
      SWSELogger.error('Failed to update condition track', err);
      return false;
    }
  }

  /**
   * Get penalties for current track level
   * @param {Actor} actor - The actor
   * @returns {Object} - Penalty object
   */
  static getTrackPenalties(actor) {
    const level = this.getConditionTrackLevel(actor);
    const variant = game.settings.get(NS, 'conditionTrackVariant');

    const penalties = {
      attack: 0,
      ac: 0,
      ability: 0,
      damage: 0,
      movement: 0
    };

    if (level === 0) {return penalties;}

    // Standard variant
    if (variant === 'swseStandard' || variant === 'simplified') {
      penalties.attack = -1 * level;
      penalties.ac = 1 * level; // AC gets worse (higher)
      penalties.movement = -10 * Math.min(level, 2);
    }

    // Critical conditions variant - harsher penalties
    if (variant === 'criticalConditions') {
      penalties.attack = -2 * level;
      penalties.ac = 2 * level;
      penalties.ability = -1 * level;
      penalties.movement = -15 * Math.min(level, 2);
    }

    return penalties;
  }

  /**
   * Get description of track level for UI display
   * @param {number} level - Track level
   * @param {string} variant - Track variant
   * @returns {string} - Description
   */
  static getTrackLevelDescription(level, variant = 'swseStandard') {
    const descriptions = {
      swseStandard: [
        'Healthy',
        'Wounded',
        'Severely Wounded',
        'Critical',
        'Dying',
        'Dead'
      ],
      simplified: [
        'Healthy',
        'Damaged',
        'Severely Damaged',
        'Critical',
        'Dead'
      ],
      criticalConditions: [
        'Healthy',
        'Bruised',
        'Wounded',
        'Severely Wounded',
        'Critical',
        'Dying',
        'Dead'
      ]
    };

    const list = descriptions[variant] || descriptions.swseStandard;
    return list[Math.min(level, list.length - 1)] || 'Unknown';
  }

  /**
   * Remove effects when recovering from track
   * @private
   */
  static async removeTrackEffects(actor, oldLevel, newLevel) {
    // Remove effects that shouldn't apply at new level
    const effectsToRemove = [];

    for (let i = newLevel + 1; i <= oldLevel; i++) {
      const effectMap = {
        1: 'fatigued',
        2: 'exhausted',
        3: 'stunned',
        4: 'helpless'
      };

      if (effectMap[i]) {
        if (StatusEffectsMechanics.hasEffect(actor, effectMap[i])) {
          effectsToRemove.push(effectMap[i]);
        }
      }
    }

    for (const effectId of effectsToRemove) {
      await StatusEffectsMechanics.removeEffect(actor, effectId);
    }
  }

  /**
   * Hook: Pre-update actor to apply condition track penalties
   * @private
   */
  static async onActorPreUpdate(actor, data) {
    if (!game.settings.get(NS, 'conditionTrackEnabled')) {return;}

    // If HP is changing, update condition track
    if (data.system?.health?.hp?.value !== undefined) {
      // Use a slight delay to let the update complete
      setTimeout(() => this.updateConditionTrack(actor), 100);
    }
  }
}
