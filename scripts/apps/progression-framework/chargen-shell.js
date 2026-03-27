/**
 * chargen-shell.js — Character generation shell
 *
 * Character generation entry point for the new progression framework.
 * Sole authority for character generation (legacy monolithic chargen decommissioned)
 *
 * CANONICAL PROGRESSION SEQUENCE (LOCKED — Corrective Pass + Intro Phase):
 *   intro → species → attribute → class → l1-survey → background →
 *   skills → feats (general+class) → talents (general+class) → languages →
 *   summary (final registration, includes naming, money roll, HP preview)
 *
 * Optional conditional steps (same shell, modular):
 *   [force-selection], [starship-maneuvers]
 *
 * Droid chargen: species-step routes to droid-builder-step (not separate UI)
 */

import { ProgressionShell } from './shell/progression-shell.js';
import { createStepDescriptor, StepCategory, StepType } from './steps/step-descriptor.js';
import { ActiveStepComputer } from './shell/active-step-computer.js';
import { mapNodesToDescriptors } from './registries/node-descriptor-mapper.js';
import { DroidBuilderAdapter } from './steps/droid-builder-adapter.js';
import { RolloutSettings } from './rollout/rollout-settings.js';

// Phase 2: Legacy imports kept for backward compat during transition
// These are now resolved via NODE_PLUGIN_MAP in node-descriptor-mapper.js
import { IntroStep } from './steps/intro-step.js';
import { SkillsStep } from './steps/skills-step.js';
import { SpeciesStep } from './steps/species-step.js';
import { DroidBuilderStep } from './steps/droid-builder-step.js';
import { ClassStep } from './steps/class-step.js';
import { L1SurveyStep } from './steps/l1-survey-step.js';
import { AttributeStep } from './steps/attribute-step.js';
import { BackgroundStep } from './steps/background-step.js';
import { LanguageStep } from './steps/language-step.js';
import { GeneralFeatStep, ClassFeatStep } from './steps/feat-step.js';
import { GeneralTalentStep, ClassTalentStep } from './steps/talent-step.js';
import { SummaryStep } from './steps/summary-step.js';

export class ChargenShell extends ProgressionShell {
  static async open(actor, options = {}) {
    // TEMP AUDIT: Log shell open call
    console.log('[TEMP AUDIT] ChargenShell.open called for actor:', actor?.name, actor?.type);

    // PHASE 4 STEP 2: Check if unified chargen is allowed in current rollout mode
    const rolloutMode = RolloutSettings.getRolloutMode();
    const canUseUnified = RolloutSettings.shouldUseUnifiedProgressionByDefault();

    if (!canUseUnified) {
      const reason = rolloutMode === 'legacy-fallback'
        ? 'Legacy fallback mode: unified chargen disabled. Use legacy chargen instead.'
        : `Unified chargen not available in "${rolloutMode}" mode.`;

      console.warn(`[ChargenShell] ${reason}`);
      ui.notifications.warn(reason);
      return null;
    }

    // CRITICAL: Use .call(this, ...) to ensure ProgressionShell.open() creates a
    // ChargenShell instance (not a ProgressionShell). This ensures _getCanonicalDescriptors()
    // calls ChargenShell._getCanonicalDescriptors() (which has 13 steps), not the base
    // ProgressionShell._getCanonicalDescriptors() (which returns empty array).
    return ProgressionShell.open.call(this, actor, 'chargen', options);
  }

  /**
   * Derive chargen step sequence from the progression spine.
   *
   * PHASE 2: Uses ActiveStepComputer to determine which nodes are active
   * based on mode/subtype/session state, rather than returning a hard-coded list.
   *
   * This enables:
   * - Dynamic step lists based on actor state
   * - Unified algorithm for chargen and level-up
   * - Conditional steps derived from registry + rules
   * - Future enhancements like forecast and template overlays
   *
   * @returns {Promise<import('./steps/step-descriptor.js').StepDescriptor[]>}
   */
  async _getCanonicalDescriptors() {
    try {
      // Determine character subtype (actor vs droid)
      const subtype = DroidBuilderAdapter.shouldUseDroidBuilder(this.actor?.system || {})
        ? 'droid'
        : 'actor';

      // Compute active nodes for this actor in chargen mode
      const computer = new ActiveStepComputer();
      const activeNodeIds = await computer.computeActiveSteps(
        this.actor,
        'chargen',
        this.progressionSession,
        { subtype }
      );

      // Convert active node IDs to StepDescriptors with plugins wired
      const descriptors = mapNodesToDescriptors(activeNodeIds);

      if (descriptors.length === 0) {
        console.warn('[ChargenShell] No active steps computed for chargen');
        // Fallback to legacy CHARGEN_CANONICAL_STEPS as safety net
        return this._getLegacyCanonicalDescriptors(subtype);
      }

      console.log('[ChargenShell] Computed active steps:', {
        subtype,
        count: descriptors.length,
        steps: descriptors.map(d => d.stepId),
      });

      return descriptors;
    } catch (err) {
      console.error('[ChargenShell] Error computing canonical descriptors:', err);
      // Fallback to legacy behavior on error
      return this._getLegacyCanonicalDescriptors(
        DroidBuilderAdapter.shouldUseDroidBuilder(this.actor?.system || {}) ? 'droid' : 'actor'
      );
    }
  }

  /**
   * Legacy fallback: return hard-coded chargen steps.
   * Used if ActiveStepComputer fails or returns empty list.
   *
   * @param {string} subtype - 'actor' or 'droid'
   * @returns {import('./steps/step-descriptor.js').StepDescriptor[]}
   * @private
   */
  _getLegacyCanonicalDescriptors(subtype) {
    const isDroid = subtype === 'droid';

    const stepConfigs = CHARGEN_CANONICAL_STEPS.map(config => {
      if (config.stepId === 'species' && isDroid) {
        return {
          ...config,
          stepId: 'droid-builder',
          label: 'Droid Builder',
          icon: 'fa-robot',
          pluginClass: DroidBuilderStep,
        };
      }
      if (config.stepId === 'species' && !isDroid) {
        return {
          ...config,
          pluginClass: SpeciesStep,
        };
      }
      return config;
    });

    return stepConfigs.map(config =>
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
 *
 * NOTE: NameStep has been removed (Phase 2 Summary Refactor).
 * Character naming is now handled in SummaryStep as "registering a datapad profile".
 * Step sequence: Species → Attributes → Class → Skills → Feats → Talents → Summary (with naming) → Confirm
 */
/**
 * CANONICAL PROGRESSION SEQUENCE (LOCKED)
 *
 * Order is authoritative per user specification.
 * Intro Phase: Diegetic Versafunction Datapad boot sequence (immersive only)
 * Corrective Pass: Reordered to match locked structure.
 * Confirm merged into Summary (Summary is final step).
 */
const CHARGEN_CANONICAL_STEPS = [
  // PHASE 0: Introduction
  {
    stepId: 'intro',
    label: 'Datapad Boot',
    icon: 'fa-circle-notch',
    type: 'intro',
    pluginClass: IntroStep,
  },

  // PHASE 1: Identity
  {
    stepId: 'species',
    label: 'Species',
    icon: 'fa-dna',
    type: StepType.IDENTITY,
    // Plugin is resolved dynamically in _getCanonicalDescriptors()
    // based on whether character is droid or biological
    pluginClass: null,
  },

  // PHASE 2: Core Build
  {
    stepId: 'attribute',
    label: 'Attributes',
    icon: 'fa-chart-bar',
    type: StepType.BUILD,
    pluginClass: AttributeStep,
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

  // PHASE 3: Character Development
  {
    stepId: 'background',
    label: 'Background',
    icon: 'fa-book',
    type: StepType.NARRATIVE,
    pluginClass: BackgroundStep,
  },
  {
    stepId: 'skills',
    label: 'Skills',
    icon: 'fa-book-open',
    type: StepType.BUILD,
    pluginClass: SkillsStep,
  },

  // PHASE 4: Abilities & Powers
  {
    stepId: 'general-feat',
    label: 'General Feat',
    icon: 'fa-star',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: GeneralFeatStep,
    slotType: 'heroic',
  },
  {
    stepId: 'class-feat',
    label: 'Class Feat',
    icon: 'fa-star-half-alt',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: ClassFeatStep,
    slotType: 'class',
  },
  {
    stepId: 'general-talent',
    label: 'Heroic Talent',
    icon: 'fa-gem',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: GeneralTalentStep,
    slotType: 'heroic',
  },
  {
    stepId: 'class-talent',
    label: 'Class Talent',
    icon: 'fa-gem',
    type: StepType.SELECTION,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: ClassTalentStep,
    slotType: 'class',
  },

  // PHASE 5: Communication & Registration
  {
    stepId: 'languages',
    label: 'Languages',
    icon: 'fa-language',
    type: StepType.NARRATIVE,
    category: StepCategory.CATEGORY_SPECIFIC,
    pluginClass: LanguageStep,
  },

  // FINAL: Registration (encompasses both review and confirmation)
  {
    stepId: 'summary',
    label: 'Summary',
    icon: 'fa-list-check',
    type: StepType.CONFIRM,
    category: StepCategory.CONFIRMATION,
    pluginClass: SummaryStep,
  },
  // NOTE: ConfirmStep merged into Summary per corrective pass.
  // Summary is now the final canonical step.
];

// Replace null pluginClass entries with NullStepPlugin
CHARGEN_CANONICAL_STEPS.forEach(step => {
  if (!step.pluginClass) step.pluginClass = NullStepPlugin;
});
