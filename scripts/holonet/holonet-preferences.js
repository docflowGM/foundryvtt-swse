/**
 * Holonet Preferences
 *
 * Settings boundary for Holonet notification preferences
 * Supports GM global and player local preferences
 */

export class HolonetPreferences {
  static NS = 'foundryvtt-swse';

  // Default preference categories
  static CATEGORIES = {
    MESSAGES: 'messages',
    EVENTS: 'events',
    APPROVALS: 'approvals',
    STORE_TRANSACTIONS: 'store_transactions',
    PROGRESSION: 'progression',
    OBJECTIVES: 'objectives',
    MENTOR: 'mentor',
    REWARDS: 'rewards'
  };

  /**
   * Register preference settings
   */
  static registerSettings() {
    // GM global: enable/disable by category
    for (const [key, categoryId] of Object.entries(this.CATEGORIES)) {
      game.settings.register(this.NS, `holonet_gm_${categoryId}`, {
        name: `Holonet GM: ${key}`,
        scope: 'world',
        config: false,
        type: Boolean,
        default: true
      });
    }

    // Player local: enable/disable by category
    for (const [key, categoryId] of Object.entries(this.CATEGORIES)) {
      game.settings.register(this.NS, `holonet_player_${categoryId}`, {
        name: `Holonet Player: ${key}`,
        scope: 'client',
        config: false,
        type: Boolean,
        default: true
      });
    }
  }

  /**
   * Check if a category is enabled (GM global)
   */
  static isGMCategoryEnabled(categoryId) {
    return game.settings.get(this.NS, `holonet_gm_${categoryId}`) ?? true;
  }

  /**
   * Set GM category enabled/disabled
   */
  static setGMCategoryEnabled(categoryId, enabled) {
    if (!game.user?.isGM) return false;
    game.settings.set(this.NS, `holonet_gm_${categoryId}`, enabled);
    return true;
  }

  /**
   * Check if a category is enabled (player local)
   */
  static isPlayerCategoryEnabled(categoryId) {
    return game.settings.get(this.NS, `holonet_player_${categoryId}`) ?? true;
  }

  /**
   * Set player category enabled/disabled
   */
  static setPlayerCategoryEnabled(categoryId, enabled) {
    game.settings.set(this.NS, `holonet_player_${categoryId}`, enabled);
    return true;
  }

  /**
   * Check if notification should be delivered
   * Respects both GM and player preferences
   */
  static shouldNotify(categoryId) {
    const gmEnabled = this.isGMCategoryEnabled(categoryId);
    const playerEnabled = this.isPlayerCategoryEnabled(categoryId);
    return gmEnabled && playerEnabled;
  }

  /**
   * Get all preference categories
   */
  static getCategories() {
    return Object.values(this.CATEGORIES);
  }
}
