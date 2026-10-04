import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOutputs, PACKET_JSON, PACKET_MD, SCOPE, LABELS, classifyClause } from '../tools/report-talent-feat-pass3b-2c-combat-mode-owner-packet.mjs';
import { buildOutputs as build31, PACKET_JSON as P31_JSON, PACKET_MD as P31_MD } from '../tools/report-talent-feat-pass3b-1-mechanical-primitives-owner-packet.mjs';
import { buildOutputs as build2a, PACKET_JSON as P2A_JSON, PACKET_MD as P2A_MD } from '../tools/report-talent-feat-pass3b-2a-damage-critical-owner-packet.mjs';
import { buildOutputs as build2b, PACKET_JSON as P2B_JSON, PACKET_MD as P2B_MD } from '../tools/report-talent-feat-pass3b-2b-control-reactive-owner-packet.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 3B.2C packet: evidence extraction only (no recommendations, no tag changes, no new decisions).
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const packet = rd(PACKET_JSON), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json'), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json'), overlay = rd('data/audits/talent-feat-pass3b-owner-adjudication.json');
const byKey = new Map(baseline.records.map(r => [`${r.domain}:${r.canonicalId}`, r]));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('deterministic: matches the committed JSON and markdown byte-for-byte', () => {
  const a = buildOutputs(), b = buildOutputs(); assert.equal(a.json, b.json); assert.equal(txt(PACKET_JSON), a.json); assert.equal(txt(PACKET_MD), a.md);
});
test('scope is exactly full_attack, dual_wield and stun; weapon-scope detectors and convention questions are excluded', () => {
  assert.deepEqual(SCOPE, ['O.full_attack', 'O.dual_wield', 'O.stun']);
  for (const e of packet.entries) { assert.ok(SCOPE.includes(e.detectorId)); assert.ok(!['melee', 'ranged', 'lightsaber', 'pistol', 'unarmed', 'heavy_weapon', 'exotic_weapon'].includes(e.comparedTag)); }
  const conv = new Set(discovery.tagConventionQuestions.flatMap(q => q.untaggedRecordIds.map(id => `${id}|${q.comparedTag}`)));
  for (const e of packet.entries) assert.ok(!conv.has(`${e.domain}:${e.canonicalId}|${e.comparedTag}`), e.name);
});
test('packet size is the live deterministic result: 9 entries (full_attack 1, dual_wield 1, stun 7) over 9 unique records', () => {
  const T = packet.totals; assert.equal(T.entries, 9); assert.equal(T.uniqueRecords, 9); assert.deepEqual(T.byFamily, { O: 9 });
  assert.deepEqual(T.byDetector, { 'O.full_attack': 1, 'O.dual_wield': 1, 'O.stun': 7 });
  assert.equal(Object.values(T.byDomain).reduce((a, b) => a + b, 0), 9);
  const live = ['O.full_attack', 'O.dual_wield', 'O.stun'];
  assert.equal(T.entries, [...discovery.ownerReviewItems, ...discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch === '3B.2C')].filter(i => live.includes(i.mechanic)).length);
});
test('every entry was an open record-level finding when issued (open now, or decided in 3B.2C); nothing convergent, prior-ruled or decided earlier', () => {
  const open = new Set([...discovery.ownerReviewItems, ...discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch === '3B.2C')].map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  const closed = new Set([...discovery.resolvedByPriorRuling, ...discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch !== '3B.2C')].map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  for (const e of packet.entries) { const k = `${e.domain}:${e.canonicalId}|${e.comparedTag}`; assert.ok(open.has(k), k); assert.ok(!closed.has(k), k); assert.equal(e.comparedTagCurrentlyPresent, false); assert.ok(!e.currentTags.includes(e.comparedTag)); }
});
test('complete canonical text, tags, tier and identity match the baseline; every entry has matching clauses with exact phrases', () => {
  for (const e of packet.entries) {
    const r = byKey.get(`${e.domain}:${e.canonicalId}`);
    assert.equal(e.canonicalMechanicText, r.evidence); assert.deepEqual(e.currentTags, r.tags); assert.equal(e.evidenceTier, r.evidenceTier);
    assert.ok(e.clauses.length >= 1); for (const c of e.clauses) { assert.ok(c.matchedPhrases.length >= 1); for (const m of c.matchedPhrases) assert.ok(c.sentence.includes(m)); assert.ok(e.canonicalMechanicText.replace(/\s+/g, ' ').includes(c.sentence)); }
  }
});
test('comparators are opposite-domain and carry the compared tag (at most two)', () => {
  for (const e of packet.entries) { assert.ok(e.oppositeDomainComparators.length >= 1 && e.oppositeDomainComparators.length <= 2); for (const c of e.oppositeDomainComparators) { assert.notEqual(c.domain, e.domain); assert.ok(c.tags.includes(e.comparedTag)); } }
});
test('implication rules are exactly the forward rules for the compared tag; only the general precedent is cited', () => {
  for (const e of packet.entries) {
    assert.deepEqual(e.impliedRequirementsIfOwnerLaterAuthorizesTag.map(x => x.rule), REQUIRED_IMPLICATIONS.filter(([a]) => a === e.comparedTag).map(([a, b]) => `${a} -> ${b}`));
    assert.deepEqual(e.applicablePriorOwnerPolicies, ['Prerequisite inheritance is not semantic inheritance.']);
  }
});
test('structural labels come from the fixed vocabulary; no recommendation fields or language', () => {
  const allowed = new Set(LABELS);
  for (const e of packet.entries) for (const c of [...e.clauses, ...e.oppositeDomainComparators.flatMap(x => x.relevantClauses)]) for (const l of c.structuralLabels) assert.ok(allowed.has(l), l);
  for (const e of packet.entries) for (const k of ['recommendation', 'proposedDisposition', 'likelyPositive', 'shouldAdd', 'shouldRemove', 'interpretation']) assert.ok(!(k in e), k);
  const sans = JSON.stringify({ ...packet, status: undefined, note: undefined, entries: packet.entries.map(e => ({ ...e, canonicalMechanicText: undefined, clauses: undefined, oppositeDomainComparators: undefined, applicablePriorOwnerPolicies: undefined, priorOwnerRulingsOnThisRecord: undefined })) });
  for (const w of [/recommend/i, /suggest/i, /should (?:add|remove)/i, /likely (?:true|positive|negative)/i, /proposed (?:add|disposition)/i]) assert.ok(!w.test(sans), String(w));
});
test('classifier labels wording structure for sample clauses (and never concludes applicability)', () => {
  assert.ok(classifyClause('You can make a full attack as a standard action.', 'O.full_attack').includes('DIRECTLY_PERFORMS_A_FULL_ATTACK'));
  assert.deepEqual(classifyClause('A full attack normally allows two attacks.', 'O.full_attack'), ['MERELY_REFERENCES_A_NORMAL_FULL_ATTACK']);
  assert.ok(classifyClause('You wield two weapons, one in each hand.', 'O.dual_wield').includes('REQUIRES_ONE_WEAPON_IN_EACH_HAND'));
  assert.ok(classifyClause('The target is stunned until the end of your next turn.', 'O.stun').includes('APPLIES_A_STUNNED_OR_STUNNING_EFFECT'));
  assert.ok(classifyClause('You are immune to stun effects.', 'O.stun').includes('RESISTS_OR_REMOVES_A_STUN_EFFECT'));
  assert.deepEqual(classifyClause('The ion damage is applied.', 'O.stun'), ['STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED']);
});
test('the 3B.1, 3B.2A and 3B.2B packets are untouched by this packet (each still equals its own fresh build)', () => {
  const o2 = build2a(); assert.equal(txt(P2A_JSON), o2.json); assert.equal(txt(P2A_MD), o2.md);
  const ob = build2b(); assert.equal(txt(P2B_JSON), ob.json); assert.equal(txt(P2B_MD), ob.md);
  const o = build31(); assert.equal(txt(P31_JSON), o.json); assert.equal(txt(P31_MD), o.md);
});
console.log(`${n} tests passed`);
