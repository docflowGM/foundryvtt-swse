#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const backlogPath = path.join(root, 'data/feat-implementation/galaxy-intrigue-feat-implementation-backlog.json');
const reviewPath = path.join(root, 'data/feat-implementation/galaxy-intrigue-feat-implementation-review-list.json');
const reportJsonPath = path.join(root, 'docs/audits/generated/galaxy-intrigue-feat-implementation-readiness-report.json');
const reportMdPath = path.join(root, 'docs/audits/generated/galaxy-intrigue-feat-implementation-readiness-report.md');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const backlog = readJson(backlogPath);
const review = readJson(reviewPath);
const errors = [];
const warnings = [];
const allowedStatuses = new Set(['implemented_correct', 'implemented_partial', 'not_implemented', 'metadata_correct', 'source_review_required']);

if (!Array.isArray(backlog.entries)) errors.push('Backlog entries must be an array.');
if (!Array.isArray(review.entries)) errors.push('Review entries must be an array.');

const byAccuracy = {};
const byMode = {};
const names = new Set();
for (const feat of backlog.entries ?? []) {
  if (!feat.name) errors.push('Backlog entry missing name.');
  if (names.has(feat.name)) errors.push(`Duplicate backlog entry: ${feat.name}`);
  names.add(feat.name);
  if (!feat.description || feat.description.length < 12) errors.push(`${feat.name}: missing source-derived description.`);
  if (!feat.taxonomy?.bucket || !feat.taxonomy?.subbucket) errors.push(`${feat.name}: missing taxonomy bucket/subbucket.`);
  if (!feat.expected?.mode || !feat.expected?.home) errors.push(`${feat.name}: missing expected implementation mode/home.`);
  if (!allowedStatuses.has(feat.accuracy?.status)) errors.push(`${feat.name}: invalid accuracy status ${feat.accuracy?.status}`);
  if (!feat.accuracy?.rationale) errors.push(`${feat.name}: missing accuracy rationale.`);
  if (!feat.accuracy?.correctiveAction) errors.push(`${feat.name}: missing corrective action.`);
  if (feat.expected?.mode === 'skill_challenge_hook' && feat.accuracy?.status === 'implemented_correct') {
    const observedStatus = `${feat.observed?.abilityMetaStatus ?? ''} ${feat.observed?.abilityMetaMode ?? ''}`.toLowerCase();
    if (observedStatus.includes('manual') || observedStatus.includes('punted')) {
      errors.push(`${feat.name}: cannot be implemented_correct while observed metadata is still manual/punted.`);
    }
  }
  byAccuracy[feat.accuracy.status] = (byAccuracy[feat.accuracy.status] ?? 0) + 1;
  byMode[feat.expected.mode] = (byMode[feat.expected.mode] ?? 0) + 1;
}

for (const entry of review.entries ?? []) {
  if (!entry.name || !entry.description || !entry.proposedBucket || !entry.proposedSubbucket || !entry.reason) {
    errors.push(`Review entry incomplete: ${entry.name ?? '<unnamed>'}`);
  }
  if (!names.has(entry.name)) errors.push(`Review entry not present in backlog: ${entry.name}`);
}

const report = {
  schemaVersion: 1,
  phase: backlog.phase,
  scope: backlog.scope,
  totals: {
    featsAudited: backlog.entries?.length ?? 0,
    reviewQueue: review.entries?.length ?? 0,
    errors: errors.length,
    warnings: warnings.length
  },
  byAccuracy,
  byMode,
  reviewQueue: review.entries.map((entry) => ({
    name: entry.name,
    proposedBucket: entry.proposedBucket,
    proposedSubbucket: entry.proposedSubbucket,
    proposedImplementationMode: entry.proposedImplementationMode
  })),
  errors,
  warnings
};
fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# Galaxy of Intrigue Feat Implementation Readiness Report',
  '',
  `Feats audited: ${report.totals.featsAudited}`,
  `Review queue: ${report.totals.reviewQueue}`,
  `Errors: ${report.totals.errors}`,
  `Warnings: ${report.totals.warnings}`,
  '',
  '## Accuracy',
  ...Object.entries(byAccuracy).sort().map(([key, value]) => `- ${key}: ${value}`),
  '',
  '## Implementation modes',
  ...Object.entries(byMode).sort().map(([key, value]) => `- ${key}: ${value}`),
  '',
  '## Review queue',
  ...review.entries.map((entry) => `- ${entry.name} -> ${entry.proposedBucket} / ${entry.proposedSubbucket} (${entry.proposedImplementationMode})`),
  ''
];
fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(strict ? 1 : 0);
}
console.log(`Galaxy of Intrigue feat implementation audit: ${report.totals.featsAudited} feats, ${report.totals.warnings} warnings, ${report.totals.errors} errors.`);
