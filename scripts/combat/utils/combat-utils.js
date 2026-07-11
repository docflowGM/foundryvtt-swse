import { ResolutionContext } from '../../engine/resolution/resolution-context.js';
import { RULES } from '../../engine/execution/rules/rule-enum.js';
import { getHalfLevelDamageBonus, isMeleeWeapon as isRawMeleeWeapon, isRangedWeapon as isRawRangedWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { resolveAttackBonus, resolveDamageBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js";

/**
 * Modern SWSE Combat Utilities (v13+)
 * - Non-roll tactical helpers: cover, concealment, flanking, critical rules
 * - Compatibility wrappers for historical combat math APIs
 *
 * IMPORTANT: Attack and damage bonus math is now owned by
 * scripts/engine/combat/combat-roll-math.js. The legacy compute* exports below
 * intentionally delegate to the canonical resolver so old call sites cannot fork
 * roll/display math while they are being migrated.
 */

/* -------------------------------------------------------------------------- */
/* CONDITION TRACK PENALTIES (RAW, numeric CT 0-5)                             */
/* -------------------------------------------------------------------------- */

/**
 * Get RAW SWSE condition penalty based on CT step.
 * @param {number} ctStep - Integer 0-5
 * @returns {number} Penalty value
 */
export function getConditionPenalty(ctStep) {
  const penalties = [0, -1, -2, -5, -10, 0];
  return penalties[Math.clamp(ctStep, 0, 5)] ?? 0;
}

/* -------------------------------------------------------------------------- */
/* ATTACK BONUS CALCULATION                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Compatibility wrapper for historical attack math callers.
 *
 * @deprecated Use resolveAttackBonus() from combat-roll-math.js for new code.
 * Existing callers receive canonical SSOT math through this wrapper.
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {Object} [options]
 * @returns {number} Final attack bonus
 */
export function computeAttackBonus(actor, weapon, options = {}) {
  const actionId = options?.actionId ?? options?.action ?? options?.combatActionId ?? null;
  return resolveAttackBonus(actor, weapon, actionId, options).total;
}

/**
 * Calculate effective critical threat range with EXTEND_CRITICAL_RANGE modifiers.
 */
export function getEffectiveCritRange(actor, weapon) {
  const baseCritRange = weapon.system?.critRange || 20;
  if (!actor) return baseCritRange;
  const ctx = new ResolutionContext(actor);
  const critRules = ctx.getRuleInstances(RULES.EXTEND_CRITICAL_RANGE);
  let bonus = 0;
  const weaponProf = weapon.system?.proficiency;
  for (const rule of critRules) {
    if (rule.proficiency === weaponProf) bonus += rule.by || 0;
  }
  return Math.max(2, baseCritRange - bonus);
}

/**
 * Get critical damage bonus formula from CRITICAL_DAMAGE_BONUS rules.
 */
export function getCriticalDamageBonus(actor, weapon) {
  if (!actor || !weapon) return '';
  const ctx = new ResolutionContext(actor);
  const critBonusRules = ctx.getRuleInstances(RULES.CRITICAL_DAMAGE_BONUS);
  const bonuses = [];
  const weaponProf = weapon.system?.proficiency;
  for (const rule of critBonusRules) {
    if (rule.proficiency === weaponProf && rule.bonus) bonuses.push(String(rule.bonus));
  }
  return bonuses.length > 0 ? bonuses.join(' + ') : '';
}

/**
 * Get critical damage multiplier with MODIFY_CRITICAL_MULTIPLIER overrides.
 */
export function getCriticalMultiplier(actor, weapon) {
  const defaultMultiplier = weapon.system?.critMultiplier || 2;
  if (!actor || !weapon) return defaultMultiplier;
  const ctx = new ResolutionContext(actor);
  const multRules = ctx.getRuleInstances(RULES.MODIFY_CRITICAL_MULTIPLIER);
  let highestMultiplier = defaultMultiplier;
  const weaponProf = weapon.system?.proficiency;
  for (const rule of multRules) {
    if (rule.proficiency === weaponProf && rule.multiplier) highestMultiplier = Math.max(highestMultiplier, rule.multiplier);
  }
  return highestMultiplier;
}

/**
 * Get critical confirmation bonus from CRITICAL_CONFIRM_BONUS rules.
 */
export function getCriticalConfirmBonus(actor, weapon) {
  if (!actor || !weapon) return 0;
  const ctx = new ResolutionContext(actor);
  const confirmRules = ctx.getRuleInstances(RULES.CRITICAL_CONFIRM_BONUS);
  let bonus = 0;
  const weaponProf = weapon.system?.proficiency;
  for (const rule of confirmRules) {
    if (rule.proficiency === weaponProf && rule.bonus) bonus += rule.bonus || 0;
  }
  return bonus;
}

/* -------------------------------------------------------------------------- */
/* DAMAGE BONUS CALCULATION                                                    */
/* -------------------------------------------------------------------------- */

/** Determine if a weapon is a melee weapon. */
export function isMeleeWeapon(weapon) {
  const range = (weapon.system?.range || '').toLowerCase();
  return range === 'melee' || range === '';
}

/** Determine if a weapon is a light weapon. */
export function isLightWeapon(weapon, actor) {
  if (weapon.system?.isLight === true) return true;

  const weaponSize = (weapon.system?.size || '').toLowerCase();
  const actorSize = (actor.system?.size || 'medium').toLowerCase();
  const sizeOrder = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
  const actorSizeIndex = sizeOrder.indexOf(actorSize);
  const weaponSizeIndex = sizeOrder.indexOf(weaponSize);

  if (weaponSizeIndex !== -1 && actorSizeIndex !== -1) return weaponSizeIndex < actorSizeIndex;

  const name = (weapon.name || '').toLowerCase();
  const lightWeapons = [
    'knife', 'dagger', 'vibrodagger', 'shiv', 'stiletto',
    'hold-out', 'holdout', 'derringer', 'pocket pistol'
  ];
  return lightWeapons.some(lw => name.includes(lw));
}

/** Determine if a weapon should be wielded two-handed. */
export function isTwoHandedWeapon(weapon, actor) {
  if (weapon.system?.twoHanded === true) return true;
  if (weapon.system?.hands === 2) return true;

  const category = (weapon.system?.category || weapon.system?.subcategory || '').toLowerCase();
  const name = (weapon.name || '').toLowerCase();
  const twoHandedCategories = [
    'two-handed', 'twohanded', '2h', '2-handed',
    'heavy', 'rifle', 'carbine', 'repeating',
    'quarterstaff', 'staff', 'pike', 'polearm', 'spear',
    'electrostaff', 'force pike', 'vibro-ax', 'vibroax',
    'double-bladed', 'double bladed'
  ];

  if (twoHandedCategories.some(cat => category.includes(cat) || name.includes(cat))) return true;

  const weaponSize = (weapon.system?.size || '').toLowerCase();
  const actorSize = (actor.system?.size || 'medium').toLowerCase();
  const sizeOrder = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
  const actorSizeIndex = sizeOrder.indexOf(actorSize);
  const weaponSizeIndex = sizeOrder.indexOf(weaponSize);

  if (weaponSizeIndex !== -1 && actorSizeIndex !== -1) return weaponSizeIndex > actorSizeIndex;

  return false;
}

/** Check if actor has a talent that allows DEX for melee damage. */
export function hasDexToDamageTalent(actor) {
  const dexDamageTalents = [
    'weapon finesse',
    'dexterous damage',
    'precise strike',
    'melee finesse'
  ];

  for (const item of actor.items) {
    if (item.type !== 'talent' && item.type !== 'feat') continue;
    const name = (item.name || '').toLowerCase();
    if (dexDamageTalents.some(t => name.includes(t))) return true;
  }

  return false;
}

function computePassiveStateDamageBonus(actor, weapon, context = {}) {
  let stateBonus = 0;
  try {
    if (!actor?.items) return 0;
    const enrichedContext = { ...context, weapon };
    for (const item of actor.items) {
      if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') continue;
      const modifiers = item.system?.abilityMeta?.modifiers;
      if (!Array.isArray(modifiers)) continue;
      const meta = item.system?.abilityMeta || {};
      for (const modifier of modifiers) {
        const scopedModifier = {
          ...modifier,
          mechanicsMode: modifier.mechanicsMode || meta.mechanicsMode,
          applicationScope: modifier.applicationScope || meta.applicationScope,
          staticSheetPolicy: modifier.staticSheetPolicy || meta.staticSheetPolicy,
          requiresRuntimeContext: modifier.requiresRuntimeContext ?? meta.requiresRuntimeContext,
          requiresSelectedChoice: modifier.requiresSelectedChoice ?? meta.requiresSelectedChoice,
          predicateRequirements: modifier.predicateRequirements || meta.predicateRequirements || []
        };
        if (!ModifierEngine.isModifierAllowedInContext(actor, scopedModifier, enrichedContext, { staticSheet: false })) continue;
        const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
        const appliesToDamage = targets.some((target) => {
          const normalized = String(target || '').toLowerCase();
          return normalized === 'damage' || normalized === 'damage.bonus' || normalized === 'damage.ranged' || normalized === 'damage.melee';
        });
        if (!appliesToDamage) continue;
        const predicates = Array.isArray(modifier.predicates) ? modifier.predicates : [];
        if (!evaluateStatePredicates(actor, predicates, enrichedContext)) continue;
        stateBonus += Number(modifier.value || 0);
      }
    }
  } catch (err) {
    console.warn('[SWSE] Failed to calculate PASSIVE/STATE damage bonus:', err);
  }
  return stateBonus;
}

/**
 * Compatibility wrapper for historical damage math callers.
 *
 * @deprecated Use resolveDamageBonus() from combat-roll-math.js for new code.
 * Existing callers receive canonical SSOT math through this wrapper.
 */
export function computeDamageBonus(actor, weapon, options = {}) {
  return resolveDamageBonus(actor, weapon, options).total;
}

/* -------------------------------------------------------------------------- */
/* COVER / CONCEALMENT / FLANKING                                              */
/* -------------------------------------------------------------------------- */

/** RAW cover bonuses to Reflex. */
export function getCoverBonus(type) {
  const table = { none: 0, partial: 2, cover: 5, improved: 10 };
  return table[type] ?? 0;
}

/** Concealment miss chances. */
export function getConcealmentMissChance(type) {
  const table = { none: 0, partial: 20, concealment: 20, total: 50 };
  return table[type] ?? 0;
}

/** Check concealment outcome. */
export function checkConcealmentHit(missChance) {
  const roll = Math.floor(Math.random() * 100) + 1;
  return roll > missChance;
}

/** RAW flanking bonus. */
export function getFlankingBonus(isFlanking) {
  return isFlanking ? 2 : 0;
}

/* -------------------------------------------------------------------------- */
/* SIZE MODIFIERS                                                              */
/* -------------------------------------------------------------------------- */

/** SWSE uses opposed size mods for certain attacks. */
export function getSizeModifier(size) {
  const table = {
    fine: +8,
    diminutive: +4,
    tiny: +2,
    small: +1,
    medium: 0,
    large: -1,
    huge: -2,
    gargantuan: -4,
    colossal: -8,
    colossal2: -10
  };
  return table[size] ?? 0;
}

/* -------------------------------------------------------------------------- */
/* ACTIVE EFFECT HELPERS                                                       */
/* -------------------------------------------------------------------------- */

/** Extracts an Active Effect modification for a given path. */
export function getEffectModifier(actor, key) {
  let total = 0;

  for (const effect of actor.effects ?? []) {
    if (effect.disabled) continue;

    for (const [path, update] of Object.entries(effect.updates ?? {})) {
      if (path !== key) continue;

      const value = Number(update.value ?? 0);
      switch (update.mode) {
        case 'ADD': total += value; break;
        case 'MULTIPLY': total *= value; break;
        case 'OVERRIDE': total = value; break;
      }
    }
  }

  return total;
}

/* -------------------------------------------------------------------------- */
/* COMPLETE ATTACK RESOLUTION (OPTIONAL FUTURE USE)                            */
/* -------------------------------------------------------------------------- */

/** Run attack resolution after the attack roll. */
export function resolveAttackAgainstTarget(attackRoll, target, options = {}) {
  const ref = target.system.defenses?.reflex?.total ?? 10;
  const cover = getCoverBonus(options.coverType ?? 'none');
  const finalRef = ref + cover;
  return {
    hit: attackRoll.total >= finalRef,
    reflex: finalRef
  };
}

// Keep these raw imports semantically referenced for older utility consumers that
// inspect this module's helper behavior during transition.
void getHalfLevelDamageBonus;
void isRawMeleeWeapon;
void isRawRangedWeapon;
void computePassiveStateDamageBonus;
