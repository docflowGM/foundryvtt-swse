/**
 * SWSE Build Analysis Engine — Phase 3.0-A
 *
 * Evaluates actor state against derived structural expectations.
 * Generates ConflictSignals and StrengthSignals.
 * Computes deterministic coherence metrics.
 *
 * Pure analysis layer—no state mutation.
 * No scoring interference.
 * No mentor integration.
 */

import { ArchetypeTrendRegistry } from "/systems/foundryvtt-swse/scripts/engine/analysis/archetype-trend-registry.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class BuildAnalysisEngine {
  /**
   * Analyze an actor against all derived trends
   * @param {Object} actor - Foundry actor document
   * @returns {Promise<Object>} Analysis result with signals and metrics
   */
  static async analyze(actor) {
    if (!ArchetypeTrendRegistry.isInitialized()) {
      await ArchetypeTrendRegistry.initialize();
    }

    const context = this._buildActorContext(actor);
    const trends = ArchetypeTrendRegistry.getTrends();

    const conflictSignals = [];
    const strengthSignals = [];

    for (const trend of trends) {
      const evaluation = this._evaluateTrend(actor, context, trend);

      if (evaluation.violated) {
        conflictSignals.push({
          id: trend.id,
          category: trend.category,
          severity: this._deriveSeverity(evaluation, trend),
          evidence: evaluation.evidence
        });
      } else if (evaluation.exceeded) {
        strengthSignals.push({
          id: trend.id,
          category: trend.category,
          strength: 'high',
          evidence: evaluation.evidence
        });
      }
    }

    const metrics = this._computeMetrics(actor, context, conflictSignals);

    return {
      actorId: actor.id,
      actorName: actor.name,
      archetype: context.archetype,
      timestamp: new Date().toISOString(),
      conflictSignals,
      strengthSignals,
      metrics,
      summary: this._generateSummary(conflictSignals, strengthSignals, metrics)
    };
  }

  /**
   * Build actor context from Foundry actor document
   * @private
   */
  static _buildActorContext(actor) {
    const system = actor.system || {};
    const derived = system.derived || {};

    // Determine archetype
    const archetypeId = system.archetypeId || system.archetype?.id;
    const archetype = archetypeId ? ArchetypeRegistry.get(archetypeId) : null;

    // Collect owned items by type
    const feats = actor.items
      .filter(item => item.type === 'feat')
      .map(f => ({ id: f.id, name: f.name }));

    const talents = actor.items
      .filter(item => item.type === 'talent')
      .map(t => ({ id: t.id, name: t.name }));

    const skills = actor.items
      .filter(item => item.type === 'skill')
      .map(s => ({ id: s.id, name: s.name }));

    // Extract class levels
    const classLevels = actor.items
      .filter(item => item.type === 'class')
      .map(c => ({
        name: c.name,
        levels: c.system?.levels || 0
      }));

    // Extract attributes
    const attributes = {
      str: system.attributes?.str?.value || 10,
      dex: system.attributes?.dex?.value || 10,
      con: system.attributes?.con?.value || 10,
      int: system.attributes?.int?.value || 10,
      wis: system.attributes?.wis?.value || 10,
      cha: system.attributes?.cha?.value || 10
    };

    // Extract derived stats
    const defenses = {
      fort: derived.defenses?.fort || 10,
      ref: derived.defenses?.ref || 10,
      will: derived.defenses?.will || 10,
      flatFooted: derived.defenses?.flatFooted || 10
    };

    const bab = derived.bab || 0;
    const hp = derived.hp?.current || 0;

    // Force capacity
    const forceItems = actor.items.filter(
      item => item.type === 'forcePower' || item.type === 'forceSecret'
    );

    return {
      archetype,
      archetypeId,
      feats,
      talents,
      skills,
      classLevels,
      attributes,
      defenses,
      bab,
      hp,
      forceCapacity: forceItems.length,
      totalLevel:
        classLevels.reduce((sum, c) => sum + c.levels, 0) || 1
    };
  }

  /**
   * Evaluate whether actor satisfies a trend expectation
   * @private
   * @returns {Object} {violated, exceeded, evidence}
   */
  static _evaluateTrend(actor, context, trend) {
    const trendId = trend.id;

    // ATTRIBUTE_PRIORITY trends
    if (trendId.startsWith('ATTR_PRIORITY_')) {
      return this._evaluateAttributePriority(context, trend);
    }

    // ROLE_EXPECTATION trends
    if (trendId.startsWith('ROLE_EXPECTATION_')) {
      return this._evaluateRoleExpectation(actor, context, trend);
    }

    // PRESTIGE_PREP trends
    if (trendId.startsWith('PRESTIGE_PREP_')) {
      return this._evaluatePrestigePrep(context, trend);
    }

    // RECOMMENDED_FEATURE_MISSING (consolidated feats + talents)
    if (trendId === 'RECOMMENDED_FEATURE_MISSING') {
      return this._evaluateRecommendedFeatures(context, trend);
    }

    // SKILL_INVESTMENT_ALIGNMENT
    if (trendId === 'SKILL_INVESTMENT_ALIGNMENT') {
      return this._evaluateSkillAlignment(context, trend);
    }

    // SKILL_FOCUS_VS_BREADTH
    if (trendId === 'SKILL_FOCUS_VS_BREADTH') {
      return this._evaluateSkillFocusBreadth(context, trend);
    }

    // ROLE_STAT_CONSISTENCY
    if (trendId === 'ROLE_STAT_CONSISTENCY') {
      return this._evaluateRoleStatConsistency(context, trend);
    }

    // SPECIALIZATION trends
    if (trendId.startsWith('SPECIALIZATION_')) {
      return this._evaluateSpecialization(context, trend);
    }

    // FEATURE_CHAIN_PROGRESSION (consolidated feats + talents)
    if (trendId === 'FEATURE_CHAIN_PROGRESSION') {
      return this._evaluateFeatureChain(context, trend);
    }

    // FORCE_ENGAGEMENT_EXPECTATION
    if (trendId === 'FORCE_ENGAGEMENT_EXPECTATION') {
      return this._evaluateForceEngagement(context, trend);
    }

    // NON_FORCE_FOCUS_CONSISTENCY
    if (trendId === 'NON_FORCE_FOCUS_CONSISTENCY') {
      return this._evaluateNonForceFocus(context, trend);
    }

    // DEFENSE_ROLE_CONSISTENCY
    if (trendId === 'DEFENSE_ROLE_CONSISTENCY') {
      return this._evaluateDefenseRole(actor, context, trend);
    }

    // OFFENSE_ROLE_CONSISTENCY
    if (trendId === 'OFFENSE_ROLE_CONSISTENCY') {
      return this._evaluateOffenseRole(actor, context, trend);
    }

    // Default: no signal
    return { violated: false, exceeded: false, evidence: {} };
  }

  // ===== EVALUATION IMPLEMENTATIONS =====

  static _evaluateAttributePriority(context, trend) {
    if (!context.archetype) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const expectedAttr = trend.expectation.primaryAttribute;
    const sortedAttrs = this._getAttributesByValue(context.attributes);

    const isTopTier = sortedAttrs[0][0].toUpperCase() === expectedAttr;

    return {
      violated: !isTopTier,
      exceeded: isTopTier && sortedAttrs[0][1] >= 16,
      evidence: {
        expected: expectedAttr,
        actual: sortedAttrs[0][0],
        value: sortedAttrs[0][1]
      }
    };
  }

  static _evaluateRoleExpectation(actor, context, trend) {
    if (!context.archetype) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const expectedRoles = trend.expectation.expectedRoles || [];

    // For now, assess based on archetype alignment
    // Full role evaluation would require analyzing feat/talent selections

    return {
      violated: false,
      exceeded: false,
      evidence: { expectedRoles, hasArchetype: !!context.archetype }
    };
  }

  static _evaluatePrestigePrep(context, trend) {
    if (!context.archetype) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    // Prestige evaluation deferred—requires prestige item availability
    return { violated: false, exceeded: false, evidence: {} };
  }

  static _evaluateRecommendedFeatures(context, trend) {
    if (!context.archetype) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const recommendedFeats = context.archetype.recommended?.feats?.length || 0;
    const recommendedTalents =
      context.archetype.recommended?.talents?.length || 0;
    const totalRecommended = recommendedFeats + recommendedTalents;

    if (totalRecommended === 0) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const adoptedFeats = context.feats.length;
    const adoptedTalents = context.talents.length;
    const totalAdopted = adoptedFeats + adoptedTalents;

    // Violated if actor has significantly fewer abilities than recommended
    const violation = totalAdopted < totalRecommended * 0.5;

    return {
      violated: violation,
      exceeded: totalAdopted >= totalRecommended,
      evidence: {
        recommendedTotal: totalRecommended,
        adoptedTotal: totalAdopted,
        breakdown: {
          feats: { recommended: recommendedFeats, adopted: adoptedFeats },
          talents: { recommended: recommendedTalents, adopted: adoptedTalents }
        }
      }
    };
  }

  static _evaluateSkillAlignment(context, trend) {
    if (context.skills.length === 0) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    // Skills are invested; mark as satisfied
    return {
      violated: false,
      exceeded: context.skills.length >= 5,
      evidence: { skillCount: context.skills.length }
    };
  }

  static _evaluateSkillFocusBreadth(context, trend) {
    if (context.skills.length < 3) {
      return {
        violated: true,
        exceeded: false,
        evidence: { skillCount: context.skills.length, minExpected: 3 }
      };
    }

    // If 3+ skills, check whether focused (2-3) or broad (4+)
    return {
      violated: false,
      exceeded: context.skills.length >= 5,
      evidence: { skillCount: context.skills.length }
    };
  }

  static _evaluateRoleStatConsistency(context, trend) {
    if (!context.archetype) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const archAttrPriority = context.archetype.attributePriority || [];
    const topActorAttr = this._getAttributesByValue(context.attributes)[0];

    const matches =
      archAttrPriority.length > 0 &&
      topActorAttr[0].toUpperCase() === archAttrPriority[0];

    return {
      violated: !matches && archAttrPriority.length > 0,
      exceeded: matches && topActorAttr[1] >= 16,
      evidence: {
        archPriority: archAttrPriority[0] || 'none',
        actorTop: topActorAttr[0],
        actorValue: topActorAttr[1]
      }
    };
  }

  static _evaluateSpecialization(context, trend) {
    if (!context.archetype?.mechanicalBias) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    // Track investment in trend specialization
    // For now, pass if archetype has the specialization defined
    const specName = trend.expectation.specialization;
    const hasBias = context.archetype.mechanicalBias[specName] > 0;

    return {
      violated: false,
      exceeded: hasBias,
      evidence: { specialization: specName, defined: hasBias }
    };
  }

  static _evaluateFeatureChain(context, trend) {
    if (!context.archetype) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const expectsFeatChains =
      context.archetype.recommended?.feats?.length >= 2;
    const expectsTalentChains =
      context.archetype.recommended?.talents?.length >= 2;
    const expectsChains = expectsFeatChains || expectsTalentChains;

    if (!expectsChains) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const totalFeatures = context.feats.length + context.talents.length;

    // Violated if archetype expects chains but actor has <2 total abilities
    const violation = totalFeatures < 2;

    return {
      violated: violation,
      exceeded: totalFeatures >= 3,
      evidence: {
        totalFeatureCount: totalFeatures,
        breakdown: {
          feats: context.feats.length,
          talents: context.talents.length
        },
        expectedChains: expectsChains
      }
    };
  }

  static _evaluateForceEngagement(context, trend) {
    // Expected if archetype is Force-heavy
    if (!context.archetype?.mechanicalBias) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const forceKeys = Object.keys(context.archetype.mechanicalBias).filter(
      k => k.includes('force')
    );
    const forceBias = forceKeys.reduce(
      (sum, k) => sum + context.archetype.mechanicalBias[k],
      0
    );

    if (forceBias <= 0.3) {
      // Not a Force archetype—no expectation
      return { violated: false, exceeded: false, evidence: {} };
    }

    // Is Force archetype
    const hasForce = context.forceCapacity > 0;
    return {
      violated: !hasForce,
      exceeded: context.forceCapacity >= 5,
      evidence: { forceBias, forceCapacity: context.forceCapacity }
    };
  }

  static _evaluateNonForceFocus(context, trend) {
    if (!context.archetype?.mechanicalBias) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    const forceKeys = Object.keys(context.archetype.mechanicalBias).filter(
      k => k.includes('force')
    );
    const forceBias = forceKeys.reduce(
      (sum, k) => sum + context.archetype.mechanicalBias[k],
      0
    );

    if (forceBias > 0.3) {
      // Is a Force archetype—expectation doesn't apply
      return { violated: false, exceeded: false, evidence: {} };
    }

    // Is non-Force archetype
    const excessiveForce = context.forceCapacity > 3;
    return {
      violated: excessiveForce,
      exceeded: !excessiveForce,
      evidence: { forceBias, forceCapacity: context.forceCapacity }
    };
  }

  static _evaluateDefenseRole(actor, context, trend) {
    if (!context.archetype?.roleBias?.defense ||
        context.archetype.roleBias.defense <= 1.0) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    // Check armor/defense adequacy
    const armor = actor.items.find(item => item.type === 'armor' && item.system?.equipped);
    const acValue = armor ? armor.system?.acBonus || 0 : 0;

    const expectedAC = 3; // Baseline expectation
    const violated = acValue < expectedAC;

    return {
      violated,
      exceeded: acValue >= 5,
      evidence: { armor: !!armor, acBonus: acValue, expected: expectedAC }
    };
  }

  static _evaluateOffenseRole(actor, context, trend) {
    if (!context.archetype?.roleBias?.offense ||
        context.archetype.roleBias.offense <= 1.0) {
      return { violated: false, exceeded: false, evidence: {} };
    }

    // Check weapon investment
    const weapons = actor.items.filter(
      item =>
        item.type === 'weapon' &&
        (item.system?.equipped || item.system?.equipped === undefined)
    );

    const violation = weapons.length < 1;

    return {
      violated: violation,
      exceeded: weapons.length >= 2,
      evidence: { weaponCount: weapons.length, bab: context.bab }
    };
  }

  // ===== METRIC COMPUTATION =====

  static _computeMetrics(actor, context, conflicts) {
    return {
      archetypeAlignmentScore: this._computeArchetypeAlignment(context),
      prestigeProgressScore: this._computePrestigeProgress(context),
      statFocusConsistencyScore: this._computeStatFocusConsistency(context),
      roleConsistencyScore: this._computeRoleConsistency(context, conflicts),
      specializationScore: this._computeSpecialization(context),
      conflictDensity: conflicts.length / ArchetypeTrendRegistry.getTrendCount(),
      buildCoherence: this._computeCoherence(context, conflicts)
    };
  }

  static _computeArchetypeAlignment(context) {
    if (!context.archetype) return 0;

    const topAttr = this._getAttributesByValue(context.attributes)[0];
    const archAttrPriority = context.archetype.attributePriority || [];

    if (archAttrPriority.length === 0) return 50;

    const matches =
      topAttr[0].toUpperCase() === archAttrPriority[0] ? 50 : 0;
    const featAdoption =
      context.feats.length >= (context.archetype.recommended?.feats?.length || 1)
        ? 25
        : 0;
    const talentAdoption =
      context.talents.length >= (context.archetype.recommended?.talents?.length || 1)
        ? 25
        : 0;

    return Math.min(100, matches + featAdoption + talentAdoption);
  }

  static _computePrestigeProgress(context) {
    if (!context.archetype || !context.archetype.prestigeTargets?.length) {
      return 50;
    }

    // Stub: prestige assessment requires prestige item availability
    return 50;
  }

  static _computeStatFocusConsistency(context) {
    const attrs = Object.values(context.attributes);
    const max = Math.max(...attrs);
    const min = Math.min(...attrs);
    const spread = max - min;

    // 0 spread = 100 (perfectly focused)
    // 5+ spread = 40 (dispersed)
    return Math.max(40, Math.min(100, 100 - spread * 10));
  }

  static _computeRoleConsistency(context, conflicts) {
    const roleConflicts = conflicts.filter(
      c => c.category.includes('Role')
    ).length;

    return Math.max(0, 100 - roleConflicts * 20);
  }

  static _computeSpecialization(context) {
    if (!context.archetype?.mechanicalBias) return 50;

    const entries = Object.entries(context.archetype.mechanicalBias);
    if (entries.length === 0) return 50;

    const sorted = entries.sort(([, a], [, b]) => b - a);
    const dominance = sorted[0][1] / sorted.reduce((sum, [, v]) => sum + v, 0);

    // High dominance (0.6+) = 100, low = 40
    return Math.min(100, 40 + dominance * 100);
  }

  static _computeCoherence(context, conflicts) {
    const severity = {
      high: 3,
      medium: 2,
      low: 1
    };

    const weightedConflicts = conflicts.reduce(
      (sum, c) => sum + (severity[c.severity] || 0),
      0
    );

    // 0 conflicts = 100, 3+ high = 40
    return Math.max(40, Math.min(100, 100 - weightedConflicts * 10));
  }

  // ===== HELPERS =====

  static _getAttributesByValue(attributes) {
    return Object.entries(attributes)
      .map(([key, val]) => [key, val])
      .sort(([, a], [, b]) => b - a);
  }

  static _deriveSeverity(evaluation, trend) {
    // Use trend's assigned severity
    return trend.severity || 'medium';
  }

  static _generateSummary(conflicts, strengths, metrics) {
    const highConflicts = conflicts.filter(c => c.severity === 'high').length;
    const avgScore =
      (metrics.archetypeAlignmentScore +
        metrics.statFocusConsistencyScore +
        metrics.buildCoherence) /
      3;

    let summary = '';
    if (highConflicts > 0) {
      summary = `${highConflicts} critical deviation(s) detected. `;
    }
    if (avgScore < 50) {
      summary += 'Build shows significant drift from archetype expectations.';
    } else if (avgScore < 75) {
      summary +=
        'Build shows moderate alignment with some areas needing focus.';
    } else {
      summary += 'Build shows strong alignment with expectations.';
    }

    return summary;
  }
}
