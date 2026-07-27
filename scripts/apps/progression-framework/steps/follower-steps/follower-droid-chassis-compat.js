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
  INCOMPLETE: 'incomplete'
});

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
