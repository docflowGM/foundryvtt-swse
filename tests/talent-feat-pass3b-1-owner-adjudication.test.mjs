import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { derive, buildOutputs, OWNER_OVERLAY_PATH, AUTH3B_JSON, AUTH3B_MD, OWNER_OVERLAY_MD } from '../tools/build-talent-feat-pass3b-semantic-authority.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 3B.1 owner rulings, executed deterministically (no semantic decisions by the tool).
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const overlay = rd(OWNER_OVERLAY_PATH), auth = rd(AUTH3B_JSON), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json'), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json');
const vocab = new Set(baseline.sharedVocabulary);
const rec = (id) => auth.records.find(r => r.canonicalId === id);
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + rel, import.meta.url))).digest('hex');
const added = (id) => rec(id).finalTags.filter(t => !rec(id).baselineTags.includes(t));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('exactly 28 canonical records receive ADD operations and exactly 33 tags are added, with 0 removals', () => {
  const adds = overlay.decisions.filter(d => d.ownerAction === 'ADD');
  assert.equal(new Set(adds.map(d => `${d.domain}:${d.canonicalId}`)).size, 28); assert.equal(adds.length, 33);
  assert.equal(auth.counts.recordsChanged, 28); assert.equal(auth.counts.tagAdditions, 33); assert.equal(auth.counts.removals, 0);
  assert.equal(auth.counts.tagInstancesAfter - auth.counts.tagInstancesBefore, 33);
  for (const r of auth.records) assert.deepEqual(r.finalTags.slice(0, r.baselineTags.length), r.baselineTags);
  assert.ok(overlay.decisions.every(d => ['ADD', 'NO_CHANGE'].includes(d.ownerAction)));
});
test('22 records receive only NO_CHANGE rulings', () => {
  const addRec = new Set(overlay.decisions.filter(d => d.ownerAction === 'ADD').map(d => `${d.domain}:${d.canonicalId}`));
  const onlyNo = new Set(overlay.decisions.filter(d => d.ownerAction === 'NO_CHANGE').map(d => `${d.domain}:${d.canonicalId}`).filter(k => !addRec.has(k)));
  assert.equal(onlyNo.size, 22); assert.equal(auth.counts.recordsWithOnlyNoChange, 22);
});
test('no new tags: every ADD tag is in the 187-tag vocabulary and every ADD ID resolves exactly once', () => {
  assert.equal(vocab.size, 187); assert.equal(auth.sharedVocabulary.newTagsIntroduced, 0);
  for (const d of overlay.decisions) { assert.ok(vocab.has(d.tag), d.tag); assert.equal(auth.records.filter(r => r.domain === d.domain && r.canonicalId === d.canonicalId).length, 1, d.decisionId); }
  for (const r of auth.records) for (const t of r.finalTags) assert.ok(vocab.has(t));
});
test('decision identity is deterministic (domain + canonical ID + tag) with no duplicates', () => {
  const keys = overlay.decisions.map(d => `${d.domain}:${d.canonicalId}|${d.tag}`);
  assert.equal(new Set(keys).size, keys.length); for (const d of overlay.decisions) assert.equal(d.decisionId, `${d.domain}:${d.canonicalId}|${d.tag}`);
  for (const d of overlay.decisions) for (const k of ['domain', 'canonicalId', 'name', 'detectorEvidenceReference', 'ownerAction', 'tag', 'ownerRationale', 'ownerPolicyApplied']) assert.ok(d[k] !== undefined && d[k] !== '', `${d.decisionId} ${k}`);
});
test('the four specific action implications and force_point_spend -> resource_spend hold on every record', () => {
  const rules = REQUIRED_IMPLICATIONS.map(([a, b]) => `${a}>${b}`);
  for (const r of ['reaction>action_economy', 'swift_action>action_economy', 'move_action>action_economy', 'standard_action>action_economy', 'force_point_spend>resource_spend']) assert.ok(rules.includes(r), r);
  for (const r of auth.records) for (const [a, b] of REQUIRED_IMPLICATIONS) if (r.finalTags.includes(a)) assert.ok(r.finalTags.includes(b), `${r.name} ${a}->${b}`);
});
test('Scripted Routines ends with standard_action, move_action, swift_action and action_economy and is recorded as an owner completion', () => {
  const t = rec('8d0657e7ade688bd').finalTags; for (const x of ['standard_action', 'move_action', 'swift_action', 'action_economy']) assert.ok(t.includes(x), x);
  assert.deepEqual(added('8d0657e7ade688bd'), ['standard_action', 'move_action', 'swift_action']);
  assert.deepEqual(overlay.batches[0].ownerDirectedCompletions[0].tags, ['move_action', 'swift_action']);
  const dec = overlay.decisions.filter(d => d.canonicalId === '8d0657e7ade688bd'); assert.equal(dec.find(d => d.tag === 'move_action').ownerDirectedCompletionBeyondDetector.length, 2);
  assert.deepEqual(dec.find(d => d.tag === 'move_action').detectorEvidenceReference, ['OWNER_COMPLETION_RULING']);
});
test('NO_CHANGE rulings: Visionary Defense, Biotech Specialist and Electronic Sabotage gain nothing', () => {
  assert.ok(!rec('153f4b3c6510023d').finalTags.includes('reroll'));
  assert.ok(!rec('bf6c01fa590a3f75').finalTags.includes('reliability')); assert.ok(!rec('0290634450ab1637').finalTags.includes('reliability'));
  for (const id of ['153f4b3c6510023d', 'bf6c01fa590a3f75', '0290634450ab1637', 'baff0da30d0bc8ee', '1f404db00518aeed']) assert.deepEqual(added(id), [], id);
  assert.equal(overlay.decisions.filter(d => d.canonicalId === '153f4b3c6510023d' && d.tag === 'reroll').length, 1);
});
test('none of the 12 listed Force Point false positives gain force_point_spend', () => {
  const ids = ['462df9a631ee50f4', '8223d30bfce0c14d', '8ddbbeb09758295d', 'ab9f1497d0b2d7c2', 'b0898acb0a19a3cd', 'b47beb909e6fce63', 'ced81064716debaa', 'd1ced133cee0a6fa', 'ddacb8e4517da6b5', 'f541b5e57c5af27e', 'f5ebaf5d77257e0c', 'fcc6357b5b33dbb7'];
  assert.equal(ids.length, 12); for (const id of ids) { assert.ok(!rec(id).finalTags.includes('force_point_spend'), id); assert.ok(overlay.decisions.some(d => d.canonicalId === id && d.tag === 'force_point_spend' && d.ownerAction === 'NO_CHANGE')); }
});
test('single-record rulings: Suppress Force, Precognitive Meditation, Armored Augmentation I, Force Boon', () => {
  assert.deepEqual(added('ec3e6a05561ddc07'), ['resource_spend']); assert.deepEqual(added('f8ac7fecc8d3c8ff'), ['resource_recovery']);
  assert.deepEqual(added('98355ed4f6473028'), ['once-per-encounter']); assert.deepEqual(added('53444cc061d81627'), ['force_capacity']);
  assert.ok(!rec('45c4e72d74c44acb').finalTags.includes('once-per-encounter') || rec('45c4e72d74c44acb').baselineTags.includes('once-per-encounter'));
  assert.ok(!rec('cfd5d3f677b2bf1a').finalTags.includes('once-per-encounter') || rec('cfd5d3f677b2bf1a').baselineTags.includes('once-per-encounter'));
});
test('owner-approved action tags land exactly as ruled (spot checks across the batch)', () => {
  assert.deepEqual(added('7a024dac260bf9ec'), ['reaction']); assert.deepEqual(added('313095ada7504547'), ['swift_action', 'action_economy']);
  assert.deepEqual(added('125c328c4573890a'), ['move_action', 'action_economy']); assert.deepEqual(added('55483fd350b3ba28'), ['move_action', 'action_economy']);
  for (const id of ['600f43af4edb16f7', '80805c30ea6dd11e', '9af3ba38a2c671b8', 'd48614f7ae500a5b', 'f59c9679c02b8896', '0df15b0ea7721c50', '1204459eaaff9efa', '4a3fdcd0f32062b2', '959f16cb707d8360', 'd32459fe16029f2a']) assert.deepEqual(added(id), ['action_economy'], id);
  assert.ok(!baseline.sharedVocabulary.includes('full_round_action') && !baseline.sharedVocabulary.includes('free_action'));
});
test('authority is exactly 353 feats + 1,187 talents = 1,540 and production files are unchanged', () => {
  assert.equal(auth.counts.feats, 353); assert.equal(auth.counts.talents, 1187); assert.equal(auth.counts.combined, 1540); assert.equal(auth.counts.productionMutated, false);
  for (const [f, h] of Object.entries(baseline.sourceSha256)) assert.equal(sha(f), h, f);
  const pins = { 'packs/talents.db': '832937d451c2353da9afbd6b1f34366b293b659f24b3d09808d44ad767ee8288', 'packs/feats.db': '9c67242a67b209a2c3d359201beb03e512962998e6bacee6d8c3eedd4787d3e8', 'data/feat-catalog.json': 'e7907810f492e036517822a19f45ac1242fe2ec0044e7b2ad241f858f9925eef' };
  for (const [f, h] of Object.entries(pins)) assert.equal(sha(f), h, f);
});
test('rebuild is byte-stable (authority, overlay documentation)', () => {
  const a = buildOutputs(), b = buildOutputs(); assert.equal(a.json, b.json);
  assert.equal(txt(AUTH3B_JSON), a.json); assert.equal(txt(AUTH3B_MD), a.md); assert.equal(txt(OWNER_OVERLAY_MD), a.overlayMd);
});
test('derivation fails closed: wrong name, tag already present, outside vocabulary, duplicate decision, expectation mismatch, unauthorized action', () => {
  const mk = (patch) => { const o = JSON.parse(JSON.stringify(overlay)); patch(o); return o; };
  assert.throws(() => derive(baseline, mk(o => { o.decisions[0].name = 'Nope'; })), /name guard/);
  assert.throws(() => derive(baseline, mk(o => { const d = o.decisions.find(x => x.ownerAction === 'ADD'); d.tag = baseline.records.find(r => r.domain === d.domain && r.canonicalId === d.canonicalId).tags[0]; d.decisionId = `${d.domain}:${d.canonicalId}|${d.tag}`; })), /already present/);
  assert.throws(() => derive(baseline, mk(o => { const d = o.decisions[0]; d.tag = 'full_round_action'; d.decisionId = `${d.domain}:${d.canonicalId}|${d.tag}`; })), /outside the 187-tag vocabulary/);
  assert.throws(() => derive(baseline, mk(o => { o.decisions.push({ ...o.decisions[0] }); })), /duplicate owner decision/);
  assert.throws(() => derive(baseline, mk(o => { o.decisions = o.decisions.filter(d => d.canonicalId !== 'f8ac7fecc8d3c8ff'); })), /DISCREPANCY/);
  assert.throws(() => derive(baseline, mk(o => { o.decisions[0].ownerAction = 'REMOVE'; })), /not authorized/);
});
test('discovery dispositions: only decided findings change state; every other finding is unchanged', () => {
  const decided = new Set(overlay.decisions.map(d => `${d.domain}:${d.canonicalId}|${d.tag}`));
  assert.equal(discovery.ownerDecidedItems.length, 57); assert.equal(discovery.dashboard.ownerDecisionsWithoutDiscoveryItem, 2);
  for (const i of discovery.ownerDecidedItems) assert.ok(decided.has(`${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  for (const i of discovery.ownerReviewItems) { assert.equal(i.state, 'PASS3B_OWNER_REVIEW'); assert.ok(!decided.has(`${i.domain}:${i.canonicalId}|${i.comparedTag}`)); }
  assert.deepEqual(discovery.ownerDecisionsWithoutDiscoveryItem.map(d => d.decisionId).sort(), ['TALENT:8d0657e7ade688bd|move_action', 'TALENT:8d0657e7ade688bd|swift_action']);
});
test('Visionary Defense reliability is closed by its own owner decision; no other finding is silently adjudicated', () => {
  const dec = overlay.decisions.filter(d => d.canonicalId === '153f4b3c6510023d');
  assert.deepEqual(dec.map(d => `${d.tag}:${d.ownerAction}`).sort(), ['reliability:NO_CHANGE', 'reroll:NO_CHANGE']);
  assert.equal(overlay.decisions.filter(d => d.decisionId === 'TALENT:153f4b3c6510023d|reliability').length, 1);
  const item = discovery.ownerDecidedItems.find(i => i.canonicalId === '153f4b3c6510023d' && i.comparedTag === 'reliability');
  assert.equal(item.state, 'PASS3B_OWNER_NO_CHANGE'); assert.deepEqual(rec('153f4b3c6510023d').finalTags, rec('153f4b3c6510023d').baselineTags);
  assert.equal(auth.counts.ownerDecisions, 59); assert.equal(auth.counts.noChangeDecisions, 26);
  assert.equal(discovery.dashboard.ownerReviewRecordItems, 289); assert.equal(discovery.dashboard.ownerReviewCandidates, 315);
  const decided = new Set(overlay.decisions.map(d => `${d.domain}:${d.canonicalId}|${d.tag}`));
  for (const i of discovery.ownerReviewItems) assert.ok(!decided.has(`${i.domain}:${i.canonicalId}|${i.comparedTag}`));
});
console.log(`${n} tests passed`);
