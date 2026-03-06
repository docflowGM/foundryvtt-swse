/**
 * FlagRegistry — Centralized flag scope registration
 *
 * Ensures all document classes have the 'swse' flag scope registered
 * during the 'init' hook, preventing flag access errors in render paths.
 *
 * No side effects. Idempotent. Pure metadata registration.
 */

export class FlagRegistry {
  static registerScope(configKey, scope) {
    // Register flag scope on CONFIG object (not metadata)
    // Example: CONFIG.Actor.flags.swse = {}
    if (!CONFIG[configKey]) {
      CONFIG[configKey] = {};
    }

    if (!CONFIG[configKey].flags) {
      CONFIG[configKey].flags = {};
    }

    // Register scope if not already present
    if (!CONFIG[configKey].flags[scope]) {
      CONFIG[configKey].flags[scope] = {};
    }
  }

  static initialize() {
    // Register 'swse' scope on CONFIG for all document types
    this.registerScope("Actor", "swse");
    this.registerScope("Item", "swse");
    this.registerScope("ChatMessage", "swse");
    this.registerScope("Combat", "swse");
    this.registerScope("Scene", "swse");
  }
}

// Register during init hook
Hooks.once("init", () => {
  FlagRegistry.initialize();
});
