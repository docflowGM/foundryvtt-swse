/**
 * Custom Skill Roller
 *
 * Handles rolling for player-created custom skills.
 * Pure sheet-local feature; no progression or legality integration.
 */

import { RollCore } from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

/**
 * Calculate custom skill bonus
 *
 * Formula:
 * - Ability Modifier
 * + Half Level
 * + Trained Bonus (if trained)
 * + Focus Bonus (if focused)
 * + Miscellaneous Modifier
 *
 * @param {Actor} actor - The actor
 * @param {Object} customSkill - The custom skill object
 * @returns {number} Total skill bonus
 */
function calculateCustomSkillBonus(actor, customSkill) {
  if (!customSkill || !actor) return 0;

  const utils = game.swse.utils;
  const abilityKey = customSkill.ability || 'int';
  const abilMod = SchemaAdapters.getAbilityMod(actor, abilityKey);
  const trained = customSkill.trained ? 5 : 0;
  const focus = customSkill.focused ? 5 : 0;
  const halfLvl = utils.math.halfLevel(actor.system.level);
  const misc = Number(customSkill.miscMod || 0);

  const total = abilMod + trained + focus + halfLvl + misc;

  swseLogger.log('[CustomSkill] Bonus calculation:', {
    skill: customSkill.label,
    ability: abilityKey,
    abilMod,
    trained,
    focus,
    halfLvl,
    misc,
    total
  });

  return total;
}

/**
 * Roll a custom skill check
 *
 * @param {Actor} actor - The actor making the check
 * @param {string} customSkillId - The custom skill ID
 * @returns {Promise<Roll|null>} The roll result
 */
export async function rollCustomSkill(actor, customSkillId) {
  if (!actor) {
    ui.notifications.warn('No actor selected.');
    return null;
  }

  // Find custom skill
  const customSkills = actor.system.customSkills || [];
  const customSkill = customSkills.find(s => s.id === customSkillId);

  if (!customSkill) {
    ui.notifications.warn(`Custom skill ${customSkillId} not found.`);
    return null;
  }

  // Calculate bonus
  const bonus = calculateCustomSkillBonus(actor, customSkill);

  swseLogger.log('[CustomSkill] Rolling custom skill:', {
    actor: actor.name,
    skill: customSkill.label,
    skillId: customSkillId,
    bonus
  });

  // === UNIFIED ROLL EXECUTION via RollCore ===
  const domain = `customSkill.${customSkillId}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    baseBonus: bonus,
    rollOptions: {
      baseDice: '1d20'
    },
    context: { customSkillId, customSkillLabel: customSkill.label }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Custom skill roll failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  if (rollResult.roll) {
    const total = rollResult.roll?.total ?? 'unknown';
    const flavor = `${actor.name} used <strong>${customSkill.label}</strong> and got ${total}.`;

    await SWSEChat.postRoll({
      roll: rollResult.roll,
      actor,
      flavor,
      context: {
        type: 'customSkill',
        label: customSkill.label,
        customSkillId,
        baseBonus: bonus
      }
    });
  }

  return rollResult.roll;
}

export { calculateCustomSkillBonus };
