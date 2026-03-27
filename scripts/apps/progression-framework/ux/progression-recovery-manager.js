/**
 * Progression Recovery Manager — Phase 7 Step 2
 *
 * Orchestrates recovery flows in the ProgressionShell.
 * Handles:
 * - Detection of recovery scenarios (dirty nodes, template conflicts, apply failures)
 * - Routing users to recovery steps
 * - Preserving session state
 * - Safe resume from interrupted sessions
 */

import { RecoveryCoordinator } from './recovery-coordinator.js';
import { RecoveryDisplay } from './recovery-display.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ProgressionRecoveryManager {
  constructor(shell) {
    this.shell = shell;
    this._recoveryInProgress = false;
    this._recoveryModalElement = null;
  }

  /**
   * Check if recovery is needed and display guidance.
   * Called by ProgressionShell during initialization.
   *
   * @param {ProgressionSession} session - Current session
   * @returns {Promise<boolean>} True if recovery was initiated
   */
  async checkAndInitiateRecovery(session) {
    if (!session) return false;

    // Check for dirty nodes
    if (session.dirtyNodes && session.dirtyNodes.size > 0) {
      return this._initiateDirtyNodeRecovery(session);
    }

    // Check for template validation issues
    if (session.templateValidationReport && !session.templateValidationReport.valid) {
      return this._initiateTemplateConflictRecovery(session);
    }

    return false;
  }

  /**
   * Check if session can be resumed or if user needs to start fresh.
   * Called during shell initialization if saved session exists.
   *
   * @param {Actor} actor - The actor
   * @param {ProgressionSession} savedSession - Persisted session
   * @returns {Promise<'resume' | 'start-fresh' | 'proceed'>}
   */
  async checkResumeStrategy(actor, savedSession) {
    if (!savedSession) return 'proceed';

    const recoveryPlan = RecoveryCoordinator.planResumeRecovery(actor, savedSession);

    if (!recoveryPlan.shouldResume) {
      // Session is incompatible; user must start fresh
      return this._showResumeModal(recoveryPlan);
    }

    if (recoveryPlan.warnings.length > 0) {
      // Session exists with warnings; ask user
      return this._showResumeModal(recoveryPlan);
    }

    // Session is fine, safe to resume
    return 'resume';
  }

  /**
   * Handle apply failure gracefully.
   * Called by ProgressionFinalizer if confirm/apply fails.
   *
   * @param {Error} error - The apply error
   * @param {ProgressionSession} session - Current session (snapshot at failure)
   * @returns {Promise<void>}
   */
  async handleApplyFailure(error, session) {
    const recoveryPlan = RecoveryCoordinator.planApplyFailureRecovery(error, session);

    swseLogger.error('[ProgressionRecoveryManager] Apply failure:', {
      error: error.message,
      type: error.type,
      sessionPreserved: recoveryPlan.sessionPreserved,
    });

    // Save current session state so user can retry
    if (session) {
      session._lastErrorTime = Date.now();
      session._lastError = {
        message: error.message,
        type: error.type,
        details: error.details,
      };
    }

    // Show recovery modal
    this._showApplyFailureModal(recoveryPlan);
  }

  /**
   * Navigate shell to a specific step for recovery/resolution.
   *
   * @param {string} stepId - Step to navigate to
   * @param {Object} options - Navigation options
   * @returns {Promise<void>}
   */
  async navigateToRecoveryStep(stepId, options = {}) {
    const descriptor = this.shell.steps.find(s => s.stepId === stepId);
    if (!descriptor) {
      swseLogger.warn(`[ProgressionRecoveryManager] Unknown recovery step: ${stepId}`);
      return;
    }

    const stepIndex = this.shell.steps.indexOf(descriptor);
    this.shell.navigateToStep(stepIndex, {
      source: 'recovery-manager',
      reason: options.reason || 'recovery',
    });
  }

  /**
   * Mark recovery as complete and dismiss any UI.
   */
  completeRecovery() {
    this._recoveryInProgress = false;
    if (this._recoveryModalElement) {
      this._recoveryModalElement.remove();
      this._recoveryModalElement = null;
    }
  }

  // -----------------------------------------------------------------------
  // Private recovery flow handlers
  // -----------------------------------------------------------------------

  /**
   * Initiate recovery flow for dirty nodes.
   * @private
   */
  async _initiateDirtyNodeRecovery(session) {
    this._recoveryInProgress = true;

    const recoveryPlan = RecoveryCoordinator.planDirtyNodeRecovery(session);
    if (!recoveryPlan.hasDirtyNodes) return false;

    swseLogger.warn('[ProgressionRecoveryManager] Dirty nodes detected:', {
      count: recoveryPlan.dirtyNodes.length,
      nodes: recoveryPlan.dirtyNodes.map(n => n.nodeId),
    });

    // Show recovery panel in shell
    this._showDirtyNodePanel(recoveryPlan);

    // Navigate to first dirty node
    if (recoveryPlan.resolutionPath.length > 0) {
      const firstResolution = recoveryPlan.resolutionPath[0];
      if (firstResolution.nodeId) {
        await this.navigateToRecoveryStep(firstResolution.nodeId, {
          reason: 'resolve-dirty-node',
        });
      }
    }

    return true;
  }

  /**
   * Initiate recovery flow for template conflicts.
   * @private
   */
  async _initiateTemplateConflictRecovery(session) {
    this._recoveryInProgress = true;

    const recoveryPlan = RecoveryCoordinator.planTemplateConflictRecovery(
      session,
      session.templateValidationReport
    );

    if (!recoveryPlan.hasConflicts) return false;

    swseLogger.warn('[ProgressionRecoveryManager] Template conflicts detected:', {
      conflicts: recoveryPlan.conflicts.length,
      unresolved: recoveryPlan.unresolved.length,
    });

    // If conflicts are blocking, show modal
    if (!recoveryPlan.canContinue) {
      this._showTemplateConflictModal(recoveryPlan);
    } else {
      // Otherwise show non-blocking panel
      this._showTemplateConflictPanel(recoveryPlan);
    }

    return true;
  }

  /**
   * Show resume modal and wait for user choice.
   * @private
   */
  async _showResumeModal(recoveryPlan) {
    return new Promise(resolve => {
      const modal = RecoveryDisplay.renderRecoveryModal(recoveryPlan, {
        onAction: (e) => {
          modal.remove();

          if (e.type === 'resume') {
            swseLogger.log('[ProgressionRecoveryManager] User chose to resume session');
            resolve('resume');
          } else if (e.type === 'start-fresh') {
            swseLogger.log('[ProgressionRecoveryManager] User chose to start fresh');
            resolve('start-fresh');
          }
        },
        onCancel: () => {
          modal.remove();
          resolve('proceed'); // Default to proceeding if user closes
        },
      });

      document.body.appendChild(modal);
      modal.focus();
    });
  }

  /**
   * Show dirty node recovery panel.
   * @private
   */
  _showDirtyNodePanel(recoveryPlan) {
    const panel = RecoveryDisplay.renderRecoveryPanel(recoveryPlan);

    const workSurface = this.shell.element?.querySelector('[data-region="work-surface"]');
    if (workSurface) {
      // Remove old recovery panel if exists
      workSurface.querySelector('.recovery-panel')?.remove();

      // Insert at top
      workSurface.insertBefore(panel, workSurface.firstChild);
    }

    this._recoveryModalElement = panel;
  }

  /**
   * Show template conflict modal (blocking).
   * @private
   */
  _showTemplateConflictModal(recoveryPlan) {
    const modal = RecoveryDisplay.renderRecoveryModal(recoveryPlan, {
      onAction: (e) => {
        modal.remove();

        if (e.action.nodeIds && e.action.nodeIds.length > 0) {
          // Navigate to first conflicted node
          this.navigateToRecoveryStep(e.action.nodeIds[0], {
            reason: 'resolve-template-conflict',
          });
        }

        this._recoveryModalElement = null;
      },
      onCancel: () => {
        modal.remove();
        this._recoveryModalElement = null;
      },
    });

    document.body.appendChild(modal);
    this._recoveryModalElement = modal;
    modal.focus();
  }

  /**
   * Show template conflict panel (non-blocking).
   * @private
   */
  _showTemplateConflictPanel(recoveryPlan) {
    const panel = RecoveryDisplay.renderRecoveryPanel(recoveryPlan);

    const workSurface = this.shell.element?.querySelector('[data-region="work-surface"]');
    if (workSurface) {
      // Remove old recovery panel if exists
      workSurface.querySelector('.recovery-panel')?.remove();

      // Insert at top
      workSurface.insertBefore(panel, workSurface.firstChild);
    }

    this._recoveryModalElement = panel;
  }

  /**
   * Show apply failure modal.
   * @private
   */
  _showApplyFailureModal(recoveryPlan) {
    const modal = RecoveryDisplay.renderRecoveryModal(recoveryPlan, {
      onAction: (e) => {
        modal.remove();

        if (e.type === 'retry' || e.type === 'retry-apply') {
          // User can click confirm again; dismiss and let them proceed
          swseLogger.log('[ProgressionRecoveryManager] User chose to retry apply');
        } else if (e.type === 'review-prerequisites' || e.type === 'fix-validation') {
          // Navigate back to summary or previous step
          const summaryStepIndex = this.shell.steps.findIndex(s => s.stepId === 'confirm');
          if (summaryStepIndex >= 0) {
            this.shell.navigateToStep(summaryStepIndex - 1, {
              source: 'recovery-manager',
              reason: 'fix-apply-failure',
            });
          }
        } else if (e.type === 'exit-template') {
          // Clear template and start over
          this.shell.progressionSession.templateId = null;
          this.shell.progressionSession.templateName = null;
          this.shell.render();
        }

        this._recoveryModalElement = null;
      },
      onCancel: () => {
        modal.remove();
        this._recoveryModalElement = null;
      },
    });

    document.body.appendChild(modal);
    this._recoveryModalElement = modal;
    modal.focus();
  }
}
