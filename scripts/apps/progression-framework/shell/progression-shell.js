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
import { RecoverySessionDialog } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/recovery-session-dialog.js';
import { centerApplicationDuringStartup } from '/systems/foundryvtt-swse/scripts/utils/sheet-position.js';
import { ConditionalStepResolver } from './conditional-step-resolver.js';
import { ProgressionFinalizer } from './progression-finalizer.js';
import { ProgressionSession } from './progression-session.js';
import { ActiveStepComputer } from './active-step-computer.js';
import { StepCategory } from '../steps/step-descriptor.js';
import { ActionFooter } from './action-footer.js';
import { MentorRail } from './mentor-rail.js';
import { ProgressRail } from './progress-rail.js';
import { UtilityBar } from './utility-bar.js';
import { HydrationDiagnosticsCollector, HydrationValidator, HydrationRecoveryStrategies } from '../hydration-diagnostics.js';
import { BuildIntent } from './build-intent.js';
import { GlobalValidator } from '../validation/global-validator.js';
import { ChargenPersistence } from './chargen-persistence.js';
import { SessionStorage } from './session-storage.js';
import { InvalidationPreview } from './invalidation-preview.js';
import { RolloutController } from '../rollout/rollout-controller.js';
import { SelectedRailContext } from './selected-rail-context.js';
import { ProjectionEngine } from './projection-engine.js';
import { ProgressionDebugCapture } from '../debug/progression-debug-capture.js';
import { ThemeResolutionService } from '/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js';
import { resolveMentorData, resolveMentorPortraitPath } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';


function isProgressionShellDebugEnabled() {
  try {
    return game?.settings?.get?.('foundryvtt-swse', 'debugMode') === true;
  } catch (_err) {
    return false;
  }
}

function progressionShellDebug(...args) {
  if (isProgressionShellDebugEnabled()) console.debug(...args);
}

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
      'continue'(e, t)            { return this._onNextStep(e, t); }, // Splash screen continue button
      'skip-intro'(e, t)          { return this._onNextStep(e, t); }, // Skip intro splash, advance to next step
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
      'use-average-credits'(e, t) { return this._onUseAverageCredits(e, t); },
      'roll-hp'(e, t)             { return this._onRollHP(e, t); },
      'use-max-hp'(e, t)          { return this._onUseMaxHP(e, t); },
      'enter-store'(e, t)         { return this._onEnterStore(e, t); },
      'skip-store'(e, t)          { return this._onSkipStore(e, t); },
      // Footer step chip: navigate backward to a completed step
      'jump-step'(e, t)           { return this._onJumpStep(e, t); },
      'start-over'(e, t)          { return this._onStartOver(e, t); },
      // Step-specific actions delegated to current step plugin via event bubbling
      'toggle-category'(e, t)     { return this._onStepAction(e, t); },
      'open-filter-panel'(e, t)  { return this._onStepAction(e, t); },
      'add-language'(e, t)        { return this._onStepAction(e, t); },
      'remove-language'(e, t)     { return this._onStepAction(e, t); },
      'purchase-system'(e, t)     { return this._onStepAction(e, t); },
      'remove-system'(e, t)       { return this._onStepAction(e, t); },
      'focus-talent'(e, t)        { return this._onStepAction(e, t); },
      'focus-tree'(e, t)          { return this._onStepAction(e, t); },
      'enter-tree'(e, t)          { return this._onStepAction(e, t); },
      'survey-start'(e, t)        { return this._onStepAction(e, t); },
      'survey-choose'(e, t)       { return this._onStepAction(e, t); },
      'survey-continue'(e, t)     { return this._onStepAction(e, t); },
      'survey-finish'(e, t)       { return this._onStepAction(e, t); },
      'survey-change-answer'(e, t){ return this._onStepAction(e, t); },
      'survey-previous-question'(e, t){ return this._onStepAction(e, t); },
      'survey-retake'(e, t)       { return this._onStepAction(e, t); },
      // Phase 8: Force Power quantity controls
      'increment-quantity'(e, t)  { return this._onIncrementQuantity(e, t); },
      'decrement-quantity'(e, t)  { return this._onDecrementQuantity(e, t); },
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
    // TEMP AUDIT: Log open entry
    progressionShellDebug('[TEMP AUDIT] ProgressionShell.open called:', {
      actor: actor?.name,
      mode,
      this: this.name
    });

    if (!actor) {
      ui.notifications.error('No actor selected');
      return null;
    }

    // `new this(...)` preserves subclass dispatch:
    // ChargenShell.open() → new ChargenShell()  → _getCanonicalDescriptors() on ChargenShell
    // LevelupShell.open() → new LevelupShell()  → _getCanonicalDescriptors() on LevelupShell
    // ProgressionShell.open() → new ProgressionShell() → base returns []
    progressionShellDebug('[TEMP AUDIT] Creating app instance of class:', this.name);
    const app = new this(actor, mode, options);
    progressionShellDebug('[TEMP AUDIT] App instance created:', app?.constructor?.name);

    // Phase 1: Attempt session recovery before initializing steps
    progressionShellDebug('[TEMP AUDIT] Attempting session recovery...');
    await app._attemptSessionRecovery();
    progressionShellDebug('[TEMP AUDIT] Session recovery complete');

    progressionShellDebug('[TEMP AUDIT] Calling _initializeSteps...');
    await app._initializeSteps();
    progressionShellDebug('[TEMP AUDIT] Steps initialized, count:', app.steps?.length || 0);

    // Initialize the first step (critical for post-splash Species entry)
    progressionShellDebug('[TEMP AUDIT] Calling _initializeFirstStep...');
    await app._initializeFirstStep().catch(err => {
      swseLogger.error('[ProgressionShell] Error initializing first step:', err);
      ui?.notifications?.error?.('Failed to initialize progression. Please try again.');
    });
    progressionShellDebug('[TEMP AUDIT] First step initialized');

    progressionShellDebug('[TEMP AUDIT] Calling app.render()...');
    app.render({ force: true });
    progressionShellDebug('[TEMP AUDIT] Render called on app');

    // CRITICAL: Bring the shell to front immediately after render.
    // Ensures the chargen window is visible and cannot be hidden behind other windows.
    // Uses setTimeout(0) to defer until after Foundry's render cycle completes.
    // This prevents the intro step from receiving unexpected close signals during animation.
    // Note: Foundry v13+ uses bringToFront() instead of bringToTop()
    await new Promise(resolve => setTimeout(() => {
      try {
        // Prefer v13+ method, fall back to legacy method
        if (typeof app.bringToFront === 'function') {
          app.bringToFront();
        } else if (typeof app.bringToTop === 'function') {
          app.bringToTop();
        }
        swseLogger.debug('[ProgressionShell.open] Shell brought to front after render');
      } catch (err) {
        swseLogger.warn('[ProgressionShell.open] Error bringing shell to front:', err.message);
      }
      resolve();
    }, 0));

    return app;
  }

  constructor(actor, mode = 'chargen', options = {}) {
    // Handle null actor case (e.g., follower mode where actor is created later)
    const title = actor?.name
      ? `Character Progression: ${actor.name}`
      : (options.title || 'Character Progression');

    super({
      title,
      ...options,
    });

    // [DEBUG] Initialize global error capture once
    if (!window._progressionDebugEnabled) {
      window._progressionDebugEnabled = true;
      ProgressionDebugCapture.init();
    }

    this.actor = actor;
    this.mode = mode;
    this._targetStepId = options.currentStep || null;  // Store target step to navigate after init
    this._minStepIndex = null;  // Prevent back-navigation past this index (set when targeting step)

    // ═══ PHASE 1: CANONICAL PROGRESSION SESSION ═══
    // Determine subtype based on mode and options (can be overridden by subclasses)
    const subtype = this._getProgressionSubtype(mode, options);

    // Create canonical session — this is the single source of truth for draft state
    // If initialSession is provided (e.g., from template seeding), use it; otherwise create fresh
    if (options.initialSession) {
      this.progressionSession = options.initialSession;
      swseLogger.log('[ProgressionShell] Using provided initial session', {
        isTemplate: this.progressionSession.isTemplateSession,
        templateId: this.progressionSession.templateId,
      });
    } else {
      this.progressionSession = new ProgressionSession({
        actor,
        mode,
        subtype,
      });
    }

    // Step state
    this.steps = [];                 // StepDescriptor[] — assembled by _initializeSteps()
    this.stepPlugins = new Map();    // stepId → ProgressionStepPlugin instance
    this.currentStepIndex = 0;

    // Selection/focus state
    this.stepData = new Map();       // stepId → step-specific state blob (DEPRECATED: use progressionSession)
    this.focusedItem = null;         // item currently in details panel (single-click)
    this.committedSelections = new Map(); // DEPRECATED: use progressionSession.draftSelections
    this.buildIntent = new BuildIntent(this); // Observable build state (DEPRECATED: becomes read-only view)

    // Persistence state (Phase 8 solution)
    this.persistenceEnabled = mode === 'chargen'; // Auto-persist only during chargen, not levelup
    this.lastCheckpointStepId = null;

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
    if (typeof game !== 'undefined') game.__swseActiveProgressionShell = this;

    // Track last spoken step to prevent redundant auto-speech on every full render
    this._lastSpokenStepId = null;

    // Render loop prevention guard
    this._isRendering = false;
    this._renderCount = 0;

    // Position centering tracking — initialize EARLY so first render knows this is a new open
    this._didStartupCenter = false;
    this._openedAt = Date.now();
    this._centerTimer = null;

    // Embedded mode support (when hosted inside character sheet holopad)
    this._inlineElement = null;

    // Phase 1: Session persistence
    this._registerPersistenceHook();
  }

  /**
   * Get the root DOM element for this shell.
   * In standalone mode: returns this.element (the ApplicationV2 root)
   * In embedded mode: returns this._inlineElement (the holopad surface container)
   * @returns {HTMLElement|null}
   */
  getRootElement() {
    return this._inlineElement ?? this.element ?? null;
  }

  /**
   * Register persistence hook to auto-save session after each commit.
   * Phase 1: Session persistence and recovery.
   * @private
   */
  _registerPersistenceHook() {
    this.progressionSession.onPersist(async (session, stepId, selectionKey) => {
      if (this.actor && this.persistenceEnabled) {
        await SessionStorage.saveSession(this.actor, session, this.mode);
      }
    });
  }

  /**
   * Attempt to recover a saved session.
   * Phase 1: Session persistence and recovery.
   *
   * If a saved session exists, offer user the option to restore it.
   * If they accept: restore selections, repair current step, navigate to last position
   * If they decline or error: proceed with fresh session
   *
   * CRITICAL: Never trust stored indices. After restoring, we still need to:
   * - Recompute active steps (done in _initializeSteps)
   * - Repair current step (done after steps are built)
   *
   * @returns {Promise<void>}
   * @private
   */
  async _attemptSessionRecovery() {
    if (!this.actor || !this.persistenceEnabled) {
      return; // No recovery for levelup mode or missing actor
    }

    try {
      const sessionData = SessionStorage.loadSession(this.actor, this.mode);
      const checkpoint = this.getLastCheckpoint?.() || null;

      if (!sessionData && !checkpoint) {
        swseLogger.debug('[ProgressionShell] No saved session to recover');
        return;
      }

      if (sessionData) {
        const summary = SessionStorage.getSessionSummary(sessionData);
        const shouldRecover = await this._promptSessionRecovery(summary);
        if (shouldRecover) {
          const restored = SessionStorage.restoreIntoSession(this.progressionSession, sessionData);
          if (restored) {
            this._syncLegacyCommittedSelectionsFromSession();
            this._targetStepId = sessionData.currentStepId || sessionData.lastStepId || null;
            swseLogger.log('[ProgressionShell] Session recovered successfully', {
              selections: summary.selectionCount,
              visitedSteps: summary.visitedStepCount,
              lastStep: summary.lastStepId,
            });
            return;
          }
          swseLogger.error('[ProgressionShell] Failed to restore session');
        } else {
          swseLogger.debug('[ProgressionShell] User chose Start Fresh - clearing old session');
          // Clear old session so we start completely fresh
          try {
            await SessionStorage.clearSession(this.actor, this.mode);
          } catch (err) {
            swseLogger.warn('[ProgressionShell] Failed to clear old session:', err);
          }
          // Don't set _targetStepId - let the progression start from the beginning
          return;
        }
      }

      if (checkpoint) {
        const summary = ChargenPersistence.getCheckpointSummary(checkpoint);
        const shouldRecoverCheckpoint = await this._promptSessionRecovery(summary);
        if (!shouldRecoverCheckpoint) {
          swseLogger.debug('[ProgressionShell] User chose Start Fresh - clearing checkpoint');
          // Clear checkpoint so we start completely fresh
          try {
            this.clearCheckpoint?.();
          } catch (err) {
            swseLogger.warn('[ProgressionShell] Failed to clear checkpoint:', err);
          }
          return;
        }

        const restored = this.restoreFromCheckpoint(checkpoint);
        if (restored) {
          this._syncLegacyCommittedSelectionsFromSession();
          this._targetStepId = checkpoint.currentStepId || checkpoint.lastStepId || null;
          swseLogger.log('[ProgressionShell] Checkpoint recovered successfully', {
            lastStep: checkpoint.lastStepId,
          });
        }
      }
    } catch (err) {
      swseLogger.error('[ProgressionShell] Error attempting session recovery:', err);
      // Continue with fresh session on error
    }
  }

  /**
   * Prompt user for session recovery consent.
   * Phase 1: Session persistence and recovery.
   *
   * @param {Object} summary - Session summary from SessionStorage.getSessionSummary
   * @returns {Promise<boolean>} true if user wants to recover
   * @private
   */
  async _promptSessionRecovery(summary) {
    // Use custom SWSE recovery dialog (single-instance guard prevents duplicates)
    return RecoverySessionDialog.prompt(summary);
  }


  _syncLegacyCommittedSelectionsFromSession() {
    if (!this.committedSelections) this.committedSelections = new Map();
    this.committedSelections.clear();

    const draftSelections = this.progressionSession?.draftSelections || {};
    for (const [key, value] of Object.entries(draftSelections)) {
      if (value !== null && value !== undefined) {
        this.committedSelections.set(key, value);
      }
    }
  }

  async _persistSessionSnapshot(currentStepId = null) {
    if (!this.actor || !this.persistenceEnabled || !this.progressionSession) return false;
    try {
      this.progressionSession.currentStepId = currentStepId || this.getCurrentStepId?.() || this.progressionSession.currentStepId || null;
      return await SessionStorage.saveSession(this.actor, this.progressionSession, this.mode);
    } catch (err) {
      swseLogger.warn('[ProgressionShell] Failed to persist session snapshot:', err);
      return false;
    }
  }

  /**
   * Get the progression subtype for this session.
   * Subclasses (chargen-shell, levelup-shell, droid-builder, etc.) can override.
   *
   * @param {string} mode - chargen, levelup, template
   * @param {Object} options - Constructor options
   * @returns {'actor' | 'npc' | 'droid' | 'follower' | 'nonheroic'}
   * @private
   */
  _getProgressionSubtype(mode, options) {
    // Default implementation: can be overridden by subclasses
    if (options.subtype) return options.subtype;
    return 'actor';
  }

  /**
   * Get progression shell theme key (Phase 1 hook for future actor-sheet theme inheritance)
   * @returns {string} Theme key (e.g., 'vapor', 'droid', 'holo', etc.)
   */
  /**
   * Get progression shell theme (Phase 3: actor flags override global settings)
   * Falls back to global client setting if actor flag not set
   * @returns {string} Theme key ('holo' | 'high-contrast' | 'starship' | 'sand-people' | 'jedi' | 'high-republic')
   */
  _getProgressionThemeKey() {
    return ThemeResolutionService.resolveThemeKey(null, { actor: this.actor });
  }

  /**
   * Get progression shell motion style (Phase 3: actor flags override global settings)
   * Falls back to global client setting if actor flag not set
   * @returns {string} Motion style key ('standard' | 'reduced' | 'none')
   */
  _getProgressionMotionStyle() {
    return ThemeResolutionService.resolveMotionStyle(null, { actor: this.actor });
  }

  // ═══ PHASE 4: SHELL-OWNED PRESENTATION HELPERS ═══

  /**
   * Build session label (mode + actor name) for HUD/status readout
   * @returns {string} e.g. "CHARGEN-Theron Shan"
   */
  _buildSessionLabel() {
    if (!this.actor) return 'SESSION';
    const mode = String(this.mode || 'chargen').toUpperCase();
    const name = this.actor.name || 'UNNAMED';
    return `${mode}-${name}`;
  }

  /**
   * Build step meta object for canvas/HUD readout
   * @returns {Object} { ordinal: 1, total: 8, label: "STAGE 01/08" }
   */
  _buildStepMeta() {
    const ordinal = this.currentStepIndex + 1;
    const total = this.steps.length;
    const label = `STAGE ${String(ordinal).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
    return { ordinal, total, label };
  }

  /**
   * Build HUD tag objects (mode, actor name, step meta)
   * @returns {Object} { modeTag, actorTag, stageTag }
   */
  _buildHudTags() {
    const mode = (this.mode || 'chargen').toUpperCase();
    const actor = this.actor?.name || 'UNNAMED';
    const stepMeta = this._buildStepMeta();
    return {
      modeTag: mode,
      actorTag: actor,
      stageTag: stepMeta.label,
    };
  }

  /**
   * Build ability snapshot if actor.system.abilities exists
   * @returns {Object|null} { str, dex, con, int, wis, cha } with base values, or null
   */
  _buildAbilitySnapshot() {
    if (!this.actor?.system?.abilities) return null;
    const ab = this.actor.system.abilities;
    return {
      str: ab.str?.base ?? 10,
      dex: ab.dex?.base ?? 10,
      con: ab.con?.base ?? 10,
      int: ab.int?.base ?? 10,
      wis: ab.wis?.base ?? 10,
      cha: ab.cha?.base ?? 10,
    };
  }

  /**
   * Build selected chips array from committedSelections Map
   * Safe read-only display of already-committed choices
   * @returns {Array} [ { stepId, name, label } ]
   */
  _buildSelectedChips() {
    if (!this.committedSelections || this.committedSelections.size === 0) return [];
    const chips = [];
    for (const [stepId, selection] of this.committedSelections.entries()) {
      if (selection) {
        chips.push({
          stepId,
          name: selection.name || selection.label || 'Selected',
          label: selection.label || selection.name || 'Selected',
        });
      }
    }
    return chips;
  }

  /**
   * Build footer status label from footer data
   * @param {Object} footerData - Footer data from _buildFooterData()
   * @returns {string} e.g. "READY" or "2 picks remaining"
   */
  _buildFooterStatus(footerData) {
    if (!footerData) return 'READY';
    if (footerData.blockingIssues?.length > 0) {
      return 'BLOCKING';
    }
    if (footerData.center?.[0]?.label) {
      return footerData.center[0].label.toUpperCase();
    }
    return 'READY';
  }

  // ═══ AUDIT INSTRUMENTATION + RENDER GUARD ═══
  async render(...args) {
    // Render loop prevention: block recursive render calls during active render
    if (this._isRendering) {
      progressionShellDebug("[ProgressionShell] Render called while already rendering — BLOCKED (loop prevention)");
      return this;
    }

    const buildNodePath = (root, el) => {
      if (!root || !el || root === el) return [];
      const path = [];
      let node = el;
      while (node && node !== root) {
        const parent = node.parentElement;
        if (!parent) return null;
        path.unshift(Array.prototype.indexOf.call(parent.children, node));
        node = parent;
      }
      return node === root ? path : null;
    };

    const resolveNodePath = (root, path) => {
      let node = root;
      for (const index of path || []) {
        node = node?.children?.[index] ?? null;
        if (!node) return null;
      }
      return node;
    };

    const captureScrollPositions = (root) => {
      if (!(root instanceof HTMLElement)) return [];
      const nodes = [root, ...root.querySelectorAll('*')];
      return nodes
        .filter(el => el instanceof HTMLElement)
        .map(el => ({
          el,
          top: el.scrollTop,
          left: el.scrollLeft
        }))
        .filter(snap => snap.top > 0 || snap.left > 0)
        .map(snap => ({
          path: buildNodePath(root, snap.el),
          top: snap.top,
          left: snap.left
        }))
        .filter(snap => Array.isArray(snap.path));
    };

    const restoreScrollPositions = (root, snapshots) => {
      if (!(root instanceof HTMLElement) || !Array.isArray(snapshots) || !snapshots.length) return;
      for (const snap of snapshots) {
        const el = resolveNodePath(root, snap.path);
        if (!(el instanceof HTMLElement)) continue;
        el.scrollTop = snap.top;
        el.scrollLeft = snap.left;
      }
    };

    const renderRoot = this.getRootElement?.() || this._inlineElement || this.element;

    const scrollSnapshots = captureScrollPositions(renderRoot);

    this._isRendering = true;
    this._renderCount++;

    progressionShellDebug(`[ProgressionShell] RENDER START (#${this._renderCount}) position:`, this.position);
    const result = await super.render(...args);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const restoredRoot = this.getRootElement?.() || renderRoot;
    restoreScrollPositions(restoredRoot, scrollSnapshots);
    progressionShellDebug(`[ProgressionShell] RENDER COMPLETE (#${this._renderCount}) position:`, this.position);

    this._isRendering = false;
    return result;
  }

  setPosition(position) {
    // console.log("[ProgressionShell] setPosition CALLED with:", position);
    // console.log("[ProgressionShell] current position before:", this.position);
    const result = super.setPosition(position);
    // console.log("[ProgressionShell] position after setPosition:", this.position);
    return result;
  }

  /**
   * Initialize the first step by calling onStepEnter on the current step plugin.
   * This is critical for post-splash Species entry and any targeted step.
   * @private
   */
  async _initializeFirstStep() {
    const descriptor = this.steps[this.currentStepIndex];
    if (!descriptor) {
      swseLogger.warn('[ProgressionShell] No descriptor at currentStepIndex during first step init');
      return;
    }

    const entered = await this._activateStep(this.currentStepIndex, {
      source: 'initialization',
      showNotification: true,
      notificationMessage: `Failed to initialize step: ${descriptor.stepId}. Try reloading the application.`,
    });

    if (entered) {
      swseLogger.log(`[ProgressionShell] Initialized first step: ${descriptor.stepId}`);
    }
  }

  async _activateStep(stepIndex, options = {}) {
    const {
      source = 'unknown',
      restoreIndex = null,
      showNotification = true,
      notificationMessage = null,
    } = options;

    const descriptor = this.steps[stepIndex];
    if (!descriptor) {
      swseLogger.warn(`[ProgressionShell] Cannot activate missing step at index ${stepIndex} via ${source}`);
      return false;
    }

    const previousIndex = this.currentStepIndex;
    const previousDescriptor = this.steps[previousIndex] ?? null;

    this.currentStepIndex = stepIndex;
    this.focusedItem = null;
    this.progressionSession.currentStepId = descriptor.stepId ?? null;

    const plugin = this.stepPlugins.get(descriptor.stepId);
    if (!plugin) {
      swseLogger.warn(`[ProgressionShell] No plugin found for step ${descriptor.stepId} via ${source}`);
      this.utilityBar.setConfig({ mode: 'minimal' });
      return true;
    }

    try {
      await plugin.onStepEnter(this);

      if (!this.progressionSession.visitedStepIds.includes(descriptor.stepId)) {
        this.progressionSession.visitedStepIds.push(descriptor.stepId);
      }

      this.mentor.currentDialogue = plugin.getMentorContext(this);
      this.mentor.askMentorEnabled = plugin.getMentorMode() !== null;
      this.mentor.mentorMode = plugin.getMentorMode();
      this.utilityBar.setConfig(plugin.getUtilityBarConfig());
      return true;
    } catch (err) {
      swseLogger.error(`[ProgressionShell] Error entering step ${descriptor.stepId} via ${source}:`, err);
      this.lastError = err?.message || String(err);

      const fallbackIndex = Number.isInteger(restoreIndex) ? restoreIndex : previousIndex;
      const hasFallback = fallbackIndex >= 0 && fallbackIndex < this.steps.length;
      if (hasFallback) {
        this.currentStepIndex = fallbackIndex;
        this.progressionSession.currentStepId = this.steps[fallbackIndex]?.stepId ?? null;

        const fallbackPlugin = this.stepPlugins.get(this.steps[fallbackIndex]?.stepId);
        if (fallbackPlugin) {
          try {
            this.mentor.currentDialogue = fallbackPlugin.getMentorContext(this);
            this.mentor.askMentorEnabled = fallbackPlugin.getMentorMode() !== null;
            this.mentor.mentorMode = fallbackPlugin.getMentorMode();
            this.utilityBar.setConfig(fallbackPlugin.getUtilityBarConfig());
          } catch (fallbackErr) {
            swseLogger.warn('[ProgressionShell] Failed to restore fallback step state after activation error', {
              attemptedStep: descriptor.stepId,
              fallbackStep: this.steps[fallbackIndex]?.stepId ?? null,
              error: fallbackErr?.message || String(fallbackErr),
            });
          }
        }
      } else if (previousDescriptor) {
        this.currentStepIndex = previousIndex;
        this.progressionSession.currentStepId = previousDescriptor.stepId ?? null;
      }

      if (showNotification) {
        ui?.notifications?.error?.(
          notificationMessage
          || `Failed to load ${descriptor?.label || descriptor?.stepId}. Returning to previous step.`
        );
      }
      return false;
    }
  }

  /**
   * Initialize mentor state with Ol' Salty portrait loaded from mentor data.
   * Applies portrait path resolution to handle webp fallbacks.
   * @private
   */
  _initializeMentorState() {
    const olSaltyData = resolveMentorData('Scoundrel') || {};
    const portraitPath = olSaltyData.portrait || resolveMentorPortraitPath('systems/foundryvtt-swse/assets/mentors/salty.png');

    this.mentor = {
      id: 'ol-salty',
      mentorId: 'ol-salty',
      name: olSaltyData.name || "Ol' Salty",
      title: olSaltyData.title || 'Seasoned Spacer',
      portrait: portraitPath,
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
    try {
      // Call seedSession() on the subtype adapter once per session.
      // Must run before step resolution so contributeActiveSteps() can read seeded context.
      if (!this.progressionSession._sessionSeeded) {
        const adapter = this.progressionSession?.subtypeAdapter;
        if (adapter?.seedSession) {
          try {
            await adapter.seedSession(this.progressionSession, this.actor, this.mode);
            this.progressionSession._sessionSeeded = true;
          } catch (seedErr) {
            swseLogger.warn('[ProgressionShell] Adapter seedSession failed (non-fatal):', seedErr.message);
          }
        } else {
          this.progressionSession._sessionSeeded = true;
        }
      }

      // PHASE 2: _getCanonicalDescriptors may be async (ActiveStepComputer in chargen/levelup shells)
      const canonicalDescriptorsOrPromise = this._getCanonicalDescriptors();
      const canonicalDescriptors = canonicalDescriptorsOrPromise instanceof Promise
        ? await canonicalDescriptorsOrPromise
        : canonicalDescriptorsOrPromise;

      // PHASE C: Pass shell context so resolver can check committedSelections for deferred droid builds
      const conditionalDescriptors = await this._conditionalResolver.resolveForContext(
        this.actor,
        this.mode,
        { shell: this }  // Pass shell context for state inspection
      );

      // Merge: canonical steps in order, then insert conditional steps at correct positions
      const allDescriptors = this._mergeStepSequence(canonicalDescriptors, conditionalDescriptors);

      // Filter hidden steps (category steps with no choices available)
      this.steps = allDescriptors.filter(d => !d.isHidden);

      // Phase 8: Validate steps array is not empty (Invariant 2)
      if (!this.steps || this.steps.length === 0) {
        swseLogger.error('[ProgressionShell] CRITICAL: Steps array is empty after initialization');
        ui?.notifications?.error?.(
          'No progression steps available. The application cannot proceed. Try reloading.'
        );
        throw new Error('EMPTY_STEPS_ARRAY');
      }

      // Instantiate step plugins for all non-null plugin classes
      this.stepPlugins.clear();
      for (const descriptor of this.steps) {
        if (descriptor.pluginClass) {
          try {
            this.stepPlugins.set(descriptor.stepId, new descriptor.pluginClass(descriptor));
          } catch (pluginErr) {
            swseLogger.error(
              `[ProgressionShell] Failed to instantiate plugin for step ${descriptor.stepId}:`,
              pluginErr
            );
            // Continue without this plugin — it will be detected in _prepareContext
          }
        }
      }

      // Navigate to target step if specified (e.g., from splash: currentStep: 'species')
      if (this._targetStepId) {
        const targetIndex = this.steps.findIndex(d => d.stepId === this._targetStepId);
        if (targetIndex >= 0) {
          this.currentStepIndex = targetIndex;
          swseLogger.log(`[ProgressionShell] Restored target step: ${this._targetStepId} (index ${targetIndex}). Back-navigation remains available to earlier active steps.`);
        } else {
          swseLogger.warn(`[ProgressionShell] Target step not found: ${this._targetStepId}. Using index 0.`);
          // Phase 1: Repair current step if target was restored but no longer active
          this._repairCurrentStep();
        }
        this._targetStepId = null; // Clear after use
      }

      // Phase 1: Repair current step if it's invalid (e.g., after session recovery and rail changes)
      this._repairCurrentStep();
      this.progressionSession.currentStepId = this.steps[this.currentStepIndex]?.stepId ?? null;
      this._syncLegacyCommittedSelectionsFromSession();

      // Initialize utility bar config for the current step
      const currentPlugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
      if (currentPlugin) this.utilityBar.setConfig(currentPlugin.getUtilityBarConfig());

      swseLogger.debug('ProgressionShell._initializeSteps', {
        mode: this.mode,
        stepCount: this.steps.length,
        steps: this.steps.map(d => d.stepId),
        currentStepId: this.steps[this.currentStepIndex]?.stepId,
        pluginCount: this.stepPlugins.size,
      });
    } catch (err) {
      swseLogger.error('[ProgressionShell] Critical error during step initialization:', err);
      // Re-throw so the caller (ProgressionShell.open) can handle it
      throw err;
    }
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
   * PHASE C: Final droid configuration steps are inserted right before summary.
   *
   * @param {StepDescriptor[]} canonical
   * @param {StepDescriptor[]} conditional
   * @returns {StepDescriptor[]}
   */
  _mergeStepSequence(canonical, conditional) {
    if (conditional.length === 0) return [...canonical];

    // PHASE C: Separate final-droid-configuration from other conditional steps
    const finalDroidSteps = conditional.filter(d => d.stepId === 'final-droid-configuration');
    const otherConditionalSteps = conditional.filter(d => d.stepId !== 'final-droid-configuration');

    // Find the insertion point for normal conditional steps: before 'confirm' step
    const confirmIndex = canonical.findIndex(d => d.stepId === 'confirm');
    const insertAtNormal = confirmIndex >= 0 ? confirmIndex : canonical.length;

    // Find the insertion point for final-droid-configuration: before 'summary'
    const summaryIndex = canonical.findIndex(d => d.stepId === 'summary');
    const insertAtFinal = summaryIndex >= 0 ? summaryIndex : canonical.length;

    // Build the merged sequence
    const merged = [
      ...canonical.slice(0, insertAtFinal),
      ...finalDroidSteps,  // Insert final droid step right before summary
      ...canonical.slice(insertAtFinal, insertAtNormal),
      ...otherConditionalSteps,  // Insert other conditional steps before confirm
      ...canonical.slice(insertAtNormal),
    ];

    return merged;
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
    // [DEBUG] Render cycle tracking
    const renderNum = ProgressionDebugCapture.nextRenderCycle();
    ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] _prepareContext START`, {
      step: this.steps[this.currentStepIndex]?.stepId,
      focusedItem_id: this.focusedItem?.id ?? '(null)',
      focusedItem_name: this.focusedItem?.name ?? '(null)',
    });

    ProgressionDebugCapture.updateState(this);

    const context = await super._prepareContext(options);

    // PHASE 4: Apply rollout configuration to shell
    // This sets feature gates, UI visibility, debug tools, etc. based on world settings
    RolloutController.configureShell(this);

    // Theme/motion for shared datapad presentation.
    // Resolved through the same authority used by v2 sheets and secondary surfaces.
    Object.assign(context, ThemeResolutionService.buildSurfaceContext({ actor: this.actor }));

    // ✓ PHASE 4: Build shell-owned presentation data for HUD/manifest/canvas enrichment
    context.sessionLabel = this._buildSessionLabel();
    context.hudTags = this._buildHudTags();
    context.stepMeta = this._buildStepMeta();
    context.abilitySnapshot = this._buildAbilitySnapshot();
    context.selectedChips = this._buildSelectedChips();

    // ✓ CRITICAL: Expose shell context to step plugins
    // This allows steps to access committedSelections, actor, mode, and buildIntent
    // Required for suggestion engine to see chargen choices
    context.shell = this;
    context.actor = this.actor;
    context.mode = this.mode;
    context.buildIntent = this.buildIntent;
    context.focusedItem = this.focusedItem;  // ✓ FIX: Pass focusedItem to getStepData so details panel hydrates

    // [DEBUG] Log context state
    ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] Context focusedItem set`, {
      focusedItem_id: context.focusedItem?.id ?? '(null)',
      focusedItem_keys: context.focusedItem ? Object.keys(context.focusedItem).slice(0, 6) : [],
    });

    // ═══ PHASE 8: HYDRATION DIAGNOSTICS ═══
    const diagnostics = new HydrationDiagnosticsCollector({
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
    });

    const currentDescriptor = this.steps[this.currentStepIndex];
    const currentPlugin = currentDescriptor
      ? this.stepPlugins.get(currentDescriptor.stepId)
      : null;

    // Rule 8.1: Detect missing step descriptor
    if (!currentDescriptor) {
      diagnostics.detectMissingDescriptor(this.currentStepIndex, this.steps);
      // Recovery: fallback to first step
      if (!HydrationRecoveryStrategies.fallbackToFirstStep(this, diagnostics)) {
        diagnostics.add(
          'error',
          'RECOVERY_FAILED',
          'Cannot recover from missing step descriptor',
          'Application cannot proceed. Reload required.',
          {}
        );
      }
    }

    // Rule 8.2: Detect missing plugin
    if (currentDescriptor && !currentPlugin) {
      diagnostics.detectMissingPlugin(currentDescriptor.stepId, this.stepPlugins);
      // Recovery: skip plugin, show details panel as null
    }

    // Step progress for progress rail — derived from canonical status evaluator
    const stepProgress = this.steps.map((descriptor, idx) => {
      const status = this._evaluateStepStatus(descriptor.stepId, idx);
      return {
        descriptor,
        index: idx,
        // Canonical status (error > caution > complete > in_progress > neutral)
        status: status.canonical,
        isComplete: status.canonical === 'complete',
        isError: status.canonical === 'error',
        isCaution: status.canonical === 'caution',
        isInProgress: status.canonical === 'in_progress',
        isNeutral: status.canonical === 'neutral',
        // Navigation
        isCurrent: idx === this.currentStepIndex,
        isConditional: descriptor.isConditional,
        canNavigate: idx < this.currentStepIndex, // Can go back to completed steps
        // Metadata
        isVisited: status.isVisited,
        errors: status.errors || [],
        warnings: status.warnings || [],
        remainingChoices: status.remainingChoices || [],
      };
    });

    // Transform stepProgress for stepper component (label, active, done)
    const stepsTrans = stepProgress.map(step => ({
      label: step.descriptor.label,
      active: step.isCurrent,
      done: step.isComplete,
    }));

    // Step data from plugin
    const stepData = currentPlugin
      ? await currentPlugin.getStepData(context).catch(() => ({}))
      : {};

    // Rule 8.4: Detect invalid step data
    diagnostics.detectInvalidStepData(currentDescriptor?.stepId ?? 'unknown', stepData);

    // Render work surface
    let workSurfaceSpec = null;
    let workSurfaceHtml = null;
    try {
      workSurfaceSpec = currentPlugin?.renderWorkSurface?.(stepData) ?? null;
      workSurfaceHtml = workSurfaceSpec?.template
        ? await foundry.applications.handlebars.renderTemplate(workSurfaceSpec.template, workSurfaceSpec.data)
        : null;
    } catch (error) {
      console.error('[ProgressionShell] Work surface render failed, falling back to error surface:', error);
      workSurfaceHtml = await foundry.applications.handlebars.renderTemplate(
        'systems/foundryvtt-swse/templates/apps/progression-framework/steps/step-error-surface.hbs',
        {
          stepLabel: currentDescriptor?.label || currentDescriptor?.stepId || 'Current Step',
          errorMessage: error?.message || 'This step could not be rendered.',
          canContinue: currentPlugin?.getBlockingIssues?.()?.length === 0,
        }
      );
    }

    // Rule 8.3: Detect blank template
    if (!workSurfaceHtml) {
      diagnostics.detectBlankTemplate(currentDescriptor?.stepId ?? 'unknown', workSurfaceHtml);
      workSurfaceHtml = await foundry.applications.handlebars.renderTemplate(
        'systems/foundryvtt-swse/templates/apps/progression-framework/steps/step-error-surface.hbs',
        {
          stepLabel: currentDescriptor?.label || currentDescriptor?.stepId || 'Current Step',
          errorMessage: 'This step returned no content. You can go back and try again.',
          canContinue: currentPlugin?.getBlockingIssues?.()?.length === 0,
        }
      );
    }

    diagnostics.detectSpeciesRowsMissingIds(currentDescriptor?.stepId, workSurfaceHtml);

    // Footer data
    const isLastStep = this.currentStepIndex === this.steps.length - 1;
    const footerData = this._buildFooterData(currentPlugin, isLastStep);

    // Utility bar config
    const utilityBarConfig = currentPlugin?.getUtilityBarConfig() ?? { mode: 'minimal' };

    // Details panel
    ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] Calling renderDetailsPanel()`, {
      plugin: currentPlugin?.constructor?.name ?? '(null)',
      focusedItem_id: this.focusedItem?.id ?? '(null)',
    });

    let detailsPanelSpec = { template: null, data: {} };
    try {
      detailsPanelSpec = await currentPlugin?.renderDetailsPanel(this.focusedItem, this)
        ?? { template: null, data: {} };
    } catch (error) {
      console.error('[ProgressionShell] Details rail render failed, falling back to empty state:', error);
      detailsPanelSpec = {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
        data: {
          title: 'Details unavailable',
          body: 'This selection could not be rendered. You can still change steps or double-click to commit where supported.'
        }
      };
    }

    // [DEBUG] Log template spec
    ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] renderDetailsPanel() returned`, {
      has_template: !!detailsPanelSpec?.template,
      template_path: detailsPanelSpec?.template?.split('/').pop() ?? '(null)',
      data_keys: detailsPanelSpec?.data ? Object.keys(detailsPanelSpec.data).slice(0, 8) : [],
    });

    const detailsPanelHtml = detailsPanelSpec?.template
      ? await foundry.applications.handlebars.renderTemplate(detailsPanelSpec.template, detailsPanelSpec.data)
      : null;

    // [DEBUG] Log HTML result
    ProgressionDebugCapture.log('Progression Debug', `[Render #${renderNum}] Template HTML rendered`, {
      html_length: detailsPanelHtml?.length ?? 0,
      has_species_details: detailsPanelHtml?.includes?.('prog-species-details') ?? false,
      has_empty_state: detailsPanelHtml?.includes?.('prog-details-empty') ?? false,
      focusedItem_name_in_html: this.focusedItem?.name ? detailsPanelHtml?.includes?.(this.focusedItem.name) : 'N/A',
    });

    // [DEBUG] State drift check
    ProgressionDebugCapture.detectStateDrift(
      !detailsPanelHtml && this.focusedItem,
      'Details panel HTML is null/empty but focusedItem exists',
      { focusedItem: this.focusedItem?.name }
    );

    // Species-specific: Detect details panel hydration failure
    diagnostics.detectSpeciesDetailsPanelFailure(currentDescriptor?.stepId, this.focusedItem, detailsPanelHtml);

    // Summary panel (left column — build snapshot)
    // REFACTOR: Now uses canonical SelectedRailContext instead of per-step renderSummaryPanel
    // FIXED: Now properly awaits async buildSnapshot to include adapter contributions
    const selectedRailContext = await SelectedRailContext.buildSnapshot(this, currentDescriptor?.stepId ?? null);
    let summaryPanelHtml = null;
    try {
      summaryPanelHtml = selectedRailContext && selectedRailContext.snapshotSections.length > 0
        ? await foundry.applications.handlebars.renderTemplate(
            'systems/foundryvtt-swse/templates/apps/progression-framework/summary-panel/selected-rail.hbs',
            selectedRailContext
          )
        : null;
    } catch (error) {
      console.error('[ProgressionShell] Summary rail render failed, falling back to blank rail:', error);
      summaryPanelHtml = null;
    }

    // ── DEBUG: shell region ownership verification ──
    const isIntroMode = currentDescriptor?.stepId === 'intro';
    progressionShellDebug('[ProgressionShell] active step =', currentDescriptor?.stepId);
    progressionShellDebug('[ProgressionShell] isIntroMode =', isIntroMode);
    progressionShellDebug('[ProgressionShell] workSurfaceHtml payload =', workSurfaceHtml?.slice?.(0, 120) ?? '(null)');
    progressionShellDebug('[ProgressionShell] detailsPanelHtml payload =', detailsPanelHtml?.slice?.(0, 120) ?? '(null)');
    progressionShellDebug('[ProgressionShell] summaryPanelHtml payload =', summaryPanelHtml?.slice?.(0, 120) ?? '(null)');
    // ── END DEBUG ──

    // Phase 8: Log hydration diagnostics
    diagnostics.logToConsole();

    // Render parts (mentor rail, progress rail, utility bar) by rendering their templates
    const partsHtml = {};

    // Render mentor-rail template with mentor and collapse state
    if (this.mentorRail) {
      try {
        // [DEBUG] Translation bootstrap tracking
        progressionShellDebug('[SWSE Translation Debug] [_prepareContext] Rendering mentor-rail template with mentor state:', {
          currentDialogue: this.mentor.currentDialogue ?? '(empty)',
          currentDialogue_length: this.mentor.currentDialogue?.length ?? 0,
          isAnimating: this.mentor.isAnimating,
          animationState: this.mentor.animationState,
          renderNum,
        });

        partsHtml.mentorRail = await foundry.applications.handlebars.renderTemplate(
          'systems/foundryvtt-swse/templates/apps/progression-framework/mentor-rail.hbs',
          {
            mentor: this.mentor,
            mentorCollapsed: this.mentorCollapsed,
          }
        );

        // [DEBUG] Log template result
        progressionShellDebug('[SWSE Translation Debug] [_prepareContext] mentor-rail template rendered:', {
          html_includes_fallback: partsHtml.mentorRail?.includes?.('Awaiting your decision') ?? false,
          html_includes_currentDialogue: partsHtml.mentorRail?.includes?.(this.mentor.currentDialogue) ?? false,
          html_length: partsHtml.mentorRail?.length ?? 0,
          renderNum,
        });
      } catch (err) {
        console.error('[ProgressionShell] Failed to render mentor-rail:', err);
        partsHtml.mentorRail = null;
      }
    } else {
      partsHtml.mentorRail = null;
    }

    // Render progress-rail template with step progress data
    if (this.progressRail) {
      try {
        partsHtml.progressRail = await foundry.applications.handlebars.renderTemplate(
          'systems/foundryvtt-swse/templates/apps/progression-framework/progress-rail.hbs',
          { stepProgress }
        );
      } catch (err) {
        console.error('[ProgressionShell] Failed to render progress-rail:', err);
        partsHtml.progressRail = null;
      }
    } else {
      partsHtml.progressRail = null;
    }

    // Render utility-bar template with config and state
    if (this.utilityBar) {
      try {
        partsHtml.utilityBar = await foundry.applications.handlebars.renderTemplate(
          'systems/foundryvtt-swse/templates/apps/progression-framework/utility-bar.hbs',
          {
            currentDescriptor,
            utilityBarConfig,
            utilityBarCollapsed: this.utilityBarCollapsed,
          }
        );
      } catch (err) {
        console.error('[ProgressionShell] Failed to render utility-bar:', err);
        partsHtml.utilityBar = null;
      }
    } else {
      partsHtml.utilityBar = null;
    }

    // Foundry V13 can provide Document instances on the base context (including
    // context.actor). mergeObject mutates nested targets, which can recurse into
    // a live Actor document and attempt to assign read-only document fields such
    // as _id. Build the progression view model as a plain object overlay instead.
    return {
      ...context,
      // Shell identity
      mode: this.mode,
      actor: this.actor.toObject(),

      // Step state
      steps: this.steps,
      currentDescriptor,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      stepProgress,
      stepsTrans,

      // ─ PHASE 1 UX: Step context (you-are-here clarity)
      stepContext: {
        currentStepNumber: this.currentStepIndex + 1,  // 1-indexed for display
        totalSteps: this.steps.length,
        isFirstStep: this.currentStepIndex === 0,
        isLastStep: this.currentStepIndex === this.steps.length - 1,
        displayText: `Step ${this.currentStepIndex + 1} of ${this.steps.length}`,
      },

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
      footerStatus: this._buildFooterStatus(footerData),

      // Step chips for footer: visible (non-hidden) steps with canonical status
      visibleSteps: this.steps
        .filter(d => !d.hidden)
        .map((descriptor, chipIdx) => {
          const realIdx    = this.steps.indexOf(descriptor);
          const isCurrent  = realIdx === this.currentStepIndex;
          const status     = this._evaluateStepStatus(descriptor.stepId, realIdx);
          const isComplete = status.canonical === 'complete';
          const isError    = status.canonical === 'error';
          const isCaution  = status.canonical === 'caution';
          const isInProgress = status.canonical === 'in_progress';
          const isNeutral  = status.canonical === 'neutral';
          const isLocked   = realIdx > this.currentStepIndex && !isComplete;
          const plugin     = this.stepPlugins.get(descriptor.stepId);
          const hasWarning = !isCurrent && (plugin?.getWarnings?.()?.length ?? 0) > 0;
          return {
            id:          descriptor.stepId,
            index:       chipIdx + 1,       // 1-based display number
            label:       descriptor.label,
            isCurrent,
            isComplete,
            isError,
            isCaution,
            isInProgress,
            isNeutral,
            isLocked,
            isWarning:   hasWarning || isCaution,
            canNavigate: isCurrent || realIdx < this.currentStepIndex,
            status:      status.canonical,
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

      // Phase 8: Hydration diagnostics
      diagnostics: diagnostics.formatUI(),
      diagnosticsFull: diagnostics.toJSON(),

      // Rendered parts (mentor, progress, utility)
      parts: partsHtml,
    };
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
    if (!this._didStartupCenter) {
      centerApplicationDuringStartup(this, { width: 1000, height: 750 });
      this._didStartupCenter = true;
    }

    await super._onRender(context, options);

    // Phase 4: Mobile touch safety handlers
    const html = this.getRootElement();
    if (!html) {
      swseLogger.warn('[ProgressionShell._onRender] No root element available (not yet rendered?)');
      return;
    }

    this._activateTouchSafety(html);

    // Wire subsystem after-render hooks
    this.mentorRail.afterRender(html.querySelector('[data-region="mentor-rail"]'));
    this.progressRail.afterRender(html.querySelector('[data-region="progress-rail"]'));
    this.utilityBar.afterRender(html.querySelector('[data-region="utility-bar"]'));

    // Notify current step plugin that render completed BEFORE mentor speech.
    // This keeps detail hydration, click handlers, and selection state responsive
    // while the mentor animation is still playing.
    const descriptor = this.steps[this.currentStepIndex];
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

        // Wire delegated action handling for step-specific actions
        // This allows plugins to define step-specific actions via handleAction() method
        this._wirePluginActions(html, plugin);
      }
    }

    // Auto-speak only on actual step change — NOT on every full render.
    // IMPORTANT: do not await this animation path. Blocking here prevents
    // the player from clicking items or seeing hydrated details until the
    // mentor finishes talking.
    if (descriptor && descriptor.stepId !== this._lastSpokenStepId) {
      this._lastSpokenStepId = descriptor.stepId;
      void this.mentorRail.speakForStep(descriptor)
        .catch(err => {
          swseLogger.error('ProgressionShell: mentorRail.speakForStep failed', { err });
        });
    }
  }

  // ---------------------------------------------------------------------------
  // Delegated Action Handling
  // ---------------------------------------------------------------------------

  /**
   * Wire up delegated action handling for the current step plugin.
   * Allows plugins to define step-specific actions via handleAction() method.
   * This supports skill-train, skill-untrain, skill-reset and other step-specific actions.
   *
   * @param {HTMLElement} html - The rendered shell root
   * @param {Object} plugin - The current step plugin
   * @private
   */
  _wirePluginActions(html, plugin) {
    if (!html || typeof plugin?.handleAction !== 'function') return;

    // Clean up old listeners if they exist
    if (this._pluginActionAbort) {
      this._pluginActionAbort.abort();
    }
    this._pluginActionAbort = new AbortController();

    // Delegate click events on [data-action] elements to the plugin's handleAction
    html.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      if (!action) return;

      // Actions declared in the ApplicationV2 action map are routed through the shell first.
      // Do not also dispatch them here, or plugin handlers such as accordions/survey buttons
      // can fire twice on a single click.
      if (this.constructor?.DEFAULT_OPTIONS?.actions?.[action]) return;

      try {
        const handled = await plugin.handleAction(action, event, target, this);
        if (handled === true) {
          // Plugin handled the action
        }
      } catch (err) {
        swseLogger.error(`[ProgressionShell] Plugin action "${action}" failed:`, err);
      }
    }, { signal: this._pluginActionAbort.signal });
  }

  // ---------------------------------------------------------------------------
  // Phase 4: Mobile Touch Safety
  // ---------------------------------------------------------------------------

  /**
   * Activate touch-safe event handlers for mobile mode.
   * Ensures interactive elements respond predictably to touch events.
   *
   * @param {HTMLElement} element - The rendered shell element
   * @private
   */
  _activateTouchSafety(element) {
    if (!game?.swse?.ui?.mobileMode?.enabled) return;

    // Add touch-active class to action buttons while being tapped
    // Provides visual feedback for touch interactions
    element.querySelectorAll('[data-action], button, [role="button"]').forEach(el => {
      el.addEventListener('touchstart', () => {
        el.classList.add('touch-active');
      }, { passive: true });

      el.addEventListener('touchend', () => {
        el.classList.remove('touch-active');
      }, { passive: true });
    });
  }

  // ---------------------------------------------------------------------------
  // Projection Lifecycle — rebuild after selection changes
  // ---------------------------------------------------------------------------

  /**
   * Rebuild the projection from current progression session state.
   * Called after selections are committed to ensure selected rail shows up-to-date data.
   *
   * @private
   */
  _rebuildProjection() {
    try {
      if (!this.progressionSession) return;

      const projection = ProjectionEngine.buildProjection(this.progressionSession, this.actor);
      this.progressionSession.currentProjection = projection;

      swseLogger.debug('[ProgressionShell] Projection rebuilt after selection change');
    } catch (err) {
      swseLogger.error('[ProgressionShell] Error rebuilding projection:', err);
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
  async navigateToStep(stepIndex, { source = 'unknown' } = {}) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;
    if (stepIndex >= this.currentStepIndex) return; // forward nav blocked

    const currentDescriptor = this.steps[this.currentStepIndex];
    const currentPlugin = currentDescriptor ? this.stepPlugins.get(currentDescriptor.stepId) : null;
    if (currentPlugin?.onStepExit) {
      await currentPlugin.onStepExit(this, { direction: 'backward', source }).catch(err => {
        swseLogger.warn('[ProgressionShell] Step exit failed before backward jump; preserving navigation', {
          stepId: currentDescriptor?.stepId || null,
          error: err?.message || String(err),
        });
      });
    }

    const entered = await this._activateStep(stepIndex, { source, restoreIndex: this.currentStepIndex });
    if (!entered) return;

    void this._persistSessionSnapshot(this.progressionSession.currentStepId);
    this.render();
  }

  /**
   * Find the next applicable step after the given index.
   * Skips non-applicable steps (those not in the current step list).
   * @param {number} startIndex - Index to start searching from
   * @returns {number} Index of next applicable step, or -1 if none
   * @private
   */
  _findNextApplicableStep(startIndex) {
    for (let i = startIndex; i < this.steps.length; i++) {
      // All steps in this.steps array are applicable (filtered during initialization)
      // So any step we find is applicable
      return i;
    }
    return -1;
  }

  /**
   * Find the previous applicable step before the given index.
   * Respects minimum step boundary.
   * @param {number} startIndex - Index to start searching from
   * @param {number} minIndex - Minimum allowed index
   * @returns {number} Index of previous applicable step, or -1 if none
   * @private
   */
  _findPreviousApplicableStep(startIndex, minIndex) {
    for (let i = startIndex; i >= minIndex; i--) {
      // All steps in this.steps array are applicable
      return i;
    }
    return -1;
  }

  /**
   * Get the next active step ID after the given step.
   * Returns null if current step is the last active step.
   * @param {string} currentStepId - Current step ID
   * @returns {string|null} Next step ID, or null if at end
   */
  getNextActiveStepId(currentStepId) {
    const currentIdx = this.steps.findIndex(s => s.stepId === currentStepId);
    if (currentIdx < 0 || currentIdx >= this.steps.length - 1) {
      return null;
    }
    return this.steps[currentIdx + 1]?.stepId ?? null;
  }

  /**
   * Get the previous active step ID before the given step.
   * Returns null if current step is the first active step.
   * @param {string} currentStepId - Current step ID
   * @returns {string|null} Previous step ID, or null if at beginning
   */
  getPreviousActiveStepId(currentStepId) {
    const currentIdx = this.steps.findIndex(s => s.stepId === currentStepId);
    if (currentIdx <= 0) {
      return null;
    }
    return this.steps[currentIdx - 1]?.stepId ?? null;
  }

  /**
   * Check if forward navigation is allowed from the given step.
   * Blocks only on error-level issues, allows warnings/caution.
   * @param {string} stepId - Step to check
   * @returns {boolean} true if can navigate forward
   */
  canNavigateForward(stepId) {
    const plugin = this.stepPlugins.get(stepId);
    if (!plugin) {
      return false;
    }

    // Only errors block forward navigation
    // Warnings/caution allow progress
    const blockingIssues = plugin.getBlockingIssues?.() ?? [];
    return blockingIssues.length === 0;
  }

  /**
   * Check if backward navigation is allowed from the given step.
   * Backward navigation is always allowed (no validation blocking).
   * @param {string} stepId - Step to check
   * @returns {boolean} true if can navigate backward (always true unless at start)
   */
  canNavigateBackward(stepId) {
    const currentIdx = this.steps.findIndex(s => s.stepId === stepId);
    // Can always go back unless at the beginning
    return currentIdx > 0;
  }

  /**
   * Get the current step ID.
   * @returns {string|null} Current step ID, or null if no current step
   */
  getCurrentStepId() {
    return this.steps[this.currentStepIndex]?.stepId ?? null;
  }

  /**
   * Get the index of a step by ID.
   * @param {string} stepId - Step ID
   * @returns {number} Index, or -1 if not found
   */
  getStepIndex(stepId) {
    return this.steps.findIndex(s => s.stepId === stepId);
  }

  /**
   * Repair current step if it's no longer valid.
   * Called when active steps change (mid-session unlock/lock).
   * Ensures currentStepIndex always points to a valid active step.
   * @returns {boolean} true if repair was needed, false if no repair needed
   * @private
   */
  _repairCurrentStep() {
    const currentStepId = this.getCurrentStepId();

    // If current step still exists, no repair needed
    if (currentStepId && this.getStepIndex(currentStepId) >= 0) {
      return false;
    }

    // Current step is gone — find a valid replacement
    let newIndex = -1;

    // Try next active step
    if (this.currentStepIndex < this.steps.length) {
      newIndex = this.currentStepIndex;
    }
    // Try previous active step
    else if (this.currentStepIndex > 0) {
      newIndex = this.currentStepIndex - 1;
    }
    // Fallback to first active step (should always exist)
    else if (this.steps.length > 0) {
      newIndex = 0;
    }

    if (newIndex >= 0) {
      swseLogger.warn(
        `[ProgressionShell] Current step became invalid; repairing to ${this.steps[newIndex]?.stepId}`,
        { previousStepId: currentStepId, newStepId: this.steps[newIndex]?.stepId }
      );
      this.currentStepIndex = newIndex;
      return true;
    }

    // No valid step found (should not happen)
    swseLogger.error('[ProgressionShell] Cannot repair current step — no valid active steps!');
    this.currentStepIndex = 0;
    return true;
  }

  /**
   * Evaluate canonical status for a step.
   * Status is determined by: visited, completion, validation, staleness.
   *
   * Canonical states (in precedence order):
   * - error: has blocking issues
   * - caution: has warnings or is stale
   * - complete: visited, no remaining choices, no issues
   * - in_progress: visited, but still has required choices
   * - neutral: visible but not yet visited
   *
   * @param {string} stepId - Step ID to evaluate
   * @param {number} stepIndex - Current index of step in this.steps
   * @returns {Object} Status object with canonical properties
   * @private
   */
  _evaluateStepStatus(stepId, stepIndex) {
    const descriptor = this.steps[stepIndex];
    const plugin = this.stepPlugins.get(stepId);
    const isVisible = stepIndex < this.steps.length;
    const isVisited = this.progressionSession.visitedStepIds.includes(stepId);
    const isCurrent = stepIndex === this.currentStepIndex;
    const hasSelection = this.committedSelections.has(stepId);

    // Only visited steps can have completion/error/caution status
    if (!isVisible) {
      return { canonical: 'absent', isVisible: false, isVisited, isCurrent, hasSelection };
    }

    if (!isVisited) {
      return { canonical: 'neutral', isVisible, isVisited, isCurrent, hasSelection };
    }

    // Visited step — evaluate completion + validity
    const validation = plugin?.validate?.() ?? { isValid: true, errors: [], warnings: [] };
    const blockingIssues = plugin?.getBlockingIssues?.() ?? [];
    const warnings = plugin?.getWarnings?.() ?? [];
    const remainingChoices = plugin?.getRemainingPicks?.() ?? [];

    const hasErrors = blockingIssues.length > 0 || validation.errors?.length > 0;
    const hasWarnings = warnings.length > 0 || validation.warnings?.length > 0;
    const isStale = this.progressionSession.invalidatedStepIds.includes(stepId);
    const hasRequiredChoices = remainingChoices.length > 0;

    // State precedence: error > caution > complete > in_progress > neutral
    if (hasErrors) {
      return {
        canonical: 'error',
        isVisible,
        isVisited,
        isCurrent,
        hasSelection,
        errors: blockingIssues.length > 0 ? blockingIssues : validation.errors,
      };
    }

    if (hasWarnings || isStale) {
      return {
        canonical: 'caution',
        isVisible,
        isVisited,
        isCurrent,
        hasSelection,
        warnings: warnings.length > 0 ? warnings : validation.warnings,
        isStale,
      };
    }

    if (isVisited && hasSelection && !hasRequiredChoices && !hasErrors) {
      return {
        canonical: 'complete',
        isVisible,
        isVisited,
        isCurrent,
        hasSelection,
      };
    }

    if (isVisited && hasRequiredChoices) {
      return {
        canonical: 'in_progress',
        isVisible,
        isVisited,
        isCurrent,
        hasSelection,
        remainingChoices,
      };
    }

    // Fallback: visited but no data and no required choices (empty optional step)
    return {
      canonical: 'complete',
      isVisible,
      isVisited,
      isCurrent,
      hasSelection,
    };
  }

  async _onStartOver(event, target) {
    event?.preventDefault?.();
    if (this.isProcessing) return;

    let confirmed = true;
    try {
      if (typeof globalThis.Dialog?.confirm === 'function') {
        confirmed = await globalThis.Dialog.confirm({
          title: 'Start Character Creation Over?',
          content: '<p>This clears the current draft choices and returns to the first chargen step. The actor is not finalized until you confirm at the end.</p>',
          yes: () => true,
          no: () => false,
          defaultYes: false,
        });
      } else if (globalThis.window?.confirm) {
        confirmed = window.confirm('Start character creation over and clear current draft choices?');
      }
    } catch (_err) {
      confirmed = true;
    }

    if (!confirmed) return;

    const subtype = this._getProgressionSubtype(this.mode, {});
    this.progressionSession = new ProgressionSession({
      actor: this.actor,
      mode: this.mode,
      subtype,
    });
    this._registerPersistenceHook();
    this.stepData = new Map();
    this.focusedItem = null;
    this.committedSelections = new Map();
    this.buildIntent = new BuildIntent(this);
    this.currentStepIndex = 0;

    try {
      await SessionStorage.clearSession(this.actor, this.mode);
    } catch (err) {
      swseLogger.debug('[ProgressionShell] Could not clear saved session during start-over', { error: err?.message || String(err) });
    }

    await this._initializeSteps();
    await this._initializeFirstStep();
    void this._persistSessionSnapshot(this.progressionSession.currentStepId);
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
    await this.navigateToStep(stepIndex, { source: 'footer-chip' });
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
      let blockingIssues = [];
      try {
        blockingIssues = currentPlugin.getBlockingIssues?.() ?? [];
      } catch (err) {
        swseLogger.error(`[ProgressionShell] getBlockingIssues failed for ${currentDescriptor?.stepId}:`, err);
        blockingIssues = ['This step could not be validated. Please try again.'];
      }
      if (blockingIssues.length > 0) {
        ui.notifications.warn(blockingIssues[0]);
        return;
      }
      await currentPlugin.onStepExit(this, { direction: 'forward' });

      // Phase 3: Auto-save checkpoint after step exit (chargen only)
      if (this.persistenceEnabled && currentDescriptor?.stepId) {
        const saved = await ChargenPersistence.saveCheckpoint(this, currentDescriptor.stepId);
        if (saved) {
          this.lastCheckpointStepId = currentDescriptor.stepId;
        }
      }
    }

    // Auto-skip to next applicable step
    const nextApplicableIndex = this._findNextApplicableStep(this.currentStepIndex + 1);
    if (nextApplicableIndex < 0) {
      // No more applicable steps — proceed to confirmation
      await this._onConfirmStep(event, target);
      return;
    }

    const entered = await this._activateStep(nextApplicableIndex, {
      source: 'next-step',
      restoreIndex: this.currentStepIndex,
    });
    if (!entered) {
      return;
    }

    void this._persistSessionSnapshot(this.progressionSession.currentStepId);
    this.render();
  }

  async _onPreviousStep(event, target) {
    // Prevent back-navigation past first step
    if (this.currentStepIndex <= 0) {
      swseLogger.log('[ProgressionShell] Back-navigation blocked at first active step');
      return;
    }

    // Call onStepExit with backward direction before navigating
    const currentDescriptor = this.steps[this.currentStepIndex];
    const currentPlugin = this.stepPlugins.get(currentDescriptor?.stepId);
    if (currentPlugin) {
      try {
        await currentPlugin.onStepExit(this, { direction: 'backward' });
      } catch (err) {
        swseLogger.warn('[ProgressionShell] Error in backward step exit:', err);
      }
    }

    // Auto-skip to previous applicable step (no floor; always allow back to step 0)
    const prevApplicableIndex = this._findPreviousApplicableStep(this.currentStepIndex - 1, 0);
    if (prevApplicableIndex < 0) {
      swseLogger.log(`[ProgressionShell] No applicable previous step found; staying at current step`);
      return;
    }

    const entered = await this._activateStep(prevApplicableIndex, {
      source: 'previous-step',
      restoreIndex: this.currentStepIndex,
    });
    if (!entered) {
      return;
    }

    void this._persistSessionSnapshot(this.progressionSession.currentStepId);
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
        actorId: this.actor?.id || 'unknown',
        selectionsCount: this.committedSelections.size,
      });

      // PHASE 4 STEP 4: Check for blocking issues in current step (usually summary)
      const currentDescriptor = this.steps[this.currentStepIndex];
      if (currentDescriptor) {
        const currentPlugin = this.stepPlugins.get(currentDescriptor.stepId);
        if (currentPlugin && typeof currentPlugin.validate === 'function') {
          const validation = currentPlugin.validate();
          if (validation.errors && validation.errors.length > 0) {
            // Blocking errors prevent finalization
            swseLogger.warn('[ProgressionShell] Finalization blocked by validation errors:', validation.errors);
            ui.notifications.error(`Cannot finish: ${validation.errors[0]}`);
            this.isProcessing = false;
            return;
          }
        }
      }

      // Prepare session state for finalizer
      // PHASE 1: Pass canonical progressionSession (required, not optional)
      const sessionState = {
        mode: this.mode,
        actor: this.actor,
        progressionSession: this.progressionSession,  // CANONICAL — required by finalizer
        committedSelections: this.committedSelections, // Legacy compat (finalizer ignores)
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

        // Phase 3: Clear checkpoints after successful finalization
        await this.clearCheckpoints();

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

  _resolveInteractionItemId(target, event = null) {
    const element = target instanceof Element ? target : event?.target;
    if (!element || typeof element.closest !== 'function') {
      return { element, row: null, itemId: null, matchedAttribute: null };
    }

    const row = element.closest('[data-item-id], [data-feat-id], [data-language-id]');
    if (!row) {
      return { element, row: null, itemId: null, matchedAttribute: null };
    }

    const candidates = [
      ['itemId', 'data-item-id'],
      ['featId', 'data-feat-id'],
      ['languageId', 'data-language-id'],
    ];

    for (const [datasetKey, attributeName] of candidates) {
      const value = row.dataset?.[datasetKey];
      if (value) {
        return { element, row, itemId: value, matchedAttribute: attributeName };
      }
    }

    return { element, row, itemId: null, matchedAttribute: null };
  }

  async _onFocusItem(event, target) {
    // [DEBUG] Click sequence tracking
    const clickNum = ProgressionDebugCapture.nextClickSequence();
    const stepId = this.steps[this.currentStepIndex]?.stepId;
    ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] _onFocusItem START`, {
      step: stepId,
      eventTarget: event?.target?.className?.slice(0, 40),
    });

    // Resolve the clicked row using the canonical data-item-id contract first,
    // but also tolerate legacy data-feat-id / data-language-id rows.
    const { element, row, itemId, matchedAttribute } = this._resolveInteractionItemId(target, event);

    // [DEBUG] Log resolved itemId
    ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] Resolved itemId`, {
      itemId,
      found: !!itemId,
      matchedAttribute,
      rowTag: row?.tagName,
    });

    // DIAGNOSTICS: Log click target details
    swseLogger.debug(`[ProgressionShell] _onFocusItem click on step "${stepId}"`, {
      eventTarget: event?.target?.tagName,
      eventTargetClass: event?.target?.className?.slice(0, 50),
      targetParam: target?.tagName ?? typeof target,
      elementValid: element instanceof Element,
    });

    if (!element || typeof element.closest !== 'function') {
      swseLogger.warn('[ProgressionShell] _onFocusItem: target is not a DOM element', {
        targetType: typeof element,
        hasClosest: typeof element?.closest,
      });
      return;
    }


    // DIAGNOSTICS: Log resolution details
    swseLogger.debug(`[ProgressionShell] _onFocusItem resolved`, {
      rowFound: !!row,
      rowTag: row?.tagName,
      itemId,
      matchedAttribute,
      dataAttributesPresent: Object.keys(row?.dataset ?? {}).slice(0, 5),
    });

    if (!itemId) {
      swseLogger.warn('[ProgressionShell] _onFocusItem: could not resolve focus row identity', {
        rowElement: row?.outerHTML?.slice(0, 100),
        matchedAttribute,
        ancestorChain: element?.closest?.('[data-item-id], [data-feat-id], [data-language-id]') ? 'found' : 'not found',
      });
      return;
    }

    const plugin = this.stepPlugins.get(stepId);
    if (plugin) {
      // [DEBUG] Log before delegating to plugin
      ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] Calling plugin.onItemFocused()`, {
        pluginClass: plugin.constructor.name,
        itemId,
      });

      swseLogger.debug(`[ProgressionShell] _onFocusItem calling plugin.onItemFocused(${itemId})`);

      try {
        await plugin.onItemFocused(itemId, this);

        // Re-render to update the detail panel with the newly focused item
        // The plugin has updated its internal state; shell needs to render to show it
        await this.render();

        ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] plugin.onItemFocused() completed`, {
          focusedItem_id: this.focusedItem?.id ?? '(null)',
          focusedItem_name: this.focusedItem?.name ?? '(null)',
        });
      } catch (focusErr) {
        ProgressionDebugCapture.log('Progression Debug', `[Click #${clickNum}] plugin.onItemFocused() threw`, {
          error: focusErr.message,
          stack: focusErr.stack?.split('\n').slice(0, 3).join(' | '),
        });
        throw focusErr; // Re-throw after logging
      }
    }
  }

  async _onCommitItem(event, target) {
    const { element, row, itemId, matchedAttribute } = this._resolveInteractionItemId(target, event);
    if (!element || typeof element.closest !== 'function') {
      swseLogger.warn('[ProgressionShell] _onCommitItem: target is not a DOM element');
      return;
    }

    if (!itemId) {
      swseLogger.warn('[ProgressionShell] _onCommitItem: could not resolve commit row identity', {
        rowElement: row?.outerHTML?.slice(0, 100),
        matchedAttribute,
      });
      return;
    }

    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin) {
      await plugin.onItemCommitted(itemId, this);
      // Rebuild projection after selection committed to update selected rail
      this._rebuildProjection();
      // Trigger re-render to show updated selected rail
      this.render();
    }
  }

  /**
   * PHASE 8: Handle quantity increment for force powers/maneuvers.
   */
  async _onIncrementQuantity(event, target) {
    const { element, row, itemId } = this._resolveInteractionItemId(target, event);
    if (!element || typeof element.closest !== 'function') {
      swseLogger.warn('[ProgressionShell] _onIncrementQuantity: target is not a DOM element');
      return;
    }

    if (!itemId) {
      swseLogger.warn('[ProgressionShell] _onIncrementQuantity: could not resolve item identity');
      return;
    }

    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.onIncrementQuantity) {
      await plugin.onIncrementQuantity(itemId, this);
    }
  }

  /**
   * PHASE 8: Handle quantity decrement for force powers/maneuvers.
   */
  async _onDecrementQuantity(event, target) {
    const { element, row, itemId } = this._resolveInteractionItemId(target, event);
    if (!element || typeof element.closest !== 'function') {
      swseLogger.warn('[ProgressionShell] _onDecrementQuantity: target is not a DOM element');
      return;
    }

    if (!itemId) {
      swseLogger.warn('[ProgressionShell] _onDecrementQuantity: could not resolve item identity');
      return;
    }

    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.onDecrementQuantity) {
      await plugin.onDecrementQuantity(itemId, this);
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


  async _onUseAverageCredits(event, target) {
    event?.preventDefault();
    const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
    if (plugin?.useAverageCredits) {
      await plugin.useAverageCredits(this.actor);
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
  async _onStepAction(event, target) {
    event?.preventDefault();
    const actionName = target?.dataset?.action;
    const stepId = this.steps[this.currentStepIndex]?.stepId;
    const plugin = stepId ? this.stepPlugins.get(stepId) : null;

    swseLogger.debug(`[ProgressionShell] Step action: ${actionName} on step ${stepId}`);

    if (plugin?.handleAction) {
      const handled = await plugin.handleAction(actionName, event, target, this);
      if (handled) return;
    }

    const root = this.getRootElement?.() || this.element;
    const workSurface = root?.querySelector?.('[data-region="work-surface"]');
    if (workSurface && target) {
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
  async commitSelection(stepId, selection) {
    this.committedSelections.set(stepId, selection);

    // Track downstream invalidation from this commit
    this._trackDownstreamInvalidation(stepId);

    // After commitment, check if downstream steps have become non-applicable
    // and recompute the active step list if needed
    await this._recomputeActiveStepsIfNeeded();

    this.render();
  }

  /**
   * Preview and conditionally commit a selection.
   * Phase 2: Shows impact preview before committing.
   *
   * Step plugins that want to show impact previews should call this instead of commitSelection.
   * For steps that don't need previews, plugins can continue using commitSelection directly.
   *
   * @param {string} stepId - Step making the selection
   * @param {*} selection - Selection to commit
   * @param {Object} options - Optional settings
   * @param {string} options.label - Display label for the selection (e.g., "Human Spy")
   * @returns {Promise<boolean>} true if committed, false if cancelled
   */
  async previewAndCommitSelection(stepId, selection, options = {}) {
    try {
      // Compute preview of downstream impact
      const preview = await InvalidationPreview.computePreview(
        this.progressionSession,
        stepId,
        selection
      );

      // If preview shows affected steps, show confirmation dialog
      if (preview.affectedCount > 0) {
        const confirmed = await this._showPreviewConfirmationDialog(
          selection,
          preview,
          options
        );

        if (!confirmed) {
          swseLogger.debug('[ProgressionShell] User cancelled preview confirmation');
          return false;
        }
      }

      // Commit the selection
      await this.commitSelection(stepId, selection);
      return true;
    } catch (err) {
      swseLogger.error('[ProgressionShell] Error in previewAndCommitSelection:', err);
      ui?.notifications?.error?.('An error occurred while processing this selection.');
      return false;
    }
  }

  /**
   * Show preview confirmation dialog.
   * Phase 2: Pre-commit change preview.
   *
   * @param {Object} selection - Selection being committed
   * @param {Object} preview - Preview data from InvalidationPreview.computePreview
   * @param {Object} options - Display options
   * @returns {Promise<boolean>} true if user confirms, false if cancels
   * @private
   */
  async _showPreviewConfirmationDialog(selection, preview, options = {}) {
    const label = options.label || selection.name || 'this selection';

    return new Promise((resolve) => {
      const content = InvalidationPreview.formatPreviewForDialog(preview);

      const dialog = new Dialog({
        title: `Confirm: ${label}`,
        content: `
          <div style="margin-bottom: 1.5em;">
            <p><strong>Making this change will affect:</strong></p>
            ${content}
          </div>
          <p style="margin-top: 1.5em; padding-top: 1.5em; border-top: 1px solid #ccc;">
            Would you like to proceed?
          </p>
        `,
        buttons: {
          proceed: {
            label: 'Confirm',
            callback: () => resolve(true),
          },
          cancel: {
            label: 'Cancel',
            callback: () => resolve(false),
          },
        },
        default: 'proceed',
      });

      dialog.render(true);
    });
  }

  /**
   * Track downstream invalidation when an upstream step changes.
   * Marks visited downstream steps as stale (caution) when prerequisites change.
   * @param {string} stepId - Step that was just committed
   * @private
   */
  _trackDownstreamInvalidation(stepId) {
    try {
      // Import registry (synchronous)
      const { PROGRESSION_NODE_REGISTRY } = require('../registries/progression-node-registry.js');

      // Map step ID to node ID from registry
      const nodeId = Object.keys(PROGRESSION_NODE_REGISTRY).find(
        nid => PROGRESSION_NODE_REGISTRY[nid]?.stepId === stepId || nid === stepId
      );

      if (!nodeId) {
        return; // Step not found in registry, no invalidation to track
      }

      // Get invalidated nodes from registry
      const computer = new ActiveStepComputer();
      const invalidated = computer.getInvalidatedNodes(nodeId);

      // Mark visited downstream steps as stale
      for (const { nodeId: downstreamNodeId, behavior } of invalidated) {
        // Find the descriptor for this downstream node
        const descriptor = this.steps.find(d => d.stepId === downstreamNodeId || d.engineKey === downstreamNodeId);
        if (!descriptor) continue;

        // Only mark visited steps as stale (unvisited steps stay neutral)
        const isVisited = this.progressionSession.visitedStepIds.includes(descriptor.stepId);
        if (isVisited && behavior === 'DIRTY') {
          if (!this.progressionSession.invalidatedStepIds.includes(descriptor.stepId)) {
            this.progressionSession.invalidatedStepIds.push(descriptor.stepId);
            swseLogger.log(`[ProgressionShell] Marked step as stale due to upstream change`, {
              upstreamStep: stepId,
              downstreamStep: descriptor.stepId,
            });
          }
        }

        // If behavior is PURGE, also mark to purge from committedSelections
        if (behavior === 'PURGE') {
          this.committedSelections.delete(descriptor.stepId);
          swseLogger.log(`[ProgressionShell] Purged downstream selection due to upstream change`, {
            upstreamStep: stepId,
            downstreamStep: descriptor.stepId,
          });
        }
      }
    } catch (err) {
      swseLogger.warn(`[ProgressionShell] Error tracking downstream invalidation:`, err);
      // Continue without tracking on error (fail-safe)
    }
  }

  /**
   * Recompute active steps and validate current step is still applicable.
   * Rebuilds step list and repairs current step if needed.
   * Also tracks downstream invalidation based on upstream changes.
   * @private
   */
  async _recomputeActiveStepsIfNeeded() {
    try {
      // Get fresh list of active steps based on current session state
      const computer = new ActiveStepComputer();
      const newActiveNodeIds = await computer.computeActiveSteps(
        this.actor,
        this.mode,
        this.progressionSession,
        { subtype: this.progressionSession.subtype }
      );

      // Rebuild step list from new active nodes
      const mapNodesToDescriptors = (await import('../registries/node-descriptor-mapper.js')).default;
      const newDescriptors = mapNodesToDescriptors(newActiveNodeIds);

      // Filter hidden steps
      const newSteps = newDescriptors.filter(d => !d.isHidden);

      // Update step list
      const oldStepIds = this.steps.map(s => s.stepId);
      const newStepIds = newSteps.map(s => s.stepId);

      // Only rebuild if there's an actual change
      if (JSON.stringify(oldStepIds) !== JSON.stringify(newStepIds)) {
        // Rebuild plugins for new steps
        this.steps = newSteps;
        this.stepPlugins.clear();

        for (const descriptor of this.steps) {
          if (descriptor.pluginClass) {
            try {
              this.stepPlugins.set(descriptor.stepId, new descriptor.pluginClass(descriptor));
            } catch (err) {
              swseLogger.error(`[ProgressionShell] Failed to rebuild plugin for ${descriptor.stepId}:`, err);
            }
          }
        }

        // Repair current step if it's no longer valid
        this._repairCurrentStep();

        swseLogger.log('[ProgressionShell] Rebuilt step list after recomputation', {
          oldCount: oldStepIds.length,
          newCount: newStepIds.length,
          added: newStepIds.filter(id => !oldStepIds.includes(id)),
          removed: oldStepIds.filter(id => !newStepIds.includes(id)),
          currentStepId: this.getCurrentStepId(),
        });
      }
    } catch (err) {
      swseLogger.warn(`[ProgressionShell] Error recomputing active steps:`, err);
      // Continue without recomputation on error (fail-safe)
    }
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
  // Global Validation (Phase 2)
  // ---------------------------------------------------------------------------

  /**
   * Validate the entire build state against global constraints.
   * Phase 2: Global Validation - Cross-step constraint checking
   *
   * @param {Object} options - Validation options
   *   - strict: boolean - Treat warnings as errors
   * @returns {Object} Validation result with errors, warnings, conflicts, suggestions
   */
  validateBuild(options = {}) {
    return GlobalValidator.validate(this, {
      mode: this.mode,
      ...options,
    });
  }

  /**
   * Check if build is valid for proceeding (has no blocking errors).
   * @returns {boolean}
   */
  isBuildValid() {
    const result = this.validateBuild();
    return result.isValid;
  }

  /**
   * Get validation report as human-readable text.
   * Useful for mentor feedback and UI display.
   *
   * @returns {string} Formatted validation report
   */
  getBuildValidationReport() {
    const result = this.validateBuild();
    return GlobalValidator.formatReport(result);
  }

  /**
   * Show validation feedback via mentor rail.
   * Called when validation check is requested or on step navigation.
   * Shows errors as cautionary, warnings as neutral.
   */
  showValidationFeedback() {
    const result = this.validateBuild();

    if (result.isValid && result.warnings.length === 0 && result.conflicts.length === 0) {
      this.mentor.currentDialogue = '✓ Your build looks solid. Ready to proceed!';
      this.mentor.mood = 'encouraging';
      return;
    }

    // Build feedback message
    const messages = [];

    if (result.errors.length > 0) {
      messages.push('**Issues to fix:**');
      result.errors.slice(0, 2).forEach(err => messages.push(`  • ${err}`));
      if (result.errors.length > 2) {
        messages.push(`  + ${result.errors.length - 2} more issue(s)`);
      }
    }

    if (result.warnings.length > 0) {
      messages.push('\n**Recommendations:**');
      result.warnings.slice(0, 2).forEach(warn => messages.push(`  • ${warn}`));
      if (result.warnings.length > 2) {
        messages.push(`  + ${result.warnings.length - 2} more suggestion(s)`);
      }
    }

    if (result.conflicts.length > 0) {
      messages.push('\n**Build Concerns:**');
      result.conflicts.slice(0, 2).forEach(conflict => messages.push(`  • ${conflict}`));
      if (result.conflicts.length > 2) {
        messages.push(`  + ${result.conflicts.length - 2} more concern(s)`);
      }
    }

    this.mentor.currentDialogue = messages.join('\n');
    this.mentor.mood = result.errors.length > 0 ? 'cautionary' : 'neutral';
    this.render();
  }

  // ---------------------------------------------------------------------------
  // Persistence & Checkpoints (Phase 3)
  // ---------------------------------------------------------------------------

  /**
   * Restore shell state from a saved checkpoint.
   * Useful for resuming chargen after interrupt.
   *
   * @param {Object} checkpoint - Checkpoint data from ChargenPersistence
   * @returns {boolean} true if restore successful
   */
  restoreFromCheckpoint(checkpoint) {
    if (ChargenPersistence.restoreCheckpoint(this, checkpoint)) {
      this.lastCheckpointStepId = checkpoint.lastStepId;
      return true;
    }
    return false;
  }

  /**
   * Get the last saved checkpoint for this actor.
   * Used during initialization to offer resume option.
   *
   * @returns {Object|null} Checkpoint data or null
   */
  getLastCheckpoint() {
    return ChargenPersistence.getLastCheckpoint(this.actor);
  }

  /**
   * Get summary of last checkpoint (for UI display).
   * Shows what selections were made before interrupt.
   *
   * @returns {Object|null} Summary with buildStatus, selectionsCount, etc.
   */
  getCheckpointSummary() {
    const checkpoint = this.getLastCheckpoint();
    return checkpoint ? ChargenPersistence.getCheckpointSummary(checkpoint) : null;
  }

  /**
   * Clear all saved checkpoints.
   * Called after successful finalization to prevent resume.
   *
   * @returns {Promise<boolean>}
   */
  async clearCheckpoints() {
    const cleared = await ChargenPersistence.clearCheckpoints(this.actor);
    if (cleared) {
      this.lastCheckpointStepId = null;
    }
    return cleared;
  }

  // ---------------------------------------------------------------------------
  // Close / Cleanup
  // ---------------------------------------------------------------------------

  async close(options = {}) {
    // Cleanup centering state
    clearTimeout(this._centerTimer);
    this._centerTimer = null;
    this._openedAt = null;

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
