/**
 * Equipment executor lease (WP3-B).
 *
 * Exactly one GM client should execute player-originated equipment requests. The lease names that client: { userId, sessionId, epoch, expiresAt }.
 * A GM claims it when it is free or expired, renews it while it holds it, and every mutation step re-checks it (the coordinator's fence).
 *
 * LIMITS (explicit): the record lives in a world setting and Foundry has no compare-and-swap. Claiming is write-then-read-back, so two GM clients
 * can still overlap briefly at hand-over; the epoch lets the journal show which executor wrote what, and a superseded executor stops at its next
 * fence check. This narrows the race window. It does not provide exactly-once execution across clients.
 *
 * The store is injected ({ read(): record|null, write(record) }); production would use a GM-only world setting. Nothing registers or claims a
 * lease at startup: the player request route that would use it is disabled (see equipment-player-request-route.js).
 */

export const LEASE_SCHEMA_VERSION = 1;
export const DEFAULT_LEASE_TTL_MS = 30_000;

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.length > 0;

export function readLeaseRecord(raw) {
  if (!isPlain(raw) || raw.schemaVersion !== LEASE_SCHEMA_VERSION || !nonEmpty(raw.userId) || !nonEmpty(raw.sessionId)
    || !Number.isInteger(raw.epoch) || raw.epoch < 1 || typeof raw.expiresAt !== 'number') return null;
  return { schemaVersion: raw.schemaVersion, userId: raw.userId, sessionId: raw.sessionId, epoch: raw.epoch, expiresAt: raw.expiresAt };
}

/** Pure: does `me` ({userId, sessionId}) hold the lease at `now`? */
export function evaluateLease(raw, me, now) {
  const rec = readLeaseRecord(raw);
  if (!rec) return { held: false, expired: true, epoch: 0, holder: null };
  const expired = now >= rec.expiresAt;
  const mine = rec.userId === me?.userId && rec.sessionId === me?.sessionId;
  return { held: mine && !expired, expired, epoch: rec.epoch, holder: { userId: rec.userId, sessionId: rec.sessionId } };
}

/**
 * Claim or renew. Only a GM may claim. Renewing keeps the epoch; taking over a free or expired lease increments it.
 * @returns {Promise<{claimed:boolean, epoch:number, reason:string|null}>}
 */
export async function claimLease(store, me, { now, isGm, ttlMs = DEFAULT_LEASE_TTL_MS } = {}) {
  if (isGm !== true) return { claimed: false, epoch: 0, reason: 'not-a-gm' };
  if (!nonEmpty(me?.userId) || !nonEmpty(me?.sessionId)) return { claimed: false, epoch: 0, reason: 'no-session-identity' };
  let current;
  try { current = readLeaseRecord(await store.read()); } catch { return { claimed: false, epoch: 0, reason: 'lease-unreadable' }; }
  const state = evaluateLease(current, me, now);
  if (current && !state.expired && !state.held) return { claimed: false, epoch: current.epoch, reason: 'held-by-another-executor' };
  const epoch = state.held ? current.epoch : (current?.epoch ?? 0) + 1;
  const next = { schemaVersion: LEASE_SCHEMA_VERSION, userId: me.userId, sessionId: me.sessionId, epoch, expiresAt: now + ttlMs };
  try { await store.write(next); } catch { return { claimed: false, epoch: 0, reason: 'lease-write-failed' }; }
  // read back: another client may have written in between (no compare-and-swap); only a read-back that names us counts
  let after;
  try { after = readLeaseRecord(await store.read()); } catch { return { claimed: false, epoch: 0, reason: 'lease-unreadable' }; }
  if (!after || after.userId !== me.userId || after.sessionId !== me.sessionId || after.epoch !== epoch) return { claimed: false, epoch: after?.epoch ?? 0, reason: 'lost-claim-race' };
  return { claimed: true, epoch, reason: null };
}

/**
 * A fence for one execution: true only while `me` still holds the lease with the epoch it started with.
 * @returns {() => Promise<boolean>}
 */
export function leaseFence(store, me, epoch, now = () => Date.now()) {
  return async () => {
    try {
      const state = evaluateLease(await store.read(), me, now());
      return state.held && state.epoch === epoch;
    } catch { return false; }
  };
}

export function memoryLeaseStore(initial = null) {
  let value = initial;
  return { read: async () => value, write: async (v) => { value = JSON.parse(JSON.stringify(v)); } };
}

export default { claimLease, evaluateLease, leaseFence, readLeaseRecord, memoryLeaseStore, LEASE_SCHEMA_VERSION, DEFAULT_LEASE_TTL_MS };
