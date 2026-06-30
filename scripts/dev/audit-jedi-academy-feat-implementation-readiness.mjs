#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const root = process.cwd();
const backlogPath = path.join(root, 'data/feat-implementation/jedi-academy-feat-implementation-backlog.json');
const reviewPath = path.join(root, 'data/feat-implementation/jedi-academy-feat-implementation-review-list.json');
const expectedNames = [
  'Fast Surge','Follow Through','Force Regimen Mastery','Intuitive Initiative','Keen Force Mind','Long Haft Strike','Relentless Attack','Unswerving Resolve'
];
const allowedStatuses = new Set(['implemented_correct','implemented_partial','implemented_incorrect','not_implemented','metadata_correct','source_review_required']);
const allowedBuckets = new Set(['Combat','Weapon & Armor','Force','Skills','Recovery & Survival']);
const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const errors = [];
const warnings = [];
if (!fs.existsSync(backlogPath)) errors.push(`Missing backlog: ${backlogPath}`);
if (!fs.existsSync(reviewPath)) errors.push(`Missing review list: ${reviewPath}`);
let backlog = { feats: [] };
let review = { entries: [] };
if (!errors.length) {
  backlog = json(backlogPath);
  review = json(reviewPath);
  const names = new Set(backlog.feats.map(f => f.name));
  for (const name of expectedNames) if (!names.has(name)) errors.push(`Missing Jedi Academy feat backlog entry: ${name}`);
  for (const feat of backlog.feats) {
    if (!feat.description || feat.description.length < 10) errors.push(`${feat.name}: missing useful description`);
    if (!allowedStatuses.has(feat.implementationStatus)) errors.push(`${feat.name}: invalid status ${feat.implementationStatus}`);
    if (!allowedBuckets.has(feat.proposedBucket)) errors.push(`${feat.name}: invalid proposed bucket ${feat.proposedBucket}`);
    if (!feat.proposedSubbucket) errors.push(`${feat.name}: missing proposed subbucket`);
    if (!feat.implementationMode) errors.push(`${feat.name}: missing implementation mode`);
    if (!feat.expectedRuleShape) errors.push(`${feat.name}: missing expected rule shape`);
    if (!feat.observedImplementation) errors.push(`${feat.name}: missing observed implementation`);
    if (!feat.accuracyFinding) errors.push(`${feat.name}: missing accuracy finding`);
    if (feat.name === 'Fast Surge' && feat.proposedBucket === 'Force') errors.push('Fast Surge must not be Force taxonomy; it is Second Wind action economy.');
    if (feat.name === 'Keen Force Mind' && feat.implementationStatus === 'implemented_correct') errors.push('Keen Force Mind cannot be correct until scoped mind-affecting Force power activation hook is proven.');
    if (feat.name === 'Force Regimen Mastery' && feat.implementationStatus === 'implemented_correct') errors.push('Force Regimen Mastery cannot be correct until a dedicated Force Regimen picker/progression workflow is proven.');
  }
  const reviewNames = new Set(review.entries.map(e => e.name));
  for (const feat of backlog.feats) {
    if (feat.implementationStatus !== 'implemented_correct' && !reviewNames.has(feat.name)) {
      errors.push(`${feat.name}: non-correct feat missing from review list`);
    }
  }
  if (backlog.feats.length !== expectedNames.length) errors.push(`Expected ${expectedNames.length} feats, found ${backlog.feats.length}`);
}
const report = {
  phase: 'phase-9h-jedi-academy-implementation-accuracy',
  checkedAt: new Date().toISOString(),
  strict,
  summary: backlog.summary || {},
  reviewCount: review.entries?.length || 0,
  errors,
  warnings
};
const outDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'jedi-academy-feat-implementation-readiness-report.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# Jedi Academy Training Manual Feat Implementation Readiness Report',
  '',
  `Checked: ${report.checkedAt}`,
  '',
  '## Summary',
  '',
  `- Feats audited: ${backlog.summary?.totalFeatsAudited ?? 0}`,
  `- Review entries: ${review.entries?.length ?? 0}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
  '',
  '## Status Counts',
  '',
  ...Object.entries(backlog.summary?.counts || {}).map(([k,v]) => `- ${k}: ${v}`),
  '',
  '## Errors',
  '',
  ...(errors.length ? errors.map(e => `- ${e}`) : ['- None']),
  '',
  '## Warnings',
  '',
  ...(warnings.length ? warnings.map(w => `- ${w}`) : ['- None'])
];
fs.writeFileSync(path.join(outDir, 'jedi-academy-feat-implementation-readiness-report.md'), lines.join('\n') + '\n');
console.log(`Jedi Academy feat implementation audit: ${backlog.feats.length} feats, ${warnings.length} warnings, ${errors.length} errors.`);
if (strict && errors.length) process.exit(1);
