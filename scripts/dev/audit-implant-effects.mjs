#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const strict = process.argv.includes('--strict');
const expected = [
  'implant-bio-stabilizer',
  'implant-cardio',
  'implant-combat',
  'implant-memory',
  'implant-nerve-reinforcement',
  'implant-regenerative',
  'implant-sensory',
  'implant-subelectronic-converter'
];
const checks = [];
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function ok(id, passed, detail = '') { checks.push({ id, status: passed ? 'ok' : 'error', detail }); }
function json(rel) { return JSON.parse(read(rel)); }

ok('effect-rules-module', exists('scripts/engine/implants/ImplantEffectRules.js'));
ok('effect-data-catalog', exists('data/implants/implant-effects.json'));
const effectData = json('data/implants/implant-effects.json');
const effectIds = new Set((effectData.effects || []).map(e => e.implantEffectId));
for (const id of expected) ok(`effect-data:${id}`, effectIds.has(id));

const sourceFiles = [
  'scripts/engine/implants/ImplantRules.js',
  'scripts/engine/poison/poison-engine.js',
  'scripts/actors/derived/hp-calculator.js',
  'scripts/engine/combat/combat-roll-math.js',
  'scripts/engine/combat/threshold-engine.js',
  'scripts/holonet/subsystems/gm-healing-trigger.js',
  'scripts/rolls/skills.js',
  'scripts/sheets/v2/context/PanelContextBuilder.js'
];
for (const rel of sourceFiles) {
  const text = read(rel);
  ok(`hook:${rel}`, text.includes('ImplantEffectRules') || text.includes('effectChips'), 'Expected ImplantEffectRules import/reference or implant effect UI projection.');
}

const ref = json('data/implants/implant-reference-catalog.json');
for (const id of expected) {
  const entry = (ref.implants || []).find(i => i.id === id);
  ok(`reference:${id}`, !!entry?.implantEffects?.implantEffectId, 'Missing implantEffects metadata.');
}
const bio = (ref.implants || []).find(i => i.id === 'implant-bio-stabilizer');
ok('bio-stabilizer-poison-immunity', bio?.implantEffects?.poisonImmunity === true && !('maxHpBonus' in (bio?.implantEffects || {})));
const sub = (ref.implants || []).find(i => i.id === 'implant-subelectronic-converter');
ok('subelectronic-policy', sub?.implantEffects?.metadataOnlyExceptWillPenalty === true && sub?.implantEffects?.willDefensePenalty === -2);

for (const rel of ['packs/equipment.db', 'packs/equipment-tech.db']) {
  const ids = new Map();
  for (const line of read(rel).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const doc = JSON.parse(line);
    if (expected.includes(doc._id)) ids.set(doc._id, doc);
  }
  for (const id of expected) ok(`${rel}:${id}`, ids.get(id)?.system?.implantEffectId === id);
  const bioDoc = ids.get('implant-bio-stabilizer');
  ok(`${rel}:bio-stabilizer-poison-immunity`, bioDoc?.system?.implantEffects?.poisonImmunity === true && bioDoc?.system?.capabilities?.poisonImmunity === true);
}

const samples = json('data/implants/sample-implant-items.json');
for (const id of expected) {
  const item = (samples.items || []).find(i => i._id === id);
  ok(`sample:${id}`, item?.system?.implantEffectId === id);
}
const sampleBio = (samples.items || []).find(i => i._id === 'implant-bio-stabilizer');
ok('sample:bio-stabilizer-poison-immunity', sampleBio?.system?.implantEffects?.poisonImmunity === true && sampleBio?.system?.capabilities?.poisonImmunity === true);

const errors = checks.filter(c => c.status === 'error');
const report = {
  generatedAt: new Date().toISOString(),
  phase: 'implants-phase4f-effects',
  ok: checks.length - errors.length,
  errors: errors.length,
  checks
};
fs.mkdirSync(path.join(ROOT, 'docs/audits/generated'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audits/generated/implant-effects-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'docs/audits/generated/implant-effects-report.md'), `# Implant Effects Report\n\n${report.ok} ok, ${report.errors} errors.\n`);
console.log(`Implant effects audit: ${report.ok} ok, ${report.errors} errors`);
if (strict && errors.length) process.exit(1);
