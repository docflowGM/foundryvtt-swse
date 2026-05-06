// scripts/actors/v2/droid-actor.js
import { computeCharacterDerived } from "/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js";

/**
 * Droid configuration remains PRIMARY state in system.droidSystems.
 * Only computed mechanical effects are mirrored into system.derived.
 * This ensures builder modifications don't break derived calculations.
 */

/**
 * Ensure droid configuration has null-safe defaults.
 * Called before derived computation to prevent undefined field access.
 * Does NOT overwrite existing values (uses nullish coalescing only).
 *
 * @param {Object} system - actor.system object
 */
function ensureDroidSystemsDefaults(system) {
  const ds = system.droidSystems ??= {};

  // Configuration defaults (empty/unset state)
  ds.buildHistory ??= [];
  ds.degree ??= '';
  ds.size ??= '';
  ds.stateMode ??= 'NEW';
  system.droidStatus ??= { state: 'active', source: '', timestamp: 0, notes: '' };

  // Component defaults (nested objects)
  ds.locomotion ??= { name: '', speed: 0 };
  ds.processor ??= { name: '', active: true, slotKey: 'primaryProcessor' };
  ds.armor ??= { name: '', rating: 0 };

  // Collection defaults (arrays)
  ds.processors ??= [];
  ds.appendages ??= [];
  ds.appendageSlots ??= [
    { key: 'leftArm', label: 'Left Arm', required: true, installedId: '', active: true },
    { key: 'rightArm', label: 'Right Arm', required: true, installedId: '', active: true }
  ];
  ds.sensors ??= [];
  ds.weapons ??= [];
  ds.accessories ??= [];

  // Cost tracking
  ds.credits ??= { spent: 0, total: 0 };
}

/**
 * Droids share the same defenses/DT/condition derived contract for Phase 2.
 * (CON and Use the Force are UI concerns / later feature specialization.)
 */
export function computeDroidDerived(actor, system) {
  // Ensure droid configuration has safe defaults before computing derived
  ensureDroidSystemsDefaults(system);

  // Mirror character-derived fields (defenses, HP, condition track)
  computeCharacterDerived(actor, system);
}
