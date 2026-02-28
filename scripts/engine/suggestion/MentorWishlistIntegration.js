/**
 * SWSE Mentor Wishlist Integration
 * Enhances mentor suggestions to consider player goals and prerequisites
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { WishlistEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/WishlistEngine.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { PrerequisiteRequirements } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/prerequisite_engine.js";

export class MentorWishlistIntegration {
  /**
   * Enhance mentor suggestions to consider wishlisted items
   * Prioritizes prerequisites for player goals
   * @param {Array} suggestions - Base suggestions from suggestion engine
   * @param {Object} actor - The character actor
   * @returns {Array} Suggestions reranked with wishlist consideration
   */
  static enhanceSuggestionsWithWishlist(suggestions, actor) {
    if (!suggestions || suggestions.length === 0 || !actor) {
      return suggestions;
    }

    const wishlist = WishlistEngine.getWishlist(actor);
    const allWishlisted = [...wishlist.feats, ...wishlist.talents];

    if (allWishlisted.length === 0) {
      // No wishlist items, return suggestions as-is
      return suggestions;
    }

    SWSELogger.log('[MENTOR-WISHLIST] Enhancing suggestions with wishlist consideration:', {
      totalSuggestions: suggestions.length,
      wishlistItems: allWishlisted.length
    });

    // Score each suggestion based on wishlist alignment
    const scoredSuggestions = suggestions.map(suggestion => {
      let wishlistBoost = 0;
      const wishlistContext = [];

      // Check if this suggestion is a prerequisite for any wishlisted item
      for (const wishedItem of allWishlisted) {
        const canonical = AbilityEngine.getUnmetRequirements(actor, wishedItem);
        const legacy = PrerequisiteRequirements.getUnmetRequirements(actor, wishedItem);
        if (JSON.stringify(canonical) !== JSON.stringify(legacy)) {
          console.warn('getUnmetRequirements mismatch (wishlist)', { item: wishedItem.name, canonical, legacy });
        }
        const unmetReqs = canonical;

        // Check if this suggestion fulfills one of the unmet requirements
        const helpfulForGoal = unmetReqs.some(req =>
          req.toLowerCase().includes(suggestion.name.toLowerCase()) ||
          this._doesSuggestionHelpRequirement(suggestion, req, actor)
        );

        if (helpfulForGoal) {
          wishlistBoost += 0.5;  // Significant boost for wishlist prerequisites
          wishlistContext.push({
            goal: wishedItem.name,
            stepsRemaining: unmetReqs.length
          });
        }
      }

      return {
        ...suggestion,
        wishlistBoost,
        wishlistContext,
        mentorReason: this._buildMentorReason(suggestion, wishlistBoost, wishlistContext)
      };
    });

    // Re-sort by original tier, then by wishlist boost
    const enhanced = scoredSuggestions.sort((a, b) => {
      const tierDiff = (b.suggestion?.tier ?? 0) - (a.suggestion?.tier ?? 0);
      if (tierDiff !== 0) {return tierDiff;}
      return b.wishlistBoost - a.wishlistBoost;
    });

    SWSELogger.log('[MENTOR-WISHLIST] Enhanced suggestions:', {
      topSuggestion: enhanced[0]?.name,
      wishlistBoost: enhanced[0]?.wishlistBoost,
      context: enhanced[0]?.wishlistContext
    });

    return enhanced;
  }

  /**
   * Get mentor voiceover context considering wishlist
   * @param {Object} suggestion - The suggested feat/talent
   * @param {Object} actor - The character actor
   * @param {Object} mentor - The mentor character
   * @returns {string} Enhanced mentor reasoning
   */
  static getMentorWishlistContext(suggestion, actor, mentor) {
    const wishlistContext = suggestion.wishlistContext;

    if (!wishlistContext || wishlistContext.length === 0) {
      return null;
    }

    const topGoal = wishlistContext[0];
    let context = `${mentor.name} nods knowingly. "This will help you pursue ${topGoal.goal}. `;

    if (topGoal.stepsRemaining === 1) {
      context += `You're almost there - one more step and you'll be ready."`;
    } else if (topGoal.stepsRemaining === 2) {
      context += `There's still a bit of ground to cover, but you're on the right path."`;
    } else {
      context += `Keep working toward it, and you'll get there."`;
    }

    return context;
  }

  /**
   * Get recommendations for reaching wishlisted items
   * @param {Object} actor - The character actor
   * @param {Array} allItems - All available feats/talents
   * @returns {Array} Recommendations sorted by priority
   */
  static getWishlistRecommendations(actor, allItems = []) {
    const wishlist = WishlistEngine.getWishlist(actor);
    const allWishlisted = [...wishlist.feats, ...wishlist.talents];

    if (allWishlisted.length === 0) {
      return [];
    }

    const recommendations = [];

    for (const wishedItem of allWishlisted) {
      // Find the actual item document
      const itemDoc = allItems.find(i => (i._id || i.id) === wishedItem.id);
      if (!itemDoc) {continue;}

      const canonical = AbilityEngine.getUnmetRequirements(actor, itemDoc);
      const legacy = PrerequisiteRequirements.getUnmetRequirements(actor, itemDoc);
      if (JSON.stringify(canonical) !== JSON.stringify(legacy)) {
        console.warn('getUnmetRequirements mismatch (prerequisites)', { item: itemDoc.name, canonical, legacy });
      }
      const unmetReqs = canonical;

      // For each unmet requirement, find items that fulfill it
      for (const req of unmetReqs) {
        const fulfilling = allItems.filter(item => {
          const itemSatisfiesReq =
            req.toLowerCase().includes(item.name.toLowerCase()) ||
            this._doesItemSatisfyRequirement(item, req, actor);

          // Only recommend items that aren't already owned
          const isNotOwned = !actor.items.some(i =>
            (i._id === item._id || i.id === item.id) && i.type === (item.type || 'feat')
          );

          return itemSatisfiesReq && isNotOwned;
        });

        for (const item of fulfilling) {
          recommendations.push({
            item: item,
            goal: wishedItem.name,
            requirement: req,
            stepOrder: unmetReqs.indexOf(req),
            priority: unmetReqs.length - unmetReqs.indexOf(req)  // First steps are higher priority
          });
        }
      }
    }

    // Sort by priority (how close this step is to reaching goal)
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);  // Top 5 recommendations
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────

  static _doesSuggestionHelpRequirement(suggestion, requirement, actor) {
    // Check if the suggestion would help meet this requirement
    const name = suggestion.name.toLowerCase();
    const req = requirement.toLowerCase();

    // Direct name match
    if (req.includes(name)) {return true;}

    // BAB requirement - check if suggestion increases BAB
    if (req.includes('bab') && (req.includes('feat') || req.includes('talent'))) {
      // Feats like "Power Attack" help with BAB-heavy builds
      if (name.includes('attack') || name.includes('combat') || name.includes('weapon')) {
        return true;
      }
    }

    // Ability requirement - check if suggestion synergizes with that ability
    const abilityMatch = req.match(/(\w{3})\s+(\d+)/i);
    if (abilityMatch) {
      const ability = abilityMatch[1].toLowerCase();
      if (name.includes(ability.substring(0, 3))) {
        return true;
      }
    }

    return false;
  }

  static _doesItemSatisfyRequirement(item, requirement, actor) {
    const itemName = item.name.toLowerCase();
    const req = requirement.toLowerCase();

    // Direct match
    if (req.includes(itemName)) {return true;}

    // Check if acquiring this item gets us closer to the requirement
    const tempItem = {
      ...item,
      // Simulate having acquired this item
      _id: item._id + '_temp'
    };
    const unmetAfterCanonical = AbilityEngine.getUnmetRequirements(actor, tempItem);
    const unmetAfterLegacy = PrerequisiteRequirements.getUnmetRequirements(actor, tempItem);
    const unmetBeforeCanonical = AbilityEngine.getUnmetRequirements(actor, item);
    const unmetBeforeLegacy = PrerequisiteRequirements.getUnmetRequirements(actor, item);

    if (JSON.stringify(unmetAfterCanonical) !== JSON.stringify(unmetAfterLegacy)) {
      console.warn('getUnmetRequirements mismatch (after item)', { item: item.name, canonical: unmetAfterCanonical, legacy: unmetAfterLegacy });
    }
    if (JSON.stringify(unmetBeforeCanonical) !== JSON.stringify(unmetBeforeLegacy)) {
      console.warn('getUnmetRequirements mismatch (before item)', { item: item.name, canonical: unmetBeforeCanonical, legacy: unmetBeforeLegacy });
    }

    return unmetAfterCanonical.length < unmetBeforeCanonical.length;
  }

  static _buildMentorReason(suggestion, wishlistBoost, wishlistContext) {
    if (wishlistBoost === 0 || wishlistContext.length === 0) {
      return suggestion.suggestion?.reason || 'A solid choice';
    }

    const baseReason = suggestion.suggestion?.reason || 'A useful option';
    const topGoal = wishlistContext[0];

    return `${baseReason} — this will help you reach ${topGoal.goal}`;
  }
}

export default MentorWishlistIntegration;
