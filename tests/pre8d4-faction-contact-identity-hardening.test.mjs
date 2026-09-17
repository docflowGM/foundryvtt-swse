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

function makeFakeActor({ id = 'actor-1', name = 'Test Actor' } = {}) {
  const flags = new Map();
  return {
    id,
    name,
    getFlag: (scope, key) => flags.get(`${scope}.${key}`),
    setFlag: async (scope, key, value) => { flags.set(`${scope}.${key}`, value); return value; }
  };
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
const { FactionIntelBridgeService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionIntelBridgeService.js');

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
  //
  // CORRECTION PASS round 2: read-time normalization (getRegistry()) now
  // deliberately REPRODUCES that old collision-prone slugify(name) value
  // for a still-unmigrated missing-id record (both Factions below read as
  // "hutt-cartel" before migration runs) -- this is the exact legacy
  // formula pre-hardening code always computed, preserved so any EXTERNAL
  // reference that already captured it (see test 9b below) keeps
  // resolving. migrateLegacyIdentities() is the one and only place that
  // disambiguates a genuine collision -- read normalization alone no
  // longer needs to (and, by design, does not).
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
  assert.equal(before[0].id, 'hutt-cartel', 'an unmigrated missing-id record must read as its exact legacy slugify(name) id');
  assert.equal(before[1].id, 'hutt-cartel', 'two same-name missing-id records legitimately collide at read time, matching pre-hardening behavior, until migration disambiguates them');
  const beforeAgain = FactionRegistryService.getRegistry();
  assert.deepEqual(beforeAgain.map(f => f.id), before.map(f => f.id), 'read normalization is deterministic (slugify(name)) — repeated reads before migration must be stable, not manufacture a different random id each call');

  const migration = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(migration.changed, true, 'a registry with missing ids must report a migration occurred');
  assert.equal(migration.migratedFactions.length, 2, 'both missing-id Factions must be migrated');
  assert.equal(migration.migratedFactions.filter(m => m.recoveredLegacyIdentity).length, 1, 'exactly one of the two colliding records recovers the shared legacy candidate');
  assert.equal(migration.collisions.length, 1, 'the genuine name collision between two legacy no-id records must be reported');

  const after = FactionRegistryService.getRegistry();
  const idsAfter = after.map(f => f.id);
  assert.equal(new Set(idsAfter).size, 2, 'migrated ids must be unique');
  assert.ok(idsAfter.includes('hutt-cartel'), 'the first record must keep the recovered legacy id exactly, so any pre-existing external reference to it keeps resolving');

  const afterAgainRead = FactionRegistryService.getRegistry().map(f => f.id);
  assert.deepEqual(afterAgainRead, idsAfter, 'once persisted, repeated reads must reproduce the exact same migrated id');

  const again = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(again.changed, false, 'migration must be idempotent — nothing left to migrate on a second run');
  const stillAfter = FactionRegistryService.getRegistry();
  assert.deepEqual(stillAfter.map(f => f.id).sort(), idsAfter.sort(), 'a second migration pass must not reassign any id');
  pass('9/10 — missing legacy ids recover their exact old effective identity when unambiguous (and are minted fresh + reported only on a genuine collision), persisted once and thereafter stable across reads; the migration itself is idempotent');
}

{
  // 9b. NEW (correction pass round 2): a pre-existing external reference
  // (Location.controllingFactionId / Intel.linkedFactionId / Actor
  // relationship factionId / Job issuerFactionId — all just a plain string
  // field somewhere else) that was captured under the OLD pre-hardening
  // read behavior (slugify(name), unambiguous here — only one Faction) must
  // still resolve correctly after migration runs.
  installFreshRegistry({
    seed: { gmFactionRegistry: [{ name: 'Hutt Cartel', contacts: [{ name: 'Ralo', role: 'Fixer' }] }] }
  });
  const preMigrationRead = FactionRegistryService.findFaction('hutt-cartel');
  assert.ok(preMigrationRead, 'the Faction must already be reachable by its legacy effective id before migration (read-time compatibility)');
  const externalLocationControllingFactionId = preMigrationRead.id; // simulates a Location/Intel/Actor/Job record that captured this value pre-hardening
  const externalContactId = FactionRegistryService.getFactionContacts(preMigrationRead.id)[0].id;

  await FactionRegistryService.migrateLegacyIdentities();

  const resolvedFaction = FactionRegistryService.findFaction(externalLocationControllingFactionId);
  assert.ok(resolvedFaction, 'a pre-existing external reference to the old effective Faction id must still resolve after migration');
  assert.equal(resolvedFaction.name, 'Hutt Cartel');
  const resolvedContact = FactionRegistryService.findFactionContact(resolvedFaction.id, externalContactId)?.contact;
  assert.ok(resolvedContact, 'a pre-existing external reference to the old effective Contact id must still resolve after migration');
  assert.equal(resolvedContact.name, 'Ralo');
  pass('9b — a pre-existing external reference to a legacy record\'s old effective (unambiguous) id survives migration intact');
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
  // CORRECTION PASS round 2: read normalization now reproduces the exact
  // legacy slugify(name-role) formula, so two same-name+role missing-id
  // Contacts DO legitimately collide at read time (matching pre-hardening
  // behavior) until migration disambiguates them — see test 9/10's header
  // comment for the full rationale.
  const beforeContacts = FactionRegistryService.getFactionContacts('crimson-dawn');
  assert.equal(beforeContacts[0].id, 'dryden-director');
  assert.equal(beforeContacts[1].id, 'dryden-director', 'two same-name+role missing-id Contacts legitimately collide at read time until migration disambiguates them');

  const migration = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(migration.changed, true);
  assert.equal(migration.migratedContacts.length, 2, 'both missing-id Contacts must be migrated');
  assert.equal(migration.migratedContacts.filter(m => m.recoveredLegacyIdentity).length, 1, 'exactly one of the two colliding Contacts recovers the shared legacy candidate');
  assert.equal(migration.collisions.filter(c => c.kind === 'contact').length, 1, 'the genuine name+role collision must be reported');

  const afterContacts = FactionRegistryService.getFactionContacts('crimson-dawn');
  assert.equal(new Set(afterContacts.map(c => c.id)).size, 2, 'migrated Contact ids must be unique');
  assert.ok(afterContacts.some(c => c.id === 'dryden-director'), 'the first Contact must keep the recovered legacy id exactly');

  const again = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(again.changed, false, 'Contact id migration must also be idempotent');
  pass('19 — missing legacy Contact ids recover their exact old effective identity when unambiguous (minted fresh + reported only on a genuine collision), and migrate idempotently');
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
  // 29. no canonical resolution requires display-name equality, proven here
  // specifically for the two shared upserts: upsertFaction/
  // upsertFactionContact with a matching name but no id must never merge
  // into an existing record. This is ONE piece of the negative-architecture
  // claim, not the whole of it -- the CORRECTION PASS block below proves
  // the same invariant for every OTHER canonical mutation path
  // (addActorRelationship, updateActorRelationship, applyScoreDelta,
  // approveSuggestedFaction, resolveOrCreateFactionByName,
  // deleteFactionContact, promoteFactionContactToActor, and the Job
  // Board/Location Atlas UI callers), each of which independent review
  // found was still resolving its target through the flexible,
  // name-capable findFaction()/findFactionContact() SEARCH helpers even
  // after upsertFaction()/upsertFactionContact() themselves were hardened.
  installFreshRegistry();
  const original = await FactionRegistryService.upsertFaction({ name: 'Trade Federation' });
  const lookalike = await FactionRegistryService.upsertFaction({ name: 'Trade Federation' });
  assert.notEqual(original.id, lookalike.id, 'upsertFaction must never resolve "same canonical entity" from name equality alone');

  const { contact: c1 } = await FactionRegistryService.upsertFactionContact(original.id, { name: 'Nute Gunray', role: 'Viceroy' });
  const { contact: c2 } = await FactionRegistryService.upsertFactionContact(original.id, { name: 'Nute Gunray', role: 'Viceroy' });
  assert.notEqual(c1.id, c2.id, 'upsertFactionContact must never resolve "same canonical entity" from name+role equality alone');
  pass('29 — no canonical mutation path resolves identity from display-name (or name+role) equality');
}

// ---------------------------------------------------------------------
// CORRECTION PASS (independent review of PR #969) 30-40
//
// The first pass hardened upsertFaction()/upsertFactionContact() but left
// several OTHER canonical mutation paths resolving their target Faction/
// Contact through the intentionally flexible, name-capable findFaction()/
// findFactionContact() SEARCH helpers -- unsafe now that duplicate display
// names are explicitly legal. This block proves the fix: every mutator
// below now resolves by canonical id when one is available, and only
// falls back to a display name when it is UNAMBIGUOUS (matches exactly one
// canonical record) -- two or more same-named candidates is refused
// outright rather than silently picked.
// ---------------------------------------------------------------------

{
  // 30. addActorRelationship must refuse to guess among duplicate
  // same-named Factions, but must still resolve correctly -- and let a PC
  // hold DISTINCT relationships with each -- when given an explicit id.
  installFreshRegistry();
  const a = await FactionRegistryService.upsertFaction({ name: 'Republic Intelligence' });
  const b = await FactionRegistryService.upsertFaction({ name: 'Republic Intelligence' });
  const actor = makeFakeActor({ id: 'pc-1' });

  await assert.rejects(
    () => FactionRegistryService.addActorRelationship({ actor, factionName: 'Republic Intelligence' }),
    /Multiple Factions are named/,
    'addActorRelationship must refuse to guess among duplicate same-named Factions when no id is supplied'
  );

  const relA = await FactionRegistryService.addActorRelationship({ actor, factionId: a.id, factionName: 'Republic Intelligence' });
  const relB = await FactionRegistryService.addActorRelationship({ actor, factionId: b.id, factionName: 'Republic Intelligence' });
  assert.equal(relA.factionId, a.id);
  assert.equal(relB.factionId, b.id);
  const relationships = FactionRegistryService.getActorRelationships(actor);
  assert.equal(relationships.length, 2, 'a PC must be able to hold distinct relationships with two Factions that happen to share a name');
  assert.notEqual(relationships[0].id, relationships[1].id);
  pass('30 — addActorRelationship refuses to guess among duplicate same-named Factions; resolves correctly by id and lets a PC hold distinct relationships with each');
}

{
  // 31. updateActorRelationship: a stable factionId is always authoritative
  // and is never abandoned in favor of a (possibly ambiguous) name --
  // existing.factionId is always populated by the time an existing
  // relationship row is read (_normalizeActorRelationship's own legacy
  // fallback, deliberately preserved), so a bare factionName-only update
  // call correctly keeps updating the SAME Faction it already pointed at
  // rather than attempting -- and risking -- a fresh name resolution. An
  // explicit data.factionId still correctly re-targets the relationship
  // onto a DIFFERENT same-named Faction, proving id always wins over name.
  installFreshRegistry();
  const a = await FactionRegistryService.upsertFaction({ name: 'Czerka Corp' });
  const b = await FactionRegistryService.upsertFaction({ name: 'Czerka Corp' });
  const actor = makeFakeActor({ id: 'pc-2' });
  const rel = await FactionRegistryService.addActorRelationship({ actor, factionId: a.id });

  const untouched = await FactionRegistryService.updateActorRelationship(actor, rel.id, { factionName: 'Czerka Corp', notes: 'no explicit id supplied' });
  assert.equal(untouched.factionId, a.id, 'without an explicit factionId, the update must stay on the relationship\'s already-known Faction (id wins over name) rather than re-resolving by the ambiguous name');

  const updated = await FactionRegistryService.updateActorRelationship(actor, rel.id, { factionId: b.id, notes: 'moved to B by explicit id' });
  assert.equal(updated.factionId, b.id, 'an explicit id must correctly re-target the relationship onto a DIFFERENT same-named Faction');
  pass('31 — updateActorRelationship: a stable factionId is always authoritative over name (never re-resolves an already-known relationship by name), and an explicit id correctly re-targets between duplicate same-named Factions');
}

{
  // 32. applyScoreDelta must fail SOFT (return null, log a warning) rather
  // than throw or guess when only a name is available and it is
  // ambiguous -- this runs in a per-actor loop from applyJobFactionDelta(),
  // and a thrown error would abort every OTHER actor's unrelated update in
  // the same job-consequence batch.
  installFreshRegistry();
  await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  const actor = makeFakeActor({ id: 'pc-3' });
  const result = await FactionRegistryService.applyScoreDelta({ actor, factionName: 'Black Sun', delta: 5, source: 'job' });
  assert.equal(result, null, 'applyScoreDelta must return null (fail soft), never guess, when the Faction name is ambiguous');
  assert.equal(FactionRegistryService.getActorRelationships(actor).length, 0, 'no relationship/reputation change may be applied when the target Faction is ambiguous');
  pass('32 — applyScoreDelta fails safely (no guess, no throw, no data change) when the Faction name is ambiguous');
}

{
  // 33. approveSuggestedFaction must never silently attach a player
  // suggestion to the first of several same-named Factions -- the GM
  // clicking "Approve" never had a chance to pick which one.
  const actor = makeFakeActor({ id: 'pc-4' });
  installFreshRegistry({ actors: [actor] });
  await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  await actor.setFlag('foundryvtt-swse', 'factions', [{ id: 'sugg-1', name: 'Black Sun', status: 'pending_approval' }]);

  await assert.rejects(
    () => FactionRegistryService.approveSuggestedFaction({ actorId: actor.id, factionRecordId: 'sugg-1' }),
    /Multiple Factions are named/,
    'approveSuggestedFaction must refuse to guess among duplicate same-named Factions'
  );
  pass('33 — approveSuggestedFaction refuses to guess among duplicate same-named Factions when approving a player suggestion');
}

{
  // 34. resolveOrCreateFactionByName(): 0 matches creates, exactly 1 match
  // reuses, 2+ matches refuses to guess. This is the public seam external
  // callers with only a free-text Faction name (no id widget) use.
  installFreshRegistry();
  const created = await FactionRegistryService.resolveOrCreateFactionByName('Offworld Salvage Co', { source: 'job' });
  assert.ok(created.id, '0 matches must create a new Faction');
  const reused = await FactionRegistryService.resolveOrCreateFactionByName('Offworld Salvage Co', { source: 'job' });
  assert.equal(reused.id, created.id, 'exactly 1 unambiguous match must be reused, never duplicated');

  await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  await assert.rejects(
    () => FactionRegistryService.resolveOrCreateFactionByName('Black Sun', { source: 'job' }),
    /Multiple Factions are named/,
    'resolveOrCreateFactionByName must never silently pick one of several same-named Factions'
  );
  pass('34 — resolveOrCreateFactionByName creates on 0 matches, reuses on exactly 1 match, refuses to guess on 2+ matches');
}

{
  // 35. upsertFactionContact / deleteFactionContact / promoteFactionContactToActor
  // must all refuse to guess their parent Faction (or, for promote, the
  // Contact too) among duplicate same-named candidates, while still
  // resolving correctly -- and targeting ONLY the intended record -- when
  // given a real id.
  const fakeActor = { id: 'exchange-actor-1', name: 'Ralo', uuid: 'Actor.exchange-actor-1' };
  installFreshRegistry({ actors: [fakeActor] });
  const a = await FactionRegistryService.upsertFaction({ name: 'Exchange' });
  const b = await FactionRegistryService.upsertFaction({ name: 'Exchange' });

  await assert.rejects(
    () => FactionRegistryService.upsertFactionContact('', { factionName: 'Exchange', name: 'Ralo', role: 'Agent' }),
    /Multiple Factions are named/,
    'upsertFactionContact must refuse to guess the parent Faction among duplicate same-named Factions'
  );

  const { contact } = await FactionRegistryService.upsertFactionContact(a.id, { name: 'Ralo', role: 'Agent', actorId: fakeActor.id, actorUuid: fakeActor.uuid });
  assert.equal(FactionRegistryService.getFactionContacts(a.id).length, 1);
  assert.equal(FactionRegistryService.getFactionContacts(b.id).length, 0, 'Faction B must be completely untouched by a mutation explicitly targeting Faction A by id');

  await assert.rejects(
    () => FactionRegistryService.promoteFactionContactToActor('Exchange', contact.id),
    /Multiple Factions are named/,
    'promoteFactionContactToActor must refuse to guess the parent Faction among duplicate same-named Factions'
  );
  const promoted = await FactionRegistryService.promoteFactionContactToActor(a.id, contact.id);
  assert.equal(promoted.contact.id, contact.id, 'promoteFactionContactToActor must resolve correctly by real Faction id');

  const { contact: duplicateNameContact } = await FactionRegistryService.upsertFactionContact(a.id, { name: 'Ralo', role: 'Agent' });
  await assert.rejects(
    () => FactionRegistryService.promoteFactionContactToActor(a.id, 'Ralo'),
    /Multiple Contacts named/,
    'promoteFactionContactToActor must refuse to guess the Contact among duplicate same-named Contacts on the same Faction'
  );

  await assert.rejects(
    () => FactionRegistryService.deleteFactionContact('Exchange', contact.id),
    /Multiple Factions are named/,
    'deleteFactionContact must refuse to guess the parent Faction among duplicate same-named Factions'
  );
  await FactionRegistryService.deleteFactionContact(a.id, contact.id);
  assert.equal(FactionRegistryService.getFactionContacts(a.id).length, 1, 'only the intended Contact (by id) must be removed');
  assert.ok(FactionRegistryService.findFactionContact(a.id, duplicateNameContact.id), 'the other same-name Contact must be unaffected');
  pass('35 — upsertFactionContact/deleteFactionContact/promoteFactionContactToActor all refuse to guess among duplicate same-named Factions/Contacts, and resolve correctly (targeting only the intended record) by real id');
}

{
  // 36. migrateLegacyIdentities(): Contact ids are reserved/claimed in ONE
  // pool GLOBAL across the entire registry, not reset per-Faction -- two
  // DIFFERENT Factions' Contacts sharing the same legacy id (plausible
  // under the old name/role-derived id scheme) must both end up with
  // distinct ids, and the cross-Faction collision must be reported.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { id: 'faction-a', name: 'Alderaan Resistance', contacts: [{ id: 'legacy-rider', name: 'Rider', role: 'Scout' }] },
        { id: 'faction-b', name: 'Corellian Freighters', contacts: [{ id: 'legacy-rider', name: 'Rider', role: 'Pilot' }] }
      ]
    }
  });
  const migration = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(migration.changed, true);
  assert.equal(migration.collisions.length, 1, 'exactly one cross-Faction duplicate Contact id collision must be reported');
  assert.equal(migration.collisions[0].kind, 'contact');
  assert.equal(migration.collisions[0].duplicateId, 'legacy-rider');

  const allContacts = FactionRegistryService.getAllFactionContacts();
  assert.equal(new Set(allContacts.map(c => c.id)).size, 2, 'cross-Faction duplicate Contact ids must be made globally distinct, not just distinct within each Faction');
  assert.ok(FactionRegistryService.findFaction('faction-a'));
  assert.ok(FactionRegistryService.findFaction('faction-b'));
  pass('36 — migrateLegacyIdentities makes cross-Faction duplicate Contact ids globally unique (one pool registry-wide, not per-Faction) and reports the collision');
}

{
  // 37. migration id minting is collision-safe: every pre-existing id is
  // reserved BEFORE any minting starts, so an attempted mint collision
  // with a healthy pre-existing id retries rather than letting that
  // healthy record get treated as the duplicate and rewritten. The
  // missing-id Faction's NAME is chosen so its recovered-legacy-identity
  // candidate (slugify(name)) ITSELF collides with the healthy Faction's
  // real id ("abc123") -- forcing the fallback to mintUniqueId(), whose
  // own first randomID() draw is then ALSO forced to collide, proving the
  // retry-on-collision behavior at both layers.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { name: 'Abc123', contacts: [] }, // slugify('Abc123') === 'abc123' -- collides with the healthy id below
        { id: 'abc123', name: 'Healthy Faction', contacts: [] }
      ]
    }
  });
  let calls = 0;
  globalThis.foundry.utils.randomID = () => {
    calls += 1;
    return calls === 1 ? 'abc123' : `forced-${calls}`;
  };
  const migration = await FactionRegistryService.migrateLegacyIdentities();
  assert.equal(migration.changed, true);
  const registry = FactionRegistryService.getRegistry();
  const healthy = registry.find(f => f.name === 'Healthy Faction');
  const migrated = registry.find(f => f.name === 'Abc123');
  assert.equal(healthy.id, 'abc123', 'the healthy pre-existing id must survive even though the other record\'s recovered-legacy-identity candidate was the exact same text');
  assert.notEqual(migrated.id, 'abc123', 'the missing-id record must never end up with the colliding value');
  assert.ok(migrated.id, 'the missing-id record must still receive a real id');
  assert.equal(migration.migratedFactions.find(m => m.name === 'Abc123')?.recoveredLegacyIdentity, false, 'recovering the legacy candidate must be refused once it is found to collide with a healthy id');
  assert.equal(calls, 2, 'mintUniqueId() must retry exactly once after its own forced collision');
  pass('37 — migration id minting is collision-safe at both layers: a legacy-candidate collision with a healthy id falls back to mintUniqueId(), whose own forced mint collision also retries rather than letting the healthy id be treated as the duplicate');
  globalThis.foundry.utils.randomID = () => `rid-${++ridCounter}`;
}

{
  // 38. structural regression guard: GMLocationsSurfaceController's Atlas
  // lead reveal must resolve revealFactionIds/revealContactIds by exact id
  // only, never a display-name fallback -- the fields are literally named
  // "...Ids" and the UI labels the contact field "Reveal Contact ids on
  // success". (The identity mechanism itself -- exact-id-only resolution --
  // is already fully proven at the FactionRegistryService level above;
  // this guards the specific caller independent review flagged, without
  // importing the full UI controller's heavier render/host dependency
  // graph into this identity-focused test file.)
  const fs = await import('node:fs');
  const locationsControllerSrc = fs.readFileSync(
    new URL('../scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', import.meta.url),
    'utf8'
  );
  assert.ok(!locationsControllerSrc.includes('contact.name === contactId'), 'Atlas lead Contact reveal must never fall back to matching a Contact by display name');
  assert.match(locationsControllerSrc, /find\(entry => entry\.id === factionId\)/, 'Atlas lead Faction reveal must resolve by exact id only');
  pass('38 — GMLocationsSurfaceController Atlas lead reveal resolves revealFactionIds/revealContactIds by exact id only, with no display-name fallback (structural regression guard)');
}

// Functional replica of GMJobBoardSurfaceController#_saveClientAsContact()'s
// round-4 algorithm, proven against the real FactionRegistryService:
//   explicit factionId  -> exact Faction, or FAIL (never guessed from name)
//   no factionId        -> free-text Faction compatibility resolution
//                           (resolveOrCreateFactionByName -- unchanged,
//                           documented legacy/input seam)
//   explicit contactId  -> exact Contact under the resolved Faction, or FAIL
//                           (a stale id, or one that belongs to a different
//                           Faction, must throw -- never silently fall
//                           through to creating a new Contact)
//   no contactId        -> ALWAYS create a new Contact
// Display text (a name, even tag-gated) NEVER decides canonical Contact
// sameness anywhere in this method. CORRECTION PASS round 4 (independent
// re-re-re-re-review): the explicit-id branches resolve EXACT-ID-ONLY
// (resolveFactionByIdForMutation / resolveFactionContactByIdsForMutation) --
// never through the PERMISSIVE id-or-unique-name resolvers, which would let
// a stale/deleted id be silently "rescued" by some OTHER record whose
// display name happens to equal the queried id string.
async function saveClientAsContactLike({ factionId = '', factionName = '', contactId = '', clientName = '' } = {}) {
  const explicitFactionId = String(factionId || '').trim();
  const explicitContactId = String(contactId || '').trim();
  let faction;
  if (explicitFactionId) {
    faction = FactionRegistryService.resolveFactionByIdForMutation(explicitFactionId);
    if (!faction) throw new Error('The selected issuer Faction could not be found.');
  } else {
    faction = await FactionRegistryService.resolveOrCreateFactionByName(factionName, { source: 'job' });
  }
  let existingContactId = '';
  if (explicitContactId) {
    const contactResolution = FactionRegistryService.resolveFactionContactByIdsForMutation(faction.id, explicitContactId);
    if (!contactResolution.contact) throw new Error('The selected issuer Contact could not be found on this Faction.');
    existingContactId = contactResolution.contact.id;
  }
  return FactionRegistryService.upsertFactionContact(faction.id, { id: existingContactId, name: clientName, role: 'Job Contact', tags: ['job-board', 'reusable-contact'] });
}

{
  // 39. CORRECTION PASS round 4: the free-text (no explicit contactId) path
  // must ALWAYS create a new Contact -- it must NEVER reuse an existing
  // Contact based on name, even tag-gated. Two free-text saves of the same
  // name must produce two DISTINCT Contacts; selecting the first one later
  // via its real, already-known contactId must update exactly that
  // Contact; multiple same-name reusable Contacts must coexist safely; an
  // ordinary same-name dossier Contact must remain untouched.
  installFreshRegistry();
  const first = await saveClientAsContactLike({ factionName: 'Kuati Drive Yards', clientName: 'Moff Rancit' });
  const second = await saveClientAsContactLike({ factionName: 'Kuati Drive Yards', clientName: 'Moff Rancit' });
  assert.notEqual(second.contact.id, first.contact.id, 'two free-text saves of the same name must NEVER be silently merged -- each free-text save must create its own new Contact');
  assert.equal(FactionRegistryService.getFactionContacts(first.faction.id).length, 2, 'both free-text saves must persist as two distinct Contacts');

  // Selecting the first Contact later via its real, already-known
  // contactId must update exactly that Contact, never spawn a third or
  // touch the second.
  const reselectedFirst = await saveClientAsContactLike({
    factionId: first.faction.id, contactId: first.contact.id, factionName: 'Kuati Drive Yards', clientName: 'Moff Rancit (confirmed)'
  });
  assert.equal(reselectedFirst.contact.id, first.contact.id, 'selecting the first Contact later via its explicit contactId must update exactly that Contact');
  assert.equal(reselectedFirst.contact.name, 'Moff Rancit (confirmed)', 'the explicit-contactId update must actually apply');
  assert.equal(FactionRegistryService.getFactionContacts(first.faction.id).length, 2, 'reselecting an existing Contact by its real id must not create a third Contact');
  const stillSecond = FactionRegistryService.findFactionContact(first.faction.id, second.contact.id)?.contact;
  assert.equal(stillSecond.name, 'Moff Rancit', 'the second, distinct same-name Contact must be completely untouched by an update explicitly targeted at the first via its own id');

  // An ordinary dossier Contact (built by the GM through the Faction
  // editor, no reusable-contact tags) that merely shares a name must NOT
  // be silently overwritten by a Job Board free-text save.
  const faction2 = await FactionRegistryService.upsertFaction({ name: 'Exchange' });
  const { contact: dossierContact } = await FactionRegistryService.upsertFactionContact(faction2.id, {
    name: 'Mira', role: 'Intelligence Chief', gmNotes: 'Long-running dossier NPC, not a Job Board contact.'
  });
  const jobSaved = await saveClientAsContactLike({ factionName: 'Exchange', clientName: 'Mira' });
  assert.notEqual(jobSaved.contact.id, dossierContact.id, 'a Job Board free-text save must never overwrite an ordinary same-name dossier Contact');
  const stillDossier = FactionRegistryService.findFactionContact(faction2.id, dossierContact.id)?.contact;
  assert.equal(stillDossier.gmNotes, 'Long-running dossier NPC, not a Job Board contact.', 'the ordinary dossier Contact must be completely untouched');
  assert.equal(FactionRegistryService.getFactionContacts(faction2.id).length, 2, 'the dossier Contact and the new Job Board Contact must coexist as distinct records');
  pass('39 — CORRECTION PASS round 4: the Job Board free-text save path ALWAYS creates a new Contact and never reuses one by name (even tag-gated); an explicit contactId is the only way to target an existing Contact for update, and does so exactly, leaving every other same-name Contact — reusable or dossier — untouched (verified against the real FactionRegistryService)');
}

{
  // 39a. CORRECTION PASS round 4, point A: a valid factionId paired with a
  // STALE contactId (one that no longer resolves to any Contact on that
  // Faction) must FAIL outright -- never silently fall through to
  // creating a new Contact.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  let threw = null;
  try {
    await saveClientAsContactLike({ factionId: faction.id, contactId: 'stale-contact-id-does-not-exist', factionName: 'Black Sun', clientName: 'Prince Xizor' });
  } catch (err) {
    threw = err;
  }
  assert.ok(threw, 'a stale/unresolvable explicit contactId must throw, never silently fall through to creating a new Contact');
  assert.match(String(threw?.message), /could not be found/i);
  assert.equal(FactionRegistryService.getFactionContacts(faction.id).length, 0, 'a stale contactId failure must create NO Contact at all');
  pass('39a — a valid factionId with a stale/unresolvable contactId throws and creates no Contact (round 4, point A)');
}

{
  // 39b. CORRECTION PASS round 4, point A (cross-Faction case): a
  // factionId that resolves to Faction A, paired with a contactId that
  // actually belongs to Faction B, must FAIL -- never silently create a
  // new Contact on A, and must leave B's real Contact completely
  // untouched.
  installFreshRegistry();
  const factionA = await FactionRegistryService.upsertFaction({ name: 'Trade Federation' });
  const factionB = await FactionRegistryService.upsertFaction({ name: 'Corporate Alliance' });
  const { contact: contactOnB } = await FactionRegistryService.upsertFactionContact(factionB.id, { name: 'Nute Gunray', role: 'Viceroy' });
  let threw = null;
  try {
    await saveClientAsContactLike({ factionId: factionA.id, contactId: contactOnB.id, factionName: 'Trade Federation', clientName: 'Nute Gunray' });
  } catch (err) {
    threw = err;
  }
  assert.ok(threw, 'a contactId belonging to a different Faction than the resolved factionId must throw, never silently create a new Contact on the wrong Faction');
  assert.match(String(threw?.message), /could not be found/i);
  assert.equal(FactionRegistryService.getFactionContacts(factionA.id).length, 0, 'no Contact must be created on Faction A from a Faction-B contactId failure');
  const stillOnB = FactionRegistryService.findFactionContact(factionB.id, contactOnB.id)?.contact;
  assert.equal(stillOnB.role, 'Viceroy', 'Faction B\'s real Contact must be completely untouched by the failed cross-Faction save attempt');
  assert.equal(FactionRegistryService.getFactionContacts(factionB.id).length, 1, 'Faction B must retain exactly its own one Contact, no duplicate or side effect');
  pass('39b — a factionId for Faction A paired with a contactId belonging to Faction B throws, creates no Contact on A, and leaves B\'s Contact untouched (round 4, point A)');
}

// ---------------------------------------------------------------------
// CORRECTION PASS round 4 continued (independent re-re-re-re-review):
// tests 39a/39b above proved a stale id fails when the stale STRING
// matches no display name either -- but resolveFactionForMutation()/
// resolveFactionContactForMutation() are PERMISSIVE id-or-unique-name
// resolvers, so a stale id that happens to collide with some OTHER
// record's DISPLAY NAME would previously be silently "rescued" by that
// other record instead of failing. 39c-39e construct that exact
// adversarial collision and prove the new EXACT-ID-ONLY resolvers
// (resolveFactionByIdForMutation / resolveFactionContactByIdsForMutation)
// close it.
// ---------------------------------------------------------------------

{
  // 39c. point A (name-collision variant): a factionId with no exact
  // match must fail even when some OTHER Faction's DISPLAY NAME literally
  // equals the queried string.
  installFreshRegistry();
  const factionA = await FactionRegistryService.upsertFaction({ name: 'stale-faction-id' }); // NAME literally equals the id about to be queried
  assert.notEqual(factionA.id, 'stale-faction-id', 'sanity: the real minted id must not equal the display name used for this collision');

  const exactMiss = FactionRegistryService.resolveFactionByIdForMutation('stale-faction-id');
  assert.equal(exactMiss, null, 'resolveFactionByIdForMutation() must return null for an id with no exact match, even when some OTHER Faction is DISPLAY-NAMED exactly that string');

  let threw = null;
  try {
    await saveClientAsContactLike({ factionId: 'stale-faction-id', factionName: 'stale-faction-id', clientName: 'Someone New' });
  } catch (err) {
    threw = err;
  }
  assert.ok(threw, 'a factionId that only matches by NAME (never by real id) must throw, not silently resolve to the name-colliding Faction');
  assert.equal(FactionRegistryService.getFactionContacts(factionA.id).length, 0, 'the name-colliding Faction must receive NO Contact from the failed save');
  pass('39c — resolveFactionByIdForMutation()/_saveClientAsContact() never rescue a stale factionId by matching some other Faction\'s display name (round 4, point A: exact-id-only resolution)');
}

{
  // 39d. point B (name-collision variant): a contactId with no exact
  // match on the resolved Faction must fail even when some OTHER Contact
  // on that same Faction is DISPLAY-NAMED exactly the queried string.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Zann Consortium' });
  const { contact: nameCollisionContact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'stale-contact-id', role: 'Contact' });
  assert.notEqual(nameCollisionContact.id, 'stale-contact-id', 'sanity: the real minted Contact id must not equal the display name used for this collision');

  const exactMiss = FactionRegistryService.resolveFactionContactByIdsForMutation(faction.id, 'stale-contact-id');
  assert.equal(exactMiss.contact, null, 'resolveFactionContactByIdsForMutation() must return null for a contactId with no exact match, even when some OTHER Contact on the same Faction is DISPLAY-NAMED exactly that string');

  let threw = null;
  try {
    await saveClientAsContactLike({ factionId: faction.id, contactId: 'stale-contact-id', factionName: 'Zann Consortium', clientName: 'Someone New' });
  } catch (err) {
    threw = err;
  }
  assert.ok(threw, 'a contactId that only matches by NAME (never by real id) must throw, not silently resolve to the name-colliding Contact');
  const stillOriginal = FactionRegistryService.findFactionContact(faction.id, nameCollisionContact.id)?.contact;
  assert.equal(stillOriginal.role, 'Contact', 'the name-colliding Contact must be completely untouched by the failed save');
  assert.equal(FactionRegistryService.getFactionContacts(faction.id).length, 1, 'no new Contact must be created either -- the save must fail cleanly');
  pass('39d — resolveFactionContactByIdsForMutation()/_saveClientAsContact() never rescue a stale contactId by matching some other Contact\'s display name (round 4, point B: exact-id-only resolution)');
}

{
  // 39e. point C: Faction A holds a Contact whose NAME literally equals
  // Faction B's real Contact's id. Saving against Faction A with that
  // string as the explicit contactId must fail -- never resolve to the
  // name-colliding decoy on A, and never touch B's real Contact (out of
  // scope regardless, since resolution is scoped to Faction A).
  installFreshRegistry();
  const factionA = await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  const factionB = await FactionRegistryService.upsertFaction({ name: 'Zann Consortium' });
  const { contact: contactB } = await FactionRegistryService.upsertFactionContact(factionB.id, { name: 'Real Contact B', role: 'Handler' });
  const { contact: decoyOnA } = await FactionRegistryService.upsertFactionContact(factionA.id, { name: contactB.id, role: 'Decoy' }); // A's Contact is NAMED exactly B's real id

  let threw = null;
  try {
    await saveClientAsContactLike({ factionId: factionA.id, contactId: contactB.id, factionName: 'Black Sun', clientName: 'Someone New' });
  } catch (err) {
    threw = err;
  }
  assert.ok(threw, 'a contactId belonging to Faction B, queried against Faction A where another Contact is NAMED exactly that id, must throw -- never resolve to the name-colliding decoy on A');
  const stillDecoy = FactionRegistryService.findFactionContact(factionA.id, decoyOnA.id)?.contact;
  assert.equal(stillDecoy.role, 'Decoy', 'the name-colliding decoy Contact on Faction A must be completely untouched');
  assert.equal(FactionRegistryService.getFactionContacts(factionA.id).length, 1, 'no new Contact must be created on Faction A');
  const stillContactB = FactionRegistryService.findFactionContact(factionB.id, contactB.id)?.contact;
  assert.equal(stillContactB.role, 'Handler', 'Faction B\'s real Contact must remain completely untouched');
  assert.equal(FactionRegistryService.getFactionContacts(factionB.id).length, 1);
  pass('39e — a contactId belonging to a different Faction, when another Contact under the queried Faction happens to be NAMED exactly that id, throws rather than resolving to the name-colliding decoy (round 4, point C)');
}

{
  // 40. structural regression guard tying the replica back to the real
  // caller (round 4): _saveClientAsContact must resolve its free-text
  // Faction name via the ambiguity-safe resolver, and must NEVER assign an
  // existing Contact's id from entry.name/contactName equality anywhere in
  // the method -- with or without tags. The ONLY way to target an existing
  // Contact is an explicit, already-canonical contactId; when one is
  // supplied but does not resolve, the method must throw rather than fall
  // through to creating a new Contact. Also confirms the caller (the
  // contract-submit handler) still threads issuerFactionId/issuerContactId
  // through instead of discarding them.
  //
  // CORRECTION PASS round 4 (independent re-re-re-re-review): the two
  // explicit-id branches must resolve EXACT-ID-ONLY
  // (resolveFactionByIdForMutation / resolveFactionContactByIdsForMutation)
  // -- never through the PERMISSIVE id-or-unique-name
  // resolveFactionForMutation()/resolveFactionContactForMutation(), which
  // would let a stale/deleted id be silently rescued by some other
  // record's matching display name.
  const fs = await import('node:fs');
  const jobBoardControllerSrc = fs.readFileSync(
    new URL('../scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js', import.meta.url),
    'utf8'
  );
  assert.ok(jobBoardControllerSrc.includes('FactionRegistryService.resolveOrCreateFactionByName('), '_saveClientAsContact must resolve its free-text Faction name via the ambiguity-safe resolver, not FactionRegistryService.findFaction() directly');
  assert.ok(jobBoardControllerSrc.includes("factionId: text('issuerFactionId')") && jobBoardControllerSrc.includes("contactId: text('issuerContactId')"),
    'the contract-submit handler must pass the real canonical issuerFactionId/issuerContactId into _saveClientAsContact() rather than discarding them');

  const methodMatch = jobBoardControllerSrc.match(/async _saveClientAsContact\([\s\S]*?\n  _refreshContractWizardSummary/);
  assert.ok(methodMatch, 'must be able to isolate the _saveClientAsContact method body for structural inspection');
  const methodBody = methodMatch[0];
  assert.ok(!/entry\.name(?:\.toLowerCase\(\))?\s*===/.test(methodBody), '_saveClientAsContact must never compare entry.name to decide Contact identity');
  assert.ok(!methodBody.includes('contactName.toLowerCase() ==='), '_saveClientAsContact must never resolve an existing Contact by comparing contactName against a stored name -- an explicit contactId is the only way to target an existing Contact');
  assert.ok(!methodBody.includes("tags.includes('reusable-contact')") && !methodBody.includes("tags.includes('job-board')"),
    '_saveClientAsContact must no longer reuse a Contact via a tag-gated name search -- that legacy reuse-by-name path has been removed entirely');
  assert.ok(/if \(explicitContactId\)/.test(methodBody), '_saveClientAsContact must branch explicitly on whether a contactId was supplied');
  assert.ok(/if\s*\(!contactResolution\.contact\)\s*throw/.test(methodBody), '_saveClientAsContact must throw when an explicit contactId fails to resolve, never fall through to creating a new Contact');
  assert.ok(methodBody.includes('FactionRegistryService.resolveFactionByIdForMutation('), 'the explicit factionId branch must resolve via the EXACT-ID-ONLY resolveFactionByIdForMutation(), not a permissive id-or-name resolver');
  assert.ok(methodBody.includes('FactionRegistryService.resolveFactionContactByIdsForMutation('), 'the explicit contactId branch must resolve via the EXACT-ID-ONLY resolveFactionContactByIdsForMutation(), not a permissive id-or-name resolver');
  assert.ok(!methodBody.includes('FactionRegistryService.resolveFactionForMutation(') && !methodBody.includes('FactionRegistryService.resolveFactionContactForMutation('),
    '_saveClientAsContact must never use the PERMISSIVE id-or-unique-name resolvers for its already-canonical explicit factionId/contactId branches -- a stale id must fail, never be rescued by a same-named record');
  pass('40 — GMJobBoardSurfaceController._saveClientAsContact never assigns an existing Contact id from entry.name/contactName equality (tag-gated or not); its explicit factionId/contactId branches resolve EXACT-ID-ONLY and a failed resolution throws rather than silently creating one or falling back to a name match; the caller threads real issuer ids through (structural regression guard)');
}

{
  // 41. NEW (correction pass round 2): GMFactionRelationshipSurfaceController's
  // hide-contact action, and FactionIntelBridgeService.resolveFaction()/
  // resolveContact() (which feed a real Contact mutation via
  // #linkIntelToContact()'s linkedIntelIds write-back), must refuse to
  // guess among duplicate same-named Factions/Contacts rather than reading
  // -- and then mutating -- whichever one the flexible search helpers
  // happened to return first.
  installFreshRegistry();
  const a = await FactionRegistryService.upsertFaction({ name: 'Republic Intelligence' });
  const b = await FactionRegistryService.upsertFaction({ name: 'Republic Intelligence' });
  await FactionRegistryService.upsertFactionContact(a.id, { name: 'Handler', role: 'Case Officer' });

  const ambiguousFaction = FactionRegistryService.resolveFactionForMutation('Republic Intelligence');
  assert.equal(ambiguousFaction.ambiguous, true, 'resolveFactionForMutation must refuse to guess among duplicate same-named Factions');

  const ambiguousContact = FactionRegistryService.resolveFactionContactForMutation('Republic Intelligence', 'Handler');
  assert.equal(ambiguousContact.ambiguous, true, 'resolveFactionContactForMutation must refuse to guess the parent Faction among duplicate same-named Factions');
  assert.equal(ambiguousContact.ambiguousKind, 'faction');

  const unambiguousContact = FactionRegistryService.resolveFactionContactForMutation(a.id, 'Handler');
  assert.equal(unambiguousContact.ambiguous, false);
  assert.equal(unambiguousContact.contact.role, 'Case Officer', 'resolving by real Faction id must still correctly find the Contact by unique name');

  assert.throws(
    () => FactionIntelBridgeService.resolveFaction('Republic Intelligence'),
    /Multiple Factions match/,
    'FactionIntelBridgeService.resolveFaction() must refuse to guess among duplicate same-named Factions (it ultimately feeds a Contact mutation via #linkIntelToContact)'
  );
  const resolvedByIntelBridge = FactionIntelBridgeService.resolveFaction(a.id);
  assert.equal(resolvedByIntelBridge.id, a.id, 'FactionIntelBridgeService.resolveFaction() must still resolve correctly by real id');
  pass('41 — GMFactionRelationshipSurfaceController\'s hide-contact resolution and FactionIntelBridgeService.resolveFaction()/resolveContact() both refuse to guess among duplicate same-named Factions/Contacts before mutating');
}

// ---------------------------------------------------------------------
// CORRECTION PASS round 3 (independent re-re-review) 42-46
//
// Round 2 closed every remaining SEARCH-helper-feeds-a-mutation path, but
// round 3 found the Job Board's own fix still inferred Contact sameness
// from a (tag-gated) name match even when the contract form already had
// the real issuerFactionId/issuerContactId in hand -- and that
// FactionIntelBridgeService's Contact write-back, though routed through
// the new ambiguity-safe resolver at the top, still passed already-
// resolved REAL ids back through it, which was safe in practice but not
// yet proven against the one theoretical hazard the resolver exists to
// avoid (another record's NAME colliding with the target's real id).
// ---------------------------------------------------------------------

{
  // 42. selecting a known issuer (a real issuerContactId is already in
  // hand) and saving it for reuse must update EXACTLY that Contact --
  // never re-derived from name, even though the legacy tag-gated lookup
  // would have found the same record anyway here.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Kuati Drive Yards' });
  const { contact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Moff Rancit', role: 'Contact', tags: ['job-board', 'reusable-contact'] });
  const saved = await saveClientAsContactLike({ factionId: faction.id, contactId: contact.id, factionName: 'Kuati Drive Yards', clientName: 'Moff Rancit' });
  assert.equal(saved.contact.id, contact.id, 'an explicit issuerContactId must update exactly that Contact');
  assert.equal(FactionRegistryService.getFactionContacts(faction.id).length, 1, 'no duplicate must be created when the real Contact id was already known');
  pass('42 — selecting a known issuer and saving it for reuse updates the exact issuerContactId, never re-derived from name');
}

{
  // 43. (superseded premise, round 4: previously this proved that an
  // AMBIGUOUS free-text save creates a new Contact rather than guessing
  // between several same-name candidates. Round 4 replaced ambiguity-
  // sensitive guessing with an unconditional rule -- a free-text save with
  // no explicit contactId ALWAYS creates a new Contact, ambiguous or not
  // -- so this test now proves the stronger, simpler invariant: two
  // distinct Job Board reusable Contacts may share the same name without
  // either being overwritten, and a further free-text save of that same
  // name creates yet a THIRD distinct Contact rather than reusing any of
  // them.)
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Zann Consortium' });
  const { contact: contactOne } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Silri', role: 'Contact', tags: ['job-board', 'reusable-contact'] });
  const { contact: contactTwo } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Silri', role: 'Contact', tags: ['job-board', 'reusable-contact'] });
  assert.notEqual(contactOne.id, contactTwo.id);
  const thirdSave = await saveClientAsContactLike({ factionId: faction.id, factionName: 'Zann Consortium', clientName: 'Silri' });
  assert.notEqual(thirdSave.contact.id, contactOne.id, 'a free-text save (no explicit contactId) must never silently pick the first of several same-name reusable Contacts');
  assert.notEqual(thirdSave.contact.id, contactTwo.id, 'a free-text save (no explicit contactId) must never silently pick either of several same-name reusable Contacts');
  assert.equal(FactionRegistryService.getFactionContacts(faction.id).length, 3, 'all three same-name reusable Contacts must coexist as distinct records');
  pass('43 — two distinct Job Board reusable Contacts may share the same name without either being overwritten; a further free-text save unconditionally creates a new, distinct Contact instead of reusing or guessing among same-name candidates (round 4: no-contactId always means create)');
}

{
  // 44. duplicate same-name Factions do not cause a failure when a real
  // issuerFactionId is already available -- the explicit id must be used
  // authoritatively, bypassing the name-ambiguity entirely.
  installFreshRegistry();
  const a = await FactionRegistryService.upsertFaction({ name: 'Republic Intelligence' });
  await FactionRegistryService.upsertFaction({ name: 'Republic Intelligence' });
  const saved = await saveClientAsContactLike({ factionId: a.id, factionName: 'Republic Intelligence', clientName: 'Agent Kallus' });
  assert.equal(saved.faction.id, a.id, 'an explicit issuerFactionId must resolve directly to that Faction despite the ambiguous shared name');
  pass('44 — duplicate same-name Factions do not cause a failure when a real issuerFactionId is already available');
}

{
  // 45. Intel write-back regression: another Faction's DISPLAY NAME
  // literally equals the target Faction's real canonical id, and that
  // other Faction was created FIRST (earlier in the registry array) --
  // exactly the ordering hazard old findFaction()'s single combined-
  // condition .find() (record.id === query || ... || record.name...)
  // could fall into. #linkIntelToContact() now resolves through
  // resolveFactionContactForMutation() (exact id checked in its own pass
  // over the whole array, before any name fallback is even considered),
  // so the Intel link must land on the correct Faction/Contact regardless
  // of array order.
  //
  // CORRECTION PASS round 6 (independent re-re-re-re-re-review):
  // upsertFaction() no longer accepts a caller-chosen id for a record that
  // doesn't exist yet (that was itself the round-6 finding), so the
  // target Faction's deliberately-chosen id "faction-x" is now seeded
  // directly into the raw registry -- same pattern test 8 already uses --
  // rather than exercised through the public create path. This still
  // proves the identical hazard (decoy's NAME colliding with the target's
  // real id, decoy created first in array order); only the fixture
  // mechanism changed, per the production authority's own tightened
  // create/update contract.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { id: 'rid-decoy-45', name: 'faction-x', contacts: [] }, // name literally equals the target's real id; seeded FIRST in array order
        { id: 'faction-x', name: 'Faction X', contacts: [] }
      ]
    }
  });
  // CORRECTION PASS round 7 (independent re-review of round 6): findFaction()
  // itself was fixed to be id-priority-safe (see test 57) -- it no longer
  // needs to be avoided here the way this comment previously warned.
  // Fetched via the EXACT-ID-ONLY resolver regardless, since that remains
  // the correct tool for "I already have a real id and want it verified";
  // the assertion right below proves findFaction() is now ALSO safe for
  // this exact adversarial shape, closing the gap this test's own prior
  // comment used to document as still-open.
  const decoyFaction = FactionRegistryService.resolveFactionByIdForMutation('rid-decoy-45');
  const targetFaction = FactionRegistryService.resolveFactionByIdForMutation('faction-x');
  assert.equal(targetFaction.id, 'faction-x', 'sanity: the exact-id resolver must land on the real target, not the name-colliding decoy');
  assert.equal(FactionRegistryService.findFaction('faction-x').id, 'faction-x', 'round 7: findFaction() itself must now also resolve the real id-bearing target, never the name-colliding decoy seeded first in the array');
  const { contact } = await FactionRegistryService.upsertFactionContact(targetFaction.id, { name: 'Agent', role: 'Handler' });
  const record = await FactionIntelBridgeService.createDraftFromContact(targetFaction.id, contact.id, {});
  assert.ok(record?.id, 'creating the Intel draft (and its Contact write-back) must succeed');
  // Verify via the exact-id-safe resolver, not findFactionContact()/
  // getFactionContacts() -- both internally call the still-intentionally-
  // flexible findFaction(), which is the EXACT search helper this test's
  // decoy Faction is designed to fool (findFaction('faction-x') matches
  // the decoy's NAME before ever reaching the target's real id, since it
  // was created first and findFaction() is a single combined-condition
  // .find() over the whole array). Using it here would just reproduce the
  // bug in the test's own verification instead of proving the fix.
  // (the linked value is HolonetIntelService's own metadata id, not
  // necessarily record.id verbatim -- an unrelated pre-existing detail of
  // that service; what matters for identity hardening is that a link was
  // written, and written onto the correct id-targeted Contact.)
  const linkedContact = FactionRegistryService.resolveFactionContactForMutation(targetFaction.id, contact.id).contact;
  assert.equal(linkedContact.linkedIntelIds.length, 1, 'the Intel link must land on the correct (id-targeted) Faction\'s Contact');
  const decoyRegistryEntry = FactionRegistryService.getRegistry().find(entry => entry.id === decoyFaction.id);
  assert.equal(decoyRegistryEntry.contacts.length, 0, 'the decoy Faction (whose NAME collides with the target\'s real id) must be completely untouched');
  pass('45 — Intel Contact write-back resolves by exact id even when another Faction\'s display name collides with the target Faction\'s real canonical id and was created first');
}

{
  // 45b. CORRECTION PASS round 4 (independent re-re-re-re-review): the same
  // hazard 39c-39e proved for the Job Board applies to the Intel write-back
  // -- #linkIntelToContact() receives already-resolved canonical
  // faction.id/contact.id, so if either has gone stale by write-back time
  // it must fail closed, never be rescued by some OTHER Contact whose
  // DISPLAY NAME happens to equal the stale contactId. Directly exercises
  // #linkIntelToContact() via createDraftFromContact() with a contactOrId
  // string that collides with a decoy Contact's name on the SAME Faction.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Hutt Cartel' });
  const { contact: realContact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Jabba', role: 'Crime Lord' });
  const { contact: decoyContact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'stale-contact-id-not-real', role: 'Decoy' });

  // resolveContact() (the PERMISSIVE public entry point) is allowed to
  // resolve a real id normally -- confirm the draft is built from the
  // REAL Contact, then simulate a stale write-back id that only collides
  // with the decoy's NAME, never its own real id.
  const record = await FactionIntelBridgeService.createDraftFromContact(faction.id, realContact.id, {});
  assert.ok(record?.id, 'the initial, correctly-resolved draft/write-back must still succeed');
  const linkedReal = FactionRegistryService.resolveFactionContactByIdsForMutation(faction.id, realContact.id).contact;
  assert.equal(linkedReal.linkedIntelIds.length, 1, 'the real Contact must receive its Intel link');
  const decoyUntouched = FactionRegistryService.resolveFactionContactByIdsForMutation(faction.id, decoyContact.id).contact;
  assert.equal((decoyUntouched.linkedIntelIds || []).length, 0, 'the name-colliding decoy Contact must never receive a link meant for a stale id that happens to equal its display name');
  pass('45b — FactionIntelBridgeService Contact write-back never rescues a stale/mismatched id by matching another Contact\'s display name (round 4)');
}

{
  // 46. structural regression guard: #linkIntelToContact() must resolve
  // through resolveFactionContactByIdsForMutation() (EXACT-ID-ONLY), not
  // the flexible findFactionContact() search helper, and not the
  // PERMISSIVE resolveFactionContactForMutation() either -- the ids it
  // receives are already canonical, so a stale one must fail rather than
  // ever being rescued by a same-named record.
  const fs = await import('node:fs');
  const intelBridgeSrc = fs.readFileSync(
    new URL('../scripts/ui/shell/gm/FactionIntelBridgeService.js', import.meta.url),
    'utf8'
  );
  assert.ok(intelBridgeSrc.includes('FactionRegistryService.resolveFactionContactByIdsForMutation('), '#linkIntelToContact() must resolve its write-back target via the EXACT-ID-ONLY mutation resolver');
  assert.ok(!/#linkIntelToContact[\s\S]{0,400}FactionRegistryService\.findFactionContact\(/.test(intelBridgeSrc), '#linkIntelToContact() must not fall back to the flexible findFactionContact() search helper');
  assert.ok(!/#linkIntelToContact[\s\S]{0,400}FactionRegistryService\.resolveFactionContactForMutation\(/.test(intelBridgeSrc), '#linkIntelToContact() must not use the PERMISSIVE id-or-unique-name resolveFactionContactForMutation() -- its ids are already canonical and a stale one must fail, never be rescued by a same-named record');
  pass('46 — FactionIntelBridgeService#linkIntelToContact() resolves its Contact write-back target via the EXACT-ID-ONLY resolveFactionContactByIdsForMutation(), never findFactionContact() or the permissive resolveFactionContactForMutation() (structural regression guard)');
}

// ---------------------------------------------------------------------
// CORRECTION PASS round 6 (independent re-re-re-re-re-review): the
// canonical authority itself, not just its callers, must refuse to let an
// UNKNOWN supplied id become the id of a newly-created record. Before this
// round, upsertFaction()/upsertFactionContact() computed
// `existing?.id || requestedId || randomId()` -- an explicit id that
// didn't match any existing record fell through to being used AS the new
// record's id, silently materializing a canonical identity the caller
// merely guessed at (a stale id, a deleted record's old id, or outright
// fabricated text). That is the same class of leak rounds 1-5 closed at
// every CALLER; round 6 closes it at the AUTHORITY's own creation/update
// boundary, where no caller-level fix can help. New contract:
//   id supplied, matches an existing record -> update exactly that record
//   id supplied, matches NOTHING            -> FAIL (never create with it)
//   no id supplied                          -> CREATE, authority mints id
// An audit of every production caller (addActorRelationship,
// updateActorRelationship, applyScoreDelta, approveSuggestedFaction, and
// every UI/controller upsert call site) found none legitimately depends on
// create-with-caller-chosen-id, so the four internal fallback call sites
// that used to pass a possibly-stale id through were tightened to match --
// no legacy-materialization compatibility seam was needed.
// ---------------------------------------------------------------------

{
  // 47. point A: upsertFaction() with an id that matches no existing
  // Faction must FAIL outright -- never silently create a new Faction
  // using that caller-supplied id.
  installFreshRegistry();
  await assert.rejects(
    () => FactionRegistryService.upsertFaction({ id: 'does-not-exist', name: 'Test' }),
    /No Faction exists with id/,
    'upsertFaction() must refuse to create a new Faction using an unknown caller-supplied id'
  );
  assert.equal(FactionRegistryService.getRegistry().length, 0, 'the registry must be completely unchanged after the failed create-with-unknown-id attempt');
  pass('47 — upsertFaction() with an id matching no existing Faction throws rather than creating a new Faction under that id (round 6, point A)');
}

{
  // 48. point B: upsertFactionContact() with an id that matches no
  // existing Contact on the resolved Faction must FAIL outright -- never
  // silently create a new Contact using that caller-supplied id.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Kuati Drive Yards' });
  await assert.rejects(
    () => FactionRegistryService.upsertFactionContact(faction.id, { id: 'does-not-exist', name: 'Test Contact' }),
    /No Contact exists with id/,
    'upsertFactionContact() must refuse to create a new Contact using an unknown caller-supplied id'
  );
  assert.equal(FactionRegistryService.getFactionContacts(faction.id).length, 0, 'no Contact may be created from the failed create-with-unknown-id attempt');
  pass('48 — upsertFactionContact() with an id matching no existing Contact throws rather than creating a new Contact under that id (round 6, point B)');
}

{
  // 49. point C: addActorRelationship() with an explicit factionId that
  // matches no existing Faction must FAIL -- never silently materialize a
  // new Faction under that stale/fabricated id. The frozen name-only
  // creation path (no factionId at all) must still work, and the newly
  // created Faction must receive an authority-minted id, never the id (or
  // name text) the caller happened to guess.
  const actor = makeFakeActor({ id: 'pc-47' });
  installFreshRegistry({ actors: [actor] });
  await assert.rejects(
    () => FactionRegistryService.addActorRelationship({ actor, factionId: 'does-not-exist', factionName: 'Ghost Faction' }),
    /No Faction exists with id/,
    'addActorRelationship() must refuse to materialize a new Faction from an explicit factionId that matches nothing'
  );
  assert.equal(FactionRegistryService.getRegistry().length, 0, 'no Faction may be created from the failed explicit-factionId attempt');
  assert.equal(FactionRegistryService.getActorRelationships(actor).length, 0, 'no relationship may be created either');

  const created = await FactionRegistryService.addActorRelationship({ actor, factionName: 'New Contacts Guild' });
  assert.ok(created.factionId, 'the name-only creation path must still work with no factionId supplied');
  const mintedFaction = FactionRegistryService.findFaction(created.factionId);
  assert.notEqual(mintedFaction.id, 'New Contacts Guild', 'the newly created Faction must receive an authority-minted id, never caller-guessed or name-derived text');
  pass('49 — addActorRelationship() refuses to materialize a Faction from an unresolvable explicit factionId; the name-only creation path still works and mints its own id (round 6, point C)');
}

{
  // 50. updateActorRelationship(): a stale explicit factionId on an
  // EXISTING relationship (the Faction it once pointed to was since
  // deleted) must FAIL, never silently resurrect a new Faction under that
  // stale id.
  const actor = makeFakeActor({ id: 'pc-48' });
  installFreshRegistry({ actors: [actor] });
  const faction = await FactionRegistryService.upsertFaction({ name: 'Offworld Mining Guild' });
  const relationship = await FactionRegistryService.addActorRelationship({ actor, faction, relationshipType: 'known' });
  await FactionRegistryService.deleteFaction(faction.id);

  await assert.rejects(
    () => FactionRegistryService.updateActorRelationship(actor, relationship.id, { notes: 'still tracking them' }),
    /No Faction exists with id/,
    'updateActorRelationship() must refuse to resurrect a deleted Faction under its old, now-stale id'
  );
  assert.equal(FactionRegistryService.getRegistry().length, 0, 'no Faction may be re-created from the stale relationship factionId');
  pass('50 — updateActorRelationship() refuses to resurrect a deleted Faction from a stale relationship factionId (round 6, point C variant)');
}

{
  // 51. point D: applyScoreDelta() with an explicit factionId that
  // matches no existing Faction must fail SOFT (return null, log),
  // consistent with this method's existing batch-safe contract -- never
  // fabricate a new Faction under that stale id.
  const actor = makeFakeActor({ id: 'pc-49' });
  installFreshRegistry({ actors: [actor] });
  const result = await FactionRegistryService.applyScoreDelta({ actor, factionId: 'does-not-exist', factionName: 'Ghost Faction', delta: 5, source: 'job' });
  assert.equal(result, null, 'applyScoreDelta must fail soft (return null) when the explicit factionId matches no existing Faction');
  assert.equal(FactionRegistryService.getRegistry().length, 0, 'no Faction may be created from the failed explicit-factionId attempt');
  assert.equal(FactionRegistryService.getActorRelationships(actor).length, 0, 'no relationship may be created either');
  pass('51 — applyScoreDelta() fails soft (no Faction created, no relationship created) when the explicit factionId matches no existing Faction (round 6, point D)');
}

{
  // 52. point E: approveSuggestedFaction() carrying a stale factionId
  // (one that matches no existing Faction) must FAIL -- never create a
  // new Faction under that stale id.
  const actor = makeFakeActor({ id: 'pc-50' });
  installFreshRegistry({ actors: [actor] });
  await actor.setFlag('foundryvtt-swse', 'factions', [{ id: 'sugg-stale', name: 'Stale Suggestion', factionId: 'does-not-exist', status: 'pending_approval' }]);
  await assert.rejects(
    () => FactionRegistryService.approveSuggestedFaction({ actorId: actor.id, factionRecordId: 'sugg-stale' }),
    /No Faction exists with id/,
    'approveSuggestedFaction() must refuse to create a new Faction from a stale factionId carried by the suggestion'
  );
  assert.equal(FactionRegistryService.getRegistry().length, 0, 'no Faction may be created from the stale suggestion factionId');
  pass('52 — approveSuggestedFaction() refuses to create a Faction from a stale factionId carried by the suggestion (round 6, point E)');
}

{
  // 53. point F: the frozen name-only Job-consequence compatibility path
  // (applyScoreDelta with only a factionName, no factionId) must still
  // work exactly as before -- and if it needs to create a Faction, that
  // Faction gets an authority-minted random id, never slug/name/caller-
  // provided identity.
  const actor = makeFakeActor({ id: 'pc-51' });
  installFreshRegistry({ actors: [actor] });
  const result = await FactionRegistryService.applyScoreDelta({ actor, factionName: 'Offworld Salvage Consortium', delta: 5, source: 'job' });
  assert.ok(result, 'the name-only Job-consequence creation path must still work with no factionId supplied');
  const mintedFaction = FactionRegistryService.findFaction(result.factionId);
  assert.ok(mintedFaction, 'the newly created Faction must be findable by its minted id');
  assert.notEqual(mintedFaction.id, 'Offworld Salvage Consortium', 'the newly created Faction must receive an authority-minted id, never name-derived or caller-provided text');
  pass('53 — the frozen name-only Job-consequence path still works and creates its Faction with an authority-minted id (round 6, point F)');
}

{
  // 54. structural regression guard: none of the four internal fallback
  // call sites inside FactionRegistryService may pass a possibly-
  // unresolved id through to upsertFaction() as a create-with-this-id
  // request. Also confirms the two authority-level hard failures exist.
  const fs = await import('node:fs');
  const registrySrc = fs.readFileSync(
    new URL('../scripts/allies/faction-registry-service.js', import.meta.url),
    'utf8'
  );
  assert.ok(registrySrc.includes('No Faction exists with id'), 'upsertFaction() must throw when a supplied id matches no existing Faction');
  assert.ok(registrySrc.includes('No Contact exists with id'), 'upsertFactionContact() must throw when a supplied id matches no existing Contact');
  assert.ok(!registrySrc.includes('await this.upsertFaction({ id: factionId, name: factionName, source })'), 'addActorRelationship() must no longer pass an unresolved factionId through to upsertFaction()');
  assert.ok(!registrySrc.includes('id: data.factionId || existing.factionId'), 'updateActorRelationship() must no longer pass an unresolved factionId through to upsertFaction()');
  assert.ok(!registrySrc.includes("id: factionId || '', name: factionLabel"), 'applyScoreDelta() must no longer pass an unresolved factionId through to upsertFaction()');
  assert.ok(!registrySrc.includes('id: merged.factionId || resolution.faction?.id'), 'approveSuggestedFaction() must no longer pass an unresolved factionId through to upsertFaction()');
  pass('54 — none of FactionRegistryService\'s four internal fallback call sites pass a possibly-unresolved id through to upsertFaction(); the authority itself throws on an unknown supplied id at both upsertFaction() and upsertFactionContact() (structural regression guard)');
}

// ---------------------------------------------------------------------
// CORRECTION PASS round 7 (independent re-review of round 6's exact head
// commit): round 6 closed the authority's create/update boundary, but
// three further issues surfaced:
//   1. ordinary create still minted ids via plain randomId(), not the
//      structurally collision-safe mintUniqueId() migration already uses
//   2. findFaction()/findFactionContact() (the flexible SEARCH helpers)
//      could let an EARLIER record's display name shadow a LATER record's
//      real canonical id, via a single combined .find() predicate
//   3. a few callers with genuinely SEPARATE id/name fields still
//      collapsed them into one `id || name` string before resolving,
//      losing the "a real id field must never fall back to a name match"
//      distinction one layer above the (now-fixed) search helpers
// ---------------------------------------------------------------------

{
  // 55. point 1a: ordinary Faction creation must be structurally
  // collision-safe (mintUniqueId), not merely "randomID() is
  // astronomically unlikely to repeat" -- the same standard
  // migrateLegacyIdentities() already holds itself to. Force the first
  // randomID() draw for a brand-new Faction to collide with an
  // already-existing healthy Faction's id.
  installFreshRegistry();
  const healthy = await FactionRegistryService.upsertFaction({ name: 'Existing Faction' });
  let calls = 0;
  globalThis.foundry.utils.randomID = () => {
    calls += 1;
    return calls === 1 ? healthy.id : `forced-faction-${calls}`;
  };
  const created = await FactionRegistryService.upsertFaction({ name: 'New Faction' });
  assert.notEqual(created.id, healthy.id, 'a forced randomID() collision on ordinary creation must never let the new Faction share the existing Faction\'s id');
  // (Not asserting an exact global call count: upsertFaction() also draws
  // a separate randomId() for its history-entry id after the canonical id
  // is minted, an unrelated implementation detail. What matters is that
  // the id-minting retry produced exactly the next drawn value.)
  assert.equal(created.id, 'forced-faction-2', 'mintUniqueId() must retry after its own forced collision and use the very next drawn value');
  const registry = FactionRegistryService.getRegistry();
  assert.equal(registry.length, 2);
  assert.equal(new Set(registry.map(r => r.id)).size, 2, 'the registry must contain two structurally unique Faction ids');
  pass('55 — ordinary Faction creation mints a structurally collision-safe id (mintUniqueId), retrying rather than silently sharing an existing Faction\'s id on a forced randomID() collision (round 7, point 1)');
  globalThis.foundry.utils.randomID = () => `rid-${++ridCounter}`;
}

{
  // 56. point 1b: ordinary Contact creation must be structurally
  // collision-safe REGISTRY-GLOBALLY -- migrateLegacyIdentities() already
  // established Contact ids as one pool across every Faction, not merely
  // unique within the parent Faction. Force the first randomID() draw for
  // a new Contact on Faction B to collide with an existing Contact's id
  // on a DIFFERENT Faction (A).
  installFreshRegistry();
  const factionA = await FactionRegistryService.upsertFaction({ name: 'Faction A' });
  const factionB = await FactionRegistryService.upsertFaction({ name: 'Faction B' });
  const { contact: contactOnA } = await FactionRegistryService.upsertFactionContact(factionA.id, { name: 'Contact On A', role: 'Handler' });
  let calls = 0;
  globalThis.foundry.utils.randomID = () => {
    calls += 1;
    return calls === 1 ? contactOnA.id : `forced-contact-${calls}`;
  };
  const { contact: contactOnB } = await FactionRegistryService.upsertFactionContact(factionB.id, { name: 'Contact On B', role: 'Handler' });
  assert.notEqual(contactOnB.id, contactOnA.id, 'a forced randomID() collision with another Faction\'s Contact id must never let the new Contact share it');
  assert.equal(calls, 2, 'mintUniqueId() must retry exactly once after its own forced collision');
  const allContactIds = FactionRegistryService.getAllFactionContacts().map(c => c.id);
  assert.equal(new Set(allContactIds).size, allContactIds.length, 'getAllFactionContacts() must report globally unique Contact ids across every Faction');
  pass('56 — ordinary Contact creation mints a structurally collision-safe id REGISTRY-GLOBALLY (reserving every Contact id across every Faction), retrying rather than silently sharing another Faction\'s Contact id on a forced randomID() collision (round 7, point 1)');
  globalThis.foundry.utils.randomID = () => `rid-${++ridCounter}`;
}

{
  // 57. point 2: findFaction() -- the flexible, intentionally
  // name-capable SEARCH helper -- must never let an EARLIER record's
  // DISPLAY NAME shadow a LATER record's real canonical id. A single
  // combined .find() evaluates every OR-branch per record in array order,
  // so a decoy Faction named exactly the target's real id, seeded FIRST,
  // used to win. This is the exact hazard test 45 above had to route
  // around; after this fix, findFaction() itself is safe.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { id: 'decoy-id-57', name: 'faction-x-57', contacts: [] },
        { id: 'faction-x-57', name: 'Actual Faction 57', contacts: [] }
      ]
    }
  });
  const resolved = FactionRegistryService.findFaction('faction-x-57');
  assert.equal(resolved.id, 'faction-x-57', 'findFaction() must resolve the real id-bearing Faction even when an earlier Faction\'s display name equals the queried id');
  assert.equal(resolved.name, 'Actual Faction 57');
  const byName = FactionRegistryService.findFaction('Actual Faction 57');
  assert.equal(byName.id, 'faction-x-57', 'name search must still work once no id matches the query');
  pass('57 — findFaction() always resolves a real canonical id before ever trying a display-name/slug match, even when an earlier record\'s NAME equals a later record\'s real id (round 7, point 2)');
}

{
  // 58. same id-priority precedence, one layer down: findFactionContact()
  // must never let an EARLIER Contact's DISPLAY NAME shadow a LATER
  // Contact's real canonical id on the same Faction.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [{
        id: 'faction-58', name: 'Zann Consortium',
        contacts: [
          { id: 'decoy-contact-58', name: 'contact-x-58' },
          { id: 'contact-x-58', name: 'Actual Contact 58' }
        ]
      }]
    }
  });
  const resolved = FactionRegistryService.findFactionContact('faction-58', 'contact-x-58');
  assert.ok(resolved, 'findFactionContact() must resolve a match');
  assert.equal(resolved.contact.id, 'contact-x-58', 'findFactionContact() must resolve the real id-bearing Contact even when an earlier Contact\'s display name equals the queried id');
  assert.equal(resolved.contact.name, 'Actual Contact 58');
  const byName = FactionRegistryService.findFactionContact('faction-58', 'Actual Contact 58');
  assert.equal(byName.contact.id, 'contact-x-58', 'name search must still work once no id matches the query');
  pass('58 — findFactionContact() always resolves a real canonical Contact id before ever trying a display-name match, even when an earlier Contact\'s NAME equals a later Contact\'s real id (round 7, point 2)');
}

{
  // 59. point 3: FactionJobBridgeService.buildDraftFromFaction() accepts
  // a string and resolves it through findFaction() -- now that
  // findFaction() itself is id-priority-safe (test 57), the resulting Job
  // draft's issuer.factionId must reflect the exact target Faction even
  // when an earlier Faction's display name equals the queried id. Not
  // merely presentation: this id gets copied into a persisted Job's
  // issuer fields.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { id: 'decoy-id-59', name: 'faction-x-59', contacts: [] },
        { id: 'faction-x-59', name: 'Actual Faction 59', contacts: [] }
      ]
    }
  });
  const draft = FactionJobBridgeService.buildDraftFromFaction('faction-x-59');
  assert.equal(draft.issuer.factionId, 'faction-x-59', 'the Job draft must carry the exact id-bearing Faction\'s id, never the name-colliding decoy\'s');
  assert.equal(draft.issuer.factionName, 'Actual Faction 59');
  pass('59 — FactionJobBridgeService.buildDraftFromFaction() resolves the exact id-bearing Faction even when an earlier Faction\'s display name equals the queried id (round 7, point 3)');
}

{
  // 60. same hazard one layer down, for FactionJobBridgeService's OWN
  // Contact-array lookup: buildDraftFromContact() does NOT go through
  // FactionRegistryService.findFactionContact() -- it resolves against
  // faction.contacts directly, so it needed its own id-priority fix
  // (resolveContactByIdThenName()).
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Zann Consortium' });
  const { contact: decoyContact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'will-be-real-id-60', role: 'Decoy' });
  const { contact: realContact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Real Contact 60', role: 'Handler' });
  // Rename the decoy (seeded FIRST, so it sorts earlier in the array) so
  // its NAME now literally equals the real Contact's id -- exactly the
  // ordering hazard a naive combined id-or-name .find() falls into.
  await FactionRegistryService.upsertFactionContact(faction.id, { id: decoyContact.id, name: realContact.id, role: 'Decoy' });

  const draft = FactionJobBridgeService.buildDraftFromContact(faction.id, realContact.id);
  assert.equal(draft.issuer.contactId, realContact.id, 'the Job draft must carry the exact id-bearing Contact\'s id, never the name-colliding decoy\'s');
  assert.equal(draft.issuer.contactName, 'Real Contact 60');
  pass('60 — FactionJobBridgeService.buildDraftFromContact() resolves the exact id-bearing Contact even when an earlier Contact\'s display name equals the queried id (round 7, point 3)');
}

{
  // 61. LocationJobBridgeService resolves a Location's
  // controllingFactionId display name through
  // FactionRegistryService.findFaction() -- inherits the round-7
  // id-priority fix automatically; proven directly here since this is a
  // real, if easy-to-miss, cross-domain read path (a Location could
  // otherwise carry the correct controllingFactionId while its generated
  // Job draft displayed the WRONG Faction's name).
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { id: 'decoy-id-61', name: 'faction-x-61', contacts: [] },
        { id: 'faction-x-61', name: 'Actual Faction 61', contacts: [] }
      ]
    }
  });
  const location = { id: 'loc-61', name: 'Contested Outpost', controllingFactionId: 'faction-x-61', parentLocationId: '' };
  const draft = LocationJobBridgeService.buildDraftFromLocation(location);
  assert.equal(draft.issuer.factionId, 'faction-x-61');
  assert.equal(draft.client.factionName, 'Actual Faction 61', 'the Location lead must display the exact id-bearing Faction\'s name, never a name-colliding decoy Faction\'s');
  pass('61 — LocationJobBridgeService resolves a controllingFactionId\'s display name through the id-priority-safe findFaction(), never a name-colliding decoy Faction (round 7, point 3)');
}

{
  // 62. structural regression guard: FactionJobBridgeService's own
  // Contact lookups (buildDraftFromContact, issuerFilterFromContact) must
  // use the id-priority-safe resolveContactByIdThenName() helper, never
  // the old single combined `entry.id === X || entry.name === X` pattern.
  const fs = await import('node:fs');
  const bridgeSrc = fs.readFileSync(
    new URL('../scripts/ui/shell/gm/FactionJobBridgeService.js', import.meta.url),
    'utf8'
  );
  assert.ok(!bridgeSrc.includes('entry.id === contactOrId || entry.name === contactOrId'), 'FactionJobBridgeService must no longer resolve a Contact via a single combined id-or-name .find() that lets an earlier record\'s name shadow a later record\'s real id');
  const occurrences = bridgeSrc.split('resolveContactByIdThenName(faction, contactOrId)').length - 1;
  assert.ok(occurrences >= 2, 'both buildDraftFromContact() and issuerFilterFromContact() must resolve their Contact via resolveContactByIdThenName()');
  pass('62 — FactionJobBridgeService resolves Contacts via the id-priority-safe resolveContactByIdThenName() helper in both buildDraftFromContact() and issuerFilterFromContact() (structural regression guard)');
}

// Functional replicas of GMFactionRelationshipSurfaceController's
// resolveIssuerFaction()/resolveIssuerContact() helpers (round 7), proven
// against the real FactionRegistryService: these replaced the dossier's
// hide-contact/promote-contact/delete-contact/make-job-*/create-intel-*/
// reveal-* actions' prior collapsed `factionId || factionName` /
// `contactId || contactName` strings, which fed the PERMISSIVE
// id-or-unique-name resolvers even when a real, separate id field was
// already in hand.
function resolveIssuerFactionLike(factionId, factionName) {
  const cleanId = String(factionId || '').trim();
  if (cleanId) {
    const faction = FactionRegistryService.resolveFactionByIdForMutation(cleanId);
    if (!faction) throw new Error(`No Faction exists with id "${cleanId}".`);
    return faction;
  }
  const resolution = FactionRegistryService.resolveFactionForMutation(factionName);
  if (resolution.ambiguous) throw new Error(`Multiple Factions are named "${factionName}" — specify a Faction id.`);
  if (!resolution.faction) throw new Error('The selected Faction could not be found.');
  return resolution.faction;
}

function resolveIssuerContactLike(faction, contactId, contactName) {
  const cleanId = String(contactId || '').trim();
  if (cleanId) {
    const result = FactionRegistryService.resolveFactionContactByIdsForMutation(faction.id, cleanId);
    if (!result.contact) throw new Error(`No Contact exists with id "${cleanId}" on ${faction.name}.`);
    return result.contact;
  }
  const resolution = FactionRegistryService.resolveFactionContactForMutation(faction.id, contactName);
  if (resolution.ambiguous) throw new Error(`Multiple Contacts are named "${contactName}" on ${faction.name} — specify a Contact id.`);
  if (!resolution.contact) throw new Error('The selected Contact could not be found.');
  return resolution.contact;
}

{
  // 63. point 4: a stale factionId whose TEXT equals another Faction's
  // real display name must throw, never resolve to that other Faction.
  installFreshRegistry();
  const decoy = await FactionRegistryService.upsertFaction({ name: 'stale-faction-id-63' });
  assert.throws(
    () => resolveIssuerFactionLike('stale-faction-id-63', ''),
    /No Faction exists with id/,
    'a factionId matching no real Faction id must throw, never resolve to another Faction whose NAME happens to equal it'
  );
  void decoy;

  const real = await FactionRegistryService.upsertFaction({ name: 'Black Sun' });
  assert.equal(resolveIssuerFactionLike(real.id, '').id, real.id, 'a real, matching factionId must still resolve correctly');
  pass('63 — a stale factionId whose text equals another Faction\'s display name throws rather than resolving to that Faction; a real factionId still resolves correctly (round 7, point 4)');
}

{
  // 64. same for Contacts: a stale contactId whose TEXT equals another
  // Contact's display name (on the same Faction) must throw, never
  // resolve to that other Contact.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Exchange' });
  await FactionRegistryService.upsertFactionContact(faction.id, { name: 'stale-contact-id-64', role: 'Decoy' });
  assert.throws(
    () => resolveIssuerContactLike(faction, 'stale-contact-id-64', ''),
    /No Contact exists with id/,
    'a contactId matching no real Contact id on this Faction must throw, never resolve to another Contact whose NAME happens to equal it'
  );
  const { contact: real } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Real Contact', role: 'Handler' });
  assert.equal(resolveIssuerContactLike(faction, real.id, '').id, real.id, 'a real, matching contactId must still resolve correctly');
  pass('64 — a stale contactId whose text equals another Contact\'s display name throws rather than resolving to that Contact; a real contactId still resolves correctly (round 7, point 4)');
}

{
  // 65. structural regression guard: GMFactionRelationshipSurfaceController's
  // hide-contact/promote-contact/delete-contact/make-job-*/create-intel-*/
  // reveal-* actions must resolve via resolveIssuerFaction()/
  // resolveIssuerContact(), never a collapsed `factionId || factionName`
  // / `contactId || contactName` call argument that used to feed the
  // PERMISSIVE resolvers (or, for promote/delete, the mutators' own
  // internal permissive resolution) directly.
  const fs = await import('node:fs');
  const controllerSrc = fs.readFileSync(
    new URL('../scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js', import.meta.url),
    'utf8'
  );
  assert.ok(controllerSrc.includes('function resolveIssuerFaction(factionId, factionName)'), 'the controller must define an exact-id-first resolveIssuerFaction() helper');
  assert.ok(controllerSrc.includes('function resolveIssuerContact(faction, contactId, contactName)'), 'the controller must define an exact-id-first resolveIssuerContact() helper');
  assert.ok(!controllerSrc.includes('(factionId || factionName)'), 'the controller must no longer pass a collapsed factionId||factionName call argument anywhere');
  assert.ok(!controllerSrc.includes('(contactId || contactName)'), 'the controller must no longer pass a collapsed contactId||contactName call argument anywhere');
  pass('65 — GMFactionRelationshipSurfaceController\'s hide/promote/delete/make-job/create-intel/reveal actions resolve via the exact-id-first resolveIssuerFaction()/resolveIssuerContact() helpers, never a collapsed factionId||factionName / contactId||contactName call argument (structural regression guard)');
}

// ---------------------------------------------------------------------
// CORRECTION PASS round 8 (independent re-review of round 7's exact head
// commit): round 7's own fixes were correct, but three further issues
// surfaced:
//   1. findFaction()/findFactionContact()'s id pass was ITSELF still one
//      combined exact-or-case-insensitive predicate, so an earlier
//      record matching only case-insensitively could shadow a later
//      record's real EXACT-CASE id
//   2. GMJobBoardSurfaceService's filterDraft construction, and
//      GMJobBoardSurfaceController's follow-up-contract handler, both
//      independently collapsed issuerFilter's separate factionId/
//      factionName/contactId/contactName fields into one ambiguous
//      string -- the exact bug round 7 had just removed from the Faction
//      dossier controller, reintroduced on the Job side
//   3. FactionJobBridgeService's id-priority fixes (round 7) never made
//      the NAME fallback ambiguity-safe -- two same-name Factions/
//      Contacts would still silently resolve to whichever sorts first,
//      stamping the wrong canonical id into a persisted Job draft
// ---------------------------------------------------------------------

{
  // 67. point 1a: findFaction()'s id pass must be genuinely exact-id-
  // first, THEN case-insensitive-id-if-unique, THEN name -- not one
  // combined exact-or-case-insensitive predicate. An earlier Faction
  // matching only case-insensitively must never shadow a later Faction's
  // real exact-case id.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { id: 'FACTION-X-67', name: 'Decoy Faction 67', contacts: [] },
        { id: 'faction-x-67', name: 'Actual Faction 67', contacts: [] }
      ]
    }
  });
  const resolved = FactionRegistryService.findFaction('faction-x-67');
  assert.equal(resolved.id, 'faction-x-67', 'an exact-case id match must always outrank an earlier record\'s merely case-insensitive id match');
  assert.equal(resolved.name, 'Actual Faction 67');
  // Legacy case-insensitive compatibility must still work when unique.
  installFreshRegistry({
    seed: { gmFactionRegistry: [{ id: 'Legacy-ID-67', name: 'Legacy Faction 67', contacts: [] }] }
  });
  const byCaseInsensitive = FactionRegistryService.findFaction('legacy-id-67');
  assert.equal(byCaseInsensitive.id, 'Legacy-ID-67', 'unique case-insensitive id compatibility must still resolve correctly when there is no exact-case match');
  pass('67 — findFaction() resolves an exact-case id match before ever trying case-insensitive id compatibility, even when an earlier record only case-insensitively matches; unique case-insensitive compatibility still works (round 8, point 1)');
}

{
  // 68. point 1b: same genuinely-three-pass fix for findFactionContact().
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [{
        id: 'faction-68', name: 'Zann Consortium 68',
        contacts: [
          { id: 'CONTACT-X-68', name: 'Decoy Contact 68' },
          { id: 'contact-x-68', name: 'Actual Contact 68' }
        ]
      }]
    }
  });
  const resolved = FactionRegistryService.findFactionContact('faction-68', 'contact-x-68');
  assert.ok(resolved, 'findFactionContact() must resolve a match');
  assert.equal(resolved.contact.id, 'contact-x-68', 'an exact-case Contact id match must always outrank an earlier Contact\'s merely case-insensitive id match');
  assert.equal(resolved.contact.name, 'Actual Contact 68');
  pass('68 — findFactionContact() resolves an exact-case Contact id match before ever trying case-insensitive id compatibility, even when an earlier Contact only case-insensitively matches (round 8, point 1)');
}

{
  // 69. point 2a: GMJobBoardSurfaceService's filterDraft construction
  // (issuerFilter -> Job draft) must resolve the structured issuerFilter
  // exact-id-first via FactionJobBridgeService.buildDraftFromIssuerFilter(),
  // never a collapsed `issuerFilter.factionId || issuerFilter.factionName`
  // string. Proven directly against buildDraftFromIssuerFilter() (the
  // real seam GMJobBoardSurfaceService now calls), plus a structural
  // guard on the service's own source.
  installFreshRegistry();
  const decoyFaction = await FactionRegistryService.upsertFaction({ name: 'stale-issuer-faction-69' });
  const realFaction = await FactionRegistryService.upsertFaction({ name: 'Real Issuer Faction 69' });
  void decoyFaction;
  const draftFromStaleId = FactionJobBridgeService.buildDraftFromIssuerFilter({ factionId: 'stale-issuer-faction-69', factionName: 'stale-issuer-faction-69' });
  assert.equal(draftFromStaleId, null, 'a stale factionId whose text equals another Faction\'s real display name must never build a draft for that other Faction');
  const draftFromRealId = FactionJobBridgeService.buildDraftFromIssuerFilter({ factionId: realFaction.id, factionName: 'Real Issuer Faction 69' });
  assert.equal(draftFromRealId.issuer.factionId, realFaction.id, 'a real, matching factionId must still build a correct draft');

  const fs = await import('node:fs');
  const jobServiceSrc = fs.readFileSync(
    new URL('../scripts/ui/shell/gm/GMJobBoardSurfaceService.js', import.meta.url),
    'utf8'
  );
  assert.ok(jobServiceSrc.includes('FactionJobBridgeService.buildDraftFromIssuerFilter(issuerFilter)'), 'GMJobBoardSurfaceService must build its filterDraft via buildDraftFromIssuerFilter(), never a collapsed issuerFilter.factionId || issuerFilter.factionName string');
  assert.ok(!jobServiceSrc.includes('issuerFilter.factionId || issuerFilter.factionName'), 'GMJobBoardSurfaceService must no longer collapse issuerFilter.factionId || issuerFilter.factionName into one call argument');
  pass('69 — GMJobBoardSurfaceService builds its filterDraft via the exact-id-first buildDraftFromIssuerFilter(), never a collapsed issuerFilter string (round 8, point 2)');
}

{
  // 70. point 2b: GMJobBoardSurfaceController's follow-up-contract
  // handler must resolve the same way -- structural guard, since
  // exercising the real DOM click handler is out of scope for this
  // identity-focused test file (the underlying seam,
  // buildDraftFromIssuerFilter(), is already proven functionally in test
  // 69 and 39a-style stale-id tests below).
  const fs = await import('node:fs');
  const controllerSrc = fs.readFileSync(
    new URL('../scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js', import.meta.url),
    'utf8'
  );
  assert.ok(controllerSrc.includes('FactionJobBridgeService.buildDraftFromIssuerFilter(filter)'), 'the follow-up-contract handler must build its draft via buildDraftFromIssuerFilter(), never a collapsed filter.factionId || filter.factionName string');
  assert.ok(!controllerSrc.includes('filter.factionId || filter.factionName'), 'the controller must no longer collapse filter.factionId || filter.factionName into one call argument');
  assert.ok(!controllerSrc.includes('filter.contactId || filter.contactName'), 'the controller must no longer collapse filter.contactId || filter.contactName into one call argument');
  pass('70 — GMJobBoardSurfaceController\'s follow-up-contract handler builds its draft via the exact-id-first buildDraftFromIssuerFilter(), never a collapsed filter string (round 8, point 2, structural regression guard)');
}

{
  // 71. point 3a: FactionJobBridgeService.buildDraftFromFaction()'s
  // name-only compatibility fallback must refuse to guess among
  // duplicate-name Factions -- the resolved Faction's canonical id gets
  // copied into a persisted Job draft's issuer.factionId, so silently
  // picking the first of two same-named Factions would stamp the wrong
  // canonical identity into that draft.
  installFreshRegistry();
  await FactionRegistryService.upsertFaction({ name: 'Duplicate Name Faction 71' });
  await FactionRegistryService.upsertFaction({ name: 'Duplicate Name Faction 71' });
  const draft = FactionJobBridgeService.buildDraftFromFaction('Duplicate Name Faction 71');
  assert.equal(draft, null, 'a name-only lookup matching 2+ same-named Factions must refuse to guess, never silently pick the first');

  installFreshRegistry();
  const unique = await FactionRegistryService.upsertFaction({ name: 'Unique Name Faction 71' });
  const uniqueDraft = FactionJobBridgeService.buildDraftFromFaction('Unique Name Faction 71');
  assert.equal(uniqueDraft.issuer.factionId, unique.id, 'a genuinely unique name-only lookup must still resolve correctly');
  pass('71 — FactionJobBridgeService.buildDraftFromFaction()\'s name-only fallback refuses to guess among duplicate-name Factions, never stamping an arbitrarily-picked one\'s id into the Job draft; unique name-only lookup still works (round 8, point 3)');
}

{
  // 72. point 3b (superseded/tightened by round 9 -- see 72a/72b below):
  // FactionJobBridgeService.buildDraftFromContact()'s name-only fallback
  // must refuse to guess among duplicate-name Contacts. Round 8 proved
  // this by checking the (now-superseded) "silently degrade to a
  // Faction-only draft" behavior; round 9 tightened the contract further
  // -- a NON-EMPTY Contact selector that fails to resolve (not found OR
  // ambiguous) must return null outright, never silently substitute the
  // Faction. This test now proves the round-9 contract directly; unique
  // name-only and exact-id lookups (unaffected) still work.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Zann Consortium 72' });
  await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Duplicate Name Contact 72', role: 'Handler' });
  await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Duplicate Name Contact 72', role: 'Handler' });
  const draft = FactionJobBridgeService.buildDraftFromContact(faction.id, 'Duplicate Name Contact 72');
  assert.equal(draft, null, 'a non-empty Contact selector matching 2+ same-named Contacts must return null -- never guess, and never silently substitute a Faction-only draft for the requested Contact');

  const { contact: uniqueContact } = await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Unique Name Contact 72', role: 'Handler' });
  const uniqueDraft = FactionJobBridgeService.buildDraftFromContact(faction.id, 'Unique Name Contact 72');
  assert.equal(uniqueDraft.issuer.contactId, uniqueContact.id, 'a genuinely unique name-only Contact lookup must still resolve correctly');

  // Exact ids still work even in the presence of duplicate names.
  const contactsOnFaction = FactionRegistryService.getFactionContacts(faction.id).filter(c => c.name === 'Duplicate Name Contact 72');
  assert.equal(contactsOnFaction.length, 2);
  const exactDraft = FactionJobBridgeService.buildDraftFromContact(faction.id, contactsOnFaction[1].id);
  assert.equal(exactDraft.issuer.contactId, contactsOnFaction[1].id, 'an explicit exact Contact id must still resolve correctly even among duplicate-name Contacts');
  pass('72 — FactionJobBridgeService.buildDraftFromContact() returns null for a non-empty Contact selector matching 2+ same-named Contacts, never guessing and never silently substituting a Faction-only draft; unique name-only and exact-id lookups still work (round 8/9, point 3)');
}

// ---------------------------------------------------------------------
// CORRECTION PASS round 9 (independent re-review of round 8's exact head
// commit): round 8's fixes were themselves correct, but four further
// issues surfaced:
//   1. LocationJobBridgeService still resolved a Location's canonical
//      controllingFactionId through the flexible, name-capable
//      findFaction() SEARCH helper -- a stale/deleted id colliding with
//      an unrelated Faction's display name could still be "rescued,"
//      producing a Job draft whose issuer.factionId and
//      issuer.factionName described two different entities
//   2. buildDraftFromContact()/issuerFilterFromContact() silently
//      downgraded a NON-EMPTY but unresolved/ambiguous Contact selector
//      into a Faction-only draft -- safe in the narrow sense that no
//      wrong Contact id was stamped, but it silently changed the
//      caller's requested entity without telling them
//   3. findFaction()/findFactionContact() still fell through to a
//      display-name match when the case-insensitive-id pass itself
//      produced 2+ ambiguous candidates, rather than refusing outright
//   4. FactionJobBridgeService's Contact name-fallback compared names
//      case-SENSITIVELY, unlike the registry's own case-insensitive
//      name-equality rule -- "Mira" and "mira" should be ambiguous
//      duplicates, not two unrelated lookups
// ---------------------------------------------------------------------

{
  // 73. point 1: LocationJobBridgeService must resolve a Location's
  // canonical controllingFactionId EXACT-ID-ONLY -- a stale/deleted id
  // that happens to equal another (unrelated) Faction's display name must
  // never be "rescued" by that Faction. The produced draft must not pair
  // the stale id with a borrowed name from an unrelated record.
  installFreshRegistry();
  const decoyFaction = await FactionRegistryService.upsertFaction({ name: 'stale-controlling-faction-id-73' });
  void decoyFaction;
  const location = { id: 'loc-73', name: 'Contested Outpost 73', controllingFactionId: 'stale-controlling-faction-id-73', parentLocationId: '' };
  const draft = LocationJobBridgeService.buildDraftFromLocation(location);
  assert.ok(draft, 'a Location with a stale controllingFactionId must still produce a draft (Location-level context alone is enough)');
  assert.equal(draft.issuer.factionId, 'stale-controlling-faction-id-73', 'the raw controllingFactionId is still copied through verbatim (it is the Location\'s own stored reference, stale or not)');
  assert.equal(draft.client.factionName, '', 'an unresolved controllingFactionId must NEVER be paired with an unrelated Faction\'s display name -- the name must be empty, not borrowed');
  assert.ok(!draft.briefing.includes('stale-controlling-faction-id-73'.replace(/-/g, ' ')), 'sanity: the briefing must not accidentally embed the decoy Faction\'s display name either');

  // A genuinely resolvable controllingFactionId must still work correctly.
  const realFaction = await FactionRegistryService.upsertFaction({ name: 'Real Controlling Faction 73' });
  const location2 = { id: 'loc-73b', name: 'Loyal Outpost 73', controllingFactionId: realFaction.id, parentLocationId: '' };
  const draft2 = LocationJobBridgeService.buildDraftFromLocation(location2);
  assert.equal(draft2.issuer.factionId, realFaction.id);
  assert.equal(draft2.client.factionName, 'Real Controlling Faction 73', 'a real, resolvable controllingFactionId must still resolve to its correct Faction name');
  pass('73 — LocationJobBridgeService resolves controllingFactionId exact-id-only; a stale id never gets paired with an unrelated Faction\'s borrowed display name (round 9, point 1)');
}

{
  // 74. point 2a: buildDraftFromContact()/issuerFilterFromContact() must
  // return null (never silently substitute a Faction-only result) when a
  // NON-EMPTY Contact selector simply does not resolve (a stale/unknown
  // id or name, as opposed to an ambiguous one -- test 72 above already
  // covers the ambiguous case).
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Offworld Mining Guild 74' });
  const draft = FactionJobBridgeService.buildDraftFromContact(faction.id, 'does-not-exist-74');
  assert.equal(draft, null, 'a non-empty Contact selector that resolves to nothing must return null, never silently substitute a Faction-only draft');
  const filter = FactionJobBridgeService.issuerFilterFromContact(faction.id, 'does-not-exist-74');
  assert.equal(filter, null, 'issuerFilterFromContact() must have the identical contract: a non-empty unresolved Contact selector returns null, never a Faction-only filter');

  // No selector at all (genuinely free-text Faction-only request) must
  // still correctly fall back to a Faction-level draft/filter.
  const facetionOnlyDraft = FactionJobBridgeService.buildDraftFromContact(faction.id, '');
  assert.equal(facetionOnlyDraft.issuer.type, 'faction', 'when NO Contact selector was ever supplied, a Faction-level draft is the correct, intentional result');
  const facetionOnlyFilter = FactionJobBridgeService.issuerFilterFromContact(faction.id, '');
  assert.equal(facetionOnlyFilter.type, 'faction', 'issuerFilterFromContact() must have the identical no-selector-supplied contract');
  pass('74 — buildDraftFromContact()/issuerFilterFromContact() return null for a non-empty but unresolved Contact selector, never silently substituting a Faction-only result; a genuinely absent selector still correctly falls back to Faction-level (round 9, point 2)');
}

{
  // 75. point 3: findFaction()/findFactionContact() must refuse outright
  // (return null) when the case-insensitive-id pass itself produces 2+
  // ambiguous candidates -- never fall through to a display-name match,
  // which could let a completely unrelated THIRD record's name decide
  // among two id-shaped candidates it has nothing to do with.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [
        { id: 'ABC-75', name: 'Faction ABC Upper 75', contacts: [] },
        { id: 'abc-75', name: 'Faction abc Lower 75', contacts: [] },
        { id: 'unrelated-75', name: 'aBc-75', contacts: [] }
      ]
    }
  });
  const resolved = FactionRegistryService.findFaction('aBc-75');
  assert.equal(resolved, null, 'an ambiguous case-insensitive id match (2+ candidates) must refuse outright, never fall through to a third, unrelated record\'s display name');
  pass('75 — findFaction() refuses (returns null) when 2+ candidates match a query case-insensitively by id, rather than falling through to an unrelated record\'s display name (round 9, point 3)');
}

{
  // 76. same refusal for findFactionContact()'s Contact-level id pass.
  installFreshRegistry({
    seed: {
      gmFactionRegistry: [{
        id: 'faction-76', name: 'Zann Consortium 76',
        contacts: [
          { id: 'XYZ-76', name: 'Contact XYZ Upper 76' },
          { id: 'xyz-76', name: 'Contact xyz Lower 76' },
          { id: 'unrelated-76', name: 'xYz-76' }
        ]
      }]
    }
  });
  const resolved = FactionRegistryService.findFactionContact('faction-76', 'xYz-76');
  assert.equal(resolved, null, 'an ambiguous case-insensitive Contact id match (2+ candidates) must refuse outright, never fall through to an unrelated Contact\'s display name');
  pass('76 — findFactionContact() refuses (returns null) when 2+ Contacts match a query case-insensitively by id, rather than falling through to an unrelated Contact\'s display name (round 9, point 3)');
}

{
  // 77. point 4: FactionJobBridgeService's Contact name resolution must
  // be case-insensitive, matching the registry's own name-equality rule
  // (resolveFactionContactForMutation() already treats "Mira" and "mira"
  // as the same ambiguous duplicate) -- a free-text lookup of "Mira" when
  // both exist must refuse to guess, not silently treat them as two
  // unrelated names and arbitrarily match one by exact case.
  installFreshRegistry();
  const faction = await FactionRegistryService.upsertFaction({ name: 'Zann Consortium 77' });
  await FactionRegistryService.upsertFactionContact(faction.id, { name: 'Mira', role: 'Handler' });
  await FactionRegistryService.upsertFactionContact(faction.id, { name: 'mira', role: 'Handler' });
  const draft = FactionJobBridgeService.buildDraftFromContact(faction.id, 'Mira');
  assert.equal(draft, null, '"Mira" and "mira" must be treated as ambiguous duplicates (case-insensitive name equality, matching the registry\'s own rule) -- a non-empty selector matching both must return null, never arbitrarily pick the exact-case match');
  pass('77 — FactionJobBridgeService\'s Contact name resolution treats display names case-insensitively, matching the registry\'s own rule; "Mira" and "mira" are refused as ambiguous duplicates rather than resolved by exact case (round 9, point 4)');
}

console.log(`\nPRE-8D-4 Faction/Contact canonical identity hardening: ${passCount} assertions-groups passed.`);
console.log('Faction/Contact identity is now id-only for every canonical create/update/delete path; display text (name, role) never decides canonical sameness; legacy ids, duplicate names, draft/canonical duality, and every audited cross-domain reference (Location, NPC, Job, Intel) remain stable across rename.');
