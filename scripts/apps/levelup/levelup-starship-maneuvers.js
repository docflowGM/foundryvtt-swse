/**
 * levelup-starship-maneuvers.js
 * Handle Starship Maneuver selection during level-up
 */

import { StarshipManeuverEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/starship-maneuver-engine.js";
import { CapabilityRegistry } from "/systems/foundryvtt-swse/scripts/engine/capabilities/capability-registry.js";
import { CAPABILITY_SLUGS } from "/systems/foundryvtt-swse/scripts/constants/capability-slugs.js";

export async function getsStarshipManeuvers(selectedClass, actor) {
  // Check if character has Starship Tactics feat
  // Only then can they select maneuvers
  return CapabilityRegistry.hasFeat(actor, CAPABILITY_SLUGS.STARSHIP_TACTICS);
}

export async function handleStarshipManeuverStep(actor, engine) {
  // Open the Starship Maneuver picker automatically
  const count = engine.data.starshipManeuverChoices?.reduce((sum, c) => sum + (c.value || 1), 0) || 0;

  if (count > 0) {
    await StarshipManeuverEngine.handleStarshipManeuverTriggers(actor, count);
    return true;
  }

  return false;
}
