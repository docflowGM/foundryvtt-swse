/**
 * SWSE Force Option Suggestion Engine
 * (PHASE 5D: UNIFIED_TIERS Refactor)
 *
 * Provides intelligent suggestions for Force powers, secrets, and techniques
 * based on character's build direction, combat style, and prestige class targets.
 *
 * Integrates with BuildIntent and RulesetProfile to deliver context-aware recommendations.
 * Now uses UNIFIED_TIERS system for consistent tier definitions.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import {
  FORCE_POWER_CATEGORIES,
  generateForcePowerArchetypeWeights,
  validateForcePowerCategories
} from "/systems/foundryvtt-swse/scripts/engine/force/force-power-categories.js";
import { UNIFIED_TIERS, getTierMetadata } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-unified-tiers.js";
import { getForceAxisSnapshot } from "/systems/foundryvtt-swse/scripts/engine/suggestion/force-rule-adapter.js";

// DEPRECATED: Legacy tier definitions (kept for backwards compatibility)
// Use UNIFIED_TIERS from suggestion-unified-tiers.js instead
export const FORCE_OPTION_TIERS = {
  PRESTIGE_ALIGNED: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,  // 5
  COMBAT_SYNERGY: UNIFIED_TIERS.PATH_CONTINUATION,         // 4
  UNIVERSAL_STRONG: UNIFIED_TIERS.CATEGORY_SYNERGY,        // 3
  HOUSE_RULE_BONUS: UNIFIED_TIERS.ABILITY_SYNERGY,         // 2
  COMPATIBLE: UNIFIED_TIERS.THEMATIC_FIT,                  // 1
  AVAILABLE: UNIFIED_TIERS.AVAILABLE                       // 0
};


const FORCE_OPTION_TAGS = {
  move_object: ['force_control', 'controller', 'utility'],
  negate_energy: ['force_defense', 'defense', 'support'],
  surge: ['mobility', 'buff'],
  force_slam: ['force_control', 'controller', 'offense_ranged', 'area_effect'],
  mind_trick: ['force_control', 'social', 'debuff'],
  enlighten: ['force_support', 'buff', 'ally_support'],
  force_lightning: ['force_offense', 'offense_ranged', 'area_effect', 'dark_side'],
  battle_strike: ['force_offense', 'offense_melee', 'lightsaber', 'buff', 'force_multiplier'],
  stun: ['force_control', 'debuff'],
  force_grip: ['force_control', 'offense_ranged', 'single_target', 'dark_side'],
  quicken_power: ['force_multiplier', 'action_economy', 'swift_action'],
  force_regeneration: ['force_support', 'healing', 'force_multiplier'],
  shatterpoint: ['force_control', 'precision', 'force_execution'],
  dark_side_mastery: ['dark_side', 'force_multiplier', 'force_offense'],
  force_resistance: ['force_defense', 'defense'],
  telekinetic_savant: ['force_control', 'force_multiplier', 'force_execution'],
  improved_battle_meditation: ['force_support', 'leadership', 'ally_support', 'force_multiplier'],
  power_recovery: ['force_capacity', 'force_multiplier', 'resource_recovery'],
  force_sensitivity_focus: ['force_execution', 'force_multiplier']
};

function getOptionTagSet(option) {
  return new Set([...(option?.tags || []), ...(FORCE_OPTION_TAGS[option?.id] || [])].map((tag) => String(tag || '').toLowerCase()));
}

function normalizeDescriptorTag(tag) {
  return String(tag || '').toLowerCase().replace(/[\s-]+/g, '_');
}

function getDescriptorState(option, forceCategoryData = null) {
  const normalizedTags = new Set([...(option?.tags || []), ...(FORCE_OPTION_TAGS[option?.id] || [])].map(normalizeDescriptorTag));
  const hasDarkDescriptor = normalizedTags.has('dark_side');
  const hasLightDescriptor = normalizedTags.has('light_side');
  const moralSlant = forceCategoryData?.moralSlant || null;

  return {
    hasDarkDescriptor,
    hasLightDescriptor,
    moralSlant,
    isDarkAligned: hasDarkDescriptor || moralSlant === 'sith_favored' || moralSlant === 'sith_only',
    isLightAligned: hasLightDescriptor || moralSlant === 'jedi_favored' || moralSlant === 'jedi_only'
  };
}

function getDSPAlignmentAdjustment(option, forceCategoryData, dspValue = 0) {
  const state = getDescriptorState(option, forceCategoryData);

  if (state.hasLightDescriptor && dspValue > 0) {
    if (dspValue >= 3) {
      return { tierPenalty: 2, reason: 'Light Side power clashes with your current Dark Side score' };
    }
    return { tierPenalty: 1, reason: 'Light Side power is a weaker fit for your current Dark Side score' };
  }

  if (state.hasDarkDescriptor && dspValue <= 0) {
    return { tierPenalty: 1, reason: 'Dark Side power is a weaker fit for your current moral posture' };
  }

  if (state.isDarkAligned && dspValue >= 1) {
    return { tierPenalty: 0, reason: 'Dark Side leaning power fits your current Force alignment' };
  }

  if (state.isLightAligned && dspValue <= 0) {
    return { tierPenalty: 0, reason: 'Light Side leaning power fits your current Force alignment' };
  }

  return { tierPenalty: 0, reason: '' };
}
// Force Option Catalog
export const FORCE_OPTIONS_CATALOG = {
  // Powers
  move_object: {
    id: 'move_object',
    name: 'Move Object',
    type: 'power',
    category: 'control',
    description: 'Telekinetically move or manipulate objects'
  },
  negate_energy: {
    id: 'negate_energy',
    name: 'Negate Energy',
    type: 'power',
    category: 'defense',
    description: 'Create protective barrier against energy attacks'
  },
  surge: {
    id: 'surge',
    name: 'Surge',
    type: 'power',
    category: 'mobility',
    description: 'Enhanced speed and reflexes through the Force'
  },
  force_slam: {
    id: 'force_slam',
    name: 'Force Slam',
    type: 'power',
    category: 'control',
    description: 'Hurl objects or creatures with Force power'
  },
  mind_trick: {
    id: 'mind_trick',
    name: 'Mind Trick',
    type: 'power',
    category: 'control',
    description: 'Influence minds and perceptions'
  },
  enlighten: {
    id: 'enlighten',
    name: 'Enlighten',
    type: 'power',
    category: 'support',
    description: 'Grant allies insight and enhanced abilities'
  },
  force_lightning: {
    id: 'force_lightning',
    name: 'Force Lightning',
    type: 'power',
    category: 'damage',
    description: 'Devastating electrical attack powered by the dark side'
  },
  battle_strike: {
    id: 'battle_strike',
    name: 'Battle Strike',
    type: 'power',
    category: 'melee',
    description: 'Enhance melee attacks with Force power'
  },
  stun: {
    id: 'stun',
    name: 'Stun',
    type: 'power',
    category: 'control',
    description: 'Stun target through Force manipulation'
  },
  force_grip: {
    id: 'force_grip',
    name: 'Force Grip',
    type: 'power',
    category: 'control',
    description: 'Immobilize target with telekinetic force'
  },

  // Secrets
  quicken_power: {
    id: 'quicken_power',
    name: 'Quicken Power',
    type: 'secret',
    description: 'Use Force powers as a swift action'
  },
  force_regeneration: {
    id: 'force_regeneration',
    name: 'Force Regeneration',
    type: 'secret',
    description: 'Heal yourself through the Force'
  },
  shatterpoint: {
    id: 'shatterpoint',
    name: 'Shatterpoint',
    type: 'secret',
    description: 'Identify critical weaknesses in objects and structures'
  },
  dark_side_mastery: {
    id: 'dark_side_mastery',
    name: 'Dark Side Mastery',
    type: 'secret',
    description: 'Master dark side Force techniques'
  },
  force_resistance: {
    id: 'force_resistance',
    name: 'Force Resistance',
    type: 'secret',
    description: 'Resist Force powers and effects'
  },

  // Techniques
  telekinetic_savant: {
    id: 'telekinetic_savant',
    name: 'Telekinetic Savant',
    type: 'technique',
    description: 'Master of telekinetic Force powers'
  },
  improved_battle_meditation: {
    id: 'improved_battle_meditation',
    name: 'Improved Battle Meditation',
    type: 'technique',
    description: 'Enhanced tactical awareness through the Force'
  },
  power_recovery: {
    id: 'power_recovery',
    name: 'Power Recovery',
    type: 'technique',
    description: 'Regain spent Force points more quickly'
  },
  force_sensitivity_focus: {
    id: 'force_sensitivity_focus',
    name: 'Force Sensitivity Focus',
    type: 'technique',
    description: 'Deepen connection to the Force'
  }
};

export class ForceOptionSuggestionEngine {
  /**
   * Get Force power suggestions for a prestige class
   * Now data-driven: checks prestige item metadata first, falls back to hardcoded mappings
   * @param {string} prestigeClass - Prestige class name or ID
   * @returns {Array} Array of force option IDs
   * @private
   */
  static _getPrestigeClassPowerSuggestions(prestigeClass) {
    // Hardcoded fallback mappings for vanilla prestige classes
    const hardcodedSuggestions = {
      'Jedi Knight': ['battle_strike', 'enlighten', 'improved_battle_meditation', 'surge'],
      'Jedi Master': ['enlighten', 'force_sensitivity_focus', 'improved_battle_meditation', 'negate_energy'],
      'Sith Apprentice': ['force_lightning', 'force_grip', 'dark_side_mastery', 'stun'],
      'Sith Lord': ['force_lightning', 'dark_side_mastery', 'force_grip', 'move_object'],
      'Force Adept': ['move_object', 'force_lightning', 'negate_energy', 'telekinetic_savant'],
      'Force Disciple': ['move_object', 'enlighten', 'force_sensitivity_focus', 'telekinetic_savant'],
      'Imperial Knight': ['battle_strike', 'negate_energy', 'surge', 'mind_trick'],
      'Imperial Knight Errant': ['surge', 'mind_trick', 'battle_strike', 'quicken_power'],
      'Imperial Knight Inquisitor': ['mind_trick', 'force_grip', 'force_lightning', 'awareness']
    };

    // Try to find prestige item in world
    if (game?.items) {
      // Search by ID first (if prestigeClass is an ID)
      let prestigeItem = game.items.get(prestigeClass);

      // If not found, search by name
      if (!prestigeItem) {
        prestigeItem = game.items.find(item =>
          item.type === 'prestige' && item.name === prestigeClass
        );
      }

      // If found and has associatedForceOptions, use them
      if (prestigeItem && prestigeItem.system?.associatedForceOptions) {
        const options = prestigeItem.system.associatedForceOptions;
        if (Array.isArray(options) && options.length > 0) {
          return options;
        }
      }
    }

    // Fall back to hardcoded mappings for vanilla prestige classes
    return hardcodedSuggestions[prestigeClass] || [];
  }

  /**
   * Suggest Force options based on character build
   * @param {Array} options - Array of force options to evaluate
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} options - Additional context
   * @param {Object} options.buildIntent - Pre-computed BuildIntent analysis
   * @returns {Promise<Array>} Force options with suggestion metadata
   */
  static async suggestForceOptions(options, actor, pendingData = {}, contextOptions = {}) {
    try {
      const buildIntent = contextOptions.buildIntent || {};
      const ruleset = HouseRuleService.get('houseRules') || {};
      const forceAxes = getForceAxisSnapshot(actor);
      const { DSPEngine } = await import("/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js").catch(() => ({ DSPEngine: null }));
      const dspValue = DSPEngine?.getValue(actor) ?? actor?.system?.darkSide?.value ?? 0;

      // Get prestige class target from L1 survey if available
      const prestigeClassTarget = actor.system?.swse?.mentorBuildIntentBiases?.prestigeClassTarget || null;

      const suggestedOptions = options.map(option => {
        let tier = FORCE_OPTION_TIERS.AVAILABLE;
        const reasons = [];
        const tags = getOptionTagSet(option);

        // Skip if no Force focus
        if (!buildIntent.forceFocus) {
          return {
            ...option,
            suggestion: {
              tier: FORCE_OPTION_TIERS.AVAILABLE,
              reason: 'Not Force-focused',
              icon: ''
            },
            isSuggested: false
          };
        }

        // Universal strong options
        if (['move_object', 'negate_energy', 'surge'].includes(option.id)) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.UNIVERSAL_STRONG);
          reasons.push('Universally strong Force option');
        }

        // Combat style alignment
        const combatStyle = buildIntent.combatStyle || 'mixed';
        if (combatStyle === 'lightsaber' && (tags.has('offense_melee') || tags.has('lightsaber') || ['battle_strike', 'force_slam', 'surge'].includes(option.id))) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMBAT_SYNERGY);
          reasons.push('Enhances lightsaber combat');
        }

        if (combatStyle === 'caster' && (tags.has('force_control') || tags.has('force_offense') || ['force_lightning', 'mind_trick', 'move_object'].includes(option.id))) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMBAT_SYNERGY);
          reasons.push('Supports Force caster build');
        }

        if ((tags.has('force_capacity') || tags.has('force_multiplier')) && forceAxes.capacityMod >= 2) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMPATIBLE);
          reasons.push(`Fits your Force capacity (${forceAxes.capacityAbility.toUpperCase()})`);
        }

        if ((tags.has('force_execution') || tags.has('force_power_check')) && forceAxes.executionMod >= 2) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMPATIBLE);
          reasons.push(`Fits your Force execution (${forceAxes.executionAbility.toUpperCase()})`);
        }

        if (tags.has('action_economy') || tags.has('swift_action')) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMPATIBLE);
          reasons.push('Improves action economy');
        }

        // Prestige class alignment from L1 survey (highest priority)
        if (prestigeClassTarget) {
          const prestigeConfig = this._getPrestigeClassPowerSuggestions(prestigeClassTarget);
          if (prestigeConfig && prestigeConfig.includes(option.id)) {
            tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
            reasons.push(`Supports your goal: ${prestigeClassTarget}`);
          }
        }

        // Prestige class alignment - FIXED: Use prestigeAffinities (array) instead of prestigeTargets
        const prestigeAffinities = buildIntent.prestigeAffinities || [];

        // Check top prestige targets (sorted by confidence)
        for (const affinity of prestigeAffinities.slice(0, 3)) {
          if (affinity.confidence < 0.6) {continue;} // Only strong targets

          const className = affinity.className;

          if (className === 'Jedi Knight' && ['battle_strike', 'enlighten', 'improved_battle_meditation'].includes(option.id)) {
            tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
            reasons.push(`Supports ${className} path (${Math.round(affinity.confidence * 100)}% confidence)`);
          }

          if (className === 'Force Adept' && ['move_object', 'force_lightning', 'negate_energy', 'telekinetic_savant'].includes(option.id)) {
            tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
            reasons.push(`Supports ${className} path (${Math.round(affinity.confidence * 100)}% confidence)`);
          }

          if (className === 'Sith Lord' && ['force_lightning', 'dark_side_mastery', 'force_grip'].includes(option.id)) {
            tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
            reasons.push(`Supports ${className} path (${Math.round(affinity.confidence * 100)}% confidence)`);
          }

          if (className === 'Jedi Master' && ['enlighten', 'force_sensitivity_focus', 'improved_battle_meditation'].includes(option.id)) {
            tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
            reasons.push(`Supports ${className} path (${Math.round(affinity.confidence * 100)}% confidence)`);
          }
        }

        // House rules adjustments
        if (ruleset.talentFrequency === 'everyLevel' && option.type === 'power') {
          tier = Math.max(tier, tier === FORCE_OPTION_TIERS.AVAILABLE ? FORCE_OPTION_TIERS.HOUSE_RULE_BONUS : tier);
          reasons.push('House rules favor broader Force selections');
        }

        // Primary theme alignment
        const primaryThemes = buildIntent.primaryThemes || [];
        if (primaryThemes.includes('control') && (option.category === 'control' || tags.has('force_control') || tags.has('controller'))) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMPATIBLE);
          reasons.push('Aligns with control-focused build');
        }

        if (primaryThemes.includes('defense') && (option.category === 'defense' || tags.has('force_defense') || tags.has('defense'))) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMPATIBLE);
          reasons.push('Supports defensive playstyle');
        }

        if (primaryThemes.includes('support') && (tags.has('force_support') || tags.has('ally_support') || tags.has('healing'))) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMPATIBLE);
          reasons.push('Supports your support-oriented Force path');
        }

        const forcePowerCategoryData = Object.values(FORCE_POWER_CATEGORIES).find((p) => p.name === (option.name || '')) || null;
        const dspAdjustment = getDSPAlignmentAdjustment(option, forcePowerCategoryData, dspValue);
        if (dspAdjustment.reason) {
          reasons.push(dspAdjustment.reason);
        }
        if (dspAdjustment.tierPenalty > 0) {
          tier = Math.max(FORCE_OPTION_TIERS.AVAILABLE, tier - dspAdjustment.tierPenalty);
        }

        const tierMetadata = getTierMetadata(tier);
        const reason = reasons.length > 0 ? reasons.join('; ') : tierMetadata.description;

        return {
          ...option,
          suggestion: {
            tier,
            reason,
            icon: tierMetadata.icon,
            color: tierMetadata.color,
            label: tierMetadata.label
          },
          isSuggested: tier >= UNIFIED_TIERS.PATH_CONTINUATION  // TIER 4+
        };
      });

      return suggestedOptions.sort((a, b) => {
        const tierDiff = (b.suggestion?.tier ?? 0) - (a.suggestion?.tier ?? 0);
        if (tierDiff !== 0) {return tierDiff;}
        return (a.name || '').localeCompare(b.name || '');
      });
    } catch (err) {
      SWSELogger.error('Force option suggestion failed:', err);
      // Return options without suggestions as fallback
      const tierMetadata = getTierMetadata(UNIFIED_TIERS.AVAILABLE);
      return options.map(opt => ({
        ...opt,
        suggestion: {
          tier: UNIFIED_TIERS.AVAILABLE,
          reason: tierMetadata.description,
          icon: tierMetadata.icon,
          color: tierMetadata.color,
          label: tierMetadata.label
        },
        isSuggested: false
      }));
    }
  }

  /**
   * Get Force options by type (powers, secrets, techniques)
   * @param {string} type - 'power', 'secret', or 'technique'
   * @returns {Array} Filtered force options
   */
  static getByType(type) {
    return Object.values(FORCE_OPTIONS_CATALOG).filter(opt => opt.type === type);
  }

  /**
   * Get Force option by ID
   * @param {string} id - Option ID
   * @returns {Object|null} Force option or null
   */
  static getById(id) {
    return FORCE_OPTIONS_CATALOG[id] || null;
  }

  /**
   * Count suggestions by tier
   * @param {Array} suggestedOptions - Force options with suggestions
   * @returns {Object} Count by tier
   */
  static countByTier(suggestedOptions) {
    const counts = {};
    Object.keys(FORCE_OPTION_TIERS).forEach(key => {
      counts[FORCE_OPTION_TIERS[key]] = 0;
    });

    suggestedOptions.forEach(opt => {
      const tier = opt.suggestion?.tier ?? 0;
      counts[tier] = (counts[tier] || 0) + 1;
    });

    return counts;
  }

  /**
   * Filter Force options by category
   * @param {Array} options - Force options
   * @param {string} category - Category to filter by
   * @returns {Array} Filtered options
   */
  static filterByCategory(options, category) {
    return options.filter(opt => opt.category === category);
  }

  // ──────────────────────────────────────────────────────────────
  // CATEGORY-BASED SCORING
  // ──────────────────────────────────────────────────────────────

  /**
   * Score a Force power based on categories and archetype
   * @param {Object} power - Force power item
   * @param {string} archetype - Archetype ID
   * @returns {number} Score multiplier
   */
  static scorePowerByArchetype(power, archetype) {
    const powerName = power.name || '';
    const powerData = Object.values(FORCE_POWER_CATEGORIES).find(p => p.name === powerName);

    if (!powerData || !powerData.categories) {
      return 1.0;
    }

    const weights = generateForcePowerArchetypeWeights(powerData.categories);
    return weights[archetype] || 1.0;
  }

  /**
   * Check if a Force power aligns with character's moral/philosophical alignment
   * @param {Object} power - Force power item
   * @param {Actor} actor - Character
   * @returns {{allowed: boolean, penalty: number}} Whether power is allowed and any moral penalty
   */
  static async checkMoralAlignment(power, actor) {
    const powerName = power.name || '';
    const powerData = Object.values(FORCE_POWER_CATEGORIES).find(p => p.name === powerName);

    if (!powerData) {
      return { allowed: true, penalty: 0 };
    }

    // Detect character's Force alignment via DSP values
    // DSP scale: 0 = light side, DSP > 0 = dark side, DSP = WIS = fully dark
    const { DSPEngine } = await import("/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js").catch(() => ({ DSPEngine: null }));
    const dspValue = DSPEngine?.getValue(actor) ?? 0;
    const wisdom = actor.system?.attributes?.wis?.base ?? 10;

    const isDark = dspValue > 0;
    const isLight = dspValue === 0;

    // Apply moral checks
    if (powerData.moralSlant === 'sith_only' && isLight) {
      return { allowed: false, penalty: 0 };
    }
    if (powerData.moralSlant === 'jedi_only' && isDark) {
      return { allowed: false, penalty: 0 };
    }

    // Soft penalties for philosophical misalignment
    if (powerData.moralSlant === 'jedi_favored' && isDark) {
      return { allowed: true, penalty: 0.7 };
    }
    if (powerData.moralSlant === 'sith_favored' && isLight) {
      return { allowed: true, penalty: 0.7 };
    }

    return { allowed: true, penalty: 1.0 };
  }

  /**
   * Get Power philosophy/intent for mentor explanation
   * @param {string} powerName - Force power name
   * @returns {Object} Philosophy data
   */
  static getPowerPhilosophy(powerName) {
    return Object.values(FORCE_POWER_CATEGORIES).find(p => p.name === powerName) || null;
  }

  /**
   * Initialize Force power category system (call once on world load)
   */
  static initializeForcePowerSystem() {
    try {
      validateForcePowerCategories();
      SWSELogger.log('[FORCE-OPTION-ENGINE] Force power category system initialized successfully');
    } catch (err) {
      SWSELogger.error('[FORCE-OPTION-ENGINE] Force power initialization failed:', err);
    }
  }
}

export default ForceOptionSuggestionEngine;
