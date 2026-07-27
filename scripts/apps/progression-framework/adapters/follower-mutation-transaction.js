/**
 * Follower Mutation Transaction
 *
 * MUTATION-GOVERNANCE ADDENDUM (Phase 6 follow-up).
 *
 * ActorEngine already governs *how* an individual Actor is mutated (every
 * governed call goes through MutationInterceptor authorization + a single
 * recomputation pass). It does not, by itself, make a *multi-step* or
 * *multi-Actor* follower operation (create a follower Actor, materialize its
 * Items/fields, then link it into the owner's follower list) succeed or fail
 * as one logical unit — a mid-sequence failure could previously leave the
 * owner's follower flag updated but the follower unlinked, or a follower
 * Actor created but never linked. This module is the narrow, pure
 * orchestration layer that closes that gap: a small sequence-of-steps
 * runner with reverse-order compensating rollback, plus the pure builder
 * functions the follower lifecycle operations (create/update/remove/link)
 * use to decide what to write and how to undo it.
 *
 * This is NOT a generic transaction engine and NOT a database transaction —
 * Foundry cannot commit multiple world documents atomically. It is an
 * explicit "do these steps in order; if one fails, undo everything already
 * done, in reverse order, best-effort" coordinator, which is the honest
 * approximation available in this environment. Every step's `commit`/
 * `rollback` is supplied by the caller (scripts/apps/follower-creator.js),
 * which is Foundry-heavy and cannot itself be loaded through the Node
 * Foundry-shim test harness (confirmed in Phase 5 — it transitively imports
 * `swse-application-v2.js`, which needs the full `foundry.applications.api`
 * surface). This module has zero Foundry dependency, so the orchestration
 * logic itself — sequencing, rollback order, error propagation, and the
 * idempotency/link-projection pure builders below — is fully Node-testable
 * with mock steps, independent of what real Actor/Item calls a production
 * step happens to make.
 */

/**
 * Run an ordered sequence of governed mutation steps with reverse-order
 * compensating rollback on failure.
 *
 * Each step is `{ name, commit(context) => result, rollback(result) => void }`.
 * `rollback` is optional — a step with no meaningful undo (e.g. a read-only
 * preflight check) may omit it. `commit`'s return value is passed to that
 * same step's `rollback` if a later step fails, and is also stored on the
 * shared `context` object under `step.name` so later steps can read earlier
 * results (e.g. the "link" step reading the "create-actor" step's created
 * follower id).
 *
 * Never throws — failures are reported in the returned result object so
 * callers can decide how to surface them (this mirrors ActorEngine's own
 * `applyMutationPlan`, which throws, but a multi-Actor sequence has no
 * single Actor to attach a thrown-and-caught error to, so this coordinator
 * reports structured failure instead of propagating).
 *
 * @param {Array<{name: string, commit: Function, rollback?: Function}>} steps
 * @param {{source?: string}} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   results?: any[],
 *   context?: object,
 *   error?: Error,
 *   failedStep?: string|null,
 *   completedSteps?: string[],
 *   rollbackFailed?: boolean,
 *   rollbackErrors?: Array<{step: string|null, error: Error}>
 * }>}
 */
export async function runFollowerMutationTransaction(steps = [], options = {}) {
  const completed = [];
  const context = {};

  for (const step of steps) {
    if (!step || typeof step.commit !== 'function') continue;
    try {
      const result = await step.commit(context);
      completed.push({ step, result });
      if (step.name) context[step.name] = result;
    } catch (error) {
      const { rollbackFailed, rollbackErrors } = await _rollbackCompletedSteps(completed);
      return {
        ok: false,
        error,
        failedStep: step.name || null,
        completedSteps: completed.map(entry => entry.step.name).filter(Boolean),
        rollbackFailed,
        rollbackErrors
      };
    }
  }

  return { ok: true, results: completed.map(entry => entry.result), context };
}

async function _rollbackCompletedSteps(completed) {
  let rollbackFailed = false;
  const rollbackErrors = [];

  for (let i = completed.length - 1; i >= 0; i -= 1) {
    const { step, result } = completed[i];
    if (typeof step.rollback !== 'function') continue;
    try {
      await step.rollback(result);
    } catch (rollbackError) {
      rollbackFailed = true;
      rollbackErrors.push({ step: step.name || null, error: rollbackError });
    }
  }

  return { rollbackFailed, rollbackErrors };
}

/**
 * Resolve a stable idempotency key for a follower finalization attempt.
 *
 * Prefers an explicit `finalizationToken` if the caller supplied one;
 * otherwise falls back to the progression follower slot id, which is
 * already stable per in-progress follower creation (`FollowerShell`
 * threads `dependencyContext.slotId` through into every follower mutation
 * bundle it builds). Returns null when neither is available — callers must
 * treat a null token as "cannot deduplicate," not as "safe to always
 * create," so a missing token should not silently disable duplicate
 * protection at higher layers that do have another way to detect repeats.
 *
 * @param {object} followerMutation
 * @returns {string|null}
 */
export function resolveFollowerFinalizationToken(followerMutation = {}) {
  const explicit = followerMutation?.finalizationToken;
  if (explicit) return String(explicit);

  const slotId = followerMutation?.slotId || followerMutation?.persistentChoices?.slotId;
  if (slotId) return `slot:${slotId}`;

  return null;
}

/**
 * Derive the runtime-only in-flight finalization guard key used to
 * coalesce two concurrent finalization attempts for the same owner/slot
 * into one actual creation attempt. Pure — a null owner id or token
 * produces null (no guard possible), which callers must treat as "cannot
 * guard," matching resolveFollowerFinalizationToken's own contract.
 *
 * @param {string|null|undefined} ownerActorId
 * @param {string|null|undefined} finalizationToken
 * @returns {string|null}
 */
export function buildFollowerFinalizationGuardKey(ownerActorId, finalizationToken) {
  if (!ownerActorId || !finalizationToken) return null;
  return `${ownerActorId}:${finalizationToken}`;
}

/**
 * Find an existing follower link record carrying a given finalization
 * token, so repeated finalization of the same slot/session returns the
 * already-created follower instead of creating a duplicate Actor.
 *
 * @param {Array<object>} followerLinks - plain link records (e.g. the
 *   owner's `flags.foundryvtt-swse.followers` array), each optionally
 *   carrying `finalizationToken`.
 * @param {string|null|undefined} token
 * @returns {object|null}
 */
export function findFollowerLinkForToken(followerLinks = [], token) {
  if (!token) return null;
  return (followerLinks || []).find(entry => entry?.finalizationToken === token) || null;
}

/**
 * Build the owner-side projection update for linking (or re-linking) a
 * follower. Deduplicates both `followers` and `ownedActors` by follower id,
 * so re-running link (e.g. after a retry) never appends a second entry —
 * AND, when `followerLink.finalizationToken` is set, also removes any
 * existing entry carrying that SAME token even if its Actor id differs.
 * That second rule matters for stale-token repair: if a finalization
 * token's original follower Actor no longer exists, recreating a follower
 * for the same token produces a new Actor with a NEW id, so an id-only
 * dedup would leave the stale, now-orphaned link record in place alongside
 * the new one — two records bearing the same token. Pure — does not
 * mutate its inputs or touch any Actor.
 *
 * @param {{currentFollowers?: object[], currentOwnedActors?: object[], followerLink: {id: string, finalizationToken?: string|null}}} params
 * @returns {{followers: object[], ownedActors: object[]}}
 */
export function buildFollowerLinkOwnerUpdate({ currentFollowers = [], currentOwnedActors = [], followerLink } = {}) {
  if (!followerLink?.id) {
    throw new Error('buildFollowerLinkOwnerUpdate requires followerLink.id');
  }

  const isSuperseded = (entry) => {
    if (entry?.id === followerLink.id) return true;
    if (followerLink.finalizationToken && entry?.finalizationToken === followerLink.finalizationToken) return true;
    return false;
  };

  const followers = (currentFollowers || []).filter(entry => !isSuperseded(entry));
  followers.push(followerLink);

  const ownedActors = (currentOwnedActors || []).filter(entry => !isSuperseded(entry));
  ownedActors.push(followerLink);

  return { followers, ownedActors };
}

/**
 * Build the owner-side projection update for unlinking a follower. Pure —
 * does not mutate its inputs or touch any Actor.
 *
 * @param {{currentFollowers?: object[], currentOwnedActors?: object[], followerId: string}} params
 * @returns {{followers: object[], ownedActors: object[]}}
 */
export function buildFollowerUnlinkOwnerUpdate({ currentFollowers = [], currentOwnedActors = [], followerId } = {}) {
  return {
    followers: (currentFollowers || []).filter(entry => entry?.id !== followerId),
    ownedActors: (currentOwnedActors || []).filter(entry => entry?.id !== followerId)
  };
}

/**
 * Build the updated follower-slots array after a follower is created for a
 * given slot. Pure, dedup-safe (updates the matching slot in place rather
 * than appending), and a no-op if the slot cannot be found.
 *
 * @param {object[]} slots
 * @param {string|null|undefined} slotId
 * @param {string} followerActorId
 * @returns {object[]}
 */
function flattenWithPaths(value, prefix, out) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    out[prefix] = value;
    return out;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) {
    out[prefix] = value;
    return out;
  }
  for (const key of keys) {
    flattenWithPaths(value[key], prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

/**
 * CORRECTION — build a flag-restoration patch that correctly deletes flag
 * keys introduced since a snapshot was taken, not just overwrites keys
 * that already existed. A previous rollback path called
 * `ActorEngine.updateActor(follower, {flags: preUpdateFlags})` directly;
 * Foundry's `Document#update()` recursively MERGES nested objects by
 * default, so passing the complete previous `flags` object only overwrites
 * keys present in that object — it does not remove a key that exists now
 * but did not exist in the snapshot (e.g. a failed update that newly set
 * `flags.foundryvtt-swse.isDroid` before throwing later). Foundry's
 * supported mechanism for a governed deletion is prefixing the final path
 * segment with `-=` (e.g. `'flags.foundryvtt-swse.-=isDroid': null`).
 *
 * This is pure and deterministic: given a "before" and "after" flags
 * object, it returns a flat dot-path patch that, applied via
 * `ActorEngine.updateActor(actor, patch)`, restores every previously
 * existing value and deletes every key that is new since the snapshot.
 *
 * @param {object} previousFlags - the flags object captured before mutation.
 * @param {object} currentFlags - the actor's live flags object at rollback time.
 * @returns {Object<string, any>} a dot-path patch, keys prefixed with `flags.`.
 */
export function buildFlagRestorationPatch(previousFlags = {}, currentFlags = {}) {
  const previousFlat = flattenWithPaths(previousFlags || {}, '', {});
  const currentFlat = flattenWithPaths(currentFlags || {}, '', {});
  const patch = {};

  for (const [path, value] of Object.entries(previousFlat)) {
    if (!path) continue;
    patch[`flags.${path}`] = value;
  }

  for (const path of Object.keys(currentFlat)) {
    if (!path || Object.prototype.hasOwnProperty.call(previousFlat, path)) continue;
    const segments = path.split('.');
    const leafKey = segments.pop();
    const parentPath = segments.join('.');
    const deletionKey = parentPath ? `flags.${parentPath}.-=${leafKey}` : `flags.-=${leafKey}`;
    patch[deletionKey] = null;
  }

  return patch;
}

export function buildFollowerSlotUpdate(slots = [], slotId, followerActorId) {
  const list = Array.isArray(slots) ? slots : [];
  if (!slotId) return list;

  return list.map(slot => (slot?.id === slotId
    ? { ...slot, createdActorId: followerActorId, updatedAt: new Date().toISOString() }
    : slot));
}

/**
 * Clear `createdActorId` on whichever follower slot(s) currently point at a
 * given follower Actor id — used when removing/unlinking a follower so its
 * slot does not keep claiming an Actor that is being deleted or unlinked.
 * Pure, never mutates its input, and is a no-op if no slot matches.
 *
 * @param {object[]} slots
 * @param {string|null|undefined} followerActorId
 * @returns {object[]}
 */
export function clearFollowerSlotByActorId(slots = [], followerActorId) {
  const list = Array.isArray(slots) ? slots : [];
  if (!followerActorId) return list;

  return list.map(slot => (slot?.createdActorId === followerActorId
    ? { ...slot, createdActorId: null, updatedAt: new Date().toISOString() }
    : slot));
}
