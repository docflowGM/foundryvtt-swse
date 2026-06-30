#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const strict = process.argv.includes('--strict');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const errors = [];
const warnings = [];
const ok = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }
function pass(message) { ok.push(message); }

const required = [
  'data/feat-implementation/starships-feat-implementation-backlog.json',
  'data/feat-implementation/starships-feat-implementation-review-list.json',
  'data/feat-catalog.json',
  'packs/feats.db'
];
for (const file of required) {
  if (exists(file)) pass(`Found ${file}`);
  else fail(`Missing ${file}`);
}

const backlog = readJson('data/feat-implementation/starships-feat-implementation-backlog.json');
const review = readJson('data/feat-implementation/starships-feat-implementation-review-list.json');
const catalog = readJson('data/feat-catalog.json');
const catalogByName = new Map(catalog.map((feat) => [feat.name, feat]));
const packLines = fs.readFileSync(path.join(ROOT, 'packs/feats.db'), 'utf8').split(/\r?\n/).filter(Boolean);
const packByName = new Map();
for (const line of packLines) {
  try {
    const doc = JSON.parse(line);
    if (doc?.name) packByName.set(doc.name, doc);
  } catch (err) {
    fail(`packs/feats.db contains invalid JSONL: ${err.message}`);
  }
}

if (backlog.sourceBook === 'Starships of the Galaxy') pass('Backlog source book is Starships of the Galaxy');
else fail(`Unexpected backlog source book: ${backlog.sourceBook}`);

if (backlog.feats?.length === backlog.expectedFeatCount) pass(`Backlog contains ${backlog.feats.length} expected feats`);
else fail(`Expected ${backlog.expectedFeatCount} feats but found ${backlog.feats?.length ?? 0}`);

const allowedStatuses = new Set(['implemented_correct', 'implemented_partial', 'not_implemented', 'metadata_correct', 'source_review_required', 'wrong_shape']);
const allowedModes = new Set(['progression_choice_grant', 'triggered_resource_recovery_hook', 'metadata_only_consult_sotg']);
const expectedNames = ['Starship Tactics', 'Tactical Genius', 'Starship Designer'];

for (const name of expectedNames) {
  if (catalogByName.has(name)) pass(`Catalog contains ${name}`);
  else fail(`Catalog missing ${name}`);
  if (packByName.has(name)) pass(`Pack contains ${name}`);
  else fail(`Pack missing ${name}`);
}

for (const entry of backlog.feats ?? []) {
  if (!entry.name) fail('Backlog entry missing name');
  if (!entry.descriptionSummary) fail(`${entry.name} missing descriptionSummary`);
  if (!entry.taxonomy?.bucket || !entry.taxonomy?.subbucket) fail(`${entry.name} missing taxonomy bucket/subbucket`);
  if (!allowedStatuses.has(entry.observedImplementation?.status)) fail(`${entry.name} has invalid status ${entry.observedImplementation?.status}`);
  if (!allowedModes.has(entry.expectedImplementation?.mode)) fail(`${entry.name} has invalid expected implementation mode ${entry.expectedImplementation?.mode}`);
  if (!entry.accuracyFinding) fail(`${entry.name} missing accuracyFinding`);
  if (!entry.nextStep) fail(`${entry.name} missing nextStep`);

  const catalogDoc = catalogByName.get(entry.name);
  if (catalogDoc) {
    const source = catalogDoc.system?.sourcebook || catalogDoc.system?.source || '';
    if (!String(source).includes('Starships')) fail(`${entry.name} sourcebook is not Starships of the Galaxy: ${source}`);
    else pass(`${entry.name} sourcebook attribution verified`);
  }

  if (entry.name === 'Starship Designer') {
    if (entry.observedImplementation.status !== 'metadata_correct') fail('Starship Designer must remain metadata_correct, not implemented as automation');
    if (entry.expectedImplementation.staticSheetPolicy !== 'exclude') fail('Starship Designer must exclude static sheet math');
  }
  if (entry.name === 'Starship Tactics' && entry.observedImplementation.status !== 'implemented_partial') {
    fail('Starship Tactics should remain implemented_partial until maneuver-suite picker/runtime is proven');
  }
  if (entry.name === 'Tactical Genius' && entry.observedImplementation.status !== 'implemented_partial') {
    fail('Tactical Genius should remain implemented_partial until natural-20 recovery hook is proven');
  }
}

for (const item of review.items ?? []) {
  if (!item.name || !item.description || !item.proposedBucket || !item.proposedSubbucket || !item.reason) {
    fail(`Review item is incomplete: ${JSON.stringify(item)}`);
  }
}

if (!review.items?.some((item) => item.name === 'Starship Tactics')) fail('Review list must include Starship Tactics');
if (!review.items?.some((item) => item.name === 'Tactical Genius')) fail('Review list must include Tactical Genius');

const generatedDir = path.join(ROOT, 'docs/audits/generated');
fs.mkdirSync(generatedDir, { recursive: true });
const statusCounts = {};
for (const entry of backlog.feats ?? []) {
  const status = entry.observedImplementation?.status || 'unknown';
  statusCounts[status] = (statusCounts[status] || 0) + 1;
}
const report = {
  phase: '9C',
  scope: backlog.scope,
  sourceBook: backlog.sourceBook,
  featCount: backlog.feats?.length ?? 0,
  statusCounts,
  reviewCount: review.items?.length ?? 0,
  ok: ok.length,
  warnings,
  errors
};
fs.writeFileSync(path.join(generatedDir, 'starships-feat-implementation-readiness-report.json'), JSON.stringify(report, null, 2));
const md = [
  '# Starships of the Galaxy Feat Implementation Readiness Report',
  '',
  `Phase: ${report.phase}`,
  `Feat count: ${report.featCount}`,
  '',
  '## Status counts',
  '',
  ...Object.entries(statusCounts).map(([key, value]) => `- ${key}: ${value}`),
  '',
  `Source-review / verification items: ${report.reviewCount}`,
  '',
  '## Findings',
  '',
  '- Starship Tactics: partial; needs verified maneuver-suite progression picker/runtime.',
  '- Tactical Genius: partial; needs natural-20 attack-roll and maneuver recovery hook.',
  '- Starship Designer: metadata-correct; intentionally consult Starships of the Galaxy / GM adjudication only.',
  '',
  `Warnings: ${warnings.length}`,
  `Errors: ${errors.length}`,
  ''
].join('\n');
fs.writeFileSync(path.join(generatedDir, 'starships-feat-implementation-readiness-report.md'), md);

if (warnings.length) console.warn(warnings.map((w) => `WARN: ${w}`).join('\n'));
if (errors.length) console.error(errors.map((e) => `ERROR: ${e}`).join('\n'));
console.log(`Starships feat implementation audit: ${backlog.feats?.length ?? 0} feats, ${warnings.length} warnings, ${errors.length} errors.`);
if (errors.length || (strict && warnings.length)) process.exit(1);
