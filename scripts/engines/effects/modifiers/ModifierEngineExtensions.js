/**
 * ModifierEngineExtensions
 *
 * Extends ModifierEngine with specialized domains and stacking rules.
 * Provides domain-specific modifier calculation and bonus cap enforcement.
 *
 * Owns:
 * - Modifier domain definitions
 * - Domain-specific stacking rules
 * - Bonus cap enforcement per domain
 * - Penalty calculation logic
 *
 * Delegates to: ModifierEngine (base collection/aggregation)
 * Never owns: Actor mutations, direct state writes
 *
 * Contract:
 * - Returns structured modifier calculations, not mutations
 * - No direct actor.system writes
 * - No game.settings.get() calls
 */

import { swseLogger } from '../../../utils/logger.js';
import { HouseRuleService } from '../../system/HouseRuleService.js';
import { ModifierEngine } from './ModifierEngine.js';

/**
 * Specialized modifier domains with their own stacking and cap rules
 */
export const MODIFIER_DOMAINS = {
  // Combat domain
  'attack': {
    name: 'Attack Rolls',
    category: 'combat',
    stackingRule: 'highest', // Only highest attack bonus applies
    bonusCap: null,
    description: 'Bonuses to attack rolls'
  },

  'defense.fortitude': {
    name: 'Fortitude Defense',
    category: 'defense',
    stackingRule: 'highest', // Defense bonuses don't stack
    bonusCap: null,
    description: 'Bonuses to Fortitude Defense'
  },

  'defense.reflex': {
    name: 'Reflex Defense',
    category: 'defense',
    stackingRule: 'highest',
    bonusCap: null,
    description: 'Bonuses to Reflex Defense'
  },

  'defense.will': {
    name: 'Will Defense',
    category: 'defense',
    stackingRule: 'highest',
    bonusCap: null,
    description: 'Bonuses to Will Defense'
  },

  // Skill domain
  'skill': {
    name: 'Skill Checks',
    category: 'skill',
    stackingRule: 'stack',
    bonusCap: 10, // RAW: +10 max from any one source
    description: 'Bonuses to skill checks'
  },

  // Movement domain
  'speed.base': {
    name: 'Speed',
    category: 'movement',
    stackingRule: 'additive', // All speed bonuses stack
    bonusCap: null,
    description: 'Bonuses to movement speed'
  },

  // Initiative domain
  'initiative': {
    name: 'Initiative',
    category: 'combat',
    stackingRule: 'highest', // Initiative bonuses don't stack
    bonusCap: null,
    description: 'Bonuses to initiative rolls'
  },

  // HP domain
  'hp.max': {
    name: 'Hit Points',
    category: 'survival',
    stackingRule: 'stack',
    bonusCap: null,
    description: 'Bonuses to maximum hit points'
  },

  // Damage domain
  'damage': {
    name: 'Damage Rolls',
    category: 'combat',
    stackingRule: 'stack',
    bonusCap: null,
    description: 'Bonuses to damage rolls'
  }
};

/**
 * Penalty categories for condition track and other penalties
 */
export const PENALTY_CATEGORIES = {
  'condition': {
    name: 'Condition Track',
    applies_to: ['attack', 'defense', 'skill', 'ability_check'],
    description: 'Penalties from condition track position'
  },
  'encumbrance': {
    name: 'Encumbrance',
    applies_to: ['speed', 'initiative', 'skill'],
    description: 'Penalties from heavy equipment'
  },
  'wound': {
    name: 'Wound',
    applies_to: ['attack', 'defense', 'skill'],
    description: 'Penalties from serious wounds'
  },
  'fatigue': {
    name: 'Fatigue',
    applies_to: ['attack', 'skill', 'ability_check'],
    description: 'Penalties from exhaustion'
  }
};

export class ModifierEngineExtensions {
  /**
   * Get all modifiers for a specific domain.
   *
   * Filters and organizes modifiers by domain with stacking rules applied.
   *
   * @param {Actor} actor - Target actor
   * @param {string} domain - Domain key (e.g., 'defense.reflex')
   * @param {Object} options - Query options
   * @returns {Promise<Object>} { total, applied, breakdown, domain }
   */
  static async getModifiersForDomain(actor, domain, options = {}) {
    try {
      swseLogger.debug(`[ModifierEngineExtensions] Getting modifiers for domain: ${domain}`, {
        actor: actor?.name ?? 'unknown'
      });

      if (!actor) {
        throw new Error('getModifiersForDomain() requires actor');
      }

      const domainDef = MODIFIER_DOMAINS[domain];
      if (!domainDef) {
        swseLogger.warn(`[ModifierEngineExtensions] Unknown domain: ${domain}`);
        return {
          total: 0,
          applied: [],
          breakdown: [],
          domain,
          error: 'Unknown domain'
        };
      }

      // Get all modifiers for this actor
      const allModifiers = await ModifierEngine.getAllModifiers(actor);

      // Filter to domain-specific modifiers
      const domainModifiers = allModifiers.filter(m => {
        return m.target === domain || m.domain === domain;
      });

      swseLogger.debug(`[ModifierEngineExtensions] Found ${domainModifiers.length} modifiers for ${domain}`);

      // Apply stacking rules
      const resolved = this.#applyStackingRules(domainModifiers, domainDef.stackingRule);
      swseLogger.debug(`[ModifierEngineExtensions] After stacking (${domainDef.stackingRule}): ${resolved.length} modifiers`);

      // Sum the total
      const total = resolved.reduce((sum, m) => sum + (m.value ?? 0), 0);

      // Apply bonus cap if applicable
      const cappedTotal = domainDef.bonusCap ? Math.min(total, domainDef.bonusCap) : total;
      if (cappedTotal !== total) {
        swseLogger.debug(`[ModifierEngineExtensions] Capped ${domain} bonus from ${total} to ${cappedTotal}`);
      }

      // Build breakdown
      const breakdown = resolved.map(m => ({
        label: m.label || m.source || 'Unknown',
        value: m.value,
        source: m.source,
        type: m.type
      }));

      const result = {
        domain,
        domainName: domainDef.name,
        stackingRule: domainDef.stackingRule,
        total: cappedTotal,
        applied: resolved,
        breakdown,
        bonusCap: domainDef.bonusCap
      };

      swseLogger.log(`[ModifierEngineExtensions] Domain summary for ${domain}`, {
        actor: actor.name,
        total: cappedTotal,
        modifierCount: resolved.length,
        stackingRule: domainDef.stackingRule
      });

      return result;

    } catch (err) {
      swseLogger.error(`[ModifierEngineExtensions] getModifiersForDomain failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        domain
      });

      return {
        domain,
        total: 0,
        applied: [],
        breakdown: [],
        error: err.message
      };
    }
  }

  /**
   * Get all domain modifiers for an actor (aggregated summary).
   *
   * Returns all domains with their totals and stacking info.
   *
   * @param {Actor} actor - Target actor
   * @returns {Promise<Object>} Map of domain → modifier info
   */
  static async getAllDomainModifiers(actor) {
    try {
      if (!actor) {
        throw new Error('getAllDomainModifiers() requires actor');
      }

      swseLogger.debug(`[ModifierEngineExtensions] Aggregating all domain modifiers for ${actor.name}`);

      const domainResults = {};

      for (const [domain, domainDef] of Object.entries(MODIFIER_DOMAINS)) {
        const result = await this.getModifiersForDomain(actor, domain);
        if (result.total !== 0 || result.applied.length > 0) {
          domainResults[domain] = result;
        }
      }

      swseLogger.log(`[ModifierEngineExtensions] All domains aggregated`, {
        actor: actor.name,
        domainCount: Object.keys(domainResults).length
      });

      return domainResults;

    } catch (err) {
      swseLogger.error(`[ModifierEngineExtensions] getAllDomainModifiers failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      return {};
    }
  }

  /**
   * Calculate total penalties from a penalty category.
   *
   * Gathers penalties from condition track, encumbrance, wounds, etc.
   *
   * @param {Actor} actor - Target actor
   * @param {string} category - Penalty category key
   * @returns {Promise<Object>} { total, sources, breakdown }
   */
  static async getPenaltyForCategory(actor, category, options = {}) {
    try {
      swseLogger.debug(`[ModifierEngineExtensions] Calculating penalties for category: ${category}`, {
        actor: actor?.name ?? 'unknown'
      });

      if (!actor) {
        throw new Error('getPenaltyForCategory() requires actor');
      }

      const categoryDef = PENALTY_CATEGORIES[category];
      if (!categoryDef) {
        swseLogger.warn(`[ModifierEngineExtensions] Unknown penalty category: ${category}`);
        return {
          total: 0,
          sources: [],
          breakdown: [],
          error: 'Unknown category'
        };
      }

      // Collect penalties from all relevant sources
      const breakdown = [];

      switch (category) {
        case 'condition': {
          const conditionStep = actor.system.conditionTrack?.current ?? 0;
          const conditionPenalty = this.#getConditionPenalty(conditionStep);
          if (conditionPenalty !== 0) {
            breakdown.push({
              label: `Condition Track (Step ${conditionStep})`,
              value: conditionPenalty,
              source: 'condition_track'
            });
          }
          break;
        }

        case 'encumbrance': {
          const encumbrancePenalty = actor.system.encumbrance?.penalty ?? 0;
          if (encumbrancePenalty !== 0) {
            breakdown.push({
              label: 'Encumbrance',
              value: encumbrancePenalty,
              source: 'encumbrance'
            });
          }
          break;
        }

        case 'wound': {
          // Wounds could be tracked via flags
          const woundPenalty = actor.getFlag('swse', 'woundPenalty') ?? 0;
          if (woundPenalty !== 0) {
            breakdown.push({
              label: 'Wounds',
              value: woundPenalty,
              source: 'wounds'
            });
          }
          break;
        }

        case 'fatigue': {
          const fatiguePenalty = actor.getFlag('swse', 'fatiguePenalty') ?? 0;
          if (fatiguePenalty !== 0) {
            breakdown.push({
              label: 'Fatigue',
              value: fatiguePenalty,
              source: 'fatigue'
            });
          }
          break;
        }
      }

      const total = breakdown.reduce((sum, p) => sum + (p.value ?? 0), 0);

      const result = {
        category,
        categoryName: categoryDef.name,
        appliesToDomains: categoryDef.applies_to,
        total,
        sources: breakdown.map(b => b.source),
        breakdown
      };

      swseLogger.log(`[ModifierEngineExtensions] Penalty category summary`, {
        actor: actor.name,
        category,
        total,
        sourceCount: breakdown.length
      });

      return result;

    } catch (err) {
      swseLogger.error(`[ModifierEngineExtensions] getPenaltyForCategory failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        category
      });

      return {
        category,
        total: 0,
        sources: [],
        breakdown: [],
        error: err.message
      };
    }
  }

  /**
   * Apply stacking rules to modifiers.
   *
   * @private
   */
  static #applyStackingRules(modifiers, stackingRule) {
    if (!modifiers || modifiers.length === 0) {
      return [];
    }

    switch (stackingRule) {
      case 'highest': {
        // Return only the highest modifier
        const highest = modifiers.reduce((max, m) => {
          const mValue = m.value ?? 0;
          const maxValue = max.value ?? 0;
          return mValue > maxValue ? m : max;
        });
        return highest ? [highest] : [];
      }

      case 'additive': {
        // All modifiers add together
        return modifiers;
      }

      case 'stack': {
        // Default: all stack (typical for most modifiers)
        return modifiers;
      }

      default: {
        // Unknown rule - default to stack
        return modifiers;
      }
    }
  }

  /**
   * Get condition track penalty.
   *
   * @private
   */
  static #getConditionPenalty(step) {
    const penalties = {
      0: 0,
      1: -1,
      2: -2,
      3: -5,
      4: -10,
      5: -999 // Helpless
    };

    return penalties[step] ?? 0;
  }
}
