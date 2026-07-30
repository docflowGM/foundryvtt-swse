/**
 * Follower Slot Service — GM-manual follower slot authority.
 *
 * `flags.foundryvtt-swse.followerSlots` is the single canonical follower
 * slot collection, already populated by talent grants (see
 * scripts/infrastructure/hooks/follower-hooks.js). This service adds one
 * more legitimate way to add an entry to that SAME array — a GM manually
 * granting a follower slot with no talent behind it — rather than creating
 * a second, parallel slot registry. A manual slot is a REAL follower slot:
 * same schema family, same reconciliation rules, same chargen/session-
 * seeding/finalization pipeline as a talent-granted slot. Its provenance
 * is simply `sourceType: 'gm-grant'` instead of a talent id, and it is
 * never assigned fake talent provenance to make it look like it came from
 * one.
 *
 * GM permission is enforced HERE, independently of whatever UI calls this
 * service. Hiding a button in the Allies app is not a security boundary —
 * a forged direct call from a non-GM client must still be rejected.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import {
  isFollowerSlotOccupied,
  resolveFollowerSlotReservation,
  isFollowerSlotReservationExpired,
  buildFollowerSlotReservation,
  resolveTargetConversionReservation,
  isTargetConversionReservationExpired,
  buildTargetConversionReservation,
  TARGET_CONVERSION_RESERVATION_FLAG_PATH,
  TARGET_CONVERSION_RESERVATION_DELETION_PATH
} from '/systems/foundryvtt-swse/scripts/domain/followers/follower-slot-occupancy.js';

const SYSTEM_ID = 'foundryvtt-swse';
const FOLLOWER_SLOTS_FLAG = 'followerSlots';
const MANUAL_SLOT_SOURCE_TYPE = 'gm-grant';
const DEFAULT_TEMPLATE_CHOICES = Object.freeze(['aggressive', 'defensive', 'utility']);

// Actor types currently approved to own follower slots. Deliberately the
// same two types scripts/infrastructure/hooks/follower-hooks.js#_isFollowerOwnerActor
// checks (kept as an independent, trivial predicate rather than an import,
// since that file transitively imports follower-creator.js — too heavy a
// dependency to pull into this service just for a two-branch type check).
const ELIGIBLE_OWNER_ACTOR_TYPES = new Set(['character', 'droid']);

function randomId() {
  return (typeof foundry !== 'undefined' ? foundry?.utils?.randomID?.() : null)
    ?? globalThis.crypto?.randomUUID?.()
    ?? Math.random().toString(36).slice(2);
}

/**
 * Whether an Actor type is currently eligible to receive a follower slot.
 * Pure — takes the type string directly so it is trivially testable
 * without a real Actor/Foundry environment.
 *
 * @param {string|null|undefined} actorType
 * @returns {boolean}
 */
export function isEligibleFollowerSlotOwnerType(actorType) {
  return ELIGIBLE_OWNER_ACTOR_TYPES.has(actorType);
}

/**
 * Whether an Actor instance is eligible to receive a follower slot.
 *
 * @param {Actor|null|undefined} actor
 * @returns {boolean}
 */
export function isEligibleFollowerSlotOwner(actor) {
  if (!actor) return false;
  return isEligibleFollowerSlotOwnerType(actor.type);
}

/**
 * Build one manual (GM-granted) follower slot. Pure — provenance fields
 * are explicit and never borrowed from a talent: `talentName`,
 * `talentItemId`, and `talentTreeId` are always null, and `sourceType` is
 * always `'gm-grant'`, so this slot can never be mistaken for (or
 * mis-reconciled as) a talent-granted one.
 *
 * @param {{grantedByUserId?: string|null, grantedByUserName?: string|null}} [options]
 * @returns {object} a follower slot in the canonical followerSlots shape.
 */
export function buildManualFollowerSlot(options = {}) {
  const now = Date.now();
  return {
    id: randomId(),
    sourceType: MANUAL_SLOT_SOURCE_TYPE,
    sourceId: null,
    sourceLabel: 'GM Granted',
    talentName: null,
    talentItemId: null,
    talentTreeId: null,
    dependentKind: 'follower',
    templateChoices: Array.from(DEFAULT_TEMPLATE_CHOICES),
    createdActorId: null,
    grantedByUserId: options.grantedByUserId ?? null,
    grantedByUserName: options.grantedByUserName ?? null,
    grantedAt: now,
    createdAt: now
  };
}

/**
 * Validate a manual-slot grant request before any mutation is attempted.
 * Pure — takes plain values, not live Foundry objects, so every branch is
 * directly testable.
 *
 * @param {{isGM: boolean, ownerExists: boolean, ownerType: string|null}} params
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateManualFollowerSlotGrant({ isGM, ownerExists, ownerType } = {}) {
  if (isGM !== true) {
    return { valid: false, error: 'Only a GM can add a follower slot.' };
  }
  if (!ownerExists) {
    return { valid: false, error: 'No owner Actor was provided.' };
  }
  if (!isEligibleFollowerSlotOwnerType(ownerType)) {
    return { valid: false, error: `Actor type "${ownerType}" is not eligible to receive a follower slot.` };
  }
  return { valid: true, error: null };
}

/**
 * Validate a manual-slot revocation request before any mutation is
 * attempted. Pure — same reasoning as validateManualFollowerSlotGrant.
 *
 * @param {{isGM: boolean, slot: object|null|undefined}} params
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateManualFollowerSlotRevocation({ isGM, slot } = {}) {
  if (isGM !== true) {
    return { valid: false, error: 'Only a GM can remove a follower slot.' };
  }
  if (!slot) {
    return { valid: false, error: 'That follower slot could not be found.' };
  }
  if (slot.sourceType !== MANUAL_SLOT_SOURCE_TYPE) {
    return { valid: false, error: 'Only a GM-granted manual slot can be removed this way — talent-granted slots are governed by their talent.' };
  }
  if (isFollowerSlotOccupied(slot)) {
    return { valid: false, error: 'An occupied follower slot cannot be removed directly. Dismiss or fire the follower first.' };
  }
  return { valid: true, error: null };
}

/**
 * Append a slot to a follower-slot array without mutating the input.
 *
 * @param {object[]} currentSlots
 * @param {object} slot
 * @returns {object[]}
 */
export function appendFollowerSlot(currentSlots = [], slot) {
  return [...(Array.isArray(currentSlots) ? currentSlots : []), slot];
}

/**
 * Remove a slot by id from a follower-slot array without mutating the
 * input.
 *
 * @param {object[]} currentSlots
 * @param {string} slotId
 * @returns {object[]}
 */
export function removeFollowerSlotById(currentSlots = [], slotId) {
  return (Array.isArray(currentSlots) ? currentSlots : []).filter(slot => slot?.id !== slotId);
}

export class FollowerSlotService {
  // Runtime-only in-flight guard, keyed by owner Actor id, so a
  // double-fired click event coalesces into one grant instead of two —
  // while two genuinely separate, sequential GM clicks each still produce
  // their own slot (the guard clears once the first request resolves).
  static _inFlightGrants = new Map();

  /**
   * Grant a new, empty, GM-manual follower slot to an owner Actor.
   *
   * @param {Actor} ownerActor
   * @param {{source?: string}} [options]
   * @returns {Promise<object>} the created slot
   * @throws {Error} if the caller is not a GM, the owner is missing, or the
   *   owner's Actor type is not currently eligible.
   */
  static async grantManualFollowerSlot(ownerActor, options = {}) {
    const validation = validateManualFollowerSlotGrant({
      isGM: game.user?.isGM === true,
      ownerExists: Boolean(ownerActor),
      ownerType: ownerActor?.type ?? null
    });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const guardKey = ownerActor.id;
    if (this._inFlightGrants.has(guardKey)) {
      swseLogger.log('[FollowerSlotService] Duplicate concurrent grant request for the same owner; awaiting the in-flight attempt instead of starting a second one.', { owner: ownerActor.name });
      return this._inFlightGrants.get(guardKey);
    }

    const grantPromise = this._grantManualFollowerSlotInternal(ownerActor, options);
    this._inFlightGrants.set(guardKey, grantPromise);
    grantPromise.finally(() => {
      if (this._inFlightGrants.get(guardKey) === grantPromise) {
        this._inFlightGrants.delete(guardKey);
      }
    });
    return grantPromise;
  }

  static async _grantManualFollowerSlotInternal(ownerActor, options = {}) {
    const currentSlots = Array.isArray(ownerActor.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG))
      ? ownerActor.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)
      : [];

    const slot = buildManualFollowerSlot({
      grantedByUserId: game.user?.id ?? null,
      grantedByUserName: game.user?.name ?? null
    });

    const nextSlots = appendFollowerSlot(currentSlots, slot);

    await ActorEngine.updateActor(ownerActor, {
      [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: nextSlots
    }, {
      source: options.source ? `FollowerSlotService.grantManualFollowerSlot:${options.source}` : 'FollowerSlotService.grantManualFollowerSlot'
    });

    swseLogger.log('[FollowerSlotService] Granted manual follower slot', { owner: ownerActor.name, slotId: slot.id });
    return slot;
  }

  /**
   * Revoke (remove) an empty, GM-manual follower slot.
   *
   * @param {Actor} ownerActor
   * @param {string} slotId
   * @param {{source?: string}} [options]
   * @returns {Promise<boolean>} true on success
   * @throws {Error} if the caller is not a GM, the slot does not exist, is
   *   not a manual slot, or is currently occupied.
   */
  static async revokeManualFollowerSlot(ownerActor, slotId, options = {}) {
    if (!ownerActor || !slotId) {
      throw new Error('revokeManualFollowerSlot requires an owner Actor and a slot id.');
    }

    const currentSlots = Array.isArray(ownerActor.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG))
      ? ownerActor.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)
      : [];
    const slot = currentSlots.find(s => s?.id === slotId) ?? null;

    const validation = validateManualFollowerSlotRevocation({
      isGM: game.user?.isGM === true,
      slot
    });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const nextSlots = removeFollowerSlotById(currentSlots, slotId);

    await ActorEngine.updateActor(ownerActor, {
      [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: nextSlots
    }, {
      source: options.source ? `FollowerSlotService.revokeManualFollowerSlot:${options.source}` : 'FollowerSlotService.revokeManualFollowerSlot'
    });

    swseLogger.log('[FollowerSlotService] Revoked manual follower slot', { owner: ownerActor.name, slotId });
    return true;
  }

  /**
   * PHASE 10 ADDENDUM (P2-3) — reserve a follower slot for an in-progress
   * conversion request, so a second concurrent request (a second GM
   * client, or a double-fired action) cannot also start converting an NPC
   * into the SAME slot before the first request finishes.
   *
   * Rereads the owner Actor and its slots fresh (never trusts a
   * caller-held, possibly-stale `ownerActor`/slot array), rejects an
   * occupied slot outright, rejects a slot already carrying a LIVE
   * reservation held by a DIFFERENT token, and allows an idempotent
   * same-token retry (a caller reattempting its own in-flight request)
   * to refresh its own reservation rather than being rejected by itself.
   * After writing the reservation, rereads the owner AGAIN and confirms
   * the slot's reservation still carries this token — a last-write-wins
   * race between two concurrent reservation attempts is not considered
   * safely acquired until this post-write reread confirms the caller
   * actually won it.
   *
   * @param {Actor} ownerActor
   * @param {string} slotId
   * @param {{token: string, operation?: string, targetActorId?: string|null}} params
   * @returns {Promise<object>} `{success: true, slotId, reservation}` or
   *   `{success: false, code, error, reservedByAnotherRequest?: true}`
   */
  static async reserveFollowerSlot(ownerActor, slotId, { token, operation = 'existing-npc-follower-conversion', targetActorId = null } = {}) {
    if (!ownerActor || !slotId || !token) {
      return { success: false, code: 'FOLLOWER_SLOT_RESERVATION_INVALID_REQUEST', error: 'reserveFollowerSlot requires an owner Actor, a slot id, and a token.' };
    }
    if (game.user?.isGM !== true) {
      return { success: false, code: 'FOLLOWER_SLOT_RESERVATION_FORBIDDEN', error: 'Only a GM can reserve a follower slot.' };
    }

    const freshOwner = game.actors?.get?.(ownerActor.id) ?? ownerActor;
    const now = Date.now();
    const currentSlots = Array.isArray(freshOwner.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG))
      ? freshOwner.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)
      : [];
    const slot = currentSlots.find(s => s?.id === slotId) ?? null;
    if (!slot) {
      return { success: false, code: 'FOLLOWER_SLOT_NOT_FOUND', error: 'That follower slot could not be found.' };
    }
    if (isFollowerSlotOccupied(slot)) {
      return { success: false, code: 'FOLLOWER_SLOT_OCCUPIED', error: 'That follower slot is already occupied.' };
    }

    const existingReservation = resolveFollowerSlotReservation(slot);
    const hasLiveReservation = existingReservation && !isFollowerSlotReservationExpired(slot, now);
    if (hasLiveReservation && existingReservation.token !== token) {
      return { success: false, code: 'FOLLOWER_SLOT_RESERVED', reservedByAnotherRequest: true, error: 'That follower slot is already reserved by another in-progress conversion.' };
    }

    const reservation = buildFollowerSlotReservation({
      token,
      operation,
      userId: game.user?.id ?? null,
      ownerActorId: freshOwner.id,
      targetActorId,
      slotId,
      now
    });
    const nextSlots = currentSlots.map(s => (s?.id === slotId ? { ...s, reservation } : s));

    await ActorEngine.updateActor(freshOwner, {
      [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: nextSlots
    }, { source: 'FollowerSlotService.reserveFollowerSlot' });

    const rereadOwner = game.actors?.get?.(freshOwner.id) ?? freshOwner;
    const rereadSlots = Array.isArray(rereadOwner.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG))
      ? rereadOwner.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)
      : [];
    const rereadSlot = rereadSlots.find(s => s?.id === slotId) ?? null;
    const rereadReservation = resolveFollowerSlotReservation(rereadSlot);
    if (!rereadReservation || rereadReservation.token !== token) {
      return { success: false, code: 'FOLLOWER_SLOT_RESERVED', reservedByAnotherRequest: true, error: 'Another request won the race for that follower slot.' };
    }

    swseLogger.log('[FollowerSlotService] Reserved follower slot for conversion', { owner: freshOwner.name, slotId, token });
    return { success: true, slotId, reservation: rereadReservation };
  }

  /**
   * Release a follower-slot reservation — TOKEN-CONDITIONAL only. A
   * caller can only clear a reservation carrying its OWN token; a
   * mismatched or already-cleared reservation is reported, never treated
   * as an error that masks the real cause of a failed conversion, but
   * this method NEVER clears a different request's live reservation.
   *
   * @param {Actor} ownerActor
   * @param {string} slotId
   * @param {string} token
   * @param {{source?: string}} [options]
   * @returns {Promise<object>} `{success: true}`, `{success: true, alreadyCleared: true}`,
   *   or `{success: false, code: 'FOLLOWER_SLOT_RESERVATION_TOKEN_MISMATCH', error}`
   */
  static async releaseFollowerSlotReservation(ownerActor, slotId, token, options = {}) {
    if (!ownerActor || !slotId || !token) {
      return { success: false, code: 'FOLLOWER_SLOT_RESERVATION_INVALID_REQUEST', error: 'releaseFollowerSlotReservation requires an owner Actor, a slot id, and a token.' };
    }

    const freshOwner = game.actors?.get?.(ownerActor.id) ?? ownerActor;
    const currentSlots = Array.isArray(freshOwner.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG))
      ? freshOwner.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)
      : [];
    const slot = currentSlots.find(s => s?.id === slotId) ?? null;
    const reservation = resolveFollowerSlotReservation(slot);
    if (!reservation) {
      return { success: true, alreadyCleared: true };
    }
    if (reservation.token !== token) {
      return { success: false, code: 'FOLLOWER_SLOT_RESERVATION_TOKEN_MISMATCH', error: 'Cannot release a follower-slot reservation held by a different request.' };
    }

    const nextSlots = currentSlots.map(s => {
      if (s?.id !== slotId) return s;
      const { reservation: _reservation, ...rest } = s;
      return rest;
    });

    await ActorEngine.updateActor(freshOwner, {
      [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: nextSlots
    }, { source: options.source ? `FollowerSlotService.releaseFollowerSlotReservation:${options.source}` : 'FollowerSlotService.releaseFollowerSlotReservation' });

    swseLogger.log('[FollowerSlotService] Released follower slot reservation', { owner: freshOwner.name, slotId });
    return { success: true };
  }

  /**
   * ROUND-2 CORRECTION (P2-3 concurrency-race audit) — reserve a
   * conversion TARGET (the existing NPC being converted), governed the
   * same way slot reservation is: reread fresh, reject a live
   * reservation held by a different token, write via ActorEngine, THEN
   * reread AGAIN and verify the token survived before reporting success.
   *
   * A prior version of this reservation was written with a single,
   * unchecked `ActorEngine.updateActor()` call directly in
   * `AllyAssignmentService.convertToFollower()` and never rereread —
   * two concurrent requests could both believe they held the target
   * reservation. This method is now the ONLY way the target reservation
   * is written or read for acquisition purposes.
   *
   * @param {Actor} targetActor
   * @param {{token: string, ownerActorId?: string|null, slotId: string}} params
   * @returns {Promise<object>} `{success: true, reservation}` or
   *   `{success: false, code, error, reservedByAnotherRequest?: true}`
   */
  static async reserveFollowerConversionTarget(targetActor, { token, ownerActorId = null, slotId } = {}) {
    if (!targetActor || !token || !slotId) {
      return { success: false, code: 'FOLLOWER_TARGET_RESERVATION_INVALID_REQUEST', error: 'reserveFollowerConversionTarget requires a target Actor, a token, and a slot id.' };
    }
    if (game.user?.isGM !== true) {
      return { success: false, code: 'FOLLOWER_TARGET_RESERVATION_FORBIDDEN', error: 'Only a GM can reserve a conversion target.' };
    }

    const freshTarget = game.actors?.get?.(targetActor.id) ?? targetActor;
    const now = Date.now();
    const existingReservation = resolveTargetConversionReservation(freshTarget);
    if (existingReservation && !isTargetConversionReservationExpired(freshTarget, now) && existingReservation.token !== token) {
      return { success: false, code: 'FOLLOWER_TARGET_RESERVED', reservedByAnotherRequest: true, error: 'This NPC is already reserved by another in-progress conversion.' };
    }

    const reservation = buildTargetConversionReservation({ token, ownerActorId, slotId, userId: game.user?.id ?? null, now });
    await ActorEngine.updateActor(freshTarget, {
      [TARGET_CONVERSION_RESERVATION_FLAG_PATH]: reservation
    }, { source: 'FollowerSlotService.reserveFollowerConversionTarget' });

    const rereadTarget = game.actors?.get?.(freshTarget.id) ?? freshTarget;
    const rereadReservation = resolveTargetConversionReservation(rereadTarget);
    if (!rereadReservation || rereadReservation.token !== token) {
      return { success: false, code: 'FOLLOWER_TARGET_RESERVED', reservedByAnotherRequest: true, error: 'Another request won the race for this conversion target.' };
    }

    swseLogger.log('[FollowerSlotService] Reserved conversion target', { target: freshTarget.name, slotId, token });
    return { success: true, reservation: rereadReservation };
  }

  /**
   * Release a target conversion reservation — TOKEN-CONDITIONAL only,
   * same policy as `releaseFollowerSlotReservation()`.
   *
   * @param {Actor} targetActor
   * @param {string} token
   * @param {{source?: string}} [options]
   * @returns {Promise<object>}
   */
  static async releaseFollowerConversionTargetReservation(targetActor, token, options = {}) {
    if (!targetActor || !token) {
      return { success: false, code: 'FOLLOWER_TARGET_RESERVATION_INVALID_REQUEST', error: 'releaseFollowerConversionTargetReservation requires a target Actor and a token.' };
    }

    const freshTarget = game.actors?.get?.(targetActor.id) ?? targetActor;
    const reservation = resolveTargetConversionReservation(freshTarget);
    if (!reservation) {
      return { success: true, alreadyCleared: true };
    }
    if (reservation.token !== token) {
      return { success: false, code: 'FOLLOWER_TARGET_RESERVATION_TOKEN_MISMATCH', error: 'Cannot release a target reservation held by a different request.' };
    }

    await ActorEngine.updateActor(freshTarget, {
      [TARGET_CONVERSION_RESERVATION_DELETION_PATH]: null
    }, { source: options.source ? `FollowerSlotService.releaseFollowerConversionTargetReservation:${options.source}` : 'FollowerSlotService.releaseFollowerConversionTargetReservation' });

    swseLogger.log('[FollowerSlotService] Released target conversion reservation', { target: freshTarget.name });
    return { success: true };
  }

  /**
   * ROUND-2 CORRECTION — dual-token verification, meant to be called
   * immediately before EVERY destructive phase of a conversion (target
   * metadata mutation, follower derivation, final slot/owner commit) —
   * not just once at acquisition time. Foundry's `Document#update()` has
   * no compare-and-swap primitive this codebase can rely on, so
   * acquisition alone is provisional: two concurrent requests can both
   * observe their own token as "acquired" in the brief window before a
   * later write overwrites the earlier one. Rereading and reverifying
   * BOTH tokens right before each destructive step closes that window
   * down to the time between this check and the next mutation, rather
   * than trusting a single acquisition-time check for the whole
   * multi-step conversion.
   *
   * This is an HONEST, OPTIMISTIC protocol — repeated verification plus
   * after-the-fact compensation — NOT a database lock or a globally
   * atomic transaction. It cannot guarantee only one of two truly
   * simultaneous requests ever begins mutating; it guarantees that a
   * request whose token has been superseded is detected before its NEXT
   * destructive step and aborts (with compensation) rather than
   * finishing silently.
   *
   * @param {object} params
   * @param {Actor} params.ownerActor
   * @param {Actor} params.targetActor
   * @param {string} params.slotId
   * @param {string} params.token
   * @returns {Promise<{success: boolean, slotOk: boolean, targetOk: boolean, code: string|null}>}
   */
  static async verifyFollowerConversionReservations({ ownerActor, targetActor, slotId, token }) {
    const freshOwner = game.actors?.get?.(ownerActor?.id) ?? ownerActor;
    const slots = Array.isArray(freshOwner?.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG))
      ? freshOwner.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)
      : [];
    const slot = slots.find(s => s?.id === slotId) ?? null;
    const slotReservation = resolveFollowerSlotReservation(slot);
    const slotOk = Boolean(slotReservation) && !isFollowerSlotReservationExpired(slot) && slotReservation.token === token;

    const freshTarget = game.actors?.get?.(targetActor?.id) ?? targetActor;
    const targetReservation = resolveTargetConversionReservation(freshTarget);
    const targetOk = Boolean(targetReservation) && !isTargetConversionReservationExpired(freshTarget) && targetReservation.token === token;

    return {
      success: slotOk && targetOk,
      slotOk,
      targetOk,
      code: !slotOk ? 'FOLLOWER_SLOT_RESERVATION_LOST' : (!targetOk ? 'FOLLOWER_TARGET_RESERVATION_LOST' : null)
    };
  }
}
