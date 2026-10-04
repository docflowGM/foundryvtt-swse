import assert from 'node:assert/strict';
import fs from 'node:fs';
import { derive, buildOutputs, OVERLAY_PATH, PASS2_MD_PATH } from '../tools/build-feat-tags-pass2-semantic-authority.mjs';
import { loadContext, validateAuthority, AUTHORITY_PATH, PASS2_AUTHORITY_PATH } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 2 owner adjudication: overlay + immutable Pass 1 -> working Pass 2 authority. No production mutation.
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const pass1 = rd(AUTHORITY_PATH), overlay = rd(OVERLAY_PATH), pass2 = rd(PASS2_AUTHORITY_PATH), ctx = loadContext();
const by = (a, id) => a.assignments.find(x => x.canonicalId === id);
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

const EXPECT = {
  '8a5cb28f625d6f02': { add: ['setup'], remove: [] },
  'c238f3f722689a3a': { add: ['unarmed', 'melee', 'battlefield_control'], remove: [] },
  '7bc21d4a74b95be5': { add: ['melee'], remove: [] },
  '3eed0b4f1227cf91': { add: ['melee', 'battlefield_control'], remove: ['restrain'] },
  'a8511e47656ef4dd': { add: ['unarmed'], remove: [] },
  '92f927c92ded9fcf': { add: ['attack_of_opportunity'], remove: [] },
  '2bb34366776f0371': { add: ['reroll', 'reliability'], remove: [] },
  'f313d17068d1cdea': { add: ['reroll'], remove: [] },
  '70962165bed8e5ed': { add: ['pilot'], remove: [] },
  '9c9e98a70538855c': { add: ['treat_injury'], remove: [] }
};

test('the Pass 1 authority file is untouched and still validates as Pass 1', () => {
  assert.equal(pass1.status, 'PASS1_COMPLETE_ALL_353_QC2_STANDARD');
  assert.deepEqual(validateAuthority(pass1, ctx).failures, []);
});
test('the committed Pass 2 authority equals a fresh deterministic derivation', () => {
  const out = buildOutputs();
  assert.equal(fs.readFileSync(new URL('../' + PASS2_AUTHORITY_PATH, import.meta.url), 'utf8'), out.json);
  assert.equal(fs.readFileSync(new URL('../' + PASS2_MD_PATH, import.meta.url), 'utf8'), out.md);
});
test('the Pass 2 authority validates and keeps 353 identities', () => {
  const v = validateAuthority(pass2, ctx, { pass: 2 });
  assert.deepEqual(v.failures, []); assert.equal(pass2.assignments.length, 353);
  assert.deepEqual(pass2.assignments.map(a => a.canonicalId), pass1.assignments.map(a => a.canonicalId));
});
test('exactly the ten approved records changed tags, exactly as ruled', () => {
  const changed = pass2.assignments.filter(a => JSON.stringify(a.finalTags) !== JSON.stringify(by(pass1, a.canonicalId).finalTags)).map(a => a.canonicalId).sort();
  assert.deepEqual(changed, Object.keys(EXPECT).sort());
  for (const [id, e] of Object.entries(EXPECT)) {
    const b = by(pass1, id).finalTags, a = by(pass2, id).finalTags;
    assert.deepEqual(a.filter(t => !b.includes(t)).sort(), [...e.add].sort(), id);
    assert.deepEqual(b.filter(t => !a.includes(t)).sort(), [...e.remove].sort(), id);
    assert.equal(new Set(a).size, a.length);
  }
});
test('kept tags survive: Crush restrain, Trip melee/battlefield_control, Informer reliability', () => {
  assert.ok(by(pass2, '7bc21d4a74b95be5').finalTags.includes('restrain'));
  assert.ok(['melee', 'battlefield_control'].every(t => by(pass2, 'a8511e47656ef4dd').finalTags.includes(t)));
  assert.ok(by(pass2, 'f313d17068d1cdea').finalTags.includes('reliability'));
});
test('Slammer does not infer medical/medicine/condition_removal/recovery', () => {
  const t = by(pass2, '9c9e98a70538855c').finalTags;
  for (const x of ['medical', 'medicine', 'condition_removal', 'recovery']) assert.ok(!t.includes(x));
});
test('rejected findings leave tags unchanged and record a PASS2_FALSE_POSITIVE ruling', () => {
  assert.equal(overlay.rejectedFindings.length, 8);
  for (const r of overlay.rejectedFindings) {
    const a = by(pass2, r.canonicalId);
    assert.deepEqual(a.finalTags, by(pass1, r.canonicalId).finalTags, r.name);
    assert.ok(!a.finalTags.includes(r.rejectedTag), r.name);
    assert.equal(a.pass2Rejections[0].ruling, 'PASS2_FALSE_POSITIVE');
  }
});
test('publication categories: three Skill Challenge corrections; Echani keeps both claims', () => {
  for (const id of ['2cc20fb67232f92f', 'db547ac84af63b06', 'ef64dc738a6afeeb']) assert.equal(by(pass2, id).publicationCategory, 'SKILL_CHALLENGE_FEAT');
  const e = by(pass2, 'f362e5a4ad0a98bd');
  assert.equal(e.publicationCategory, 'GENERAL'); assert.equal(e.primaryPublicationCategory, 'GENERAL');
  assert.deepEqual(e.publicationCategories.map(c => `${c.source}|${c.page}|${c.category}`).sort(), ['Galaxy at War|26|MARTIAL_ARTS_FEAT', 'Knights of the Old Republic Campaign Guide|33|GENERAL']);
  assert.deepEqual(e.finalTags, by(pass1, e.canonicalId).finalTags);
  assert.deepEqual(e.primaryPublication, by(pass1, e.canonicalId).primaryPublication);
});
test('derivation fails closed on an ADD of an already-present tag, a REMOVE of an absent tag, and a wrong name', () => {
  const mk = (patch) => { const o = JSON.parse(JSON.stringify(overlay)); patch(o.tagChanges[0]); return o; };
  assert.throws(() => derive(pass1, mk(c => { c.add = ['melee']; }), ctx), /already present/);
  assert.throws(() => derive(pass1, mk(c => { c.remove = ['grapple']; }), ctx), /not present/);
  assert.throws(() => derive(pass1, mk(c => { c.name = 'Cleave'; }), ctx), /overlay says/);
  assert.throws(() => derive(pass1, mk(c => { c.add = ['not_a_tag']; }), ctx), /not in the approved vocabulary/);
});
test('derivation does not mutate its inputs', () => {
  const a = JSON.stringify(pass1), b = JSON.stringify(overlay);
  derive(pass1, overlay, ctx);
  assert.equal(JSON.stringify(pass1), a); assert.equal(JSON.stringify(overlay), b);
});
test('Pass 2 reports are report-only and keep the production partition', () => {
  const r = rd('data/audits/feat-tags-pass2-production-reconciliation.json');
  assert.equal(r.status, 'REPORT_ONLY_NO_PRODUCTION_MUTATION');
  assert.equal(r.totals.productionRecords, 390); assert.equal(r.totals.productionPartitionCheck, 390);
  assert.equal(r.totals.canonicalMissingFromProduction, 2); assert.equal(r.totals.implementationDerivatives, 6);
  const s = rd('data/audits/feat-tags-pass2-skill-completeness-report.json');
  assert.equal(s.counts.openFindings, 0); assert.equal(s.counts.ownerClosedFalsePositives, 5);
});
test('family analysis: Improved Rapid Shot is a closed invalid reference, and no identity was invented', () => {
  const f = rd('data/audits/feat-tags-pass2-family-analysis-post-adjudication.json');
  const u = f.unresolvedOwnerNamedChainMembers.find(x => x.family === 'Rapid Shot / Improved Rapid Shot');
  assert.equal(u.pass2Disposition, 'PASS2_INVALID_FAMILY_REFERENCE');
  assert.ok(!pass2.assignments.some(a => /improved rapid shot/i.test(a.name)));
  assert.equal(f.statistics.dispositions.PASS2_INVALID_FAMILY_REFERENCE, 1);
});
console.log(`${n} tests passed`);
