import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from './helpers/session-harness.mjs';
import { installPackShim, installFetchShim } from './helpers/pack-shim.mjs';
import { loadProfilesDoc, loadSchema } from './helpers/galactic-profile-fixtures.mjs';

/**
 * Service-level integration: the PRODUCTION GalacticProfileService with V2's REAL registries (ClassesRegistry,
 * SpeciesRegistry, FeatRegistry, SkillRegistry), AbilityEngine/PrerequisiteChecker, FeatChoiceResolver, the class-grant
 * ledger, TalentCadenceEngine and the Feat step's entitlement rule — all initialised from the repository's real pack
 * data through `game.packs`/`fetch` shims. Nothing is stubbed except Foundry's document database and network.
 * Still NOT a Foundry run: Actor documents, ActorEngine, rendering and the world database are not exercised.
 */
installPackShim();
installFetchShim();
const { GalacticProfileRegistry } = await import('../scripts/engine/progression/profile/galactic-profile-registry.js');
const { GalacticProfileService } = await import('../scripts/engine/progression/profile/galactic-profile-service.js');
const doc = loadProfilesDoc();
const schema = loadSchema();
const clone = v => JSON.parse(JSON.stringify(v));
const byId = id => clone(doc.profiles.find(p => p.profileId === id));

async function compileVia(profile) {
  const d = clone(doc); d.profiles = doc.profiles.filter(p => p.profileId !== profile.profileId).concat(profile);
  GalacticProfileRegistry._loaded = GalacticProfileRegistry.validateDocument(d, schema);
  const actor = { id: 'a', name: 'Pseudo', type: profile.subtype === 'droid' ? 'droid' : (profile.subtype === 'actor' ? 'character' : 'npc'), items: [], system: { level: 0, skills: {}, attributes: {}, abilities: {} }, flags: {} };
  return GalacticProfileService.compileForShell({ actor, progressionSession: await createSession(profile.subtype) }, profile.profileId);
}
const codes = r => [...new Set(r.blocked.map(b => b.code))].sort();

/** Pinned outcome through the production service. Every non-empty entry is an explicit, explained refusal. */
const EXPECTED = {
  'jedi_guardian': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'jedi_consular': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'jedi_defender': [],
  'jedi_sentinel': ["ATTRIBUTE_BASIS_UNRESOLVED", "FORCE_POWER_UNRESOLVED"],
  'noble_diplomat': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'noble_leader': [],
  'noble_aristocrat': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'noble_duelist': ["ATTRIBUTE_BASIS_UNRESOLVED", "FEAT_UNRESOLVED"],
  'soldier-guard': ["FEAT_UNRESOLVED"],
  'scout-pathfinder': ["FEAT_UNRESOLVED"],
  'laborer-worker': ["FEAT_UNRESOLVED", "SKILL_KEY_UNRESOLVED"],
  'beast-wolf': ["ATTRIBUTE_BASIS_UNRESOLVED", "RULING_BLOCKED", "SPECIES_UNRESOLVED"],
  'beast-bear': ["ATTRIBUTE_BASIS_UNRESOLVED", "RULING_BLOCKED", "SPECIES_UNRESOLVED"],
  'nonheroic_worker': [],
  'nonheroic_trooper': [],
  'nonheroic_criminal': [],
  'nonheroic_merchant': [],
  'nonheroic_police': [],
  'scoundrel_pistoleer': [],
  'scoundrel_skill_monkey': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scoundrel_knuckledragger': ["ATTRIBUTE_BASIS_UNRESOLVED", "FEAT_PREREQUISITES_UNMET"],
  'scoundrel_outlaw': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scoundrel_brigand': ["ATTRIBUTE_BASIS_UNRESOLVED", "ITEM_WITHOUT_ID"],
  'scout_sniper': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scout_engineer': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scout_pistoleer': ["ITEM_UNRESOLVED"],
  'scout_survivalist': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'scout_infiltrator': ["ATTRIBUTE_BASIS_UNRESOLVED"],
  'soldier_rifleman': ["ATTRIBUTE_BASIS_UNRESOLVED", "ITEM_WITHOUT_ID", "TALENT_PREREQUISITES_UNMET"],
  'soldier_gunner': [],
  'soldier_brawler': ["FEAT_UNRESOLVED"],
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

test('every one of the 41 profiles has a pinned production-service outcome', () => {
  assert.deepEqual(Object.keys(EXPECTED).sort(), doc.profiles.map(p => p.profileId).sort());
});

for (const p of doc.profiles) {
  test(`service: ${p.profileId} [${p.subtype}]`, async () => {
    const r = await compileVia(clone(p));
    assert.deepEqual(codes(r), EXPECTED[p.profileId], JSON.stringify(r.blocked));
  });
}

test('all eight droids pass through V2 acquisition, entitlement, quote and installation checks', async () => {
  for (const p of doc.profiles.filter(x => x.subtype === 'droid')) {
    const r = await compileVia(clone(p));
    assert.equal(r.ok, true, `${p.profileId}: ${JSON.stringify(r.blocked)}`);
    assert.equal(r.resolved.droid.total, 1000);
    assert.equal(r.resolved.featEntitlement.allowed >= r.resolved.featEntitlement.selected, true);
    assert.equal(r.resolved.talentEntitlement.authored, 1);
    assert.equal(r.draft.droid.buildState.isFinalized, false);
  }
});

test('prerequisites are V2\'s verdict: Weapon Finesse needs BAB +1 and a level-1 Scoundrel has +0 (fail closed)', async () => {
  const r = await compileVia(byId('scoundrel_knuckledragger'));
  const b = r.blocked.find(x => x.code === 'FEAT_PREREQUISITES_UNMET');
  assert.ok(b, JSON.stringify(r.blocked));
  assert.match(b.detail, /Weapon Finesse: Requires BAB \+1/);
});

test('prerequisites: an authored illegal feat blocks; the same feat is legal once its prerequisite is class-granted', async () => {
  // Force Training needs Force Sensitivity: a Scout has none -> unmet; a Jedi gets it from its class grants -> legal
  const scout = byId('droid_scout_int_astromech_pathfinder');
  scout.choices.feats.push({ name: 'Force Training', sourceIds: ['9b7b869a86f39190'] });
  const bad = await compileVia(scout);
  assert.ok(codes(bad).includes('FEAT_PREREQUISITES_UNMET') || codes(bad).includes('FEAT_SLOTS_EXCEEDED'), JSON.stringify(bad.blocked));
  assert.ok(bad.blocked.some(b => /Force Training/.test(b.detail)));
  const jedi = byId('jedi_defender');
  jedi.choices.feats = [{ name: 'Force Training', sourceIds: ['9b7b869a86f39190'] }];
  const ok = await compileVia(jedi);
  assert.equal(codes(ok).includes('FEAT_PREREQUISITES_UNMET'), false, JSON.stringify(ok.blocked));
  assert.equal(ok.draft.feats.some(f => f.name === 'Force Training'), true);
});

test('entitlement counts: more general feats than V2 allows, or more talents than the chargen cadence, block', async () => {
  const extraFeat = byId('droid_scoundrel_cha_service_operative');
  extraFeat.choices.feats.push({ name: 'Toughness', sourceIds: ['toughness'] });
  assert.ok(codes(await compileVia(extraFeat)).includes('FEAT_SLOTS_EXCEEDED'));
  const extraTalent = byId('droid_scoundrel_cha_service_operative');
  extraTalent.choices.talents.push({ name: 'Sneak Attack', sourceIds: ['sneak-attack'] });
  assert.ok(codes(await compileVia(extraTalent)).includes('TALENT_SLOTS_EXCEEDED'));
});

test('parameterized feat choices are validated by FeatChoiceResolver: a real option resolves; an invented one blocks', async () => {
  const good = await compileVia(byId('droid_scout_int_astromech_pathfinder'));
  const sf = good.draft.feats.find(f => /Skill Focus/.test(f.name));
  assert.equal(sf.system.selectedChoice, 'mechanics');
  assert.equal(sf.system.choiceResolved, true);
  const bad = byId('droid_scout_int_astromech_pathfinder');
  bad.choices.feats = [{ name: 'Skill Focus (Basket Weaving)', sourceIds: ['skill-focus-(basket-weaving)'] }];
  assert.ok(codes(await compileVia(bad)).includes('FEAT_UNRESOLVED'));
});

test('talents: tree access and prerequisites come from V2 (Mechanized Rider legal for a Scout; Force Focus held for the tree authority)', async () => {
  const mr = await compileVia(byId('scout_pistoleer'));
  assert.deepEqual(mr.draft.talents.map(t => t.name), ['Mechanized Rider']);
  const ff = await compileVia(byId('jedi_consular'));
  assert.equal(ff.deferred.talents[0].name, 'Force Focus');
});

test('GP-RD-002: Commanding Presence is blocked by V2\'s own (name-keyed) prerequisite authority, with its verdict preserved', async () => {
  const r = await compileVia(byId('soldier_rifleman'));
  const b = r.blocked.find(x => x.code === 'TALENT_PREREQUISITES_UNMET');
  assert.ok(b, JSON.stringify(r.blocked));
  assert.match(b.detail, /Born Leader/);   // the OTHER same-name talent's requirements: a V2 authority collision, reported not hidden
});

test('class-granted feats are never committed as selections and the resolved class model is the registry model', async () => {
  const r = await compileVia(byId('droid_soldier_dex_security_enforcer'));
  assert.equal(r.draft.feats.some(f => /Armor Proficiency|Weapon Proficiency/.test(f.name)), false);
  assert.equal(r.draft.class.id, 'soldier');
  assert.ok(r.draft.class.sourceId);
});

test('skill keys use V2\'s canonical resolver (Knowledge specializations are valid even though V2 has one Knowledge skill)', async () => {
  const r = await compileVia(byId('droid_noble_int_medical_coordinator'));
  assert.equal(r.blocked.some(b => b.code === 'SKILL_UNKNOWN'), false);
  assert.ok(r.draft.skills.trained.includes('knowledgeLifeSciences'));
});
