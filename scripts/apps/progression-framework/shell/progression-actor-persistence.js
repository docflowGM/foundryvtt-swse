/**
 * Progression actor persistence lifecycle.
 *
 * `launchNewProgression()` builds a TRANSIENT actor (`parent: null`, no id). A
 * completed creation must end as a genuine world Actor, and an abandoned draft
 * must never be persisted. So the world actor is created exactly once, at the
 * finalization boundary (after validation, before the mutation plan), and the
 * shell/session are re-pointed at it. Failure before the plan commits removes
 * the actor this attempt created, so a retry cannot leave duplicates.
 *
 * Creation uses Foundry's document API (`Actor.create`) through the injected
 * `createActor` seam (defaults to the v13-safe wrapper); all subsequent
 * mutation still flows through ActorEngine.applyMutationPlan.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * A transient progression actor has no persistent id or is not a member of the
 * world collection. Embedded/token actors are never treated as transient.
 */
export function isTransientProgressionActor(actor) {
  if (!actor) return false;
  if (actor.isToken === true || actor.parent) return false;
  if (!actor.id) return true;
  // An id alone is not proof of persistence for a document built with
  // `new Actor(data, {parent:null})`: it is transient when it is not in the
  // world collection (collection === null) and the world has no such actor.
  if (actor.collection === null) return !globalThis.game?.actors?.get?.(actor.id);
  return false;
}

function toCreateData(actor) {
  const data = typeof actor.toObject === 'function' ? actor.toObject() : JSON.parse(JSON.stringify(actor));
  delete data._id; // let Foundry assign the persistent id
  return data;
}

/**
 * Persist a transient progression actor as a world actor, once.
 * @param {Actor} actor
 * @param {{createActor?: Function, deleteActor?: Function}} [seams]
 * @returns {Promise<{actor: Actor, created: boolean}>} `created` is true only when
 *   THIS call created the world actor (the caller owns cleanup of it).
 */
export async function materializeTransientProgressionActor(actor, seams = {}) {
  if (!actor) throw new Error('materializeTransientProgressionActor: no actor');
  if (!isTransientProgressionActor(actor)) return { actor, created: false };

  const create = seams.createActor
    || (async (data) => globalThis.Actor.create(data, { renderSheet: false }));
  const created = await create(toCreateData(actor));
  if (!created?.id) {
    throw new Error('World actor creation failed: Foundry returned no persistent actor');
  }
  swseLogger.log('[ProgressionActorPersistence] Materialized world actor', { actorId: created.id, type: created.type });
  return { actor: created, created: true };
}

/**
 * Remove an actor this finalization attempt created after the plan definitely
 * did not commit. Never called when the outcome is indeterminate.
 */
export async function discardMaterializedProgressionActor(actor, seams = {}) {
  if (!actor?.id) return false;
  const remove = seams.deleteActor || (async (doc) => doc.delete());
  try {
    await remove(actor);
    return true;
  } catch (err) {
    swseLogger.error('[ProgressionActorPersistence] Could not remove the draft world actor after a failed finalization', err);
    return false;
  }
}

/**
 * May the world actor this attempt created be deleted after `result`? Only when
 * the finalizer definitely did NOT commit anything: never after success, never
 * when `committed` is true (even with success:false, e.g. a post-apply audit
 * failure), never when the outcome is indeterminate / partial, and never when a
 * rollback was attempted but not verified.
 * @param {Object|null} result  the finalizer's return value
 */
export function canDiscardMaterializedActor(result) {
  if (!result || typeof result !== 'object') return false;   // unknown outcome: keep the actor
  if (result.success === true) return false;
  if (result.committed === true) return false;
  if (result.indeterminate === true || result.partialMutationPossible === true) return false;
  if (result.rollbackOutcome && result.rollbackOutcome !== 'FAILED_COMPENSATED') return false;
  return true;
}

/**
 * The create -> flush -> finalize -> cleanup lifecycle for one finalization attempt.
 *
 * Cleanup is decided from WHAT IS KNOWN about the mutation, never from "success":
 *   - the finalizer was never dispatched (materialize/flush failed first): nothing
 *     was mutated, so an actor THIS attempt created is discarded;
 *   - dispatched and the finalizer reported a definite non-commit (see
 *     canDiscardMaterializedActor): discarded;
 *   - dispatched and committed / indeterminate / partial / unverified rollback /
 *     finalizer threw (outcome unknown): the actor is KEPT.
 *
 * @param {Object} p
 * @param {Actor} p.actor                       actor at dispatch time (possibly transient)
 * @param {(actor)=>Promise<boolean>} p.flush   durability flush; false/throw = not durable
 * @param {(actor)=>Promise<Object>} p.dispatch calls the finalizer, returns its report
 * @param {(actor)=>void} [p.onActorChanged]    re-points the caller at the current actor
 * @param {Object} [p.seams]                    createActor / deleteActor test seams
 * @returns {Promise<{phase: 'materialize-failed'|'flush-failed'|'dispatched'|'dispatch-threw',
 *   actor: Actor, result: (Object|null), error: (Error|null), created: boolean, discarded: boolean}>}
 */
export async function runFinalizationWithDraftLifecycle({ actor, flush, dispatch, onActorChanged = () => {}, seams = {} }) {
  const transientActor = actor;
  let current = actor;
  let created = false;
  let discarded = false;

  const discard = async () => {
    if (!created) return false;
    if (await discardMaterializedProgressionActor(current, seams)) {
      current = transientActor;
      onActorChanged(transientActor);
      discarded = true;
      return true;
    }
    return false;
  };
  const outcome = (phase, extra = {}) => ({ phase, actor: current, result: null, error: null, created, discarded, ...extra });

  if (isTransientProgressionActor(current)) {
    try {
      const res = await materializeTransientProgressionActor(current, seams);
      current = res.actor;
      created = res.created;
      onActorChanged(current);
    } catch (error) {
      return outcome('materialize-failed', { actor: transientActor, error });
    }
  }

  let flushed = false;
  try {
    flushed = (await flush(current)) !== false;
  } catch (error) {
    swseLogger.warn('[ProgressionActorPersistence] Session flush threw before finalization', error);
    flushed = false;
  }
  if (!flushed) {
    // The finalizer was never dispatched: no progression mutation started, so the outcome is KNOWN.
    await discard();
    return outcome('flush-failed');
  }

  let result = null;
  try {
    result = await dispatch(current);
  } catch (error) {
    // Dispatched and threw: the plan may or may not have applied. Unknown outcome => keep the actor.
    return outcome('dispatch-threw', { error });
  }

  if (created && canDiscardMaterializedActor(result)) await discard();
  return outcome('dispatched', { result });
}
