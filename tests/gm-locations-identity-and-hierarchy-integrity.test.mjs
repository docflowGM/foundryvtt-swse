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
//
// Stage 3 final correction: the first hierarchy-validation pass silently
// cleared an invalid parentLocationId and still saved the rest of the
// edit — which could destructively detach an existing Location from a
// valid parent it already had on nothing more than a GM's typo. Fixed:
// upsertLocation() now REJECTS the whole save (upsertLocation() throws,
// zero registry writes, the existing record's real parent untouched) for
// self-parent, a nonexistent parent id, or any cycle. These five cases
// are rewritten below to prove rejection, not sanitization.

registerFoundryPathLoader();

function installShim(initialLocations = []) {
  const store = new Map([['gmLocationRegistry', initialLocations]]);
  const writeCounter = { count: 0 };
  installFoundryShimGlobals({
    game: {
      settings: {
        get: (_m, key) => store.get(key),
        set: (_m, key, value) => { writeCounter.count += 1; store.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      }
    }
  });
  return writeCounter;
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

// CASE: self-parenting REJECTS the entire save — zero registry writes,
// the record's prior (valid, non-empty) parent is preserved untouched.
{
  const writes = installShim();
  const grandparent = await LocationRegistryService.upsertLocation({ name: 'Mos Eisley' });
  const a = await LocationRegistryService.upsertLocation({ name: 'Cantina', parentLocationId: grandparent.id });
  const before = LocationRegistryService.getRegistry();
  writes.count = 0;

  await assert.rejects(
    () => LocationRegistryService.upsertLocation({ id: a.id, name: 'Cantina', parentLocationId: a.id }),
    /own parent/i,
    'a location naming itself as its own parent must reject the save, not silently clear the field'
  );

  assert.equal(writes.count, 0, 'a rejected self-parent save must never write the registry');
  const after = LocationRegistryService.getRegistry();
  assert.deepEqual(after, before, 'the registry must be byte-for-byte unchanged after a rejected self-parent save');
  assert.equal(LocationRegistryService.findLocation(a.id).parentLocationId, grandparent.id, 'the record\'s existing valid parent must survive the rejected save, not be blanked');
}

// CASE: a nonexistent parent id on CREATE rejects — no new Location is
// created at all.
{
  const writes = installShim();
  await assert.rejects(
    () => LocationRegistryService.upsertLocation({ name: 'Orphan Attempt', parentLocationId: 'not-a-real-location-id' }),
    /does not exist/i,
    'a nonexistent parent id must reject the whole create, not store an orphan reference'
  );
  assert.equal(writes.count, 0, 'a rejected create must never write the registry');
  assert.equal(LocationRegistryService.getRegistry().length, 0, 'no Location may be created when its requested parent does not exist');
}

// CASE: a nonexistent parent id on EDIT of an existing record also
// rejects, leaving that record's real parent untouched.
{
  const writes = installShim();
  const parent = await LocationRegistryService.upsertLocation({ name: 'Nar Shaddaa' });
  const child = await LocationRegistryService.upsertLocation({ name: 'Smugglers Den', parentLocationId: parent.id });
  const before = LocationRegistryService.getRegistry();
  writes.count = 0;

  await assert.rejects(
    () => LocationRegistryService.upsertLocation({ id: child.id, name: 'Smugglers Den', parentLocationId: 'ghost-location' }),
    /does not exist/i
  );
  assert.equal(writes.count, 0);
  assert.deepEqual(LocationRegistryService.getRegistry(), before, 'the registry must be unchanged after a rejected nonexistent-parent edit');
  assert.equal(LocationRegistryService.findLocation(child.id).parentLocationId, parent.id, 'the existing valid parent must survive the rejection');
}

// CASE: a descendant cycle (A -> B -> C, then attempt A's parent = C)
// rejects — A's real parent (none) and the rest of the chain are
// untouched.
{
  const writes = installShim();
  const a = await LocationRegistryService.upsertLocation({ name: 'A' });
  const b = await LocationRegistryService.upsertLocation({ name: 'B', parentLocationId: a.id });
  const c = await LocationRegistryService.upsertLocation({ name: 'C', parentLocationId: b.id });
  const before = LocationRegistryService.getRegistry();
  writes.count = 0;

  await assert.rejects(
    () => LocationRegistryService.upsertLocation({ id: a.id, name: 'A', parentLocationId: c.id }),
    /cycle/i,
    'setting an ancestor\'s parent to one of its own descendants must reject the save, not store a cycle'
  );

  assert.equal(writes.count, 0, 'a rejected descendant-cycle save must never write the registry');
  assert.deepEqual(LocationRegistryService.getRegistry(), before, 'the whole hierarchy must be byte-for-byte unchanged after the rejection');
  assert.equal(LocationRegistryService.findLocation(a.id).parentLocationId, '', 'A\'s real parent (none) must be preserved, not overwritten with anything');
  assert.equal(LocationRegistryService.findLocation(b.id).parentLocationId, a.id, 'B must remain parented to A');
  assert.equal(LocationRegistryService.findLocation(c.id).parentLocationId, b.id, 'C must remain parented to B');
}

// CASE: two-hop direct cycle (A parent=B, B parent=A) rejects — proves the
// guard isn't limited to a single-level self-reference, and A's existing
// parent survives.
{
  const writes = installShim();
  const grandparent = await LocationRegistryService.upsertLocation({ name: 'Root' });
  const a = await LocationRegistryService.upsertLocation({ name: 'Alpha', parentLocationId: grandparent.id });
  const b = await LocationRegistryService.upsertLocation({ name: 'Beta', parentLocationId: a.id });
  const before = LocationRegistryService.getRegistry();
  writes.count = 0;

  await assert.rejects(
    () => LocationRegistryService.upsertLocation({ id: a.id, name: 'Alpha', parentLocationId: b.id }),
    /cycle/i,
    'a direct A<->B parent cycle must reject the save'
  );

  assert.equal(writes.count, 0);
  assert.deepEqual(LocationRegistryService.getRegistry(), before);
  assert.equal(LocationRegistryService.findLocation(a.id).parentLocationId, grandparent.id, 'A\'s real existing parent must survive the rejected cycle attempt');
}

// CASE: a save with no parentLocationId requested at all (undefined) is
// always valid and preserves the record's existing parent — proves the
// validation only engages on an actual non-blank request, matching
// upsertLocation()'s own "no parent requested" fallback to the existing
// value.
{
  installShim();
  const parent = await LocationRegistryService.upsertLocation({ name: 'Kessel' });
  const child = await LocationRegistryService.upsertLocation({ name: 'Spice Mine', parentLocationId: parent.id });
  const resaved = await LocationRegistryService.upsertLocation({ id: child.id, name: 'Spice Mine', publicSummary: 'Updated notes only.' });
  assert.equal(resaved.parentLocationId, parent.id, 'omitting parentLocationId entirely on an edit must not disturb the existing valid parent');
}

console.log('GM Locations identity and hierarchy integrity passed (name-collision creates distinct records, explicit-id edits stay scoped, import stays idempotent, self-parent/missing-parent/direct-cycle/descendant-cycle all REJECT the whole save with zero registry writes and the existing valid parent preserved, valid hierarchy still works).');
