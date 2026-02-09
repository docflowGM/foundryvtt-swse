// scripts/actors/v2/vehicle-actor.js

import { computeCharacterDerived } from './character-actor.js';

/**
 * Vehicles have their own derived rules in later phases.
 * For Phase 2 we provide a safe minimal contract so the v2 sheet renders.
 *
 * NOTE: Condition Track derived values are owned by SWSEV2BaseActor.
 */
export function computeVehicleDerived(actor, system) {
  // Vehicles share a subset of the character v2-derived contract in Phase 2.5
  // so the same holo panels (HP, Defenses, Attacks, Actions) can render.
  computeCharacterDerived(actor, system);

  // Vehicle-specific identity mirrors (safe defaults).
  system.derived.identity ??= {};
  system.derived.identity.typeLabel = system.derived.identity.typeLabel ?? 'Vehicle';
}
