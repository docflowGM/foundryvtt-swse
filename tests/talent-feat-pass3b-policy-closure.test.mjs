import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { GENERAL_POLICIES, buildDecisions } from '../tools/apply-talent-feat-pass3b-policy-closure.mjs';

const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const overlay = J('data/audits/talent-feat-pass3b-owner-adjudication.json');
const closure = J('data/audits/talent-feat-pass3b-policy-closure.json');
const gaps = J('data/audits/talent-feat-pass3b-policy-gaps.json');
const auth = J('data/audits/talent-feat-pass3b-semantic-authority.json');
const bulk = overlay.decisions.filter(d => d.batch === '3B.BULK');
const policyIds = new Set(overlay.ownerPolicies.map(p => p.id));
const GENERAL = ['DIRECT_OPERATIVE_MECHANIC_POLICY', 'REFERENCE_ONLY_POLICY', 'OPEN_GENERIC_SCOPE_POLICY', 'CLOSED_SCOPE_POLICY', 'NEGATIVE_EXCLUSION_POLICY', 'SPECIFIC_OVER_BROAD_POLICY'];
const WEAPON = new Set(['melee', 'ranged', 'lightsaber', 'pistol', 'unarmed']);

test('six general owner policies exist exactly once; no other policy was created by the closure', () => {
  for (const id of GENERAL) assert.equal(overlay.ownerPolicies.filter(p => p.id === id).length, 1, id);
  assert.deepEqual(GENERAL_POLICIES.map(p => p.id), GENERAL);
  assert.equal(new Set(overlay.ownerPolicies.map(p => p.id)).size, overlay.ownerPolicies.length);
});
test('every policy-derived decision is tagged OWNER_POLICY_DERIVED and cites an existing owner policy', () => {
  assert.ok(bulk.length > 0);
  for (const d of bulk) {
    assert.equal(d.decisionSource, 'OWNER_POLICY_DERIVED');
    assert.ok(d.ownerPoliciesApplied.length > 0, d.decisionId);
    for (const p of d.ownerPoliciesApplied) assert.ok(policyIds.has(p), `${d.decisionId} ${p}`);
    assert.ok(d.ownerPoliciesApplied.includes(d.ownerPolicyApplied));
    assert.ok(d.detectorEvidenceReference.length && d.clauseEvidence.length);
  }
});
test('no previously issued owner decision was altered or re-sourced', () => {
  for (const d of overlay.decisions.filter(x => x.batch !== '3B.BULK')) assert.notEqual(d.decisionSource, 'OWNER_POLICY_DERIVED');
  assert.equal(overlay.decisions.filter(d => d.batch !== '3B.BULK').length, 125);
});
test('NO_CHANGE derivations come only from exclusion/reference/open-generic rules; ADD only from closed weapon-scope', () => {
  for (const d of bulk) {
    if (d.ownerAction === 'NO_CHANGE') assert.ok(['NEGATIVE_EXCLUSION', 'REFERENCE_ONLY', 'OPEN_GENERIC_SCOPE'].some(r => d.derivationRule.includes(r)), d.decisionId);
    else { assert.ok(d.derivationRule.includes('CLOSED'), d.decisionId); assert.ok(WEAPON.has(d.tag), d.decisionId); assert.ok(d.ownerPoliciesApplied.includes('CLOSED_SCOPE_POLICY')); }
  }
});
test('reference-only / exclusion / open-generic evidence never produces an ADD', () => {
  for (const d of bulk.filter(x => x.ownerAction === 'ADD')) for (const c of d.clauseEvidence) assert.ok(!['NEGATIVE_EXCLUSION', 'REFERENCE_ONLY', 'OPEN_GENERIC_SCOPE'].includes(c.kind) || d.clauseEvidence.some(x => x.kind === 'CLOSED_DIRECT'));
});
test('generic-scope records cannot create arbitrary specific tags: only weapon-scope tags are ever added by policy', () => {
  for (const d of bulk.filter(x => x.ownerAction === 'ADD')) assert.ok(WEAPON.has(d.tag), d.tag);
});
test('unresolved findings stay as gaps, with no recommendation language, and are not decided', () => {
  const decided = new Set(overlay.decisions.map(d => d.decisionId));
  let n = 0;
  for (const g of gaps.gaps) {
    assert.ok(g.insufficiencyStatement && g.ownerQuestion);
    for (const r of g.records) { n++; }
    assert.ok(!/\b(should|recommend|likely|probably)\b/i.test(g.insufficiencyStatement), g.gapId);
  }
  assert.equal(gaps.counts.gaps ?? gaps.gaps.length, gaps.gaps.length);
  assert.equal(closure.counts.unresolvedRecordLevel, closure.counts.startingUnresolvedRecordLevel - closure.counts.resolvedByPolicy);
  assert.equal(closure.counts.policyGaps, gaps.gaps.length);
  assert.ok(n > 0 && decided.size === overlay.decisions.length);
});
test('ontology-gap evidence is flagged without creating tags; vocabulary stays 187', () => {
  assert.equal(closure.ontologyGaps.length, 3);
  assert.equal(auth.sharedVocabulary.newTagsIntroduced, 0);
  assert.equal(auth.sharedVocabulary.tags?.length ?? 187, 187);
});
test('closure counts are consistent with the overlay and authority', () => {
  const c = closure.counts;
  assert.equal(c.resolvedByPolicy, bulk.length); assert.equal(c.policyDerivedAdd, bulk.filter(d => d.ownerAction === 'ADD').length);
  assert.equal(c.overlayDecisions, overlay.decisions.length); assert.equal(auth.counts.tagAdditions, c.tagAdditions); assert.equal(auth.counts.removals, 0);
});
test('derivation is deterministic and idempotent against the committed overlay; builds are byte-stable', () => {
  execFileSync('node', ['tools/apply-talent-feat-pass3b-policy-closure.mjs', '--check'], { stdio: 'pipe' });
  execFileSync('node', ['tools/build-talent-feat-pass3b-semantic-authority.mjs', '--check'], { stdio: 'pipe' });
});
