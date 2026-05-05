// scripts/actors/v2/npc-actor.js
import { computeCharacterDerived } from "/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js";

/**
 * Compute derived data for NPC actors.
 *
 * NPCs currently share the identical derived contract as Characters (Phase 2 design).
 * This is intentional: NPC and Character actors have the same derived structure,
 * defenses, HP, skills, attacks, feats, and action pools.
 *
 * This function is a compatibility pass-through that delegates entirely to
 * computeCharacterDerived(). It exists to preserve the dispatch pattern in
 * base-actor.js and allow for future NPC-specific derived logic without
 * breaking the actor type contract.
 *
 * @param {SWSEActorV2} actor - The NPC actor.
 * @param {object} system - The actor's system data object.
 */
export function computeNpcDerived(actor, system) {
  computeCharacterDerived(actor, system);
}
