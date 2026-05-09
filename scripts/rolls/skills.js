// ============================================
// FILE: rolls/skills.js
// Skill check rolling using unified RollCore pipeline
// ============================================

import { SkillEnforcementEngine } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-enforcement-engine.js";
import { RollCore } from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
// PHASE 5: Import species reroll handler for skill reroll integration
import { SpeciesRerollHandler } from "/systems/foundryvtt-swse/scripts/species/species-reroll-handler.js";
import { SkillFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-resolver.js";
import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";

/**
 * Roll a skill check using unified RollCore pipeline
 * Routes through ModifierEngine to ensure passive bonuses apply
 *
 * @param {Actor} actor - The actor making the check
 * @param {string} skillKey - The skill key
 * @returns {Promise<Roll>} The skill check roll
 */
export async function rollSkill(actor, skillKey, options = {}) {
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

  const skillContext = {
    ...(options || {}),
    skillKey,
    skillUse: options?.skillUse ?? null,
    useKey: options?.useKey ?? options?.skillUse?.key ?? null
  };
  skillContext.contextFlags = RageEngine.getSkillContextFlags(actor, skillContext.contextFlags ?? skillContext.flags ?? []);
  skillContext.flags = skillContext.contextFlags;
  const featSkillBonuses = SkillFeatResolver.getSkillCheckBonuses(actor, skillKey, skillContext);

  // === UNIFIED ROLL EXECUTION via RollCore ===
  // Pass derived.skills[skillKey].total as baseBonus so formula is:
  // 1d20 + baseBonus (all permanent components) + modifierTotal (situational mods)
  const domain = `skill.${skillKey}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    baseBonus: derivedSkill.total + Number(options?.customModifier || 0) + Number(featSkillBonuses.total || 0),
    rollOptions: {
      baseDice: '1d20',
      useForce: options?.useForcePoint === true
    },
    context: {
      skillKey,
      trained: isTrained,
      skillUse: skillContext.skillUse,
      useKey: skillContext.useKey,
      featSkillBonuses: featSkillBonuses.bonuses
    }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Skill roll failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  const skillLabel = skill.label || utils.string.capitalize(skillKey);
  if (rollResult.roll) {
    // Build detailed modifier breakdown
    const total = rollResult.roll?.total ?? 'unknown';
    const flavor = `${actor.name} used ${skillLabel} and got ${total}.`;

    const rerollOptions = SkillFeatResolver.buildRerollChatOptions(actor, skillKey, rollResult.roll, skillContext);

    await SWSEChat.postRoll({
      roll: rollResult.roll,
      actor,
      flavor,
      flags: {
        swse: {
          skillRoll: true,
          skillKey,
          skillUseKey: skillContext.useKey ?? null,
          featSkillBonuses: featSkillBonuses.bonuses,
          rerollOptions
        }
      },
      context: {
        type: 'skill',
        label: skillLabel,
        trained: isTrained,
        baseBonus: rollResult.baseBonus,
        situationalMods: rollResult.modifierTotal,
        customModifier: Number(options?.customModifier || 0),
        featSkillBonus: featSkillBonuses.total,
        featSkillBonuses: featSkillBonuses.bonuses,
        rerollOptions
      }
    });

    // PHASE 5: Offer species reroll if applicable
    // Check if actor has applicable species reroll rights for this skill
    const applicableRerolls = SpeciesRerollHandler.getApplicableRerolls(actor, skillKey);
    if (applicableRerolls && applicableRerolls.length > 0) {
      const rerollResult = await SpeciesRerollHandler.offerReroll(actor, skillKey, rollResult.roll, {
        skillKey
      });
      // If reroll was accepted, return the rerolled result
      if (rerollResult && rerollResult.total !== rollResult.roll.total) {
        return rerollResult;
      }
    }
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
  const options = (dcOrOptions && typeof dcOrOptions === 'object' && !Array.isArray(dcOrOptions)) ? dcOrOptions : {};
  const roll = await rollSkill(actor, skillKey, options);

  if (!roll) {return null;}

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


const ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
};

/**
 * Roll an ability check using unified RollCore pipeline
 * Routes through ModifierEngine so all bonuses apply (species traits, feats, effects, etc.)
 *
 * @param {Actor} actor
 * @param {string} abilityKey - str|dex|con|int|wis|cha
 * @returns {Promise<Roll|null>}
 */
export async function rollAbilityCheck(actor, abilityKey, options = {}) {
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
    baseBonus: Number(options?.customModifier || 0),
    rollOptions: {
      baseDice: '1d20',
      useForce: options?.useForcePoint === true,
      isTakeX: options?.take10 === true,
      takeXValue: 10
    },
    context: {
      abilityKey: key,
      dc: options?.dc,
      category: options?.category,
      label: ABILITY_LABELS[key] || key.toUpperCase()
    }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Ability check failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  const abilityLabel = ABILITY_LABELS[key] || utils.string.capitalize(key);
  if (rollResult.roll) {
    await SWSEChat.postRoll({
      roll: rollResult.roll,
      actor,
      flavor: `<strong>${abilityLabel} Check</strong><br/>Modifier: ${rollResult.modifierTotal >= 0 ? '+' : ''}${rollResult.modifierTotal}`,
      context: {
        label: `${abilityLabel} Check`,
        abilityKey: key,
        dc: options?.dc,
        customModifier: Number(options?.customModifier || 0)
      }
    });
  }

  return rollResult;
}

