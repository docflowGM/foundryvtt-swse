/**
 * Feat Actions Mapper
 * Maps feat-granted combat actions to character abilities
 */

import featActions from '../../data/feat-combat-actions.json' assert { type: 'json' };

export class FeatActionsMapper {
  /**
   * Get all feat actions
   * @returns {Object} All feat action definitions
   */
  static getAllFeatActions() {
    return featActions;
  }

  /**
   * Get actions granted by a specific feat
   * @param {string} featName - Name of the feat
   * @returns {Array} Array of action objects
   */
  static getActionsForFeat(featName) {
    const actions = [];

    for (const [key, action] of Object.entries(featActions)) {
      if (action.requiredFeat === featName || action.requiredFeat === null) {
        actions.push({
          ...action,
          key: key
        });
      }
    }

    return actions;
  }

  /**
   * Get all actions available to an actor based on their feats and talents
   * @param {Actor} actor - The actor to check
   * @returns {Array} Array of available actions
   */
  static getAvailableActions(actor) {
    if (!actor || !actor.items) return [];

    const featsAndTalents = actor.items.filter(i => i.type === 'feat' || i.type === 'talent');
    const availableActions = [];

    // Add actions that don't require a feat/talent (like Total Defense, Defensive Fighting)
    for (const [key, action] of Object.entries(featActions)) {
      if (action.requiredFeat === null && !action.requiredTalent) {
        availableActions.push({
          ...action,
          key: key,
          source: 'universal'
        });
      }
    }

    // Add actions from character's feats and talents
    for (const item of featsAndTalents) {
      for (const [key, action] of Object.entries(featActions)) {
        // Check if this action requires this specific feat
        if (action.requiredFeat === item.name) {
          availableActions.push({
            ...action,
            key: key,
            source: item.name,
            itemId: item.id,
            itemType: item.type
          });
        }
        // Check if this action requires this specific talent
        if (action.requiredTalent === item.name) {
          availableActions.push({
            ...action,
            key: key,
            source: item.name,
            itemId: item.id,
            itemType: item.type
          });
        }
      }
    }

    return availableActions;
  }

  /**
   * Get toggleable feat actions for an actor
   * @param {Actor} actor - The actor to check
   * @returns {Array} Array of toggleable actions
   */
  static getToggleableActions(actor) {
    const available = this.getAvailableActions(actor);
    return available.filter(action => action.toggleable === true);
  }

  /**
   * Get variable feat actions for an actor
   * @param {Actor} actor - The actor to check
   * @returns {Array} Array of variable actions
   */
  static getVariableActions(actor) {
    const available = this.getAvailableActions(actor);
    return available.filter(action => action.variable === true);
  }

  /**
   * Apply action effects to actor
   * @param {Actor} actor - The actor to modify
   * @param {string} actionKey - Key of the action to apply
   * @param {number} variableValue - Value for variable actions
   * @returns {Promise<void>}
   */
  static async applyActionEffects(actor, actionKey, variableValue = 0) {
    const action = featActions[actionKey];
    if (!action) return;

    const effects = [];

    for (const effect of action.effects) {
      let value = effect.value;

      // Handle formula-based effects
      if (effect.formula) {
        // Replace {value} with variableValue
        const formula = effect.formula
          .replace(/{value}/g, variableValue)
          .replace(/{value\*(\d+)}/g, (match, multiplier) => variableValue * parseInt(multiplier))
          .replace(/{dex_mod}/g, actor.system.attributes?.dex?.mod || 0);

        try {
          value = eval(formula);
        } catch (e) {
          console.warn(`SWSE | Failed to evaluate formula: ${formula}`, e);
          value = 0;
        }
      }

      // Create active effect based on type
      if (effect.type === 'bonus' || effect.type === 'penalty') {
        effects.push({
          key: effect.target,
          mode: 2, // ADD
          value: value,
          priority: 20
        });
      }
    }

    // Create or update active effect on actor
    if (effects.length > 0) {
      const effectData = {
        name: action.name,
        icon: 'icons/svg/upgrade.svg',
        changes: effects,
        disabled: false,
        duration: {},
        flags: {
          swse: {
            type: 'feat-action',
            actionKey: actionKey,
            variableValue: variableValue
          }
        }
      };

      await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
    }
  }

  /**
   * Remove action effects from actor
   * @param {Actor} actor - The actor to modify
   * @param {string} actionKey - Key of the action to remove
   * @returns {Promise<void>}
   */
  static async removeActionEffects(actor, actionKey) {
    const effects = actor.effects.filter(e =>
      e.flags?.swse?.type === 'feat-action' &&
      e.flags?.swse?.actionKey === actionKey
    );

    if (effects.length > 0) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', effects.map(e => e.id));
    }
  }

  /**
   * Toggle an action on/off
   * @param {Actor} actor - The actor to modify
   * @param {string} actionKey - Key of the action to toggle
   * @returns {Promise<boolean>} New toggled state
   */
  static async toggleAction(actor, actionKey) {
    const action = featActions[actionKey];
    if (!action || !action.toggleable) return false;

    // Check if effect already exists
    const existingEffect = actor.effects.find(e =>
      e.flags?.swse?.type === 'feat-action' &&
      e.flags?.swse?.actionKey === actionKey
    );

    if (existingEffect) {
      // Remove effect (toggle off)
      await this.removeActionEffects(actor, actionKey);
      return false;
    } else {
      // Add effect (toggle on)
      await this.applyActionEffects(actor, actionKey);
      return true;
    }
  }

  /**
   * Update variable action value
   * @param {Actor} actor - The actor to modify
   * @param {string} actionKey - Key of the action to update
   * @param {number} value - New value
   * @returns {Promise<void>}
   */
  static async updateVariableAction(actor, actionKey, value) {
    const action = featActions[actionKey];
    if (!action || !action.variable) return;

    // Remove existing effect
    await this.removeActionEffects(actor, actionKey);

    // Apply with new value
    if (value > 0) {
      await this.applyActionEffects(actor, actionKey, value);
    }
  }

  /**
   * Get feat actions grouped by type (for display)
   * @param {Actor} actor - The actor to check
   * @returns {Object} Actions grouped by type
   */
  static getActionsByType(actor) {
    const available = this.getAvailableActions(actor);

    return {
      passive: available.filter(a => a.actionType === 'passive'),
      modifier: available.filter(a => a.actionType === 'modifier'),
      swift: available.filter(a => a.actionType === 'swift'),
      standard: available.filter(a => a.actionType === 'standard'),
      fullRound: available.filter(a => a.actionType === 'full-round'),
      reaction: available.filter(a => a.actionType === 'reaction')
    };
  }
}
