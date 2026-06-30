#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');

const requiredFiles = [
  'scripts/engine/implants/ImplantRules.js',
  'templates/actors/character/v2/partials/gear/implants-panel.hbs',
  'data/cybernetics/cybernetic-surgery-policy.json',
  'data/cybernetics/implant-tagging-policy.json',
  'data/implants/implant-reference-catalog.json',
  'data/implants/sample-implant-items.json'
];

const report = {
  audit: 'implant-content-readiness',
  phase: '4D',
  ok: [],
  warnings: [],
  errors: []
};

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  try {
    return JSON.parse(readText(rel));
  } catch (error) {
    report.errors.push(`${rel} is not valid JSON: ${error.message}`);
    return null;
  }
}

function ok(message) {
  report.ok.push(message);
}

function warn(message) {
  report.warnings.push(message);
}

function error(message) {
  report.errors.push(message);
}

for (const file of requiredFiles) {
  if (exists(file)) ok(`Required file exists: ${file}`);
  else error(`Missing required file: ${file}`);
}

const implantRules = exists('scripts/engine/implants/ImplantRules.js') ? readText('scripts/engine/implants/ImplantRules.js') : '';
for (const token of ['isImplantItem', 'isActiveImplantItem', 'getActiveImplantItems', 'hasImplantTraining', 'getWillDefensePenalty', 'getConditionTrackExtraStep']) {
  if (implantRules.includes(token)) ok(`ImplantRules exposes ${token}.`);
  else error(`ImplantRules is missing ${token}.`);
}

const referenceCatalog = readJson('data/implants/implant-reference-catalog.json');
if (referenceCatalog) {
  if (referenceCatalog.classificationPolicy?.requiresExplicitImplantTag === true) ok('Reference catalog requires explicit implant tags.');
  else error('Reference catalog must require explicit implant tags.');

  if (referenceCatalog.classificationPolicy?.neverInferFromNameOnly === true) ok('Reference catalog forbids name-only inference.');
  else error('Reference catalog must forbid name-only inference.');

  if (referenceCatalog.classificationPolicy?.genericCyberneticsAreImplants === false) ok('Reference catalog excludes generic cybernetics by default.');
  else error('Reference catalog must not classify generic cybernetics as implants.');

  const entries = Array.isArray(referenceCatalog.referenceEntries) ? referenceCatalog.referenceEntries : [];
  if (entries.length >= 4) ok(`Reference catalog has ${entries.length} classification entries.`);
  else error('Reference catalog should include implant, cybernetic, biotech, and droid-system references.');

  const implantEntry = entries.find((entry) => entry.category === 'implant');
  if (implantEntry?.countsAsImplant === true && implantEntry?.requiresExplicitTag === true) ok('Implant entry is explicit-tagged and counts as implant.');
  else error('Implant reference entry must count as implant and require an explicit tag.');

  for (const category of ['cybernetic_prosthesis', 'biotech', 'droid_system']) {
    const entry = entries.find((candidate) => candidate.category === category);
    if (entry?.countsAsImplant === false) ok(`${category} reference does not count as implant by default.`);
    else error(`${category} reference must not count as implant by default.`);
  }
}

const taggingPolicy = readJson('data/cybernetics/implant-tagging-policy.json');
if (taggingPolicy) {
  if (taggingPolicy.rulesAuthority === 'scripts/engine/implants/ImplantRules.js') ok('Tagging policy points to ImplantRules as authority.');
  else error('Tagging policy must point to ImplantRules as authority.');

  const classification = taggingPolicy.classification || {};
  if (classification.implant?.countsAsImplant === true && classification.implant?.activeStateRequired === true) ok('Policy implant category requires active state.');
  else error('Policy implant category must count as implant and require active state.');

  for (const category of ['cybernetic_prosthesis', 'cybernetic_enhancement', 'biotech', 'droid_system']) {
    if (classification[category]?.countsAsImplant === false) ok(`Policy excludes ${category} from implant penalties by default.`);
    else error(`Policy must exclude ${category} from implant penalties by default.`);
  }

  if (taggingPolicy.staticSheetPolicy?.cyberneticSurgery === 'exclude') ok('Cybernetic Surgery remains excluded from static sheet automation.');
  else error('Cybernetic Surgery must remain excluded from static sheet automation.');
}

const samples = readJson('data/implants/sample-implant-items.json');
if (samples) {
  const sampleItems = Array.isArray(samples.samples) ? samples.samples : [];
  if (sampleItems.length >= 3) ok(`Sample implant file has ${sampleItems.length} samples.`);
  else error('Sample implant file should include active implant, generic cybernetic, and inactive implant samples.');

  const active = sampleItems.find((item) => item.expectedRulesState?.activeImplant === true);
  if (active?.expectedRulesState?.penaltyAppliesWithoutImplantTraining === true) ok('Active tagged sample expects penalties without Implant Training.');
  else error('Active tagged sample must expect penalties without Implant Training.');

  const cybernetic = sampleItems.find((item) => item.name?.includes('Cybernetic Prosthesis'));
  if (cybernetic?.expectedRulesState?.countsAsImplant === false) ok('Cybernetic prosthesis sample does not count as implant.');
  else error('Cybernetic prosthesis sample must not count as implant.');
}

const cyberneticPolicyText = exists('data/cybernetics/cybernetic-surgery-policy.json') ? readText('data/cybernetics/cybernetic-surgery-policy.json') : '';
if (/manual|metadata/i.test(cyberneticPolicyText) && /consult|source/i.test(cyberneticPolicyText)) ok('Cybernetic Surgery policy remains manual/source-referenced.');
else warn('Cybernetic Surgery policy should clearly say manual/source referenced.');

const outDir = path.join(ROOT, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'implant-content-readiness-report.json'), `${JSON.stringify(report, null, 2)}\n`);

const md = [
  '# Implant Content Readiness Audit',
  '',
  `Phase: ${report.phase}`,
  '',
  `OK: ${report.ok.length}`,
  `Warnings: ${report.warnings.length}`,
  `Errors: ${report.errors.length}`,
  '',
  '## OK',
  ...report.ok.map((line) => `- ${line}`),
  '',
  '## Warnings',
  ...(report.warnings.length ? report.warnings.map((line) => `- ${line}`) : ['- None']),
  '',
  '## Errors',
  ...(report.errors.length ? report.errors.map((line) => `- ${line}`) : ['- None']),
  ''
].join('\n');
fs.writeFileSync(path.join(outDir, 'implant-content-readiness-report.md'), md);

for (const line of report.ok) console.log(`OK: ${line}`);
for (const line of report.warnings) console.warn(`WARN: ${line}`);
for (const line of report.errors) console.error(`ERROR: ${line}`);

if (report.errors.length || (STRICT && report.warnings.length)) process.exit(1);
