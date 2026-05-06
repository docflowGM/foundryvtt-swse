/**
 * Holonet Preferences
 *
 * Settings boundary for Holonet notification preferences.
 */

export class HolonetPreferences {
  static NS = 'foundryvtt-swse';

  static CATEGORIES = {
    MESSAGES: 'messages',
    EVENTS: 'events',
    APPROVALS: 'approvals',
    STORE_TRANSACTIONS: 'store_transactions',
    STORE: 'store',
    PROGRESSION: 'progression',
    OBJECTIVES: 'objectives',
    MENTOR: 'mentor',
    REWARDS: 'rewards',
    HEALING: 'healing',
    SHIP: 'ship',
    DROID: 'droid',
    FOLLOWER: 'follower'
  };

  static registerSettings() {
    for (const [key, categoryId] of Object.entries(this.CATEGORIES)) {
      game.settings.register(this.NS, `holonet_gm_${categoryId}`, {
        name: `Holonet GM: ${key}`,
        scope: 'world',
        config: false,
        type: Boolean,
        default: true
      });
    }

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

  static isGMCategoryEnabled(categoryId) {
    return game.settings.get(this.NS, `holonet_gm_${categoryId}`) ?? true;
  }

  static setGMCategoryEnabled(categoryId, enabled) {
    if (!game.user?.isGM) return false;
    game.settings.set(this.NS, `holonet_gm_${categoryId}`, enabled);
    return true;
  }

  static isPlayerCategoryEnabled(categoryId) {
    return game.settings.get(this.NS, `holonet_player_${categoryId}`) ?? true;
  }

  static setPlayerCategoryEnabled(categoryId, enabled) {
    game.settings.set(this.NS, `holonet_player_${categoryId}`, enabled);
    return true;
  }

  static shouldEmit(categoryId) {
    return this.isGMCategoryEnabled(categoryId);
  }

  static shouldDisplay(categoryId) {
    return this.isGMCategoryEnabled(categoryId) && this.isPlayerCategoryEnabled(categoryId);
  }

  static shouldNotify(categoryId) {
    return this.shouldDisplay(categoryId);
  }

  static getCategories() {
    return Object.values(this.CATEGORIES);
  }
}
