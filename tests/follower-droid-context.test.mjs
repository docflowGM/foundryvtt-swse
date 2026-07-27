import assert from 'node:assert/strict';
import { isFollowerDroidDraft } from '../scripts/apps/progression-framework/steps/follower-steps/follower-droid-context.js';

// PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step.
//
// This is the single, canonical "is this follower a droid" decision, now
// used consistently by FollowerShell (step visibility, missing-requirements
// check), FollowerDroidBuilderStep, and FollowerStepBase — replacing at
// least four independent, drift-prone re-derivations of the same OR chain
// that previously existed (see docs/audits/follower-droid-chassis-step-consolidation-phase-6.md).

{
  assert.equal(isFollowerDroidDraft({ followerKind: 'droid' }), true);
}

{
  assert.equal(isFollowerDroidDraft({ droidConfig: { isDroid: true } }), true);
}

{
  assert.equal(isFollowerDroidDraft({ speciesName: 'Droid' }), true);
  assert.equal(isFollowerDroidDraft({ speciesName: 'DROID' }), true);
}

{
  assert.equal(isFollowerDroidDraft({ followerKind: 'living' }), false);
  assert.equal(isFollowerDroidDraft({}), false);
}

{
  // Explicitly organic even with a stray droidConfig.isDroid===false left
  // over from an earlier toggle — never inferred true from partial data.
  assert.equal(isFollowerDroidDraft({ followerKind: 'living', droidConfig: { isDroid: false } }), false);
}

{
  // Test 18 (regression check): FollowerOriginStep._selectKind already
  // sets draft.droidConfig = null when the user picks "living" — confirm
  // the shared helper correctly reports "not a droid" for that exact
  // resulting shape, so switching from droid to organic removes chassis
  // state as far as every consumer of this helper is concerned.
  const afterSwitchToLiving = { followerKind: 'living', droidConfig: null, speciesName: null };
  assert.equal(isFollowerDroidDraft(afterSwitchToLiving), false);
}

{
  // Never throws on null/undefined.
  assert.equal(isFollowerDroidDraft(null), false);
  assert.equal(isFollowerDroidDraft(undefined), false);
}

console.log('Follower droid context tests passed.');
