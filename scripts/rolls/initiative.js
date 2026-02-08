// ============================================
// FILE: rolls/initiative.js
// Initiative rolling using SWSE utils
// ============================================

/**
 * Roll initiative for an actor
 * @param {Actor} actor - The actor rolling initiative
 * @returns {Promise<Roll>} The initiative roll
 */
export async function rollInitiative(actor) {
  const utils = game.swse.utils;

  const dexScore = actor.system.attributes?.dex?.base || 10;
  const dexMod = utils.math.calculateAbilityModifier(dexScore);
  const initiativeBonus = actor.system.initiative?.bonus || 0;

  const totalBonus = dexMod + initiativeBonus;

  const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${totalBonus}`).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${actor.name} rolls initiative! (${utils.string.formatModifier(totalBonus)})`
  } , { create: true });

  return roll;
}

/**
 * Roll initiative for multiple actors
 * @param {Actor[]} actors - Array of actors
 * @returns {Promise<object[]>} Array of results
 */
export async function rollGroupInitiative(actors) {
  const results = [];

  for (const actor of actors) {
    const roll = await rollInitiative(actor);
    results.push({
      actor,
      roll,
      total: roll.total
    });
  }

  // Sort by initiative result (highest first)
  results.sort((a, b) => b.total - a.total);

  return results;
}

/**
 * Set initiative for a combatant
 * @param {Actor} actor - The actor
 * @param {number} initiative - Initiative value
 */
export async function setInitiative(actor, initiative) {
  const combatant = game.combat?.combatants?.find(c => c.actor.id === actor.id);

  if (combatant) {
    await game.combat.setInitiative(combatant.id, initiative);
    ui.notifications.info(`${actor.name} initiative set to ${initiative}`);
  }
}
