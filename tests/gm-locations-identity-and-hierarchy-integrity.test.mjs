import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Stage 3 — Location identity and hierarchy integrity,
// executed for real.
//
// LocationRegistryService.upsertLocation() used to match an existing
// record by id OR by case-insensitive name. A brand-new Location (blank
// id, from the create wizard) whose name happened to match an unrelated
// existing record — a real scenario, since two different planets can both
// have a "Command Center" or "Cantina" — was silently treated as an EDIT
// of that unrelated record, discarding its data. Fixed: identity is by id
// only; a name collision on creation now produces a second, distinct
// record with a disambiguated id.
//
// Separately, the create/edit wizard's Parent Location field is free text
// against a datalist — nothing server-side rejected a location naming
// itself, an id that doesn't exist, or a parent assignment that would
// create an ancestor cycle. Fixed at the one authoritative mutation
// boundary (upsertLocation()), not just in the UI suggestion list.

registerFoundryPathLoader();

function installShim(initialLocations = []) {
  const store = new Map([['gmLocationRegistry', initialLocations]]);
  installFoundryShimGlobals({
    game: {
      settings: {
        get: (_m, key) => store.get(key),
        set: (_m, key, value) => { store.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      }
    }
  });
}

const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');

// --- Identity: name collisions never merge unrelated records ---------------

// CASE: creating a new location with a name that collides with an existing,
// unrelated one must produce a SECOND, distinct record — never overwrite
// the first.
{
  installShim();
  const first = await LocationRegistryService.upsertLocation({ name: 'Command Center', region: 'Alderaan', publicSummary: 'The original.' });
  const second = await LocationRegistryService.upsertLocation({ name: 'Command Center', region: 'Hoth', publicSummary: 'A different planet entirely.' });

  assert.notEqual(first.id, second.id, 'two same-named but unrelated Locations must get distinct ids');
  const registry = LocationRegistryService.getRegistry();
  assert.equal(registry.length, 2, 'both records must exist independently');
  const preserved = registry.find(r => r.id === first.id);
  assert.equal(preserved.region, 'Alderaan', 'the first record must be completely untouched by creating the second same-named one');
  assert.equal(preserved.publicSummary, 'The original.');
  const created = registry.find(r => r.id === second.id);
  assert.equal(created.region, 'Hoth');
}

// CASE: an explicit-id edit updates only its own target, never a
// same-named sibling.
{
  installShim();
  const a = await LocationRegistryService.upsertLocation({ name: 'Cantina', region: 'Tatooine' });
  const b = await LocationRegistryService.upsertLocation({ name: 'Cantina', region: 'Nar Shaddaa' });

  const edited = await LocationRegistryService.upsertLocation({ id: a.id, name: 'Cantina', region: 'Tatooine', publicSummary: 'Renovated after the blaster fight.' });
  assert.equal(edited.id, a.id);
  assert.equal(edited.publicSummary, 'Renovated after the blaster fight.');

  const untouched = LocationRegistryService.findLocation(b.id);
  assert.equal(untouched.publicSummary, '', 'editing one same-named record by explicit id must never affect the other');
  assert.equal(untouched.region, 'Nar Shaddaa');
}

// CASE: Stage 1's Quick Library import remains idempotent through this
// change — it never goes through upsertLocation() at all (importLibrarySeeds()
// writes the registry directly with stable seed-derived ids), so name-based
// identity was never a factor there, and it must stay that way.
{
  installShim();
  const first = await LocationRegistryService.importLibrarySeeds(['tatooine'], {});
  const second = await LocationRegistryService.importLibrarySeeds(['tatooine'], {});
  assert.equal(first.imported.length, 4);
  assert.equal(second.imported.length, 0);
  assert.equal(second.skipped.length, 4);
  assert.equal(LocationRegistryService.getRegistry().length, 4, 'repeated Quick Library import must still be idempotent after the identity fix');
}

// --- Hierarchy integrity ----------------------------------------------------

// CASE: valid hierarchy (planet -> city -> cantina) succeeds normally.
{
  installShim();
  const planet = await LocationRegistryService.upsertLocation({ name: 'Coruscant' });
  const city = await LocationRegistryService.upsertLocation({ name: 'Galactic City', parentLocationId: planet.id });
  const cantina = await LocationRegistryService.upsertLocation({ name: 'Level 1313 Cantina', parentLocationId: city.id });
  assert.equal(city.parentLocationId, planet.id);
  assert.equal(cantina.parentLocationId, city.id);
}

// CASE: self-parenting is rejected — the record's own id as its parent is
// silently cleared, not stored.
{
  installShim();
  const a = await LocationRegistryService.upsertLocation({ name: 'Self Referential' });
  const patched = await LocationRegistryService.upsertLocation({ id: a.id, name: 'Self Referential', parentLocationId: a.id });
  assert.equal(patched.parentLocationId, '', 'a location must never be stored as its own parent');
}

// CASE: a descendant cycle (A -> B -> C, then set A's parent to C) is
// rejected.
{
  installShim();
  const a = await LocationRegistryService.upsertLocation({ name: 'A' });
  const b = await LocationRegistryService.upsertLocation({ name: 'B', parentLocationId: a.id });
  const c = await LocationRegistryService.upsertLocation({ name: 'C', parentLocationId: b.id });
  const cycled = await LocationRegistryService.upsertLocation({ id: a.id, name: 'A', parentLocationId: c.id });
  assert.equal(cycled.parentLocationId, '', 'setting an ancestor\'s parent to one of its own descendants must be rejected, not stored as a cycle');

  // The rest of the hierarchy must be untouched by the rejection.
  assert.equal(LocationRegistryService.findLocation(b.id).parentLocationId, a.id);
  assert.equal(LocationRegistryService.findLocation(c.id).parentLocationId, b.id);
}

// CASE: a parentLocationId that doesn't reference any real record is
// rejected (cleared), not stored as an orphan reference.
{
  installShim();
  const location = await LocationRegistryService.upsertLocation({ name: 'Orphan Attempt', parentLocationId: 'not-a-real-location-id' });
  assert.equal(location.parentLocationId, '', 'a nonexistent parent id must not be stored');
}

// CASE: two-hop direct cycle (A parent=B, B parent=A) — proves the guard
// isn't limited to a single-level self-reference.
{
  installShim();
  const a = await LocationRegistryService.upsertLocation({ name: 'Alpha' });
  const b = await LocationRegistryService.upsertLocation({ name: 'Beta', parentLocationId: a.id });
  const cycled = await LocationRegistryService.upsertLocation({ id: a.id, name: 'Alpha', parentLocationId: b.id });
  assert.equal(cycled.parentLocationId, '', 'a direct A<->B parent cycle must be rejected');
}

console.log('GM Locations identity and hierarchy integrity passed (name-collision creates distinct records, explicit-id edits stay scoped, import stays idempotent, self-parent/cycle/missing-parent all rejected, valid hierarchy still works).');
