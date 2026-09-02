import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 7: proves
// GMWorkspaceSurfaceService.buildViewModel(host)'s new selection state
// contract — an explicit selectedActorId honestly reports a missing Actor
// rather than fabricating a substitute, no selection falls back to the
// first current party member, and GMCampaignContextService.forActor() is
// invoked EXACTLY ONCE per render regardless of roster size (the Phase 7
// performance rule — never once per roster card).
//
// PURE ADDITIVE DESIGN CONTRACT — the `selection` VM key did not exist
// before this phase.

registerFoundryPathLoader();

const FLAG_SCOPE = 'foundryvtt-swse';
const PARTY_FLAG = 'gmPartyMember';

function fakeActor({ id, name, inParty = false, hp = 10, hpMax = 10 }) {
  const flags = { [PARTY_FLAG]: inParty };
  return {
    id, name, type: 'character', uuid: `Actor.${id}`, img: '',
    system: { hp: { value: hp, max: hpMax } },
    getFlag: (_scope, key) => flags[key],
    setFlag: async (_scope, key, value) => { flags[key] = value; return value; },
    isOwner: true
  };
}

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), filter: (fn) => actorList.filter(fn), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ actors = [] } = {}) {
  const stores = new Map([
    ['gmLocationRegistry', []],
    ['gmFactionRegistry', []],
    ['holonet_threads', []],
    ['holonet_records', []],
    ['pendingCustomPurchases', []]
  ]);
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: {
        get: (_module, key) => stores.get(key),
        set: (_module, key, value) => { stores.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      },
      actors: makeActorsCollection(actors),
      users: makeActorsCollection([]),
      scenes: new Map(),
      combat: null
    }
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
}

function fakeHost(selectedActorId) {
  return { getSurfaceState: (id) => (id === 'workspace' ? { selectedActorId } : {}) };
}

const { GMWorkspaceSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMWorkspaceSurfaceService.js');
const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');

// --- no selectedActorId falls back to the first current party member -----
{
  const CHEWIE = fakeActor({ id: 'chewie', name: 'Chewbacca', inParty: true });
  const HAN = fakeActor({ id: 'han-solo', name: 'Han Solo', inParty: true });
  installShim({ actors: [CHEWIE, HAN] });

  const vm = await GMWorkspaceSurfaceService.buildViewModel(fakeHost(''));
  assert.equal(vm.selection.hasSelection, true);
  assert.equal(vm.selection.selectedActorId, 'chewie', 'with no explicit selection, Workspace must fall back to the first current party member, matching the same convention Locations already uses');
  assert.equal(vm.selection.warning, '');
}

// --- an explicit selectedActorId that no longer resolves must report a
// warning, never silently substitute another Actor (7S honesty rule).
{
  const CHEWIE = fakeActor({ id: 'chewie', name: 'Chewbacca', inParty: true });
  installShim({ actors: [CHEWIE] });

  const vm = await GMWorkspaceSurfaceService.buildViewModel(fakeHost('deleted-actor-id'));
  assert.equal(vm.selection.hasSelection, false);
  assert.ok(vm.selection.warning, 'a broken selectedActorId reference must produce an honest warning');
  assert.notEqual(vm.selection.selectedActorId, 'chewie', 'a broken reference must never silently fall back to a different real Actor');
  assert.equal(vm.selection.selectedActorId, 'deleted-actor-id', 'the VM must still report which id failed to resolve');
}

// --- zero party members and no explicit selection: empty, not fabricated -
{
  installShim({ actors: [] });
  const vm = await GMWorkspaceSurfaceService.buildViewModel(fakeHost(''));
  assert.equal(vm.selection.hasSelection, false);
  assert.ok(vm.selection.empty, 'an empty roster with no selection must report an honest empty state, never a warning about a nonexistent id');
  assert.equal(vm.selection.warning, '');
}

// --- performance rule: forActor() is called EXACTLY ONCE per render,
// regardless of roster size — never once per roster card.
{
  const actors = Array.from({ length: 5 }, (_, i) => fakeActor({ id: `actor-${i}`, name: `Actor ${i}`, inParty: i < 3 }));
  installShim({ actors });

  let callCount = 0;
  const originalForActor = GMCampaignContextService.forActor;
  GMCampaignContextService.forActor = async (ref) => { callCount++; return originalForActor.call(GMCampaignContextService, ref); };
  try {
    const vm = await GMWorkspaceSurfaceService.buildViewModel(fakeHost('actor-1'));
    assert.equal(callCount, 1, 'GMCampaignContextService.forActor() must be called exactly once per Workspace render, only for the selected Actor — never once per roster card');
    assert.equal(vm.gmActors.length, 5, 'sanity: the full roster was actually built (5 actors), proving the single forActor() call was not a coincidence of a tiny roster');
  } finally {
    GMCampaignContextService.forActor = originalForActor;
  }
}

// --- the selected VM shape carries the documented sections ----------------
{
  const CHEWIE = fakeActor({ id: 'chewie', name: 'Chewbacca', inParty: true, hp: 5, hpMax: 20 });
  installShim({ actors: [CHEWIE] });
  const vm = await GMWorkspaceSurfaceService.buildViewModel(fakeHost('chewie'));
  const sel = vm.selection;
  assert.equal(sel.identity.id, 'chewie');
  assert.equal(sel.currentSituation.injured, true, 'a below-max-HP selected Actor must be reported as injured in currentSituation');
  assert.ok(Array.isArray(sel.relationships.factions));
  assert.ok(Array.isArray(sel.relationships.factionContacts));
  assert.ok(Array.isArray(sel.relationships.locations));
  assert.ok(Array.isArray(sel.relationships.jobs));
  assert.ok(Array.isArray(sel.relationships.intel));
  assert.ok(sel.operations.recovery, 'operations.recovery must be the real GMCombatRecoveryService actor card, not a re-derived summary');
  assert.ok(Array.isArray(sel.operations.trades));
  assert.equal(typeof sel.progression.credits, 'number');
}

console.log('GMWorkspaceSurfaceService selected-Actor VM passed (honest missing-target/fallback rules, forActor() called exactly once per render never per card, full documented VM shape present).');
