/**
 * IntroStep plugin — DETERMINISTIC STATE MACHINE
 *
 * Versafunction Datapad Boot Sequence — Diegetic chargen introduction.
 * Establishes immersive tone and in-universe flavor before character creation begins.
 *
 * KEY ARCHITECTURE CHANGE:
 * - Single-owner animation controller: all intro state managed here, not shell
 * - Render ONCE on entry, animates in-place, preserves final state
 * - NO shell.render() calls during animation (only once at completion)
 * - Proper state machine: idle → animating → complete-awaiting-click → transitioning → disposed
 * - DOM refs managed per-frame to handle stale references
 * - Session token prevents stale timers from mutating dead DOM
 *
 * Features:
 * - 6-step Aurabesh boot sequence with progress tracking
 * - Color-coded system states (blue/amber/red/green)
 * - Fake OS shell with time, signal, battery indicators
 * - Character-by-character translation via existing mentor translation system
 * - Clean transition to Species step on completion
 *
 * No data commitment — purely immersive/atmospheric.
 * Skip-friendly but engaging (no mechanical gating).
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { swseLogger } from '../../../utils/logger.js';
import { SWSETranslationEngine } from '../engine/swse-translation-engine.js';
import { TemplateSelectionDialog } from '../dialogs/template-selection-dialog.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';

// ========== INTRO STATE MACHINE ==========
const INTRO_STATE = {
  IDLE: 'idle',
  ANIMATING: 'animating',
  COMPLETE_AWAITING_CLICK: 'complete-awaiting-click',
  TRANSITIONING: 'transitioning',
  DISPOSED: 'disposed'
};

// ========== BOOT SEQUENCE DECLARATIONS (Phase 2) ==========

const INTRO_LINE_TONE = {
  NEUTRAL: 'neutral',
  ERROR: 'error',
  SUCCESS: 'success'
};

/**
 * Declarative boot sequence for Phase 2 implementation.
 * Each line defines Aurabesh text, English translation, tone, progress level, and duration.
 */
const BOOT_LINES = [
  {
    aurabesh: '[SYSTEM LINK ESTABLISHING]',
    basic: 'System Link Establishing',
    tone: INTRO_LINE_TONE.NEUTRAL,
    progress: 3,
    duration: 800
  },
  {
    aurabesh: '[IDENTITY MATRIX INDEXED]',
    basic: 'Identity Matrix Indexed',
    tone: INTRO_LINE_TONE.SUCCESS,
    progress: 8,
    duration: 800
  },
  {
    aurabesh: '[GALACTIC RECORD INDEX NOT DETECTED]',
    basic: 'Galactic Record Index Not Detected',
    tone: INTRO_LINE_TONE.ERROR,
    progress: 12,
    duration: 1000
  },
  {
    aurabesh: '[OVERRIDE AUTHORIZATION GRANTED]',
    basic: 'Override Authorization Granted',
    tone: INTRO_LINE_TONE.SUCCESS,
    progress: 16,
    duration: 800
  },
  {
    aurabesh: '[PRIMARY LANGUAGE MATRIX VERIFIED]',
    basic: 'Primary Language Matrix Verified',
    tone: INTRO_LINE_TONE.SUCCESS,
    progress: 20,
    duration: 600
  },
  {
    aurabesh: '[AWAITING USER REGISTRATION...]',
    basic: 'Awaiting User Registration...',
    tone: INTRO_LINE_TONE.NEUTRAL,
    final: true,
    blinkingCursor: true
  }
];

/**
 * Class toggle helpers — manage cursor and text tone animations
 */
function setCursorMode(cursorEl, mode) {
  if (!cursorEl) return;
  cursorEl.classList.remove('is-blinking', 'is-typing', 'is-translating', 'is-error');
  switch (mode) {
    case 'typing':
      cursorEl.classList.add('is-typing');
      break;
    case 'translating':
      cursorEl.classList.add('is-translating');
      break;
    case 'error':
      cursorEl.classList.add('is-error', 'is-typing');
      break;
    case 'blink':
      cursorEl.classList.add('is-blinking');
      break;
  }
}

function setToneClasses(targetEl, tone) {
  if (!targetEl) return;
  targetEl.classList.remove('prog-intro-text--neutral', 'prog-intro-text--success', 'prog-intro-text--error');
  if (tone === INTRO_LINE_TONE.SUCCESS) {
    targetEl.classList.add('prog-intro-text--success');
  } else if (tone === INTRO_LINE_TONE.ERROR) {
    targetEl.classList.add('prog-intro-text--error');
  } else {
    targetEl.classList.add('prog-intro-text--neutral');
  }
}

function setProgressTone(progressBarEl, tone) {
  if (!progressBarEl) return;
  progressBarEl.classList.remove('prog-intro-progress-bar--success', 'prog-intro-progress-bar--error');
  if (tone === INTRO_LINE_TONE.SUCCESS) {
    progressBarEl.classList.add('prog-intro-progress-bar--success');
  } else if (tone === INTRO_LINE_TONE.ERROR) {
    progressBarEl.classList.add('prog-intro-progress-bar--error');
  }
}

function updateSegments(segments, activeCount) {
  segments.forEach((segment, index) => {
    segment.classList.remove('is-active', 'is-head');
    if (index < activeCount) {
      segment.classList.add('is-active');
      if (index === activeCount - 1) {
        segment.classList.add('is-head');
      }
    }
  });
}

function updateProgressUI(els, activeCount, totalCount) {
  updateSegments(els.segments, activeCount);
  if (els.progressPercent) {
    els.progressPercent.textContent = `${String(activeCount).padStart(2, '0')} / ${String(totalCount).padStart(2, '0')}`;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class IntroStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // ====== STATE MACHINE ======
    this._state = INTRO_STATE.IDLE;
    this._sessionToken = null;  // Incremented on each run to invalidate stale timers
    this._continueClicked = false;  // Prevent double-click
    this._transitionInProgress = false;  // Prevent double transition

    // ====== PHASE-DRIVEN STATE MACHINE ======
    this._phases = [
      {
        label: 'SYSTEMS CHECK',
        aurabesh: 'PATEK THARA VAUN',
        duration: 800,
        microlabel: 'initializing memory banks...'
      },
      {
        label: 'NETWORK SCAN',
        aurabesh: 'TAKRA MANDALAKI',
        duration: 1000,
        microlabel: 'scanning network protocols...'
      },
      {
        label: 'IDENTITY QUERY',
        aurabesh: 'KESH NARI NABUKT',
        duration: 1000,
        microlabel: 'querying identity subsystems...'
      },
      {
        label: 'IDENTITY UNKNOWN',
        aurabesh: 'KARESH VANDALOR MUSK',
        duration: 800,
        microlabel: 'error: unrecognized entity'
      },
      {
        label: 'OVERRIDE AUTHORIZED',
        aurabesh: 'KARATH MANDALAI VESKOR',
        duration: 600,
        microlabel: 'override accepted, loading profile...'
      },
      {
        label: 'TRANSLATING',
        aurabesh: '···',
        duration: 0,
        microlabel: 'decoding linguistic patterns...'
      },  // Translation phase (no progress bar)
    ];

    this._phase = null;                   // Current phase label
    this._progress = 0;                   // 0-100, animates smoothly
    this._timer = null;                   // Animation timer
    this._complete = false;               // True when all phases done
    this._isSkipping = false;             // Flag to interrupt animation on skip

    // Translation state (typewriter effect)
    this._translatedText = '';            // Text being typed out
    this._fullText = 'INITIALIZATION SUCCESSFUL. NEW USER DETECTED. AWAITING USER REGISTRATION...';  // Full text to display

    // Clock state
    this._clockRunning = false;
    this._startTime = null;
    this._clockInterval = null;

    // Signal animation state
    this._signalLevel = 0;
    this._signalDirection = 1;

    // Parallax state (camera drift)
    this._parallaxX = 0;
    this._parallaxY = 0;
    this._mouseX = 0;
    this._mouseY = 0;

    // Translation character effects (flicker + glow trail)
    this._translationCharStates = [];  // Track individual character state (flickering, glowing, etc)
    this._trailPositions = [];         // Track cursor trail for glow effect

    // Micro-label state
    this._currentMicrolabel = '';

    // Intro sequence guard and cancellation
    this._introSequenceStarted = false;
    this._animationSequenceStarted = false;  // Tracks if animation has been started (after DOM ready)
    this._introRunId = 0;  // Incremented on each run, used to cancel stale loops
    this._introRunning = false;  // Set to false to abort current animation

    // DOM element cache (for direct mutation without full re-render)
    this._workSurfaceEl = null;
    this._translationTextEl = null;
    this._progressPercentEl = null;
    this._aurabeshEl = null;
    this._microlabelEl = null;
    this._statusEl = null;
    this._segmentsContainerEl = null;

    // Shell reference
    this._shell = null;

    // Translation Engine
    this._translationEngine = new SWSETranslationEngine();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // DIAGNOSTIC: Raw console log to verify this method is being called
    console.log('[IntroStep.onStepEnter] CALLED', { state: this._state });

    swseLogger.debug('[IntroStep.onStepEnter] Entering intro step');

    if (this._state !== INTRO_STATE.IDLE) {
      swseLogger.warn('[IntroStep.onStepEnter] Intro already running, ignoring duplicate entry');
      return;
    }

    this._state = INTRO_STATE.ANIMATING;
    this._transitionInProgress = false;
    this._continueClicked = false;

    // Enable mentor for flavor context (but not Ask Mentor — this is intro only)
    shell.mentor.askMentorEnabled = false;

    // Initialize phase state
    this._progress = 0;
    this._complete = false;
    this._phase = null;
    this._translatedText = '';
    this._translationCharStates = [];

    // Store shell reference
    this._shell = shell;

    // Create new session token to invalidate any stale loops from previous runs
    this._sessionToken = Math.random();

    // Start clock and signal animation (non-blocking, runs in background)
    this._startClock();
    this._startSignalAnimation();

    swseLogger.debug('[IntroStep.onStepEnter] Initialization complete, waiting for afterRender');
  }

  async onStepExit(shell) {
    swseLogger.debug('[IntroStep.onStepExit] Exiting intro step', {
      state: this._state,
      complete: this._complete,
    });

    this._state = INTRO_STATE.DISPOSED;

    // CRITICAL: Invalidate the current session so any stale timers cannot mutate DOM
    this._sessionToken = null;

    // Stop all animations and timers immediately
    this._stopClock();
    this._stopSignalAnimation();
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    // Clear state
    this._introRunning = false;
    this._introSequenceStarted = false;
    this._animationSequenceStarted = false;
    this._isSkipping = false;
    this._continueClicked = false;
    this._transitionInProgress = false;

    // Clear DOM element cache
    this._workSurfaceEl = null;
    this._translationTextEl = null;
    this._progressPercentEl = null;
    this._aurabeshEl = null;
    this._microlabelEl = null;
    this._statusEl = null;
    this._segmentsContainerEl = null;
    this._shell = null;

    swseLogger.debug('[IntroStep.onStepExit] Cleanup complete');
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    const phaseData = this.getPhaseData();

    const stepData = {
      currentTime: this._getCurrentTime(),
      systemName: 'VERSAFUNCTION DATAPAD',
      battery: 85,

      // Phase data
      phase: this._phase,
      phaseLabel: phaseData.phaseLabel,
      phaseAurabesh: phaseData.phaseAurabesh,
      phaseState: phaseData.phaseState,

      // Progress (0-100, animates smoothly)
      progress: Math.round(this._progress),

      // Segmented progress bar (20 segments)
      progressSegments: this._getProgressSegments(),

      // Translation state
      translatedText: this._translatedText,
      isTranslating: this._phase === 'TRANSLATING' && !this._complete,

      // Completion state
      complete: this._complete,

      // Signal bars (4 animated bars)
      signalBars: [0, 1, 2, 3].map(i => ({ active: i <= this._signalLevel })),

      // Micro-label (system messages)
      microlabel: this._currentMicrolabel,

      // Parallax data (camera drift)
      parallaxX: this._parallaxX,
      parallaxY: this._parallaxY,

      // Character effects for translation (flicker, glow trail)
      translationCharStates: this._translationCharStates,
    };

    // DIAGNOSTIC: Show what data is being returned to template
    console.log('[IntroStep.getStepData] Complete flag:', stepData.complete, 'Phase:', stepData.phase, 'Progress:', stepData.progress);

    swseLogger.debug('[IntroStep.getStepData] Returning step data', {
      complete: stepData.complete,
      progress: stepData.progress,
      phase: stepData.phase,
      isTranslating: stepData.isTranslating,
    });

    return stepData;
  }

  getSelection() {
    // Intro step has no selection mechanism — it's purely immersive
    return {
      selected: [],
      count: 0,
      isComplete: this._complete,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Intro step is always valid — there is nothing to select or validate.
   * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
   */
  validate() {
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Intro step has no blocking issues — it is non-mechanical and always passable.
   * @returns {string[]}
   */
  getBlockingIssues() {
    return [];
  }

  // ---------------------------------------------------------------------------
  // Item interactions (no-ops — intro has no selectable items)
  // ---------------------------------------------------------------------------

  /**
   * Intro step has no items to commit.
   */
  async onItemCommitted(_itemId, _shell) {
    // Intentional no-op: intro is purely immersive; nothing is committed.
  }

  /**
   * Intro step has no focused items — always returns empty state.
   * @returns {{ template: string, data: Object }}
   */
  renderDetailsPanel(_focusedItem) {
    return this.renderDetailsPanelEmptyState();
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /**
   * Render the intro boot sequence inside the shell's work-surface region.
   * Template path matches the existing intro-work-surface.hbs.
   * @param {Object} stepData - data returned by getStepData()
   * @returns {{ template: string, data: Object }}
   */
  renderWorkSurface(stepData) {
    // Map step data to template context
    const templateContext = {
      // OS UI elements
      systemName: stepData.systemName,
      currentTime: stepData.currentTime,
      battery: stepData.battery,
      signalBars: stepData.signalBars,
      microlabel: stepData.microlabel,

      // Current step state (for display)
      currentStepData: {
        state: stepData.phaseState,
        label: stepData.phaseLabel,
        aurabesh: stepData.phaseAurabesh,
      },

      // Progress tracking
      progressPercent: stepData.progress,
      progressSegments: stepData.progressSegments,
      stepNumber: this._getCurrentPhaseIndex() + 1,
      bootSequenceLength: this._phases.length,

      // Translation
      translatedText: stepData.translatedText,
      isTranslating: stepData.isTranslating,

      // Completion state
      sequenceComplete: stepData.complete,

      // Parallax and effects
      parallaxX: stepData.parallaxX,
      parallaxY: stepData.parallaxY,
      translationCharStates: stepData.translationCharStates,
    };

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/intro-work-surface.hbs',
      data: templateContext,
    };
  }

  /**
   * Activate listeners for user interactions.
   * Clicking anywhere during boot animation skips to completion.
   * Clicking Continue button after completion transitions to next step.
   * Mouse movement controls parallax camera drift.
   * @param {jQuery|HTMLElement} html
   */
  activateListeners(html) {
    super.activateListeners(html);

    const $surface = html instanceof $ ? html : $(html);

    // Skip animation on click (during boot only)
    $surface.on('click', '.prog-intro-surface', (event) => {
      if (!this._complete && !this._isSkipping) {
        this._skipIntro();
        // Shell will re-render on next tick, which will show completion state
        this.descriptor._shell?.render(false);
      }
    });

    // Phase 2: Pick Profile button handler (bound to data-role, not data-action)
    $surface.on('click', '[data-role="intro-pick-profile"]', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      swseLogger.debug('[IntroStep.activateListeners] Pick Profile button clicked');

      try {
        // Guard against double-click
        if (this._transitionInProgress) {
          swseLogger.warn('[IntroStep.activateListeners] Transition in progress, ignoring');
          return;
        }

        const liveActor = this._shell?.actor;
        if (!liveActor) {
          swseLogger.error('[IntroStep.activateListeners] No actor available for template selection');
          return;
        }

        // Open template selection dialog
        const templateId = await TemplateSelectionDialog.showChoiceDialog(liveActor);

        // Handle result
        if (templateId) {
          // User selected a template — advance to next step
          swseLogger.debug('[IntroStep.activateListeners] Template selected', { templateId });
          this._continueClicked = true;
          this._state = INTRO_STATE.TRANSITIONING;
          this._transitionInProgress = true;
          await this._transitionToNextStep();
        } else if (templateId === null) {
          // User chose "Create from Scratch" — advance to next step
          swseLogger.debug('[IntroStep.activateListeners] Freeform chargen chosen');
          this._continueClicked = true;
          this._state = INTRO_STATE.TRANSITIONING;
          this._transitionInProgress = true;
          await this._transitionToNextStep();
        }
        // templateId === false → user cancelled, no action
      } catch (error) {
        swseLogger.error('[IntroStep.activateListeners] ERROR handling Pick Profile button', {
          error: error.message,
          stack: error.stack,
        });
        this._transitionInProgress = false;
        this._continueClicked = false;
      }
    });

    // Note: Go Back (data-action="previous-step") and Proceed (data-action="next-step")
    // are routed through the shell's action system via ApplicationV2, not bound here

    // Parallax camera drift on mouse movement
    $surface.on('mousemove', '.prog-intro-surface', (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate mouse position relative to center (-1 to 1)
      const normalizedX = (event.clientX - rect.left - centerX) / centerX;
      const normalizedY = (event.clientY - rect.top - centerY) / centerY;

      // Apply subtle parallax (max ±8px drift)
      this._parallaxX = normalizedX * 8;
      this._parallaxY = normalizedY * 8;

      // Update transform on surface (subtle, smooth movement)
      const surface = event.currentTarget;
      surface.style.transform = `translate(${this._parallaxX}px, ${this._parallaxY}px)`;
      surface.style.transition = 'transform 0.2s ease-out';
    });

    // Reset parallax on mouse leave
    $surface.on('mouseleave', '.prog-intro-surface', (event) => {
      this._parallaxX = 0;
      this._parallaxY = 0;
      const surface = event.currentTarget;
      surface.style.transform = 'translate(0, 0)';
      surface.style.transition = 'transform 0.3s ease-out';
    });
  }

  // ---------------------------------------------------------------------------
  // Post-Render DOM Caching (for direct mutation during animation)
  // ---------------------------------------------------------------------------

  /**
   * Called after the shell renders the intro template.
   *
   * CRITICAL BEHAVIOR CHANGE:
   * - Only starts animation on FIRST render (state === ANIMATING and NOT started yet)
   * - Never caches stale DOM refs that become invalid across re-renders
   * - Validates DOM exists and is connected
   * - After completion, does NOT re-cache refs (template may have changed structure)
   * - Prevents infinite loops and stale mutation
   *
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @param {HTMLElement} workSurfaceEl
   */
  async afterRender(shell, workSurfaceEl) {
    // DIAGNOSTIC: Raw console log to verify this method is being called
    console.log('[IntroStep.afterRender] CALLED', {
      state: this._state,
      workSurfaceEl: !!workSurfaceEl,
      workSurfaceElConnected: workSurfaceEl?.isConnected ?? false,
      animationStarted: this._animationSequenceStarted,
    });

    swseLogger.debug('[IntroStep.afterRender] Called', {
      state: this._state,
      workSurfaceElConnected: workSurfaceEl?.isConnected ?? false,
      animationStarted: this._animationSequenceStarted,
    });

    // Guard: If disposed, do nothing
    if (this._state === INTRO_STATE.DISPOSED) {
      swseLogger.warn('[IntroStep.afterRender] Intro already disposed, ignoring render');
      return;
    }

    // Guard: Validate DOM is still connected and valid
    if (!workSurfaceEl?.isConnected) {
      swseLogger.error('[IntroStep.afterRender] Work surface not connected, aborting');
      this._state = INTRO_STATE.DISPOSED;
      return;
    }

    // Cache critical DOM element references for animation (only on first render)
    if (!this._translationTextEl) {
      this._translationTextEl = workSurfaceEl.querySelector('[data-role="intro-translation"]');
      this._workSurfaceEl = workSurfaceEl;  // Cache for Translation Engine
      const translationFound = !!this._translationTextEl;
      console.log('[IntroStep.afterRender] Translation element binding:', {
        selector: '[data-role="intro-translation"]',
        found: translationFound,
        element: translationFound ? 'cached' : 'NOT FOUND',
      });

      // Translation Engine is now lazy-loaded on first use in _runTranslationViaEngine
      // Just verify we have the work surface for stable DOM binding
      if (this._workSurfaceEl) {
        swseLogger.debug('[IntroStep.afterRender] Work surface ready, translation engine will load on demand');
      }
    }

    // ONLY on first render during ANIMATING state: start the animation
    if (this._state === INTRO_STATE.ANIMATING && !this._animationSequenceStarted) {
      swseLogger.debug('[IntroStep.afterRender] Starting animation sequence');
      this._animationSequenceStarted = true;

      // Set _introRunning flag so animation loop knows it's active
      this._introRunning = true;

      // Start the animation (async, doesn't block)
      this.startIntroSequence(shell);
    } else {
      swseLogger.debug('[IntroStep.afterRender] Not starting animation', {
        state: this._state,
        alreadyStarted: this._animationSequenceStarted,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Boot Sequence Logic
  // ---------------------------------------------------------------------------

  /**
   * Start the cinematic boot sequence — cycles through phases with smooth progress animation.
   * This is a true state machine: each phase updates _phase and animates _progress.
   * Can be interrupted by skip or cancellation (user navigates away).
   * Includes diegetic translation phase at the end.
   *
   * CRITICAL: Animation updates use direct DOM mutation, not full shell re-renders.
   * Only the shell render at the end (phase complete) is needed for structural updates.
   */
  async startIntroSequence(shell) {
    // Phase 2: Use declarative boot sequence with segmented progress bar
    swseLogger.debug('[IntroStep.startIntroSequence] Starting Phase 2 boot sequence with bootLines');

    // Run the boot sequence animation
    await this.runBootSequence(shell, this._sessionToken);

    // Guard: check if still running
    if (!this._introRunning) return;

    // All phases complete — trigger ONE final render to update UI state
    // (show continue button, final text, etc.)
    // Only render if intro is still active (user didn't navigate away)
    if (this._introRunning) {
      swseLogger.debug('[IntroStep.startIntroSequence] All phases complete, marking complete and rendering', {
        introRunning: this._introRunning,
        isSkipping: this._isSkipping,
      });
      this._complete = true;
      // Transition to state where we're waiting for user to click Continue
      this._state = INTRO_STATE.COMPLETE_AWAITING_CLICK;
      this._introRunning = false;  // Stop accepting skip clicks

      try {
        console.log('[IntroStep.startIntroSequence] About to render with complete=true, state=', this._state);
        swseLogger.debug('[IntroStep.startIntroSequence] About to call shell.render()');
        shell.render();
        console.log('[IntroStep.startIntroSequence] Shell.render() completed successfully');
        swseLogger.debug('[IntroStep.startIntroSequence] Shell rendered after completion', {
          complete: this._complete,
          newState: this._state,
        });
      } catch (error) {
        console.error('[IntroStep.startIntroSequence] ERROR during shell.render():', error);
        swseLogger.error('[IntroStep.startIntroSequence] ERROR during shell.render()', {
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    } else {
      swseLogger.debug('[IntroStep.startIntroSequence] Intro animation was cancelled before completion');
    }
  }

  /**
   * Animate progress from current value to 100% over a given duration.
   *
   * ARCHITECTURE: Updates internal state (_progress) and visually updates progress bar via direct DOM mutation.
   * Does NOT call shell.render() during animation (only at completion).
   * Direct DOM updates prevent full re-renders that would cause stale DOM ref issues.
   *
   * Can be interrupted by skip or step exit (nav away) at any time.
   * Uses session token to prevent stale timers from running after step has exited.
   */
  async _animateProgress(duration, shell) {
    const steps = 20;  // 20 animation frames per phase
    const stepTime = duration / steps;
    const sessionToken = this._sessionToken;  // Capture token at start of animation

    for (let i = 0; i <= steps; i++) {
      // Exit early if skip was triggered
      if (this._isSkipping) break;

      // CRITICAL: Exit if animation was cancelled (user navigated away)
      if (!this._introRunning) return;

      // CRITICAL: Exit if session has been invalidated (step exited, new run started)
      if (this._sessionToken !== sessionToken) {
        swseLogger.debug('[IntroStep._animateProgress] Session invalidated, aborting stale animation');
        return;
      }

      this._progress += (100 / this._phases.length) / steps;

      // Update visual progress bar and phase label directly in DOM (no shell.render())
      this._updateProgressBarDOM();
      this._updatePhaseDisplayDOM();

      // Wait before next frame
      await this.delay(stepTime);
    }

    // Final session check before finishing
    if (this._sessionToken !== sessionToken) return;

    // Ensure we hit the exact phase boundary
    const phasePercent = ((this._phase ? this._phases.findIndex(p => p.label === this._phase) + 1 : 0) / this._phases.length) * 100;
    this._progress = Math.min(phasePercent, 100);
    this._updateProgressBarDOM();
    this._updatePhaseDisplayDOM();
  }

  /**
   * Run translation phase using the SWSETranslationEngine.
   * Orchestrates masked-reveal animation (left-to-right character reveal with cursor).
   * Stable DOM binding prevents element-not-found errors.
   * Session token invalidation handles shell rerenders and cancellation.
   */
  async _runTranslationViaEngine(shell, sessionToken) {
    try {
      swseLogger.debug('[IntroStep._runTranslationViaEngine] Starting engine-based translation');

      // Ensure we have a work surface element
      if (!this._workSurfaceEl?.isConnected) {
        swseLogger.error('[IntroStep._runTranslationViaEngine] Work surface not connected');
        return;
      }

      // Create translation session with stable DOM binding
      const session = this._translationEngine.createSession({
        profile: 'chargenIntro',
        target: this._workSurfaceEl,
        translatedText: this._fullText,
        selectors: {
          'translationText': '[data-role="intro-translation-text"]'
        },
        onComplete: () => {
          swseLogger.debug('[IntroStep._runTranslationViaEngine] Session completed');
          this._translatedText = this._fullText;
        },
        onCancel: () => {
          swseLogger.debug('[IntroStep._runTranslationViaEngine] Session cancelled');
        }
      });

      if (!session) {
        swseLogger.error('[IntroStep._runTranslationViaEngine] Failed to create session');
        return;
      }

      // Run the animation (blocking until complete or cancelled)
      await this._translationEngine.runSession(session);

      swseLogger.debug('[IntroStep._runTranslationViaEngine] Engine animation completed');
    } catch (err) {
      swseLogger.error('[IntroStep._runTranslationViaEngine] Error:', err);
    }
  }

  /**
   * Phase 2: Run the declarative boot sequence using bootLines and segmented progress bar.
   * Animates each boot line, updates tone classes, manages cursor state, and handles translation reveals.
   * Reuses existing SWSETranslationEngine for character-by-character reveal.
   */
  async runBootSequence(shell, sessionToken) {
    try {
      swseLogger.debug('[IntroStep.runBootSequence] Starting Phase 2 boot sequence');

      if (!this._workSurfaceEl?.isConnected) {
        swseLogger.error('[IntroStep.runBootSequence] Work surface not connected');
        return;
      }

      // Cache DOM elements for animation
      const aurabeshEl = this._workSurfaceEl.querySelector('[data-role="intro-aurabesh"]');
      const progressBar = this._workSurfaceEl.querySelector('.prog-intro-progress-bar--segmented');
      const segments = Array.from(this._workSurfaceEl.querySelectorAll('[data-role="intro-segment"]'));
      const progressPercent = this._workSurfaceEl.querySelector('[data-role="intro-progress-percent"]');
      const microlabel = this._workSurfaceEl.querySelector('[data-role="intro-microlabel"]');
      const translationText = this._workSurfaceEl.querySelector('[data-role="intro-translation-text"]');
      const cursorEl = aurabeshEl?.querySelector('.prog-intro-cursor');

      const els = {
        aurabesh: aurabeshEl,
        cursor: cursorEl,
        progressBar,
        segments,
        progressPercent,
        microlabel,
        translationText
      };

      // Run each boot line
      for (let i = 0; i < BOOT_LINES.length; i++) {
        // Guard: cancel if intro is not running
        if (!this._introRunning) return;

        // Guard: session token invalidation
        if (this._sessionToken !== sessionToken) {
          swseLogger.debug('[IntroStep.runBootSequence] Session invalidated, aborting');
          return;
        }

        const line = BOOT_LINES[i];

        // Set tone classes for this line
        setToneClasses(els.aurabesh, line.tone);
        setToneClasses(els.translationText, line.tone);
        setProgressTone(els.progressBar, line.tone);

        // Update microlabel
        if (els.microlabel) {
          els.microlabel.textContent = line.basic;
          setToneClasses(els.microlabel, line.tone);
        }

        // Set cursor mode based on tone
        if (line.tone === INTRO_LINE_TONE.ERROR) {
          setCursorMode(els.cursor, 'error');
        } else {
          setCursorMode(els.cursor, 'typing');
        }

        // Update Aurabesh text and run translation reveal
        if (els.aurabesh && !line.final) {
          // Create a translation session for this line
          const session = this._translationEngine.createSession({
            profile: 'chargenIntro',
            target: this._workSurfaceEl,
            translatedText: line.basic,
            selectors: {
              'translationText': '[data-role="intro-translation-text"]'
            },
            onComplete: () => {
              swseLogger.debug('[IntroStep.runBootSequence] Line translation complete', { line: line.basic });
            }
          });

          if (session) {
            await this._translationEngine.runSession(session);
          }
        }

        // Update progress bar segments
        updateProgressUI(els, line.progress || (i + 1), 20);

        // Wait for phase duration
        await delay(line.duration || 600);

        // If this is the final line, set cursor to blinking mode
        if (line.final) {
          setCursorMode(els.cursor, 'blink');
          await delay(120);
        }
      }

      swseLogger.debug('[IntroStep.runBootSequence] Boot sequence complete');
    } catch (err) {
      swseLogger.error('[IntroStep.runBootSequence] Error:', err);
    }
  }

  /**
   * DEPRECATED: Old translation method. Kept for reference.
   * Use _runTranslationViaEngine() instead.
   *
   * Run the diegetic translation phase with typewriter effect.
   *
   * ARCHITECTURE: Updates internal state (_translatedText, _translationCharStates) and updates DOM directly.
   * Does NOT call shell.render() during animation (only at completion).
   * Direct DOM updates show typewriter effect without triggering full re-renders.
   *
   * Shows "TRANSLATING..." and builds English text character-by-character.
   * Includes character flicker (decryption effect) and glow trail (data processing).
   * Respects cancellation if user navigates away.
   * Uses session token to prevent stale timers from running after step has exited.
   */
  async _runTranslation(shell) {
    console.log('[IntroStep._runTranslation] Starting translation phase, text length:', this._fullText.length);
    this._translatedText = '';
    this._translationCharStates = [];

    // Capture token at start to detect session invalidation
    const sessionToken = this._sessionToken;

    // Typewriter speed: 25ms per character
    const CHAR_DELAY = 25;

    for (let i = 0; i < this._fullText.length; i++) {
      // CRITICAL: Exit if animation was cancelled (user navigated away)
      if (!this._introRunning) return;

      // CRITICAL: Exit if session has been invalidated (step exited, new run started)
      if (this._sessionToken !== sessionToken) {
        swseLogger.debug('[IntroStep._runTranslation] Session invalidated, aborting stale animation');
        return;
      }

      // Respect skip interrupt
      if (this._isSkipping) {
        this._translatedText = this._fullText;
        this._translationCharStates = this._fullText.split('').map(char => ({ state: 'complete', glyph: char }));
        this._updateTranslationTextDOM();
        return;
      }

      // 40% chance of flicker effect on this character
      if (Math.random() < 0.4) {
        // Show random glyph briefly (decryption effect)
        const randomGlyph = this._getRandomGlyph();
        this._translatedText += randomGlyph;
        this._translationCharStates[i] = { state: 'flickering', glyph: randomGlyph };

        // Brief flicker delay
        await this.delay(12);

        // Snap to correct character (with session check)
        if (this._sessionToken !== sessionToken) return;
        this._translatedText = this._translatedText.slice(0, -1) + this._fullText[i];
        this._translationCharStates[i] = { state: 'locked', glyph: this._fullText[i] };
      } else {
        // Normal character reveal
        this._translatedText += this._fullText[i];
        this._translationCharStates[i] = { state: 'locked', glyph: this._fullText[i] };
      }

      // Add character to trail for glow effect (last 3 chars glow)
      this._trailPositions = [i];
      if (i > 0) this._trailPositions.push(i - 1);
      if (i > 1) this._trailPositions.push(i - 2);

      // Update translation text in DOM (direct mutation, no shell.render())
      this._updateTranslationTextDOM();

      // Wait before next character
      await this.delay(CHAR_DELAY);
    }

    // Final session check before finishing
    if (this._sessionToken !== sessionToken) {
      console.log('[IntroStep._runTranslation] ABORTED: Session invalidated at end');
      return;
    }

    // Translation complete, text fully revealed (only if animation wasn't cancelled)
    if (this._introRunning) {
      console.log('[IntroStep._runTranslation] COMPLETE: Translation finished, text length:', this._translatedText.length);
      this._translationCharStates = this._translatedText.split('').map(char => ({
        state: 'complete',
        glyph: char
      }));
      this._updateTranslationTextDOM();
    } else {
      console.log('[IntroStep._runTranslation] CANCELLED: _introRunning is false');
    }
  }

  /**
   * Update progress bar in DOM directly (no shell.render()).
   * Finds the progress percentage element and updates it in place.
   * This provides visual feedback during animation without triggering full re-renders.
   */
  _updateProgressBarDOM() {
    // Find progress percentage display element
    // Query from the document since we're in an async loop
    const progressPercentEl = document.querySelector('[data-role="intro-progress-percent"]');
    if (progressPercentEl) {
      progressPercentEl.textContent = `${Math.round(this._progress)}%`;
    }

    // Update segmented bar (20 segments)
    const segments = document.querySelectorAll('[data-role="intro-segment"]');
    if (segments.length > 0) {
      const TOTAL_SEGMENTS = segments.length;
      const activeCount = Math.floor((this._progress / 100) * TOTAL_SEGMENTS);
      segments.forEach((seg, i) => {
        if (i < activeCount) {
          seg.classList.add('active');
        } else {
          seg.classList.remove('active');
        }
      });
    }
  }

  /**
   * Update phase label and microlabel in DOM directly (no shell.render()).
   * Shows current phase name in Aurabesh and diegetic system message.
   */
  _updatePhaseDisplayDOM() {
    // Update phase label (Aurabesh text)
    const aurabeshEl = document.querySelector('[data-role="intro-aurabesh"]');
    if (aurabeshEl && this._phase) {
      const phaseData = this.getPhaseData();
      aurabeshEl.textContent = phaseData.phaseAurabesh;
    }

    // Update microlabel (diegetic system messages)
    const microlabelEl = document.querySelector('[data-role="intro-microlabel"]');
    if (microlabelEl) {
      microlabelEl.textContent = `> ${this._currentMicrolabel}`;
    }
  }

  /**
   * DEPRECATED: Old DOM update method. Translation Engine now handles all DOM updates.
   * Kept for reference only.
   *
   * Update translation text in DOM directly (no shell.render()).
   * Builds character HTML with state-based styling for flicker/glow effects.
   * This provides live typewriter effect during translation phase.
   */
  _updateTranslationTextDOM() {
    try {
      // Use cached reference if available, fallback to query
      let translationTextEl = this._translationTextEl;
      if (!translationTextEl) {
        translationTextEl = document.querySelector('[data-role="intro-translation"]');
      }

      if (!translationTextEl) {
        // Translation element not found - this should NOT happen now that template always renders it
        console.error('[IntroStep._updateTranslationTextDOM] CRITICAL: Translation element not found in DOM', {
          phase: this._phase,
          cached: !!this._translationTextEl,
          textLength: this._translatedText.length,
          selector: '[data-role="intro-translation"]'
        });
        return;
      }

      console.log('[IntroStep._updateTranslationTextDOM] Updating translation with', this._translatedText.length, 'characters');

      // Build character HTML with state-based classes
      let charHTML = '';
      for (let i = 0; i < this._translatedText.length; i++) {
        const char = this._translatedText[i];
        const state = this._translationCharStates[i]?.state || 'stable';
        const isGlowing = this._trailPositions?.includes(i);

        let classes = 'prog-intro-char';
        if (state === 'flickering') classes += ' prog-intro-char--flickering';
        else if (state === 'locked' || state === 'complete') classes += ' prog-intro-char--locked';
        if (isGlowing) classes += ' prog-intro-char--glow-trail';

        charHTML += `<span class="${classes}">${char}</span>`;
      }

      translationTextEl.innerHTML = charHTML;
      console.log('[IntroStep._updateTranslationTextDOM] Successfully updated DOM with character HTML');
    } catch (error) {
      console.error('[IntroStep._updateTranslationTextDOM] ERROR:', error.message);
    }
  }

  /**
   * Get a random character from various glyph sets for flicker effect.
   * Creates the illusion of "decryption in progress"
   */
  _getRandomGlyph() {
    const glyphs = ['█', '▓', '▒', '░', '◈', '◊', '◆', '●', '○', '◌', '*', '&', '%', '#', '@', '=', '+'];
    return glyphs[Math.floor(Math.random() * glyphs.length)];
  }

  /**
   * Skip the boot animation and jump to completion state.
   * Can be called by user interaction (click) or programmatically.
   */
  _skipIntro() {
    this._isSkipping = true;
    this._progress = 100;
    this._phase = 'TRANSLATING';
    this._translatedText = this._fullText;  // Instantly show full translated text
    this._complete = true;
    // Re-render via shell will happen automatically
  }

  /**
   * Generate segmented progress bar data (20 segments).
   * Each segment is either active or inactive based on current progress.
   */
  _getProgressSegments() {
    const TOTAL_SEGMENTS = 20;
    const activeCount = Math.floor((this._progress / 100) * TOTAL_SEGMENTS);

    return Array.from({ length: TOTAL_SEGMENTS }, (_, i) => ({
      active: i < activeCount,
    }));
  }

  /**
   * Map current phase to display data (label, aurabesh, state color).
   * Also updates micro-label for diegetic system messages.
   */
  getPhaseData() {
    if (!this._phase) {
      this._currentMicrolabel = '';
      return {
        phaseLabel: 'STANDBY',
        phaseAurabesh: '◈ AWAITING SEQUENCE ◈',
        phaseState: 'processing',
      };
    }

    // Find current phase
    const currentPhase = this._phases.find(p => p.label === this._phase);
    if (!currentPhase) {
      this._currentMicrolabel = '';
      return {
        phaseLabel: this._phase,
        phaseAurabesh: '···',
        phaseState: 'processing',
      };
    }

    // Update micro-label from phase data
    this._currentMicrolabel = currentPhase.microlabel || '';

    // State color logic
    let phaseState = 'processing';  // default: blue
    if (this._phase.includes('UNKNOWN')) {
      phaseState = 'unknown';  // red
    } else if (this._phase.includes('SUCCESS') || this._phase.includes('AUTHORIZED')) {
      phaseState = 'success';  // green
    }

    return {
      phaseLabel: currentPhase.label,
      phaseAurabesh: currentPhase.aurabesh,
      phaseState: phaseState,
    };
  }

  /**
   * Get the zero-based index of the current phase
   * @returns {number} Index of current phase, or -1 if no phase is active
   */
  _getCurrentPhaseIndex() {
    if (!this._phase) return -1;
    return this._phases.findIndex(p => p.label === this._phase);
  }

  /**
   * Transition authoratively to the next step (Species).
   * This is called when the user clicks Continue after intro completes.
   * Coordinates with the ProgressionShell to advance the progression.
   * Uses the shell's internal _onNextStep() method to properly handle the transition.
   */
  async _transitionToNextStep() {
    try {
      // Guard against double transition
      if (this._state !== INTRO_STATE.TRANSITIONING) {
        swseLogger.warn('[IntroStep._transitionToNextStep] Not in TRANSITIONING state, aborting');
        return;
      }

      // Get shell reference
      if (!this._shell) {
        swseLogger.error('[IntroStep._transitionToNextStep] No shell reference, cannot transition');
        return;
      }

      swseLogger.debug('[IntroStep._transitionToNextStep] Beginning transition to next step via shell action');

      // Tell the shell to move to the next step
      // The shell's _onNextStep handles all the logic: blocking issues, plugin callbacks, rendering, etc.
      // We create a fake event since the action system expects one
      const fakeEvent = { preventDefault: () => {}, stopPropagation: () => {} };
      await this._shell._onNextStep(fakeEvent, null);

      swseLogger.debug('[IntroStep._transitionToNextStep] Transition complete, next step should now be active');
    } catch (error) {
      swseLogger.error('[IntroStep._transitionToNextStep] Error during transition', { error: error.message });
      this._transitionInProgress = false;
      this._continueClicked = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Clock & Signal Animation
  // ---------------------------------------------------------------------------

  /**
   * Start the diegetic clock updating every second.
   */
  _startClock() {
    if (this._clockRunning) return;
    this._clockRunning = true;
    this._startTime = Date.now();
    this._clockInterval = setInterval(() => {
      // Clock continues ticking — no need to render unless shell wants to
      // (Clock is updated on each render via _getCurrentTime())
    }, 1000);
  }

  /**
   * Stop the clock.
   */
  _stopClock() {
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
      this._clockInterval = null;
    }
    this._clockRunning = false;
  }

  /**
   * Get current time in HH:MM format for header display.
   */
  _getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Start signal level animation (cycles 0-3).
   */
  _startSignalAnimation() {
    const interval = setInterval(() => {
      this._signalLevel += this._signalDirection;
      if (this._signalLevel >= 3) this._signalDirection = -1;
      if (this._signalLevel <= 0) this._signalDirection = 1;
    }, 400);

    // Store interval for cleanup
    this._signalAnimationInterval = interval;
  }

  /**
   * Stop signal animation.
   */
  _stopSignalAnimation() {
    if (this._signalAnimationInterval) {
      clearInterval(this._signalAnimationInterval);
      this._signalAnimationInterval = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Mentor Integration (Reusing existing translation system)
  // ---------------------------------------------------------------------------

  /**
   * Get mentor context for this step.
   * The intro is diegetic — mentor observes but doesn't speak.
   * The translation moment is handled via the existing mentor translation system.
   */
  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'intro')
      || 'Make your choice wisely.';
  }

  /**
   * Mentor mode for intro — context only, no Ask Mentor button.
   */
  getMentorMode() {
    return 'context-only';
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Simple delay utility.
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
