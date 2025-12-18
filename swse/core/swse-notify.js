/**
 * SWSE Notify / Debug / Error Handling
 * AUTO-GENERATED
 */

export class SWSENotify {
  static info(msg, opts = {}) {
    ui.notifications.info(msg, opts);
  }

  static warn(msg, opts = {}) {
    ui.notifications.warn(msg, opts);
  }

  static error(msg, opts = {}) {
    ui.notifications.error(msg, opts);
  }

  static debug(...args) {
    if (game.settings.get("swse", "debugMode")) {
      console.log("%cSWSE DEBUG:", "color:#4af", ...args);
    }
  }

  static async safeAsync(fn, context = {}) {
    try {
      return await fn();
    } catch (err) {
      console.error("SWSE Error:", err, context);
      this.error("An SWSE error occurred. Check console for details.");
      throw err;
    }
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Notify = SWSENotify;

  game.swse = game.swse ?? {};
  game.swse.notify = SWSENotify;
});
