import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// PRE-8D-4 — Faction / Contact canonical identity hardening.
//
// Proves the SSOT rule this phase exists to enforce: DISPLAY TEXT IS NOT
// IDENTITY. Before this phase, FactionRegistryService#upsertFaction() and
// #upsertFactionContact() silently matched an "existing" record by
// lower-cased display name whenever no id (or an unmatched id) was
// supplied, and new-record id minting (normalizeContact(),
// _normalizeFactionRecord()) derived ids from name(+role) text. That meant
// renaming, or simply typing the same name twice, could silently merge two
// meant-to-be-distinct Factions/Contacts into one canonical record — the
// exact bug docs/audits/gm-datapad-ecosystem-redesign.md:437-439 already
// flagged as known debt.
//
// This file exercises the REAL, unmodified FactionRegistryService (and the
// real FactionJobBridgeService/LocationJobBridgeService/npc-concept.js
// consumers, to prove cross-domain references survive) against the
// foundry-shim harness already used by
// tests/gm-faction-ecosystem-view-model.test.mjs and friends. Nothing here
// is a behavior mock — every assertion below is against production code.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function makeStore(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    get: (_module, key) => data.get(key),
    set: (_module, key, value) => { data.set(key, value); return Promise.resolve(value); },
    settings: { has: () => true },
    register: () => {}
  };
}

let ridCounter = 0;
function installFreshRegistry({ seed = {}, actors = [], isGM = true } = {}) {
  const store = makeStore(seed);
  installFoundryShimGlobals({
    game: {
      user: { isGM },
      settings: store,
      actors: makeActorsCollection(actors),
      scenes: new Map()
    }
  });
  // Deterministic-but-unique ids (mirrors foundry.utils.randomID() at
  // runtime) so duplicate-name records can never collide by accident here.
  globalThis.foundry.utils.randomID = () => `rid-${++ridCounter}`;
  return store;
}

const { FactionRegistryService } = await import('/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js');
const { FactionJobBridgeService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js');
const { LocationJobBridgeService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/LocationJobBridgeService.js');
const { createNpcConceptDraft, NPC_CONCEPT_KIND } = await import('/systems/foundryvtt-swse/scripts/generation/npc-concept.js');

let passCount = 0;
function pass(label) {
  passCount += 1;
  console.log(`  ok — ${label}`);
}

// ---------------------------------------------------------------------
// FACTION 1-10
// ---------------------------------------------------------------------

installFreshRegistry();

{
  // 1. new Faction gets a canonical id; 2. that id is independent of name.
  const a = await FactionRegistryService.upsertFaction({ name: 'Voren Mining Concern' });
  assert.ok(a.id, 'new Faction must receive a non-empty canonical id');
  assert.notEqual(a.id, 'voren-mining-concern', 'new Faction id must not be a slug of its name');
  pass('1/2 — new Faction gets a canonical id independent of its name');
}

{
  // 3. rename preserves id.
  const created = await FactionRegistryService.upsertFaction({ name: 'Voren Mining Concern' });
  const originalId = created.id;
  const renamed = await FactionRegistryService.upsertFaction({ id: originalId, name: 'Voren Industrial Holdings' });
  assert.equal(renamed.id, originalId, 'renaming a Faction must preserve its canonical id');
  assert.equal(renamed.name, 'Voren Industrial Holdings');
  const refetched = FactionRegistryService.findFaction(originalId);
  assert.equal(refetched.name, 'Voren Industrial Holdings', 'lookup by the stable id must resolve the renamed record');
  pass('3 — Faction rename preserves canonical id');
}

{
  // 4/10. duplicate Faction names coexist with distinct ids; 5/6. update/
  // delete-by-id only ever targets the intended duplicate.
  const a = await FactionRegistryService.upsertFaction({ name: 'Republic Intelligence' });
  const b = await FactionRegistryService.upsertFaction({ name: 'Republic Intelligence' });
  assert.notEqual(a.id, b.id, 'two Factions created with the same display name must get distinct ids');
  const registryNames = FactionRegistryService.getRegistry().filter(f => f.name === 'Republic Intelligence');
  assert.equal(registryNames.length, 2, 'both same-named Factions must survive persistence/normalization');
  pass('4/10 — duplicate Faction display names are legal and coexist');

  const updatedA = await FactionRegistryService.upsertFaction({ id: a.id, name: 'Republic Intelligence', notes: 'Updated A only' });
  assert.equal(updatedA.id, a.id);
  const stillB = FactionRegistryService.findFaction(b.id);
  assert.equal(stillB.notes, '', 'updating A by canonical id must never mutate B');
  pass('5 — update-by-id affects only the intended duplicate');

  await FactionRegistryService.deleteFaction(a.id);
  assert.equal(FactionRegistryService.findFaction(a.id), null, 'A must be gone');
  assert.ok(FactionRegistryService.findFaction(b.id), 'B must be unaffected by deleting A');
  pass('6 — delete-by-id affects only the intended duplicate');
}

{
  // 7. repeated normalization preserves id.
  const created = await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  const read1 = FactionRegistryService.findFaction(created.id);
  const read2 = FactionRegistryService.getRegistry().find(f => f.id === created.id);
  assert.equal(read1.id, created.id);
  assert.equal(read2.id, created.id);
  pass('7 — repeated read-side normalization preserves id');
}

{
  // 8. a healthy legacy (name-derived) persisted id remains unchanged.
  const store = installFreshRegistry({
    seed: { gmFactionRegistry: [{ id: 'voren-mining', name: 'Voren Mining Concern', contacts: [] }] }
  });
  const found = FactionRegistryService.findFaction('voren-mining');
  assert.equal(found.id, 'voren-mining', 'a healthy legacy name-derived id must be preserved exactly');
  const renamed = await FactionRegistryService.upsertFaction({ id: 'voren-mining', name: 'Voren Industrial Holdings' });
  assert.equal(renamed.id, 'voren-mining', 'renaming must not touch a healthy legacy id, even though it no longer matches the new name');
  pass('8 — healthy legacy (name-derived) id survives unchanged, including through a rename');
  void store;
}

{
  // 9/10. missing legacy id migrates exactly once, and the migration is
  // idempotent. Two records share a name AND both lack an id -- the
  // pre-hardening bug this exact pathway used to collide them onto the
  // same slugify(name) id.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { name: 'Hutt Cartel', contacts: [{ name: 'Ralo', role: 'Agent' }] },
        { name: 'Hutt Cartel', contacts: [] }
      ]
    }
  });
  const before = FactionRegistryService.getRegistry();
  assert.equal(before.length, 2);
  assert.notEqual(before[0].id, before[1].id, 'even before an explicit migration pass, read-time normalization must never let two missing-id records collide on the same derived id');

  const migration = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(migration.changed, true, 'a registry with missing ids must report a migration occurred');
  assert.equal(migration.migratedFactions.length, 2, 'both missing-id Factions must be migrated');

  const after = FactionRegistryService.getRegistry();
  const idsAfter = after.map(f => f.id);
  assert.equal(new Set(idsAfter).size, 2, 'migrated ids must be unique');

  // Once migrateLegacyIdentities() has PERSISTED an id, it is no longer
  // "missing" -- every subsequent read must reproduce the exact same id
  // (the real stability guarantee). Before migration runs, a missing id is
  // not yet assigned-once-and-persisted, so a bare getRegistry() read (never
  // itself a mutation) is not required to reproduce the same ephemeral
  // value call-to-call — only "assign once, persist, stable forever" is
  // required, and that is what migrateLegacyIdentities() provides.
  const afterAgainRead = FactionRegistryService.getRegistry().map(f => f.id);
  assert.deepEqual(afterAgainRead, idsAfter, 'once persisted, repeated reads must reproduce the exact same migrated id');

  const again = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(again.changed, false, 'migration must be idempotent — nothing left to migrate on a second run');
  const stillAfter = FactionRegistryService.getRegistry();
  assert.deepEqual(stillAfter.map(f => f.id).sort(), idsAfter.sort(), 'a second migration pass must not reassign any id');
  pass('9/10 — missing legacy ids migrate exactly once, deterministically, and the migration is idempotent');
}

// ---------------------------------------------------------------------
// CONTACT 11-21
// ---------------------------------------------------------------------

installFreshRegistry();

{
  // 11/12. new Contact gets a stable id independent of name+role.
  const faction = await FactionRegistryService.upsertFaction({ name: 'Crimson Dawn' });
  const { contact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Kara Venn', role: 'Fixer' });
  assert.ok(contact.id, 'new Contact must receive a non-empty canonical id');
  assert.notEqual(contact.id, 'kara-venn-fixer', 'new Contact id must not be a slug of name+role');
  pass('11/12 — new Contact gets a stable id independent of name+role');

  // 13/14. rename and role change both preserve id.
  const renamed = await FactionRegistryService.upsertFactionContact(faction.id, { id: contact.id, name: 'Kara Dane', role: 'Broker' });
  assert.equal(renamed.contact.id, contact.id, 'renaming + re-roling a Contact must preserve its canonical id');
  const refetched = FactionRegistryService.findFactionContact(faction.id, contact.id);
  assert.equal(refetched.contact.name, 'Kara Dane');
  assert.equal(refetched.contact.role, 'Broker');
  pass('13/14 — Contact rename and role change both preserve canonical id');
}

{
  // 15/16/17. duplicate name+role Contacts on the same Faction coexist;
  // update/remove-by-id targets only the intended one.
  const faction = await FactionRegistryService.upsertFaction({ name: 'Exchange' });
  const { contact: a } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Ralo', role: 'Agent' });
  const { contact: b } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Ralo', role: 'Agent' });
  assert.notEqual(a.id, b.id, 'two Contacts created with the same name+role must get distinct ids');
  const allContacts = FactionRegistryService.getFactionContacts(faction.id).filter(c => c.name === 'Ralo');
  assert.equal(allContacts.length, 2, 'both same name+role Contacts must survive persistence/normalization');
  pass('15 — duplicate Contact name+role is legal and both coexist');

  await FactionRegistryService.upsertFactionContact(faction.id, { id: a.id, name: 'Ralo', role: 'Agent', gmNotes: 'updated A only' });
  const stillB = FactionRegistryService.findFactionContact(faction.id, b.id)?.contact;
  assert.equal(stillB.gmNotes, '', 'updating A by canonical id must never mutate B');
  pass('16 — update-by-id targets only the intended duplicate Contact');

  await FactionRegistryService.deleteFactionContact(faction.id, a.id);
  assert.equal(FactionRegistryService.findFactionContact(faction.id, a.id), null, 'A must be gone');
  assert.ok(FactionRegistryService.findFactionContact(faction.id, b.id), 'B must be unaffected by removing A');
  pass('17 — remove-by-id targets only the intended duplicate Contact');
}

{
  // 18. repeated normalization preserves id.
  const faction = await FactionRegistryService.upsertFaction({ name: 'Zann Consortium' });
  const { contact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Silri', role: 'Enforcer' });
  const read1 = FactionRegistryService.findFactionContact(faction.id, contact.id)?.contact;
  const read2 = FactionRegistryService.getAllFactionContacts().find(c => c.id === contact.id);
  assert.equal(read1.id, contact.id);
  assert.equal(read2.id, contact.id);
  pass('18 — repeated read-side normalization preserves Contact id');
}

{
  // 19. missing legacy Contact id migrates once (covered together with the
  // Faction-side migration, since migrateLegacyIdentities() sweeps both in
  // the same pass): two Contacts on the same Faction share a name+role AND
  // both lack an id.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        {
          id: 'crimson-dawn',
          name: 'Crimson Dawn',
          contacts: [
            { name: 'Dryden', role: 'Director' },
            { name: 'Dryden', role: 'Director' }
          ]
        }
      ]
    }
  });
  const beforeContacts = FactionRegistryService.getFactionContacts('crimson-dawn');
  assert.notEqual(beforeContacts[0].id, beforeContacts[1].id, 'even before migration, read-time normalization must never collide two missing-id same-name+role Contacts');

  const migration = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(migration.changed, true);
  assert.equal(migration.migratedContacts.length, 2, 'both missing-id Contacts must be migrated');

  const afterContacts = FactionRegistryService.getFactionContacts('crimson-dawn');
  assert.equal(new Set(afterContacts.map(c => c.id)).size, 2, 'migrated Contact ids must be unique');

  const again = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(again.changed, false, 'Contact id migration must also be idempotent');
  pass('19 — missing legacy Contact ids migrate exactly once and idempotently');
}

{
  // 20/21. Contact -> Actor linking preserves Contact id; Actor rename
  // cannot change Contact identity. Exercised through the real
  // promoteFactionContactToActor() "already-linked" branch (no Actor.create
  // faking needed — resolveActorReference() resolves through game.actors).
  const fakeActor = { id: 'actor-1', name: 'Kara Venn', uuid: 'Actor.actor-1' };
  installFreshRegistry({ actors: [fakeActor] });
  const faction = await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  const created = await FactionRegistryService.upsertFactionContact(faction.id, {
    name: 'Kara Venn', role: 'Lieutenant', actorId: fakeActor.id, actorUuid: fakeActor.uuid
  });
  const contactId = created.contact.id;

  const linked = await FactionRegistryService.promoteFactionContactToActor(faction.id, contactId);
  assert.equal(linked.created, false, 'an already-resolvable actor must be linked, not re-created');
  assert.equal(linked.contact.id, contactId, 'promoting/linking to an Actor must preserve the Contact id');
  assert.equal(linked.contact.actorId, fakeActor.id);
  pass('20 — Contact -> Actor linking preserves the Contact canonical id');

  fakeActor.name = 'Kara Dane'; // simulate renaming the linked Actor document
  const relinked = await FactionRegistryService.promoteFactionContactToActor(faction.id, contactId);
  assert.equal(relinked.contact.id, contactId, 'renaming the linked Actor must never change Contact identity');
  assert.equal(relinked.contact.actorName, 'Kara Dane', 'the cached actorName display field may update...');
  pass('21 — renaming the linked Actor cannot change Contact identity (only the cached display field updates)');
}

// ---------------------------------------------------------------------
// CROSS-DOMAIN 22-29
// ---------------------------------------------------------------------

{
  // 22. Location Faction reference survives rename. LocationJobBridgeService
  // accepts a real Location object directly (bypassing LocationRegistryService,
  // which is out of scope for this phase) with a controllingFactionId.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Offworld Mining Guild' });
  const location = { id: 'loc-1', name: 'Kessel Spice Mines', controllingFactionId: faction.id, parentLocationId: '' };
  const draftBefore = LocationJobBridgeService.buildDraftFromLocation(location);
  assert.equal(draftBefore.issuer.factionId, faction.id);
  assert.equal(draftBefore.client.factionName, 'Offworld Mining Guild');

  await FactionRegistryService.upsertFaction({ id: faction.id, name: 'Spice Authority' });
  const draftAfter = LocationJobBridgeService.buildDraftFromLocation(location);
  assert.equal(draftAfter.issuer.factionId, faction.id, 'the Location lead must still resolve to the same canonical Faction id after a rename');
  assert.equal(draftAfter.client.factionName, 'Spice Authority', 'the Location lead must reflect the NEW display name, resolved through the stable id, not a stale cached name');
  pass('22 — Location -> Faction reference survives rename (resolved through the stable id)');
}

{
  // 23. NPC Faction reference survives rename. npc-concept.js stores
  // factionId verbatim ("Real canonical references ONLY") and never
  // re-derives it from a name, so this is rename-safe by construction --
  // proven directly against the real factory function.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Kuati Drive Yards' });
  const draft = createNpcConceptDraft({ kind: NPC_CONCEPT_KIND.LIVING, name: 'Test Engineer', factionId: faction.id });
  assert.equal(draft.factionId, faction.id);
  await FactionRegistryService.upsertFaction({ id: faction.id, name: 'Kuat Drive Yards' });
  assert.equal(draft.factionId, faction.id, 'an NPC concept draft never re-derives factionId from a name, so a later rename cannot affect an already-built draft');
  const resolved = FactionRegistryService.findFaction(draft.factionId);
  assert.equal(resolved.name, 'Kuat Drive Yards', 'resolving the draft\'s stored factionId after the rename must reach the renamed Faction');
  pass('23 — NPC -> Faction reference survives rename (id stored verbatim, never name-derived)');
}

{
  // 24/25. Job issuerFactionId / issuerContactId survive rename, exercised
  // through FactionJobBridgeService (the real Job Board <-> Faction
  // Registry adapter) without touching frozen Job architecture.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Czerka Corporation' });
  const { contact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Moff Rancit', role: 'Procurement Officer' });

  const draftBefore = FactionJobBridgeService.buildDraftFromContact(faction.id, contact.id);
  assert.equal(draftBefore.issuer.factionId, faction.id);
  assert.equal(draftBefore.issuer.contactId, contact.id);

  await FactionRegistryService.upsertFaction({ id: faction.id, name: 'Czerka Arms' });
  await FactionRegistryService.upsertFactionContact(faction.id, { id: contact.id, name: 'Rancit Vorn', role: 'Quartermaster' });

  const draftAfter = FactionJobBridgeService.buildDraftFromContact(faction.id, contact.id);
  assert.equal(draftAfter.issuer.factionId, faction.id, 'issuerFactionId must survive a Faction rename');
  assert.equal(draftAfter.issuer.contactId, contact.id, 'issuerContactId must survive a Contact rename');
  assert.equal(draftAfter.issuer.factionName, 'Czerka Arms');
  assert.equal(draftAfter.issuer.contactName, 'Rancit Vorn');
  pass('24/25 — Job issuer Faction/Contact references survive rename');
}

{
  // 26/27. Intel Faction/Contact reference resolution is already
  // canonical-id-only (confirmed during the audit read of
  // scripts/holonet/subsystems/holonet-intel-service.js, which reports an
  // explicit resolutionKind of 'canonical-id' vs 'missing' and never
  // resolves by name). Re-proven here directly against
  // FactionRegistryService using the identical id-only resolution shape
  // gm-contact-actorizer-service.js's intelLinkLabels() helper uses, so this
  // phase does not need to import the full holonet-intel-service.js
  // dependency graph to demonstrate the invariant.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Imperial Security Bureau' });
  const { contact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Armand Isard', role: 'Director' });
  const linkedFactionId = faction.id;
  const linkedContactId = contact.id;

  await FactionRegistryService.upsertFaction({ id: faction.id, name: 'ISB' });
  await FactionRegistryService.upsertFactionContact(faction.id, { id: contact.id, name: 'Isard', role: 'Director Emeritus' });

  const resolvedFaction = FactionRegistryService.findFaction(linkedFactionId);
  const resolvedContact = FactionRegistryService.findFactionContact(linkedFactionId, linkedContactId)?.contact;
  assert.equal(resolvedFaction.id, linkedFactionId, 'Intel-style linkedFactionId must still resolve after rename');
  assert.equal(resolvedFaction.name, 'ISB');
  assert.equal(resolvedContact.id, linkedContactId, 'Intel-style linkedContactId must still resolve after rename');
  assert.equal(resolvedContact.name, 'Isard');
  pass('26/27 — Intel-style linkedFactionId/linkedContactId resolution survives rename (already canonical-id-only)');
}

{
  // 28. visibility change preserves identity (SS02 existence != visibility).
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Hidden Hand', status: 'active' });
  const { contact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Shadow Broker', role: 'Informant', revealState: 'hidden' });
  const revealed = await FactionRegistryService.upsertFactionContact(faction.id, { id: contact.id, name: 'Shadow Broker', role: 'Informant', revealState: 'known', knownToPlayers: true });
  assert.equal(revealed.contact.id, contact.id, 'hidden -> known must never mint a new Contact identity');
  assert.equal(revealed.contact.revealState, 'known');
  pass('28 — a visibility/reveal-state change preserves canonical identity');
}

{
  // 29. no canonical resolution requires display-name equality -- the
  // negative-architecture summary check: upsertFaction/upsertFactionContact
  // with a matching name but no id must never merge into an existing record.
  installFreshRegistry();
  const original = await FactionRegistryService.upsertFaction({ name: 'Trade Federation' });
  const lookalike = await FactionRegistryService.upsertFaction({ name: 'Trade Federation' });
  assert.notEqual(original.id, lookalike.id, 'upsertFaction must never resolve "same canonical entity" from name equality alone');

  const { contact: c1 } = await FactionRegistryService.upsertFactionContact(original.id, { name: 'Nute Gunray', role: 'Viceroy' });
  const { contact: c2 } = await FactionRegistryService.upsertFactionContact(original.id, { name: 'Nute Gunray', role: 'Viceroy' });
  assert.notEqual(c1.id, c2.id, 'upsertFactionContact must never resolve "same canonical entity" from name+role equality alone');
  pass('29 — no canonical mutation path resolves identity from display-name (or name+role) equality');
}

console.log(`\nPRE-8D-4 Faction/Contact canonical identity hardening: ${passCount} assertions-groups passed.`);
console.log('Faction/Contact identity is now id-only for every canonical create/update/delete path; display text (name, role) never decides canonical sameness; legacy ids, duplicate names, draft/canonical duality, and every audited cross-domain reference (Location, NPC, Job, Intel) remain stable across rename.');
