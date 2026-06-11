/**
 * FollowerShell — follower creation through the normal progression spine.
 *
 * Followers are dependent participants. The flow should not be a second
 * chargen framework. It reuses mature chargen steps where the rule contract is
 * identical and inserts only the follower-specific decisions:
 *   1. Living Being or Droid
 *   2. Follower Template
 */

import { ProgressionShell } from './shell/progression-shell.js';
import { createStepDescriptor, StepCategory, StepType } from './steps/step-descriptor.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { ChargenRules } from '/systems/foundryvtt-swse/scripts/engine/chargen/ChargenRules.js';
import { getFollowerTalentConfig } from '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js';

import { FollowerOriginStep } from './steps/follower-steps/follower-origin-step.js';
import { FollowerSpeciesStep } from './steps/follower-steps/follower-species-step.js';
import { FollowerTemplateStep } from './steps/follower-steps/follower-template-step.js';
import { FollowerDroidBuilderStep } from './steps/follower-steps/follower-droid-builder-step.js';
import { FollowerBackgroundStep } from './steps/follower-steps/follower-background-step.js';
import { FollowerSkillsStep } from './steps/follower-steps/follower-skills-step.js';
import { FollowerLanguageStep } from './steps/follower-steps/follower-language-step.js';
import { FollowerConfirmStep } from './steps/follower-steps/follower-confirm-step.js';

export class FollowerShell extends ProgressionShell {
  _getProgressionSubtype(mode, options) {
    return 'follower';
  }

  _getCanonicalDescriptors() {
    const descriptors = [
      createStepDescriptor({
        stepId: 'follower-origin',
        label: 'Follower Type',
        icon: 'fa-user-plus',
        category: StepCategory.CANONICAL,
        type: StepType.IDENTITY,
        pluginClass: FollowerOriginStep,
      }),
      createStepDescriptor({
        stepId: 'species',
        label: 'Species / Chassis',
        icon: 'fa-dna',
        category: StepCategory.CANONICAL,
        type: StepType.IDENTITY,
        pluginClass: FollowerSpeciesStep,
      }),
      createStepDescriptor({
        stepId: 'droid-builder',
        label: 'Droid Systems',
        icon: 'fa-robot',
        category: StepCategory.CATEGORY_SPECIFIC,
        type: StepType.BUILD,
        pluginClass: FollowerDroidBuilderStep,
      }),
      createStepDescriptor({
        stepId: 'follower-template',
        label: 'Template',
        icon: 'fa-id-card',
        category: StepCategory.CANONICAL,
        type: StepType.BUILD,
        pluginClass: FollowerTemplateStep,
      }),
      createStepDescriptor({
        stepId: 'background',
        label: 'Background',
        icon: 'fa-book',
        category: StepCategory.CANONICAL,
        type: StepType.NARRATIVE,
        pluginClass: FollowerBackgroundStep,
      }),
      createStepDescriptor({
        stepId: 'skills',
        label: 'Skills',
        icon: 'fa-book-open',
        category: StepCategory.CATEGORY_SPECIFIC,
        type: StepType.SELECTION,
        pluginClass: FollowerSkillsStep,
      }),
      createStepDescriptor({
        stepId: 'languages',
        label: 'Languages',
        icon: 'fa-language',
        category: StepCategory.CATEGORY_SPECIFIC,
        type: StepType.NARRATIVE,
        pluginClass: FollowerLanguageStep,
      }),
      createStepDescriptor({
        stepId: 'summary',
        label: 'Summary',
        icon: 'fa-list-check',
        category: StepCategory.CONFIRMATION,
        type: StepType.CONFIRM,
        pluginClass: FollowerConfirmStep,
      }),
    ];

    if (ChargenRules.backgroundsEnabled()) return descriptors;
    return descriptors.filter(descriptor => descriptor?.stepId !== 'background');
  }

  constructor(actor, mode = 'follower', options = {}) {
    const ownerActor = options.owner || actor || null;
    const title = ownerActor ? `${ownerActor.name}'s Follower` : 'Follower Creation';

    // The progression shell expects a real actor in several shared render paths.
    // For dependent follower creation, the owner actor is the render/session host;
    // the follower actor is created only at finalization.
    super(ownerActor, mode, {
      ...options,
      title,
    });

    this.isFollowerShell = true;
    this.ownerActor = ownerActor;
    this.dependencyContext = options.dependencyContext || null;

    if (this.dependencyContext && this.progressionSession) {
      this.progressionSession.dependencyContext = this.dependencyContext;
      this._applyFixedFollowerDefaults();
    }

    swseLogger.log('[FollowerShell] Created for owner:', this.ownerActor?.name);
  }

  _getFollowerTalentConfig() {
    const ctx = this.progressionSession?.dependencyContext || this.dependencyContext || {};
    return getFollowerTalentConfig(ctx.slotTalentName, { treeId: ctx.slotTalentTreeId })
      || getFollowerTalentConfig(ctx.slotTalentName)
      || null;
  }

  _getFixedFollowerProfile() {
    const cfg = this._getFollowerTalentConfig();
    return cfg?.fixedFollowerProfile
      || this.progressionSession?.draftSelections?.fixedFollowerProfile
      || this.progressionSession?.dependencyContext?.persistentChoices?.fixedFollowerProfile
      || null;
  }

  _applyFixedFollowerDefaults() {
    const profile = this._getFixedFollowerProfile();
    if (!profile || !this.progressionSession) return null;
    const cfg = this._getFollowerTalentConfig();
    const draft = this.progressionSession.draftSelections = this.progressionSession.draftSelections || {};
    draft.fixedFollowerProfile = structuredClone(profile);
    draft.followerKind = profile.followerKind || draft.followerKind || 'living';
    draft.speciesName = profile.speciesName || draft.speciesName || null;
    draft.speciesId = profile.speciesId || null;
    draft.species = {
      id: profile.id,
      name: profile.speciesName,
      speciesType: profile.speciesType,
      size: profile.size,
      speed: profile.speed,
      movement: profile.movement
    };
    draft.speciesSelection = draft.species;
    draft.droidConfig = null;
    if (profile.noTemplateAbilityBonus || profile.fixedAbilityScores) draft.abilityChoice = null;
    if (profile.noStartingCredits || cfg?.noStartingCredits) {
      draft.startingCredits = 0;
      draft.startingCreditsMode = 'none';
      draft.startingCreditsFormula = null;
    }
    if (profile.skipBackground || cfg?.skipBackground) {
      draft.backgroundChoice = null;
      draft.backgroundSelection = null;
      draft.background = null;
    }
    if (profile.skipLanguages || cfg?.skipLanguages) {
      draft.languageChoices = [];
      draft.followerLanguages = [];
      draft.languages = [];
    }
    this.progressionSession.lastModifiedAt = Date.now();
    return profile;
  }

  async _initializeSteps() {
    if (this.dependencyContext && this.progressionSession) {
      this.progressionSession.dependencyContext = this.dependencyContext;
      this._applyFixedFollowerDefaults();
      swseLogger.log('[FollowerShell] Seeded session with dependency context:', {
        ownerActorId: this.dependencyContext.ownerActorId,
        slotId: this.dependencyContext.slotId,
      });
    }

    await super._initializeSteps();
  }

  async _initializeFirstStep() {
    this._applyFixedFollowerDefaults();
    const firstApplicable = this._findNextApplicableStep?.(0);
    if (firstApplicable >= 0 && firstApplicable !== this.currentStepIndex) {
      this.currentStepIndex = firstApplicable;
    }
    return super._initializeFirstStep();
  }

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

    const app = new this(options.owner, mode, options);

    try {
      await app._initializeSteps();
      swseLogger.log('[FollowerShell] Steps initialized, count:', app.steps?.length || 0);
    } catch (err) {
      swseLogger.error('[FollowerShell] Error initializing steps:', err);
      ui?.notifications?.error?.('Failed to initialize follower creation. Please try again.');
      return null;
    }

    try {
      await app._initializeFirstStep();
      swseLogger.log('[FollowerShell] First step initialized');
    } catch (err) {
      swseLogger.error('[FollowerShell] Error initializing first step:', err);
      ui?.notifications?.error?.('Failed to initialize first step. Please try again.');
    }

    app.render({ force: true });
    await new Promise(resolve => setTimeout(() => {
      try {
        if (typeof app.bringToFront === 'function') app.bringToFront();
        else if (typeof app.bringToTop === 'function') app.bringToTop();
        swseLogger.debug('[FollowerShell.open] Shell brought to front after render');
      } catch (err) {
        swseLogger.warn('[FollowerShell.open] Error bringing shell to front:', err.message);
      }
      resolve();
    }, 0));

    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (this.ownerActor) {
      context.title = `${this.ownerActor.name}'s Follower`;
      context.owner = this.ownerActor;
    }
    return context;
  }




  _shouldSkipFollowerStep(stepId) {
    this._applyFixedFollowerDefaults();
    const draft = this.progressionSession?.draftSelections || {};
    const templateType = String(draft.templateType || '').toLowerCase();
    const fixedProfile = this._getFixedFollowerProfile();
    const cfg = this._getFollowerTalentConfig();
    const isDroid = draft.followerKind === 'droid'
      || draft.droidConfig?.isDroid === true
      || String(draft.speciesName || '').toLowerCase() === 'droid';

    if (fixedProfile) {
      if (stepId === 'follower-origin') return cfg?.skipOriginSelection !== false;
      if (stepId === 'species') return true;
      if (stepId === 'droid-builder') return true;
      if (stepId === 'background') return fixedProfile.skipBackground !== false;
      if (stepId === 'languages') return fixedProfile.skipLanguages !== false;
    }

    // Droid followers do not use the organic species browser. They route into
    // the shared droid systems builder instead.
    if (stepId === 'species' && isDroid) return true;
    if (stepId === 'droid-builder' && !isDroid) return true;

    // Utility followers choose one broad practical skill. Aggressive and
    // Defensive followers get their template skill package automatically, so
    // there is no player-facing Skills step to show.
    if (stepId === 'skills' && templateType !== 'utility') return true;

    return false;
  }

  _findNextApplicableStep(startIndex) {
    for (let i = startIndex; i < (this.steps?.length || 0); i += 1) {
      const stepId = this.steps[i]?.stepId;
      if (this._shouldSkipFollowerStep(stepId)) continue;
      return i;
    }
    return -1;
  }

  _findPreviousApplicableStep(startIndex, minIndex = 0) {
    for (let i = startIndex; i >= minIndex; i -= 1) {
      const stepId = this.steps[i]?.stepId;
      if (this._shouldSkipFollowerStep(stepId)) continue;
      return i;
    }
    return -1;
  }

  /**
   * Follower creation owns a fixed canonical step list. The normal chargen
   * ActiveStepComputer does not know about the dependent follower-only graph,
   * so allowing shared post-commit recomputation collapses the flow to the
   * current step and exposes the Confirm button too early. Keep the descriptor
   * spine stable; individual follower steps still validate their own
   * applicability and can no-op when their prerequisite choice does not apply.
   */
  async _recomputeActiveStepsIfNeeded() {
    return;
  }

  _getFollowerDraftSelections() {
    return this.progressionSession?.draftSelections || {};
  }

  _getMissingFollowerRequirements() {
    this._applyFixedFollowerDefaults();
    const draft = this._getFollowerDraftSelections();
    const missing = [];
    const fixedProfile = this._getFixedFollowerProfile();
    const isDroid = draft.followerKind === 'droid' || draft.droidConfig?.isDroid === true || String(draft.speciesName || '').toLowerCase() === 'droid';

    if (!fixedProfile && !draft.followerKind) missing.push('Choose Living Being or Droid.');
    if (isDroid) {
      if (!draft.droidConfig?.isDroid) missing.push('Configure the droid follower chassis.');
      if (!draft.droidConfig?.droidSystems && !draft.droid?.droidSystems) missing.push('Configure the droid follower systems.');
      if (draft.startingCredits === null || draft.startingCredits === undefined) missing.push('Roll the droid follower chassis budget.');
    } else if (!draft.speciesName && !draft.species?.name) {
      missing.push('Choose a follower species.');
    }
    if (!draft.templateType) missing.push('Choose a follower template.');
    if (!fixedProfile && !isDroid && draft.templateType && !draft.abilityChoice) missing.push('Choose the template ability bonus.');

    return missing;
  }

  async _onFinalizeProgression() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      swseLogger.log('[FollowerShell] Follower finalization initiated');

      const currentDescriptor = this.steps[this.currentStepIndex];
      const currentStepId = currentDescriptor?.stepId || null;
      const isSummaryStep = currentStepId === 'summary' || currentStepId === 'follower-confirm';
      if (!isSummaryStep) {
        const missing = this._getMissingFollowerRequirements();
        const nextIndex = this._findNextApplicableStep?.(this.currentStepIndex + 1);
        if (nextIndex >= 0) {
          swseLogger.warn('[FollowerShell] Finalize requested before summary; routing to next follower step instead', {
            currentStepId,
            nextStepId: this.steps[nextIndex]?.stepId,
            missing
          });
          this.isProcessing = false;
          await this._activateStep(nextIndex, { source: 'follower-finalize-guard', restoreIndex: this.currentStepIndex });
          this.render();
          return;
        }
        if (missing.length) {
          ui?.notifications?.warn?.(missing[0]);
          swseLogger.warn('[FollowerShell] Blocked early follower finalization', { currentStepId, missing });
          return;
        }
      }

      const missingRequirements = this._getMissingFollowerRequirements();
      if (missingRequirements.length) {
        ui?.notifications?.warn?.(missingRequirements[0]);
        swseLogger.warn('[FollowerShell] Follower finalization blocked by incomplete choices', { missingRequirements });
        return;
      }

      const currentPlugin = currentDescriptor ? this.stepPlugins.get(currentDescriptor.stepId) : null;
      if (currentPlugin && typeof currentPlugin.validate === 'function') {
        const validation = currentPlugin.validate(this);
        if (validation?.errors?.length) {
          swseLogger.warn('[FollowerShell] Validation failed:', validation.errors);
          ui.notifications.error(`Cannot finish: ${validation.errors[0]}`);
          return;
        }
      }

      if (currentPlugin && typeof currentPlugin.onStepCommit === 'function') {
        const committed = await currentPlugin.onStepCommit(this);
        if (!committed) {
          swseLogger.warn('[FollowerShell] Current step commit failed');
          return;
        }
      }

      await this._onProgressionComplete();
    } catch (error) {
      swseLogger.error('[FollowerShell._onFinalizeProgression] Unexpected error', error);
      ui.notifications.error('An unexpected error occurred during finalization.');
    } finally {
      this.isProcessing = false;
    }
  }

  async _onProgressionComplete(options = {}) {
    try {
      swseLogger.log('[FollowerShell] Follower progression complete, finalizing creation/advancement');

      const { ProgressionFinalizer } = await import('./shell/progression-finalizer.js');
      const mutationPlan = await ProgressionFinalizer._compileMutationPlan(
        {
          mode: this.mode,
          actor: this.ownerActor,
          progressionSession: this.progressionSession,
          sessionId: this.progressionSession?.id
        },
        this.ownerActor,
        options
      );

      let finalMutationPlan = mutationPlan || {};
      if (this.progressionSession?.subtypeAdapter) {
        finalMutationPlan = await this.progressionSession.subtypeAdapter.contributeMutationPlan(
          finalMutationPlan,
          this.progressionSession,
          this.ownerActor
        );
      }

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
        }
        swseLogger.error('[FollowerShell] Follower creation failed:', result.error);
        ui?.notifications?.error?.(`Follower creation failed: ${result.error}`);
        return;
      }

      swseLogger.error('[FollowerShell] No follower mutation in plan', {
        hasAdapter: !!this.progressionSession?.subtypeAdapter,
        dependencyContext: this.progressionSession?.dependencyContext,
        draftKeys: Object.keys(this.progressionSession?.draftSelections || {})
      });
      ui?.notifications?.error?.('Follower creation failed: invalid mutation plan');
    } catch (err) {
      swseLogger.error('[FollowerShell] Error completing follower progression:', err);
      ui?.notifications?.error?.(`Follower creation error: ${err.message}`);
    }
  }

  async _applyFollowerMutation(followerMutation) {
    try {
      const { FollowerCreator } = await import('../follower-creator.js');

      if (followerMutation.operation === 'create') {
        swseLogger.log('[FollowerShell] Creating new follower');
        const followerActor = await FollowerCreator.createFollowerFromMutation(
          this.ownerActor,
          followerMutation
        );

        if (!followerActor) {
          return { success: false, error: 'Failed to create follower actor' };
        }

        await this._updateFollowerSlot(followerMutation.slotId, followerActor.id);
        swseLogger.log('[FollowerShell] Follower created:', followerActor.id);
        return { success: true, result: { followerId: followerActor.id } };
      }

      if (followerMutation.operation === 'update') {
        swseLogger.log('[FollowerShell] Updating existing follower');
        const followerId = followerMutation.existingFollowerId;
        const followerActor = game.actors.get(followerId);

        if (!followerActor) {
          return { success: false, error: 'Existing follower actor not found' };
        }

        await FollowerCreator.updateFollowerFromMutation(followerActor, followerMutation);
        swseLogger.log('[FollowerShell] Follower updated:', followerId);
        return { success: true, result: { followerId } };
      }

      return { success: false, error: `Unknown follower operation: ${followerMutation.operation}` };
    } catch (err) {
      swseLogger.error('[FollowerShell] Error applying follower mutation:', err);
      return { success: false, error: err.message };
    }
  }

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
    }
  }
}
