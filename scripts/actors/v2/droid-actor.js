// scripts/actors/v2/droid-actor.js
import { computeCharacterDerived } from "/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js";
import { isDroidStatblockMode, computeStatblockDerivedOverrides } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";

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
 * PHASE 3 — Droid Stock-Statblock Authority: mirror a stock-imported
 * droid's own stored, published totals into system.derived so the sheet
 * (which reads system.derived per the V2 contract) shows the published
 * statblock instead of computeCharacterDerived()'s placeholder defaults.
 * HP, skills, attacks, and Speed are not touched here — they were verified
 * (not assumed) to already read the stored value directly or fall back to
 * it correctly; see computeStatblockDerivedOverrides()'s own doc comment
 * and docs/audits/droid-stock-statblock-authority-phase-3.md's
 * domain-by-domain policy table for exactly why each field is or isn't
 * touched here.
 *
 * Value selection itself lives in computeStatblockDerivedOverrides() (a
 * pure, unit-tested function) — this only applies those values to the live
 * system.derived object, at the exact field paths real consumers read.
 *
 * @param {Object} system - actor.system object, already carrying computeCharacterDerived()'s output
 */
function applyPublishedStatblockDerivedOverrides(system) {
  const overrides = computeStatblockDerivedOverrides(system);

  if (overrides.bab !== null) system.derived.bab = overrides.bab;

  for (const [key, total] of Object.entries(overrides.defenses)) {
    system.derived.defenses[key] = { ...(system.derived.defenses[key] ?? {}), total };
  }

  // Flat field — NOT system.derived.damage.threshold (see
  // computeStatblockDerivedOverrides()'s doc comment for why that
  // distinction matters).
  if (overrides.damageThreshold !== null) system.derived.damageThreshold = overrides.damageThreshold;

  if (overrides.initiative !== null) {
    const dexModifier = Number(system.derived?.initiative?.dexModifier) || 0;
    system.derived.initiative = { ...(system.derived.initiative ?? {}), dexModifier, adjustment: 0, total: overrides.initiative };
  }
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

  if (isDroidStatblockMode(actor)) {
    applyPublishedStatblockDerivedOverrides(system);
  }
}
