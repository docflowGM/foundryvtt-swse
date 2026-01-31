// scripts/actors/v2/droid-actor.js
import { computeCharacterDerived } from "./character-actor.js";

/**
 * Droids share the same defenses/DT/condition derived contract for Phase 2.
 * (CON and Use the Force are UI concerns / later feature specialization.)
 */
export function computeDroidDerived(actor, system) {
  computeCharacterDerived(actor, system);
}
