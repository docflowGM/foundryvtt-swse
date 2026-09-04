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
  let seq = 0;
  globalThis.foundry.utils.randomID = () => `test-random-id-${++seq}`;
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

// --- 4: Atlas Fact / Encounter Seed authoring reachability AND
// completeness — every field factPayload()/seedPayload() actually reads
// must have a real rendered input, and the whole rendered-field → FormData
// → payload helper → controller → service chain must work end to end
// (Stage 3 final correction: the first pass only rendered a subset of the
// fields those payload helpers already supported — Reveal Mode was
// completely missing, and the whole advanced reveal/output block and the
// Encounter Seed image field were never rendered at all) --------------------

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('templates/apps/gm-datapad/surfaces/locations.hbs', root), 'utf8');
const controllerSource = await readFile(new URL('scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', root), 'utf8');

assert.match(template, /<form[^>]*data-atlas-fact-form/, 'locations.hbs must render an Atlas Fact authoring form');
assert.match(template, /<form[^>]*data-encounter-seed-form/, 'locations.hbs must render an Encounter Seed authoring form');
assert.match(controllerSource, /form\[data-atlas-fact-form\][\s\S]{0,200}addEventListener\(['"]submit['"]/, 'the controller must wire a submit handler for the Atlas Fact form');
assert.match(controllerSource, /form\[data-encounter-seed-form\][\s\S]{0,200}addEventListener\(['"]submit['"]/, 'the controller must wire a submit handler for the Encounter Seed form');

const atlasFormMatch = template.match(/<form data-atlas-fact-form>[\s\S]*?<\/form>/);
assert.ok(atlasFormMatch, 'expected to find the Atlas Fact form body');
const atlasFormBody = atlasFormMatch[0];
for (const name of ['factTitle', 'factCategory', 'factSkill', 'factDc', 'factRevealState', 'factRevealMode', 'leadOutput']) {
  assert.match(atlasFormBody, new RegExp(`name="${name}"`), `the Atlas Fact form must render an input/select named ${name} — factPayload() already reads it`);
}

const seedFormMatch = template.match(/<form data-encounter-seed-form>[\s\S]*?<\/form>/);
assert.ok(seedFormMatch, 'expected to find the Encounter Seed form body');
const seedFormBody = seedFormMatch[0];
for (const name of ['seedName', 'seedCategory', 'seedRole', 'seedQuantity', 'seedUuid', 'seedNotes', 'seedImg']) {
  assert.match(seedFormBody, new RegExp(`name="${name}"`), `the Encounter Seed form must render an input/select named ${name} — seedPayload() already reads it`);
}

// Executed: the real rendered-field-name → FormData → payload helper →
// controller → service chain, via a minimal fake form/FormData (no jsdom
// dependency in this repo — see gm-locations-import-selection-persistence
// for the same technique and rationale).
class FakeFieldsFormData {
  constructor(form) { this._fields = form.fields; }
  get(name) { return Object.prototype.hasOwnProperty.call(this._fields, name) ? this._fields[name] : null; }
  getAll(name) { return Object.prototype.hasOwnProperty.call(this._fields, name) ? [this._fields[name]] : []; }
  has(name) { return Boolean(this._fields[name]); }
}
class FakeFieldsForm {
  constructor(fields) { this.fields = fields; this._listeners = {}; }
  addEventListener(type, handler) { (this._listeners[type] ||= []).push(handler); }
  submit() { return Promise.all((this._listeners.submit || []).map(handler => handler({ preventDefault() {} }))); }
}

{
  const realFormData = globalThis.FormData;
  globalThis.FormData = FakeFieldsFormData;
  try {
    installShim({ locations: [{ id: 'dxun', name: 'Dxun' }] });
    const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
    const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');

    const atlasForm = new FakeFieldsForm({
      locationId: 'dxun',
      factTitle: 'Mandalorian Ruins',
      factTeaser: 'Something stirs beneath the ash.',
      factBody: 'A hidden Mandalorian armory.',
      factCategory: 'general',
      factSkill: 'knowledgeGalacticLore',
      factDc: '18',
      factRevealState: 'hidden',
      factRevealMode: 'tiered',
      leadOutput: 'none',
      factTags: 'mandalorian, ruins'
    });
    const seedForm = new FakeFieldsForm({
      locationId: 'dxun',
      seedName: 'Beast Pack',
      seedCategory: 'random',
      seedRole: 'ambush',
      seedQuantity: '2',
      seedUuid: 'Actor.abc123',
      seedImg: 'icons/creatures/beast.svg',
      seedNotes: 'Circles the ruins at dusk.'
    });
    const fakeHost = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
    const controller = new GMLocationsSurfaceController(fakeHost);
    const abortController = new AbortController();
    controller._wireForms({
      querySelectorAll(selector) {
        if (selector === 'form[data-atlas-fact-form]') return [atlasForm];
        if (selector === 'form[data-encounter-seed-form]') return [seedForm];
        return [];
      }
    }, abortController.signal);

    await atlasForm.submit();
    const savedLocation = LocationRegistryService.findLocation('dxun');
    assert.equal(savedLocation.atlasFacts.length, 1);
    const savedFact = savedLocation.atlasFacts[0];
    assert.equal(savedFact.title, 'Mandalorian Ruins');
    assert.equal(savedFact.category, 'general');
    assert.equal(savedFact.checks[0].skill, 'knowledgeGalacticLore');
    assert.equal(savedFact.checks[0].dc, 18);
    assert.equal(savedFact.revealState, 'hidden');
    assert.equal(savedFact.revealMode, 'tiered', 'the rendered Reveal Mode field must actually reach the saved record — this is the field the first Stage 3 pass never rendered at all');
    assert.deepEqual(savedFact.tags, ['mandalorian', 'ruins']);

    await seedForm.submit();
    const withSeed = LocationRegistryService.findLocation('dxun');
    assert.equal(withSeed.encounterSeeds.length, 1);
    const savedSeed = withSeed.encounterSeeds[0];
    assert.equal(savedSeed.name, 'Beast Pack');
    assert.equal(savedSeed.category, 'random');
    assert.equal(savedSeed.role, 'ambush');
    assert.equal(savedSeed.quantity, '2');
    assert.equal(savedSeed.uuid, 'Actor.abc123');
    assert.equal(savedSeed.img, 'icons/creatures/beast.svg', 'the rendered Token Image field must actually reach the saved record — this field was never rendered at all in the first Stage 3 pass');
  } finally {
    globalThis.FormData = realFormData;
  }
}

console.log('GM Locations truthful UI contract passed (compendium references never labeled "Missing", Scene actions gated on their real prerequisite, zero-match filters show zero, Atlas Fact/Encounter Seed authoring forms render every field their own payload contract supports and the full rendered-field-to-saved-record chain works end to end).');
