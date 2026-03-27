/**
 * Template Override Handler — Phase 5 Work Package G
 *
 * Implements player override workflow for template-provided selections.
 * Detects when player changes a locked node and triggers reconciliation.
 *
 * Flow:
 *   Player clicks locked node → OverrideHandler.detectOverride()
 *     ↓
 *   TemplateTraversalPolicy.checkReconciliationNeeded()
 *     ↓
 *   Build override confirmation with consequences
 *     ↓
 *   Player confirms or cancels
 *     ↓
 *   Apply new selection and reconciliation
 *     ↓
 *   Track override event for audit trail
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { TemplateTraversalPolicy } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-traversal-policy.js';

export class TemplateOverrideHandler {
  /**
   * Detect if a selection change is an override of a locked template node.
   *
   * @param {ProgressionSession} session - Current template session
   * @param {string} nodeId - Node being changed
   * @param {*} newValue - New selection value
   * @returns {Object} { isOverride, wasLocked, affectedNodes, reconciliationContext }
   */
  static detectOverride(session, nodeId, newValue) {
    const result = {
      isOverride: false,
      wasLocked: false,
      affectedNodes: [],
      reconciliationContext: null,
    };

    if (!session.isTemplateSession) {
      return result;
    }

    // Check if this node was locked
    const wasLocked = session.lockedNodes?.has(nodeId) || false;
    if (!wasLocked) {
      return result;
    }

    // This is an override of a locked node
    result.isOverride = true;
    result.wasLocked = true;

    // Check what reconciliation is needed
    const reconciliation = TemplateTraversalPolicy.checkReconciliationNeeded(
      session,
      nodeId,
      newValue
    );

    result.affectedNodes = reconciliation.affectedNodes;
    result.reconciliationContext = reconciliation;

    swseLogger.log('[TemplateOverrideHandler] Override detected', {
      nodeId,
      affectedCount: result.affectedNodes.length,
      requiresReconciliation: reconciliation.requiresReconciliation,
    });

    return result;
  }

  /**
   * Build override confirmation context for UI.
   * Shows consequences of changing a locked node.
   *
   * @param {ProgressionSession} session - Current template session
   * @param {string} nodeId - Node being overridden
   * @param {Object} overrideContext - From detectOverride()
   * @returns {Object} Confirmation dialog context
   */
  static buildOverrideConfirmation(session, nodeId, overrideContext) {
    const currentSelection = session.draftSelections[
      this._mapNodeIdToSelectionKey(nodeId)
    ];

    return {
      title: 'Change Template Selection?',
      message: `You're about to override a selection from the ${session.templateName || 'template'}`,
      currentValue: this._formatSelectionForDisplay(currentSelection),
      details: {
        node: nodeId,
        templateId: session.templateId,
        templateName: session.templateName,
        wasLocked: true,
        affectedNodes: overrideContext.affectedNodes,
        affectedCount: overrideContext.affectedNodes.length,
      },
      consequences: this._buildConsequences(overrideContext),
      options: [
        {
          action: 'confirm',
          label: 'Yes, change it',
          style: 'warning',
          callback: 'onOverrideConfirmed',
        },
        {
          action: 'cancel',
          label: 'Keep template selection',
          style: 'secondary',
          callback: 'onOverrideCancelled',
        },
      ],
    };
  }

  /**
   * Apply override and reconciliation.
   * Called after player confirms the override.
   *
   * @param {ProgressionSession} session - Current template session
   * @param {string} nodeId - Overridden node
   * @param {*} newValue - New selection value
   * @param {ProgressionReconciler} reconciler - Reconciliation engine
   * @returns {Promise<Object>} Result of override + reconciliation
   */
  static async applyOverride(session, nodeId, newValue, reconciler) {
    const result = {
      success: false,
      nodeId,
      newValue,
      reconciliationApplied: false,
      affectedNodes: [],
      errors: [],
    };

    try {
      swseLogger.log('[TemplateOverrideHandler] Applying override', {
        nodeId,
        newValue,
      });

      // Step 1: Remove node from locked set
      session.lockedNodes?.delete(nodeId);

      // Step 2: Update the selection
      const selectionKey = this._mapNodeIdToSelectionKey(nodeId);
      if (selectionKey) {
        session.draftSelections[selectionKey] = newValue;
      }

      // Step 3: Apply reconciliation
      if (reconciler && reconciler.reconcileAfterCommit) {
        try {
          const reconciliationReport = await reconciler.reconcileAfterCommit(
            session,
            nodeId
          );

          result.reconciliationApplied = true;
          result.affectedNodes = reconciliationReport.affected || [];

          swseLogger.log('[TemplateOverrideHandler] Reconciliation applied', {
            nodeId,
            affectedCount: result.affectedNodes.length,
          });
        } catch (err) {
          swseLogger.warn('[TemplateOverrideHandler] Reconciliation error:', err);
          result.errors.push(`Reconciliation failed: ${err.message}`);
        }
      }

      // Step 4: Record audit event
      this._recordOverrideEvent(session, nodeId, newValue, result.affectedNodes);

      result.success = true;
    } catch (err) {
      swseLogger.error('[TemplateOverrideHandler] Error applying override:', err);
      result.errors.push(err.message);
    }

    return result;
  }

  /**
   * Build consequence descriptions for confirmation dialog.
   * @private
   */
  static _buildConsequences(overrideContext) {
    const consequences = [];

    if (!overrideContext.reconciliationNeeded) {
      consequences.push('No downstream impact');
      return consequences;
    }

    if (overrideContext.affectedNodes.length === 0) {
      consequences.push('No selections will be directly affected');
    } else {
      consequences.push(
        `${overrideContext.affectedNodes.length} downstream selection(s) will be reviewed:`
      );
      consequences.push(`  ${overrideContext.affectedNodes.join(', ')}`);
    }

    if (overrideContext.instructions) {
      consequences.push(`Note: ${overrideContext.instructions}`);
    }

    return consequences;
  }

  /**
   * Map node ID to draftSelections key.
   * @private
   */
  static _mapNodeIdToSelectionKey(nodeId) {
    const mapping = {
      species: 'species',
      class: 'class',
      background: 'background',
      attribute: 'attributes',
      skills: 'skills',
      feats: 'feats',
      talents: 'talents',
      languages: 'languages',
      'force-powers': 'forcePowers',
      'force-techniques': 'forceTechniques',
      'force-secrets': 'forceSecrets',
      'droid-builder': 'droid',
    };

    return mapping[nodeId] || null;
  }

  /**
   * Format selection value for display.
   * @private
   */
  static _formatSelectionForDisplay(value) {
    if (!value) return 'Not selected';
    if (typeof value === 'string') return value;
    if (value.name) return value.name;
    if (value.id) return value.id;
    if (Array.isArray(value)) return `${value.length} items`;
    return JSON.stringify(value);
  }

  /**
   * Record override event in audit trail.
   * @private
   */
  static _recordOverrideEvent(session, nodeId, newValue, affectedNodes) {
    if (!session.auditTrail) {
      session.auditTrail = [];
    }

    const event = {
      type: 'override',
      nodeId,
      timestamp: Date.now(),
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue,
      affectedNodes,
      reconciliationApplied: affectedNodes.length > 0,
    };

    session.auditTrail.push(event);

    swseLogger.debug('[TemplateOverrideHandler] Audit event recorded', {
      type: event.type,
      nodeId: event.nodeId,
      affectedCount: event.affectedNodes.length,
    });
  }

  /**
   * Get audit trail for a session.
   * @param {ProgressionSession} session - Template session
   * @returns {Array<Object>} Audit events
   */
  static getAuditTrail(session) {
    return session.auditTrail || [];
  }

  /**
   * Build audit summary for display.
   * @param {ProgressionSession} session - Template session
   * @returns {Object} Audit summary with counts and timeline
   */
  static buildAuditSummary(session) {
    const trail = this.getAuditTrail(session);

    const summary = {
      totalEvents: trail.length,
      overrideCount: trail.filter((e) => e.type === 'override').length,
      totalAffectedNodes: new Set(trail.flatMap((e) => e.affectedNodes)).size,
      timeline: trail.map((e) => ({
        time: new Date(e.timestamp).toLocaleTimeString(),
        action: e.type === 'override' ? `Changed ${e.nodeId}` : `Unknown`,
        affected: e.affectedNodes.length,
      })),
    };

    return summary;
  }

  /**
   * Check if a selection has been overridden from template.
   * @param {ProgressionSession} session - Template session
   * @param {string} nodeId - Node to check
   * @returns {boolean} Whether this node was overridden
   */
  static wasOverridden(session, nodeId) {
    const trail = this.getAuditTrail(session);
    return trail.some((e) => e.type === 'override' && e.nodeId === nodeId);
  }

  /**
   * Get all overridden nodes.
   * @param {ProgressionSession} session - Template session
   * @returns {Array<string>} Node IDs that were overridden
   */
  static getOverriddenNodes(session) {
    const trail = this.getAuditTrail(session);
    const overrides = trail.filter((e) => e.type === 'override');
    return [...new Set(overrides.map((e) => e.nodeId))];
  }

  /**
   * Reset override state for a node.
   * Restores template value and removes from override tracking.
   * @param {ProgressionSession} session - Template session
   * @param {string} nodeId - Node to reset
   * @param {*} templateValue - Original template value to restore
   */
  static resetOverride(session, nodeId, templateValue) {
    // Restore to template value
    const selectionKey = this._mapNodeIdToSelectionKey(nodeId);
    if (selectionKey) {
      session.draftSelections[selectionKey] = templateValue;
    }

    // Mark as locked again (if it was originally)
    if (!session.lockedNodes) {
      session.lockedNodes = new Set();
    }
    session.lockedNodes.add(nodeId);

    // Record reset event
    if (!session.auditTrail) {
      session.auditTrail = [];
    }

    session.auditTrail.push({
      type: 'reset',
      nodeId,
      timestamp: Date.now(),
      value: templateValue,
    });

    swseLogger.log('[TemplateOverrideHandler] Override reset', { nodeId });
  }
}
