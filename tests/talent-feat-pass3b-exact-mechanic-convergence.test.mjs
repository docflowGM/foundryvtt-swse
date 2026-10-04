import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildBaseline3B, BASELINE3B_PATH, SOURCE_FILES, sha } from '../tools/build-talent-feat-pass3b-mechanic-baseline.mjs';
import { buildOutputs, buildReport, REPORT_JSON, REPORT_MD, CONVENTION_MIN_RATE } from '../tools/report-talent-feat-pass3b-exact-mechanic-convergence.mjs';
import { DETECTORS, BUNDLES, FAMILIES } from '../tools/talent-feat-pass3b-detectors.mjs';
import { REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 3B is evidence-only: deterministic, no semantic decisions, no mutation.
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const baseline = rd(BASELINE3B_PATH), report = rd(REPORT_JSON);
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('combined corpus is exactly 1,540 identities (353 feats + 1,187 talents), each loaded once, 187-tag vocabulary', () => {
  assert.equal(baseline.records.length, 1540);
  assert.equal(baseline.records.filter(r => r.domain === 'FEAT').length, 353); assert.equal(baseline.records.filter(r => r.domain === 'TALENT').length, 1187);
  assert.equal(new Set(baseline.records.map(r => `${r.domain}|${r.canonicalId}`)).size, 1540);
  assert.equal(baseline.sharedVocabulary.length, 187);
  const v = new Set(baseline.sharedVocabulary);
  for (const r of baseline.records) for (const t of r.tags) assert.ok(v.has(t), `${r.name} ${t}`);
});
test('baseline records the evidence tier per record and equals a fresh deterministic build', () => {
  assert.equal(txt(BASELINE3B_PATH), JSON.stringify(buildBaseline3B(), null, 2) + '\n');
  const tiers = new Set(baseline.records.map(r => r.evidenceTier));
  assert.deepEqual([...tiers].sort(), ['FEAT_CANONICAL_RULES_SHAPE', 'FEAT_PASS1_MECHANIC_SUMMARY', 'TALENT_CERTIFIED_PACK_BENEFIT_TEXT']);
  for (const r of baseline.records) assert.ok(r.evidenceAuthority && typeof r.evidence === 'string');
});
test('source authorities are hash-pinned and unchanged (feat Pass 2, talent Pass 3A, pack, feat provenance)', () => {
  assert.equal(Object.keys(baseline.sourceSha256).length, SOURCE_FILES.length);
  for (const f of SOURCE_FILES) assert.equal(sha(f), baseline.sourceSha256[f], f);
});
test('hard implication rules hold across the combined corpus (zero violations)', () => {
  const bad = [];
  for (const r of baseline.records) for (const [a, b] of REQUIRED_IMPLICATIONS) if (r.tags.includes(a) && !r.tags.includes(b)) bad.push(`${r.domain} ${r.name} ${a}->${b}`);
  assert.deepEqual(bad, []); assert.equal(report.dashboard.hardImplicationViolations, 0); assert.deepEqual(report.hardInvariants.violations, []);
});
test('the report is deterministic byte-for-byte and matches the committed files', () => {
  const a = buildOutputs(), b = buildOutputs();
  assert.equal(a.json, b.json); assert.equal(txt(REPORT_JSON), a.json); assert.equal(txt(REPORT_MD), a.md);
});
test('all 15 mechanic families are scanned and every detector targets a shared-vocabulary tag', () => {
  assert.equal(Object.keys(FAMILIES).length, 15); assert.equal(report.familyRollup.length, 15);
  const v = new Set(baseline.sharedVocabulary);
  for (const d of DETECTORS) { assert.ok(v.has(d.tag), d.id); assert.ok(FAMILIES[d.family], d.id); }
  assert.equal(new Set(DETECTORS.map(d => d.id)).size, DETECTORS.length);
  assert.ok(BUNDLES.length >= 10);
});
test('authority boundary: only owner-ruling-derived states are assigned besides PASS3B_OWNER_REVIEW', () => {
  const allowed = new Set(['PASS3B_OWNER_REVIEW', 'PASS3B_PRIOR_OWNER_RULING', 'PASS3B_INTENTIONAL_DIVERGENCE']);
  for (const i of [...report.ownerReviewItems, ...report.resolvedByPriorRuling]) assert.ok(allowed.has(i.state), i.state);
  for (const i of report.resolvedByPriorRuling) { assert.ok(i.priorOwnerPrecedent && i.priorOwnerPrecedent.ruling, `${i.name} ${i.comparedTag}`); assert.equal(i.priority, null); }
  for (const i of report.ownerDecidedItems) { assert.ok(['PASS3B_OWNER_APPROVED', 'PASS3B_OWNER_NO_CHANGE'].includes(i.state)); assert.ok(i.ownerDecision && i.ownerDecision.decisionId); assert.equal(i.priority, null); }
  for (const bad of ['PASS3B_EXACT_CONVERGENCE', 'PASS3B_DOMAIN_SPECIFIC', 'PASS3B_TEXT_MATCH_NOT_MECHANIC']) assert.ok(!JSON.stringify(report).includes(`"state": "${bad}"`), bad);
  for (const a of report.tagDefinitionAudit) assert.ok(['PASS3B_OWNER_REVIEW', 'PASS3B_POLICY_RESOLVED', 'USED_BY_ONE_DOMAIN_ONLY', 'NO_FLAG', 'UNUSED'].includes(a.state), a.state);
  for (const g of report.ontologyGapScreen) assert.ok(['PASS3B_ONTOLOGY_GAP_CANDIDATE', 'NOT_FLAGGED'].includes(g.state));
  for (const q of report.tagConventionQuestions) assert.equal(q.state, 'PASS3B_OWNER_REVIEW');
});
test('evidence items are factual: no recommendation fields or recommendation language', () => {
  const forbiddenKeys = ['recommendedTag', 'suggestedCorrection', 'shouldAdd', 'shouldRemove', 'likelyTruePositive', 'mechanicalInterpretation', 'whyPossiblyInconsistent', 'candidateTags'];
  for (const i of report.ownerReviewItems) for (const k of forbiddenKeys) assert.ok(!(k in i), k);
  const sans = JSON.stringify({ items: report.ownerReviewItems.map(i => ({ ...i, canonicalMechanicText: undefined, matchedExcerpt: undefined, comparisonRecords: undefined, priorOwnerPrecedent: undefined })), q: report.tagConventionQuestions.map(q => ({ ...q, taggedExamples: undefined, untaggedExamples: undefined })), gaps: report.ontologyGapScreen, tags: report.tagDefinitionAudit.map(a => ({ ...a, sampleFeats: undefined, sampleTalents: undefined })) });
  for (const w of [/recommend/i, /suggest/i, /should (?:add|remove|gain|converge)/i, /likely true/i, /my interpretation/i, /therefore/i]) assert.ok(!w.test(sans) && !w.test(txt(REPORT_MD)), String(w));
  for (const i of report.ownerReviewItems) { assert.ok(i.exactTagDifference && i.detectableCommonality && i.canonicalMechanicText !== undefined && i.evidenceTier && Array.isArray(i.currentTags)); assert.equal(i.exactTagDifference.thisRecordCarriesTag, false); assert.ok(!i.currentTags.includes(i.comparedTag)); }
});
test('every record-level review item has a same-mechanic comparison record in the other domain', () => {
  for (const i of report.ownerReviewItems) { assert.ok(i.comparisonRecords.length > 0, `${i.name} ${i.comparedTag}`); for (const c of i.comparisonRecords) { assert.notEqual(c.domain, i.domain); assert.ok(c.tags.includes(i.comparedTag)); } }
});
test('detector tagged-rate threshold routes low-convention detectors to one question per tag, without dropping records', () => {
  assert.equal(CONVENTION_MIN_RATE, 0.5);
  for (const q of report.tagConventionQuestions) { assert.equal(q.untaggedRecordIds.length, q.untagged); assert.ok(q.detected >= q.carrying + q.untagged); }
  const covered = new Set(report.ownerReviewItems.map(i => `${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  for (const q of report.tagConventionQuestions) for (const id of q.untaggedRecordIds) assert.ok(!covered.has(`${id}|${q.comparedTag}`), id);
});
test('every automatic prior-ruling state traces to an exact owner overlay entry or Pass 2 family review', () => {
  // Any matched ruling must correspond to a real owner overlay entry.
  const p2 = rd('data/audits/feat-tags-pass2-owner-adjudication.json'), p3 = rd('data/audits/talent-feat-pass3a-skill-owner-adjudication.json');
  const overlayKeys = new Set([...p2.rejectedFindings.map(x => `FEAT:${x.canonicalId}|${x.rejectedTag}`), ...p3.dispositions.map(d => `TALENT:${d.canonicalId}|${d.tag}`)]);
  for (const i of report.resolvedByPriorRuling.filter(x => x.state === 'PASS3B_PRIOR_OWNER_RULING')) assert.ok(overlayKeys.has(`${i.domain}:${i.canonicalId}|${i.comparedTag}`));
  for (const i of report.resolvedByPriorRuling.filter(x => x.state === 'PASS3B_INTENTIONAL_DIVERGENCE')) { assert.match(i.priorOwnerPrecedent.source, /^Pass 2 family review:/); assert.ok(i.priorOwnerPrecedent.divergentTags.includes(i.comparedTag), `${i.name} ${i.comparedTag}`); }
});
test('the pass changed no tags: every baseline tag array equals its source authority', () => {
  const f = rd('data/audits/feat-tags-pass2-semantic-authority.json'), t = rd('data/audits/talent-feat-pass3a-semantic-authority.json');
  const fm = new Map(f.assignments.map(a => [a.canonicalId, a.finalTags])), tm = new Map(t.records.map(r => [r.canonicalId, r.finalTags]));
  for (const r of baseline.records) assert.deepEqual(r.tags, (r.domain === 'FEAT' ? fm : tm).get(r.canonicalId), r.name);
});
test('source-pin comparison is exact (a different hash never equals the file hash)', () => {
  const tampered = JSON.parse(JSON.stringify(baseline)); tampered.sourceSha256[SOURCE_FILES[0]] = '0'.repeat(64);
  const orig = fs.readFileSync(new URL('../' + BASELINE3B_PATH, import.meta.url), 'utf8');
  assert.notEqual(JSON.stringify(tampered, null, 2) + '\n', orig);
  assert.equal(sha(SOURCE_FILES[0]) === tampered.sourceSha256[SOURCE_FILES[0]], false);
});
console.log(`${n} tests passed`);
