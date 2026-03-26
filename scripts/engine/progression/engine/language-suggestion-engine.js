/**
 * LanguageSuggestionEngine
 *
 * Provides grounded language recommendations based on:
 * - Selected species (grants starting languages)
 * - Selected background (cultural/regional context)
 * - Class/archetype fit
 * - Existing selected languages (to suggest complementary ones)
 *
 * Uses existing LanguageRegistry and bonus language allocation logic.
 * Returns fewer, stronger suggestions (avoids language spam).
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { LanguageRegistry } from "/systems/foundryvtt-swse/scripts/registries/language-registry.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";

/**
 * Confidence scoring for language suggestions
 */
const LANGUAGE_CONFIDENCE_TIERS = {
  SPECIES_CULTURAL: 0.80,     // Language native to selected species
  BACKGROUND_CULTURAL: 0.75,  // Language common in selected background
  ARCHETYPE_UTILITY: 0.70,    // Useful for class/role
  TRADE_LANGUAGE: 0.65,       // Widely useful trade language
  FALLBACK_AVAILABLE: 0.50,   // Available but no special justification
};

export class LanguageSuggestionEngine {
  /**
   * Suggest languages based on character context.
   *
   * @param {Array} availableLanguages - Language items to suggest from
   * @param {Actor} actor - Character actor
   * @param {Object} pendingData - Accumulated selections: {selectedSpecies, selectedBackground, ...}
   * @param {Object} options - Engine options: {debug}
   * @returns {Promise<Array>} Suggestions with reasons
   */
  static async suggestLanguages(
    availableLanguages = [],
    actor,
    pendingData = {},
    options = {}
  ) {
    try {
      if (!actor) return [];
      if (!Array.isArray(availableLanguages) || availableLanguages.length === 0) return [];

      const trace = options.debug ?? false;

      // Ensure registry loaded
      await LanguageRegistry.ensureLoaded();

      // Get context from pending
      const selectedSpecies = pendingData.selectedSpecies;
      const selectedBackground = pendingData.selectedBackground;
      const selectedLanguages = pendingData.selectedLanguages || [];

      // Get already-selected languages from actor or pending
      const currentLanguages = this._getCurrentLanguages(actor, selectedLanguages);

      // Normalize available languages
      const normalized = availableLanguages
        .map(item => ({
          id: item._id || item.id,
          name: item.name,
          category: item.system?.category || item.category || "standard",
          slug: (item.system?.slug || item.slug || item.name || "").toLowerCase(),
          raw: item,
        }))
        .filter(
          l =>
            l.id &&
            l.name &&
            !currentLanguages.some(
              cl => (cl.id || cl.name || "").toLowerCase() === (l.name || "").toLowerCase()
            )
        );

      if (normalized.length === 0) return [];

      // Score each language
      const scored = normalized.map(language => {
        const score = this._scoreLanguage(
          language,
          selectedSpecies,
          selectedBackground,
          actor,
          trace
        );

        return {
          id: language.id,
          name: language.name,
          suggestion: {
            confidence: score.confidence,
            reason: score.primaryReason,
            reasons: score.reasons,
          },
        };
      });

      // Filter and return top 2-3 (languages shouldn't be noisy)
      const suggestions = scored
        .filter(s => s.suggestion.confidence >= 0.55)
        .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence)
        .slice(0, 2);

      if (trace) {
        SWSELogger.log(
          "[LanguageSuggestionEngine] Suggestions computed",
          {
            actor: actor.name,
            species: selectedSpecies?.name,
            background: selectedBackground?.name,
            suggestions: suggestions.map(
              s => `${s.name} (${Math.round(s.suggestion.confidence * 100)}%)`
            ),
          }
        );
      }

      return suggestions;
    } catch (err) {
      SWSELogger.error("[LanguageSuggestionEngine] Error:", err);
      return [];
    }
  }

  /**
   * Score a single language against character context.
   *
   * @private
   * @returns {Object} {confidence, primaryReason, reasons[]}
   */
  static _scoreLanguage(
    language,
    selectedSpecies,
    selectedBackground,
    actor,
    trace = false
  ) {
    let confidence = LANGUAGE_CONFIDENCE_TIERS.FALLBACK_AVAILABLE;
    const reasons = [];

    // 1. Species cultural match
    if (selectedSpecies && selectedSpecies.languages) {
      const speciesLanguages = Array.isArray(selectedSpecies.languages)
        ? selectedSpecies.languages.map(l => (typeof l === "string" ? l : l.name || l))
        : [];

      const isSpeciesLanguage = speciesLanguages.some(
        sl => (sl || "").toLowerCase() === (language.name || "").toLowerCase()
      );

      if (isSpeciesLanguage) {
        confidence = LANGUAGE_CONFIDENCE_TIERS.SPECIES_CULTURAL;
        reasons.push(`Native to ${selectedSpecies.name}`);
      }
    }

    // 2. Background cultural context
    if (selectedBackground && selectedBackground.startingLanguages) {
      const bgLanguages = Array.isArray(selectedBackground.startingLanguages)
        ? selectedBackground.startingLanguages.map(l => (typeof l === "string" ? l : l.name))
        : [];

      const isBgLanguage = bgLanguages.some(
        bl => (bl || "").toLowerCase() === (language.name || "").toLowerCase()
      );

      if (isBgLanguage) {
        confidence = Math.max(confidence, LANGUAGE_CONFIDENCE_TIERS.BACKGROUND_CULTURAL);
        reasons.push(`Common in ${selectedBackground.name}`);
      }
    }

    // 3. Trade/widely-used language bonus
    if (
      language.category &&
      language.category.toLowerCase().includes("trade")
    ) {
      confidence = Math.max(confidence, LANGUAGE_CONFIDENCE_TIERS.TRADE_LANGUAGE);
      if (!reasons.some(r => r.includes("trade"))) {
        reasons.push("Widely used trade language");
      }
    }

    // 4. Primary/widespread languages (heuristic)
    const widelyUsed = [
      "basic",
      "galactic",
      "trade",
      "human",
      "common",
      "aurebesh",
    ];
    if (
      widelyUsed.some(
        w => (language.name || "").toLowerCase().includes(w)
      )
    ) {
      confidence = Math.max(confidence, LANGUAGE_CONFIDENCE_TIERS.TRADE_LANGUAGE);
      if (!reasons.some(r => r.includes("widely"))) {
        reasons.push("Widely understood across the galaxy");
      }
    }

    const primaryReason =
      reasons.length > 0 ? reasons[0] : `${language.name} is available`;

    return {
      confidence,
      primaryReason,
      reasons,
    };
  }

  /**
   * Get currently-selected languages from actor.
   *
   * @private
   * @returns {Array} Current language list
   */
  static _getCurrentLanguages(actor, pendingLanguages = []) {
    const current = [];

    // Add pending selections
    if (Array.isArray(pendingLanguages)) {
      current.push(
        ...pendingLanguages.map(l => ({
          id: l._id || l.id,
          name: l.name,
        }))
      );
    }

    // Add actor's existing languages (from skills or actor system)
    if (actor) {
      // Speak Language skill check
      const speakLanguageSkill = actor.system?.skills?.["speak-language"];
      if (speakLanguageSkill && speakLanguageSkill.languages) {
        current.push(
          ...speakLanguageSkill.languages.map(l => ({
            name: typeof l === "string" ? l : l.name,
          }))
        );
      }

      // Known languages in actor details
      if (actor.system?.details?.languages) {
        const languages = actor.system.details.languages;
        const languageList = typeof languages === "string"
          ? languages.split(",").map(l => l.trim())
          : Array.isArray(languages) ? languages : [];
        current.push(...languageList.map(l => ({ name: l })));
      }
    }

    return current;
  }
}
