import { swseLogger } from "../../utils/logger.js";
import { TalentAbilitiesEngine } from "../../engine/TalentAbilitiesEngine.js";

/**
 * Determine if a weapon is a melee weapon
 * @param {Item} weapon - The weapon item
 * @returns {boolean}
 */
function isMeleeWeapon(weapon) {
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
function isLightWeapon(weapon, actor) {
  // Check explicit light weapon flag
  if (weapon.system?.isLight === true) return true;

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
function isTwoHandedWeapon(weapon, actor) {
  // Check explicit flag
  if (weapon.system?.twoHanded === true) return true;
  if (weapon.system?.hands === 2) return true;

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
function hasDexToDamageTalent(actor) {
  // Common talents that allow DEX for damage
  const dexDamageTalents = [
    'weapon finesse',
    'dexterous damage',
    'precise strike',
    'melee finesse'
  ];

  for (const item of actor.items) {
    if (item.type !== 'talent' && item.type !== 'feat') continue;
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
 * - Weapon modifier
 * - Weapon Specialization (+2)
 * - Future Active Effects can adjust final bonus
 *
 * @param {Actor} actor - The actor
 * @param {Item} weapon - The weapon
 * @param {Object} [options] - Options
 * @param {boolean} [options.forceTwoHanded] - Force two-handed calculation
 * @returns {number}
 */
function computeDamageBonus(actor, weapon, options = {}) {
  const lvl = actor.system.level ?? 1;
  const halfLvl = Math.floor(lvl / 2);

  let bonus = halfLvl + (weapon.system?.attackBonus ?? 0);

  // Ability modifiers
  const strMod = actor.system.abilities?.str?.mod ?? 0;
  const dexMod = actor.system.abilities?.dex?.mod ?? 0;

  // Check for explicit attack attribute setting
  const attackAttr = weapon.system?.attackAttribute;

  if (attackAttr) {
    // Use explicit attribute setting
    switch (attackAttr) {
      case "str": bonus += strMod; break;
      case "dex": bonus += dexMod; break;
      case "2str": bonus += (strMod * 2); break;
      case "2dex": bonus += (dexMod * 2); break;
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
    } else {
      // Ranged weapons - typically no ability mod to damage
      // Some systems add DEX, but RAW SWSE doesn't
      // We'll default to no ability mod unless set explicitly
    }
  }

  return bonus;
}

/**
 * Compute talent-based damage bonuses (Sneak Attack, Skirmisher, etc.)
 * @param {Actor} actor - The attacking actor
 * @param {Object} context - Attack context {target, weapon, isCritical, aimedThisTurn}
 * @returns {Object} {formula: string, breakdown: Array}
 */
function computeTalentDamageBonus(actor, context = {}) {
  try {
    return TalentAbilitiesEngine.calculateDamageBonus(actor, context);
  } catch (err) {
    swseLogger.warn("Failed to calculate talent damage bonus:", err);
    return { formula: '', bonusDice: [], flatBonus: 0, breakdown: [], notifications: [] };
  }
}

/**
 * Roll damage for a SWSE weapon/power.
 * Handles:
 *  - Complete SWSE damage math
 *  - Talent-based damage bonuses (Sneak Attack, Skirmisher, etc.)
 *  - Active Effects (Actor.applyDamage handles thresholds)
 *
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon used
 * @param {Object} context - Optional context {target, isCritical, aimedThisTurn}
 */
export async function rollDamage(actor, weapon, context = {}) {
  if (!actor || !weapon) {
    ui.notifications.error("Missing actor or weapon for damage roll.");
    return null;
  }

  const baseFormula = weapon.system?.damage ?? "1d6";
  const dmgBonus = computeDamageBonus(actor, weapon, {
    forceTwoHanded: context.twoHanded || false
  });

  // Calculate talent-based damage bonuses
  const talentContext = { ...context, weapon };
  const talentBonus = computeTalentDamageBonus(actor, talentContext);

  // Build complete formula
  let formulaParts = [baseFormula];
  if (dmgBonus !== 0) {
    formulaParts.push(dmgBonus.toString());
  }
  if (talentBonus.formula) {
    formulaParts.push(talentBonus.formula);
  }
  const formula = formulaParts.join(' + ');

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

  // Build flavor text with breakdown
  let flavor = `${weapon.name} Damage`;
  if (talentBonus.breakdown.length > 0) {
    flavor += ` (${talentBonus.breakdown.join(', ')})`;
  }

  // Show notifications for talent bonuses
  for (const notification of talentBonus.notifications) {
    ui.notifications.info(notification);
  }

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor
  });

  return roll;
}

/**
 * Roll damage with full combat integration.
 * Includes talent damage bonuses and applies post-damage effects.
 *
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon used
 * @param {Actor} target - The target actor (for post-damage effects)
 * @param {Object} context - {isCritical, aimedThisTurn}
 */
export async function rollDamageWithEffects(actor, weapon, target, context = {}) {
  const roll = await rollDamage(actor, weapon, { ...context, target });
  if (!roll) return null;

  // Apply post-damage effects if we have a target
  if (target) {
    const effectContext = {
      ...context,
      weapon,
      target,
      damageDealt: roll.total
    };

    try {
      await TalentAbilitiesEngine.applyPostDamageEffects(actor, target, effectContext);
    } catch (err) {
      swseLogger.warn("Failed to apply post-damage effects:", err);
    }

    // Track last attack target for Skirmisher
    await actor.setFlag('foundryvtt-swse', 'lastAttackTarget', target.id);

    // Mark sneak attack as used this round
    const abilities = TalentAbilitiesEngine.getAbilitiesForActor(actor);
    if (abilities.all.some(a => a.id === 'sneak-attack')) {
      await actor.setFlag('foundryvtt-swse', 'sneakAttackUsedThisRound', true);
    }
  }

  return roll;
}

/**
 * Roll generic damage (powers, hazards, GM tools)
 */
export async function rollDamageGeneric(actor, formula = "1d6", label = "Damage") {
  if (!actor) {
    ui.notifications.warn("No actor available for damage roll.");
    return null;
  }

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${label} (${formula})`
  });

  return roll;
}

/**
 * Apply damage to an Actor via SWSEActorBase.applyDamage().
 * NO DIRECT HP MANIPULATION ANYMORE.
 */
export async function applyDamage(token, amount, options = {}) {
  const actor = token?.actor;

  if (!actor) {
    ui.notifications.warn("No actor found on token.");
    return null;
  }

  if (typeof amount !== "number") {
    ui.notifications.error("Damage amount must be a number.");
    return null;
  }

  try {
    await actor.applyDamage(amount, options); // Uses your new CT + threshold logic
    ui.notifications.info(`${actor.name} takes ${amount} damage!`);
  } catch (err) {
    swseLogger.error(err);
    ui.notifications.error("Failed to apply damage.");
  }

  return actor;
}

/**
 * Roll damage + Apply damage in one step (optional helper)
 */
export async function rollAndApplyDamage(actor, weapon, token) {
  const roll = await rollDamage(actor, weapon);
  if (!roll) return null;

  await applyDamage(token, roll.total);
  return roll;
}
