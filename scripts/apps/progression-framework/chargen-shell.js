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
import { TemplateInitializer } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-initializer.js';
import { TemplateTraversalPolicy } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-traversal-policy.js';

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
  /**
   * Determine progression subtype for chargen.
   * Phase 1: Check if droid builder should be used; otherwise actor.
   * Future: Resolve follower/nonheroic subtypes here when integrated.
   *
   * @param {string} mode
   * @param {Object} options
   * @returns {string}
   */
  _getProgressionSubtype(mode, options) {
    if (options.subtype) return options.subtype;

    if (!this.actor) return 'actor';

    // Phase 1: Detect droid subtype based on actor system data
    if (DroidBuilderAdapter.shouldUseDroidBuilder(this.actor.system || {})) {
      return 'droid';
    }

    // Phase 2.7: Detect Beast profile (takes precedence over nonheroic)
    const isBeastProfile = this.actor.flags?.swse?.beastData ||
                          this.progressionSession?.beastContext?.isBeast ||
                          this.progressionSession?.nonheroicContext?.isBeast === true;
    if (isBeastProfile) {
      return 'beast';
    }

    // Phase 2.6: Detect nonheroic subtype from template or class items
    // Check if session is template-seeded and template is nonheroic
    if (this.progressionSession?.isTemplateSession && this.progressionSession?.templateId) {
      // Template will have set subtype in TemplateAdapter.initializeSessionFromTemplate
      // Check the session's subtype if already set
      if (this.progressionSession.subtype === 'nonheroic') {
        return 'nonheroic';
      }
    }

    // Phase 2: Detect nonheroic subtype based on class items
    // If actor has any nonheroic class item, progression should be nonheroic
    const hasNonheroicClass = this.actor.items?.some(
      item => item.type === 'class' && item.system?.isNonheroic === true
    );
    if (hasNonheroicClass) {
      return 'nonheroic';
    }

    // Phase 3+: Detect follower subtype here

    return 'actor';
  }

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

    // PHASE 5 STEP 5: Template Selection
    // Show template selection dialog and, if chosen, seed the session with template data.
    const templateSession = await TemplateInitializer.initializeForChargen(actor, options);
    if (templateSession === false) {
      // User cancelled chargen entirely
      return null;
    }
    // Note: templateSession may be null if user chose freeform; that's OK.
    // ProgressionShell handles both template-seeded and empty sessions.
    if (templateSession) {
      // Pass template session to shell
      options.initialSession = templateSession;
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
      // Subtype is already determined in _getProgressionSubtype() and bound to session
      // Use it from the session's adapter
      const subtype = this.progressionSession.subtype;

      // Compute active nodes for this actor in chargen mode
      const computer = new ActiveStepComputer();
      let activeNodeIds = await computer.computeActiveSteps(
        this.actor,
        'chargen',
        this.progressionSession,
        { subtype }
      );

      // PHASE 5: For template sessions, filter out locked nodes (template-provided choices)
      // This creates a "bare-minimum-complete" traversal where players only revisit optional choices
      if (this.progressionSession.isTemplateSession) {
        activeNodeIds = TemplateTraversalPolicy.filterActiveStepsForTemplate(
          activeNodeIds,
          this.progressionSession,
          { skipLocked: true }
        );
      }

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
      // Fallback to legacy behavior on error, using subtype from session
      return this._getLegacyCanonicalDescriptors(this.progressionSession.subtype);
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

    // For droid, reorder to: intro → class → droid-builder → attribute → ...
    // For biological, keep original: intro → species → attribute → class → ...
    if (isDroid) {
      // Build droid-specific sequence: remove species, reorder class before attribute, insert droid-builder
      const droidSteps = [];
      let classStep = null;

      for (const config of CHARGEN_CANONICAL_STEPS) {
        if (config.stepId === 'species') {
          // Skip species for droid
          continue;
        }
        if (config.stepId === 'class') {
          // Save class; will insert it before attribute
          classStep = config;
          continue;
        }
        if (config.stepId === 'attribute' && classStep) {
          // Insert class before attribute, then droid-builder after class
          droidSteps.push(classStep);
          droidSteps.push({
            stepId: 'droid-builder',
            label: 'Droid Systems',
            icon: 'fa-robot',
            type: StepType.BUILD,
            pluginClass: DroidBuilderStep,
          });
          droidSteps.push(config);
        } else {
          droidSteps.push(config);
        }
      }

      // Handle case where class was never inserted (shouldn't happen, but safe)
      if (classStep && !droidSteps.some(s => s.stepId === 'class')) {
        const idx = droidSteps.findIndex(s => s.stepId === 'attribute');
        if (idx >= 0) {
          droidSteps.splice(idx, 0, classStep);
          droidSteps.splice(idx + 1, 0, {
            stepId: 'droid-builder',
            label: 'Droid Systems',
            icon: 'fa-robot',
            type: StepType.BUILD,
            pluginClass: DroidBuilderStep,
          });
        }
      }

      return droidSteps.map(config =>
        createStepDescriptor({
          ...config,
          category: config.category ?? StepCategory.CANONICAL,
          pluginClass: config.pluginClass ?? NullStepPlugin,
        })
      );
    }

    // Biological chargen: species → attribute → class
    const stepConfigs = CHARGEN_CANONICAL_STEPS.map(config => {
      if (config.stepId === 'species') {
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
