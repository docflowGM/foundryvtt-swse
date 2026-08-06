/**
 * PROGRESSION FRAMEWORK DEBUG CAPTURE
 *
 * Temporary comprehensive instrumentation for the progression engine.
 * Captures errors, state drift, async race conditions, and hydration failures.
 *
 * REMOVABLE: Delete this entire file and remove imports when investigation complete.
 */

export class ProgressionDebugCapture {
  static init() {
    console.log('[SWSE Progression Debug] Initializing global error capture...');

    // Global uncaught error handler
    window.addEventListener('error', (event) => {
      console.error('[SWSE Error] Uncaught error', {
        message: event.message,
        filename: event.filename?.split('/').pop(),
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.split('\n').slice(0, 7).join('\n'),
        current_step: window._progressionCurrentStep ?? '(unknown)',
        focused_item: window._progressionFocusedItem?.name ?? '(none)',
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[SWSE Error] Unhandled promise rejection', {
        reason: event.reason?.message ?? String(event.reason),
        reason_type: event.reason?.constructor?.name ?? typeof event.reason,
        stack: event.reason?.stack?.split('\n').slice(0, 7).join('\n'),
      });
    });

    // Sequence counters
    window._progressionClickSequence = 0;
    window._progressionRenderCycle = 0;
    window._progressionMentorSpeak = 0;

    console.log('[SWSE Progression Debug] Error capture initialized');
  }

  /**
   * Increment and log click sequence
   */
  static nextClickSequence() {
    return ++window._progressionClickSequence;
  }

  /**
   * Increment and log render cycle
   */
  static nextRenderCycle() {
    return ++window._progressionRenderCycle;
  }

  /**
   * Increment and log mentor speak call
   */
  static nextMentorSpeak() {
    return ++window._progressionMentorSpeak;
  }

  /**
   * Store current progression state for error reporting
   */
  static updateState(shell) {
    if (shell) {
      window._progressionCurrentStep = shell.steps?.[shell.currentStepIndex]?.stepId ?? '(unknown)';
      window._progressionFocusedItem = shell.focusedItem ?? null;
      window._progressionMentorState = shell.mentor ? {
        id: shell.mentor.mentorId,
        isAnimating: shell.mentor.isAnimating,
        currentDialogue: shell.mentor.currentDialogue?.slice?.(0, 40),
      } : null;
    }
  }

  /**
   * True when verbose progression tracing is switched on.
   *
   * The per-render/per-click trace below is genuinely useful while diagnosing a
   * render storm and genuinely unreadable the rest of the time — every
   * _prepareContext cycle emitted several unconditional console.log lines. It is
   * now gated behind the same switch the rest of the progression instrumentation
   * uses, so normal sessions stay quiet.
   *
   * Enable with any of:
   *   SWSE_PROGRESSION_TRACE = true
   *   CONFIG.SWSE.debug.progressionTrace = true
   *   the system's performance/debug flag (SWSEPerf)
   *
   * @returns {boolean}
   */
  static isVerbose() {
    if (globalThis.SWSE_PROGRESSION_TRACE === true) return true;
    if (globalThis.CONFIG?.SWSE?.debug?.progressionTrace === true) return true;
    try {
      return globalThis.game?.settings?.get?.('foundryvtt-swse', 'performanceDiagnostics') === true
        || globalThis.game?.settings?.get?.('foundryvtt-swse', 'debugMode') === true;
    } catch (_err) {
      return false;
    }
  }

  /**
   * Log structured debug info. No-op unless verbose tracing is enabled.
   */
  static log(category, message, data = {}) {
    if (!this.isVerbose()) return;
    console.log(`[SWSE ${category}] ${message}`, data);
  }

  /**
   * Log state drift detection
   */
  static detectStateDrift(condition, description, state) {
    if (condition) {
      console.warn('[SWSE State Drift]', description, state);
    }
  }
}

// Auto-init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ProgressionDebugCapture.init());
} else {
  ProgressionDebugCapture.init();
}
