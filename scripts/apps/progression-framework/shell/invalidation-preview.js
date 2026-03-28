/**
 * InvalidationPreview - Pre-Commit Change Impact Analysis
 *
 * Part of PHASE 2: Pre-commit change preview
 *
 * Computes and displays the downstream impact of a selection BEFORE the player commits.
 * Shows what steps/items will be affected, why, and what the consequences are.
 *
 * Key principle: Preview is immutable and ephemeral. It's computed on-demand and
 * discarded if the player cancels. Only confirmed selections trigger actual invalidation.
 *
 * Architecture:
 * - Triggered by action-footer before "Choose" button commits
 * - Queries registry for affected downstream nodes
 * - Computes impact reasons (prerequisites, entitlements, etc.)
 * - Returns structured preview data for dialog rendering
 * - Never mutates session state (read-only analysis)
 */

import { swseLogger } from '../../../utils/logger.js';
import { PROGRESSION_NODE_REGISTRY } from '../registries/progression-node-registry.js';
import { ActiveStepComputer } from './active-step-computer.js';

export class InvalidationPreview {
  /**
   * Compute preview of changes that will result from a new selection.
   * Called BEFORE commitSelection to show impact dialog.
   *
   * @param {ProgressionSession} session - Current session state
   * @param {string} stepId - Step being changed
   * @param {Object} newSelection - New selection being considered
   * @returns {Promise<Object>} Preview data structure
   *   {
   *     sourceStepId: string
   *     sourceSelection: Object
   *     affectedSteps: Array<{
   *       stepId: string
   *       invalidationBehavior: string (RECOMPUTE | DIRTY | PURGE)
   *       isVisited: boolean
   *       affectedItemCount: number
   *       reasons: string[]
   *     }>
   *     summary: string
   *     affectedCount: number (total affected steps)
   *     itemsAtRisk: number (total items that may become invalid)
   *   }
   */
  static async computePreview(session, stepId, newSelection) {
    if (!session || !stepId || !newSelection) {
      swseLogger.warn('[InvalidationPreview] Missing required parameters');
      return this._emptyPreview();
    }

    try {
      // Get the registry entry for this step
      const nodeEntry = PROGRESSION_NODE_REGISTRY[stepId];
      if (!nodeEntry) {
        swseLogger.warn(`[InvalidationPreview] No registry entry for step: ${stepId}`);
        return this._emptyPreview();
      }

      // Get invalidated nodes from registry
      const invalidatedNodeIds = nodeEntry.invalidates || [];
      if (invalidatedNodeIds.length === 0) {
        swseLogger.debug(`[InvalidationPreview] No downstream invalidations for ${stepId}`);
        return this._emptyPreview();
      }

      // Analyze each affected step
      const affectedSteps = [];
      let totalItemsAtRisk = 0;

      for (const downstreamNodeId of invalidatedNodeIds) {
        const impact = await this._analyzeStepImpact(
          session,
          stepId,
          newSelection,
          downstreamNodeId,
          nodeEntry
        );

        if (impact) {
          affectedSteps.push(impact);
          totalItemsAtRisk += impact.affectedItemCount;
        }
      }

      // Generate summary
      const summary = this._generateSummary(affectedSteps, totalItemsAtRisk);

      return {
        sourceStepId: stepId,
        sourceSelection: newSelection,
        affectedSteps,
        summary,
        affectedCount: affectedSteps.length,
        itemsAtRisk: totalItemsAtRisk,
        timestamp: Date.now(),
      };
    } catch (err) {
      swseLogger.error('[InvalidationPreview] Error computing preview:', err);
      return this._emptyPreview();
    }
  }

  /**
   * Analyze impact on a specific downstream step.
   * @private
   */
  static async _analyzeStepImpact(session, sourceStepId, newSelection, downstreamNodeId, sourceNodeEntry) {
    try {
      const behavior = sourceNodeEntry.invalidationBehavior?.[downstreamNodeId];
      if (!behavior) {
        return null; // No specific behavior defined, skip
      }

      // Get current selections for downstream step
      const currentSelection = session.draftSelections[downstreamNodeId] || null;
      const isVisited = session.visitedStepIds.includes(downstreamNodeId);

      // Compute reasons why this step is affected
      const reasons = await this._computeReasons(
        session,
        sourceStepId,
        newSelection,
        downstreamNodeId,
        behavior
      );

      // Estimate affected items (depends on step type and behavior)
      const affectedItemCount = await this._estimateAffectedItems(
        session,
        downstreamNodeId,
        currentSelection,
        behavior
      );

      return {
        stepId: downstreamNodeId,
        invalidationBehavior: behavior,
        isVisited,
        affectedItemCount,
        reasons,
      };
    } catch (err) {
      swseLogger.warn(`[InvalidationPreview] Error analyzing impact on ${downstreamNodeId}:`, err);
      return null;
    }
  }

  /**
   * Compute human-readable reasons why a step is affected.
   * @private
   */
  static async _computeReasons(session, sourceStepId, newSelection, downstreamNodeId, behavior) {
    const reasons = [];

    // Behavior-specific messages
    if (behavior === 'PURGE') {
      reasons.push('Current selection will be removed');
    } else if (behavior === 'DIRTY') {
      reasons.push('Step marked for review due to upstream change');
    } else if (behavior === 'RECOMPUTE') {
      reasons.push('Available items will be recalculated');
    }

    // Check for prerequisite failures
    const downstreamEntry = PROGRESSION_NODE_REGISTRY[downstreamNodeId];
    if (downstreamEntry?.prerequisites) {
      // This is a simplified check — more sophisticated prerequisite evaluation
      // could be added here for specific step types
      reasons.push('Prerequisites may be affected');
    }

    // Check for entitlement changes
    if (newSelection.grants && sourceStepId === 'species') {
      // Species grants affect downstream entitlements (skills, languages, etc.)
      reasons.push('Granted items may be affected');
    }

    return reasons.length > 0 ? reasons : ['Upstream change requires review'];
  }

  /**
   * Estimate how many items in a downstream step are affected.
   * This is a best-effort estimate; actual count depends on step type.
   * @private
   */
  static async _estimateAffectedItems(session, downstreamNodeId, currentSelection, behavior) {
    try {
      // If step has no current selection, nothing is at risk
      if (!currentSelection) {
        return 0;
      }

      // PURGE behavior: entire selection is removed
      if (behavior === 'PURGE') {
        return Array.isArray(currentSelection) ? currentSelection.length : 1;
      }

      // DIRTY behavior: current selection may be stale, but not necessarily removed
      // Estimate = number of items that might be affected
      if (Array.isArray(currentSelection)) {
        return currentSelection.length; // Conservative: all items affected
      } else if (currentSelection?.id) {
        return 1; // Single selection affected
      }

      return 0;
    } catch (err) {
      swseLogger.warn('[InvalidationPreview] Error estimating affected items:', err);
      return 0;
    }
  }

  /**
   * Generate human-readable summary of preview.
   * @private
   */
  static _generateSummary(affectedSteps, totalItemsAtRisk) {
    if (affectedSteps.length === 0) {
      return 'No other steps are affected by this change.';
    }

    const visitedCount = affectedSteps.filter(s => s.isVisited).length;
    const unvisitedCount = affectedSteps.filter(s => !s.isVisited).length;

    const parts = [];

    if (visitedCount > 0) {
      parts.push(`${visitedCount} visited step${visitedCount === 1 ? '' : 's'} affected`);
    }
    if (unvisitedCount > 0) {
      parts.push(`${unvisitedCount} unvisited step${unvisitedCount === 1 ? '' : 's'} affected`);
    }

    if (totalItemsAtRisk > 0) {
      parts.push(`${totalItemsAtRisk} item${totalItemsAtRisk === 1 ? '' : 's'} at risk`);
    }

    return parts.join(', ') + '.';
  }

  /**
   * Return empty preview (no affected steps).
   * @private
   */
  static _emptyPreview() {
    return {
      sourceStepId: null,
      sourceSelection: null,
      affectedSteps: [],
      summary: 'No other steps are affected.',
      affectedCount: 0,
      itemsAtRisk: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Format preview for display in dialog.
   * Used by action-footer to render the preview dialog.
   *
   * @param {Object} preview - Preview object from computePreview
   * @returns {string} HTML content for dialog
   */
  static formatPreviewForDialog(preview) {
    if (!preview || preview.affectedCount === 0) {
      return `
        <div class="preview-container">
          <p class="preview-summary">This change won't affect any other steps.</p>
        </div>
      `;
    }

    let html = `
      <div class="preview-container">
        <p class="preview-summary">${preview.summary}</p>
        <div class="affected-steps">
    `;

    // Show visited steps with warnings
    const visitedSteps = preview.affectedSteps.filter(s => s.isVisited);
    if (visitedSteps.length > 0) {
      html += '<div class="visited-steps"><strong>Visited Steps (Will be marked for review):</strong><ul>';
      for (const step of visitedSteps) {
        html += `
          <li>
            <strong>${step.stepId}</strong> (${step.affectedItemCount} items)
            ${step.reasons.length > 0 ? '<ul class="reasons">' + step.reasons.map(r => `<li>${r}</li>`).join('') + '</ul>' : ''}
          </li>
        `;
      }
      html += '</ul></div>';
    }

    // Show unvisited steps with info
    const unvisitedSteps = preview.affectedSteps.filter(s => !s.isVisited);
    if (unvisitedSteps.length > 0) {
      html += '<div class="unvisited-steps"><strong>Not Yet Visited:</strong><ul>';
      for (const step of unvisitedSteps) {
        html += `
          <li>
            <strong>${step.stepId}</strong> may need adjustment when you reach it
          </li>
        `;
      }
      html += '</ul></div>';
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }
}
