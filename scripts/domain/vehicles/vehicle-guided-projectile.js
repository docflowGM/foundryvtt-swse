/**
 * Guided missiles and torpedoes (Core Rulebook, Vehicle Combat, Missiles and Torpedoes; PUBLISHED_RULE):
 *   "If you aim before making an attack with a missile or torpedo, it locks on to the target and can track its target
 *    independently. Make your attack roll normally, but if you miss, the missile or torpedo can attempt to attack again on your
 *    next turn. This next attack is made using the same attack bonus, but with a -5 penalty. (You do not need to spend an action to
 *    make this attack.) If the missile or torpedo misses its target a second time, it self-destructs harmlessly."
 *   "A missile or torpedo has a Reflex Defense of 30 and 10 hit points, and it is considered to occupy the same square as its target
 *    for purposes of determining range penalties. It is also possible to attack a missile or torpedo prior to its first [return
 *    attack], but you must have readied an action specifically for this purpose."
 *
 * A projectile is created by a LAUNCH that was aimed and MISSED. It is the same projectile all along: its follow-up attack is not a
 * second launch (no ammunition), not a new action, keeps its target, and happens at most once. Pure of Foundry globals.
 */
export const PROJECTILE = Object.freeze({ reflexDefense: 30, hitPoints: 10, followUpPenalty: -5 });
export const PROJECTILE_FLAG = 'guidedProjectiles';

export const PROJECTILE_STATE = Object.freeze({ AWAITING: 'awaiting-follow-up', HIT: 'hit', SELF_DESTRUCTED: 'self-destructed', SHOT_DOWN: 'shot-down' });

export const PROJECTILE_REASONS = Object.freeze({
  NOT_AWAITING: 'PROJECTILE_NOT_AWAITING_ITS_FOLLOW_UP',
  NOT_DUE: 'PROJECTILE_FOLLOW_UP_NOT_DUE',
  WRONG_LAUNCHER: 'PROJECTILE_BELONGS_TO_ANOTHER_LAUNCHER',
  WRONG_TARGET: 'PROJECTILE_FOLLOW_UP_MUST_KEEP_ITS_TARGET',
  UNKNOWN: 'PROJECTILE_UNKNOWN'
});

/** Aimed + a guided launcher + a miss. A natural 1 is a miss too (the roll did not hit). */
export const shouldCreateProjectile = ({ guided, aimed, hit }) => guided === true && aimed === true && hit === false;

export function createProjectile({ projectileId, launcherItemId, vehicleId, targetId, attackBonus, attackId, combat = null, now = Date.now() }) {
  return { id: projectileId, state: PROJECTILE_STATE.AWAITING, launcherItemId, vehicleId, targetId, attackBonus, launchAttackId: attackId,
    hp: PROJECTILE.hitPoints, hpMax: PROJECTILE.hitPoints, reflexDefense: PROJECTILE.reflexDefense,
    createdRound: combat?.round ?? null, createdCombatId: combat?.id ?? null, createdAt: now, followUpAttackedAt: null };
}

/** Can this projectile make its follow-up attack now, against this target, from this launcher? (No dice, no cost.) */
export function planFollowUp(record, { launcherItemId, targetId, combat = null } = {}) {
  if (!record) return { ok: false, reason: PROJECTILE_REASONS.UNKNOWN };
  if (record.state !== PROJECTILE_STATE.AWAITING || record.followUpAttackedAt) return { ok: false, reason: PROJECTILE_REASONS.NOT_AWAITING };
  if (launcherItemId !== record.launcherItemId) return { ok: false, reason: PROJECTILE_REASONS.WRONG_LAUNCHER };
  if (targetId !== record.targetId) return { ok: false, reason: PROJECTILE_REASONS.WRONG_TARGET };
  // "on your next turn": in a combat the attacker's next turn is a LATER ROUND; outside a combat there is no turn structure
  if (record.createdRound !== null && combat?.round !== undefined && combat?.round !== null && combat.id === record.createdCombatId && !(combat.round > record.createdRound))
    return { ok: false, reason: PROJECTILE_REASONS.NOT_DUE };
  return { ok: true, attackBonus: record.attackBonus + PROJECTILE.followUpPenalty, penalty: PROJECTILE.followUpPenalty, baseBonus: record.attackBonus };
}

/** The follow-up attack resolved: a hit ends the projectile's attack; a second miss self-destructs it. Exactly one attempt. */
export function resolveFollowUp(record, { hit, now = Date.now() }) {
  return { ...record, followUpAttackedAt: now, state: hit === true ? PROJECTILE_STATE.HIT : PROJECTILE_STATE.SELF_DESTRUCTED };
}

/**
 * Someone attacks the projectile BEFORE its return attack (Reflex Defense 30, 10 hit points; a readied action is the caller's cost).
 * A hit deals its damage to the projectile; at 0 hit points it is shot down and never attacks again.
 */
export function interceptProjectile(record, { attackTotal, damage = 0 }) {
  if (!record || record.state !== PROJECTILE_STATE.AWAITING) return { ok: false, reason: PROJECTILE_REASONS.NOT_AWAITING };
  if (!Number.isFinite(attackTotal)) return { ok: false, reason: 'PROJECTILE_INVALID_INPUT' };
  const hit = attackTotal >= record.reflexDefense;
  if (!hit) return { ok: true, hit: false, record };
  const hp = Math.max(0, record.hp - Math.max(0, Math.floor(damage)));
  return { ok: true, hit: true, record: { ...record, hp, state: hp <= 0 ? PROJECTILE_STATE.SHOT_DOWN : record.state } };
}
