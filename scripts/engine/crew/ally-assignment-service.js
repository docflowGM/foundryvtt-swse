/**
 * Ally Assignment Service — GM existing-NPC assignment authority.
 *
 * Two deliberately separate outcomes for taking an existing world NPC Actor
 * into a player character's Allies:
 *
 *   - assignAsAlly()      — relationship-only. The NPC keeps its current
 *                           stats, does not consume a follower slot, is not
 *                           level-synced, and is not converted into follower
 *                           progression. Reversible via unassignAlly().
 *   - convertToFollower()  — a genuinely mechanical, atomic migration.
 *                           Consumes one open follower slot from the SAME
 *                           canonical flags.foundryvtt-swse.followerSlots
 *                           array FollowerSlotService/talent grants already
 *                           use, applies the follower metadata AND runs
 *                           follower derivation/materialization as ONE
 *                           transaction — a derivation failure rolls
 *                           EVERYTHING back (target snapshot restored, every
 *                           owner projection restored, the slot left open).
 *                           Conversion is never reported as successful on
 *                           metadata alone.
 *
 * Assignment is reversible relationship metadata; conversion is an explicit
 * mechanical migration. The two must never be conflated, and an Actor must
 * never simultaneously appear as both an assigned ally/beast AND a
 * mechanical follower — convertToFollower() removes any prior assignment
 * projection as part of the SAME atomic transaction that adds the follower
 * projection.
 *
 * GM permission (`game.user.isGM === true`) is enforced HERE, independently
 * of whatever UI or drag/drop handler calls this service.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { isDroidStatblockMode } from '/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js';
import {
  resolveFollowerSlotActorId,
  isFollowerSlotOccupied,
  finalizeReservedFollowerSlot,
  resolveTargetConversionReservation,
  isTargetConversionReservationExpired,
  buildTargetConversionReservation,
  TARGET_CONVERSION_RESERVATION_FLAG_PATH
} from '/systems/foundryvtt-swse/scripts/domain/followers/follower-slot-occupancy.js';
import { SnapshotManager } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js';
import {
  runFollowerMutationTransaction,
  buildFollowerLinkOwnerUpdate,
  buildFlagRestorationPatch
} from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-mutation-transaction.js';
import { isEligibleFollowerSlotOwnerType, FollowerSlotService } from './follower-slot-service.js';

const SYSTEM_ID = 'foundryvtt-swse';
const FOLLOWER_SLOTS_FLAG = 'followerSlots';
const ASSIGNED_ALLIES_FLAG = 'assignedAllies';
const BEASTS_FLAG = 'beasts';

function randomId() {
  return (typeof foundry !== 'undefined' ? foundry?.utils?.randomID?.() : null)
    ?? globalThis.crypto?.randomUUID?.()
    ?? Math.random().toString(36).slice(2);
}

export const ASSIGNMENT_MODE = Object.freeze({ ALLY: 'ally' });

export const ASSIGNMENT_KIND = Object.freeze({
  BEAST: 'assigned-beast',
  NONHEROIC: 'assigned-nonheroic',
  DROID: 'assigned-droid',
  HEROIC_NPC: 'assigned-heroic-npc',
  OTHER: 'assigned-npc'
});

// Same two target actor types every other write authority in this file
// family (FollowerSlotService) treats as legitimate follower-slot owners —
// duplicated here (rather than sharing a bigger predicate) because this is
// the one place both an owner-type AND a target-type check are needed.
const ELIGIBLE_TARGET_ACTOR_TYPES = new Set(['npc', 'character', 'droid']);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clonePlain(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function appendUnique(list, entry, idOf = (e) => e?.id || e?.actorId) {
  const id = idOf(entry);
  const filtered = asArray(list).filter(existing => idOf(existing) !== id);
  return [...filtered, entry];
}

function removeById(list, id, idOf = (e) => e?.id || e?.actorId) {
  return asArray(list).filter(existing => idOf(existing) !== id);
}

function assignmentFlagKeyForKind(detectedKind) {
  return detectedKind === ASSIGNMENT_KIND.BEAST ? BEASTS_FLAG : ASSIGNED_ALLIES_FLAG;
}

/**
 * Whether an Actor type is eligible to be assigned as an ally target.
 * Pure. Vehicles, starships, and hazards are deliberately excluded.
 *
 * @param {string|null|undefined} actorType
 * @returns {boolean}
 */
export function isEligibleAssignmentTargetType(actorType) {
  return ELIGIBLE_TARGET_ACTOR_TYPES.has(actorType);
}

/**
 * Pure classification of what kind of assigned-ally relationship a target
 * Actor represents, from plain extracted facts (no live Foundry object).
 *
 * @param {{actorType?: string, isBeastFlagged?: boolean, isNonheroic?: boolean}} facts
 * @returns {string} one of ASSIGNMENT_KIND's values
 */
export function detectAssignmentKindFromFacts({ actorType, isBeastFlagged, isNonheroic } = {}) {
  if (isBeastFlagged) return ASSIGNMENT_KIND.BEAST;
  if (actorType === 'droid') return ASSIGNMENT_KIND.DROID;
  if (isNonheroic) return ASSIGNMENT_KIND.NONHEROIC;
  if (actorType === 'npc') return ASSIGNMENT_KIND.HEROIC_NPC;
  return ASSIGNMENT_KIND.OTHER;
}

function isNonheroicTarget(actor) {
  if (!actor) return false;
  if (actor.system?.isMinion === true || actor.system?.progression?.isMinion === true) return true;
  const className = String(actor.system?.class || actor.system?.className || '').toLowerCase();
  if (className.includes('nonheroic')) return true;
  if (asArray(actor.system?.progression?.classLevels).some(c => String(c?.classId || c?.class || c?.name || '').toLowerCase().includes('nonheroic'))) return true;
  return asArray(actor.items).some(item => item?.type === 'class' && String(item.name || '').toLowerCase().includes('nonheroic'));
}

function isBeastTarget(actor) {
  if (!actor) return false;
  const kind = String(actor.system?.npcProfile?.kind || actor.flags?.swse?.beast?.kind || actor.system?.kind || '').toLowerCase();
  return kind === 'beast';
}

/**
 * Classify a live target Actor into an ASSIGNMENT_KIND. Thin wrapper around
 * detectAssignmentKindFromFacts — the pure function is what's directly
 * unit-tested.
 *
 * @param {Actor} targetActor
 * @returns {string}
 */
export function detectAssignmentKind(targetActor) {
  return detectAssignmentKindFromFacts({
    actorType: targetActor?.type ?? null,
    isBeastFlagged: isBeastTarget(targetActor),
    isNonheroic: isNonheroicTarget(targetActor)
  });
}

/**
 * Whether a target Actor is already a mechanical follower, checked across
 * every field family the follower model itself writes over its lifecycle
 * (canonical progression fields plus both the legacy `flags.swse.follower`
 * namespace and this system's own `flags.foundryvtt-swse.isFollower`
 * provenance flag). Used to block an existing follower from being
 * assigned as a second, conflicting relationship-only ally OR converted
 * again into a second follower slot.
 *
 * @param {Actor} targetActor
 * @returns {boolean}
 */
export function isTargetAlreadyFollower(targetActor) {
  if (!targetActor) return false;
  if (targetActor.system?.isFollower === true) return true;
  if (targetActor.system?.progression?.isFollower === true) return true;
  if (targetActor.flags?.swse?.follower?.isFollower === true) return true;
  if (targetActor.getFlag?.(SYSTEM_ID, 'isFollower') === true) return true;
  return false;
}

/**
 * Canonical existing-follower detection. Checks every field family
 * isTargetAlreadyFollower already checks (the target's OWN flags), then —
 * because those flags can be absent or stale relative to the actual
 * registries (a slot can still reference an Actor whose own flags were
 * never written, or were cleared by an unrelated data edit) — scans every
 * world Actor's `followerSlots[].createdActorId` and `flags.*.followers`
 * list for a reference to this target. This is the check the service
 * boundary uses so a target cannot be converted into (or occupy) a second
 * follower slot merely because its own flags are inconsistent with the
 * registries that actually track it.
 *
 * Uses resolveFollowerSlotActorId() (the same alias-aware occupant
 * resolver AlliesSurfaceService's rehire/beast-conversion paths write
 * through — createdActorId, actorId, assignedActorId, dependentActorId,
 * npcActorId) rather than checking `slot.createdActorId` directly, so a
 * slot occupied via any of those alternate fields is still detected here
 * instead of reading as "open" and allowing a second conversion into it.
 * Scans every owner (not just the first match) so a target referenced by
 * more than one owner's registry — a genuine data inconsistency — is
 * reported as a conflict instead of silently returning whichever owner
 * happened to be visited first.
 *
 * @param {Actor} targetActor
 * @returns {{isFollower: boolean, ownerId: string|null, ownerActorId: string|null, ownerName: string|null, slotId: string|null, source: string|null, sources: string[], conflicts: Array<{ownerId: string, ownerName: string|null, source: string}>}}
 */
export function findExistingFollowerRelationship(targetActor) {
  const empty = { isFollower: false, ownerId: null, ownerActorId: null, ownerName: null, slotId: null, source: null, sources: [], conflicts: [] };
  if (!targetActor) return empty;

  const matches = [];

  if (isTargetAlreadyFollower(targetActor)) {
    const ownerId = targetActor.flags?.swse?.follower?.ownerId
      ?? targetActor.getFlag?.(SYSTEM_ID, 'followerOwnerId')
      // R4-3: the target's own npcProfile owner-metadata is the other field
      // family getFollowers()'s world-scan already treats as follower
      // ownership evidence (paired with an isFollower flag) — checked here
      // too so the two lookups can never disagree about a target whose own
      // metadata uses this field instead of flags.swse.follower.ownerId.
      ?? targetActor.system?.npcProfile?.owner?.actorId
      ?? null;
    const ownerActor = ownerId ? game.actors?.get?.(ownerId) ?? null : null;
    matches.push({ ownerId, ownerName: ownerActor?.name ?? null, slotId: null, source: 'target-flags' });
  }

  // game.actors is a real Foundry Collection (iterable, not an Array) in
  // production and in this repo's Foundry-shim test fakes alike — iterate
  // it directly rather than through asArray() (which only recognizes true
  // Arrays and would silently treat any Collection/Map-like as empty).
  const targetId = targetActor.id;
  for (const owner of (game.actors ? Array.from(game.actors) : [])) {
    if (!owner || owner.id === targetId) continue;
    const slots = asArray(owner.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG));
    const occupiedSlot = slots.find(slot => resolveFollowerSlotActorId(slot) === targetId);
    if (occupiedSlot) {
      matches.push({ ownerId: owner.id, ownerName: owner.name, slotId: occupiedSlot.id ?? null, source: 'follower-slot-registry' });
    }
    const followers = asArray(owner.getFlag?.(SYSTEM_ID, 'followers'));
    if (followers.some(entry => (entry?.id || entry?.actorId) === targetId)) {
      matches.push({ ownerId: owner.id, ownerName: owner.name, slotId: null, source: 'owner-followers-registry' });
    }
    // R4-3: system.ownedActors entries are shared by BOTH relationship-only
    // assigned allies (kind always one of ASSIGNMENT_KIND's 'assigned-*'
    // values, never 'follower') and genuine followers (no kind field at
    // all, or kind/dependentKind/npcKind === 'follower' — the same
    // convention FollowerCreator.getFollowers()'s own ownedActors scan
    // already relies on). Filtering on that convention here means an
    // assigned-only ally is never misclassified as a follower, while a
    // stale/legacy follower entry with no local target flags is still
    // caught — closing the gap where getFollowers() and this canonical
    // conflict detector could disagree about the same Actor.
    const ownedActors = asArray(owner.system?.ownedActors);
    const ownedActorFollowerEntry = ownedActors.find(entry => {
      if (entry?.id !== targetId) return false;
      const kind = entry?.kind || entry?.dependentKind || entry?.npcKind;
      return !kind || kind === 'follower';
    });
    if (ownedActorFollowerEntry) {
      matches.push({ ownerId: owner.id, ownerName: owner.name, slotId: null, source: 'owner-ownedactors-registry' });
    }
  }

  if (!matches.length) return empty;

  const [primary] = matches;
  const distinctOwners = new Set(matches.map(m => m.ownerId));
  const conflicts = distinctOwners.size > 1
    ? matches.filter(m => m.ownerId !== primary.ownerId)
    : [];

  return {
    isFollower: true,
    ownerId: primary.ownerId,
    ownerActorId: primary.ownerId,
    ownerName: primary.ownerName,
    slotId: primary.slotId,
    source: primary.source,
    sources: matches.map(m => m.source),
    conflicts
  };
}

/**
 * Whether a target Actor is an active player character rather than a
 * GM-authored NPC that merely uses the `character` Actor type — checked
 * three ways: assigned as any User's primary `character`; owned at OWNER
 * level (or above) by any non-GM User; or the sameActor check elsewhere
 * already covers self-assignment. A GM-authored `character`-type NPC with
 * no player owner and no User assignment passes this check.
 *
 * @param {Actor} targetActor
 * @param {{users?: Iterable<object>}} [context]
 * @returns {boolean}
 */
export function isActivePlayerCharacter(targetActor, { users } = {}) {
  if (!targetActor) return false;
  const userList = users ? Array.from(users) : [];
  if (userList.some(u => u?.character?.id === targetActor.id)) return true;
  const ownerLevel = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  const ownership = targetActor.ownership || {};
  for (const user of userList) {
    if (user?.isGM) continue;
    const level = ownership[user?.id];
    if (typeof level === 'number' && level >= ownerLevel) return true;
  }
  return false;
}

/**
 * Pure eligibility gate for assigning targetActor to ownerActor. Takes
 * plain extracted values, not live Foundry objects, so every branch is
 * directly testable.
 *
 * An Actor already assigned to a DIFFERENT owner is always blocked
 * (exclusive-assignment policy) — the reciprocal target schema stores only
 * one `assignedAllyOwnerId`, so silently overwriting it would strand the
 * previous owner's relationship record. A GM must unassign (or, in a future
 * phase, explicitly transfer) before reassigning to a different owner.
 *
 * @returns {{eligible: boolean, reasons: string[]}}
 */
export function evaluateAssignmentEligibilityFacts({
  isGM,
  ownerExists,
  ownerType,
  targetExists,
  targetType,
  sameActor,
  alreadyAssignedOwnerId,
  alreadyAssignedMode,
  ownerId,
  mode,
  existingFollowerRelationship,
  isActivePlayerCharacter
} = {}) {
  const reasons = [];
  if (isGM !== true) reasons.push('Only a GM can assign an existing NPC.');
  if (!ownerExists) reasons.push('No owner Actor was provided.');
  else if (!isEligibleFollowerSlotOwnerType(ownerType)) reasons.push(`Actor type "${ownerType}" is not eligible to receive an assigned ally.`);
  if (!targetExists) reasons.push('No target Actor was provided.');
  else if (!isEligibleAssignmentTargetType(targetType)) reasons.push(`Actor type "${targetType}" cannot be assigned — vehicles, starships, and hazards are not supported.`);
  if (sameActor) reasons.push('An Actor cannot be assigned to itself.');
  if (alreadyAssignedOwnerId && ownerId) {
    if (alreadyAssignedOwnerId === ownerId && alreadyAssignedMode === mode) {
      reasons.push('This Actor is already assigned to this owner in this relationship mode.');
    } else if (alreadyAssignedOwnerId !== ownerId) {
      reasons.push('This Actor is already assigned to a different owner. Unassign it from that owner first.');
    }
  }
  if (existingFollowerRelationship?.isFollower) {
    reasons.push(existingFollowerRelationship.ownerName
      ? `This Actor is already a follower of ${existingFollowerRelationship.ownerName} and cannot also be assigned as a relationship-only ally.`
      : 'This Actor is already a mechanical follower and cannot also be assigned as a relationship-only ally.');
  }
  if (isActivePlayerCharacter) reasons.push('This Actor is an active player character and cannot be assigned through this tool.');
  return { eligible: reasons.length === 0, reasons };
}

/**
 * Evaluate whether targetActor may be assigned to ownerActor. Thin wrapper
 * around evaluateAssignmentEligibilityFacts.
 *
 * @param {Actor} ownerActor
 * @param {Actor} targetActor
 * @param {string} [mode] one of ASSIGNMENT_MODE's values
 * @returns {{eligible: boolean, reasons: string[], detectedKind: string}}
 */
export function evaluateNpcAssignmentEligibility(ownerActor, targetActor, mode = ASSIGNMENT_MODE.ALLY) {
  const facts = evaluateAssignmentEligibilityFacts({
    isGM: game.user?.isGM === true,
    ownerExists: Boolean(ownerActor),
    ownerType: ownerActor?.type ?? null,
    ownerId: ownerActor?.id ?? null,
    targetExists: Boolean(targetActor),
    targetType: targetActor?.type ?? null,
    sameActor: Boolean(ownerActor && targetActor && ownerActor.id === targetActor.id),
    alreadyAssignedOwnerId: targetActor?.getFlag?.(SYSTEM_ID, 'assignedAllyOwnerId') ?? null,
    alreadyAssignedMode: targetActor?.getFlag?.(SYSTEM_ID, 'assignedAllyMode') ?? null,
    mode,
    existingFollowerRelationship: findExistingFollowerRelationship(targetActor),
    isActivePlayerCharacter: isActivePlayerCharacter(targetActor, { users: game.users })
  });
  return { ...facts, detectedKind: targetActor ? detectAssignmentKind(targetActor) : null };
}

/**
 * Pure eligibility gate for CONVERTING targetActor into ownerActor's
 * follower. Deliberately separate from evaluateAssignmentEligibilityFacts:
 * an Actor already assigned to THIS SAME owner as a relationship-only ally
 * is NOT rejected here (conversion is the one, explicit path that migrates
 * exactly that relationship into a mechanical follower, cleaning up the
 * prior assignment as part of the same atomic transaction) — only a
 * DIFFERENT owner's assignment blocks conversion. An Actor that is already
 * a mechanical follower, or an active player character, is blocked from
 * conversion the same way it is blocked from assignment.
 *
 * @returns {{eligible: boolean, reasons: string[]}}
 */
export function evaluateFollowerConversionEligibilityFacts({
  isGM,
  ownerExists,
  ownerType,
  targetExists,
  targetType,
  sameActor,
  alreadyAssignedOwnerId,
  ownerId,
  existingFollowerRelationship,
  isActivePlayerCharacter
} = {}) {
  const reasons = [];
  if (isGM !== true) reasons.push('Only a GM can convert an existing NPC to a follower.');
  if (!ownerExists) reasons.push('No owner Actor was provided.');
  else if (!isEligibleFollowerSlotOwnerType(ownerType)) reasons.push(`Actor type "${ownerType}" is not eligible to receive a follower.`);
  if (!targetExists) reasons.push('No target Actor was provided.');
  else if (!isEligibleAssignmentTargetType(targetType)) reasons.push(`Actor type "${targetType}" cannot be converted — vehicles, starships, and hazards are not supported.`);
  if (sameActor) reasons.push('An Actor cannot be converted into its own follower.');
  if (alreadyAssignedOwnerId && ownerId && alreadyAssignedOwnerId !== ownerId) {
    reasons.push('This Actor is assigned to a different owner. Unassign it from that owner before converting it.');
  }
  if (existingFollowerRelationship?.isFollower) {
    reasons.push(existingFollowerRelationship.ownerName
      ? `This Actor is already a follower of ${existingFollowerRelationship.ownerName} and cannot be converted again into a second follower slot.`
      : 'This Actor is already a mechanical follower and cannot be converted again into a second follower slot.');
  }
  if (isActivePlayerCharacter) reasons.push('This Actor is an active player character and cannot be converted through this tool.');
  return { eligible: reasons.length === 0, reasons };
}

/**
 * Evaluate whether targetActor may be CONVERTED into ownerActor's
 * follower. Thin wrapper around evaluateFollowerConversionEligibilityFacts —
 * the pure function is what's directly unit-tested. Does not check the
 * droid stock-conversion gate or slot validity — those remain separate,
 * orthogonal checks (evaluateDroidConversionGate / validateFollowerConversionSlot).
 *
 * @param {Actor} ownerActor
 * @param {Actor} targetActor
 * @returns {{eligible: boolean, reasons: string[], detectedKind: string}}
 */
export function evaluateFollowerConversionEligibility(ownerActor, targetActor) {
  const facts = evaluateFollowerConversionEligibilityFacts({
    isGM: game.user?.isGM === true,
    ownerExists: Boolean(ownerActor),
    ownerType: ownerActor?.type ?? null,
    ownerId: ownerActor?.id ?? null,
    targetExists: Boolean(targetActor),
    targetType: targetActor?.type ?? null,
    sameActor: Boolean(ownerActor && targetActor && ownerActor.id === targetActor.id),
    alreadyAssignedOwnerId: targetActor?.getFlag?.(SYSTEM_ID, 'assignedAllyOwnerId') ?? null,
    existingFollowerRelationship: findExistingFollowerRelationship(targetActor),
    isActivePlayerCharacter: isActivePlayerCharacter(targetActor, { users: game.users })
  });
  return { ...facts, detectedKind: targetActor ? detectAssignmentKind(targetActor) : null };
}

/**
 * Pure builder for the owner-side relationship link record. Mirrors the
 * shape scripts/ui/shell/AlliesSurfaceService.js's pre-existing
 * assignDroppedActor() already produced for 'assigned-nonheroic' — this
 * generalizes it to every ASSIGNMENT_KIND without changing that shape.
 *
 * @returns {object}
 */
export function buildAllyAssignmentLink({ targetActor, detectedKind }) {
  return {
    id: targetActor.id,
    uuid: targetActor.uuid,
    name: targetActor.name,
    type: targetActor.type,
    kind: detectedKind,
    dependentKind: detectedKind,
    img: targetActor.img,
    talent: 'GM Assignment',
    syncMode: 'manual',
    assignedAt: Date.now()
  };
}

/**
 * Pure builder for the reciprocal metadata written onto the target Actor
 * when assigning it as an ally. Deliberately relationship-only — no
 * `system.*`/follower-progression field ever appears here (statically
 * enforced by tools/check-ally-assignment-authority.mjs check 3).
 *
 * @returns {object} a flags.foundryvtt-swse.* patch (dot-path keys)
 */
export function buildAssignmentTargetFlagPatch({ ownerActor, detectedKind, mode }) {
  return {
    [`flags.${SYSTEM_ID}.assignedAllyOwnerId`]: ownerActor.id,
    [`flags.${SYSTEM_ID}.assignedAllyKind`]: detectedKind,
    [`flags.${SYSTEM_ID}.assignedAllyMode`]: mode,
    [`flags.${SYSTEM_ID}.assignedAllySource`]: 'GM Assignment',
    [`flags.${SYSTEM_ID}.assignedAllySyncMode`]: 'manual',
    [`flags.${SYSTEM_ID}.-=dismissedAlly`]: null
  };
}

/**
 * Pure builder for the patch that clears every reciprocal assigned-ally
 * flag from a target Actor. Symmetric with buildAssignmentTargetFlagPatch —
 * used both as unassignAlly's forward commit and as assignAsAlly's
 * target-metadata-commit rollback.
 *
 * @returns {object} a flags.foundryvtt-swse.* deletion patch
 */
export function buildAssignmentClearPatch() {
  return {
    [`flags.${SYSTEM_ID}.-=assignedAllyOwnerId`]: null,
    [`flags.${SYSTEM_ID}.-=assignedAllyKind`]: null,
    [`flags.${SYSTEM_ID}.-=assignedAllyMode`]: null,
    [`flags.${SYSTEM_ID}.-=assignedAllySource`]: null,
    [`flags.${SYSTEM_ID}.-=assignedAllySyncMode`]: null
  };
}

/**
 * Pure builder for the owner-side write when assigning an ally — one of
 * the two owner arrays (beasts, or assignedAllies for everything else)
 * plus system.ownedActors, so both owner projections commit together.
 *
 * @returns {object} an ActorEngine.updateActor() data payload
 */
export function buildOwnerAssignmentUpdate({ ownerActor, link, detectedKind }) {
  const nextOwnedActors = appendUnique(ownerActor.system?.ownedActors, link);
  const update = { 'system.ownedActors': nextOwnedActors };
  update[`flags.${SYSTEM_ID}.${assignmentFlagKeyForKind(detectedKind)}`] = appendUnique(ownerActor.getFlag?.(SYSTEM_ID, assignmentFlagKeyForKind(detectedKind)), link);
  return update;
}

/**
 * Pure builder for the owner-side write that removes one target from an
 * owner's ownedActors/assignment-kind arrays, given whatever arrays are
 * passed in. Retained as a standalone, independently-testable helper;
 * unassignAlly() and assignAsAlly()'s rollback both capture their own
 * pre-mutation array snapshots inline instead of calling this against
 * live Actor state, so a rollback restores the exact prior arrays rather
 * than recomputing "current minus target" against whatever the passed-in
 * Actor object happens to reflect at rollback time.
 *
 * @returns {object} an ActorEngine.updateActor() data payload
 */
export function buildOwnerUnassignmentUpdate({ ownerActor, targetActorId, detectedKind }) {
  const nextOwnedActors = removeById(ownerActor.system?.ownedActors, targetActorId);
  const update = { 'system.ownedActors': nextOwnedActors };
  update[`flags.${SYSTEM_ID}.${assignmentFlagKeyForKind(detectedKind)}`] = removeById(ownerActor.getFlag?.(SYSTEM_ID, assignmentFlagKeyForKind(detectedKind)), targetActorId);
  return update;
}

/**
 * Validate a follower slot as a valid Convert to Follower target. Pure —
 * takes the plain slot record, not a live Actor.
 *
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateFollowerConversionSlot(slot) {
  if (!slot) return { valid: false, error: 'That follower slot could not be found.' };
  if (isFollowerSlotOccupied(slot)) return { valid: false, error: 'That follower slot is already occupied.' };
  if (slot.dependentKind && slot.dependentKind !== 'follower') {
    return { valid: false, error: 'Only a follower slot may be used for Convert to Follower — minion/beast-only slots are not valid here.' };
  }
  return { valid: true, error: null };
}

/** Canonical follower template ids — the same set ordinary follower chargen offers. */
export const FOLLOWER_TEMPLATE_CHOICE_IDS = Object.freeze(['aggressive', 'defensive', 'utility']);

/**
 * Canonical policy for which follower templates a slot allows. A slot
 * record predating the `templateChoices` field (missing entirely) falls
 * back to the full set for backward compatibility with older data. A slot
 * record that DOES carry `templateChoices` but as an explicitly empty
 * array is treated as a real "zero templates configured" state — the slot
 * is not usable for conversion until its configuration is corrected. This
 * is the single source of truth both the picker view model and the
 * service-boundary preflight consult, so the UI and the service can never
 * silently disagree about which templates a slot allows.
 *
 * @param {object|null} slot
 * @returns {string[]}
 */
export function resolveAllowedFollowerTemplates(slot) {
  if (!slot) return [];
  if (!Array.isArray(slot.templateChoices)) return [...FOLLOWER_TEMPLATE_CHOICE_IDS];
  return slot.templateChoices.filter(id => FOLLOWER_TEMPLATE_CHOICE_IDS.includes(id));
}

/**
 * One canonical, read-only conversion-preflight result combining every
 * fact Convert to Follower depends on beyond GM/existence/slot-lookup
 * (which the caller has already resolved into a concrete `slot` record).
 * Used by convertToFollower() itself as its actual eligibility gate, and
 * exported so the modal's confirm-time revalidation can ask the exact same
 * question the service will ask, without weakening the service's own
 * independent re-check — the service always calls this again itself; that
 * the modal calls it too is a UX convenience, not a trust boundary.
 *
 * @param {Actor} ownerActor
 * @param {Actor} targetActor
 * @param {object|null} slot the already-fetched raw slot record (or null)
 * @param {{templateType?: string|null}} [context]
 * @returns {{eligible: boolean, reasons: string[], slot: object|null, allowedTemplates: string[], resolvedTemplate: string|null, existingFollowerRelationship: object, priorAssignment: object, droidGate: object}}
 */
export function buildFollowerConversionPreflight(ownerActor, targetActor, slot, { templateType = null } = {}) {
  const eligibility = evaluateFollowerConversionEligibility(ownerActor, targetActor);
  const droidGate = evaluateDroidConversionGate(targetActor);
  const slotValidation = validateFollowerConversionSlot(slot);
  const allowedTemplates = resolveAllowedFollowerTemplates(slot);

  let templateReason = null;
  let resolvedTemplate = null;
  if (allowedTemplates.length === 0) {
    templateReason = 'No follower template is configured for this slot.';
  } else if (allowedTemplates.length === 1) {
    resolvedTemplate = (templateType && allowedTemplates.includes(templateType)) ? templateType : allowedTemplates[0];
  } else if (templateType && allowedTemplates.includes(templateType)) {
    resolvedTemplate = templateType;
  } else {
    templateReason = 'A valid follower template must be selected for this slot.';
  }

  const reasons = [...eligibility.reasons];
  if (!slotValidation.valid) reasons.push(slotValidation.error);
  if (droidGate.blocked) reasons.push(droidGate.reason);
  if (templateReason) reasons.push(templateReason);

  return {
    eligible: eligibility.eligible && slotValidation.valid && !droidGate.blocked && !templateReason,
    reasons,
    slot,
    allowedTemplates,
    resolvedTemplate,
    existingFollowerRelationship: findExistingFollowerRelationship(targetActor),
    priorAssignment: detectPriorAssignment(targetActor),
    droidGate
  };
}

/**
 * Read a target Actor's CURRENT prior-assignment state (if any), so
 * convertToFollower can detect and remove it as part of the SAME atomic
 * transaction that adds the follower projection. Pure-ish (reads a live
 * Actor, returns plain data).
 *
 * @param {Actor} targetActor
 * @returns {{assigned: boolean, ownerId: string|null, kind: string|null}}
 */
export function detectPriorAssignment(targetActor) {
  const ownerId = targetActor?.getFlag?.(SYSTEM_ID, 'assignedAllyOwnerId') ?? null;
  const kind = targetActor?.getFlag?.(SYSTEM_ID, 'assignedAllyKind') ?? null;
  return { assigned: Boolean(ownerId), ownerId, kind };
}

/**
 * Pure planner: builds the canonical follower state a Convert to Follower
 * migration needs, from plain inputs. This is what feeds
 * buildFollowerConversionMetadata (and, on the target Actor's own fields,
 * what the existing follower-derivation pipeline reads back out via
 * FollowerCreator.updateFollowerForOwnerLevel).
 *
 * Beasts: species/identity is always preserved from the target's own data —
 * a fixed follower profile (e.g. Akk Dog) is NEVER inferred automatically,
 * only ever used if `choices.fixedFollowerProfileId` is explicitly supplied.
 *
 * Droids: canonical droid state is read from the target's OWN existing
 * `system.droidSystems`/size — this planner never seeds or regenerates the
 * canonical droid ledger itself; that remains the exclusive authority of
 * the Phase 1–6 droid installation/conversion services.
 *
 * @param {Actor} ownerActor
 * @param {Actor} targetActor
 * @param {object|null} slot
 * @param {{templateType?: string, abilityChoice?: string, fixedFollowerProfileId?: string, persistentChoices?: object}} [choices]
 * @returns {object} a canonical follower conversion plan
 */
export function planExistingNpcFollowerConversion(ownerActor, targetActor, slot, choices = {}) {
  const isDroid = targetActor?.type === 'droid';
  const isBeast = isBeastTarget(targetActor);
  const templateType = choices.templateType || targetActor?.system?.progression?.followerTemplate || 'utility';
  const speciesName = targetActor?.system?.race || targetActor?.system?.species?.name || targetActor?.name || null;
  const fixedFollowerProfileId = choices.fixedFollowerProfileId ?? null;

  const droidConfig = isDroid ? {
    isDroid: true,
    // Read-only passthrough of the droid's OWN already-canonical installed
    // state — never regenerated or seeded here.
    droidSystems: targetActor?.system?.droidSystems ?? null,
    size: targetActor?.system?.droidSize ?? targetActor?.system?.size ?? null
  } : null;

  const abilityChoice = isDroid ? (choices.abilityChoice || 'degree-derived') : null;

  const persistentChoices = {
    ...(targetActor?.system?.progression?.followerChoices || {}),
    ...(choices.persistentChoices || {}),
    ...(fixedFollowerProfileId ? { fixedFollowerProfileId } : {}),
    ...(droidConfig ? { droidConfig } : {})
  };

  return {
    ownerActorId: ownerActor.id,
    targetActorId: targetActor.id,
    slotId: slot?.id ?? null,
    templateType,
    followerKind: 'follower',
    speciesName,
    isDroid,
    isBeast,
    abilityChoice,
    droidConfig,
    fixedFollowerProfileId,
    persistentChoices,
    targetHeroicLevel: Math.max(1, Number(ownerActor?.system?.level) || 1)
  };
}

/**
 * Pure builder for the standard follower metadata a converted Actor must
 * carry — the exact same field family ordinary follower chargen writes
 * (including `system.progression.followerChoices`, so the existing
 * follower-derivation pipeline has canonical state to read rather than an
 * empty object), plus one additional provenance flag. No separate
 * "converted follower" mechanical path is introduced.
 *
 * @param {{plan: object}} params
 * @returns {object} an ActorEngine.updateActor() data payload
 */
export function buildFollowerConversionMetadata({ plan }) {
  return {
    'system.isFollower': true,
    'system.progression.isFollower': true,
    'system.progression.followerTemplate': plan.templateType,
    'system.progression.followerChoices': plan.persistentChoices,
    [`flags.swse.follower.isFollower`]: true,
    [`flags.swse.follower.ownerId`]: plan.ownerActorId,
    [`flags.swse.follower.templateType`]: plan.templateType,
    [`flags.swse.follower.active`]: true,
    [`flags.swse.follower.convertedFromExistingNpc`]: true,
    [`flags.${SYSTEM_ID}.isFollower`]: true
  };
}

/**
 * Non-mutating gate for a droid target: a stock-statblock droid must never
 * be sent directly into follower progression — it must go through the
 * canonical DroidStatblockConversionService first (out of scope for this
 * service to invoke automatically; the GM is directed there instead).
 *
 * @param {Actor} targetActor
 * @returns {{blocked: boolean, reason: string|null}}
 */
export function evaluateDroidConversionGate(targetActor) {
  if (!targetActor || targetActor.type !== 'droid') return { blocked: false, reason: null };
  if (isDroidStatblockMode(targetActor)) {
    return {
      blocked: true,
      reason: 'This droid is still in stock-statblock mode. Convert it to playable-derived mode first (Droid Statblock Conversion), then retry Convert to Follower.'
    };
  }
  return { blocked: false, reason: null };
}

/**
 * Default follower-derivation/materialization step used by
 * convertToFollower(). Dynamically imports the existing, already-tested
 * follower-creator.js pipeline rather than reimplementing derivation —
 * this is the SAME function an ordinary follower's "Recalculate Follower"
 * control already calls. Exported (and overridable via
 * `options.applyFollowerDerivation`) so tests can exercise the surrounding
 * transaction's success/failure/rollback behavior for real without needing
 * to load follower-creator.js itself (confirmed un-loadable through this
 * repo's Node Foundry-shim harness — see docs/audits/gm-existing-npc-allies-assignment.md).
 *
 * @param {Actor} ownerActor
 * @param {Actor} targetActor
 * @returns {Promise<boolean>} true only if derivation actually applied
 */
export async function applyDefaultFollowerDerivation(ownerActor, targetActor) {
  const { FollowerCreator } = await import('/systems/foundryvtt-swse/scripts/apps/follower-creator.js');
  return FollowerCreator.updateFollowerForOwnerLevel(ownerActor, targetActor);
}

/**
 * Shared, transactional ownership-grant step used by both assignAsAlly and
 * convertToFollower's optional `grantOwnership` option. Captures the
 * target's pre-grant ownership level for the granted user (via the
 * commit's own return value, read back by rollback — no closure-captured
 * mutable state) so a LATER step's failure restores the exact prior
 * ownership level rather than merely leaving the grant in place.
 *
 * If the GM checked "grant ownership" but no player User has `ownerActor`
 * as their assigned character, this THROWS rather than silently completing
 * without granting anything — a requested-but-unfulfilled ownership grant
 * must never be reported as a successful assignment/conversion (the whole
 * transaction rolls back, matching the same policy an ownership-grant
 * FAILURE already follows).
 *
 * @param {Actor} ownerActor
 * @param {Actor} targetActor
 * @param {string} sourceTag
 * @returns {{name: string, commit: Function, rollback: Function}}
 */
export function buildOwnershipGrantStep(ownerActor, targetActor, sourceTag) {
  return {
    name: 'ownership-commit',
    commit: async () => {
      const ownerUser = game.users?.find?.(u => u.character?.id === ownerActor.id);
      if (!ownerUser) {
        throw new Error(`Ownership could not be granted: no player User has ${ownerActor.name} assigned as their character.`);
      }
      const previousOwnership = clonePlain(targetActor.ownership || {});
      await ActorEngine.updateActor(targetActor, {
        ownership: { [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
      }, { source: `${sourceTag}:ownership` });
      return { userId: ownerUser.id, previousOwnership };
    },
    rollback: async (result) => {
      if (!result?.userId) return;
      const hadPriorEntry = Object.prototype.hasOwnProperty.call(result.previousOwnership || {}, result.userId);
      // A user with no PRIOR ownership entry was relying on `ownership.default`
      // for their access level (or had none at all). Writing an explicit
      // NONE/0 entry for them here would not restore that prior state — it
      // would ADD a new per-user override that shadows `ownership.default`,
      // which can be MORE restrictive than what the user had before this
      // grant (e.g. a `default` of OBSERVER would be overridden to NONE).
      // The exact prior state is "no entry for this user at all", so the
      // rollback must DELETE the key via Foundry's `-=key` deletion syntax
      // instead of overwriting it with NONE.
      const patch = hadPriorEntry
        ? { ownership: { [result.userId]: result.previousOwnership[result.userId] } }
        : { [`ownership.-=${result.userId}`]: null };
      await ActorEngine.updateActor(targetActor, patch, { source: `${sourceTag}:ownership:rollback` });
    }
  };
}

export class AllyAssignmentService {
  /**
   * Assign an existing world NPC Actor to ownerActor as a non-mechanical
   * ally. Does not touch the target's stats, level, or Items. Optional
   * ownership grant is part of the SAME transaction — its failure rolls
   * back the assignment rather than leaving a partially-committed state.
   *
   * @param {Actor} ownerActor
   * @param {Actor} targetActor
   * @param {{source?: string, grantOwnership?: boolean}} [options]
   * @returns {Promise<object>} the created link record
   * @throws {Error} on any eligibility failure, or if any transaction step fails
   */
  static async assignAsAlly(ownerActor, targetActor, options = {}) {
    const evaluation = evaluateNpcAssignmentEligibility(ownerActor, targetActor, ASSIGNMENT_MODE.ALLY);
    if (!evaluation.eligible) {
      throw new Error(evaluation.reasons.join(' '));
    }

    const detectedKind = evaluation.detectedKind;
    const link = buildAllyAssignmentLink({ targetActor, detectedKind });
    const flagKey = assignmentFlagKeyForKind(detectedKind);
    // Captured BEFORE any mutation — matches unassignAlly's and
    // convertToFollower's own rollback pattern in this same file, restoring
    // the EXACT pre-commit arrays rather than recomputing "current minus
    // target" from ownerActor's live state at rollback time (the previous
    // shape here, buildOwnerUnassignmentUpdate, assumed the passed-in
    // ownerActor object would reflect the just-committed write by the time
    // rollback runs — an assumption this file no longer relies on anywhere
    // else, since it's fragile against transaction steps that end up not
    // mutating ownerActor's local reference in place).
    const currentOwnedActors = clonePlain(asArray(ownerActor.system?.ownedActors));
    const currentFlagList = clonePlain(asArray(ownerActor.getFlag?.(SYSTEM_ID, flagKey)));
    const ownerUpdate = {
      'system.ownedActors': appendUnique(currentOwnedActors, link),
      [`flags.${SYSTEM_ID}.${flagKey}`]: appendUnique(currentFlagList, link)
    };
    const targetFlagPatch = buildAssignmentTargetFlagPatch({ ownerActor, detectedKind, mode: ASSIGNMENT_MODE.ALLY });
    const sourceTag = options.source ? `AllyAssignmentService.assignAsAlly:${options.source}` : 'AllyAssignmentService.assignAsAlly';
    // Captured BEFORE any mutation, same reasoning as the owner arrays
    // above: buildAssignmentTargetFlagPatch() deletes `dismissedAlly` (via
    // its `-=dismissedAlly` key), and the prior rollback shape here
    // (buildAssignmentClearPatch()) only deletes the NEW assignedAlly*
    // keys — it never restores a pre-existing `dismissedAlly` value a
    // later step's failure (e.g. a requested ownership grant) would
    // otherwise permanently lose. buildFlagRestorationPatch() restores
    // every key that existed before and deletes only keys this commit
    // newly introduced, matching unassignAlly()'s own rollback pattern.
    const previousTargetFlags = clonePlain(targetActor.flags || {});

    const steps = [
      {
        name: 'owner-projection-commit',
        commit: async () => {
          await ActorEngine.updateActor(ownerActor, ownerUpdate, { source: sourceTag });
          return ownerUpdate;
        },
        rollback: async () => {
          await ActorEngine.updateActor(ownerActor, {
            'system.ownedActors': currentOwnedActors,
            [`flags.${SYSTEM_ID}.${flagKey}`]: currentFlagList
          }, { source: `${sourceTag}:rollback` });
        }
      },
      {
        name: 'target-metadata-commit',
        commit: async () => {
          await ActorEngine.updateActor(targetActor, targetFlagPatch, { source: sourceTag });
          return targetFlagPatch;
        },
        rollback: async () => {
          const restorePatch = buildFlagRestorationPatch(previousTargetFlags, targetActor.flags || {});
          if (Object.keys(restorePatch).length) {
            await ActorEngine.updateActor(targetActor, restorePatch, { source: `${sourceTag}:rollback` });
          }
        }
      }
    ];

    if (options.grantOwnership === true) {
      steps.push(buildOwnershipGrantStep(ownerActor, targetActor, sourceTag));
    }

    const transaction = await runFollowerMutationTransaction(steps);

    if (!transaction.ok) {
      swseLogger.warn('[AllyAssignmentService] assignAsAlly failed and was rolled back', { owner: ownerActor.name, target: targetActor.name, error: transaction.error });
      throw transaction.error;
    }

    swseLogger.log('[AllyAssignmentService] Assigned ally', { owner: ownerActor.name, target: targetActor.name, kind: detectedKind });
    return link;
  }

  /**
   * Remove an assigned-ally relationship. Preserves the target Actor and
   * all of its stats/Items/token entirely. Must never be used to undo a
   * follower conversion — a converted follower uses the existing
   * detach/fire/delete workflow instead. Runs as one governed transaction:
   * a target-cleanup failure restores the owner's exact prior projections.
   *
   * @param {Actor} ownerActor
   * @param {Actor} targetActor
   * @param {{source?: string}} [options]
   * @returns {Promise<boolean>}
   */
  static async unassignAlly(ownerActor, targetActor, options = {}) {
    if (game.user?.isGM !== true) throw new Error('Only a GM can unassign an ally.');
    if (!ownerActor || !targetActor) throw new Error('An owner Actor and a target Actor are required.');

    const detectedKind = detectAssignmentKind(targetActor);
    const flagKey = assignmentFlagKeyForKind(detectedKind);
    const currentOwnedActors = clonePlain(asArray(ownerActor.system?.ownedActors));
    const currentFlagList = clonePlain(asArray(ownerActor.getFlag?.(SYSTEM_ID, flagKey)));
    const previousTargetFlags = clonePlain(targetActor.flags || {});

    const ownerRemovalUpdate = {
      'system.ownedActors': removeById(currentOwnedActors, targetActor.id),
      [`flags.${SYSTEM_ID}.${flagKey}`]: removeById(currentFlagList, targetActor.id)
    };
    const targetClearPatch = buildAssignmentClearPatch();
    const sourceTag = options.source ? `AllyAssignmentService.unassignAlly:${options.source}` : 'AllyAssignmentService.unassignAlly';

    const transaction = await runFollowerMutationTransaction([
      {
        name: 'owner-unassignment-commit',
        commit: async () => {
          await ActorEngine.updateActor(ownerActor, ownerRemovalUpdate, { source: sourceTag });
        },
        rollback: async () => {
          await ActorEngine.updateActor(ownerActor, {
            'system.ownedActors': currentOwnedActors,
            [`flags.${SYSTEM_ID}.${flagKey}`]: currentFlagList
          }, { source: `${sourceTag}:rollback` });
        }
      },
      {
        name: 'target-metadata-clear',
        commit: async () => {
          await ActorEngine.updateActor(targetActor, targetClearPatch, { source: sourceTag });
        },
        rollback: async () => {
          const restorePatch = buildFlagRestorationPatch(previousTargetFlags, targetActor.flags || {});
          if (Object.keys(restorePatch).length) {
            await ActorEngine.updateActor(targetActor, restorePatch, { source: `${sourceTag}:rollback` });
          }
        }
      }
    ]);

    if (!transaction.ok) {
      swseLogger.warn('[AllyAssignmentService] unassignAlly failed and was rolled back', { owner: ownerActor.name, target: targetActor.name, error: transaction.error });
      throw transaction.error;
    }

    swseLogger.log('[AllyAssignmentService] Unassigned ally', { owner: ownerActor.name, target: targetActor.name });
    return true;
  }

  /**
   * Convert an existing world NPC Actor into a real follower, consuming one
   * open follower slot from the owner's canonical followerSlots array.
   *
   * Genuinely mechanical and atomic: follower derivation/materialization
   * (`applyFollowerDerivation`, defaulting to the existing
   * FollowerCreator.updateFollowerForOwnerLevel pipeline) is a REQUIRED
   * transaction step, not a best-effort afterthought. If it fails, the
   * target is restored from a full pre-conversion snapshot, every owner
   * projection (followers/followerSlots/ownedActors/assignedAllies/beasts)
   * is restored, the slot is left open, and this method throws — it never
   * reports success for a metadata-only conversion.
   *
   * Any prior ally/beast assignment of the target BY THIS OWNER is removed
   * as part of the same atomic transaction, so the Actor appears exactly
   * once in Allies after conversion.
   *
   * @param {Actor} ownerActor
   * @param {Actor} targetActor
   * @param {string} slotId
   * @param {{template?: string, choices?: object, source?: string, applyFollowerDerivation?: Function, grantOwnership?: boolean}} [options]
   * @returns {Promise<object>} the target Actor
   * @throws {Error} on GM/eligibility/slot/droid-mode/derivation failure
   */
  static async convertToFollower(ownerActor, targetActor, slotId, options = {}) {
    // --- 1. Preflight ---
    if (game.user?.isGM !== true) throw new Error('Only a GM can convert an existing NPC to a follower.');
    if (!ownerActor || !targetActor || !slotId) throw new Error('An owner Actor, a target Actor, and a slot id are required.');

    const priorAssignment = detectPriorAssignment(targetActor);

    const droidGate = evaluateDroidConversionGate(targetActor);
    if (droidGate.blocked) throw new Error(droidGate.reason);

    const currentSlots = clonePlain(Array.isArray(ownerActor.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)) ? ownerActor.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG) : []);
    const slot = currentSlots.find(s => s?.id === slotId) ?? null;
    const slotValidation = validateFollowerConversionSlot(slot);
    if (!slotValidation.valid) throw new Error(slotValidation.error);

    // Independently re-checked HERE (not only by the UI's picker eligibility)
    // so a forged/direct call is rejected the same way: GM status, owner/
    // target type, self-conversion, cross-owner assignment, an already-
    // mechanical-follower target (checked via the canonical, registry-scanning
    // findExistingFollowerRelationship — not just the target's own, possibly
    // stale, flags), an active player character, and (new) that any REQUESTED
    // follower template is actually one this slot allows. A target already
    // assigned to THIS SAME owner as a relationship-only ally is deliberately
    // NOT rejected here — conversion is the explicit path that migrates that
    // exact relationship, cleaning up the prior assignment as part of the
    // same atomic transaction (see step 4 below). Runs after slot validation
    // so re-converting the same Actor into the SAME already-occupied slot
    // still surfaces the more specific "slot occupied" diagnosis rather than
    // the coarser "already a follower" one. buildFollowerConversionPreflight
    // is the SAME function the modal calls for its own confirm-time
    // revalidation — this call is what actually enforces it; the modal's
    // call is a UX convenience, never a substitute for this one.
    const requestedTemplate = options.choices?.templateType ?? options.template ?? null;
    const preflight = buildFollowerConversionPreflight(ownerActor, targetActor, slot, { templateType: requestedTemplate });
    if (!preflight.eligible) {
      throw new Error(preflight.reasons.join(' '));
    }

    const plan = planExistingNpcFollowerConversion(ownerActor, targetActor, slot, { ...(options.choices || {}), templateType: preflight.resolvedTemplate || requestedTemplate });
    const applyFollowerDerivation = options.applyFollowerDerivation || applyDefaultFollowerDerivation;
    const sourceTag = options.source ? `AllyAssignmentService.convertToFollower:${options.source}` : 'AllyAssignmentService.convertToFollower';

    // PHASE 10 ADDENDUM (P2-3) — persistent reservations, acquired in a
    // FIXED order (slot first, then target) BEFORE any owner/target
    // mutation: the slot reservation stops a second request converting a
    // DIFFERENT NPC into this same slot, the target reservation stops a
    // second request converting this SAME NPC into a different slot. If
    // the slot reservation fails, the target is never touched at all. If
    // the target reservation fails, the just-acquired slot reservation is
    // released (token-conditional) before this method throws — never
    // acquired in the opposite order elsewhere in this codebase.
    const requestToken = options.requestToken || randomId();

    const slotReservation = await FollowerSlotService.reserveFollowerSlot(ownerActor, slotId, {
      token: requestToken,
      operation: 'existing-npc-follower-conversion',
      targetActorId: targetActor.id
    });
    if (!slotReservation.success) {
      throw new Error(slotReservation.error || 'That follower slot could not be reserved for this conversion.');
    }

    const existingTargetReservation = resolveTargetConversionReservation(targetActor);
    if (existingTargetReservation && !isTargetConversionReservationExpired(targetActor) && existingTargetReservation.token !== requestToken) {
      await FollowerSlotService.releaseFollowerSlotReservation(ownerActor, slotId, requestToken, { source: sourceTag });
      throw new Error('This NPC is already reserved by another in-progress conversion.');
    }

    // --- 2. Snapshot owner relationship state (captured BEFORE any mutation —
    // never re-derived from the live Actor after the transaction starts). ---
    const currentFollowers = clonePlain(asArray(ownerActor.getFlag?.(SYSTEM_ID, 'followers')));
    const currentOwnedActors = clonePlain(asArray(ownerActor.system?.ownedActors));
    const currentAssignedAllies = clonePlain(asArray(ownerActor.getFlag?.(SYSTEM_ID, ASSIGNED_ALLIES_FLAG)));
    const currentBeasts = clonePlain(asArray(ownerActor.getFlag?.(SYSTEM_ID, BEASTS_FLAG)));

    // --- 3. Snapshot target (real ActorEngine snapshot authority) ---
    // Captured BEFORE the target reservation write below — so rolling
    // back to this snapshot (restoreSnapshotExact's deletion-aware flags
    // restore) also cleanly removes the reservation flag itself, rather
    // than restoring TO a state that still carries it.
    const previousTargetFlags = clonePlain(targetActor.flags || {});
    const targetSnapshot = await SnapshotManager.createSnapshot(targetActor, 'Pre-conversion snapshot (Existing NPC → Follower)');

    try {
      await ActorEngine.updateActor(targetActor, {
        [TARGET_CONVERSION_RESERVATION_FLAG_PATH]: buildTargetConversionReservation({
          token: requestToken,
          ownerActorId: ownerActor.id,
          slotId,
          userId: game.user?.id ?? null
        })
      }, { source: sourceTag });
    } catch (err) {
      await FollowerSlotService.releaseFollowerSlotReservation(ownerActor, slotId, requestToken, { source: sourceTag });
      throw err;
    }

    // --- 4. Remove prior assignment + apply follower metadata (owner side) ---
    const followerLink = {
      id: targetActor.id,
      name: targetActor.name,
      type: targetActor.type,
      img: targetActor.img,
      talent: 'GM Conversion',
      templateType: plan.templateType,
      convertedFromExistingNpc: true
    };
    const { followers: nextFollowers, ownedActors: nextOwnedActors } = buildFollowerLinkOwnerUpdate({
      currentFollowers,
      currentOwnedActors,
      followerLink
    });
    const nextAssignedAllies = priorAssignment.assigned && priorAssignment.kind !== ASSIGNMENT_KIND.BEAST
      ? removeById(currentAssignedAllies, targetActor.id)
      : currentAssignedAllies;
    const nextBeasts = priorAssignment.assigned && priorAssignment.kind === ASSIGNMENT_KIND.BEAST
      ? removeById(currentBeasts, targetActor.id)
      : currentBeasts;

    // Slot occupant + reservation are finalized TOGETHER (see the
    // owner-relationship-commit step below, which rereads slots fresh
    // rather than trusting this pre-transaction snapshot) — never built
    // here, so a stale slot array can never be committed.
    const ownerRollbackUpdate = {
      [`flags.${SYSTEM_ID}.followers`]: currentFollowers,
      [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: currentSlots,
      'system.ownedActors': currentOwnedActors,
      [`flags.${SYSTEM_ID}.${ASSIGNED_ALLIES_FLAG}`]: currentAssignedAllies,
      [`flags.${SYSTEM_ID}.${BEASTS_FLAG}`]: currentBeasts
    };

    // --- 5. Target metadata patch (follower fields + clears any prior
    // assignedAlly* flags AND this conversion's own target reservation, all
    // in the SAME patch). ---
    const conversionMetadata = {
      ...buildFollowerConversionMetadata({ plan }),
      ...(priorAssignment.assigned ? buildAssignmentClearPatch() : {}),
      [`flags.${SYSTEM_ID}.-=followerConversionReservation`]: null
    };

    // --- 6-9. Run the atomic transaction: target metadata, then required
    // follower derivation, then owner relationship, then (optional in this
    // path) nothing further — order matters: derivation runs against the
    // target AFTER it is flagged as a follower (required for
    // updateFollowerForOwnerLevel's own isFollower check) but BEFORE the
    // owner-side commit, so a derivation failure never touches the owner or
    // the slot at all. ---
    const conversionSteps = [
      {
        name: 'target-conversion-commit',
        commit: async () => {
          await ActorEngine.updateActor(targetActor, conversionMetadata, { source: sourceTag });
        },
        rollback: async () => {
          // restoreSnapshotExact() restores flags/ownership/prototypeToken/
          // system/Items/Effects exactly (deletion-aware, id-preserving) —
          // a failed or inexact restore must not be silently treated as a
          // successful rollback (the transaction coordinator's
          // rollbackFailed/rollbackErrors reporting depends on this
          // throwing rather than swallowing the failure). The follow-up
          // buildFlagRestorationPatch() pass is kept as a defense-in-depth
          // no-op for any flags the exact restore's own scope doesn't
          // cover (it restores nothing new when the exact restore already
          // matched `previousTargetFlags`).
          const restored = await SnapshotManager.restoreSnapshotExact(targetActor, targetSnapshot.timestamp);
          if (!restored.success) {
            throw new Error(`Target rollback failed: snapshot restore did not succeed (${restored.error || restored.code || 'unknown error'}).`);
          }
          if (!restored.exact) {
            swseLogger.warn('[AllyAssignmentService] convertToFollower rollback restored target but is not identity-exact — manual review recommended.', { target: targetActor.name, restored });
          }
          const restorePatch = buildFlagRestorationPatch(previousTargetFlags, targetActor.flags || {});
          if (Object.keys(restorePatch).length) {
            await ActorEngine.updateActor(targetActor, restorePatch, { source: `${sourceTag}:rollback` });
          }
        }
      },
      {
        name: 'follower-derivation-commit',
        commit: async () => {
          const applied = await applyFollowerDerivation(ownerActor, targetActor);
          if (applied !== true) {
            throw new Error('Follower derivation could not be applied to the converted NPC — conversion aborted.');
          }
        }
      },
      {
        name: 'owner-relationship-commit',
        commit: async () => {
          // Slots are rereread FRESH here (never the pre-transaction
          // `currentSlots` snapshot) and the reservation is verified and
          // cleared in the SAME write that sets the occupant — a slot
          // reservation lost to TTL expiry or another request between
          // acquisition and this final commit aborts the conversion
          // rather than silently claiming a slot this request no longer
          // holds.
          const freshOwner = game.actors?.get?.(ownerActor.id) ?? ownerActor;
          const freshSlots = Array.isArray(freshOwner.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG))
            ? freshOwner.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)
            : [];
          const { slots: finalizedSlots, success: slotFinalized } = finalizeReservedFollowerSlot(freshSlots, {
            slotId,
            token: requestToken,
            followerActorId: targetActor.id
          });
          if (!slotFinalized) {
            throw new Error('The follower-slot reservation was lost before the conversion could be finalized — conversion aborted.');
          }

          await ActorEngine.updateActor(ownerActor, {
            [`flags.${SYSTEM_ID}.followers`]: nextFollowers,
            [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: finalizedSlots,
            'system.ownedActors': nextOwnedActors,
            [`flags.${SYSTEM_ID}.${ASSIGNED_ALLIES_FLAG}`]: nextAssignedAllies,
            [`flags.${SYSTEM_ID}.${BEASTS_FLAG}`]: nextBeasts
          }, { source: sourceTag });
        },
        rollback: async () => {
          await ActorEngine.updateActor(ownerActor, ownerRollbackUpdate, { source: `${sourceTag}:rollback` });
        }
      }
    ];

    // Ownership grant is part of the SAME atomic transaction as the
    // relationship metadata/derivation/owner-linkage steps above — a
    // conversion that requested ownership but failed to grant it must not
    // be reported as a successful conversion (same policy assignAsAlly
    // already enforces for Assign as Ally).
    if (options.grantOwnership === true) {
      conversionSteps.push(buildOwnershipGrantStep(ownerActor, targetActor, sourceTag));
    }

    const transaction = await runFollowerMutationTransaction(conversionSteps);

    if (!transaction.ok) {
      // The slot reservation was acquired BEFORE this transaction even
      // started (never one of `conversionSteps`), so the transaction's
      // own rollback never touches it — release it here explicitly,
      // TOKEN-CONDITIONALLY (a losing/expired request's own token no
      // longer matching the live reservation is reported, not treated as
      // a rollback failure that masks the real conversion error).
      try {
        await FollowerSlotService.releaseFollowerSlotReservation(ownerActor, slotId, requestToken, { source: `${sourceTag}:rollback` });
      } catch (releaseErr) {
        swseLogger.warn('[AllyAssignmentService] Failed to release follower-slot reservation during conversion rollback cleanup.', { owner: ownerActor.name, slotId, error: releaseErr });
      }
      swseLogger.warn('[AllyAssignmentService] convertToFollower failed and was rolled back', { owner: ownerActor.name, target: targetActor.name, error: transaction.error });
      throw transaction.error;
    }

    swseLogger.log('[AllyAssignmentService] Converted existing NPC to follower', { owner: ownerActor.name, target: targetActor.name, slotId });
    return targetActor;
  }
}
