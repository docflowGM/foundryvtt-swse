/**
 * Centralized SWSE Settings Manager
 * AUTO-GENERATED
 */

export class SWSESettings {
  static register() {
    const defs = {
      showActionBrowser: { type: Boolean, default: true },
      grappleVariantRules: { type: Boolean, default: false },
      autofireRAW: { type: Boolean, default: false },
      vehicleCTUnified: { type: Boolean, default: true },
      actionEconomyVariant: { type: String, default: "RAW" },
      difficultyScaling: { type: Boolean, default: true },
      debugMode: { type: Boolean, default: false }
    };

    for (const [key, data] of Object.entries(defs)) {
      game.settings.register("swse", key, {
        name: key,
        scope: "world",
        config: true,
        type: data.type,
        default: data.default,
        onChange: value => this._notifySubscribers(key, value)
      });
    }
  }

  static get(key) {
    return game.settings.get("swse", key);
  }

  static set(key, value) {
    return game.settings.set("swse", key, value);
  }

  static _subscribers = new Map();

  static subscribe(key, fn) {
    if (!this._subscribers.has(key)) this._subscribers.set(key, []);
    this._subscribers.get(key).push(fn);
  }

  static _notifySubscribers(key, value) {
    const subs = this._subscribers.get(key);
    if (!subs) return;
    for (const fn of subs) fn(value);
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Settings = SWSESettings;

  SWSESettings.register();
});
