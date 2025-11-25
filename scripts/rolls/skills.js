// ============================================
// FILE: rolls/skills.js
// Skill check rolling using SWSE utils
// ============================================

/**
 * Roll a skill check
 * @param {Actor} actor - The actor making the check
 * @param {string} skillKey - The skill key
 * @returns {Promise<Roll>} The skill check roll
 */
export async function rollSkill(actor, skillKey) {
  const utils = game.swse.utils;
  const skill = actor.system.skills?.[skillKey];
  
  if (!skill) {
    ui.notifications.warn(`Skill ${skillKey} not found`);
    return null;
  }
  
  // Get skill modifier (use actor's method if available)
  const mod = actor.getSkillMod ? actor.getSkillMod(skill) : calculateSkillMod(actor, skill);
  
  const roll = await new Roll(`1d20 + ${mod}`).evaluate({async: true});
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `${skill.label || skillKey} Check (${utils.string.formatModifier(mod)})`
  });
  
  return roll;
}

/**
 * Calculate skill modifier
 * @param {Actor} actor - The actor
 * @param {object} skill - The skill object
 * @returns {number} Total skill modifier
 */
export function calculateSkillMod(actor, skill) {
  const utils = game.swse.utils;

  const abilityScore = actor.system.abilities[skill.ability]?.base || 10;
  const abilMod = utils.math.calculateAbilityModifier(abilityScore);
  const trained = skill.trained ? 5 : 0;
  const focus = skill.focus ? 5 : 0;
  const halfLvl = utils.math.halfLevel(actor.system.level);
  const misc = skill.modifier || 0;
  const conditionPenalty = actor.system.conditionTrack?.penalty || 0;

  return abilMod + trained + focus + halfLvl + misc + conditionPenalty;
}

/**
 * Roll skill check with DC comparison
 * @param {Actor} actor - The actor
 * @param {string} skillKey - The skill key
 * @param {number} dc - Difficulty class
 * @returns {Promise<object>} Result with roll and success
 */
export async function rollSkillCheck(actor, skillKey, dc) {
  const roll = await rollSkill(actor, skillKey);
  
  if (!roll) return null;
  
  const success = roll.total >= dc;
  
  if (success) {
    ui.notifications.info(`Success! (${roll.total} vs DC ${dc})`);
  } else {
    ui.notifications.warn(`Failed! (${roll.total} vs DC ${dc})`);
  }
  
  return { roll, success };
}

/**
 * Roll opposed skill check
 * @param {Actor} actor1 - First actor
 * @param {string} skill1 - First actor's skill
 * @param {Actor} actor2 - Second actor
 * @param {string} skill2 - Second actor's skill
 * @returns {Promise<object>} Results with winner
 */
export async function rollOpposedCheck(actor1, skill1, actor2, skill2) {
  const roll1 = await rollSkill(actor1, skill1);
  const roll2 = await rollSkill(actor2, skill2);
  
  if (!roll1 || !roll2) return null;
  
  const winner = roll1.total > roll2.total ? actor1 : 
                 roll2.total > roll1.total ? actor2 : null;
  
  return {
    roll1,
    roll2,
    winner,
    tie: winner === null
  };
}
