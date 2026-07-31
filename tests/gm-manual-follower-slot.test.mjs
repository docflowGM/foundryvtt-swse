import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Manual Follower Slot — required test suite (30 cases).
//
// Coverage tiers (see docs/audits/gm-manual-follower-slot-allies.md for the
// full breakdown):
//   (a) DIRECT PRODUCTION-PATH — imports and executes the exact file that
//       ships. Both scripts/engine/crew/follower-slot-service.js and
//       scripts/ui/shell/AlliesSurfaceService.js load cleanly through the
//       Foundry-shim harness (neither transitively imports SWSEDialogV2 at
//       module scope — AlliesSurfaceService.js only reaches
//       follower-creator.js through a try/catch-guarded dynamic import used
//       for the ACTIVE follower/minion actor lists, which this suite does
//       not depend on), so every test below runs real shipped code, not a
//       reimplementation. ActorEngine is the one exception: it is
//       substituted by the shim's fake (tests/helpers/foundry-shim/fakes/
//       actor-engine.fake.mjs), a documented, narrow, verified-line-by-line
//       stand-in for the real Actor-mutation gateway, per the same
//       convention used by every other Foundry-shim test in this repo.
//
// AlliesSurfaceController.js is NOT exercised here: it imports
// progression-entry.js / ShellRouter.js, which are not yet proven loadable
// through this harness, so its two new cases ('add-follower-slot',
// 'remove-follower-slot' defense-in-depth checks) are inspection-verified
// only (see the audit doc) — this suite does not claim otherwise.

registerFoundryPathLoader();

const {
  FollowerSlotService,
  isEligibleFollowerSlotOwnerType,
  isEligibleFollowerSlotOwner,
  buildManualFollowerSlot,
  validateManualFollowerSlotGrant,
  validateManualFollowerSlotRevocation,
  appendFollowerSlot,
  removeFollowerSlotById
} = await import('../scripts/engine/crew/follower-slot-service.js');

const { fakeActorEngineCallLog, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');

const SYSTEM_ID = 'foundryvtt-swse';

function makeFakeActor(overrides = {}) {
  const flags = { [SYSTEM_ID]: {}, ...(overrides.flags || {}) };
  return {
    id: 'owner-1',
    name: 'Test Owner',
    type: 'character',
    isOwner: false,
    system: {},
    img: 'icons/x.png',
    ...overrides,
    flags,
    getFlag(scope, key) {
      return this.flags?.[scope]?.[key];
    }
  };
}

function asGM(overrides = {}) {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1', name: 'GM Tester' }, actors: new Map() }, ...overrides });
}

function asPlayer(overrides = {}) {
  installFoundryShimGlobals({ game: { user: { isGM: false, id: 'player-1', name: 'Player' }, actors: new Map() }, ...overrides });
}

// ---------------------------------------------------------------------
// 1-8: Slot schema, pure builders/validators (FollowerSlotService module)
// ---------------------------------------------------------------------

// 1. buildManualFollowerSlot produces the exact documented provenance shape.
{
  const slot = buildManualFollowerSlot({ grantedByUserId: 'gm-1', grantedByUserName: 'GM Tester' });
  assert.equal(slot.sourceType, 'gm-grant');
  assert.equal(slot.sourceId, null);
  assert.equal(slot.sourceLabel, 'GM Granted');
  assert.equal(slot.talentName, null, 'a manual slot must never carry a fake talent name');
  assert.equal(slot.talentItemId, null, 'a manual slot must never carry a fake talentItemId');
  assert.equal(slot.talentTreeId, null);
  assert.equal(slot.dependentKind, 'follower');
  assert.deepEqual(slot.templateChoices, ['aggressive', 'defensive', 'utility']);
  assert.equal(slot.createdActorId, null);
  assert.equal(slot.grantedByUserId, 'gm-1');
  assert.equal(slot.grantedByUserName, 'GM Tester');
  assert.equal(typeof slot.grantedAt, 'number');
  assert.equal(typeof slot.createdAt, 'number');
  assert.ok(slot.id, 'must have a generated id');
}

// 2. Two calls to buildManualFollowerSlot produce distinct ids.
{
  const a = buildManualFollowerSlot();
  const b = buildManualFollowerSlot();
  assert.notEqual(a.id, b.id);
}

// 3. isEligibleFollowerSlotOwnerType: character and droid are eligible.
{
  assert.equal(isEligibleFollowerSlotOwnerType('character'), true);
  assert.equal(isEligibleFollowerSlotOwnerType('droid'), true);
}

// 4. isEligibleFollowerSlotOwnerType: other actor types are not eligible.
{
  assert.equal(isEligibleFollowerSlotOwnerType('vehicle'), false);
  assert.equal(isEligibleFollowerSlotOwnerType('npc'), false);
  assert.equal(isEligibleFollowerSlotOwnerType(undefined), false);
}

// 5. isEligibleFollowerSlotOwner: false for a null/undefined actor.
{
  assert.equal(isEligibleFollowerSlotOwner(null), false);
  assert.equal(isEligibleFollowerSlotOwner(undefined), false);
}

// 6. validateManualFollowerSlotGrant: rejects a non-GM caller regardless of
// how valid everything else is.
{
  const result = validateManualFollowerSlotGrant({ isGM: false, ownerExists: true, ownerType: 'character' });
  assert.equal(result.valid, false);
  assert.match(result.error, /Only a GM/);
}

// 7. validateManualFollowerSlotGrant: rejects a missing owner.
{
  const result = validateManualFollowerSlotGrant({ isGM: true, ownerExists: false, ownerType: null });
  assert.equal(result.valid, false);
  assert.match(result.error, /No owner Actor/);
}

// 8. validateManualFollowerSlotGrant: rejects an ineligible owner type, and
// accepts a fully valid request.
{
  const rejected = validateManualFollowerSlotGrant({ isGM: true, ownerExists: true, ownerType: 'vehicle' });
  assert.equal(rejected.valid, false);
  assert.match(rejected.error, /not eligible/);

  const accepted = validateManualFollowerSlotGrant({ isGM: true, ownerExists: true, ownerType: 'character' });
  assert.equal(accepted.valid, true);
  assert.equal(accepted.error, null);
}

// ---------------------------------------------------------------------
// 9-13: Revocation validation rules
// ---------------------------------------------------------------------

// 9. validateManualFollowerSlotRevocation: rejects a non-GM caller.
{
  const slot = buildManualFollowerSlot();
  const result = validateManualFollowerSlotRevocation({ isGM: false, slot });
  assert.equal(result.valid, false);
  assert.match(result.error, /Only a GM/);
}

// 10. validateManualFollowerSlotRevocation: rejects a missing slot.
{
  const result = validateManualFollowerSlotRevocation({ isGM: true, slot: null });
  assert.equal(result.valid, false);
  assert.match(result.error, /could not be found/);
}

// 11. validateManualFollowerSlotRevocation: rejects a talent-derived slot
// (no sourceType, or sourceType !== 'gm-grant') — this removal path must
// never be usable on a talent-granted slot.
{
  const talentSlot = { id: 'talent-slot-1', talentItemId: 'item-1', talentName: 'Undying Loyalty', createdActorId: null };
  const result = validateManualFollowerSlotRevocation({ isGM: true, slot: talentSlot });
  assert.equal(result.valid, false);
  assert.match(result.error, /talent-granted slots/);
}

// 12. validateManualFollowerSlotRevocation: rejects an occupied manual slot.
{
  const occupied = buildManualFollowerSlot();
  occupied.createdActorId = 'follower-actor-1';
  const result = validateManualFollowerSlotRevocation({ isGM: true, slot: occupied });
  assert.equal(result.valid, false);
  assert.match(result.error, /occupied follower slot/);
}

// 13. validateManualFollowerSlotRevocation: accepts an empty manual slot.
{
  const empty = buildManualFollowerSlot();
  const result = validateManualFollowerSlotRevocation({ isGM: true, slot: empty });
  assert.equal(result.valid, true);
  assert.equal(result.error, null);
}

// ---------------------------------------------------------------------
// 14-15: append/remove pure array helpers never mutate input, never touch
// unrelated (talent) slots.
// ---------------------------------------------------------------------

// 14. appendFollowerSlot appends without mutating the input array, and
// leaves pre-existing (e.g. talent-derived) slots untouched.
{
  const talentSlot = { id: 'talent-1', talentItemId: 'item-1' };
  const original = [talentSlot];
  const manual = buildManualFollowerSlot();
  const next = appendFollowerSlot(original, manual);
  assert.equal(original.length, 1, 'input array must not be mutated');
  assert.equal(next.length, 2);
  assert.equal(next[0], talentSlot, 'pre-existing talent slot object is untouched');
  assert.equal(next[1], manual);
}

// 15. removeFollowerSlotById removes only the matching slot, leaves others
// (including talent slots) intact, and does not mutate the input array.
{
  const talentSlot = { id: 'talent-1', talentItemId: 'item-1' };
  const manual = buildManualFollowerSlot();
  const original = [talentSlot, manual];
  const next = removeFollowerSlotById(original, manual.id);
  assert.equal(original.length, 2, 'input array must not be mutated');
  assert.equal(next.length, 1);
  assert.equal(next[0], talentSlot);
}

// ---------------------------------------------------------------------
// 16-30: FollowerSlotService — the governed grant/revoke authority.
// ---------------------------------------------------------------------

// 16. grantManualFollowerSlot: GM happy path persists through ActorEngine
// (not actor.setFlag/actor.update) and returns the created slot.
{
  resetFakeActorEngine();
  asGM();
  const actor = makeFakeActor();
  actor.setFlag = () => { throw new Error('setFlag must never be called directly'); };
  actor.update = () => { throw new Error('update must never be called directly'); };

  const slot = await FollowerSlotService.grantManualFollowerSlot(actor, { source: 'test' });
  assert.equal(slot.sourceType, 'gm-grant');
  assert.equal(fakeActorEngineCallLog.length, 1);
  assert.equal(fakeActorEngineCallLog[0].method, 'updateActor');
  assert.deepEqual(Object.keys(fakeActorEngineCallLog[0].data), [`flags.${SYSTEM_ID}.followerSlots`]);
  assert.equal(actor.flags[SYSTEM_ID].followerSlots.length, 1);
  assert.equal(actor.flags[SYSTEM_ID].followerSlots[0].id, slot.id);
}

// 17. grantManualFollowerSlot: rejects a forged non-GM call — the exact
// "hiding the button is not enough" requirement. ActorEngine must never be
// invoked.
{
  resetFakeActorEngine();
  asPlayer();
  const actor = makeFakeActor();
  await assert.rejects(
    () => FollowerSlotService.grantManualFollowerSlot(actor, { source: 'forged' }),
    /Only a GM/
  );
  assert.equal(fakeActorEngineCallLog.length, 0, 'a rejected grant must never reach ActorEngine');
}

// 18. grantManualFollowerSlot: rejects a missing owner Actor.
{
  resetFakeActorEngine();
  asGM();
  await assert.rejects(() => FollowerSlotService.grantManualFollowerSlot(null), /No owner Actor/);
  assert.equal(fakeActorEngineCallLog.length, 0);
}

// 19. grantManualFollowerSlot: rejects an ineligible owner Actor type.
{
  resetFakeActorEngine();
  asGM();
  const vehicle = makeFakeActor({ id: 'veh-1', type: 'vehicle' });
  await assert.rejects(() => FollowerSlotService.grantManualFollowerSlot(vehicle), /not eligible/);
  assert.equal(fakeActorEngineCallLog.length, 0);
}

// 20. grantManualFollowerSlot: appends to, and never disturbs, existing
// talent-derived slots already on the owner.
{
  resetFakeActorEngine();
  asGM();
  const talentSlot = { id: 'talent-1', talentItemId: 'item-1', talentName: 'Undying Loyalty', createdActorId: null };
  const actor = makeFakeActor({ flags: { [SYSTEM_ID]: { followerSlots: [talentSlot] } } });

  const slot = await FollowerSlotService.grantManualFollowerSlot(actor);
  const slots = actor.flags[SYSTEM_ID].followerSlots;
  assert.equal(slots.length, 2);
  assert.deepEqual(slots[0], talentSlot, 'the pre-existing talent slot must be byte-for-byte unchanged');
  assert.equal(slots[1].id, slot.id);
}

// 21. grantManualFollowerSlot: two genuinely SEQUENTIAL, awaited GM clicks
// produce two distinct slots ("two intentional completed clicks = two
// slots").
{
  resetFakeActorEngine();
  asGM();
  const actor = makeFakeActor();
  const first = await FollowerSlotService.grantManualFollowerSlot(actor);
  const second = await FollowerSlotService.grantManualFollowerSlot(actor);
  assert.notEqual(first.id, second.id);
  assert.equal(actor.flags[SYSTEM_ID].followerSlots.length, 2);
}

// 22. grantManualFollowerSlot: two CONCURRENT calls for the SAME owner (a
// double-fired click event) coalesce into exactly one persisted slot ("one
// double-fired event = one slot").
{
  resetFakeActorEngine();
  asGM();
  const actor = makeFakeActor();
  const [a, b] = await Promise.all([
    FollowerSlotService.grantManualFollowerSlot(actor),
    FollowerSlotService.grantManualFollowerSlot(actor)
  ]);
  assert.equal(a.id, b.id, 'both concurrent callers must resolve to the SAME created slot');
  assert.equal(actor.flags[SYSTEM_ID].followerSlots.length, 1, 'only one slot may be persisted');
}

// 23. grantManualFollowerSlot: the in-flight guard is keyed per-owner —
// concurrent grants for two DIFFERENT owners are never coalesced.
{
  resetFakeActorEngine();
  asGM();
  const actorA = makeFakeActor({ id: 'owner-a' });
  const actorB = makeFakeActor({ id: 'owner-b' });
  const [a, b] = await Promise.all([
    FollowerSlotService.grantManualFollowerSlot(actorA),
    FollowerSlotService.grantManualFollowerSlot(actorB)
  ]);
  assert.notEqual(a.id, b.id);
  assert.equal(actorA.flags[SYSTEM_ID].followerSlots.length, 1);
  assert.equal(actorB.flags[SYSTEM_ID].followerSlots.length, 1);
}

// 24. revokeManualFollowerSlot: GM happy path removes an empty manual slot
// through ActorEngine only.
{
  resetFakeActorEngine();
  asGM();
  const actor = makeFakeActor();
  actor.setFlag = () => { throw new Error('setFlag must never be called directly'); };
  actor.update = () => { throw new Error('update must never be called directly'); };
  const slot = await FollowerSlotService.grantManualFollowerSlot(actor);
  resetFakeActorEngine();

  const ok = await FollowerSlotService.revokeManualFollowerSlot(actor, slot.id, { source: 'test' });
  assert.equal(ok, true);
  assert.equal(actor.flags[SYSTEM_ID].followerSlots.length, 0);
  assert.equal(fakeActorEngineCallLog.length, 1);
  assert.equal(fakeActorEngineCallLog[0].method, 'updateActor');
}

// 25. revokeManualFollowerSlot: rejects a forged non-GM call.
{
  resetFakeActorEngine();
  asGM();
  const actor = makeFakeActor();
  const slot = await FollowerSlotService.grantManualFollowerSlot(actor);
  resetFakeActorEngine();
  asPlayer();

  await assert.rejects(() => FollowerSlotService.revokeManualFollowerSlot(actor, slot.id), /Only a GM/);
  assert.equal(actor.flags[SYSTEM_ID].followerSlots.length, 1, 'the slot must survive a rejected forged revoke');
  assert.equal(fakeActorEngineCallLog.length, 0);
}

// 26. revokeManualFollowerSlot: cannot remove a talent-derived slot through
// this path.
{
  resetFakeActorEngine();
  asGM();
  const talentSlot = { id: 'talent-1', talentItemId: 'item-1', talentName: 'Undying Loyalty', createdActorId: null };
  const actor = makeFakeActor({ flags: { [SYSTEM_ID]: { followerSlots: [talentSlot] } } });

  await assert.rejects(() => FollowerSlotService.revokeManualFollowerSlot(actor, talentSlot.id), /talent-granted slots/);
  assert.equal(actor.flags[SYSTEM_ID].followerSlots.length, 1);
  assert.equal(fakeActorEngineCallLog.length, 0);
}

// 27. revokeManualFollowerSlot: cannot remove an occupied manual slot.
{
  resetFakeActorEngine();
  asGM();
  const actor = makeFakeActor();
  const slot = await FollowerSlotService.grantManualFollowerSlot(actor);
  actor.flags[SYSTEM_ID].followerSlots[0].createdActorId = 'follower-actor-1';
  resetFakeActorEngine();

  await assert.rejects(() => FollowerSlotService.revokeManualFollowerSlot(actor, slot.id), /occupied follower slot/);
  assert.equal(fakeActorEngineCallLog.length, 0);
}

// 28. revokeManualFollowerSlot: throws for a missing owner or slot id, and
// for a slot id that does not exist on the owner (independent of GM state).
{
  asGM();
  await assert.rejects(() => FollowerSlotService.revokeManualFollowerSlot(null, 'x'));
  await assert.rejects(() => FollowerSlotService.revokeManualFollowerSlot(makeFakeActor(), null));
  await assert.rejects(() => FollowerSlotService.revokeManualFollowerSlot(makeFakeActor(), 'no-such-slot'), /could not be found/);
}

// 29. FollowerSlotService loads through the Foundry-shim harness importing
// the REAL scripts/governance/actor-engine/actor-engine.js specifier (the
// shim substitutes its fake only at module resolution) — this is a
// standing, re-checkable guarantee that this service's only Foundry-heavy
// dependency is ActorEngine, not the follower-creator.js/SWSEDialogV2 chain.
{
  assert.equal(typeof FollowerSlotService.grantManualFollowerSlot, 'function');
  assert.equal(typeof FollowerSlotService.revokeManualFollowerSlot, 'function');
}

// 30. AlliesSurfaceService: end-to-end capability + display + delegate
// wiring through the REAL Allies view-model builder (not a reimplementation
// of it) — canGrantManualFollowerSlot is GM-only and actor-type-gated, a
// granted manual slot appears in vm.companions.pending with "GM Granted"
// provenance, canBuildFollower/canRemoveManualSlot resolve correctly, and a
// non-GM sees the capability turned off end-to-end.
{
  const { AlliesSurfaceService } = await import('../scripts/ui/shell/AlliesSurfaceService.js');

  resetFakeActorEngine();
  asGM();
  const actor = makeFakeActor();

  const vmBefore = await AlliesSurfaceService.buildViewModel(actor, { activeTab: 'companions' });
  assert.equal(vmBefore.canGrantManualFollowerSlot, true);
  assert.equal(vmBefore.manualFollowerSlotLabel, 'Add Follower Slot');
  assert.equal(vmBefore.manualFollowerSlotHelp, 'Grant this character one follower slot without requiring a talent.');
  assert.equal(vmBefore.companions.pending.length, 0);

  const created = await AlliesSurfaceService.addManualFollowerSlot(actor);
  const vmAfter = await AlliesSurfaceService.buildViewModel(actor, { activeTab: 'companions' });
  assert.equal(vmAfter.companions.pending.length, 1);
  const pendingSlot = vmAfter.companions.pending[0];
  assert.equal(pendingSlot.id, created.id);
  assert.equal(pendingSlot.sourceType, 'gm-grant');
  assert.equal(pendingSlot.sourceTalent, 'GM Granted', 'manual slots must display "GM Granted", never "Unknown source"');
  assert.equal(pendingSlot.canBuildFollower, true, 'a manual slot must launch the ordinary follower chargen flow');
  assert.equal(pendingSlot.canRemoveManualSlot, true, 'an empty manual slot is GM-removable');

  const removed = await AlliesSurfaceService.removeManualFollowerSlot(actor, created.id);
  assert.equal(removed, true);
  const vmAfterRemove = await AlliesSurfaceService.buildViewModel(actor, { activeTab: 'companions' });
  assert.equal(vmAfterRemove.companions.pending.length, 0);

  // Non-GM: the capability is off, and canRemoveManualSlot must also be off
  // for any manual slot that exists (not just hidden, but computed false).
  await AlliesSurfaceService.addManualFollowerSlot(actor); // re-grant as GM before switching to a player
  asPlayer();
  const vmPlayer = await AlliesSurfaceService.buildViewModel(actor, { activeTab: 'companions' });
  assert.equal(vmPlayer.canGrantManualFollowerSlot, false);
  assert.equal(vmPlayer.companions.pending[0].canRemoveManualSlot, false);
}

console.log('GM manual follower slot tests passed.');
