/**
 * levelup-shell.js
 *
 * Level-up entry point.
 * Sole authority for level-up progression (legacy levelup-main decommissioned)
 *
 * Canonical level-up step sequence is resolved by ActiveStepComputer from the
 * progression node registry. Level-up conditional/entitlement nodes are not
 * merged from ConditionalStepResolver, which is chargen-only.
 *
 * Emergency fallback keeps one talent surface only to avoid double-spending a
 * single class-granted talent entitlement.
 */

import { ProgressionShell } from './shell/progression-shell.js';
import { createStepDescriptor, StepCategory, StepType } from './steps/step-descriptor.js';
import { ActiveStepComputer } from './shell/active-step-computer.js';
import { mapNodesToDescriptors } from './registries/node-descriptor-mapper.js';
import { ClassStep } from './steps/class-step.js';
import { PrestigeSurveyStep } from './steps/prestige-survey-step.js';
import { RolloutSettings } from './rollout/rollout-settings.js';
import { AttributeStep } from './steps/attribute-step.js';
import { GeneralFeatStep, ClassFeatStep } from './steps/feat-step.js';
import { ClassTalentStep } from './steps/talent-step.js';
import { NullStepPlugin } from './steps/null-step-plugin.js';
import { getNpcProfileState } from '/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js';

export class LevelupShell extends ProgressionShell {
  static async open(actor, options = {}) {
    // PHASE 4 STEP 2: Check if unified level-up is allowed in current rollout mode
    const rolloutMode = RolloutSettings.getRolloutMode();
    const canUseUnified = RolloutSettings.shouldUseUnifiedProgressionByDefault();

    if (!canUseUnified) {
      const reason = rolloutMode === 'legacy-fallback'
        ? 'Legacy fallback mode: unified level-up disabled. Use legacy level-up instead.'
        : `Unified level-up not available in "${rolloutMode}" mode.`;

      console.warn(`[LevelupShell] ${reason}`);
      ui.notifications.warn(reason);
      return null;
    }

    return ProgressionShell.open(actor, 'levelup', options);
  }

  /**
   * Detect progression subtype for this actor in level-up mode
   * Routes based on actor properties (Beast, nonheroic, or default actor)
   *
   * @private
   * @returns {string} subtype: 'beast', 'nonheroic', or 'actor'
   */
  _getProgressionSubtype(mode, options = {}) {
    if (options?.subtype) {
      return options.subtype;
    }

    if (!this.actor) return 'actor';

    const isDroidProfile = this.actor.system?.isDroid === true || this.actor.type === 'droid';
    if (isDroidProfile) {
      return 'droid';
    }

    if (this.actor.type === 'npc') {
      try {
        const profile = getNpcProfileState(this.actor);
        if (profile.kind === 'beast' || profile.legalProfile === 'beast') return 'beast';
        if (profile.kind === 'mount' || profile.legalProfile === 'mount') return 'mount';
        if (profile.kind === 'follower' || profile.legalProfile === 'follower') return 'follower';
        if (profile.kind === 'minion' || profile.kind === 'privateer' || profile.legalProfile === 'minion') return profile.kind === 'privateer' ? 'privateer' : 'minion';
        if (profile.kind === 'nonheroic' || profile.legalProfile === 'nonheroic') return 'nonheroic';
        if (profile.kind === 'heroic' || profile.legalProfile === 'heroic') return 'heroic';
        if (profile.imported || profile.legalProfile === 'imported-statblock') return 'imported-statblock';
      } catch (err) {
        console.warn('[LevelupShell] NPC profile inference failed; falling back to legacy subtype detection.', err);
      }
    }

    // Phase 2.8: Detect Beast profile (highest priority)
    const isBeastProfile = this.actor.flags?.swse?.beastData ||
                          this.progressionSession?.beastContext?.isBeast === true;
    if (isBeastProfile) {
      return 'beast';
    }

    // Phase 2.5+: Detect nonheroic subtype
    const hasNonheroicClass = this.actor.items?.some(
      item => item.type === 'class' && item.system?.isNonheroic === true
    );
    if (hasNonheroicClass) {
      return 'nonheroic';
    }

    // Default: actor
    return 'actor';
  }

  /**
   * Derive level-up step sequence from the progression spine.
   *
   * PHASE 2: Uses ActiveStepComputer to determine which nodes are active
   * for level-up progression, rather than returning a hard-coded list.
   *
   * @returns {Promise<import('./steps/step-descriptor.js').StepDescriptor[]>}
   */
  async _getCanonicalDescriptors() {
    try {
      // Detect subtype based on actor properties
      const subtype = this.progressionSession?.subtype || this._getProgressionSubtype('levelup', this.options || {});

      // Compute active nodes for level-up mode
      const computer = new ActiveStepComputer();
      let activeNodeIds = await computer.computeActiveSteps(
        this.actor,
        'levelup',
        this.progressionSession,
        { subtype }
      );

      // Level-up should open directly on the first actionable advancement step.
      // Datapad Boot is chargen-only UX even if the shared node registry lists it
      // for both modes.
      activeNodeIds = (activeNodeIds || []).filter(nodeId => nodeId !== 'intro');

      // Convert active node IDs to StepDescriptors with plugins wired
      let descriptors = mapNodesToDescriptors(activeNodeIds);

      // Sheet maintenance launches may intentionally target steps that are normally
      // conditional or entitlement-gated. Inject the target descriptor so sheet
      // buttons/reselection never fall back to a full level-up route when there is
      // no pending entitlement yet. Single-step direct-add uses only the requested
      // picker so it cannot mutate level, class, HP, or any unrelated level-up data.
      const requestedStep = this.options?.targetStep || this.options?.currentStep || this.options?.stepId || null;
      const injectableSteps = new Set([
        'attribute',
        'background',
        'skills',
        'languages',
        'force-powers',
        'force-regimens',
        'force-secrets',
        'force-techniques',
        'medical-secrets',
        'starship-maneuvers',
        'general-feat',
        'class-feat',
        'general-talent',
        'class-talent'
      ]);
      if (injectableSteps.has(requestedStep)
        && !descriptors.some((descriptor) => descriptor.stepId === requestedStep)) {
        const injected = mapNodesToDescriptors([requestedStep]);
        descriptors = [...descriptors, ...injected.filter(Boolean)];
      }

      if (this.options?.singleStep === true && requestedStep) {
        const single = descriptors.find((descriptor) => descriptor?.stepId === requestedStep);
        if (single) descriptors = [single];
      }

      if (descriptors.length === 0) {
        console.warn('[LevelupShell] No active steps computed for level-up');
        // Fallback to legacy step list
        return this._getLegacyCanonicalDescriptors();
      }

      console.log('[LevelupShell] Computed active steps:', {
        count: descriptors.length,
        steps: descriptors.map(d => d.stepId),
      });

      return descriptors;
    } catch (err) {
      console.error('[LevelupShell] Error computing canonical descriptors:', err);
      return this._getLegacyCanonicalDescriptors();
    }
  }

  /**
   * Legacy fallback: return hard-coded level-up steps.
   *
   * @returns {import('./steps/step-descriptor.js').StepDescriptor[]}
   * @private
   */
  _getLegacyCanonicalDescriptors() {
    return LEVELUP_CANONICAL_STEPS.map(config =>
      createStepDescriptor({
        ...config,
        category: config.category ?? StepCategory.CANONICAL,
        pluginClass: config.pluginClass ?? NullStepPlugin,
      })
    );
  }
}

/**
 * Canonical step configuration for level-up.
 * Does NOT include conditional steps (skills, force powers, etc.).
 * Those are discovered by ConditionalStepResolver and inserted before final step.
 */
const LEVELUP_CANONICAL_STEPS = [
  {
    stepId: 'class',
    label: 'Class',
    icon: 'fa-shield-alt',
    type: StepType.BUILD,
    pluginClass: ClassStep,
  },

  {
    stepId: 'prestige-survey',
    label: 'Prestige Survey',
    icon: 'fa-user-graduate',
    type: StepType.BUILD,
    pluginClass: PrestigeSurveyStep,
  },
  {
    stepId: 'attribute',
    label: 'Attributes',
    icon: 'fa-chart-bar',
    type: StepType.BUILD,
    // Note: attribute step in levelup is conditional (even levels only).
    // For now, it's listed as canonical but rendered empty if not applicable.
    // Wave 5 will handle the even-level gating.
    pluginClass: AttributeStep,
  },
  {
    stepId: 'general-feat',
    label: 'General Feat',
    icon: 'fa-star',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: GeneralFeatStep,
  },
  {
    stepId: 'class-feat',
    label: 'Class Feat',
    icon: 'fa-star-half-alt',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: ClassFeatStep,
  },
  {
    stepId: 'class-talent',
    label: 'Class Talent',
    icon: 'fa-gem',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: ClassTalentStep,
  },
  // NOTE: Confirm merged into final step (class-talent is final step in levelup)
];

// Replace null pluginClass entries with NullStepPlugin
LEVELUP_CANONICAL_STEPS.forEach(step => {
  if (!step.pluginClass) step.pluginClass = NullStepPlugin;
});
