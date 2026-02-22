/**
 * Recovery & Healing House Rule Mechanics
 * Handles HP and Vitality recovery during rest
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 */

import { SWSELogger } from '../utils/logger.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';

const NS = 'foundryvtt-swse';

export class RecoveryMechanics {
  static initialize() {
    // Hook into rest functionality
    Hooks.on('restCompleted', (data) => this.onRestCompleted(data));
    SWSELogger.debug('Recovery mechanics initialized');
  }

  /**
   * Calculate HP recovery amount
   * @param {Actor} actor - Character to recover
   * @returns {number} - HP to recover
   */
  static calculateRecoveryHP(actor) {
    const recoveryType = game.settings.get(NS, 'recoveryHPType');
    const customAmount = game.settings.get(NS, 'customRecoveryHP');

    if (!actor) {return 0;}

    const hitDie = actor.system?.details?.hitDie || 8;
    const conMod = actor.system?.attributes?.con?.mod || 0;

    switch (recoveryType) {
      case 'standard':
        return hitDie;
      case 'slow':
        return Math.ceil(hitDie / 2);
      case 'fast':
        return hitDie + Math.max(0, conMod);
      case 'custom':
        return customAmount;
      default:
        return 0;
    }
  }

  /**
   * Calculate Vitality recovery amount
   * @param {Actor} actor - Character to recover
   * @returns {number} - Vitality to recover (0 if disabled)
   */
  static calculateVitalityRecovery(actor) {
    const recoveryVitality = game.settings.get(NS, 'recoveryVitality');
    if (!recoveryVitality) {return 0;}

    return game.settings.get(NS, 'recoveryVitalityAmount');
  }

  /**
   * Perform recovery on an actor
   * @param {Actor} actor - Character to recover
   * @returns {Promise<Object>} - Recovery result
   */
  static async performRecovery(actor) {
    if (!game.settings.get(NS, 'recoveryEnabled')) {
      return { success: false, message: 'Recovery is not enabled' };
    }

    if (!actor || actor.isToken) {
      return { success: false, message: 'Invalid actor' };
    }

    const hpRecovery = this.calculateRecoveryHP(actor);
    const vitalityRecovery = this.calculateVitalityRecovery(actor);

    try {
      // PHASE 7: Batch recovery updates into single transaction
      const updateData = {};

      // Recover HP
      if (hpRecovery > 0) {
        const currentHP = actor.system?.hp?.value || 0;
        const maxHP = actor.system?.hp?.max || 0;
        const newHP = Math.min(currentHP + hpRecovery, maxHP);
        updateData['system.hp.value'] = newHP;
      }

      // Recover Vitality Points
      if (vitalityRecovery > 0) {
        const currentVitality = actor.system?.vp?.value || 0;
        const maxVitality = actor.system?.vp?.max || 0;
        const newVitality = Math.min(currentVitality + vitalityRecovery, maxVitality);
        updateData['system.vp.value'] = newVitality;
      }

      // Single atomic update
      if (Object.keys(updateData).length > 0) {
        await ActorEngine.updateActor(actor, updateData);
      }

      return {
        success: true,
        hpRecovered: hpRecovery,
        vitalityRecovered: vitalityRecovery,
        actor
      };
    } catch (err) {
      SWSELogger.error('Recovery failed', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Hook called when rest is completed
   * @private
   */
  static async onRestCompleted(data) {
    if (!game.settings.get(NS, 'recoveryEnabled')) {return;}

    const requiresFullRest = game.settings.get(NS, 'recoveryRequiresFullRest');
    const isFullRest = data.isFullRest || data.duration >= 480; // 8 hours in minutes

    if (requiresFullRest && !isFullRest) {return;}

    const timing = game.settings.get(NS, 'recoveryTiming');
    if (timing === 'afterRest' || timing === 'both') {
      // Recover all actors
      for (const actor of game.actors) {
        if (actor.type === 'character') {
          await this.performRecovery(actor);
        }
      }
    }
  }
}
