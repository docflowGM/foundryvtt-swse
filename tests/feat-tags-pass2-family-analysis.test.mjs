import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, OUT_JSON, OWNER_NAMED_CHAINS } from '../tools/report-feat-tags-pass2-family-analysis.mjs';
import { loadContext, AUTHORITY_PATH } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Pass 2 support output is evidence only: deterministic, never adjudicating, never writing tags.
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const authority = rd(AUTHORITY_PATH); const ctx = loadContext();
const talentCounts = {};
for (const l of fs.readFileSync(new URL('../packs/talents.db', import.meta.url), 'utf8').split('\n').filter(Boolean)) for (const t of (JSON.parse(l).system?.tags || [])) talentCounts[t] = (talentCounts[t] || 0) + 1;
const recon = rd('data/audits/feat-tags-production-reconciliation.json');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('analysis is deterministic and does not mutate the authority', () => {
  const snap = JSON.stringify(authority);
  const a = analyze(authority, ctx, talentCounts, recon), b = analyze(authority, ctx, talentCounts, recon);
  assert.equal(JSON.stringify(a), JSON.stringify(b)); assert.equal(JSON.stringify(authority), snap);
});
test('the committed analysis matches a fresh computation and is evidence-only', () => {
  const committed = rd(OUT_JSON); const fresh = analyze(authority, ctx, talentCounts, recon);
  assert.equal(committed.status, 'EVIDENCE_ONLY_NO_ADJUDICATION'); assert.deepEqual(committed.statistics, fresh.statistics);
  assert.equal(committed.families.length, fresh.families.length);
});
test('the three certified tier families are present with all three tiers', () => {
  const r = analyze(authority, ctx, talentCounts, recon);
  const tiers = r.families.filter(f => f.kind === 'CERTIFIED_TIER_FAMILY');
  assert.deepEqual(tiers.map(f => f.label).sort(), ['armor-proficiency', 'dual-weapon-mastery', 'martial-arts']);
  assert.ok(tiers.every(f => f.memberCount === 3));
});
test('owner-named chain members that are not canonical feats are reported, not invented', () => {
  const r = analyze(authority, ctx, talentCounts, recon);
  const names = new Set(authority.assignments.map(a => a.name));
  for (const u of r.unresolvedOwnerNamedChainMembers) for (const nm of u.unresolvedNames) assert.ok(!names.has(nm), nm);
  assert.ok(r.unresolvedOwnerNamedChainMembers.some(u => u.unresolvedNames.includes('Improved Rapid Shot')));
  assert.ok(OWNER_NAMED_CHAINS.length >= 8);
});
test('same-name feat identities stay distinct in prerequisite evidence (ambiguity is flagged, not resolved)', () => {
  const r = analyze(authority, ctx, talentCounts, recon);
  for (const e of r.prerequisiteEdges.filter(x => x.parentName === 'Staggering Attack')) { assert.equal(e.ambiguity, 'SAME_NAME_DISTINCT_FEAT_IDENTITIES'); assert.equal(e.parentIds.length, 2); }
});
test('flagged families carry reasons; unflagged families carry none; no family writes or alters tags', () => {
  const r = analyze(authority, ctx, talentCounts, recon);
  for (const f of r.families) {
    assert.equal(Boolean(f.pass2OwnerReview), f.pass2ReviewReasons.length > 0);
    if (f.pass2OwnerReview) assert.equal(f.pass2OwnerReview, 'PASS2_OWNER_REVIEW');
    for (const m of f.members) assert.deepEqual(m.tags, authority.assignments.find(a => a.canonicalId === m.canonicalId).finalTags);
  }
});
test('statistics reconcile with the authority (153 used, 34 zero-use, six new skill tags counted)', () => {
  const s = analyze(authority, ctx, talentCounts, recon).statistics;
  assert.deepEqual([s.assignments, s.approvedVocabulary, s.tagsUsed, s.zeroUseApprovedTags.length], [353, 187, 153, 34]);
  assert.equal(s.tagsUsed + s.zeroUseApprovedTags.length, s.approvedVocabulary);
  assert.deepEqual(Object.keys(s.newSkillTagUsage), ['acrobatics', 'climb', 'endurance', 'gather_information', 'jump', 'swim']);
});
console.log(`${n} tests passed`);
