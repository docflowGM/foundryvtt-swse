/**
 * Candidate Pool Builder - Phase 2A
 *
 * Filters candidates based on slot context to prevent domain leakage.
 * Ensures only items legal for the active slot are scored.
 *
 * Insertion point: SuggestionEngine (before calling SuggestionScorer)
 */

import { ClassFeatRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/class-feat-registry.js";
import { getAllowedTalentTrees } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TalentCandidateEnricher } from "/systems/foundryvtt-swse/scripts/engine/suggestion/TalentCandidateEnricher.js";
import { logSuggestionTrace } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-trace-controls.js";

/**
 * Filters candidate pools based on slot context
 * Implements domain-enforcement rules to prevent leakage
 */
export class CandidatePoolBuilder {
  /**
   * Build a filtered candidate pool for the active slot
   * @param {Object} actor - Actor document
   * @param {Object} slotContext - Slot context {slotKind, slotType, classId, domains, ...}
   * @param {Array} allCandidates - All candidate items before filtering
   * @returns {Promise<{slotContext, filteredCandidates}>} Filtered pool
   */
  static async build(actor, slotContext, allCandidates, options = {}) {
    if (!actor || !slotContext || !allCandidates) {
      SWSELogger.warn(
        "[CandidatePoolBuilder] Missing required parameters",
        { hasActor: !!actor, hasSlotContext: !!slotContext, hasAllCandidates: !!allCandidates }
      );
      return { slotContext, filteredCandidates: [] };
    }

    let filteredCandidates = [];

    switch (slotContext.slotKind) {
      case "feat":
        filteredCandidates = await this._filterFeatCandidates(
          actor,
          slotContext,
          allCandidates
        );
        break;

      case "talent":
        filteredCandidates = this._filterTalentCandidates(
          actor,
          slotContext,
          allCandidates
        );
        break;

      case "forceTechnique":
        filteredCandidates = await this._filterForceTechniqueCandidates(
          actor,
          slotContext,
          allCandidates
        );
        break;

      case "attributeIncrease":
        // Special case: attribute increases are not items, handled separately
        // Return candidates as-is (they are allocations, not item filters)
        filteredCandidates = allCandidates;
        break;

      default:
        SWSELogger.warn(`[CandidatePoolBuilder] Unknown slot kind: ${slotContext.slotKind}`);
        filteredCandidates = [];
    }

    logSuggestionTrace(
      options,
      `[CandidatePoolBuilder] Slot ${slotContext.slotKind}/${slotContext.slotType}: ` +
        `${allCandidates.length} -> ${filteredCandidates.length} candidates`
    );

    return { slotContext, filteredCandidates };
  }

  /**
   * Filter feat candidates based on feat slot rules
   * @private
   */
  static async _filterFeatCandidates(actor, slotContext, allCandidates) {
    if (slotContext.slotType === "class") {
      // Class bonus feat slot: only feats in registry for this class
      return this._filterClassBonusFeats(actor, slotContext, allCandidates);
    }

    if (slotContext.slotType === "heroic") {
      // General feat slot: all feats passing prerequisites
      return this._filterHeroicFeats(actor, allCandidates);
    }

    return [];
  }

  /**
   * Class bonus feat filtering
   * @private
   */
  static async _filterClassBonusFeats(actor, slotContext, allCandidates) {
    const actorClassFallbacks = Array.from(actor?.items || [])
      .filter((item) => item?.type === 'class')
      .flatMap((item) => [
        item?.system?.classId,
        item?.system?.id,
        item?.id,
        item?._id,
        item?.name,
        item?.system?.class_name,
      ]);

    const classLookupKeys = Array.from(new Set([
      ...(Array.isArray(slotContext.classLookupKeys) ? slotContext.classLookupKeys : []),
      slotContext.classId,
      slotContext.className,
      slotContext.selectedClass?.id,
      slotContext.selectedClass?._id,
      slotContext.selectedClass?.name,
      ...actorClassFallbacks,
    ].map((value) => String(value || '').trim()).filter(Boolean)));

    if (!classLookupKeys.length) {
      SWSELogger.warn("[CandidatePoolBuilder] Class bonus feat slot missing classId");
      return [];
    }

    // Get allowed feats for this class
    const allowedFeatIds = await ClassFeatRegistry.getClassBonusFeats(classLookupKeys);
    const allowedFeatIdSet = new Set((allowedFeatIds || []).map((value) => String(value || '').trim()).filter(Boolean));

    // Filter to only allowed feats
    return allCandidates.filter(
      (candidate) => allowedFeatIdSet.has(String(candidate._id || candidate.id || candidate.uuid || '').trim())
    );
  }

  /**
   * Heroic general feat filtering
   * PHASE 2: Uses AbilityEngine for legality evaluation, not direct PrerequisiteChecker
   * @private
   */
  static async _filterHeroicFeats(actor, allCandidates) {
    const filtered = [];

    for (const candidate of allCandidates) {
      // PHASE 2: Check legality through AbilityEngine authority layer
      if (AbilityEngine.canAcquire(actor, candidate)) {
        filtered.push(candidate);
      }
    }

    return filtered;
  }

  /**
   * Filter talent candidates based on talent slot rules
   * Also enriches candidates with tree context (Phase 2F: Tag Inheritance)
   * @private
   */
  static _normalizeTreeAccessKey(value) {
    return String(value ?? '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  static _filterTalentCandidates(actor, slotContext, allCandidates) {
    // Get allowed trees for this slot
    const allowedTrees = getAllowedTalentTrees(actor, slotContext);

    if (allowedTrees.length === 0) {
      SWSELogger.warn(
        `[CandidatePoolBuilder] No allowed trees for talent slot ${slotContext.slotType}`,
        slotContext
      );
      return [];
    }

    // Filter to candidates in allowed trees
    const allowedTreeKeys = new Set((allowedTrees || []).map(tree => this._normalizeTreeAccessKey(tree)).filter(Boolean));
    const filtered = allCandidates.filter((candidate) => {
      const treeId = candidate.system?.talent_tree || candidate.system?.talentTree || candidate.system?.tree || candidate.system?.tree_id || candidate.treeId || candidate.treeName;
      if (!treeId) return true;
      return allowedTreeKeys.has(this._normalizeTreeAccessKey(treeId));
    });

    // Enrich each candidate with tree context (Phase 2F: Tag Inheritance)
    // This adds context.allTags = union(candidate.tags + tree.tags)
    for (const candidate of filtered) {
      const treeId = candidate.system?.talent_tree
        || candidate.system?.talentTree
        || candidate.system?.tree
        || candidate.system?.tree_id
        || candidate.treeId
        || candidate.treeName;
      TalentCandidateEnricher.enrich(candidate, treeId);
    }

    return filtered;
  }

  /**
   * Filter force technique candidates
   * PHASE 2: Uses AbilityEngine for legality evaluation, not direct PrerequisiteChecker
   * @private
   */
  static async _filterForceTechniqueCandidates(actor, slotContext, allCandidates) {
    // Force techniques are already filtered by ForceTechniqueSuggestionEngine
    // Just ensure only eligible ones are included
    const filtered = [];

    for (const candidate of allCandidates) {
      // PHASE 2: Check legality through AbilityEngine authority layer
      if (AbilityEngine.canAcquire(actor, candidate)) {
        filtered.push(candidate);
      }
    }

    return filtered;
  }
}

export default CandidatePoolBuilder;
