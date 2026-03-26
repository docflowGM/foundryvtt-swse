/**
 * SpeciesSuggestionEngine
 *
 * Provides grounded species recommendations based on:
 * - Class/archetype alignment
 * - Ability score preferences (implicit in class choice)
 * - Starting languages and special abilities
 * - Build coherence with accumulated selections
 *
 * Uses existing SpeciesRegistry and mentor bias infrastructure.
 * Returns suggestions with reasons based on real character context.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";
import { calculateMentorBias } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-bias.js";
import { CLASS_SYNERGY_DATA } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-suggestion-utilities.js";

/**
 * Confidence scoring tiers for species suggestions
 */
const SPECIES_CONFIDENCE_TIERS = {
  CLASS_SYNERGY_MATCH: 0.85,      // Species aligns with class ability grants
  ABILITY_COHERENCE: 0.70,         // Ability mods fit class primary stats
  TRAIT_UTILITY: 0.65,             // Special abilities useful for archetype
  LANGUAGE_BREADTH: 0.60,          // Provides useful starting languages
  FALLBACK_VALID: 0.50,            // Species is valid but not specially optimized
};

export class SpeciesSuggestionEngine {
  /**
   * Suggest species based on accumulated character context.
   *
   * @param {Array} availableSpecies - Species items to suggest from
   * @param {Actor} actor - Character actor (may be partial during chargen)
   * @param {Object} pendingData - Accumulated selections: {selectedClass, selectedFeats, ...}
   * @param {Object} options - Engine options: {mentor, debug}
   * @returns {Promise<Array>} Suggestions: [{id, name, suggestion: {confidence, reason, reasons[]}}]
   */
  static async suggestSpecies(availableSpecies = [], actor, pendingData = {}, options = {}) {
    try {
      if (!actor) return [];
      if (!Array.isArray(availableSpecies) || availableSpecies.length === 0) return [];

      const trace = options.debug ?? false;

      // Get class context from pending or actor
      const selectedClass = pendingData.selectedClass || this._getCurrentClass(actor);
      const classId = selectedClass?.classId || selectedClass?.id;
      const className = selectedClass?.name;

      if (!classId && !className) {
        if (trace) {
          SWSELogger.log("[SpeciesSuggestionEngine] No class selected; suggestions unavailable");
        }
        return [];
      }

      // Normalize available species
      const normalized = availableSpecies
        .map(item => ({
          id: item._id || item.id,
          name: item.name,
          category: item.system?.category || item.category,
          abilityScores: item.system?.abilityScores || item.abilityScores || {},
          abilities: item.system?.abilities || item.abilities || [],
          languages: item.system?.languages || item.languages || [],
          tags: item.system?.tags || item.tags || [],
          source: item.system?.source || item.source,
          raw: item,
        }))
        .filter(s => s.id && s.name);

      if (normalized.length === 0) return [];

      // Resolve class to registry entry
      const classEntry = classId
        ? ClassesRegistry.getById(classId)
        : ClassesRegistry.getByName(className);

      if (!classEntry && trace) {
        SWSELogger.log(
          "[SpeciesSuggestionEngine] Class not found in registry",
          { classId, className }
        );
      }

      // Score each species against class/character context
      const scored = normalized.map(species => {
        const score = this._scoreSpecies(
          species,
          classEntry,
          actor,
          pendingData,
          { trace }
        );

        return {
          id: species.id,
          name: species.name,
          suggestion: {
            confidence: score.confidence,
            reason: score.primaryReason,
            reasons: score.reasons,
          },
        };
      });

      // Filter out very low confidence and sort
      const suggestions = scored
        .filter(s => s.suggestion.confidence >= 0.45)
        .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence)
        .slice(0, 3); // Return top 3

      if (trace) {
        SWSELogger.log(
          "[SpeciesSuggestionEngine] Suggestions computed",
          {
            actor: actor.name,
            class: className || classId,
            suggestions: suggestions.map(s => `${s.name} (${Math.round(s.suggestion.confidence * 100)}%)`),
          }
        );
      }

      return suggestions;
    } catch (err) {
      SWSELogger.error("[SpeciesSuggestionEngine] Error:", err);
      return [];
    }
  }

  /**
   * Score a single species against class context.
   *
   * @private
   * @returns {Object} {confidence, primaryReason, reasons[]}
   */
  static _scoreSpecies(species, classEntry, actor, pendingData, options = {}) {
    let confidence = SPECIES_CONFIDENCE_TIERS.FALLBACK_VALID;
    const reasons = [];

    // 1. Class synergy check
    if (classEntry) {
      // Does this species' ability modifiers align with class's primary ability?
      const primaryAbility = this._getPrimaryAbilityForClass(classEntry);
      const speciesAbilityBonus = species.abilityScores[primaryAbility] || 0;

      if (speciesAbilityBonus > 0) {
        confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.CLASS_SYNERGY_MATCH);
        reasons.push(
          `${species.name} grants ${primaryAbility} bonus, strengthening ${classEntry.name}'s abilities`
        );
      } else if (speciesAbilityBonus === 0) {
        // Neutral ability alignment
        confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.ABILITY_COHERENCE);
      }
    }

    // 2. Special abilities usefulness
    if (species.abilities && species.abilities.length > 0) {
      confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.TRAIT_UTILITY);
      reasons.push(`${species.name} has special abilities: ${species.abilities[0]}`);
    }

    // 3. Language grants
    if (species.languages && species.languages.length > 1) {
      confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.LANGUAGE_BREADTH);
      reasons.push(
        `${species.name} grants multiple starting languages: ${species.languages.slice(0, 2).join(", ")}`
      );
    }

    // 4. Category diversity (prefer human/common types early)
    if (species.category && species.category.toLowerCase() === "humanoid") {
      confidence = Math.max(confidence, SPECIES_CONFIDENCE_TIERS.CLASS_SYNERGY_MATCH);
      reasons.push("Humanoid species provides balanced abilities");
    }

    // Primary reason (first relevant one)
    const primaryReason = reasons.length > 0 ? reasons[0] : `${species.name} is available`;

    return {
      confidence,
      primaryReason,
      reasons,
    };
  }

  /**
   * Get primary ability for a class (e.g., STR for Soldier, WIS for Jedi).
   *
   * @private
   * @returns {string} ability key (str, dex, con, int, wis, cha)
   */
  static _getPrimaryAbilityForClass(classEntry) {
    // Check CLASS_SYNERGY_DATA if available
    const classData = CLASS_SYNERGY_DATA[classEntry.name];
    if (classData?.primaryAbility) {
      return classData.primaryAbility.toLowerCase();
    }

    // Fallback heuristics based on class name
    const className = (classEntry.name || "").toLowerCase();
    if (className.includes("soldier") || className.includes("officer"))
      return "str";
    if (className.includes("scout") || className.includes("scoundrel"))
      return "dex";
    if (className.includes("jedi")) return "wis";
    if (className.includes("noble") || className.includes("diplomat"))
      return "cha";
    if (className.includes("tech")) return "int";

    return "str"; // Default
  }

  /**
   * Get current class from actor.
   *
   * @private
   */
  static _getCurrentClass(actor) {
    if (!actor) return null;

    // Try progression system
    const progressionClasses = actor.system?.progression?.classLevels;
    if (Array.isArray(progressionClasses) && progressionClasses.length > 0) {
      return progressionClasses[0];
    }

    // Try legacy system
    const legacyClass = actor.system?.class;
    if (legacyClass) {
      return typeof legacyClass === "string"
        ? { name: legacyClass }
        : legacyClass;
    }

    // Try items
    const classItem = actor.items?.find(item => item.type === "class");
    if (classItem) {
      return {
        id: classItem._id,
        name: classItem.name,
        classId: classItem._id,
      };
    }

    return null;
  }
}
