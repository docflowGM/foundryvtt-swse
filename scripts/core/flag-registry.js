/**
 * FlagRegistry — Centralized flag scope registration
 *
 * Ensures all document classes have the system flag scope registered
 * during the 'init' hook, preventing flag access errors in render paths.
 *
 * Uses game.system.id to remain rename-safe and fork-safe.
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
    // Register system scope on CONFIG for all document types
    // Uses game.system.id to handle system renames gracefully
    const systemId = game.system.id;
    this.registerScope("Actor", systemId);
    this.registerScope("Item", systemId);
    this.registerScope("ChatMessage", systemId);
    this.registerScope("Combat", systemId);
    this.registerScope("Scene", systemId);
  }
}

// Register during init hook
Hooks.once("init", () => {
  FlagRegistry.initialize();
});
