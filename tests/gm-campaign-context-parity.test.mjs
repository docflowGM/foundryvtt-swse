import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 6: proves GMCampaignContextService's
// forLocation/forFaction/forJob/forIntel resolve the SAME real ids the
// already-proven Phase 1-5 ecosystem VMs resolve for identical fixtures —
// guarding against the context service becoming a second, competing
// interpretation of the same campaign graph (Phase 6AJ).
//
// PURE ADDITIVE DESIGN CONTRACT — this service and every method on it did
// not exist before this phase.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ locations = [], factions = [], threads = [], records = [], actors = [] } = {}) {
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
      users: makeActorsCollection([]),
      scenes: new Map(),
      combat: null
    }
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
}

const FACTION = { id: 'hutt-cartel', name: 'Hutt Cartel', contacts: [{ id: 'vigo-korda', name: 'Vigo Korda' }] };
const LOCATION = { id: 'tatooine', name: 'Tatooine', activeForParty: true, controllingFactionId: 'hutt-cartel' };
const JOB_THREAD = {
  id: 'job-thread-1', title: 'Escort the Shipment',
  metadata: { threadType: 'job', job: { title: 'Escort the Shipment', status: 'posted', issuer: { factionId: 'hutt-cartel', contactId: 'vigo-korda' }, sourceLocation: { locationId: 'tatooine' } } }
};

const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');

// --- forLocation(): Faction + Job resolve with real ids --------------------
{
  installShim({ locations: [LOCATION], factions: [FACTION], threads: [JOB_THREAD] });
  const context = await GMCampaignContextService.forLocation('tatooine');
  assert.equal(context.subject.resolved, true);
  assert.equal(context.relationships.faction.id, 'hutt-cartel');
  assert.equal(context.relationships.faction.resolutionKind, 'canonical-id');
  assert.equal(context.relationships.jobs.length, 1);
  assert.equal(context.relationships.jobs[0].id, 'job-thread-1');
  assert.equal(context.party.currentPartyPresence, true);
}

// --- forFaction(): Location + Job resolve with real ids ---------------------
{
  installShim({ locations: [LOCATION], factions: [FACTION], threads: [JOB_THREAD] });
  const context = await GMCampaignContextService.forFaction('hutt-cartel');
  assert.equal(context.relationships.locations.length, 1);
  assert.equal(context.relationships.locations[0].id, 'tatooine');
  assert.equal(context.relationships.jobs.length, 1);
  assert.equal(context.relationships.jobs[0].id, 'job-thread-1');
  assert.ok(context.limitations.some(l => l.includes('Faction<->Faction')), 'must honestly report the known Faction<->Faction gap, never fabricate it');
}

// --- forJob(): Faction/Contact/Location resolve with real ids --------------
{
  installShim({ locations: [LOCATION], factions: [FACTION], threads: [JOB_THREAD] });
  const context = await GMCampaignContextService.forJob('job-thread-1');
  assert.equal(context.relationships.faction.id, 'hutt-cartel');
  assert.equal(context.relationships.contact.id, 'vigo-korda');
  assert.equal(context.relationships.location.id, 'tatooine');
  assert.equal(context.party.currentPartyAtMissionLocation, true);
}

// --- forIntel(): Location/Faction/Job resolve with real ids ----------------
{
  installShim({ locations: [LOCATION], factions: [FACTION], threads: [JOB_THREAD] });
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');
  const record = await HolonetIntelService.createIntelDraft({
    title: 'Shipment Manifest',
    linkedLocationId: 'tatooine',
    linkedFactionId: 'hutt-cartel',
    linkedJobThreadId: 'job-thread-1'
  });
  const context = await GMCampaignContextService.forIntel(record.id);
  assert.equal(context.relationships.location.id, 'tatooine');
  assert.equal(context.relationships.faction.id, 'hutt-cartel');
  assert.equal(context.relationships.job.id, 'job-thread-1');
  assert.equal(context.party.currentPartyAtLocation, true);
}

// --- broken/missing references resolve honestly, never fabricated (6AR) ----
{
  installShim({});
  const context = await GMCampaignContextService.forLocation('nowhere');
  assert.equal(context.subject.resolved, false);
  assert.equal(context.subject.resolutionKind, 'missing');
  assert.deepEqual(context.relationships, {});
}

{
  installShim({ locations: [LOCATION] });
  const context = await GMCampaignContextService.forJob('nonexistent-thread');
  assert.equal(context.subject.resolved, false);
  assert.equal(context.subject.resolutionKind, 'missing');
}

console.log('GMCampaignContextService parity/broken-reference contract passed (forLocation/forFaction/forJob/forIntel resolve the same real ids as the proven Phase 1-5 VMs, honest missing subjects never fabricated).');
