import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Existing NPC Assignment — required test suite.
//
// Coverage tiers (see docs/audits/gm-existing-npc-allies-assignment.md):
//   (a) DIRECT PRODUCTION-PATH — both scripts/engine/crew/ally-assignment-service.js
//       and scripts/ui/shell/AlliesSurfaceService.js load and execute for
//       real through the Foundry-shim harness. Every assertion below runs
//       shipped code, not a reimplementation.
//   (c) SOURCE-INSPECTION ONLY — a handful of named requirements
//       (full droid-ledger seeding during conversion, follower-derivation
//       recalculation itself, AlliesSurfaceController's dialog flow) are
//       verified by direct code reading only, documented in the audit doc,
//       because they transitively require SWSEDialogV2/progression-entry.js
//       — the same "un-loadable through the shim" wall this branch has
//       documented since Phase 4. This file does not fabricate assertions
//       for those.

registerFoundryPathLoader();

const {
  AllyAssignmentService,
  ASSIGNMENT_KIND,
  ASSIGNMENT_MODE,
  isEligibleAssignmentTargetType,
  detectAssignmentKindFromFacts,
  detectAssignmentKind,
  evaluateAssignmentEligibilityFacts,
  evaluateNpcAssignmentEligibility,
  buildAllyAssignmentLink,
  buildAssignmentTargetFlagPatch,
  buildOwnerAssignmentUpdate,
  buildOwnerUnassignmentUpdate,
  validateFollowerConversionSlot,
  buildFollowerConversionMetadata,
  evaluateDroidConversionGate
} = await import('../scripts/engine/crew/ally-assignment-service.js');

const { fakeActorEngineCallLog, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');

const SYSTEM_ID = 'foundryvtt-swse';

function makeFakeActor(overrides = {}) {
  const flags = { [SYSTEM_ID]: {}, swse: {}, ...(overrides.flags || {}) };
  return {
    id: 'actor-1', name: 'Test Actor', type: 'npc', uuid: 'Actor.actor-1', isOwner: false,
    system: {}, img: 'icons/x.png', items: [],
    ...overrides,
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
}

function asGM() {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1', name: 'GM Tester' }, actors: new Map(), users: [] } });
}

function asPlayer() {
  installFoundryShimGlobals({ game: { user: { isGM: false, id: 'player-1', name: 'Player' }, actors: new Map(), users: [] } });
}

// ---------------------------------------------------------------------
// 1-5: Permissions and target/owner-type eligibility
// ---------------------------------------------------------------------

// 1. isEligibleAssignmentTargetType: npc/character/droid are eligible.
{
  assert.equal(isEligibleAssignmentTargetType('npc'), true);
  assert.equal(isEligibleAssignmentTargetType('character'), true);
  assert.equal(isEligibleAssignmentTargetType('droid'), true);
}

// 2. isEligibleAssignmentTargetType: vehicles/starships/hazards are not.
{
  assert.equal(isEligibleAssignmentTargetType('vehicle'), false);
  assert.equal(isEligibleAssignmentTargetType('starship'), false);
  assert.equal(isEligibleAssignmentTargetType('hazard'), false);
  assert.equal(isEligibleAssignmentTargetType(undefined), false);
}

// 3. evaluateAssignmentEligibilityFacts: rejects a non-GM caller regardless
// of everything else being valid.
{
  const result = evaluateAssignmentEligibilityFacts({
    isGM: false, ownerExists: true, ownerType: 'character', targetExists: true, targetType: 'npc',
    sameActor: false, alreadyAssignedOwnerId: null, alreadyAssignedMode: null, ownerId: 'o1', mode: 'ally'
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some(r => r.includes('Only a GM')));
}

// 4. evaluateAssignmentEligibilityFacts: eligible owner types accepted.
{
  const forCharacter = evaluateAssignmentEligibilityFacts({
    isGM: true, ownerExists: true, ownerType: 'character', targetExists: true, targetType: 'npc',
    sameActor: false, alreadyAssignedOwnerId: null, alreadyAssignedMode: null, ownerId: 'o1', mode: 'ally'
  });
  assert.equal(forCharacter.eligible, true);
  const forDroid = evaluateAssignmentEligibilityFacts({
    isGM: true, ownerExists: true, ownerType: 'droid', targetExists: true, targetType: 'npc',
    sameActor: false, alreadyAssignedOwnerId: null, alreadyAssignedMode: null, ownerId: 'o1', mode: 'ally'
  });
  assert.equal(forDroid.eligible, true);
}

// 5. evaluateAssignmentEligibilityFacts: unsupported owner types rejected.
{
  const result = evaluateAssignmentEligibilityFacts({
    isGM: true, ownerExists: true, ownerType: 'vehicle', targetExists: true, targetType: 'npc',
    sameActor: false, alreadyAssignedOwnerId: null, alreadyAssignedMode: null, ownerId: 'o1', mode: 'ally'
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some(r => r.includes('not eligible to receive an assigned ally')));
}

// ---------------------------------------------------------------------
// 6-11: Eligibility
// ---------------------------------------------------------------------

// 6. Owner cannot assign itself.
{
  const result = evaluateAssignmentEligibilityFacts({
    isGM: true, ownerExists: true, ownerType: 'character', targetExists: true, targetType: 'npc',
    sameActor: true, alreadyAssignedOwnerId: null, alreadyAssignedMode: null, ownerId: 'o1', mode: 'ally'
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some(r => r.includes('cannot be assigned to itself')));
}

// 7. Vehicle/starship target is rejected end-to-end via the thin wrapper.
{
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const vehicle = makeFakeActor({ id: 'veh-1', type: 'vehicle' });
  const evaluation = evaluateNpcAssignmentEligibility(owner, vehicle);
  assert.equal(evaluation.eligible, false);
  assert.ok(evaluation.reasons.some(r => r.includes('vehicles')));
}

// 8. An existing world NPC is accepted.
{
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const evaluation = evaluateNpcAssignmentEligibility(owner, npc);
  assert.equal(evaluation.eligible, true);
}

// 9. An already-assigned Actor (same owner, same mode) is detected and
// rejected for a second assignment attempt.
{
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', flags: { [SYSTEM_ID]: { assignedAllyOwnerId: 'owner-1', assignedAllyMode: 'ally' } } });
  const evaluation = evaluateNpcAssignmentEligibility(owner, npc, 'ally');
  assert.equal(evaluation.eligible, false);
  assert.ok(evaluation.reasons.some(r => r.includes('already assigned')));
}

// 10. Assigning the same Actor twice does not duplicate the owner-side
// link entry (buildOwnerAssignmentUpdate de-duplicates by id).
{
  const owner = makeFakeActor({ id: 'owner-1', system: { ownedActors: [] } });
  const npc = makeFakeActor({ id: 'npc-1' });
  const link = buildAllyAssignmentLink({ targetActor: npc, detectedKind: ASSIGNMENT_KIND.HEROIC_NPC });
  const first = buildOwnerAssignmentUpdate({ ownerActor: owner, link, detectedKind: ASSIGNMENT_KIND.HEROIC_NPC });
  owner.system.ownedActors = first['system.ownedActors'];
  const second = buildOwnerAssignmentUpdate({ ownerActor: owner, link, detectedKind: ASSIGNMENT_KIND.HEROIC_NPC });
  assert.equal(second['system.ownedActors'].length, 1, 'must not duplicate the same Actor id in ownedActors');
}

// 11. An Actor already assigned to a DIFFERENT owner may still be assigned
// to this owner (the eligibility check only compares against THIS owner's id).
{
  asGM();
  const owner = makeFakeActor({ id: 'owner-2', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', flags: { [SYSTEM_ID]: { assignedAllyOwnerId: 'owner-1', assignedAllyMode: 'ally' } } });
  const evaluation = evaluateNpcAssignmentEligibility(owner, npc, 'ally');
  assert.equal(evaluation.eligible, true);
}

// ---------------------------------------------------------------------
// 12-23: Assign as Ally (non-mechanical relationship)
// ---------------------------------------------------------------------

// 12. Heroic NPC links without any stat/level/Item change.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', system: { level: 7, hp: { value: 40 } } });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  assert.equal(npc.system.level, 7);
  assert.equal(npc.system.hp.value, 40);
  assert.equal(npc.system.isFollower, undefined);
}

// 13. Nonheroic NPC links without stat changes and is detected correctly.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const nonheroic = makeFakeActor({ id: 'nh-1', type: 'npc', system: { isMinion: true, level: 3 } });
  const link = await AllyAssignmentService.assignAsAlly(owner, nonheroic, { source: 'test' });
  assert.equal(link.kind, ASSIGNMENT_KIND.NONHEROIC);
  assert.equal(nonheroic.system.level, 3);
}

// 14. Droid NPC links without any calculation-mode change.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const droid = makeFakeActor({ id: 'droid-1', type: 'droid' });
  const link = await AllyAssignmentService.assignAsAlly(owner, droid, { source: 'test' });
  assert.equal(link.kind, ASSIGNMENT_KIND.DROID);
  assert.equal(droid.system.droidCalculationMode, undefined, 'assignAsAlly must never touch droid calculation mode');
}

// 15. Beast NPC is classified for the Beasts lane (kind === BEAST).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const beast = makeFakeActor({ id: 'beast-1', type: 'npc', system: { npcProfile: { kind: 'beast' } } });
  const link = await AllyAssignmentService.assignAsAlly(owner, beast, { source: 'test' });
  assert.equal(link.kind, ASSIGNMENT_KIND.BEAST);
}

// 16. Owner projection and target metadata commit together (two governed
// ActorEngine.updateActor calls, both succeeding).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  assert.equal(fakeActorEngineCallLog.length, 2);
  assert.equal(fakeActorEngineCallLog[0].method, 'updateActor');
  assert.equal(fakeActorEngineCallLog[0].actorId, 'owner-1');
  assert.equal(fakeActorEngineCallLog[1].actorId, 'npc-1');
}

// 17. Failure updating the target restores the owner (rollback).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  Object.defineProperty(npc, 'getFlag', { value: () => { throw new Error('boom'); } });
  await assert.rejects(() => AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' }), /boom/);
  assert.deepEqual(owner.flags[SYSTEM_ID].assignedAllies ?? [], []);
  assert.deepEqual(owner.system.ownedActors ?? [], []);
}

// 18. Failure updating the OWNER leaves the target untouched (the owner
// update is built and committed before the target step even runs).
{
  resetFakeActorEngine();
  asGM();
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const brokenOwner = makeFakeActor({ id: 'owner-2', type: 'character' });
  Object.defineProperty(brokenOwner, 'getFlag', { value: () => { throw new Error('owner-read-fail'); } });
  await assert.rejects(() => AllyAssignmentService.assignAsAlly(brokenOwner, npc, { source: 'test' }));
  assert.equal(npc.flags[SYSTEM_ID].assignedAllyOwnerId, undefined, 'target must be untouched when the owner step never completes');
}

// 19. Unassign preserves the NPC's stats entirely.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', system: { level: 9 } });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  await AllyAssignmentService.unassignAlly(owner, npc, { source: 'test' });
  assert.equal(npc.system.level, 9);
}

// 20. Unassign clears reciprocal target metadata.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  await AllyAssignmentService.unassignAlly(owner, npc, { source: 'test' });
  assert.deepEqual(npc.flags[SYSTEM_ID], {});
}

// 21. Assigned ally does not consume a follower slot.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 'slot-1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  assert.equal(owner.flags[SYSTEM_ID].followerSlots[0].createdActorId, null);
}

// 22. Assigned ally is not level-synced (no HP/level write).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', system: { level: 10 } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', system: { level: 2, hp: { value: 12 } } });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  assert.equal(npc.system.level, 2);
  assert.equal(npc.system.hp.value, 12);
}

// 23. Assigned ally does not receive follower feats/templates.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  assert.equal(npc.flags.swse?.follower, undefined);
  assert.equal(npc.system.progression, undefined);
}

// ---------------------------------------------------------------------
// 24-36: Convert to Follower (slot-consuming migration)
// ---------------------------------------------------------------------

// 24. Conversion requires a real slot — a missing slot is rejected.
{
  const result = validateFollowerConversionSlot(null);
  assert.equal(result.valid, false);
}

// 25. An occupied slot is rejected.
{
  const result = validateFollowerConversionSlot({ id: 's1', createdActorId: 'someone', dependentKind: 'follower' });
  assert.equal(result.valid, false);
  assert.match(result.error, /already occupied/);
}

// 26. A minion/beast-only slot (dependentKind !== 'follower') is rejected.
{
  const result = validateFollowerConversionSlot({ id: 's1', createdActorId: null, dependentKind: 'minion' });
  assert.equal(result.valid, false);
  assert.match(result.error, /Only a follower slot/);
}

// 27. When multiple open slots exist, conversion uses exactly the
// explicitly-selected slotId, not an arbitrary other one.
{
  resetFakeActorEngine();
  asGM();
  const slotA = { id: 'slot-a', dependentKind: 'follower', createdActorId: null };
  const slotB = { id: 'slot-b', dependentKind: 'follower', createdActorId: null };
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [slotA, slotB] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 'slot-b', { source: 'test' });
  const slots = owner.flags[SYSTEM_ID].followerSlots;
  assert.equal(slots.find(s => s.id === 'slot-b').createdActorId, 'npc-1');
  assert.equal(slots.find(s => s.id === 'slot-a').createdActorId, null, 'the non-selected slot must be untouched');
}

// 28. Preflight (slot validation) is pure and performs no mutation.
{
  const slot = { id: 's1', dependentKind: 'follower', createdActorId: null };
  const before = JSON.stringify(slot);
  validateFollowerConversionSlot(slot);
  assert.equal(JSON.stringify(slot), before);
}

// 29. Original owner state is fully recoverable if conversion fails after
// the owner step committed (compensating rollback, since Foundry cannot
// commit multiple documents atomically — see the audit doc's "snapshot
// policy" section for why this is a compensating-update rollback rather
// than a SnapshotManager-based restore).
{
  resetFakeActorEngine();
  asGM();
  const slot = { id: 'slot-1', dependentKind: 'follower', createdActorId: null };
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [slot] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  Object.freeze(npc.system); // forces the target-conversion-commit step's write to throw
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 'slot-1', { source: 'test' }));
  assert.equal(owner.flags[SYSTEM_ID].followerSlots[0].createdActorId, null, 'slot must be restored to unfilled');
}

// 30. Conversion writes the standard follower metadata fields.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const converted = await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test' });
  assert.equal(converted.system.isFollower, true);
  assert.equal(converted.system.progression.isFollower, true);
  assert.equal(converted.flags.swse.follower.isFollower, true);
  assert.equal(converted.flags.swse.follower.convertedFromExistingNpc, true);
}

// 31. The slot receives the target Actor id.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test' });
  assert.equal(owner.flags[SYSTEM_ID].followerSlots[0].createdActorId, 'npc-1');
}

// 32. Owner relationship projections (followers, followerSlots, ownedActors)
// commit in ONE governed ActorEngine.updateActor call.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test' });
  const ownerCommits = fakeActorEngineCallLog.filter(c => c.actorId === 'owner-1');
  assert.equal(ownerCommits.length, 1, 'the owner side must commit exactly once for this conversion');
  const keys = Object.keys(ownerCommits[0].data);
  assert.ok(keys.some(k => k.includes('followers')));
  assert.ok(keys.some(k => k.includes('followerSlots')));
  assert.ok(keys.includes('system.ownedActors'));
}

// 33. Conversion does not throw even when the best-effort derived-stat
// sync step cannot run (follower-creator.js is not loadable in this Node
// harness) — the conversion itself must still have committed successfully.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const converted = await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test' });
  assert.equal(converted.id, 'npc-1');
  assert.equal(converted.system.isFollower, true, 'conversion must have committed even though the best-effort level-sync step could not run here');
}

// 34. Converting the same NPC into the same slot twice does not duplicate
// the owner's followers link list.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test' });
  // slot is now occupied; a second attempt at the SAME slot must be rejected
  // by validateFollowerConversionSlot rather than silently duplicating.
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test' }), /already occupied/);
  assert.equal(owner.flags[SYSTEM_ID].followers.length, 1);
}

// 35. Conversion failure restores both the NPC's follower flags being
// never applied and the owner's slot/follower list.
{
  resetFakeActorEngine();
  asGM();
  const slot = { id: 's1', dependentKind: 'follower', createdActorId: null };
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [slot] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  // Force the target-conversion-commit step's write to throw, without
  // relying on getFlag (the fake ActorEngine.updateActor never calls it —
  // it writes via direct property assignment).
  Object.defineProperty(npc.system, 'isFollower', { set() { throw new Error('target-write-fails'); }, get() { return undefined; }, configurable: true });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test' }));
  assert.equal(owner.flags[SYSTEM_ID].followerSlots[0].createdActorId, null);
  assert.deepEqual(owner.flags[SYSTEM_ID].followers ?? [], []);
  assert.equal(npc.system.isFollower, undefined, 'target must never show partially-applied follower metadata');
}

// 36. A failed conversion surfaces the underlying error to the caller
// (not a swallowed/silent failure).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  Object.defineProperty(npc.system, 'isFollower', { set() { throw new Error('specific-failure-message'); }, get() { return undefined; }, configurable: true });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test' }), /specific-failure-message/);
}

// ---------------------------------------------------------------------
// 37: Droid stock-conversion gate (38-41 — full ledger seeding/projection/
// modifier-dedup/incomplete-chassis-review — are explicitly NOT
// implemented in this service; it blocks and directs the GM to the
// existing DroidStatblockConversionService instead of reimplementing that
// authority. See the audit doc's "Droid conversion" section.)
// ---------------------------------------------------------------------

// 37. A stock-statblock droid cannot bypass canonical conversion — Convert
// to Follower is blocked outright rather than partially applied.
{
  const stockDroid = { type: 'droid', flags: { swse: { stockDroidImport: { importMode: 'statblock' } } }, system: {} };
  const gate = evaluateDroidConversionGate(stockDroid);
  assert.equal(gate.blocked, true);
  assert.match(gate.reason, /stock-statblock/);

  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const droid = makeFakeActor({ id: 'droid-1', type: 'droid', flags: { swse: { stockDroidImport: { importMode: 'statblock' } } } });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, droid, 's1', { source: 'test' }), /stock-statblock/);
  assert.equal(fakeActorEngineCallLog.length, 0, 'a blocked stock-droid conversion must never reach ActorEngine');
}

// ---------------------------------------------------------------------
// 42-45: Beast handling (44 — "unsupported beast conversion blocked" — is
// not a distinct code path in this design: every beast, including an
// Akk-Dog-named one, uses the SAME generic conversion as any other NPC,
// which is one of the three explicitly sanctioned outcomes. See the audit
// doc for why no fixed-profile auto-matching was added.)
// ---------------------------------------------------------------------

// 42. A beast can be assigned as a non-mechanical ally.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const beast = makeFakeActor({ id: 'beast-1', type: 'npc', system: { npcProfile: { kind: 'beast' }, level: 4 } });
  await AllyAssignmentService.assignAsAlly(owner, beast, { source: 'test' });
  assert.equal(beast.system.level, 4, 'assigning a beast as an ally must not change its stats');
}

// 43. An arbitrary beast (even one named "Akk Dog") never receives a fixed
// follower profile — buildFollowerConversionMetadata has no reference to
// fixedFollowerProfile at all.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const akkDogNamed = makeFakeActor({ id: 'beast-1', name: 'Akk Dog', type: 'npc', system: { npcProfile: { kind: 'beast' }, race: 'Akk Dog' } });
  const converted = await AllyAssignmentService.convertToFollower(owner, akkDogNamed, 's1', { source: 'test' });
  assert.equal(converted.flags.swse.follower.fixedFollowerProfileId, undefined);
  assert.equal(converted.system.race, 'Akk Dog', 'species must be preserved, not replaced by a fixed profile');
}

// 45. The generic conversion path succeeds for a beast (the one sanctioned
// outcome this design implements for beasts).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const beast = makeFakeActor({ id: 'beast-1', type: 'npc', system: { npcProfile: { kind: 'beast' } } });
  const converted = await AllyAssignmentService.convertToFollower(owner, beast, 's1', { source: 'test' });
  assert.equal(converted.system.isFollower, true);
}

// ---------------------------------------------------------------------
// 47, 49, 50: Non-regression
// ---------------------------------------------------------------------

// 47. detectAssignmentKindFromFacts still classifies a nonheroic Actor as
// 'assigned-nonheroic' — the exact literal the pre-existing drag/drop
// pathway already produced, so existing assigned-nonheroic display/
// discovery keeps working unchanged.
{
  assert.equal(detectAssignmentKindFromFacts({ actorType: 'npc', isBeastFlagged: false, isNonheroic: true }), ASSIGNMENT_KIND.NONHEROIC);
  assert.equal(ASSIGNMENT_KIND.NONHEROIC, 'assigned-nonheroic');
}

// 49. Manual GM follower slots (sourceType: 'gm-grant') remain valid
// Convert to Follower targets — validateFollowerConversionSlot does not
// discriminate by sourceType, only by occupancy/dependentKind.
{
  const manualSlot = { id: 's1', dependentKind: 'follower', createdActorId: null, sourceType: 'gm-grant', talentItemId: null };
  const result = validateFollowerConversionSlot(manualSlot);
  assert.equal(result.valid, true);
}

// 50. Talent-granted follower slots (legacy shape — no sourceType, real
// talentItemId) remain equally valid Convert to Follower targets.
{
  const talentSlot = { id: 's1', dependentKind: 'follower', createdActorId: null, talentItemId: 'item-1', talentName: 'Undying Loyalty' };
  const result = validateFollowerConversionSlot(talentSlot);
  assert.equal(result.valid, true);
}

console.log('GM existing NPC allies assignment tests passed.');
