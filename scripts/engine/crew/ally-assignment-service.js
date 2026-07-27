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
import { SnapshotManager } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js';
import {
  runFollowerMutationTransaction,
  buildFollowerLinkOwnerUpdate,
  buildFollowerSlotUpdate,
  buildFlagRestorationPatch
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
  mode
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
 * Pure builder for the owner-side write when unassigning an ally. Reads the
 * owner's CURRENT state — safe here because this is only ever used to
 * recompute a symmetric add/remove immediately, either as the forward
 * unassign commit or as assignAsAlly's own rollback (where "current" at
 * rollback time is the just-mutated state with exactly one entry added).
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
  if (slot.createdActorId) return { valid: false, error: 'That follower slot is already occupied.' };
  if (slot.dependentKind && slot.dependentKind !== 'follower') {
    return { valid: false, error: 'Only a follower slot may be used for Convert to Follower — minion/beast-only slots are not valid here.' };
  }
  return { valid: true, error: null };
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
    const ownerUpdate = buildOwnerAssignmentUpdate({ ownerActor, link, detectedKind });
    const targetFlagPatch = buildAssignmentTargetFlagPatch({ ownerActor, detectedKind, mode: ASSIGNMENT_MODE.ALLY });
    const sourceTag = options.source ? `AllyAssignmentService.assignAsAlly:${options.source}` : 'AllyAssignmentService.assignAsAlly';

    const steps = [
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
        },
        rollback: async () => {
          await ActorEngine.updateActor(targetActor, buildAssignmentClearPatch(), { source: `${sourceTag}:rollback` });
        }
      }
    ];

    if (options.grantOwnership === true) {
      steps.push({
        name: 'ownership-commit',
        commit: async () => {
          const ownerUser = game.users?.find?.(u => u.character?.id === ownerActor.id);
          if (!ownerUser) return null;
          await ActorEngine.updateActor(targetActor, {
            ownership: { [ownerUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
          }, { source: `${sourceTag}:ownership` });
          return ownerUser.id;
        }
      });
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
   * @param {{template?: string, choices?: object, source?: string, applyFollowerDerivation?: Function}} [options]
   * @returns {Promise<object>} the target Actor
   * @throws {Error} on GM/eligibility/slot/droid-mode/derivation failure
   */
  static async convertToFollower(ownerActor, targetActor, slotId, options = {}) {
    // --- 1. Preflight ---
    if (game.user?.isGM !== true) throw new Error('Only a GM can convert an existing NPC to a follower.');
    if (!ownerActor || !targetActor || !slotId) throw new Error('An owner Actor, a target Actor, and a slot id are required.');
    if (ownerActor.id === targetActor.id) throw new Error('An Actor cannot be converted into its own follower.');

    const priorAssignment = detectPriorAssignment(targetActor);
    if (priorAssignment.assigned && priorAssignment.ownerId !== ownerActor.id) {
      throw new Error('This Actor is assigned to a different owner. Unassign it from that owner before converting it.');
    }

    const droidGate = evaluateDroidConversionGate(targetActor);
    if (droidGate.blocked) throw new Error(droidGate.reason);

    const currentSlots = clonePlain(Array.isArray(ownerActor.getFlag?.(SYSTEM_ID, FOLLOWER_SLOTS_FLAG)) ? ownerActor.getFlag(SYSTEM_ID, FOLLOWER_SLOTS_FLAG) : []);
    const slot = currentSlots.find(s => s?.id === slotId) ?? null;
    const slotValidation = validateFollowerConversionSlot(slot);
    if (!slotValidation.valid) throw new Error(slotValidation.error);

    const plan = planExistingNpcFollowerConversion(ownerActor, targetActor, slot, options.choices || { templateType: options.template });
    const applyFollowerDerivation = options.applyFollowerDerivation || applyDefaultFollowerDerivation;
    const sourceTag = options.source ? `AllyAssignmentService.convertToFollower:${options.source}` : 'AllyAssignmentService.convertToFollower';

    // --- 2. Snapshot owner relationship state (captured BEFORE any mutation —
    // never re-derived from the live Actor after the transaction starts). ---
    const currentFollowers = clonePlain(asArray(ownerActor.getFlag?.(SYSTEM_ID, 'followers')));
    const currentOwnedActors = clonePlain(asArray(ownerActor.system?.ownedActors));
    const currentAssignedAllies = clonePlain(asArray(ownerActor.getFlag?.(SYSTEM_ID, ASSIGNED_ALLIES_FLAG)));
    const currentBeasts = clonePlain(asArray(ownerActor.getFlag?.(SYSTEM_ID, BEASTS_FLAG)));

    // --- 3. Snapshot target (real ActorEngine snapshot authority) ---
    const previousTargetFlags = clonePlain(targetActor.flags || {});
    const targetSnapshot = await SnapshotManager.createSnapshot(targetActor, 'Pre-conversion snapshot (Existing NPC → Follower)');

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
    const nextSlots = buildFollowerSlotUpdate(currentSlots, slotId, targetActor.id);
    const nextAssignedAllies = priorAssignment.assigned && priorAssignment.kind !== ASSIGNMENT_KIND.BEAST
      ? removeById(currentAssignedAllies, targetActor.id)
      : currentAssignedAllies;
    const nextBeasts = priorAssignment.assigned && priorAssignment.kind === ASSIGNMENT_KIND.BEAST
      ? removeById(currentBeasts, targetActor.id)
      : currentBeasts;

    const ownerConversionUpdate = {
      [`flags.${SYSTEM_ID}.followers`]: nextFollowers,
      [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: nextSlots,
      'system.ownedActors': nextOwnedActors,
      [`flags.${SYSTEM_ID}.${ASSIGNED_ALLIES_FLAG}`]: nextAssignedAllies,
      [`flags.${SYSTEM_ID}.${BEASTS_FLAG}`]: nextBeasts
    };
    const ownerRollbackUpdate = {
      [`flags.${SYSTEM_ID}.followers`]: currentFollowers,
      [`flags.${SYSTEM_ID}.${FOLLOWER_SLOTS_FLAG}`]: currentSlots,
      'system.ownedActors': currentOwnedActors,
      [`flags.${SYSTEM_ID}.${ASSIGNED_ALLIES_FLAG}`]: currentAssignedAllies,
      [`flags.${SYSTEM_ID}.${BEASTS_FLAG}`]: currentBeasts
    };

    // --- 5. Target metadata patch (follower fields + clears any prior
    // assignedAlly* flags in the SAME patch) ---
    const conversionMetadata = {
      ...buildFollowerConversionMetadata({ plan }),
      ...(priorAssignment.assigned ? buildAssignmentClearPatch() : {})
    };

    // --- 6-9. Run the atomic transaction: target metadata, then required
    // follower derivation, then owner relationship, then (optional in this
    // path) nothing further — order matters: derivation runs against the
    // target AFTER it is flagged as a follower (required for
    // updateFollowerForOwnerLevel's own isFollower check) but BEFORE the
    // owner-side commit, so a derivation failure never touches the owner or
    // the slot at all. ---
    const transaction = await runFollowerMutationTransaction([
      {
        name: 'target-conversion-commit',
        commit: async () => {
          await ActorEngine.updateActor(targetActor, conversionMetadata, { source: sourceTag });
        },
        rollback: async () => {
          await SnapshotManager.restoreSnapshot(targetActor, targetSnapshot.timestamp);
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
          await ActorEngine.updateActor(ownerActor, ownerConversionUpdate, { source: sourceTag });
        },
        rollback: async () => {
          await ActorEngine.updateActor(ownerActor, ownerRollbackUpdate, { source: `${sourceTag}:rollback` });
        }
      }
    ]);

    if (!transaction.ok) {
      swseLogger.warn('[AllyAssignmentService] convertToFollower failed and was rolled back', { owner: ownerActor.name, target: targetActor.name, error: transaction.error });
      throw transaction.error;
    }

    swseLogger.log('[AllyAssignmentService] Converted existing NPC to follower', { owner: ownerActor.name, target: targetActor.name, slotId });
    return targetActor;
  }
}
