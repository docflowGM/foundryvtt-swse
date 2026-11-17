import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfflineResolvers, loadProfilesDoc, loadSchema, loadCatalog } from './helpers/galactic-profile-fixtures.mjs';

const { compileProfile } = await import('../scripts/engine/progression/profile/galactic-profile-compiler.js');
const { GalacticProfileRegistry } = await import('../scripts/engine/progression/profile/galactic-profile-registry.js');
const { resolveAdapterStrict } = await import('../scripts/apps/progression-framework/adapters/strict-subtype-resolution.js');
const { resolvers } = await createOfflineResolvers();
const doc = loadProfilesDoc();
const settings = { droidConstructionCredits: 1000 };
const clone = v => JSON.parse(JSON.stringify(v));
const byId = id => doc.profiles.find(p => p.profileId === id);
const compile = (p, over = {}) => compileProfile(p, { sessionSubtype: p.subtype, resolvers, settings, ...over });
const codes = r => [...new Set(r.blocked.map(b => b.code))].sort();

/**
 * Pinned, individually reviewed offline outcome for every profile. A change here is a deliberate decision, not noise.
 * Every code is an explicit refusal with a documented cause; an empty list means "compiles offline", NOT "certified".
 * (Prerequisites, Force-tree access via tree-authority, and FeatChoiceResolver choice validation are V2 runtime
 *  authorities and are only exercised in Foundry; see the audit report.)
 */
const EXPECTED_BLOCKS = {
  'jedi_guardian': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'jedi_consular': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'jedi_defender': [],
  'jedi_sentinel': ["ATTRIBUTE_BASIS_UNRESOLVED", "FORCE_POWER_UNRESOLVED"],
  'noble_diplomat': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'noble_leader': [],
  'noble_aristocrat': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'noble_duelist': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'soldier-guard': ["BACKGROUND_UNRESOLVED", "FEAT_UNRESOLVED"],
  'scout-pathfinder': ["BACKGROUND_UNRESOLVED", "FEAT_UNRESOLVED"],
  'laborer-worker': ["BACKGROUND_UNRESOLVED", "FEAT_UNRESOLVED", "SKILL_KEY_UNRESOLVED"],
  'beast-wolf': ["ATTRIBUTE_BASIS_UNRESOLVED", "BACKGROUND_UNRESOLVED", "RULING_BLOCKED", "SPECIES_UNRESOLVED"],
  'beast-bear': ["ATTRIBUTE_BASIS_UNRESOLVED", "BACKGROUND_UNRESOLVED", "RULING_BLOCKED", "SPECIES_UNRESOLVED"],
  'nonheroic_worker': [],
  'nonheroic_trooper': [],
  'nonheroic_criminal': [],
  'nonheroic_merchant': [],
  'nonheroic_police': [],
  'scoundrel_pistoleer': [],
  'scoundrel_skill_monkey': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scoundrel_knuckledragger': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scoundrel_outlaw': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scoundrel_brigand': ["ATTRIBUTE_BASIS_UNRESOLVED", "ITEM_WITHOUT_ID"],
  'scout_sniper': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scout_engineer': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scout_pistoleer': ["ITEM_UNRESOLVED"],
  'scout_survivalist': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scout_infiltrator': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'soldier_rifleman': ["ATTRIBUTE_BASIS_UNRESOLVED", "ITEM_WITHOUT_ID"],
  'soldier_gunner': [],
  'soldier_brawler': [],
  'soldier_tank': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'soldier_commando': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'droid_scout_dex_recon_probe': [],
  'droid_scout_int_astromech_pathfinder': [],
  'droid_soldier_dex_security_enforcer': [],
  'droid_soldier_str_industrial_vanguard': [],
  'droid_noble_int_medical_coordinator': [],
  'droid_noble_cha_protocol_envoy': [],
  'droid_scoundrel_cha_service_operative': [],
  'droid_scoundrel_dex_systems_infiltrator': [],
};

test('every one of the 41 profiles has a pinned compile outcome', () => {
  assert.deepEqual(Object.keys(EXPECTED_BLOCKS).sort(), doc.profiles.map(p => p.profileId).sort());
});

for (const p of doc.profiles) {
  test(`${p.profileId} [${p.subtype}] compiles to its pinned outcome`, async () => {
    const r = await compile(p);
    assert.deepEqual(codes(r), EXPECTED_BLOCKS[p.profileId], JSON.stringify(r.blocked));
    assert.equal(r.ok, EXPECTED_BLOCKS[p.profileId].length === 0);
  });
}

test('compile is pure: frozen input is accepted, never mutated, and the digest is stable', async () => {
  const p = clone(byId('droid_soldier_dex_security_enforcer'));
  const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
  const before = JSON.stringify(p);
  const a = await compile(deepFreeze(p));
  const b = await compile(p);
  assert.equal(JSON.stringify(p), before);
  assert.equal(a.digest, b.digest);
  assert.equal(a.ok, true);
});

test('strict subtype: unknown, alias, empty and mismatched subtypes are refused (never a heroic-actor fallback)', async () => {
  const adapters = ['actor', 'droid', 'nonheroic', 'beast', 'follower'].map(subtypeId => ({ subtypeId, handles: s => s === subtypeId || (subtypeId === 'nonheroic' && ['standard', 'imported-statblock'].includes(s)) || (subtypeId === 'beast' && s === 'mount') }));
  for (const bad of ['standard', 'mount', 'imported-statblock', 'Actor', '', null, undefined, 'robot']) assert.equal(resolveAdapterStrict(adapters, bad), null, String(bad));
  for (const good of ['actor', 'droid', 'nonheroic', 'beast']) assert.equal(resolveAdapterStrict(adapters, good).subtypeId, good);
  const p = clone(byId('noble_leader'));
  assert.equal(codes(await compile({ ...p, subtype: 'standard' }))[0], 'UNKNOWN_SUBTYPE');
  assert.deepEqual(codes(await compile(p, { sessionSubtype: 'droid' })), ['SUBTYPE_MISMATCH']);
  assert.deepEqual(codes(await compile(byId('droid_scout_int_astromech_pathfinder'), { sessionSubtype: 'actor' })), ['SUBTYPE_MISMATCH']);
});

test('class is committed with its full registry system (not the empty system the old adapter produced)', async () => {
  const r = await compile(byId('noble_leader'));
  assert.ok(Object.keys(r.draft.class.system).length > 0);
  assert.ok(Array.isArray(r.draft.class.system.talent_trees) && r.draft.class.system.talent_trees.length > 0);
});

test('nonheroic uses the V2 synthetic class model with isNonheroic and full system', async () => {
  const r = await compile(byId('nonheroic_worker'));
  assert.equal(r.draft.class.id, 'nonheroic');
  assert.equal(r.draft.class.system.isNonheroic, true);
  assert.ok(r.draft.class.system.level_progression.length > 0);
  assert.deepEqual(r.draft.talents, []);
});

test('attribute basis: unresolved + non-zero species modifiers blocks; moot and authored-base compile; numbers are never rewritten', async () => {
  const blocked = await compile(byId('scout_sniper'));
  assert.ok(codes(blocked).includes('ATTRIBUTE_BASIS_UNRESOLVED'));
  assert.equal(blocked.draft.attributes, undefined, 'no attributes committed while the basis is unresolved');
  const moot = await compile(byId('noble_leader'));
  assert.ok(moot.diagnostics.some(d => d.code === 'ATTRIBUTE_BASIS_MOOT'));
  assert.deepEqual(moot.draft.attributes.values, byId('noble_leader').choices.attributes.base);
  const base = await compile(byId('soldier_brawler'));
  assert.equal(codes(base).includes('ATTRIBUTE_BASIS_UNRESOLVED'), false);
  assert.deepEqual(base.draft.attributes.values, byId('soldier_brawler').choices.attributes.base);
});

test('droids: pre-modifier array only, no CON, provisional build, V2-quoted spend equals the authored 1000', async () => {
  for (const p of doc.profiles.filter(x => x.subtype === 'droid')) {
    const r = await compile(p);
    assert.equal(r.ok, true, `${p.profileId}: ${JSON.stringify(r.blocked)}`);
    assert.equal('con' in r.draft.attributes.values, false);
    assert.deepEqual(r.draft.attributes.values, p.choices.attributes.base);
    assert.equal(r.draft.droid.droidCredits.spent, 1000);
    assert.equal(r.draft.droid.buildState.isFinalized, false);
    assert.equal(r.draft.species, undefined);
    assert.equal(r.draft.forcePowers, undefined);
  }
});

test('Force powers are preserved as intent and withheld until V2 grants the entitlement (GP-RD-003)', async () => {
  const r = await compile(byId('jedi_defender'));
  assert.equal(r.draft.forcePowers, undefined);
  assert.equal(r.deferred.forcePowers.length, byId('jedi_defender').choices.forcePowers.length);
  assert.ok(r.open.some(o => o.reason === 'FORCE_TRAINING_REQUIRED'));
  assert.ok(r.diagnostics.some(d => d.code === 'FORCE_TRAINING_REQUIRED'));
  // feats are NOT replaced and powers are NOT silently discarded
  assert.deepEqual(r.draft.feats.map(f => f.name), ['Skill Focus']);
  // once V2 reports an entitlement, the same authored powers apply
  const entitled = await createOfflineResolvers({ forceEntitlement: () => ({ slots: 9 }) });
  const r2 = await compileProfile(byId('jedi_defender'), { sessionSubtype: 'actor', resolvers: entitled.resolvers, settings });
  assert.equal(r2.draft.forcePowers.length, byId('jedi_defender').choices.forcePowers.length);
  assert.equal(r2.deferred, null);
});

test('Wealth: the wallet is the exact final balance and never recomputed (GP-RD-004)', async () => {
  const r = await compile(byId('noble_aristocrat'));
  assert.equal(r.economy.walletMode, 'exactFinalBalance');
  assert.equal(r.economy.walletCredits, 465);
  assert.equal(r.economy.walletResolved, true);
  const zero = await compile(byId('scout_engineer'));
  assert.equal(zero.economy.walletCredits, 0);
  assert.equal(zero.economy.walletResolved, true, 'a resolved zero is not an unset balance');
});

test('equipment resolves only by exact canonical id; no id or unknown id blocks', async () => {
  const ok = await compile(byId('droid_noble_int_medical_coordinator'));
  assert.ok(ok.economy.equipment.every(e => e.itemId && e.qty >= 1));
  const mutated = clone(byId('droid_scout_dex_recon_probe'));
  mutated.choices.equipment[0].sourceId = null;
  assert.deepEqual(codes(await compile(mutated)), ['ITEM_WITHOUT_ID']);
  mutated.choices.equipment[0].sourceId = 'no-such-item';
  assert.deepEqual(codes(await compile(mutated)), ['ITEM_UNRESOLVED']);
});

test('open rulings and structurally unresolved selections always block', async () => {
  assert.ok(codes(await compile(byId('beast-wolf'))).includes('RULING_BLOCKED'));
  assert.ok(codes(await compile(byId('laborer-worker'))).includes('SKILL_KEY_UNRESOLVED'));
});

test('GP-RD-002/006: talent identity comes from the published talent document, not authored tree labels', async () => {
  const rm = await compile(byId('soldier_rifleman'));
  assert.deepEqual(rm.draft.talents.map(t => t.id), ['438e13c99c7b53a6']);
  for (const [id, name] of [['scout_sniper', 'Surveillance'], ['scout_engineer', 'Sizing Up']]) {
    const r = await compile(byId(id));
    assert.deepEqual(r.draft.talents.map(t => t.name), [name], id);
    assert.equal(codes(r).includes('TALENT_TREE_ACCESS'), false, id);
  }
});

test('talents outside the class registered trees are HELD for V2 tree authority, never granted or silently dropped', async () => {
  const r = await compile(byId('jedi_consular'));
  assert.deepEqual(r.draft.talents, []);
  assert.equal(r.deferred.talents[0].name, 'Force Focus');
  assert.ok(r.open.some(o => o.reason === 'TALENT_ACCESS_UNVERIFIED'));
  assert.ok(r.diagnostics.some(d => d.code === 'TALENT_ACCESS_DEFERRED_TO_V2'));
});

test('GP-RD-007: Mechanized Rider commits for a Scout once Mobile Scout is registered (the authored choice was legal; V2 tree data was incomplete)', async () => {
  const r = await compile(byId('scout_pistoleer'));
  assert.deepEqual(r.draft.talents.map(t => t.name), ['Mechanized Rider']);
  assert.equal(r.deferred?.talents, undefined);
  assert.equal(r.open.some(o => o.reason === 'TALENT_ACCESS_UNVERIFIED'), false);
  assert.ok(r.locks.includes('class-talent'));
  // the profile is still blocked, but only by its unresolved vehicle item — never by the talent
  assert.deepEqual(codes(r), ['ITEM_UNRESOLVED']);
});

test('registry: validates record by record, quarantines invalid/duplicate/unknown-subtype, serves the rest', () => {
  const schema = loadSchema();
  const good = clone(doc);
  const bad = clone(byId('noble_leader')); bad.profileId = 'bad-subtype'; bad.subtype = 'standard';
  const dupe = clone(byId('noble_leader'));
  good.profiles.push(bad, dupe);
  const r = GalacticProfileRegistry.validateDocument(good, schema);
  assert.equal(r.byId.size, 41);
  assert.deepEqual(r.quarantined.map(q => q.profileId).sort(), ['bad-subtype', 'noble_leader']);
  assert.throws(() => GalacticProfileRegistry.validateDocument({ ...doc, schemaVersion: 2 }, schema), /header/);
});

test('registry: a failed load is retryable and a good load is cached; catalog lists by EXACT subtype only', async () => {
  GalacticProfileRegistry._clearCache();
  const schema = loadSchema(); const catalog = loadCatalog();
  let calls = 0; let failNext = true;
  const fetchJson = async file => {
    calls += 1;
    if (failNext) { failNext = false; throw new Error('network'); }
    return file.includes('schema') ? schema : file.includes('catalog') ? catalog : doc;
  };
  await assert.rejects(GalacticProfileRegistry.loadProfiles({ fetchJson }), /network/);
  const loaded = await GalacticProfileRegistry.loadProfiles({ fetchJson });
  assert.equal(loaded.byId.size, 41);
  const before = calls;
  await GalacticProfileRegistry.loadProfiles({ fetchJson });
  assert.equal(calls, before, 'cached: no refetch');
  assert.equal((await GalacticProfileRegistry.listCatalog({ subtype: 'droid' }, { fetchJson })).length, 8);
  assert.equal((await GalacticProfileRegistry.listCatalog({ subtype: 'actor' }, { fetchJson })).length, 23);
  assert.deepEqual(await GalacticProfileRegistry.listCatalog({ subtype: 'standard' }, { fetchJson }), []);
  assert.deepEqual(await GalacticProfileRegistry.listCatalog({}, { fetchJson }), []);
  GalacticProfileRegistry._clearCache();
});
