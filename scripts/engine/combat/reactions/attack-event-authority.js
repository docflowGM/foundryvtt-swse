/**
 * AttackEventAuthority — the one place that mints and verifies the incoming
 * attack events Block/Deflect consume (03B, FP-RD-001).
 *
 * Produced by the canonical attack resolution (combat/rolls/attacks.js) AFTER a
 * real roll outcome exists. Chat-button dataset values (event id, DC, total) are
 * only LOOKUP KEYS: authority is the attacker-side record, re-read at reaction
 * time. A manually typed DC never produces an event.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const REACTION_ATTACK_TYPE = Object.freeze({ block: 'melee', deflect: 'ranged' });

function combatKey() {
  const combat = globalThis.game?.combat;
  return combat?.started ? { combatId: combat.id ?? null, round: combat.round ?? null, turn: combat.turn ?? null } : { combatId: null, round: null, turn: null };
}

export class AttackEventAuthority {
  /** Mint a pending event for one attack against one defender. Returns null (fail closed) if it cannot be recorded. */
  static async produce({ attacker, defender, weapon = null, attackType, damageTypes = [], attackTotal, naturalD20 = null, hit = null, rollId = null } = {}) {
    if (!attacker?.id || !defender?.id || !['melee', 'ranged'].includes(attackType) || !Number.isFinite(Number(attackTotal))) return null;
    const id = globalThis.foundry?.utils?.randomID?.() ?? globalThis.crypto?.randomUUID?.();
    if (!id) return null;
    try {
      return await ActorEngine.recordOutgoingAttackEvent(attacker, {
        id: `atk-${id}`, attackerId: attacker.id, defenderId: defender.id,
        weaponId: weapon?.id ?? null, weaponName: weapon?.name ?? null,
        attackType, damageTypes: Array.isArray(damageTypes) ? damageTypes : [],
        attackTotal: Number(attackTotal), naturalD20, hit, rollId,
        ...combatKey(), createdAt: Date.now()
      });
    } catch (error) {
      console.error('SWSE | attack event could not be recorded; reactions stay manual', error);
      return null;
    }
  }

  /** A reroll or cancellation invalidates the original event. */
  static async supersede(attacker, eventId, reason = 'rerolled') {
    return ActorEngine.setOutgoingAttackEventState(attacker, eventId, reason === 'cancelled' ? 'cancelled' : 'superseded', { endedReason: reason });
  }

  /**
   * Verify an event for a reaction. Returns { valid, event, message }.
   * eventId / attackerId arrive from untrusted button datasets and are only lookup keys.
   */
  static verify({ defender, attackerId, eventId, reactionKey, user = globalThis.game?.user } = {}) {
    const fail = (message) => ({ valid: false, event: null, message });
    if (!defender?.id || !eventId || !attackerId) return fail('A verified incoming attack event is required');
    if (user?.isGM !== true && defender.isOwner !== true) return fail('You do not control this defender');
    const attacker = globalThis.game?.actors?.get?.(attackerId);
    const record = attacker?.getFlag?.('swse', 'outgoingAttackEvents') ?? attacker?.flags?.swse?.outgoingAttackEvents;
    const event = Array.isArray(record?.events) ? record.events.find(e => e.id === eventId) : null;
    if (!event) return fail('Unknown attack event');
    if (event.attackerId !== attacker.id || event.defenderId !== defender.id) return fail('Attack event does not target this defender');
    if (event.state !== 'pending') return fail(`Attack event is ${event.state}`);
    const consumed = defender.getFlag?.('swse', 'consumedAttackEvents') ?? defender.flags?.swse?.consumedAttackEvents;
    if (Array.isArray(consumed?.ids) && consumed.ids.includes(eventId)) return fail('Attack event already consumed');
    const wanted = REACTION_ATTACK_TYPE[String(reactionKey ?? '').toLowerCase()];
    if (wanted && event.attackType !== wanted) return fail(`${reactionKey} answers ${wanted} attacks, not ${event.attackType}`);
    const now = combatKey();
    if (event.combatId && (now.combatId !== event.combatId || now.round !== event.round)) return fail('Attack event has expired');
    return { valid: true, event, message: 'Verified' };
  }

  static async consume(defender, eventId) {
    return ActorEngine.consumeAttackEventAsDefender(defender, eventId);
  }
}
