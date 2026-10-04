import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildAll } from '../tools/report-talent-feat-pass3c-census-and-closeout.mjs';

const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const census = J('data/audits/talent-feat-pass3c-tag-census.json');
const cross = J('data/audits/talent-feat-pass3c-cross-domain-analysis.json');
const close = J('data/audits/talent-feat-pass3c-closeout.json');
const disc = J('data/audits/talent-feat-pass3b-exact-mechanic-convergence.json');

test('census covers every vocabulary tag once; counts add up and match the authority', () => {
  assert.equal(census.tags.length, 187); assert.equal(new Set(census.tags.map(t => t.tag)).size, 187);
  for (const t of census.tags) { assert.equal(t.records, t.feats + t.talents); assert.ok(t.pctOfCorpus >= 0 && t.pctOfCorpus <= 100); }
  const { auth } = buildAll();
  assert.equal(census.tags.reduce((a, t) => a + t.records, 0), auth.counts.tagInstancesAfter);
});
test('domain-only tag count agrees with the discovery report', () => {
  assert.equal(close.counts.domainOnlyTags, disc.dashboard.tagsUsedByOneDomainOnly);
  assert.equal(cross.summary.featOnly + cross.summary.talentOnly, close.counts.domainOnlyTags);
});
test('hard implications appear for exactly the ten rules', () => {
  const ante = census.tags.flatMap(t => t.implicationParticipation.asAntecedent.map(b => `${t.tag}>${b}`));
  assert.equal(ante.length, 10);
});
test('closeout: zero literal violations gates 3D; broad-tag states are factual and require no recommendation', () => {
  assert.equal(close.counts.policyViolations, close.violations.length);
  assert.equal(close.phase3dMayStart, close.violations.length === 0);
  for (const b of close.broadTagReview) assert.ok(['OWNER_DEFINED', 'PARTIALLY_OWNER_DEFINED', 'PHASE3D_OWNER_DEFINITION_REQUIRED'].includes(b.state));
  for (const o of ['precision', 'setup', 'control', 'battlefield_control', 'resources', 'survivability', 'reliability', 'empowerment', 'targeting', 'target-designation', 'support', 'tech']) assert.ok(close.broadTagReview.some(b => b.tag === o), o);
  assert.ok(!/\b(recommend|should)\b/i.test(JSON.stringify(census) + JSON.stringify(cross)));
});
test('3C outputs are byte-stable and no new tags exist', () => {
  execFileSync('node', ['tools/report-talent-feat-pass3c-census-and-closeout.mjs', '--check'], { stdio: 'pipe' });
  assert.equal(census.basis.vocabulary, 187);
});
