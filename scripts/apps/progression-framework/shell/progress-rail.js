
/**
 * Progress Rail — manages step indicator DOM, navigation, and hook API.
 * Does NOT import or wrap sidebar.js (clean new implementation).
 * Its hook API (swse:sidebar:navigate) remains compatible with engine listeners.
 */
export class ProgressRail {
  constructor(shell) {
    this.shell = shell;
    this._handlers = [];
    this._lastScrolledStepId = null;
  }

  afterRender(regionEl) {
    if (!regionEl) return;
    this._cleanup();
    this._wireStepClicks(regionEl);
    this._scrollCurrentIntoView(regionEl);
  }

  _wireStepClicks(regionEl) {
    regionEl.querySelectorAll('.prog-step[tabindex="0"]').forEach((el) => {
      const fn = (event) => {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const stepId = el.dataset.stepId;
        const stepIndex = parseInt(el.dataset.stepIndex, 10);
        this._navigate(stepId, stepIndex);
      };
      el.addEventListener('click', fn);
      el.addEventListener('keydown', fn);
      this._handlers.push({ el, event: 'click', fn }, { el, event: 'keydown', fn });
    });
  }

  _navigate(stepId, stepIndex) {
    this.shell.navigateToStep(stepIndex, { source: 'progress-rail' });
    Hooks.callAll('swse:sidebar:navigate', { stepId, stepIndex });
  }

  _scrollCurrentIntoView(regionEl) {
    const active = regionEl.querySelector('.prog-step--active');
    if (!active) return;

    const activeStepId = active.dataset.stepId || active.dataset.stepIndex || null;
    if (activeStepId && this._lastScrolledStepId === activeStepId) {
      return;
    }

    this._lastScrolledStepId = activeStepId;
    active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  _cleanup() {
    this._handlers.forEach(({ el, event, fn }) => el.removeEventListener(event, fn));
    this._handlers = [];
  }
}
