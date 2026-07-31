/**
 * Follower Droid Chassis Session Compatibility
 *
 * PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step.
 *
 * Before this phase, two independently-reachable steps
 * (`FollowerSpeciesStep`'s droid branch and `FollowerDroidBuilderStep`)
 * both wrote to the single `draftSelections.droidConfig` key, with
 * different, incompatible shapes: the removed species-step branch wrote a
 * hardcoded `{baseSystems, optionalSystems}` array pair with no connection
 * to the real droid-part catalog; the canonical `droid-builder` step
 * writes a full `{droidSystems: {locomotion, processor, appendages,
 * accessories, ...}}` object built from the real catalog. Because both
 * wrote the exact same key, only one shape could ever be persisted at a
 * time (last write wins) — there is no "two different valid selections
 * stored simultaneously" case to reconcile for this specific field. What
 * an old, already-in-progress follower chargen session CAN legitimately
 * contain is the removed step's shape only (a follower who was mid-way
 * through the old "Species / Chassis" droid branch when this phase
 * landed), which cannot be safely translated into a real chassis
 * selection — its ids never corresponded to the canonical droid-part
 * catalog — so it must be classified as needing reconfiguration rather
 * than silently promoted to "valid".
 *
 * This module only classifies; it never mutates the session itself. The
 * canonical `FollowerDroidBuilderStep.onStepEnter()` already re-seeds a
 * fresh, real chassis build whenever no canonical `droidSystems` object is
 * present (see `_seedFollowerDroidSession`), so classifying a legacy
 * selection as needing reconfiguration is sufficient to make the step
 * self-heal on next visit — this module exists to make that state
 * explicit, inspectable, and testable rather than purely incidental.
 */

export const FOLLOWER_DROID_CHASSIS_SESSION_STATE = Object.freeze({
  NONE: 'none',
  VALID: 'valid',
  LEGACY_NEEDS_RECONFIGURATION: 'legacy-needs-reconfiguration',
  INCOMPLETE: 'incomplete',
  CONFLICT: 'conflict'
});

/**
 * Whether a droidConfig/droid shape represents a genuine, already-built
 * chassis (real `droidSystems` from the canonical builder) rather than a
 * bare identity marker or legacy placeholder.
 *
 * @param {object|null|undefined} candidate - a `droidConfig` or `droid` shape.
 * @returns {boolean}
 */
function isRealChassisBuild(candidate) {
  return Boolean(candidate?.droidSystems && typeof candidate.droidSystems === 'object');
}

/**
 * ADDENDUM — Full 6-point legacy session compatibility precedence for
 * follower droid chassis state, resolving which of the two possible
 * in-session representations (`draftSelections.droid`, the canonical
 * shared-builder state, vs `draftSelections.droidConfig.droidBuild`, its
 * mirrored follower-compatibility projection — see
 * `FollowerDroidBuilderStep._syncDraftDroidIdentity`) is authoritative for
 * an in-progress or resumed follower session:
 *
 *   1. If `draft.droid` contains a real shared-builder state, it wins.
 *   2. If only legacy `droidConfig.droidBuild` exists, restore it into
 *      `draft.droid`.
 *   3. If only the old Species-step shape exists (`droidConfig.baseSystems`/
 *      `optionalSystems` arrays, disconnected from the canonical catalog —
 *      see `classifyFollowerDroidChassisSelection`), translate only the
 *      fields that are safe to translate (degree, size) into a provisional
 *      builder state; the systems themselves cannot be safely mapped and
 *      are left for the canonical step to rebuild from scratch.
 *   4. If both `draft.droid` and `droidConfig.droidBuild` contain real,
 *      *disagreeing* system selections, the chassis step is marked
 *      incomplete and requires manual review — never resolved by picking
 *      one side silently.
 *   5. Never combine duplicate systems from both representations into one.
 *   6. This function only classifies; it never mutates the session or an
 *      Actor.
 *
 * @param {object} draft - `progressionSession.draftSelections` (or an
 *   equivalent choices object exposing `droid` and `droidConfig`).
 * @returns {{source: string, resolvedBuild: object|null, state: string, reasons: string[]}}
 */
export function resolveFollowerDroidChassisPrecedence(draft = {}) {
  const draftDroid = draft?.droid || null;
  const droidConfig = draft?.droidConfig || null;
  const legacyBuild = droidConfig?.droidBuild || null;

  const draftDroidIsReal = isRealChassisBuild(draftDroid);
  const legacyBuildIsReal = isRealChassisBuild(legacyBuild);

  if (draftDroidIsReal && legacyBuildIsReal) {
    const sameSystems = JSON.stringify(draftDroid.droidSystems) === JSON.stringify(legacyBuild.droidSystems);
    if (sameSystems) {
      return { source: 'draft-droid', resolvedBuild: draftDroid, state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID, reasons: [] };
    }
    // Point 4 + 5: disagreeing real builds are never silently combined or
    // silently resolved by picking a side — surfaced as a conflict instead.
    return {
      source: 'conflict',
      resolvedBuild: null,
      state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.CONFLICT,
      reasons: [
        'draftSelections.droid and draftSelections.droidConfig.droidBuild contain different, disagreeing chassis system selections. This follower\'s Droid Chassis step requires manual review before it can be considered complete.'
      ]
    };
  }

  // Point 1: draft.droid wins outright when it is the only real build.
  if (draftDroidIsReal) {
    return { source: 'draft-droid', resolvedBuild: draftDroid, state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID, reasons: [] };
  }

  // Point 2: only the legacy mirrored projection is real — restore it.
  if (legacyBuildIsReal) {
    return {
      source: 'legacy-droid-build',
      resolvedBuild: legacyBuild,
      state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID,
      reasons: ['Restoring draftSelections.droid from legacy draftSelections.droidConfig.droidBuild.']
    };
  }

  // Point 3: only the old Species-step shape exists. Translate only the
  // fields that are safe (degree/size) — never the disconnected system
  // arrays themselves.
  const classification = classifyFollowerDroidChassisSelection(droidConfig);
  if (classification.state === FOLLOWER_DROID_CHASSIS_SESSION_STATE.LEGACY_NEEDS_RECONFIGURATION) {
    const provisional = {
      isDroid: true,
      droidDegree: droidConfig?.droidDegree || null,
      droidSize: droidConfig?.size || droidConfig?.droidSize || null,
      droidSystems: null
    };
    return {
      source: 'legacy-species-shape',
      resolvedBuild: provisional,
      state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.LEGACY_NEEDS_RECONFIGURATION,
      reasons: classification.reasons
    };
  }

  return {
    source: 'none',
    resolvedBuild: draftDroid || null,
    state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.INCOMPLETE,
    reasons: ['No chassis has been configured yet.']
  };
}

/**
 * Classify a follower draft's current `droidConfig` selection.
 *
 * @param {object|null|undefined} droidConfig - `draftSelections.droidConfig`.
 * @returns {{state: string, canonical: boolean, reasons: string[]}}
 */
export function classifyFollowerDroidChassisSelection(droidConfig) {
  if (!droidConfig || droidConfig.isDroid !== true) {
    return { state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.NONE, canonical: false, reasons: [] };
  }

  const hasCanonicalSystems = Boolean(droidConfig.droidSystems && typeof droidConfig.droidSystems === 'object');
  if (hasCanonicalSystems) {
    return { state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID, canonical: true, reasons: [] };
  }

  const hasLegacyShapeOnly = Array.isArray(droidConfig.baseSystems) || Array.isArray(droidConfig.optionalSystems);
  if (hasLegacyShapeOnly) {
    return {
      state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.LEGACY_NEEDS_RECONFIGURATION,
      canonical: false,
      reasons: ['This follower has a chassis selection from a removed, non-canonical chassis step. It will be reconfigured from the real droid-systems catalog the next time the Droid Chassis step is entered.']
    };
  }

  return {
    state: FOLLOWER_DROID_CHASSIS_SESSION_STATE.INCOMPLETE,
    canonical: false,
    reasons: ['No chassis has been configured yet.']
  };
}
