/**
 * Pure verification of an incoming attack event (no imports, so ForcePointsService can
 * use it without a cycle). Authority is the attacker-side record; every argument that
 * came from a chat dataset is only a lookup key.
 */
export const REACTION_ATTACK_TYPE = Object.freeze({ block: 'melee', deflect: 'ranged' });

export function combatKey(combat = globalThis.game?.combat) {
  return combat?.started ? { combatId: combat.id ?? null, round: combat.round ?? null, turn: combat.turn ?? null } : { combatId: null, round: null, turn: null };
}

/**
 * @param allowConsumed true only when the caller IS the reaction that claimed the event
 *   (the FP spend inside the reaction): the event must still be pending on the attacker side.
 */
export function verifyAttackEventRecord({ defender, attackerId, eventId, reactionKey, user = globalThis.game?.user, allowConsumed = false } = {}) {
  const fail = (message) => ({ valid: false, event: null, message });
  if (!defender?.id || !eventId || !attackerId) return fail('A verified incoming attack event is required');
  if (user?.isGM !== true && defender.isOwner !== true) return fail('You do not control this defender');
  const attacker = globalThis.game?.actors?.get?.(attackerId);
  const record = attacker?.getFlag?.('swse', 'outgoingAttackEvents') ?? attacker?.flags?.swse?.outgoingAttackEvents;
  const event = Array.isArray(record?.events) ? record.events.find(e => e.id === eventId) : null;
  if (!event) return fail('Unknown attack event');
  if (event.attackerId !== attacker.id || event.defenderId !== defender.id) return fail('Attack event does not target this defender');
  if (event.state !== 'pending') return fail(`Attack event is ${event.state}`);
  if (!allowConsumed) {
    const consumed = defender.getFlag?.('swse', 'consumedAttackEvents') ?? defender.flags?.swse?.consumedAttackEvents;
    if (Array.isArray(consumed?.ids) && consumed.ids.includes(eventId)) return fail('Attack event already consumed');
  }
  const wanted = REACTION_ATTACK_TYPE[String(reactionKey ?? '').toLowerCase()];
  if (wanted && event.attackType !== wanted) return fail(`${reactionKey} answers ${wanted} attacks, not ${event.attackType}`);
  const now = combatKey();
  if (event.combatId && (now.combatId !== event.combatId || now.round !== event.round)) return fail('Attack event has expired');
  return { valid: true, event, message: 'Verified' };
}
