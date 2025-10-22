// ============================================
// FILE: rolls/saves.js
// Saving throw rolls using SWSE utils
// ============================================

/**
 * Roll a saving throw (uses defense as save in SWSE)
 * @param {Actor} actor - The actor making the save
 * @param {string} type - Save type (fortitude, reflex, will)
 * @returns {Promise<Roll>} The save roll
 */
export async function rollSave(actor, type) {
  const utils = game.swse.utils;
  
  // In SWSE, "saves" are just defense checks
  const def = actor.system.defenses?.[type];
  if (!def) {
    ui.notifications.warn(`Defense type ${type} not found`);
    return null;
  }
  
  const defenseBonus = def.class || 0;
  const abilityScore = actor.system.abilities[def.ability]?.base || 10;
  const abilityMod = utils.math.calculateAbilityModifier(abilityScore);
  const halfLvl = utils.math.halfLevel(actor.system.level);
  
  const totalBonus = defenseBonus + abilityMod + halfLvl;
  
  const roll = await new Roll(`1d20 + ${totalBonus}`).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} rolls a ${utils.string.capitalize(type)} save (${utils.string.formatModifier(totalBonus)})`
  });
  
  return roll;
}

/**
 * Compare save roll against DC
 * @param {Roll} saveRoll - The save roll
 * @param {number} dc - Difficulty class
 * @returns {boolean} True if save succeeded
 */
export function checkSaveSuccess(saveRoll, dc) {
  const success = saveRoll.total >= dc;
  
  if (success) {
    ui.notifications.info(`Save succeeded! (${saveRoll.total} vs DC ${dc})`);
  } else {
    ui.notifications.warn(`Save failed! (${saveRoll.total} vs DC ${dc})`);
  }
  
  return success;
}
