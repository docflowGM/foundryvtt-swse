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
 *   - convertToFollower()  — an explicit mechanical migration. Consumes one
 *                           open follower slot from the SAME canonical
 *                           flags.foundryvtt-swse.followerSlots array
 *                           FollowerSlotService/talent grants already use,
 *                           and moves the Actor into the exact same follower
 *                           model ordinary follower chargen produces — no
 *                           special "converted follower" runtime path.
 *
 * Assignment is reversible relationship metadata; conversion is an explicit
 * mechanical migration. The two must never be conflated.
 *
 * GM permission (`game.user.isGM === true`) is enforced HERE, independently
 * of whatever UI or drag/drop handler calls this service.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { isDroidStatblockMode } from '/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js';
import {
  runFollowerMutationTransaction,
  buildFollowerLinkOwnerUpdate,
  buildFollowerSlotUpdate
} from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-mutation-transaction.js';
import { isEligibleFollowerSlotOwnerType } from './follower-slot-service.js';

const SYSTEM_ID = 'foundryvtt-swse';
const FOLLOWER_SLOTS_FLAG = 'followerSlots';
const ASSIGNED_ALLIES_FLAG = 'assignedAllies';
const BEASTS_FLAG = 'beasts';

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

function appendUnique(list, entry, idOf = (e) => e?.id || e?.actorId) {
  const id = idOf(entry);
  const filtered = asArray(list).filter(existing => idOf(existing) !== id);
  return [...filtered, entry];
}

function removeById(list, id, idOf = (e) => e?.id || e?.actorId) {
  return asArray(list).filter(existing => idOf(existing) !== id);
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
 * Pure eligibility gate for assigning targetActor to ownerActor. Takes
 * plain extracted values, not live Foundry objects, so every branch is
 * directly testable.
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
  mode
} = {}) {
  const reasons = [];
  if (isGM !== true) reasons.push('Only a GM can assign an existing NPC.');
  if (!ownerExists) reasons.push('No owner Actor was provided.');
  else if (!isEligibleFollowerSlotOwnerType(ownerType)) reasons.push(`Actor type "${ownerType}" is not eligible to receive an assigned ally.`);
  if (!targetExists) reasons.push('No target Actor was provided.');
  else if (!isEligibleAssignmentTargetType(targetType)) reasons.push(`Actor type "${targetType}" cannot be assigned — vehicles, starships, and hazards are not supported.`);
  if (sameActor) reasons.push('An Actor cannot be assigned to itself.');
  if (alreadyAssignedOwnerId && ownerId && alreadyAssignedOwnerId === ownerId && alreadyAssignedMode === mode) {
    reasons.push('This Actor is already assigned to this owner in this relationship mode.');
  }
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
    mode
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
 * Pure builder for the reciprocal metadata written onto the target Actor.
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
 * Pure builder for the owner-side write when assigning an ally — one of
 * the two owner arrays (beasts, or assignedAllies for everything else)
 * plus system.ownedActors, so both owner projections commit together.
 *
 * @returns {object} an ActorEngine.updateActor() data payload
 */
export function buildOwnerAssignmentUpdate({ ownerActor, link, detectedKind }) {
  const nextOwnedActors = appendUnique(ownerActor.system?.ownedActors, link);
  const update = { 'system.ownedActors': nextOwnedActors };
  if (detectedKind === ASSIGNMENT_KIND.BEAST) {
    update[`flags.${SYSTEM_ID}.${BEASTS_FLAG}`] = appendUnique(ownerActor.getFlag?.(SYSTEM_ID, BEASTS_FLAG), link);
  } else {
    update[`flags.${SYSTEM_ID}.${ASSIGNED_ALLIES_FLAG}`] = appendUnique(ownerActor.getFlag?.(SYSTEM_ID, ASSIGNED_ALLIES_FLAG), link);
  }
  return update;
}

/**
 * Pure builder for the owner-side write when unassigning an ally.
 *
 * @returns {object} an ActorEngine.updateActor() data payload
 */
export function buildOwnerUnassignmentUpdate({ ownerActor, targetActorId, detectedKind }) {
  const nextOwnedActors = removeById(ownerActor.system?.ownedActors, targetActorId);
  const update = { 'system.ownedActors': nextOwnedActors };
  if (detectedKind === ASSIGNMENT_KIND.BEAST) {
    update[`flags.${SYSTEM_ID}.${BEASTS_FLAG}`] = removeById(ownerActor.getFlag?.(SYSTEM_ID, BEASTS_FLAG), targetActorId);
  } else {
    update[`flags.${SYSTEM_ID}.${ASSIGNED_ALLIES_FLAG}`] = removeById(ownerActor.getFlag?.(SYSTEM_ID, ASSIGNED_ALLIES_FLAG), targetActorId);
  }
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
  if (slot.createdActorId) return { valid: false, error: 'That follower slot is already occupied.' };
  if (slot.dependentKind && slot.dependentKind !== 'follower') {
    return { valid: false, error: 'Only a follower slot may be used for Convert to Follower — minion/beast-only slots are not valid here.' };
  }
  return { valid: true, error: null };
}

/**
 * Pure builder for the standard follower metadata a converted Actor must
 * carry — the exact same fields ordinary follower chargen writes, plus one
 * additional provenance flag. No separate "converted follower" mechanical
 * path is introduced.
 *
 * @returns {object} an ActorEngine.updateActor() data payload
 */
export function buildFollowerConversionMetadata({ ownerActor, targetActor, template = 'utility' }) {
  return {
    'system.isFollower': true,
    'system.progression.isFollower': true,
    'system.progression.followerTemplate': template,
    [`flags.swse.follower.isFollower`]: true,
    [`flags.swse.follower.ownerId`]: ownerActor.id,
    [`flags.swse.follower.templateType`]: template,
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

export class AllyAssignmentService {
  /**
   * Assign an existing world NPC Actor to ownerActor as a non-mechanical
   * ally. Does not touch the target's stats, level, or Items.
   *
   * @param {Actor} ownerActor
   * @param {Actor} targetActor
   * @param {{source?: string}} [options]
   * @returns {Promise<object>} the created link record
   * @throws {Error} on any eligibility failure
   */
  static async assignAsAlly(ownerActor, targetActor, options = {}) {
    const evaluation = evaluateNpcAssignmentEligibility(ownerActor, targetActor, ASSIGNMENT_MODE.ALLY);
    if (!evaluation.eligible) {
      throw new Error(evaluation.reasons.join(' '));
    }

    const detectedKind = evaluation.detectedKind;
    const link = buildAllyAssignmentLink({ targetActor, detectedKind });
    const ownerUpdate = buildOwnerAssignmentUpdate({ ownerActor, link, detectedKind });
    const targetFlagPatch = buildAssignmentTargetFlagPatch({ ownerActor, detectedKind, mode: ASSIGNMENT_MODE.ALLY });
    const sourceTag = options.source ? `AllyAssignmentService.assignAsAlly:${options.source}` : 'AllyAssignmentService.assignAsAlly';

    const transaction = await runFollowerMutationTransaction([
      {
        name: 'owner-projection-commit',
        commit: async () => {
          await ActorEngine.updateActor(ownerActor, ownerUpdate, { source: sourceTag });
          return ownerUpdate;
        },
        rollback: async () => {
          await ActorEngine.updateActor(ownerActor, buildOwnerUnassignmentUpdate({ ownerActor, targetActorId: targetActor.id, detectedKind }), { source: `${sourceTag}:rollback` });
        }
      },
      {
        name: 'target-metadata-commit',
        commit: async () => {
          await ActorEngine.updateActor(targetActor, targetFlagPatch, { source: sourceTag });
          return targetFlagPatch;
        }
      }
    ]);

    if (!transaction.ok) {
      swseLogger.warn('[AllyAssignmentService] assignAsAlly failed and was rolled back', { owner: ownerActor.name, target: targetActor.name, error: transaction.error });
      throw transaction.error;
    }

    if (options.grantOwnership === true) {
      const ownerUser = game.users?.find?.(u => u.character?.id === ownerActor.id);
      if (ownerUser) {
        await ActorEngine.updateActor(targetActor, {
          ownership: { [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
        }, { source: `${sourceTag}:ownership` });
      }
    }

    swseLogger.log('[AllyAssignmentService] Assigned ally', { owner: ownerActor.name, target: targetActor.name, kind: detectedKind });
    return link;
  }

  /**
   * Remove an assigned-ally relationship. Preserves the target Actor and
   * all of its stats/Items/token entirely. Must never be used to undo a
   * follower conversion — a converted follower uses the existing
   * detach/fire/delete workflow instead.
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
    const ownerUpdate = buildOwnerUnassignmentUpdate({ ownerActor, targetActorId: targetActor.id, detectedKind });
    const sourceTag = options.source ? `AllyAssignmentService.unassignAlly:${options.source}` : 'AllyAssignmentService.unassignAlly';

    await ActorEngine.updateActor(ownerActor, ownerUpdate, { source: sourceTag });
    await ActorEngine.updateActor(targetActor, {
      [`flags.${SYSTEM_ID}.-=assignedAllyOwnerId`]: null,
      [`flags.${SYSTEM_ID}.-=assignedAllyKind`]: null,
      [`flags.${SYSTEM_ID}.-=assignedAllyMode`]: null,
      [`flags.${SYSTEM_ID}.-=assignedAllySource`]: null,
      [`flags.${SYSTEM_ID}.-=assignedAllySyncMode`]: null
    }, { source: sourceTag });

    swseLogger.log('[AllyAssignmentService] Unassigned ally', { owner: ownerActor.name, target: targetActor.name });
    return true;
  }

  /**
   * Convert an existing world NPC Actor into a real follower, consuming one
   * open follower slot from the owner's canonical followerSlots array. Uses
   * the SAME slot-fill/owner-link transaction shape follower creation uses
   * (buildFollowerLinkOwnerUpdate/buildFollowerSlotUpdate) — no special
   * "converted follower" mechanical path.
   *
   * @param {Actor} ownerActor
   * @param {Actor} targetActor
   * @param {string} slotId
   * @param {{template?: string, source?: string}} [options]
   * @returns {Promise<object>} the target Actor
   * @throws {Error} on GM/eligibility/slot/droid-mode failure
   */
  static async convertToFollower(ownerActor, targetActor, slotId, options = {}) {
    if (game.user?.isGM !== true) throw new Error('Only a GM can convert an existing NPC to a follower.');
    if (!ownerActor || !targetActor || !slotId) throw new Error('An owner Actor, a target Actor, and a slot id are required.');
    if (ownerActor.id === targetActor.id) throw new Error('An Actor cannot be converted into its own follower.');

    const droidGate = evaluateDroidConversionGate(targetActor);
    if (droidGate.blocked) throw new Error(droidGate.reason);

    const currentSlots = Array.isArray(ownerActor.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG))
      ? ownerActor.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)
      : [];
    const slot = currentSlots.find(s => s?.id === slotId) ?? null;
    const slotValidation = validateFollowerConversionSlot(slot);
    if (!slotValidation.valid) throw new Error(slotValidation.error);

    const template = options.template || 'utility';
    const currentFollowers = asArray(ownerActor.getFlag?.(SYSTEM_ID, 'followers'));
    const followerLink = {
      id: targetActor.id,
      name: targetActor.name,
      type: targetActor.type,
      img: targetActor.img,
      talent: 'GM Conversion',
      templateType: template,
      convertedFromExistingNpc: true
    };
    const { followers: nextFollowers, ownedActors: nextOwnedActors } = buildFollowerLinkOwnerUpdate({
      currentFollowers,
      currentOwnedActors: ownerActor.system?.ownedActors,
      followerLink
    });
    const nextSlots = buildFollowerSlotUpdate(currentSlots, slotId, targetActor.id);
    const conversionMetadata = buildFollowerConversionMetadata({ ownerActor, targetActor, template });
    const sourceTag = options.source ? `AllyAssignmentService.convertToFollower:${options.source}` : 'AllyAssignmentService.convertToFollower';

    const transaction = await runFollowerMutationTransaction([
      {
        name: 'owner-relationship-commit',
        commit: async () => {
          await ActorEngine.updateActor(ownerActor, {
            [`flags.${SYSTEM_ID}.followers`]: nextFollowers,
            [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: nextSlots,
            'system.ownedActors': nextOwnedActors
          }, { source: sourceTag });
        },
        rollback: async () => {
          await ActorEngine.updateActor(ownerActor, {
            [`flags.${SYSTEM_ID}.followers`]: currentFollowers,
            [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: currentSlots,
            'system.ownedActors': asArray(ownerActor.system?.ownedActors)
          }, { source: `${sourceTag}:rollback` });
        }
      },
      {
        name: 'target-conversion-commit',
        commit: async () => {
          await ActorEngine.updateActor(targetActor, conversionMetadata, { source: sourceTag });
        }
      }
    ]);

    if (!transaction.ok) {
      swseLogger.warn('[AllyAssignmentService] convertToFollower failed and was rolled back', { owner: ownerActor.name, target: targetActor.name, error: transaction.error });
      throw transaction.error;
    }

    swseLogger.log('[AllyAssignmentService] Converted existing NPC to follower', { owner: ownerActor.name, target: targetActor.name, slotId });

    // Best-effort derived-stat sync, same as an ordinary follower's level-up
    // resync — reuses the existing, already-tested follower-deriver
    // pipeline rather than reimplementing derivation here. This is
    // deliberately best-effort: the conversion itself already committed
    // successfully above (the Actor is correctly flagged as a follower and
    // slot-linked), so a derivation failure is logged, not rolled back — the
    // GM can retry via the ordinary "Recalculate Follower" Allies control
    // afterward. See docs/audits/gm-existing-npc-allies-assignment.md's
    // "Follower derivation on conversion" section for the documented scope
    // boundary this implies for arbitrary hand-authored NPC stat blocks.
    try {
      const { FollowerCreator } = await import('/systems/foundryvtt-swse/scripts/apps/follower-creator.js');
      await FollowerCreator.updateFollowerForOwnerLevel(ownerActor, targetActor);
    } catch (err) {
      swseLogger.warn('[AllyAssignmentService] Post-conversion derived-stat sync failed (conversion itself still committed):', err);
    }

    return targetActor;
  }
}
