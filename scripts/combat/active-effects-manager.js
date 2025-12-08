/**
 * Active Effects Manager for SWSE
 * Manages condition track effects, buffs, debuffs, and other Active Effects
 */

export class SWSEActiveEffectsManager {

    static getSelectedActor() {
        return canvas.tokens.controlled[0]?.actor;
    }


  /**
   * Condition Track effect configurations
   */
  static CONDITION_EFFECTS = {
    'normal': {
      name: 'Normal',
      icon: 'systems/swse/icons/conditions/normal.svg',
      changes: []
    },
    '-1': {
      name: 'Injured (-1)',
      icon: 'systems/swse/icons/conditions/injured-1.svg',
      changes: [
        { key: 'system.conditionPenalty', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1 }
      ],
      flags: {
        core: {
          statusId: 'condition-1'
        }
      }
    },
    '-2': {
      name: 'Wounded (-2)',
      icon: 'systems/swse/icons/conditions/injured-2.svg',
      changes: [
        { key: 'system.conditionPenalty', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 }
      ],
      flags: {
        core: {
          statusId: 'condition-2'
        }
      }
    },
    '-5': {
      name: 'Severely Wounded (-5)',
      icon: 'systems/swse/icons/conditions/injured-5.svg',
      changes: [
        { key: 'system.conditionPenalty', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -5 }
      ],
      flags: {
        core: {
          statusId: 'condition-5'
        }
      }
    },
    '-10': {
      name: 'Critical (-10)',
      icon: 'systems/swse/icons/conditions/injured-10.svg',
      changes: [
        { key: 'system.conditionPenalty', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -10 }
      ],
      flags: {
        core: {
          statusId: 'condition-10'
        }
      }
    },
    'helpless': {
      name: 'Helpless',
      icon: 'systems/swse/icons/conditions/helpless.svg',
      changes: [
        { key: 'system.conditionPenalty', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -10 },
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -10 }
      ],
      flags: {
        core: {
          statusId: 'helpless'
        }
      }
    }
  };

  /**
   * Combat action effects
   */
  static COMBAT_ACTION_EFFECTS = {
    'fighting-defensively': {
      name: 'Fighting Defensively',
      icon: 'icons/svg/shield.svg',
      duration: { turns: 1 },
      changes: [
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 },
        { key: 'system.attackPenalty', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -5 }
      ]
    },
    'total-defense': {
      name: 'Total Defense',
      icon: 'icons/svg/shield.svg',
      duration: { turns: 1 },
      changes: [
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 5 },
        { key: 'system.defenses.fortitude.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 5 },
        { key: 'system.defenses.will.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 5 }
      ]
    },
    'cover-partial': {
      name: 'Partial Cover',
      icon: 'icons/svg/wall.svg',
      changes: [
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 }
      ]
    },
    'cover-full': {
      name: 'Full Cover',
      icon: 'icons/svg/wall.svg',
      changes: [
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 5 }
      ]
    },
    'cover-improved': {
      name: 'Improved Cover',
      icon: 'icons/svg/wall.svg',
      changes: [
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 10 }
      ]
    }
  };

  /**
   * Convert numeric condition step to condition key
   * @param {number|string} step - The condition step (0-5) or key
   * @returns {string} The condition key
   * @private
   */
  static _getConditionKey(step) {
    // If already a string key, return it
    if (typeof step === 'string') return step;

    // Map numeric steps to condition keys
    const stepMap = {
      0: 'normal',
      1: '-1',
      2: '-2',
      3: '-5',
      4: '-10',
      5: 'helpless'
    };

    return stepMap[step] || 'normal';
  }

  /**
   * Apply condition track effect to an actor
   * @param {Actor} actor - The actor to apply the effect to
   * @param {string|number} condition - The condition track level (string key or numeric step)
   * @returns {Promise<void>}
   */
  static async applyConditionEffect(actor, condition) {
    // Remove any existing condition effects
    await this.removeConditionEffects(actor);

    // Convert numeric step to condition key if needed
    const conditionKey = this._getConditionKey(condition);

    // Don't create effect for 'normal' condition
    if (conditionKey === 'normal') return;

    const effectData = this.CONDITION_EFFECTS[conditionKey];
    if (!effectData) {
      swseLogger.warn(`SWSE | Unknown condition: ${condition} (mapped to: ${conditionKey})`);
      return;
    }

    // Create the active effect
    const effect = {
      name: effectData.name,
      icon: effectData.icon,
      origin: actor.uuid,
      changes: effectData.changes,
      flags: {
        swse: {
          conditionTrack: conditionKey
        },
        ...effectData.flags
      },
      disabled: false
    };

    await actor.createEmbeddedDocuments('ActiveEffect', [effect]);

    // Update token status effects
    const tokens = actor.getActiveTokens();
    for (const token of tokens) {
      await token.document.update({
        effects: [effectData.icon]
      });
    }
  }

  /**
   * Remove condition track effects from an actor
   * @param {Actor} actor - The actor to remove effects from
   * @returns {Promise<void>}
   */
  static async removeConditionEffects(actor) {
    const conditionEffects = actor.effects.filter(e =>
      e.flags?.swse?.conditionTrack
    );

    if (conditionEffects.length > 0) {
      const ids = conditionEffects.map(e => e.id);
      await actor.deleteEmbeddedDocuments('ActiveEffect', ids);
    }

    // Clear token status effects related to conditions
    const tokens = actor.getActiveTokens();
    for (const token of tokens) {
      const currentEffects = token.document.effects || [];
      const filteredEffects = currentEffects.filter(e =>
        !e.includes('conditions/')
      );
      await token.document.update({
        effects: filteredEffects
      });
    }
  }

  /**
   * Apply a combat action effect (Fighting Defensively, Total Defense, etc.)
   * @param {Actor} actor - The actor to apply the effect to
   * @param {string} actionType - The type of action
   * @returns {Promise<void>}
   */
  static async applyCombatActionEffect(actor, actionType) {
    const effectData = this.COMBAT_ACTION_EFFECTS[actionType];
    if (!effectData) {
      swseLogger.warn(`SWSE | Unknown combat action: ${actionType}`);
      return;
    }

    // Check if effect already exists
    const existing = actor.effects.find(e =>
      e.flags?.swse?.combatAction === actionType
    );
    if (existing) {
      ui.notifications.warn(`${actor.name} already has ${effectData.name} active`);
      return;
    }

    // Create the active effect
    const effect = {
      name: effectData.name,
      icon: effectData.icon,
      origin: actor.uuid,
      changes: effectData.changes,
      duration: effectData.duration || {},
      flags: {
        swse: {
          combatAction: actionType
        }
      },
      disabled: false
    };

    await actor.createEmbeddedDocuments('ActiveEffect', [effect]);
    ui.notifications.info(`${effectData.name} applied to ${actor.name}`);
  }

  /**
   * Remove a combat action effect
   * @param {Actor} actor - The actor to remove the effect from
   * @param {string} actionType - The type of action
   * @returns {Promise<void>}
   */
  static async removeCombatActionEffect(actor, actionType) {
    const effect = actor.effects.find(e =>
      e.flags?.swse?.combatAction === actionType
    );

    if (effect) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
    }
  }

  /**
   * Toggle a combat action effect
   * @param {Actor} actor - The actor to toggle the effect on
   * @param {string} actionType - The type of action
   * @returns {Promise<void>}
   */
  static async toggleCombatActionEffect(actor, actionType) {
    const effect = actor.effects.find(e =>
      e.flags?.swse?.combatAction === actionType
    );

    if (effect) {
      await this.removeCombatActionEffect(actor, actionType);
    } else {
      await this.applyCombatActionEffect(actor, actionType);
    }
  }

  /**
   * Initialize the Active Effects Manager
   */
  static init() {
    swseLogger.log('SWSE | Initializing Active Effects Manager');

    // Register custom status effects
    this._registerStatusEffects();

    // Hook into condition track changes
    Hooks.on('updateActor', async (actor, changes, options, userId) => {
      if (changes.system?.conditionTrack?.current !== undefined) {
        const newCondition = changes.system.conditionTrack.current;
        await this.applyConditionEffect(actor, newCondition);
      }
    });

    // Hook into combat turn to clean up expired effects
    Hooks.on('combatTurn', async (combat, updateData, updateOptions) => {
      const combatant = combat.combatant;
      if (!combatant?.actor) return;

      // Remove expired turn-based effects
      const expiredEffects = combatant.actor.effects.filter(e =>
        e.duration?.turns === 1 && !e.flags?.swse?.persistent
      );

      if (expiredEffects.length > 0) {
        const ids = expiredEffects.map(e => e.id);
        await combatant.actor.deleteEmbeddedDocuments('ActiveEffect', ids);
      }
    });

    swseLogger.log('SWSE | Active Effects Manager ready');
  }

  /**
   * Register custom status effects with Foundry
   * @private
   */
  static _registerStatusEffects() {
    const statusEffects = [];

    // Add condition track effects
    for (const [key, data] of Object.entries(this.CONDITION_EFFECTS)) {
      if (key === 'normal') continue;

      statusEffects.push({
        id: data.flags?.core?.statusId || key,
        label: data.name,
        icon: data.icon
      });
    }

    // Add combat action effects
    for (const [key, data] of Object.entries(this.COMBAT_ACTION_EFFECTS)) {
      statusEffects.push({
        id: key,
        label: data.name,
        icon: data.icon
      });
    }

    // Merge with existing status effects
    CONFIG.statusEffects = CONFIG.statusEffects.concat(statusEffects);
  }

  /**
   * Create a custom buff/debuff effect
   * @param {Actor} actor - The actor to apply the effect to
   * @param {object} effectData - The effect configuration
   * @returns {Promise<ActiveEffect>}
   */
  static async createCustomEffect(actor, effectData) {
    const effect = foundry.utils.mergeObject({
      origin: actor.uuid,
      disabled: false,
      flags: {
        swse: {
          custom: true
        }
      }
    }, effectData);

    const created = await actor.createEmbeddedDocuments('ActiveEffect', [effect]);
    return created[0];
  }

  /**
   * Get all active effects of a specific type from an actor
   * @param {Actor} actor - The actor to check
   * @param {string} type - The type of effect (conditionTrack, combatAction, custom)
   * @returns {ActiveEffect[]}
   */
  static getEffectsByType(actor, type) {
    return actor.effects.filter(e => e.flags?.swse?.[type]);
  }

  /**
   * Calculate total effect modifications for a specific attribute
   * @param {Actor} actor - The actor to calculate for
   * @param {string} attribute - The attribute key (e.g., 'system.defenses.reflex.bonus')
   * @returns {number}
   */
  static calculateEffectModifier(actor, attribute) {
    let total = 0;

    for (const effect of actor.effects) {
      if (effect.disabled) continue;

      for (const change of effect.changes) {
        if (change.key === attribute) {
          const value = Number(change.value) || 0;

          switch (change.mode) {
            case CONST.ACTIVE_EFFECT_MODES.ADD:
              total += value;
              break;
            case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
              total *= value;
              break;
            // Add other modes as needed
          }
        }
      }
    }

    return total;
  }
}

// Make available globally
window.SWSEActiveEffectsManager = SWSEActiveEffectsManager;
