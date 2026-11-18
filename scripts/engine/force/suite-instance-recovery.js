/**
 * SuiteInstanceRecovery — the single authority for regaining spent Force Power and starship maneuver
 * INSTANCES (Checkpoint 03C). Sources: Core Rulebook, "Regaining Force Powers" and the official errata
 * (natural 20 on a Force Power's Use the Force activation check); Starships of the Galaxy p.24 (maneuvers,
 * natural 20 on the Pilot activation check).
 *
 * Canonical instance state: an owned item's `system.discarded` (true = spent). One field for both suites.
 * "Regain all" is NEVER unconditional: it needs a proof, and every proof is re-verified here from live state:
 *   - 'natural-20'  the actor's own pending record, at the end of THAT actor's turn (combat hook);
 *   - 'rest'        a GM-triggered `restCompleted` event naming the actor, at least one minute, actor not in a live combat;
 *   - 'gm'          an explicit GM adjudication with a recorded reason (live user verified).
 * Only owned instances change; a maintained effect is an independent instance (ForcePowerEffectsEngine) and is never touched.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export const SUITE_KINDS = Object.freeze({
  'force-power': Object.freeze({ itemTypes: Object.freeze(['force-power', 'lightsaber-form-power']), label: 'Force Power', activationDomain: 'force-power.activation' }),
  maneuver: Object.freeze({ itemTypes: Object.freeze(['maneuver']), label: 'starship maneuver', activationDomain: 'starship-maneuver.activation' })
});

const PENDING_PATH = 'flags.swse.pendingSuiteRegain';
const pendingOf = (actor) => actor?.getFlag?.('swse', 'pendingSuiteRegain') ?? actor?.flags?.swse?.pendingSuiteRegain ?? {};

export const isSpentInstance = (item) => item?.system?.discarded === true;

/** Which suite (if any) does this roll domain activate? Only the activation check counts for the natural-20 rule. */
export function suiteKindForActivationDomain(domain) {
  return Object.entries(SUITE_KINDS).find(([, def]) => def.activationDomain === domain)?.[0] ?? null;
}

function inLiveCombat(actor) {
  const combat = globalThis.game?.combat;
  return !!(combat?.started && Array.from(combat.combatants ?? []).some(c => c.actor?.id === actor?.id));
}

/** Re-verify a proof against live state. Returns { valid, message }. */
export function verifyRegainProof(actor, kind, proof) {
  const fail = (message) => ({ valid: false, message });
  if (!actor?.id || !SUITE_KINDS[kind]) return fail('Unknown suite');
  if (proof?.kind === 'natural-20') {
    const pending = pendingOf(actor)?.[kind];
    return pending ? { valid: true } : fail('No natural 20 activation check is pending for this actor');
  }
  if (proof?.kind === 'rest') {
    const e = proof.event ?? {};
    if (e.triggeredByGM !== true) return fail('A rest must be confirmed by the GM');
    if (!Array.isArray(e.actorIds) || !e.actorIds.includes(actor.id)) return fail('That rest did not include this actor');
    if (!(Number(e.duration) >= 1)) return fail('A rest of at least one minute is required');
    if (inLiveCombat(actor)) return fail('Combat is not over for this actor');
    return { valid: true };
  }
  if (proof?.kind === 'gm') {
    if (globalThis.game?.user?.isGM !== true || typeof proof.reason !== 'string' || !proof.reason.trim()) return fail('GM adjudication with a recorded reason is required');
    return { valid: true };
  }
  return fail('Regaining every spent instance requires a natural 20, a GM-confirmed rest, or explicit GM adjudication');
}

export class SuiteInstanceRecovery {
  /**
   * Natural 20 on a suite ACTIVATION check (Force Power: Use the Force; maneuver: Pilot): record a pending
   * regain of every spent instance of that suite at the end of THIS actor's turn (the current turn if rolled on it,
   * otherwise its next). Never awards a Force Point. Out of combat nothing ends a turn: the record waits for the
   * next verified regain (FP-RD-008).
   */
  static async recordNatural20(actor, kind, { source = null } = {}) {
    if (!actor?.id || !SUITE_KINDS[kind]) return null;
    const combat = globalThis.game?.combat;
    const live = combat?.started === true;
    const record = {
      combatId: live ? combat.id ?? null : null,
      combatantId: live ? Array.from(combat.combatants ?? []).find(c => c.actor?.id === actor.id)?.id ?? null : null,
      source
    };
    const current = pendingOf(actor) ?? {};
    await ActorEngine.updateActor(actor, { [PENDING_PATH]: { ...current, [kind]: record } });
    return record;
  }

  /** Regain every spent instance of a suite. Requires a proof (re-verified here). */
  static async regainAllSpent(actor, kind, { proof, source = 'suite-regain-all' } = {}) {
    const verdict = verifyRegainProof(actor, kind, proof);
    if (!verdict.valid) return { success: false, recovered: 0, error: verdict.message };
    const types = SUITE_KINDS[kind].itemTypes;
    const spent = Array.from(actor.items ?? []).filter(item => types.includes(item.type) && isSpentInstance(item));
    if (spent.length > 0) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', spent.map(item => ({
        _id: item.id, 'system.discarded': false, 'system.lastRecovered': Date.now()
      })), { source: `${source}-${kind}`, render: false });
    }
    const pending = pendingOf(actor) ?? {};
    if (pending[kind]) {
      const { [kind]: _done, ...rest } = pending;
      await ActorEngine.updateActor(actor, { [PENDING_PATH]: Object.keys(rest).length ? rest : null });
    }
    return { success: true, recovered: spent.length, powers: spent.map(p => p.name), kind };
  }

  /** The combatant whose turn just ended regains the suites with a pending natural-20 record for THIS combat. */
  static async regainAtEndOfTurn(combat) {
    const prevId = combat?.previous?.combatantId ?? null;
    if (!prevId) return [];
    const combatant = combat.combatants?.get?.(prevId) ?? Array.from(combat.combatants ?? []).find(c => c.id === prevId);
    const actor = combatant?.actor;
    const pending = pendingOf(actor) ?? {};
    const results = [];
    for (const kind of Object.keys(SUITE_KINDS)) {
      const record = pending[kind];
      if (!record || record.combatId !== combat.id || (record.combatantId && record.combatantId !== prevId)) continue;
      results.push({ actorId: actor.id, ...(await this.regainAllSpent(actor, kind, { proof: { kind: 'natural-20' }, source: 'natural-20-end-of-turn' })) });
    }
    return results;
  }

  /** A GM-confirmed rest (the `restCompleted` hook): every named actor not in a live combat regains both suites. */
  static async regainAfterRest(event) {
    const results = [];
    for (const actorId of event?.actorIds ?? []) {
      const actor = globalThis.game?.actors?.get?.(actorId);
      if (!actor) continue;
      for (const kind of Object.keys(SUITE_KINDS)) {
        const result = await this.regainAllSpent(actor, kind, { proof: { kind: 'rest', event }, source: 'rest' });
        if (result.success) results.push({ actorId, ...result });
      }
    }
    return results;
  }
}
