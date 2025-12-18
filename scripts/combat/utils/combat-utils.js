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
  const level = actor.system.level ?? 1;
  const halfLvl = Math.floor(level / 2);

  const bab = actor.system.bab ?? 0;

  // Ability mod used for attack
  const attr = weapon.system?.attackAttribute ?? "str";
  const abilityMod = actor.system.abilities[attr]?.mod ?? 0;

  // Weapon-based bonuses
  const misc = weapon.system?.attackBonus ?? 0;
  const focusBonus = weapon.system?.focus ? 1 : 0;

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
    focusBonus +
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
 * Compute SWSE RAW damage bonus.
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {number}
 */
export function computeDamageBonus(actor, weapon) {
  const lvl = actor.system.level ?? 1;
  const halfLvl = Math.floor(lvl / 2);

  let bonus = halfLvl + (weapon.system?.modifier ?? 0);

  const str = actor.system.abilities.str?.mod ?? 0;
  const dex = actor.system.abilities.dex?.mod ?? 0;

  switch (weapon.system?.damageAttr) {
    case "str": bonus += str; break;
    case "dex": bonus += dex; break;
    case "2str": bonus += str * 2; break;
    case "2dex": bonus += dex * 2; break;
  }

  // Weapon Specialization (RAW: +2)
  if (weapon.system?.specialization) bonus += 2;

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
    if (effect.disabled) continue;

    for (const [path, update] of Object.entries(effect.updates ?? {})) {
      if (path !== key) continue;

      const value = Number(update.value ?? 0);

      switch (update.mode) {
        case "ADD": total += value; break;
        case "MULTIPLY": total *= value; break;
        case "OVERRIDE": total = value; break;
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
  const cover = getCoverBonus(options.coverType ?? "none");

  const finalRef = ref + cover;

  return {
    hit: attackRoll.total >= finalRef,
    reflex: finalRef
  };
}
