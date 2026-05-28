/**
 * FollowerShell — Follower Creation Flow
 *
 * Extends ProgressionShell to provide the follower-specific compact creation flow.
 * Followers are DEPENDENT participants: derived from owner state, template-driven, nonheroic.
 *
 * Canonical Follower Sequence (LOCKED):
 *   1. Follower Type: Droid or Living Being
 *   2. Species / Chassis: living species or droid size/mobility/systems/+2 ability
 *   3. Template: Aggressive, Defensive, or Utility; organic template ability choice
 *   4. Details: Human bonus, background, constrained skills, languages
 *   5. Summary: starting credits and final confirmation
 *
 * Key Constraints:
 * - No heroic or nonheroic class selection
 * - No normal feat/talent/class pipeline
 * - Skills limited to template allowances
 * - Languages: species + Basic + one owner-known language + INT bonus picks
 * - Future follower level-up is an automatic recalculation, not a choice flow
 */

import { ProgressionShell } from './shell/progression-shell.js';
import { createStepDescriptor, StepCategory, StepType } from './steps/step-descriptor.js';
import { ProgressionSession } from './shell/progression-session.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

// Follower-specific step imports
import { FollowerOriginStep } from './steps/follower-steps/follower-origin-step.js';
import { FollowerSpeciesStep } from './steps/follower-steps/follower-species-step.js';
import { FollowerTemplateStep } from './steps/follower-steps/follower-template-step.js';
import { FollowerDetailsStep } from './steps/follower-steps/follower-details-step.js';
import { FollowerConfirmStep } from './steps/follower-steps/follower-confirm-step.js';

export class FollowerShell extends ProgressionShell {
  /**
   * Detect progression subtype.
   * Followers are always 'follower' subtype (DEPENDENT participant, derived, template-driven).
   *
   * @param {string} mode - always 'follower' for this shell
   * @param {Object} options
   * @returns {string} 'follower'
   */
  _getProgressionSubtype(mode, options) {
    return 'follower';
  }

  /**
   * Get canonical descriptor list for follower progression.
   * Returns the 5-step follower creation flow.
   *
   * @returns {StepDescriptor[]} Array of 7 follower step descriptors
   */
  _getCanonicalDescriptors() {
    return [
      createStepDescriptor({
        stepId: 'follower-origin',
        stepName: 'Follower Type',
        stepDescription: 'Choose droid or living being',
        category: StepCategory.CHARGEN,
        type: StepType.SELECTION,
        pluginClass: FollowerOriginStep,
      }),

      createStepDescriptor({
        stepId: 'follower-species',
        stepName: 'Species / Chassis',
        stepDescription: 'Choose living species or configure droid chassis',
        category: StepCategory.CHARGEN,
        type: StepType.SELECTION,
        pluginClass: FollowerSpeciesStep,
      }),

      createStepDescriptor({
        stepId: 'follower-template',
        stepName: 'Template',
        stepDescription: 'Choose follower template and organic ability bonus',
        category: StepCategory.CHARGEN,
        type: StepType.SELECTION,
        pluginClass: FollowerTemplateStep,
      }),

      createStepDescriptor({
        stepId: 'follower-details',
        stepName: 'Details',
        stepDescription: 'Choose background, template skills, Human bonus, and languages',
        category: StepCategory.CHARGEN,
        type: StepType.SELECTION,
        pluginClass: FollowerDetailsStep,
      }),

      createStepDescriptor({
        stepId: 'follower-confirm',
        stepName: 'Summary',
        stepDescription: 'Review and confirm follower creation',
        category: StepCategory.CHARGEN,
        type: StepType.CONFIRMATION,
        pluginClass: FollowerConfirmStep,
      }),
    ];
  }

  /**
   * Override constructor to handle null actor (follower hasn't been created yet).
   *
   * @param {Actor|null} actor - Will be null for new followers; set after creation
   * @param {string} mode - always 'follower'
   * @param {Object} options - Must include dependencyContext with owner and slot info
   */
  constructor(actor, mode = 'follower', options = {}) {
    // For followers, actor is null (not yet created); build title from owner
    let title = 'Follower Creation';
    if (options.owner) {
      title = `${options.owner.name}'s Follower`;
    }

    super(actor, mode, {
      ...options,
      title,
    });

    // Mark this as a follower shell for any special handling
    this.isFollowerShell = true;
    this.ownerActor = options.owner || null;
    this.dependencyContext = options.dependencyContext || null;

    swseLogger.log('[FollowerShell] Created for owner:', this.ownerActor?.name);
  }

  /**
   * Initialize progression session with follower-specific context.
   * Override to handle null actor and seed dependency context.
   *
   * @private
   */
  async _initializeSteps() {
    // Seed the progression session with follower dependency context BEFORE calling parent
    if (this.dependencyContext && this.progressionSession) {
      this.progressionSession.dependencyContext = this.dependencyContext;
      swseLogger.log('[FollowerShell] Seeded session with dependency context:', {
        ownerActorId: this.dependencyContext.ownerActorId,
        slotId: this.dependencyContext.slotId,
      });
    }

    // Call parent to initialize steps, which will now use the follower's 7-step sequence
    await super._initializeSteps();
  }

  /**
   * Static open method for follower creation.
   *
   * @param {Actor|null} actor - Always null for followers
   * @param {string} mode - Always 'follower'
   * @param {Object} options - Must include owner and dependencyContext
   * @returns {Promise<FollowerShell>}
   */
  static async open(actor = null, mode = 'follower', options = {}) {
    swseLogger.log('[FollowerShell] Opening follower creation shell', {
      owner: options.owner?.name,
      dependencyContext: !!options.dependencyContext,
    });

    if (!options.owner) {
      ui.notifications.error('No owner actor provided for follower creation.');
      swseLogger.error('[FollowerShell] No owner actor in options');
      return null;
    }

    if (!options.dependencyContext) {
      ui.notifications.error('No dependency context provided for follower creation.');
      swseLogger.error('[FollowerShell] No dependency context in options');
      return null;
    }

    // Create shell instance with null actor
    const app = new this(null, mode, options);

    // Initialize steps (will use follower's 7-step sequence)
    try {
      await app._initializeSteps();
      swseLogger.log('[FollowerShell] Steps initialized, count:', app.steps?.length || 0);
    } catch (err) {
      swseLogger.error('[FollowerShell] Error initializing steps:', err);
      ui?.notifications?.error?.('Failed to initialize follower creation. Please try again.');
      return null;
    }

    // Initialize first step
    try {
      await app._initializeFirstStep();
      swseLogger.log('[FollowerShell] First step initialized');
    } catch (err) {
      swseLogger.error('[FollowerShell] Error initializing first step:', err);
      ui?.notifications?.error?.('Failed to initialize first step. Please try again.');
    }

    // Render and bring to top
    app.render({ force: true });
    await new Promise(resolve => setTimeout(() => {
      try {
        // Foundry v13+ uses bringToFront() instead of bringToTop()
        if (typeof app.bringToFront === 'function') {
          app.bringToFront();
        } else if (typeof app.bringToTop === 'function') {
          app.bringToTop();
        }
        swseLogger.debug('[FollowerShell.open] Shell brought to front after render');
      } catch (err) {
        swseLogger.warn('[FollowerShell.open] Error bringing shell to front:', err.message);
      }
      resolve();
    }, 0));

    return app;
  }

  /**
   * Prepare context for template rendering.
   * Override to handle null actor gracefully.
   *
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Override title and actor name for null actor case
    if (!this.actor && this.ownerActor) {
      context.title = `${this.ownerActor.name}'s Follower`;
      context.owner = this.ownerActor;
    }

    return context;
  }

  /**
   * Override finalization gateway for follower-specific handling.
   * Instead of calling ProgressionFinalizer, we handle follower creation/update directly.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _onFinalizeProgression() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      swseLogger.log('[FollowerShell] Follower finalization initiated');

      // Validate current step (usually confirm)
      const currentDescriptor = this.steps[this.currentStepIndex];
      if (currentDescriptor) {
        const currentPlugin = this.stepPlugins.get(currentDescriptor.stepId);
        if (currentPlugin && typeof currentPlugin.validate === 'function') {
          const validation = currentPlugin.validate();
          if (validation && validation.errors && validation.errors.length > 0) {
            swseLogger.warn('[FollowerShell] Validation failed:', validation.errors);
            ui.notifications.error(`Cannot finish: ${validation.errors[0]}`);
            this.isProcessing = false;
            return;
          }
        }
      }

      // Call parent's commit logic for the current step
      const currentPlugin = this.stepPlugins.get(currentDescriptor.stepId);
      if (currentPlugin && typeof currentPlugin.onStepCommit === 'function') {
        const committed = await currentPlugin.onStepCommit(this);
        if (!committed) {
          swseLogger.warn('[FollowerShell] Current step commit failed');
          this.isProcessing = false;
          return;
        }
      }

      // Now complete the follower progression
      await this._onProgressionComplete();
    } catch (error) {
      swseLogger.error('[FollowerShell._onFinalizeProgression] Unexpected error', error);
      ui.notifications.error('An unexpected error occurred during finalization.');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle progression completion for follower creation/advancement.
   * Creates/updates the follower actor and links to owner.
   *
   * @param {Object} options
   * @returns {Promise<void>}
   * @private
   */
  async _onProgressionComplete(options = {}) {
    try {
      swseLogger.log('[FollowerShell] Follower progression complete, finalizing creation/advancement');

      // Compile the mutation plan
      const { ProgressionFinalizer } = await import('./shell/progression-finalizer.js');
      const mutationPlan = ProgressionFinalizer._compileMutationPlan(
        {
          mode: this.mode,
          actor: this.ownerActor,
          progressionSession: this.progressionSession,
          sessionId: this.progressionSession?.id
        },
        this.ownerActor,
        options
      );

      // Get subtype adapter contribution (includes follower mutation bundle)
      let finalMutationPlan = mutationPlan;
      if (this.progressionSession?.subtypeAdapter) {
        finalMutationPlan = await this.progressionSession.subtypeAdapter.contributeMutationPlan(
          mutationPlan,
          this.progressionSession,
          this.ownerActor
        );
      }

      // Extract and apply the follower mutation
      if (finalMutationPlan.follower) {
        const result = await this._applyFollowerMutation(finalMutationPlan.follower);
        if (result.success) {
          swseLogger.log('[FollowerShell] Follower created/updated successfully:', result);
          ui?.notifications?.info?.('Follower creation complete!');
          if (this._embeddedInHolopad && this._inlineSurfaceAdapter) {
            await this._inlineSurfaceAdapter.completeAndReturnToSheet?.();
          } else {
            this.close();
          }
          return;
        } else {
          swseLogger.error('[FollowerShell] Follower creation failed:', result.error);
          ui?.notifications?.error?.(`Follower creation failed: ${result.error}`);
          return;
        }
      } else {
        swseLogger.error('[FollowerShell] No follower mutation in plan');
        ui?.notifications?.error?.('Follower creation failed: invalid mutation plan');
      }
    } catch (err) {
      swseLogger.error('[FollowerShell] Error completing follower progression:', err);
      ui?.notifications?.error?.(`Follower creation error: ${err.message}`);
    }
  }

  /**
   * Apply the follower mutation bundle (create or update follower).
   *
   * @param {Object} followerMutation - The follower mutation from the plan
   * @returns {Promise<{success: boolean, result?: Object, error?: string}>}
   * @private
   */
  async _applyFollowerMutation(followerMutation) {
    try {
      const { FollowerCreator } = await import('../../follower-creator.js');
      const { createFollowerActor, updateFollowerActor } = FollowerCreator;

      if (followerMutation.operation === 'create') {
        // Create new follower
        swseLogger.log('[FollowerShell] Creating new follower');
        const followerActor = await FollowerCreator.createFollowerFromMutation(
          this.ownerActor,
          followerMutation
        );

        if (!followerActor) {
          return { success: false, error: 'Failed to create follower actor' };
        }

        // Update owner's follower slot with the created actor ID
        const slotId = followerMutation.slotId;
        await this._updateFollowerSlot(slotId, followerActor.id);

        swseLogger.log('[FollowerShell] Follower created:', followerActor.id);
        return { success: true, result: { followerId: followerActor.id } };
      } else if (followerMutation.operation === 'update') {
        // Update existing follower
        swseLogger.log('[FollowerShell] Updating existing follower');
        const followerId = followerMutation.existingFollowerId;
        const followerActor = game.actors.get(followerId);

        if (!followerActor) {
          return { success: false, error: 'Existing follower actor not found' };
        }

        await FollowerCreator.updateFollowerFromMutation(
          followerActor,
          followerMutation
        );

        swseLogger.log('[FollowerShell] Follower updated:', followerId);
        return { success: true, result: { followerId } };
      } else {
        return { success: false, error: `Unknown follower operation: ${followerMutation.operation}` };
      }
    } catch (err) {
      swseLogger.error('[FollowerShell] Error applying follower mutation:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update the owner's follower slot with the created follower actor ID.
   *
   * @param {string} slotId - The slot ID
   * @param {string} followerActorId - The newly created follower actor ID
   * @returns {Promise<void>}
   * @private
   */
  async _updateFollowerSlot(slotId, followerActorId) {
    try {
      const slots = this.ownerActor.getFlag('foundryvtt-swse', 'followerSlots') || [];
      const slot = slots.find(s => s.id === slotId);

      if (slot) {
        slot.createdActorId = followerActorId;
        slot.updatedAt = new Date().toISOString();
        await this.ownerActor.setFlag('foundryvtt-swse', 'followerSlots', slots);
        swseLogger.log('[FollowerShell] Slot updated with follower actor ID:', followerActorId);
      }
    } catch (err) {
      swseLogger.error('[FollowerShell] Error updating follower slot:', err);
      // Non-fatal — continue even if slot update fails
    }
  }
}
