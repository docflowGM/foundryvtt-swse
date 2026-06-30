#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const root = process.cwd();
const backlogPath = path.join(root, 'data/feat-implementation/kotor-feat-implementation-backlog.json');
const reviewPath = path.join(root, 'data/feat-implementation/kotor-feat-implementation-review-list.json');

const expectedNames = [
  'Accelerated Strike','Conditioning','Critical Strike','Flurry','Force Readiness','Gearhead','Implant Training',
  'Improved Rapid Strike','Increased Agility','Logic Upgrade: Self-Defense','Logic Upgrade: Tactician','Mandalorian Training',
  'Poison Resistance','Power Blast','Quick Skill','Republic Military Training','Sith Military Training','Sniper Shot',
  'Tumble Defense','Withdrawal Strike'
];
const validStatuses = new Set(['implemented_correct','implemented_partial','implemented_incorrect','not_implemented','metadata_correct','source_review_required']);
const validModes = new Set([
  'encounter_action_option','skill_reroll_and_reaction_defense','attack_option','force_point_timing_rule','skill_time_reduction_action',
  'implant_penalty_suppression','movement_capability','temporary_defense_choice_action','aid_another_attack_support','attack_option_rider',
  'poison_defense_and_damage_reduction','attack_option_slider','take10_take20_skill_rule','incoming_damage_reaction',
  'defense_debuff_reaction','opponent_skill_dc_modifier','threatened_square_withdrawal_rule'
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function fail(errors, msg) { errors.push(msg); }

const errors = [];
const warnings = [];
if (!fs.existsSync(backlogPath)) fail(errors, `Missing ${backlogPath}`);
if (!fs.existsSync(reviewPath)) fail(errors, `Missing ${reviewPath}`);

if (!errors.length) {
  const backlog = readJson(backlogPath);
  const review = readJson(reviewPath);
  const feats = Array.isArray(backlog.feats) ? backlog.feats : [];
  const byName = new Map(feats.map(f => [f.name, f]));
  for (const name of expectedNames) {
    if (!byName.has(name)) fail(errors, `Missing KOTOR feat in backlog: ${name}`);
  }
  if (feats.length !== expectedNames.length) fail(errors, `Expected ${expectedNames.length} feats, found ${feats.length}`);

  for (const feat of feats) {
    if (!feat.name) fail(errors, 'Feat entry missing name');
    if (!feat.description) fail(errors, `${feat.name} missing description`);
    if (!feat.proposedBucket) fail(errors, `${feat.name} missing proposedBucket`);
    if (!feat.proposedSubbucket) fail(errors, `${feat.name} missing proposedSubbucket`);
    if (!validStatuses.has(feat.implementationStatus)) fail(errors, `${feat.name} has invalid implementationStatus ${feat.implementationStatus}`);
    if (!validModes.has(feat.implementationMode)) fail(errors, `${feat.name} has invalid implementationMode ${feat.implementationMode}`);
    if (!feat.expectedRuleShape) fail(errors, `${feat.name} missing expectedRuleShape`);
    if (!feat.observedImplementation) fail(errors, `${feat.name} missing observedImplementation`);
    if (!feat.accuracyFinding) fail(errors, `${feat.name} missing accuracyFinding`);
    if (feat.implementationStatus === 'implemented_correct' && /metadata-only|no proven|not proven/i.test(feat.observedImplementation)) {
      fail(errors, `${feat.name} marked implemented_correct but observedImplementation is not proven runtime behavior`);
    }
  }

  const reviewEntries = Array.isArray(review.entries) ? review.entries : [];
  const reviewNames = new Set(reviewEntries.map(e => e.name));
  for (const feat of feats) {
    if (feat.implementationStatus !== 'implemented_correct' && !reviewNames.has(feat.name)) {
      fail(errors, `${feat.name} is not implemented_correct but missing from review list`);
    }
  }
  for (const e of reviewEntries) {
    if (!e.name || !e.description || !e.proposedBucket || !e.proposedSubbucket || !e.proposedImplementationMode) {
      fail(errors, `Review entry is incomplete: ${JSON.stringify(e)}`);
    }
  }

  const counts = feats.reduce((acc, f) => { acc[f.implementationStatus] = (acc[f.implementationStatus] || 0) + 1; return acc; }, {});
  if ((counts.implemented_correct || 0) < 1) warnings.push('No KOTOR feats are marked implemented_correct; check if the combat option resolver data was missed.');

  const generatedDir = path.join(root, 'docs/audits/generated');
  fs.mkdirSync(generatedDir, { recursive: true });
  const report = {
    phase: 'phase-9g-kotor-implementation-accuracy',
    totalFeatsAudited: feats.length,
    reviewListCount: reviewEntries.length,
    counts,
    warnings,
    errors,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(generatedDir, 'kotor-feat-implementation-readiness-report.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = [
    '# KOTOR Feat Implementation Readiness Report',
    '',
    `Total feats audited: ${feats.length}`,
    `Review list entries: ${reviewEntries.length}`,
    '',
    '## Status counts',
    '',
    ...Object.entries(counts).sort().map(([k,v]) => `- ${k}: ${v}`),
    '',
    '## Warnings',
    '',
    ...(warnings.length ? warnings.map(w => `- ${w}`) : ['- None']),
    '',
    '## Errors',
    '',
    ...(errors.length ? errors.map(e => `- ${e}`) : ['- None'])
  ];
  fs.writeFileSync(path.join(generatedDir, 'kotor-feat-implementation-readiness-report.md'), lines.join('\n') + '\n');
}

if (errors.length) {
  console.error(`KOTOR feat implementation audit failed: ${errors.length} error(s).`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
if (warnings.length) {
  for (const warning of warnings) console.warn(`WARNING: ${warning}`);
}
console.log('KOTOR feat implementation audit passed.');
if (strict && warnings.length) process.exit(0);
