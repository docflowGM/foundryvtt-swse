/**
 * Destiny Effects Utility
 * Handles instant and procedural effects triggered by Destiny Point spending
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 */

import { SWSELogger } from './logger.js';
import { SWSEActiveEffectsManager } from '../combat/active-effects-manager.js';
import { createChatMessage } from '../core/document-api-v13.js';
import { RollEngine } from '../engine/roll-engine.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';

export class DestinyEffects {

  /* -------------------------------------------------------------------------- */
  /* INSTANT EFFECTS (Procedural)                                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Auto-crit: Next attack automatically crits
   * Implemented as a flag that gets checked in roll handlers
   */
  static async autoCrit(actor) {
    await actor.setFlag('foundryvtt-swse', 'destinyAutoCrit', true);

    createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${actor.name}</strong> uses Destiny to guarantee a critical hit on their next attack!</p>`,
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

  /**
   * Auto-miss: Force an enemy to miss on their next attack against this character
   * Implemented as a temporary AC/Defense bonus or flag for GM tracking
   */
  static async autoMiss(actor) {
    await actor.setFlag('foundryvtt-swse', 'destinyAutoMiss', true);

    createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${actor.name}</strong> uses Destiny to guarantee an attacker misses their next attack!</p>`,
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

  /**
   * Act out of turn: Take an action outside normal initiative order
   */
  static async actOutOfTurn(actor) {
    await actor.setFlag('foundryvtt-swse', 'destinyActOutOfTurn', true);

    createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${actor.name}</strong> uses Destiny to act out of turn!</p>`,
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

  /**
   * Gain Force Points: Restore 1d6 Force Points
   * PHASE 7: Routed through ActorEngine for governance
   */
  static async gainForcePointsFromDestiny(actor) {
    const fp = actor.system.forcePoints;
    if (!fp) {
      ui.notifications.warn(`${actor.name} cannot gain Force Points.`);
      return;
    }

    // Roll 1d6 for Force Points
    const roll = await RollEngine.safeRoll('1d6');
    if (!roll) {
      ui.notifications.error('Force Points roll failed');
      return;
    }
    const gained = roll.total;

    // PHASE 7: Gain through ActorEngine (atomic)
    const result = await ActorEngine.gainForcePoints(actor, gained);
    const actualGain = result.gained;

    createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${actor.name}</strong> uses Destiny to gain <strong>${actualGain}</strong> Force Points!</p>
                <p><strong>Roll:</strong> ${roll.formula} = ${roll.total}</p>
                <p><strong>Force Points:</strong> ${result.current}/${result.max}</p>`,
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

  /**
   * Take damage for ally: This character takes damage instead of an adjacent ally
   * Marked as a flag for GM to apply manually when needed
   */
  static async takeDamageForAlly(actor) {
    await actor.setFlag('foundryvtt-swse', 'destinyTakeDamageForAlly', true);

    createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${actor.name}</strong> uses Destiny to take damage for an ally instead!</p>`,
      style: CONST.CHAT_MESSAGE_STYLES.OOC
    });
  }

  /* -------------------------------------------------------------------------- */
  /* TIMED EFFECTS (via Active Effects)                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Apply a timed destiny bonus effect
   */
  static async applyTimedBonus(actor, effectKey) {
    return SWSEActiveEffectsManager.applyDestinyEffect(actor, effectKey);
  }

  /**
   * Clear instant effect flags (when used or reset)
   */
  static async clearInstantEffects(actor) {
    await actor.unsetFlag('foundryvtt-swse', 'destinyAutoCrit');
    await actor.unsetFlag('foundryvtt-swse', 'destinyAutoMiss');
    await actor.unsetFlag('foundryvtt-swse', 'destinyActOutOfTurn');
    await actor.unsetFlag('foundryvtt-swse', 'destinyTakeDamageForAlly');
  }

  /**
   * Check if character has an active instant effect
   */
  static hasInstantEffect(actor, effectType) {
    return actor.getFlag('foundryvtt-swse', `destiny${effectType}`) === true;
  }

  /* -------------------------------------------------------------------------- */
  /* EFFECT REGISTRY                                                            */
  /* -------------------------------------------------------------------------- */

  static INSTANT_EFFECTS = {
    'auto-crit': {
      name: 'Auto Crit',
      icon: 'icons/svg/explosion.svg',
      description: 'Your next attack automatically critically hits',
      handler: 'autoCrit',
      duration: 'until used'
    },
    'auto-miss': {
      name: 'Auto Miss',
      icon: 'icons/svg/shield.svg',
      description: 'Force next attack against you to miss',
      handler: 'autoMiss',
      duration: 'until used'
    },
    'act-out-of-turn': {
      name: 'Act Out of Turn',
      icon: 'icons/svg/lightning.svg',
      description: 'Take an action outside normal initiative order',
      handler: 'actOutOfTurn',
      duration: 'until used'
    },
    'gain-force-points': {
      name: 'Gain Force Points',
      icon: 'icons/svg/crystal-ball.svg',
      description: 'Restore 1d6 Force Points',
      handler: 'gainForcePoints',
      duration: 'immediate'
    },
    'take-damage-for-ally': {
      name: 'Take Damage for Ally',
      icon: 'icons/svg/heart.svg',
      description: 'Take damage instead of an adjacent ally',
      handler: 'takeDamageForAlly',
      duration: 'until used'
    }
  };

  static TIMED_EFFECTS = {
    'attack-bonus': {
      name: 'Destiny: Attack Bonus',
      icon: 'icons/svg/sword.svg',
      description: '+2 to all attack rolls (24 hours)',
      handler: 'applyTimedBonus',
      key: 'destiny-attack-bonus'
    },
    'defense-bonus': {
      name: 'Destiny: Defense Bonus',
      icon: 'icons/svg/shield.svg',
      description: '+2 to all defenses (24 hours)',
      handler: 'applyTimedBonus',
      key: 'destiny-defense-bonus'
    },
    'noble-sacrifice': {
      name: 'Noble Sacrifice',
      icon: 'icons/svg/heart.svg',
      description: 'Grant allies +2 to defenses (24 hours)',
      handler: 'applyTimedBonus',
      key: 'noble-sacrifice'
    },
    'vengeance': {
      name: 'Vengeance',
      icon: 'icons/svg/explosion.svg',
      description: '+3 to attack rolls (24 hours)',
      handler: 'applyTimedBonus',
      key: 'vengeance'
    }
  };

  /**
   * Get all available effects (instant + timed)
   */
  static getAllEffects() {
    return {
      instant: this.INSTANT_EFFECTS,
      timed: this.TIMED_EFFECTS
    };
  }

  /**
   * Trigger an effect by key
   */
  static async triggerEffect(actor, effectKey) {
    // Check instant effects
    if (this.INSTANT_EFFECTS[effectKey]) {
      const config = this.INSTANT_EFFECTS[effectKey];
      const handler = this[config.handler];
      if (handler && typeof handler === 'function') {
        return handler.call(this, actor);
      }
    }

    // Check timed effects
    if (this.TIMED_EFFECTS[effectKey]) {
      const config = this.TIMED_EFFECTS[effectKey];
      return this.applyTimedBonus(actor, config.key);
    }

    SWSELogger.warn(`Unknown destiny effect: ${effectKey}`);
    return false;
  }
}

window.DestinyEffects = DestinyEffects;
