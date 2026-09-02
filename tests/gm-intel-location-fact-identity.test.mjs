import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 5: proves the real gap found during
// the Intel authority audit (5A) — Intel created from a Location or an
// Atlas Fact (LocationIntelBridgeService.buildDraftDataFromLocation/Fact)
// built a `metadata: {locationId, locationName, ...}` object on the draft
// data, but HolonetIntelService.normalizeIntelMetadata()/normalizeLinks()
// never read a `metadata` field on the incoming data at all — every Intel
// record created from a Location or Atlas Fact silently lost that
// relationship, not even a display name, the moment it was saved.
//
// BUG-CATEGORY regression proof (a real defect, not a from-scratch design
// contract): this exact executed round trip — createIntelDraft() persisting
// linkedLocationId/sourceFactId — fails against the pre-Phase-5 source (the
// fields are dropped) and passes after (normalizeLinks() gained flat
// linkedLocationId/sourceFactId fields, matching its existing linked*
// convention, and LocationIntelBridgeService now writes them as top-level
// draft fields instead of the dead `metadata` object).

registerFoundryPathLoader();

function installShim() {
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: { get: () => null, set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
      actors: []
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } }
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
}

const LOCATION = {
  id: 'tatooine', name: 'Tatooine', publicSummary: 'Desert world.',
  atlasFacts: [{ id: 'fact1', title: 'Underworld Shipping Lanes', teaser: 'Cargo moves quietly.', body: 'A Hutt-run smuggling route threads the dune sea.' }]
};

installShim();
const { LocationIntelBridgeService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/LocationIntelBridgeService.js');
const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');

// --- 1: draft data built from a Location carries linkedLocationId ---------
{
  const draft = LocationIntelBridgeService.buildDraftDataFromLocation(LOCATION);
  assert.equal(draft.linkedLocationId, 'tatooine', 'the draft data must carry the real Location id as a top-level field');
  assert.equal(draft.metadata, undefined, 'the dead metadata object must not be reintroduced');
}

// --- 2: draft data built from an Atlas Fact carries both ids --------------
{
  const draft = LocationIntelBridgeService.buildDraftDataFromFact(LOCATION, 'fact1');
  assert.equal(draft.linkedLocationId, 'tatooine');
  assert.equal(draft.sourceFactId, 'fact1', 'the draft data must carry the real Atlas Fact id as a top-level field');
}

// --- 3: the round trip through the real Intel authority persists both ids -
{
  const draft = LocationIntelBridgeService.buildDraftDataFromFact(LOCATION, 'fact1');
  const record = await HolonetIntelService.createIntelDraft(draft);
  const intel = HolonetIntelService.getIntelMetadata(record);
  assert.equal(intel.linkedLocationId, 'tatooine', 'Intel created from an Atlas Fact must retain the source Location relationship after normalization/storage');
  assert.equal(intel.sourceFactId, 'fact1', 'Intel created from an Atlas Fact must retain the source Fact id after normalization/storage');
}

// --- 4: an Intel record with no Location relationship never fabricates one
{
  const record = await HolonetIntelService.createIntelDraft({ title: 'Unrelated rumor' });
  const intel = HolonetIntelService.getIntelMetadata(record);
  assert.equal(intel.linkedLocationId, '', 'no Location relationship must never be invented for an unrelated Intel record');
  assert.equal(intel.sourceFactId, '');
}

console.log('Intel Location/Atlas-Fact provenance identity contract passed (draft build -> normalizeLinks() -> storage round trip, executed for real).');
