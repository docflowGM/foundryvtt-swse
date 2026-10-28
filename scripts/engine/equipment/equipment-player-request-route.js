/**
 * Player equipment request route (WP3-B) — GM-AUTHORITATIVE, DISABLED BY DEFAULT, FAILS CLOSED.
 *
 * A non-GM player cannot write equipment state. To draw/ready/stow, the player's client builds a request ENVELOPE (actor, request id, intent,
 * intent digest, optional plan digest) and a transport delivers it to the GM executor, which runs it through the one equipment-state coordinator.
 *
 * Identity: the envelope carries NO user identity and any identity-looking field is refused. Who sent a request comes only from the TRANSPORT as an
 * authenticated sender { userId, mechanism }, and only mechanisms listed in VERIFIED_IDENTITY_MECHANISMS are accepted. That list is EMPTY: the
 * candidate mechanism (the server-stamped author of a GM-whispered ChatMessage, `chat-message-author-v13`) has not been verified in a live Foundry
 * V13 world (WP3-B Gate 1, see tools/foundry-runtime-probes/wp3b-gate1-identity-probe.js). Until it is, every request is refused. On top of that the
 * route itself is OFF unless a caller explicitly enables it; nothing in the system enables it or installs a transport.
 *
 * Order of checks (each refusal writes nothing): envelope shape -> route enabled -> verified sender mechanism -> this client is a GM -> this client
 * holds the executor lease -> sender user exists -> actor exists -> sender owns the actor -> intent digest recomputed from the intent ->
 * coordinator (duplicate/conflict detection by request id, fresh-state re-plan, journal, field-scoped write, verify, spend-last, finalize),
 * with the lease re-checked before every mutation step (fence) and the executor + epoch recorded in the journal entry.
 */
import { fingerprintIntent } from '/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js';
import { executeEquipmentIntent, validateIntent, GM_LOCAL_CONTEXT, EquipmentIntentError } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js';
import { evaluateLease, leaseFence } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-executor-lease.js';
import { logEquipmentEvent } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-diagnostics.js';

export const ENVELOPE_KIND = 'swse-equipment-request';
export const ENVELOPE_SCHEMA = 1;
/** Sender-identity mechanisms verified in a live Foundry V13 world. EMPTY until WP3-B Gate 1 evidence is reviewed. */
export const VERIFIED_IDENTITY_MECHANISMS = Object.freeze([]);
export const CHAT_AUTHOR_MECHANISM = 'chat-message-author-v13';

export const ROUTE_OUTCOME = Object.freeze({
  INVALID_ENVELOPE: 'INVALID_ENVELOPE',
  ROUTE_DISABLED: 'ROUTE_DISABLED',
  IDENTITY_UNVERIFIED: 'IDENTITY_UNVERIFIED',
  NOT_EXECUTOR: 'NOT_EXECUTOR',
  SENDER_UNKNOWN: 'SENDER_UNKNOWN',
  ACTOR_NOT_FOUND: 'ACTOR_NOT_FOUND',
  SENDER_NOT_PERMITTED: 'SENDER_NOT_PERMITTED',
  INTENT_DIGEST_MISMATCH: 'INTENT_DIGEST_MISMATCH',
  EXECUTED: 'EXECUTED',
});

const ENVELOPE_KEYS = ['kind', 'schema', 'actorId', 'requestId', 'intent', 'intentDigest', 'planDigest'];
const HEX64 = /^[0-9a-f]{64}$/;
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.length > 0;
const digestOf = (actorId, intent) => fingerprintIntent({ schema: 1, actorId, intent });

/** Player side: build the envelope for a request the player intends (no identity is ever included). */
export function buildEquipmentRequestEnvelope({ actorId, requestId, intent, planDigest = undefined }) {
  const normalized = validateIntent(intent);
  return { kind: ENVELOPE_KIND, schema: ENVELOPE_SCHEMA, actorId, requestId, intent: normalized, intentDigest: digestOf(actorId, normalized), ...(planDigest ? { planDigest } : {}) };
}

/** @returns {string|null} null when the envelope is well-formed, otherwise the reason */
export function envelopeProblem(env) {
  if (!isPlain(env)) return 'envelope must be an object';
  const extra = Object.keys(env).filter((k) => !ENVELOPE_KEYS.includes(k));
  if (extra.length) return `unsupported envelope field(s): ${extra.sort().join(', ')} (identity is never accepted from a payload)`;
  if (env.kind !== ENVELOPE_KIND || env.schema !== ENVELOPE_SCHEMA) return 'not an equipment request envelope';
  if (!nonEmpty(env.actorId)) return 'actorId is required';
  if (!nonEmpty(env.requestId) || env.requestId.length > 128) return 'requestId must be a non-empty string of at most 128 characters';
  if (typeof env.intentDigest !== 'string' || !HEX64.test(env.intentDigest)) return 'intentDigest must be a sha-256 hex digest';
  if (env.planDigest !== undefined && !(typeof env.planDigest === 'string' && HEX64.test(env.planDigest))) return 'planDigest must be a sha-256 hex digest';
  try { validateIntent(env.intent); } catch (err) { return err instanceof EquipmentIntentError ? err.message : 'invalid intent'; }
  return null;
}

function ownsActor(actor, user) {
  try {
    if (typeof actor.testUserPermission === 'function') return actor.testUserPermission(user, 'OWNER') === true;
  } catch { return false; }
  const level = actor.ownership?.[user.id] ?? actor.ownership?.default;
  return Number(level) >= 3;
}

/**
 * GM side: handle one delivered envelope.
 * @param {object} envelope
 * @param {{userId:string, mechanism:string}|null} sender authenticated by the TRANSPORT, never read from the envelope
 * @param {object} deps { routeEnabled(), verifiedMechanisms?, isGm(), executorIdentity:{userId,sessionId}, leaseStore, now(), getActor(id), getUser(id), coordinatorDeps }
 */
export async function handleEquipmentRequest(envelope, sender, deps = {}) {
  const refuse = (status, message, extra = {}) => {
    const out = Object.freeze({ status, requestId: isPlain(envelope) ? envelope.requestId ?? null : null, message, ...extra });
    logEquipmentEvent('route-refused', { status, requestId: out.requestId, actorId: envelope?.actorId ?? null, sender: sender?.userId ?? null });
    return out;
  };
  const problem = envelopeProblem(envelope);
  if (problem) return refuse(ROUTE_OUTCOME.INVALID_ENVELOPE, problem);

  const enabled = (() => { try { return deps.routeEnabled?.() === true; } catch { return false; } })();
  if (!enabled) return refuse(ROUTE_OUTCOME.ROUTE_DISABLED, 'The player equipment request route is disabled; nothing was changed.');

  const verified = Array.isArray(deps.verifiedMechanisms) ? deps.verifiedMechanisms : VERIFIED_IDENTITY_MECHANISMS;
  if (!isPlain(sender) || !nonEmpty(sender.userId) || !verified.includes(sender.mechanism)) {
    return refuse(ROUTE_OUTCOME.IDENTITY_UNVERIFIED, 'The request sender is not established by a verified identity mechanism; nothing was changed.');
  }

  const isGm = (() => { try { return deps.isGm?.() === true; } catch { return false; } })();
  if (!isGm || !deps.leaseStore || !nonEmpty(deps.executorIdentity?.userId) || !nonEmpty(deps.executorIdentity?.sessionId)) {
    return refuse(ROUTE_OUTCOME.NOT_EXECUTOR, 'This client is not the authorized equipment executor.');
  }
  const now = () => (typeof deps.now === 'function' ? deps.now() : Date.now());
  let lease;
  try { lease = evaluateLease(await deps.leaseStore.read(), deps.executorIdentity, now()); } catch { lease = { held: false }; }
  if (!lease.held) return refuse(ROUTE_OUTCOME.NOT_EXECUTOR, 'This client does not hold the equipment executor lease.');

  const user = deps.getUser?.(sender.userId) ?? null;
  if (!user) return refuse(ROUTE_OUTCOME.SENDER_UNKNOWN, 'The sender is not a user of this world.');
  const actor = deps.getActor?.(envelope.actorId) ?? null;
  if (!actor) return refuse(ROUTE_OUTCOME.ACTOR_NOT_FOUND, 'The actor does not exist.');
  if (!ownsActor(actor, user)) return refuse(ROUTE_OUTCOME.SENDER_NOT_PERMITTED, 'The sender does not own this actor.');

  const intent = validateIntent(envelope.intent);
  if (digestOf(actor.id, intent) !== envelope.intentDigest) return refuse(ROUTE_OUTCOME.INTENT_DIGEST_MISMATCH, 'The intent does not match its digest.');

  const coordinatorDeps = {
    ...(deps.coordinatorDeps ?? {}),
    isGm: () => isGm,
    fence: leaseFence(deps.leaseStore, deps.executorIdentity, lease.epoch, now),
    executor: { userId: deps.executorIdentity.userId, epoch: lease.epoch },
  };
  const outcome = await executeEquipmentIntent(actor, { requestId: envelope.requestId, intent, ...(envelope.planDigest ? { planDigest: envelope.planDigest } : {}) }, { context: GM_LOCAL_CONTEXT }, coordinatorDeps);
  logEquipmentEvent('route-executed', { requestId: envelope.requestId, actorId: actor.id, itemId: intent.itemId, sender: sender.userId, mechanism: sender.mechanism, epoch: lease.epoch, status: outcome.status, verified: outcome.verified === true, finalized: outcome.finalized === true });
  return Object.freeze({ status: ROUTE_OUTCOME.EXECUTED, requestId: envelope.requestId, sender: { userId: sender.userId, mechanism: sender.mechanism }, epoch: lease.epoch, outcome });
}

export default { buildEquipmentRequestEnvelope, envelopeProblem, handleEquipmentRequest, ROUTE_OUTCOME, VERIFIED_IDENTITY_MECHANISMS, CHAT_AUTHOR_MECHANISM, ENVELOPE_KIND };
