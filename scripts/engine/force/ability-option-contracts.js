/**
 * Typed per-ability Force Point contracts (FP-RD-003). A contract is certified only when the
 * printed source, owned canonical identity, trigger event and action cost are all verified.
 * The pattern: { kind, slug, itemType, source, actionCost, ... }; evaluateAbilityContract() re-checks
 * every fact from live actor / event state at authorization time (never from the caller's claim).
 *
 * Certified so far (batch 1, lightsaber-talent-actions.js):
 *  - Force Fortification   — Core Rulebook, Duelist talent tree: a REACTION to a critical hit scored
 *    against you; "You can spend this Force Point even if you've already spent a Force Point earlier in
 *    the round" (the round-limit check against PRIOR spends is waived; the spend is still recorded).
 *  - Improved Lightsaber Throw — Force Unleashed Campaign Guide, New Duelist Talents: spend a Force Point
 *    as a STANDARD ACTION; the optional pull-back is a separate swift action and DC 20 UTF (no FP).
 *  - Block / Deflect on an adjacent ally — Core official errata p.41 as summarized in the 03B policy,
 *    with Sheltering Stance (KOTOR Campaign Guide) waiving the cost for an adjacent ally.
 */
import { ownedAbilityInstance } from "/systems/foundryvtt-swse/scripts/utils/canonical-ability-identity.js";
import { verifyAttackEventRecord, REACTION_ATTACK_TYPE, combatKey } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/attack-event-verify.js";
import { bestDistanceSquares } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-legality-engine.js";

export const ABILITY_OPTION_CONTRACTS = Object.freeze({
  'lightsaber:promptForceFortification': Object.freeze({
    kind: 'critical-hit-reaction', itemType: 'talent', slug: 'force-fortification', actionCost: 'reaction', priorSpendExempt: true,
    source: 'Core Rulebook, Duelist talent tree (Force Fortification)'
  }),
  'lightsaber:promptImprovedLightsaberThrow': Object.freeze({
    kind: 'standard-action', itemType: 'talent', slug: 'improved-lightsaber-throw', actionCost: 'standard', priorSpendExempt: false,
    source: 'Force Unleashed Campaign Guide, New Duelist Talents (Improved Lightsaber Throw)'
  }),
  'lightsaber:promptBlock': Object.freeze({
    kind: 'adjacent-ally-reaction', itemType: 'talent', slug: 'block', talent: 'block', actionCost: 'reaction', priorSpendExempt: false,
    source: 'Core official errata p.41 (Block); Sheltering Stance, KOTOR Campaign Guide'
  }),
  'lightsaber:promptDeflect': Object.freeze({
    kind: 'adjacent-ally-reaction', itemType: 'talent', slug: 'deflect', talent: 'deflect', actionCost: 'reaction', priorSpendExempt: false,
    source: 'Core official errata p.41 (Deflect); Sheltering Stance, KOTOR Campaign Guide'
  })
});

const ADJACENT_SQUARES = 1.0001;

/** Verify that `actor` may answer an attack on an ADJACENT ALLY with Block/Deflect (event, adjacency, ownership). */
export function verifyAdjacentAllyEvent(actor, { talent, claim, user = globalThis.game?.user } = {}) {
  const fail = (message) => ({ valid: false, message });
  if (!actor?.id || !claim?.id || !claim?.attackerId) return fail('A verified attack on an adjacent ally is required');
  if (user?.isGM !== true && actor.isOwner !== true) return fail('You do not control this defender');
  const attacker = globalThis.game?.actors?.get?.(claim.attackerId);
  const record = attacker?.getFlag?.('swse', 'outgoingAttackEvents') ?? attacker?.flags?.swse?.outgoingAttackEvents;
  const event = Array.isArray(record?.events) ? record.events.find(e => e.id === claim.id) : null;
  if (!event) return fail('Unknown attack event');
  if (event.attackerId !== attacker.id) return fail('Attack event does not belong to that attacker');
  if (event.state !== 'pending') return fail(`Attack event is ${event.state}`);
  if (event.defenderId === actor.id) return fail('That attack targets you, not an ally');
  const wanted = REACTION_ATTACK_TYPE[talent];
  if (wanted && event.attackType !== wanted) return fail(`${talent} answers ${wanted} attacks, not ${event.attackType}`);
  const now = combatKey();
  if (event.combatId && (now.combatId !== event.combatId || now.round !== event.round)) return fail('Attack event has expired');
  const consumed = actor.getFlag?.('swse', 'consumedAttackEvents') ?? actor.flags?.swse?.consumedAttackEvents;
  if (Array.isArray(consumed?.ids) && consumed.ids.includes(event.id)) return fail('Attack event already consumed');
  const ally = globalThis.game?.actors?.get?.(event.defenderId);
  if (!ally || ally.id === actor.id) return fail('The protected ally could not be identified');
  const distance = bestDistanceSquares(actor, ally);
  if (distance === null || distance > ADJACENT_SQUARES) return fail('The protected ally is not adjacent');
  return { valid: true, message: 'Verified', event, ally };
}

/** Re-evaluate a contract from live state. Returns { valid, message, eventKey, priorSpendExempt, actionCost }. */
export function evaluateAbilityContract(actor, ref, context = {}) {
  const contract = ABILITY_OPTION_CONTRACTS[ref];
  const fail = (message) => ({ valid: false, message });
  if (!contract) return fail('No certified Force Point contract for this ability');
  if (!ownedAbilityInstance(actor, { type: contract.itemType, slug: contract.slug })) return fail(`${contract.slug} is not owned by this actor`);
  const out = { valid: true, message: 'Verified', actionCost: contract.actionCost, priorSpendExempt: contract.priorSpendExempt === true, eventKey: null, contract: ref };

  if (contract.kind === 'standard-action') return out;

  const claim = context.reaction;
  if (!claim?.id || !claim?.attackerId) return fail('A verified triggering attack event is required');

  if (contract.kind === 'critical-hit-reaction') {
    const verdict = verifyAttackEventRecord({ defender: actor, attackerId: claim.attackerId, eventId: claim.id, reactionKey: null, allowConsumed: true });
    if (!verdict.valid) return fail(`Triggering event not verified: ${verdict.message}`);
    if (verdict.event.hit !== true || verdict.event.critical !== true) return fail('Force Fortification answers a critical hit scored against you');
    return { ...out, eventKey: `${claim.id}#${ref}` };
  }

  if (contract.kind === 'adjacent-ally-reaction') {
    const verdict = verifyAdjacentAllyEvent(actor, { talent: contract.talent, claim });
    if (!verdict.valid) return fail(verdict.message);
    return { ...out, eventKey: `${claim.id}#${ref}` };
  }
  return fail('Unsupported contract kind');
}
