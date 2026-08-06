#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const backlogPath = path.join(ROOT, 'data/feat-implementation/core-rulebook-feat-implementation-backlog.json');
const reviewPath = path.join(ROOT, 'data/feat-implementation/core-rulebook-feat-implementation-review-list.json');
const validityRegistryPath = path.join(ROOT, 'data/feat-validity-registry.json');
const reportJsonPath = path.join(ROOT, 'docs/audits/generated/core-rulebook-feat-implementation-readiness-report.json');
const reportMdPath = path.join(ROOT, 'docs/audits/generated/core-rulebook-feat-implementation-readiness-report.md');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

const backlog = readJson(backlogPath);
const review = readJson(reviewPath);
const validityRegistry = readJson(validityRegistryPath);
const invalidStatuses = new Set(['invalid_not_swse_feat', 'class_feature_not_feat']);
const invalidByName = new Map(
  validityRegistry.entries
    .filter(e => invalidStatuses.has(e.status))
    .map(e => [e.name, e.status])
);
const errors = [];
const warnings = [];
const entries = Array.isArray(backlog.entries) ? backlog.entries : [];

const allowedAccuracy = new Set([
  'implemented_correct',
  'implemented_partial',
  'implemented_incorrect',
  'not_implemented',
  'metadata_correct',
  'source_review_required'
]);
const allowedModes = new Set([
  'static_sheet_math',
  'scoped_choice_static',
  'conditional_roll_modifier',
  'attack_option',
  'reaction_prompt',
  'resource_rule',
  'recovery_rule',
  'condition_track_rule',
  'force_power_selection',
  'force_point_rule',
  'skill_reroll_hook',
  'skill_action_option',
  'grapple_rider',
  'vehicle_starship_reaction',
  'organization_metadata',
  'language_selection',
  'procedure_metadata',
  'manual_workflow',
  'source_review_required'
]);

if (backlog.schemaVersion !== 1) errors.push('Backlog schemaVersion must be 1.');
if (backlog.phase !== '9A-core-rulebook-implementation-accuracy') errors.push('Unexpected backlog phase.');
if (!Array.isArray(backlog.entries) || backlog.entries.length === 0) errors.push('Backlog entries are missing.');
if (!Array.isArray(review.entries)) errors.push('Review-list entries are missing.');

const names = new Set();
for (const entry of entries) {
  const label = entry?.name || '<unnamed>';
  if (!entry?.name) errors.push('Entry is missing name.');
  if (names.has(entry.name)) errors.push(`Duplicate feat entry: ${entry.name}`);
  names.add(entry.name);
  if (!entry?.source?.includes('Core Rulebook')) errors.push(`${label}: source must be Core Rulebook for Phase 9A.`);
  if (!entry?.description || entry.description.length < 12) errors.push(`${label}: missing source-derived description/benefit summary.`);
  if (!entry?.expected?.mode || !allowedModes.has(entry.expected.mode)) errors.push(`${label}: invalid expected implementation mode ${entry?.expected?.mode}`);
  if (!entry?.accuracy?.status || !allowedAccuracy.has(entry.accuracy.status)) errors.push(`${label}: invalid accuracy status ${entry?.accuracy?.status}`);
  if (!entry?.accuracy?.rationale || entry.accuracy.rationale.length < 12) errors.push(`${label}: missing accuracy rationale.`);
  if (entry.accuracy.status === 'implemented_correct' && entry.expected.mode === 'manual_workflow') {
    errors.push(`${label}: manual workflows should not be marked implemented_correct.`);
  }
  if (entry.accuracy.status === 'implemented_incorrect' && !entry.accuracy.correctiveAction) {
    errors.push(`${label}: implemented_incorrect entries require correctiveAction.`);
  }
  if (entry.accuracy.status === 'source_review_required' && !entry.sourceReviewReason) {
    errors.push(`${label}: source_review_required requires sourceReviewReason.`);
  }
}

for (const item of review.entries) {
  const match = entries.find(e => e.name === item.name);
  if (!match) errors.push(`Review list entry not found in backlog: ${item.name}`);
  if (!item.description || !item.proposedBucket || !item.proposedImplementationMode) {
    errors.push(`Review list entry incomplete: ${item.name}`);
  }
}

const excludedInvalidEntries = entries
  .filter(e => invalidByName.has(e.name))
  .map(e => ({ name: e.name, status: invalidByName.get(e.name) }))
  .sort((a, b) => a.name.localeCompare(b.name));
const validEntries = entries.filter(e => !invalidByName.has(e.name));

const byAccuracy = validEntries.reduce((acc, entry) => {
  acc[entry.accuracy.status] = (acc[entry.accuracy.status] || 0) + 1;
  return acc;
}, {});
const byMode = validEntries.reduce((acc, entry) => {
  acc[entry.expected.mode] = (acc[entry.expected.mode] || 0) + 1;
  return acc;
}, {});
const highPriority = validEntries.filter(e => e.priority === 'high').map(e => e.name).sort();
const incorrect = validEntries.filter(e => e.accuracy.status === 'implemented_incorrect').map(e => e.name).sort();
const partial = validEntries.filter(e => e.accuracy.status === 'implemented_partial').map(e => e.name).sort();
const validReviewEntries = review.entries.filter(e => !invalidByName.has(e.name));

const report = {
  schemaVersion: 1,
  phase: backlog.phase,
  scope: backlog.scope,
  totals: {
    featsAudited: validEntries.length,
    excludedInvalid: excludedInvalidEntries.length,
    reviewQueue: validReviewEntries.length,
    errors: errors.length,
    warnings: warnings.length
  },
  byAccuracy,
  byMode,
  highPriority,
  implementedIncorrect: incorrect,
  implementedPartial: partial,
  reviewQueue: validReviewEntries.map(e => ({
    name: e.name,
    proposedBucket: e.proposedBucket,
    proposedSubbucket: e.proposedSubbucket,
    proposedImplementationMode: e.proposedImplementationMode,
    reason: e.reason
  })),
  excludedInvalidEntries,
  warnings,
  errors
};

ensureDir(reportJsonPath);
fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

const md = [];
md.push('# Core Rulebook Feat Implementation Accuracy Report');
md.push('');
md.push(`Scope: ${backlog.scope}`);
md.push('');
md.push('## Totals');
md.push('');
md.push(`- Feats audited: ${validEntries.length}`);
md.push(`- Excluded as invalid (see data/feat-validity-registry.json): ${excludedInvalidEntries.length}`);
md.push(`- Source-review queue: ${validReviewEntries.length}`);
md.push(`- Warnings: ${warnings.length}`);
md.push(`- Errors: ${errors.length}`);
md.push('');
md.push('## Accuracy counts');
md.push('');
for (const [key, value] of Object.entries(byAccuracy).sort()) md.push(`- ${key}: ${value}`);
md.push('');
md.push('## Implementation modes');
md.push('');
for (const [key, value] of Object.entries(byMode).sort()) md.push(`- ${key}: ${value}`);
md.push('');
md.push('## Implemented incorrectly');
md.push('');
if (incorrect.length) incorrect.forEach(name => md.push(`- ${name}`)); else md.push('- None');
md.push('');
md.push('## Partial implementations');
md.push('');
if (partial.length) partial.forEach(name => md.push(`- ${name}`)); else md.push('- None');
md.push('');
md.push('## Excluded as invalid');
md.push('');
md.push('These names were audited in an earlier pass but are not legal SWSE feats (or, for Delay Damage, are a class feature) per data/feat-validity-registry.json. They are excluded from every count and queue above.');
md.push('');
if (excludedInvalidEntries.length) {
  excludedInvalidEntries.forEach(e => md.push(`- ${e.name} (${e.status})`));
} else {
  md.push('- None');
}
md.push('');
md.push('## Source-review queue');
md.push('');
if (validReviewEntries.length) {
  for (const item of validReviewEntries) {
    md.push(`### ${item.name}`);
    md.push('');
    md.push(`Description: ${item.description}`);
    md.push('');
    md.push(`Proposed bucket: ${item.proposedBucket} / ${item.proposedSubbucket}`);
    md.push('');
    md.push(`Proposed implementation mode: ${item.proposedImplementationMode}`);
    md.push('');
    md.push(`Reason: ${item.reason}`);
    md.push('');
  }
} else {
  md.push('- None');
}
md.push('## Errors');
md.push('');
if (errors.length) errors.forEach(error => md.push(`- ${error}`)); else md.push('- None');
md.push('');
fs.writeFileSync(reportMdPath, `${md.join('\n')}\n`);

if (errors.length && process.argv.includes('--strict')) {
  console.error(`Core Rulebook feat implementation audit failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(`Core Rulebook feat implementation audit: ${validEntries.length} feats (${excludedInvalidEntries.length} excluded as invalid), ${warnings.length} warnings, ${errors.length} errors.`);
