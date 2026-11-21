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
import { isLightsaberWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";

function talentActivation(ref, slug, actionCost, source, limit = null) {
  return { [ref]: Object.freeze({ kind: 'talent-activation', itemType: 'talent', slug, actionCost, priorSpendExempt: false, limit: limit ? Object.freeze(limit) : null, source }) };
}

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
  // KOTOR Campaign Guide, Resist Force "Special: You can spend a Force Point to apply the bonus provided by this power to
  // any two Defense scores of your choice." Paid as part of that activation (no separate action is printed).
  'forcePower:resistForceTwoDefenses': Object.freeze({
    kind: 'activation-option', itemType: 'force-power', slug: 'resist-force', actionCost: 'part-of-activation', priorSpendExempt: false,
    source: 'Knights of the Old Republic Campaign Guide, Resist Force (Special)'
  }),
  // KOTOR Campaign Guide, Valor "Special: You can spend a Force Point when you activate this power to have the bonus apply
  // against all effects that target Will Defense".
  'forcePower:valorAllWill': Object.freeze({
    kind: 'activation-option', itemType: 'force-power', slug: 'valor', actionCost: 'part-of-activation', priorSpendExempt: false,
    source: 'Knights of the Old Republic Campaign Guide, Valor (Special)'
  }),
  'lightsaber:promptDeflect': Object.freeze({
    kind: 'adjacent-ally-reaction', itemType: 'talent', slug: 'deflect', talent: 'deflect', actionCost: 'reaction', priorSpendExempt: false,
    source: 'Core official errata p.41 (Deflect); Sheltering Stance, KOTOR Campaign Guide'
  }),

  // ---- Batch 2-4: talent activations (owned talent + printed action + printed use limit). Source text verified against
  // the repository's OCR of the cited book (see the 03B contract ledger for the evidence). No trigger event is printed.
  ...talentActivation('consular:applySkilledAdvisor', 'skilled-advisor', 'full-round', 'Core Rulebook p.40 (Skilled Advisor)'),
  ...talentActivation('consular:promptEntreatAid', 'entreat-aid', 'swift', 'Legacy Era Campaign Guide p.26 (Entreat Aid)', { per: 'round', count: 1 }),
  ...talentActivation('consular:promptForceOfWill', 'force-of-will', 'swift', 'Force Unleashed Campaign Guide p.24 (Force of Will)'),
  ...talentActivation('consular:promptBattleMeditation', 'battle-meditation', 'full-round', 'Core Rulebook p.40 (Battle Meditation)'),
  ...talentActivation('sentinel:promptForceHaze', 'force-haze', 'standard', 'Core Rulebook p.41 (Force Haze)'),
  ...talentActivation('lightsaber-form:promptJuyo', 'juyo', 'swift', 'Core Rulebook p.218 (Juyo)', { per: 'encounter', count: 1 }),
  ...talentActivation('jedi-prestige:promptShareTalent', 'share-talent', 'standard', 'Jedi Academy Training Manual p.20 (Share Talent)', { per: 'day', count: 1 }),
  ...talentActivation('force-adept:Attune Weapon', 'attune-weapon', 'full-round', 'Core Rulebook p.214 (Attune Weapon)'),
  ...talentActivation('force-adept:Empower Weapon', 'empower-weapon', 'full-round', 'Core Rulebook p.214 (Empower Weapon)'),
  ...talentActivation('force-adept:Unsettling Presence', 'unsettling-presence', 'standard', 'Force Unleashed Campaign Guide p.43 (Unsettling Presence)'),
  ...talentActivation('force-adept:Force Power Adept', 'force-power-adept', 'part-of-activation', 'Core Rulebook p.214 (Force Power Adept)'),
  ...talentActivation('force-adept:Long Call', 'long-call', 'part-of-activation', 'Unknown Regions p.30 (Long Call)'),
  ...talentActivation('sith:Dark Healing', 'dark-healing', 'standard', 'Core Rulebook p.223 (Dark Healing)'),
  ...talentActivation('sith:Dark Side Master', 'dark-side-master', 'part-of-activation', 'Core Rulebook p.223 (Dark Side Master)'),
  ...talentActivation('sith:Channel Anger', 'channel-anger', 'swift', 'Core Rulebook p.213 (Channel Anger)'),
  ...talentActivation('sith:Bonded Mount', 'bonded-mount', 'full-round', 'Jedi Academy Training Manual p.18 (Bonded Mount)'),
  ...talentActivation('force-executor-option:Aversion', 'aversion', 'swift', 'Clone Wars Campaign Guide p.53 (Aversion)'),
  ...talentActivation('force-executor-option:Illusion', 'illusion', 'standard', 'Force Unleashed Campaign Guide p.87 (Illusion)'),

  // ---- attack-event triggered (verified attack-event records, never a client claim)
  'lightsaber-form:djem-so': Object.freeze({
    kind: 'hit-by-melee-reaction', itemType: 'talent', slug: 'djem-so', actionCost: 'reaction', priorSpendExempt: false,
    limit: Object.freeze({ per: 'round', count: 1 }),
    source: 'Core Rulebook p.218 (Djem So): once per round when an opponent hits you with a melee attack, reaction'
  }),
  'consular:promptExposingStrike': Object.freeze({
    kind: 'own-hit', itemType: 'talent', slug: 'exposing-strike', actionCost: 'free', priorSpendExempt: false, weapon: 'lightsaber',
    source: 'Clone Wars Campaign Guide p.21 (Exposing Strike): when you use a lightsaber to deal damage to a target'
  }),
  'sith:Wicked Strike': Object.freeze({
    kind: 'own-critical', itemType: 'talent', slug: 'wicked-strike', actionCost: 'free', priorSpendExempt: false, weapon: 'lightsaber',
    source: 'Core Rulebook p.224 (Wicked Strike): when you score a critical hit with a lightsaber'
  }),
  'sith:Crippling Strike': Object.freeze({
    kind: 'own-critical', itemType: 'talent', slug: 'crippling-strike', actionCost: 'free', priorSpendExempt: false,
    source: 'Core Rulebook p.213 (Crippling Strike): whenever you score a critical hit'
  })
});

const ADJACENT_SQUARES = 1.0001;
const DAY_SECONDS = 86400;

/** Printed per-round / per-encounter / per-day limits, counted from this actor's own committed+finalized receipts. */
export function checkContractLimit(actor, ref, limit) {
  if (!limit) return { valid: true };
  const ledger = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
  const mine = (ledger.receipts ?? []).filter(r => r.abilitySourceRef === ref && ['committed', 'finalized'].includes(r.state));
  const now = combatKey();
  let used = [];
  if (limit.per === 'round') {
    if (!now.combatId) return { valid: true }; // out of combat there are no rounds to limit
    used = mine.filter(r => r.roundKey === `${now.combatId}:${now.round}`);
  } else if (limit.per === 'encounter') {
    if (!now.combatId) return { valid: false, message: 'This once-per-encounter ability is tracked only during a started combat' };
    used = mine.filter(r => String(r.roundKey ?? '').startsWith(`${now.combatId}:`));
  } else if (limit.per === 'day') {
    const t = Number(globalThis.game?.time?.worldTime);
    if (!Number.isFinite(t)) return { valid: false, message: 'Once-per-day abilities need the world clock' };
    used = mine.filter(r => Number.isFinite(Number(r.worldTime)) && t - Number(r.worldTime) < DAY_SECONDS);
  }
  return used.length >= (limit.count ?? 1)
    ? { valid: false, message: `Already used ${limit.count ?? 1} time(s) this ${limit.per}` }
    : { valid: true };
}

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

  // Printed use limits are read from the actor's own Force Point ledger (receipts for this exact contract).
  const limited = checkContractLimit(actor, ref, contract.limit);
  if (!limited.valid) return fail(limited.message);

  if (contract.kind === 'standard-action' || contract.kind === 'activation-option' || contract.kind === 'talent-activation') return out;

  if (contract.kind === 'own-hit' || contract.kind === 'own-critical') {
    const claim = context.attackEvent;
    const record = actor.getFlag?.('swse', 'outgoingAttackEvents') ?? actor.flags?.swse?.outgoingAttackEvents;
    const event = claim?.id && Array.isArray(record?.events) ? record.events.find(e => e.id === claim.id) : null;
    if (!event || event.attackerId !== actor.id) return fail('A verified attack you made is required');
    if (event.state !== 'pending') return fail(`That attack event is ${event.state}`);
    const now = combatKey();
    if (event.combatId && (now.combatId !== event.combatId || now.round !== event.round)) return fail('That attack event has expired');
    if (event.hit !== true) return fail('That attack did not hit');
    if (contract.kind === 'own-critical' && event.critical !== true) return fail('That attack was not a critical hit');
    if (contract.weapon === 'lightsaber') {
      const weapon = Array.from(actor.items ?? []).find(i => i.id === event.weaponId);
      if (!weapon || !isLightsaberWeapon(weapon)) return fail('That attack was not made with a lightsaber you own');
    }
    return { ...out, eventKey: `${event.id}#${ref}` };
  }

  if (contract.kind === 'hit-by-melee-reaction') {
    const claim = context.reaction;
    if (!claim?.id || !claim?.attackerId) return fail('A verified melee hit against you is required');
    const verdict = verifyAttackEventRecord({ defender: actor, attackerId: claim.attackerId, eventId: claim.id, reactionKey: null, allowConsumed: true });
    if (!verdict.valid) return fail(`Triggering event not verified: ${verdict.message}`);
    if (verdict.event.hit !== true || verdict.event.attackType !== 'melee') return fail('Djem So answers a melee attack that hit you');
    return { ...out, eventKey: `${claim.id}#${ref}` };
  }

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
