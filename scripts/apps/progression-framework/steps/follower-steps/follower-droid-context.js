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

/**
 * Whether a droidConfig shape represents a genuine, already-built chassis
 * (from the canonical FollowerDroidBuilderStep) rather than a bare
 * identity marker or a pre-consolidation placeholder.
 *
 * @param {object|null|undefined} droidConfig
 * @returns {boolean}
 */
export function hasRealFollowerDroidBuild(droidConfig) {
  return Boolean(droidConfig?.isDroid === true && droidConfig?.droidSystems && typeof droidConfig.droidSystems === 'object');
}

/**
 * The minimal droid-identity marker FollowerOriginStep should seed when
 * the user selects "Droid" — just enough for `isFollowerDroidDraft()` to
 * resolve true and route the follower into the one canonical Droid
 * Chassis step. Deliberately does NOT invent size/locomotion/speed/
 * ability-bonus defaults: those are FollowerDroidBuilderStep's job, and
 * pre-seeding them here made the chassis step open with choices already
 * appearing made before the user ever visited it. A genuine prior build
 * (the user already configured a real chassis, then toggled Living/Droid
 * a few times before finishing) is preserved as-is rather than discarded.
 *
 * @param {object|null|undefined} existingDroidConfig - the follower's
 *   current draftSelections.droidConfig, if any.
 * @returns {{isDroid: true}}
 */
export function seedMinimalFollowerDroidIdentity(existingDroidConfig) {
  if (hasRealFollowerDroidBuild(existingDroidConfig)) return existingDroidConfig;
  return { isDroid: true };
}

/**
 * Clear every piece of droid-construction state from a follower
 * progression session — not just `draftSelections.droidConfig`. Used
 * when the user switches an in-progress follower from Droid back to
 * Living, so no stale chassis/budget/constraint state survives into the
 * organic path. Never mutates a persisted Actor — this only touches the
 * in-memory progression session's draft data.
 *
 * @param {object} session - progressionSession (exposes draftSelections
 *   and, once the droid-builder step has run, droidContext).
 */
/**
 * ADDENDUM — canonical, sole ability-bonus rule for droid followers. No
 * repository documentation supports an independent free ability choice for
 * droid followers the way living followers get one from their template
 * (see TEMPLATE_ABILITY_OPTIONS in follower-step-base.js — a genuinely
 * different, template-driven mechanic). The removed pre-Phase-6
 * species-step droid branch let the user pick freely; that was part of the
 * bug being fixed, not a legitimate parallel rule.
 */
export const FOLLOWER_DROID_DEGREE_ABILITY = Object.freeze({
  '1st-degree': 'int',
  '2nd-degree': 'int',
  '3rd-degree': 'cha',
  '4th-degree': 'dex',
  '5th-degree': 'str'
});

/**
 * Resolve the ability bonus for a droid follower from its degree alone.
 * Deliberately takes no "existing/stray ability choice" parameter — a
 * legacy session's stray abilityChoice value must never override this.
 *
 * @param {string} degree - e.g. '2nd-degree'.
 * @returns {string} ability key, e.g. 'int'.
 */
export function resolveFollowerDroidAbilityChoice(degree) {
  return FOLLOWER_DROID_DEGREE_ABILITY[String(degree || '').toLowerCase()] || 'int';
}

export function clearFollowerDroidConstructionState(session) {
  if (!session) return;
  const draft = session.draftSelections || (session.draftSelections = {});
  draft.droidConfig = null;
  draft.droid = null;
  if (session.droidContext !== undefined) session.droidContext = null;
  const pendingSpeciesContext = draft.pendingSpeciesContext;
  if (pendingSpeciesContext) {
    if (pendingSpeciesContext.metadata) delete pendingSpeciesContext.metadata.droidBuilder;
    if (pendingSpeciesContext.ledger?.rules) delete pendingSpeciesContext.ledger.rules.droidBuilder;
  }
}
