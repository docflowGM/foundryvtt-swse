/**
 * selection-modifier-hook-registry.js
 * Selection Modifier Hook Registry (Phase 3.5)
 *
 * Provides a static registry for talent-based selection modifier hooks.
 * Hooks are pure functions that enrich a SelectionContext during derivation.
 *
 * CRITICAL RULES:
 * 1. Hooks are PURE - no mutations, no side effects on actor
 * 2. Hooks enrich context only - never modify base capacity formula
 * 3. Registry is global; hooks apply fresh every call (no caching)
 * 4. Hook functions receive (actor, context) and add to context.conditionalBonusSlots
 *
 * Hook function signature:
 *   (actor: Actor, context: SelectionContext) => void
 *
 * SelectionContext shape:
 *   {
 *     baseCapacity: number,             // Derived base (Force Sensitivity + Force Training + class/template)
 *     conditionalBonusSlots: Array<{   // Talent-granted conditional bonus slots
 *       id: string,                     // Unique slot ID
 *       sourceHookId: string,           // Hook that created this slot
 *       sourceFeatInstanceIndex: number, // Which Force Training instance (0-based)
 *       descriptorRestrictions: string[], // Power must match one of these descriptors
 *       powerNameHint: string[]         // Specific power names that qualify (for UI + matching)
 *     }>,
 *     totalCapacity: number             // Recalculated after all hooks run
 *   }
 */

export class SelectionModifierHookRegistry {
  static #hooks = new Map();

  /**
   * Register a selection modifier hook
   *
   * @param {string} hookId - Unique hook identifier (e.g., 'telekinetic-prodigy')
   * @param {Function} hookFn - Hook function: (actor, context) => void
   */
  static register(hookId, hookFn) {
    if (typeof hookFn !== 'function') {
      throw new Error(`[SELECTION HOOK REGISTRY] Hook "${hookId}" must be a function`);
    }
    SelectionModifierHookRegistry.#hooks.set(hookId, hookFn);
  }

  /**
   * Unregister a selection modifier hook
   *
   * @param {string} hookId - Hook identifier to remove
   */
  static unregister(hookId) {
    SelectionModifierHookRegistry.#hooks.delete(hookId);
  }

  /**
   * Apply all registered hooks to a SelectionContext
   * Called from ForceAuthorityEngine.getSelectionContext()
   *
   * After all hooks run, recalculates context.totalCapacity.
   *
   * @param {Actor} actor - The actor
   * @param {Object} context - SelectionContext to enrich (mutated in place)
   */
  static applyAll(actor, context) {
    for (const [hookId, hookFn] of SelectionModifierHookRegistry.#hooks) {
      try {
        hookFn(actor, context);
      } catch (e) {
        console.error(`[SELECTION HOOK REGISTRY] Hook "${hookId}" threw error`, e);
      }
    }
    // Recalculate totalCapacity after all hooks have run
    context.totalCapacity = context.baseCapacity + context.conditionalBonusSlots.length;
  }

  /**
   * Get all registered hook IDs (for diagnostics)
   * @returns {string[]}
   */
  static getRegisteredHookIds() {
    return [...SelectionModifierHookRegistry.#hooks.keys()];
  }

  /**
   * Check if a specific hook is registered
   * @param {string} hookId
   * @returns {boolean}
   */
  static has(hookId) {
    return SelectionModifierHookRegistry.#hooks.has(hookId);
  }
}
