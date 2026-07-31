/**
 * Deletion-Aware Patch Builder
 *
 * PHASE 10 ADDENDUM (P1-7) — Exact, Failure-Aware Snapshot Restoration.
 *
 * Pure, dependency-free generalization of the flatten-then-diff pattern
 * already established by
 * scripts/apps/progression-framework/adapters/follower-mutation-transaction.js's
 * `buildFlagRestorationPatch()` (which is itself left untouched — this
 * module exists so snapshot restoration doesn't reimplement a second,
 * possibly-conflicting version of the same flatten/diff logic).
 *
 * Restoring a nested object (Actor `system`, `flags`, `ownership`,
 * `prototypeToken`, etc.) by merging the PREVIOUS value back in is not
 * enough: Foundry's `Document#update()` merges nested plain objects key
 * by key, so any key introduced into the CURRENT value after the
 * snapshot was taken survives the merge untouched. `buildDeletionAwarePatch()`
 * produces a flat dot-path patch that both restores every value present
 * in `previous` and explicitly deletes (via Foundry's `-=key` convention)
 * every key present in `current` but absent from `previous`.
 */

/**
 * Flatten a plain-data value into `{dotPath: leafValue}` pairs. Arrays and
 * non-plain objects (class instances) are treated as atomic leaf values,
 * not recursed into — matching the convention already established by
 * `buildFlagRestorationPatch()`'s private `flattenWithPaths()`.
 *
 * @param {unknown} value
 * @param {string} [prefix]
 * @param {Record<string, unknown>} [out]
 * @returns {Record<string, unknown>}
 */
export function flattenWithPaths(value, prefix = '', out = {}) {
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
 * Build a flat dot-path patch, rooted at `rootPath`, that restores every
 * leaf value present in `previous` and deletes every leaf path present in
 * `current` but absent from `previous`.
 *
 * @param {object} params
 * @param {object} [params.previous] - the value to restore TO (e.g. a
 *   snapshot's `system`/`flags`/`ownership`/`prototypeToken`).
 * @param {object} [params.current] - the value currently on the live
 *   document, used only to detect keys introduced since the snapshot.
 * @param {string} params.rootPath - the dot-path prefix this subtree
 *   lives under (e.g. `'system'`, `'flags'`, `'ownership'`,
 *   `'prototypeToken'`). Pass `''` to patch at the document root itself.
 * @param {string[]} [params.excludePaths] - dot-paths (relative to
 *   `rootPath`, e.g. `'foundryvtt-swse.snapshots'`) to exclude entirely
 *   from both restoration and deletion — used to protect the snapshot
 *   history ledger itself from being touched by a restore.
 * @returns {Record<string, unknown>} a flat patch suitable for
 *   `ActorEngine.updateActor()`.
 */
/**
 * Every prefix path (at every depth, including the full leaf path itself)
 * that appears anywhere in a flattened map — used to tell "this whole
 * subtree is new since the snapshot" (delete its shallowest missing
 * ancestor key in one shot) apart from "this container already existed
 * and merely grew a new leaf/branch" (delete just the new part, leaving
 * the rest of the container alone). Without this, deleting only the
 * deepest new leaves strands emptied-out (but still present) parent
 * objects behind — Foundry's `-=key` convention has no way to
 * retroactively remove a parent once one of its children has already
 * been deleted individually.
 *
 * @param {Record<string, unknown>} flatMap
 * @returns {Set<string>}
 */
function collectKnownPaths(flatMap) {
  const known = new Set();
  for (const path of Object.keys(flatMap)) {
    if (!path) continue;
    const segments = path.split('.');
    for (let i = 1; i <= segments.length; i++) {
      known.add(segments.slice(0, i).join('.'));
    }
  }
  return known;
}

export function buildDeletionAwarePatch({ previous = {}, current = {}, rootPath, excludePaths = [] } = {}) {
  const excluded = new Set(excludePaths);
  const isExcluded = (path) => excluded.has(path) || excludePaths.some(ex => path === ex || path.startsWith(`${ex}.`));

  const previousFlat = flattenWithPaths(previous ?? {});
  const currentFlat = flattenWithPaths(current ?? {});
  const patch = {};

  const prefixed = (path) => (rootPath ? (path ? `${rootPath}.${path}` : rootPath) : path);

  const previousKnownPaths = collectKnownPaths(previousFlat);

  for (const [path, value] of Object.entries(previousFlat)) {
    if (isExcluded(path)) continue;
    patch[prefixed(path)] = value;
  }

  const deletedPrefixes = new Set();
  for (const path of Object.keys(currentFlat)) {
    if (isExcluded(path)) continue;
    if (Object.prototype.hasOwnProperty.call(previousFlat, path)) continue;

    const segments = path.split('.');

    // Find the shallowest ancestor prefix (including the leaf path itself)
    // that `previous` never mentions at all — that's the boundary of the
    // subtree that's entirely new since the snapshot, and the single
    // point at which it must be deleted.
    let deletionDepth = segments.length;
    for (let i = 1; i <= segments.length; i++) {
      const prefix = segments.slice(0, i).join('.');
      if (!previousKnownPaths.has(prefix)) {
        deletionDepth = i;
        break;
      }
    }

    const deletionSegments = segments.slice(0, deletionDepth);
    const deletionPath = deletionSegments.join('.');
    if (deletedPrefixes.has(deletionPath)) continue;
    deletedPrefixes.add(deletionPath);
    if (isExcluded(deletionPath)) continue;

    const leafKey = deletionSegments[deletionSegments.length - 1];
    const parentPath = deletionSegments.slice(0, -1).join('.');
    const deletionParent = prefixed(parentPath);
    const deletionKey = deletionParent ? `${deletionParent}.-=${leafKey}` : `-=${leafKey}`;
    patch[deletionKey] = null;
  }

  return patch;
}

/**
 * ROUND-2 CORRECTION (P1-7 exact-verification pass).
 *
 * Apply a flat dot-path patch (the same shape `buildDeletionAwarePatch()`
 * produces — dotted keys, `-=key` deletion convention) to a plain-data
 * object, returning a NEW object; never mutates `base`.
 *
 * This is the pure counterpart of what `ActorEngine.updateActor()` is
 * expected to do to a real Foundry document, and is used ONLY for
 * verification: after the real mutation runs, restoration compares the
 * actor's ACTUAL post-mutation state against `applyFlatPatch(preMutationState,
 * patch)` — the state the patch itself claims to produce — rather than
 * assuming the mutation succeeded just because `ActorEngine.updateActor()`
 * didn't throw. A prior version of this module had no such check: a root
 * update could be silently normalized, partially applied, or otherwise
 * diverge from the patch, and restoration would still report `exact: true`.
 *
 * @param {object} base
 * @param {Record<string, unknown>} patch
 * @returns {object}
 */
export function applyFlatPatch(base, patch = {}) {
  const result = (base && typeof base === 'object' && !Array.isArray(base))
    ? JSON.parse(JSON.stringify(base))
    : {};

  for (const [dotPath, value] of Object.entries(patch)) {
    const segments = dotPath.split('.');
    const lastKey = segments[segments.length - 1];
    const isDeletion = lastKey.startsWith('-=');

    let node = result;
    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i];
      if (typeof node[key] !== 'object' || node[key] === null || Array.isArray(node[key])) {
        node[key] = {};
      }
      node = node[key];
    }

    if (isDeletion) {
      delete node[lastKey.slice(2)];
    } else {
      node[lastKey] = value;
    }
  }

  return result;
}
