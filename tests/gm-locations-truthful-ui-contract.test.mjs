import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Stage 3 — truthful UI contract, executed and static.
//
// Four independent findings, each proven here:
//   1. A compendium-sourced Actor/Scene link (a real, valid reference —
//      LocationSceneBridgeService resolves these fine via async fromUuid()
//      when actually staging/opening) was rendered identically to a
//      genuinely missing world document ("Missing Actor (Compendium...)").
//      That's a false negative. Fixed: a Compendium.* UUID that can't be
//      checked synchronously now reports "unverifiable", never "missing".
//   2. Create Scene / Stage Encounter Seeds were offered even when the
//      location has no map image at all — LocationSceneBridgeService.
//      createSceneFromLocation() unconditionally throws in that case.
//      Fixed: both are gated on the same prerequisite the service itself
//      enforces (map.imagePath || location.image).
//   3. A filter matching zero locations silently substituted the full
//      unfiltered list ("filtersRelaxed") instead of showing zero results —
//      a filter that visibly does nothing. Fixed: zero matches now render
//      as zero, with a distinct "no locations match your filters" state.
//   4. GMLocationsSurfaceController already had live form handlers for
//      form[data-atlas-fact-form] and form[data-encounter-seed-form], but
//      locations.hbs rendered neither — the authoring capability was
//      wired but unreachable, the same class of gap Phase 2 closed for
//      leads/links/scenes.

registerFoundryPathLoader();

// --- 1: compendium Actor/Scene truthfulness (executed) ---------------------

function installShim({ locations = [], scenes = [], actors = [] } = {}) {
  const store = new Map([['gmLocationRegistry', locations]]);
  installFoundryShimGlobals({
    game: {
      settings: {
        get: (_m, key) => store.get(key),
        set: (_m, key, value) => { store.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      },
      scenes: new Map(scenes.map(s => [s.id, s])),
      actors: new Map(actors.map(a => [a.id, a]))
    }
  });
}

{
  installShim({
    locations: [{
      id: 'nal-hutta', name: 'Nal Hutta',
      npcActorUuids: ['Compendium.foundryvtt-swse.npcs.abc123', 'Actor.gone', 'Actor.jawa1'],
      map: { sceneUuid: 'Compendium.foundryvtt-swse.scenes.scn999' },
      encounterSeeds: [{ id: 'seed1', name: 'Hutt Enforcer', uuid: 'Compendium.foundryvtt-swse.npcs.abc123' }]
    }],
    actors: [{ id: 'jawa1', name: 'Jawa Scavenger' }]
  });
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'nal-hutta' }) });
  const selected = vm.locationManager.selected;

  const compendiumActorRow = selected.actorRows.find(r => r.uuid.startsWith('Compendium.'));
  assert.equal(compendiumActorRow.unverifiable, true);
  assert.equal(compendiumActorRow.resolved, false);
  assert.doesNotMatch(compendiumActorRow.label, /Missing/, 'a compendium-sourced Actor reference must never be labeled "Missing" — it is unverified, not confirmed absent');

  const missingActorRow = selected.actorRows.find(r => r.uuid === 'Actor.gone');
  assert.equal(missingActorRow.unverifiable, false);
  assert.match(missingActorRow.label, /Missing Actor/, 'a genuinely unresolvable world Actor UUID must still read as missing');

  const resolvedActorRow = selected.actorRows.find(r => r.uuid === 'Actor.jawa1');
  assert.equal(resolvedActorRow.resolved, true);
  assert.equal(resolvedActorRow.name, 'Jawa Scavenger');

  const sceneRow = selected.sceneRows[0];
  assert.equal(sceneRow.unverifiable, true);
  assert.doesNotMatch(sceneRow.label, /Missing/, 'a compendium-sourced Scene reference must never be labeled "Missing"');

  const seedActorLink = selected.encounterSeeds[0];
  assert.equal(seedActorLink.actorUnverifiable, true, 'the same truthfulness fix must apply to an encounter seed\'s compendium actor link');
}

// --- 2: Scene action prerequisites (executed) -------------------------------

{
  installShim({ locations: [{ id: 'no-image', name: 'Unmapped Outpost' }] });
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm1 = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'no-image' }) });
  assert.equal(vm1.locationManager.selected.canCreateScene, false, 'a location with no map image and no general image must not offer Create Scene as if it would succeed');

  installShim({ locations: [{ id: 'has-image', name: 'Mapped Outpost', map: { imagePath: 'icons/outpost.svg' } }] });
  const { GMLocationsSurfaceService: Svc2 } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm2 = await Svc2.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'has-image' }) });
  assert.equal(vm2.locationManager.selected.canCreateScene, true);

  installShim({ locations: [{ id: 'general-image-only', name: 'Legacy Outpost', image: 'icons/legacy.svg' }] });
  const { GMLocationsSurfaceService: Svc3 } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm3 = await Svc3.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'general-image-only' }) });
  assert.equal(vm3.locationManager.selected.canCreateScene, true, 'canCreateScene must match createSceneFromLocation()\'s own fallback to the location\'s general image field, not just map.imagePath');
}

// --- 3: filter zero-match (executed) ----------------------------------------

{
  installShim({ locations: [{ id: 'p1', name: 'Some Planet', category: 'planetary', type: 'planet' }] });
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ type: 'space-station' }) });
  assert.equal(vm.locationManager.cards.length, 0, 'a filter matching nothing must show nothing, not silently fall back to the full list');
  assert.equal(vm.locationManager.hasVisibleLocations, false);
  assert.equal(vm.locationManager.hasActiveFilters, true);
  assert.equal(vm.locationManager.filtersProducedNoMatches, true);
  assert.equal(vm.locationManager.filtersRelaxed, undefined, 'the old silent-fallback flag must be gone, not just unused');
}

// --- 4: Atlas Fact / Encounter Seed authoring reachability -----------------

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('templates/apps/gm-datapad/surfaces/locations.hbs', root), 'utf8');
const controllerSource = await readFile(new URL('scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', root), 'utf8');

assert.match(template, /<form[^>]*data-atlas-fact-form/, 'locations.hbs must render an Atlas Fact authoring form');
assert.match(template, /<form[^>]*data-encounter-seed-form/, 'locations.hbs must render an Encounter Seed authoring form');
assert.match(controllerSource, /form\[data-atlas-fact-form\][\s\S]{0,200}addEventListener\(['"]submit['"]/, 'the controller must wire a submit handler for the Atlas Fact form');
assert.match(controllerSource, /form\[data-encounter-seed-form\][\s\S]{0,200}addEventListener\(['"]submit['"]/, 'the controller must wire a submit handler for the Encounter Seed form');

// Executed: real production save through the newly-reachable forms' own
// payload shape.
{
  installShim({ locations: [{ id: 'dxun', name: 'Dxun' }] });
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const savedLocation = await LocationRegistryService.upsertAtlasFact('dxun', {
    title: 'Mandalorian Ruins', category: 'general', skill: 'knowledgeGalacticLore', dc: 18, revealState: 'hidden'
  });
  assert.equal(savedLocation.atlasFacts.length, 1);
  assert.equal(savedLocation.atlasFacts[0].title, 'Mandalorian Ruins');

  const withSeed = await LocationRegistryService.addEncounterSeed('dxun', { name: 'Beast Pack', category: 'random', quantity: '2' });
  assert.equal(withSeed.encounterSeeds.length, 1);
  assert.equal(withSeed.encounterSeeds[0].name, 'Beast Pack');
}

console.log('GM Locations truthful UI contract passed (compendium references never labeled "Missing", Scene actions gated on their real prerequisite, zero-match filters show zero, Atlas Fact/Encounter Seed authoring reachable and functional).');
