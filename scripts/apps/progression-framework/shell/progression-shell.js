/**
 * ProgressionShell
 *
 * The single authoritative UI shell for all SWSE character progression:
 * - Character generation (chargen mode)
 * - Level-up (levelup mode)
 *
 * Replaces:
 * - scripts/apps/chargen/chargen-main.js        (via chargen-shell.js entry point)
 * - scripts/apps/levelup/levelup-main.js        (via levelup-shell.js entry point)
 * - scripts/apps/swse-levelup-enhanced.js
 *
 * Architecture:
 * - 6 named regions: mentor-rail, progress-rail, utility-bar, work-surface,
 *   details-panel, action-footer
 * - Step plugin architecture: each step is a ProgressionStepPlugin subclass
 * - ConditionalStepResolver: single adapter for engine-discovered conditional steps
 * - Focus vs commit: single click = focus; Choose button or footer = commit
 *
 * DO NOT add step-specific logic here. All step logic belongs in step plugins.
 * DO NOT hardcode conditional step discovery. Use ConditionalStepResolver only.
 */

import SWSEApplicationV2 from '/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { ConditionalStepResolver } from './conditional-step-resolver.js';
import { StepCategory } from '../steps/step-descriptor.js';
import { ActionFooter } from './action-footer.js';
import { MentorRail } from './mentor-rail.js';
import { ProgressRail } from './progress-rail.js';
import { UtilityBar } from './utility-bar.js';

/**
 * Shell state model (reference — actual state lives on `this`)
 *
 * {
 *   mode: 'chargen' | 'levelup',
 *   actor: Actor,
 *   steps: StepDescriptor[],         // canonical + conditional, assembled at init
 *   currentStepIndex: number,
 *   stepData: Map<stepId, stepState>,
 *   mentor: MentorRailState,
 *   mentorCollapsed: boolean,
 *   utilityBarCollapsed: boolean,
 *   focusedItem: Item | null,        // item currently previewed (single-click focus)
 *   committedSelection: Item | null, // item actually confirmed (Choose btn or footer)
 * }
 */

export class ProgressionShell extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...SWSEApplicationV2.DEFAULT_OPTIONS,
    classes: ['swse', 'swse-window', 'progression-shell'],
    position: {
      width: 1100,
      height: 700,
    },
    window: {
      resizable: true,
      draggable: true,
      frame: true,
    },
    actions: {
      'toggle-mentor': '_onToggleMentor',
      'toggle-utility-bar': '_onToggleUtilityBar',
      'ask-mentor': '_onAskMentor',
      'next-step': '_onNextStep',
      'previous-step': '_onPreviousStep',
      'confirm-step': '_onConfirmStep',
      'exit-tree': '_onExitTree',
      'focus-item': '_onFocusItem',
      'commit-item': '_onCommitItem',
      'enter-near-human': '_onEnterNearHuman',
      'confirm-near-human': '_onConfirmNearHuman',
      'back-to-species': '_onBackToSpecies',
      'roll-credits': '_onRollCredits',
      'reroll-credits': '_onRollCredits',
      'use-max-credits': '_onUseMaxCredits',
      'roll-hp': '_onRollHP',
      'use-max-hp': '_onUseMaxHP',
      'enter-store': '_onEnterStore',
      'skip-store': '_onSkipStore',
    },
  };

  static PARTS = {
    shell: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/progression-shell.hbs',
    },
    mentorRail: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/mentor-rail.hbs',
    },
    progressRail: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/progress-rail.hbs',
    },
    utilityBar: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/utility-bar.hbs',
    },
  };

  /**
   * Open the progression shell for an actor.
   *
   * @param {Actor} actor
   * @param {'chargen' | 'levelup'} mode
   * @param {Object} options
   * @returns {Promise<ProgressionShell>}
   */
  static async open(actor, mode = 'chargen', options = {}) {
    if (!actor) {
      ui.notifications.error('No actor selected');
      return null;
    }

    // `new this(...)` preserves subclass dispatch:
    // ChargenShell.open() → new ChargenShell()  → _getCanonicalDescriptors() on ChargenShell
    // LevelupShell.open() → new LevelupShell()  → _getCanonicalDescriptors() on LevelupShell
    // ProgressionShell.open() → new ProgressionShell() → base returns []
    const app = new this(actor, mode, options);
    await app._initializeSteps();
    app.render({ force: true });
    return app;
  }

  constructor(actor, mode = 'chargen', options = {}) {
    super({
      title: `Character Progression: ${actor?.name ?? 'Unknown'}`,
      ...options,
    });

    this.actor = actor;
    this.mode = mode;

    // Step state
    this.steps = [];                 // StepDescriptor[] — assembled by _initializeSteps()
    this.stepPlugins = new Map();    // stepId → ProgressionStepPlugin instance
    this.currentStepIndex = 0;

    // Selection/focus state
    this.stepData = new Map();       // stepId → step-specific state blob
    this.focusedItem = null;         // item currently in details panel (single-click)
    this.committedSelections = new Map(); // stepId → committed selection(s)

    // Shell UI state
    this.mentorCollapsed = false;
    this.utilityBarCollapsed = false;
    this.talentTreeStage = 'browser'; // 'browser' | 'graph' — for talent two-stage flow

    // Mentor state
    this.mentor = {
      mentorId: 'ol-salty',
      name: "Ol' Salty",
      title: 'Seasoned Spacer',
      portrait: null,
      currentDialogue: '',
      pendingDialogue: null,
      isAnimating: false,
      animationState: 'idle',
      mood: 'neutral',
      collapsed: false,
      askMentorEnabled: false,
      mentorMode: 'context-only',
      lastAdvice: null,
      mentorHistory: [],
    };

    // Processing/error state
    this.isProcessing = false;
    this.lastError = null;

    // Resolver for engine-discovered conditional steps
    this._conditionalResolver = new ConditionalStepResolver();

    // Subsystem controllers
    this.mentorRail = new MentorRail(this);
    this.progressRail = new ProgressRail(this);
    this.utilityBar = new UtilityBar(this);

    // Track last spoken step to prevent redundant auto-speech on every full render
    this._lastSpokenStepId = null;
  }

  // ---------------------------------------------------------------------------
  // Step Assembly
  // ---------------------------------------------------------------------------

  /**
   * Assemble the full step sequence for this actor + mode.
   * Must be called before first render.
   * Re-call whenever progression state changes (feat unlocks new step, etc.).
   *
   * Step assembly order:
   * 1. Canonical steps for this mode
   * 2. Conditional steps from ConditionalStepResolver (engine-driven)
   * 3. Filter hidden steps (category steps with no choices)
   * 4. Sort into correct sequence
   *
   * @returns {Promise<void>}
   */
  async _initializeSteps() {
    const canonicalDescriptors = this._getCanonicalDescriptors();
    const conditionalDescriptors = await this._conditionalResolver.resolveForContext(
      this.actor,
      this.mode
    );

    // Merge: canonical steps in order, then insert conditional steps at correct positions
    const allDescriptors = this._mergeStepSequence(canonicalDescriptors, conditionalDescriptors);

    // Filter hidden steps (category steps with no choices available)
    this.steps = allDescriptors.filter(d => !d.isHidden);

    // Instantiate step plugins for all non-null plugin classes
    this.stepPlugins.clear();
    for (const descriptor of this.steps) {
      if (descriptor.pluginClass) {
        this.stepPlugins.set(descriptor.stepId, new descriptor.pluginClass(descriptor));
      }
    }

    // Initialize utility bar config for the current step
    const currentPlugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (currentPlugin) this.utilityBar.setConfig(currentPlugin.getUtilityBarConfig());

    swseLogger.debug('ProgressionShell._initializeSteps', {
      mode: this.mode,
      stepCount: this.steps.length,
      steps: this.steps.map(d => d.stepId),
    });
  }

  /**
   * Get canonical step descriptors for this mode.
   * These are defined at the mode level — not hardcoded in this method.
   * Chargen-shell.js and levelup-shell.js provide their own canonical lists.
   *
   * @returns {import('../steps/step-descriptor.js').StepDescriptor[]}
   */
  _getCanonicalDescriptors() {
    // Subclasses (chargen-shell, levelup-shell) override this to provide
    // their canonical step sequences. Base shell returns empty.
    return [];
  }

  /**
   * Merge canonical and conditional step sequences.
   * Conditional steps are inserted at their natural positions based on engineKey ordering.
   *
   * @param {StepDescriptor[]} canonical
   * @param {StepDescriptor[]} conditional
   * @returns {StepDescriptor[]}
   */
  _mergeStepSequence(canonical, conditional) {
    if (conditional.length === 0) return [...canonical];

    // Find the insertion point: before 'confirm' step, after feat/talent steps
    const confirmIndex = canonical.findIndex(d => d.stepId === 'confirm');
    const insertAt = confirmIndex >= 0 ? confirmIndex : canonical.length;

    return [
      ...canonical.slice(0, insertAt),
      ...conditional,
      ...canonical.slice(insertAt),
    ];
  }

  // ---------------------------------------------------------------------------
  // ApplicationV2 Lifecycle
  // ---------------------------------------------------------------------------

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const currentDescriptor = this.steps[this.currentStepIndex];
    const currentPlugin = currentDescriptor
      ? this.stepPlugins.get(currentDescriptor.stepId)
      : null;

    // Step progress for progress rail
    const stepProgress = this.steps.map((descriptor, idx) => ({
      descriptor,
      index: idx,
      isComplete: this.committedSelections.has(descriptor.stepId),
      isCurrent: idx === this.currentStepIndex,
      isConditional: descriptor.isConditional,
      canNavigate: idx < this.currentStepIndex, // Can go back to completed steps
    }));

    // Step data from plugin
    const stepData = currentPlugin
      ? await currentPlugin.getStepData(context).catch(() => ({}))
      : {};

    // Render work surface
    const workSurfaceSpec = currentPlugin?.renderWorkSurface?.(stepData) ?? null;
    const workSurfaceHtml = workSurfaceSpec?.template
      ? await renderTemplate(workSurfaceSpec.template, workSurfaceSpec.data)
      : null;

    // Footer data
    const isLastStep = this.currentStepIndex === this.steps.length - 1;
    const footerData = this._buildFooterData(currentPlugin, isLastStep);

    // Utility bar config
    const utilityBarConfig = currentPlugin?.getUtilityBarConfig() ?? { mode: 'minimal' };

    // Details panel
    const detailsPanelSpec = currentPlugin?.renderDetailsPanel(this.focusedItem)
      ?? { template: null, data: {} };
    const detailsPanelHtml = detailsPanelSpec?.template
      ? await renderTemplate(detailsPanelSpec.template, detailsPanelSpec.data)
      : null;

    return foundry.utils.mergeObject(context, {
      // Shell identity
      mode: this.mode,
      actor: this.actor,

      // Step state
      steps: this.steps,
      currentDescriptor,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      stepProgress,

      // Region states
      mentor: this.mentor,
      mentorCollapsed: this.mentorCollapsed,
      utilityBarCollapsed: this.utilityBarCollapsed,
      utilityBarConfig,

      // Focus/selection
      focusedItem: this.focusedItem,

      // Work surface & details panel
      stepData,
      workSurfaceHtml,
      detailsPanelHtml,

      // Footer
      footer: footerData,

      // Processing state
      isProcessing: this.isProcessing,
      lastError: this.lastError,
    });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    // Wire subsystem after-render hooks
    const html = this.element;
    this.mentorRail.afterRender(html.querySelector('[data-region="mentor-rail"]'));
    this.progressRail.afterRender(html.querySelector('[data-region="progress-rail"]'));
    this.utilityBar.afterRender(html.querySelector('[data-region="utility-bar"]'));

    // Auto-speak only on actual step change — NOT on every full render
    const descriptor = this.steps[this.currentStepIndex];
    if (descriptor && descriptor.stepId !== this._lastSpokenStepId) {
      this._lastSpokenStepId = descriptor.stepId;
      await this.mentorRail.speakForStep(descriptor);
    }

    // Notify current step plugin that render completed
    if (descriptor) {
      const plugin = this.stepPlugins.get(descriptor.stepId);
      if (plugin) {
        await plugin.onDataReady(this).catch(err =>
          swseLogger.error('ProgressionShell: plugin.onDataReady failed', { err })
        );

        // Call plugin's afterRender hook with work-surface element
        const workSurfaceEl = html.querySelector('[data-region="work-surface"]');
        await plugin.afterRender?.(this, workSurfaceEl).catch(err =>
          swseLogger.error('ProgressionShell: plugin.afterRender failed', { err })
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Footer Data — single authority: ActionFooter.build()
  // ---------------------------------------------------------------------------

  _buildFooterData(currentPlugin, isLastStep) {
    return ActionFooter.build({
      shell: this,
      currentPlugin,
      isLastStep,
      mode: this.mode,
    });
  }

  // ---------------------------------------------------------------------------
  // Shell Navigation Policy
  // ---------------------------------------------------------------------------

  /**
   * Navigate to a step. Shell owns the navigation policy.
   * ProgressRail and other subsystems request navigation via this method, not direct mutation.
   * @param {number} stepIndex
   * @param {Object} options — { source: string }
   */
  navigateToStep(stepIndex, { source = 'unknown' } = {}) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;
    if (stepIndex >= this.currentStepIndex) return; // forward nav blocked
    // Future: plugin onStepExit hook, validation checks
    this.currentStepIndex = stepIndex;
    const currentPlugin = this.stepPlugins.get(this.steps[stepIndex]?.stepId);
    if (currentPlugin) this.utilityBar.setConfig(currentPlugin.getUtilityBarConfig());
    this.render();
  }

  // ---------------------------------------------------------------------------
  // Navigation Actions
  // ---------------------------------------------------------------------------

  async _onNextStep(event, target) {
    if (this.isProcessing) return;
    if (this.currentStepIndex >= this.steps.length - 1) {
      await this._onConfirmStep(event, target);
      return;
    }

    const currentDescriptor = this.steps[this.currentStepIndex];
    const currentPlugin = this.stepPlugins.get(currentDescriptor?.stepId);

    if (currentPlugin) {
      const blockingIssues = currentPlugin.getBlockingIssues();
      if (blockingIssues.length > 0) {
        ui.notifications.warn(blockingIssues[0]);
        return;
      }
      await currentPlugin.onStepExit(this);
    }

    this.currentStepIndex++;
    this.focusedItem = null;

    const nextDescriptor = this.steps[this.currentStepIndex];
    const nextPlugin = this.stepPlugins.get(nextDescriptor?.stepId);
    if (nextPlugin) {
      await nextPlugin.onStepEnter(this);
      this.mentor.currentDialogue = nextPlugin.getMentorContext(this);
      this.mentor.askMentorEnabled = nextPlugin.getMentorMode() !== null;
      this.mentor.mentorMode = nextPlugin.getMentorMode();
    }

    this.render();
  }

  _onPreviousStep(event, target) {
    if (this.currentStepIndex <= 0) return;

    const currentDescriptor = this.steps[this.currentStepIndex];
    const currentPlugin = this.stepPlugins.get(currentDescriptor?.stepId);
    currentPlugin?.onStepExit(this);

    this.currentStepIndex--;
    this.focusedItem = null;

    const prevDescriptor = this.steps[this.currentStepIndex];
    const prevPlugin = this.stepPlugins.get(prevDescriptor?.stepId);
    if (prevPlugin) {
      prevPlugin.onStepEnter(this);
      this.mentor.currentDialogue = prevPlugin.getMentorContext(this);
    }

    this.render();
  }

  async _onConfirmStep(event, target) {
    if (this.isProcessing) return;

    swseLogger.info('ProgressionShell._onConfirmStep: progression complete', {
      mode: this.mode,
      steps: this.steps.map(d => d.stepId),
    });

    // TODO (Wave 3+): Trigger ChargenFinalizer (chargen) or engine.finalize() (levelup)
    ui.notifications.info('Progression complete — finalizer not yet implemented.');
    this.close();
  }

  // ---------------------------------------------------------------------------
  // Shell UI Toggles
  // ---------------------------------------------------------------------------

  async _onToggleMentor(event, target) {
    event?.preventDefault();
    await this.mentorRail.toggle();
  }

  async _onToggleUtilityBar(event, target) {
    event?.preventDefault();
    await this.utilityBar.toggle();
  }

  async _onAskMentor(event, target) {
    const currentDescriptor = this.steps[this.currentStepIndex];
    const plugin = this.stepPlugins.get(currentDescriptor?.stepId);
    if (plugin) {
      await plugin.onAskMentor(this);
    }
  }

  _onExitTree(event, target) {
    this.talentTreeStage = 'browser';
    this.render();
  }

  // ---------------------------------------------------------------------------
  // Step Plugin Interaction Forwarding
  // ---------------------------------------------------------------------------

  async _onFocusItem(event, target) {
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin) {
      await plugin.onItemFocused(target.dataset.itemId, this);
    }
  }

  async _onCommitItem(event, target) {
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin) {
      await plugin.onItemCommitted(target.dataset.itemId, this);
    }
  }

  async _onEnterNearHuman(event, target) {
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.enterNearHumanMode) {
      await plugin.enterNearHumanMode(this);
    }
  }

  async _onConfirmNearHuman(event, target) {
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.confirmNearHuman) {
      await plugin.confirmNearHuman(this);
    }
  }

  async _onBackToSpecies(event, target) {
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.exitNearHumanMode) {
      await plugin.exitNearHumanMode(this);
    }
  }

  async _onRollCredits(event, target) {
    event?.preventDefault();
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.rollCredits) {
      await plugin.rollCredits(this.actor);
      this.render();
    }
  }

  async _onUseMaxCredits(event, target) {
    event?.preventDefault();
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.useMaximumCredits) {
      await plugin.useMaximumCredits(this.actor);
      this.render();
    }
  }

  async _onRollHP(event, target) {
    event?.preventDefault();
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.rollHPGain) {
      await plugin.rollHPGain(this.actor);
      this.render();
    }
  }

  async _onUseMaxHP(event, target) {
    event?.preventDefault();
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.useMaximumHPGain) {
      await plugin.useMaximumHPGain(this.actor);
      this.render();
    }
  }

  async _onEnterStore(event, target) {
    event?.preventDefault();
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.enterStore) {
      await plugin.enterStore(this.actor);
      this.render();
    }
  }

  async _onSkipStore(event, target) {
    event?.preventDefault();
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.skipStore) {
      plugin.skipStore();
      this.render();
    }
  }

  // ---------------------------------------------------------------------------
  // Public API for Step Plugins
  // ---------------------------------------------------------------------------

  /**
   * Set the focused item (single-click, no commit).
   * Called by step plugins in onItemFocused().
   * @param {Object|null} item
   */
  setFocusedItem(item) {
    this.focusedItem = item;
    this.render();
  }

  /**
   * Record a committed selection for a step.
   * Called by step plugins in onItemCommitted().
   * @param {string} stepId
   * @param {*} selection
   */
  commitSelection(stepId, selection) {
    this.committedSelections.set(stepId, selection);
    this.render();
  }

  /**
   * Get the committed selection for a step.
   * @param {string} stepId
   * @returns {*}
   */
  getCommittedSelection(stepId) {
    return this.committedSelections.get(stepId);
  }

  /**
   * Display a message via the mentor rail (AurebeshTranslator).
   * @param {string} text
   * @param {'neutral' | 'encouraging' | 'cautionary' | 'celebratory'} mood
   */
  speakMentor(text, mood = 'neutral') {
    this.mentor.currentDialogue = text;
    this.mentor.mood = mood;
    // AurebeshTranslator integration happens in mentor-rail.js
    this.render();
  }

  /**
   * Enter talent tree Stage 2 (zoomed SVG graph).
   * @param {string} treeId
   */
  enterTalentTree(treeId) {
    this.talentTreeStage = 'graph';
    this.activeTalentTreeId = treeId;
    this.render();
  }

  // ---------------------------------------------------------------------------
  // Close / Cleanup
  // ---------------------------------------------------------------------------

  async close(options = {}) {
    // Notify current plugin on close
    const currentDescriptor = this.steps[this.currentStepIndex];
    const currentPlugin = this.stepPlugins.get(currentDescriptor?.stepId);
    if (currentPlugin) {
      await currentPlugin.onStepExit(this).catch(() => {});
    }

    this._clearTrackedListeners();
    return super.close(options);
  }
}
