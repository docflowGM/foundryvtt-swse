import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Existing NPC Assignment — required test suite, including the
// atomicity correction pass (commit "fix(allies): make NPC follower
// conversion atomic").
//
// Coverage tiers (see docs/audits/gm-existing-npc-allies-assignment.md):
//   (a) DIRECT PRODUCTION-PATH — scripts/engine/crew/ally-assignment-service.js,
//       scripts/ui/shell/AlliesSurfaceService.js, and
//       scripts/engine/progression/utils/snapshot-manager.js all load and
//       execute for real through the Foundry-shim harness. Every assertion
//       below runs shipped code, not a reimplementation.
//   (c) SOURCE-INSPECTION ONLY — a handful of named requirements (the REAL
//       follower-creator.js derivation call itself, AlliesSurfaceController's
//       dialog flow) are verified by direct code reading only, because they
//       transitively require SWSEDialogV2/progression-entry.js — the same
//       "un-loadable through the shim" wall this branch has documented
//       since Phase 4. convertToFollower()'s required derivation step
//       accepts an injectable `applyFollowerDerivation` override
//       specifically so the TRANSACTION's success/failure/rollback behavior
//       around that step is still real production-path tested here, even
//       though the default (real) derivation implementation cannot load in
//       this harness.

registerFoundryPathLoader();

const {
  AllyAssignmentService,
  ASSIGNMENT_KIND,
  ASSIGNMENT_MODE,
  isEligibleAssignmentTargetType,
  detectAssignmentKindFromFacts,
  detectAssignmentKind,
  detectPriorAssignment,
  evaluateAssignmentEligibilityFacts,
  evaluateNpcAssignmentEligibility,
  buildAllyAssignmentLink,
  buildAssignmentTargetFlagPatch,
  buildAssignmentClearPatch,
  buildOwnerAssignmentUpdate,
  buildOwnerUnassignmentUpdate,
  validateFollowerConversionSlot,
  planExistingNpcFollowerConversion,
  buildFollowerConversionMetadata,
  evaluateDroidConversionGate
} = await import('../scripts/engine/crew/ally-assignment-service.js');

const { fakeActorEngineCallLog, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');

const SYSTEM_ID = 'foundryvtt-swse';
const OK_DERIVATION = { applyFollowerDerivation: async () => true };

function makeFakeActor(overrides = {}) {
  const flags = { [SYSTEM_ID]: {}, swse: {}, ...(overrides.flags || {}) };
  const actor = {
    id: 'actor-1', name: 'Test Actor', type: 'npc', uuid: 'Actor.actor-1', isOwner: false,
    system: {}, img: 'icons/x.png', items: [], effects: [],
    ...overrides,
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    // Required by SnapshotManager.createSnapshot/restoreSnapshot (used by
    // convertToFollower's real target-snapshot rollback path).
    toObject(_source) {
      return JSON.parse(JSON.stringify({
        system: actor.system, name: actor.name, img: actor.img,
        prototypeToken: actor.prototypeToken, items: actor.items,
        effects: actor.effects, flags: actor.flags
      }));
    }
  };
  return actor;
}

function asGM() {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1', name: 'GM Tester' }, actors: new Map(), users: [] } });
}

function asPlayer() {
  installFoundryShimGlobals({ game: { user: { isGM: false, id: 'player-1', name: 'Player' }, actors: new Map(), users: [] } });
}

function slotsOf(owner) {
  return owner.flags[SYSTEM_ID].followerSlots;
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
  assert.ok(evaluation.reasons.some(r => r.includes('already assigned to this owner')));
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

// 11. CORRECTED — exclusive-owner policy: an Actor already assigned to a
// DIFFERENT owner is now BLOCKED, not silently allowed. The reciprocal
// target schema stores only one assignedAllyOwnerId, so allowing a second
// owner to claim it would strand the first owner's relationship record.
{
  asGM();
  const owner = makeFakeActor({ id: 'owner-2', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', flags: { [SYSTEM_ID]: { assignedAllyOwnerId: 'owner-1', assignedAllyMode: 'ally' } } });
  const evaluation = evaluateNpcAssignmentEligibility(owner, npc, 'ally');
  assert.equal(evaluation.eligible, false);
  assert.ok(evaluation.reasons.some(r => r.includes('already assigned to a different owner')));
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
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 'slot-1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
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
// 24-36: Convert to Follower (slot-consuming migration) — now genuinely
// atomic: every "success" case below supplies a stub
// applyFollowerDerivation that returns true, since the REAL derivation
// pipeline (follower-creator.js) cannot load in this Node harness. This is
// a deliberate, documented dependency-injection seam (see the file header),
// not a workaround — the transaction's real commit/rollback sequencing
// around that step is exercised for real either way.
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
  const slotA = { id: 'slot-a', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] };
  const slotB = { id: 'slot-b', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] };
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [slotA, slotB] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 'slot-b', { source: 'test', ...OK_DERIVATION });
  const slots = slotsOf(owner);
  assert.equal(slots.find(s => s.id === 'slot-b').createdActorId, 'npc-1');
  assert.equal(slots.find(s => s.id === 'slot-a').createdActorId, null, 'the non-selected slot must be untouched');
}

// 28. Preflight (slot validation) is pure and performs no mutation.
{
  const slot = { id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] };
  const before = JSON.stringify(slot);
  validateFollowerConversionSlot(slot);
  assert.equal(JSON.stringify(slot), before);
}

// 29. Original owner state is fully recoverable if conversion fails at the
// very first (target-conversion-commit) step, before derivation or the
// owner-side commit ever run.
{
  resetFakeActorEngine();
  asGM();
  const slot = { id: 'slot-1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] };
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [slot] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  Object.freeze(npc.system); // forces the target-conversion-commit step's write to throw
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 'slot-1', { source: 'test', ...OK_DERIVATION }));
  assert.equal(slotsOf(owner)[0].createdActorId, null, 'slot must be restored to unfilled');
}

// 30. Conversion writes the standard follower metadata fields, including
// canonical followerChoices from the conversion plan.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const converted = await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
  assert.equal(converted.system.isFollower, true);
  assert.equal(converted.system.progression.isFollower, true);
  assert.ok(converted.system.progression.followerChoices, 'canonical followerChoices must be present, not omitted');
  assert.equal(converted.flags.swse.follower.isFollower, true);
  assert.equal(converted.flags.swse.follower.convertedFromExistingNpc, true);
}

// 31. The slot receives the target Actor id.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
  assert.equal(slotsOf(owner)[0].createdActorId, 'npc-1');
}

// 32. Owner relationship projections (followers, followerSlots, ownedActors)
// commit in ONE governed ActorEngine.updateActor call — the FINAL
// relationship commit, distinct from the P2-3 slot-reservation write that
// now legitimately precedes it (see follower-slot-service.js#reserveFollowerSlot,
// which itself commits through ActorEngine against the SAME owner Actor to
// persist the reservation before any target/owner mutation begins).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
  const ownerCommits = fakeActorEngineCallLog.filter(c => c.actorId === 'owner-1' && c.method === 'updateActor');
  const finalCommits = ownerCommits.filter(c => Object.keys(c.data).includes('system.ownedActors'));
  assert.equal(finalCommits.length, 1, 'the owner side must commit its final relationship update exactly once for this conversion');
  const keys = Object.keys(finalCommits[0].data);
  assert.ok(keys.some(k => k.includes('followers')));
  assert.ok(keys.some(k => k.includes('followerSlots')));
  assert.ok(keys.includes('system.ownedActors'));
}

// 33. CORRECTED — conversion is now genuinely mechanical: if follower
// derivation is unavailable/fails, the conversion must NOT be reported as
// successful, and none of its metadata may remain applied.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await assert.rejects(
    () => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false }),
    /derivation could not be applied/
  );
  assert.equal(npc.system.isFollower, undefined, 'no partial/metadata-only conversion may remain applied');
  assert.equal(slotsOf(owner)[0].createdActorId, null, 'slot must remain open');
}

// 34. Converting the same NPC into the same slot twice does not duplicate
// the owner's followers link list — the second attempt is rejected by slot
// validation (already occupied).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION }), /already occupied/);
  assert.equal(owner.flags[SYSTEM_ID].followers.length, 1);
}

// 35. Conversion failure (derivation declines) restores the owner's slot
// and follower list, and the target shows no partial follower metadata.
{
  resetFakeActorEngine();
  asGM();
  const slot = { id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] };
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [slot] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => { throw new Error('derivation-blew-up'); } }));
  assert.equal(slotsOf(owner)[0].createdActorId, null);
  assert.deepEqual(owner.flags[SYSTEM_ID].followers ?? [], []);
  assert.equal(npc.system.isFollower, undefined, 'target must never show partially-applied follower metadata');
}

// 36. A failed conversion surfaces the underlying error to the caller
// (not a swallowed/silent failure).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await assert.rejects(
    () => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => { throw new Error('specific-failure-message'); } }),
    /specific-failure-message/
  );
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
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const droid = makeFakeActor({ id: 'droid-1', type: 'droid', flags: { swse: { stockDroidImport: { importMode: 'statblock' } } } });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, droid, 's1', { source: 'test', ...OK_DERIVATION }), /stock-statblock/);
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
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const akkDogNamed = makeFakeActor({ id: 'beast-1', name: 'Akk Dog', type: 'npc', system: { npcProfile: { kind: 'beast' }, race: 'Akk Dog' } });
  const converted = await AllyAssignmentService.convertToFollower(owner, akkDogNamed, 's1', { source: 'test', ...OK_DERIVATION });
  assert.equal(converted.flags.swse.follower.fixedFollowerProfileId, undefined);
  assert.equal(converted.system.race, 'Akk Dog', 'species must be preserved, not replaced by a fixed profile');
}

// 45. The generic conversion path succeeds for a beast (the one sanctioned
// outcome this design implements for beasts).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const beast = makeFakeActor({ id: 'beast-1', type: 'npc', system: { npcProfile: { kind: 'beast' } } });
  const converted = await AllyAssignmentService.convertToFollower(owner, beast, 's1', { source: 'test', ...OK_DERIVATION });
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
  const manualSlot = { id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'], sourceType: 'gm-grant', talentItemId: null };
  const result = validateFollowerConversionSlot(manualSlot);
  assert.equal(result.valid, true);
}

// 50. Talent-granted follower slots (legacy shape — no sourceType, real
// talentItemId) remain equally valid Convert to Follower targets.
{
  const talentSlot = { id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'], talentItemId: 'item-1', talentName: 'Undying Loyalty' };
  const result = validateFollowerConversionSlot(talentSlot);
  assert.equal(result.valid, true);
}

// =======================================================================
// ATOMICITY CORRECTION PASS — commit "fix(allies): make NPC follower
// conversion atomic". Cases 51-65 below correspond directly to the
// review's 15 required tests.
// =======================================================================

// 51. Derived follower application failure leaves the slot open.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false }));
  assert.equal(slotsOf(owner)[0].createdActorId, null, 'slot must remain open after a derivation failure');
}

// 52. Derived follower application failure restores owner projections
// (followers list back to empty, ownedActors back to empty).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', system: { ownedActors: [] }, flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false }));
  assert.deepEqual(owner.flags[SYSTEM_ID].followers ?? [], []);
  assert.deepEqual(owner.system.ownedActors ?? [], []);
}

// 53. Derived follower application failure restores the target (via the
// real SnapshotManager + flag-restoration patch, not just a partial undo).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', system: { level: 3, race: 'Human' } });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false }));
  assert.equal(npc.system.isFollower, undefined);
  assert.equal(npc.system.progression, undefined);
  assert.equal(npc.system.level, 3, 'unrelated pre-existing fields must survive the snapshot restore unchanged');
  assert.equal(npc.system.race, 'Human');
  // buildFlagRestorationPatch deletes each individual new leaf key
  // (flags.swse.follower.-=isFollower, etc.) but — an inherent limitation
  // of dot-path deletion — cannot remove the now-empty parent `follower`
  // object itself when the entire branch was new. This is benign: nothing
  // in the codebase treats an empty `{}` object as "is a follower" (every
  // check tests `isFollower === true`), only the actual leaf values matter.
  assert.equal(Object.keys(npc.flags.swse.follower || {}).length, 0, 'no follower flag values may remain set after restore');
  assert.notEqual(npc.flags.swse.follower?.isFollower, true);
}

// 54. Successful conversion produces canonical follower choices (from the
// planner, not an empty object).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const converted = await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', choices: { templateType: 'aggressive' }, ...OK_DERIVATION });
  assert.equal(converted.system.progression.followerTemplate, 'aggressive');
  assert.equal(converted.flags.swse.follower.templateType, 'aggressive');
}

// 55. Successful conversion appears exactly once in Allies — ownedActors
// contains a single entry for the target (the follower link superseding
// any prior link), not two.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
  const entries = owner.system.ownedActors.filter(e => e.id === 'npc-1');
  assert.equal(entries.length, 1, 'the Actor must appear exactly once in ownedActors after conversion');
}

// 56. Assigned-ally projections are removed during conversion (the target
// no longer appears in assignedAllies, and its assignedAlly* flags are
// cleared).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  assert.equal(owner.flags[SYSTEM_ID].assignedAllies.length, 1);
  const converted = await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
  assert.deepEqual(owner.flags[SYSTEM_ID].assignedAllies, []);
  assert.equal(converted.flags[SYSTEM_ID].assignedAllyOwnerId, undefined);
  assert.equal(converted.flags[SYSTEM_ID].assignedAllyKind, undefined);
}

// 56b. Same cleanup applies when the prior assignment was a beast (removed
// from the `beasts` array, not `assignedAllies`).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const beast = makeFakeActor({ id: 'beast-1', type: 'npc', system: { npcProfile: { kind: 'beast' } } });
  await AllyAssignmentService.assignAsAlly(owner, beast, { source: 'test' });
  assert.equal(owner.flags[SYSTEM_ID].beasts.length, 1);
  await AllyAssignmentService.convertToFollower(owner, beast, 's1', { source: 'test', ...OK_DERIVATION });
  assert.deepEqual(owner.flags[SYSTEM_ID].beasts, []);
}

// 57. currentOwnedActors rollback uses the pre-mutation snapshot, not a
// live re-read of the (already-mutated) actor state — this is the specific
// bug fix: capture via clonePlain BEFORE the transaction runs, reuse that
// captured reference in the rollback closure.
{
  resetFakeActorEngine();
  asGM();
  const existingOtherLink = { id: 'other-actor', name: 'Someone Else' };
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', system: { ownedActors: [existingOtherLink] }, flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false }));
  assert.deepEqual(owner.system.ownedActors, [existingOtherLink], 'rollback must restore the EXACT pre-mutation array, including unrelated pre-existing entries, not the post-mutation (with target added) array');
}

// 58. Unassign target failure restores owner relationship state exactly.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test' });
  const priorAssignedAllies = JSON.stringify(owner.flags[SYSTEM_ID].assignedAllies);
  Object.defineProperty(npc.flags[SYSTEM_ID], 'assignedAllyOwnerId', { value: 'owner-1', configurable: false });
  await assert.rejects(() => AllyAssignmentService.unassignAlly(owner, npc, { source: 'test' }));
  assert.equal(JSON.stringify(owner.flags[SYSTEM_ID].assignedAllies), priorAssignedAllies, 'owner projections must be restored to their exact pre-removal state');
}

// 59. Ownership-grant failure follows the documented transactional policy:
// the whole assignment (owner + target) rolls back, not just the grant.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  installFoundryShimGlobals({
    game: {
      user: { isGM: true, id: 'gm-1', name: 'GM Tester' },
      actors: new Map(),
      users: { find: () => { throw new Error('ownership-grant-lookup-fails'); } }
    }
  });
  await assert.rejects(() => AllyAssignmentService.assignAsAlly(owner, npc, { source: 'test', grantOwnership: true }));
  assert.deepEqual(owner.flags[SYSTEM_ID].assignedAllies ?? [], [], 'a failed ownership grant must roll back the whole assignment, not leave it half-committed');
  assert.equal(npc.flags[SYSTEM_ID].assignedAllyOwnerId, undefined);
}

// 60. An NPC already assigned to a different owner is blocked (exclusive
// assignment policy), both for Assign as Ally and for Convert to Follower.
{
  asGM();
  const ownerA = makeFakeActor({ id: 'owner-A', type: 'character' });
  const ownerB = makeFakeActor({ id: 'owner-B', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', flags: { [SYSTEM_ID]: { assignedAllyOwnerId: 'owner-A', assignedAllyMode: 'ally' } } });

  await assert.rejects(() => AllyAssignmentService.assignAsAlly(ownerB, npc, { source: 'test' }), /already assigned to a different owner/);
  await assert.rejects(() => AllyAssignmentService.convertToFollower(ownerB, npc, 's1', { source: 'test', ...OK_DERIVATION }), /assigned to a different owner/);
}

// 61. No conversion success is ever returned when follower derivation
// fails — the promise rejects; there is no "partial success" return value.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  let resolvedValue = 'NOT_SET';
  try {
    resolvedValue = await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false });
  } catch { /* expected */ }
  assert.equal(resolvedValue, 'NOT_SET', 'convertToFollower must never resolve on a derivation failure');
}

// 62. A converted beast does not receive an unrelated fixed beast profile
// even when explicit conversion choices are supplied without one.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const beast = makeFakeActor({ id: 'beast-1', name: 'Random Beast', type: 'npc', system: { npcProfile: { kind: 'beast' }, race: 'Gizka' } });
  const converted = await AllyAssignmentService.convertToFollower(owner, beast, 's1', { source: 'test', choices: { templateType: 'utility' }, ...OK_DERIVATION });
  assert.equal(converted.system.progression.followerChoices.fixedFollowerProfileId, undefined);
  assert.equal(converted.system.race, 'Gizka');
}

// 63. A converted playable-derived droid retains its canonical droid state
// (droidSystems passed through read-only, calculation mode untouched).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const droid = makeFakeActor({ id: 'droid-1', type: 'droid', system: { droidSystems: { locomotion: { id: 'walking' } }, droidSize: 'small' } });
  const converted = await AllyAssignmentService.convertToFollower(owner, droid, 's1', { source: 'test', ...OK_DERIVATION });
  assert.deepEqual(converted.system.progression.followerChoices.droidConfig.droidSystems, { locomotion: { id: 'walking' } });
  assert.equal(converted.system.droidCalculationMode, undefined, 'conversion must never seed/alter the droid calculation mode itself');
}

// 64. A stock droid remains blocked from conversion (re-confirmed after the
// atomicity rewrite — the gate runs during preflight, before any snapshot
// or transaction step).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const stockDroid = makeFakeActor({ id: 'droid-2', type: 'droid', flags: { swse: { stockDroidImport: { importMode: 'statblock' } } } });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, stockDroid, 's1', { source: 'test', ...OK_DERIVATION }), /stock-statblock/);
}

// 65. Retry after a failed conversion does not duplicate follower records
// or leave the slot double-claimed — a fresh attempt with working
// derivation succeeds cleanly to exactly one follower entry.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false }));
  assert.equal(slotsOf(owner)[0].createdActorId, null);
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
  assert.equal(owner.flags[SYSTEM_ID].followers.length, 1, 'retry must not duplicate the follower record');
  assert.equal(slotsOf(owner)[0].createdActorId, 'npc-1');
}

// ---------------------------------------------------------------------
// P2-3 — persistent follower-slot/target conversion reservations
// ---------------------------------------------------------------------

// 66. Two concurrent conversion attempts for the SAME owner/slot: the
// second one is rejected as reserved, and the winner's conversion still
// succeeds cleanly (this simulates a two-client race by calling
// reserveFollowerSlot directly with a competing token BEFORE the first
// convertToFollower call's own internal reservation acquisition runs, so
// convertToFollower must see its own token lose).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const competingReservation = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'other-client-token' });
  assert.equal(competingReservation.success, true);

  await assert.rejects(
    () => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', requestToken: 'losing-token', ...OK_DERIVATION }),
    /reserved/
  );
  assert.equal(slotsOf(owner)[0].createdActorId, null, 'the losing request must not claim the slot');
  assert.equal(slotsOf(owner)[0].reservation.token, 'other-client-token', 'the winning reservation must survive the losing request\'s failed attempt');
  assert.equal(npc.system.isFollower, undefined, 'the losing request must never mutate the target');
}

// 67. Two concurrent conversion attempts targeting the SAME NPC into
// DIFFERENT slots: the second must be rejected by the target-side
// reservation even though its own slot is open.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({
    id: 'owner-1', type: 'character',
    flags: {
      [SYSTEM_ID]: {
        followerSlots: [
          { id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] },
          { id: 's2', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }
        ]
      }
    }
  });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { TARGET_CONVERSION_RESERVATION_FLAG_PATH, buildTargetConversionReservation } = await import('../scripts/domain/followers/follower-slot-occupancy.js');
  // Simulate another in-flight request having already reserved this same
  // target for slot s1.
  npc.flags[SYSTEM_ID].followerConversionReservation = buildTargetConversionReservation({ token: 'other-client-token', ownerActorId: 'owner-1', slotId: 's1', userId: 'gm-2' });

  await assert.rejects(
    () => AllyAssignmentService.convertToFollower(owner, npc, 's2', { source: 'test', requestToken: 'losing-token', ...OK_DERIVATION }),
    /already reserved/
  );
  assert.equal(slotsOf(owner).find(s => s.id === 's2').createdActorId, null, 'the second slot must remain open — never mutated when the target reservation is lost');
  assert.equal(slotsOf(owner).find(s => s.id === 's2').reservation, undefined, 'losing the target race must release the just-acquired slot reservation for s2');
  assert.equal(npc.flags[SYSTEM_ID].followerConversionReservation.token, 'other-client-token', 'the winning target reservation must be untouched');
}

// 68. A successful conversion clears both the slot reservation and the
// target reservation as part of its normal commit — no leaked reservation
// survives a successful conversion.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
  assert.equal(slotsOf(owner)[0].reservation, undefined, 'slot reservation must be cleared on success');
  assert.equal(npc.flags[SYSTEM_ID].followerConversionReservation, undefined, 'target reservation must be cleared on success');
  assert.equal(slotsOf(owner)[0].createdActorId, 'npc-1');
}

// 69. If the slot reservation is somehow lost between acquisition and the
// final owner commit (simulated by another actor stealing the slot's
// reservation with a different token mid-transaction), the conversion
// aborts rather than silently claiming a slot it no longer holds.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  // A derivation stub that, mid-transaction, steals the slot's reservation
  // out from under the in-progress conversion by overwriting it with a
  // different token — this simulates a lost-reservation race window.
  const stealingDerivation = async () => {
    owner.flags[SYSTEM_ID].followerSlots = owner.flags[SYSTEM_ID].followerSlots.map(s =>
      s.id === 's1' ? { ...s, reservation: { token: 'thief-token', expiresAt: Date.now() + 60000 } } : s
    );
    return true;
  };
  await assert.rejects(
    () => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: stealingDerivation }),
    /reservation was lost/
  );
  assert.equal(slotsOf(owner)[0].createdActorId, null, 'a lost reservation must abort the conversion, never claim the slot');
}

// ---------------------------------------------------------------------
// P2-3 ROUND-2 CORRECTION — target-reservation lifetime, dual-token
// re-verification before every destructive phase, reservation-aware slot
// rollback, and same-token idempotent retry.
// ---------------------------------------------------------------------

// 70. A losing/rolled-back conversion's OWN target-snapshot restore must
// never delete a DIFFERENT, later request's live target reservation —
// the reservation flag is a PROTECTED path in the snapshot-restoration
// authority, so this request's rollback can never touch it either way,
// and this request's own (token-conditional) release attempt at the end
// must not clear a reservation it does not recognize as its own.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { buildTargetConversionReservation } = await import('../scripts/domain/followers/follower-slot-occupancy.js');
  const laterReservation = buildTargetConversionReservation({ token: 'later-request-token', ownerActorId: 'owner-2', slotId: 's9', userId: 'gm-2' });
  const failingDerivation = async () => {
    // Simulate a completely different, later request acquiring this same
    // target's reservation while THIS request is still mid-flight (e.g.
    // this request's own reservation lapsed by a path unrelated to this
    // test) — the point under test is that THIS request's own rollback
    // must never delete it.
    npc.flags[SYSTEM_ID].followerConversionReservation = laterReservation;
    return false;
  };
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: failingDerivation }));
  assert.deepEqual(npc.flags[SYSTEM_ID].followerConversionReservation, laterReservation, 'a losing/rolled-back request must never delete a different, later request\'s live target reservation');
}

// 71. Losing the reservation BEFORE the target-conversion-commit step
// (the very first destructive phase) aborts before the target is ever
// mutated at all — dual-token verification runs at the START of every
// destructive phase, not only once at acquisition time.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const originalVerify = FollowerSlotService.verifyFollowerConversionReservations;
  let callCount = 0;
  FollowerSlotService.verifyFollowerConversionReservations = async (params) => {
    callCount += 1;
    if (callCount === 1) return { success: false, slotOk: false, targetOk: true, code: 'FOLLOWER_SLOT_RESERVATION_LOST' };
    return originalVerify(params);
  };
  try {
    await assert.rejects(
      () => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION }),
      /target metadata mutation/
    );
    assert.equal(npc.system?.isFollower, undefined, 'target metadata must never be written once the FIRST dual-token check fails');
    assert.equal(callCount, 1, 'the conversion must abort at the first verification failure rather than proceeding to later phases');
  } finally {
    FollowerSlotService.verifyFollowerConversionReservations = originalVerify;
  }
}

// 72. Losing the reservation between the target-metadata mutation and the
// follower-derivation step prevents derivation from ever running.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const originalVerify = FollowerSlotService.verifyFollowerConversionReservations;
  let callCount = 0;
  let derivationCalled = false;
  FollowerSlotService.verifyFollowerConversionReservations = async (params) => {
    callCount += 1;
    if (callCount === 2) return { success: false, slotOk: true, targetOk: false, code: 'FOLLOWER_TARGET_RESERVATION_LOST' };
    return originalVerify(params);
  };
  try {
    await assert.rejects(
      () => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => { derivationCalled = true; return true; } }),
      /follower derivation/
    );
    assert.equal(derivationCalled, false, 'derivation must never run once the SECOND dual-token check fails');
    assert.equal(npc.system.isFollower, undefined, 'the already-committed target-metadata step must be rolled back too, once a later step aborts the whole transaction');
  } finally {
    FollowerSlotService.verifyFollowerConversionReservations = originalVerify;
  }
}

// 73. A rollback of THIS conversion's own owner-side commit never
// replaces the whole followerSlots array with a stale pre-transaction
// snapshot — a concurrent, unrelated slot change committed by a
// DIFFERENT request during this transaction's derivation window survives
// this request's own rollback (defect #13).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({
    id: 'owner-1', type: 'character',
    flags: {
      [SYSTEM_ID]: {
        followerSlots: [
          { id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] },
          { id: 's2', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }
        ]
      }
    }
  });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const derivation = async () => {
    // Simulate a completely different, concurrent conversion committing
    // its own occupant into slot s2 while THIS conversion is still
    // mid-flight (between derivation and owner-relationship-commit).
    owner.flags[SYSTEM_ID].followerSlots = owner.flags[SYSTEM_ID].followerSlots.map(s =>
      s.id === 's2' ? { ...s, createdActorId: 'other-npc' } : s
    );
    return true;
  };
  // grantOwnership: true with no game.users configured fails the
  // ownership-grant step AFTER owner-relationship-commit has already
  // succeeded, forcing owner-relationship-commit's OWN rollback to run.
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: derivation, grantOwnership: true }));
  assert.equal(slotsOf(owner).find(s => s.id === 's1').createdActorId, null, 'this request\'s own slot must be reverted');
  assert.equal(slotsOf(owner).find(s => s.id === 's2').createdActorId, 'other-npc', 'a concurrent, unrelated slot change must survive this request\'s own rollback');
  assert.equal(owner.flags[SYSTEM_ID].followers.length, 0, 'this request\'s own follower link must be reverted');
}

// 74. A same-token retry after a successful conversion returns the
// existing conversion directly instead of reprocessing — derivation is
// never re-invoked and no duplicate follower record is created.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  let derivationCallCount = 0;
  const countingDerivation = async () => { derivationCallCount += 1; return true; };

  const first = await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', requestToken: 'retry-token', applyFollowerDerivation: countingDerivation });
  assert.equal(derivationCallCount, 1);
  assert.equal(owner.flags[SYSTEM_ID].followers.length, 1);

  const retry = await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', requestToken: 'retry-token', applyFollowerDerivation: countingDerivation });
  assert.equal(retry.id, npc.id, 'the idempotent retry must return the same converted Actor');
  assert.equal(derivationCallCount, 1, 'a same-token retry must never re-run derivation/materialization');
  assert.equal(owner.flags[SYSTEM_ID].followers.length, 1, 'a same-token retry must never create a duplicate follower record');
}

// 75. A DIFFERENT token calling convertToFollower for the same
// owner/target/slot after a successful conversion is rejected normally
// (the slot is occupied / the target is already a follower) — it is
// never mistaken for a matching retry.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', requestToken: 'token-A', ...OK_DERIVATION });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', requestToken: 'token-B', ...OK_DERIVATION }));
}

// ---------------------------------------------------------------------
// ROUND-3 CORRECTION — reservation-cleanup results must be authoritative
// (inspected, not merely try/caught), on both the success and failure
// exit paths of convertToFollower().
// ---------------------------------------------------------------------

// 76. A successful conversion whose target-reservation release reports a
// structured failure (token mismatch — which does NOT throw) must not be
// reported as an ordinary clean success. The mechanical conversion
// itself is NOT rolled back solely because of a cleanup failure — it is
// already committed — but the caller must be told cleanup failed.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const originalRelease = FollowerSlotService.releaseFollowerConversionTargetReservation;
  FollowerSlotService.releaseFollowerConversionTargetReservation = async () => ({ success: false, code: 'FOLLOWER_TARGET_RESERVATION_TOKEN_MISMATCH', error: 'simulated token mismatch' });
  try {
    let thrown = null;
    try {
      await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', ...OK_DERIVATION });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'a cleanup failure on the success path must surface as a rejection, not a silent success');
    assert.equal(thrown.code, 'FOLLOWER_CONVERSION_RESERVATION_CLEANUP_FAILED');
    assert.equal(thrown.committed, true, 'the mechanical conversion is already committed and must not be reported as never having happened');
    assert.equal(thrown.actor?.id, npc.id);
    assert.equal(thrown.reservationCleanup.success, false);
    assert.equal(thrown.reservationCleanup.targetRelease.success, false);
    // The conversion itself DID commit — this is not a rollback failure.
    assert.equal(owner.flags[SYSTEM_ID].followers.length, 1, 'the conversion must remain committed despite the cleanup failure');
  } finally {
    FollowerSlotService.releaseFollowerConversionTargetReservation = originalRelease;
  }
}

// 77. A failed/rolled-back conversion whose target-reservation cleanup
// ALSO fails preserves the ORIGINAL conversion error (never replaced by
// the cleanup failure) while attaching the structured cleanup result.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const originalRelease = FollowerSlotService.releaseFollowerConversionTargetReservation;
  FollowerSlotService.releaseFollowerConversionTargetReservation = async () => ({ success: false, code: 'FOLLOWER_TARGET_RESERVATION_TOKEN_MISMATCH', error: 'simulated token mismatch' });
  try {
    let thrown = null;
    try {
      await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown);
    assert.match(thrown.message, /Follower derivation could not be applied/, 'the ORIGINAL conversion error must survive, never replaced by the cleanup failure');
    assert.equal(thrown.reservationCleanup.success, false);
    assert.equal(thrown.reservationCleanup.targetRelease.success, false);
  } finally {
    FollowerSlotService.releaseFollowerConversionTargetReservation = originalRelease;
  }
}

// 78. Same as 77, but the SLOT reservation release is the one that fails
// — the attached cleanup result must identify the slot release, not the
// target release, as the failure.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const originalRelease = FollowerSlotService.releaseFollowerSlotReservation;
  FollowerSlotService.releaseFollowerSlotReservation = async () => ({ success: false, code: 'FOLLOWER_SLOT_RESERVATION_TOKEN_MISMATCH', error: 'simulated slot token mismatch' });
  try {
    let thrown = null;
    try {
      await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown);
    assert.match(thrown.message, /Follower derivation could not be applied/);
    assert.equal(thrown.reservationCleanup.success, false);
    assert.equal(thrown.reservationCleanup.slotRelease.success, false);
    assert.equal(thrown.reservationCleanup.targetRelease.success, true, 'the target release itself succeeded — only the slot release failed');
  } finally {
    FollowerSlotService.releaseFollowerSlotReservation = originalRelease;
  }
}

// 79. When BOTH releases fail on a rolled-back conversion, both failures
// are captured in the attached cleanup result's `errors` array.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const originalTargetRelease = FollowerSlotService.releaseFollowerConversionTargetReservation;
  const originalSlotRelease = FollowerSlotService.releaseFollowerSlotReservation;
  FollowerSlotService.releaseFollowerConversionTargetReservation = async () => ({ success: false, code: 'FOLLOWER_TARGET_RESERVATION_TOKEN_MISMATCH', error: 'simulated target mismatch' });
  FollowerSlotService.releaseFollowerSlotReservation = async () => ({ success: false, code: 'FOLLOWER_SLOT_RESERVATION_TOKEN_MISMATCH', error: 'simulated slot mismatch' });
  try {
    let thrown = null;
    try {
      await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown);
    assert.equal(thrown.reservationCleanup.errors.length, 2, 'both release failures must be captured, not just the first');
  } finally {
    FollowerSlotService.releaseFollowerConversionTargetReservation = originalTargetRelease;
    FollowerSlotService.releaseFollowerSlotReservation = originalSlotRelease;
  }
}

// 80. releaseFollowerConversionTargetReservation() itself verifies its
// own write: a deletion that "succeeds" per ActorEngine but does not
// actually take effect (the token is still present on reread) must
// report failure, not success — mirroring the acquisition side's own
// post-write reread discipline.
{
  resetFakeActorEngine();
  asGM();
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const { buildTargetConversionReservation } = await import('../scripts/domain/followers/follower-slot-occupancy.js');
  npc.flags[SYSTEM_ID].followerConversionReservation = buildTargetConversionReservation({ token: 'token-A', ownerActorId: 'owner-1', slotId: 's1' });
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.updateActor;
  ActorEngine.updateActor = async () => npc; // simulates a write that reports success but does not actually delete the flag
  try {
    const result = await FollowerSlotService.releaseFollowerConversionTargetReservation(npc, 'token-A');
    assert.equal(result.success, false, 'a release write that does not verifiably take effect must not report success');
    assert.equal(result.code, 'FOLLOWER_TARGET_RESERVATION_RELEASE_UNVERIFIED');
  } finally {
    ActorEngine.updateActor = original;
  }
}

// 81. releaseFollowerSlotReservation() has the same release-verification
// discipline for the slot side.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, reservation: { token: 'token-A', expiresAt: Date.now() + 60000 } }] } } });
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.updateActor;
  ActorEngine.updateActor = async () => owner; // simulates a write that reports success but does not actually clear the reservation
  try {
    const result = await FollowerSlotService.releaseFollowerSlotReservation(owner, 's1', 'token-A');
    assert.equal(result.success, false);
    assert.equal(result.code, 'FOLLOWER_SLOT_RESERVATION_RELEASE_UNVERIFIED');
  } finally {
    ActorEngine.updateActor = original;
  }
}

// 82. Rollback logging reflects reality: when the transaction's own
// rollback fully succeeded AND cleanup succeeded, a warn-level "rolled
// back successfully" is logged; when either is incomplete, an
// error-level "rollback incomplete" is logged instead. Verified by
// intercepting swseLogger directly (the real, shipped logger — not a
// stub), since this is a wording/severity correctness requirement, not
// a return-value one.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const { swseLogger } = await import('../scripts/utils/logger.js');
  const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
  const originalError = swseLogger.error;
  const originalWarn = swseLogger.warn;
  const errorCalls = [];
  const warnCalls = [];
  swseLogger.error = (...args) => { errorCalls.push(args); };
  swseLogger.warn = (...args) => { warnCalls.push(args); };
  try {
    await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => false }));
    const rolledBackCleanly = warnCalls.some(args => /rolled back successfully/.test(args[0]));
    const rollbackIncomplete = errorCalls.some(args => /rollback incomplete/.test(args[0]));
    assert.equal(rolledBackCleanly, true, 'a fully clean rollback (no rollbackFailed, cleanup succeeded) must log the "rolled back successfully" wording');
    assert.equal(rollbackIncomplete, false, 'a fully clean rollback must never ALSO log "rollback incomplete"');
  } finally {
    swseLogger.error = originalError;
    swseLogger.warn = originalWarn;
  }

  // Now force an incomplete rollback via a cleanup failure and confirm
  // the wording flips to the honest, non-success framing.
  resetFakeActorEngine();
  asGM();
  const owner2 = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null, templateChoices: ['utility'] }] } } });
  const npc2 = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const originalRelease = FollowerSlotService.releaseFollowerConversionTargetReservation;
  FollowerSlotService.releaseFollowerConversionTargetReservation = async () => ({ success: false, code: 'FOLLOWER_TARGET_RESERVATION_TOKEN_MISMATCH', error: 'simulated' });
  const errorCalls2 = [];
  const warnCalls2 = [];
  swseLogger.error = (...args) => { errorCalls2.push(args); };
  swseLogger.warn = (...args) => { warnCalls2.push(args); };
  try {
    await assert.rejects(() => AllyAssignmentService.convertToFollower(owner2, npc2, 's1', { source: 'test', applyFollowerDerivation: async () => false }));
    const claimedCleanRollback = warnCalls2.some(args => /rolled back successfully/.test(args[0]));
    const flaggedIncomplete = errorCalls2.some(args => /rollback incomplete/.test(args[0]));
    assert.equal(claimedCleanRollback, false, 'a rollback with a cleanup failure must never claim it was rolled back successfully');
    assert.equal(flaggedIncomplete, true, 'a rollback with a cleanup failure must be logged as incomplete, at error severity');
  } finally {
    FollowerSlotService.releaseFollowerConversionTargetReservation = originalRelease;
    swseLogger.error = originalError;
    swseLogger.warn = originalWarn;
  }
}

console.log('GM existing NPC allies assignment tests passed.');
