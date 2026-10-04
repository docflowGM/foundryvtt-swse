import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOutputs, PACKET_JSON, PACKET_MD, SCOPE, LABELS, classifyClause } from '../tools/report-talent-feat-pass3b-2b-control-reactive-owner-packet.mjs';
import { buildOutputs as build31, PACKET_JSON as P31_JSON, PACKET_MD as P31_MD } from '../tools/report-talent-feat-pass3b-1-mechanical-primitives-owner-packet.mjs';
import { buildOutputs as build2a, PACKET_JSON as P2A_JSON, PACKET_MD as P2A_MD } from '../tools/report-talent-feat-pass3b-2a-damage-critical-owner-packet.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 3B.2B packet: evidence extraction only (no recommendations, no tag changes, no new decisions).
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const packet = rd(PACKET_JSON), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json'), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json'), overlay = rd('data/audits/talent-feat-pass3b-owner-adjudication.json');
const byKey = new Map(baseline.records.map(r => [`${r.domain}:${r.canonicalId}`, r]));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('deterministic: matches the committed JSON and markdown byte-for-byte', () => {
  const a = buildOutputs(), b = buildOutputs(); assert.equal(a.json, b.json); assert.equal(txt(PACKET_JSON), a.json); assert.equal(txt(PACKET_MD), a.md);
});
test('scope is exactly the eight G detectors and the three H detectors; no convention-question records are expanded', () => {
  assert.deepEqual(SCOPE, ['G.grab', 'G.grapple', 'G.restrain', 'G.forced_movement', 'G.speed_change', 'G.mobility', 'G.pursuit', 'G.positioning', 'H.attack_of_opportunity', 'H.counterattack', 'H.overwatch']);
  for (const e of packet.entries) assert.ok(SCOPE.includes(e.detectorId));
  const conv = new Set(discovery.tagConventionQuestions.filter(q => ['H.counterattack', 'H.overwatch'].includes(q.mechanic)).flatMap(q => q.untaggedRecordIds.map(id => `${id}|${q.comparedTag}`)));
  for (const e of packet.entries) assert.ok(!conv.has(`${e.domain}:${e.canonicalId}|${e.comparedTag}`), e.name);
});
test('packet size is the live deterministic result: 40 entries (G 26, H 14) over 32 unique records', () => {
  const T = packet.totals; assert.equal(T.entries, 40); assert.equal(T.uniqueRecords, 32); assert.deepEqual(T.byFamily, { G: 26, H: 14 });
  assert.deepEqual(T.byDetector, { 'G.grab': 6, 'G.grapple': 6, 'G.restrain': 3, 'G.forced_movement': 3, 'G.speed_change': 3, 'G.mobility': 5, 'H.attack_of_opportunity': 14 });
  assert.equal(Object.values(T.byDomain).reduce((a, b) => a + b, 0), 40);
  assert.equal(T.entries, discovery.ownerReviewItems.filter(i => i.family === 'G' || i.family === 'H').length + discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch === '3B.2B').length);
});
test('every entry was an open record-level finding when issued (open now, or decided in 3B.2B); nothing convergent, prior-ruled or decided earlier', () => {
  const open = new Set([...discovery.ownerReviewItems, ...discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch === '3B.2B')].map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  const closed = new Set([...discovery.resolvedByPriorRuling, ...discovery.ownerDecidedItems.filter(i => i.ownerDecision.batch !== '3B.2B')].map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
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
test('implication rules are exactly the forward rules for the compared tag; the AoO precedent is cited for attack_of_opportunity and the grapple-family precedent for control tags', () => {
  for (const e of packet.entries) {
    assert.deepEqual(e.impliedRequirementsIfOwnerLaterAuthorizesTag.map(x => x.rule), REQUIRED_IMPLICATIONS.filter(([a]) => a === e.comparedTag).map(([a, b]) => `${a} -> ${b}`));
    assert.equal(e.applicablePriorOwnerPolicies.some(p => /Martial Arts I/.test(p)), e.comparedTag === 'attack_of_opportunity');
    assert.equal(e.applicablePriorOwnerPolicies.some(p => /Pin \/ Crush/.test(p)), e.comparedTag !== 'attack_of_opportunity');
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
  assert.ok(classifyClause('You can make a grab attempt against an adjacent creature.', 'G.grab').includes('INITIATES_A_GRAB'));
  assert.ok(classifyClause('You gain a +2 bonus on grapple checks.', 'G.grapple').includes('MODIFIES_A_GRAPPLE_CHECK'));
  assert.ok(classifyClause('You can push the target 2 squares.', 'G.forced_movement').includes('FORCIBLY_MOVES_ANOTHER_CREATURE'));
  assert.ok(classifyClause('You can move without provoking attacks of opportunity.', 'H.attack_of_opportunity').includes('PREVENTS_AN_ATTACK_OF_OPPORTUNITY'));
  assert.ok(classifyClause('You may make an additional attack of opportunity each round.', 'H.attack_of_opportunity').includes('GENERATES_AN_ATTACK_OF_OPPORTUNITY'));
  assert.deepEqual(classifyClause('The creature then moves 2 squares.', 'G.speed_change'), ['CHANGES_ANOTHER_CREATURES_MOVEMENT_OR_SPEED']);
});
test('the 3B.1 and 3B.2A packets are untouched by this packet (each still equals its own fresh build)', () => {
  const o2 = build2a(); assert.equal(txt(P2A_JSON), o2.json); assert.equal(txt(P2A_MD), o2.md);
  const o = build31(); assert.equal(txt(P31_JSON), o.json); assert.equal(txt(P31_MD), o.md);
});
console.log(`${n} tests passed`);
