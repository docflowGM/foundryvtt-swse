/**
 * Gear Suggestions Engine
 *
 * Coordinates gear/equipment scoring and produces ranked, curated suggestions.
 * Evaluates utility items, gadgets, and specialized equipment.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { assignTier, clampScore } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/shared-scoring-utils.js";
import { extractStoreItemTags, scoreStoreItemContextFit } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/store-suggestion-context.js";
import { buildEquipmentUseProfile } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/equipment-use-evaluator.js";


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
  const sys = gear?.system || {};
  const tags = new Set(extractStoreItemTags(gear).map(normalize));
  const hooks = Array.isArray(sys.skillHooks) ? sys.skillHooks : [];
  const hookSkills = new Set(hooks.map(hook => normalize(hook?.skill)).filter(Boolean));
  const hookUses = new Set(hooks.map(hook => normalize(hook?.useKey)).filter(Boolean));
  const caps = sys.capabilities && typeof sys.capabilities === 'object' ? sys.capabilities : {};
  const text = [gear?.name, sys.category, sys.subcategory, sys.equipmentBucket, sys.equipmentType, sys.itemRole, sys.description]
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

  if (tags.has('medical') || hookSkills.has('treatinjury') || /medpac|medkit|medical|surgery|diagnostic/.test(text)) {
    const aligned = treatInjury >= 5 || routeScore(storeContext, ['support', 'medical']) >= 0.34;
    score += aligned ? 8 : 3;
    explanations.push(aligned ? 'Medical gear reinforces your Treat Injury/support role.' : 'Medical gear covers an important party safety gap.');
  }
  if (tags.has('toolkit') || tags.has('tool') || tags.has('tech') || hookSkills.has('mechanics') || caps.installSkill === 'mechanics' || /toolkit|tool kit|repair|mechanic/.test(text)) {
    const aligned = mechanics >= 5 || intMod >= 3 || routeScore(storeContext, ['tech', 'repair']) >= 0.34;
    score += aligned ? 8 : 2;
    explanations.push(aligned ? 'Technical gear matches your Mechanics/Intelligence investment.' : 'Technical gear is useful, but your build has limited tech commitment.');
  }
  if (tags.has('security') || tags.has('computer') || hookSkills.has('usecomputer') || /security kit|slicer|computer spike|datapad|interface/.test(text)) {
    const aligned = useComputer >= 5 || intMod >= 3 || routeScore(storeContext, ['tech', 'slicer']) >= 0.34;
    score += aligned ? 7 : 2;
    explanations.push(aligned ? 'Slicing/security gear matches your Use Computer lane.' : 'Security gear opens a tech side lane.');
  }
  if (tags.has('survival') || tags.has('fieldcraft') || hookSkills.has('survival') || /survival|field kit|climbing|breath mask|sensor|macrobinocular/.test(text)) {
    const aligned = survival >= 5 || perception >= 5 || wisMod >= 3 || routeScore(storeContext, ['scout', 'fieldcraft', 'survival']) >= 0.34;
    score += aligned ? 7 : 3;
    explanations.push(aligned ? 'Field gear supports your scout/perception route.' : 'Field gear is broadly useful outside combat.');
  }
  if (tags.has('perception') || hookSkills.has('perception') || caps.perceptionEquipmentBonus || caps.lowLightVision || caps.lowLightTargeting) {
    const aligned = perception >= 5 || wisMod >= 3 || routeScore(storeContext, ['scout', 'perception', 'fieldcraft']) >= 0.34;
    score += aligned ? 6 : 2;
    explanations.push(aligned ? 'Perception gear reinforces your scout/awareness lane.' : 'Awareness gear is broadly useful for the party.');
  }
  if (tags.has('stealth') || hookSkills.has('stealth') || caps.concealedCarry || /stealth|camouflage|conceal|shadow/.test(text)) {
    const aligned = stealth >= 5 || routeScore(storeContext, ['stealth', 'scoundrel', 'scout']) >= 0.34;
    score += aligned ? 6 : 1;
    explanations.push(aligned ? 'Stealth gear matches your infiltration lane.' : 'Stealth gear is a side option unless you invest in Stealth.');
  }
  if (tags.has('social') || tags.has('communication') || hookSkills.has('deception') || /comlink|disguise|translator|forgery|credit chip|identity/.test(text)) {
    const aligned = persuasion >= 5 || routeScore(storeContext, ['social', 'leadership']) >= 0.34;
    score += aligned ? 5 : 2;
    explanations.push(aligned ? 'Social/identity gear supports your influence lane.' : 'Social gear offers situational utility.');
  }
  if (tags.has('weapon_support') || tags.has('accuracy') || caps.weaponUpgrade || caps.accuracySupport || hookUses.has('aim')) {
    const aligned = routeScore(storeContext, ['ranged', 'soldier', 'scoundrel']) >= 0.34 || storeContext?.equipmentProfile?.tagWeights?.ranged >= 0.55;
    score += aligned ? 7 : 2;
    explanations.push(aligned ? 'Weapon accessory supports your current ranged investment.' : 'Weapon accessory is best if you invest in ranged weapons.');
  }
  if (tags.has('container') || caps.containerSlots || caps.quickAccess) {
    score += 2;
    explanations.push('Container/quick-access gear improves inventory readiness.');
  }

  return { adjustment: Math.max(-6, Math.min(16, score)), explanations: explanations.slice(0, 3) };
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
      const categoryLower = normalize(category);
      const filtered = gearOptions.filter(gear => {
        const sys = gear.system || {};
        const fields = [
          gear.name,
          sys.category,
          sys.subcategory,
          sys.equipmentBucket,
          sys.equipmentType,
          sys.itemRole,
          ...(Array.isArray(sys.tags) ? sys.tags : [])
        ].map(normalize).filter(Boolean);

        return fields.some(value => value === categoryLower || value.includes(categoryLower) || categoryLower.includes(value));
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
      const equipmentUseFit = buildEquipmentUseProfile(gear, character, options.storeContext || {});

      // Final score (additive, bounded 0-100)
      let finalScore = baseRelevance +
        roleAlignment +
        axisA +
        axisB +
        priceBias +
        (storeContextFit?.cappedAdjustment || 0) +
        useCaseFit.adjustment +
        equipmentUseFit.adjustment;

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
          useCaseFit: useCaseFit.adjustment,
          equipmentUseFit: equipmentUseFit.adjustment
        },

        combined: {
          finalScore,
          tier
        },

        explanations: [
          ...this._generateExplanations(gear, charContext, axisA, axisB, roleAlignment),
          ...useCaseFit.explanations,
          ...equipmentUseFit.explanations,
          ...(storeContextFit?.explanations || [])
        ].slice(0, 5),

        storeContextFit,
        useCaseFit,
        equipmentUseFit,

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
    const sys = gear.system || {};
    const tags = new Set(extractStoreItemTags(gear).map(normalize));
    const hooks = Array.isArray(sys.skillHooks) ? sys.skillHooks : [];
    const caps = sys.capabilities && typeof sys.capabilities === 'object' ? sys.capabilities : {};

    let score = 4;
    if (hooks.length) score += Math.min(8, hooks.length * 2);
    if (hooks.some(hook => hook?.required === true || hook?.mode === 'requires' || hook?.mode === 'enables')) score += 3;
    if (hooks.some(hook => hook?.bonus?.type === 'equipment' && Number(hook?.bonus?.value || 0) > 0)) score += 4;
    if (Object.values(caps).some(value => value === true)) score += 2;
    if (caps.containerSlots) score += 2;
    if (caps.perceptionEquipmentBonus || caps.accuracySupport || caps.rangeCategoryReduction) score += 4;
    if (tags.has('medical') || tags.has('tool') || tags.has('security') || tags.has('tech') || tags.has('survival')) score += 2;
    if (tags.has('weapon_support') || tags.has('accuracy') || tags.has('range_support')) score += 3;

    return Math.min(20, score);
  }

  /**
   * Compute action cost axis (0-20, inverted: lower cost = higher score)
   * @private
   */
  static _computeActionCostAxis(gear, charContext) {
    const sys = gear.system || {};
    const usageMode = normalize(sys.usage?.mode || sys.actionCost || 'passive');
    const setupCost = numberValue(sys.setupCost ?? sys.usage?.setupCost, 0);

    let score = 20;
    if (usageMode === 'reaction') score = 15;
    if (usageMode === 'action' || usageMode === 'standard') score = 10;
    if (usageMode === 'full_action' || usageMode === 'full_round') score = 5;
    if (usageMode === 'container') score = 14;
    if (usageMode === 'consumable') score = 12;
    if (usageMode === 'install' || usageMode === 'upgrade') score = 8;
    if (sys.capabilities?.installDC) score -= 2;

    if (setupCost > 0) score -= setupCost * 2;
    return Math.max(0, Math.min(20, score));
  }

  /**
   * Compute role alignment (-10 to +10)
   * @private
   */
  static _computeRoleAlignment(gear, charContext) {
    const tags = new Set(extractStoreItemTags(gear).map(normalize));
    const primaryRole = charContext.primaryRole || 'generalist';

    let score = 0;
    if (tags.has('medical') && (primaryRole === 'support' || primaryRole === 'leader')) score += 8;
    if ((tags.has('tech') || tags.has('security') || tags.has('usecomputer') || tags.has('mechanics')) && (primaryRole === 'tech' || primaryRole === 'hacker' || primaryRole === 'scoundrel')) score += 8;
    if ((tags.has('survival') || tags.has('fieldcraft') || tags.has('perception')) && (primaryRole === 'scout' || primaryRole === 'generalist')) score += 5;
    if ((tags.has('weapon_support') || tags.has('accuracy') || tags.has('range_support')) && (primaryRole === 'soldier' || primaryRole === 'scoundrel')) score += 6;
    if (tags.has('communication') && (primaryRole === 'leader' || primaryRole === 'scoundrel' || primaryRole === 'generalist')) score += 3;
    if (tags.has('container') || tags.has('tool') || tags.has('utility') || tags.has('quick_access')) score += 2;
    return Math.max(-10, Math.min(10, score));
  }

  /**
   * Score price bias
   * @private
   */
  static _scorePriceBias(gear) {
    const sys = gear.system || {};
    const price = numberValue(sys.costNumeric ?? sys.value ?? sys.price ?? sys.cost, 0);
    if (!price) return 0;
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
