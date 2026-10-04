import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOutputs, PACKET_JSON, PACKET_MD, SCOPE, LABELS, classifyClause, scopeOf } from '../tools/report-talent-feat-pass3b-2d-weapon-scope-owner-packet.mjs';
import { buildOutputs as build31, PACKET_JSON as P31_JSON, PACKET_MD as P31_MD } from '../tools/report-talent-feat-pass3b-1-mechanical-primitives-owner-packet.mjs';
import { buildOutputs as build2a, PACKET_JSON as P2A_JSON, PACKET_MD as P2A_MD } from '../tools/report-talent-feat-pass3b-2a-damage-critical-owner-packet.mjs';
import { buildOutputs as build2b, PACKET_JSON as P2B_JSON, PACKET_MD as P2B_MD } from '../tools/report-talent-feat-pass3b-2b-control-reactive-owner-packet.mjs';
import { buildOutputs as build2c, PACKET_JSON as P2C_JSON, PACKET_MD as P2C_MD } from '../tools/report-talent-feat-pass3b-2c-combat-mode-owner-packet.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 3B.2D packet: evidence extraction only (no recommendations, no tag changes, no new decisions).
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const packet = rd(PACKET_JSON), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json'), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json'), overlay = rd('data/audits/talent-feat-pass3b-owner-adjudication.json');
const byKey = new Map(baseline.records.map(r => [`${r.domain}:${r.canonicalId}`, r]));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('deterministic: matches the committed JSON and markdown byte-for-byte', () => {
  const a = buildOutputs(), b = buildOutputs(); assert.equal(a.json, b.json); assert.equal(txt(PACKET_JSON), a.json); assert.equal(txt(PACKET_MD), a.md);
});
test('scope is exactly melee, ranged, lightsaber, pistol and unarmed; heavy/exotic weapon questions and other weapon-mode tags are excluded', () => {
  assert.deepEqual(SCOPE, ['O.melee', 'O.ranged', 'O.lightsaber', 'O.pistol', 'O.unarmed']);
  for (const e of packet.entries) { assert.ok(SCOPE.includes(e.detectorId)); assert.ok(!['heavy_weapon', 'exotic_weapon', 'full_attack', 'dual_wield', 'stun', 'double_weapon', 'martial_arts', 'fighting_defensively', 'flanking', 'nonlethal'].includes(e.comparedTag)); }
  const conv = new Set(discovery.tagConventionQuestions.flatMap(q => q.untaggedRecordIds.map(id => `${id}|${q.comparedTag}`)));
  for (const e of packet.entries) assert.ok(!conv.has(`${e.domain}:${e.canonicalId}|${e.comparedTag}`), e.name);
});
test('packet size is the live deterministic result: 44 entries (15/11/10/6/2) over 37 unique records', () => {
  const T = packet.totals; assert.equal(T.entries, 44); assert.equal(T.uniqueRecords, 37); assert.deepEqual(T.byFamily, { O: 44 });
  assert.deepEqual(T.byDetector, { 'O.melee': 15, 'O.ranged': 11, 'O.lightsaber': 10, 'O.pistol': 6, 'O.unarmed': 2 });
  assert.equal(Object.values(T.byDomain).reduce((a, b) => a + b, 0), 44);
  assert.equal(T.entries, [...discovery.ownerReviewItems, ...discovery.ownerDecidedItems.filter(i => ['3B.2D', '3B.BULK'].includes(i.ownerDecision.batch))].filter(i => SCOPE.includes(i.mechanic)).length);
});
test('every clause carries a structural scope label; scope tallies are consistent with the entries', () => {
  const ok = new Set(['CLOSED_SCOPE', 'OPEN_GENERIC_SCOPE', 'SCOPE_NOT_DETERMINABLE_FROM_WORDING']);
  let closed = 0, open = 0, nd = 0;
  for (const e of packet.entries) { for (const c of e.clauses) { assert.ok(ok.has(c.scopeEvidence), c.scopeEvidence); if (c.scopeEvidence === 'CLOSED_SCOPE') closed++; else if (c.scopeEvidence === 'OPEN_GENERIC_SCOPE') open++; else nd++; }
    assert.equal(e.entryScopeSummary.CLOSED_SCOPE + e.entryScopeSummary.OPEN_GENERIC_SCOPE + e.entryScopeSummary.SCOPE_NOT_DETERMINABLE_FROM_WORDING, e.clauses.length); }
  assert.deepEqual(packet.totals.clauseScopeTally, { CLOSED_SCOPE: closed, OPEN_GENERIC_SCOPE: open, SCOPE_NOT_DETERMINABLE_FROM_WORDING: nd });
  assert.equal(packet.totals.entriesWithAClosedScopeClause, packet.entries.filter(e => e.entryScopeSummary.CLOSED_SCOPE > 0).length);
});
test('every entry was an open record-level finding when issued (open now, or decided in 3B.2D); nothing convergent, prior-ruled or decided earlier', () => {
  const open = new Set([...discovery.ownerReviewItems, ...discovery.ownerDecidedItems.filter(i => ['3B.2D', '3B.BULK'].includes(i.ownerDecision.batch))].map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  const closed = new Set([...discovery.resolvedByPriorRuling, ...discovery.ownerDecidedItems.filter(i => !['3B.2D', '3B.BULK'].includes(i.ownerDecision.batch))].map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
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
test('classifier and scope labels on sample clauses are structural only', () => {
  const l1 = classifyClause('You can make a melee attack against an adjacent enemy.', 'O.melee'); assert.ok(l1.includes('DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK')); assert.equal(scopeOf('You can make a melee attack against an adjacent enemy.', 'O.melee', l1), 'CLOSED_SCOPE');
  const l2 = classifyClause('You can make a melee or ranged attack.', 'O.ranged'); assert.ok(l2.includes('RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE')); assert.equal(scopeOf('You can make a melee or ranged attack.', 'O.ranged', l2), 'OPEN_GENERIC_SCOPE');
  const l3 = classifyClause('Choose one weapon group, such as pistols, and gain a bonus.', 'O.pistol'); assert.equal(scopeOf('Choose one weapon group, such as pistols, and gain a bonus.', 'O.pistol', l3), 'OPEN_GENERIC_SCOPE');
  assert.ok(classifyClause('You gain +2 damage with a lightsaber.', 'O.lightsaber').includes('DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE'));
  assert.equal(scopeOf('The droid has a speed of 6.', 'O.unarmed', ['UNARMED_WORDING_NO_STRUCTURE_MATCHED']), 'SCOPE_NOT_DETERMINABLE_FROM_WORDING');
});
test('the 3B.1, 3B.2A, 3B.2B and 3B.2C packets are untouched by this packet (each still equals its own fresh build)', () => {
  const o2 = build2a(); assert.equal(txt(P2A_JSON), o2.json); assert.equal(txt(P2A_MD), o2.md);
  const ob = build2b(); assert.equal(txt(P2B_JSON), ob.json); assert.equal(txt(P2B_MD), ob.md);
  const oc = build2c(); assert.equal(txt(P2C_JSON), oc.json); assert.equal(txt(P2C_MD), oc.md);
  const o = build31(); assert.equal(txt(P31_JSON), o.json); assert.equal(txt(P31_MD), o.md);
});
console.log(`${n} tests passed`);
