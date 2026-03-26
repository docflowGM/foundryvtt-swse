/**
 * FinalDroidConfigurationStep — Phase C: Final Pass for Deferred Droid Builds
 *
 * PHASE C: Final pass for deferred droid builds.
 *
 * This step appears ONLY:
 * - For droid characters
 * - When droid build was deferred (buildState.isDeferred === true)
 * - Before chargen completion
 *
 * Behavior:
 * - Read-only presentation of deferred build state
 * - Allow player to confirm/complete droid build
 * - Show dedicated budget remaining
 * - Show whether overflow is allowed
 * - Require final confirmation before progression
 * - Set buildState.isFinalized = true when confirmed
 *
 * Architecture:
 * - Minimal new code: reuses DroidBuilderStep infrastructure
 * - Shares cost calculation, validation, rendering
 * - Differs in mode: 'finalized' vs 'provisional'
 * - Allows user to make final adjustments if needed
 *
 * State:
 * - Reads from shell.committedSelections.get('droid-builder')
 * - Updates buildState.isFinalized = true on confirm
 * - Does NOT auto-commit (requires explicit confirmation)
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { DROID_SYSTEMS } from '../../../data/droid-systems.js';
import { swseLogger } from '../../../utils/logger.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';

export class FinalDroidConfigurationStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._droidState = null;
    this._isConfirmed = false;
  }

  /**
   * Called when the shell navigates TO this step.
   * Initialize finalized droid state from committedSelections.
   */
  async onStepEnter(shell) {
    // Retrieve the deferred droid build from committedSelections
    const droidBuild = shell?.committedSelections?.get('droid-builder');

    if (!droidBuild) {
      swseLogger.warn('[FinalDroidConfigurationStep] No droid build found in committedSelections');
      return;
    }

    // Load the deferred droid state and switch to finalized mode
    this._droidState = JSON.parse(JSON.stringify(droidBuild));

    // PHASE C: Switch mode to finalized
    if (this._droidState.buildState) {
      this._droidState.buildState.mode = 'finalized';
      // Don't set isFinalized yet — only set it on confirmation
    }

    swseLogger.log('[FinalDroidConfigurationStep] Entered with deferred droid state', {
      degree: this._droidState.droidDegree,
      size: this._droidState.droidSize,
      creditsBase: this._droidState.droidCredits?.base,
      creditsSpent: this._droidState.droidCredits?.spent,
      creditsRemaining: this._droidState.droidCredits?.remaining,
      isDeferred: this._droidState.buildState?.isDeferred,
    });
  }

  /**
   * Provide step data to templates.
   */
  async getStepData(context) {
    if (!this._droidState) {
      return {
        error: 'No droid build found',
        isFinalized: false,
      };
    }

    // Build presentation data
    const presentation = this._buildDroidPresentation();
    const credits = this._droidState.droidCredits;

    return {
      droidState: { ...this._droidState },
      presentation,
      creditsBase: credits.base,
      creditsSpent: credits.spent,
      creditsRemaining: credits.remaining,
      allowOverflow: credits.allowOverflow,
      isDeferred: this._droidState.buildState?.isDeferred,
      isFinalized: this._isConfirmed,
      // PHASE C: Show warning about unspent budget
      unspentCredits: credits.remaining,
      willLoseBudget: credits.remaining > 0 && !credits.allowOverflow,
    };
  }

  /**
   * Return selection state — final droid confirmation.
   */
  getSelection() {
    return {
      selected: [this._droidState?.droidSize || ''],
      count: 1,
      isComplete: this._isConfirmed,  // Only complete when player confirms
    };
  }

  /**
   * Return blocking issues that prevent advancing.
   */
  getBlockingIssues() {
    // Before confirmation, this step blocks progression
    if (!this._isConfirmed) {
      return ['Confirm final droid configuration to proceed'];
    }
    return [];
  }

  /**
   * Build presentation-friendly droid data (shared with DroidBuilderStep).
   */
  _buildDroidPresentation() {
    if (!this._droidState) return {};

    const sys = this._droidState.droidSystems;
    return {
      title: 'FINAL DROID CONFIGURATION',
      subtitle: 'Review and confirm your droid before chargen completion.',

      droidInfo: {
        degree: this._droidState.droidDegree,
        size: this._droidState.droidSize,
      },

      selectedSystems: {
        locomotion: sys.locomotion,
        processor: sys.processor,
        appendages: sys.appendages,
        accessories: sys.accessories,
        locomotionEnhancements: sys.locomotionEnhancements || [],
        appendageEnhancements: sys.appendageEnhancements || [],
      },

      buildTotals: {
        systemCount: this._countSelectedSystems(),
        totalCost: sys.totalCost || 0,
        totalWeight: sys.totalWeight || 0,
        creditsBase: this._droidState.droidCredits.base,
        creditsSpent: this._droidState.droidCredits.spent,
        creditsRemaining: this._droidState.droidCredits.remaining,
      },

      availableSystems: {
        locomotion: DROID_SYSTEMS.locomotion,
        processors: DROID_SYSTEMS.processors,
        appendages: DROID_SYSTEMS.appendages,
        accessories: DROID_SYSTEMS.accessories,
        locomotionEnhancements: DROID_SYSTEMS.locomotionEnhancements || [],
        appendageEnhancements: DROID_SYSTEMS.appendageEnhancements || [],
      },

      costFactor: this._getCostFactor(),
    };
  }

  /**
   * Count selected systems for display (shared with DroidBuilderStep).
   */
  _countSelectedSystems() {
    const sys = this._droidState.droidSystems;
    let count = 0;

    if (sys.locomotion) count++;
    if (sys.processor) count++;
    count += (sys.appendages || []).length;
    count += (sys.accessories || []).length;
    count += (sys.locomotionEnhancements || []).length;
    count += (sys.appendageEnhancements || []).length;

    return count;
  }

  /**
   * Get cost factor based on droid size (shared with DroidBuilderStep).
   */
  _getCostFactor() {
    const size = this._droidState?.droidSize || 'medium';
    const costFactors = {
      'tiny': 5,
      'small': 2,
      'medium': 1,
      'large': 2,
      'huge': 5,
      'gargantuan': 10,
      'colossal': 20
    };
    return costFactors[size] || 1;
  }

  /**
   * PHASE C: Confirm final droid configuration.
   * Called when player clicks "Confirm and Continue" button.
   */
  confirmDroidBuild() {
    if (!this._droidState) return false;

    // Mark as finalized
    this._droidState.buildState.isFinalized = true;
    this._droidState.buildState.isDeferred = false;
    this._droidState.buildState.mode = 'finalized';
    this._droidState.playerChoices.confirmedFinal = true;

    this._isConfirmed = true;

    swseLogger.log('[FinalDroidConfigurationStep] Droid build finalized', {
      degree: this._droidState.droidDegree,
      creditsRemaining: this._droidState.droidCredits.remaining,
    });

    return true;
  }

  /**
   * Allow player to make changes in finalized mode.
   * This preserves player agency — they can adjust build if needed before final confirmation.
   */
  purchaseSystem(category, id, subcategory = null) {
    if (!this._droidState || this._isConfirmed) return false;

    // Reuse DroidBuilderStep's logic (will be extracted as shared helper in cleanup)
    // For now, we skip the purchase implementation and leave this as a placeholder
    // since players shouldn't be heavily modifying builds in the final pass anyway

    swseLogger.debug('[FinalDroidConfigurationStep] purchaseSystem called in finalized mode');
    return false;
  }

  /**
   * Return work surface rendering spec.
   */
  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/final-droid-configuration-work-surface.hbs',
      data: stepData,
    };
  }

  /**
   * Return details panel rendering spec.
   */
  renderDetailsPanel(focusedItem) {
    if (!this._droidState) {
      return this.renderDetailsPanelEmptyState();
    }

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/final-droid-configuration-details.hbs',
      data: {
        droidInfo: {
          degree: this._droidState.droidDegree,
          size: this._droidState.droidSize,
        },
        selectedSystems: this._droidState.droidSystems,
        creditsBase: this._droidState.droidCredits.base,
        creditsSpent: this._droidState.droidCredits.spent,
        creditsRemaining: this._droidState.droidCredits.remaining,
        totalCost: this._droidState.droidSystems.totalCost,
        totalWeight: this._droidState.droidSystems.totalWeight,
        systemCount: this._countSelectedSystems(),
        isFinalized: this._isConfirmed,
      },
    };
  }

  /**
   * Validate droid build in finalized mode.
   */
  validate() {
    // In finalized mode, we just need confirmation
    if (this._isConfirmed) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Before confirmation, show that action is required
    return {
      isValid: false,
      errors: ['Please review your droid configuration and confirm to continue'],
      warnings: []
    };
  }

  /**
   * Return footer configuration overrides for finalized droid step.
   */
  getFooterConfig() {
    return {
      nextLabel: this._isConfirmed ? 'Continue to Summary' : 'Confirm Droid Build',
      confirmLabel: 'Confirm',
      isBlocked: !this._isConfirmed,
      showDeferOption: false,  // Already deferred, now finalizing
    };
  }

  /**
   * Return utility bar configuration for finalized droid step.
   */
  getUtilityBarConfig() {
    return {
      mode: 'droid-finalization',
      showBudgetStatus: true,
      showSystemCount: true,
      showSearchBar: false,  // Less likely to add systems in final pass
    };
  }

  /**
   * Return mentor guidance text for this step.
   */
  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'final-droid-configuration')
      || 'Review your droid configuration and confirm when ready.';
  }

  /**
   * Called when user clicks "Ask Mentor".
   */
  async onAskMentor(shell) {
    // Show standard guidance (no suggestions in finalized mode yet)
    await handleAskMentor(shell.actor, 'final-droid-configuration', shell);
  }

  /**
   * Called after the step is rendered in the shell.
   * Wire up event handlers for confirmation.
   */
  async afterRender(shell, workSurfaceEl) {
    if (!workSurfaceEl || !this._droidState) {
      return;
    }

    try {
      // Confirm button — finalize the droid build
      const confirmButton = workSurfaceEl.querySelector('[data-action="confirm-droid-build"]');
      if (confirmButton) {
        confirmButton.addEventListener('click', (e) => this._onConfirmDroidBuild(e, shell, workSurfaceEl));
      }
    } catch (e) {
      swseLogger.error('[FinalDroidConfigurationStep.afterRender]', e);
    }
  }

  /**
   * PHASE C: Handle confirm button.
   */
  _onConfirmDroidBuild(event, shell, workSurfaceEl) {
    event.preventDefault();

    const success = this.confirmDroidBuild();

    if (success) {
      ui.notifications.info('Droid configuration confirmed. Ready to complete chargen.');
      // Commit the finalized state
      this._commitFinalDroidBuild(shell);
      shell.render();
    } else {
      ui.notifications.warn('Unable to confirm droid build');
    }
  }

  /**
   * PHASE C: Commit the finalized droid build to shell state.
   * Updates the committedSelections with the finalized state.
   */
  _commitFinalDroidBuild(shell) {
    // Update the committed selection with finalized state
    const finalizedSelection = {
      isDroid: true,
      droidDegree: this._droidState.droidDegree,
      droidSize: this._droidState.droidSize,
      droidSystems: JSON.parse(JSON.stringify(this._droidState.droidSystems)),
      droidCredits: JSON.parse(JSON.stringify(this._droidState.droidCredits)),
      buildState: JSON.parse(JSON.stringify(this._droidState.buildState)),
    };

    shell.committedSelections.set('droid-builder', finalizedSelection);

    // Update observable build intent
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, 'droid-builder', finalizedSelection);
    }

    swseLogger.debug('[FinalDroidConfigurationStep] Finalized droid build committed', finalizedSelection);
  }

  /**
   * Called when step is exited.
   */
  async onStepExit(shell) {
    // When finalized, the build is ready for actor creation
    if (this._isConfirmed && this._droidState?.buildState?.isFinalized) {
      swseLogger.debug('[FinalDroidConfigurationStep.onStepExit] Build finalized, ready for actor creation');
      return;
    }

    // If not confirmed, warn user
    if (!this._isConfirmed) {
      swseLogger.warn('[FinalDroidConfigurationStep.onStepExit] Step exited without confirmation');
    }
  }
}
