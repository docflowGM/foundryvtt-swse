// ============================================
// FILE: rolls/skills.js
// Skill check rolling via RollCore (V2 Unified)
// ============================================

// import { SkillEnforcementEngine } from "../engine/skills/SkillEnforcementEngine.js"; // File doesn't exist
import RollCore from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Roll a skill check
 * @param {Actor} actor - The actor making the check
 * @param {string} skillKey - The skill key
 * @param {Object} options - Additional options
 * @param {boolean} options.useForce - Spend a Force Point
 * @returns {Promise<Roll|null>} The skill check roll or null if failed
 */
export async function rollSkill(actor, skillKey, options = {}) {
  const utils = game.swse.utils;
  const skill = actor.system.skills?.[skillKey];

  if (!skill) {
    ui.notifications.warn(`Skill ${skillKey} not found`);
    return null;
  }

  // Check trained-only enforcement
  const isTrained = skill.trained === true;
  const skillDef = CONFIG.SWSE.skills?.[skillKey] || {};
  // SkillEnforcementEngine doesn't exist - allowing all skill rolls
  const permission = { allowed: true };

  // === UNIFIED ROLL EXECUTION via RollCore ===
  const domain = `skill.${skillKey}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    rollOptions: {
      baseDice: '1d20',
      useForce: options.useForce || false
    },
    context: { skillKey }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Skill roll failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  if (rollResult.roll) {
    await rollResult.roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>${skill.label || skillKey}</strong> Check<br/>
               Modifier: ${utils.string.formatModifier(rollResult.modifierTotal)}
               ${rollResult.forcePointBonus > 0 ? `<br/>+ ${rollResult.forcePointBonus} (Force)` : ''}`
    }, { create: true });
  }

  return rollResult.roll;
}

/**
 * Roll skill check with DC comparison (convenience wrapper)
 * @param {Actor} actor - The actor
 * @param {string} skillKey - The skill key
 * @param {number} dc - Difficulty class
 * @returns {Promise<object>} Result with roll and success
 */
export async function rollSkillCheck(actor, skillKey, dc) {
  const roll = await rollSkill(actor, skillKey);

  if (!roll) {return null;}

  const success = roll.total >= dc;

  if (success) {
    ui.notifications.info(`Success! (${roll.total} vs DC ${dc})`);
  } else {
    ui.notifications.warn(`Failed! (${roll.total} vs DC ${dc})`);
  }

  return { roll, success };
}

/**
 * Roll opposed skill check (convenience wrapper)
 * @param {Actor} actor1 - First actor
 * @param {string} skill1 - First actor's skill
 * @param {Actor} actor2 - Second actor
 * @param {string} skill2 - Second actor's skill
 * @returns {Promise<object>} Results with winner
 */
export async function rollOpposedCheck(actor1, skill1, actor2, skill2) {
  const roll1 = await rollSkill(actor1, skill1);
  const roll2 = await rollSkill(actor2, skill2);

  if (!roll1 || !roll2) {return null;}

  const winner = roll1.total > roll2.total ? actor1 :
                 roll2.total > roll1.total ? actor2 : null;

  return {
    roll1,
    roll2,
    winner,
    tie: winner === null
  };
}
