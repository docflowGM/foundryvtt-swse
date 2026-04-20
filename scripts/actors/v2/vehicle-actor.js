// scripts/actors/v2/vehicle-actor.js

import { buildVehicleDerived } from "/systems/foundryvtt-swse/scripts/actors/v2/vehicle-derived-builder.js";
import { computeCharacterDerived } from "/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js";

/**
 * PHASE 1: Vehicle-specific derived data contract
 *
 * Vehicles now build their own derived structure via buildVehicleDerived(),
 * which normalizes vehicle-specific fields (defenses as objects, hull/hp coercion, identity labels).
 *
 * Vehicles also call computeCharacterDerived to inherit the base contract for shared panels
 * (attacks, actions, etc.) that are not vehicle-specific.
 *
 * NOTE: Condition Track derived values are owned by SWSEV2BaseActor.
 */
export function computeVehicleDerived(actor, system) {
  // PHASE 1: Build vehicle-specific derived contract first
  buildVehicleDerived(actor, system);

  // Then inherit character derived for shared panels (attacks, actions, skills if needed)
  // This gives vehicles the base v2 contract without overwriting vehicle-specific values
  computeCharacterDerived(actor, system);
}
