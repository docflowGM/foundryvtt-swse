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
