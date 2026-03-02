/**
 * levelup-force-techniques.js
 * Handle Force Technique selection during level-up
 */

import { ForceTechniqueEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-technique-engine.js";

export async function getsForceaTechniques(selectedClass, actor) {
  // Check if character qualifies for Force Technique choices
  // This would be determined by prestige classes or specific features
  // For now, return false - to be implemented based on class data
  return false;
}

export async function handleForceTechniqueStep(actor, engine) {
  // Open the Force Technique picker automatically
  const count = engine.data.forceTechniqueChoices?.reduce((sum, c) => sum + (c.value || 1), 0) || 0;

  if (count > 0) {
    await ForceTechniqueEngine.handleForceTechniqueTriggers(actor, count);
    return true;
  }

  return false;
}
