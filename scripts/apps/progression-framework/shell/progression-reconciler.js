/**
 * Progression Reconciler — Phase 2
 *
 * Handles invalidation and reconciliation when upstream selections change.
 *
 * When a player changes an upstream choice (e.g., class), this module:
 * 1. Identifies downstream nodes affected by the change
 * 2. Marks affected nodes as dirty or purges their selections
 * 3. Rechecks legality of downstream selections via AbilityEngine
 * 4. Recomputes active step list in case conditional nodes appeared/disappeared
 * 5. Moves current step to a safe location if the current node was removed
 *
 * Usage:
 *   const reconciler = new ProgressionReconciler();
 *   await reconciler.reconcileAfterCommit(
 *     changedNodeId,  // e.g., 'class'
 *     actor,
 *     progressionSession,
 *     { activeStepComputer, currentStepId, mode, subtype }
 *   );
 *
 * Returns: { removed, dirty, purged, newActiveSteps, nextStepId, warnings }
 */

import { swseLogger } from '../../../utils/logger.js';
import {
  PROGRESSION_NODE_REGISTRY,
  InvalidationBehavior,
} from '../registries/progression-node-registry.js';
import { AbilityEngine } from '../../../engine/abilities/AbilityEngine.js';

export class ProgressionReconciler {
  /**
   * Reconcile progression state after an upstream node changes.
   *
   * @param {string} changedNodeId - The node that just changed
   * @param {Actor} actor - The actor
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Object} context
   * @param {ActiveStepComputer} context.activeStepComputer - Step computer
   * @param {string} context.currentStepId - Current step before reconciliation
   * @param {'chargen' | 'levelup'} context.mode - Progression mode
   * @param {string} context.subtype - Character subtype
   * @returns {Promise<Object>} Reconciliation report
   */
  async reconcileAfterCommit(
    changedNodeId,
    actor,
    progressionSession,
    context
  ) {
    const startTime = performance.now();
    const report = {
      changedNodeId,
      removed: [],
      dirty: [],
      purged: [],
      newActiveSteps: [],
      nextStepId: context.currentStepId,
      warnings: [],
      actionsTaken: [],
    };

    try {
      // Step 1: Identify downstream nodes affected by this change
      const affectedNodes = this._getAffectedNodes(changedNodeId);

      if (affectedNodes.length === 0) {
        swseLogger.debug('[ProgressionReconciler] No downstream nodes affected');
        return report;
      }

      swseLogger.log('[ProgressionReconciler] Reconciling after change to:', {
        changedNodeId,
        affectedCount: affectedNodes.length,
        affected: affectedNodes.map(n => n.nodeId),
      });

      // Step 2: Process each affected node
      for (const affected of affectedNodes) {
        const behavior = affected.behavior;

        switch (behavior) {
          case InvalidationBehavior.PURGE:
            await this._purgeNode(affected.nodeId, progressionSession);
            report.purged.push(affected.nodeId);
            report.actionsTaken.push(`Purged ${affected.nodeId}`);
            break;

          case InvalidationBehavior.DIRTY:
            this._markNodeDirty(affected.nodeId, progressionSession);
            report.dirty.push(affected.nodeId);
            report.actionsTaken.push(`Marked ${affected.nodeId} as dirty`);
            break;

          case InvalidationBehavior.RECOMPUTE:
            // Will be handled by recomputing active steps
            report.actionsTaken.push(`Marked ${affected.nodeId} for recompute`);
            break;

          case InvalidationBehavior.WARN:
            report.warnings.push(`Warning: ${affected.nodeId} may have stale selections`);
            report.actionsTaken.push(`Added warning for ${affected.nodeId}`);
            break;
        }
      }

      // Step 3: Recompute active step list
      const newActiveSteps = await context.activeStepComputer.computeActiveSteps(
        actor,
        context.mode,
        progressionSession,
        { subtype: context.subtype }
      );

      report.newActiveSteps = newActiveSteps;

      // Step 4: Check if current step was removed
      if (!newActiveSteps.includes(context.currentStepId)) {
        report.removed.push(context.currentStepId);

        // Find nearest safe step
        const currentIndex = newActiveSteps.length > 0
          ? Math.max(0, newActiveSteps.length - 1)
          : 0;

        report.nextStepId = newActiveSteps[currentIndex] || null;

        if (report.nextStepId !== context.currentStepId) {
          report.actionsTaken.push(
            `Moved from ${context.currentStepId} to ${report.nextStepId}`
          );
        }
      }

      // Step 5: Rechecklegality of affected selections (via AbilityEngine)
      await this._recheckAffectedSelections(
        affectedNodes.map(n => n.nodeId),
        actor,
        progressionSession,
        report
      );

      // Record timing
      report.reconciliationTime = Math.round(performance.now() - startTime);

      swseLogger.log('[ProgressionReconciler] Reconciliation complete:', report);

      return report;
    } catch (err) {
      swseLogger.error('[ProgressionReconciler] Critical error during reconciliation:', err);
      report.warnings.push(`Reconciliation error: ${err.message}`);
      return report;
    }
  }

  /**
   * Get all nodes affected by a change, with their invalidation behaviors.
   *
   * @param {string} changedNodeId
   * @returns {Array<{nodeId: string, behavior: string}>}
   * @private
   */
  _getAffectedNodes(changedNodeId) {
    const node = PROGRESSION_NODE_REGISTRY[changedNodeId];
    if (!node || !node.invalidates) return [];

    return node.invalidates.map(downstreamId => ({
      nodeId: downstreamId,
      behavior: node.invalidationBehavior?.[downstreamId] || InvalidationBehavior.DIRTY,
    }));
  }

  /**
   * Remove selections from a node (purge behavior).
   * Deletes the normalized selection from progressionSession.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @private
   */
  async _purgeNode(nodeId, progressionSession) {
    const node = PROGRESSION_NODE_REGISTRY[nodeId];
    if (!node || !node.selectionKey) return;

    if (progressionSession?.draftSelections) {
      delete progressionSession.draftSelections[node.selectionKey];
      swseLogger.debug(`[ProgressionReconciler] Purged node: ${nodeId}`);
    }
  }

  /**
   * Mark a node as dirty (requiring re-validation).
   * In Phase 2, we just record this in session state.
   * UI will be enhanced in Phase 3 to show dirty nodes prominently.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @private
   */
  _markNodeDirty(nodeId, progressionSession) {
    if (!progressionSession.dirtyNodes) {
      progressionSession.dirtyNodes = new Set();
    }
    progressionSession.dirtyNodes.add(nodeId);
    swseLogger.debug(`[ProgressionReconciler] Marked dirty: ${nodeId}`);
  }

  /**
   * Rechecklegality of selections in affected nodes.
   * Uses AbilityEngine to validate that selected items are still legal.
   * PHASE 3: Recheck via AbilityEngine; warn or purge if now illegal.
   *
   * @param {Array<string>} affectedNodeIds
   * @param {Actor} actor
   * @param {Object} progressionSession
   * @param {Object} report - Reconciliation report to update with warnings
   * @private
   */
  async _recheckAffectedSelections(
    affectedNodeIds,
    actor,
    progressionSession,
    report
  ) {
    const draftSelections = progressionSession?.draftSelections;
    if (!draftSelections) return;

    for (const nodeId of affectedNodeIds) {
      const node = PROGRESSION_NODE_REGISTRY[nodeId];
      if (!node || !node.selectionKey) continue;

      const selection = draftSelections[node.selectionKey];
      if (!selection) continue;

      // PHASE 3: Evaluate legality of the selection via AbilityEngine
      try {
        // Handle array selections (feats, talents, etc.)
        const isArray = Array.isArray(selection);
        const itemsToCheck = isArray ? selection : [selection];

        for (const item of itemsToCheck) {
          if (!item) continue;

          // Use AbilityEngine to check if item is still legal
          const assessment = AbilityEngine.evaluateAcquisition(actor, item, {});

          if (!assessment.legal) {
            report.warnings.push(
              `Selection in ${node.selectionKey} may no longer be legal after this change: ` +
              `${item.name || item.id} (missing: ${assessment.missingPrereqs.join(', ')})`
            );

            swseLogger.warn(
              `[ProgressionReconciler] Selection legality changed for ${node.selectionKey}:`,
              {
                item: item.name || item.id,
                missingPrereqs: assessment.missingPrereqs
              }
            );
          }
        }
      } catch (err) {
        swseLogger.debug(
          `[ProgressionReconciler] Error rechecking ${node.selectionKey} legality:`,
          err
        );
      }
    }
  }

  /**
   * Helper: Check if a dirty node has been "cleared" (player revisited and confirmed).
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @returns {boolean}
   */
  isNodeClearOfDirtyFlag(nodeId, progressionSession) {
    return !progressionSession?.dirtyNodes?.has(nodeId);
  }

  /**
   * Helper: Clear the dirty flag for a node.
   * Called when player visits and re-validates a dirty node.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   */
  clearDirtyFlag(nodeId, progressionSession) {
    if (progressionSession?.dirtyNodes) {
      progressionSession.dirtyNodes.delete(nodeId);
    }
  }
}
