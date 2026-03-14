/**
 * levelup-shell.js
 *
 * Level-up entry point.
 * Replaces: scripts/apps/levelup/levelup-main.js
 * (Activated when useNewProgressionShell setting is true)
 *
 * Canonical level-up step sequence:
 *   class → [attribute] → [skills]* → general-feat → class-feat →
 *   general-talent → class-talent → [force-powers]* → [force-secrets]* →
 *   [force-techniques]* → [starship-maneuvers]* → confirm
 *
 * Steps marked * are CONDITIONAL — discovered from engine via ConditionalStepResolver.
 * The shell NEVER hardcodes conditional step logic directly.
 */

import { ProgressionShell } from './shell/progression-shell.js';
import { createStepDescriptor, StepCategory, StepType } from './steps/step-descriptor.js';

export class LevelupShell extends ProgressionShell {
  static async open(actor, options = {}) {
    return ProgressionShell.open(actor, 'levelup', options);
  }

  /**
   * Canonical level-up step sequence.
   * Conditional steps (skills, force powers, etc.) are NOT listed here.
   * ConditionalStepResolver handles those via _initializeSteps() in the base shell.
   *
   * @returns {import('./steps/step-descriptor.js').StepDescriptor[]}
   */
  _getCanonicalDescriptors() {
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
 * Those are discovered by ConditionalStepResolver and inserted before 'confirm'.
 */
const LEVELUP_CANONICAL_STEPS = [
  {
    stepId: 'class',
    label: 'Class',
    icon: 'fa-shield-alt',
    type: StepType.BUILD,
    pluginClass: null, // Wave 4: ClassStep (shared with chargen)
  },
  {
    stepId: 'attribute',
    label: 'Attributes',
    icon: 'fa-chart-bar',
    type: StepType.BUILD,
    // Note: attribute step in levelup is conditional (even levels only).
    // For now, it's listed as canonical but rendered empty if not applicable.
    // Wave 5 will handle the even-level gating.
    pluginClass: null, // Wave 5: AttributeStep
  },
  {
    stepId: 'general-feat',
    label: 'General Feat',
    icon: 'fa-star',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: null, // Wave 7: GeneralFeatStep
  },
  {
    stepId: 'class-feat',
    label: 'Class Feat',
    icon: 'fa-star-half-alt',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: null, // Wave 7: ClassFeatStep
  },
  {
    stepId: 'general-talent',
    label: 'Heroic Talent',
    icon: 'fa-gem',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: null, // Wave 8: GeneralTalentStep
  },
  {
    stepId: 'class-talent',
    label: 'Class Talent',
    icon: 'fa-gem',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: null, // Wave 8: ClassTalentStep
  },
  {
    stepId: 'confirm',
    label: 'Confirm',
    icon: 'fa-check-circle',
    type: StepType.CONFIRM,
    category: StepCategory.CONFIRMATION,
    pluginClass: null, // Wave 3+: ConfirmStep
  },
];

// Replace null pluginClass entries with NullStepPlugin
LEVELUP_CANONICAL_STEPS.forEach(step => {
  if (!step.pluginClass) step.pluginClass = NullStepPlugin;
});
