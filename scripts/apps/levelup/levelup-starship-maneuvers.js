/**
 * levelup-starship-maneuvers.js
 * Handle Starship Maneuver selection during level-up
 */

import { StarshipManeuverEngine } from '../../progression/engine/starship-maneuver-engine.js';

export async function getsStarshipManeuvers(selectedClass, actor) {
  // Check if character has Starship Tactics feat
  // Only then can they select maneuvers
  const hasFeat = actor.items.some(i => i.name === 'Starship Tactics' && i.type === 'feat');
  return hasFeat;
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
