/**
 * Follower Talent Auto-Detach Plan — pure builders for the multi-step
 * transaction follower-hooks.js runs when a follower-granting talent is
 * deleted while exactly one follower currently occupies its slot.
 *
 * Extracted so the DATA side of the auto-detach operation (which items to
 * delete, what the owner-registry before/after patches look like, what the
 * slot-removal before/after patches look like) is a pure, dependency-free
 * module that can be loaded and tested under plain Node — unlike
 * follower-hooks.js itself, which transitively imports FollowerManager/
 * MinionManager and reaches `foundry.applications.api`, so it cannot load
 * in the Foundry-shim Node harness. The actual ActorEngine calls (and the
 * transaction step wiring) stay in follower-hooks.js; this module only
 * decides WHAT those calls should write and how to undo it.
 */

import { getSwseFlag } from '/systems/foundryvtt-swse/scripts/utils/flags/swse-flags.js';

/**
 * Which of a follower's items were granted by a specific talent item, and so
 * must be deleted when that talent is removed.
 *
 * @param {Array<{id: string}>} items
 * @param {string} talentItemId
 * @returns {string[]} item ids to delete
 */
export function computeGrantedItemIdsForTalent(items = [], talentItemId) {
  return (Array.isArray(items) ? items : [])
    .filter(item => getSwseFlag(item, 'grantedByTalent')?.talentItemId === talentItemId)
    .map(item => item.id)
    .filter(Boolean);
}

/**
 * Build the commit/rollback patch pair for detaching a follower from every
 * owner-side dependent registry that can reference it. Pure — takes the
 * exact pre-mutation arrays and returns both directions explicitly, so the
 * caller never has to recompute "current minus target" from potentially
 * stale live state at rollback time.
 *
 * @param {{ownedActors?: object[], followers?: object[], minions?: object[], followerActorId: string}} params
 * @returns {{commitPatch: object, rollbackPatch: object}}
 */
export function buildOwnerRegistryDetachPatch({ ownedActors = [], followers = [], minions = [], followerActorId } = {}) {
  const safeOwnedActors = Array.isArray(ownedActors) ? ownedActors : [];
  const safeFollowers = Array.isArray(followers) ? followers : [];
  const safeMinions = Array.isArray(minions) ? minions : [];

  const nextOwnedActors = safeOwnedActors.filter(entry => entry?.id !== followerActorId);
  const nextFollowers = safeFollowers.filter(entry => entry?.id !== followerActorId);
  const nextMinions = safeMinions.filter(entry => entry?.id !== followerActorId);

  return {
    commitPatch: {
      'system.ownedActors': nextOwnedActors,
      'flags.foundryvtt-swse.followers': nextFollowers,
      'flags.foundryvtt-swse.minions': nextMinions
    },
    rollbackPatch: {
      'system.ownedActors': safeOwnedActors,
      'flags.foundryvtt-swse.followers': safeFollowers,
      'flags.foundryvtt-swse.minions': safeMinions
    }
  };
}

/**
 * Build the before/after follower-slot arrays for removing one slot by id.
 * Pure — never mutates the input array.
 *
 * @param {object[]} slots
 * @param {string} slotId
 * @returns {{remainingSlots: object[], rollbackSlots: object[]}}
 */
export function buildSlotRemovalPatch(slots = [], slotId) {
  const safeSlots = Array.isArray(slots) ? slots : [];
  return {
    remainingSlots: safeSlots.filter(slot => slot?.id !== slotId),
    rollbackSlots: safeSlots
  };
}
