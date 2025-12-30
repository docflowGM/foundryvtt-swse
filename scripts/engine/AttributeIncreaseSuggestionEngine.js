/**
 * SWSE Attribute Increase Suggestion Engine
 *
 * Provides intelligent ability score increase recommendations at levels 4, 8, 12, 16, 20.
 *
 * Key principles:
 * - Prefer even-number breakpoints (modifiers increase at even scores in Saga Edition)
 * - Align with BuildIntent and character class
 * - Consider trained skills that benefit from the ability
 * - Never force a choice - all abilities remain equally valid
 * - Always explain the reasoning behind suggestions
 *
 * Modifier Breakpoints (Saga Edition):
 * Score 10-11 (mod +0) → 12-13 (mod +1) → 14-15 (mod +2) → 16-17 (mod +3) → 18-19 (mod +4) → 20+
 * Breakpoints occur at even scores: 10, 12, 14, 16, 18, 20
 */

import { SWSELogger } from '../utils/logger.js';

export const ATTRIBUTE_INCREASE_LEVELS = new Set([4, 8, 12, 16, 20]);

export const ATTRIBUTE_TIERS = {
  MODIFIER_PRIMARY: 5,    // Modifier breakpoint + primary ability
  MODIFIER_SECONDARY: 4,  // Modifier breakpoint + secondary ability
  MODIFIER_GENERAL: 3,    // Modifier breakpoint (no ability match)
  PRIMARY_SYNERGY: 2,     // Primary ability but no modifier breakpoint
  SKILL_SYNERGY: 1,       // Improves trained skills
  AVAILABLE: 0            // Can be increased but not recommended
};

export const TIER_REASONS = {
  5: "Modifier breakpoint + primary ability match",
  4: "Modifier breakpoint + secondary ability match",
  3: "Reaches new modifier breakpoint",
  2: "Primary ability for your build",
  1: "Improves trained skills",
  0: "Available for increase"
};

// Role associations for each ability (used for BuildIntent matching)
export const ATTRIBUTE_ROLE_MAP = {
  str: ['melee', 'grapple', 'armor', 'lightsaber'],
  dex: ['ranged', 'stealth', 'pilot', 'reflex', 'acrobatics'],
  con: ['tank', 'survivability', 'endurance'],
  int: ['tech', 'skills', 'mechanics'],
  wis: ['force', 'perception', 'awareness'],
  cha: ['leadership', 'social', 'fear', 'force-caster']
};

// Skill associations (from skills.json)
export const ATTRIBUTE_SKILL_MAP = {
  str: ['climb', 'jump', 'swim'],
  dex: ['acrobatics', 'initiative', 'pilot', 'stealth'],
  con: ['endurance'],
  int: ['mechanics', 'useComputer'],
  wis: ['perception', 'survival', 'treatInjury'],
  cha: ['deception', 'gatherInfo', 'persuasion', 'useTheForce']
};

// Class-specific attribute preferences
export const CLASS_ATTRIBUTE_PREFS = {
  'Jedi': {
    primary: 'wis',
    secondary: 'dex',
    preferences: { wis: 2, dex: 1, str: 1 }
  },
  'Soldier': {
    primary: 'str',
    secondary: 'con',
    preferences: { str: 2, con: 2, dex: 1 }
  },
  'Scout': {
    primary: 'dex',
    secondary: 'wis',
    preferences: { dex: 2, wis: 1, str: 1 }
  },
  'Scoundrel': {
    primary: 'dex',
    secondary: 'cha',
    preferences: { dex: 2, cha: 1, int: 1 }
  },
  'Noble': {
    primary: 'cha',
    secondary: 'int',
    preferences: { cha: 2, int: 1, wis: 1 }
  },
  'Force Adept': {
    primary: 'wis',
    secondary: 'cha',
    preferences: { wis: 2, cha: 2 }
  },
  'Jedi Knight': {
    primary: 'wis',
    secondary: 'dex',
    preferences: { wis: 2, dex: 1, str: 1 }
  },
  'Sith Lord': {
    primary: 'cha',
    secondary: 'wis',
    preferences: { cha: 2, wis: 2, str: 1 }
  }
};

export class AttributeIncreaseSuggestionEngine {
  /**
   * Check if a character is at an attribute increase level
   * @param {number} level - Character level
   * @returns {boolean} True if level is 4, 8, 12, 16, or 20
   */
  static isAttributeIncreaseLevel(level) {
    return ATTRIBUTE_INCREASE_LEVELS.has(level);
  }

  /**
   * Check if a score increase would result in a modifier breakpoint
   * In Saga Edition, modifiers increase at even scores: 10, 12, 14, 16, 18, 20
   * @param {number} currentScore - Current ability score (8-20)
   * @returns {boolean} True if increasing by 1 reaches a breakpoint
   * @private
   */
  static _isModifierBreakpoint(currentScore) {
    // Next score would be currentScore + 1
    // Even scores grant modifiers, so check if next score is even
    return (currentScore + 1) % 2 === 0;
  }

  /**
   * Get modifier for an ability score
   * @param {number} score - Ability score
   * @returns {number} Modifier
   * @private
   */
  static _getModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Suggest ability score increases for the character
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} contextOptions - Additional options
   * @param {Object} contextOptions.buildIntent - Pre-computed BuildIntent
   * @returns {Promise<Array>} Abilities with suggestion metadata
   */
  static async suggestAttributeIncreases(actor, pendingData = {}, contextOptions = {}) {
    try {
      const level = actor.system?.level || 0;

      // Only suggest at specific levels
      if (!this.isAttributeIncreaseLevel(level)) {
        return [];
      }

      const abilities = actor.system?.abilities || {};
      const buildIntent = contextOptions.buildIntent || {};
      const trainedSkills = new Set(pendingData?.trainedSkills || []);
      const classLevels = actor.system?.progression?.classLevels || [];

      // Get primary class(es)
      const primaryClass = classLevels.length > 0 ? classLevels[classLevels.length - 1]?.class : null;
      const classPrefs = primaryClass ? CLASS_ATTRIBUTE_PREFS[primaryClass] : null;

      const suggestions = [];

      // Evaluate each ability
      for (const [abbrev, abilityData] of Object.entries(abilities)) {
        const currentScore = abilityData?.base || 10;
        const newScore = currentScore + 1;
        let tier = ATTRIBUTE_TIERS.AVAILABLE;
        const reasons = [];

        // Step 1: Check modifier breakpoint (MOST IMPORTANT)
        const isBreakpoint = this._isModifierBreakpoint(currentScore);
        const oldMod = this._getModifier(currentScore);
        const newMod = this._getModifier(newScore);

        if (isBreakpoint) {
          reasons.push(`Modifier increases from +${oldMod} to +${newMod}`);

          // Step 2: Check against build intent primary/secondary
          if (buildIntent?.primaryAbility === abbrev) {
            tier = ATTRIBUTE_TIERS.MODIFIER_PRIMARY;
            reasons.push("Primary ability for your build");
          } else if (buildIntent?.secondaryAbility === abbrev) {
            tier = ATTRIBUTE_TIERS.MODIFIER_SECONDARY;
            reasons.push("Secondary ability for your build");
          } else {
            tier = ATTRIBUTE_TIERS.MODIFIER_GENERAL;
          }
        } else {
          // Step 3: If no breakpoint, check for other synergies
          if (buildIntent?.primaryAbility === abbrev) {
            tier = ATTRIBUTE_TIERS.PRIMARY_SYNERGY;
            reasons.push("Primary ability for your build (no modifier increase)");
          }
        }

        // Step 4: Check for combat style synergy
        const roles = ATTRIBUTE_ROLE_MAP[abbrev] || [];
        if (buildIntent?.combatStyle && roles.includes(buildIntent.combatStyle)) {
          tier = Math.max(tier, ATTRIBUTE_TIERS.PRIMARY_SYNERGY);
          if (!reasons.some(r => r.includes('Primary'))) {
            reasons.push(`Supports ${buildIntent.combatStyle} combat style`);
          }
        }

        // Step 5: Check for Force focus synergy
        if (buildIntent?.forceFocus && (abbrev === 'wis' || abbrev === 'cha')) {
          tier = Math.max(tier, ATTRIBUTE_TIERS.PRIMARY_SYNERGY);
          if (!reasons.some(r => r.includes('Force'))) {
            reasons.push("Supports Force-based abilities");
          }
        }

        // Step 6: Check trained skills matching this ability
        const relevantSkills = ATTRIBUTE_SKILL_MAP[abbrev] || [];
        const matchingSkills = relevantSkills.filter(skill =>
          trainedSkills.has(skill) || trainedSkills.has(this._normalizeSkillName(skill))
        );

        if (matchingSkills.length > 0 && tier < ATTRIBUTE_TIERS.PRIMARY_SYNERGY) {
          tier = Math.max(tier, ATTRIBUTE_TIERS.SKILL_SYNERGY);
          reasons.push(`Improves trained skill(s): ${matchingSkills.join(', ')}`);
        }

        // Step 7: Class-specific bonuses (soft)
        if (classPrefs) {
          const classBonus = classPrefs.preferences?.[abbrev] || 0;
          if (classBonus > 0 && !reasons.some(r => r.includes(primaryClass))) {
            if (classBonus >= 2) {
              tier = Math.max(tier, ATTRIBUTE_TIERS.PRIMARY_SYNERGY);
              reasons.push(`Key ability for ${primaryClass}`);
            } else if (tier < ATTRIBUTE_TIERS.PRIMARY_SYNERGY) {
              reasons.push(`Common ability for ${primaryClass}`);
            }
          }
        }

        const reason = reasons.length > 0 ? reasons.join("; ") : TIER_REASONS[tier];
        const fullAbilityName = this._getAbilityName(abbrev);

        suggestions.push({
          ability: fullAbilityName,
          abbrev,
          current: currentScore,
          proposed: newScore,
          currentMod: oldMod,
          proposedMod: newMod,
          isModifierBreakpoint: isBreakpoint,
          suggestion: {
            tier,
            reason,
            icon: this._getTierIcon(tier)
          },
          isSuggested: tier >= ATTRIBUTE_TIERS.MODIFIER_GENERAL || (isBreakpoint && tier >= ATTRIBUTE_TIERS.SKILL_SYNERGY)
        });
      }

      // Sort by tier (descending) then by modifier breakpoint
      return suggestions.sort((a, b) => {
        const tierDiff = (b.suggestion?.tier ?? 0) - (a.suggestion?.tier ?? 0);
        if (tierDiff !== 0) return tierDiff;

        if (a.isModifierBreakpoint !== b.isModifierBreakpoint) {
          return a.isModifierBreakpoint ? -1 : 1;
        }

        return 0;
      });
    } catch (err) {
      SWSELogger.error('Attribute increase suggestion failed:', err);
      return [];
    }
  }

  /**
   * Get tier icon
   * @private
   */
  static _getTierIcon(tier) {
    const icons = {
      5: 'fas fa-star',           // Primary + Breakpoint
      4: 'fas fa-plus-circle',    // Secondary + Breakpoint
      3: 'fas fa-arrow-up',       // Modifier Breakpoint
      2: 'fas fa-bolt',           // Build synergy
      1: 'fas fa-book',           // Skill match
      0: ''
    };
    return icons[tier] || '';
  }

  /**
   * Get ability name
   * @private
   */
  static _getAbilityName(abbrev) {
    const names = {
      'str': 'Strength',
      'dex': 'Dexterity',
      'con': 'Constitution',
      'int': 'Intelligence',
      'wis': 'Wisdom',
      'cha': 'Charisma'
    };
    return names[abbrev] || abbrev;
  }

  /**
   * Normalize skill name
   * @private
   */
  static _normalizeSkillName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/['-]/g, '');
  }

  /**
   * Count suggestions by tier
   */
  static countByTier(suggestions) {
    const counts = {};
    Object.values(ATTRIBUTE_TIERS).forEach(tier => {
      counts[tier] = 0;
    });

    suggestions.forEach(suggestion => {
      const tier = suggestion.suggestion?.tier ?? 0;
      counts[tier] = (counts[tier] || 0) + 1;
    });

    return counts;
  }
}

export default AttributeIncreaseSuggestionEngine;
