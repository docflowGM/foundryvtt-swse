import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkDispositions } from '../tools/check-talent-phase-3d-dispositions.mjs';
import { detectPackState } from '../tools/apply-talent-phase-3c.mjs';

const rj = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const rdb = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const manifest = rj('data/audits/talent-phase-3d-dispositions.json');
const census = rj('data/audits/talent-phase-3d-production-extras-census.json');
const talents = rdb('packs/talents.db');
const actors = { heroic: rdb('packs/heroic.db'), nonheroic: rdb('packs/nonheroic.db'), npc: rdb('packs/npc.db') };
const run = m => checkDispositions({ manifest: m, census, talents, actors });
const clone = v => structuredClone(v);
let passed = 0; const test = (n, fn) => { fn(); passed++; console.log('  ok  ' + n); };
if (['POST_3D_STATE', 'POST_3E4_STATE', 'POST_3E5_STATE', 'POST_3F_STATE', 'POST_3G_STATE', 'POST_11_2A_STATE', 'POST_11_2B_STATE', 'POST_11_2C_STATE'].includes(detectPackState().state)) {
  // The checker compares the manifest to the live pre-migration packs/actors, which no longer exist after Phase 3D is applied;
  // the post-state is certified by tools/apply-talent-phase-3d.mjs --verify --exact and tests/talent-phase-3d-post-state.test.mjs.
  test('final 3D-2 totals still match the owner rulings (static)', () => {
    const tally = {}; for (const r of manifest.records) tally[r.finalDisposition] = (tally[r.finalDisposition] || 0) + 1;
    assert.deepEqual(tally, { MERGE_DUPLICATE: 19, REMOVE_CONTAMINATION: 16, KEEP_CANONICAL_ADDITIONAL_PUBLICATION: 6, CORRECT_IDENTITY: 1, MOVE_HOMEBREW_PACK: 50 });
  });
  console.log('  skip live-pack checker cases (Phase 3D applied)');
  console.log(`\n${passed} talent-phase-3d review-extra checks passed (post-state subset)`);
  process.exit(0);
}
const rec = id => manifest.records.find(r => r.productionId === id);

test('manifest accounts for all 92 inherited records with no checker errors', () => assert.deepEqual(run(manifest), []));
test('missing / duplicated / unknown-disposition records are rejected', () => {
  let m = clone(manifest); m.records.pop(); assert.ok(run(m).some(e => /missing record|exactly 92/.test(e)));
  m = clone(manifest); m.records.push(clone(m.records[0])); assert.ok(run(m).some(e => /appears 2 times|exactly 92/.test(e)));
  m = clone(manifest); m.records[3].finalDisposition = 'DELETE_IT'; assert.ok(run(m).some(e => /unknown disposition/.test(e)));
});
test('Teräs Käsi Basics 222327492c484b4a merges into canonical 67bddb17ae2770f3 (never the reverse)', () => {
  const r = rec('222327492c484b4a');
  assert.equal(r.finalDisposition, 'MERGE_DUPLICATE'); assert.equal(r.survivorId, '67bddb17ae2770f3');
  const surv = talents.find(t => t._id === '67bddb17ae2770f3');
  assert.equal(surv.system.source, 'Threats of the Galaxy'); assert.equal(surv.flags.swse.id, 'swse.talent.teras_kasi_basics');
  assert.equal(r.referencesToRepoint.actorPackEmbeddedItems.length, 2);
  assert.ok(r.referencesToRepoint.actorPackEmbeddedItems.every(x => x.replacementId === '67bddb17ae2770f3'));
});
test('Notorious a7d8c4da96eacad4 is contamination: its text is three other talents, not Notorious', () => {
  const r = rec('a7d8c4da96eacad4'); const t = talents.find(x => x._id === r.productionId);
  assert.equal(r.finalDisposition, 'REMOVE_CONTAMINATION');
  for (const frag of ['invoke your name', 'second Persuasion check against the same target', 'small favor from someone who owes you']) assert.ok(t.system.benefit.includes(frag), frag);
  assert.ok(!/Your (skill as a bounty hunter|reputation as a crime lord) is known/.test(t.system.benefit), 'must not contain real Notorious text');
});
test('every one of the 32 Notorious actor references is repointed to an existing canonical Notorious by class', () => {
  const list = rec('a7d8c4da96eacad4').referencesToRepoint.actorPackEmbeddedItems;
  assert.equal(list.length, 32);
  const targets = new Set(list.map(x => x.replacementId));
  assert.deepEqual([...targets].sort(), ['09744041cdcc9e22', 'c67cbd59abd1cc53']);
  for (const x of list) {
    const bh = /\bHunter\b/.test(x.actorClasses), lord = /\b(Crime Lord|Lord)\b/.test(x.actorClasses);
    assert.equal(x.replacementId, bh && !lord ? 'c67cbd59abd1cc53' : '09744041cdcc9e22', x.actor);
  }
});
test('deleting with an unlisted actor reference is refused', () => {
  const m = clone(manifest); rec('a7d8c4da96eacad4'); m.records.find(r => r.productionId === 'a7d8c4da96eacad4').referencesToRepoint.actorPackEmbeddedItems.pop();
  assert.ok(run(m).some(e => /unresolved live actor reference/.test(e)));
});
test('nonexistent replacement / survivor ID is refused', () => {
  let m = clone(manifest); m.records.find(r => r.productionId === '222327492c484b4a').survivorId = 'ffffffffffffffff';
  assert.ok(run(m).some(e => /survivor .* does not exist/.test(e)));
  m = clone(manifest); m.records.find(r => r.productionId === 'a7d8c4da96eacad4').referencesToRepoint.actorPackEmbeddedItems[0].replacementId = 'ffffffffffffffff';
  assert.ok(run(m).some(e => /replacement .* does not exist/.test(e)));
});
test('identity is never name-only: both Notorious canonical identities and the Teräs twin are distinct records', () => {
  const n = talents.filter(t => t.name === 'Notorious').map(t => t._id).sort();
  assert.deepEqual(n, ['09744041cdcc9e22', 'a7d8c4da96eacad4', 'c67cbd59abd1cc53']);
  assert.equal(new Set(talents.filter(t => t.name === 'Notorious').map(t => t.system.treeId)).size, 2);
});
test('adjudication touches no Phase 3C canonical record', () => {
  assert.ok(manifest.records.every(r => r.phase3cCanonicalRecordTouched === false));
});
test('final 3D-2 totals: REVIEW_REQUIRED is 0 and the tally matches the owner rulings', () => {
  const tally = {}; for (const r of manifest.records) tally[r.finalDisposition] = (tally[r.finalDisposition] || 0) + 1;
  assert.deepEqual(tally, { MERGE_DUPLICATE: 19, REMOVE_CONTAMINATION: 16, KEEP_CANONICAL_ADDITIONAL_PUBLICATION: 6, CORRECT_IDENTITY: 1, MOVE_HOMEBREW_PACK: 50 });
  assert.ok(manifest.records.every(r => r.adjudicationStatus === 'ADJUDICATED'));
  const m = clone(manifest); const x = m.records.find(r => r.finalDisposition === 'MOVE_HOMEBREW_PACK'); x.homebrewMove.idPreserved = false;
  assert.ok(run(m).some(e => /must preserve the _id/.test(e)));
});
test('Stolen Form is kept as an official additional publication (not quarantined with the homebrew records)', () => {
  const r = rec('f9352f317ad2f695'); assert.equal(r.finalDisposition, 'KEEP_CANONICAL_ADDITIONAL_PUBLICATION');
  assert.equal(r.evidence.status, 'PDF_CONFIRMED_BY_OWNER'); assert.equal(r.referencesToRepoint.actorPackEmbeddedItems.length, 2);
});
test('the canonical prerequisite allow-list is enforced (flag, path, scope, target, text)', () => {
  const mut = fn => { const m = clone(manifest); fn(m.canonicalPrerequisiteRepoints); return run(m); };
  assert.ok(mut(c => { c.flag = 'x'; }).some(e => /PHASE_3C_CANONICAL_RECORD_TOUCHED/.test(e)));
  assert.ok(mut(c => { c.repoints[0].path = 'system.benefit'; }).some(e => /not an allow-listed/.test(e)));
  assert.ok(mut(c => { c.repoints[0].recordId = 'a7d8c4da96eacad4'; }).some(e => /outside the inherited 92/.test(e)));
  assert.ok(mut(c => { c.repoints[0].to = 'a7d8c4da96eacad4'; }).some(e => /must exist and stay canonical/.test(e)));
  assert.ok(mut(c => { c.repoints[4].preservePrerequisiteText = 'Dastardly Attack'; }).some(e => /prerequisite text/.test(e)));
  assert.ok(mut(c => { c.repoints[0].phase3cCanonicalRecordTouched = false; }).some(e => /marked phase3cCanonicalRecordTouched/.test(e)));
  assert.deepEqual(manifest.canonicalPrerequisiteRepoints.repoints.map(r => r.recordName), ['Fearsome', 'Ruthless Negotiator', 'Shared Notoriety', 'Unsavory Reputation', 'Weakening Strike']);
});
test('a merge survivor may not itself be scheduled for deletion', () => {
  const m = clone(manifest); const a = m.records.find(r => r.finalDisposition === 'MERGE_DUPLICATE'); const b = m.records.filter(r => r.finalDisposition === 'REMOVE_CONTAMINATION')[0];
  a.survivorId = b.productionId; assert.ok(run(m).some(e => /scheduled for deletion/.test(e)));
});
test('name-variant merges keep the survivor in the same tree as the duplicate (Hotwire is the one documented cross-tree case)', () => {
  const T = new Map(talents.map(t => [t._id, t]));
  for (const r of manifest.records.filter(x => x.finalDisposition === 'MERGE_DUPLICATE' && x.productionId !== '5644990a390a4178')) {
    const dupTree = T.get(r.productionId).system.treeId, survTree = T.get(r.survivorId).system.treeId;
    assert.equal(dupTree, survTree, `${r.name}: duplicate and survivor are in different trees`);
  }
});
console.log(`\n${passed} talent-phase-3d review-extra checks passed`);
