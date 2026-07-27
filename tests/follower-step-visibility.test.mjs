import assert from 'node:assert/strict';
import {
  shouldSkipFollowerStep,
  computeApplicableFollowerSteps,
  resolvePreservedFollowerStepIndex,
  followerStepListsAreEqual
} from '../scripts/apps/progression-framework/steps/follower-steps/follower-step-visibility.js';

// PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step.
//
// Before this phase, this decision was only ever consulted by Next/Back
// auto-advance — the progress rail and rail-click navigation iterated
// FollowerShell.steps directly with no filter at all, so a droid follower's
// rail always showed BOTH the organic species step's droid branch
// ("Species / Chassis") and the real canonical step ("Droid Chassis",
// then still labeled "Droid Systems") as separate, independently clickable
// rows. FollowerShell now calls computeApplicableFollowerSteps() (via
// _recomputeFollowerSteps) every render, using the exact same predicate
// Next/Back already trusted, so the rail and jump-navigation see the same
// step plan. See docs/audits/follower-droid-chassis-step-consolidation-phase-6.md.

const CANONICAL_DESCRIPTORS = [
  { stepId: 'follower-origin' },
  { stepId: 'species' },
  { stepId: 'droid-builder' },
  { stepId: 'follower-template' },
  { stepId: 'background' },
  { stepId: 'skills' },
  { stepId: 'languages' },
  { stepId: 'summary' }
];

// ── Step plan (tests 1-5) ───────────────────────────────────────────────────

// Test 1: organic follower has zero droid chassis steps.
{
  const steps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: false, templateType: 'utility' });
  assert.equal(steps.filter(d => d.stepId === 'droid-builder').length, 0);
  assert.ok(steps.some(d => d.stepId === 'species'), 'organic follower still sees the organic species step');
}

// Test 2: droid follower has exactly one droid chassis step.
{
  const steps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true, templateType: 'utility' });
  assert.equal(steps.filter(d => d.stepId === 'droid-builder').length, 1);
}

// Test 3: the removed duplicate droid step (the organic species step's old
// droid branch) is absent from the active plan for a droid follower — the
// whole 'species' descriptor is excluded, not merely its droid content.
{
  const steps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true, templateType: 'utility' });
  assert.equal(steps.filter(d => d.stepId === 'species').length, 0);
  // And there is exactly one droid-related step total, not two.
  const droidRelated = steps.filter(d => d.stepId === 'species' || d.stepId === 'droid-builder');
  assert.equal(droidRelated.length, 1);
  assert.equal(droidRelated[0].stepId, 'droid-builder');
}

// Test 4: step ordering remains deterministic — filtering never reorders
// the canonical declared sequence.
{
  const organicSteps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: false, templateType: 'utility' }).map(d => d.stepId);
  const droidSteps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true, templateType: 'utility' }).map(d => d.stepId);
  const canonicalOrder = CANONICAL_DESCRIPTORS.map(d => d.stepId);
  const isSubsequence = (subset, full) => {
    let i = 0;
    for (const id of full) if (id === subset[i]) i += 1;
    return i === subset.length;
  };
  assert.ok(isSubsequence(organicSteps, canonicalOrder));
  assert.ok(isSubsequence(droidSteps, canonicalOrder));
}

// Test 5: resume does not reintroduce the duplicate step — recomputing
// from scratch for an already-droid follower (simulating a resumed
// session, not a fresh one) still excludes 'species'.
{
  const resumedContext = { isDroid: true, templateType: 'aggressive' };
  const first = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, resumedContext);
  const second = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, resumedContext);
  assert.deepEqual(first.map(d => d.stepId), second.map(d => d.stepId));
  assert.ok(!second.some(d => d.stepId === 'species'));
}

// ── Applicability / step-visibility predicate (tests 9-13, 19) ─────────────

// Test 9: applicability uses explicit follower context (isDroid), not
// inference from other fields.
{
  assert.equal(shouldSkipFollowerStep('droid-builder', { isDroid: true }), false);
  assert.equal(shouldSkipFollowerStep('droid-builder', { isDroid: false }), true);
  assert.equal(shouldSkipFollowerStep('species', { isDroid: true }), true);
  assert.equal(shouldSkipFollowerStep('species', { isDroid: false }), false);
}

// Test 10: organic follower cannot force-open the chassis step — the
// predicate itself says skip regardless of any other flag.
{
  assert.equal(shouldSkipFollowerStep('droid-builder', { isDroid: false, templateType: 'utility', fixedProfile: null, cfg: null }), true);
}

// Tests 11-13: level/size/role-restricted chassis filtering. No such rule
// currently exists in this codebase's follower-constraint data (confirmed
// by reading FollowerDroidBuilderStep#_getFollowerConstraint — its
// allowedCategories/allowedAccessorySubcategories are fixed, not
// parameterized by follower level, size, or template type). These tests
// lock in that step-level applicability is correctly UNAFFECTED by those
// fields today, rather than inventing a restriction the rules don't have.
{
  const templateTypes = ['aggressive', 'defensive', 'utility'];
  for (const templateType of templateTypes) {
    assert.equal(shouldSkipFollowerStep('droid-builder', { isDroid: true, templateType }), false, `droid-builder must remain applicable regardless of template type (${templateType})`);
  }
}

// Test 19: changing from organic to droid adds exactly one required
// chassis step (mirrors test 2, from the other direction).
{
  const before = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: false });
  const after = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true });
  assert.equal(before.filter(d => d.stepId === 'droid-builder').length, 0);
  assert.equal(after.filter(d => d.stepId === 'droid-builder').length, 1);
}

// Fixed-profile followers (e.g. beast/vehicle companions) skip both droid
// AND organic species steps entirely — a third, pre-existing case this
// predicate must not regress.
{
  const fixedProfile = { skipBackground: false, skipLanguages: false };
  assert.equal(shouldSkipFollowerStep('species', { isDroid: false, fixedProfile }), true);
  assert.equal(shouldSkipFollowerStep('droid-builder', { isDroid: false, fixedProfile }), true);
}

// ── Selection state (tests 14, 17, 20) ──────────────────────────────────────

// Test 14: a valid saved current-step selection survives a recompute that
// doesn't actually change the applicable step list.
{
  const steps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true });
  const idx = resolvePreservedFollowerStepIndex(steps, 'droid-builder', 0);
  assert.equal(steps[idx].stepId, 'droid-builder');
}

// Test 17: changing an upstream follower choice (organic -> droid)
// revalidates which steps exist — resolvePreservedFollowerStepIndex must
// fall back cleanly when the previously-current step is no longer present.
{
  const organicSteps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: false });
  const droidSteps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true });
  // User was on 'species' as an organic follower, then switched to droid.
  const idx = resolvePreservedFollowerStepIndex(droidSteps, 'species', 0);
  assert.equal(idx, 0, 'falls back to the provided fallback index rather than throwing or returning -1');
  assert.notEqual(droidSteps[idx]?.stepId, 'species', 'species is genuinely gone from the droid step list');
}

// Test 20: no array-order auto-selection — resolvePreservedFollowerStepIndex
// never silently jumps to "whatever happens to be first" when a real
// stepId IS still present; array position never overrides an exact id match.
{
  const steps = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true });
  const idx = resolvePreservedFollowerStepIndex(steps, 'summary', 0);
  assert.equal(steps[idx].stepId, 'summary', 'exact stepId match wins over the fallback/first index');
}

// followerStepListsAreEqual — used to skip needless plugin/index churn.
{
  const a = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true });
  const b = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: true });
  assert.equal(followerStepListsAreEqual(a, b), true);
  const c = computeApplicableFollowerSteps(CANONICAL_DESCRIPTORS, { isDroid: false });
  assert.equal(followerStepListsAreEqual(a, c), false);
}

console.log('Follower step visibility tests passed.');
