import { getEffectiveHalfLevel } from '../../actors/derived/level-split.js';
import { ResolutionContext } from '../../engine/resolution/resolution-context.js';
import { RULES } from '../../engine/execution/rules/rule-enum.js';
import { SchemaAdapters } from '../../utils/schema-adapters.js';
import { isNpcStatblockMode } from '../../actors/npc/npc-mode-adapter.js';

/**
 * Modern SWSE Combat Utilities (v13+)
 * - Condition Track integer-based penalties
 * - Combat math used by SWSERoll, DamageSystem, ActiveEffects
 * - Future-proof flanking, concealment, size mods, AE modifiers
 * - Clean, consistent, actor-centric API
 */

/* -------------------------------------------------------------------------- */
/* CONDITION TRACK PENALTIES (RAW, numeric CT 0–5)                             */
/* -------------------------------------------------------------------------- */

/**
 * Get RAW SWSE condition penalty based on CT step.
 *
 * CT levels (RAW SWSE):
 * - 0: Normal (0 penalty)
 * - 1: Shaken (-1 penalty)
 * - 2: Frightened (-2 penalty)
 * - 3: Panicked (-5 penalty)
 * - 4: Cowering (-10 penalty)
 * - 5: Helpless (can't act, no numeric penalty)
 *
 * @param {number} ctStep - Integer 0–5
 * @returns {number} Penalty value
 */
export function getConditionPenalty(ctStep) {
  const penalties = [0, -1, -2, -5, -10, 0]; // Helpless = 0 (can't act, numeric penalty irrelevant)
  return penalties[Math.clamp(ctStep, 0, 5)] ?? 0;
}

/* -------------------------------------------------------------------------- */
/* ATTACK BONUS CALCULATION                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Compute SWSE attack bonus from all components.
 * This is NOT the final attack roll function — SWSERoll handles FP + UI.
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {number} Final attack bonus
 */
export function computeAttackBonus(actor, weapon) {
  // Statblock NPCs can use stored totals until explicitly leveled.
  if (actor?.type === 'npc' && isNpcStatblockMode(actor)) {
    const npc = weapon?.flags?.swse?.npc;
    if (npc?.useFlat === true && Number.isFinite(npc.flatAttackBonus)) {
      return Number(npc.flatAttackBonus) || 0;
    }
  }

  const level = actor.system.level ?? 1;
  const halfLvl = getEffectiveHalfLevel(actor);

  const bab = SchemaAdapters.getBAB(actor);

  // Ability mod used for attack
  const attr = weapon.system?.attackAttribute ?? 'str';
  const abilityMod = SchemaAdapters.getAbilityMod(actor, attr);

  // Weapon-based bonuses
  const misc = weapon.system?.attackBonus ?? 0;

  // Species combat bonuses (from SpeciesTraitEngine)
  const speciesCombat = actor.system?.speciesCombatBonuses || actor.system?.speciesTraitBonuses?.combat || {};
  const speciesAttackBonus = (weapon.system?.ranged ? (speciesCombat.rangedAttack || 0) : (speciesCombat.meleeAttack || 0));

  // Condition Track penalties (read from authoritative derived source)
  const ctPenalty = actor.system?.derived?.damage?.conditionPenalty ??
                    actor.system?.conditionTrack?.penalty ??
                    0;

  // REGRESSION GUARD: Detect mismatch between system and derived penalties
  if (game.settings.get(game.system.id, "devMode") &&
      actor.system?.conditionTrack &&
      actor.system?.conditionTrack?.penalty !== undefined &&
      actor.system?.derived?.damage?.conditionPenalty !== actor.system?.conditionTrack?.penalty) {
    console.warn(
      `[SWSE] Condition penalty mismatch detected for ${actor.name}.`,
      {
        systemPenalty: actor.system.conditionTrack.penalty,
        derivedPenalty: actor.system.derived?.damage?.conditionPenalty
      }
    );
  }

  // Size modifiers, if in your system
  const sizeMod = actor.system.sizeMod ?? 0;

  // Active Effect attack penalties (your refactor uses system.attackPenalty)
  const aePenalty = actor.system.attackPenalty ?? 0;

  // Weapon proficiency penalty (RAW: –5)
  const proficient = weapon.system?.proficient ?? true;
  const proficiencyPenalty = proficient ? 0 : -5;

  return (
    bab +
    halfLvl +
    abilityMod +
    misc +
    speciesAttackBonus +
    sizeMod +
    aePenalty +
    ctPenalty +
    proficiencyPenalty
  );
}

/**
 * Calculate effective critical threat range with EXTEND_CRITICAL_RANGE modifiers
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {number} The adjusted critical threat range (minimum 2)
 */
export function getEffectiveCritRange(actor, weapon) {
  const baseCritRange = weapon.system?.critRange || 20;

  if (!actor) return baseCritRange;

  const ctx = new ResolutionContext(actor);
  const critRules = ctx.getRuleInstances(RULES.EXTEND_CRITICAL_RANGE);

  let bonus = 0;
  const weaponProf = weapon.system?.proficiency;

  for (const rule of critRules) {
    if (rule.proficiency === weaponProf) {
      bonus += rule.by || 0;
    }
  }

  // Ensure crit range never drops below 2 (natural rule)
  return Math.max(2, baseCritRange - bonus);
}

/**
 * Get critical damage bonus formula from CRITICAL_DAMAGE_BONUS rules
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {string} Bonus formula (e.g., "1d6" or "+2") to add to damage, or empty string
 */
export function getCriticalDamageBonus(actor, weapon) {
  if (!actor || !weapon) return '';

  const ctx = new ResolutionContext(actor);
  const critBonusRules = ctx.getRuleInstances(RULES.CRITICAL_DAMAGE_BONUS);

  const bonuses = [];
  const weaponProf = weapon.system?.proficiency;

  for (const rule of critBonusRules) {
    if (rule.proficiency === weaponProf && rule.bonus) {
      bonuses.push(String(rule.bonus));
    }
  }

  // Join multiple bonuses with +
  return bonuses.length > 0 ? bonuses.join(' + ') : '';
}

/**
 * Get critical damage multiplier with MODIFY_CRITICAL_MULTIPLIER overrides
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {number} Critical multiplier (default 2, overridden by highest matching rule)
 */
export function getCriticalMultiplier(actor, weapon) {
  const defaultMultiplier = weapon.system?.critMultiplier || 2;

  if (!actor || !weapon) return defaultMultiplier;

  const ctx = new ResolutionContext(actor);
  const multRules = ctx.getRuleInstances(RULES.MODIFY_CRITICAL_MULTIPLIER);

  let highestMultiplier = defaultMultiplier;
  const weaponProf = weapon.system?.proficiency;

  for (const rule of multRules) {
    if (rule.proficiency === weaponProf && rule.multiplier) {
      // Take the highest multiplier if multiple rules apply
      highestMultiplier = Math.max(highestMultiplier, rule.multiplier);
    }
  }

  return highestMultiplier;
}

/**
 * Get critical confirmation bonus from CRITICAL_CONFIRM_BONUS rules
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon being used
 * @returns {number} Total confirmation bonus
 */
export function getCriticalConfirmBonus(actor, weapon) {
  if (!actor || !weapon) return 0;

  const ctx = new ResolutionContext(actor);
  const confirmRules = ctx.getRuleInstances(RULES.CRITICAL_CONFIRM_BONUS);

  let bonus = 0;
  const weaponProf = weapon.system?.proficiency;

  for (const rule of confirmRules) {
    if (rule.proficiency === weaponProf && rule.bonus) {
      bonus += rule.bonus || 0;
    }
  }

  return bonus;
}

/* -------------------------------------------------------------------------- */
/* DAMAGE BONUS CALCULATION                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Determine if a weapon is a melee weapon
 * @param {Item} weapon - The weapon item
 * @returns {boolean}
 */
export function isMeleeWeapon(weapon) {
  const range = (weapon.system?.range || '').toLowerCase();
  return range === 'melee' || range === '';
}

/**
 * Determine if a weapon is a light weapon (smaller than character size)
 * Light weapons do NOT get 2x STR bonus when used two-handed
 * @param {Item} weapon - The weapon item
 * @param {Actor} actor - The actor wielding the weapon
 * @returns {boolean}
 */
export function isLightWeapon(weapon, actor) {
  // Check explicit light weapon flag
  if (weapon.system?.isLight === true) {return true;}

  // Check weapon size vs actor size
  const weaponSize = (weapon.system?.size || '').toLowerCase();
  const actorSize = (actor.system?.size || 'medium').toLowerCase();

  const sizeOrder = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
  const actorSizeIndex = sizeOrder.indexOf(actorSize);
  const weaponSizeIndex = sizeOrder.indexOf(weaponSize);

  // Weapon is light if it's smaller than character size
  if (weaponSizeIndex !== -1 && actorSizeIndex !== -1) {
    return weaponSizeIndex < actorSizeIndex;
  }

  // Check name for common light weapons
  const name = (weapon.name || '').toLowerCase();
  const lightWeapons = [
    'knife', 'dagger', 'vibrodagger', 'shiv', 'stiletto',
    'hold-out', 'holdout', 'derringer', 'pocket pistol'
  ];
  return lightWeapons.some(lw => name.includes(lw));
}

/**
 * Determine if a weapon should be wielded two-handed
 * @param {Item} weapon - The weapon item
 * @param {Actor} actor - The actor wielding the weapon
 * @returns {boolean}
 */
export function isTwoHandedWeapon(weapon, actor) {
  // Check explicit flag
  if (weapon.system?.twoHanded === true) {return true;}
  if (weapon.system?.hands === 2) {return true;}

  // Check weapon category/type
  const category = (weapon.system?.category || weapon.system?.subcategory || '').toLowerCase();
  const name = (weapon.name || '').toLowerCase();

  // Two-handed weapon categories
  const twoHandedCategories = [
    'two-handed', 'twohanded', '2h', '2-handed',
    'heavy', 'rifle', 'carbine', 'repeating',
    'quarterstaff', 'staff', 'pike', 'polearm', 'spear',
    'electrostaff', 'force pike', 'vibro-ax', 'vibroax',
    'double-bladed', 'double bladed'
  ];

  if (twoHandedCategories.some(cat => category.includes(cat) || name.includes(cat))) {
    return true;
  }

  // Check weapon size - weapons larger than character size require two hands
  const weaponSize = (weapon.system?.size || '').toLowerCase();
  const actorSize = (actor.system?.size || 'medium').toLowerCase();

  const sizeOrder = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
  const actorSizeIndex = sizeOrder.indexOf(actorSize);
  const weaponSizeIndex = sizeOrder.indexOf(weaponSize);

  // Weapons one size larger than character require two hands
  if (weaponSizeIndex !== -1 && actorSizeIndex !== -1) {
    return weaponSizeIndex > actorSizeIndex;
  }

  return false;
}

/**
 * Check if actor has a talent that allows DEX for melee damage
 * @param {Actor} actor - The actor
 * @returns {boolean}
 */
export function hasDexToDamageTalent(actor) {
  // Common talents that allow DEX for damage
  const dexDamageTalents = [
    'weapon finesse',
    'dexterous damage',
    'precise strike',
    'melee finesse'
  ];

  for (const item of actor.items) {
    if (item.type !== 'talent' && item.type !== 'feat') {continue;}
    const name = (item.name || '').toLowerCase();
    if (dexDamageTalents.some(t => name.includes(t))) {
      return true;
    }
  }

  return false;
}

/**
 * Compute SWSE RAW damage bonus.
 * - Half level
 * - Ability-based (STR or DEX)
 * - Two-handed melee weapons add 2x STR (not light weapons)
 * - Talents may allow DEX for melee damage
 *
 * @param {Actor} actor - The actor
 * @param {Item} weapon - The weapon
 * @param {Object} [options] - Options
 * @param {boolean} [options.forceTwoHanded] - Force two-handed calculation
 * @returns {number}
 */
export function computeDamageBonus(actor, weapon, options = {}) {
  const halfLvl = getEffectiveHalfLevel(actor);
  let bonus = halfLvl + (weapon.system?.attackBonus ?? 0);

  // Species combat bonuses (from SpeciesTraitEngine)
  const speciesCombat = actor.system?.speciesCombatBonuses || actor.system?.speciesTraitBonuses?.combat || {};
  const isRangedWeapon = !!weapon.system?.ranged;
  const speciesDamageBonus = (isRangedWeapon ? (speciesCombat.rangedDamage || 0) : (speciesCombat.meleeDamage || 0));
  bonus += speciesDamageBonus;

  const strMod = actor.system.attributes?.str?.mod ?? 0;
  const dexMod = actor.system.attributes?.dex?.mod ?? 0;

  // Check for explicit attack attribute setting
  const attackAttr = weapon.system?.attackAttribute;

  if (attackAttr) {
    // Use explicit attribute setting
    switch (attackAttr) {
      case 'str': bonus += strMod; break;
      case 'dex': bonus += dexMod; break;
      case '2str': bonus += strMod * 2; break;
      case '2dex': bonus += dexMod * 2; break;
    }
  } else {
    // Auto-detect based on weapon type
    const isMelee = isMeleeWeapon(weapon);
    const isLight = isLightWeapon(weapon, actor);
    const isTwoHanded = options.forceTwoHanded || isTwoHandedWeapon(weapon, actor);
    const hasDexDamage = hasDexToDamageTalent(actor);

    if (isMelee) {
      // Melee weapons
      if (hasDexDamage && dexMod > strMod) {
        // Use DEX if talent allows and DEX is higher
        if (isTwoHanded && !isLight) {
          bonus += (dexMod * 2);
        } else {
          bonus += dexMod;
        }
      } else {
        // Use STR
        if (isTwoHanded && !isLight) {
          // Two-handed melee: 2x STR (not for light weapons)
          bonus += (strMod * 2);
        } else {
          bonus += strMod;
        }
      }
    }
    // Ranged weapons: no ability mod to damage in RAW SWSE
  }

  return bonus;
}

/* -------------------------------------------------------------------------- */
/* COVER / CONCEALMENT / FLANKING                                               */
/* -------------------------------------------------------------------------- */

/**
 * RAW cover bonuses to Reflex.
 * @param {string} type - "none", "partial", "cover", "improved"
 */
export function getCoverBonus(type) {
  const table = {
    none: 0,
    partial: 2,
    cover: 5,
    improved: 10
  };
  return table[type] ?? 0;
}

/**
 * Concealment miss chances.
 * @param {string} type - "none", "partial", "total"
 */
export function getConcealmentMissChance(type) {
  const table = {
    none: 0,
    partial: 20,
    concealment: 20,
    total: 50
  };
  return table[type] ?? 0;
}

/**
 * Check concealment outcome.
 * @param {number} missChance - percentage
 * @returns {boolean} true = hit; false = miss
 */
export function checkConcealmentHit(missChance) {
  const roll = Math.floor(Math.random() * 100) + 1;
  return roll > missChance;
}

/**
 * RAW flanking bonus.
 */
export function getFlankingBonus(isFlanking) {
  return isFlanking ? 2 : 0;
}

/* -------------------------------------------------------------------------- */
/* SIZE MODIFIERS (Optional but recommended)                                    */
/* -------------------------------------------------------------------------- */

/**
 * SWSE uses opposed size mods for certain attacks.
 * You can integrate your size system here.
 */
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
/* ACTIVE EFFECT HELPERS                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Extracts an Active Effect modification for a given path.
 * Used by damage, attack, defense calculations.
 */
export function getEffectModifier(actor, key) {
  let total = 0;

  for (const effect of actor.effects ?? []) {
    if (effect.disabled) {continue;}

    for (const [path, update] of Object.entries(effect.updates ?? {})) {
      if (path !== key) {continue;}

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
/* COMPLETE ATTACK RESOLUTION (OPTIONAL FUTURE USE)                             */
/* -------------------------------------------------------------------------- */

/**
 * Run attack resolution after the attack roll.
 * This is optional & future-ready—SWSERoll doesn't use it yet,
 * but your Hit Engine can plug into this.
 */
export function resolveAttackAgainstTarget(attackRoll, target, options = {}) {
  const ref = target.system.defenses?.reflex?.total ?? 10;
  const cover = getCoverBonus(options.coverType ?? 'none');

  const finalRef = ref + cover;

  return {
    hit: attackRoll.total >= finalRef,
    reflex: finalRef
  };
}
