#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const backlogPath = path.join(ROOT, 'data/feat-implementation/web-enhancement-feat-implementation-backlog.json');
const reviewPath = path.join(ROOT, 'data/feat-implementation/web-enhancement-feat-implementation-review-list.json');
const reportJsonPath = path.join(ROOT, 'docs/audits/generated/web-enhancement-feat-implementation-readiness-report.json');
const reportMdPath = path.join(ROOT, 'docs/audits/generated/web-enhancement-feat-implementation-readiness-report.md');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function countBy(items, getter) {
  const out = {};
  for (const item of items) {
    const key = getter(item) || 'unknown';
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

const backlog = readJson(backlogPath);
const review = readJson(reviewPath);
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
  'procedure_workbench',
  'procedure_metadata',
  'manual_workflow',
  'source_review_required'
]);

if (backlog.schemaVersion !== 1) errors.push('Backlog schemaVersion must be 1.');
if (backlog.phase !== '9B-web-enhancement-implementation-accuracy') errors.push('Unexpected backlog phase.');
if (!Array.isArray(backlog.entries) || backlog.entries.length === 0) errors.push('Backlog entries are missing.');
if (!Array.isArray(review.entries)) errors.push('Review-list entries are missing.');

const names = new Set();
for (const entry of entries) {
  const label = entry?.name || '<unnamed>';
  if (!entry?.name) errors.push('Entry missing name.');
  if (names.has(entry.name)) errors.push(`Duplicate backlog entry: ${entry.name}`);
  names.add(entry.name);
  if (!entry?.slug) errors.push(`${label}: missing slug.`);
  if (!entry?.source) errors.push(`${label}: missing source.`);
  if (!entry?.description || entry.description.length < 40) errors.push(`${label}: missing meaningful source description.`);
  if (!entry?.prerequisite) errors.push(`${label}: missing prerequisite text.`);
  if (!entry?.taxonomy?.bucket || !entry?.taxonomy?.subbucket) errors.push(`${label}: missing taxonomy bucket/subbucket.`);
  if (!entry?.expected?.mode || !allowedModes.has(entry.expected.mode)) errors.push(`${label}: invalid expected mode ${entry?.expected?.mode}.`);
  if (!entry?.expected?.home) errors.push(`${label}: missing expected implementation home.`);
  if (!Array.isArray(entry?.expected?.requiredRuntimeFeatures) || !entry.expected.requiredRuntimeFeatures.length) errors.push(`${label}: missing required runtime feature list.`);
  if (!entry?.observed || typeof entry.observed !== 'object') errors.push(`${label}: missing observed implementation metadata.`);
  if (!Array.isArray(entry?.observed?.implementationEvidence) || !entry.observed.implementationEvidence.length) errors.push(`${label}: missing implementation evidence.`);
  if (!Array.isArray(entry?.observed?.implementationConcerns) || !entry.observed.implementationConcerns.length) warnings.push(`${label}: no implementation concerns listed; verify this is truly complete.`);
  if (!entry?.accuracy?.status || !allowedAccuracy.has(entry.accuracy.status)) errors.push(`${label}: invalid accuracy status ${entry?.accuracy?.status}.`);
  if (!entry?.accuracy?.rationale) errors.push(`${label}: missing accuracy rationale.`);
  if (entry.accuracy.status !== 'implemented_correct' && !entry.accuracy.correctiveAction) errors.push(`${label}: non-correct implementation requires correctiveAction.`);
  if (entry.accuracy.status === 'implemented_correct' && entry.expected.shouldBeStaticFlatBonus === true && entry.expected.shouldExposeActionOrPrompt === true) {
    errors.push(`${label}: impossible expectation; static-only and action/prompt both required.`);
  }
  if (entry.name === 'Tech Specialist') {
    if (entry.expected.mode !== 'procedure_workbench') errors.push('Tech Specialist must be audited as procedure_workbench.');
    if (entry.expected.shouldBeStaticFlatBonus !== false) errors.push('Tech Specialist must not be treated as a static flat bonus.');
    if (entry.accuracy.status === 'implemented_correct') errors.push('Tech Specialist may not be marked implemented_correct until source attribution, trait list, downtime/helper, no-Take-10, and derived-math parity are proven.');
    if (!String(entry.currentCatalogSourceObserved || '').includes('Core Rulebook')) warnings.push('Tech Specialist catalog source drift was not recorded; verify source attribution.');
  }
}

const reviewNames = new Set((review.entries || []).map(entry => entry.name));
for (const entry of entries) {
  if (entry.sourceReviewReason && !reviewNames.has(entry.name)) errors.push(`${entry.name}: has sourceReviewReason but is missing from review list.`);
}
for (const item of review.entries || []) {
  const label = item?.name || '<unnamed review item>';
  if (!item?.description) errors.push(`${label}: review item missing description.`);
  if (!item?.proposedBucket || !item?.proposedSubbucket) errors.push(`${label}: review item missing proposed bucket/subbucket.`);
  if (!item?.proposedImplementationMode || !allowedModes.has(item.proposedImplementationMode)) errors.push(`${label}: invalid proposed implementation mode ${item?.proposedImplementationMode}.`);
  if (!item?.reason) errors.push(`${label}: review item missing reason.`);
  if (!item?.nextDecision) errors.push(`${label}: review item missing nextDecision.`);
}

const report = {
  schemaVersion: 1,
  phase: backlog.phase,
  scope: backlog.scope,
  totals: {
    featsAudited: entries.length,
    reviewQueue: review.entries?.length || 0,
    errors: errors.length,
    warnings: warnings.length
  },
  byAccuracy: countBy(entries, entry => entry.accuracy?.status),
  byMode: countBy(entries, entry => entry.expected?.mode),
  highPriority: entries.filter(entry => entry.priority === 'high').map(entry => entry.name),
  implementedIncorrectly: entries.filter(entry => entry.accuracy?.status === 'implemented_incorrect').map(entry => entry.name),
  partialImplementations: entries.filter(entry => entry.accuracy?.status === 'implemented_partial').map(entry => entry.name),
  sourceReviewQueue: review.entries.map(entry => ({
    name: entry.name,
    proposedBucket: entry.proposedBucket,
    proposedSubbucket: entry.proposedSubbucket,
    proposedImplementationMode: entry.proposedImplementationMode,
    reason: entry.reason
  })),
  warnings,
  errors
};

function renderReportMd() {
  const lines = [];
  lines.push('# Web Enhancement Feat Implementation Accuracy Report');
  lines.push('');
  lines.push(`Scope: ${backlog.scope}`);
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push(`- Feats audited: ${report.totals.featsAudited}`);
  lines.push(`- Source-review queue: ${report.totals.reviewQueue}`);
  lines.push(`- Warnings: ${report.totals.warnings}`);
  lines.push(`- Errors: ${report.totals.errors}`);
  lines.push('');
  lines.push('## Accuracy counts');
  lines.push('');
  for (const [key, value] of Object.entries(report.byAccuracy)) lines.push(`- ${key}: ${value}`);
  lines.push('');
  lines.push('## Implementation modes');
  lines.push('');
  for (const [key, value] of Object.entries(report.byMode)) lines.push(`- ${key}: ${value}`);
  lines.push('');
  lines.push('## Partial implementations');
  lines.push('');
  if (report.partialImplementations.length) {
    for (const name of report.partialImplementations) lines.push(`- ${name}`);
  } else {
    lines.push('- None');
  }
  lines.push('');
  lines.push('## Source-review queue');
  lines.push('');
  if (report.sourceReviewQueue.length) {
    for (const item of report.sourceReviewQueue) {
      lines.push(`- ${item.name} -> ${item.proposedBucket} / ${item.proposedSubbucket} (${item.proposedImplementationMode})`);
      lines.push(`  - ${item.reason}`);
    }
  } else {
    lines.push('- None');
  }
  lines.push('');
  lines.push('## Warnings');
  lines.push('');
  if (warnings.length) warnings.forEach(warning => lines.push(`- ${warning}`));
  else lines.push('- None');
  lines.push('');
  lines.push('## Errors');
  lines.push('');
  if (errors.length) errors.forEach(error => lines.push(`- ${error}`));
  else lines.push('- None');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

ensureDir(reportJsonPath);
fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(reportMdPath, renderReportMd());

if (errors.length) {
  console.error(`Web Enhancement feat implementation audit failed with ${errors.length} error(s).`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn(`Web Enhancement feat implementation audit completed with ${warnings.length} warning(s).`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log(`Web Enhancement feat implementation audit: ${entries.length} feats, ${warnings.length} warnings, ${errors.length} errors.`);
