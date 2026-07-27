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
 * follower. Deduplicates both `followers` and `ownedActors` by follower id
 * so re-running link (e.g. after a retry) never appends a second entry.
 * Pure — does not mutate its inputs or touch any Actor.
 *
 * @param {{currentFollowers?: object[], currentOwnedActors?: object[], followerLink: {id: string}}} params
 * @returns {{followers: object[], ownedActors: object[]}}
 */
export function buildFollowerLinkOwnerUpdate({ currentFollowers = [], currentOwnedActors = [], followerLink } = {}) {
  if (!followerLink?.id) {
    throw new Error('buildFollowerLinkOwnerUpdate requires followerLink.id');
  }

  const followers = (currentFollowers || []).filter(entry => entry?.id !== followerLink.id);
  followers.push(followerLink);

  const ownedActors = (currentOwnedActors || []).filter(entry => entry?.id !== followerLink.id);
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
export function buildFollowerSlotUpdate(slots = [], slotId, followerActorId) {
  const list = Array.isArray(slots) ? slots : [];
  if (!slotId) return list;

  return list.map(slot => (slot?.id === slotId
    ? { ...slot, createdActorId: followerActorId, updatedAt: new Date().toISOString() }
    : slot));
}
