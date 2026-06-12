/**
 * TalentActionLinker - Links active talents to base actions
 * Enables 418 talents to enhance existing action cards instead of creating duplicates
 *
 * When a character has a talent that links to an action (e.g., "Adept Negotiator" → "persuasion-vs-will"),
 * this system:
 * 1. Detects which talents enhance the action
 * 2. Shows bonuses on the action card
 * 3. Applies bonuses when rolling the action
 */

class TalentActionLinker {
  static MAPPING = null;
  static ABILITIES = null;

  /**
   * Load the talent-action-links mapping and talent abilities
   */
  static async initialize() {
    try {
      const response = await fetch('systems/foundryvtt-swse/data/talent-action-links.json');
      this.MAPPING = await response.json();
      console.log(`[TalentActionLinker] Loaded mapping for ${this.MAPPING.totalTalents} talents`);
    } catch (error) {
      console.error('[TalentActionLinker] Failed to load talent-action-links.json', error);
      this.MAPPING = { talentToAction: {}, actionToTalents: {} };
    }

    // Load talent abilities for bonus values
    try {
      const abilitiesResponse = await fetch('systems/foundryvtt-swse/data/talent-granted-abilities.json');
      this.ABILITIES = await abilitiesResponse.json();
      console.log(`[TalentActionLinker] Loaded ${this.ABILITIES?._meta?.totalAbilities || 0} talent abilities`);
    } catch (error) {
      console.error('[TalentActionLinker] Failed to load talent-granted-abilities.json', error);
      this.ABILITIES = { abilities: {} };
    }
  }

  /**
   * Get all talents linked to a specific action
   * @param {Actor} actor - Character actor
   * @param {string} actionId - The base action ID (e.g., 'persuasion-check')
   * @returns {Array} Array of talent names and their bonuses
   */
  static getTalentsForAction(actor, actionId) {
    if (!actor.items) {return [];}

    const linkedTalents = [];
    const talentNames = actor.items
      .filter(item => item.type === 'talent')
      .map(item => item.name);

    // Check which talents link to this action
    for (const talentName of talentNames) {
      const linkedAction = this.MAPPING.talentToAction[talentName];
      if (linkedAction === actionId) {
        linkedTalents.push(talentName);
      }
    }

    return linkedTalents;
  }

  /**
   * Calculate bonus for a specific action from linked talents
   * @param {Actor} actor - Character actor
   * @param {string} actionId - The base action ID
   * @returns {Object} Bonus information { value, talents, description, details }
   */
  static calculateBonusForAction(actor, actionId) {
    const linkedTalents = this.getTalentsForAction(actor, actionId);
    if (linkedTalents.length === 0) {
      return { value: 0, talents: [], description: '', details: [] };
    }

    let totalBonus = 0;
    const bonusDetails = [];

    // Look up actual bonus values from talent-granted-abilities.json
    for (const talentName of linkedTalents) {
      const ability = this._findAbilityForTalent(talentName);

      if (ability) {
        // Only numeric, always-bonus metadata should contribute to the generic
        // action linker. Contextual/reminder talent cards must not silently become
        // a fake +1 just because they are linked to a base action.
        let talentBonus = 0;

        if (ability.contributesGenericBonus !== false) {
          if (Number.isFinite(Number(ability.roll?.conditionalBonus?.bonus))) {
            talentBonus = Number(ability.roll.conditionalBonus.bonus);
          } else if (Array.isArray(ability.effects)) {
            const bonusEffect = ability.effects.find(e =>
              (e.type === 'skillBonus' || e.type === 'attackBonus' || e.type === 'bonus')
              && Number.isFinite(Number(e.value))
            );
            if (bonusEffect) {
              talentBonus = Number(bonusEffect.value);
            }
          }
        }

        totalBonus += talentBonus;
        bonusDetails.push({ name: talentName, bonus: talentBonus, ability: ability });
      } else {
        // Unknown talent action links are display-only until metadata proves a
        // numeric modifier. Do not invent a +1.
        bonusDetails.push({ name: talentName, bonus: 0, ability: null });
      }
    }

    return {
      value: totalBonus,
      talents: linkedTalents,
      description: `+${totalBonus} from ${linkedTalents.length} linked talent${linkedTalents.length > 1 ? 's' : ''}`,
      talentList: linkedTalents.join(', '),
      details: bonusDetails
    };
  }

  /**
   * Find ability definition for a talent by name
   * @param {string} talentName - The talent name
   * @returns {Object|null} Ability definition or null
   * @private
   */
  static _findAbilityForTalent(talentName) {
    if (!this.ABILITIES?.abilities) {return null;}

    // Search by talent name (abilities are keyed by ID, but have talentName property)
    for (const [id, ability] of Object.entries(this.ABILITIES.abilities)) {
      if (ability.talentName === talentName) {
        return ability;
      }
    }

    return null;
  }

  /**
   * Enhance an action card with linked talent bonuses
   * Call this when rendering action cards to add talent information
   * @param {Object} actionData - The action card data
   * @param {Actor} actor - Character actor
   * @returns {Object} Enhanced action data with talent bonuses
   */
  static enhanceActionCard(actionData, actor) {
    if (!actionData.id || !actor) {return actionData;}

    const linkedTalentData = this.calculateBonusForAction(actor, actionData.id);

    if (linkedTalentData.talents.length > 0) {
      actionData.linkedTalents = linkedTalentData.talents;
      actionData.talentBonus = linkedTalentData.value;
      actionData.talentBonusDescription = linkedTalentData.description;
      actionData.hasLinkedTalents = true;
    }

    return actionData;
  }

  /**
   * Get all actions enhanced by a specific talent
   * @param {string} talentName - The talent name
   * @returns {Array} Array of action IDs this talent enhances
   */
  static getActionsForTalent(talentName) {
    const actionId = this.MAPPING.talentToAction[talentName];
    return actionId ? [actionId] : [];
  }

  /**
   * Check if a talent has a linked action
   * @param {string} talentName - The talent name
   * @returns {boolean}
   */
  static isTalentLinked(talentName) {
    return talentName in this.MAPPING.talentToAction;
  }

  /**
   * Get detailed information about linked talents for display
   * @param {Actor} actor - Character actor
   * @param {string} actionId - The base action ID
   * @returns {Array} Array of talent objects with bonus info
   */
  static getLinkedTalentDetails(actor, actionId) {
    const linkedTalents = this.getTalentsForAction(actor, actionId);
    const details = [];

    for (const talentName of linkedTalents) {
      const talentItem = actor.items.find(i => i.type === 'talent' && i.name === talentName);
      if (talentItem) {
        details.push({
          name: talentName,
          description: talentItem.system?.description || talentItem.data?.description || '',
          icon: talentItem.img || 'icons/svg/item-bag.svg'
        });
      }
    }

    return details;
  }
}

// Initialize on load
Hooks.once('ready', () => {
  TalentActionLinker.initialize();
});

// Export for use in other modules (ES6 and CommonJS)
export default TalentActionLinker;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TalentActionLinker;
}
