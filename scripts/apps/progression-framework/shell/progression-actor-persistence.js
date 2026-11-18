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
