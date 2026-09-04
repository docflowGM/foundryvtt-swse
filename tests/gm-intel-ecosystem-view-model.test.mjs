import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 5: the selected Intel's ecosystem
// view-model grouping (identity/currentSituation/relationships/knowledge/
// world), executed for real against realistic linked data across every
// real authority Intel resolves through (LocationRegistryService,
// FactionRegistryService, HolonetStorage/GMJobBoardSurfaceService,
// game.scenes, game.actors).
//
// PURE ADDITIVE DESIGN CONTRACT (no prior bug — these groups did not exist
// on the Intel VM before this phase): pre-Phase-5 source has no
// identity/currentSituation/relationships/knowledge/world fields on
// intelManager.selectedCard at all. Phase-5 source satisfies the contract.
//
// The Intel -> Location/Atlas-Fact relationship specifically depends on the
// Phase 5A bug fix (HolonetIntelService.normalizeLinks() gaining
// linkedLocationId/sourceFactId, and LocationIntelBridgeService writing
// them as top-level draft fields) proven separately in
// gm-intel-location-fact-identity.test.mjs; this test proves the VM reads
// those real fields correctly once they exist.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ locations = [], factions = [], threads = [], records = [], actors = [], scenes = [] } = {}) {
  const stores = new Map([
    ['gmLocationRegistry', locations],
    ['gmFactionRegistry', factions],
    ['holonet_threads', threads],
    ['holonet_records', records]
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
      scenes: new Map(scenes.map(scene => [scene.id, scene]))
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } }
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
}

const FACTION = { id: 'hutt-cartel', name: 'Hutt Cartel', contacts: [{ id: 'vigo-korda', name: 'Vigo Korda', role: 'Fixer' }] };
const LOCATION = {
  id: 'tatooine', name: 'Tatooine', activeForParty: true,
  atlasFacts: [{ id: 'fact1', title: 'Underworld Shipping Lanes', teaser: 'Cargo moves quietly.' }]
};
const JOB_THREAD = {
  id: 'job-thread-1', title: 'Escort the Shipment',
  metadata: { threadType: 'job', job: { title: 'Escort the Shipment', status: 'posted' } }
};
const SCENE = { id: 'scene1', name: 'Mos Eisley Cantina', active: false };
const ACTOR = { id: 'actor1', name: 'Dex Rimrunner' };

// --- 1: canonical NEW Intel — every relationship resolves correctly -------
{
  installShim({ locations: [LOCATION], factions: [FACTION], threads: [JOB_THREAD], actors: [ACTOR], scenes: [SCENE] });
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');
  const { GMIntelSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMIntelSurfaceService.js');

  const record = await HolonetIntelService.createIntelDraft({
    title: 'Intercepted Shipping Manifest',
    linkedLocationId: 'tatooine',
    sourceFactId: 'fact1',
    linkedFactionId: 'hutt-cartel',
    linkedContactId: 'vigo-korda',
    linkedJobThreadId: 'job-thread-1',
    linkedSceneUuid: 'Scene.scene1',
    linkedActorUuid: 'Actor.actor1'
  });

  const host = { getSurfaceState: () => ({ selectedRecordId: record.id }) };
  const vm = await GMIntelSurfaceService.buildViewModel(host);
  const card = vm.intelManager.selectedCard;
  assert.ok(card, 'selectedCard must resolve for the created record');

  assert.equal(card.identity.title, 'Intercepted Shipping Manifest');
  assert.equal(card.identity.recordId, record.id);

  assert.equal(card.relationships.location.id, 'tatooine');
  assert.equal(card.relationships.location.resolutionKind, 'canonical-id');
  assert.equal(card.relationships.location.currentPartyPresence, true);
  assert.equal(card.currentSituation.currentPartyAtLocation, true);

  assert.equal(card.relationships.sourceFact.id, 'fact1');
  assert.equal(card.relationships.sourceFact.title, 'Underworld Shipping Lanes');
  assert.equal(card.relationships.sourceFact.resolutionKind, 'canonical-id');

  assert.equal(card.relationships.faction.id, 'hutt-cartel');
  assert.equal(card.relationships.faction.name, 'Hutt Cartel');
  assert.equal(card.relationships.contact.id, 'vigo-korda');
  assert.equal(card.relationships.contact.name, 'Vigo Korda');

  assert.equal(card.relationships.job.id, 'job-thread-1');
  assert.equal(card.relationships.job.title, 'Escort the Shipment');
  assert.equal(card.relationships.job.status, 'posted');
  assert.equal(card.relationships.job.resolutionKind, 'canonical-id');

  assert.equal(card.relationships.scene.id, 'scene1');
  assert.equal(card.relationships.scene.name, 'Mos Eisley Cantina');
  assert.equal(card.relationships.scene.resolutionKind, 'canonical-id');

  assert.equal(card.relationships.actor.id, 'actor1');
  assert.equal(card.relationships.actor.name, 'Dex Rimrunner');
  assert.equal(card.relationships.actor.resolutionKind, 'canonical-id');

  assert.equal(card.knowledge.summary, card.summary);
}

// --- 2: unlinked Intel — every relationship reports null, never fabricated
{
  installShim({});
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');
  const { GMIntelSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMIntelSurfaceService.js');

  const record = await HolonetIntelService.createIntelDraft({ title: 'Loose Rumor' });
  const host = { getSurfaceState: () => ({ selectedRecordId: record.id }) };
  const vm = await GMIntelSurfaceService.buildViewModel(host);
  const card = vm.intelManager.selectedCard;

  assert.equal(card.relationships.location, null);
  assert.equal(card.relationships.sourceFact, null);
  assert.equal(card.relationships.faction, null);
  assert.equal(card.relationships.contact, null);
  assert.equal(card.relationships.job, null);
  assert.equal(card.relationships.scene, null);
  assert.equal(card.relationships.actor, null);
  assert.equal(card.currentSituation.currentPartyAtLocation, false);
}

// --- 3: stale/broken references resolve honestly as missing, not silently
// dropped and not fabricated (Phase 5X) -------------------------------------
{
  installShim({});
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');
  const { GMIntelSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMIntelSurfaceService.js');

  const record = await HolonetIntelService.createIntelDraft({
    title: 'Orphaned Dossier',
    linkedLocationId: 'nowhere',
    linkedJobThreadId: 'ghost-thread'
  });
  const host = { getSurfaceState: () => ({ selectedRecordId: record.id }) };
  const vm = await GMIntelSurfaceService.buildViewModel(host);
  const card = vm.intelManager.selectedCard;

  assert.equal(card.relationships.location.resolved, false);
  assert.equal(card.relationships.location.resolutionKind, 'missing');
  assert.equal(card.relationships.job.resolved, false);
  assert.equal(card.relationships.job.resolutionKind, 'missing');
}

// --- 4: no selected Intel at all -> no ecosystem groups, no crash ---------
{
  installShim({});
  const { GMIntelSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMIntelSurfaceService.js');
  const host = { getSurfaceState: () => ({}) };
  const vm = await GMIntelSurfaceService.buildViewModel(host);
  assert.equal(vm.intelManager.selectedCard, null);
}

console.log('GM Intel ecosystem view-model contract passed (identity/currentSituation/relationships/knowledge/world groups resolve real linked data, honest resolutionKind for missing/unlinked, no crash on empty selection).');
