/**
 * telekinetic-prodigy-hook.js
 * Telekinetic Prodigy Selection Modifier Hook
 *
 * Correct SWSE behavior:
 *   Prerequisite: Telekinetic Savant.
 *   When the current Force Training selection includes Move Object, add one
 *   extra [Telekinetic] Force Power selection. The slot is event-scoped; it is
 *   not a permanent increase to the actor's baseline Force Power capacity.
 */

import { SelectionModifierHookRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/selection-modifier-hook-registry.js";

export const TELEKINETIC_PRODIGY_HOOK_ID = 'telekinetic-prodigy';

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function actorHasTelekineticProdigy(actor) {
  return Array.from(actor?.items || []).some((item) => (
    item?.type === 'talent' && normalize(item?.name) === 'telekineticprodigy'
  ));
}

function currentSelectionIncludesMoveObject(context = {}) {
  const candidates = [
    ...(Array.isArray(context.selectedPowerIds) ? context.selectedPowerIds : []),
    ...(Array.isArray(context.selectedPowerNames) ? context.selectedPowerNames : []),
    ...(Array.isArray(context.pendingPowerIds) ? context.pendingPowerIds : []),
    ...(Array.isArray(context.pendingPowerNames) ? context.pendingPowerNames : []),
    ...(Array.isArray(context.selectedForcePowers) ? context.selectedForcePowers : []),
  ];

  return candidates.some((entry) => {
    const values = [entry?.name, entry?.label, entry?.title, entry?.id, entry?._id, entry?.powerId, entry]
      .filter(Boolean)
      .map(normalize);
    return values.some((value) => value === 'moveobject' || value.endsWith('moveobject'));
  });
}

/**
 * Pure hook: reads actor/context and appends a single conditional bonus slot
 * only when the current selection event includes Move Object.
 */
function telekineticProdigyHook(actor, context) {
  if (!actorHasTelekineticProdigy(actor)) return;
  if (!currentSelectionIncludesMoveObject(context)) return;

  context.conditionalBonusSlots.push({
    id: `${TELEKINETIC_PRODIGY_HOOK_ID}-move-object-slot`,
    sourceHookId: TELEKINETIC_PRODIGY_HOOK_ID,
    sourcePowerName: 'Move Object',
    descriptorRestrictions: ['telekinetic'],
    powerNameHint: ['Move Object'],
    currentEventOnly: true,
  });
}

export function registerTelekineticProdigyHook() {
  SelectionModifierHookRegistry.register(TELEKINETIC_PRODIGY_HOOK_ID, telekineticProdigyHook);
}

export function unregisterTelekineticProdigyHook() {
  SelectionModifierHookRegistry.unregister(TELEKINETIC_PRODIGY_HOOK_ID);
}
