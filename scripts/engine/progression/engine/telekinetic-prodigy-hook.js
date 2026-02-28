/**
 * telekinetic-prodigy-hook.js
 * Telekinetic Prodigy Selection Modifier Hook (Phase 3.5)
 *
 * Implements Telekinetic Prodigy's effect on force power selection.
 *
 * TALENT EFFECT (SWSE):
 *   When you take Force Training, you may select one Telekinetic-descriptor
 *   force power (e.g., Move Object) without it counting against your known
 *   force powers for that Force Training instance.
 *
 * IMPLEMENTATION RULES:
 *   - One conditional bonus slot per Force Training feat instance
 *   - Bonus slot requires telekinetic descriptor or power name "Move Object"
 *   - Base capacity formula is NOT modified
 *   - Hook checks actor items fresh every call — no per-actor state stored
 *   - Per-instance tracking: N Force Training feats → N bonus slots
 *
 * HOOK ID: 'telekinetic-prodigy'
 *
 * Registration:
 *   Call registerTelekineticProdigyHook() once at system init.
 *   The hook itself checks for talent presence each derivation call.
 */

import { SelectionModifierHookRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/selection-modifier-hook-registry.js";

export const TELEKINETIC_PRODIGY_HOOK_ID = 'telekinetic-prodigy';

/**
 * Telekinetic Prodigy hook function
 *
 * Pure: reads actor items, pushes conditional bonus slots into context.
 * Does NOT mutate actor. Does NOT modify context.baseCapacity.
 *
 * @param {Actor} actor - The actor being evaluated
 * @param {Object} context - SelectionContext (conditionalBonusSlots mutated in place)
 */
function telekineticProdigyHook(actor, context) {
  // Require the talent to be present on this actor
  const hasTalent = actor.items.some(
    i => i.type === 'talent' && i.name.toLowerCase().includes('telekinetic prodigy')
  );
  if (!hasTalent) return;

  // One conditional bonus slot per Force Training feat instance
  const forceTrainingFeats = actor.items.filter(
    i => i.type === 'feat' && i.name.toLowerCase().includes('force training')
  );

  for (let i = 0; i < forceTrainingFeats.length; i++) {
    context.conditionalBonusSlots.push({
      id: `${TELEKINETIC_PRODIGY_HOOK_ID}-slot-${i}`,
      sourceHookId: TELEKINETIC_PRODIGY_HOOK_ID,
      // Tracks which Force Training instance grants this slot (0-based index)
      sourceFeatInstanceIndex: i,
      // Power must have the telekinetic descriptor OR be Move Object
      descriptorRestrictions: ['telekinetic'],
      powerNameHint: ['Move Object']
    });
  }
}

/**
 * Register the Telekinetic Prodigy selection modifier hook
 *
 * Call once at system initialization (e.g., Hooks.once('init', ...)).
 * Safe to call multiple times — registry replaces on duplicate id.
 */
export function registerTelekineticProdigyHook() {
  SelectionModifierHookRegistry.register(TELEKINETIC_PRODIGY_HOOK_ID, telekineticProdigyHook);
}

/**
 * Unregister the Telekinetic Prodigy hook
 *
 * For system teardown or test cleanup only.
 * Normal talent removal does NOT need to unregister — the hook checks
 * actor items each call and returns early if the talent is absent.
 */
export function unregisterTelekineticProdigyHook() {
  SelectionModifierHookRegistry.unregister(TELEKINETIC_PRODIGY_HOOK_ID);
}
