import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOutputs, PACKET_JSON, PACKET_MD, SCOPE, LABELS, classifyClause } from '../tools/report-talent-feat-pass3b-2a-damage-critical-owner-packet.mjs';
import { buildOutputs as build31, PACKET_JSON as P31_JSON, PACKET_MD as P31_MD } from '../tools/report-talent-feat-pass3b-1-mechanical-primitives-owner-packet.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 3B.2A packet: evidence extraction only (no recommendations, no tag changes, no new decisions).
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const packet = rd(PACKET_JSON), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json'), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json'), overlay = rd('data/audits/talent-feat-pass3b-owner-adjudication.json');
const byKey = new Map(baseline.records.map(r => [`${r.domain}:${r.canonicalId}`, r]));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('deterministic: matches the committed JSON and markdown byte-for-byte', () => {
  const a = buildOutputs(), b = buildOutputs(); assert.equal(a.json, b.json); assert.equal(txt(PACKET_JSON), a.json); assert.equal(txt(PACKET_MD), a.md);
});
test('scope is exactly damage_threshold, damage_bonus, sustained_damage and natural_20; burst_damage and generic damage are excluded', () => {
  assert.deepEqual(SCOPE, ['D.damage_threshold', 'D.damage_bonus', 'D.sustained_damage', 'E.natural_20']);
  for (const e of packet.entries) { assert.ok(SCOPE.includes(e.detectorId)); assert.ok(!['burst_damage', 'damage', 'critical_hit'].includes(e.comparedTag)); }
});
test('packet size is 17 (D 8 = 3/4/1, E 9) over 17 unique records, with the expected tag counts', () => {
  const T = packet.totals; assert.equal(T.entries, 17); assert.equal(T.uniqueRecords, 17); assert.deepEqual(T.byFamily, { D: 8, E: 9 });
  assert.deepEqual(T.byDetector, { 'D.damage_threshold': 3, 'D.damage_bonus': 4, 'D.sustained_damage': 1, 'E.natural_20': 9 });
  assert.equal(Object.values(T.byDomain).reduce((a, b) => a + b, 0), 17);
});
test('every entry is an open record-level discovery finding (nothing convergent, prior-ruled or already decided)', () => {
  const open = new Set(discovery.ownerReviewItems.map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  const closed = new Set([...discovery.resolvedByPriorRuling, ...discovery.ownerDecidedItems].map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  for (const e of packet.entries) { const k = `${e.domain}:${e.canonicalId}|${e.comparedTag}`; assert.ok(open.has(k), k); assert.ok(!closed.has(k), k); assert.equal(e.comparedTagCurrentlyPresent, false); assert.ok(!e.currentTags.includes(e.comparedTag)); }
  assert.ok(!overlay.decisions.some(d => d.batch === '3B.2A'));
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
test('implication rules listed are exactly the forward rules for the compared tag; natural-20 precedent is cited for critical_success only', () => {
  for (const e of packet.entries) {
    assert.deepEqual(e.impliedRequirementsIfOwnerLaterAuthorizesTag.map(x => x.rule), REQUIRED_IMPLICATIONS.filter(([a]) => a === e.comparedTag).map(([a, b]) => `${a} -> ${b}`));
    assert.equal(e.applicablePriorOwnerPolicies.some(p => /natural-20/i.test(p)), e.comparedTag === 'critical_success');
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
  assert.ok(classifyClause('If your damage equals or exceeds the target\'s damage threshold, it moves down the condition track.', 'D.damage_threshold').includes('DAMAGE_THRESHOLD_COMPARED_TO_DAMAGE'));
  assert.ok(classifyClause('You deal an extra 1d6 damage.', 'D.damage_bonus').includes('ADDS_NUMERIC_OR_DICE_DAMAGE'));
  assert.ok(classifyClause('On a natural 20 you regain a Force Power.', 'E.natural_20').includes('NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE'));
  assert.ok(classifyClause('A natural 20 is always an automatic hit.', 'E.natural_20').includes('NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER'));
  assert.ok(classifyClause('Make a full attack.', 'D.sustained_damage').includes('FULL_ATTACK_OR_MULTIATTACK_WORDING'));
});
test('the 3B.1 packet is untouched by this packet (still equals its own fresh build)', () => {
  const o = build31(); assert.equal(txt(P31_JSON), o.json); assert.equal(txt(P31_MD), o.md);
  assert.ok(!overlay.decisions.some(d => d.batch === '3B.2A'));
});
console.log(`${n} tests passed`);
