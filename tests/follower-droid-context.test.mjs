import assert from 'node:assert/strict';
import {
  isFollowerDroidDraft,
  hasRealFollowerDroidBuild,
  seedMinimalFollowerDroidIdentity,
  clearFollowerDroidConstructionState,
  resolveFollowerDroidAbilityChoice,
  FOLLOWER_DROID_DEGREE_ABILITY
} from '../scripts/apps/progression-framework/steps/follower-steps/follower-droid-context.js';

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

// ADDENDUM — hasRealFollowerDroidBuild: distinguishes a genuine chassis
// build (real droidSystems from the canonical builder) from a bare
// identity marker or legacy placeholder.

{
  assert.equal(hasRealFollowerDroidBuild(null), false);
  assert.equal(hasRealFollowerDroidBuild(undefined), false);
  assert.equal(hasRealFollowerDroidBuild({}), false);
  assert.equal(hasRealFollowerDroidBuild({ isDroid: true }), false, 'bare identity marker is not a real build');
}

{
  assert.equal(hasRealFollowerDroidBuild({ isDroid: true, baseSystems: [], optionalSystems: [] }), false, 'legacy species-step shape is not a real build');
}

{
  assert.equal(hasRealFollowerDroidBuild({ isDroid: true, droidSystems: { locomotion: {} } }), true);
}

// ADDENDUM — seedMinimalFollowerDroidIdentity: FollowerOriginStep must seed
// only {isDroid: true} on first selecting Droid, never fabricate
// size/locomotion/speed/ability defaults, while preserving a genuine
// existing build across Living/Droid toggles.

{
  assert.deepEqual(seedMinimalFollowerDroidIdentity(null), { isDroid: true });
  assert.deepEqual(seedMinimalFollowerDroidIdentity(undefined), { isDroid: true });
}

{
  // A stub/partial config from before the real chassis step ran is not
  // preserved as-is — it's replaced with the minimal marker.
  const stub = { isDroid: true, size: 'medium', locomotion: 'walking', speed: 6, abilityChoice: 'int' };
  assert.deepEqual(seedMinimalFollowerDroidIdentity(stub), { isDroid: true });
}

{
  // A genuine prior build (real droidSystems) is preserved unchanged.
  const realBuild = { isDroid: true, droidSystems: { locomotion: { id: 'walking' } } };
  assert.equal(seedMinimalFollowerDroidIdentity(realBuild), realBuild);
}

// ADDENDUM — clearFollowerDroidConstructionState: switching Droid -> Living
// must clear ALL droid-construction state, not just droidConfig.

{
  const session = {
    draftSelections: {
      droidConfig: { isDroid: true, droidSystems: {} },
      droid: { isDroid: true, droidSystems: {} },
      pendingSpeciesContext: {
        metadata: { droidBuilder: { required: true } },
        ledger: { rules: { droidBuilder: { required: true } } }
      }
    },
    droidContext: { isDroid: true }
  };
  clearFollowerDroidConstructionState(session);
  assert.equal(session.draftSelections.droidConfig, null);
  assert.equal(session.draftSelections.droid, null);
  assert.equal(session.droidContext, null);
  assert.equal(session.draftSelections.pendingSpeciesContext.metadata.droidBuilder, undefined);
  assert.equal(session.draftSelections.pendingSpeciesContext.ledger.rules.droidBuilder, undefined);
}

{
  // Never throws when session/draftSelections/pendingSpeciesContext are absent.
  clearFollowerDroidConstructionState(null);
  clearFollowerDroidConstructionState(undefined);
  const bareSession = {};
  clearFollowerDroidConstructionState(bareSession);
  assert.equal(bareSession.draftSelections.droidConfig, null);
}

// ADDENDUM — resolveFollowerDroidAbilityChoice: degree-derived ability is
// the sole rule for droid followers. The mapping matches
// FollowerDroidBuilderStep's canonical FOLLOWER_DROID_DEGREE_ABILITY table.

{
  assert.equal(resolveFollowerDroidAbilityChoice('1st-degree'), 'int');
  assert.equal(resolveFollowerDroidAbilityChoice('2nd-degree'), 'int');
  assert.equal(resolveFollowerDroidAbilityChoice('3rd-degree'), 'cha');
  assert.equal(resolveFollowerDroidAbilityChoice('4th-degree'), 'dex');
  assert.equal(resolveFollowerDroidAbilityChoice('5th-degree'), 'str');
}

{
  // Case-insensitive, and an unknown/missing degree falls back to int
  // rather than throwing.
  assert.equal(resolveFollowerDroidAbilityChoice('3RD-DEGREE'), 'cha');
  assert.equal(resolveFollowerDroidAbilityChoice(null), 'int');
  assert.equal(resolveFollowerDroidAbilityChoice(undefined), 'int');
  assert.equal(resolveFollowerDroidAbilityChoice('not-a-degree'), 'int');
}

{
  // The exported table itself matches the documented canonical rule, so a
  // consumer inspecting it directly sees the same values the function uses.
  assert.deepEqual(FOLLOWER_DROID_DEGREE_ABILITY, {
    '1st-degree': 'int',
    '2nd-degree': 'int',
    '3rd-degree': 'cha',
    '4th-degree': 'dex',
    '5th-degree': 'str'
  });
}

console.log('Follower droid context tests passed.');
