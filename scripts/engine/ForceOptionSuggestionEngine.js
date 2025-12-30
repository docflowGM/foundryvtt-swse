/**
 * SWSE Force Option Suggestion Engine
 *
 * Provides intelligent suggestions for Force powers, secrets, and techniques
 * based on character's build direction, combat style, and prestige class targets.
 *
 * Integrates with BuildIntent and RulesetProfile to deliver context-aware recommendations.
 *
 * Suggestion Tiers:
 * TIER 5 - PRESTIGE_ALIGNED: Directly supports prestige class build path
 * TIER 4 - COMBAT_SYNERGY: Enhances character's primary combat style
 * TIER 3 - UNIVERSAL_STRONG: Universally strong Force option
 * TIER 2 - HOUSE_RULE_BONUS: Enhanced by active house rules
 * TIER 1 - COMPATIBLE: Legal option that fits the build
 * TIER 0 - AVAILABLE: Can be selected but not specifically recommended
 */

import { SWSELogger } from '../utils/logger.js';

export const FORCE_OPTION_TIERS = {
  PRESTIGE_ALIGNED: 5,
  COMBAT_SYNERGY: 4,
  UNIVERSAL_STRONG: 3,
  HOUSE_RULE_BONUS: 2,
  COMPATIBLE: 1,
  AVAILABLE: 0
};

export const TIER_REASONS = {
  5: "Directly supports your prestige class build path",
  4: "Enhances your primary combat style",
  3: "Universally strong Force option",
  2: "Boosted by active house rules",
  1: "Compatible with your build",
  0: "Available for selection"
};

export const TIER_ICONS = {
  5: "fa-crown",        // Crown for prestige alignment
  4: "fa-bolt",         // Lightning for combat synergy
  3: "fa-star",         // Star for universal strength
  2: "fa-cog",          // Cog for house rules
  1: "fa-check",        // Check for compatible
  0: ""                 // No icon for available
};

// Force Option Catalog
export const FORCE_OPTIONS_CATALOG = {
  // Powers
  move_object: {
    id: "move_object",
    name: "Move Object",
    type: "power",
    category: "control",
    description: "Telekinetically move or manipulate objects"
  },
  negate_energy: {
    id: "negate_energy",
    name: "Negate Energy",
    type: "power",
    category: "defense",
    description: "Create protective barrier against energy attacks"
  },
  surge: {
    id: "surge",
    name: "Surge",
    type: "power",
    category: "mobility",
    description: "Enhanced speed and reflexes through the Force"
  },
  force_slam: {
    id: "force_slam",
    name: "Force Slam",
    type: "power",
    category: "control",
    description: "Hurl objects or creatures with Force power"
  },
  mind_trick: {
    id: "mind_trick",
    name: "Mind Trick",
    type: "power",
    category: "control",
    description: "Influence minds and perceptions"
  },
  enlighten: {
    id: "enlighten",
    name: "Enlighten",
    type: "power",
    category: "support",
    description: "Grant allies insight and enhanced abilities"
  },
  force_lightning: {
    id: "force_lightning",
    name: "Force Lightning",
    type: "power",
    category: "damage",
    description: "Devastating electrical attack powered by the dark side"
  },
  battle_strike: {
    id: "battle_strike",
    name: "Battle Strike",
    type: "power",
    category: "melee",
    description: "Enhance melee attacks with Force power"
  },
  stun: {
    id: "stun",
    name: "Stun",
    type: "power",
    category: "control",
    description: "Stun target through Force manipulation"
  },
  force_grip: {
    id: "force_grip",
    name: "Force Grip",
    type: "power",
    category: "control",
    description: "Immobilize target with telekinetic force"
  },

  // Secrets
  quicken_power: {
    id: "quicken_power",
    name: "Quicken Power",
    type: "secret",
    description: "Use Force powers as a swift action"
  },
  force_regeneration: {
    id: "force_regeneration",
    name: "Force Regeneration",
    type: "secret",
    description: "Heal yourself through the Force"
  },
  shatterpoint: {
    id: "shatterpoint",
    name: "Shatterpoint",
    type: "secret",
    description: "Identify critical weaknesses in objects and structures"
  },
  dark_side_mastery: {
    id: "dark_side_mastery",
    name: "Dark Side Mastery",
    type: "secret",
    description: "Master dark side Force techniques"
  },
  force_resistance: {
    id: "force_resistance",
    name: "Force Resistance",
    type: "secret",
    description: "Resist Force powers and effects"
  },

  // Techniques
  telekinetic_savant: {
    id: "telekinetic_savant",
    name: "Telekinetic Savant",
    type: "technique",
    description: "Master of telekinetic Force powers"
  },
  improved_battle_meditation: {
    id: "improved_battle_meditation",
    name: "Improved Battle Meditation",
    type: "technique",
    description: "Enhanced tactical awareness through the Force"
  },
  power_recovery: {
    id: "power_recovery",
    name: "Power Recovery",
    type: "technique",
    description: "Regain spent Force points more quickly"
  },
  force_sensitivity_focus: {
    id: "force_sensitivity_focus",
    name: "Force Sensitivity Focus",
    type: "technique",
    description: "Deepen connection to the Force"
  }
};

export class ForceOptionSuggestionEngine {
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
      const ruleset = game.settings?.get('foundryvtt-swse', 'houseRules') || {};

      const suggestedOptions = options.map(option => {
        let tier = FORCE_OPTION_TIERS.AVAILABLE;
        const reasons = [];

        // Skip if no Force focus
        if (!buildIntent.forceFocus) {
          return {
            ...option,
            suggestion: {
              tier: FORCE_OPTION_TIERS.AVAILABLE,
              reason: "Not Force-focused",
              icon: ""
            },
            isSuggested: false
          };
        }

        // Universal strong options
        if (["move_object", "negate_energy", "surge"].includes(option.id)) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.UNIVERSAL_STRONG);
          reasons.push("Universally strong Force option");
        }

        // Combat style alignment
        const combatStyle = buildIntent.combatStyle || "mixed";
        if (combatStyle === "lightsaber" && ["battle_strike", "force_slam", "surge"].includes(option.id)) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMBAT_SYNERGY);
          reasons.push("Enhances lightsaber combat");
        }

        if (combatStyle === "caster" && ["force_lightning", "mind_trick", "move_object"].includes(option.id)) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMBAT_SYNERGY);
          reasons.push("Supports Force caster build");
        }

        // Prestige class alignment
        const prestigeTargets = buildIntent.prestigeTargets || {};

        if (prestigeTargets["Jedi Knight"] > 0.6 && ["battle_strike", "enlighten", "improved_battle_meditation"].includes(option.id)) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
          reasons.push("Supports Jedi Knight path");
        }

        if (prestigeTargets["Force Adept"] > 0.6 && ["move_object", "force_lightning", "negate_energy", "telekinetic_savant"].includes(option.id)) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
          reasons.push("Supports Force Adept path");
        }

        if (prestigeTargets["Sith Lord"] > 0.6 && ["force_lightning", "dark_side_mastery", "force_grip"].includes(option.id)) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
          reasons.push("Supports Sith Lord path");
        }

        if (prestigeTargets["Jedi Master"] > 0.6 && ["enlighten", "force_sensitivity_focus", "improved_battle_meditation"].includes(option.id)) {
          tier = Math.max(tier, FORCE_OPTION_TIERS.PRESTIGE_ALIGNED);
          reasons.push("Supports Jedi Master path");
        }

        // House rules adjustments
        if (ruleset.talentFrequency === "everyLevel" && option.type === "power") {
          tier = Math.max(tier, tier === FORCE_OPTION_TIERS.AVAILABLE ? FORCE_OPTION_TIERS.HOUSE_RULE_BONUS : tier);
          reasons.push("House rules favor broader Force selections");
        }

        // Primary theme alignment
        const primaryThemes = buildIntent.primaryThemes || [];
        if (primaryThemes.includes("control") && option.category === "control") {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMPATIBLE);
          reasons.push("Aligns with control-focused build");
        }

        if (primaryThemes.includes("defense") && option.category === "defense") {
          tier = Math.max(tier, FORCE_OPTION_TIERS.COMPATIBLE);
          reasons.push("Supports defensive playstyle");
        }

        const reason = reasons.length > 0 ? reasons.join("; ") : TIER_REASONS[tier];

        return {
          ...option,
          suggestion: {
            tier,
            reason,
            icon: TIER_ICONS[tier]
          },
          isSuggested: tier >= FORCE_OPTION_TIERS.COMBAT_SYNERGY
        };
      });

      return suggestedOptions.sort((a, b) => {
        const tierDiff = (b.suggestion?.tier ?? 0) - (a.suggestion?.tier ?? 0);
        if (tierDiff !== 0) return tierDiff;
        return (a.name || "").localeCompare(b.name || "");
      });
    } catch (err) {
      SWSELogger.error('Force option suggestion failed:', err);
      // Return options without suggestions as fallback
      return options.map(opt => ({
        ...opt,
        suggestion: {
          tier: FORCE_OPTION_TIERS.AVAILABLE,
          reason: "Available",
          icon: ""
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
}

export default ForceOptionSuggestionEngine;
