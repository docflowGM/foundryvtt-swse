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
  if (slot.createdActorId) {
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
}
