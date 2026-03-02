/**
 * TRAJECTORY PLANNING ENGINE
 *
 * Generates deterministic, goal-aware trajectory of next strategic steps.
 * This is advisory only — does NOT simulate full paths or mutate state.
 *
 * Core responsibility:
 * "Given current build and declared intent, what are highest-impact next steps?"
 *
 * Returns:
 * {
 *   priorities: [ { id, category, urgency, explanationContext }, ... ],
 *   horizon: number (estimated levels to target),
 *   deterministic: true
 * }
 *
 * CONSTRAINTS:
 * - Max 5 priorities
 * - Deterministic sorting (no randomness)
 * - No simulation of multiple levels
 * - No archetype inference
 * - No scoring interference
 * - No mutation
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";

export class TrajectoryPlanningEngine {
  /**
   * Plan next strategic steps for an actor
   * @param {Object} actor - Foundry actor document
   * @returns {Promise<Object>} Trajectory plan
   */
  static async plan(actor) {
    try {
      if (!actor) {
        throw new Error("Missing actor");
      }

      // Build planning context
      const context = this._buildPlanningContext(actor);

      // Gather candidate priorities from all categories
      const allPriorities = [];

      // 1. Prestige advancement (highest priority)
      if (context.archetypeId && context.prestigeTarget) {
        const prestigePriorities = this._planPrestigeAdvancement(
          actor,
          context
        );
        allPriorities.push(...prestigePriorities);
      }

      // 2. Attribute prioritization (if archetype defined)
      if (context.archetypeId && context.archetype?.attributePriority) {
        const attributePriorities = this._planAttributePriority(
          actor,
          context
        );
        allPriorities.push(...attributePriorities);
      }

      // 3. Core feature gaps (recommended feats/talents)
      if (context.archetypeId && context.archetype?.recommendedFeatures) {
        const featurePriorities = this._planCoreFeatureGaps(
          actor,
          context
        );
        allPriorities.push(...featurePriorities);
      }

      // 4. Conflict resolution (if high-severity conflicts exist)
      if (context.conflictSignals?.length > 0) {
        const conflictPriorities = this._planConflictResolution(
          actor,
          context
        );
        allPriorities.push(...conflictPriorities);
      }

      // 5. Role reinforcement (if role tag present)
      if (context.roleTag) {
        const rolePriorities = this._planRoleReinforcement(
          actor,
          context
        );
        allPriorities.push(...rolePriorities);
      }

      // Deduplicate and sort by urgency
      const uniquePriorities = this._deduplicatePriorities(allPriorities);
      const sortedPriorities = this._sortByUrgency(uniquePriorities);
      const finalPriorities = sortedPriorities.slice(0, 5); // Max 5

      // Estimate horizon (levels to prestige target or major goal)
      const horizon = this._estimateHorizon(actor, context, finalPriorities);

      return {
        actorId: actor.id,
        actorName: actor.name,
        priorities: finalPriorities,
        horizon: horizon,
        deterministic: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      SWSELogger.error("[TrajectoryPlanningEngine] Error:", error);
      return {
        priorities: [],
        horizon: 0,
        deterministic: true,
        error: error.message
      };
    }
  }

  /**
   * Build planning context from actor state
   * @private
   */
  static _buildPlanningContext(actor) {
    const system = actor.system || {};
    const buildIntent = system.buildIntent || {};

    const archetypeId = buildIntent.archetypeId || system.archetypeId;
    const archetype = archetypeId ? ArchetypeRegistry.get(archetypeId) : null;

    // Extract prestige target if any
    const prestigeTarget = buildIntent.prestigeTarget || null;

    // Extract role tag if any
    const roleTag = buildIntent.roleTag || null;

    // Placeholder for conflict signals (would be populated from BuildAnalysisEngine)
    const conflictSignals = [];

    return {
      archetypeId,
      archetype,
      prestigeTarget,
      roleTag,
      conflictSignals,
      currentLevel: actor.system?.level || 1
    };
  }

  /**
   * Plan prestige advancement priorities
   * @private
   */
  static _planPrestigeAdvancement(actor, context) {
    const { archetypeId, archetype, prestigeTarget, currentLevel } = context;
    if (!prestigeTarget || !archetype) {
      return [];
    }

    const priorities = [];

    // Check if prestige is reachable
    const prestigePath = archetype.prestigePath || [];
    if (!prestigePath.includes(prestigeTarget)) {
      return []; // Invalid prestige target
    }

    // Identify missing prerequisites
    const missingPrereqs = this._identifyMissingPrereqs(
      actor,
      prestigePath,
      prestigeTarget
    );

    for (const prereq of missingPrereqs.slice(0, 2)) {
      priorities.push({
        id: `prestige_prereq_${prereq.id}`,
        category: prereq.category, // "feat" | "talent" | "attribute"
        urgency: "high",
        explanationContext: {
          reason: "Prerequisite for prestige advancement",
          prestigeTarget: prestigeTarget,
          itemName: prereq.name || prereq.id,
          prerequisite: true
        }
      });
    }

    // Estimate remaining requirements
    const remainingLevels = Math.max(0, prestigePath.length - currentLevel);
    if (remainingLevels > 0) {
      priorities.push({
        id: `prestige_progression_${prestigeTarget}`,
        category: "prestige",
        urgency: "high",
        explanationContext: {
          reason: "Direct prestige advancement",
          prestigeTarget: prestigeTarget,
          levelsRemaining: remainingLevels
        }
      });
    }

    return priorities;
  }

  /**
   * Plan attribute priority
   * @private
   */
  static _planAttributePriority(actor, context) {
    const { archetype, currentLevel } = context;
    if (!archetype?.attributePriority) {
      return [];
    }

    const priorities = [];
    const attributes = actor.system?.attributes || {};
    const priorityOrder = archetype.attributePriority || [];

    // Find highest-impact attribute to improve
    for (const attr of priorityOrder) {
      const currentScore = attributes[attr]?.value || 10;

      // Only suggest if below archetype target
      const targetScore = archetype.attributeTargets?.[attr] || 18;
      if (currentScore < targetScore) {
        priorities.push({
          id: `attribute_boost_${attr}`,
          category: "attribute",
          urgency: "medium",
          explanationContext: {
            reason: "Alignment with archetype priority",
            attribute: attr,
            currentScore: currentScore,
            targetScore: targetScore,
            gap: targetScore - currentScore
          }
        });
        break; // Only one attribute per trajectory
      }
    }

    return priorities;
  }

  /**
   * Plan core feature gaps (missing recommended feats/talents)
   * @private
   */
  static _planCoreFeatureGaps(actor, context) {
    const { archetype } = context;
    if (!archetype?.recommendedFeatures) {
      return [];
    }

    const priorities = [];
    const ownedFeatures = new Set(
      (actor.items || [])
        .filter(i => ["feat", "talent"].includes(i.type))
        .map(i => i.name)
    );

    // Check recommended features
    const recommended = archetype.recommendedFeatures || [];
    const missing = recommended.filter(f => !ownedFeatures.has(f)).slice(0, 3);

    for (const feature of missing) {
      priorities.push({
        id: `core_feature_${feature}`,
        category: this._getCategoryForFeature(feature),
        urgency: "medium",
        explanationContext: {
          reason: "Core archetype feature",
          featureName: feature,
          archetypeId: archetype.id
        }
      });
    }

    return priorities;
  }

  /**
   * Plan conflict resolution
   * @private
   */
  static _planConflictResolution(actor, context) {
    const { conflictSignals } = context;
    if (!conflictSignals || conflictSignals.length === 0) {
      return [];
    }

    const priorities = [];
    const highSeverity = conflictSignals.filter(
      s => s.severity === "high"
    ).slice(0, 1);

    for (const signal of highSeverity) {
      priorities.push({
        id: `resolve_conflict_${signal.id}`,
        category: "conflict_correction",
        urgency: "high",
        explanationContext: {
          reason: "Resolve high-severity conflict",
          conflictType: signal.category,
          severity: signal.severity,
          evidence: signal.evidence
        }
      });
    }

    return priorities;
  }

  /**
   * Plan role reinforcement
   * @private
   */
  static _planRoleReinforcement(actor, context) {
    const { roleTag } = context;
    if (!roleTag) {
      return [];
    }

    const priorities = [];

    // Role-specific reinforcement suggestions
    const roleReinforcements = {
      "tank": { category: "feat", name: "Defensive ability", priority: "medium" },
      "damage": { category: "talent", name: "Offensive talent", priority: "medium" },
      "control": { category: "feat", name: "Control feature", priority: "medium" },
      "support": { category: "talent", name: "Support talent", priority: "medium" }
    };

    const reinforcement = roleReinforcements[roleTag];
    if (reinforcement) {
      priorities.push({
        id: `reinforce_role_${roleTag}`,
        category: reinforcement.category,
        urgency: reinforcement.priority,
        explanationContext: {
          reason: "Reinforce declared role",
          roleTag: roleTag,
          suggestion: reinforcement.name
        }
      });
    }

    return priorities;
  }

  /**
   * Identify missing prestige prerequisites
   * @private
   */
  static _identifyMissingPrereqs(actor, prestigePath, target) {
    // This is a simplified implementation
    // In production, would check actual prestige requirements
    return [];
  }

  /**
   * Estimate horizon (levels until goal)
   * @private
   */
  static _estimateHorizon(actor, context, priorities) {
    if (context.prestigeTarget) {
      // Estimate based on prestige path length
      const prestigePath = context.archetype?.prestigePath || [];
      return Math.max(1, prestigePath.length - context.currentLevel);
    }

    if (priorities.length > 0) {
      // Generic estimate: assume medium-term goal
      return 3;
    }

    return 0;
  }

  /**
   * Deduplicate priorities by ID
   * @private
   */
  static _deduplicatePriorities(priorities) {
    const seen = new Set();
    return priorities.filter(p => {
      if (seen.has(p.id)) {
        return false;
      }
      seen.add(p.id);
      return true;
    });
  }

  /**
   * Sort priorities by urgency and determinism
   * Stable sort: high → medium → low, then by insertion order
   * @private
   */
  static _sortByUrgency(priorities) {
    const urgencyOrder = { high: 3, medium: 2, low: 1 };

    return priorities.sort((a, b) => {
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (urgencyDiff !== 0) {
        return urgencyDiff;
      }
      // Stable tie-breaking: maintain insertion order
      return 0;
    });
  }

  /**
   * Infer category for a feature name
   * @private
   */
  static _getCategoryForFeature(featureName) {
    const name = featureName.toLowerCase();
    if (name.includes("talent")) return "talent";
    if (name.includes("feat")) return "feat";
    return "feat";
  }
}
