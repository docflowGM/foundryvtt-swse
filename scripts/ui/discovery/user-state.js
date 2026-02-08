/**
 * Discovery User State Manager
 *
 * Persists per-user discovery state (dismissed callouts, tour completion)
 * using Foundry client-scoped settings.
 */

const SETTING_KEY = 'discoveryState';
const SYSTEM_ID = 'foundryvtt-swse';

const DEFAULT_STATE = Object.freeze({
  dismissedCallouts: [],
  tourCompleted: false,
  version: 1
});

let _state = null;

export const DiscoveryUserState = {

  /**
   * Register the client-scoped setting that stores discovery state.
   * Must be called during 'init' hook.
   */
  registerSetting() {
    game.settings.register(SYSTEM_ID, SETTING_KEY, {
      name: 'Discovery State',
      hint: 'Stores per-user discovery UI state',
      scope: 'client',
      config: false,
      type: Object,
      default: { ...DEFAULT_STATE }
    });
  },

  /** Load state from setting into memory. Call once on 'ready'. */
  load() {
    try {
      const raw = game.settings.get(SYSTEM_ID, SETTING_KEY);
      _state = Object.assign({}, DEFAULT_STATE, raw);
    } catch {
      _state = { ...DEFAULT_STATE };
    }
  },

  /** @returns {object} current state (read-only copy) */
  get() {
    if (!_state) this.load();
    return { ..._state };
  },

  /** Persist current in-memory state to Foundry setting. */
  async _save() {
    await game.settings.set(SYSTEM_ID, SETTING_KEY, { ..._state });
  },

  // --- Callout helpers ---

  /**
   * @param {string} calloutId
   * @returns {boolean} true if this callout was already dismissed
   */
  isCalloutDismissed(calloutId) {
    if (!_state) this.load();
    return _state.dismissedCallouts.includes(calloutId);
  },

  /** Mark a callout as dismissed and persist. */
  async dismissCallout(calloutId) {
    if (!_state) this.load();
    if (_state.dismissedCallouts.includes(calloutId)) return;
    _state.dismissedCallouts.push(calloutId);
    await this._save();
  },

  // --- Tour helpers ---

  /** @returns {boolean} */
  isTourCompleted() {
    if (!_state) this.load();
    return _state.tourCompleted;
  },

  async completeTour() {
    if (!_state) this.load();
    _state.tourCompleted = true;
    await this._save();
  },

  // --- Reset (GM only) ---

  /** Reset all discovery state for the current user. */
  async reset() {
    _state = { ...DEFAULT_STATE };
    await this._save();
    console.log('SWSE | Discovery state reset');
  }
};
