/**
 * Mobile Mode Manager
 *
 * Global state manager for touch-friendly mode.
 * Namespace: game.swse.ui.mobileMode
 *
 * Handles:
 * - Reading user preference from flags
 * - Applying `.swse-mobile` class to document.body
 * - Syncing across multiplayer (responds to updateUser hook)
 * - Providing toggleMode() for UI controls
 */

// Initialize namespace
game.swse = game.swse || {};
game.swse.ui = game.swse.ui || {};

/**
 * Mobile Mode Manager
 * Single source of truth for mobile mode state.
 */
game.swse.ui.mobileMode = {
  /**
   * Whether mobile mode is currently enabled
   * @type {boolean}
   */
  enabled: false,

  /**
   * Initialize mobile mode system.
   * Called during Hooks.once('ready').
   * Reads user preference, applies class, and registers watchers.
   */
  init() {
    this.enabled = this._getPreference();
    this._applyMode();
    this._watchForChanges();
  },

  /**
   * Get user's mobile mode preference from flags.
   * Returns false if not explicitly set.
   *
   * @returns {boolean}
   */
  _getPreference() {
    const pref = game.user.getFlag("foundryvtt-swse", "mobileModeEnabled");
    // Explicit null/undefined means not set → default off
    return pref === true;
  },

  /**
   * Apply mobile mode by toggling class on document.body.
   * CSS will handle all layout changes via `.swse-mobile` selectors.
   */
  _applyMode() {
    document.body.classList.toggle("swse-mobile", this.enabled);
  },

  /**
   * Toggle mobile mode on/off.
   * Updates user flag and immediately applies class.
   * No page reload required.
   *
   * @returns {Promise<void>}
   */
  async toggleMode() {
    this.enabled = !this.enabled;
    await game.user.setFlag("foundryvtt-swse", "mobileModeEnabled", this.enabled);
    this._applyMode();
  },

  /**
   * Watch for flag changes from other windows/clients.
   * If current user's mobile mode flag changes, sync it.
   */
  _watchForChanges() {
    Hooks.on("updateUser", (user, changes, options) => {
      // Only react to current user's updates
      if (user.id !== game.user.id) return;

      // Check if mobile mode flag changed
      const newValue = changes.flags?.["foundryvtt-swse"]?.mobileModeEnabled;
      if (newValue !== undefined) {
        this.enabled = newValue === true;
        this._applyMode();
      }
    });
  }
};
