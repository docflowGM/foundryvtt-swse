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
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";


const ATHLETICS_COMPONENT_KEYS = ['acrobatics', 'climb', 'jump', 'swim'];

function athleticsConsolidationActive() {
  try { return game.settings.get('foundryvtt-swse', 'athleticsConsolidation') === true; }
  catch (_err) { return false; }
}

function isAthleticsComponentKey(skillKey) {
  return ATHLETICS_COMPONENT_KEYS.includes(String(skillKey ?? '').toLowerCase());
}

function readDerivedSkill(derivedSkills, skillKey) {
  if (Array.isArray(derivedSkills?.list)) return derivedSkills.list.find((row) => row?.key === skillKey);
  return derivedSkills?.[skillKey];
}

function buildAthleticsRollSkill(actor, derivedSkills = {}) {
  const systemSkills = actor?.system?.skills ?? {};
  const derivedAthletics = readDerivedSkill(derivedSkills, 'athletics') ?? {};
  const systemAthletics = systemSkills.athletics ?? {};
  const componentRows = ATHLETICS_COMPONENT_KEYS.map((key) => ({
    key,
    system: systemSkills[key] ?? {},
    derived: readDerivedSkill(derivedSkills, key) ?? {}
  }));
  const selectedAbility = systemAthletics.selectedAbility
    || derivedAthletics.selectedAbility
    || derivedAthletics.ability
    || 'dex';
  const componentTotals = componentRows
    .map(({ system, derived }) => Number(derived?.total ?? system?.total))
    .filter(Number.isFinite);
  const abilityMod = Number.isFinite(Number(derivedAthletics.abilityMod))
    ? Number(derivedAthletics.abilityMod)
    : Number(actor?.system?.derived?.attributes?.[selectedAbility]?.mod ?? 0) || 0;
  const halfLevel = Number(actor?.system?.derived?.identity?.halfLevel ?? Math.floor((Number(actor?.system?.level) || 1) / 2)) || 0;
  const trained = systemAthletics.trained === true || derivedAthletics.trained === true || componentRows.some(({ system, derived }) => system?.trained === true || derived?.trained === true);
  const focused = systemAthletics.focused === true || derivedAthletics.focused === true || componentRows.some(({ system, derived }) => system?.focused === true || derived?.focused === true);
  const miscMod = Number.isFinite(Number(systemAthletics.miscMod))
    ? Number(systemAthletics.miscMod)
    : componentRows.reduce((sum, { system }) => sum + (Number(system?.miscMod) || 0), 0);
  const fallbackTotal = abilityMod + halfLevel + (trained ? 5 : 0) + (focused ? 5 : 0) + miscMod;
  const total = Number.isFinite(Number(derivedAthletics.total))
    ? Number(derivedAthletics.total)
    : (componentTotals.length ? Math.max(...componentTotals) : fallbackTotal);

  const skill = {
    ...systemAthletics,
    label: systemAthletics.label ?? derivedAthletics.label ?? 'Athletics',
    selectedAbility,
    trained,
    focused,
    miscMod,
    total
  };
  const derivedSkill = {
    ...derivedAthletics,
    key: 'athletics',
    label: 'Athletics',
    selectedAbility,
    ability: selectedAbility,
    abilityMod,
    halfLevel,
    trained,
    focused,
    total
  };
  return { skill, derivedSkill };
}

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
  const athleticsOn = athleticsConsolidationActive();
  const requestedSkillKey = String(skillKey ?? '').trim();
  const effectiveSkillKey = athleticsOn && isAthleticsComponentKey(requestedSkillKey) ? 'athletics' : requestedSkillKey;

  // === READ FROM DERIVED (SSOT) ===
  const derivedSkills = actor.system.derived?.skills;
  let derivedSkill = readDerivedSkill(derivedSkills, effectiveSkillKey);

  // Get skill metadata from raw system.skills for training check
  let skill = actor.system.skills?.[effectiveSkillKey];
  if (!skill && athleticsOn && effectiveSkillKey === 'athletics') {
    const athletics = buildAthleticsRollSkill(actor, derivedSkills);
    skill = athletics.skill;
    derivedSkill = athletics.derivedSkill;
  }
  if (!skill) {
    ui.notifications.warn(`Skill ${effectiveSkillKey} not found in system`);
    return null;
  }

  const skillConfig = CONFIG?.SWSE?.skills?.[effectiveSkillKey] ?? (effectiveSkillKey === 'athletics' ? { label: 'Athletics', name: 'Athletics', ability: 'dex' } : {});
  const abilityKey = derivedSkill?.ability || derivedSkill?.selectedAbility || skill.selectedAbility || skillConfig?.ability || 'str';
  const abilityMod = Number.isFinite(Number(derivedSkill?.abilityMod))
    ? Number(derivedSkill.abilityMod)
    : Number(actor.system?.derived?.attributes?.[abilityKey]?.mod ?? 0) || 0;
  const halfLevel = Number(actor.system?.derived?.identity?.halfLevel ?? Math.floor((Number(actor.system?.level) || 1) / 2)) || 0;
  const fallbackTotal = abilityMod
    + halfLevel
    + (skill.trained ? 5 : 0)
    + (skill.focused ? 5 : 0)
    + (Number(skill.miscMod) || 0);
  const canonicalTotal = Number.isFinite(Number(derivedSkill?.total)) ? Number(derivedSkill.total) : fallbackTotal;

  // Check trained-only enforcement
  const isTrained = derivedSkill?.trained === true || skill.trained === true;
  const skillDef = skillConfig || {};
  const permission = SkillEnforcementEngine.evaluate({ actor, skillKey: effectiveSkillKey, actionType: 'check', context: { isTrained, skillDef } });

  if (!permission.allowed) {
    ui.notifications.warn(`${permission.reason}`);
    return null;
  }

  const skillContext = {
    ...(options || {}),
    skillKey: effectiveSkillKey,
    skillUse: options?.skillUse ?? null,
    useKey: options?.useKey ?? options?.skillUse?.key ?? null
  };
  skillContext.contextFlags = RageEngine.getSkillContextFlags(actor, skillContext.contextFlags ?? skillContext.flags ?? []);
  skillContext.flags = skillContext.contextFlags;
  const featSkillBonuses = SkillFeatResolver.getSkillCheckBonuses(actor, effectiveSkillKey, skillContext);
  const skillCheckMode = String(options?.checkMode || (options?.take20 === true ? 'take20' : options?.take10 === true ? 'take10' : 'roll')).toLowerCase();
  const skillTakeXValue = skillCheckMode === 'take20' ? 20 : skillCheckMode === 'take10' ? 10 : 10;
  const skillIsTakeX = skillCheckMode === 'take10' || skillCheckMode === 'take20';

  // === UNIFIED ROLL EXECUTION via RollCore ===
  // Pass derived.skills[skillKey].total as baseBonus so formula is:
  // 1d20 + baseBonus (all permanent components) + modifierTotal (situational mods)
  const domain = `skill.${effectiveSkillKey}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    baseBonus: canonicalTotal + Number(options?.customModifier || 0) + Number(featSkillBonuses.total || 0),
    rollOptions: {
      baseDice: '1d20',
      useForce: options?.useForcePoint === true,
      isTakeX: skillIsTakeX,
      takeXValue: skillTakeXValue
    },
    context: {
      skillKey: effectiveSkillKey,
      trained: isTrained,
      skillUse: skillContext.skillUse,
      useKey: skillContext.useKey,
      featSkillBonuses: featSkillBonuses.bonuses,
      checkMode: skillCheckMode,
      takeXValue: skillIsTakeX ? skillTakeXValue : null
    }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Skill roll failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  const skillLabel = skill.label || utils?.string?.capitalize?.(effectiveSkillKey) || String(effectiveSkillKey || 'Skill').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[\-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  let chatRoll = rollResult.roll;
  if (!chatRoll && rollResult.isTakeX) {
    chatRoll = await new Roll(String(rollResult.finalTotal), actor.getRollData?.() ?? {}).evaluate({ async: true });
  }
  if (chatRoll) {
    // Build detailed modifier breakdown
    const total = chatRoll?.total ?? rollResult.finalTotal ?? 'unknown';
    const flavor = `${actor.name} used ${skillLabel} and got ${total}.`;

    const rerollOptions = SkillFeatResolver.buildRerollChatOptions(actor, effectiveSkillKey, chatRoll, skillContext);

    await SWSEChat.postRoll({
      roll: chatRoll,
      actor,
      flavor,
      flags: {
        swse: {
          skillRoll: true,
          skillKey: effectiveSkillKey,
          skillUseKey: skillContext.useKey ?? null,
          featSkillBonuses: featSkillBonuses.bonuses,
          rerollOptions
        }
      },
      context: {
        type: 'skill',
        label: skillLabel,
        skillKey: effectiveSkillKey,
        abilityKey,
        trained: isTrained,
        baseBonus: rollResult.baseBonus,
        situationalMods: rollResult.modifierTotal,
        customModifier: Number(options?.customModifier || 0),
        featSkillBonus: featSkillBonuses.total,
        featSkillBonuses: featSkillBonuses.bonuses,
        rerollOptions,
        dc: options?.dc ?? null,
        sourceElement: options?.sourceElement ?? null,
        companionSource: options?.companionSource ?? null,
        sheet: options?.sheet ?? null,
        showRollCompanion: options?.showRollCompanion !== false,
        targetContext: options?.targetContext ?? null
      }
    });

    // PHASE 5: Offer species reroll if applicable
    // Check if actor has applicable species reroll rights for this skill
    const applicableRerolls = SpeciesRerollHandler.getApplicableRerolls(actor, effectiveSkillKey);
    if (applicableRerolls && applicableRerolls.length > 0) {
      const rerollResult = await SpeciesRerollHandler.offerReroll(actor, effectiveSkillKey, chatRoll, {
        skillKey: effectiveSkillKey
      });
      // If reroll was accepted, return the rerolled result
      if (rerollResult && rerollResult.total !== chatRoll.total) {
        return rerollResult;
      }
    }
  }

  return chatRoll;
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
  const ability = actor.system.derived?.attributes?.[key]
    ?? actor.system.attributes?.[key]
    ?? actor.system.abilities?.[key];
  if (!ability) {
    ui.notifications.warn(`Ability ${abilityKey} not found in derived attributes`);
    return null;
  }
  const abilityTotal = Number.isFinite(Number(ability.total)) ? Number(ability.total) : Number(ability.base ?? 10);
  const abilityMod = Number.isFinite(Number(ability.mod)) ? Number(ability.mod) : Math.floor((abilityTotal - 10) / 2);
  const abilityLabel = ABILITY_LABELS[key] || utils?.string?.capitalize?.(key) || String(key || 'Ability').replace(/\b\w/g, c => c.toUpperCase());

  let modifiers = {
    customModifier: Number(options?.customModifier || 0),
    situationalBonus: Number(options?.situationalBonus || 0),
    useForcePoint: options?.useForcePoint === true,
    checkMode: options?.checkMode || (options?.take20 === true ? 'take20' : options?.take10 === true ? 'take10' : 'roll'),
    rollMode: options?.rollMode || ''
  };

  if (options.showDialog === true) {
    const dialogResult = await showRollModifiersDialog({
      title: `${abilityLabel} Check`,
      rollType: 'ability',
      actor,
      abilityKey: key,
      baseBonus: abilityMod,
      showCover: false,
      showConcealment: false
    });

    if (!dialogResult) { return null; }

    modifiers = {
      ...modifiers,
      customModifier: Number(dialogResult.customModifier || 0),
      situationalBonus: Number(dialogResult.situationalBonus || 0),
      useForcePoint: dialogResult.useForcePoint === true,
      checkMode: dialogResult.checkMode || 'roll',
      rollMode: dialogResult.rollMode || modifiers.rollMode,
      rollNote: dialogResult.rollNote || '',
      targetContext: dialogResult.targetContext || null,
      situational: dialogResult.situational || {}
    };
  }

  const checkMode = String(modifiers.checkMode || 'roll').toLowerCase();
  const takeXValue = checkMode === 'take20' ? 20 : checkMode === 'take10' ? 10 : 10;
  const isTakeX = checkMode === 'take10' || checkMode === 'take20';

  // === UNIFIED ROLL EXECUTION via RollCore ===
  // This ensures ModifierEngine applies all bonuses (species traits, feats, effects, conditions)
  const domain = `ability.${key}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    baseBonus: abilityMod + Number(modifiers.customModifier || 0) + Number(modifiers.situationalBonus || 0),
    rollOptions: {
      baseDice: '1d20',
      useForce: modifiers.useForcePoint === true,
      isTakeX,
      takeXValue
    },
    context: {
      abilityKey: key,
      dc: options?.dc,
      category: options?.category,
      label: abilityLabel,
      rollType: 'ability',
      checkMode,
      customModifier: Number(modifiers.customModifier || 0),
      situationalBonus: Number(modifiers.situationalBonus || 0),
      targetContext: modifiers.targetContext || null,
      rollNote: modifiers.rollNote || '',
      situational: modifiers.situational || {}
    }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Ability check failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  let chatRoll = rollResult.roll;
  if (!chatRoll && rollResult.isTakeX) {
    chatRoll = await new Roll(String(rollResult.finalTotal), actor.getRollData?.() ?? {}).evaluate({ async: true });
  }
  if (chatRoll) {
    await SWSEChat.postRoll({
      roll: chatRoll,
      actor,
      rollMode: modifiers.rollMode || options.rollMode || null,
      flavor: `<strong>${abilityLabel} Check</strong><br/>Modifier: ${rollResult.modifierTotal >= 0 ? '+' : ''}${rollResult.modifierTotal}`,
      context: {
        label: `${abilityLabel} Check`,
        abilityKey: key,
        rollType: 'ability',
        dc: options?.dc,
        customModifier: Number(modifiers.customModifier || 0),
        situationalBonus: Number(modifiers.situationalBonus || 0),
        checkMode,
        takeXValue: rollResult.isTakeX ? takeXValue : null,
        targetContext: modifiers.targetContext || null,
        rollNote: modifiers.rollNote || '',
        situational: modifiers.situational || {},
        ...options
      }
    });
  }

  return rollResult;
}

