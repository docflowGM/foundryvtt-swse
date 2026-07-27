/**
 * Follower Droid Context
 *
 * PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step.
 *
 * Single, canonical, pure answer to "is this follower a droid, given its
 * current draft selections". Before this phase, this same three-way OR
 * chain (`followerKind === 'droid'`, `droidConfig?.isDroid === true`,
 * `speciesName === 'droid'`) was independently re-derived in at least four
 * places — `FollowerShell._shouldSkipFollowerStep`,
 * `FollowerShell._getMissingFollowerRequirements`,
 * `FollowerDroidBuilderStep._isDroidFollowerDraft`, and (a two-way subset,
 * missing the speciesName fallback) `FollowerSpeciesStep.onStepEnter` — a
 * fragmentation that made it easy for two independently-reachable droid
 * steps to disagree about whether the current follower even was a droid.
 * See docs/audits/follower-droid-chassis-step-consolidation-phase-6.md.
 *
 * @param {object} draft - progressionSession.draftSelections (or an
 *   equivalent choices object exposing the same three fields).
 * @returns {boolean}
 */
export function isFollowerDroidDraft(draft = {}) {
  return draft?.followerKind === 'droid'
    || draft?.droidConfig?.isDroid === true
    || String(draft?.speciesName || '').toLowerCase() === 'droid';
}
