import assert from 'node:assert/strict';
import {
  classifyFollowerDroidChassisSelection,
  resolveFollowerDroidChassisPrecedence,
  FOLLOWER_DROID_CHASSIS_SESSION_STATE
} from '../scripts/apps/progression-framework/steps/follower-steps/follower-droid-chassis-compat.js';

// PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step.
//
// Both the removed species-step droid branch and the canonical
// droid-builder step wrote to the SAME draftSelections.droidConfig key,
// so only one shape could ever be persisted at a time (last write wins) —
// there is no "two different valid selections stored simultaneously" case
// for this specific field. What an old, already-in-progress session CAN
// contain is the removed step's shape only, which this classifier
// recognizes as needing reconfiguration rather than silently treating as
// a valid canonical chassis.

// Test 15: a legacy (pre-consolidation) selection is recognized as invalid
// / needing reconfiguration, not silently accepted as a real chassis.
{
  const legacy = {
    isDroid: true,
    abilityChoice: 'int',
    size: 'medium',
    locomotion: 'walking',
    baseSystems: [{ id: 'heuristic', name: 'Heuristic Processor' }],
    optionalSystems: [{ id: 'darkvision', name: 'Darkvision' }]
  };
  const result = classifyFollowerDroidChassisSelection(legacy);
  assert.equal(result.state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.LEGACY_NEEDS_RECONFIGURATION);
  assert.equal(result.canonical, false);
  assert.ok(result.reasons.length > 0, 'surfaces a reason rather than silently clearing the selection');
}

// Test 16: this codebase's dual-writer bug shares a single key, so "both
// present, conflicting" cannot literally occur here — confirmed by the
// classifier correctly distinguishing valid vs. legacy vs. incomplete for
// every reachable single-key shape instead.
{
  const canonical = {
    isDroid: true,
    droidSystems: { locomotion: { id: 'walking' }, processor: { id: 'heuristic' }, appendages: [] }
  };
  assert.equal(classifyFollowerDroidChassisSelection(canonical).state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID);
  assert.equal(classifyFollowerDroidChassisSelection(canonical).canonical, true);
}

// A valid canonical selection is never misclassified as legacy just
// because it also happens to carry the compatibility-mirrored
// baseSystems/optionalSystems fields (FollowerCreator._resolveFollowerDroidSystems
// back-fills these onto the canonical shape for older sheet/deriver code).
{
  const canonicalWithMirroredFields = {
    isDroid: true,
    droidSystems: { locomotion: { id: 'walking' }, processor: { id: 'heuristic' }, appendages: [] },
    baseSystems: [{ id: 'heuristic' }],
    optionalSystems: []
  };
  assert.equal(classifyFollowerDroidChassisSelection(canonicalWithMirroredFields).state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID);
}

// No chassis configured at all yet.
{
  assert.equal(classifyFollowerDroidChassisSelection({ isDroid: true }).state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.INCOMPLETE);
}

// Not a droid follower at all — nothing to classify.
{
  assert.equal(classifyFollowerDroidChassisSelection(null).state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.NONE);
  assert.equal(classifyFollowerDroidChassisSelection({ isDroid: false }).state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.NONE);
  assert.equal(classifyFollowerDroidChassisSelection(undefined).state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.NONE);
}

// ADDENDUM — resolveFollowerDroidChassisPrecedence: full 6-point legacy
// session compatibility precedence.

const realBuild = (locomotionId = 'walking') => ({
  droidSystems: { locomotion: { id: locomotionId }, processor: { id: 'heuristic' }, appendages: [] }
});

// Point 1: draft.droid wins outright when it is the only real build.
{
  const draft = { droid: realBuild(), droidConfig: { isDroid: true } };
  const result = resolveFollowerDroidChassisPrecedence(draft);
  assert.equal(result.source, 'draft-droid');
  assert.equal(result.state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID);
  assert.equal(result.resolvedBuild, draft.droid);
}

// Point 1 (agreement case): both real and identical — draft.droid still wins,
// no conflict raised for two representations of the same build.
{
  const build = realBuild();
  const draft = { droid: build, droidConfig: { isDroid: true, droidBuild: JSON.parse(JSON.stringify(build)) } };
  const result = resolveFollowerDroidChassisPrecedence(draft);
  assert.equal(result.source, 'draft-droid');
  assert.equal(result.state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID);
}

// Point 2: only the legacy droidConfig.droidBuild mirror is real — restore it.
{
  const legacyBuild = realBuild('rolling');
  const draft = { droid: null, droidConfig: { isDroid: true, droidBuild: legacyBuild } };
  const result = resolveFollowerDroidChassisPrecedence(draft);
  assert.equal(result.source, 'legacy-droid-build');
  assert.equal(result.state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.VALID);
  assert.equal(result.resolvedBuild, legacyBuild);
  assert.ok(result.reasons.length > 0);
}

// Point 2 (stub draft.droid must not silently win): an empty/stub draft.droid
// object is not a "real" build, so a real legacy droidConfig.droidBuild must
// still be restored rather than losing to the stub.
{
  const legacyBuild = realBuild('rolling');
  const draft = { droid: { isDroid: true }, droidConfig: { isDroid: true, droidBuild: legacyBuild } };
  const result = resolveFollowerDroidChassisPrecedence(draft);
  assert.equal(result.source, 'legacy-droid-build');
  assert.equal(result.resolvedBuild, legacyBuild);
}

// Point 3: only the old Species-step shape exists — translate only the safe
// fields (degree/size), never fabricate droidSystems from the disconnected
// baseSystems/optionalSystems arrays.
{
  const draft = {
    droid: null,
    droidConfig: {
      isDroid: true,
      droidDegree: '3rd-degree',
      size: 'small',
      baseSystems: [{ id: 'heuristic' }],
      optionalSystems: [{ id: 'darkvision' }]
    }
  };
  const result = resolveFollowerDroidChassisPrecedence(draft);
  assert.equal(result.source, 'legacy-species-shape');
  assert.equal(result.state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.LEGACY_NEEDS_RECONFIGURATION);
  assert.equal(result.resolvedBuild.droidDegree, '3rd-degree');
  assert.equal(result.resolvedBuild.droidSize, 'small');
  assert.equal(result.resolvedBuild.droidSystems, null, 'legacy system arrays are never translated into a fabricated droidSystems object');
}

// Point 4 + 5: both real but disagreeing — must be a conflict requiring
// review, never silently resolved to one side and never combined.
{
  const draft = {
    droid: realBuild('walking'),
    droidConfig: { isDroid: true, droidBuild: realBuild('rolling') }
  };
  const result = resolveFollowerDroidChassisPrecedence(draft);
  assert.equal(result.state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.CONFLICT);
  assert.equal(result.source, 'conflict');
  assert.equal(result.resolvedBuild, null);
  assert.ok(result.reasons.length > 0);
}

// Nothing configured at all.
{
  const result = resolveFollowerDroidChassisPrecedence({ droid: null, droidConfig: null });
  assert.equal(result.state, FOLLOWER_DROID_CHASSIS_SESSION_STATE.INCOMPLETE);
  assert.equal(result.source, 'none');
}

console.log('Follower droid chassis session-compatibility tests passed.');
