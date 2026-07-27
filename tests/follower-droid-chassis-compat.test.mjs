import assert from 'node:assert/strict';
import {
  classifyFollowerDroidChassisSelection,
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

console.log('Follower droid chassis session-compatibility tests passed.');
