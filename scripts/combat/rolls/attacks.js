// ============================================
// FILE: rolls/attacks.js
// Attack roll handling using SWSE utils
// ============================================

/**
 * Roll an attack with a weapon
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {Promise<Roll>} The attack roll
 */
export async function rollAttack(actor, weapon) {
  const utils = game.swse.utils;
  
  // Get components
  const halfLvl = utils.math.halfLevel(actor.system.level);
  const bab = actor.system.bab || 0;
  const abilMod = utils.math.calculateAbilityModifier(
    actor.system.abilities[weapon.attackAttr]?.base || 10
  );
  const focus = weapon.focus ? 1 : 0;
  const misc = weapon.modifier || 0;
  
  // Calculate total attack bonus
  const attackBonus = utils.combat.calculateAttackBonus(
    bab,
    abilMod,
    [halfLvl, focus, misc]
  );
  
  // Roll the attack
  const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${attackBonus}`).evaluate({async: true});
  
  // Send to chat
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${weapon.name} Attack (${utils.string.formatModifier(attackBonus)})`
  });
  
  return roll;
}

/**
 * Roll damage with a weapon
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {Promise<Roll>} The damage roll
 */
export async function rollDamage(actor, weapon) {
  const utils = game.swse.utils;
  
  const halfLvl = utils.math.halfLevel(actor.system.level);
  let dmgMod = halfLvl + (weapon.modifier || 0);
  
  // Handle different damage attribute types
  const strMod = utils.math.calculateAbilityModifier(actor.system.abilities.str?.base || 10);
  const dexMod = utils.math.calculateAbilityModifier(actor.system.abilities.dex?.base || 10);
  
  switch (weapon.damageAttr) {
    case "str":
      dmgMod += strMod;
      break;
    case "dex":
      dmgMod += dexMod;
      break;
    case "2str":
      dmgMod += strMod * 2;
      break;
    case "2dex":
      dmgMod += dexMod * 2;
      break;
  }
  
  // Add specialization bonus
  if (weapon.specialization) dmgMod += 1;
  
  // Calculate damage
  const damageCalc = utils.combat.calculateDamage(
    weapon.damage || "1d6",
    0, // ability already added above
    [dmgMod]
  );
  
  // Roll damage
  const roll = await globalThis.SWSE.RollEngine.safeRoll(damageCalc.formula).evaluate({async: true});
  
  // Send to chat
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${weapon.name} Damage`
  });
  
  return roll;
}

/**
 * Roll a full attack (attack + damage on hit)
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {Promise<object>} Object containing attack and damage rolls
 */
export async function rollFullAttack(actor, weapon) {
  const attackRoll = await rollAttack(actor, weapon);
  
  // Check if attack hits (this would need target AC)
  const result = {
    attack: attackRoll,
    damage: null
  };
  
  // Optionally auto-roll damage on crit threat
  const utils = game.swse.utils;
  if (utils.dice.isCriticalThreat(attackRoll.total, weapon.critRange || 20)) {
    ui.notifications.info("Critical Threat!");
    // Could auto-roll damage here
  }
  
  return result;
}
