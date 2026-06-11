import { getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { isNpcStatblockMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
import { getDamageAbilityContribution, getRangePenalty, getWeaponAttackAbility, getWeaponFlatAttackBonus, getWeaponFlatDamageBonus, isVehicleWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ReactionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { mergeCombatWorkflowContextIntoRollOptions, summarizeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";
import { resolveDamagePacketType } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";
import { AmmoSystem } from "/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { damageContextForReaction, damageTypesFromContext } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";

// ============================================
// FILE: rolls/attacks.js (Upgraded for SWSE v13+)
// - Uses new Active Effects engine
// - Uses updated Actor data model
// - Integrates CT penalties, attack penalties, cover, etc.
// - Performance optimized, fail-safe, RAW-accurate
// ============================================

function getTargetActorFromOptions(options = {}) {
  return options.target ?? game.user?.targets?.first?.()?.actor ?? null;
}

function hasFightingDefensivelyEffect(actor) {
  return Array.from(actor?.effects ?? []).some(effect => effect?.flags?.swse?.combatAction === 'fighting-defensively');
}

function actorHasTalentNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'talent') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

function actorIsProficientForAttack(actor, weapon) {
  const explicit = weapon?.system?.proficient;
  if (explicit !== false) return true;
  return actorHasTalentNamed(actor, 'Spacehound') && isVehicleWeapon(weapon);
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function normalizeRollKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

function buildEffectIntentRollContext(weapon, options = {}, extra = {}) {
  const system = weapon?.system ?? {};
  const weaponGroup = options.weaponGroup
    ?? system.weaponGroup
    ?? system.group
    ?? system.proficiencyGroup
    ?? system.category
    ?? '';
  const weaponCategory = options.weaponCategory
    ?? options.attackType
    ?? system.weaponCategory
    ?? system.category
    ?? system.type
    ?? system.meleeOrRanged
    ?? system.weaponRangeType
    ?? '';
  const damageType = options.damageType
    ?? system.damageType
    ?? system.damage?.type
    ?? '';
  const damageTypes = [
    ...asArray(options.damageTypes),
    ...asArray(system.damageTypes),
    ...asArray(damageType)
  ].map(normalizeRollKey).filter(Boolean);

  return {
    ...(options || {}),
    ...(extra || {}),
    item: weapon,
    itemId: weapon?.id ?? weapon?._id ?? options.itemId ?? options.weaponId ?? '',
    weapon,
    weaponId: weapon?.id ?? weapon?._id ?? options.weaponId ?? '',
    weaponGroup,
    group: weaponGroup,
    weaponCategory,
    category: weaponCategory,
    attackType: weaponCategory,
    damageType,
    damageTypes,
    customTags: Array.isArray(options.customTags) ? options.customTags : []
  };
}

function getBasicEffectIntentBonus(actor, target, weapon, options = {}, extra = {}) {
  try {
    return ModifierEngine.getEffectIntentModifierTotalForContext(actor, target, buildEffectIntentRollContext(weapon, options, extra), { includeBroad: true });
  } catch (err) {
    console.warn(`[SWSE] Failed to apply Basic effect intents for ${target}`, err);
    return 0;
  }
}

function getFightingDefensivelyAttackPenalty(actor, options = {}) {
  const active = options?.fightingDefensively === true || hasFightingDefensivelyEffect(actor);
  if (!active) return 0;
  const preparedPenalty = Number(actor?.system?.attackPenalty ?? 0) || 0;
  return preparedPenalty <= -5 ? 0 : -5;
}

function getTargetReflex(actor = null) {
  if (!actor) return null;
  const value = actor.system?.defenses?.reflex?.total
    ?? actor.system?.derived?.defenses?.reflex?.total
    ?? actor.system?.defenses?.reflex?.value
    ?? null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeDefenseKey(value = 'reflex') {
  const key = String(value || 'reflex').toLowerCase();
  if (key === 'fort' || key === 'fortitude') return 'fortitude';
  if (key === 'will') return 'will';
  if (key === 'dc') return 'dc';
  return 'reflex';
}

function getTargetDefense(actor = null, defenseType = 'reflex') {
  if (!actor) return null;
  const key = normalizeDefenseKey(defenseType);
  if (key === 'dc') return null;
  if (key === 'reflex') return getTargetReflex(actor);
  const value = actor.system?.defenses?.[key]?.total
    ?? actor.system?.derived?.defenses?.[key]?.total
    ?? actor.system?.defenses?.[key]?.value
    ?? null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveTargetContext(options = {}, fallbackTarget = null) {
  const ctx = options.targetContext ?? null;
  const mode = String(ctx?.mode || '').toLowerCase();
  if (mode === 'manual') {
    const value = Number(ctx?.defenseValue);
    return { target: null, targetName: ctx?.label || 'Manual Target', defenseType: normalizeDefenseKey(ctx?.defenseType || 'reflex'), defenseValue: Number.isFinite(value) ? value + Number(ctx?.coverBonus || 0) : null, mode: 'manual' };
  }
  if (mode === 'none') {
    return { target: null, targetName: 'GM adjudication', defenseType: normalizeDefenseKey(ctx?.defenseType || 'reflex'), defenseValue: null, mode: 'none' };
  }
  const target = fallbackTarget;
  const defenseType = normalizeDefenseKey(ctx?.defenseType || 'reflex');
  const base = getTargetDefense(target, defenseType);
  return { target, targetName: target?.name ?? '', defenseType, defenseValue: base, mode: target ? 'token' : 'none' };
}

function buildReactionContextForAttack(attacker, defender, weapon, attackTotal) {
  if (!attacker || !defender) return null;

  const damageContext = damageContextForReaction({ weapon });

  const available = ReactionEngine.getAvailableReactions(defender, {
    attacker,
    weapon,
    attackType: damageContext.attackType,
    damageType: damageContext.damageType,
    damageTypes: damageContext.damageTypes,
    originalDamageTypes: damageContext.originalDamageTypes,
    sonicCannotBeDeflected: damageContext.sonicCannotBeDeflected,
    trigger: 'ON_ATTACK_DECLARED'
  });

  if (!available.length) return null;

  return {
    attacker,
    attackerId: attacker.id,
    defender,
    defenderId: defender.id,
    defenderName: defender.name,
    timerLabel: '6.0 s',
    reason: `Incoming ${damageContext.attackType} attack total ${attackTotal}.`,
    damageType: damageContext.damageType,
    damageTypes: damageContext.damageTypes,
    originalDamageTypes: damageContext.originalDamageTypes,
    reactions: available.map(reaction => ({
      ...reaction,
      available: true,
      sublabel: reaction.key === 'block' || reaction.key === 'deflect' ? `DC ${attackTotal} · UTF` : ''
    }))
  };
}


function getPrimaryDamageDieFormula(baseFormula) {
  const match = String(baseFormula ?? '').match(/(?:^|[^\d])(\d*)d(\d+)/i);
  if (!match) return null;
  const sides = Number(match[2]);
  return Number.isFinite(sides) && sides > 0 ? `d${sides}` : null;
}

function buildExtraWeaponDiceFormula(baseFormula, extraDice) {
  const count = Number(extraDice ?? 0);
  if (!Number.isFinite(count) || count <= 0) return '';
  const die = getPrimaryDamageDieFormula(baseFormula);
  if (!die) return '';
  return ` + ${count}${die}`;
}

const DAMAGE_DIE_LADDER = [2, 3, 4, 6, 8, 10, 12];

function stepDamageDieFormula(baseFormula, steps = 0) {
  const count = Number(steps ?? 0);
  if (!Number.isFinite(count) || count === 0) return String(baseFormula ?? '1d6');
  return String(baseFormula ?? '1d6').replace(/(\d*)d(\d+)/gi, (match, diceCount, sidesText) => {
    const sides = Number(sidesText);
    const index = DAMAGE_DIE_LADDER.indexOf(sides);
    if (index < 0) return match;
    const nextIndex = Math.max(0, Math.min(DAMAGE_DIE_LADDER.length - 1, index + count));
    return `${diceCount || '1'}d${DAMAGE_DIE_LADDER[nextIndex]}`;
  });
}

/**
 * Compute complete attack bonus from all SWSE factors.
 * PHASE 4: Includes state-dependent modifiers
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {string} actionId - Optional action ID for talent bonus lookup (e.g., 'melee-attack', 'ranged-attack')
 * @param {Object} context - Optional context for state predicates (weapon, attackType, etc.)
 * @returns {number}
 */
function computeAttackBonus(actor, weapon, actionId = null, context = {}) {
  // Statblock NPCs can use stored totals until explicitly leveled.
  if (actor?.type === 'npc' && isNpcStatblockMode(actor)) {
    const npc = weapon?.flags?.swse?.npc;
    if (npc?.useFlat === true && Number.isFinite(npc.flatAttackBonus)) {
      return Number(npc.flatAttackBonus) || 0;
    }
  }

  const bab = SchemaAdapters.getBAB(actor);
  const attackOptionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);

  // RAW attack rolls use BAB + ability modifier. They do not add half level;
  // BAB already carries the level-based attack progression. Feat rules such as
  // Weapon Finesse and Mighty Throw may add/substitute ability contribution in
  // the combat-option resolver so the base weapon formula stays canonical.
  const abilityMod = SchemaAdapters.getAbilityMod(actor, getWeaponAttackAbility(actor, weapon)) + Number(attackOptionModifiers.attackAbilityBonus || 0);

  const miscBonus = getWeaponFlatAttackBonus(weapon);
  const rangePenalty = getRangePenalty(weapon, context);
  const rageModifiers = RageEngine.collectAttackModifiers(actor, weapon, context);

  // Condition Track penalty (read from authoritative derived source)
  // CANONICAL: DerivedCalculator computes and stores this in system.derived.damage.conditionPenalty
  // Also applied to skill totals in DerivedCalculator.computeAll() (line 339-340)
  const ctPenalty = actor.system?.derived?.damage?.conditionPenalty ??
                    actor.system?.conditionTrack?.penalty ??
                    0;

  // Attack penalties applied from Active Effects
  const attackPenalty = actor.system.attackPenalty ?? 0;

  // Weapon proficiency
  const proficient = actorIsProficientForAttack(actor, weapon);
  const proficiencyPenalty = proficient ? 0 : -5;

  // Talent bonuses from linked talents
  let talentBonus = 0;
  const TalentActionLinker = window.SWSE?.TalentActionLinker;
  if (actionId && TalentActionLinker?.MAPPING) {
    const bonusInfo = TalentActionLinker.calculateBonusForAction(actor, actionId);
    talentBonus = bonusInfo.value;
  }

  // PHASE 4: Get state-dependent modifiers
  let stateBonus = 0;
  try {
    if (actor?.items) {
      const enrichedContext = { weapon, ...context };
      for (const item of actor.items) {
        if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') {
          continue;
        }

        const meta = item.system?.abilityMeta;
        if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
          continue;
        }

        // Apply each modifier in the PASSIVE/STATE item
        for (const modifier of meta.modifiers) {
          // Check if this modifier applies to attack rolls
          const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
          const appliesToAttack = targets.some(t => t === 'attack' || t === 'attack.bonus');

          if (!appliesToAttack) continue;

          // Evaluate predicates (all must be true)
          const predicates = modifier.predicates || [];
          const predicatesMatch = evaluateStatePredicates(actor, predicates, enrichedContext);

          // Generic PASSIVE/STATE attack modifiers are now fail-closed unless
          // explicitly marked safe. Most migrated feat rows used placeholder
          // +2 attack modifiers for text-only riders; curated attack options
          // and selected-weapon modifier handling live in CombatOptionResolver.
          if (modifier.allowLegacyStateAttackBonus !== true) continue;

          if (predicatesMatch && modifier.value) {
            stateBonus += modifier.value;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error evaluating PASSIVE/STATE in attack bonus:', err);
  }

  // User-friendly Basic Active Effect intents. These include broad attack
  // bonuses and scoped roll-time effects such as +2 with pistols or +1 with
  // ranged attacks. Context matching happens in EffectIntentEngine so scoped
  // bonuses cannot leak into unrelated attack rolls.
  const basicEffectBonus = getBasicEffectIntentBonus(actor, 'global.attack', weapon, context, { rollType: 'attack' });

  // Total attack bonus (RAW)
  return (
    bab +
    abilityMod +
    miscBonus +
    rangePenalty +
    attackPenalty +
    ctPenalty +
    proficiencyPenalty +
    talentBonus +
    stateBonus +
    (attackOptionModifiers.attackBonus || 0) +
    (rageModifiers.attackBonus || 0) +
    basicEffectBonus
  );
}

/**
 * Roll an attack with a weapon using SWSE rules.
 */
export async function rollAttack(actor, weapon, options = {}) {
  const rollOptions = mergeCombatWorkflowContextIntoRollOptions(options, options?.combatContext ?? options?.workflowContext ?? null);
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  const workflowContext = summarizeCombatWorkflowContext(rollOptions.combatContext ?? rollOptions.workflowContext ?? rollOptions, {
    actor,
    weapon,
    target: rollOptions.target ?? null,
    targetId: rollOptions.targetId ?? rollOptions.targetContext?.actorId ?? null,
    damageMode: rollOptions.damageMode ?? null,
    damageType: rollOptions.damageType ?? null,
    isStun: rollOptions.stun === true || rollOptions.damageMode === 'stun',
    isIon: rollOptions.ion === true,
    contextTags: rollOptions.damageMode === 'stun' || rollOptions.stun === true ? ['stun'] : []
  });
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, rollOptions);
  const ammoSpend = await AmmoSystem.spendForWorkflow(actor, weapon, {
    workflowContext,
    options: rollOptions,
    optionModifiers
  });
  if (ammoSpend?.success === false) {
    ui?.notifications?.error?.(ammoSpend.message || `${weapon.name} does not have enough ammunition.`);
    return null;
  }

  try {
  const sequencePenalty = Number(rollOptions.sequencePenalty ?? 0);
  const atkBonus = computeAttackBonus(actor, weapon, null, rollOptions) + getFightingDefensivelyAttackPenalty(actor, rollOptions) + Number(rollOptions.customModifier || 0) + Number(rollOptions.situationalBonus || 0) + sequencePenalty;

  const rollFormula = `1d20 + ${atkBonus}`;
  const roll = await RollEngine.safeRoll(rollFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.attack', context: { weaponId: weapon?.id ?? null } });

  const targetContextOptions = optionModifiers.targetDefenseType && !rollOptions.targetContext
    ? { ...rollOptions, targetContext: { defenseType: optionModifiers.targetDefenseType } }
    : rollOptions;
  const resolvedTarget = resolveTargetContext(targetContextOptions, getTargetActorFromOptions(rollOptions));
  const target = resolvedTarget.target;
  const targetReflex = resolvedTarget.defenseValue;
  const isHit = targetReflex != null ? roll.total >= targetReflex : null;
  const d20 = roll?.dice?.[0]?.results?.[0]?.result ?? null;
  const criticalThreshold = Number(optionModifiers.criticalThreatNaturalMin ?? 20);
  const isCritical = Number(d20) === 20 || (Number.isFinite(criticalThreshold) && criticalThreshold < 20 && Number(d20) >= criticalThreshold && isHit !== false);
  const reactionContext = buildReactionContextForAttack(actor, target, weapon, roll.total);
  const attackRerollOptions = MetaResourceFeatResolver.buildAttackRerollChatOptions(actor, weapon, roll, {
    ...rollOptions,
    formula: rollFormula,
    weaponId: weapon.id,
    isHit,
    target
  });

  const damageWorkflowContext = summarizeCombatWorkflowContext(workflowContext, {
    actor,
    weapon,
    target,
    targetId: target?.id ?? null,
    targetName: resolvedTarget.targetName ?? target?.name ?? '',
    isCritical,
    critMultiplier: Math.max(Number(weapon.system?.critMultiplier ?? weapon.system?.criticalMultiplier ?? 2) || 2, Number(optionModifiers.criticalMultiplierMin ?? 0) || 0),
    hit: isHit,
    natural1: Number(d20) === 1,
    natural20: Number(d20) === 20,
    defense: resolvedTarget.defenseType ?? workflowContext?.attack?.defense ?? null
  });

  if (!rollOptions.suppressChat) await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`,
    flags: { swse: { attackRoll: true, weaponId: weapon.id, attackRerollOptions, workflowContext: damageWorkflowContext, targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [], targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [] } },
    context: {
      type: 'attack',
      weaponId: weapon.id,
      weapon,
      workflowContext: damageWorkflowContext,
      actionId: rollOptions.actionId ?? damageWorkflowContext?.actionId ?? null,
      actionName: workflowContext?.actionName ?? null,
      attackRerollOptions,
      target,
      targetName: resolvedTarget.targetName ?? target?.name ?? '',
      targetContext: resolvedTarget,
      targetDefense: resolvedTarget.defenseType === 'dc' ? 'DC' : resolvedTarget.defenseType === 'fortitude' ? 'Fortitude' : resolvedTarget.defenseType === 'will' ? 'Will' : 'Reflex',
      dc: targetReflex,
      passed: isHit,
      success: isHit,
      outcomeLabel: isCritical ? 'Critical Hit' : isHit === true ? 'Hit' : isHit === false ? 'Miss' : '',
      isCritical,
      critMultiplier: Math.max(Number(weapon.system?.critMultiplier ?? weapon.system?.criticalMultiplier ?? 2) || 2, Number(optionModifiers.criticalMultiplierMin ?? 0) || 0),
      reactionContext,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
      targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
      sourceElement: rollOptions?.sourceElement ?? null,
      companionSource: rollOptions?.companionSource ?? null,
      sheet: rollOptions?.sheet ?? null,
      showRollCompanion: rollOptions?.showRollCompanion !== false
    }
  });

  if (Number(d20) === 1) {
    await ForceExecutor.handleForceFlowNaturalOne(actor, { source: weapon?.name ?? 'Attack', rollType: 'attack roll' });
  }
  if (Number(d20) === 20) {
    await ForceExecutor.grantTelepathicInfluenceForcePoint(actor);
  }

  const attackResult = {
    roll,
    total: roll.total,
    atkBonus,
    sequencePenalty,
    isHit,
    isCritical,
    critThreat: isCritical,
    concealmentMiss: false,
    concealmentMissChance: 0,
    confirmationRoll: null,
    d20,
    target,
    targetReflex,
    resolvedTarget,
    weaponId: weapon.id,
    weapon,
    critMultiplier: Math.max(Number(weapon.system?.critMultiplier ?? weapon.system?.criticalMultiplier ?? 2) || 2, Number(optionModifiers.criticalMultiplierMin ?? 0) || 0),
    reactionContext,
    attackRerollOptions,
    workflowContext: damageWorkflowContext,
    actionId: rollOptions.actionId ?? damageWorkflowContext?.actionId ?? null,
    actionData: rollOptions.actionData ?? null,
    targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
    targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
  };
  roll.swseAttackContext = {
    attackBonus: atkBonus,
    sequencePenalty,
    isHit,
    isCritical,
    natural1: Number(d20) === 1,
    natural20: Number(d20) === 20,
    critMultiplier: attackResult.critMultiplier,
    targetDefenseValue: targetReflex,
    targetDefenseType: resolvedTarget.defenseType ?? null,
    defenseAdjustment: 0,
    workflowContext: damageWorkflowContext,
    actionId: attackResult.actionId
  };
  attackResult.ammoSpend = ammoSpend;
  return attackResult;
  } catch (err) {
    if (ammoSpend?.spent) {
      await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
    }
    throw err;
  }
}

/**
 * Compute SWSE damage bonus for a weapon
 */
function computeDamageBonus(actor, weapon, context = {}) {
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);
  if (optionModifiers?.flags?.damageBaseOnly === true) {
    return getWeaponFlatDamageBonus(weapon);
  }

  const halfLvl = getEffectiveHalfLevel(actor);

  let bonus = halfLvl + getWeaponFlatDamageBonus(weapon);
  bonus += getDamageAbilityContribution(actor, weapon);
  bonus += RageEngine.collectAttackModifiers(actor, weapon, context).damageBonus || 0;
  bonus += getBasicEffectIntentBonus(actor, 'global.damage', weapon, context, { rollType: 'damage' });

  return bonus;
}

/**
 * Roll damage for a weapon.
 */
export async function rollDamage(actor, weapon, options = {}) {
  const rollOptions = mergeCombatWorkflowContextIntoRollOptions(options, options?.combatContext ?? options?.workflowContext ?? null);
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for damage roll.');
    return null;
  }

  const workflowContext = summarizeCombatWorkflowContext(rollOptions.combatContext ?? rollOptions.workflowContext ?? rollOptions, {
    actor,
    weapon,
    target: rollOptions.target ?? null,
    isCritical: rollOptions?.critical === true || rollOptions?.isCritical === true,
    damageMode: rollOptions.damageMode ?? null,
    damageType: rollOptions.damageType ?? null,
    isStun: rollOptions.stun === true || rollOptions.damageMode === 'stun',
    isIon: rollOptions.ion === true,
    contextTags: rollOptions.damageMode === 'stun' || rollOptions.stun === true ? ['stun'] : []
  });
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, rollOptions);
  const dmgBonus = computeDamageBonus(actor, weapon, rollOptions) + (optionModifiers.damageBonus || 0);

  const criticalStepBonus = (rollOptions?.critical === true || rollOptions?.isCritical === true) ? Number(optionModifiers.criticalDamageDieStepBonus || 0) : 0;
  const base = stepDamageDieFormula(weapon.system?.damage ?? weapon.damage ?? '1d6', (optionModifiers.damageDieStepIncreases ?? 0) + criticalStepBonus);
  const extraDiceFormula = buildExtraWeaponDiceFormula(base, optionModifiers.damageExtraWeaponDice ?? optionModifiers.damageDiceStepBonus ?? 0);
  const formula = `${base}${extraDiceFormula} + ${dmgBonus}`;

  const roll = await RollEngine.safeRoll(formula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.damage', context: { weaponId: weapon?.id ?? null } });

  await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Damage (${formula})`,
    flags: { swse: { damageRoll: true, weaponId: weapon.id, workflowContext } },
    context: { type: 'damage', weaponId: weapon.id, weapon, workflowContext, target: rollOptions.target ?? null, damageType: resolveDamagePacketType({ weapon, workflowContext, options: rollOptions }), sourceElement: rollOptions?.sourceElement ?? null, companionSource: rollOptions?.companionSource ?? null, sheet: rollOptions?.sheet ?? null, showRollCompanion: rollOptions?.showRollCompanion !== false, targetContext: rollOptions?.targetContext ?? null }
  });

  return roll;
}

/**
 * Roll full attack (attack roll + optional crit threat handling)
 */
export async function rollFullAttack(actor, weapon, options = {}) {
  const attack = await rollAttack(actor, weapon, options);
  if (!attack) {return null;}

  const result = { attack, damage: null };

  // Crit threat detection
  const critRange = weapon.system?.critRange ?? 20;
  const isThreat = attack.dice[0]?.results?.some(r => r.result >= critRange);

  if (isThreat) {
    ui.notifications.info('Critical Threat!');
  }

  return result;
}

/* ============= Phase 4: Narration Wrappers ============= */

/**
 * Helper: get first targeted token name
 */
function _firstTargetName() {
  try {
    const t = Array.from(game.user.targets ?? []);
    if (!t.length) return null;
    return t[0]?.name ?? t[0]?.document?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Roll attack + damage together with narration
 * Does NOT reference defenses; narration is supplemental only
 */
export async function rollAttackAndDamageWithNarration(actor, weapon, options = {}) {
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  const targetName = _firstTargetName();
  const atkBonus = computeAttackBonus(actor, weapon, null, options);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, options);
  const dmgBonus = computeDamageBonus(actor, weapon, options) + (optionModifiers.damageBonus || 0);
  const workflowContext = summarizeCombatWorkflowContext(options.combatContext ?? options.workflowContext ?? null, { actor, weapon });
  const ammoSpend = await AmmoSystem.spendForWorkflow(actor, weapon, {
    workflowContext,
    options,
    optionModifiers
  });
  if (ammoSpend?.success === false) {
    ui?.notifications?.error?.(ammoSpend.message || `${weapon.name} does not have enough ammunition.`);
    return null;
  }

  try {
  const rollFormula = `1d20 + ${atkBonus}`;
  const dmgBase = stepDamageDieFormula(weapon.system?.damage ?? weapon.damage ?? '1d6', optionModifiers.damageDieStepIncreases ?? 0);
  const dmgExtraDice = buildExtraWeaponDiceFormula(dmgBase, optionModifiers.damageExtraWeaponDice ?? optionModifiers.damageDiceStepBonus ?? 0);
  const dmgFormula = `${dmgBase}${dmgExtraDice} + ${dmgBonus}`;

  const attackRoll = await RollEngine.safeRoll(rollFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.attack', context: { weaponId: weapon?.id ?? null } });
  const damageRoll = await RollEngine.safeRoll(dmgFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.damage' });

  const atkTotal = attackRoll?.total;
  const dmgTotal = damageRoll?.total;

  // Post attack roll card
  const target = getTargetActorFromOptions(options);
  const targetReflex = getTargetReflex(target);
  const isHit = targetReflex != null ? attackRoll.total >= targetReflex : null;
  const attackD20 = attackRoll?.dice?.[0]?.results?.[0]?.result ?? null;
  const isCritical = Number(attackD20) === 20;
  const reactionContext = buildReactionContextForAttack(actor, target, weapon, attackRoll.total);
  const attackRerollOptions = MetaResourceFeatResolver.buildAttackRerollChatOptions(actor, weapon, attackRoll, {
    ...options,
    formula: rollFormula,
    weaponId: weapon.id,
    isHit,
    target
  });

  await SWSEChat.postRoll({
    roll: attackRoll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`,
    flags: { swse: { attackRoll: true, weaponId: weapon.id, attackRerollOptions, targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [], targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [] } },
    context: {
      type: 'attack',
      weaponId: weapon.id,
      weapon,
      attackRerollOptions,
      target,
      targetName: target?.name ?? '',
      targetDefense: 'Reflex',
      dc: targetReflex,
      passed: isHit,
      success: isHit,
      outcomeLabel: isCritical ? 'Critical Hit' : isHit === true ? 'Hit' : isHit === false ? 'Miss' : '',
      isCritical,
      critMultiplier: Math.max(Number(weapon.system?.critMultiplier ?? weapon.system?.criticalMultiplier ?? 2) || 2, Number(optionModifiers.criticalMultiplierMin ?? 0) || 0),
      reactionContext,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || []
    }
  });

  if (Number(attackD20) === 1) {
    await ForceExecutor.handleForceFlowNaturalOne(actor, { source: weapon?.name ?? 'Attack', rollType: 'attack roll' });
  }
  if (Number(attackD20) === 20) {
    await ForceExecutor.grantTelepathicInfluenceForcePoint(actor);
  }

  // Post damage roll card
  await SWSEChat.postRoll({
    roll: damageRoll,
    actor,
    flavor: `${weapon.name} Damage`,
    context: { type: 'damage', weaponId: weapon.id, weapon, damageType: weapon.system?.damageType ?? weapon.system?.damage?.type ?? '' }
  });

  // Post supplemental narration (gated by setting)
  if (typeof atkTotal === "number" && typeof dmgTotal === "number") {
    try {
      const { ActionChatEngine } = await import("/systems/foundryvtt-swse/scripts/chat/action-chat-engine.js");
      await ActionChatEngine.narrationAttack(actor, weapon.name ?? "Weapon", atkTotal, dmgTotal, { targetName });
    } catch {
      // Narration engine not available; continue anyway
    }
  }

  return { attack: attackRoll, damage: damageRoll, ammoSpend };
  } catch (err) {
    if (ammoSpend?.spent) {
      await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
    }
    throw err;
  }
}
