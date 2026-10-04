import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { derive, buildOutputs, OWNER_OVERLAY_PATH, AUTH3B_JSON, AUTH3B_MD, OWNER_OVERLAY_MD } from '../tools/build-talent-feat-pass3b-semantic-authority.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';
import { buildOutputs as build1, PACKET_JSON as P1J, PACKET_MD as P1M } from '../tools/report-talent-feat-pass3b-1-mechanical-primitives-owner-packet.mjs';
import { buildOutputs as build2a, PACKET_JSON as P2AJ, PACKET_MD as P2AM } from '../tools/report-talent-feat-pass3b-2a-damage-critical-owner-packet.mjs';
import { buildOutputs as build2b, PACKET_JSON as P2BJ, PACKET_MD as P2BM } from '../tools/report-talent-feat-pass3b-2b-control-reactive-owner-packet.mjs';

// Pass 3B.2B owner rulings (battlefield control + reactive combat), executed deterministically; no semantic decisions by the tool.
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const overlay = rd(OWNER_OVERLAY_PATH), auth = rd(AUTH3B_JSON), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json'), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json');
const b2b = overlay.decisions.filter(d => d.batch === '3B.2B');
const rec = (dom, id) => auth.records.find(r => r.domain === dom && r.canonicalId === id);
const added = (dom, id) => rec(dom, id).finalTags.filter(t => !rec(dom, id).baselineTags.includes(t));
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + rel, import.meta.url))).digest('hex');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const has = (dom, id, tag, action) => b2b.filter(d => d.decisionId === `${dom}:${id}|${tag}` && d.ownerAction === action).length === 1;
const F = 'FEAT', T = 'TALENT';
const GRAB = [[F, '982b00394a73719e'], [F, 'c2538c3a906700ae'], [F, 'fc1e5f0a2367debb'], [T, '9d235eba6b3e5daf'], [T, 'e97177f243cb2b0a'], [T, 'f7b620efd191ac6b']];
const GRAPPLE = [[F, '982b00394a73719e'], [F, 'c2538c3a906700ae'], [F, 'c41814601364b643'], [F, 'fc1e5f0a2367debb'], [T, '9d235eba6b3e5daf'], [T, 'f7b620efd191ac6b']];
const RESTRAIN = [[T, '80a24150fd2f3163'], [T, 'df9c364e91826cbf'], [T, 'ee184e210f8c8935']];
const SPEED = [[T, '696f7eed2cc08299'], [T, 'c04e66a3f2577e62'], [T, 'c08976a5f4ab88d8']];
const MOBILITY = [[F, 'c9c4130a55761330'], [T, '13cc978a8023eaa4'], [T, '32029a2f0dbb7104'], [T, '50273d5ce8f84c31'], [T, '67186d921e94d636']];
const AOO_ADD = [[T, '1946e16d1e6c831c'], [T, '39b5423e255e14b1'], [T, '444c032c563c18a1'], [T, '50273d5ce8f84c31'], [T, '5a858011286f5809'], [T, '7a024dac260bf9ec'], [T, 'b1bfca51996bb303'], [T, 'c2d2d55ee60f886f'], [T, 'e289618b92890003'], [T, 'ee184e210f8c8935'], [T, 'f7b620efd191ac6b']];
const AOO_NO = [[T, '893c4fd12df55469'], [T, '8eace9d86fc60711'], [T, 'cef9b7ca6a26f4a6']];

test('all 40 exact decisions exist once: 15 ADD and 25 NO_CHANGE, each with policy, rationale and evidence reference', () => {
  assert.equal(b2b.length, 40); assert.equal(b2b.filter(d => d.ownerAction === 'ADD').length, 15); assert.equal(b2b.filter(d => d.ownerAction === 'NO_CHANGE').length, 25);
  for (const [dom, id] of GRAB) assert.ok(has(dom, id, 'grab', 'NO_CHANGE'), id);
  for (const [dom, id] of GRAPPLE) assert.ok(has(dom, id, 'grapple', 'NO_CHANGE'), id);
  for (const [dom, id] of RESTRAIN) assert.ok(has(dom, id, 'restrain', 'NO_CHANGE'), id);
  assert.ok(has(F, '723563f70bd7f28f', 'battlefield_control', 'NO_CHANGE')); assert.ok(has(F, 'f362e5a4ad0a98bd', 'battlefield_control', 'ADD')); assert.ok(has(T, '5d4a63123e5a5eb4', 'battlefield_control', 'NO_CHANGE'));
  for (const [dom, id] of SPEED) assert.ok(has(dom, id, 'movement', 'ADD'), id);
  for (const [dom, id] of MOBILITY) assert.ok(has(dom, id, 'mobility', 'NO_CHANGE'), id);
  for (const [dom, id] of AOO_ADD) assert.ok(has(dom, id, 'attack_of_opportunity', 'ADD'), id);
  for (const [dom, id] of AOO_NO) assert.ok(has(dom, id, 'attack_of_opportunity', 'NO_CHANGE'), id);
  for (const d of b2b) { assert.ok(d.ownerRationale && d.ownerPolicyApplied && d.detectorEvidenceReference.length); assert.ok(overlay.ownerPolicies.some(p => p.id === d.ownerPolicyApplied)); }
  for (const id of ['GRAB_POLICY', 'GRAPPLE_POLICY', 'RESTRAIN_POLICY', 'BATTLEFIELD_CONTROL_POLICY', 'MOVEMENT_POLICY', 'MOBILITY_POLICY', 'ATTACK_OF_OPPORTUNITY_POLICY']) assert.equal(overlay.ownerPolicies.filter(p => p.id === id).length, 1);
});
test('3B.2B decisions are unique and add 15 tags to 15 records (53 ADD / 63 NO_CHANGE cumulative through this batch)', () => {
  const upTo = overlay.decisions.filter(d => ['3B.1', '3B.2A', '3B.2B'].includes(d.batch));
  assert.equal(upTo.length, 116); assert.equal(upTo.filter(d => d.ownerAction === 'ADD').length, 53); assert.equal(upTo.filter(d => d.ownerAction === 'NO_CHANGE').length, 63);
  assert.equal(new Set(overlay.decisions.map(d => d.decisionId)).size, overlay.decisions.length);
});
test('cumulative authority: 45 records with additions, 53 additions, 0 removals, 11,218 -> 11,271, no new tags', () => {
  const c = auth.counts; assert.equal(c.recordsChanged, 45); assert.equal(c.tagAdditions, 53); assert.equal(c.removals, 0);
  assert.equal(c.tagInstancesBefore, 11218); assert.equal(c.tagInstancesAfter, 11271); assert.equal(auth.sharedVocabulary.newTagsIntroduced, 0);
  const v = new Set(baseline.sharedVocabulary); assert.equal(v.size, 187); for (const r of auth.records) for (const t of r.finalTags) assert.ok(v.has(t));
  for (const r of auth.records) assert.deepEqual(r.finalTags.slice(0, r.baselineTags.length), r.baselineTags);
  assert.equal(new Set(b2b.filter(d => d.ownerAction === 'ADD').map(d => `${d.domain}:${d.canonicalId}`)).size, 15);
  const prior = new Set(overlay.decisions.filter(d => d.batch !== '3B.2B' && d.ownerAction === 'ADD').map(d => `${d.domain}:${d.canonicalId}`));
  assert.equal([...new Set(b2b.filter(d => d.ownerAction === 'ADD').map(d => `${d.domain}:${d.canonicalId}`))].filter(k => !prior.has(k)).length, 12);
});
test('grab, grapple and restrain findings gain nothing (6 + 6 + 3)', () => {
  for (const [dom, id] of GRAB) assert.ok(!added(dom, id).includes('grab'), id);
  for (const [dom, id] of GRAPPLE) assert.ok(!added(dom, id).includes('grapple'), id);
  for (const [dom, id] of RESTRAIN) assert.ok(!added(dom, id).includes('restrain'), id);
});
test('forced movement: only Echani Training gains battlefield_control; all three speed findings gain movement; no mobility finding gains mobility', () => {
  assert.ok(added(F, 'f362e5a4ad0a98bd').includes('battlefield_control')); assert.ok(!added(F, '723563f70bd7f28f').includes('battlefield_control')); assert.ok(!added(T, '5d4a63123e5a5eb4').includes('battlefield_control'));
  for (const [dom, id] of SPEED) assert.ok(added(dom, id).includes('movement'), id);
  for (const [dom, id] of MOBILITY) assert.ok(!added(dom, id).includes('mobility'), id);
});
test('the 11 AoO ADD records gain attack_of_opportunity; Slip By, Lifesaver and Two-Faced do not', () => {
  assert.equal(AOO_ADD.length, 11); for (const [dom, id] of AOO_ADD) assert.ok(added(dom, id).includes('attack_of_opportunity'), id);
  for (const [dom, id] of AOO_NO) assert.ok(!added(dom, id).includes('attack_of_opportunity'), id);
});
test('earlier 3B.1 and 3B.2A rulings are unchanged in the authority (ADDs present, NO_CHANGE absent)', () => {
  for (const d of overlay.decisions.filter(x => x.batch !== '3B.2B')) { const r = rec(d.domain, d.canonicalId); assert.equal(added(d.domain, d.canonicalId).includes(d.tag), d.ownerAction === 'ADD', d.decisionId); assert.equal(r.baselineTags.includes(d.tag), false, d.decisionId); }
  assert.deepEqual(added(T, '696f7eed2cc08299'), ['standard_action', 'movement']); assert.deepEqual(added(T, '1946e16d1e6c831c'), ['swift_action', 'attack_of_opportunity']); assert.deepEqual(added(T, '7a024dac260bf9ec'), ['reaction', 'attack_of_opportunity']);
});
test('hard implications hold; authority is exactly 353 feats + 1,187 talents', () => {
  for (const r of auth.records) for (const [a, b] of REQUIRED_IMPLICATIONS) if (r.finalTags.includes(a)) assert.ok(r.finalTags.includes(b), `${r.name} ${a}->${b}`);
  assert.equal(auth.counts.feats, 353); assert.equal(auth.counts.talents, 1187); assert.equal(auth.counts.combined, 1540);
});
test('discovery dispositions: exactly the 40 findings changed; no G/H record-level finding remains open; convention questions untouched', () => {
  const decided = discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch === '3B.2B'); assert.equal(decided.length, 40);
  for (const d of b2b) assert.equal(decided.find(i => i.domain === d.domain && i.canonicalId === d.canonicalId && i.comparedTag === d.tag).state, d.ownerAction === 'ADD' ? 'PASS3B_OWNER_APPROVED' : 'PASS3B_OWNER_NO_CHANGE', d.decisionId);
  const x = discovery.dashboard; assert.equal(x.ownerReviewTagDefinitionItems, 12); assert.equal(x.ownerReviewTagConventionQuestions, 14);
  assert.deepEqual(discovery.tagConventionQuestions.filter(q => ['H.counterattack', 'H.overwatch'].includes(q.mechanic)).map(q => q.state), ['PASS3B_OWNER_REVIEW', 'PASS3B_OWNER_REVIEW']);
  assert.equal(discovery.ownerReviewItems.filter(i => i.family === 'G' || i.family === 'H').length, 0);
});
test('derivation fails closed for 3B.2B: wrong name, tag already present, cumulative discrepancy', () => {
  const mk = (patch) => { const o = JSON.parse(JSON.stringify(overlay)); patch(o); return o; };
  assert.throws(() => derive(baseline, mk(o => { o.decisions.find(d => d.batch === '3B.2B').name = 'Nope'; })), /name guard/);
  assert.throws(() => derive(baseline, mk(o => { const d = o.decisions.find(x => x.batch === '3B.2B' && x.ownerAction === 'ADD'); d.tag = baseline.records.find(r => r.domain === d.domain && r.canonicalId === d.canonicalId).tags[0]; d.decisionId = `${d.domain}:${d.canonicalId}|${d.tag}`; })), /already present/);
  assert.throws(() => derive(baseline, mk(o => { o.decisions = o.decisions.filter(d => d.decisionId !== 'TALENT:f7b620efd191ac6b|attack_of_opportunity'); })), /DISCREPANCY/);
  assert.throws(() => derive(baseline, mk(o => { o.cumulativeExpected.decisions = 117; })), /CUMULATIVE DISCREPANCY/);
});
test('previous evidence packets are byte-identical; production unchanged; rebuild is byte-stable', () => {
  for (const [b, j, m] of [[build1, P1J, P1M], [build2a, P2AJ, P2AM], [build2b, P2BJ, P2BM]]) { const o = b(); assert.equal(txt(j), o.json); assert.equal(txt(m), o.md); }
  const pins = { 'packs/talents.db': '832937d451c2353da9afbd6b1f34366b293b659f24b3d09808d44ad767ee8288', 'packs/feats.db': '9c67242a67b209a2c3d359201beb03e512962998e6bacee6d8c3eedd4787d3e8', 'data/feat-catalog.json': 'e7907810f492e036517822a19f45ac1242fe2ec0044e7b2ad241f858f9925eef' };
  for (const [f, h] of Object.entries(pins)) assert.equal(sha(f), h, f); assert.equal(auth.counts.productionMutated, false);
  const a = buildOutputs(), b = buildOutputs(); assert.equal(a.json, b.json); assert.equal(txt(AUTH3B_JSON), a.json); assert.equal(txt(AUTH3B_MD), a.md); assert.equal(txt(OWNER_OVERLAY_MD), a.overlayMd);
});
console.log(`${n} tests passed`);
