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
import { ImplantEffectRules } from "/systems/foundryvtt-swse/scripts/engine/implants/ImplantEffectRules.js";
import { TeamFeatRuntime } from "/systems/foundryvtt-swse/scripts/engine/feats/team-feat-runtime-patches.js";
import { RebellionSpeciesSkillFeatRuntime } from "/systems/foundryvtt-swse/scripts/engine/feats/rebellion-species-skill-feat-runtime-patches.js";


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

function actorHasFeat(actor, featName) {
  const wanted = String(featName ?? '').trim().toLowerCase();
  try {
    return Array.from(actor?.items ?? []).some(item => item?.type === 'feat' && item?.system?.disabled !== true && String(item?.name ?? '').trim().toLowerCase() === wanted);
  } catch (_err) {
    return false;
  }
}

function normalizeUseKey(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildSkillResultRiders(actor, effectiveSkillKey, rollTotal, skillContext = {}) {
  const riders = [];
  const useKey = normalizeUseKey(skillContext.useKey ?? skillContext.extraUseId ?? skillContext.skillUse?.key ?? skillContext.skillUse?.id ?? '');
  const isScavengeUse = useKey === 'scavenge-building-materials'
    || useKey === 'perception-scavenge-building-materials'
    || useKey === 'scavenger-scavenge-building-materials';
  if (effectiveSkillKey === 'perception' && actorHasFeat(actor, 'Scavenger') && isScavengeUse) {
    const credits = Math.max(0, Number(rollTotal) || 0) * 30;
    riders.push({
      id: 'scavenger-scavenged-materials-value',
      label: 'Scavenger',
      text: `Scavenged raw materials worth ${credits} credits.`,
      value: credits,
      unit: 'credits',
      gmArbitrated: true
    });
  }
  return riders;
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

export async function rollSkill(actor, skillKey, options = {}) {
  const utils = game.swse.utils;
  const athleticsOn = athleticsConsolidationActive();
  const requestedSkillKey = String(skillKey ?? '').trim();
  const effectiveSkillKey = athleticsOn && isAthleticsComponentKey(requestedSkillKey) ? 'athletics' : requestedSkillKey;

  const derivedSkills = actor.system.derived?.skills;
  let derivedSkill = readDerivedSkill(derivedSkills, effectiveSkillKey);

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

  try {
    Object.assign(skillContext, await TeamFeatRuntime.promptForTeamFeatAllyCounts(actor, effectiveSkillKey, skillContext));
  } catch (err) {
    swseLogger.warn('Team feat prompt failed; continuing with base Team Feat bonuses only.', err);
  }

  const forcePointDieUpgrade = RebellionSpeciesSkillFeatRuntime.getForcePointDieUpgrade(actor, effectiveSkillKey, skillContext);
  if (forcePointDieUpgrade) skillContext.forcePointDieUpgrade = forcePointDieUpgrade;

  const featSkillBonuses = SkillFeatResolver.getSkillCheckBonuses(actor, effectiveSkillKey, skillContext);
  const skillCheckMode = String(options?.checkMode || (options?.take20 === true ? 'take20' : options?.take10 === true ? 'take10' : 'roll')).toLowerCase();
  const skillTakeXValue = skillCheckMode === 'take20' ? 20 : skillCheckMode === 'take10' ? 10 : 10;
  const skillIsTakeX = skillCheckMode === 'take10' || skillCheckMode === 'take20';

  const domain = `skill.${effectiveSkillKey}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    baseBonus: canonicalTotal + Number(options?.customModifier || 0) + Number(featSkillBonuses.total || 0),
    rollOptions: {
      baseDice: '1d20',
      useForce: options?.useForcePoint === true,
      forcePointDieUpgradeSteps: forcePointDieUpgrade?.steps ?? 0,
      forcePointDieUpgradeSource: forcePointDieUpgrade?.source ?? null,
      isTakeX: skillIsTakeX,
      takeXValue: skillTakeXValue,
      skipStaticModifiers: true
    },
    context: {
      skillKey: effectiveSkillKey,
      trained: isTrained,
      skillUse: skillContext.skillUse,
      useKey: skillContext.useKey,
      featSkillBonuses: featSkillBonuses.bonuses,
      teamFeatAllyCounts: skillContext.teamFeatAllyCounts ?? null,
      forcePointDieUpgrade: forcePointDieUpgrade ?? null,
      checkMode: skillCheckMode,
      takeXValue: skillIsTakeX ? skillTakeXValue : null
    }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Skill roll failed: ${rollResult.error}`);
    return null;
  }

  const skillLabel = skill.label || utils?.string?.capitalize?.(effectiveSkillKey) || String(effectiveSkillKey || 'Skill').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[\-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  let chatRoll = rollResult.roll;
  if (!chatRoll && rollResult.isTakeX) {
    chatRoll = await new Roll(String(rollResult.finalTotal), actor.getRollData?.() ?? {}).evaluate({ async: true });
  }
  if (chatRoll) {
    const total = chatRoll?.total ?? rollResult.finalTotal ?? 'unknown';
    const resultRiders = buildSkillResultRiders(actor, effectiveSkillKey, total, skillContext);
    const resultRiderText = resultRiders.length ? ` ${resultRiders.map(rider => rider.text).join(' ')}` : '';
    const flavor = `${actor.name} used ${skillLabel} and got ${total}.${resultRiderText}`;

    const rerollOptions = [
      ...SkillFeatResolver.buildRerollChatOptions(actor, effectiveSkillKey, chatRoll, skillContext),
      ...ImplantEffectRules.buildKnowledgeRerollOptions(actor, effectiveSkillKey, chatRoll)
    ];

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
          teamFeatAllyCounts: skillContext.teamFeatAllyCounts ?? null,
          forcePointDieUpgrade: forcePointDieUpgrade ?? null,
          skillResultRiders: resultRiders,
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
        teamFeatAllyCounts: skillContext.teamFeatAllyCounts ?? null,
        forcePointDieUpgrade: forcePointDieUpgrade ?? null,
        skillResultRiders: resultRiders,
        rerollOptions,
        dc: options?.dc ?? null,
        sourceElement: options?.sourceElement ?? null,
        companionSource: options?.companionSource ?? null,
        sheet: options?.sheet ?? null,
        showRollCompanion: options?.showRollCompanion !== false,
        targetContext: options?.targetContext ?? null
      }
    });

    const applicableRerolls = SpeciesRerollHandler.getApplicableRerolls(actor, effectiveSkillKey);
    if (applicableRerolls.length > 0) {
      const rerollResult = await SpeciesRerollHandler.offerReroll(actor, effectiveSkillKey, chatRoll, { skillKey: effectiveSkillKey });
      if (rerollResult && rerollResult.total !== chatRoll.total) return rerollResult;
    }
  }

  return chatRoll;
}

export const rollSkillCheck = rollSkill;

export function calculateSkillModifier(actor, skillKey) {
  const skill = SchemaAdapters.getSkill(actor, skillKey);
  const attributes = SchemaAdapters.getAttributes(actor);

  if (!skill) return 0;

  const abilityKey = skill.ability || 'str';
  const abilityMod = attributes[abilityKey]?.mod || 0;
  const trainedBonus = skill.trained ? 5 : 0;
  const focusBonus = skill.focused ? 5 : 0;
  const armorPenalty = skill.armorCheck ? (actor.system.armorCheckPenalty || 0) : 0;
  const miscMod = skill.miscMod || 0;

  return abilityMod + trainedBonus + focusBonus + armorPenalty + miscMod;
}

export async function rollSkillWithConfig(actor, skillKey, options = {}) {
  try {
    return await showRollModifiersDialog({
      actor,
      domain: `skill.${skillKey}`,
      title: `Roll ${skillKey}`,
      baseBonus: actor.system.skills?.[skillKey]?.total || 0,
      defaultOptions: {
        useForcePoint: false,
        take10: false,
        take20: false,
        customModifier: 0,
        ...options
      },
      onRoll: (rollOptions) => rollSkill(actor, skillKey, rollOptions)
    });
  } catch (error) {
    swseLogger.error('Failed to open skill roll config', error);
    return null;
  }
}

export default rollSkill;