/**
 * Gear Suggestions Engine
 *
 * Coordinates gear/equipment scoring and produces ranked, curated suggestions.
 * Evaluates utility items, gadgets, and specialized equipment.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { assignTier, clampScore } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/shared-scoring-utils.js";
import { extractStoreItemTags, scoreStoreItemContextFit } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/store-suggestion-context.js";


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
    for (const key of ['total', 'value', 'mod', 'current', 'base']) {
      if (value[key] !== undefined && value[key] !== null && value[key] !== '') return numberValue(value[key], fallback);
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readAttributeMod(system = {}, key = '') {
  const attr = system.attributes?.[key] || {};
  const ability = system.abilities?.[key] || {};
  const direct = attr.mod ?? attr.modifier ?? attr.totalMod ?? ability.mod ?? ability.modifier;
  if (Number.isFinite(Number(direct))) return Number(direct);
  const score = attr.total ?? attr.value ?? ability.total ?? ability.value ?? ability.score;
  if (Number.isFinite(Number(score))) return Math.floor((Number(score) - 10) / 2);
  return 0;
}

function skillValue(character, keys = []) {
  const skills = character?.system?.skills || {};
  let best = 0;
  for (const key of keys) {
    const normalized = normalize(key);
    const compact = normalized.replace(/_/g, '');
    const skill = skills[key] || skills[normalized] || skills[compact];
    if (!skill) continue;
    const trained = skill.trained === true || skill.isTrained === true || skill.rank > 0 || skill.ranks > 0;
    best = Math.max(best, numberValue(skill.total ?? skill.mod ?? skill.value, trained ? 5 : 0), trained ? 5 : 0);
  }
  return best;
}

function routeScore(storeContext = {}, routes = []) {
  const profile = storeContext.routeProfile || {};
  let best = 0;
  for (const route of routes) {
    const key = normalize(route);
    const entry = profile.routes?.[key] || profile.routes?.[route];
    best = Math.max(best, numberValue(entry?.score, 0));
  }
  return best;
}

function scoreGearUseCaseFit(gear, character, storeContext = {}) {
  const tags = new Set(extractStoreItemTags(gear).map(normalize));
  const text = [gear?.name, gear?.system?.category, gear?.system?.subcategory, gear?.system?.description]
    .filter(Boolean).join(' ').toLowerCase();
  const explanations = [];
  let score = 0;

  const mechanics = skillValue(character, ['mechanics']);
  const useComputer = skillValue(character, ['use computer', 'use_computer']);
  const treatInjury = skillValue(character, ['treat injury', 'treat_injury']);
  const survival = skillValue(character, ['survival']);
  const perception = skillValue(character, ['perception']);
  const stealth = skillValue(character, ['stealth']);
  const persuasion = skillValue(character, ['persuasion', 'deception', 'gather information', 'gather_information']);
  const intMod = readAttributeMod(character?.system || {}, 'int');
  const wisMod = readAttributeMod(character?.system || {}, 'wis');

  if (tags.has('medical') || /medpac|medkit|medical|surgery|diagnostic/.test(text)) {
    const aligned = treatInjury >= 5 || routeScore(storeContext, ['support', 'medical']) >= 0.34;
    score += aligned ? 8 : 3;
    explanations.push(aligned ? 'Medical gear reinforces your Treat Injury/support role.' : 'Medical gear covers an important party safety gap.');
  }
  if (tags.has('toolkit') || tags.has('tech') || /toolkit|tool kit|repair|mechanic/.test(text)) {
    const aligned = mechanics >= 5 || intMod >= 3 || routeScore(storeContext, ['tech', 'repair']) >= 0.34;
    score += aligned ? 8 : 2;
    explanations.push(aligned ? 'Technical gear matches your Mechanics/Intelligence investment.' : 'Technical gear is useful, but your build has limited tech commitment.');
  }
  if (tags.has('security') || /security kit|slicer|computer spike|datapad|interface/.test(text)) {
    const aligned = useComputer >= 5 || intMod >= 3 || routeScore(storeContext, ['tech', 'slicer']) >= 0.34;
    score += aligned ? 7 : 2;
    explanations.push(aligned ? 'Slicing/security gear matches your Use Computer lane.' : 'Security gear opens a tech side lane.');
  }
  if (tags.has('survival') || tags.has('fieldcraft') || /survival|field kit|climbing|breath mask|sensor|macrobinocular/.test(text)) {
    const aligned = survival >= 5 || perception >= 5 || wisMod >= 3 || routeScore(storeContext, ['scout', 'fieldcraft', 'survival']) >= 0.34;
    score += aligned ? 7 : 3;
    explanations.push(aligned ? 'Field gear supports your scout/perception route.' : 'Field gear is broadly useful outside combat.');
  }
  if (tags.has('stealth') || /stealth|camouflage|conceal|shadow/.test(text)) {
    const aligned = stealth >= 5 || routeScore(storeContext, ['stealth', 'scoundrel', 'scout']) >= 0.34;
    score += aligned ? 6 : 1;
    explanations.push(aligned ? 'Stealth gear matches your infiltration lane.' : 'Stealth gear is a side option unless you invest in Stealth.');
  }
  if (tags.has('social') || /comlink|disguise|translator|forgery|credit chip|identity/.test(text)) {
    const aligned = persuasion >= 5 || routeScore(storeContext, ['social', 'leadership']) >= 0.34;
    score += aligned ? 5 : 2;
    explanations.push(aligned ? 'Social/identity gear supports your influence lane.' : 'Social gear offers situational utility.');
  }

  return { adjustment: Math.max(-6, Math.min(14, score)), explanations: explanations.slice(0, 3) };
}

export class GearSuggestions {
  /**
   * Generate gear suggestions for a character
   * @param {Object} character - The character actor
   * @param {Array} gearOptions - Array of gear items to evaluate
   * @param {Object} options - Suggestion options (count, filters, etc.)
   * @returns {Object} Suggestion result with ranked gear and summary
   */
  static generateSuggestions(character, gearOptions = [], options = {}) {
    try {
      if (!character || !character.system) {
        return this._invalidSuggestions('Character data missing');
      }

      if (!gearOptions || gearOptions.length === 0) {
        return this._invalidSuggestions('No gear to evaluate');
      }

      // Score all gear options
      const scored = gearOptions
        .map(gear => this._scoreGear(gear, character, options))
        .filter(result => result && result.combined); // Filter out invalid scores

      // Sort by final score (descending)
      scored.sort((a, b) => b.combined.finalScore - a.combined.finalScore);

      // Group by tier
      const byTier = this._groupByTier(scored);

      // Select top recommendations
      const topCount = options.topCount || 5;
      const topGear = scored.slice(0, topCount);

      // Generate summary
      const summary = this._generateSummary(character, topGear, byTier);

      return {
        characterId: character.id,
        characterName: character.name,

        // Ranked suggestions
        topSuggestions: topGear,
        allScored: scored,

        // Summary statistics
        summary,

        // Tier breakdown
        byTier,

        // Metadata
        meta: {
          evaluatedCount: scored.length,
          computedAt: Date.now(),
          engineVersion: '1.0.0'
        }
      };
    } catch (err) {
      SWSELogger.error('[GearSuggestions] Generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  /**
   * Get suggestions for a specific gear category
   * (e.g., "survival", "medical", "tech")
   * @param {Object} character - The character actor
   * @param {Array} gearOptions - Gear to filter and score
   * @param {String} category - Gear category to filter
   * @param {Object} options - Suggestion options
   * @returns {Object} Category-specific suggestions
   */
  static generateCategorySuggestions(
    character,
    gearOptions = [],
    category = '',
    options = {}
  ) {
    try {
      const categoryLower = category.toLowerCase();
      const filtered = gearOptions.filter(gear => {
        const gearCategory = (gear.system?.category || '').toLowerCase();
        const gearName = (gear.name || '').toLowerCase();
        const tags = (gear.system?.tags || []).map(t => t.toLowerCase());

        return (
          gearCategory === categoryLower ||
          gearName.includes(categoryLower) ||
          tags.includes(categoryLower)
        );
      });

      if (filtered.length === 0) {
        return this._invalidSuggestions(`No gear in category: ${category}`);
      }

      const result = this.generateSuggestions(character, filtered, options);
      result.category = category;

      return result;
    } catch (err) {
      SWSELogger.error('[GearSuggestions] Category generation failed:', err);
      return this._invalidSuggestions(err.message);
    }
  }

  /**
   * Score a single gear item
   * @private
   */
  static _scoreGear(gear, character, options = {}) {
    try {
      if (!gear || !gear.system) {
        return null;
      }

      const charContext = this._extractCharacterContext(character);

      // Axis A: Utility value
      const axisA = this._computeUtilityAxis(gear, charContext);

      // Axis B: Action cost / availability
      const axisB = this._computeActionCostAxis(gear, charContext);

      // Role alignment (how useful for this character's role?)
      const roleAlignment = this._computeRoleAlignment(gear, charContext);

      // Base relevance (gatekeeper)
      const baseRelevance = 10;

      // Price bias
      const priceBias = this._scorePriceBias(gear);
      const storeContextFit = options.storeContext ? scoreStoreItemContextFit(gear, options.storeContext, options) : null;
      const useCaseFit = scoreGearUseCaseFit(gear, character, options.storeContext || {});

      // Final score (additive, bounded 0-100)
      let finalScore = baseRelevance +
        roleAlignment +
        axisA +
        axisB +
        priceBias +
        (storeContextFit?.cappedAdjustment || 0) +
        useCaseFit.adjustment;

      // NaN protection
      if (!Number.isFinite(finalScore)) finalScore = 0;

      // Clamp to 0-100
      finalScore = clampScore(finalScore, 0, 100);

      // Assign tier (canonical)
      const tier = assignTier(finalScore);

      return {
        gearId: gear.id,
        gearName: gear.name,
        gearType: gear.type || 'equipment',

        components: {
          baseRelevance,
          roleAlignment,
          utility: axisA,
          actionCost: axisB,
          priceBias,
          storeContextFit: storeContextFit?.cappedAdjustment || 0,
          useCaseFit: useCaseFit.adjustment
        },

        combined: {
          finalScore,
          tier
        },

        explanations: [
          ...this._generateExplanations(gear, charContext, axisA, axisB, roleAlignment),
          ...useCaseFit.explanations,
          ...(storeContextFit?.explanations || [])
        ].slice(0, 5),

        storeContextFit,
        useCaseFit,

        meta: {
          computedAt: Date.now(),
          engineVersion: '1.0.0'
        }
      };
    } catch (err) {
      SWSELogger.error('[GearSuggestions] Scoring failed:', err);
      return null;
    }
  }

  /**
   * Compute utility axis (0-20)
   * @private
   */
  static _computeUtilityAxis(gear, charContext) {
    const utility = gear.system?.utility || 0;
    const rarity = gear.system?.rarity || 'common';

    // Base utility score
    let score = Math.min(20, utility * 2);

    // Rarity bonus
    if (rarity === 'rare') score *= 1.1;
    if (rarity === 'unique') score *= 1.2;

    // Role-specific utility (bonus if matches character's expertise)
    const tags = (gear.system?.tags || []).map(t => t.toLowerCase());
    if (charContext.primaryRole === 'support' && tags.includes('medical')) {
      score += 5;
    }

    return Math.min(20, score);
  }

  /**
   * Compute action cost axis (0-20, inverted: lower cost = higher score)
   * @private
   */
  static _computeActionCostAxis(gear, charContext) {
    const actionCost = gear.system?.actionCost || 'passive';
    const setupCost = gear.system?.setupCost || 0;

    let score = 20; // Start at max (passive)

    if (actionCost === 'reaction') score = 15;
    if (actionCost === 'action') score = 10;
    if (actionCost === 'full-action') score = 5;

    // Setup cost reduces score
    if (setupCost > 0) {
      score -= setupCost * 2;
    }

    return Math.max(0, score);
  }

  /**
   * Compute role alignment (-10 to +10)
   * @private
   */
  static _computeRoleAlignment(gear, charContext) {
    const tags = (gear.system?.tags || []).map(t => t.toLowerCase());
    const primaryRole = charContext.primaryRole || 'generalist';

    let score = 0;

    // Medical gear for support roles
    if (tags.includes('medical') && (primaryRole === 'support' || primaryRole === 'leader')) {
      score += 8;
    }

    // Tech gear for technical roles
    if (tags.includes('tech') && (primaryRole === 'tech' || primaryRole === 'hacker')) {
      score += 8;
    }

    // Survival gear for scouts
    if (tags.includes('survival') && primaryRole === 'scout') {
      score += 5;
    }

    // Universal tools are acceptable for all
    if (tags.includes('utility') || tags.includes('tool')) {
      score += 2;
    }

    return Math.max(-10, Math.min(10, score));
  }

  /**
   * Score price bias
   * @private
   */
  static _scorePriceBias(gear) {
    const price = gear.system?.price || 0;

    if (price < 100) return 2;
    if (price < 500) return 0;
    if (price < 1000) return -2;
    return -4;
  }


  /**
   * Generate explanations for gear score
   * @private
   */
  static _generateExplanations(gear, charContext, axisA, axisB, roleAlignment) {
    const explanations = [];

    // Utility explanation
    if (axisA > 12) {
      explanations.push('Highly useful equipment');
    } else if (axisA > 8) {
      explanations.push('Provides good utility');
    } else if (axisA > 4) {
      explanations.push('Offers some benefit');
    }

    // Action cost explanation
    const actionCost = gear.system?.actionCost || 'passive';
    if (actionCost === 'passive') {
      explanations.push('Always available');
    } else if (actionCost === 'reaction') {
      explanations.push('Quick to activate');
    } else if (actionCost === 'action') {
      explanations.push('Requires your action');
    }

    // Role fit explanation
    if (roleAlignment > 5) {
      explanations.push(`Excellent for your ${charContext.primaryRole} role`);
    } else if (roleAlignment > 0) {
      explanations.push('Fits your playstyle');
    }

    return explanations.slice(0, 3);
  }

  /**
   * Extract character context
   * @private
   */
  static _extractCharacterContext(character) {
    const system = character.system || {};
    const className = system.class?.name || '';

    return {
      characterId: character.id,
      level: system.level?.value ?? 1,
      primaryRole: this._inferRole(className),
      attributes: {
        str: readAttributeMod(system, 'str'),
        dex: readAttributeMod(system, 'dex'),
        int: readAttributeMod(system, 'int'),
        wis: readAttributeMod(system, 'wis')
      }
    };
  }

  /**
   * Infer primary role from class
   * @private
   */
  static _inferRole(className) {
    const lower = (className || '').toLowerCase();
    if (lower.includes('jedi') || lower.includes('sith')) return 'force-user';
    if (lower.includes('scout')) return 'scout';
    if (lower.includes('soldier')) return 'soldier';
    if (lower.includes('scoundrel')) return 'scoundrel';
    if (lower.includes('tech')) return 'tech';
    return 'generalist';
  }

  /**
   * Group scored gear by tier (canonical tier labels)
   * @private
   */
  static _groupByTier(scored) {
    const groups = {
      'Perfect': [],
      'Excellent': [],
      'Good': [],
      'Viable': [],
      'Marginal': [],
      'Poor': []
    };

    scored.forEach(gear => {
      const tier = gear.combined.tier || 'Poor';
      if (groups[tier]) {
        groups[tier].push(gear);
      }
    });

    return Object.fromEntries(
      Object.entries(groups).filter(([_, gear]) => gear.length > 0)
    );
  }

  /**
   * Generate summary of suggestions
   * @private
   */
  static _generateSummary(character, topGear, byTier) {
    if (topGear.length === 0) {
      return { recommendation: 'No gear recommendations available' };
    }

    const topChoice = topGear[0];
    return {
      recommendation: `${topChoice.gearName} is recommended for your character`,
      topChoice,
      tierSummary: Object.entries(byTier)
        .map(([tier, items]) => `${items.length} ${tier}`)
        .join(', ')
    };
  }

  /**
   * Return standardized invalid suggestions result
   * @private
   */
  static _invalidSuggestions(reason) {
    return {
      valid: false,
      reason,
      topSuggestions: [],
      allScored: [],
      summary: { recommendation: `Error: ${reason}` },
      byTier: {},
      meta: { computedAt: Date.now(), engineVersion: '1.0.0' }
    };
  }
}

export default GearSuggestions;
