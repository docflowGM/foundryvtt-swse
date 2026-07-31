/**
 * Follower Slot Occupancy — single canonical definition of "which Actor id
 * (if any) currently occupies this follower slot".
 *
 * Before this module existed, "is this slot occupied" had two competing
 * definitions live in the codebase at once:
 *   - Most call sites (follower-hooks.js, minion-creator.js,
 *     ally-assignment-service.js, follower-session-seeder.js,
 *     progression-entry.js, follower-mutation-transaction.js,
 *     character-sheet.js, PanelContextBuilder.js) checked only the raw
 *     `slot.createdActorId` field.
 *   - scripts/ui/shell/AlliesSurfaceService.js's local `slotCreatedActorId()`
 *     also recognized `slot.actorId`, `slot.assignedActorId`,
 *     `slot.dependentActorId`, and `slot.npcActorId` as legitimate
 *     occupant-id fields (several call sites — beast conversion, ally
 *     rehire — write one of those alternate fields instead of
 *     createdActorId).
 * A slot occupied via one of those alternate fields therefore read as
 * "open" everywhere except the Allies surface, letting a second conversion
 * target the same slot. This module is now the only place that answers the
 * question, so every caller agrees.
 */

/**
 * Resolve the occupant Actor id for a follower slot, checking every field
 * family any live producer writes. Pure. Returns null (never '' or
 * undefined) when the slot has no occupant.
 *
 * @param {object|null|undefined} slot
 * @returns {string|null}
 */
export function resolveFollowerSlotActorId(slot) {
  if (!slot || typeof slot !== 'object') return null;
  const raw = slot.createdActorId ?? slot.actorId ?? slot.assignedActorId ?? slot.dependentActorId ?? slot.npcActorId;
  if (raw === null || raw === undefined) return null;
  const id = String(raw).trim();
  return id ? id : null;
}

/**
 * Whether a follower slot currently has an occupant, by the same
 * alias-aware definition as resolveFollowerSlotActorId(). Pure.
 *
 * @param {object|null|undefined} slot
 * @returns {boolean}
 */
export function isFollowerSlotOccupied(slot) {
  return resolveFollowerSlotActorId(slot) !== null;
}

/**
 * PHASE 10 ADDENDUM (P2-3) — persistent follower-slot conversion
 * reservations.
 *
 * Before this addendum, a follower slot had exactly two states: open
 * (`resolveFollowerSlotActorId(slot) === null`) or occupied by a real
 * follower Actor. Two GMs/clients racing to convert an existing NPC into
 * the SAME open slot (or the same NPC into two different slots) could
 * both pass the "is it occupied" check before either one committed,
 * because nothing recorded that a conversion was already IN PROGRESS
 * against that slot.
 *
 * A "reservation" is a THIRD, explicitly separate state from occupancy:
 * `slot.reservation = {token, operation, userId, ownerActorId,
 * targetActorId, slotId, createdAt, expiresAt}` marks a slot as
 * temporarily claimed by one in-progress conversion request, identified
 * by an opaque `token` the caller generated once per attempt (see
 * AllyAssignmentModal's `requestToken`). It is bounded by a short TTL
 * (`FOLLOWER_CONVERSION_RESERVATION_TTL_MS`) so an abandoned/crashed
 * attempt cannot permanently lock a slot — an expired reservation reads
 * as "not reserved" here, but is only ever CLEARED by
 * FollowerSlotService's governed helpers or an explicit cleanup pass,
 * never by a pure view-model function reading it.
 *
 * Occupancy and reservation are checked independently everywhere a slot
 * is considered for a new conversion: occupied always wins (a real
 * follower already lives there), and a live, unexpired reservation held
 * by a DIFFERENT token also blocks a new attempt even though the slot is
 * still technically open.
 */
export const FOLLOWER_CONVERSION_RESERVATION_TTL_MS = 120_000;

/**
 * Read a follower slot's reservation record, if any. Pure.
 *
 * @param {object|null|undefined} slot
 * @returns {{token: string, operation: string, userId: string|null, ownerActorId: string|null, targetActorId: string|null, slotId: string, createdAt: number, expiresAt: number}|null}
 */
export function resolveFollowerSlotReservation(slot) {
  return (slot && typeof slot === 'object' && slot.reservation && typeof slot.reservation === 'object')
    ? slot.reservation
    : null;
}

/**
 * Whether a slot's reservation (if any) has passed its TTL. A slot with
 * no reservation at all is never considered expired (there is nothing to
 * expire). Pure.
 *
 * @param {object|null|undefined} slot
 * @param {number} [now]
 * @returns {boolean}
 */
export function isFollowerSlotReservationExpired(slot, now = Date.now()) {
  const reservation = resolveFollowerSlotReservation(slot);
  if (!reservation) return false;
  return typeof reservation.expiresAt !== 'number' || reservation.expiresAt <= now;
}

/**
 * Whether a slot currently carries a LIVE (unexpired) reservation. Pure.
 * Independent of `isFollowerSlotOccupied()` — a slot can be reserved
 * without being occupied (a conversion in progress) or occupied without
 * ever having been reserved (a slot filled by an older code path).
 *
 * @param {object|null|undefined} slot
 * @param {number} [now]
 * @returns {boolean}
 */
export function isFollowerSlotReserved(slot, now = Date.now()) {
  const reservation = resolveFollowerSlotReservation(slot);
  if (!reservation) return false;
  return !isFollowerSlotReservationExpired(slot, now);
}

/**
 * Build a new slot reservation record. Pure.
 *
 * @param {object} params
 * @param {string} params.token
 * @param {string} params.operation
 * @param {string|null} [params.userId]
 * @param {string|null} [params.ownerActorId]
 * @param {string|null} [params.targetActorId]
 * @param {string} params.slotId
 * @param {number} [params.now]
 * @param {number} [params.ttlMs]
 * @returns {object}
 */
export function buildFollowerSlotReservation({
  token,
  operation,
  userId = null,
  ownerActorId = null,
  targetActorId = null,
  slotId,
  now = Date.now(),
  ttlMs = FOLLOWER_CONVERSION_RESERVATION_TTL_MS
} = {}) {
  return {
    token,
    operation,
    userId,
    ownerActorId,
    targetActorId,
    slotId,
    createdAt: now,
    expiresAt: now + ttlMs
  };
}

/**
 * Return a copy of a slot with its reservation removed. Pure, never
 * mutates its input. A no-op (returns the same slot reference) if the
 * slot has no reservation.
 *
 * @param {object|null|undefined} slot
 * @returns {object|null|undefined}
 */
export function clearFollowerSlotReservation(slot) {
  if (!slot || typeof slot !== 'object' || !slot.reservation) return slot;
  const next = { ...slot };
  delete next.reservation;
  return next;
}

/**
 * Finalize a reserved follower slot: verify the caller's token still
 * matches the slot's live reservation, then in ONE step write the
 * canonical `createdActorId` occupant, clear the reservation, and clear
 * any legacy occupant-alias fields (`actorId`/`assignedActorId`/
 * `dependentActorId`/`npcActorId`) so the slot has exactly one occupant
 * representation going forward. Pure — never mutates its input array.
 * Rejects (leaves the slot array untouched) on a token mismatch, so a
 * losing/stale request can never finalize a slot it does not actually
 * hold the reservation for.
 *
 * @param {object[]} slots
 * @param {{slotId: string, token: string, followerActorId: string}} params
 * @returns {{slots: object[], success: boolean}}
 */
export function finalizeReservedFollowerSlot(slots = [], { slotId, token, followerActorId } = {}) {
  const list = Array.isArray(slots) ? slots : [];
  let success = false;

  const nextSlots = list.map(slot => {
    if (slot?.id !== slotId) return slot;
    const reservation = resolveFollowerSlotReservation(slot);
    if (!reservation || reservation.token !== token) return slot;

    success = true;
    const { reservation: _reservation, actorId: _actorId, assignedActorId: _assignedActorId, dependentActorId: _dependentActorId, npcActorId: _npcActorId, ...rest } = slot;
    return { ...rest, createdActorId: followerActorId, updatedAt: new Date().toISOString() };
  });

  return { slots: nextSlots, success };
}

/**
 * PHASE 10 ADDENDUM (P2-3) — target-side conversion reservation.
 *
 * A slot reservation alone only protects against two requests racing for
 * the SAME slot. It does not stop the SAME NPC being reserved for two
 * DIFFERENT slots (on the same owner, or two different owners)
 * simultaneously. `flags.foundryvtt-swse.followerConversionReservation`
 * on the TARGET Actor closes that gap — a target can carry at most one
 * live conversion reservation at a time, checked and cleared
 * independently of (and, per the acquisition order documented on
 * AllyAssignmentService.convertToFollower(), always AFTER) the slot
 * reservation.
 */
const TARGET_RESERVATION_FLAG_SCOPE = 'foundryvtt-swse';
const TARGET_RESERVATION_FLAG_KEY = 'followerConversionReservation';

export const TARGET_CONVERSION_RESERVATION_FLAG_PATH = `flags.${TARGET_RESERVATION_FLAG_SCOPE}.${TARGET_RESERVATION_FLAG_KEY}`;

/**
 * ROUND-2 CORRECTION (P2-3 concurrency-race audit) — the dot-path used to
 * DELETE the target reservation flag via Foundry's `-=key` convention,
 * for FollowerSlotService's own token-conditional release path.
 */
export const TARGET_CONVERSION_RESERVATION_DELETION_PATH = `flags.${TARGET_RESERVATION_FLAG_SCOPE}.-=${TARGET_RESERVATION_FLAG_KEY}`;

/**
 * ROUND-2 CORRECTION — the target reservation flag's path RELATIVE to
 * `flags.` (i.e. without the `flags.` prefix), for registering it as a
 * PROTECTED path with the snapshot-restoration authority
 * (scripts/governance/snapshot/snapshot-restoration-plan.js). A prior
 * version of this reservation let a target's own conversion snapshot
 * rollback silently delete a LIVE reservation — including one belonging
 * to a completely different, later request — because the reservation
 * flag was treated as ordinary restorable actor data. Its lifecycle is
 * exclusively managed by FollowerSlotService's token-conditional
 * reserve/release methods below; snapshot restoration must never
 * restore OR delete it, the same way it never touches the snapshot
 * history ledger itself.
 */
export const TARGET_CONVERSION_RESERVATION_PROTECTED_FLAG_PATH = `${TARGET_RESERVATION_FLAG_SCOPE}.${TARGET_RESERVATION_FLAG_KEY}`;

/**
 * Read a target Actor's live conversion-reservation record, if any. Pure.
 *
 * @param {Actor|object|null|undefined} targetActor
 * @returns {{token: string, ownerActorId: string|null, slotId: string, userId: string|null, createdAt: number, expiresAt: number}|null}
 */
export function resolveTargetConversionReservation(targetActor) {
  const reservation = targetActor?.flags?.[TARGET_RESERVATION_FLAG_SCOPE]?.[TARGET_RESERVATION_FLAG_KEY];
  return (reservation && typeof reservation === 'object') ? reservation : null;
}

/**
 * Whether a target's reservation (if any) has passed its TTL. Pure.
 *
 * @param {Actor|object|null|undefined} targetActor
 * @param {number} [now]
 * @returns {boolean}
 */
export function isTargetConversionReservationExpired(targetActor, now = Date.now()) {
  const reservation = resolveTargetConversionReservation(targetActor);
  if (!reservation) return false;
  return typeof reservation.expiresAt !== 'number' || reservation.expiresAt <= now;
}

/**
 * Whether a target Actor currently carries a LIVE (unexpired) conversion
 * reservation. Pure.
 *
 * @param {Actor|object|null|undefined} targetActor
 * @param {number} [now]
 * @returns {boolean}
 */
export function isTargetConversionReserved(targetActor, now = Date.now()) {
  const reservation = resolveTargetConversionReservation(targetActor);
  if (!reservation) return false;
  return !isTargetConversionReservationExpired(targetActor, now);
}

/**
 * Build a new target conversion-reservation record. Pure.
 *
 * @param {object} params
 * @param {string} params.token
 * @param {string|null} [params.ownerActorId]
 * @param {string} params.slotId
 * @param {string|null} [params.userId]
 * @param {number} [params.now]
 * @param {number} [params.ttlMs]
 * @returns {object}
 */
export function buildTargetConversionReservation({
  token,
  ownerActorId = null,
  slotId,
  userId = null,
  now = Date.now(),
  ttlMs = FOLLOWER_CONVERSION_RESERVATION_TTL_MS
} = {}) {
  return { token, ownerActorId, slotId, userId, createdAt: now, expiresAt: now + ttlMs };
}
