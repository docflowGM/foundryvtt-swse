/**
 * Store Asset Suggestions
 *
 * Scores droids and vehicles as party/mission assets rather than personal gear.
 * This keeps the Best Match sort meaningful in the droid and vehicle store tabs
 * without pretending a droid or starship is the same kind of build choice as a
 * feat, weapon, or suit of armor.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import {
  extractStoreItemTags,
  getStoreItemCost,
  scoreStoreItemBudgetFit,
  scoreStoreItemContextFit
} from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/store-suggestion-context.js";
import { assignTier, clampScore } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/shared-scoring-utils.js";

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function numberValue(value, fallback = 0) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['value', 'total', 'current', 'base', 'amount']) {
      if (value[key] !== undefined && value[key] !== null && value[key] !== '') return numberValue(value[key], fallback);
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function textOf(item = {}) {
  const sys = item.system || {};
  return [item.name, item.type, sys.category, sys.subcategory, sys.model, sys.description, sys.role, sys.size]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function actorText(actor = {}) {
  const items = Array.from(actor.items || []);
  return [
    actor.name,
    actor.type,
    actor.system?.class?.name,
    actor.system?.archetype?.name,
    ...items.map(item => `${item.type || ''} ${item.name || ''} ${item.system?.category || ''} ${item.system?.tags?.join?.(' ') || ''}`)
  ].filter(Boolean).join(' ').toLowerCase();
}

function skillValue(actor, keys = []) {
  const skills = actor?.system?.skills || {};
  let best = 0;
  for (const key of keys) {
    const normalized = normalize(key);
    const skill = skills[key] || skills[normalized] || skills[normalized.replace(/_/g, '')];
    if (!skill) continue;
    const trained = skill.trained === true || skill.isTrained === true || skill.rank > 0 || skill.ranks > 0;
    const total = numberValue(skill.total ?? skill.mod ?? skill.value, trained ? 5 : 0);
    best = Math.max(best, total, trained ? 5 : 0);
  }
  return best;
}

function routeWeight(storeContext = {}, routes = []) {
  const profile = storeContext.routeProfile || {};
  let best = 0;
  for (const route of routes) {
    const key = normalize(route);
    const entry = profile.routes?.[key] || profile.routes?.[route];
    best = Math.max(best, numberValue(entry?.score, 0));
  }
  return best;
}

function extractAssetKind(item = {}) {
  const type = normalize(item.type);
  const category = normalize(item.category || item.system?.category || item.system?.type);
  if (type === 'vehicle' || category.includes('vehicle') || category.includes('ship') || category.includes('speeder')) return 'vehicle';
  if (type === 'droid' || category.includes('droid')) return 'droid';
  return type || category || 'asset';
}

function vehicleScaleScore(item = {}) {
  const sys = item.system || {};
  const text = textOf(item);
  const cl = numberValue(sys.challengeLevel ?? sys.cl ?? sys.CL ?? item.challengeLevel, NaN);
  const size = normalize(sys.size || item.size || item.vehicleSize || '');
  let score = 0;
  const explanations = [];

  if (Number.isFinite(cl) && cl > 0) {
    if (cl <= 4) {
      score += 3;
      explanations.push('Low-complexity vehicle asset is easy to bring into play.');
    } else if (cl <= 10) {
      score += 1;
      explanations.push('Mid-tier vehicle asset; useful but not a casual purchase.');
    } else {
      score -= 2;
      explanations.push('High-CL vehicle is a major campaign asset, not just personal gear.');
    }
  }

  if (/speeder|bike|swoop|landspeeder/.test(text) || ['medium', 'large', 'huge'].includes(size)) {
    score += 4;
    explanations.push('Practical transport scale for normal missions.');
  }
  if (/capital|frigate|cruiser|station|colossal/.test(text) || size.includes('colossal')) {
    score -= 5;
    explanations.push('Large-scale vehicle should usually be a party or GM-approved asset.');
  }
  if (/starfighter|transport|freighter|shuttle/.test(text)) {
    score += 2;
    explanations.push('Strong mission utility as party transport or combat support.');
  }

  return { score, explanations };
}

function roleFitScore(asset, actor, storeContext = {}) {
  const tags = new Set(extractStoreItemTags(asset).map(normalize));
  const text = textOf(asset);
  const actorProfile = actorText(actor);
  const explanations = [];
  let score = 0;

  const techSkill = skillValue(actor, ['mechanics', 'use computer', 'use_computer']);
  const pilotSkill = skillValue(actor, ['pilot']);
  const treatInjury = skillValue(actor, ['treat injury', 'treat_injury']);
  const persuasion = skillValue(actor, ['persuasion', 'deception', 'gather information', 'gather_information']);
  const perception = skillValue(actor, ['perception', 'survival']);

  if (tags.has('astromech') || /astromech|repair|mechanic|maintenance/.test(text)) {
    score += techSkill >= 5 ? 6 : 2;
    explanations.push(techSkill >= 5 ? 'Astromech/repair asset matches your technical training.' : 'Astromech/repair asset adds technical coverage.');
  }
  if (tags.has('protocol') || /protocol|translator|diplomat|etiquette/.test(text)) {
    score += persuasion >= 5 || routeWeight(storeContext, ['social', 'leadership']) >= 0.35 ? 5 : 2;
    explanations.push('Protocol/social asset supports negotiation and information scenes.');
  }
  if (tags.has('medical') || /medical|medic|surgery|diagnostic/.test(text)) {
    score += treatInjury >= 5 ? 6 : 2;
    explanations.push(treatInjury >= 5 ? 'Medical asset reinforces your Treat Injury role.' : 'Medical asset can cover a party support gap.');
  }
  if (tags.has('combat_droid') || /battle droid|combat droid|assassin droid|war droid/.test(text)) {
    const martial = routeWeight(storeContext, ['martial', 'soldier', 'ranged', 'melee', 'combat']);
    score += martial >= 0.35 || /soldier|mercenary|bounty|combat/.test(actorProfile) ? 5 : 1;
    explanations.push(martial >= 0.35 ? 'Combat droid complements your combat route.' : 'Combat droid is useful, but not strongly tied to your current build.');
  }
  if (tags.has('scout') || /probe|scout|recon|sensor|surveillance/.test(text)) {
    score += perception >= 5 || routeWeight(storeContext, ['scout', 'fieldcraft', 'survival']) >= 0.35 ? 5 : 2;
    explanations.push('Recon asset helps with scouting, sensors, and field coverage.');
  }

  if (extractAssetKind(asset) === 'vehicle') {
    const pilotRoute = routeWeight(storeContext, ['pilot', 'vehicle', 'starship', 'ace', 'scoundrel', 'scout']);
    if (pilotSkill >= 5 || pilotRoute >= 0.35 || /pilot|ace|scoundrel|scout/.test(actorProfile)) {
      score += 7;
      explanations.push('Vehicle listing matches pilot/field mobility signals.');
    } else {
      score += 2;
      explanations.push('Vehicle provides mission mobility, but pilot investment is limited.');
    }
    const scale = vehicleScaleScore(asset);
    score += scale.score;
    explanations.push(...scale.explanations);
  }

  return { score: Math.max(-12, Math.min(18, score)), explanations: explanations.slice(0, 4) };
}

function assetBudgetScore(asset, storeContext = {}) {
  const budget = scoreStoreItemBudgetFit(asset, storeContext);
  let adjustment = budget.adjustment;
  const cost = getStoreItemCost(asset);
  const kind = extractAssetKind(asset);
  const explanations = [];

  if (kind === 'vehicle' && cost > 0) {
    // Vehicles are usually party assets. Keep cost meaningful, but do not bury
    // all useful ships just because they exceed one character's pocket cash.
    if (!budget.affordable && budget.label === 'far_over_budget') adjustment = Math.max(adjustment, -8);
    else if (!budget.affordable) adjustment = Math.max(adjustment, -5);
  }

  if (budget.explanation) explanations.push(budget.explanation);
  if (kind === 'vehicle') explanations.push('Vehicle recommendations treat ships and speeders as mission assets, not pocket gear.');
  if (kind === 'droid') explanations.push('Droid recommendations value party role coverage as much as raw combat stats.');

  return { ...budget, adjustment, explanations: explanations.slice(0, 3) };
}

function scoreAsset(asset, actor, options = {}) {
  const storeContext = options.storeContext || {};
  const kind = extractAssetKind(asset);
  const base = kind === 'vehicle' ? 28 : kind === 'droid' ? 30 : 24;
  const contextFit = storeContext ? scoreStoreItemContextFit(asset, storeContext, options) : null;
  const roleFit = roleFitScore(asset, actor, storeContext);
  const budget = assetBudgetScore(asset, storeContext);

  let finalScore = base
    + (contextFit?.cappedAdjustment || 0)
    + roleFit.score
    + budget.adjustment;

  if (!Number.isFinite(finalScore)) finalScore = 0;
  finalScore = clampScore(finalScore, 0, 100);
  const tier = assignTier(finalScore);

  return {
    itemId: asset.id,
    id: asset.id,
    assetId: asset.id,
    assetName: asset.name,
    assetType: kind,
    components: {
      base,
      contextFit: contextFit?.cappedAdjustment || 0,
      roleFit: roleFit.score,
      budget: budget.adjustment
    },
    combined: { finalScore, tier },
    explanations: [
      ...roleFit.explanations,
      ...(contextFit?.explanations || []),
      ...budget.explanations
    ].filter(Boolean).slice(0, 5),
    storeContextFit: contextFit,
    budgetFit: budget,
    meta: {
      computedAt: Date.now(),
      engineVersion: '1.0.0',
      kind
    }
  };
}

export class AssetSuggestions {
  static generateSuggestions(character, assetOptions = [], options = {}) {
    try {
      if (!character || !character.system) return this._invalidSuggestions('Character data missing');
      if (!Array.isArray(assetOptions) || assetOptions.length === 0) return this._invalidSuggestions('No assets to evaluate');

      const scored = assetOptions
        .map(asset => scoreAsset(asset, character, options))
        .filter(result => result?.combined);
      scored.sort((a, b) => b.combined.finalScore - a.combined.finalScore || String(a.assetName || '').localeCompare(String(b.assetName || '')));
      const topCount = options.topCount || 8;
      const topSuggestions = scored.slice(0, topCount);
      return {
        characterId: character.id,
        characterName: character.name,
        topSuggestions,
        allScored: scored,
        byTier: this._groupByTier(scored),
        summary: this._generateSummary(topSuggestions),
        meta: { evaluatedCount: scored.length, computedAt: Date.now(), engineVersion: '1.0.0' }
      };
    } catch (err) {
      SWSELogger.error('[AssetSuggestions] Generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  static _groupByTier(scored = []) {
    const groups = { Perfect: [], Excellent: [], Good: [], Viable: [], Marginal: [], Poor: [] };
    for (const entry of scored) {
      const tier = entry?.combined?.tier || 'Poor';
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(entry);
    }
    return Object.fromEntries(Object.entries(groups).filter(([, entries]) => entries.length));
  }

  static _generateSummary(topSuggestions = []) {
    const top = topSuggestions[0];
    if (!top) return { recommendation: 'No asset recommendations available' };
    return { recommendation: `${top.assetName} is the strongest matching ${top.assetType} listing.`, topChoice: top };
  }

  static _invalidSuggestions(reason) {
    return {
      valid: false,
      reason,
      topSuggestions: [],
      allScored: [],
      byTier: {},
      summary: { recommendation: `Error: ${reason}` },
      meta: { computedAt: Date.now(), engineVersion: '1.0.0' }
    };
  }
}

export default AssetSuggestions;
