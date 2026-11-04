/**
 * Weapon batteries (Core Rulebook, Vehicles, p. 170; rule text verified by the project owner, 2026-11-03).
 *
 * This module is the ONE statement of the battery arithmetic. It is pure (no Foundry globals) and is read by the stock
 * weapon gate (vehicle-stock-weapon-groups.js), the vehicle attack math and the vehicle damage authority. It decides no
 * rule: every constant below is the owner-verified text, and anything the text does not settle is refused by name.
 *
 * Verified text, paraphrased:
 *   - A battery is up to SIX identical weapons fired as one attack.
 *   - One gunner makes the attack roll. The first assisting gunner gives +2 automatically (no roll); each additional
 *     assisting gunner gives another +2  (2 gunners +2, 3 gunners +4, 4 gunners +6, 6 gunners +10).
 *   - For every 3 points by which the attack roll exceeds the target's Reflex Defense, another weapon of the battery hits.
 *     Each such weapon adds ONE weapon damage die BEFORE the damage multiplier: base 5d10x5 with 2 extra hits is
 *     (5d10 + 2d10) x 5. Extra hits can never exceed the identical weapons actually participating.
 *   - A battery may assist another battery: the assisting gunner makes an attack against Reflex Defense 10; on a success the
 *     assisted battery gains +2 per two weapons in the assisting battery. Assisting weapons generate no margin hits.
 *
 * Published statblock totals for GENERIC crews already contain the assistance of the printed gunners. A caller must never
 * add a published modifier on top of a player's independently calculated total, nor add assistance a second time.
 *
 * Two execution modes exist, never conflated: FULL-BATTERY (assistance + margin hits; needs the printed weapon count) and
 * INDEPENDENT-WEAPON (one weapon, no assistance, no margin hits; needs only the printed gunner count). Fire-linked weapons
 * that a statblock loosely calls "batteries" are NOT weapon batteries in game terms (Starships of the Galaxy, Fire-Linked
 * Weapons) and are never routed here.
 */
export const BATTERY_MAX_WEAPONS = 6;
export const BATTERY_ASSIST_PER_ADDITIONAL_GUNNER = 2;
export const BATTERY_MARGIN_STEP = 3;
export const BATTERY_AID_DEFENSE = 10;
export const BATTERY_AID_BONUS_PER_TWO_WEAPONS = 2;

const isInt = n => Number.isInteger(n);

/** Named refusal reasons (stable ids; used by the stock gate, the attack gate and the reports). */
export const BATTERY_REASONS = Object.freeze({
  GUNNERS_OUT_OF_RANGE: 'BATTERY_GUNNER_COUNT_OUT_OF_RANGE',
  WEAPONS_OUT_OF_RANGE: 'BATTERY_WEAPON_COUNT_OUT_OF_RANGE',
  WEAPON_COUNT_NOT_STATED: 'BATTERY_WEAPON_COUNT_NOT_STATED',
  ASSIGNED_CREW_ROSTER_UNMODELED: 'BATTERY_ASSIGNED_CREW_ROSTER_UNMODELED',
  EXTRA_HITS_EXCEED_PARTICIPATING_WEAPONS: 'BATTERY_EXTRA_HITS_EXCEED_PARTICIPATING_WEAPONS',
  EXTRA_HITS_ON_A_NON_BATTERY: 'BATTERY_EXTRA_HITS_ON_A_NON_BATTERY',
  INVALID_INPUT: 'BATTERY_INVALID_INPUT'
});

const fail = reason => ({ ok: false, reason });

/** Assisting-gunner bonus for a battery crewed by `gunners` gunners in total (the attacker counts as the first). */
export function batteryAssistanceBonus(gunners) {
  if (!isInt(gunners) || gunners < 1 || gunners > BATTERY_MAX_WEAPONS) return fail(BATTERY_REASONS.GUNNERS_OUT_OF_RANGE);
  const assisting = gunners - 1;
  return { ok: true, gunners, assistingGunners: assisting, bonus: assisting * BATTERY_ASSIST_PER_ADDITIONAL_GUNNER };
}

/**
 * Extra weapon hits from the attack margin. Only an attack that hit can produce them; a hit that did not reach the defense
 * (a natural 20) has margin <= 0 and produces none.
 */
export function batteryMarginHits({ attackTotal, targetDefense, hit, participatingWeapons } = {}) {
  if (!isInt(participatingWeapons) || participatingWeapons < 1 || participatingWeapons > BATTERY_MAX_WEAPONS) return fail(BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  if (!Number.isFinite(attackTotal) || !Number.isFinite(targetDefense) || typeof hit !== 'boolean') return fail(BATTERY_REASONS.INVALID_INPUT);
  const cap = participatingWeapons - 1;
  if (!hit) return { ok: true, extraHits: 0, margin: attackTotal - targetDefense, uncapped: 0, cap };
  const margin = attackTotal - targetDefense;
  const uncapped = margin > 0 ? Math.floor(margin / BATTERY_MARGIN_STEP) : 0;
  return { ok: true, extraHits: Math.min(uncapped, cap), margin, uncapped, cap };
}

/**
 * Damage dice of a battery attack: one extra weapon die per extra hit, added to the dice BEFORE the multiplier.
 * @param {{dice:number, die:number, multiplier?:number}} base printed per-weapon damage
 */
export function expandBatteryDamage(base, extraHits, participatingWeapons) {
  if (!base || !isInt(base.dice) || base.dice < 1 || !isInt(base.die) || base.die < 2) return fail(BATTERY_REASONS.INVALID_INPUT);
  if (!isInt(extraHits) || extraHits < 0) return fail(BATTERY_REASONS.INVALID_INPUT);
  if (!isInt(participatingWeapons) || participatingWeapons < 1 || participatingWeapons > BATTERY_MAX_WEAPONS) return fail(BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  if (extraHits > participatingWeapons - 1) return fail(BATTERY_REASONS.EXTRA_HITS_EXCEED_PARTICIPATING_WEAPONS);
  const dice = base.dice + extraHits;
  const multiplier = Number.isInteger(base.multiplier) && base.multiplier > 1 ? base.multiplier : 1;
  return { ok: true, dice, die: base.die, formula: `${dice}d${base.die}`, multiplier, extraDice: extraHits };
}

/** A battery assisting another battery: attack vs Reflex 10; success gives the assisted battery +2 per two weapons. */
export function batteryAidsBattery({ attackTotal, assistingWeapons, hit } = {}) {
  if (!isInt(assistingWeapons) || assistingWeapons < 1 || assistingWeapons > BATTERY_MAX_WEAPONS) return fail(BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  if (!Number.isFinite(attackTotal)) return fail(BATTERY_REASONS.INVALID_INPUT);
  // the caller may pass the resolved attack outcome (a natural 1 always misses, a natural 20 always hits); otherwise total >= 10
  const succeeded = typeof hit === 'boolean' ? hit : attackTotal >= BATTERY_AID_DEFENSE;
  return { ok: true, succeeded, defense: BATTERY_AID_DEFENSE, bonus: succeeded ? BATTERY_AID_BONUS_PER_TWO_WEAPONS * Math.floor(assistingWeapons / 2) : 0, marginHits: 0 };
}

/**
 * The attack total of one battery attack, by who is crewing it.
 *   published   the statblock's generic crew: the printed total ALREADY contains the printed gunners' assistance; it is
 *               applied once and its assistance is shown as included, never added again;
 *   assigned    named gunners: the primary gunner's own total (Base Attack, vehicle Intelligence modifier, effects) plus
 *               the assistance of the gunners actually assisting; the printed total is not used;
 *   independent a single weapon of the battery firing on its own with no battery assistance (printed total with the
 *               assistance of the printed gunners removed); it never produces margin hits.
 */
export function resolveBatteryAttackTotal({ crew, publishedTotal, printedGunners, primaryTotal, assistingGunners } = {}) {
  if (crew === 'published' || crew === 'independent') {
    if (!Number.isFinite(publishedTotal)) return fail(BATTERY_REASONS.INVALID_INPUT);
    const a = batteryAssistanceBonus(printedGunners);
    if (!a.ok) return a;
    if (crew === 'published') return { ok: true, crew, total: publishedTotal, includedAssistance: a.bonus, singleGunnerTotal: publishedTotal - a.bonus, appliedAssistance: 0, marginHitsPossible: true };
    return { ok: true, crew, total: publishedTotal - a.bonus, includedAssistance: 0, singleGunnerTotal: publishedTotal - a.bonus, appliedAssistance: 0, marginHitsPossible: false };
  }
  if (crew === 'assigned') {
    if (!Number.isFinite(primaryTotal) || !isInt(assistingGunners) || assistingGunners < 0) return fail(BATTERY_REASONS.INVALID_INPUT);
    const a = batteryAssistanceBonus(assistingGunners + 1);
    if (!a.ok) return a;
    return { ok: true, crew, total: primaryTotal + a.bonus, includedAssistance: 0, singleGunnerTotal: primaryTotal, appliedAssistance: a.bonus, marginHitsPossible: true };
  }
  return fail(BATTERY_REASONS.INVALID_INPUT);
}

/**
 * The weapon quantities of a battery, kept apart (owner direction V-P6C-02): the identical weapons it HAS, the ones still
 * AVAILABLE (not destroyed, disabled or removed) and the ones PARTICIPATING in this attack. The gunner count is a different
 * quantity and does not constrain them: Core p. 170 says only that a battery is up to six identical weapons.
 * @returns {{ok:true, totalWeapons:number, availableWeapons:number, participatingWeapons:number, maxExtraHits:number}|{ok:false, reason:string}}
 */
export function resolveBatteryWeapons({ totalWeapons, availableWeapons = totalWeapons, participatingWeapons = availableWeapons } = {}) {
  const ok = n => isInt(n) && n >= 1 && n <= BATTERY_MAX_WEAPONS;
  if (!ok(totalWeapons) || !ok(availableWeapons) || !ok(participatingWeapons)) return fail(BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  if (participatingWeapons > availableWeapons || availableWeapons > totalWeapons) return fail(BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  return { ok: true, totalWeapons, availableWeapons, participatingWeapons, maxExtraHits: participatingWeapons - 1 };
}

/**
 * FULL-BATTERY mode of a published battery: needs the printed gunner count (for the assistance contained in the printed total)
 * AND the printed number of identical weapons (the cap on margin hits). The two are independent quantities: there is no
 * requirement that they be equal, and neither is ever inferred from the other (the source may print only the gunners).
 * @param {{gunners:number|null, weaponCount:number|null}} facts
 */
export function establishPublishedBattery(facts = {}) {
  const { gunners, weaponCount } = facts;
  if (!isInt(gunners) || gunners < 2 || gunners > BATTERY_MAX_WEAPONS) return fail(BATTERY_REASONS.GUNNERS_OUT_OF_RANGE);
  if (weaponCount === null || weaponCount === undefined) return fail(BATTERY_REASONS.WEAPON_COUNT_NOT_STATED);
  const w = resolveBatteryWeapons({ totalWeapons: weaponCount });
  if (!w.ok) return w;
  return { ok: true, mode: 'full-battery', gunners, weaponCount, availableWeapons: w.availableWeapons, participatingWeapons: w.participatingWeapons, maxExtraHits: w.maxExtraHits };
}

/**
 * INDEPENDENT-WEAPON mode (Core p. 170: a battery's weapons may fire independently, without battery assistance): ONE weapon
 * of the battery attacks on its own. It needs no weapon count -- a printed battery proves the weapons exist, not how many --
 * only the printed gunner count, so that the assistance contained in the printed total can be removed exactly. It never
 * produces margin hits and is never full-battery execution.
 * @param {{gunners:number|null}} facts
 */
export function establishIndependentBatteryWeapon(facts = {}) {
  const a = batteryAssistanceBonus(facts.gunners);
  if (!a.ok || facts.gunners < 2) return fail(BATTERY_REASONS.GUNNERS_OUT_OF_RANGE);
  return { ok: true, mode: 'independent-weapon', gunners: facts.gunners, removedAssistance: a.bonus, participatingWeapons: 1, maxExtraHits: 0 };
}
