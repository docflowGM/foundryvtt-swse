/**
 * AttackEventAuthority — the one place that mints and verifies the incoming
 * attack events Block/Deflect consume (03B, FP-RD-001).
 *
 * Produced by the canonical attack resolution (combat/rolls/attacks.js) AFTER a
 * real roll outcome exists. Chat-button dataset values (event id, DC, total) are
 * only LOOKUP KEYS: authority is the attacker-side record, re-read at reaction
 * time. A manually typed DC never produces an event.
 */
import { verifyAttackEventRecord, combatKey } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/attack-event-verify.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

function combatKeyLocal() { return combatKey(); }

export class AttackEventAuthority {
  /** Mint a pending event for one attack against one defender. Returns null (fail closed) if it cannot be recorded. */
  static async produce({ attacker, defender, weapon = null, attackType, damageTypes = [], attackTotal, naturalD20 = null, hit = null, critical = null, rollId = null } = {}) {
    if (!attacker?.id || !defender?.id || !['melee', 'ranged'].includes(attackType) || !Number.isFinite(Number(attackTotal))) return null;
    const id = globalThis.foundry?.utils?.randomID?.() ?? globalThis.crypto?.randomUUID?.();
    if (!id) return null;
    try {
      return await ActorEngine.recordOutgoingAttackEvent(attacker, {
        id: `atk-${id}`, attackerId: attacker.id, defenderId: defender.id,
        weaponId: weapon?.id ?? null, weaponName: weapon?.name ?? null,
        attackType, damageTypes: Array.isArray(damageTypes) ? damageTypes : [],
        attackTotal: Number(attackTotal), naturalD20, hit, critical, rollId,
        ...combatKeyLocal(), createdAt: Date.now()
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
  static verify(args = {}) {
    return verifyAttackEventRecord(args);
  }

  static async consume(defender, eventId) {
    return ActorEngine.consumeAttackEventAsDefender(defender, eventId);
  }
}
