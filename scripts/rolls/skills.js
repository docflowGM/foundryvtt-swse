// ============================================
// FILE: rolls/skills.js
// Skill check rolling using unified RollCore pipeline
// ============================================

import { SkillEnforcementEngine } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-enforcement-engine.js";
import { RollCore } from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

/**
 * Roll a skill check using unified RollCore pipeline
 * Routes through ModifierEngine to ensure passive bonuses apply
 *
 * @param {Actor} actor - The actor making the check
 * @param {string} skillKey - The skill key
 * @returns {Promise<Roll>} The skill check roll
 */
export async function rollSkill(actor, skillKey) {
  const utils = game.swse.utils;
  // === READ FROM DERIVED (SSOT) ===
  const derivedSkill = actor.system.derived?.skills?.[skillKey];

  if (!derivedSkill) {
    swseLogger.warn(`[Skills] Derived skill ${skillKey} not found for actor ${actor.id} - falling back to system.skills`);
    ui.notifications.warn(`Skill ${skillKey} not found or not initialized`);
    return null;
  }

  // Get skill metadata from raw system.skills for training check
  const skill = actor.system.skills?.[skillKey];
  if (!skill) {
    ui.notifications.warn(`Skill ${skillKey} not found in system`);
    return null;
  }

  // Check trained-only enforcement
  const isTrained = derivedSkill.trained === true;
  const skillDef = CONFIG?.SWSE?.skills?.[skillKey] || {};
  const permission = SkillEnforcementEngine.evaluate({ actor, skillKey, actionType: 'check', context: { isTrained, skillDef } });

  if (!permission.allowed) {
    ui.notifications.warn(`${permission.reason}`);
    return null;
  }

  // === UNIFIED ROLL EXECUTION via RollCore ===
  // Pass derived.skills[skillKey].total as baseBonus so formula is:
  // 1d20 + baseBonus (all permanent components) + modifierTotal (situational mods)
  const domain = `skill.${skillKey}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    baseBonus: derivedSkill.total,
    rollOptions: {
      baseDice: '1d20'
    },
    context: { skillKey, trained: isTrained }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Skill roll failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  const skillLabel = skill.label || utils.string.capitalize(skillKey);
  if (rollResult.roll) {
    // Build detailed modifier breakdown
    const breakdown = [
      `Trained: ${isTrained ? 'Yes' : 'No'}`,
      `Base Bonus: ${rollResult.baseBonus}`,
      `Situational Mods: ${rollResult.modifierTotal}`
    ].join(' | ');

    await SWSEChat.postRoll({
      roll: rollResult.roll,
      actor,
      flavor: `<strong>${skillLabel}</strong><br/>${breakdown}`
    });
  }

  return rollResult.roll;
}

/**
 * Calculate skill modifier (legacy, kept for compatibility)
 * ⚠️ DEPRECATED: Use RollCore.execute() instead, which includes ModifierEngine
 *
 * @param {Actor} actor - The actor
 * @param {object} skill - The skill object
 * @param {string} actionId - Optional action ID for talent bonus lookup
 * @returns {number} Total skill modifier
 */
export function calculateSkillMod(actor, skill, actionId = null) {
  const utils = game.swse.utils;

  // PHASE 3: Read ability mod from canonical derived source via SchemaAdapters
  const abilityKey = skill.selectedAbility || 'str';
  const abilMod = SchemaAdapters.getAbilityMod(actor, abilityKey);
  const trained = skill.trained ? 5 : 0;
  const focus = skill.focused ? 5 : 0;
  const halfLvl = utils.math.halfLevel(actor.system.level);
  const misc = skill.miscMod || 0;

  // PHASE 3: Compute condition penalty from canonical derived source
  // Fallback to getConditionPenalty() if modifiers path doesn't exist yet
  const conditionPenalty = actor.system?.derived?.modifiers?.conditionPenalty ??
                          SchemaAdapters.getConditionPenalty(actor) ?? 0;

  let talentBonus = 0;

  // Apply talent bonuses if action ID is provided and TalentActionLinker is available
  const TalentActionLinker = window.SWSE?.TalentActionLinker;
  if (actionId && TalentActionLinker?.MAPPING) {
    const bonusInfo = TalentActionLinker.calculateBonusForAction(actor, actionId);
    talentBonus = bonusInfo.value;
  }

  return abilMod + trained + focus + halfLvl + misc + conditionPenalty + talentBonus;
}

/**
 * Roll skill check with DC comparison
 * @param {Actor} actor - The actor
 * @param {string} skillKey - The skill key
 * @param {number} dc - Difficulty class
 * @returns {Promise<object>} Result with roll and success
 */
export async function rollSkillCheck(actor, skillKey, dcOrOptions = null) {
  const roll = await rollSkill(actor, skillKey);

  if (!roll) {return null;}

  const options = (dcOrOptions && typeof dcOrOptions === 'object' && !Array.isArray(dcOrOptions)) ? dcOrOptions : {};
  const dc = typeof dcOrOptions === 'number' ? dcOrOptions : (typeof options.dc === 'number' ? options.dc : null);

  if (typeof dc !== 'number') {
    return { roll, success: null };
  }

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


/**
 * Roll an ability check using unified RollCore pipeline
 * Routes through ModifierEngine so all bonuses apply (species traits, feats, effects, etc.)
 *
 * @param {Actor} actor
 * @param {string} abilityKey - str|dex|con|int|wis|cha
 * @returns {Promise<Roll|null>}
 */
export async function rollAbilityCheck(actor, abilityKey) {
  const utils = game.swse.utils;
  const key = String(abilityKey || '').toLowerCase();

  // Verify ability exists in derived (canonical source)
  const ability = actor.system.derived?.attributes?.[key];
  if (!ability) {
    ui.notifications.warn(`Ability ${abilityKey} not found in derived attributes`);
    return null;
  }

  // === UNIFIED ROLL EXECUTION via RollCore ===
  // This ensures ModifierEngine applies all bonuses (species traits, feats, effects, conditions)
  const domain = `ability.${key}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    rollOptions: {
      baseDice: '1d20'
    },
    context: { abilityKey: key }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Ability check failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  const abilityLabel = utils.string.capitalize(key);
  if (rollResult.roll) {
    await SWSEChat.postRoll({
      roll: rollResult.roll,
      actor,
      flavor: `<strong>${abilityLabel} Check</strong><br/>Modifier: ${rollResult.modifierTotal}`
    });
  }

  return rollResult.roll;
}

