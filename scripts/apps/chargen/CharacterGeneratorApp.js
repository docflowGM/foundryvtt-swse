/**
 * CharacterGeneratorApp
 *
 * Minimal character progression interface.
 *
 * Vertical Slice (Partial Mode Only):
 * - Background selection only (no full-mode aggregation yet)
 * - Single-step workflow: Select → Compile → Apply → Complete
 *
 * Architecture:
 * 1. Sheet → Generator (partial mode)
 * 2. ManualStepProcessor.processManualStep() → Compiler
 * 3. ProgressionCompiler.compileStep() → MutationPlan
 * 4. ActorEngine.applyMutationPlan() → Actor updated
 * 5. Sheet listens and re-renders
 *
 * Error Handling:
 * - ProgressionValidationError: Display validation message
 * - DeltaConflictError: Display conflict message
 * - MutationApplicationError: Display application error
 * - Generic errors: Log and show generic error message
 */

import SWSEApplicationV2 from '../base/swse-application-v2.js';
import { swseLogger } from '../../utils/logger.js';
import { ManualStepProcessor } from '../../engines/progression/engine/manual-step-processor.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';
import {
  ProgressionValidationError,
  DeltaConflictError,
  MutationApplicationError,
  getErrorMessage,
  categorizeError
} from '../../governance/mutation/mutation-errors.js';

export class CharacterGeneratorApp extends SWSEApplicationV2 {
  /**
   * Open generator for an actor
   * @param {Actor} actor
   * @returns {CharacterGeneratorApp}
   */
  static async open(actor) {
    if (!actor) {
      ui.notifications.error('No actor selected');
      return null;
    }

    const app = new CharacterGeneratorApp(actor);
    app.render({ force: true });
    return app;
  }

  constructor(actor, options = {}) {
    super({
      title: `Character Progression: ${actor?.name || 'Unknown'}`,
      template: 'systems/foundryvtt-swse/templates/apps/chargen/character-generator-app.html',
      width: 600,
      height: 400,
      resizable: true,
      ...options
    });

    this.actor = actor;
    this.currentStep = 'background'; // Hardcoded for vertical slice
    this.selectedBackground = null;
    this.isProcessing = false;
    this.lastError = null;
  }

  /**
   * Get the data to pass to the template
   */
  async getData() {
    return {
      actor: this.actor,
      currentStep: this.currentStep,
      selectedBackground: this.selectedBackground,
      isProcessing: this.isProcessing,
      lastError: this.lastError,
      backgrounds: await this._getBackgroundOptions(),
      canConfirm: this.selectedBackground !== null
    };
  }

  /**
   * Fetch available backgrounds
   * @private
   */
  async _getBackgroundOptions() {
    // This is a minimal vertical slice — use a hardcoded small list for testing
    // In full mode, this would use BackgroundRegistry
    return [
      { id: 'soldier', label: 'Soldier' },
      { id: 'scout', label: 'Scout' },
      { id: 'scoundrel', label: 'Scoundrel' },
      { id: 'scholar', label: 'Scholar' }
    ];
  }

  /**
   * Activate listeners on render
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Background selection
    html.find('select[name="background"]').change(async (event) => {
      this.selectedBackground = event.target.value;
      this.render();
    });

    // Confirm button
    html.find('button.confirm-step').click(() => this._confirmStep());

    // Cancel button
    html.find('button.cancel-step').click(() => this.close());

    // Clear error button
    html.find('button.clear-error').click(() => {
      this.lastError = null;
      this.render();
    });
  }

  /**
   * Process the selected background step
   * @private
   */
  async _confirmStep() {
    if (!this.selectedBackground) {
      ui.notifications.warn('Please select a background');
      return;
    }

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.lastError = null;

    try {
      // Phase 1: Normalize and compile via ManualStepProcessor
      const mutationPlan = await ManualStepProcessor.processManualStep(
        this.actor,
        this.currentStep,
        { id: this.selectedBackground },
        { freebuild: false }
      );

      swseLogger.debug('CharacterGeneratorApp: Mutation plan compiled', { mutationPlan });

      // Phase 2: Apply mutation via ActorEngine
      await ActorEngine.applyMutationPlan(this.actor, mutationPlan, {
        source: 'CharacterGeneratorApp.partial',
        validate: true,
        rederive: true
      });

      swseLogger.info('CharacterGeneratorApp: Mutation applied successfully', {
        step: this.currentStep,
        background: this.selectedBackground
      });

      // Phase 3: Close dialog on success
      ui.notifications.info(`Background "${this.selectedBackground}" applied successfully`);
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
