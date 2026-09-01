import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations — pre-live-validation identity/provenance correction,
// executed for real.
//
// Three real data-integrity issues, each confirmed against actual source
// before being fixed:
//
//   1. BUILT-IN LIBRARY ID NAMESPACE COLLISION. Manual Location creation
//      derives its id from its name (_uniqueLocationSlug), and the
//      built-in Location Library's Tatooine seed also canonically writes
//      to registry id "tatooine". In an otherwise empty world, a GM
//      manually creating a Location named "Tatooine" occupies that exact
//      id first. The Library UI's "already imported" check
//      (record.id === seed.id) and the importer's duplicate-skip check
//      (byId.get(record.id)) both then treat that unrelated manual
//      record as if it WERE the library seed — the Library card falsely
//      reads "Imported", and a real import silently skips the seed's own
//      parent record while its children still import and get parented to
//      the unrelated manual record. Fixed: provenance (librarySeedId) is
//      now the only signal for "already imported"; the importer resolves
//      a deterministic fallback record id (`${seedId}-library`, ...) when
//      the canonical id is occupied by anything without matching
//      provenance, so the unrelated manual record is never touched and
//      the real seed still imports completely. _uniqueLocationSlug() also
//      now reserves every Library id (seeds and children) so a NEW manual
//      Location can never occupy one going forward.
//   2. PARTIAL LIBRARY HIERARCHY REPAIR. deleteLocation() reparents
//      surviving children to '' rather than deleting them when only their
//      parent is deleted. Re-importing the same seed afterward recreates
//      the parent (fresh id, since the old one is gone) but used to skip
//      the surviving children outright (an id match on an existing
//      record, whether or not the LINK matched) — leaving them
//      permanently orphaned. Fixed: a surviving child with matching
//      provenance but a stale/blank parentLocationId gets that ONE field
//      healed back onto the recreated parent; nothing else about it is
//      touched, so any GM customization made to it in the meantime
//      survives.
//   3. ATLAS FACT CREATION IDENTITY/VISIBILITY.
//      (a) factPayload() supplied an explicit knownToPlayers: false for
//          every interactive submission (no checkbox is rendered for it),
//          which — since normalizeFact()'s bool() helper returns an
//          explicit boolean as-is — permanently defeated its designed
//          revealState-based fallback (known/active/compromised implies
//          knownToPlayers=true). Fixed: the key is no longer supplied at
//          all for this form, letting the fallback apply.
//      (b) No factId field is rendered, so normalizeFact()'s id fallback
//          (slugify(title), no per-call disambiguation) meant two
//          different facts with the same title collapsed into one record
//          — the second save silently "edited" the first. Fixed:
//          factPayload() now generates a real unique id
//          (foundry.utils.randomID()) for every interactive submission
//          that doesn't supply one, leaving normalizeFact()'s shared
//          fallback (and the static Library seed facts that always
//          supply their own deterministic id) untouched.

registerFoundryPathLoader();

function installShim({ locations = [] } = {}) {
  const store = new Map([['gmLocationRegistry', locations]]);
  const notifications = [];
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: {
        get: (_m, key) => store.get(key),
        set: (_m, key, value) => { store.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      }
    },
    ui: {
      notifications: {
        info: (msg) => notifications.push(['info', msg]),
        warn: (msg) => notifications.push(['warn', msg]),
        error: (msg) => notifications.push(['error', msg])
      }
    }
  });
  let seq = 0;
  globalThis.foundry.utils.randomID = () => `test-random-id-${++seq}`;
  return { notifications };
}

// --- 0: _uniqueLocationSlug() now reserves every Library id from FUTURE
// manual slug generation, so a brand-new manual Location can no longer
// land on a seed's canonical id at all (executed) ---------------------------

{
  installShim();
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const freshManual = await LocationRegistryService.upsertLocation({ name: 'Tatooine' });
  assert.notEqual(freshManual.id, 'tatooine', 'a brand-new manual Location must never be assigned a built-in Library seed\'s canonical id');
  assert.equal(freshManual.librarySeedId, '');
}

// --- 1-4: built-in Library id namespace collision, simulating a
// PRE-EXISTING collision (a world that already has a manual record at a
// Library seed's canonical id — created before this fix shipped, or with
// an id explicitly requested) — the case _resolveLibraryParentId() exists
// for, since _uniqueLocationSlug()'s reservation above only protects NEW
// manual creation, not data that predates it (executed) --------------------

{
  installShim();
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');

  // 1. A world with a pre-existing manual Location that occupies the
  // Tatooine seed's canonical id, unrelated to the built-in seed.
  const manual = await LocationRegistryService.upsertLocation({ id: 'tatooine', name: 'Tatooine', publicSummary: 'A manually created homage planet, unrelated to the built-in seed.' });
  assert.equal(manual.id, 'tatooine', 'confirms the actual collision scenario: an existing manual record already occupies the seed\'s own canonical id');
  assert.equal(manual.librarySeedId, '', 'a manually-created record must carry no library provenance');

  // 2. The Library VM must NOT report the seed as already imported just
  // because an unrelated record occupies its id.
  const vmBefore = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
  const cardBefore = vmBefore.locationManager.library.cards.find(card => card.id === 'tatooine');
  assert.ok(cardBefore, 'the Tatooine seed must still appear in the Library list');
  assert.equal(cardBefore.imported, false, 'an unrelated manual record sharing the seed\'s id must not make the Library card read as already imported');

  // 3. Importing the built-in seed anyway must succeed completely,
  // without touching the unrelated manual record.
  const result = await LocationRegistryService.importLibrarySeeds(['tatooine']);
  assert.equal(result.seeds.length, 1);
  assert.equal(result.invalid.length, 0);

  const stillManual = LocationRegistryService.findLocation('tatooine');
  // findLocation() also matches by name — the manual record is still the
  // one actually AT id "tatooine" (the seed's parent had to fall back).
  assert.equal(stillManual.id, 'tatooine');
  assert.equal(stillManual.publicSummary, 'A manually created homage planet, unrelated to the built-in seed.', 'the unrelated manual record must be completely untouched by the import');
  assert.equal(stillManual.librarySeedId, '', 'the manual record must still carry no library provenance');

  const libraryParent = LocationRegistryService.getRegistry().find(record => record.librarySeedId === 'tatooine' && record.id !== stillManual.id && !record.parentLocationId);
  assert.ok(libraryParent, 'the built-in Tatooine seed\'s own parent record must exist somewhere, under its own provenance, distinct from the manual record');
  assert.equal(libraryParent.id, 'tatooine-library', 'the deterministic fallback id must be used since the canonical id was occupied');

  const registry = LocationRegistryService.getRegistry();
  const children = registry.filter(record => record.parentLocationId === libraryParent.id);
  assert.equal(children.length, 3, 'all three Tatooine seed children must import, parented to the fallback parent record');
  for (const child of children) assert.equal(child.librarySeedId, 'tatooine', 'every imported child must carry the seed\'s provenance');

  const attachedToManual = registry.filter(record => record.parentLocationId === 'tatooine' && record.librarySeedId === 'tatooine');
  assert.equal(attachedToManual.length, 0, 'no built-in child may ever be parented to the unrelated manual record');

  assert.equal(registry.length, 5, 'manual Tatooine + library parent + 3 library children = 5 records total');

  // 4. A repeated import of the same collision-affected seed must be
  // idempotent — no third copy at yet another fallback id.
  const second = await LocationRegistryService.importLibrarySeeds(['tatooine']);
  assert.equal(second.imported.length, 0, 'a second import of the same seed must add nothing new');
  assert.equal(second.repaired?.length || 0, 0, 'nothing needs repair on a clean idempotent re-import');
  assert.equal(LocationRegistryService.getRegistry().length, 5, 'registry size must be unchanged by the idempotent re-import');

  const vmAfter = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
  const cardAfter = vmAfter.locationManager.library.cards.find(card => card.id === 'tatooine');
  assert.equal(cardAfter.imported, true, 'once the real built-in seed has actually imported (at its fallback id), the Library card must correctly read as imported');
}

// --- 5: partial parent deletion + reimport repairs the Library hierarchy
// (executed) -----------------------------------------------------------

{
  installShim();
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');

  const first = await LocationRegistryService.importLibrarySeeds(['tatooine']);
  assert.equal(first.imported.length, 4);
  const childIdsBefore = LocationRegistryService.getRegistry()
    .filter(record => record.parentLocationId === 'tatooine')
    .map(record => record.id)
    .sort();
  assert.equal(childIdsBefore.length, 3);

  // Delete only the parent — deleteLocation() reparents surviving
  // children to '' rather than deleting them (pre-existing, unchanged
  // behavior, exercised here as the setup for the recovery scenario).
  await LocationRegistryService.deleteLocation('tatooine');
  assert.equal(LocationRegistryService.findLocation('tatooine'), null);
  const orphaned = LocationRegistryService.getRegistry();
  assert.equal(orphaned.length, 3, 'the three children must survive the parent-only deletion');
  for (const child of orphaned) assert.equal(child.parentLocationId, '', 'deleteLocation must have reparented the survivors to blank');

  // A GM customization on one surviving child, made while the hierarchy
  // is broken — this must survive the repair below untouched.
  const customized = await LocationRegistryService.upsertLocation({ id: orphaned[0].id, name: orphaned[0].name, gmNotes: 'GM added custom notes while the parent was missing.' });
  assert.equal(customized.gmNotes, 'GM added custom notes while the parent was missing.');

  // Re-import the same seed.
  const second = await LocationRegistryService.importLibrarySeeds(['tatooine']);

  const restoredParent = LocationRegistryService.findLocation('tatooine');
  assert.ok(restoredParent, 'the parent record must be recreated');
  assert.equal(restoredParent.librarySeedId, 'tatooine');

  const registryAfter = LocationRegistryService.getRegistry();
  assert.equal(registryAfter.length, 4, 'exactly parent + 3 original children — no duplicate children created');
  const healedChildren = registryAfter.filter(record => record.parentLocationId === 'tatooine');
  assert.equal(healedChildren.length, 3, 'all three surviving children must be healed back onto the recreated parent');
  assert.deepEqual(healedChildren.map(record => record.id).sort(), childIdsBefore, 'the exact same child records (same ids) must be healed, not recreated as new ones');

  assert.equal(second.imported.length, 1, 'only the recreated parent is a genuinely new record');
  assert.equal(second.repaired.length, 3, 'the three surviving children must be reported as repaired hierarchy links, not fresh imports');

  const healedCustomized = LocationRegistryService.findLocation(customized.id);
  assert.equal(healedCustomized.gmNotes, 'GM added custom notes while the parent was missing.', 'the repair must only touch parentLocationId — a GM customization made to a surviving child must not be reverted');
  assert.equal(healedCustomized.parentLocationId, 'tatooine', 'the customized child\'s hierarchy link must still be healed');
}

// --- 6-8: Atlas Fact creation identity/visibility (executed, through the
// real controller form-submission chain) ------------------------------------

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
function pageElementWithAtlasForm(form) {
  return { querySelectorAll: (selector) => (selector === 'form[data-atlas-fact-form]' ? [form] : []) };
}

{
  const realFormData = globalThis.FormData;
  globalThis.FormData = FakeFieldsFormData;
  try {
    installShim({ locations: [{ id: 'dxun', name: 'Dxun' }] });
    const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
    const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
    const fakeHost = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
    const controller = new GMLocationsSurfaceController(fakeHost);
    const abortController = new AbortController();

    const baseFields = { locationId: 'dxun', factCategory: 'general', factSkill: 'knowledgeGalacticLore', factDc: '15', factRevealState: 'hidden', factRevealMode: 'any', leadOutput: 'none' };
    const form = new FakeFieldsForm({ ...baseFields, factTitle: 'Local Rumor' });
    controller._wireForms(pageElementWithAtlasForm(form), abortController.signal);

    // 6. Two different interactive submissions with the SAME title must
    // both survive as distinct facts, not collapse into one.
    await form.submit();
    form.fields = { ...baseFields, factTitle: 'Local Rumor' };
    await form.submit();

    const location = LocationRegistryService.findLocation('dxun');
    assert.equal(location.atlasFacts.length, 2, 'two identically-titled facts must both be preserved as distinct records');
    const [firstFact, secondFact] = location.atlasFacts;
    assert.notEqual(firstFact.id, secondFact.id, 'identically-titled facts must get different ids');
    assert.equal(firstFact.title, 'Local Rumor');
    assert.equal(secondFact.title, 'Local Rumor');

    // 7. Explicitly editing one fact by its own canonical id must only
    // change that one fact.
    const edited = await LocationRegistryService.upsertAtlasFact('dxun', {
      id: firstFact.id, title: 'Local Rumor (confirmed)', category: 'general', skill: 'knowledgeGalacticLore', dc: 15, revealState: 'hidden'
    });
    assert.equal(edited.atlasFacts.length, 2, 'an explicit-id edit must not add or remove facts');
    assert.equal(edited.atlasFacts.find(fact => fact.id === firstFact.id).title, 'Local Rumor (confirmed)');
    assert.equal(edited.atlasFacts.find(fact => fact.id === secondFact.id).title, 'Local Rumor', 'the other fact must be completely untouched by an edit targeting a different fact id');

    // 8. A fact created with revealState=known must derive
    // knownToPlayers=true via the normalizer's own fallback, not be
    // forced false by an absent checkbox.
    const knownForm = new FakeFieldsForm({ ...baseFields, locationId: 'dxun', factTitle: 'Public Knowledge', factRevealState: 'known' });
    const knownController = new GMLocationsSurfaceController(fakeHost);
    const knownAbort = new AbortController();
    knownController._wireForms(pageElementWithAtlasForm(knownForm), knownAbort.signal);
    await knownForm.submit();
    const withKnownFact = LocationRegistryService.findLocation('dxun');
    const knownFact = withKnownFact.atlasFacts.find(fact => fact.title === 'Public Knowledge');
    assert.ok(knownFact);
    assert.equal(knownFact.revealState, 'known');
    assert.equal(knownFact.knownToPlayers, true, 'revealState=known must produce knownToPlayers=true — internally coherent visibility, not forced false');
  } finally {
    globalThis.FormData = realFormData;
  }
}

// --- source-level proof for the fixes that aren't fully observable via
// the executed cases above -------------------------------------------------

const root = new URL('../', import.meta.url);
const controllerSource = await readFile(new URL('scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', root), 'utf8');
const surfaceServiceSource = await readFile(new URL('scripts/ui/shell/gm/GMLocationsSurfaceService.js', root), 'utf8');
const registrySource = await readFile(new URL('scripts/locations/location-registry-service.js', root), 'utf8');

assert.match(controllerSource, /id: text\(formData, 'factId'\) \|\| foundry\.utils\.randomID\(\)/, 'the Atlas Fact form must generate a real unique id when none was submitted');
assert.doesNotMatch(controllerSource, /knownToPlayers: checked\(formData, 'factKnownToPlayers'\)/, 'factPayload() must no longer supply an explicit (always-false) knownToPlayers');
assert.match(surfaceServiceSource, /const imported = records\.some\(record => record\.librarySeedId === seed\.id\)/, 'librarySeedCard() must use provenance only, not raw id equality');
assert.doesNotMatch(registrySource, /importedIds\.has\(seed\.id\) \|\| importedSeedIds\.has\(seed\.id\)/, 'summarizeLibrary() must no longer fall back to raw record.id for "imported"');
assert.match(registrySource, /_resolveLibraryParentId/, 'the importer must resolve a collision-safe parent record id');

console.log('GM Locations library identity and fact integrity contract passed (unrelated manual records never falsely block or corrupt a built-in Library import, partial-deletion recovery heals surviving children without touching their customizations, duplicate Atlas Fact titles stay distinct, explicit-id edits stay scoped, and revealState=known produces coherent visibility).');
