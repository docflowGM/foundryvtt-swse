import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOutputs, PACKET_JSON, PACKET_MD, SCOPE, classifyClause } from '../tools/report-talent-feat-pass3b-1-mechanical-primitives-owner-packet.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 3B.1 packet: evidence extraction only (no recommendations, no tag changes).
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const packet = rd(PACKET_JSON), discovery = rd('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json'), baseline = rd('data/audits/talent-feat-pass3b-mechanic-baseline.json');
const byKey = new Map(baseline.records.map(r => [`${r.domain}:${r.canonicalId}`, r]));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('the packet is deterministic and matches the committed JSON and markdown', () => {
  const a = buildOutputs(), b = buildOutputs();
  assert.equal(a.json, b.json); assert.equal(txt(PACKET_JSON), a.json); assert.equal(txt(PACKET_MD), a.md);
});
test('scope is exactly the 15 named detectors and every entry belongs to one of them', () => {
  assert.equal(SCOPE.length, 15);
  for (const e of packet.entries) assert.ok(SCOPE.includes(e.detectorId), e.detectorId);
  assert.deepEqual(packet.scope, SCOPE);
});
test('every entry is a currently unresolved PASS3B_OWNER_REVIEW discovery item (nothing prior-ruled, nothing already convergent)', () => {
  const open = new Set(discovery.ownerReviewItems.filter(i => i.state === 'PASS3B_OWNER_REVIEW').map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  const closed = new Set(discovery.resolvedByPriorRuling.map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  for (const e of packet.entries) {
    const k = `${e.domain}:${e.canonicalId}|${e.comparedTag}`;
    assert.ok(open.has(k), k); assert.ok(!closed.has(k), k);
    assert.equal(e.comparedTagCurrentlyPresent, false); assert.ok(!e.currentTags.includes(e.comparedTag));
    assert.equal(e.discoveryReference.startsWith(`${e.domain}:${e.canonicalId}|${e.comparedTag}|`), true);
  }
});
test('complete canonical text, full tag array, evidence tier and identity match the baseline exactly', () => {
  for (const e of packet.entries) {
    const r = byKey.get(`${e.domain}:${e.canonicalId}`);
    assert.equal(e.canonicalMechanicText, r.evidence); assert.deepEqual(e.currentTags, r.tags); assert.equal(e.evidenceTier, r.evidenceTier); assert.equal(e.name, r.name);
  }
});
test('every entry has at least one matching clause with its exact matched phrase(s), shown per distinct clause', () => {
  for (const e of packet.entries) {
    assert.ok(e.clauses.length >= 1, `${e.name} ${e.detectorId}`); assert.equal(e.distinctClauseCount, e.clauses.length);
    for (const c of e.clauses) { assert.ok(c.matchedPhrases.length >= 1); assert.ok(e.canonicalMechanicText.replace(/\s+/g, ' ').includes(c.sentence)); for (const m of c.matchedPhrases) assert.ok(c.sentence.includes(m)); }
  }
});
test('comparators are opposite-domain, carry the compared tag and match the same detector (at most two)', () => {
  for (const e of packet.entries) {
    assert.ok(e.oppositeDomainComparators.length >= 1 && e.oppositeDomainComparators.length <= 2);
    for (const c of e.oppositeDomainComparators) { assert.notEqual(c.domain, e.domain); assert.ok(c.tags.includes(e.comparedTag)); assert.ok(c.relevantClauses.length >= 1); assert.equal(c.canonicalMechanicText, byKey.get(`${c.domain}:${c.canonicalId}`).evidence); }
  }
});
test('implication rules listed are exactly the forward rules for the compared tag', () => {
  for (const e of packet.entries) {
    const want = REQUIRED_IMPLICATIONS.filter(([a]) => a === e.comparedTag).map(([a, b]) => `${a} -> ${b}`);
    assert.deepEqual(e.impliedRequirementsIfOwnerLaterAuthorizesTag.map(x => x.rule), want);
    for (const x of e.impliedRequirementsIfOwnerLaterAuthorizesTag) assert.equal(x.requiredTagCurrentlyPresent, e.currentTags.includes(x.requiredTag));
  }
});
test('syntax labels are structural only and the packet contains no recommendation language or fields', () => {
  const allowed = new Set(['GRANTS_ACTION_TO_NAMED_OTHER', 'GRANTS_ACTION_RECIPIENT_NOT_NAMED', 'CHARACTER_SPENDS_OR_COSTS_ACTION', 'CHARACTER_MAY_TAKE_ACTION', 'ACTION_TYPE_STATED_AS_ACTIVATION', 'ACTION_TYPE_MODIFIES_TIMING', 'COMPARISON_OR_REFERENCE_ONLY', 'FULL_ROUND_ACTION_WORDING', 'ACTION_TYPE_MENTIONED_NO_STRUCTURE_MATCHED', 'RESOURCE_SPENT', 'EFFECT_WITHOUT_SPENDING_THE_RESOURCE', 'SPENDING_PREVENTED_OR_REDUCED', 'RESOURCE_RECOVERED_OR_REGAINED', 'CAPACITY_OR_MAXIMUM_INCREASED', 'RESOURCE_MERELY_MENTIONED', 'NO_RESOURCE_STRUCTURE_MATCHED']);
  for (const e of packet.entries) for (const c of [...e.clauses, ...e.oppositeDomainComparators.flatMap(x => x.relevantClauses)]) for (const l of c.syntaxLabels) assert.ok(allowed.has(l), l);
  const forbiddenKeys = ['recommendation', 'recommendedTag', 'proposedDisposition', 'likelyTruePositive', 'shouldAdd', 'shouldRemove', 'interpretation'];
  for (const e of packet.entries) for (const k of forbiddenKeys) assert.ok(!(k in e), k);
  const sans = JSON.stringify({ ...packet, status: undefined, note: undefined, entries: packet.entries.map(e => ({ ...e, canonicalMechanicText: undefined, clauses: undefined, oppositeDomainComparators: undefined })) });
  for (const w of [/recommend/i, /suggest/i, /should (?:add|remove)/i, /likely true/i, /proposed disposition/i]) assert.ok(!w.test(sans), String(w));
  assert.ok(!/recommend|suggest|should add|should remove/i.test(txt(PACKET_MD).split('\n').filter(l => !l.startsWith('>') && !l.startsWith('Evidence extraction only') && !l.includes('— "') && !/^\s+>/.test(l) && !/^\s+- labels:/.test(l)).join('\n')));
});
test('classifier labels wording structure for sample clauses', () => {
  assert.deepEqual(classifyClause('As a swift action, you can designate an opponent.', 'A'), ['ACTION_TYPE_STATED_AS_ACTIVATION']);
  assert.ok(classifyClause('You may spend a Force Point to reroll.', 'C').includes('RESOURCE_SPENT'));
  assert.ok(classifyClause('You can do this without spending a Force Point.', 'C').includes('EFFECT_WITHOUT_SPENDING_THE_RESOURCE'));
  assert.ok(classifyClause('You regain a spent Force Power.', 'C').includes('RESOURCE_RECOVERED_OR_REGAINED'));
  assert.ok(classifyClause('This takes a full-round action.', 'A').includes('FULL_ROUND_ACTION_WORDING'));
});
test('totals are consistent with the entries', () => {
  const T = packet.totals; assert.equal(T.unresolvedEntries, packet.entries.length);
  assert.equal(Object.values(T.byDetector).reduce((a, b) => a + b, 0), packet.entries.length); assert.equal(Object.values(T.byDomain).reduce((a, b) => a + b, 0), packet.entries.length);
  assert.equal(T.uniqueRecords, new Set(packet.entries.map(e => `${e.domain}:${e.canonicalId}`)).size);
});
console.log(`${n} tests passed`);
