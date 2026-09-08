import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 6 CORRECTION PASS (Correction 2):
// proves the party's current Location is resolved from ONLY
// Location.activeForParty === true, matching LocationRegistryService
// .setPartyLocation() (which enforces exactly one such record) and
// GMLocationsSurfaceService's own isCurrent (Boolean(location.activeForParty),
// no revealState fallback) — never the broader
// `activeForParty || revealState === 'active'` condition the pre-correction
// service used.
//
// BUG-CATEGORY regression proof: pre-correction GMCampaignContextService
// treated a merely revealState:'active' Location (with activeForParty
// explicitly false) as the party's current position. That is a real,
// confirmed defect against the established Locations-hub authority
// (GMLocationsSurfaceService.js: `isCurrent: Boolean(location.activeForParty)`),
// not a from-scratch design choice.

registerFoundryPathLoader();

function installShim({ locations = [] } = {}) {
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: {
        get: (_module, key) => (key === 'gmLocationRegistry' ? locations : (key === 'gmFactionRegistry' ? [] : null)),
        set: () => Promise.resolve(),
        settings: { has: () => true },
        register: () => {}
      },
      users: [],
      actors: [],
      combat: null
    }
  });
}

const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');

// --- revealState:'active' with activeForParty:false must NOT be current --
{
  const LOCATION_A = { id: 'loc-a', name: 'Revealed But Not Current', revealState: 'active', activeForParty: false };
  const LOCATION_B = { id: 'loc-b', name: 'Actual Party Position', revealState: 'known', activeForParty: true };
  installShim({ locations: [LOCATION_A, LOCATION_B] });

  const party = await GMCampaignContextService.party();
  assert.equal(party.currentLocation.id, 'loc-b', 'only activeForParty:true may be reported as the current party Location, never a merely revealState:"active" one');

  const contextA = await GMCampaignContextService.forLocation('loc-a');
  assert.equal(contextA.party.currentPartyPresence, false, 'a revealState:"active" Location with activeForParty:false must report currentPartyPresence:false');

  const contextB = await GMCampaignContextService.forLocation('loc-b');
  assert.equal(contextB.party.currentPartyPresence, true);
}

// --- exactly one activeForParty:true resolves cleanly ---------------------
{
  const ONLY = { id: 'loc-only', name: 'Only Active', revealState: 'known', activeForParty: true };
  installShim({ locations: [ONLY] });
  const party = await GMCampaignContextService.party();
  assert.equal(party.currentLocation.id, 'loc-only');
  assert.equal(party.limitations.length, 0);
}

// --- zero activeForParty:true resolves to no current Location -------------
{
  const NONE_ACTIVE = { id: 'loc-none', name: 'Just Known', revealState: 'known', activeForParty: false };
  installShim({ locations: [NONE_ACTIVE] });
  const party = await GMCampaignContextService.party();
  assert.equal(party.currentLocation, null, 'no Location marked activeForParty:true must never fall back to an arbitrary known Location');
}

// --- more than one activeForParty:true (legacy/corrupt data) reports an
// honest ambiguity, never an arbitrary pick (Correction 2) ------------------
{
  const DUP_A = { id: 'loc-dup-a', name: 'Duplicate A', revealState: 'known', activeForParty: true };
  const DUP_B = { id: 'loc-dup-b', name: 'Duplicate B', revealState: 'known', activeForParty: true };
  installShim({ locations: [DUP_A, DUP_B] });
  const party = await GMCampaignContextService.party();
  assert.equal(party.currentLocation, null, 'more than one activeForParty:true Location must never be silently resolved to a guess');
  assert.ok(party.limitations.some(l => l.toLowerCase().includes('activeforparty')), 'the ambiguity must be reported as an honest limitation');
}

console.log('Party Location authority contract passed (strict activeForParty:true only; revealState:"active" alone never counts; zero->null, one->resolved, many->honest ambiguity, never a guess).');
