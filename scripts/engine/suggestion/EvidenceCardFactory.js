/**
 * EvidenceCardFactory - Phase 2F: Mentor Evidence Sources
 *
 * Generates structured evidence cards for mentor reasoning.
 * Mentors cite evidence cards (not math) to explain suggestions.
 *
 * Evidence source types:
 * - TalentTree: tree tags + description
 * - CandidateTags: candidate's own tags
 * - ArchetypeAffinity: high-level archetype alignment
 * - ChainContinuation: momentum from related picks
 * - PrestigeTrajectory: alignment with prestige path
 * - DefenseNeed: defensive state assessment
 * - MilestoneForecast: upcoming level grants
 * - AttributeBreakpoint: crosses a modifier breakpoint
 * - WishlistTarget: moves toward wishlisted path
 *
 * No mathematical exposition—just readable "why."
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TalentCandidateEnricher } from "/systems/foundryvtt-swse/scripts/engine/suggestion/TalentCandidateEnricher.js";

export class EvidenceCardFactory {
  /**
   * Create an evidence card for TalentTree source
   * @param {Object} candidate - The candidate with enriched context
   * @returns {Object|null} Evidence card or null
   */
  static createTalentTreeCard(candidate) {
    const treeMeta = TalentCandidateEnricher.getTreeMeta(candidate);
    if (!treeMeta || !candidate?.context?.treeId) {
      return null;
    }

    return {
      source: "TalentTree",
      refId: candidate.context.treeId,
      label: treeMeta.name || "Unknown Tree",
      tags: candidate.context.treeTags || [],
      descriptor: treeMeta.descriptor || "",
      text: `Part of ${treeMeta.name}, a talent path focused on ${treeMeta.descriptor || "skill development"}.`
    };
  }

  /**
   * Create an evidence card for candidate's own tags
   * @param {Object} candidate - The candidate
   * @returns {Object|null} Evidence card or null
   */
  static createCandidateTagsCard(candidate) {
    const candidateTags = candidate?.context?.candidateTags || candidate?.tags || [];
    if (!candidateTags || candidateTags.length === 0) {
      return null;
    }

    const tagList = Array.isArray(candidateTags) ? candidateTags.join(", ") : String(candidateTags);

    return {
      source: "CandidateTags",
      refId: candidate._id || candidate.id,
      label: candidate.name || "Unknown Candidate",
      tags: candidateTags,
      text: `${candidate.name} directly brings: ${tagList}.`
    };
  }

  /**
   * Create an evidence card for archetype affinity
   * @param {string} archetyeType - Archetype name
   * @param {Array<string>} reasons - Reasons this archetype likes this choice
   * @returns {Object}
   */
  static createArchetypeAffinityCard(archetypeType, reasons = []) {
    const reasonText = reasons.length > 0
      ? `Common for ${archetypeType} players: ${reasons.join(", ")}`
      : `${archetypeType} archetype affinity.`;

    return {
      source: "ArchetypeAffinity",
      refId: `archetype:${archetypeType}`,
      label: archetypeType,
      text: reasonText
    };
  }

  /**
   * Create an evidence card for chain continuation
   * @param {string} chainName - Name of the feat/talent chain
   * @param {string} lastPick - Name of the previous pick in chain
   * @returns {Object}
   */
  static createChainContinuationCard(chainName, lastPick = null) {
    const text = lastPick
      ? `Build momentum by continuing the ${chainName} chain after selecting ${lastPick}.`
      : `This continues the ${chainName} chain, keeping your build coherent.`;

    return {
      source: "ChainContinuation",
      refId: `chain:${chainName}`,
      label: chainName,
      text
    };
  }

  /**
   * Create an evidence card for prestige trajectory
   * @param {string} prestigePath - Name of prestige path
   * @param {string} alignment - How it aligns with path
   * @returns {Object}
   */
  static createPrestigeTrajectoryCard(prestigePath, alignment = "aligns with") {
    return {
      source: "PrestigeTrajectory",
      refId: `prestige:${prestigePath}`,
      label: prestigePath,
      text: `This choice ${alignment} your path toward ${prestigePath}.`
    };
  }

  /**
   * Create an evidence card for defense need
   * @param {number} defenseDeficit - How much defense is needed
   * @param {string} context - Context (level, damage taken, etc.)
   * @returns {Object}
   */
  static createDefenseNeedCard(defenseDeficit = 0, context = "your current level") {
    const needText = defenseDeficit > 0
      ? `Your defenses are low for ${context}; this helps shore them up.`
      : `This improves your survivability.`;

    return {
      source: "DefenseNeed",
      refId: "actor:defense",
      label: "Survivability",
      text: needText
    };
  }

  /**
   * Create an evidence card for milestone forecast
   * @param {number} targetLevel - Upcoming level
   * @param {string} milestone - What happens at target level
   * @returns {Object}
   */
  static createMilestoneForecastCard(targetLevel = 0, milestone = "") {
    const text = targetLevel > 0
      ? `At level ${targetLevel}, you'll unlock ${milestone}. This prepares you.`
      : `This prepares you for an upcoming milestone.`;

    return {
      source: "MilestoneForecast",
      refId: `nextLevel:${targetLevel}`,
      label: `Level ${targetLevel}`,
      text
    };
  }

  /**
   * Create an evidence card for attribute breakpoint
   * @param {string} attribute - Ability modifier (STR, DEX, etc.)
   * @param {number} modifier - The modifier value
   * @returns {Object}
   */
  static createAttributeBreakpointCard(attribute = "ability", modifier = 0) {
    return {
      source: "AttributeBreakpoint",
      refId: `actor:attributes.${attribute}`,
      label: `+${modifier} ${attribute} modifier`,
      text: `This crosses a modifier breakpoint at your ${attribute} score, increasing value.`
    };
  }

  /**
   * Create an evidence card for wishlist target
   * @param {string} wishlistPath - Path the player is building toward
   * @returns {Object}
   */
  static createWishlistTargetCard(wishlistPath) {
    return {
      source: "WishlistTarget",
      refId: "actor:wishlist",
      label: "Wishlist",
      text: `This moves you toward your stated wishlist goal: ${wishlistPath}.`
    };
  }

  /**
   * Create multiple evidence cards from a candidate's context
   * Useful for generating a full set of reasons
   *
   * @param {Object} candidate - The candidate
   * @param {Object} options - Options for evidence generation
   *   - includeTreeCard: bool (default true)
   *   - includeTagsCard: bool (default true)
   *   - archetype: string (archetype type for affinity)
   *   - defensePressure: number (defense need level)
   * @returns {Array<Object>} Array of evidence cards
   */
  static createEvidenceSet(candidate, options = {}) {
    const cards = [];

    // TalentTree card (if candidate is enriched)
    if (options.includeTreeCard !== false && candidate?.context?.treeId) {
      const treeCard = this.createTalentTreeCard(candidate);
      if (treeCard) {
        cards.push(treeCard);
      }
    }

    // CandidateTags card
    if (options.includeTagsCard !== false && candidate?.tags?.length > 0) {
      const tagsCard = this.createCandidateTagsCard(candidate);
      if (tagsCard) {
        cards.push(tagsCard);
      }
    }

    // Archetype affinity (if provided)
    if (options.archetype) {
      cards.push(this.createArchetypeAffinityCard(options.archetype, options.archetypeReasons || []));
    }

    // Defense need (if pressure detected)
    if (options.defensePressure && options.defensePressure > 0) {
      cards.push(this.createDefenseNeedCard(options.defensePressure));
    }

    // Prestige trajectory (if provided)
    if (options.prestigePath) {
      cards.push(this.createPrestigeTrajectoryCard(options.prestigePath, options.trajectoryAlignment));
    }

    // Wishlist target (if provided)
    if (options.wishlistPath) {
      cards.push(this.createWishlistTargetCard(options.wishlistPath));
    }

    SWSELogger.log(
      `[EvidenceCardFactory] Generated ${cards.length} evidence cards for "${candidate.name}"`
    );

    return cards;
  }

  /**
   * Convert evidence cards to mentor-friendly text
   * Useful for generating mentor dialogue
   *
   * @param {Array<Object>} cards - Evidence cards
   * @returns {string} Formatted text for mentor dialogue
   */
  static cardsToMentorText(cards) {
    if (!Array.isArray(cards) || cards.length === 0) {
      return "This choice fits your path forward.";
    }

    // Use first 2 cards max for brevity
    const primaryCards = cards.slice(0, 2);
    const reasons = primaryCards.map((card) => card.text);

    return reasons.join(" ");
  }
}

export default EvidenceCardFactory;
