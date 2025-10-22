// ============================================
// FILE: rolls/damage.js
// Damage roll handling using SWSE utils
// ============================================

/**
 * Roll generic damage
 * @param {Actor} actor - The actor dealing damage
 * @param {Item} weapon - The weapon or power being used
 * @returns {Promise<Roll>} The damage roll
 */
export async function rollDamage(actor, weapon) {
  const dmg = weapon.system?.damage || "1d6";
  const roll = await new Roll(dmg).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${actor.name} deals damage with ${weapon.name}`
  });
  
  return roll;
}

/**
 * Roll damage with modifiers
 * @param {Actor} actor - The actor dealing damage
 * @param {string} formula - Damage dice formula
 * @param {number} modifier - Damage modifier
 * @param {string} label - Damage type/label
 * @returns {Promise<Roll>} The damage roll
 */
export async function rollDamageWithMod(actor, formula, modifier = 0, label = "Damage") {
  const utils = game.swse.utils;
  const fullFormula = `${formula} + ${modifier}`;
  
  const roll = await new Roll(fullFormula).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${label} (${utils.string.formatModifier(modifier)})`
  });
  
  return roll;
}

/**
 * Apply damage to a token
 * @param {Token} token - The token to damage
 * @param {number} damage - Amount of damage
 * @returns {Promise<Actor>} Updated actor
 */
export async function applyDamage(token, damage) {
  const actor = token.actor;
  if (!actor) return null;
  
  const currentHP = actor.system.hp?.value || 0;
  const newHP = Math.max(0, currentHP - damage);
  
  await actor.update({"system.hp.value": newHP});
  
  ui.notifications.info(`${actor.name} takes ${damage} damage!`);
  
  return actor;
}
