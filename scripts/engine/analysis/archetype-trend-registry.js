/**
 * SWSE Archetype Trend Registry — Phase 3.0-A
 *
 * Derives structural expectation patterns from archetype schema.
 * No frequency threshold—patterns are extracted from every archetype.
 * Signals operate at category-level, not micro-item level.
 *
 * Pure, deterministic, schema-driven analysis.
 * No modification of existing systems.
 * No scoring integration.
 */

import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ArchetypeTrendRegistry {
  static #trends = [];
  static #initialized = false;

  /**
   * Initialize trend registry by deriving patterns from all archetypes
   * @returns {Promise<void>}
   */
  static async initialize() {
    if (this.#initialized) {
      SWSELogger.log('[ArchetypeTrendRegistry] Already initialized');
      return;
    }

    try {
      // Ensure ArchetypeRegistry is ready
      if (!ArchetypeRegistry.isInitialized()) {
        await ArchetypeRegistry.initialize();
      }

      this.#trends = [];
      const archetypes = ArchetypeRegistry.getAll();

      if (archetypes.length === 0) {
        SWSELogger.warn('[ArchetypeTrendRegistry] No archetypes loaded');
        this.#initialized = true;
        return;
      }

      // Derive structural expectation families
      this._deriveAttributePriorityTrends(archetypes);
      this._deriveRoleExpectationTrends(archetypes);
      this._derivePrestigePreparationTrends(archetypes);
      this._deriveRecommendedFeatureAdoptionTrends(archetypes);
      this._deriveSkillInvestmentTrends(archetypes);
      this._deriveRoleStatConsistencyTrends(archetypes);
      this._deriveSpecializationConsistencyTrends(archetypes);
      this._deriveChainCompletionTrends(archetypes);
      this._deriveForceEngagementTrends(archetypes);
      this._deriveDefenseAdequacyTrends(archetypes);

      this.#initialized = true;
      SWSELogger.log(
        `[ArchetypeTrendRegistry] Initialized with ${this.#trends.length} trend templates`
      );
    } catch (err) {
      SWSELogger.error('[ArchetypeTrendRegistry] Initialization failed:', err);
      this.#initialized = false;
    }
  }

  /**
   * Derive attribute priority alignment trends
   * Captures expected primary attribute focus for each archetype pattern
   */
  static _deriveAttributePriorityTrends(archetypes) {
    const attributePatterns = new Map();

    for (const arch of archetypes) {
      if (!arch.attributePriority || arch.attributePriority.length === 0) continue;

      const key = `priority_${arch.attributePriority[0]}`;
      if (!attributePatterns.has(key)) {
        attributePatterns.set(key, []);
      }
      attributePatterns.get(key).push(arch);
    }

    for (const [pattern, matchingArchs] of attributePatterns) {
      this.#trends.push({
        id: `ATTR_PRIORITY_${pattern}`,
        category: 'AttributePriorityTrend',
        sourceField: 'attributePriority',
        expectation: {
          primaryAttribute: pattern.split('_')[2],
          consistency: 'primary attribute should dominate actor stat allocation'
        },
        derivedFromCount: matchingArchs.length,
        severity: 'medium'
      });
    }
  }

  /**
   * Derive role expectation trends
   * Captures expected role composition for each archetype
   */
  static _deriveRoleExpectationTrends(archetypes) {
    const rolePatterns = new Map();

    for (const arch of archetypes) {
      if (!arch.roles || arch.roles.length === 0) continue;

      const roleKey = arch.roles.sort().join('+');
      if (!rolePatterns.has(roleKey)) {
        rolePatterns.set(roleKey, []);
      }
      rolePatterns.get(roleKey).push(arch);
    }

    for (const [roleCombo, matchingArchs] of rolePatterns) {
      this.#trends.push({
        id: `ROLE_EXPECTATION_${roleCombo.replace(/\+/g, '_')}`,
        category: 'RoleExpectationTrend',
        sourceField: 'roles',
        expectation: {
          expectedRoles: roleCombo.split('+'),
          consistency: 'actor should primarily fill expected roles in party context'
        },
        derivedFromCount: matchingArchs.length,
        severity: 'medium'
      });
    }
  }

  /**
   * Derive prestige path preparation trends
   * Captures prestige progression expectations
   */
  static _derivePrestigePreparationTrends(archetypes) {
    const prestigePatterns = new Map();

    for (const arch of archetypes) {
      if (!arch.prestigeTargets || arch.prestigeTargets.length === 0) continue;

      for (const prestige of arch.prestigeTargets) {
        if (!prestigePatterns.has(prestige)) {
          prestigePatterns.set(prestige, []);
        }
        prestigePatterns.get(prestige).push(arch);
      }
    }

    for (const [prestige, matchingArchs] of prestigePatterns) {
      this.#trends.push({
        id: `PRESTIGE_PREP_${prestige}`,
        category: 'PrestigePreparationTrend',
        sourceField: 'prestigeTargets',
        expectation: {
          targetPrestige: prestige,
          consistency: 'actor should accumulate prestige prerequisites'
        },
        derivedFromCount: matchingArchs.length,
        severity: 'high'
      });
    }
  }

  /**
   * Derive recommended feature adoption trends
   * Category-level: RECOMMENDED_FEAT_MISSING, RECOMMENDED_TALENT_MISSING
   * Not per-item level
   */
  static _deriveRecommendedFeatureAdoptionTrends(archetypes) {
    const archsWithFeats = archetypes.filter(
      a => a.recommended?.feats && a.recommended.feats.length > 0
    ).length;

    if (archsWithFeats > 0) {
      this.#trends.push({
        id: 'RECOMMENDED_FEAT_MISSING',
        category: 'RecommendedFeatureAdoptionTrend',
        sourceField: 'recommended.feats',
        expectation: {
          category: 'feats',
          consistency:
            'actor should adopt feats aligned with archetype recommendations'
        },
        derivedFromCount: archsWithFeats,
        severity: 'low'
      });
    }

    const archsWithTalents = archetypes.filter(
      a => a.recommended?.talents && a.recommended.talents.length > 0
    ).length;

    if (archsWithTalents > 0) {
      this.#trends.push({
        id: 'RECOMMENDED_TALENT_MISSING',
        category: 'RecommendedFeatureAdoptionTrend',
        sourceField: 'recommended.talents',
        expectation: {
          category: 'talents',
          consistency:
            'actor should adopt talents aligned with archetype recommendations'
        },
        derivedFromCount: archsWithTalents,
        severity: 'low'
      });
    }
  }

  /**
   * Derive skill investment alignment trends
   * Captures expected skill focus patterns
   */
  static _deriveSkillInvestmentTrends(archetypes) {
    const archsWithSkills = archetypes.filter(
      a => a.recommended?.skills && a.recommended.skills.length > 0
    ).length;

    if (archsWithSkills > 0) {
      this.#trends.push({
        id: 'SKILL_INVESTMENT_ALIGNMENT',
        category: 'SkillInvestmentTrend',
        sourceField: 'recommended.skills',
        expectation: {
          consistency:
            'actor skill selection should align with archetype recommendations'
        },
        derivedFromCount: archsWithSkills,
        severity: 'low'
      });
    }

    // Derive specialization vs dispersion pattern
    this.#trends.push({
      id: 'SKILL_FOCUS_VS_BREADTH',
      category: 'SkillInvestmentTrend',
      sourceField: 'recommended.skills',
      expectation: {
        consistency:
          'actor should balance skill specialization vs utility breadth'
      },
      derivedFromCount: archetypes.length,
      severity: 'medium'
    });
  }

  /**
   * Derive role-stat consistency trends
   * Captures alignment between assigned roles and attribute investments
   */
  static _deriveRoleStatConsistencyTrends(archetypes) {
    // Check if role and attribute alignment exists
    const alignedArchs = archetypes.filter(
      a =>
        a.roles?.length > 0 &&
        a.attributePriority?.length > 0
    ).length;

    if (alignedArchs > 0) {
      this.#trends.push({
        id: 'ROLE_STAT_CONSISTENCY',
        category: 'RoleStatConsistencyTrend',
        sourceField: ['roles', 'attributePriority'],
        expectation: {
          consistency:
            'actor attribute investment should support assigned role expectations'
        },
        derivedFromCount: alignedArchs,
        severity: 'medium'
      });
    }
  }

  /**
   * Derive specialization consistency trends
   * Captures focus patterns (e.g., Force vs physical, ranged vs melee)
   */
  static _deriveSpecializationConsistencyTrends(archetypes) {
    // Examine mechanicalBias to identify dominant specialization patterns
    const specializations = new Map();

    for (const arch of archetypes) {
      if (!arch.mechanicalBias) continue;

      const dominantBias = Object.entries(arch.mechanicalBias).sort(
        ([, a], [, b]) => b - a
      );

      if (dominantBias.length > 0) {
        const [category] = dominantBias[0];
        if (!specializations.has(category)) {
          specializations.set(category, []);
        }
        specializations.get(category).push(arch);
      }
    }

    for (const [spec, matchingArchs] of specializations) {
      this.#trends.push({
        id: `SPECIALIZATION_${spec}`,
        category: 'SpecializationConsistencyTrend',
        sourceField: 'mechanicalBias',
        expectation: {
          specialization: spec,
          consistency:
            'actor should maintain coherent mechanical specialization focus'
        },
        derivedFromCount: matchingArchs.length,
        severity: 'medium'
      });
    }
  }

  /**
   * Derive chain completion trends
   * Captures multi-level or prerequisite chain expectations
   */
  static _deriveChainCompletionTrends(archetypes) {
    // Check for deep feat/talent chains
    const archsWithMultiFeats = archetypes.filter(
      a => a.recommended?.feats && a.recommended.feats.length >= 2
    ).length;

    if (archsWithMultiFeats > 0) {
      this.#trends.push({
        id: 'FEAT_CHAIN_PROGRESSION',
        category: 'ChainCompletionTrend',
        sourceField: 'recommended.feats',
        expectation: {
          consistency: 'feat sequences should complete logical chains'
        },
        derivedFromCount: archsWithMultiFeats,
        severity: 'low'
      });
    }

    const archsWithMultiTalents = archetypes.filter(
      a => a.recommended?.talents && a.recommended.talents.length >= 2
    ).length;

    if (archsWithMultiTalents > 0) {
      this.#trends.push({
        id: 'TALENT_CHAIN_PROGRESSION',
        category: 'ChainCompletionTrend',
        sourceField: 'recommended.talents',
        expectation: {
          consistency: 'talent sequences should complete logical chains'
        },
        derivedFromCount: archsWithMultiTalents,
        severity: 'low'
      });
    }
  }

  /**
   * Derive Force engagement alignment trends
   * Captures Force-focused vs non-Force archetype patterns
   */
  static _deriveForceEngagementTrends(archetypes) {
    // Identify Force-heavy archetypes (e.g., Force Adept, Jedi)
    const forceArchs = archetypes.filter(a => {
      if (!a.mechanicalBias) return false;
      const forceKeys = Object.keys(a.mechanicalBias).filter(k =>
        k.includes('force')
      );
      if (forceKeys.length === 0) return false;
      const forceBias = forceKeys.reduce((sum, k) => sum + a.mechanicalBias[k], 0);
      return forceBias > 0.3;
    });

    if (forceArchs.length > 0) {
      this.#trends.push({
        id: 'FORCE_ENGAGEMENT_EXPECTATION',
        category: 'ForceEngagementTrend',
        sourceField: 'mechanicalBias',
        expectation: {
          consistency:
            'Force-focused archetypes should develop Force powers and training'
        },
        derivedFromCount: forceArchs.length,
        severity: 'medium'
      });
    }

    // Non-Force archetypes should not over-invest in Force
    const nonForceArchs = archetypes.filter(
      a =>
        !forceArchs.includes(a)
    );

    if (nonForceArchs.length > 0) {
      this.#trends.push({
        id: 'NON_FORCE_FOCUS_CONSISTENCY',
        category: 'ForceEngagementTrend',
        sourceField: 'mechanicalBias',
        expectation: {
          consistency:
            'Non-Force archetypes should limit Force-specific investments'
        },
        derivedFromCount: nonForceArchs.length,
        severity: 'low'
      });
    }
  }

  /**
   * Derive defense adequacy trends
   * Captures expected defensive investment patterns
   */
  static _deriveDefenseAdequacyTrends(archetypes) {
    // Archetypes with "defense" role bias
    const defensiveArchs = archetypes.filter(a => {
      const roleBias = a.roleBias || {};
      return roleBias.defense && roleBias.defense > 1.0;
    });

    if (defensiveArchs.length > 0) {
      this.#trends.push({
        id: 'DEFENSE_ROLE_CONSISTENCY',
        category: 'DefenseAdequacyTrend',
        sourceField: 'roleBias',
        expectation: {
          consistency:
            'defensive-role archetypes should maintain adequate armor and damage resistance'
        },
        derivedFromCount: defensiveArchs.length,
        severity: 'medium'
      });
    }

    // Archetypes with "offense" role bias
    const offensiveArchs = archetypes.filter(a => {
      const roleBias = a.roleBias || {};
      return roleBias.offense && roleBias.offense > 1.0;
    });

    if (offensiveArchs.length > 0) {
      this.#trends.push({
        id: 'OFFENSE_ROLE_CONSISTENCY',
        category: 'DefenseAdequacyTrend',
        sourceField: 'roleBias',
        expectation: {
          consistency:
            'offensive-role archetypes should maintain sufficient survivability'
        },
        derivedFromCount: offensiveArchs.length,
        severity: 'medium'
      });
    }
  }

  /**
   * Get all derived trends
   * @returns {Array<Object>} Trend objects
   */
  static getTrends() {
    return [...this.#trends];
  }

  /**
   * Get trends by category
   * @param {string} category - Trend category name
   * @returns {Array<Object>}
   */
  static getTrendsByCategory(category) {
    return this.#trends.filter(t => t.category === category);
  }

  /**
   * Get total count of trend templates
   * @returns {number}
   */
  static getTrendCount() {
    return this.#trends.length;
  }

  /**
   * Get all unique trend categories
   * @returns {Array<string>}
   */
  static getCategories() {
    const categories = new Set();
    for (const trend of this.#trends) {
      categories.add(trend.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  static isInitialized() {
    return this.#initialized;
  }

  /**
   * Get trend registry statistics
   * @returns {Object}
   */
  static getStats() {
    const categoryCount = new Map();
    for (const trend of this.#trends) {
      const count = categoryCount.get(trend.category) || 0;
      categoryCount.set(trend.category, count + 1);
    }

    return {
      initialized: this.#initialized,
      totalTrends: this.#trends.length,
      categories: this.getCategories(),
      categoryBreakdown: Object.fromEntries(categoryCount)
    };
  }
}
