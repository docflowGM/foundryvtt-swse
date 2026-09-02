import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 7 (Workspace as the Party/People
// Hub), addendum C/D/E/F: extends GMCampaignContextService.forActor() with
// Actor->Location relationships and richer Faction/Trade/Recovery context,
// per the corrected forActor() being "the seam Phase 7 was waiting for."
//
// PURE ADDITIVE DESIGN CONTRACT — relationships.locations,
// relationships.factions' enriched fields, operations.trades' role/
// counterparty fields, and operations.recovery.injured did not exist
// before this phase. Stashing this phase's GMCampaignContextService.js
// changes removes the fields entirely, which is this suite's fail-before
// proof (mirroring the established convention already used for Phase 6's
// attentionItems()).

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
    ['holonet_records', records],
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

const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
const { FactionRegistryService } = await import('/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js');

// --- Addendum O.2: direct Actor presence (Location.npcActorUuids) --------
{
  const VEXA = { id: 'actorvexa1', name: 'Vexa Nul', uuid: 'Actor.actorvexa1', getFlag: () => undefined };
  const TATOOINE = { id: 'tatooine', name: 'Tatooine', activeForParty: false, npcActorUuids: ['Actor.actorvexa1'], contactIds: [] };
  installShim({ locations: [TATOOINE], actors: [VEXA] });

  const context = await GMCampaignContextService.forActor(VEXA);
  assert.equal(context.relationships.locations.length, 1, 'a direct npcActorUuids match must produce exactly one Location relationship row');
  assert.equal(context.relationships.locations[0].id, 'tatooine');
  assert.equal(context.relationships.locations[0].role, 'direct-actor', 'direct Actor presence must be labeled role: direct-actor, never merged into an unexplained link');
}

// --- Addendum O.3: Contact-derived Location presence ----------------------
{
  const VEXA = { id: 'actorvexa1', name: 'Vexa Nul', uuid: 'Actor.actorvexa1', getFlag: () => undefined };
  const BLACK_SUN = { id: 'black-sun', name: 'Black Sun', contacts: [{ id: 'contact-vexa', name: 'Vexa Nul', actorUuid: 'Actor.actorvexa1' }] };
  const NAR_SHADDAA = { id: 'nar-shaddaa', name: 'Nar Shaddaa', activeForParty: false, npcActorUuids: [], contactIds: ['contact-vexa'] };
  installShim({ locations: [NAR_SHADDAA], factions: [BLACK_SUN], actors: [VEXA] });

  const context = await GMCampaignContextService.forActor(VEXA);
  assert.equal(context.relationships.locations.length, 1, 'a Faction Contact backed by this Actor, listed in Location.contactIds, must produce exactly one Location relationship row');
  assert.equal(context.relationships.locations[0].id, 'nar-shaddaa');
  assert.equal(context.relationships.locations[0].role, 'faction-contact', 'Contact-derived Location presence must be labeled role: faction-contact, distinct from direct-actor');
}

// --- both roles can coexist for the same Location without merging ---------
{
  const VEXA = { id: 'actorvexa1', name: 'Vexa Nul', uuid: 'Actor.actorvexa1', getFlag: () => undefined };
  const BLACK_SUN = { id: 'black-sun', name: 'Black Sun', contacts: [{ id: 'contact-vexa', name: 'Vexa Nul', actorUuid: 'Actor.actorvexa1' }] };
  const TATOOINE = { id: 'tatooine', name: 'Tatooine', activeForParty: false, npcActorUuids: ['Actor.actorvexa1'], contactIds: ['contact-vexa'] };
  installShim({ locations: [TATOOINE], factions: [BLACK_SUN], actors: [VEXA] });

  const context = await GMCampaignContextService.forActor(VEXA);
  assert.equal(context.relationships.locations.length, 2, 'direct-actor and faction-contact presence at the SAME Location must remain two distinct rows, never merged into one');
  const roles = context.relationships.locations.map(row => row.role).sort();
  assert.deepEqual(roles, ['direct-actor', 'faction-contact']);
}

// --- Addendum O.1 / J: party current Location never auto-populates
// relationships.locations — they are genuinely different concepts even
// when they happen to name the same real Location.
{
  const CHEWIE = { id: 'chewie', name: 'Chewbacca', uuid: 'Actor.chewie', getFlag: () => undefined };
  // activeForParty:true makes this the party's current Location, but
  // Chewbacca has no npcActorUuids/contactIds link to it whatsoever.
  const TATOOINE = { id: 'tatooine', name: 'Tatooine', activeForParty: true, npcActorUuids: [], contactIds: [] };
  installShim({ locations: [TATOOINE], actors: [CHEWIE] });

  const party = await GMCampaignContextService.party();
  assert.equal(party.currentLocation.id, 'tatooine', 'sanity: Tatooine really is the resolved party Location');

  const context = await GMCampaignContextService.forActor(CHEWIE);
  assert.deepEqual(context.relationships.locations, [], 'party.currentLocation must never leak into relationships.locations for an Actor with no real canonical Location link');
}

// --- Addendum O.4: Faction standing row retains real relationship
// metadata (relationshipType/score/status/source/benefits), not just the
// generic common-row contract.
{
  const relationshipLedger = [{
    id: 'rel-1', factionId: 'black-sun', factionName: 'Black Sun',
    relationshipType: 'ally', score: 4, status: 'active', source: 'gm', benefits: 'Safe passage through Hutt space.'
  }];
  const HAN = {
    id: 'han-solo', name: 'Han Solo', uuid: 'Actor.han-solo',
    getFlag: (_scope, key) => (key === FactionRegistryService.ACTOR_RELATIONSHIPS_FLAG ? relationshipLedger : undefined)
  };
  const BLACK_SUN = { id: 'black-sun', name: 'Black Sun', contacts: [] };
  installShim({ factions: [BLACK_SUN], actors: [HAN] });

  const context = await GMCampaignContextService.forActor(HAN);
  const row = context.relationships.factions[0];
  assert.equal(row.relationshipType, 'ally');
  assert.equal(row.score, 4);
  assert.equal(row.relationshipStatus, 'active');
  assert.equal(row.source, 'gm');
  assert.equal(row.benefits, 'Safe passage through Hutt space.');
  // The pre-existing common-row contract must still hold too.
  assert.equal(row.kind, 'faction');
  assert.equal(row.resolved, true);
  assert.equal(row.resolutionKind, 'canonical-id');
}

// --- Addendum O: Trade operation rows carry role + real counterparty -----
{
  const HAN = { id: 'han-solo', name: 'Han Solo', uuid: 'Actor.han-solo', getFlag: () => undefined };
  const LANDO = { id: 'lando', name: 'Lando Calrissian' };
  installShim({ actors: [HAN, LANDO] });

  const { GMTradeConsoleSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMTradeConsoleSurfaceService.js');
  const originalBuild = GMTradeConsoleSurfaceService.buildTradeConsoleVm;
  GMTradeConsoleSurfaceService.buildTradeConsoleVm = async () => ({
    activeQueue: [{ recordId: 'trade-1', title: 'Spice Run', threadTitle: 'Spice Run', status: 'active', fromActorId: 'han-solo', toActorId: 'lando' }],
    approvalQueue: [],
    failedQueue: []
  });
  try {
    const context = await GMCampaignContextService.forActor(HAN);
    assert.equal(context.operations.trades.length, 1);
    const trade = context.operations.trades[0];
    assert.equal(trade.role, 'sender', 'Han is fromActorId, so his role must be sender');
    assert.equal(trade.counterpartyActorId, 'lando');
    assert.equal(trade.counterpartyActorName, 'Lando Calrissian', 'the real counterparty Actor name must be resolved, not left as a bare id');

    const contextLando = await GMCampaignContextService.forActor(LANDO);
    assert.equal(contextLando.operations.trades[0].role, 'recipient', 'Lando is toActorId, so his role must be recipient');
  } finally {
    GMTradeConsoleSurfaceService.buildTradeConsoleVm = originalBuild;
  }
}

// --- Addendum F: recovery "eligible" is not automatically "injured" ------
{
  const HEALTHY = { id: 'healthy-1', name: 'Healthy PC', type: 'character', uuid: 'Actor.healthy-1', system: { hp: { value: 20, max: 20 } }, getFlag: () => undefined };
  const WOUNDED = { id: 'wounded-1', name: 'Wounded PC', type: 'character', uuid: 'Actor.wounded-1', system: { hp: { value: 5, max: 20 } }, getFlag: () => undefined };
  installShim({ actors: [HEALTHY, WOUNDED] });

  const { GMPartyRosterService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-party-roster-service.js');
  const originalGetPartyActors = GMPartyRosterService.getPartyActors;
  GMPartyRosterService.getPartyActors = () => [HEALTHY, WOUNDED];
  try {
    const healthyContext = await GMCampaignContextService.forActor(HEALTHY);
    assert.equal(healthyContext.operations.recovery.naturalHealingEligible, true, 'a full-HP character is still eligible for the natural-healing trigger');
    assert.equal(healthyContext.operations.recovery.injured, false, 'a full-HP character must never be reported as injured');

    const woundedContext = await GMCampaignContextService.forActor(WOUNDED);
    assert.equal(woundedContext.operations.recovery.naturalHealingEligible, true);
    assert.equal(woundedContext.operations.recovery.injured, true, 'a below-max-HP character must be reported as injured');
  } finally {
    GMPartyRosterService.getPartyActors = originalGetPartyActors;
  }
}

console.log('GMCampaignContextService.forActor() Phase 7 extensions passed (direct-actor vs. faction-contact Location presence kept distinct and never merged, party Location never leaks into relationships.locations, Faction standing rows carry real relationshipType/score/status/source/benefits, Trade rows carry role + real counterparty, recovery eligible is never conflated with injured).');
