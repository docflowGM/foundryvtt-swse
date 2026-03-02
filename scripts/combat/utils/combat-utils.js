import { getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
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
 * @param {number} ctStep - Integer 0–5
 * @returns {number} Penalty value
 */
export function getConditionPenalty(ctStep) {
  const penalties = [0, -1, -2, -5, -10, -10];
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
  if (actor?.type === 'npc') {
    const mode = actor.getFlag?.('swse', 'npcLevelUp.mode') ?? 'statblock';
    const npc = weapon?.flags?.swse?.npc;
    if (mode !== 'progression' && npc?.useFlat === true && Number.isFinite(npc.flatAttackBonus)) {
      return Number(npc.flatAttackBonus) || 0;
    }
  }

  const level = actor.system.level ?? 1;
  const halfLvl = getEffectiveHalfLevel(actor);

  const bab = actor.system.bab ?? 0;

  // Ability mod used for attack
  const attr = weapon.system?.attackAttribute ?? 'str';
  const abilityMod = actor.system.attributes[attr]?.mod ?? 0;

  // Weapon-based bonuses
  const misc = weapon.system?.attackBonus ?? 0;

  // Condition Track penalties
  const ctPenalty = actor.system.conditionTrack?.penalty ?? 0;

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
    sizeMod +
    aePenalty +
    ctPenalty +
    proficiencyPenalty
  );
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
