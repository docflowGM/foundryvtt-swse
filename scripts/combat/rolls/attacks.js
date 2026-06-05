import { getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { isNpcStatblockMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
import { getDamageAbilityContribution, getRangePenalty, getWeaponAttackAbility, getWeaponFlatAttackBonus, getWeaponFlatDamageBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ReactionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js";

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

  const weaponMode = String(weapon?.system?.meleeOrRanged ?? weapon?.system?.weaponRangeType ?? weapon?.system?.category ?? '').toLowerCase();
  const attackType = weaponMode.includes('range') || weaponMode.includes('ranged') ? 'ranged' : 'melee';
  const damageTypes = weapon?.system?.damageTypes
    ?? weapon?.system?.damageType
    ?? weapon?.system?.damage?.type
    ?? [];

  const available = ReactionEngine.getAvailableReactions(defender, {
    attacker,
    weapon,
    attackType,
    damageTypes: Array.isArray(damageTypes) ? damageTypes : [damageTypes].filter(Boolean),
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
    reason: `Incoming ${attackType} attack total ${attackTotal}.`,
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
  const proficient = weapon.system?.proficient ?? true;
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
    (rageModifiers.attackBonus || 0)
  );
}

/**
 * Roll an attack with a weapon using SWSE rules.
 */
export async function rollAttack(actor, weapon, options = {}) {
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, options);
  const atkBonus = computeAttackBonus(actor, weapon, null, options) + getFightingDefensivelyAttackPenalty(actor, options) + Number(options.customModifier || 0) + Number(options.situationalBonus || 0);

  const rollFormula = `1d20 + ${atkBonus}`;
  const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula);

  const attackRerollOptions = MetaResourceFeatResolver.buildAttackRerollChatOptions(actor, weapon, roll, {
    formula: rollFormula,
    weaponId: weapon.id
  });

  const targetContextOptions = optionModifiers.targetDefenseType && !options.targetContext
    ? { ...options, targetContext: { defenseType: optionModifiers.targetDefenseType } }
    : options;
  const resolvedTarget = resolveTargetContext(targetContextOptions, getTargetActorFromOptions(options));
  const target = resolvedTarget.target;
  const targetReflex = resolvedTarget.defenseValue;
  const isHit = targetReflex != null ? roll.total >= targetReflex : null;
  const d20 = roll?.dice?.[0]?.results?.[0]?.result ?? null;
  const criticalThreshold = Number(optionModifiers.criticalThreatNaturalMin ?? 20);
  const isCritical = Number(d20) === 20 || (Number.isFinite(criticalThreshold) && criticalThreshold < 20 && Number(d20) >= criticalThreshold && isHit !== false);
  const reactionContext = buildReactionContextForAttack(actor, target, weapon, roll.total);

  await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`,
    flags: { swse: { attackRoll: true, weaponId: weapon.id, attackRerollOptions, targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [], targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [] } },
    context: {
      type: 'attack',
      weaponId: weapon.id,
      weapon,
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
      sourceElement: options?.sourceElement ?? null,
      companionSource: options?.companionSource ?? null,
      sheet: options?.sheet ?? null,
      showRollCompanion: options?.showRollCompanion !== false
    }
  });

  return roll;
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

  return bonus;
}

/**
 * Roll damage for a weapon.
 */
export async function rollDamage(actor, weapon, options = {}) {
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for damage roll.');
    return null;
  }

  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, options);
  const dmgBonus = computeDamageBonus(actor, weapon, options) + (optionModifiers.damageBonus || 0);

  const criticalStepBonus = (options?.critical === true || options?.isCritical === true) ? Number(optionModifiers.criticalDamageDieStepBonus || 0) : 0;
  const base = stepDamageDieFormula(weapon.system?.damage ?? weapon.damage ?? '1d6', (optionModifiers.damageDieStepIncreases ?? 0) + criticalStepBonus);
  const extraDiceFormula = buildExtraWeaponDiceFormula(base, optionModifiers.damageExtraWeaponDice ?? optionModifiers.damageDiceStepBonus ?? 0);
  const formula = `${base}${extraDiceFormula} + ${dmgBonus}`;

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula);

  await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Damage (${formula})`,
    context: { type: 'damage', weaponId: weapon.id, weapon, damageType: weapon.system?.damageType ?? weapon.system?.damage?.type ?? '', sourceElement: options?.sourceElement ?? null, companionSource: options?.companionSource ?? null, sheet: options?.sheet ?? null, showRollCompanion: options?.showRollCompanion !== false, targetContext: options?.targetContext ?? null }
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

  const rollFormula = `1d20 + ${atkBonus}`;
  const dmgBase = stepDamageDieFormula(weapon.system?.damage ?? weapon.damage ?? '1d6', optionModifiers.damageDieStepIncreases ?? 0);
  const dmgExtraDice = buildExtraWeaponDiceFormula(dmgBase, optionModifiers.damageExtraWeaponDice ?? optionModifiers.damageDiceStepBonus ?? 0);
  const dmgFormula = `${dmgBase}${dmgExtraDice} + ${dmgBonus}`;

  const attackRoll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula);
  const damageRoll = await globalThis.SWSE.RollEngine.safeRoll(dmgFormula);

  const atkTotal = attackRoll?.total;
  const dmgTotal = damageRoll?.total;

  const attackRerollOptions = MetaResourceFeatResolver.buildAttackRerollChatOptions(actor, weapon, attackRoll, {
    formula: rollFormula,
    weaponId: weapon.id
  });

  // Post attack roll card
  const target = getTargetActorFromOptions(options);
  const targetReflex = getTargetReflex(target);
  const isHit = targetReflex != null ? attackRoll.total >= targetReflex : null;
  const attackD20 = attackRoll?.dice?.[0]?.results?.[0]?.result ?? null;
  const isCritical = Number(attackD20) === 20;
  const reactionContext = buildReactionContextForAttack(actor, target, weapon, attackRoll.total);

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

  return { attack: attackRoll, damage: damageRoll };
}
