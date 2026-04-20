/**
 * levelup-shell.js
 *
 * Level-up entry point.
 * Sole authority for level-up progression (legacy levelup-main decommissioned)
 *
 * Canonical level-up step sequence:
 *   class → [attribute] → [skills]* → general-feat → class-feat →
 *   general-talent → class-talent → [force-powers]* → [force-secrets]* →
 *   [force-techniques]* → [starship-maneuvers]* → FINAL (no separate confirm)
 *
 * Steps marked * are CONDITIONAL — discovered from engine via ConditionalStepResolver.
 * The shell NEVER hardcodes conditional step logic directly.
 */

import { ProgressionShell } from './shell/progression-shell.js';
import { createStepDescriptor, StepCategory, StepType } from './steps/step-descriptor.js';
import { ActiveStepComputer } from './shell/active-step-computer.js';
import { mapNodesToDescriptors } from './registries/node-descriptor-mapper.js';
import { ClassStep } from './steps/class-step.js';
import { RolloutSettings } from './rollout/rollout-settings.js';
import { AttributeStep } from './steps/attribute-step.js';
import { GeneralFeatStep, ClassFeatStep } from './steps/feat-step.js';
import { GeneralTalentStep, ClassTalentStep } from './steps/talent-step.js';

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
      const subtype = this._getProgressionSubtype();

      // Compute active nodes for level-up mode
      const computer = new ActiveStepComputer();
      const activeNodeIds = await computer.computeActiveSteps(
        this.actor,
        'levelup',
        this.progressionSession,
        { subtype }
      );

      // Convert active node IDs to StepDescriptors with plugins wired
      const descriptors = mapNodesToDescriptors(activeNodeIds);

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
 * Null plugin stub for unimplemented step plugins.
 * Identical to chargen-shell.js NullStepPlugin — Wave 3+ replaces these.
 */
class NullStepPlugin {
  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  get descriptor() { return this._descriptor; }
  async onStepEnter() {}
  async onStepExit() {}
  async onDataReady() {}
  async getStepData() { return {}; }
  getSelection() { return { selected: [], count: 0, isComplete: false }; }
  async onItemFocused() {}
  async onItemHovered() {}
  async onItemCommitted() {}
  async onItemDeselected() {}
  validate() { return { isValid: true, errors: [], warnings: [] }; }
  getBlockingIssues() { return []; }
  getWarnings() { return []; }
  getRemainingPicks() { return []; }
  renderWorkSurface() { return null; }
  renderDetailsPanel() { return this.renderDetailsPanelEmptyState(); }
  renderDetailsPanelEmptyState() {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: { message: 'Select an item to see details.', icon: this._descriptor.icon },
    };
  }
  getUtilityBarConfig() { return { mode: 'minimal' }; }
  getUtilityBarMode() { return 'minimal'; }
  getFooterConfig() { return null; }
  getMentorContext() { return ''; }
  async onAskMentor() {}
  getMentorMode() { return 'context-only'; }
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
    stepId: 'general-talent',
    label: 'Heroic Talent',
    icon: 'fa-gem',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: GeneralTalentStep,
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
