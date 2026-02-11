/**
 * Species Trait Engine
 * Central engine for processing and applying species traits
 *
 * Design Philosophy:
 * - Traits are data, not code - we don't hardcode per-species logic
 * - ~15 trait handlers cover 95% of species abilities
 * - Hooks into existing systems (DefenseSystem, skill calculations)
 * - Text traits for display, data traits for mechanics
 */

import { SPECIES_TRAIT_TYPES, BONUS_TARGETS, CONDITIONS, SKILL_DISPLAY_NAMES } from './species-trait-types.js';
import { SWSELogger } from '../../../utils/logger.js';

/**
 * Main Species Trait Engine class
 */
export class SpeciesTraitEngine {

  /**
   * Process all species traits for an actor and return computed bonuses
   * @param {Actor} actor - The actor to process traits for
   * @returns {Object} Computed bonuses from all species traits
   */
  static computeTraitBonuses(actor) {
    const species = this.getActorSpecies(actor);
    if (!species) {return this._emptyBonuses();}

    const traitsData = this.getSpeciesTraitsData(species);
    if (!traitsData || traitsData.length === 0) {return this._emptyBonuses();}

    const bonuses = this._emptyBonuses();
    const context = this._buildContext(actor);

    for (const trait of traitsData) {
      try {
        this._processTrait(trait, bonuses, context, actor);
      } catch (err) {
        SWSELogger.error(`SpeciesTraitEngine | Error processing trait ${trait.id || trait.type}:`, err);
      }
    }

    return bonuses;
  }

  /**
   * Get the species item for an actor
   * @param {Actor} actor - The actor
   * @returns {Item|null} The species item or null
   */
  static getActorSpecies(actor) {
    if (!actor?.items) {return null;}
    return actor.items.find(i => i.type === 'species');
  }

  /**
   * Get structured traits data from a species item
   * @param {Item} species - The species item
   * @returns {Array} Array of trait data objects
   */
  static getSpeciesTraitsData(species) {
    if (!species?.system) {return [];}

    // First check for structured speciesTraitsData
    if (species.system.speciesTraitsData && Array.isArray(species.system.speciesTraitsData)) {
      return species.system.speciesTraitsData;
    }

    // Fall back to parsing text traits
    return this.parseTextTraits(species);
  }

  /**
   * Parse text-based racial traits into structured data
   * This enables gradual migration - existing text traits work automatically
   * @param {Item} species - The species item
   * @returns {Array} Parsed trait data
   */
  static parseTextTraits(species) {
    const traits = [];
    const system = species.system || {};

    // Get the racialTraits text array (from species-traits.json migration)
    const racialTraits = system.racialTraits || [];

    // If racialTraits is a string (legacy HTML), skip parsing for now
    if (typeof racialTraits === 'string') {
      return traits;
    }

    for (const traitText of racialTraits) {
      const parsed = this._parseTraitText(traitText, species.name);
      if (parsed) {
        traits.push(parsed);
      }
    }

    // Also parse legacy skillBonuses array if present
    if (system.skillBonuses && Array.isArray(system.skillBonuses)) {
      for (const skillBonus of system.skillBonuses) {
        const parsed = this._parseSkillBonusText(skillBonus, species.name);
        if (parsed) {
          traits.push(parsed);
        }
      }
    }

    return traits;
  }

  /**
   * Parse a single trait text string into structured data
   * @param {string} traitText - The trait text (e.g., "Wookiee-Endurance: A Wookiee gains a +2 species bonus to Fortitude Defense.")
   * @param {string} speciesName - The species name for source tracking
   * @returns {Object|null} Parsed trait data or null if not parseable
   */
  static _parseTraitText(traitText, speciesName) {
    if (!traitText || typeof traitText !== 'string') {return null;}

    const text = traitText.toLowerCase();
    const originalText = traitText;

    // Extract trait name from "Species-TraitName: Description" format
    const colonIndex = traitText.indexOf(':');
    const traitName = colonIndex > 0 ? traitText.substring(0, colonIndex).trim() : speciesName;
    const description = colonIndex > 0 ? traitText.substring(colonIndex + 1).trim() : traitText;

    // Generate unique ID
    const id = traitName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    // Try to parse different trait patterns
    let parsed = null;

    // Defense bonuses: "+X species bonus to [Defense] Defense"
    parsed = this._tryParseDefenseBonus(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Defense penalties: "-X species penalty to [Defense] Defense"
    parsed = this._tryParseDefensePenalty(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Skill bonuses: "+X species bonus on [Skill] checks"
    parsed = this._tryParseSkillBonus(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Rerolls: "may reroll any [Skill] check"
    parsed = this._tryParseReroll(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Conditional bonuses: "when reduced to half hit points"
    parsed = this._tryParseConditionalBonus(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Movement: "may fly with a speed of X squares"
    parsed = this._tryParseMovement(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Senses: "darkvision", "blindsense"
    parsed = this._tryParseSense(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Natural weapons: "natural claw attacks"
    parsed = this._tryParseNaturalWeapon(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Immunities: "immune to poison", "immune to Force powers"
    parsed = this._tryParseImmunity(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Resistance: "gains a +X species bonus to [Defense] against Force powers"
    parsed = this._tryParseResistance(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Regeneration: "regains hit points"
    parsed = this._tryParseRegeneration(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Amphibious/Environmental: "can breathe both air and water"
    parsed = this._tryParseEnvironmental(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Once per encounter: "once per encounter"
    parsed = this._tryParseOncePerEncounter(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Proficiency: "gains proficiency"
    parsed = this._tryParseProficiency(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Bonus feat (Human)
    parsed = this._tryParseFeatGrant(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // Bonus trained skill (Human)
    parsed = this._tryParseSkillGrant(text, id, traitName, originalText);
    if (parsed) {return parsed;}

    // If no pattern matched, return as a special action (narrative trait)
    return {
      type: SPECIES_TRAIT_TYPES.SPECIAL_ACTION,
      id: id,
      name: traitName,
      description: description,
      displayText: originalText,
      automated: false // Mark as not automated - just for display
    };
  }

  // =========================================================================
  // TRAIT PARSING HELPERS
  // =========================================================================

  static _tryParseDefenseBonus(text, id, name, originalText) {
    // Pattern: "+X species bonus to [Defense] Defense"
    const match = text.match(/\+(\d+)\s+species\s+bonus\s+to\s+(fortitude|reflex|will)\s+defense/i);
    if (match) {
      return {
        type: SPECIES_TRAIT_TYPES.BONUS,
        id: id,
        name: name,
        target: match[2].toLowerCase(),
        value: parseInt(match[1], 10),
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseDefensePenalty(text, id, name, originalText) {
    // Pattern: "-X species penalty to [Defense] Defense" or "takes a -X species penalty"
    const match = text.match(/[-–](\d+)\s+species\s+penalty\s+(?:to|on)\s+(fortitude|reflex|will)\s+defense/i);
    if (match) {
      return {
        type: SPECIES_TRAIT_TYPES.PENALTY,
        id: id,
        name: name,
        target: match[2].toLowerCase(),
        value: -parseInt(match[1], 10),
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseSkillBonus(text, id, name, originalText) {
    // Pattern: "+X species bonus on [Skill] checks"
    const match = text.match(/\+(\d+)\s+species\s+bonus\s+on\s+([a-z\s()]+?)\s+checks?/i);
    if (match) {
      const skillKey = this._normalizeSkillName(match[2].trim());
      if (skillKey) {
        return {
          type: SPECIES_TRAIT_TYPES.BONUS,
          id: id,
          name: name,
          target: skillKey,
          value: parseInt(match[1], 10),
          displayText: originalText,
          automated: true
        };
      }
    }

    // Also match "gains a +X species bonus to [Skill]" pattern
    const match2 = text.match(/gains?\s+a?\s*\+(\d+)\s+species\s+bonus\s+(?:to|on)\s+([a-z\s()]+?)(?:\s+checks?|\s+skill)?/i);
    if (match2) {
      const skillKey = this._normalizeSkillName(match2[2].trim());
      if (skillKey) {
        return {
          type: SPECIES_TRAIT_TYPES.BONUS,
          id: id,
          name: name,
          target: skillKey,
          value: parseInt(match2[1], 10),
          displayText: originalText,
          automated: true
        };
      }
    }
    return null;
  }

  static _tryParseReroll(text, id, name, originalText) {
    // Pattern: "may reroll any [Skill] check"
    const match = text.match(/may\s+(?:choose\s+to\s+)?reroll\s+(?:any\s+)?([a-z\s()]+?)\s+checks?/i);
    if (match) {
      const skillKey = this._normalizeSkillName(match[1].trim());
      if (skillKey) {
        const acceptWorse = text.includes('must accept') || text.includes('even if it is worse');
        return {
          type: SPECIES_TRAIT_TYPES.REROLL,
          id: id,
          name: name,
          scope: 'skill',
          skill: skillKey,
          frequency: 'atWill',
          acceptWorse: acceptWorse,
          displayText: originalText,
          automated: true
        };
      }
    }

    // Also match "may reroll an attack roll, skill check" pattern (Gungan Lucky)
    if (text.includes('reroll') && (text.includes('attack roll') || text.includes('skill check') || text.includes('ability check'))) {
      const isLimited = text.includes('once per encounter');
      return {
        type: isLimited ? SPECIES_TRAIT_TYPES.ONCE_PER_ENCOUNTER : SPECIES_TRAIT_TYPES.REROLL,
        id: id,
        name: name,
        scope: 'any',
        frequency: isLimited ? 'oncePerEncounter' : 'atWill',
        acceptWorse: text.includes('must accept'),
        effect: 'reroll',
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseConditionalBonus(text, id, name, originalText) {
    // Pattern: "when reduced to half hit points" or "when at half HP"
    if (text.includes('half hit points') || text.includes('half hp')) {
      // Extract the bonus
      const bonusMatch = text.match(/\+(\d+)\s+(?:species\s+)?bonus\s+(?:on|to)\s+([a-z\s]+?)(?:\s+rolls?|\s+checks?)?/i);
      if (bonusMatch) {
        let target = bonusMatch[2].trim().toLowerCase();

        // Normalize targets
        if (target.includes('melee attack')) {target = 'meleeAttack';} else if (target.includes('melee damage')) {target = 'meleeDamage';} else if (target.includes('attack')) {target = 'meleeAttack';} else if (target.includes('damage')) {target = 'meleeDamage';}

        return {
          type: SPECIES_TRAIT_TYPES.CONDITIONAL_BONUS,
          id: id,
          name: name,
          condition: CONDITIONS.HALF_HP,
          target: target,
          value: parseInt(bonusMatch[1], 10),
          displayText: originalText,
          automated: true
        };
      }
    }

    // Pattern: "while charging"
    if (text.includes('when charging') || text.includes('while charging')) {
      const bonusMatch = text.match(/\+(\d+)\s+(?:species\s+)?bonus\s+(?:on|to)\s+([a-z\s]+?)(?:\s+rolls?)?/i);
      if (bonusMatch) {
        let target = bonusMatch[2].trim().toLowerCase();
        if (target.includes('damage')) {target = 'meleeDamage';} else if (target.includes('attack')) {target = 'meleeAttack';}

        return {
          type: SPECIES_TRAIT_TYPES.CONDITIONAL_BONUS,
          id: id,
          name: name,
          condition: CONDITIONS.CHARGING,
          target: target,
          value: parseInt(bonusMatch[1], 10),
          displayText: originalText,
          automated: true
        };
      }
    }

    // Pattern: "after taking damage"
    if (text.includes('takes damage') || text.includes('after taking damage')) {
      const bonusMatch = text.match(/\+(\d+)\s+(?:species\s+)?bonus\s+(?:on|to)\s+([a-z\s]+?)(?:\s+rolls?)?/i);
      if (bonusMatch) {
        let target = bonusMatch[2].trim().toLowerCase();
        if (target.includes('damage')) {target = 'meleeDamage';}

        return {
          type: SPECIES_TRAIT_TYPES.CONDITIONAL_BONUS,
          id: id,
          name: name,
          condition: CONDITIONS.AFTER_DAMAGE,
          target: target,
          value: parseInt(bonusMatch[1], 10),
          duration: 'untilEndOfNextTurn',
          displayText: originalText,
          automated: true
        };
      }
    }
    return null;
  }

  static _tryParseMovement(text, id, name, originalText) {
    // Pattern: "may fly with a speed of X squares"
    const flyMatch = text.match(/may\s+fly\s+(?:with\s+)?(?:a\s+)?speed\s+(?:of\s+)?(\d+)\s+squares?\s*\(?(clumsy|poor|average|good|perfect)?\)?/i);
    if (flyMatch) {
      return {
        type: SPECIES_TRAIT_TYPES.MOVEMENT,
        id: id,
        name: name,
        mode: 'fly',
        speed: parseInt(flyMatch[1], 10),
        maneuverability: flyMatch[2]?.toLowerCase() || 'average',
        displayText: originalText,
        automated: true
      };
    }

    // Pattern: "gains a swim speed equal to its base speed"
    if (text.includes('swim speed')) {
      const speedMatch = text.match(/swim\s+speed\s+(?:of\s+)?(\d+)/i);
      return {
        type: SPECIES_TRAIT_TYPES.MOVEMENT,
        id: id,
        name: name,
        mode: 'swim',
        speed: speedMatch ? parseInt(speedMatch[1], 10) : 'base',
        displayText: originalText,
        automated: true
      };
    }

    // Pattern: "may glide"
    if (text.includes('may glide') || text.includes('glide wings')) {
      return {
        type: SPECIES_TRAIT_TYPES.MOVEMENT,
        id: id,
        name: name,
        mode: 'glide',
        effect: 'reducesFallingDamage',
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseSense(text, id, name, originalText) {
    // Darkvision: "ignores concealment caused by darkness"
    if (text.includes('darkvision') || text.includes('ignores concealment') && text.includes('darkness')) {
      return {
        type: SPECIES_TRAIT_TYPES.SENSE,
        id: id,
        name: name,
        sense: 'darkvision',
        displayText: originalText,
        automated: true
      };
    }

    // Blindsense: "gains blindsense out to X squares"
    const blindsenseMatch = text.match(/(?:gains?\s+)?blindsense\s+(?:out\s+)?(?:to\s+)?(\d+)\s+squares?/i);
    if (blindsenseMatch) {
      return {
        type: SPECIES_TRAIT_TYPES.SENSE,
        id: id,
        name: name,
        sense: 'blindsense',
        range: parseInt(blindsenseMatch[1], 10),
        displayText: originalText,
        automated: true
      };
    }

    // Force Sight (Miraluka)
    if (text.includes('force sight') || (text.includes('blind') && text.includes('perceives') && text.includes('force'))) {
      return {
        type: SPECIES_TRAIT_TYPES.SENSE,
        id: id,
        name: name,
        sense: 'forceSight',
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseNaturalWeapon(text, id, name, originalText) {
    // Pattern: "natural claw attacks that deal XdY damage"
    const clawMatch = text.match(/(?:natural\s+)?claw\s+attacks?\s+(?:that\s+)?deal\s+(\d+d\d+)\s+(?:points?\s+of\s+)?(\w+)\s+damage/i);
    if (clawMatch) {
      return {
        type: SPECIES_TRAIT_TYPES.NATURAL_WEAPON,
        id: id,
        name: name,
        weaponName: 'Claws',
        damage: clawMatch[1],
        damageType: clawMatch[2].toLowerCase(),
        displayText: originalText,
        automated: true
      };
    }

    // Generic natural weapon
    const weaponMatch = text.match(/natural\s+(\w+)\s+attacks?\s+(?:that\s+)?deal\s+(\d+d\d+)/i);
    if (weaponMatch) {
      return {
        type: SPECIES_TRAIT_TYPES.NATURAL_WEAPON,
        id: id,
        name: name,
        weaponName: weaponMatch[1],
        damage: weaponMatch[2],
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseImmunity(text, id, name, originalText) {
    // Pattern: "immune to poison", "immune to disease", "immune to Force powers"
    const immunityMatch = text.match(/(?:is\s+)?immune\s+to\s+(?:the\s+effects?\s+of\s+)?([a-z\s]+)/i);
    if (immunityMatch) {
      let effect = immunityMatch[1].trim().toLowerCase();

      // Normalize effect names
      if (effect.includes('force power')) {effect = 'force';} else if (effect.includes('poison')) {effect = 'poison';} else if (effect.includes('disease')) {effect = 'disease';}

      return {
        type: SPECIES_TRAIT_TYPES.IMMUNITY,
        id: id,
        name: name,
        effect: effect,
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseResistance(text, id, name, originalText) {
    // Pattern: "+X species bonus to [Defense] Defense against Force powers"
    const match = text.match(/\+(\d+)\s+species\s+bonus\s+to\s+(fortitude|reflex|will)\s+defense\s+against\s+([a-z\s]+)/i);
    if (match) {
      let againstType = match[3].trim().toLowerCase();
      if (againstType.includes('force power')) {againstType = 'force';}

      return {
        type: SPECIES_TRAIT_TYPES.RESISTANCE,
        id: id,
        name: name,
        defense: match[2].toLowerCase(),
        effect: againstType,
        bonus: parseInt(match[1], 10),
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseRegeneration(text, id, name, originalText) {
    // Pattern: "regains hit points equal to its level"
    if (text.includes('regains') && text.includes('hit points')) {
      const exceptions = [];
      if (text.includes('fire')) {exceptions.push('fire');}
      if (text.includes('acid')) {exceptions.push('acid');}

      const amountMatch = text.match(/regains?\s+(?:hit\s+points?\s+equal\s+to\s+its?\s+)?(\d+|level)/i);
      const amount = amountMatch ? amountMatch[1] : 'level';

      const isPerEncounter = text.includes('once per encounter');
      const isPerTurn = text.includes('start of each turn') || text.includes('at the start');

      return {
        type: SPECIES_TRAIT_TYPES.REGENERATION,
        id: id,
        name: name,
        amount: amount,
        frequency: isPerEncounter ? 'oncePerEncounter' : (isPerTurn ? 'onTurnStart' : 'onDamage'),
        exceptions: exceptions,
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseEnvironmental(text, id, name, originalText) {
    // Amphibious: "can breathe both air and water"
    if (text.includes('breathe') && (text.includes('water') || text.includes('air'))) {
      return {
        type: SPECIES_TRAIT_TYPES.ENVIRONMENTAL,
        id: id,
        name: name,
        environment: 'water',
        effect: 'breathe',
        displayText: originalText,
        automated: true
      };
    }

    // Cold/heat adaptation
    if (text.includes('cold') && (text.includes('adaptation') || text.includes('resistance'))) {
      return {
        type: SPECIES_TRAIT_TYPES.ENVIRONMENTAL,
        id: id,
        name: name,
        environment: 'cold',
        effect: 'resistance',
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseOncePerEncounter(text, id, name, originalText) {
    if (text.includes('once per encounter')) {
      // Try to determine the effect
      let effect = 'unknown';

      if (text.includes('ignore') && (text.includes('stun') || text.includes('daze'))) {
        effect = 'ignoreCondition';
      } else if (text.includes('reroll')) {
        effect = 'reroll';
      }

      return {
        type: SPECIES_TRAIT_TYPES.ONCE_PER_ENCOUNTER,
        id: id,
        name: name,
        effect: effect,
        used: false,
        displayText: originalText,
        automated: effect !== 'unknown'
      };
    }
    return null;
  }

  static _tryParseProficiency(text, id, name, originalText) {
    if (text.includes('proficiency') || text.includes('proficient')) {
      let category = 'unknown';

      if (text.includes('primitive weapon')) {category = 'primitiveWeapons';} else if (text.includes('simple weapon')) {category = 'simpleWeapons';} else if (text.includes('martial weapon')) {category = 'martialWeapons';} else if (text.includes('light armor')) {category = 'lightArmor';} else if (text.includes('medium armor')) {category = 'mediumArmor';} else if (text.includes('heavy armor')) {category = 'heavyArmor';}

      return {
        type: SPECIES_TRAIT_TYPES.PROFICIENCY,
        id: id,
        name: name,
        category: category,
        displayText: originalText,
        automated: category !== 'unknown'
      };
    }
    return null;
  }

  static _tryParseFeatGrant(text, id, name, originalText) {
    if (text.includes('bonus feat') && text.includes('1st level')) {
      return {
        type: SPECIES_TRAIT_TYPES.FEAT_GRANT,
        id: id,
        name: name,
        count: 1,
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  static _tryParseSkillGrant(text, id, name, originalText) {
    if (text.includes('additional trained skill') || text.includes('one additional trained skill')) {
      return {
        type: SPECIES_TRAIT_TYPES.SKILL_GRANT,
        id: id,
        name: name,
        count: 1,
        displayText: originalText,
        automated: true
      };
    }
    return null;
  }

  /**
   * Parse a skill bonus string like "+2 Perception"
   */
  static _parseSkillBonusText(bonusString, speciesName) {
    const match = bonusString.match(/([+-]?\d+)\s+(.+)/i);
    if (!match) {return null;}

    const value = parseInt(match[1], 10);
    const skillKey = this._normalizeSkillName(match[2].trim());

    if (!skillKey) {return null;}

    return {
      type: value >= 0 ? SPECIES_TRAIT_TYPES.BONUS : SPECIES_TRAIT_TYPES.PENALTY,
      id: `${speciesName}-skill-${skillKey}`.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: `${speciesName} ${match[2].trim()} Bonus`,
      target: skillKey,
      value: value,
      displayText: bonusString,
      automated: true
    };
  }

  /**
   * Normalize skill display name to skill key
   */
  static _normalizeSkillName(name) {
    const normalized = name.toLowerCase().trim();

    const skillMap = {
      'acrobatics': 'acrobatics',
      'climb': 'climb',
      'deception': 'deception',
      'endurance': 'endurance',
      'gather information': 'gatherInformation',
      'initiative': 'initiative',
      'jump': 'jump',
      'knowledge': 'knowledgeGalacticLore', // Default knowledge
      'knowledge (bureaucracy)': 'knowledgeBureaucracy',
      'knowledge (galactic lore)': 'knowledgeGalacticLore',
      'knowledge (life sciences)': 'knowledgeLifeSciences',
      'knowledge (physical sciences)': 'knowledgePhysicalSciences',
      'knowledge (social sciences)': 'knowledgeSocialSciences',
      'knowledge (tactics)': 'knowledgeTactics',
      'knowledge (technology)': 'knowledgeTechnology',
      'mechanics': 'mechanics',
      'perception': 'perception',
      'perform': 'perform', // Special - not in standard list
      'persuasion': 'persuasion',
      'pilot': 'pilot',
      'ride': 'ride',
      'stealth': 'stealth',
      'survival': 'survival',
      'swim': 'swim',
      'treat injury': 'treatInjury',
      'use computer': 'useComputer',
      'use the force': 'useTheForce',
      'intimidate': 'persuasion', // SWSE combines Intimidate into Persuasion
      'strength': 'strength', // For ability checks
      'str': 'str'
    };

    // Try exact match first
    if (skillMap[normalized]) {
      return skillMap[normalized];
    }

    // Try partial match for Knowledge skills
    for (const [key, value] of Object.entries(skillMap)) {
      if (normalized.includes(key.replace('knowledge ', ''))) {
        return value;
      }
    }

    return null;
  }

  // =========================================================================
  // TRAIT PROCESSING
  // =========================================================================

  /**
   * Process a single trait and add bonuses to the accumulator
   */
  static _processTrait(trait, bonuses, context, actor) {
    if (!trait.automated) {return;} // Skip non-automated traits

    switch (trait.type) {
      case SPECIES_TRAIT_TYPES.BONUS:
        this._handleBonus(trait, bonuses, context);
        break;
      case SPECIES_TRAIT_TYPES.PENALTY:
        this._handlePenalty(trait, bonuses, context);
        break;
      case SPECIES_TRAIT_TYPES.CONDITIONAL_BONUS:
        this._handleConditionalBonus(trait, bonuses, context, actor);
        break;
      case SPECIES_TRAIT_TYPES.RESISTANCE:
        this._handleResistance(trait, bonuses, context);
        break;
      case SPECIES_TRAIT_TYPES.FEAT_GRANT:
        this._handleFeatGrant(trait, bonuses, context);
        break;
      case SPECIES_TRAIT_TYPES.SKILL_GRANT:
        this._handleSkillGrant(trait, bonuses, context);
        break;
      // Other trait types are handled differently (not via bonuses)
      default:
        break;
    }
  }

  static _handleBonus(trait, bonuses, context) {
    const target = trait.target;
    const value = trait.value;

    // Defense bonuses
    if (['fortitude', 'reflex', 'will'].includes(target)) {
      bonuses.defenses[target] = (bonuses.defenses[target] || 0) + value;
    }
    // Ability bonuses
    else if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(target)) {
      bonuses.abilities[target] = (bonuses.abilities[target] || 0) + value;
    }
    // Skill bonuses
    else if (SKILL_DISPLAY_NAMES[target]) {
      bonuses.skills[target] = (bonuses.skills[target] || 0) + value;
    }
    // Combat bonuses
    else if (['meleeAttack', 'rangedAttack', 'meleeDamage', 'rangedDamage', 'grapple'].includes(target)) {
      bonuses.combat[target] = (bonuses.combat[target] || 0) + value;
    }
    // Initiative
    else if (target === 'initiative') {
      bonuses.skills.initiative = (bonuses.skills.initiative || 0) + value;
    }
  }

  static _handlePenalty(trait, bonuses, context) {
    // Penalties are just negative bonuses
    this._handleBonus({ ...trait, value: trait.value }, bonuses, context);
  }

  static _handleConditionalBonus(trait, bonuses, context, actor) {
    // Check if condition is met
    if (!this._checkCondition(trait.condition, actor)) {return;}

    // Apply the bonus
    this._handleBonus(trait, bonuses, context);
  }

  static _handleResistance(trait, bonuses, context) {
    // Resistances are stored separately for conditional application
    if (!bonuses.resistances) {bonuses.resistances = [];}
    bonuses.resistances.push({
      defense: trait.defense,
      effect: trait.effect,
      bonus: trait.bonus
    });
  }

  static _handleFeatGrant(trait, bonuses, context) {
    // Store feat grants for progression system to apply
    bonuses.featsToGrant.push({
      id: trait.id,
      name: trait.name,
      count: trait.count || 1,
      displayText: trait.displayText
    });
  }

  static _handleSkillGrant(trait, bonuses, context) {
    // Store skill grants for progression system to apply
    bonuses.skillsToGrant.push({
      id: trait.id,
      name: trait.name,
      count: trait.count || 1,
      displayText: trait.displayText
    });
  }

  static _checkCondition(condition, actor) {
    switch (condition) {
      case CONDITIONS.HALF_HP:
        const hp = actor.system?.hp;
        if (hp) {
          return hp.value <= Math.floor(hp.max / 2);
        }
        return false;
      // Other conditions would require combat context
      default:
        return false;
    }
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  static _buildContext(actor) {
    return {
      hp: actor.system?.hp,
      level: actor.system?.level || 1,
      inCombat: game.combat?.started && game.combat.combatants.some(c => c.actor?.id === actor.id)
    };
  }

  static _emptyBonuses() {
    return {
      abilities: {},    // { str: 0, dex: 0, ... }
      defenses: {},     // { fortitude: 0, reflex: 0, will: 0 }
      skills: {},       // { pilot: 0, perception: 0, ... }
      combat: {},       // { meleeAttack: 0, meleeDamage: 0, ... }
      resistances: [],  // [{ defense: 'will', effect: 'force', bonus: 5 }]
      senses: [],       // [{ type: 'darkvision' }, { type: 'blindsense', range: 6 }]
      movements: [],    // [{ mode: 'fly', speed: 6, maneuverability: 'clumsy' }]
      naturalWeapons: [], // [{ name: 'Claws', damage: '1d6', type: 'slashing' }]
      immunities: [],   // ['poison', 'disease']
      proficiencies: [], // ['primitiveWeapons']
      featsToGrant: [],  // [{ id: 'human-versatile', name: 'Bonus Feat', count: 1 }]
      skillsToGrant: []  // [{ id: 'human-skilled', name: 'Additional Trained Skill', count: 1 }]
    };
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /**
   * Get all automated traits for an actor's species
   * Returns traits that the engine can apply automatically
   */
  static getAutomatedTraits(actor) {
    const species = this.getActorSpecies(actor);
    if (!species) {return [];}

    const traits = this.getSpeciesTraitsData(species);
    return traits.filter(t => t.automated);
  }

  /**
   * Get all narrative/display-only traits for an actor's species
   * These require GM adjudication
   */
  static getNarrativeTraits(actor) {
    const species = this.getActorSpecies(actor);
    if (!species) {return [];}

    const traits = this.getSpeciesTraitsData(species);
    return traits.filter(t => !t.automated);
  }

  /**
   * Get traits that are usable (once per encounter, etc.)
   */
  static getUsableTraits(actor) {
    const species = this.getActorSpecies(actor);
    if (!species) {return [];}

    const traits = this.getSpeciesTraitsData(species);
    return traits.filter(t =>
      t.type === SPECIES_TRAIT_TYPES.ONCE_PER_ENCOUNTER ||
      t.type === SPECIES_TRAIT_TYPES.REROLL ||
      t.type === SPECIES_TRAIT_TYPES.SPECIAL_ACTION
    );
  }

  /**
   * Get reroll traits that apply to a specific skill
   */
  static getRerollTraitsForSkill(actor, skillKey) {
    const species = this.getActorSpecies(actor);
    if (!species) {return [];}

    const traits = this.getSpeciesTraitsData(species);
    return traits.filter(t =>
      t.type === SPECIES_TRAIT_TYPES.REROLL &&
      (t.skill === skillKey || t.scope === 'any')
    );
  }

  /**
   * Get feat grant traits for an actor's species
   */
  static getFeatGrantTraits(actor) {
    const species = this.getActorSpecies(actor);
    if (!species) {return [];}

    const traits = this.getSpeciesTraitsData(species);
    return traits.filter(t => t.type === SPECIES_TRAIT_TYPES.FEAT_GRANT);
  }

  /**
   * Get skill grant traits for an actor's species
   */
  static getSkillGrantTraits(actor) {
    const species = this.getActorSpecies(actor);
    if (!species) {return [];}

    const traits = this.getSpeciesTraitsData(species);
    return traits.filter(t => t.type === SPECIES_TRAIT_TYPES.SKILL_GRANT);
  }
}

// Export for global access
export default SpeciesTraitEngine;
