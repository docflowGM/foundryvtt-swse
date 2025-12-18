/**
 * Unified Error & Notification System
 * AUTO-GENERATED
 */

export const SWSE = {};

SWSE.notify = {
  info: (msg) => ui.notifications.info(msg),
  warn: (msg) => ui.notifications.warn(msg),
  error: (msg) => ui.notifications.error(msg)
};

SWSE.debug = {
  log: (...args) => {
    if (game.settings.get("swse", "debugMode"))
      console.log("SWSE DEBUG:", ...args);
  }
};

export default SWSE;
