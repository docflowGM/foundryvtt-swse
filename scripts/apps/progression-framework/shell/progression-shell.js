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
import { centerApplicationDuringStartup } from '/systems/foundryvtt-swse/scripts/utils/sheet-position.js';
import { ConditionalStepResolver } from './conditional-step-resolver.js';
import { ProgressionFinalizer } from './progression-finalizer.js';
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
      width: 1000,
      height: 750,
      top: null,
      left: null,
    },
    window: {
      resizable: true,
      draggable: true,
      frame: true,
    },
    actions: {
      // Foundry V13 ApplicationV2 requires functions in the actions map — not strings.
      // handler?.call(this, event, target) is called by #onClickAction; strings have no .call.
      // Each entry is a shorthand method so `this` resolves to the shell instance at call time.
      'toggle-mentor'(e, t)       { return this._onToggleMentor(e, t); },
      'toggle-utility-bar'(e, t)  { return this._onToggleUtilityBar(e, t); },
      'ask-mentor'(e, t)          { return this._onAskMentor(e, t); },
      'next-step'(e, t)           { return this._onNextStep(e, t); },
      'previous-step'(e, t)       { return this._onPreviousStep(e, t); },
      'confirm-step'(e, t)        { return this._onConfirmStep(e, t); },
      'exit-tree'(e, t)           { return this._onExitTree(e, t); },
      'focus-item'(e, t)          { return this._onFocusItem(e, t); },
      'commit-item'(e, t)         { return this._onCommitItem(e, t); },
      'enter-near-human'(e, t)    { return this._onEnterNearHuman(e, t); },
      'confirm-near-human'(e, t)  { return this._onConfirmNearHuman(e, t); },
      'back-to-species'(e, t)     { return this._onBackToSpecies(e, t); },
      'roll-credits'(e, t)        { return this._onRollCredits(e, t); },
      'reroll-credits'(e, t)      { return this._onRollCredits(e, t); },
      'use-max-credits'(e, t)     { return this._onUseMaxCredits(e, t); },
      'roll-hp'(e, t)             { return this._onRollHP(e, t); },
      'use-max-hp'(e, t)          { return this._onUseMaxHP(e, t); },
      'enter-store'(e, t)         { return this._onEnterStore(e, t); },
      'skip-store'(e, t)          { return this._onSkipStore(e, t); },
      // Footer step chip: navigate backward to a completed step
      'jump-step'(e, t)           { return this._onJumpStep(e, t); },
      // Step-specific actions delegated to current step plugin via event bubbling
      'toggle-category'(e, t)     { return this._onStepAction(e, t); },
      'add-language'(e, t)        { return this._onStepAction(e, t); },
      'remove-language'(e, t)     { return this._onStepAction(e, t); },
      'purchase-system'(e, t)     { return this._onStepAction(e, t); },
      'remove-system'(e, t)       { return this._onStepAction(e, t); },
      'focus-talent'(e, t)        { return this._onStepAction(e, t); },
      'focus-tree'(e, t)          { return this._onStepAction(e, t); },
      'enter-tree'(e, t)          { return this._onStepAction(e, t); },
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

    // Initialize the first step (critical for post-splash Species entry)
    await app._initializeFirstStep().catch(err => {
      swseLogger.error('[ProgressionShell] Error initializing first step:', err);
      ui?.notifications?.error?.('Failed to initialize progression. Please try again.');
    });

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
    this._targetStepId = options.currentStep || null;  // Store target step to navigate after init
    this._minStepIndex = null;  // Prevent back-navigation past this index (set when targeting step)

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

    // Mentor state — initialize with Ol' Salty portrait loaded from mentor data
    this._initializeMentorState();

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

    // Render loop prevention guard
    this._isRendering = false;
    this._renderCount = 0;

    // Position centering tracking — initialize EARLY so first render knows this is a new open
    this._openedAt = Date.now();
    this._centerTimer = null;
  }

  // ═══ AUDIT INSTRUMENTATION + RENDER GUARD ═══
  async render(...args) {
    // Render loop prevention: block recursive render calls during active render
    if (this._isRendering) {
      console.warn("[ProgressionShell] ⚠️ Render called while already rendering — BLOCKED (loop prevention)");
      return this;
    }

    this._isRendering = true;
    this._renderCount++;

    console.log(`[ProgressionShell] RENDER START (#${this._renderCount}) position:`, this.position);
    const result = await super.render(...args);
    console.log(`[ProgressionShell] RENDER COMPLETE (#${this._renderCount}) position:`, this.position);

    this._isRendering = false;
    return result;
  }

  setPosition(position) {
    console.log("[ProgressionShell] setPosition CALLED with:", position);
    console.log("[ProgressionShell] current position before:", this.position);
    const result = super.setPosition(position);
    console.log("[ProgressionShell] position after setPosition:", this.position);
    return result;
  }

  /**
   * Initialize the first step by calling onStepEnter on the current step plugin.
   * This is critical for post-splash Species entry and any targeted step.
   * @private
   */
  async _initializeFirstStep() {
    const descriptor = this.steps[this.currentStepIndex];
    if (!descriptor) return;

    const plugin = this.stepPlugins.get(descriptor.stepId);
    if (!plugin) return;

    try {
      await plugin.onStepEnter(this);
      swseLogger.log(`[ProgressionShell] Initialized first step: ${descriptor.stepId}`);
    } catch (err) {
      swseLogger.error(`[ProgressionShell] Error initializing first step ${descriptor.stepId}:`, err);
      throw err;
    }
  }

  /**
   * Initialize mentor state with Ol' Salty portrait loaded from mentor data.
   * @private
   */
  _initializeMentorState() {
    const MENTORS_DATA = game.system?.data?.mentors || {};
    const olSalty = Object.values(MENTORS_DATA).find(m => m?.id === 'ol-salty');

    this.mentor = {
      mentorId: 'ol-salty',
      name: olSalty?.name ?? "Ol' Salty",
      title: olSalty?.title ?? 'Seasoned Spacer',
      portrait: olSalty?.portrait ?? 'systems/foundryvtt-swse/assets/mentors/salty.webp',
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

    // Navigate to target step if specified (e.g., from splash: currentStep: 'species')
    if (this._targetStepId) {
      const targetIndex = this.steps.findIndex(d => d.stepId === this._targetStepId);
      if (targetIndex >= 0) {
        this.currentStepIndex = targetIndex;
        this._minStepIndex = targetIndex;  // Prevent back-navigation past this step
        swseLogger.log(`[ProgressionShell] Navigating to target step: ${this._targetStepId} (index ${targetIndex}). Back-navigation disabled until past this step.`);
      } else {
        swseLogger.warn(`[ProgressionShell] Target step not found: ${this._targetStepId}. Using index 0.`);
      }
      this._targetStepId = null; // Clear after use
    }

    // Initialize utility bar config for the current step
    const currentPlugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (currentPlugin) this.utilityBar.setConfig(currentPlugin.getUtilityBarConfig());

    swseLogger.debug('ProgressionShell._initializeSteps', {
      mode: this.mode,
      stepCount: this.steps.length,
      steps: this.steps.map(d => d.stepId),
      currentStepId: this.steps[this.currentStepIndex]?.stepId,
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

  /**
   * Reconcile conditional steps when progression state changes.
   * Call this when a choice unlocks new conditional steps.
   *
   * Safety guarantees:
   * - Preserves committed selections
   * - Preserves current step by ID when possible
   * - Gracefully relocates if current step removed
   * - Never leaves currentStepIndex invalid
   * - Updates utility/mentor/footer state after reconciliation
   *
   * @returns {Promise<void>}
   */
  async reconcileConditionalSteps() {
    const currentStepId = this.steps[this.currentStepIndex]?.stepId;

    // Re-initialize steps with new conditional set
    await this._initializeSteps();

    // Find the current step by ID in the new sequence
    const newIndex = this.steps.findIndex(d => d.stepId === currentStepId);

    if (newIndex >= 0) {
      // Current step still exists — preserve it
      this.currentStepIndex = newIndex;
    } else if (currentStepId && currentStepId !== 'confirm') {
      // Current step was removed — relocate to nearest previous valid step
      const previousSteps = this.steps.slice(0, this.currentStepIndex);
      this.currentStepIndex = Math.max(0, previousSteps.length - 1);
      swseLogger.warn('[ProgressionShell.reconcileConditionalSteps]', {
        message: 'Current step removed during reconciliation',
        previousStepId: currentStepId,
        newStepId: this.steps[this.currentStepIndex]?.stepId,
      });
    }

    // Safety: ensure currentStepIndex is valid
    if (this.currentStepIndex >= this.steps.length) {
      this.currentStepIndex = Math.max(0, this.steps.length - 1);
    }

    // Update shell state from new current plugin
    const currentPlugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (currentPlugin) {
      this.utilityBar.setConfig(currentPlugin.getUtilityBarConfig());
      this.mentor.currentDialogue = currentPlugin.getMentorContext(this);
    }

    // Re-render with new step sequence
    this.render();
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
      ? await foundry.applications.handlebars.renderTemplate(workSurfaceSpec.template, workSurfaceSpec.data)
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
      ? await foundry.applications.handlebars.renderTemplate(detailsPanelSpec.template, detailsPanelSpec.data)
      : null;

    // Summary panel (left column — build snapshot)
    const summaryPanelSpec = currentPlugin?.renderSummaryPanel?.(context) ?? null;
    const summaryPanelHtml = summaryPanelSpec?.template
      ? await foundry.applications.handlebars.renderTemplate(summaryPanelSpec.template, summaryPanelSpec.data)
      : null;

    // ── DEBUG: shell region ownership verification ──
    const isIntroMode = currentDescriptor?.stepId === 'intro';
    console.log('[ProgressionShell] active step =', currentDescriptor?.stepId);
    console.log('[ProgressionShell] isIntroMode =', isIntroMode);
    console.log('[ProgressionShell] workSurfaceHtml payload =', workSurfaceHtml?.slice?.(0, 120) ?? '(null)');
    console.log('[ProgressionShell] detailsPanelHtml payload =', detailsPanelHtml?.slice?.(0, 120) ?? '(null)');
    console.log('[ProgressionShell] summaryPanelHtml payload =', summaryPanelHtml?.slice?.(0, 120) ?? '(null)');
    // ── END DEBUG ──

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

      // Work surface, summary panel, & details panel
      stepData,
      summaryPanelHtml,
      workSurfaceHtml,
      detailsPanelHtml,

      // Footer
      footer: footerData,

      // Step chips for footer: visible (non-hidden) steps with state flags
      visibleSteps: this.steps
        .filter(d => !d.hidden)
        .map((descriptor, chipIdx) => {
          const realIdx    = this.steps.indexOf(descriptor);
          const isCurrent  = realIdx === this.currentStepIndex;
          const isComplete = this.committedSelections.has(descriptor.stepId);
          const isLocked   = realIdx > this.currentStepIndex && !isComplete;
          const plugin     = this.stepPlugins.get(descriptor.stepId);
          const hasWarning = !isCurrent && (plugin?.getWarnings?.()?.length ?? 0) > 0;
          return {
            id:          descriptor.stepId,
            index:       chipIdx + 1,       // 1-based display number
            label:       descriptor.label,
            isCurrent,
            isComplete,
            isLocked,
            isWarning:   hasWarning,
            canNavigate: isCurrent || realIdx < this.currentStepIndex,
          };
        }),

      // Font mode: 'standard' | 'aurabesh' — controls label font via data-font-mode attr
      fontMode: 'standard',

      // Intro mode: when true, the shell renders only the work-surface (boot/splash takeover).
      // All normal furniture (mentor-rail, progress-rail, footer, panels) is removed from the DOM.
      isIntroMode: currentDescriptor?.stepId === 'intro',

      // Processing state
      isProcessing: this.isProcessing,
      lastError: this.lastError,
    });
  }

  /**
   * Compute initial window position that avoids the Foundry sidebar.
   *
   * Foundry V13 ApplicationV2 calls this once before first render.
   * We override it to center the shell in the AVAILABLE canvas space
   * (viewport minus sidebar width) rather than using a fixed left offset
   * that can be crushed against the sidebar on different screen sizes.
   *
   * @returns {{ width: number, height: number, left: number, top: number }}
   */
  _getInitialPosition() {
    // Sidebar is always on the right in Foundry; measure its actual rendered width.
    const sidebarEl = ui?.sidebar?.element ?? document.querySelector('#sidebar');
    const sidebarW  = sidebarEl ? (sidebarEl.offsetWidth  || 310) : 310;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Available canvas space = full width minus sidebar minus a small right margin
    const availW = Math.max(600, viewportW - sidebarW - 16);

    const w = Math.min(1000, availW);
    const h = Math.min(750,  Math.max(500, viewportH - 80));

    // Center horizontally within available canvas; bias toward top
    const left = Math.max(10, Math.floor((availW - w) / 2));
    const top  = Math.max(20, Math.floor((viewportH - h) / 6));

    return { width: w, height: h, left, top };
  }

  async _onRender(context, options) {
    // POSITIONING: Center the progression shell during startup window (first 5 seconds)
    // Foundry V13 persists window positions and restores them on each render, which can
    // override our centered position. This time-windowed approach centers during startup,
    // then respects manual drags after the window has settled.
    centerApplicationDuringStartup(this, { width: 1000, height: 750 });

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

  /**
   * Jump backward to a completed step via a footer step-chip click.
   * Forward navigation is blocked (chips for future steps are disabled).
   * @param {PointerEvent} event
   * @param {HTMLElement} target — the step chip button
   */
  async _onJumpStep(event, target) {
    if (this.isProcessing) return;
    const stepId = target?.dataset?.stepId;
    if (!stepId) return;
    const stepIndex = this.steps.findIndex(d => d.stepId === stepId);
    if (stepIndex < 0 || stepIndex >= this.currentStepIndex) return; // can only go back
    this.navigateToStep(stepIndex, { source: 'footer-chip' });
  }

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
      try {
        await nextPlugin.onStepEnter(this);
        this.mentor.currentDialogue = nextPlugin.getMentorContext(this);
        this.mentor.askMentorEnabled = nextPlugin.getMentorMode() !== null;
        this.mentor.mentorMode = nextPlugin.getMentorMode();
      } catch (err) {
        swseLogger.error(`[ProgressionShell] Error entering step ${nextDescriptor?.stepId}:`, err);
        this.lastError = err.message;
        this.currentStepIndex--;  // Go back to previous step
        ui?.notifications?.error?.(`Failed to load ${nextDescriptor?.label}. Returning to previous step.`);
        return;
      }
    }

    this.render();
  }

  _onPreviousStep(event, target) {
    // Prevent back-navigation past minimum step (used when starting from splash at species, etc.)
    const minIndex = this._minStepIndex ?? 0;
    if (this.currentStepIndex <= minIndex) {
      swseLogger.log(`[ProgressionShell] Back-navigation blocked at minimum step index ${minIndex}`);
      return;
    }

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
      this.mentor.askMentorEnabled = prevPlugin.getMentorMode() !== null;
      this.mentor.mentorMode = prevPlugin.getMentorMode();
      this.utilityBar.setConfig(prevPlugin.getUtilityBarConfig());
    }

    this.render();
  }

  async _onConfirmStep(event, target) {
    if (this.isProcessing) return;

    swseLogger.info('ProgressionShell._onConfirmStep: Confirm button clicked', {
      mode: this.mode,
      currentStep: this.steps[this.currentStepIndex]?.stepId,
    });

    // Delegate to finalizer — do NOT mutate actor directly
    await this._onFinalizeProgression();
  }

  /**
   * Finalization gateway — single seam to ActorEngine.
   *
   * This is the narrow bridge from UI to governance layer.
   * All progression mutations flow through here.
   */
  async _onFinalizeProgression() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      swseLogger.log('[ProgressionShell] Finalization initiated', {
        mode: this.mode,
        actorId: this.actor.id,
        selectionsCount: this.committedSelections.size,
      });

      // Prepare session state for finalizer
      const sessionState = {
        mode: this.mode,
        actor: this.actor,
        committedSelections: this.committedSelections,
        steps: this.steps,
        stepData: this.stepData,
        mentor: this.mentor,
        sessionId: this.element?.dataset.sessionId || 'unknown',
      };

      // Hand to finalizer (not direct actor.update())
      const result = await ProgressionFinalizer.finalize(sessionState, this.actor);

      if (result.success) {
        swseLogger.log('[ProgressionShell] Finalization successful');
        ui.notifications.info('Character progression complete!');
        await this.close();
        const sheet = this.actor?.sheet;
        if (sheet) {
          try {
            if (sheet.minimized && typeof sheet.maximize === 'function') {
              await sheet.maximize();
            }
            sheet.render(true);
          } catch (sheetErr) {
            swseLogger.warn('[ProgressionShell] Failed to re-open actor sheet after finalization', sheetErr);
          }
        }
      } else {
        swseLogger.error('[ProgressionShell] Finalization failed', result.error);
        ui.notifications.error(`Progression failed: ${result.error}`);
      }
    } catch (error) {
      swseLogger.error('[ProgressionShell._onFinalizeProgression] Unexpected error', error);
      ui.notifications.error('An unexpected error occurred during finalization.');
    } finally {
      this.isProcessing = false;
    }
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
      await plugin.enterStore(this.actor, this);
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

  /**
   * Generic step action handler — delegates to step plugin via event bubbling
   * Step plugins should attach their own event listeners in onDataReady()
   * @param {Event} event — the click event from the button
   * @param {HTMLElement} target — the clicked button element
   */
  _onStepAction(event, target) {
    event?.preventDefault();

    // Allow the event to bubble to the work-surface element where step plugins
    // have attached their own event listeners in onDataReady()
    const workSurface = this.element?.querySelector('[data-region="work-surface"]');
    if (workSurface && target) {
      // Create and dispatch a custom event that step plugins can listen for
      const actionName = target.dataset.action;
      const customEvent = new CustomEvent('step-action', {
        detail: { actionName, originalEvent: event, target },
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(customEvent);
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
