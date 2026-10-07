import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { derive, buildOutputs, OWNER_OVERLAY_PATH, AUTH3B_JSON, AUTH3B_MD, OWNER_OVERLAY_MD } from '../tools/build-talent-feat-pass3b-semantic-authority.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 3B.2A owner rulings (damage + critical), executed deterministically; the tool makes no semantic decisions.
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const overlay = rd(OWNER_OVERLAY_PATH), auth = rd(AUTH3B_JSON), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json'), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json');
const b2a = overlay.decisions.filter(d => d.batch === '3B.2A');
const rec = (domain, id) => auth.records.find(r => r.domain === domain && r.canonicalId === id);
// additions made by THIS batch only (later batches may add more tags to the same record)
const added = (domain, id) => rec(domain, id).finalTags.filter(t => !rec(domain, id).baselineTags.includes(t) && b2a.some(d => d.domain === domain && d.canonicalId === id && d.tag === t && d.ownerAction === 'ADD'));
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + rel, import.meta.url))).digest('hex');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

const ADD = [['TALENT', '2739921a657a49a496885c456bcace65', 'damage_threshold'], ['TALENT', '43ac0c4b1759507a', 'damage_threshold'], ['TALENT', 'ad7fd3e1a2b04c30', 'damage_threshold'], ['FEAT', '6fb0f56dd9b9b75c', 'sustained_damage'], ['TALENT', '0fb750f0f0e6f767', 'critical_success']];
const NO = [['FEAT', '1f404db00518aeed', 'damage_bonus'], ['FEAT', 'ccc7a6e191e811a4', 'damage_bonus'], ['FEAT', 'f59c9679c02b8896', 'damage_bonus'], ['TALENT', '22674c41b3d185be', 'damage_bonus'],
  ['FEAT', 'd9ecf143e6a9f889', 'critical_success'], ['TALENT', '04985a42930dff2a', 'critical_success'], ['TALENT', '141e1a07b365e0fd', 'critical_success'], ['TALENT', '7cbd576e420a36b0', 'critical_success'], ['TALENT', '88ca4add87c2a86a', 'critical_success'], ['TALENT', 'cdf46b8cdde49733', 'critical_success'], ['TALENT', '70a06f3be4e9c216', 'critical_success'], ['TALENT', 'f8ac7fecc8d3c8ff', 'critical_success']];

test('all 17 exact owner rulings exist once (5 ADD, 12 NO_CHANGE) with policy, rationale and evidence reference', () => {
  assert.equal(b2a.length, 17); assert.equal(b2a.filter(d => d.ownerAction === 'ADD').length, 5); assert.equal(b2a.filter(d => d.ownerAction === 'NO_CHANGE').length, 12);
  for (const [dom, id, tag] of ADD) assert.equal(b2a.filter(d => d.decisionId === `${dom}:${id}|${tag}` && d.ownerAction === 'ADD').length, 1, id);
  for (const [dom, id, tag] of NO) assert.equal(b2a.filter(d => d.decisionId === `${dom}:${id}|${tag}` && d.ownerAction === 'NO_CHANGE').length, 1, id);
  for (const d of b2a) { assert.ok(d.ownerRationale && d.ownerPolicyApplied && d.detectorEvidenceReference.length); assert.ok(overlay.ownerPolicies.some(p => p.id === d.ownerPolicyApplied)); }
  for (const id of ['DAMAGE_THRESHOLD_POLICY', 'DAMAGE_BONUS_POLICY', 'SUSTAINED_DAMAGE_POLICY', 'CRITICAL_SUCCESS_POLICY']) assert.equal(overlay.ownerPolicies.filter(p => p.id === id).length, 1);
});
test('3B.2A decisions are unique, add 5 tags to 5 records, and the authority carries them with 0 removals and no new tags', () => {
  const ids = overlay.decisions.map(d => d.decisionId); assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(b2a.filter(d => d.ownerAction === 'ADD').map(d => `${d.domain}:${d.canonicalId}`)).size, 5);
  for (const [dom, id, tag] of ADD) assert.ok(rec(dom, id).finalTags.includes(tag) && !rec(dom, id).baselineTags.includes(tag), id);
  assert.equal(auth.counts.removals, 0); assert.equal(auth.sharedVocabulary.newTagsIntroduced, 0);
  const v = new Set(baseline.sharedVocabulary); assert.equal(v.size, 187); for (const r of auth.records) for (const t of r.finalTags) assert.ok(v.has(t));
  for (const r of auth.records) assert.deepEqual(r.finalTags.slice(0, r.baselineTags.length), r.baselineTags);
});
test('three Damage Threshold records gain damage_threshold; Deadly Sniper gains sustained_damage; Martial Resurgence gains critical_success', () => {
  for (const [dom, id] of ADD.slice(0, 3)) assert.deepEqual(added(dom, id), ['damage_threshold'], id);
  assert.deepEqual(added('FEAT', '6fb0f56dd9b9b75c'), ['sustained_damage']); assert.deepEqual(added('TALENT', '0fb750f0f0e6f767'), ['critical_success']);
  assert.ok(rec('TALENT', '0fb750f0f0e6f767').finalTags.includes('resource_recovery'));
});
test('none of the four Damage Bonus NO_CHANGE records gains damage_bonus; the other eight natural-20 findings do not gain critical_success', () => {
  for (const [dom, id, tag] of NO.filter(x => x[2] === 'damage_bonus')) assert.ok(!added(dom, id).includes(tag), id);
  const nat = NO.filter(x => x[2] === 'critical_success'); assert.equal(nat.length, 8);
  for (const [dom, id] of nat) assert.ok(!added(dom, id).includes('critical_success'), id);
});
test('Precognitive Meditation keeps its 3B.1 resource_recovery ADD and gains no critical_success', () => {
  const t = rec('TALENT', 'f8ac7fecc8d3c8ff'); assert.deepEqual(t.finalTags.filter(x => !t.baselineTags.includes(x)), ['resource_recovery']);
  assert.ok(!t.finalTags.includes('critical_success')); assert.ok(overlay.decisions.some(d => d.batch === '3B.1' && d.decisionId === 'TALENT:f8ac7fecc8d3c8ff|resource_recovery' && d.ownerAction === 'ADD'));
});
test('all hard implications are satisfied; working authority is exactly 353 feats + 1,187 talents', () => {
  for (const r of auth.records) for (const [a, b] of REQUIRED_IMPLICATIONS) if (r.finalTags.includes(a)) assert.ok(r.finalTags.includes(b), `${r.name} ${a}->${b}`);
  assert.equal(auth.counts.feats, 353); assert.equal(auth.counts.talents, 1187); assert.equal(auth.counts.combined, 1540);
});
test('discovery dispositions: exactly the 17 decided findings changed; closed findings are no longer open', () => {
  const decided = discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch === '3B.2A'); assert.equal(decided.length, 17);
  for (const [dom, id, tag] of ADD) assert.equal(decided.find(i => i.domain === dom && i.canonicalId === id && i.comparedTag === tag).state, 'PASS3B_OWNER_APPROVED');
  for (const [dom, id, tag] of NO) assert.equal(decided.find(i => i.domain === dom && i.canonicalId === id && i.comparedTag === tag).state, 'PASS3B_OWNER_NO_CHANGE');
    const open = new Set(discovery.ownerReviewItems.map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  for (const d2 of b2a) assert.ok(!open.has(`${d2.domain}:${d2.canonicalId}|${d2.tag}`));
});
test('derivation fails closed for 3B.2A: wrong ID/name, ADD of an already-present tag, cumulative discrepancy', () => {
  const mk = (patch) => { const o = JSON.parse(JSON.stringify(overlay)); patch(o); return o; };
  assert.throws(() => derive(baseline, mk(o => { o.decisions.find(d => d.batch === '3B.2A').name = 'Nope'; })), /name guard/);
  assert.throws(() => derive(baseline, mk(o => { const d = o.decisions.find(x => x.batch === '3B.2A' && x.ownerAction === 'ADD'); d.tag = baseline.records.find(r => r.domain === d.domain && r.canonicalId === d.canonicalId).tags[0]; d.decisionId = `${d.domain}:${d.canonicalId}|${d.tag}`; })), /already present/);
  assert.throws(() => derive(baseline, mk(o => { o.decisions = o.decisions.filter(d => d.decisionId !== 'TALENT:0fb750f0f0e6f767|critical_success'); })), /DISCREPANCY/);
  assert.throws(() => derive(baseline, mk(o => { o.cumulativeExpected.tagAdditions = 39; })), /CUMULATIVE DISCREPANCY/);
});
test('production files unchanged and rebuild is byte-stable', () => {
  // Phase 5C regenerated packs/feats.db and data/feat-catalog.json from data/canonical/feats.json; the live feat files are gated by
  // tools/verify-canonical-production.mjs (these report-only phases pinned the pre-cutover hashes).
  const pins = { 'packs/talents.db': '832937d451c2353da9afbd6b1f34366b293b659f24b3d09808d44ad767ee8288', };
  for (const [f, h] of Object.entries(pins)) assert.equal(sha(f), h, f); assert.equal(auth.counts.productionMutated, false);
  const a = buildOutputs(), b = buildOutputs(); assert.equal(a.json, b.json); assert.equal(txt(AUTH3B_JSON), a.json); assert.equal(txt(AUTH3B_MD), a.md); assert.equal(txt(OWNER_OVERLAY_MD), a.overlayMd);
});
console.log(`${n} tests passed`);
