/**
 * SuggestionService
 *
 * Single entry point for all suggestion consumers (chargen, level-up, mentor, sheet).
 *
 * Responsibilities:
 * - Call SuggestionEngineCoordinator (SSOT evaluation)
 * - Add drift-safe targetRef (pack+id) when resolvable
 * - Add reasons/explanations as additive fields when available
 * - Cache results and invalidate on actor changes
 * - Optionally persist minimal SuggestionState in actor flags
 */
import { SWSELogger } from '../utils/logger.js';
import { SuggestionEngineCoordinator } from './SuggestionEngineCoordinator.js';
import { CompendiumResolver } from './CompendiumResolver.js';
import { SuggestionExplainer } from './SuggestionExplainer.js';

import { FeatEngine } from '../progression/feats/feat-engine.js';
import { ForcePowerEngine } from '../progression/engine/force-power-engine.js';

function _hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

function _actorRevisionKey(actor) {
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

  return _hashString(`${lvl}|${ab}|${items}`);
}

function _domainToResolverDomain(domain) {
  if (domain === 'feats') return 'feat';
  if (domain === 'talents') return 'talent';
  if (domain === 'forcepowers') return 'forcepowers';
  if (domain === 'classes') return 'class';
  return domain;
}


async function _ensureActorDoc(actorOrData) {
  // Foundry Actor document
  if (actorOrData?.documentName === 'Actor' || actorOrData?.constructor?.name === 'Actor') return actorOrData;

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
    if (this._initialized) return;
    this._initialized = true;
    CompendiumResolver.initializeFromSystemJSON(systemJSON);
    SWSELogger.log('[SuggestionService] Initialized');
  }

  static invalidate(actorId) {
    for (const key of this._cache.keys()) {
      if (key.startsWith(`${actorId}::`)) this._cache.delete(key);
    }
  }

  static async getSuggestions(actorOrData, context = 'sheet', options = {}) {
    const actor = await _ensureActorDoc(actorOrData);
    const revision = actor?.id ? _actorRevisionKey(actor) : `${Date.now()}`;
    const key = `${actor?.id ?? 'temp'}::${context}::${options.domain ?? 'all'}`;

    const cached = this._cache.get(key);
    if (cached?.rev === revision) return cached.suggestions;

    const trace = game.settings.get('foundryvtt-swse', 'enableSuggestionTrace') ?? false;

    let suggestions = [];
    let debug = null;

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

    // Optional persist
    if (options.persist === true) {
      await this._persistSuggestionState(actor, context, enriched);
    }

    this.validateSuggestionDTO(enriched, { context, domain: options.domain });
    this._cache.set(key, { rev: revision, suggestions: enriched, meta: { debug } });
    return enriched;
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


  static sortBySuggestion(items) {
    if (!Array.isArray(items)) return items;
    // Sort by suggestion tier descending when available (compatible with legacy engine output)
    return items.slice().sort((a, b) => {
      const ta = a?.suggestion?.tier ?? a?.tier ?? 0;
      const tb = b?.suggestion?.tier ?? b?.tier ?? 0;
      return tb - ta;
    });
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
    if (!trace) return;

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
    if (!Array.isArray(suggestions)) return [];

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
          if (ref) suggestion.targetRef = ref;
        }
      }

      // Ensure additive reason list exists
      if (!Array.isArray(suggestion.reasons)) suggestion.reasons = [];

      // Explanation: prefer SuggestionExplainer (mentor-safe, build-aware). Fallback to minimal.
      if (!suggestion.explanation || !suggestion.explanation.short) {
        try {
          const explained = SuggestionExplainer.explain(suggestion, actor);
          if (explained?.explanation) suggestion.explanation = explained.explanation;
          if (Array.isArray(explained?.reasons)) suggestion.reasons = explained.reasons;
          if (explained?.tone) suggestion.tone = explained.tone;
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
}
