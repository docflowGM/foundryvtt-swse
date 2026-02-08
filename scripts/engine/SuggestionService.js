/**
 * SuggestionService
 *
 * Single entry point for all suggestion consumers (chargen, level-up, mentor, sheet).
 *
 * Responsibilities:
 * - Call SuggestionEngineCoordinator (SSOT evaluation)
 * - Add drift-safe targetRef (pack+id) when resolvable
 * - Add reasons/explanations as additive fields when available
 * - Filter reasons by progression focus (visibility gating, not scoring change)
 * - Cache results and invalidate on actor changes
 * - Optionally persist minimal SuggestionState in actor flags
 */
import { SWSELogger } from '../utils/logger.js';
import { SuggestionEngineCoordinator } from './SuggestionEngineCoordinator.js';
import { CompendiumResolver } from './CompendiumResolver.js';
import { SuggestionExplainer } from './SuggestionExplainer.js';
import { getAllowedReasonDomains } from '../suggestions/suggestion-focus-map.js';
import { getReasonRelevance } from '../suggestions/reason-relevance.js';
import { ReasonFactory } from './ReasonFactory.js';
import { ConfidenceScoring } from './ConfidenceScoring.js';
import { SnapshotBuilder } from './SnapshotBuilder.js';
import { getPlannedHeroicLevel, isEpicActor } from '../actors/derived/level-split.js';

import { FeatEngine } from '../progression/feats/feat-engine.js';
import { ForcePowerEngine } from '../progression/engine/force-power-engine.js';

function _hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {h = ((h << 5) - h + s.charCodeAt(i)) | 0;}
  return String(h);
}

/**
 * Generate a hash key for pending data to incorporate in-progress selections
 * This ensures cache invalidation when player makes new selections during a workflow
 * @param {Object} pendingData - Pending selections (selectedFeats, selectedTalents, etc.)
 * @returns {string} Hash string representing pending state
 */
/**
 * @deprecated Use SnapshotBuilder.build() and SnapshotBuilder.hash() instead
 * Kept for reference only. No longer called by SuggestionService.
 */
function _pendingDataHash(pendingData) {
  if (!pendingData || typeof pendingData !== 'object') {return '';}

  // Extract selection arrays and normalize to names
  const parts = [];

  if (pendingData.selectedClass?.name) {
    parts.push(`class:${pendingData.selectedClass.name}`);
  }
  if (Array.isArray(pendingData.selectedFeats)) {
    const feats = pendingData.selectedFeats.map(f => f.name || f).sort().join(',');
    if (feats) {parts.push(`feats:${feats}`);}
  }
  if (Array.isArray(pendingData.selectedTalents)) {
    const talents = pendingData.selectedTalents.map(t => t.name || t).sort().join(',');
    if (talents) {parts.push(`talents:${talents}`);}
  }
  if (Array.isArray(pendingData.selectedSkills)) {
    const skills = pendingData.selectedSkills.map(s => s.key || s.name || s).sort().join(',');
    if (skills) {parts.push(`skills:${skills}`);}
  }
  if (Array.isArray(pendingData.selectedPowers)) {
    const powers = pendingData.selectedPowers.map(p => p.name || p).sort().join(',');
    if (powers) {parts.push(`powers:${powers}`);}
  }

  return parts.length > 0 ? _hashString(parts.join('|')) : '';
}

/**
 * @deprecated Use SnapshotBuilder.hashFromActor() instead
 * Kept for reference only. No longer called by SuggestionService.
 *
 * Legacy hash function that was fragile and opaque.
 * Replaced by SnapshotBuilder for clarity and maintainability.
 */
function _actorRevisionKey(actor, pendingData = null) {
  // Cheap + stable: level + abilities + item ids + item system-level-like fields.
  const lvl = actor?.system?.level ?? 0;
  const abilities = actor?.system?.abilities ?? {};
  const ab = ['str','dex','con','int','wis','cha'].map(k => `${k}:${abilities?.[k]?.value ?? ''}`).join('|');

  const items = (actor?.items ?? []).map(i => {
    const ty = i.type;
    const nm = i.name;
    const id = i.id;
    const sys = i.system ?? {};
    const l = sys.level ?? sys.rank ?? sys.tier ?? '';
    return `${ty}:${nm}:${id}:${l}`;
  }).sort().join('|');

  // Include pendingData hash to ensure cache invalidation on in-progress selections
  const pendingHash = _pendingDataHash(pendingData);

  return _hashString(`${lvl}|${ab}|${items}|${pendingHash}`);
}

function _domainToResolverDomain(domain) {
  if (domain === 'feats') {return 'feat';}
  if (domain === 'talents') {return 'talent';}
  if (domain === 'forcepowers') {return 'forcepowers';}
  if (domain === 'classes') {return 'class';}
  return domain;
}


async function _ensureActorDoc(actorOrData) {
  // Foundry Actor document
  if (actorOrData?.documentName === 'Actor' || actorOrData?.constructor?.name === 'Actor') {return actorOrData;}

  // Try to create a temporary actor from data (chargen often uses raw actor data)
  try {
    if (globalThis.Actor?.create && actorOrData && typeof actorOrData === 'object') {
      return await Actor.create(actorOrData, { temporary: true });
    }
  } catch (err) {
    console.warn('[SuggestionService] Failed to create temporary actor for suggestions', err);
  }
  return actorOrData;
}

export class SuggestionService {
  static _cache = new Map(); // key -> {rev, suggestions, meta}
  static _initialized = false;

  static initialize({ systemJSON }) {
    if (this._initialized) {return;}
    this._initialized = true;
    CompendiumResolver.initializeFromSystemJSON(systemJSON);
    SWSELogger.log('[SuggestionService] Initialized');
  }

  static invalidate(actorId) {
    for (const key of this._cache.keys()) {
      if (key.startsWith(`${actorId}::`)) {this._cache.delete(key);}
    }
  }

  static async getSuggestions(actorOrData, context = 'sheet', options = {}) {
    const actor = await _ensureActorDoc(actorOrData);
    const pendingData = options.pendingData ?? {};
    const focus = options.focus ?? null;

    const plannedHeroicLevel = getPlannedHeroicLevel(actor, pendingData);
    const epicAdvisory = isEpicActor(actor, plannedHeroicLevel);
    options.epicAdvisory = epicAdvisory;

    // Build canonical snapshot and compute stable hash
    // Hash includes: level, abilities, items, focus, and pending selections
    const revision = actor?.id
      ? SnapshotBuilder.hashFromActor(actor, focus, pendingData)
      : `${Date.now()}`;

    const key = `${actor?.id ?? 'temp'}::${context}::${options.domain ?? 'all'}`;

    const cached = this._cache.get(key);
    if (cached?.rev === revision) {return cached.suggestions;}

    const trace = game.settings.get('foundryvtt-swse', 'enableSuggestionTrace') ?? false;

    let suggestions = [];
    const debug = null;

    if (options.domain === 'feats') {
      const availableFeats = options.available ?? FeatEngine.getAvailableFeats(actor, options.className ?? null);
      suggestions = await SuggestionEngineCoordinator.suggestFeats(availableFeats, actor, options.pendingData ?? {}, { ...(options.engineOptions || {}), debug: trace });
    } else if (options.domain === 'talents') {
      suggestions = await SuggestionEngineCoordinator.suggestTalents(options.available ?? [], actor, options.pendingData ?? {}, { ...(options.engineOptions || {}), debug: trace });
    } else if (options.domain === 'classes') {
      suggestions = await SuggestionEngineCoordinator.suggestClasses(options.available ?? [], actor, options.pendingData ?? {}, { ...(options.engineOptions || {}), debug: trace });
    } else if (options.domain === 'forcepowers') {
      const available = options.available ?? await ForcePowerEngine.collectAvailablePowers();
      suggestions = await SuggestionEngineCoordinator.suggestForceOptions(available, actor, options.pendingData ?? {}, { ...(options.engineOptions || {}), debug: trace });
    } else if (options.domain === 'backgrounds') {
      suggestions = await SuggestionEngineCoordinator.suggestBackgrounds(options.available ?? [], actor, options.pendingData ?? {}, { ...(options.engineOptions || {}), debug: trace });
    } else if (options.domain === 'skills_l1') {
      suggestions = await SuggestionEngineCoordinator.suggestLevel1Skills(options.available ?? [], actor, options.pendingData ?? {});
    } else if (options.domain === 'attributes') {
      suggestions = await SuggestionEngineCoordinator.suggestAttributeIncreases(actor, options.pendingData ?? {}, { ...(options.engineOptions || {}), debug: trace });
    } else {
      // Aggregated default for sheet/mentor: feats + force powers (safe and helpful)
      const featSugs = await this.getSuggestions(actor, context, { ...options, domain: 'feats' });
      const forceSugs = await this.getSuggestions(actor, context, { ...options, domain: 'forcepowers' });
      suggestions = [...(featSugs ?? []), ...(forceSugs ?? [])];
    }

    if (trace && (!suggestions || suggestions.length === 0)) {
      SWSELogger.log(`[SuggestionService] No suggestions produced`, {
        actor: actor?.name,
        context,
        domain: options.domain,
        level: actor?.system?.level,
        items: actor?.items?.size ?? actor?.items?.length
      });
    }

    // Normalize + enrich
    const enriched = await this._enrichSuggestions(actor, suggestions, { trace });

    // Filter reasons by focus (visibility gating only, not scoring change)
    // If focus is provided, only show reason domains relevant to that focus
    // (focus was already extracted at the beginning of this method for snapshot hashing)
    const focusFiltered = this._filterReasonsByFocus(enriched, focus, { trace });

    // Optional persist
    if (options.persist === true) {
      await this._persistSuggestionState(actor, context, focusFiltered);
    }

    this.validateSuggestionDTO(focusFiltered, { context, domain: options.domain });
    this._cache.set(key, { rev: revision, suggestions: focusFiltered, meta: { debug } });
    return focusFiltered;
  }

  static async getSuggestionDiff(actor, context = 'levelup', suggestions = null) {
    const state = await actor.getFlag('foundryvtt-swse', 'suggestionState') || {};
    const prev = state?.lastShown?.[context]?.ids ?? [];
    const next = (suggestions ?? await this.getSuggestions(actor, context, { persist: false }))
      .map(s => s?.targetRef?.id || s?.id || s?.name)
      .filter(Boolean);

    const prevSet = new Set(prev);
    const nextSet = new Set(next);

    const added = next.filter(id => !prevSet.has(id));
    const removed = prev.filter(id => !nextSet.has(id));

    return { added, removed };
  }

  static async _persistSuggestionState(actor, context, suggestions) {
    const ids = suggestions.map(s => s?.targetRef?.id || s?.id || s?.name).filter(Boolean);

    const state = (await actor.getFlag('foundryvtt-swse', 'suggestionState')) || {};
    state.lastShown = state.lastShown || {};
    state.lastShown[context] = {
      ids,
      at: Date.now()
    };
    await actor.setFlag('foundryvtt-swse', 'suggestionState', state);
  }

  /**
   * Store the last mentor advice for a specific step to ensure consistency
   * When player re-opens a step, they hear the same advice unless inputs changed
   * @param {Actor} actor - The character actor
   * @param {string} step - The decision step (feats, talents, class, etc.)
   * @param {Object} advice - The advice object to store
   * @param {string} advice.suggestionId - ID or name of the suggested item
   * @param {string} advice.reasonCode - Machine-readable reason code
   * @param {string} advice.reason - Human-readable reason
   * @param {number} advice.tier - Suggestion tier
   * @param {string} inputsHash - Hash of inputs that produced this advice
   */
  static async storeMentorAdvice(actor, step, advice, inputsHash) {
    if (!actor?.id) {return;}

    const state = (await actor.getFlag('foundryvtt-swse', 'suggestionState')) || {};
    state.lastMentorAdvice = state.lastMentorAdvice || {};
    state.lastMentorAdvice[step] = {
      suggestionId: advice.suggestionId || advice.name,
      reasonCode: advice.reasonCode,
      reason: advice.reason,
      tier: advice.tier,
      confidence: advice.confidence,
      inputsHash,
      at: Date.now()
    };
    await actor.setFlag('foundryvtt-swse', 'suggestionState', state);
  }

  /**
   * Get the last mentor advice for a step if inputs haven't changed
   * Returns null if inputs changed or no previous advice exists
   * @param {Actor} actor - The character actor
   * @param {string} step - The decision step
   * @param {string} currentInputsHash - Hash of current inputs
   * @returns {Object|null} Previous advice if still valid, null otherwise
   */
  static async getLastMentorAdvice(actor, step, currentInputsHash) {
    if (!actor?.id) {return null;}

    const state = await actor.getFlag('foundryvtt-swse', 'suggestionState');
    const lastAdvice = state?.lastMentorAdvice?.[step];

    if (!lastAdvice) {return null;}

    // Only return if inputs haven't changed
    if (lastAdvice.inputsHash === currentInputsHash) {
      return lastAdvice;
    }

    return null;
  }

  /**
   * Clear stored mentor advice for a step (call when inputs change significantly)
   * @param {Actor} actor - The character actor
   * @param {string} step - The decision step to clear, or null to clear all
   */
  static async clearMentorAdvice(actor, step = null) {
    if (!actor?.id) {return;}

    const state = (await actor.getFlag('foundryvtt-swse', 'suggestionState')) || {};

    if (step) {
      if (state.lastMentorAdvice?.[step]) {
        delete state.lastMentorAdvice[step];
        await actor.setFlag('foundryvtt-swse', 'suggestionState', state);
      }
    } else {
      state.lastMentorAdvice = {};
      await actor.setFlag('foundryvtt-swse', 'suggestionState', state);
    }
  }


  static sortBySuggestion(items) {
    if (!Array.isArray(items)) {return items;}
    // Sort by suggestion tier descending when available (compatible with legacy engine output)
    return items.slice().sort((a, b) => {
      const ta = a?.suggestion?.tier ?? a?.tier ?? 0;
      const tb = b?.suggestion?.tier ?? b?.tier ?? 0;
      return tb - ta;
    });
  }

  /**
   * Analyze suggestions and return a summary with fallback messaging
   * Use this when displaying mentor advice to provide meaningful feedback even when no strong suggestions exist
   * @param {Array} suggestions - Array of suggestion objects
   * @param {Object} options - Analysis options
   * @param {number} options.strongThreshold - Tier threshold for "strong" suggestions (default: 4)
   * @returns {Object} Analysis result with hasSuggestions, reason code, and mentor message
   */
  static analyzeSuggestionStrength(suggestions, options = {}) {
    const threshold = options.strongThreshold ?? 4;
    const items = suggestions || [];

    const strongSuggestions = items.filter(s => {
      const tier = s?.suggestion?.tier ?? s?.tier ?? 0;
      return tier >= threshold;
    });

    const moderateSuggestions = items.filter(s => {
      const tier = s?.suggestion?.tier ?? s?.tier ?? 0;
      return tier >= 2 && tier < threshold;
    });

    const totalSuggestions = items.filter(s => {
      const tier = s?.suggestion?.tier ?? s?.tier ?? 0;
      return tier > 0;
    });

    // Determine the appropriate fallback reason and message
    if (strongSuggestions.length > 0) {
      const topSuggestion = strongSuggestions[0];
      const confidence = topSuggestion?.suggestion?.confidence ?? topSuggestion?.confidence ?? 0.75;
      return {
        hasSuggestions: true,
        hasStrongSuggestions: true,
        reasonCode: 'STRONG_FIT',
        confidence,
        count: strongSuggestions.length,
        suggestions: strongSuggestions,
        mentorMessage: confidence >= 0.85
          ? 'I have a strong recommendation for you.'
          : 'I have a suggestion that fits your path well.'
      };
    }

    if (moderateSuggestions.length > 0) {
      return {
        hasSuggestions: true,
        hasStrongSuggestions: false,
        reasonCode: 'MODERATE_FIT',
        confidence: 0.5,
        count: moderateSuggestions.length,
        suggestions: moderateSuggestions,
        mentorMessage: 'Several options could work for your build. Consider what feels right.'
      };
    }

    if (totalSuggestions.length > 0) {
      return {
        hasSuggestions: true,
        hasStrongSuggestions: false,
        reasonCode: 'WEAK_FIT',
        confidence: 0.3,
        count: totalSuggestions.length,
        suggestions: totalSuggestions,
        mentorMessage: 'All options are viable at this stage. Choose what resonates with your vision.'
      };
    }

    // No suggestions at all
    return {
      hasSuggestions: false,
      hasStrongSuggestions: false,
      reasonCode: 'NO_STRONG_FIT',
      confidence: 0,
      count: 0,
      suggestions: [],
      mentorMessage: 'At this point, any path is open to you. Trust your instincts and choose what feels right.'
    };
  }

  static countByTier(items) {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const it of items ?? []) {
      const tier = it?.suggestion?.tier ?? it?.tier ?? 0;
      counts[tier] = (counts[tier] || 0) + 1;
    }
    return counts;
  }

  static validateSuggestionDTO(suggestions, { context = null, domain = null } = {}) {
    const trace = game.settings.get('foundryvtt-swse', 'enableSuggestionTrace') ?? false;
    if (!trace) {return;}

    const bad = [];
    for (const s of suggestions ?? []) {
      const name = s?.name || s?.label || s?.targetRef?.name || '';
      const hasTarget = !!(s?.targetRef?.pack && s?.targetRef?.id);
      if (!hasTarget) {
        bad.push({
          name,
          type: s?.type || s?.domain || null,
          reason: s?.unresolvedTargetRefReason || 'missing_targetRef'
        });
      }
      if (!s?.explanation?.short) {
        bad.push({
          name,
          type: s?.type || s?.domain || null,
          reason: 'missing_explanation_short'
        });
      }
    }

    if (bad.length) {
      console.warn('[SuggestionService] Suggestion DTO issues', { context, domain, bad: bad.slice(0, 20) });
    }
  }

  static async _enrichSuggestions(actor, suggestions, { trace } = {}) {
    if (!Array.isArray(suggestions)) {return [];}

    const out = [];
    for (const s of suggestions) {
      const domain = s?.type || s?.domain || (s?.item?.type) || null;
      const domainKey = domain === 'feat' ? 'feats' : domain === 'talent' ? 'talents' : domain === 'class' ? 'classes' : domain === 'power' ? 'forcepowers' : null;

      // Preserve existing structure
      const suggestion = { ...s };

      // Drift-safe targetRef
      if (!suggestion.targetRef) {
        const name = suggestion.name || suggestion?.item?.name || suggestion?.label;
        const resolverDomain = _domainToResolverDomain(domainKey);
        if (resolverDomain && name) {
          const ref = await CompendiumResolver.resolveByName({ domain: resolverDomain, name });
          if (ref) {suggestion.targetRef = ref;}
        }
      }

      // Ensure additive reason list exists
      if (!Array.isArray(suggestion.reasons)) {
        // Try to generate structured reasons
        try {
          suggestion.reasons = SuggestionExplainer.generateReasons(suggestion, actor, {
            includeOpportunityCosts: true
          });
        } catch (err) {
          suggestion.reasons = [];
        }
      }

      // Consolidate similar reasons to reduce noise
      if (Array.isArray(suggestion.reasons) && suggestion.reasons.length > 1) {
        // Deduplicate by code
        suggestion.reasons = ReasonFactory.deduplicate(suggestion.reasons);
      }

      // Compute confidence score alongside tier
      if (suggestion?.suggestion?.tier !== undefined) {
        try {
          suggestion.confidence = ConfidenceScoring.computeConfidence(suggestion, actor);
          if (!suggestion.suggestion.confidence) {
            suggestion.suggestion.confidence = suggestion.confidence;
          }
        } catch (err) {
          suggestion.confidence = 0.5; // Default moderate confidence on error
        }
      }

      if (options.epicAdvisory) {
        // Epic Advisory Mode: tolerate epic play without implying mechanical support.
        suggestion.isSuggested = false;
        if (suggestion?.suggestion) {
          suggestion.suggestion.tier = 0;
          suggestion.suggestion.reason = 'Epic advisory mode (no ranking)';
          suggestion.suggestion.confidence = 0.25;
        }
        suggestion.confidence = 0.25;
        suggestion.advisory = true;
      }

      // Explanation: prefer SuggestionExplainer (mentor-safe, build-aware). Fallback to minimal.
      if (!suggestion.explanation || !suggestion.explanation.short) {
        try {
          const explained = SuggestionExplainer.explain(suggestion, actor);
          if (explained?.explanation) {suggestion.explanation = explained.explanation;}
          if (explained?.tone) {suggestion.tone = explained.tone;}
        } catch (err) {
          const tier = suggestion?.suggestion?.tier ?? suggestion?.tier ?? 0;
          suggestion.explanation = {
            short: suggestion?.suggestion?.reason || (tier >= 3 ? 'High-fit option for your build.' : tier === 2 ? 'Good-fit option for your build.' : 'Legal option.')
          };
        }
      }

      out.push(suggestion);
    }

    if (trace) {
      SWSELogger.log('[SuggestionService] Enriched suggestions:', out.slice(0, 5));
    }
    return out;
  }

  /**
   * Filter reasons in suggestions by progression focus and apply relevance weighting
   *
   * This method:
   * 1. Gates visibility of reason domains (focus filtering)
   * 2. Annotates visible reasons with contextual relevance scores
   * 3. Filters to player-safe reasons only
   * 4. Limits display to top-N reasons by strength/relevance
   *
   * Relevance is ephemeral and applied ONLY to the explanatory reasons[] array.
   * It does NOT affect base tier assignment or suggestion scoring/ordering.
   *
   * @param {Array} suggestions - Array of enriched suggestion objects
   * @param {string|null} focus - Progression focus ("skills", "feats", "classes", etc.) or null for all
   * @param {Object} options - Filter options
   * @param {boolean} options.trace - Enable trace logging
   * @param {number} options.reasonLimit - Max reasons to show (default: 3)
   * @returns {Array} Suggestions with filtered and relevance-weighted reason lists
   */
  static _filterReasonsByFocus(suggestions, focus = null, { trace = false, reasonLimit = 3 } = {}) {
    if (!focus) {
      // No focus = show all reasons with equal weight (backward compatible)
      // But still apply safety filter and limit
      return suggestions.map(s => ({
        ...s,
        reasons: ReasonFactory.limitByStrength(
          ReasonFactory.filterBySafety(s.reasons ?? [], true),
          reasonLimit
        )
      }));
    }

    const allowedDomains = getAllowedReasonDomains(focus);
    if (!allowedDomains) {
      // Unknown focus = show no reasons (safe fail)
      if (trace) {
        SWSELogger.warn(`[SuggestionService] Unknown focus: "${focus}", filtering all reasons`);
      }
      return suggestions.map(s => ({
        ...s,
        reasons: []
      }));
    }

    const filtered = suggestions.map(s => {
      // Step 1: Filter the reasons array to only those with allowed domains
      const filteredReasons = (s.reasons ?? []).filter(r => {
        const reasonDomain = r?.domain ?? null;
        return reasonDomain && allowedDomains.includes(reasonDomain);
      });

      // Step 2: Filter to player-safe reasons only
      const safeReasons = ReasonFactory.filterBySafety(filteredReasons, true);

      // Step 3: Annotate each visible reason with relevance score
      // Relevance is contextual priority for ranking/display, not stored persistently
      const relevanceWeighted = safeReasons.map(r => ({
        ...r,
        relevanceScore: getReasonRelevance(focus, r, { focus })
      }));

      // Step 4: Sort by relevance and limit to top N
      const sortedByRelevance = [...relevanceWeighted].sort((a, b) =>
        (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
      );
      const limited = sortedByRelevance.slice(0, Math.max(1, reasonLimit));

      return {
        ...s,
        reasons: limited
      };
    });

    if (trace) {
      SWSELogger.log(
        `[SuggestionService] Filtered and weighted reasons by focus "${focus}"`,
        {
          allowedDomains,
          reasonLimit,
          suggestions: filtered.slice(0, 3).map(s => ({
            name: s.name,
            reasonCount: s.reasons?.length ?? 0,
            topRelevance: s.reasons?.[0]?.relevanceScore ?? null
          }))
        }
      );
    }

    return filtered;
  }
}
