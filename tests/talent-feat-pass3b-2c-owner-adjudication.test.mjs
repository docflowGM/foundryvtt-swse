import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { derive, buildOutputs, OWNER_OVERLAY_PATH, AUTH3B_JSON, AUTH3B_MD, OWNER_OVERLAY_MD } from '../tools/build-talent-feat-pass3b-semantic-authority.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';
import { buildOutputs as build1, PACKET_JSON as P1J, PACKET_MD as P1M } from '../tools/report-talent-feat-pass3b-1-mechanical-primitives-owner-packet.mjs';
import { buildOutputs as build2a, PACKET_JSON as P2AJ, PACKET_MD as P2AM } from '../tools/report-talent-feat-pass3b-2a-damage-critical-owner-packet.mjs';
import { buildOutputs as build2b, PACKET_JSON as P2BJ, PACKET_MD as P2BM } from '../tools/report-talent-feat-pass3b-2b-control-reactive-owner-packet.mjs';
import { buildOutputs as build2c, PACKET_JSON as P2CJ, PACKET_MD as P2CM } from '../tools/report-talent-feat-pass3b-2c-combat-mode-owner-packet.mjs';

// Pass 3B.2C owner rulings (combat mode primitives): 9 NO_CHANGE decisions, executed deterministically.
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const overlay = rd(OWNER_OVERLAY_PATH), auth = rd(AUTH3B_JSON), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json'), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json');
const b2c = overlay.decisions.filter(d => d.batch === '3B.2C');
const rec = (dom, id) => auth.records.find(r => r.domain === dom && r.canonicalId === id);
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + rel, import.meta.url))).digest('hex');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const NO = [['FEAT', '4be60753991eec43', 'full_attack'], ['TALENT', '388f30468a80f221', 'dual_wield'], ['FEAT', '43a4b873d9a9984d', 'stun'], ['FEAT', '5d17898fc9652370', 'stun'], ['TALENT', 'c101826c205debf2', 'stun'], ['TALENT', 'c113b29cde344fafb6aa376a843639d3', 'stun'], ['TALENT', 'c2f332d1e74e3e1a', 'stun'], ['TALENT', 'cc90a9fc255f4dc4', 'stun'], ['TALENT', 'df9c25340dcb7c95', 'stun']];

test('all 9 exact decisions exist once; batch is 0 ADD / 9 NO_CHANGE with policy, rationale and evidence reference', () => {
  assert.equal(b2c.length, 9); assert.equal(b2c.filter(d => d.ownerAction === 'ADD').length, 0); assert.equal(b2c.filter(d => d.ownerAction === 'NO_CHANGE').length, 9);
  for (const [dom, id, tag] of NO) assert.equal(b2c.filter(d => d.decisionId === `${dom}:${id}|${tag}` && d.ownerAction === 'NO_CHANGE').length, 1, id);
  for (const d of b2c) { assert.ok(d.ownerRationale && d.ownerPolicyApplied && d.detectorEvidenceReference.length); assert.ok(overlay.ownerPolicies.some(p => p.id === d.ownerPolicyApplied)); }
  for (const id of ['FULL_ATTACK_POLICY', 'DUAL_WIELD_POLICY', 'STUN_POLICY']) assert.equal(overlay.ownerPolicies.filter(p => p.id === id).length, 1);
  assert.equal(b2c.filter(d => d.ownerPolicyApplied === 'STUN_POLICY').length, 7);
});
test('owner-batch overlay through 3B.2C is 125 decisions: 53 ADD and 72 NO_CHANGE, unique identities', () => {
  const own = overlay.decisions.filter(d => d.batch !== '3B.BULK' && d.batch !== '3B.2D');
  assert.equal(own.length, 125); assert.equal(own.filter(d => d.ownerAction === 'ADD').length, 53); assert.equal(own.filter(d => d.ownerAction === 'NO_CHANGE').length, 72);
  assert.equal(new Set(overlay.decisions.map(d => d.decisionId)).size, overlay.decisions.length);
});
test('this batch adds no tags: owner-batch additions stay 53 (plus bulk policy additions), 0 removals, no new tags', () => {
  const bulkAdd = overlay.decisions.filter(d => d.batch === '3B.BULK' && d.ownerAction === 'ADD').length;
  const c = auth.counts; assert.equal(c.tagAdditions, 53 + bulkAdd); assert.equal(c.removals, 0); assert.equal(c.ownerDecisions, overlay.decisions.length);
  assert.equal(c.tagInstancesBefore, 11218); assert.equal(c.tagInstancesAfter, 11218 + 53 + bulkAdd); assert.equal(auth.sharedVocabulary.newTagsIntroduced, 0);
  const v = new Set(baseline.sharedVocabulary); assert.equal(v.size, 187); for (const r of auth.records) for (const t of r.finalTags) assert.ok(v.has(t));
  for (const r of auth.records) assert.deepEqual(r.finalTags.slice(0, r.baselineTags.length), r.baselineTags);
});
test('Rapid Assault does not gain full_attack; Synchronized Fire does not gain dual_wield; none of the seven stun findings gains stun', () => {
  assert.ok(!rec('FEAT', '4be60753991eec43').finalTags.includes('full_attack')); assert.ok(!rec('TALENT', '388f30468a80f221').finalTags.includes('dual_wield'));
  const stun = NO.filter(x => x[2] === 'stun'); assert.equal(stun.length, 7);
  for (const [dom, id] of stun) assert.ok(!rec(dom, id).finalTags.includes('stun'), id);
  for (const [dom, id] of NO) { const r = rec(dom, id); assert.ok(!r.finalTags.includes(NO.find(x => x[0] === dom && x[1] === id)[2]), id); }
  assert.ok(!baseline.sharedVocabulary.includes('ion'));
});
test('ion wording alone caused no stun addition anywhere: no record gains stun in this pass and every stun finding is a NO_CHANGE', () => {
  const stunAdds = overlay.decisions.filter(d => d.tag === 'stun' && d.ownerAction === 'ADD'); assert.equal(stunAdds.length, 0);
  assert.ok(discovery.ownerDecidedItems.filter(i => i.comparedTag === 'stun').every(i => i.state === 'PASS3B_OWNER_NO_CHANGE'));
  assert.ok(rec('TALENT', 'df9c25340dcb7c95').finalTags.includes('nonlethal') === rec('TALENT', 'df9c25340dcb7c95').baselineTags.includes('nonlethal'));
});
test('Rapid Assault keeps its existing semantics unchanged', () => {
  const t = rec('FEAT', '4be60753991eec43'); assert.deepEqual(t.finalTags, t.baselineTags);
  for (const x of ['dual_wield', 'sustained_damage', 'standard_action', 'action_economy', 'force_point_spend', 'resource_spend']) assert.ok(t.finalTags.includes(x), x);
});
test('prior 3B.1 / 3B.2A / 3B.2B rulings are unchanged (ADDs present, NO_CHANGE tags absent)', () => {
  for (const d of overlay.decisions.filter(x => x.batch !== '3B.2C')) { const r = rec(d.domain, d.canonicalId); assert.equal(r.finalTags.includes(d.tag), d.ownerAction === 'ADD', d.decisionId); assert.equal(r.baselineTags.includes(d.tag), false, d.decisionId); }
});
test('hard implications hold; authority is exactly 353 feats + 1,187 talents', () => {
  for (const r of auth.records) for (const [a, b] of REQUIRED_IMPLICATIONS) if (r.finalTags.includes(a)) assert.ok(r.finalTags.includes(b), `${r.name} ${a}->${b}`);
  assert.equal(auth.counts.feats, 353); assert.equal(auth.counts.talents, 1187); assert.equal(auth.counts.combined, 1540);
});
test('discovery dispositions: exactly the 9 findings are PASS3B_OWNER_NO_CHANGE; closed findings are no longer open', () => {
  const decided = discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch === '3B.2C'); assert.equal(decided.length, 9); for (const i of decided) assert.equal(i.state, 'PASS3B_OWNER_NO_CHANGE');
    const open = new Set(discovery.ownerReviewItems.map(i => i.mechanic)); for (const m of ['O.full_attack', 'O.dual_wield', 'O.stun']) assert.ok(!open.has(m), m);
  for (const m of ['O.melee', 'O.ranged', 'O.lightsaber', 'O.pistol', 'O.unarmed']) assert.ok(open.has(m) || discovery.ownerDecidedItems.some(i => i.mechanic === m), m);
  assert.deepEqual(discovery.tagConventionQuestions.filter(q => ['O.heavy_weapon', 'O.exotic_weapon'].includes(q.mechanic)).map(q => q.state), ['PASS3B_OWNER_REVIEW', 'PASS3B_OWNER_REVIEW']);
});
test('derivation fails closed for 3B.2C: name guard, cumulative discrepancy, an unauthorized ADD of full_attack', () => {
  const mk = (patch) => { const o = JSON.parse(JSON.stringify(overlay)); patch(o); return o; };
  assert.throws(() => derive(baseline, mk(o => { o.decisions.find(d => d.batch === '3B.2C').name = 'Nope'; })), /name guard/);
  assert.throws(() => derive(baseline, mk(o => { o.cumulativeExpected.noChangeDecisions = 73; })), /CUMULATIVE DISCREPANCY/);
  assert.throws(() => derive(baseline, mk(o => { o.decisions.find(d => d.decisionId === 'FEAT:4be60753991eec43|full_attack').ownerAction = 'ADD'; })), /DISCREPANCY/);
});
test('previous evidence packets are byte-identical; production unchanged; rebuild is byte-stable', () => {
  for (const [b, j, m] of [[build1, P1J, P1M], [build2a, P2AJ, P2AM], [build2b, P2BJ, P2BM], [build2c, P2CJ, P2CM]]) { const o = b(); assert.equal(txt(j), o.json); assert.equal(txt(m), o.md); }
  const pins = { 'packs/talents.db': '832937d451c2353da9afbd6b1f34366b293b659f24b3d09808d44ad767ee8288', 'packs/feats.db': '9c67242a67b209a2c3d359201beb03e512962998e6bacee6d8c3eedd4787d3e8', 'data/feat-catalog.json': 'e7907810f492e036517822a19f45ac1242fe2ec0044e7b2ad241f858f9925eef' };
  for (const [f, h] of Object.entries(pins)) assert.equal(sha(f), h, f); assert.equal(auth.counts.productionMutated, false);
  const a = buildOutputs(), b = buildOutputs(); assert.equal(a.json, b.json); assert.equal(txt(AUTH3B_JSON), a.json); assert.equal(txt(AUTH3B_MD), a.md); assert.equal(txt(OWNER_OVERLAY_MD), a.overlayMd);
});
console.log(`${n} tests passed`);
