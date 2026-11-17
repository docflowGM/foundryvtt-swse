import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../scripts/engine/progression/profile/json-schema-lite.js';
import { buildAll, AUTHORING_CORRECTIONS } from '../tools/build-galactic-profiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data/galactic-profiles/v3');
const J = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const schema = J('galactic-profiles.schema.json');
const doc = J('galactic-profiles.json');
const catalog = J('galactic-profiles.catalog.json');
const evidence = J('galactic-profiles.evidence.json');
const srcOrganic = J('SWSE_Galactic_Profiles_v3.json');
const srcDroid = J('droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json');
const clone = v => JSON.parse(JSON.stringify(v));
const byId = id => doc.profiles.find(p => p.profileId === id);

test('all 41 profiles are present and unique, split 23/8/2/8 by subtype', () => {
  assert.equal(doc.profiles.length, 41);
  assert.equal(new Set(doc.profiles.map(p => p.profileId)).size, 41);
  const n = {};
  for (const p of doc.profiles) n[p.subtype] = (n[p.subtype] || 0) + 1;
  assert.deepEqual(n, { actor: 23, nonheroic: 8, beast: 2, droid: 8 });
});

test('the single unified schema accepts the whole runtime document', () => {
  assert.deepEqual(validate(schema, doc), []);
});

test('committed outputs are exactly a fresh build (deterministic generator)', () => {
  const fresh = buildAll();
  assert.deepEqual(doc, fresh.profiles);
  assert.deepEqual(catalog, fresh.catalog);
  assert.deepEqual(evidence, fresh.evidence);
});

test('a profile is rejected by every OTHER subtype branch (contradictions cannot validate)', () => {
  for (const p of doc.profiles) {
    for (const other of ['actor', 'droid', 'nonheroic', 'beast']) {
      if (other === p.subtype) continue;
      const mutated = clone(doc);
      mutated.profiles = [{ ...clone(p), subtype: other }];
      assert.notDeepEqual(validate(schema, mutated), [], `${p.profileId} must not validate as ${other}`);
    }
  }
});

test('subtype-specific rules: droid has no CON and no species, others have CON', () => {
  const droid = clone(byId('droid_soldier_dex_security_enforcer'));
  assert.equal('con' in droid.choices.attributes.base, false);
  assert.equal(droid.choices.species, null);
  const withCon = clone(doc); withCon.profiles = [clone(droid)]; withCon.profiles[0].choices.attributes.base.con = 10;
  assert.notDeepEqual(validate(schema, withCon), []);
  const noCon = clone(doc); noCon.profiles = [clone(byId('scout_sniper'))]; delete noCon.profiles[0].choices.attributes.base.con;
  assert.notDeepEqual(validate(schema, noCon), []);
  const forceDroid = clone(doc); forceDroid.profiles = [clone(droid)];
  forceDroid.profiles[0].choices.forcePowers = [{ name: 'x', sourceId: 'x' }];
  assert.notDeepEqual(validate(schema, forceDroid), []);
});

test('evidence preserves every original authored record verbatim', () => {
  const originals = [...srcOrganic.profiles, ...srcDroid.profiles];
  assert.equal(Object.keys(evidence.profiles).length, 41);
  for (const o of originals) assert.deepEqual(evidence.profiles[o.profileId], o, o.profileId);
});

test('authored selections are preserved in choices (no loss, no invention)', () => {
  for (const o of [...srcOrganic.profiles, ...srcDroid.profiles]) {
    const p = byId(o.profileId);
    const b = o.build;
    const droid = o.identity.participantKind === 'droid';
    assert.equal(p.revision, o.revision);
    assert.equal(p.choices.wallet.credits, b.startingPackage.wallet.credits, `${o.profileId} wallet`);
    assert.deepEqual(p.choices.feats.map(f => f.name), b.feats.sourceSelections.map(f => f.displayName), `${o.profileId} feats`);
    assert.deepEqual(p.choices.forcePowers.map(f => f.name), (b.forcePowers.sourceSelections || []).map(f => f.sourceRef.name));
    assert.deepEqual(p.choices.equipment.map(e => [e.name, e.qty]), b.startingPackage.items.map(i => [i.displayName, i.quantity]));
    const authoredSkills = b.skills.trained.map(s => s.canonicalKeyCandidate).filter(Boolean);
    assert.deepEqual(p.choices.skills, authoredSkills);
    assert.equal(p.choices.skills.length + p.choices.unresolved.filter(u => u.path === 'skills').length, b.skills.trained.length);
    if (b.talents.classSlot?.selection) assert.equal(p.choices.talents[0].name, b.talents.classSlot.selection.sourceRef.name);
    const scores = droid ? b.attributes.preDegreeAndSizeScores : b.attributes.scores;
    for (const k of ['str', 'dex', 'int', 'wis', 'cha']) assert.equal(p.choices.attributes.base[k], scores[k], `${o.profileId} ${k}`);
    if (!droid) assert.equal(p.choices.attributes.base.con, scores.con);
    assert.deepEqual(p.provenance.sourceRefs.class, o.identity.classRef ?? null, 'original classRef retained in provenance');
    assert.equal(p.provenance.legacyClassification.rulesTrack, o.identity.rulesTrack);
  }
});

test('droid hardware selections are preserved byte-for-byte; attributes are the PRE-modifier array', () => {
  for (const o of srcDroid.profiles) {
    const p = byId(o.profileId);
    assert.deepEqual(p.extension.droid.systems, o.build.droid.droidSystems);
    assert.equal(p.extension.droid.degree, o.build.droid.droidDegree);
    assert.equal(p.extension.droid.size, o.build.droid.droidSize);
    assert.equal(p.choices.attributes.basis, 'droidPreModifier');
    const { con, ...pre } = o.build.attributes.preDegreeAndSizeScores;
    assert.deepEqual(p.choices.attributes.base, pre);
    assert.notDeepEqual(p.choices.attributes.base, { ...o.build.attributes.scores, con: undefined }, 'final scores must not be committed as base');
  }
});

test('attribute basis is never silently resolved: only the authored-note profile is "base"', () => {
  const organic = doc.profiles.filter(p => p.subtype !== 'droid');
  const resolved = organic.filter(p => p.choices.attributes.basis === 'base').map(p => p.profileId);
  assert.deepEqual(resolved, ['soldier_brawler']);
  assert.ok(organic.filter(p => p.choices.attributes.basis === 'unresolved').length === 32);
});

test('nonheroic and beast profiles use the V2 synthetic class and keep the original classRef as provenance', () => {
  for (const p of doc.profiles.filter(x => x.subtype === 'nonheroic' || x.subtype === 'beast')) {
    assert.equal(p.choices.class, 'nonheroic');
    assert.ok(p.provenance.sourceRefs.class?.sourceRef?.name, `${p.profileId} original classRef retained`);
  }
});

test('authoring corrections are verified against the canonical V2 pack identity (exactly one exact-name doc)', () => {
  for (const [name, corr] of Object.entries(AUTHORING_CORRECTIONS.items)) {
    const docs = [];
    for (const f of fs.readdirSync(path.join(ROOT, 'packs')).filter(x => x.startsWith('equipment') && x.endsWith('.db'))) {
      for (const line of fs.readFileSync(path.join(ROOT, 'packs', f), 'utf8').split('\n').filter(Boolean)) {
        const d = JSON.parse(line); if (d.name === name) docs.push(d._id);
      }
    }
    assert.ok(docs.length >= 1, `${name} exists`);
    assert.deepEqual([...new Set(docs)], [corr.id], `${name} resolves to exactly one id`);
  }
});

test('known open blockers are carried structurally (never silently dropped)', () => {
  assert.deepEqual(byId('beast-wolf').choices.rulingBlocks, ['GP-RD-001', 'GP-RD-010']);
  assert.deepEqual(byId('beast-bear').choices.rulingBlocks, ['GP-RD-010']);
  assert.deepEqual(byId('laborer-worker').choices.unresolved.map(u => u.authored), ['Athletics']);
});

test('single generated catalog covers all 41 and matches the profiles', () => {
  assert.equal(catalog.totalProfiles, 41);
  for (const c of catalog.profiles) {
    const p = byId(c.profileId);
    assert.equal(c.subtype, p.subtype);
    assert.equal(c.name, p.catalog.name);
    assert.equal(c.className, p.catalog.className);
  }
});
