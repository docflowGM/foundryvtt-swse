/**
 * Template Packaged Flow — Phase 5 Work Package H
 *
 * Builds a fast-completion flow for template mode.
 * Templates are meant to accelerate chargen, not replace it with micro-steps.
 *
 * Flow Design:
 *   Template select → Required decision points → Summary → Apply
 *
 * Not:
 *   Template select → ALL steps → Summary → Apply (that's regular chargen)
 *
 * Implementation:
 *   - Skip fully locked nodes (template says "this is locked")
 *   - Show required-stop nodes only (player must decide)
 *   - Auto-resolve optional nodes if possible
 *   - Compress to minimum viable completion path
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { TemplateTraversalPolicy } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-traversal-policy.js';

export class TemplatePackagedFlow {
  /**
   * Compute minimum viable path through chargen for template mode.
   *
   * @param {ProgressionSession} session - Template session
   * @param {Array<string>} allActiveNodeIds - All active nodes from spine
   * @param {Object} options - Flow options
   * @param {boolean} options.includeIntro - Include intro step (default: false for templates)
   * @param {boolean} options.includeSummary - Include summary (default: true)
   * @returns {Array<string>} Filtered node IDs for fast path
   */
  static computeMinimumPath(session, allActiveNodeIds, options = {}) {
    const { includeIntro = false, includeSummary = true } = options;

    if (!session.isTemplateSession) {
      return allActiveNodeIds;
    }

    try {
      swseLogger.debug('[TemplatePackagedFlow] Computing minimum path', {
        totalNodes: allActiveNodeIds.length,
        templateId: session.templateId,
      });

      const path = [];

      // Optional: Intro step (skipped in fast mode)
      if (includeIntro && allActiveNodeIds.includes('intro')) {
        path.push('intro');
      }

      // Required: All non-locked nodes where selection is null
      const requiredStops = TemplateTraversalPolicy.getRequiredStopNodes(session);
      for (const nodeId of allActiveNodeIds) {
        if (requiredStops.includes(nodeId)) {
          path.push(nodeId);
        }
      }

      // Optional: Summary (always included for review)
      if (includeSummary && allActiveNodeIds.includes('summary')) {
        path.push('summary');
      }

      // Final validation: At least summary must be included
      if (!path.includes('summary')) {
        path.push('summary');
      }

      const removed = allActiveNodeIds.length - path.length;
      swseLogger.log('[TemplatePackagedFlow] Minimum path computed', {
        originalCount: allActiveNodeIds.length,
        packedCount: path.length,
        removed,
        path,
      });

      return path;
    } catch (err) {
      swseLogger.warn('[TemplatePackagedFlow] Error computing minimum path:', err);
      return allActiveNodeIds; // Fallback to all nodes
    }
  }

  /**
   * Classify nodes by traversal requirement.
   *
   * @param {ProgressionSession} session - Template session
   * @param {Array<string>} allActiveNodeIds - All active nodes
   * @returns {Object} Classification: { locked, required, optional, skipped }
   */
  static classifyNodesForFlow(session, allActiveNodeIds) {
    const classification = {
      locked: [],
      required: [],
      optional: [],
      skipped: [],
    };

    if (!session.isTemplateSession) {
      return classification;
    }

    const requiredStops = TemplateTraversalPolicy.getRequiredStopNodes(session);

    for (const nodeId of allActiveNodeIds) {
      const isLocked = session.lockedNodes?.has(nodeId) || false;
      const isRequired = requiredStops.includes(nodeId);
      const isDirty = session.dirtyNodes?.has(nodeId) || false;

      if (isLocked && !isRequired && !isDirty) {
        classification.locked.push(nodeId);
      } else if (isRequired || isDirty) {
        classification.required.push(nodeId);
      } else if (isLocked) {
        classification.skipped.push(nodeId); // Locked but satisfied
      } else {
        classification.optional.push(nodeId);
      }
    }

    swseLogger.debug('[TemplatePackagedFlow] Nodes classified', {
      locked: classification.locked.length,
      required: classification.required.length,
      optional: classification.optional.length,
      skipped: classification.skipped.length,
    });

    return classification;
  }

  /**
   * Build step labels for template mode.
   * Shows progress and context for fast flow.
   *
   * @param {ProgressionSession} session - Template session
   * @param {Object} classification - From classifyNodesForFlow
   * @returns {Object} Step labels and counts
   */
  static buildFlowLabels(session, classification) {
    const labels = {
      title: `Complete ${session.templateName || 'Template'}`,
      subtitle: this._buildSubtitle(session, classification),
      steps: {
        intro: this._buildStepLabel('intro', classification),
        locked: this._buildStepLabel('locked', classification),
        required: this._buildStepLabel('required', classification),
        optional: this._buildStepLabel('optional', classification),
        summary: this._buildStepLabel('summary', classification),
      },
      progressMessage: this._buildProgressMessage(classification),
    };

    return labels;
  }

  /**
   * Build subtitle for flow (template info).
   * @private
   */
  static _buildSubtitle(session, classification) {
    const parts = [];

    if (session.templateName) {
      parts.push(`Following the ${session.templateName} template`);
    }

    const requiredCount = classification.required.length;
    if (requiredCount > 0) {
      parts.push(`${requiredCount} decision${requiredCount === 1 ? '' : 's'} to make`);
    } else {
      parts.push('No decisions needed; all choices provided');
    }

    return parts.join(' · ');
  }

  /**
   * Build label for step group.
   * @private
   */
  static _buildStepLabel(type, classification) {
    const counts = {
      intro: 1,
      locked: classification.locked.length,
      required: classification.required.length,
      optional: classification.optional.length,
      summary: 1,
    };

    const labels = {
      intro: 'Start',
      locked: `Template ${classification.locked.length === 1 ? 'choice' : 'choices'}`,
      required: `Your choice${classification.required.length === 1 ? '' : 's'}`,
      optional: `Bonus options`,
      summary: 'Review',
    };

    return {
      label: labels[type],
      count: counts[type],
      show: counts[type] > 0,
    };
  }

  /**
   * Build progress message.
   * @private
   */
  static _buildProgressMessage(classification) {
    const total = Object.values(classification).reduce((sum, arr) => sum + arr.length, 0);
    const required = classification.required.length;
    const locked = classification.locked.length;

    if (required === 0) {
      return `All ${locked} template choices are locked in. Ready to review.`;
    }

    return `${locked} template choice${locked === 1 ? '' : 's'} selected. Make ${required} more choice${required === 1 ? '' : 's'} to complete.`;
  }

  /**
   * Determine if template mode should skip to summary.
   * Skip if all nodes are locked/satisfied (nothing for player to decide).
   *
   * @param {ProgressionSession} session - Template session
   * @returns {boolean} Whether to skip directly to summary
   */
  static shouldSkipToSummary(session) {
    if (!session.isTemplateSession) {
      return false;
    }

    // Get all required stops
    const required = TemplateTraversalPolicy.getRequiredStopNodes(session);

    // If no required stops, skip to summary
    return required.length === 0;
  }

  /**
   * Determine minimum completion criteria.
   * What must be true before player can apply template?
   *
   * @param {ProgressionSession} session - Template session
   * @returns {Object} { canComplete, issues, warnings }
   */
  static checkCompletionReadiness(session) {
    const result = {
      canComplete: true,
      issues: [],
      warnings: [],
    };

    if (!session.isTemplateSession) {
      return result;
    }

    // Check 1: No unresolved required nodes
    const required = TemplateTraversalPolicy.getRequiredStopNodes(session);
    if (required.length > 0) {
      result.issues.push(
        `${required.length} required decision${required.length === 1 ? '' : 's'} not made: ${required.join(', ')}`
      );
      result.canComplete = false;
    }

    // Check 2: No dirty nodes with conflicts
    if (session.dirtyNodes?.size > 0) {
      result.warnings.push(
        `${session.dirtyNodes.size} node${session.dirtyNodes.size === 1 ? '' : 's'} need review: ${Array.from(session.dirtyNodes).join(', ')}`
      );
    }

    // Check 3: Validation passed (if available)
    if (session.validationReport?.invalid?.length > 0) {
      result.issues.push(
        `Validation failed on ${session.validationReport.invalid.length} item${session.validationReport.invalid.length === 1 ? '' : 's'}`
      );
      result.canComplete = false;
    }

    return result;
  }

  /**
   * Build completion summary for review.
   * Shows all template selections + player overrides.
   *
   * @param {ProgressionSession} session - Template session
   * @returns {Object} Summary with template vs player selections
   */
  static buildCompletionSummary(session) {
    const summary = {
      templateName: session.templateName,
      templateId: session.templateId,
      sections: {
        templateLocked: [],
        playerChoices: [],
        overridden: [],
        unresolved: [],
      },
    };

    // Categorize each selection
    for (const [key, value] of Object.entries(session.draftSelections || {})) {
      if (value === null || (Array.isArray(value) && value.length === 0)) {
        summary.sections.unresolved.push(key);
        continue;
      }

      const nodeId = this._mapKeyToNodeId(key);
      const isLocked = session.lockedNodes?.has(nodeId);
      const wasOverridden = session.auditTrail?.some(
        (e) => e.type === 'override' && e.nodeId === nodeId
      );

      if (wasOverridden) {
        summary.sections.overridden.push({
          key,
          value: this._formatValue(value),
          nodeId,
          original: '(template value)',
        });
      } else if (isLocked) {
        summary.sections.templateLocked.push({
          key,
          value: this._formatValue(value),
          nodeId,
        });
      } else {
        summary.sections.playerChoices.push({
          key,
          value: this._formatValue(value),
          nodeId,
        });
      }
    }

    return summary;
  }

  /**
   * Map selection key to node ID.
   * @private
   */
  static _mapKeyToNodeId(key) {
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

    return mapping[key] || key;
  }

  /**
   * Format value for display.
   * @private
   */
  static _formatValue(value) {
    if (!value) return 'Not selected';
    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === 'object') return value.name || value.id || JSON.stringify(value);
    return String(value);
  }

  /**
   * Build navigation hint for template flow.
   * Tells user what comes next.
   *
   * @param {ProgressionSession} session - Template session
   * @param {string} currentNodeId - Current node
   * @param {Array<string>} remainingPath - Remaining nodes in flow
   * @returns {Object} Navigation hint
   */
  static buildNavigationHint(session, currentNodeId, remainingPath) {
    const hint = {
      currentNode: currentNodeId,
      remainingCount: remainingPath.length,
      isNearEnd: remainingPath.length <= 2,
      nextNode: remainingPath[0] || null,
    };

    if (remainingPath.length === 0) {
      hint.message = 'Complete! Ready to apply template.';
      hint.actionLabel = 'Apply Template';
    } else if (remainingPath.length === 1) {
      hint.message = `One more step: ${remainingPath[0]}`;
      hint.actionLabel = 'Review & Apply';
    } else {
      hint.message = `${remainingPath.length} steps remaining`;
      hint.actionLabel = 'Next';
    }

    return hint;
  }
}
