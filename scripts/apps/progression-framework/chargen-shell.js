/**
 * chargen-shell.js
 *
 * Character generation entry point.
 * Replaces: scripts/apps/chargen/chargen-main.js
 * (Activated when useNewProgressionShell setting is true)
 *
 * Canonical chargen step sequence (Heroic / NPC):
 *   name → race → attribute → class → l1-survey → background →
 *   languages → general-feat → class-feat → general-talent → class-talent →
 *   [conditional steps] → confirm → [store] → [confirm-post-store]
 *
 * Droid chargen replaces race with droid-type+builder (Wave 11).
 */

import { ProgressionShell } from './shell/progression-shell.js';
import { createStepDescriptor, StepCategory, StepType } from './steps/step-descriptor.js';
import { SpeciesStep } from './steps/species-step.js';
import { ClassStep } from './steps/class-step.js';
import { L1SurveyStep } from './steps/l1-survey-step.js';

export class ChargenShell extends ProgressionShell {
  static async open(actor, options = {}) {
    return ProgressionShell.open(actor, 'chargen', options);
  }

  /**
   * Canonical chargen step sequence.
   * Plugin classes are stubs until their respective waves implement them.
   *
   * @returns {import('./steps/step-descriptor.js').StepDescriptor[]}
   */
  _getCanonicalDescriptors() {
    return CHARGEN_CANONICAL_STEPS.map(config =>
      createStepDescriptor({
        ...config,
        category: config.category ?? StepCategory.CANONICAL,
        pluginClass: config.pluginClass ?? NullStepPlugin,
      })
    );
  }
}

/**
 * Null plugin stub — used for steps whose plugin class is not yet implemented.
 * Returns safe empty values for all methods.
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
 * Canonical step configuration for chargen.
 * Order is authoritative. Plugin classes are null until their wave implements them.
 */
const CHARGEN_CANONICAL_STEPS = [
  {
    stepId: 'name',
    label: 'Name',
    icon: 'fa-id-badge',
    type: StepType.IDENTITY,
    pluginClass: null, // Wave 3+
  },
  {
    stepId: 'species',
    label: 'Species',
    icon: 'fa-dna',
    type: StepType.IDENTITY,
    pluginClass: SpeciesStep,
  },
  {
    stepId: 'attribute',
    label: 'Attributes',
    icon: 'fa-chart-bar',
    type: StepType.BUILD,
    pluginClass: null, // Wave 5: AttributeStep
  },
  {
    stepId: 'class',
    label: 'Class',
    icon: 'fa-shield-alt',
    type: StepType.BUILD,
    pluginClass: ClassStep,
  },
  {
    stepId: 'l1-survey',
    label: 'Survey',
    icon: 'fa-comments',
    type: StepType.BUILD,
    isSkippable: true,
    pluginClass: L1SurveyStep,
  },
  {
    stepId: 'background',
    label: 'Background',
    icon: 'fa-book',
    type: StepType.NARRATIVE,
    pluginClass: null, // Wave 3+: BackgroundStep
  },
  {
    stepId: 'languages',
    label: 'Languages',
    icon: 'fa-language',
    type: StepType.NARRATIVE,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: null, // Wave 7+: LanguageStep
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
CHARGEN_CANONICAL_STEPS.forEach(step => {
  if (!step.pluginClass) step.pluginClass = NullStepPlugin;
});
