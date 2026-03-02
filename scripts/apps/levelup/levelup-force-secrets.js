/**
 * levelup-force-secrets.js
 * Handle Force Secret selection during level-up
 */

import { ForceSecretEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-secret-engine.js";

export async function getsForceSecrets(selectedClass, actor) {
  // Check if character qualifies for Force Secret choices
  // This would be determined by prestige classes or specific features
  // For now, return false - to be implemented based on class data
  return false;
}

export async function handleForceSecretStep(actor, engine) {
  // Open the Force Secret picker automatically
  const count = engine.data.forceSecretChoices?.reduce((sum, c) => sum + (c.value || 1), 0) || 0;

  if (count > 0) {
    await ForceSecretEngine.handleForceSecretTriggers(actor, count);
    return true;
  }

  return false;
}
