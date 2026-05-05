/**
 * Template Traversal Policy — Phase 5 Work Package C
 *
 * Implements template-mode node locking and auto-resolution rules.
 * Distinguishes locked (template-provided) vs changeable (player-customizable) nodes.
 *
 * Addresses audit finding: "No reconciliation on override — if player changes a template-provided
 * class, downstream template picks become invalid. Phase 5 solution: Use ProgressionReconciler when
 * selections change"
 *
 * Rules:
 * - Locked nodes: Read-only, cannot be changed
 * - Auto-resolved nodes: Automatically filled, can be overridden with reconciliation
 * - Required-stop nodes: Player must explicitly accept or change
 *
 * Integration points:
 * - ProgressionShell._initializeSteps() → Apply policy filter to active steps
 * - Step plugins → Check if node is locked before accepting user input
 * - ProgressionReconciler → Trigger reconciliation if locked node is overridden
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { PROGRESSION_NODE_REGISTRY } from '/systems/foundryvtt-swse/scripts/engine/progression/registries/progression-node-registry.js';

export class TemplateTraversalPolicy {
  /**
   * Determine node lock status for template mode.
   *
   * @param {ProgressionSession} session - Template session
   * @param {string} nodeId - Node to check
   * @returns {Object} { isLocked, reason, canBeOverridden, suggestedAction }
   */
  static getNodeLockStatus(session, nodeId) {
    if (!session.isTemplateSession) {
      return {
        isLocked: false,
        reason: null,
        canBeOverridden: true,
        suggestedAction: null,
      };
    }

    const isLocked = session.lockedNodes?.has(nodeId) || false;

    if (isLocked) {
      return {
        isLocked: true,
        reason: 'This selection comes from your template and is locked',
        canBeOverridden: true,
        suggestedAction: 'Click to override this template selection (will trigger reconciliation)',
      };
    }

    // Check if node is auto-resolved (template provides a choice, but player can change it)
    const isAutoResolved = session.autoResolvedNodes?.has(nodeId) || false;

    if (isAutoResolved) {
      return {
        isLocked: false,
        reason: 'This was suggested by your template',
        canBeOverridden: true,
        suggestedAction: 'Keep this choice or select something different',
      };
    }

    return {
      isLocked: false,
      reason: null,
      canBeOverridden: true,
      suggestedAction: null,
    };
  }

  /**
   * Filter active steps based on template traversal policy.
   * Locked nodes are skipped unless explicitly re-opened.
   *
   * @param {Array<string>} activeNodeIds - From ActiveStepComputer
   * @param {ProgressionSession} session - Template session
   * @param {Object} options - Policy options
   * @param {boolean} options.skipLocked - Skip locked nodes (default true)
   * @returns {Array<string>} Filtered node IDs
   */
  static filterActiveStepsForTemplate(activeNodeIds, session, options = {}) {
    const { skipLocked = true } = options;

    if (!session.isTemplateSession) {
      return activeNodeIds;
    }

    if (!skipLocked) {
      return activeNodeIds;
    }

    // Skip locked nodes during traversal
    const filtered = activeNodeIds.filter((nodeId) => {
      const isLocked = session.lockedNodes?.has(nodeId) || false;
      if (isLocked) {
        swseLogger.debug('[TemplateTraversalPolicy] Skipping locked node', { nodeId });
        return false;
      }
      return true;
    });

    swseLogger.debug('[TemplateTraversalPolicy] Filtered steps for template', {
      original: activeNodeIds.length,
      filtered: filtered.length,
      skipped: activeNodeIds.length - filtered.length,
    });

    return filtered;
  }

  /**
   * Check if a node change requires reconciliation.
   * Overriding a locked node invalidates downstream selections.
   *
   * @param {ProgressionSession} session - Current session
   * @param {string} nodeId - Node being changed
   * @param {*} newValue - New selection value
   * @returns {Object} { requiresReconciliation, affectedNodes, instructions }
   */
  static checkReconciliationNeeded(session, nodeId, newValue) {
    if (!session.isTemplateSession) {
      return {
        requiresReconciliation: false,
        affectedNodes: [],
        instructions: null,
      };
    }

    const wasLocked = session.lockedNodes?.has(nodeId) || false;

    if (!wasLocked) {
      return {
        requiresReconciliation: false,
        affectedNodes: [],
        instructions: null,
      };
    }

    // Overriding a locked node requires reconciliation
    // Use registry to find downstream nodes
    const nodeSpec = PROGRESSION_NODE_REGISTRY[nodeId];
    const affectedNodes = nodeSpec?.invalidates || [];

    return {
      requiresReconciliation: true,
      affectedNodes,
      instructions: `Changing this template-provided selection will invalidate: ${affectedNodes.join(', ')}.
These choices will be marked for review.`,
    };
  }

  /**
   * Apply reconciliation after override of locked node.
   * Marks affected downstream nodes dirty, purges invalid selections.
   *
   * @param {ProgressionSession} session - Current session
   * @param {string} nodeId - Overridden node
   * @param {ProgressionReconciler} reconciler - Reconciliation engine
   */
  static async applyReconciliationAfterOverride(session, nodeId, reconciler) {
    if (!session.isTemplateSession) {
      return;
    }

    const wasLocked = session.lockedNodes?.has(nodeId) || false;
    if (!wasLocked) {
      return;
    }

    swseLogger.log('[TemplateTraversalPolicy] Applying reconciliation after override', { nodeId });

    // Remove from locked set (no longer locked)
    session.lockedNodes.delete(nodeId);

    // Trigger reconciliation to invalidate downstream
    if (reconciler && reconciler.reconcileAfterCommit) {
      try {
        const report = await reconciler.reconcileAfterCommit(session, nodeId);

        swseLogger.log('[TemplateTraversalPolicy] Reconciliation applied', {
          nodeId,
          affectedCount: report.affected?.length || 0,
        });
      } catch (err) {
        swseLogger.warn('[TemplateTraversalPolicy] Reconciliation error:', err);
      }
    }
  }

  /**
   * Determine navigation direction for template mode.
   * Template mode has slightly different semantics than manual chargen.
   *
   * @param {ProgressionSession} session - Template session
   * @param {string} currentNodeId - Current node
   * @param {'next' | 'back'} direction - Desired direction
   * @returns {Object} { allowed, reason, nextNodeId }
   */
  static evaluateNavigation(session, currentNodeId, direction) {
    if (!session.isTemplateSession) {
      return {
        allowed: true,
        reason: null,
        nextNodeId: null,
      };
    }

    // In template mode:
    // - Forward navigation allowed freely
    // - Backward navigation allowed but warns about losing template context
    if (direction === 'next') {
      return {
        allowed: true,
        reason: null,
        nextNodeId: null,
      };
    }

    if (direction === 'back') {
      // Check if we're at a locked node
      const isLocked = session.lockedNodes?.has(currentNodeId) || false;

      if (isLocked) {
        return {
          allowed: true,
          reason: 'Going back to modify a template selection will trigger reconciliation',
          nextNodeId: null,
          warning: true,
        };
      }

      return {
        allowed: true,
        reason: null,
        nextNodeId: null,
      };
    }

    return {
      allowed: true,
      reason: null,
      nextNodeId: null,
    };
  }

  /**
   * Get UI hints for rendering template mode.
   * Indicates which nodes are locked, which are from template, etc.
   *
   * @param {ProgressionSession} session - Template session
   * @param {string} nodeId - Node to get hints for
   * @returns {Object} { icon, badge, label, tooltip, disabled }
   */
  static getNodeUIHints(session, nodeId) {
    const hints = {
      icon: null,
      badge: null,
      label: null,
      tooltip: null,
      disabled: false,
      classes: [],
    };

    if (!session.isTemplateSession) {
      return hints;
    }

    const isLocked = session.lockedNodes?.has(nodeId) || false;
    const isAutoResolved = session.autoResolvedNodes?.has(nodeId) || false;
    const isDirty = session.dirtyNodes?.has(nodeId) || false;

    if (isLocked) {
      hints.badge = '🔒';
      hints.tooltip = 'Template-provided (locked)';
      hints.classes.push('template-locked');
    } else if (isAutoResolved) {
      hints.badge = '📋';
      hints.tooltip = 'Suggested by template';
      hints.classes.push('template-suggested');
    }

    if (isDirty) {
      hints.badge = '⚠️';
      hints.tooltip = 'Requires review (marked dirty by reconciliation)';
      hints.classes.push('template-dirty');
    }

    return hints;
  }

  /**
   * Determine if player can skip a node in template mode.
   *
   * @param {ProgressionSession} session - Template session
   * @param {string} nodeId - Node to check
   * @returns {boolean} Whether node can be skipped
   */
  static canSkipNode(session, nodeId) {
    if (!session.isTemplateSession) {
      return false;
    }

    // Locked nodes cannot be skipped
    const isLocked = session.lockedNodes?.has(nodeId) || false;
    if (isLocked) {
      return false;
    }

    // Auto-resolved nodes can be skipped
    const isAutoResolved = session.autoResolvedNodes?.has(nodeId) || false;
    return isAutoResolved;
  }

  /**
   * Get required stop nodes for template mode.
   * Nodes where player must make explicit choice.
   *
   * @param {ProgressionSession} session - Template session
   * @returns {Array<string>} Node IDs that require player choice
   */
  static getRequiredStopNodes(session) {
    if (!session.isTemplateSession) {
      return [];
    }

    // Required stops are:
    // - Unlocked nodes with unresolved selections
    // - Dirty nodes requiring re-validation
    const required = [];

    // Check each draft selection
    for (const [key, value] of Object.entries(session.draftSelections)) {
      // Map selection key to node ID
      const nodeId = this._mapSelectionKeyToNodeId(key);
      if (!nodeId) continue;

      // If the node is not locked and the selection is null/unresolved, it's required
      const isLocked = session.lockedNodes?.has(nodeId) || false;
      const isDirty = session.dirtyNodes?.has(nodeId) || false;

      if (!isLocked && (value === null || isDirty)) {
        required.push(nodeId);
      }
    }

    return required;
  }

  /**
   * Map draftSelections key to node ID.
   * @private
   */
  static _mapSelectionKeyToNodeId(selectionKey) {
    const mapping = {
      species: 'species',
      class: 'class',
      background: 'background',
      attributes: 'attribute',
      skills: 'skills',
      feats: 'feats',
      talents: 'talents',
      languages: 'languages',
      forcePowers: 'force-powers',
      forceTechniques: 'force-techniques',
      forceSecrets: 'force-secrets',
      droid: 'droid-builder',
    };

    return mapping[selectionKey] || null;
  }
}
