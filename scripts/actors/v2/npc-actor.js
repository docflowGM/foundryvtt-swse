// scripts/actors/v2/npc-actor.js
import { computeCharacterDerived } from "/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js";

/**
 * NPCs share the same minimal derived contract as Characters for Phase 2.
 */
export function computeNpcDerived(actor, system) {
  computeCharacterDerived(actor, system);
}
