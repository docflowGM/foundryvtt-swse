/**
 * IntroStep plugin
 *
 * Versafunction Datapad Boot Sequence — Diegetic chargen introduction.
 * Establishes immersive tone and in-universe flavor before character creation begins.
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

export class IntroStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // Sequence state
    this._currentStep = 0;                    // 0-5 for 6-step sequence
    this._sequenceComplete = false;           // True when user clicks Continue
    this._bootSequenceData = [
      // Step 0: System Boot
      {
        stepNum: 1,
        label: 'INITIATING DATAPAD BOOT',
        aurabesh: 'RNAI GOR RAVATAH',
        state: 'processing', // blue (normal) during text, amber during processing
      },
      // Step 1: System Check
      {
        stepNum: 2,
        label: 'SYSTEMS CHECK',
        aurabesh: 'PATEK THARA VAUN',
        state: 'processing',
      },
      // Step 2: Network Scan
      {
        stepNum: 3,
        label: 'NETWORK SCAN',
        aurabesh: 'TAKRA MANDALAKI',
        state: 'processing',
      },
      // Step 3: Identity Query
      {
        stepNum: 4,
        label: 'IDENTITY QUERY',
        aurabesh: 'KESH NARI NABUKT',
        state: 'processing',
      },
      // Step 4: Authorization Check (Unknown response = red)
      {
        stepNum: 5,
        label: 'IDENTITY UNKNOWN',
        aurabesh: 'KARESH VANDALOR MUSK',
        state: 'unknown', // red
      },
      // Step 5: Authorization Override (Success = green)
      {
        stepNum: 6,
        label: 'OVERRIDE AUTHORIZED',
        aurabesh: 'KARATH MANDALAI VESKOR',
        state: 'success', // green
      },
    ];

    // Clock state
    this._clockRunning = false;
    this._startTime = null;
    this._clockInterval = null;

    // Signal animation state
    this._signalLevel = 0;
    this._signalDirection = 1;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Enable mentor for flavor context (but not Ask Mentor — this is intro only)
    shell.mentor.askMentorEnabled = false;

    // Initialize boot sequence display
    this._currentStep = 0;
    this._sequenceComplete = false;

    // Start clock and signal animation
    this._startClock();
    this._startSignalAnimation();
  }

  async onStepExit(shell) {
    // Clean up clock and signal animations
    this._stopClock();
    this._stopSignalAnimation();
  }

  async onDataReady(shell) {
    // Auto-advance through boot sequence with timing.
    // The Continue button uses data-action="next-step" and is handled by the shell's
    // ApplicationV2 action delegation — no manual event listener needed here.
    this._autoAdvanceSequence(shell);
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    const total = this._bootSequenceData.length;
    const stepNum = this._currentStep + 1;  // 1-indexed for display

    return {
      currentStep: this._currentStep,
      sequenceComplete: this._sequenceComplete,
      bootSequenceData: this._bootSequenceData,
      currentStepData: this._bootSequenceData[this._currentStep] || {},
      currentTime: this._getCurrentTime(),
      systemName: 'VERSAFUNCTION DATAPAD',
      battery: 85,

      // Pre-computed so the template needs no custom math helpers (div, add, length)
      stepNumber: stepNum,
      bootSequenceLength: total,
      progressPercent: Math.round((stepNum / total) * 100),

      // Pre-computed signal bar states so the template needs no custom loop/lte helpers
      // 4 bars: bar i is active when i <= current signal level
      signalBars: [0, 1, 2, 3].map(i => ({ active: i <= this._signalLevel })),
    };
  }

  getSelection() {
    // Intro step has no selection mechanism — it's purely immersive
    return {
      selected: [],
      count: 0,
      isComplete: this._sequenceComplete,
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
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/intro-work-surface.hbs',
      data: stepData,
    };
  }

  // ---------------------------------------------------------------------------
  // Boot Sequence Logic
  // ---------------------------------------------------------------------------

  /**
   * Auto-advance through boot sequence at defined intervals.
   * Each step displays its Aurabesh text, then advances to next step.
   */
  async _autoAdvanceSequence(shell) {
    if (this._currentStep >= this._bootSequenceData.length) {
      this._sequenceComplete = true;
      shell.render();
      return;
    }

    // Display current step for duration, then advance
    const displayDuration = 800 + (this._currentStep * 200); // Increasing delays
    await this.delay(displayDuration);

    if (this._currentStep < this._bootSequenceData.length - 1) {
      this._currentStep++;
      shell.render();
      // Recursively advance next step
      this._autoAdvanceSequence(shell);
    } else {
      // Final step displayed, wait for user to continue
      this._sequenceComplete = true;
      shell.render();
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
  getMentorContext() {
    return this._sequenceComplete
      ? 'Welcome, young one. Your datapad awaits your command.'
      : '';
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
