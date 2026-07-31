/**
 * Follower Step Visibility
 *
 * PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step.
 *
 * Pure extraction of the per-step applicability decision previously inline
 * in `FollowerShell._shouldSkipFollowerStep()`. Extracted so the actual
 * decision — which steps a droid vs. organic follower, or a fixed-profile
 * follower, should see — is unit-testable without instantiating
 * `FollowerShell` (a large ApplicationV2-derived class with its own
 * Foundry-dependent import graph). `FollowerShell._shouldSkipFollowerStep()`
 * resolves its own instance-dependent inputs (draft, fixed profile, talent
 * config) and delegates the actual decision here; behavior is unchanged.
 *
 * This is also the single place that answers "is this step part of the
 * currently-applicable follower step plan" — used both by
 * `FollowerShell._findNextApplicableStep`/`_findPreviousApplicableStep`
 * (Next/Back auto-advance, pre-existing) and by
 * `FollowerShell._recomputeFollowerSteps()` (the progress rail and
 * rail-click navigation, added this phase — see that method's own doc
 * comment for why the rail needed the same filter Next/Back already had).
 */

/**
 * @param {string} stepId
 * @param {object} context
 * @param {boolean} [context.isDroid] - resolved via isFollowerDroidDraft(draft).
 * @param {string} [context.templateType] - lowercased draft.templateType.
 * @param {object|null} [context.fixedProfile] - resolved fixed-follower profile, if any.
 * @param {object|null} [context.cfg] - resolved follower talent config, if any.
 * @returns {boolean} true if this step should be excluded from the active plan.
 */
export function shouldSkipFollowerStep(stepId, { isDroid = false, templateType = '', fixedProfile = null, cfg = null } = {}) {
  if (fixedProfile) {
    if (stepId === 'follower-origin') return cfg?.skipOriginSelection !== false;
    if (stepId === 'species') return true;
    if (stepId === 'droid-builder') return true;
    if (stepId === 'background') return fixedProfile.skipBackground !== false;
    if (stepId === 'languages') return fixedProfile.skipLanguages !== false;
  }

  // Droid followers do not use the organic species browser. They route into
  // the shared droid systems builder instead — the one canonical
  // "Droid Chassis" step (see docs/audits/follower-droid-chassis-step-consolidation-phase-6.md).
  if (stepId === 'species' && isDroid) return true;
  if (stepId === 'droid-builder' && !isDroid) return true;

  // Utility followers choose one broad practical skill. Aggressive and
  // Defensive followers get their template skill package automatically, so
  // there is no player-facing Skills step to show.
  if (stepId === 'skills' && String(templateType || '').toLowerCase() !== 'utility') return true;

  return false;
}

/**
 * Filter a full canonical descriptor list down to the steps currently
 * applicable for this follower context — the same filter
 * `_findNextApplicableStep`/`_findPreviousApplicableStep` already apply
 * per-index, now applied to the whole list at once so the progress rail
 * and rail-click navigation see exactly the same step plan.
 *
 * @param {{stepId: string}[]} descriptors
 * @param {object} context - see shouldSkipFollowerStep.
 * @returns {{stepId: string}[]}
 */
export function computeApplicableFollowerSteps(descriptors, context) {
  return (descriptors || []).filter(d => !shouldSkipFollowerStep(d?.stepId, context));
}

/**
 * Given a freshly-recomputed step list, find where the previously-current
 * step now lives (it may have moved, or may no longer be applicable at
 * all — e.g. the user changed Living/Droid and the step they were on
 * disappeared). Falls back to `fallbackIndex` (normally the first
 * applicable step) rather than an arbitrary index, so a step-plan change
 * never strands the user on the wrong descriptor.
 *
 * @param {{stepId: string}[]} nextSteps
 * @param {string|null} currentStepId
 * @param {number} [fallbackIndex]
 * @returns {number}
 */
export function resolvePreservedFollowerStepIndex(nextSteps, currentStepId, fallbackIndex = 0) {
  if (currentStepId) {
    const idx = (nextSteps || []).findIndex(d => d?.stepId === currentStepId);
    if (idx >= 0) return idx;
  }
  return fallbackIndex;
}

/**
 * Cheap equality check for "did the applicable step list actually change
 * shape" — used to avoid needless plugin re-instantiation/index repair on
 * every render when nothing about the follower's droid/organic status,
 * template type, or fixed profile has changed since the last recompute.
 *
 * @param {{stepId: string}[]} previousSteps
 * @param {{stepId: string}[]} nextSteps
 * @returns {boolean}
 */
export function followerStepListsAreEqual(previousSteps, nextSteps) {
  const prev = previousSteps || [];
  const next = nextSteps || [];
  if (prev.length !== next.length) return false;
  return next.every((d, i) => d?.stepId === prev[i]?.stepId);
}
