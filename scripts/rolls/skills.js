// ============================================
// FILE: rolls/skills.js
// Skill check rolling using SWSE utils
// ============================================

import { SkillEnforcementEngine } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-enforcement-engine.js";

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

  // Check trained-only enforcement
  const isTrained = skill.trained === true;
  const skillDef = CONFIG.SWSE.skills?.[skillKey] || {};
  const permission = SkillEnforcementEngine.canRollSkill(skillDef, isTrained);

  if (!permission.allowed) {
    ui.notifications.warn(`${permission.reason}`);
    return null;
  }

  // Get skill modifier (use actor's method if available)
  const mod = actor.getSkillMod ? actor.getSkillMod(skill) : calculateSkillMod(actor, skill);

  const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${mod}`).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${skill.label || skillKey} Check (${utils.string.formatModifier(mod)})`
  } , { create: true });

  return roll;
}

/**
 * Calculate skill modifier
 * @param {Actor} actor - The actor
 * @param {object} skill - The skill object
 * @param {string} actionId - Optional action ID for talent bonus lookup
 * @returns {number} Total skill modifier
 */
export function calculateSkillMod(actor, skill, actionId = null) {
  const utils = game.swse.utils;

  const abilityScore = actor.system.attributes[skill.selectedAbility]?.base || 10;
  const abilMod = utils.math.calculateAbilityModifier(abilityScore);
  const trained = skill.trained ? 5 : 0;
  const focus = skill.focused ? 5 : 0;
  const halfLvl = utils.math.halfLevel(actor.system.level);
  const misc = skill.miscMod || 0;
  const conditionPenalty = actor.system.conditionTrack?.penalty || 0;

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
 * Roll an ability check (RAW: 1d20 + ability modifier + misc bonuses)
 * Species trait bonuses like "+2 on Strength checks" are applied if present.
 * @param {Actor} actor
 * @param {string} abilityKey - str|dex|con|int|wis|cha
 * @returns {Promise<Roll|null>}
 */
export async function rollAbilityCheck(actor, abilityKey) {
  const utils = game.swse.utils;
  const key = String(abilityKey || '').toLowerCase();
  const attr = actor.system.attributes?.[key];
  if (!attr) {
    ui.notifications.warn(`Ability ${abilityKey} not found`);
    return null;
  }

  const abilityMod = attr.mod ?? utils.math.calculateAbilityModifier(attr.base ?? 10);

  // Species trait ability-check bonuses (from SpeciesTraitEngine)
  const speciesChecks = actor.system?.speciesTraitBonuses?.abilityChecks || actor.system?.speciesAbilityCheckBonuses || {};
  const speciesBonus = Number(speciesChecks[key] || 0);

  const conditionPenalty = actor.system.conditionTrack?.penalty || 0;

  const total = abilityMod + speciesBonus + conditionPenalty;

  const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${total}`).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${utils.string.capitalize(key)} Check`,
  });

  return roll;
}

