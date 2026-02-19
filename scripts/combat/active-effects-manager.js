/**
 * SWSE Active Effects Manager — Foundry v13+ Refactor
 * - Structured updates (B3 format)
 * - v13-safe document handling
 * - Condition & combat effects rewritten
 * - Token HUD integration modernized
 * - Preps for custom SWSE actor effect engine
 */

import { swseLogger } from '../utils/logger.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';

export class SWSEActiveEffectsManager {

  /* -------------------------------------------------------------------------- */
  /* UTILITIES                                                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Build a modern Structured Active Effect
   */
  static _buildEffect(actor, {
    name,
    icon,
    updates = {},
    flags = {},
    duration = {},
    origin = actor?.uuid
  }) {
    return {
      name,
      icon,
      origin,
      duration,
      disabled: false,
      updates,               // B3 format
      flags: {
        swse: { ...flags }
      }
    };
  }

  /**
   * Apply HUD icon to all active tokens safely
   */
  static async _applyTokenStatus(actor, icon) {
    for (const token of actor.getActiveTokens()) {
      await token.toggleEffect(icon, { active: true });
    }
  }

  /**
   * Remove all condition-related icons from tokens
   */
  static async _removeTokenStatus(actor, pattern = 'conditions/') {
    for (const token of actor.getActiveTokens()) {
      const current = token.document.texture?.effects ?? token.document.effects ?? [];
      const filtered = current.filter(icon => !icon.includes(pattern));
      await token.document.update({ effects: filtered });
    }
  }

  /* -------------------------------------------------------------------------- */
  /* CONDITION EFFECTS (Structured updates)                                      */
  /* -------------------------------------------------------------------------- */

  static CONDITION_EFFECTS = {
    normal: {
      name: 'Normal',
      icon: 'systems/foundryvtt-swse/icons/conditions/normal.svg',
      updates: {}
    },
    '-1': {
      name: 'Injured (-1)',
      icon: 'systems/foundryvtt-swse/icons/conditions/injured-1.svg',
      updates: {
        'system.conditionPenalty': { mode: 'ADD', value: -1 }
      },
      flags: { conditionTrack: '-1', statusId: 'condition-1' }
    },
    '-2': {
      name: 'Wounded (-2)',
      icon: 'systems/foundryvtt-swse/icons/conditions/injured-2.svg',
      updates: {
        'system.conditionPenalty': { mode: 'ADD', value: -2 }
      },
      flags: { conditionTrack: '-2', statusId: 'condition-2' }
    },
    '-5': {
      name: 'Severely Wounded (-5)',
      icon: 'systems/foundryvtt-swse/icons/conditions/injured-5.svg',
      updates: {
        'system.conditionPenalty': { mode: 'ADD', value: -5 }
      },
      flags: { conditionTrack: '-5', statusId: 'condition-5' }
    },
    '-10': {
      name: 'Critical (-10)',
      icon: 'systems/foundryvtt-swse/icons/conditions/injured-10.svg',
      updates: {
        'system.conditionPenalty': { mode: 'ADD', value: -10 }
      },
      flags: { conditionTrack: '-10', statusId: 'condition-10' }
    },
    helpless: {
      name: 'Helpless',
      icon: 'systems/foundryvtt-swse/icons/conditions/helpless.svg',
      updates: {
        'system.conditionPenalty': { mode: 'ADD', value: -10 },
        'system.defenses.reflex.bonus': { mode: 'ADD', value: -10 }
      },
      flags: { conditionTrack: 'helpless', statusId: 'helpless' }
    }
  };

  /* -------------------------------------------------------------------------- */
  /* COMBAT ACTION EFFECTS                                                      */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /* DESTINY EFFECTS (Timed bonuses from Destiny Point spending)                */
  /* -------------------------------------------------------------------------- */

  static DESTINY_EFFECTS = {
    'destiny-attack-bonus': {
      name: 'Destiny: Attack Bonus',
      icon: 'icons/svg/sword.svg',
      duration: { hours: 24 },
      updates: {
        'system.attackBonus': { mode: 'ADD', value: 2 }
      },
      flags: { destinyEffect: 'attack-bonus', duration: '24h' }
    },
    'destiny-defense-bonus': {
      name: 'Destiny: Defense Bonus',
      icon: 'icons/svg/shield.svg',
      duration: { hours: 24 },
      updates: {
        'system.defenses.reflex.misc': { mode: 'ADD', value: 2 },
        'system.defenses.fortitude.misc': { mode: 'ADD', value: 2 },
        'system.defenses.will.misc': { mode: 'ADD', value: 2 }
      },
      flags: { destinyEffect: 'defense-bonus', duration: '24h' }
    },
    'noble-sacrifice': {
      name: 'Noble Sacrifice',
      icon: 'icons/svg/heart.svg',
      duration: { hours: 24 },
      updates: {},
      flags: { destinyEffect: 'noble-sacrifice', duration: '24h' }
    },
    'vengeance': {
      name: 'Vengeance',
      icon: 'icons/svg/explosion.svg',
      duration: { hours: 24 },
      updates: {
        'system.attackBonus': { mode: 'ADD', value: 3 }
      },
      flags: { destinyEffect: 'vengeance', duration: '24h' }
    }
  };

  static COMBAT_ACTION_EFFECTS = {
    'fighting-defensively': {
      name: 'Fighting Defensively',
      icon: 'icons/svg/shield.svg',
      duration: { rounds: 1 },
      updates: {
        'system.defenses.reflex.bonus': { mode: 'ADD', value: 2 },
        'system.attackPenalty': { mode: 'ADD', value: -5 }
      },
      flags: { combatAction: 'fighting-defensively' }
    },
    'total-defense': {
      name: 'Total Defense',
      icon: 'icons/svg/shield.svg',
      duration: { rounds: 1 },
      updates: {
        'system.defenses.reflex.bonus': { mode: 'ADD', value: 5 },
        'system.defenses.fortitude.bonus': { mode: 'ADD', value: 5 },
        'system.defenses.will.bonus': { mode: 'ADD', value: 5 }
      },
      flags: { combatAction: 'total-defense' }
    },
    'cover-partial': {
      name: 'Partial Cover',
      icon: 'icons/svg/wall.svg',
      updates: {
        'system.defenses.reflex.bonus': { mode: 'ADD', value: 2 }
      },
      flags: { combatAction: 'cover-partial' }
    },
    'cover-full': {
      name: 'Full Cover',
      icon: 'icons/svg/wall.svg',
      updates: {
        'system.defenses.reflex.bonus': { mode: 'ADD', value: 5 }
      },
      flags: { combatAction: 'cover-full' }
    },
    'cover-improved': {
      name: 'Improved Cover',
      icon: 'icons/svg/wall.svg',
      updates: {
        'system.defenses.reflex.bonus': { mode: 'ADD', value: 10 }
      },
      flags: { combatAction: 'cover-improved' }
    }
  };

  /* -------------------------------------------------------------------------- */
  /* CONDITION HANDLING                                                         */
  /* -------------------------------------------------------------------------- */

  static _mapConditionStep(step) {
    if (typeof step === 'string') {return step;}
    return {
      0: 'normal',
      1: '-1',
      2: '-2',
      3: '-5',
      4: '-10',
      5: 'helpless'
    }[step] ?? 'normal';
  }

  static async applyConditionEffect(actor, condition) {
    await this.removeConditionEffects(actor);

    const key = this._mapConditionStep(condition);
    if (key === 'normal') {return;}

    const data = this.CONDITION_EFFECTS[key];
    if (!data) {return;}

    const effect = this._buildEffect(actor, {
      name: data.name,
      icon: data.icon,
      updates: data.updates,
      flags: data.flags
    });

    await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effect]);
    await this._applyTokenStatus(actor, data.icon);
  }

  static async removeConditionEffects(actor) {
    const toRemove = actor.effects.filter(e => e.flags?.swse?.conditionTrack);
    if (toRemove.length) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', toRemove.map(e => e.id));
    }
    await this._removeTokenStatus(actor);
  }

  /* -------------------------------------------------------------------------- */
  /* COMBAT ACTION TOGGLING                                                    */
  /* -------------------------------------------------------------------------- */

  static async toggleCombatActionEffect(actor, action) {
    const existing = actor.effects.find(e => e.flags?.swse?.combatAction === action);
    if (existing) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', [existing.id]);
      return;
    }

    const data = this.COMBAT_ACTION_EFFECTS[action];
    if (!data) {return;}

    const effect = this._buildEffect(actor, {
      name: data.name,
      icon: data.icon,
      updates: data.updates,
      flags: data.flags,
      duration: data.duration
    });

    await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effect]);
  }

  /* -------------------------------------------------------------------------- */
  /* DESTINY EFFECTS                                                            */
  /* -------------------------------------------------------------------------- */

  /**
   * Apply a Destiny bonus effect
   * @param {Actor} actor - The actor to apply the effect to
   * @param {string} effectKey - Key from DESTINY_EFFECTS
   * @returns {Promise<ActiveEffect>} - The created effect
   */
  static async applyDestinyEffect(actor, effectKey) {
    const data = this.DESTINY_EFFECTS[effectKey];
    if (!data) {
      swseLogger.warn(`Unknown destiny effect: ${effectKey}`);
      return null;
    }

    const effect = this._buildEffect(actor, {
      name: data.name,
      icon: data.icon,
      updates: data.updates,
      flags: data.flags,
      duration: data.duration
    });

    const result = await actor.createEmbeddedDocuments('ActiveEffect', [effect]);
    return result[0];
  }

  /**
   * Remove all Destiny bonus effects
   * @param {Actor} actor - The actor
   */
  static async removeDestinyEffects(actor) {
    const toRemove = actor.effects.filter(e => e.flags?.swse?.destinyEffect);
    if (toRemove.length) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', toRemove.map(e => e.id));
    }
  }

  /* -------------------------------------------------------------------------- */
  /* CUSTOM EFFECT CREATION                                                     */
  /* -------------------------------------------------------------------------- */

  static async createCustomEffect(actor, config) {
    const effect = this._buildEffect(actor, config);
    const result = await actor.createEmbeddedDocuments('ActiveEffect', [effect]);
    return result[0];
  }

  /* -------------------------------------------------------------------------- */
  /* INITIALIZATION                                                             */
  /* -------------------------------------------------------------------------- */

  static init() {
    swseLogger.log('SWSE | Initializing Active Effects Manager');

    // Register status effects for HUD
    this._registerStatusEffects();

    // Update conditions when CT changes
    Hooks.on('updateActor', (actor, changes) => {
      const ct = changes?.system?.conditionTrack?.current;
      if (ct !== undefined) {this.applyConditionEffect(actor, ct);}
    });

    // Remove expired effects at turn end
    Hooks.on('combatTurn', combat => {
      const actor = combat.combatant?.actor;
      if (!actor) {return;}

      const expired = actor.effects.filter(e =>
        e.duration?.rounds === 1 && !e.flags?.swse?.persistent
      );

      if (expired.length) {actor.deleteEmbeddedDocuments('ActiveEffect', expired.map(e => e.id));}
    });

    swseLogger.log('SWSE | Active Effects Manager Ready');
  }

  static _registerStatusEffects() {
    const effects = [];

    for (const [key, data] of Object.entries(this.CONDITION_EFFECTS)) {
      if (key === 'normal') {continue;}
      effects.push({
        id: data.flags?.statusId ?? key,
        label: data.name,
        icon: data.icon
      });
    }

    for (const [key, data] of Object.entries(this.COMBAT_ACTION_EFFECTS)) {
      effects.push({
        id: key,
        label: data.name,
        icon: data.icon
      });
    }

    for (const [key, data] of Object.entries(this.DESTINY_EFFECTS)) {
      effects.push({
        id: key,
        label: data.name,
        icon: data.icon
      });
    }

    CONFIG.statusEffects.push(...effects);
  }
}

window.SWSEActiveEffectsManager = SWSEActiveEffectsManager;
