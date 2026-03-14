/**
 * Progress Rail — manages step indicator DOM, navigation, and hook API.
 * Does NOT import or wrap sidebar.js (clean new implementation).
 * Its hook API (swse:sidebar:navigate) remains compatible with engine listeners.
 */
export class ProgressRail {
  constructor(shell) {
    this.shell = shell;
    this._handlers = []; // { el, event, fn } — tracked for cleanup before re-render
  }

  /**
   * Called by shell._onRender() after every render.
   * @param {HTMLElement} regionEl — the [data-region="progress-rail"] element
   */
  afterRender(regionEl) {
    if (!regionEl) return;
    this._cleanup();
    this._wireStepClicks(regionEl);
    this._scrollCurrentIntoView(regionEl);
  }

  /**
   * Wire click and keydown handlers to completed steps.
   * Completed steps have tabindex="0" (keyboard-accessible).
   * @param {HTMLElement} regionEl
   * @private
   */
  _wireStepClicks(regionEl) {
    regionEl.querySelectorAll('.prog-step[tabindex="0"]').forEach(el => {
      const fn = (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        const stepId = el.dataset.stepId;
        const stepIndex = parseInt(el.dataset.stepIndex, 10);
        this._navigate(stepId, stepIndex);
      };
      el.addEventListener('click', fn);
      el.addEventListener('keydown', fn);
      this._handlers.push({ el, event: 'click', fn }, { el, event: 'keydown', fn });
    });
  }

  /**
   * Navigate to a step. Routes through shell.navigateToStep() for policy enforcement.
   * @param {string} stepId
   * @param {number} stepIndex
   * @private
   */
  _navigate(stepId, stepIndex) {
    // Navigation policy is shell-owned — progress rail only requests, does not mutate
    this.shell.navigateToStep(stepIndex, { source: 'progress-rail' });
    // Emit hook for engine listener compatibility
    Hooks.callAll('swse:sidebar:navigate', { stepId, stepIndex });
  }

  /**
   * Scroll the active step into view smoothly.
   * @param {HTMLElement} regionEl
   * @private
   */
  _scrollCurrentIntoView(regionEl) {
    regionEl.querySelector('.prog-step--active')
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /**
   * Clean up event handlers before re-render.
   * @private
   */
  _cleanup() {
    this._handlers.forEach(({ el, event, fn }) => el.removeEventListener(event, fn));
    this._handlers = [];
  }
}
