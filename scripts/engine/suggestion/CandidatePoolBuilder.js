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


function stableCandidateStringify(value, depth = 0) {
  if (depth > 4) return '...';
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(v => stableCandidateStringify(v, depth + 1)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableCandidateStringify(value[key], depth + 1)}`).join(',')}}`;
}

function candidateId(candidate) {
  return String(candidate?._id ?? candidate?.id ?? candidate?.uuid ?? candidate?.name ?? '').trim();
}

function candidateTreeId(candidate) {
  return candidate?.system?.talent_tree
    || candidate?.system?.talentTree
    || candidate?.system?.tree
    || candidate?.system?.tree_id
    || candidate?.treeId
    || candidate?.treeName;
}

/**
 * Filters candidate pools based on slot context
 * Implements domain-enforcement rules to prevent leakage
 */
export class CandidatePoolBuilder {
  static _candidatePoolCache = new Map();
  static _candidatePoolCacheOrder = [];
  static _candidatePoolCacheMax = 80;

  static _actorCacheSignature(actor) {
    if (!actor) return 'no-actor';
    const actorRevision = actor?._stats?.modifiedTime
      ?? actor?._source?._stats?.modifiedTime
      ?? actor?.system?._version
      ?? null;
    const itemSignature = Array.from(actor?.items ?? [])
      .map(item => `${item?.id ?? item?._id ?? 'no-id'}:${item?.type ?? 'unknown'}:${item?._stats?.modifiedTime ?? item?._source?._stats?.modifiedTime ?? item?.system?._version ?? ''}`)
      .join('|');
    return [actor?.id ?? 'no-id', actor?.type ?? 'unknown', actorRevision ?? 'no-revision', actor?.items?.size ?? 0, itemSignature].join('::');
  }

  static _slotCacheSignature(slotContext) {
    if (!slotContext || typeof slotContext !== 'object') return 'no-slot';
    return stableCandidateStringify(slotContext);
  }

  static _candidatesCacheSignature(candidates = []) {
    return [
      candidates.length,
      candidates.map(candidate => `${candidateId(candidate)}:${candidate?.type ?? ''}:${candidate?.system?.talent_tree ?? candidate?.system?.talentTree ?? ''}`).join('|')
    ].join('::');
  }

  static _buildCacheKey(actor, slotContext, allCandidates) {
    return [
      this._actorCacheSignature(actor),
      this._slotCacheSignature(slotContext),
      this._candidatesCacheSignature(allCandidates)
    ].join('||');
  }

  static _getCachedCandidateIds(cacheKey) {
    if (!cacheKey) return null;
    const entry = this._candidatePoolCache.get(cacheKey);
    if (!entry) return null;
    return Array.isArray(entry.ids) ? [...entry.ids] : null;
  }

  static _setCachedCandidateIds(cacheKey, candidates) {
    if (!cacheKey || !Array.isArray(candidates)) return;
    const ids = candidates.map(candidateId).filter(Boolean);
    this._candidatePoolCache.set(cacheKey, { ids });
    const existing = this._candidatePoolCacheOrder.indexOf(cacheKey);
    if (existing >= 0) this._candidatePoolCacheOrder.splice(existing, 1);
    this._candidatePoolCacheOrder.push(cacheKey);
    while (this._candidatePoolCacheOrder.length > this._candidatePoolCacheMax) {
      const staleKey = this._candidatePoolCacheOrder.shift();
      if (staleKey) this._candidatePoolCache.delete(staleKey);
    }
  }

  static _resolveCachedCandidates(allCandidates, cachedIds, slotContext) {
    if (!Array.isArray(allCandidates) || !Array.isArray(cachedIds)) return [];
    const byId = new Map(allCandidates.map(candidate => [candidateId(candidate), candidate]));
    const resolved = cachedIds.map(id => byId.get(id)).filter(Boolean);
    if (slotContext?.slotKind === 'talent') {
      for (const candidate of resolved) {
        TalentCandidateEnricher.enrich(candidate, candidateTreeId(candidate));
      }
    }
    return resolved;
  }

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

    const cacheKey = options?.disableCandidatePoolCache ? null : this._buildCacheKey(actor, slotContext, allCandidates);
    const cachedIds = this._getCachedCandidateIds(cacheKey);
    if (cachedIds) {
      const cachedCandidates = this._resolveCachedCandidates(allCandidates, cachedIds, slotContext);
      logSuggestionTrace(
        options,
        `[CandidatePoolBuilder] Slot ${slotContext.slotKind}/${slotContext.slotType}: ` +
          `${allCandidates.length} -> ${cachedCandidates.length} candidates (cache hit)`
      );
      return { slotContext, filteredCandidates: cachedCandidates };
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

    this._setCachedCandidateIds(cacheKey, filteredCandidates);

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
