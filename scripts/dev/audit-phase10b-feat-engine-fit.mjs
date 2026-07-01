#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const matrixPath = path.join(root, 'data/feat-implementation/phase10b-engine-fit-matrix.json');
const allowedClassifications = new Set([
  'exists_wholecloth',
  'exists_partial_needs_adapters',
  'exists_partial_needs_refactor',
  'missing_runtime'
]);
const requiredFamilies = new Set([
  'attack_option_math',
  'reaction_framework',
  'implant_penalty_suppression',
  'force_power_activation_context',
  'damage_resolution_and_threshold_riders',
  'skill_use_timing_take10_take20',
  'poison_disease_hazards',
  'movement_threatened_square_control',
  'rage_state'
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const errors = [];
const warnings = [];

if (!fs.existsSync(matrixPath)) {
  errors.push(`Missing Phase 10B matrix: ${matrixPath}`);
}

let matrix = null;
if (!errors.length) {
  matrix = readJson(matrixPath);
  if (matrix.phase !== 'phase-10b-engine-fit-matrix') errors.push(`Unexpected phase: ${matrix.phase}`);
  if (!Array.isArray(matrix.families)) errors.push('matrix.families must be an array.');
}

if (matrix?.families) {
  const byId = new Map();
  const counts = {};

  for (const family of matrix.families) {
    if (!family.id) errors.push('Family missing id.');
    if (family.id && byId.has(family.id)) errors.push(`Duplicate family id: ${family.id}`);
    if (family.id) byId.set(family.id, family);

    if (!allowedClassifications.has(family.classification)) {
      errors.push(`${family.id ?? 'unknown'} has invalid classification: ${family.classification}`);
    }
    counts[family.classification] = (counts[family.classification] || 0) + 1;

    if (!Array.isArray(family.phase9Examples) || family.phase9Examples.length === 0) {
      errors.push(`${family.id} missing phase9Examples.`);
    }
    if (!family.evidence) errors.push(`${family.id} missing evidence.`);
    if (!family.nextStep) errors.push(`${family.id} missing nextStep.`);
    if (family.classification !== 'missing_runtime' && (!Array.isArray(family.runtimeHomes) || family.runtimeHomes.length === 0)) {
      errors.push(`${family.id} is ${family.classification} but has no runtimeHomes.`);
    }
  }

  for (const id of requiredFamilies) {
    if (!byId.has(id)) errors.push(`Missing required family: ${id}`);
  }

  if (byId.get('reaction_framework')?.classification === 'missing_runtime') {
    errors.push('Reaction framework must not be classified as missing_runtime; ReactionEngine/ReactionRegistry exist.');
  }
  if (byId.get('implant_penalty_suppression')?.classification !== 'exists_wholecloth') {
    errors.push('Implant Training runtime should remain exists_wholecloth after Phase 10A.');
  }
  if (byId.get('force_power_activation_context')?.classification !== 'exists_partial_needs_refactor') {
    warnings.push('Force power activation context should usually be treated as partial/refactor until named-power context exists.');
  }
  if (byId.get('poison_disease_hazards')?.classification === 'exists_wholecloth') {
    errors.push('Poison/disease hazards must not be marked wholecloth without a proven poison/disease authority.');
  }

  for (const classification of allowedClassifications) {
    if (!counts[classification]) warnings.push(`No families classified as ${classification}.`);
  }

  const generatedDir = path.join(root, 'docs/audits/generated');
  fs.mkdirSync(generatedDir, { recursive: true });
  const report = {
    phase: matrix.phase,
    familyCount: matrix.families.length,
    counts,
    warnings,
    errors,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(generatedDir, 'phase10b-engine-fit-report.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(generatedDir, 'phase10b-engine-fit-report.md'), [
    '# Phase 10B Engine Fit Report',
    '',
    `Families audited: ${matrix.families.length}`,
    '',
    '## Classification counts',
    '',
    ...Object.entries(counts).sort().map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Warnings',
    '',
    ...(warnings.length ? warnings.map(warning => `- ${warning}`) : ['- None']),
    '',
    '## Errors',
    '',
    ...(errors.length ? errors.map(error => `- ${error}`) : ['- None'])
  ].join('\n') + '\n');
}

console.log(`Phase 10B engine fit audit: ${matrix?.families?.length ?? 0} families.`);
if (warnings.length) console.warn(warnings.map(warning => `WARN: ${warning}`).join('\n'));
if (errors.length) console.error(errors.map(error => `ERROR: ${error}`).join('\n'));
if (strict && errors.length) process.exit(1);
