/**
 * TalentCandidateEnricher - Phase 2F: Tag Inheritance
 *
 * Enriches talent candidates with inheritance context:
 * - Attaches treeId and tree metadata
 * - Computes allTags (union of candidate tags + tree tags)
 * - Builds context object for scoring and mentoring
 *
 * Usage:
 *   const enriched = TalentCandidateEnricher.enrich(candidate, treeId);
 *   // candidate.context now contains:
 *   // {
 *   //   treeId, treeName, treeTags,
 *   //   candidateTags, allTags
 *   // }
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TalentTreeTagRegistry } from "/systems/foundryvtt-swse/scripts/engine/suggestion/TalentTreeTagRegistry.js";

export class TalentCandidateEnricher {
  /**
   * Enrich a talent candidate with tree context
   *
   * @param {Object} candidate - Talent candidate item
   * @param {string} treeId - Tree UUID or name
   * @returns {Object} Enriched candidate (mutated in-place, returns self)
   */
  static enrich(candidate, treeId) {
    if (!candidate) {
      return candidate;
    }

    // Initialize context if not present
    if (!candidate.context) {
      candidate.context = {};
    }

    // Get tree metadata from registry
    let treeMeta = null;

    // Try UUID lookup first
    if (treeId) {
      treeMeta = TalentTreeTagRegistry.getByTreeId(treeId);

      // Fallback to name lookup if UUID didn't work
      if (!treeMeta) {
        treeMeta = TalentTreeTagRegistry.getByTreeName(treeId);
      }
    }

    // Extract candidate's own tags
    const candidateTags = candidate.tags || candidate.system?.tags || [];

    // Extract tree tags (if tree found)
    const treeTags = treeMeta?.tags || [];

    // Union of candidate + tree tags
    const allTags = Array.from(new Set([...candidateTags, ...treeTags]));

    // Build context object
    candidate.context = {
      // Tree reference
      treeId: treeId || null,
      treeName: treeMeta?.name || null,
      treeDescriptor: treeMeta?.descriptor || null,

      // Tags
      treeTags,
      candidateTags: Array.from(candidateTags), // Ensure array copy
      allTags,

      // Metadata (optional, for mentor reasoning)
      enrichedAt: new Date().toISOString(),
      version: "2.0"
    };

    SWSELogger.log(
      `[TalentCandidateEnricher] Enriched "${candidate.name}" with tree "${candidate.context.treeName}"`,
      {
        candidateTagCount: candidateTags.length,
        treeTagCount: treeTags.length,
        allTagCount: allTags.length
      }
    );

    return candidate;
  }

  /**
   * Enrich multiple candidates (batch operation)
   *
   * @param {Array<Object>} candidates - Array of talent candidates
   * @param {string} treeId - Tree UUID or name
   * @returns {Array<Object>} Array of enriched candidates
   */
  static enrichBatch(candidates, treeId) {
    if (!Array.isArray(candidates)) {
      return [];
    }

    return candidates.map((candidate) => this.enrich(candidate, treeId));
  }

  /**
   * Get allTags for a candidate (with fallback)
   * Returns context.allTags if available, otherwise candidate.tags
   *
   * @param {Object} candidate - Talent candidate
   * @returns {Array<string>} Array of tags
   */
  static getAllTags(candidate) {
    if (candidate?.context?.allTags) {
      return candidate.context.allTags;
    }

    // Fallback to candidate's own tags
    return candidate?.tags || candidate?.system?.tags || [];
  }

  /**
   * Check if a candidate's allTags includes a specific tag
   *
   * @param {Object} candidate - Talent candidate
   * @param {string} tag - Tag to check
   * @returns {boolean}
   */
  static hasTag(candidate, tag) {
    return this.getAllTags(candidate).includes(tag);
  }

  /**
   * Get the tree metadata for a candidate
   *
   * @param {Object} candidate - Talent candidate
   * @returns {Object|null} Tree metadata or null
   */
  static getTreeMeta(candidate) {
    if (!candidate?.context?.treeId) {
      return null;
    }

    return TalentTreeTagRegistry.getByTreeId(candidate.context.treeId);
  }
}

export default TalentCandidateEnricher;
