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
 * PHASE 3 — Droid Authority Consolidation: mirror a stock-imported droid's
 * own stored, published totals into system.derived so the sheet (which
 * reads system.derived per the V2 contract) shows the published statblock
 * instead of computeCharacterDerived()'s placeholder defaults. HP and
 * skills are not touched here — mirrorHp()/mirrorSkills() already read the
 * stored system.hp / stored skill totals directly and are safe as-is;
 * attacks are also safe, since mirrorAttacks() reads each integrated
 * weapon Item's own system.attackBonus rather than computing one from BAB.
 * The values actually at risk are BAB and the three core defenses (plus
 * Damage Threshold), which computeCharacterDerived() otherwise leaves at
 * hardcoded 10/10 placeholders once shouldSkipDerivedData() (see
 * scripts/utils/hardening.js) stops DerivedCalculator from ever running for
 * this actor. See docs/audits/droid-authority-consolidation-phase-3.md.
 *
 * Value selection itself lives in computeStatblockDerivedOverrides() (a
 * pure, unit-tested function) — this only applies those values to the live
 * system.derived object.
 *
 * @param {Object} system - actor.system object, already carrying computeCharacterDerived()'s output
 */
function applyPublishedStatblockDerivedOverrides(system) {
  const overrides = computeStatblockDerivedOverrides(system);

  system.derived.attacks ??= {};
  if (overrides.bab !== null) system.derived.attacks.bab = overrides.bab;

  for (const [key, total] of Object.entries(overrides.defenses)) {
    system.derived.defenses[key] = { ...(system.derived.defenses[key] ?? {}), total };
  }

  if (overrides.damageThreshold !== null) system.derived.damage.threshold = overrides.damageThreshold;
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
