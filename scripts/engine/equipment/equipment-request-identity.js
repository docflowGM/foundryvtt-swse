/**
 * Equipment request identity (TI4-B G18).
 *
 * One logical equipment action keeps ONE request id from the moment the user expresses the intent until the action is known to be finished.
 * The coordinator's duplicate protection (journal + ledger: DUPLICATE_REPLAYED, DUPLICATE_UNRESOLVED, REQUEST_ID_CONFLICT) only works when a
 * retry carries the same id; minting a fresh id per call (the former InventoryEngine behaviour) defeated it.
 *
 * The key of a logical action is the coordinator's own intent digest (actor id + normalized intent), so "the same action" means exactly what the
 * coordinator treats as the same intent. While an id is in flight, or its last outcome left the action unresolved, every retry of that action gets
 * the same id. The id is released only on an outcome that settles the action (done, refused, or verifiably not applied); the next request for
 * the same intent is then a new logical action with a new id.
 *
 * Client-local and bounded: this is per-client request continuity, not cross-client deduplication (the journal on the actor is the durable
 * record the GM executor checks).
 */
import { fingerprintIntent } from '/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js';
import { validateIntent, OUTCOME } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js';

/** Outcomes after which the same logical action may still be in effect or in doubt: its id is kept for retries. */
export const RETAINED_STATUSES = Object.freeze([
  OUTCOME.DUPLICATE_UNRESOLVED, OUTCOME.INDETERMINATE, OUTCOME.UNRESOLVED_JOURNAL, OUTCOME.UNRESOLVED_FINALIZE, OUTCOME.FAILED_PARTIAL,
  OUTCOME.UNRESOLVED_TRANSACTION, 'EXECUTOR_FENCED', 'UNKNOWN_OUTCOME',
]);

const REGISTRY_MAX = 256;
const registry = new Map(); // key -> { requestId, state: 'in-flight' | 'retained' }

export function mintRequestId() {
  const fromFoundry = globalThis.foundry?.utils?.randomID?.(24);
  if (typeof fromFoundry === 'string' && fromFoundry.length) return fromFoundry;
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/** The coordinator's digest for this actor + intent (throws EquipmentIntentError for a malformed intent, like the coordinator). */
export function intentKey(actor, intent) {
  const normalized = validateIntent(intent);
  return `${actor?.id ?? ''}:${fingerprintIntent({ schema: 1, actorId: actor?.id ?? null, intent: normalized })}`;
}

/**
 * Get the request id for a logical action at the moment of intent.
 * @param {object} actor
 * @param {object} intent
 * @param {{requestId?:string|null}} [options] an id the caller already minted at its UI intent (kept as given)
 * @returns {{requestId:string, key:string, reused:boolean}}
 */
export function acquireRequestId(actor, intent, { requestId = null } = {}) {
  const key = intentKey(actor, intent);
  const held = registry.get(key);
  if (requestId) {
    if (!held) remember(key, requestId);
    return { requestId, key, reused: held?.requestId === requestId };
  }
  if (held) { held.state = 'in-flight'; return { requestId: held.requestId, key, reused: true }; }
  const fresh = mintRequestId();
  remember(key, fresh);
  return { requestId: fresh, key, reused: false };
}

/** Record how the action ended: keep the id while the action may still be in effect, release it otherwise. */
export function settleRequestId(key, requestId, status) {
  const held = registry.get(key);
  if (!held || held.requestId !== requestId) return;
  if (RETAINED_STATUSES.includes(status)) held.state = 'retained';
  else registry.delete(key);
}

export function peekRequestId(key) { return registry.get(key)?.requestId ?? null; }
export function _resetRequestRegistryForTests() { registry.clear(); }

function remember(key, requestId) {
  registry.set(key, { requestId, state: 'in-flight' });
  while (registry.size > REGISTRY_MAX) registry.delete(registry.keys().next().value);
}

export default { acquireRequestId, settleRequestId, intentKey, mintRequestId, peekRequestId, RETAINED_STATUSES };
