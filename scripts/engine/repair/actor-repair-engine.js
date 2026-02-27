/**
 * PHASE 5C-3: Actor Repair Engine
 *
 * Analyze violations and propose repairs (analysis only).
 *
 * Does NOT:
 *   - Mutate actors
 *   - Call ActorEngine
 *   - Interpret prerequisite schema
 *   - Bypass registries
 *
 * Returns:
 *   - Deterministic repair proposals
 *   - Actionable recommendations
 *   - Complexity estimates
 */

import { MissingPrereqsTracker } from "/systems/foundryvtt-swse/scripts/governance/integrity/missing-prereqs-tracker.js";
import { PrerequisiteIntegrityChecker } from "/systems/foundryvtt-swse/scripts/governance/integrity/prerequisite-integrity-checker.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { SuggestionEngine } from "/systems/foundryvtt-swse/scripts/engines/mentor/SuggestionEngine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class ActorRepairEngine {
  /**
   * Analyze actor for repair opportunities
   *
   * @param {Actor} actor - Actor to analyze
   * @returns {RepairAnalysis} - Deterministic repair proposals
   */
  static analyze(actor) {
    if (!actor) {
      return this._emptyAnalysis();
    }

    try {
      // Get actor violations
      const violations = MissingPrereqsTracker.getMissingPrereqs(actor);

      if (violations.length === 0) {
        return {
          actor: { id: actor.id, name: actor.name, type: actor.type },
          violations: [],
          proposals: [],
          summary: {
            totalViolations: 0,
            repairableCount: 0,
            repairComplexity: 'none'
          },
          timestamp: Date.now()
        };
      }

      // Generate proposals for each violation
      const proposals = [];
      for (const violation of violations) {
        const proposal = this._proposeRepair(actor, violation);
        if (proposal) {
          proposals.push(proposal);
        }
      }

      // Sort by priority (critical > high > medium > low)
      proposals.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      return {
        actor: { id: actor.id, name: actor.name, type: actor.type },
        violations: violations,
        proposals: proposals,
        summary: {
          totalViolations: violations.length,
          repairableCount: proposals.length,
          repairComplexity: this._estimateComplexity(proposals)
        },
        timestamp: Date.now()
      };

    } catch (err) {
      SWSELogger.error('[5C-3] Repair analysis failed:', err);
      return this._emptyAnalysis(err);
    }
  }

  /**
   * Propose repair for single violation
   * @private
   */
  static _proposeRepair(actor, violation) {
    const proposals = [];

    // STRATEGY 1: Structural violations → REMOVE
    if (violation.permanentlyBlocked) {
      proposals.push({
        id: `remove-${violation.itemId}`,
        priority: 'critical',
        type: 'removeItem',
        itemId: violation.itemId,
        itemName: violation.itemName,
        reason: 'Incompatible with current character build',
        executionCost: 1 // Simple: just remove
      });
    }

    // STRATEGY 2: Missing prerequisites → SUGGEST ACQUISITION
    if (violation.missingPrereqs && violation.missingPrereqs.length > 0) {
      // Check if we can suggest acquisition via SuggestionEngine
      const suggestions = this._getSuggestionsForMissing(actor, violation.missingPrereqs);

      for (const suggestion of suggestions) {
        proposals.push({
          id: `acquire-${suggestion.itemId}`,
          priority: violation.severity === 'error' ? 'high' : 'medium',
          type: 'suggestAcquisition',
          candidateId: suggestion.itemId,
          candidateName: suggestion.itemName,
          reason: `Required by ${violation.itemName}`,
          impact: `Enables ${suggestion.itemName}`,
          executionCost: 1 // Simple: just add
        });
      }
    }

    // STRATEGY 3: Many violations on same class → CLASS ADJUSTMENT
    // (Complex analysis: only if 3+ violations on same class)
    if (actor.system.class && this._shouldSuggestClassChange(actor, violation)) {
      proposals.push({
        id: `class-change`,
        priority: 'medium',
        type: 'classAdjustment',
        details: {
          currentClass: actor.system.class,
          suggestion: 'Review class choice'
        },
        reason: 'Multiple violations suggest class may not be optimal',
        executionCost: 10 // Complex: requires user decision
      });
    }

    // Return highest priority proposal
    return proposals.length > 0
      ? proposals.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })[0]
      : null;
  }

  /**
   * Get acquisition suggestions for missing prerequisites
   * @private
   */
  static _getSuggestionsForMissing(actor, missingNames) {
    const suggestions = [];

    for (const missingName of missingNames) {
      // Try to find item in game data
      try {
        // Search in compendiums via registries
        // This delegates to SuggestionEngine or registries
        // but does NOT mutate
        const found = this._findItemByName(missingName);

        if (found) {
          suggestions.push({
            itemId: found.id,
            itemName: found.name,
            type: found.type
          });
        }
      } catch (err) {
        SWSELogger.debug(`[5C-3] Could not find: ${missingName}`);
      }
    }

    return suggestions;
  }

  /**
   * Find item by name (search, no mutation)
   * @private
   */
  static _findItemByName(name) {
    // First check actor items
    if (typeof game !== 'undefined' && game.actors) {
      for (const actor of game.actors.contents) {
        const found = actor.items.find(i => i.name === name);
        if (found) return found;
      }
    }

    // Could extend to search compendiums, but be careful not to
    // access game.packs directly (violates sovereignty)
    // Instead delegate to registries

    return null;
  }

  /**
   * Check if class change should be suggested
   * @private
   */
  static _shouldSuggestClassChange(actor, violation) {
    // Only suggest if this is the 3+ violation on the same actor
    const violations = MissingPrereqsTracker.getMissingPrereqs(actor);
    const errorCount = violations.filter(v => v.severity === 'error').length;

    return errorCount >= 3;
  }

  /**
   * Estimate repair complexity
   * @private
   */
  static _estimateComplexity(proposals) {
    if (proposals.length === 0) {
      return 'none';
    }

    // Find max execution cost
    const maxCost = Math.max(...proposals.map(p => p.executionCost || 1));

    if (maxCost <= 1) {
      return 'simple';
    } else if (maxCost <= 5) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  /**
   * Empty analysis (for errors)
   * @private
   */
  static _emptyAnalysis(error = null) {
    return {
      actor: { id: null, name: 'Unknown', type: null },
      violations: [],
      proposals: [],
      summary: {
        totalViolations: 0,
        repairableCount: 0,
        repairComplexity: 'none'
      },
      error: error?.message || null,
      timestamp: Date.now()
    };
  }

  /**
   * Export analysis as JSON
   * @static
   */
  static exportAnalysis(analysis) {
    return {
      timestamp: new Date(analysis.timestamp).toISOString(),
      actor: analysis.actor,
      violations: {
        total: analysis.summary.totalViolations,
        list: analysis.violations.map(v => ({
          itemName: v.itemName,
          severity: v.severity,
          missing: v.missingPrereqs
        }))
      },
      proposals: {
        count: analysis.proposals.length,
        byType: this._groupProposalsByType(analysis.proposals),
        byPriority: this._groupProposalsByPriority(analysis.proposals)
      },
      complexity: analysis.summary.repairComplexity
    };
  }

  /**
   * Group proposals by type
   * @private
   */
  static _groupProposalsByType(proposals) {
    const groups = {};
    for (const proposal of proposals) {
      groups[proposal.type] = (groups[proposal.type] || 0) + 1;
    }
    return groups;
  }

  /**
   * Group proposals by priority
   * @private
   */
  static _groupProposalsByPriority(proposals) {
    const groups = {};
    for (const proposal of proposals) {
      groups[proposal.priority] = (groups[proposal.priority] || 0) + 1;
    }
    return groups;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.ActorRepairEngine = ActorRepairEngine;
}
