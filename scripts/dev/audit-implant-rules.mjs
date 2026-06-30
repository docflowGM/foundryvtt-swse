#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'scripts/engine/implants/ImplantRules.js',
  'scripts/actors/derived/defense-calculator.js',
  'scripts/governance/actor-engine/actor-engine.js',
  'scripts/actors/v2/base-actor.js',
  'data/feat-catalog.json',
  'packs/feats.db'
];

const checks = [];
function ok(id, detail) { checks.push({ id, status: 'ok', detail }); }
function error(id, detail) { checks.push({ id, status: 'error', detail }); }
function warn(id, detail) { checks.push({ id, status: 'warning', detail }); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

for (const file of requiredFiles) {
  exists(file) ? ok(`file:${file}`, 'present') : error(`file:${file}`, 'missing');
}

const implantRules = exists('scripts/engine/implants/ImplantRules.js') ? read('scripts/engine/implants/ImplantRules.js') : '';
if (/getWillDefensePenalty/.test(implantRules)) ok('implant-rules:will-penalty', 'exports Will Defense penalty resolver'); else error('implant-rules:will-penalty', 'missing resolver');
if (/getConditionTrackExtraStep/.test(implantRules)) ok('implant-rules:ct-extra-step', 'exports extra condition step resolver'); else error('implant-rules:ct-extra-step', 'missing resolver');
if (/hasImplantTraining/.test(implantRules)) ok('implant-rules:training-exception', 'detects Implant Training exception'); else error('implant-rules:training-exception', 'missing exception');
if (/countAsImplant/.test(implantRules) && /activeByOwnership/.test(implantRules)) ok('implant-rules:item-flags', 'supports explicit item flags'); else warn('implant-rules:item-flags', 'explicit item flag support not found');

const defense = exists('scripts/actors/derived/defense-calculator.js') ? read('scripts/actors/derived/defense-calculator.js') : '';
if (/ImplantRules/.test(defense) && /implantWillPenalty/.test(defense)) ok('defense:implant-will-penalty', 'Will Defense includes implant penalty term'); else error('defense:implant-will-penalty', 'Will Defense not wired');

const actorEngine = exists('scripts/governance/actor-engine/actor-engine.js') ? read('scripts/governance/actor-engine/actor-engine.js') : '';
if (/ImplantRules/.test(actorEngine) && /implantExtraStep/.test(actorEngine) && /effectiveDirection/.test(actorEngine)) ok('actor-engine:implant-ct-extra-step', 'positive condition shifts include implant extra step'); else error('actor-engine:implant-ct-extra-step', 'condition shift not wired');

const baseActor = exists('scripts/actors/v2/base-actor.js') ? read('scripts/actors/v2/base-actor.js') : '';
if (/system\.derived\.implants/.test(baseActor)) ok('base-actor:derived-implant-state', 'derived implant state is exposed'); else warn('base-actor:derived-implant-state', 'derived implant state not exposed');

const featCatalog = exists('data/feat-catalog.json') ? read('data/feat-catalog.json') : '[]';
if (/"name"\s*:\s*"Implant Training"/.test(featCatalog)) ok('catalog:implant-training', 'Implant Training exists'); else error('catalog:implant-training', 'Implant Training missing');
if (/"name"\s*:\s*"Cybernetic Surgery"/.test(featCatalog)) ok('catalog:cybernetic-surgery', 'Cybernetic Surgery exists'); else error('catalog:cybernetic-surgery', 'Cybernetic Surgery missing');
if (/SUPPRESS_EXTRA_IMPLANT_CT_STEP/.test(featCatalog) && /SUPPRESS_IMPLANT_WILL_PENALTY/.test(featCatalog)) ok('catalog:implant-training-metadata', 'Implant Training metadata includes both suppression rules'); else warn('catalog:implant-training-metadata', 'Implant Training suppression metadata incomplete');

const errors = checks.filter(c => c.status === 'error');
const warnings = checks.filter(c => c.status === 'warning');
const okays = checks.filter(c => c.status === 'ok');

const report = {
  generatedAt: new Date().toISOString(),
  summary: { ok: okays.length, warnings: warnings.length, errors: errors.length },
  checks
};

const outDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'implant-rules-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, 'implant-rules-report.md'), [
  '# Implant Rules Audit',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `Result: ${okays.length} ok, ${warnings.length} warnings, ${errors.length} errors`,
  '',
  ...checks.map(c => `- ${c.status.toUpperCase()}: ${c.id} — ${c.detail}`),
  ''
].join('\n'));

console.log(`Implant rules audit: ${okays.length} ok, ${warnings.length} warnings, ${errors.length} errors`);
if (process.argv.includes('--strict') && errors.length > 0) process.exit(1);
