/**
 * ModifierEngine — Centralized Modifier Aggregation
 *
 * Single source of truth for all modifiers:
 * - Feat bonuses
 * - Talent bonuses
 * - Species traits
 * - Encumbrance penalties
 * - Conditions
 * - Custom modifiers
 *
 * No mutations. Pure calculation. Fully derived.
 */

export class ModifierEngine {
  /**
   * Get all modifiers for a skill
   * @param {Actor} actor - Character actor
   * @param {string} skillKey - Skill key (e.g., 'acrobatics')
   * @returns {Array} Array of modifier objects
   */
  static getSkillModifiers(actor, skillKey) {
    const modifiers = [];

    // From feats
    const featMods = this._getFeatsModifiers(actor, skillKey);
    modifiers.push(...featMods);

    // From talents
    const talentMods = this._getTalentModifiers(actor, skillKey);
    modifiers.push(...talentMods);

    // From species
    const speciesMods = this._getSpeciesModifiers(actor, skillKey);
    modifiers.push(...speciesMods);

    // From encumbrance
    const encumMods = this._getEncumbranceModifiers(actor, skillKey);
    modifiers.push(...encumMods);

    // From conditions
    const condMods = this._getConditionModifiers(actor, skillKey);
    modifiers.push(...condMods);

    return modifiers;
  }

  /**
   * Calculate total modifier for a skill
   * @param {Actor} actor - Character actor
   * @param {string} skillKey - Skill key
   * @returns {number} Total modifier value
   */
  static calculateSkillModifier(actor, skillKey) {
    const modifiers = this.getSkillModifiers(actor, skillKey);
    return modifiers.reduce((sum, mod) => sum + (mod.value || 0), 0);
  }

  /**
   * Get modifiers from feats
   * @private
   */
  static _getFeatsModifiers(actor, skillKey) {
    const modifiers = [];
    const feats = actor.items?.filter(i => i.type === 'feat') || [];

    for (const feat of feats) {
      const skillBonus = feat.system?.skillBonuses?.[skillKey];
      if (skillBonus) {
        modifiers.push({
          source: 'feat',
          sourceName: feat.name,
          value: Number(skillBonus),
          description: `Feat: ${feat.name}`
        });
      }
    }

    return modifiers;
  }

  /**
   * Get modifiers from talents
   * @private
   */
  static _getTalentModifiers(actor, skillKey) {
    const modifiers = [];
    const talents = actor.items?.filter(i => i.type === 'talent') || [];

    for (const talent of talents) {
      const skillBonus = talent.system?.skillBonuses?.[skillKey];
      if (skillBonus) {
        modifiers.push({
          source: 'talent',
          sourceName: talent.name,
          value: Number(skillBonus),
          description: `Talent: ${talent.name}`
        });
      }
    }

    return modifiers;
  }

  /**
   * Get modifiers from species traits
   * @private
   */
  static _getSpeciesModifiers(actor, skillKey) {
    const modifiers = [];

    // Check species definition if available
    const species = actor.system?.species;
    if (species?.skillBonuses?.[skillKey]) {
      modifiers.push({
        source: 'species',
        sourceName: typeof species === 'string' ? species : species.name,
        value: Number(species.skillBonuses[skillKey]),
        description: `Species: ${typeof species === 'string' ? species : species.name}`
      });
    }

    return modifiers;
  }

  /**
   * Get modifiers from encumbrance
   * @private
   */
  static _getEncumbranceModifiers(actor, skillKey) {
    const modifiers = [];

    const encumbrance = actor.system?.derived?.encumbrance;
    if (!encumbrance) return modifiers;

    // Check if skill is affected by encumbrance penalty
    if (encumbrance.affectedSkills?.includes(skillKey) && encumbrance.skillPenalty) {
      modifiers.push({
        source: 'encumbrance',
        sourceName: encumbrance.label,
        value: encumbrance.skillPenalty,
        description: `Encumbrance (${encumbrance.label})`
      });
    }

    return modifiers;
  }

  /**
   * Get modifiers from conditions
   * @private
   */
  static _getConditionModifiers(actor, skillKey) {
    const modifiers = [];

    // Condition Track penalties could go here
    // For now, just a placeholder for future expansion
    const conditions = actor.system?.conditionTrack?.current ?? 0;
    if (conditions > 0) {
      // Apply condition penalties as needed
      const conditionPenalty = this._getConditionPenalty(conditions);
      if (conditionPenalty !== 0) {
        modifiers.push({
          source: 'condition',
          sourceName: 'Condition Track',
          value: conditionPenalty,
          description: `Condition Track (Step ${conditions})`
        });
      }
    }

    return modifiers;
  }

  /**
   * Calculate condition penalty based on current step
   * @private
   */
  static _getConditionPenalty(step) {
    // Example: -1 per condition step on certain skills
    // Adjust as needed based on game rules
    return 0; // Currently no automatic condition penalties
  }

  /**
   * Get modifiers for a defense
   * @param {Actor} actor - Character actor
   * @param {string} defenseType - Defense type (reflex, fortitude, will)
   * @returns {Array} Array of modifier objects
   */
  static getDefenseModifiers(actor, defenseType) {
    const modifiers = [];

    // From talents that affect defenses
    const talents = actor.items?.filter(i => i.type === 'talent') || [];
    for (const talent of talents) {
      const defenseBonus = talent.system?.defenseModifiers?.[defenseType];
      if (defenseBonus) {
        modifiers.push({
          source: 'talent',
          sourceName: talent.name,
          value: Number(defenseBonus),
          description: `Talent: ${talent.name}`
        });
      }
    }

    // From feats
    const feats = actor.items?.filter(i => i.type === 'feat') || [];
    for (const feat of feats) {
      const defenseBonus = feat.system?.defenseModifiers?.[defenseType];
      if (defenseBonus) {
        modifiers.push({
          source: 'feat',
          sourceName: feat.name,
          value: Number(defenseBonus),
          description: `Feat: ${feat.name}`
        });
      }
    }

    // Encumbrance-specific: Dex to Reflex loss when overloaded
    if (defenseType === 'reflex') {
      const encumbrance = actor.system?.derived?.encumbrance;
      if (encumbrance?.removeDexToReflex) {
        modifiers.push({
          source: 'encumbrance',
          sourceName: 'Encumbrance',
          value: 0, // This is a modifier (loss of existing bonus, not a direct penalty)
          description: 'Encumbrance: Dex bonus removed',
          type: 'dexRemoval'
        });
      }
    }

    return modifiers;
  }

  /**
   * Get all modifiers affecting initiative
   * @param {Actor} actor - Character actor
   * @returns {Array} Array of modifier objects
   */
  static getInitiativeModifiers(actor) {
    // Initiative uses Dex modifier + any bonuses
    // Affected by encumbrance if heavy/overloaded
    const modifiers = [];

    // Encumbrance penalty
    const encumbrance = actor.system?.derived?.encumbrance;
    if (encumbrance?.affectedSkills?.includes('initiative') && encumbrance.skillPenalty) {
      modifiers.push({
        source: 'encumbrance',
        sourceName: encumbrance.label,
        value: encumbrance.skillPenalty,
        description: `Encumbrance (${encumbrance.label})`
      });
    }

    // From feats/talents that affect initiative
    const allItems = [...(actor.items?.filter(i => i.type === 'feat') || []),
                       ...(actor.items?.filter(i => i.type === 'talent') || [])];

    for (const item of allItems) {
      const initiativeBonus = item.system?.initiativeBonus;
      if (initiativeBonus) {
        modifiers.push({
          source: item.type,
          sourceName: item.name,
          value: Number(initiativeBonus),
          description: `${item.type === 'feat' ? 'Feat' : 'Talent'}: ${item.name}`
        });
      }
    }

    return modifiers;
  }

  /**
   * Get modifier breakdown for display
   * Useful for UI popouts showing where bonuses come from
   * @param {Actor} actor - Character actor
   * @param {string} type - 'skill', 'defense', 'initiative'
   * @param {string} key - skill key, defense type, or null
   * @returns {Array} Formatted modifier array with descriptions
   */
  static getModifierBreakdown(actor, type, key) {
    let modifiers = [];

    switch (type) {
      case 'skill':
        modifiers = this.getSkillModifiers(actor, key);
        break;
      case 'defense':
        modifiers = this.getDefenseModifiers(actor, key);
        break;
      case 'initiative':
        modifiers = this.getInitiativeModifiers(actor);
        break;
    }

    return modifiers;
  }

  /**
   * Get total modifier for any calculated value
   * @param {Array} modifiers - Array of modifier objects
   * @returns {number} Sum of all modifiers
   */
  static totalModifiers(modifiers) {
    return Array.isArray(modifiers)
      ? modifiers.reduce((sum, mod) => sum + (mod.value || 0), 0)
      : 0;
  }
}
