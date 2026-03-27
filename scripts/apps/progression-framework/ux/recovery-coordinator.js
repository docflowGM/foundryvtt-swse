/**
 * Recovery Coordinator — Phase 7 Step 2
 *
 * Manages recovery from:
 * - Dirty nodes (caused by upstream invalidation)
 * - Template conflicts (stale/illegal template content)
 * - Apply failures (explicit error during confirm/apply)
 * - Interrupted sessions (resume/reopen progression safely)
 *
 * Goals:
 * - Identify what went wrong
 * - Preserve session state coherently
 * - Route user to required resolution points
 * - Avoid trapping users in broken states
 */

import { PROGRESSION_NODE_REGISTRY } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/registries/progression-node-registry.js';
import { ProgressionReconciler } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js';
import { UserExplainability } from './user-explainability.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class RecoveryCoordinator {
  /**
   * Detect and report dirty nodes caused by upstream changes.
   *
   * @param {ProgressionSession} session - Current session
   * @returns {Object} Recovery plan for dirty nodes
   */
  static planDirtyNodeRecovery(session) {
    if (!session.dirtyNodes || session.dirtyNodes.size === 0) {
      return { hasDirtyNodes: false };
    }

    const dirtyNodeIds = Array.from(session.dirtyNodes);
    const recovery = {
      hasDirtyNodes: true,
      dirtyNodes: [],
      resolutionPath: [],
      severity: 'warning',
    };

    dirtyNodeIds.forEach(nodeId => {
      const node = PROGRESSION_NODE_REGISTRY[nodeId];
      if (!node) return;

      const explanation = UserExplainability.explainNodeStateChange(session, nodeId, {
        state: 'ACTIVE',
        isActive: true,
      });

      recovery.dirtyNodes.push({
        nodeId,
        label: node.label,
        reasons: explanation.reasons || [],
        hint: `Review and confirm your choice for ${node.label}`,
      });

      // Route to this node for resolution
      recovery.resolutionPath.push({
        type: 'review-and-confirm',
        nodeId,
        label: node.label,
        action: `Click to review ${node.label}`,
      });
    });

    return recovery;
  }

  /**
   * Detect and report template conflicts.
   *
   * @param {ProgressionSession} session - Current session
   * @param {Object} validationReport - From TemplateValidator
   * @returns {Object} Recovery plan for template conflicts
   */
  static planTemplateConflictRecovery(session, validationReport) {
    if (!validationReport || validationReport.valid) {
      return { hasConflicts: false };
    }

    const recovery = {
      hasConflicts: true,
      conflicts: [],
      unresolved: [],
      resolutionPath: [],
      severity: 'blocking',
      canContinue: false,
    };

    // Conflicting selections (game rules)
    if (validationReport.conflicts && validationReport.conflicts.length > 0) {
      recovery.conflicts = validationReport.conflicts.map(c => ({
        node: c.node,
        current: c.current,
        reason: c.reason,
        hint: `You already chose ${c.current}. To use this template, you'll need to change that choice.`,
      }));

      recovery.resolutionPath.push({
        type: 'resolve-conflict',
        nodes: recovery.conflicts.map(c => c.node),
        action: 'Review conflicting choices and change one of them',
      });
    }

    // Unresolved items (player choice needed)
    if (validationReport.unresolved && validationReport.unresolved.length > 0) {
      recovery.unresolved = validationReport.unresolved.map(u => ({
        node: u.node,
        reason: 'Template did not provide a complete choice',
        hint: `${u.node} requires your input.`,
      }));

      recovery.resolutionPath.push({
        type: 'resolve-unresolved',
        nodes: recovery.unresolved.map(u => u.node),
        action: 'Choose values for unresolved items',
      });
    }

    // Template is usable if there are only warnings, not conflicts
    recovery.canContinue = recovery.conflicts.length === 0;

    return recovery;
  }

  /**
   * Create recovery plan for apply failure (confirm failed).
   *
   * @param {Object} applyError - Error from confirmation attempt
   * @param {ProgressionSession} session - Current session (snapshot at time of failure)
   * @returns {Object} Recovery plan for apply failure
   */
  static planApplyFailureRecovery(applyError, session) {
    const recovery = {
      hasFailed: true,
      errorMessage: applyError.message || 'Apply failed',
      errorType: applyError.type || 'UNKNOWN',
      sessionPreserved: true,
      resolutionPath: [],
      severity: 'error',
    };

    // Categorize error and suggest recovery
    switch (applyError.type) {
      case 'VALIDATION_ERROR':
        recovery.reason = 'One or more choices violate game rules';
        recovery.details = applyError.details || '';
        recovery.hint = 'Review the validation errors above and fix them';
        recovery.resolutionPath.push({
          type: 'fix-validation',
          action: 'Fix the validation errors shown',
        });
        break;

      case 'PREREQUISITE_ERROR':
        recovery.reason = 'A choice no longer meets its prerequisites';
        recovery.details = applyError.details || '';
        recovery.hint = 'The game rules changed. Review and re-make your choices.';
        recovery.resolutionPath.push({
          type: 'review-prerequisites',
          action: 'Go back and review your choices',
        });
        break;

      case 'MUTATION_ERROR':
        recovery.reason = 'Could not apply character changes';
        recovery.details = applyError.details || 'Check that your character sheet is valid.';
        recovery.hint = 'This might be a temporary issue. Try again or contact support.';
        recovery.resolutionPath.push({
          type: 'retry-apply',
          action: 'Try confirming your character again',
        });
        recovery.retryable = true;
        break;

      case 'TEMPLATE_ERROR':
        recovery.reason = 'Template application failed';
        recovery.details = applyError.details || 'The template may be out of date.';
        recovery.hint = 'Try exiting template mode and building manually.';
        recovery.resolutionPath.push({
          type: 'exit-template',
          action: 'Start over with manual build',
        });
        break;

      default:
        recovery.reason = 'Apply failed for unknown reason';
        recovery.hint = 'Your session was saved. Try again or contact support.';
        recovery.resolutionPath.push({
          type: 'retry-apply',
          action: 'Try confirming your character again',
        });
        recovery.retryable = true;
    }

    // Session state was preserved
    recovery.preservedData = {
      mode: session.mode,
      selections: session.draftSelections,
      completedSteps: session.completedStepIds,
      templateId: session.templateId,
    };

    recovery.nextSteps = [
      'Your session has been saved',
      'Fix the issue above',
      'Try confirming your character again',
      'Contact support if the problem persists',
    ];

    return recovery;
  }

  /**
   * Plan recovery for resume/reopen (session already in progress).
   *
   * Called when user reopens progression shell for an actor with in-flight session.
   *
   * @param {Actor} actor - The actor
   * @param {ProgressionSession} savedSession - Persisted session (if any)
   * @returns {Object} Recovery plan for resume/reopen
   */
  static planResumeRecovery(actor, savedSession) {
    if (!savedSession) {
      return { shouldResume: false };
    }

    const recovery = {
      shouldResume: true,
      sessionAge: this._estimateSessionAge(savedSession),
      warnings: [],
      suggestions: [],
      recoveryPath: [],
    };

    // Check for stale session
    if (recovery.sessionAge > 3600000) { // 1 hour
      recovery.warnings.push({
        type: 'stale-session',
        message: 'This session is more than 1 hour old. Game rules may have changed.',
        hint: 'Review your choices carefully before confirming.',
      });
    }

    // Check for incompatible subtype (if rules changed actor type)
    if (savedSession.subtype && actor.system?.details?.subtype !== savedSession.subtype) {
      recovery.warnings.push({
        type: 'subtype-mismatch',
        message: `Session was for ${savedSession.subtype}, but actor is now ${actor.system?.details?.subtype}`,
        hint: 'Start fresh with a new progression session.',
      });
      recovery.shouldResume = false; // Don't resume if subtype changed
    }

    // Check for level mismatch
    if (savedSession.currentLevel && actor.system?.details?.level !== savedSession.currentLevel) {
      recovery.suggestions.push({
        type: 'level-changed',
        message: `Actor is now level ${actor.system?.details?.level}, session was for level ${savedSession.currentLevel}`,
        hint: 'The progression will adjust for the current level.',
      });
    }

    // Check for existing dirty/unresolved state
    if (savedSession.dirtyNodes && savedSession.dirtyNodes.size > 0) {
      recovery.warnings.push({
        type: 'unresolved-changes',
        message: `${savedSession.dirtyNodes.size} choices need review`,
        hint: 'You'll be prompted to review these when you resume.',
      });
    }

    // Prepare resume path
    recovery.recoveryPath = [
      {
        type: 'validate-session',
        action: 'Checking saved session...',
      },
      {
        type: 'navigate-to-unresolved',
        action: 'Taking you to the first unresolved choice...',
      },
    ];

    return recovery;
  }

  /**
   * Create user-facing recovery guidance from a recovery plan.
   *
   * @param {Object} recoveryPlan - From one of the planning methods
   * @returns {Object} User-facing guidance
   */
  static createRecoveryGuidance(recoveryPlan) {
    const guidance = {
      title: '',
      message: '',
      actions: [],
      warnings: [],
    };

    if (recoveryPlan.hasDirtyNodes) {
      guidance.title = 'Changes require review';
      guidance.message = 'Some choices were affected by your recent changes. Please review them.';
      guidance.warnings = recoveryPlan.dirtyNodes.map(n => `${n.label}: ${n.reasons.join('; ')}`);

      guidance.actions = recoveryPlan.resolutionPath.map(step => ({
        type: step.type,
        label: step.action,
        nodeId: step.nodeId,
      }));
    }

    if (recoveryPlan.hasConflicts) {
      guidance.title = recoveryPlan.canContinue ? 'Template conflicts found' : 'Cannot apply template';
      guidance.message = recoveryPlan.canContinue
        ? 'The template has conflicts that need resolution.'
        : 'The template conflicts with your character build and cannot be applied.';

      guidance.warnings = [
        ...recoveryPlan.conflicts.map(c => `${c.node}: ${c.reason}`),
        ...recoveryPlan.unresolved.map(u => `${u.node}: ${u.reason}`),
      ];

      guidance.actions = recoveryPlan.resolutionPath.map(step => ({
        type: step.type,
        label: step.action,
        nodeIds: step.nodes,
      }));
    }

    if (recoveryPlan.hasFailed) {
      guidance.title = `${recoveryPlan.errorType === 'VALIDATION_ERROR' ? 'Validation error' : 'Apply failed'}`;
      guidance.message = recoveryPlan.reason;
      guidance.details = recoveryPlan.details;
      guidance.hint = recoveryPlan.hint;

      guidance.actions = recoveryPlan.resolutionPath.map(step => ({
        type: step.type,
        label: step.action,
      }));

      if (recoveryPlan.retryable) {
        guidance.actions.push({
          type: 'retry',
          label: 'Try confirming again',
        });
      }

      guidance.nextSteps = recoveryPlan.nextSteps;
    }

    if (recoveryPlan.shouldResume) {
      guidance.title = 'Resume previous session?';
      guidance.message = `You have a saved progression session from ${this._formatSessionAge(recoveryPlan.sessionAge)} ago.`;
      guidance.warnings = recoveryPlan.warnings.map(w => `${w.message} — ${w.hint}`);
      guidance.suggestions = recoveryPlan.suggestions.map(s => `${s.message}`);

      guidance.actions = [
        { type: 'resume', label: 'Resume and fix unresolved choices' },
        { type: 'start-fresh', label: 'Start a new progression session' },
      ];
    }

    return guidance;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  static _estimateSessionAge(session) {
    if (!session.createdAt) return 0;
    return Date.now() - new Date(session.createdAt).getTime();
  }

  static _formatSessionAge(ms) {
    if (ms < 60000) return 'less than a minute';
    if (ms < 3600000) return `${Math.floor(ms / 60000)} minutes`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours`;
    return `${Math.floor(ms / 86400000)} days`;
  }
}
