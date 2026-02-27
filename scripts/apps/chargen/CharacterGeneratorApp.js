/**
 * CharacterGeneratorApp
 *
 * Character progression interface supporting both partial and full mode.
 *
 * Partial Mode (Vertical Slice):
 * - Single step: background only
 * - Useful for testing integration
 *
 * Full Mode (Multi-Step):
 * - Multiple steps: background, class, abilities, etc.
 * - Aggregate all steps
 * - Merge and apply atomically
 *
 * Architecture:
 * 1. Sheet → Generator (partial or full mode)
 * 2. For each step: ManualStepProcessor.processManualStep() → MutationPlan
 * 3. Merge all plans: mergeMutationPlans([plan1, plan2, ...])
 * 4. ActorEngine.applyMutationPlan(merged) → Actor updated
 * 5. Sheet listens and re-renders
 *
 * Error Handling:
 * - ProgressionValidationError: Display validation message
 * - DeltaConflictError: Display conflict message
 * - MutationApplicationError: Display application error
 */

import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ManualStepProcessor } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/manual-step-processor.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { mergeMutationPlans } from "/systems/foundryvtt-swse/scripts/governance/mutation/merge-mutations.js";
import {
  ProgressionValidationError,
  DeltaConflictError,
  MutationApplicationError,
  getErrorMessage,
  categorizeError
} from "/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js';

export class CharacterGeneratorApp extends SWSEApplicationV2 {
  /**
   * Open generator for an actor
   * @param {Actor} actor
   * @param {Object} options
   * @param {boolean} options.fullMode - Allow multiple steps (default: false)
   * @returns {CharacterGeneratorApp}
   */
  static async open(actor, options = {}) {
    if (!actor) {
      ui.notifications.error('No actor selected');
      return null;
    }

    const app = new CharacterGeneratorApp(actor, options);
    app.render({ force: true });
    return app;
  }

  constructor(actor, options = {}) {
    const { fullMode = false } = options;

    super({
      title: `Character Progression: ${actor?.name || 'Unknown'}`,
      template: 'systems/foundryvtt-swse/templates/apps/chargen/character-generator-app.html',
      width: 600,
      height: 500,
      resizable: true,
      ...options
    });

    this.actor = actor;
    this.fullMode = fullMode;

    // Step state tracking
    this.currentStepIndex = 0;
    this.steps = fullMode
      ? ['background', 'class', 'abilities']
      : ['background'];

    // Track selections and compilation results
    this.stepSelections = {}; // { stepId: userInput }
    this.compiledPlans = {}; // { stepId: MutationPlan }

    this.isProcessing = false;
    this.lastError = null;
  }

  /**
   * Get the data to pass to the template
   */
  async getData() {
    const currentStep = this.steps[this.currentStepIndex];
    const currentSelection = this.stepSelections[currentStep];

    // Progress tracking
    const completedSteps = Object.keys(this.compiledPlans).length;
    const isLastStep = this.currentStepIndex === this.steps.length - 1;

    return {
      actor: this.actor,
      fullMode: this.fullMode,
      currentStep,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      completedSteps,
      currentSelection,
      isProcessing: this.isProcessing,
      lastError: this.lastError,
      stepOptions: await this._getStepOptions(currentStep),
      canConfirm: this._canConfirmStep(currentStep),
      canNext: !isLastStep && this._canConfirmStep(currentStep),
      canApply: isLastStep && completedSteps === this.steps.length,
      canPrevious: this.currentStepIndex > 0,
      stepProgress: this.steps.map((step, idx) => ({
        step,
        index: idx,
        isComplete: this.compiledPlans[step] !== undefined,
        isCurrent: idx === this.currentStepIndex
      }))
    };
  }

  /**
   * Get options for the current step
   * @private
   */
  async _getStepOptions(stepId) {
    switch (stepId) {
      case 'background':
        return this._getBackgroundOptions();
      case 'class':
        return this._getClassOptions();
      case 'abilities':
        return this._getAbilitiesOptions();
      default:
        return [];
    }
  }

  /**
   * Fetch available backgrounds (vertical slice — hardcoded for testing)
   * @private
   */
  _getBackgroundOptions() {
    return [
      { id: 'soldier', label: 'Soldier' },
      { id: 'scout', label: 'Scout' },
      { id: 'scoundrel', label: 'Scoundrel' },
      { id: 'scholar', label: 'Scholar' }
    ];
  }

  /**
   * Fetch available classes (full mode only)
   * @private
   */
  _getClassOptions() {
    if (!this.fullMode) {
      return [];
    }
    // TODO: Fetch from ClassesDB
    return [
      { id: 'jedi', label: 'Jedi' },
      { id: 'soldier', label: 'Soldier' },
      { id: 'scout', label: 'Scout' }
    ];
  }

  /**
   * Get ability score options (full mode only)
   * @private
   */
  _getAbilitiesOptions() {
    if (!this.fullMode) {
      return [];
    }
    // Abilities are rolled/assigned, return empty
    // In full mode, would show ability assignment UI
    return [];
  }

  /**
   * Check if current step can be confirmed
   * @private
   */
  _canConfirmStep(stepId) {
    const selection = this.stepSelections[stepId];
    return selection !== undefined && selection !== null;
  }

  /**
   * Activate listeners on render
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Step selection (background, class, etc.)
    html.find('select[name="step-select"]').change((event) => {
      const currentStep = this.steps[this.currentStepIndex];
      this.stepSelections[currentStep] = event.target.value;
      this.render();
    });

    // Confirm/Compile step
    html.find('button.confirm-step').click(() => this._confirmStep());

    // Next step (full mode only)
    html.find('button.next-step').click(() => this._nextStep());

    // Previous step (full mode only)
    html.find('button.previous-step').click(() => this._previousStep());

    // Apply all steps
    html.find('button.apply-all').click(() => this._applyAllSteps());

    // Cancel
    html.find('button.cancel-step').click(() => this.close());

    // Clear error
    html.find('button.clear-error').click(() => {
      this.lastError = null;
      this.render();
    });
  }

  /**
   * Confirm current step: compile it
   * @private
   */
  async _confirmStep() {
    const currentStep = this.steps[this.currentStepIndex];
    const selection = this.stepSelections[currentStep];

    if (!selection) {
      ui.notifications.warn('Please select an option');
      return;
    }

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.lastError = null;

    try {
      swseLogger.debug('CharacterGeneratorApp._confirmStep', {
        step: currentStep,
        selection
      });

      // Compile this single step
      const plan = await ManualStepProcessor.processManualStep(
        this.actor,
        currentStep,
        { id: selection },
        { freebuild: false }
      );

      // Store the compiled plan
      this.compiledPlans[currentStep] = plan;

      swseLogger.info('CharacterGeneratorApp: Step compiled', {
        step: currentStep,
        hasSets: !!plan.set && Object.keys(plan.set).length > 0
      });

    } catch (error) {
      this._handleError(error);
    } finally {
      this.isProcessing = false;
      this.render();
    }
  }

  /**
   * Move to next step
   * @private
   */
  async _nextStep() {
    // Confirm current step first
    const currentStep = this.steps[this.currentStepIndex];
    if (!this.compiledPlans[currentStep]) {
      await this._confirmStep();
      if (this.lastError) {
        return; // Error already displayed
      }
    }

    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.render();
    }
  }

  /**
   * Move to previous step
   * @private
   */
  _previousStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.render();
    }
  }

  /**
   * Apply all compiled steps atomically
   * @private
   */
  async _applyAllSteps() {
    if (this.isProcessing) {
      return;
    }

    // Ensure all steps are compiled
    const uncompiled = this.steps.filter(step => !this.compiledPlans[step]);
    if (uncompiled.length > 0) {
      ui.notifications.warn(`Please complete: ${uncompiled.join(', ')}`);
      return;
    }

    this.isProcessing = true;
    this.lastError = null;

    try {
      swseLogger.debug('CharacterGeneratorApp._applyAllSteps', {
        stepsCount: this.steps.length
      });

      // Collect all plans in order
      const plans = this.steps.map(step => this.compiledPlans[step]);

      // Merge all plans
      const mergedPlan = mergeMutationPlans(plans, { detectConflicts: true });

      swseLogger.debug('CharacterGeneratorApp: Plans merged', {
        stepsCount: this.steps.length,
        hasSets: !!mergedPlan.set,
        hasAdds: !!mergedPlan.add,
        hasDeletes: !!mergedPlan.delete
      });

      // Apply merged plan atomically
      await ActorEngine.applyMutationPlan(this.actor, mergedPlan, {
        source: `CharacterGeneratorApp.${this.fullMode ? 'full' : 'partial'}`,
        validate: true,
        rederive: true
      });

      swseLogger.info('CharacterGeneratorApp: All steps applied successfully', {
        stepsCount: this.steps.length
      });

      ui.notifications.info('Character progression applied successfully');
      this.close();

    } catch (error) {
      this._handleError(error);
    } finally {
      this.isProcessing = false;
      this.render();
    }
  }

  /**
   * Handle errors from compilation or application
   * @private
   */
  _handleError(error) {
    const category = categorizeError(error);
    const message = getErrorMessage(error);

    swseLogger.error('CharacterGeneratorApp: Error during progression', {
      error: error.message,
      category,
      details: error.details,
      stack: error.stack
    });

    this.lastError = {
      category,
      message,
      details: error.details || {}
    };

    // Show notification to user
    const notificationMessage = this._formatErrorForUser(error);
    switch (category) {
      case 'validation':
      case 'conflict':
        ui.notifications.warn(notificationMessage);
        break;
      case 'application':
        ui.notifications.error(notificationMessage);
        break;
      default:
        ui.notifications.error(notificationMessage);
    }

    this.render();
  }

  /**
   * Format error for user-facing display
   * @private
   */
  _formatErrorForUser(error) {
    if (error instanceof ProgressionValidationError) {
      const { field, reason } = error.details || {};
      if (field && reason) {
        return `Invalid choice for "${field}": ${reason}`;
      }
      return error.message;
    }

    if (error instanceof DeltaConflictError) {
      const { path, collection } = error.details || {};
      if (path) {
        return `Cannot modify "${path}" — conflicts with previous selection`;
      }
      if (collection) {
        return `Cannot add and remove same items from "${collection}"`;
      }
      return 'Conflict detected in mutation';
    }

    if (error instanceof MutationApplicationError) {
      return `Failed to apply changes: ${error.message}`;
    }

    return error?.message || 'Unknown error occurred';
  }

  /**
   * Close the dialog
   */
  async close() {
    super.close();
  }
}
