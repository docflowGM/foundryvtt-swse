#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const damageEnginePath = path.join(root, 'scripts/engine/combat/damage-engine.js');
const adapterPath = path.join(root, 'scripts/engine/combat/damage-timing-rider-adapter.js');
const actorEnginePath = path.join(root, 'scripts/governance/actor-engine/actor-engine.js');
const dataPath = path.join(root, 'data/feat-implementation/phase10g-damage-timing-rider-wiring.json');
const errors = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function assertIncludes(file, text, message) {
  const content = read(file);
  if (!content.includes(text)) errors.push(message ?? `${path.relative(root, file)} missing ${text}`);
}

for (const file of [damageEnginePath, adapterPath, actorEnginePath, dataPath]) {
  if (!fs.existsSync(file)) errors.push(`Missing required file: ${path.relative(root, file)}`);
}

if (!errors.length) {
  const data = JSON.parse(read(dataPath));
  if (data.phase !== 'phase-10g-damage-timing-rider-wiring') errors.push(`Unexpected phase ${data.phase}`);
  if (data.implementedAdapter !== 'damage-timing-rider-adapter') errors.push('Phase 10G must wire damage-timing-rider-adapter.');
  if (data.wiringPoint !== 'scripts/engine/combat/damage-engine.js') errors.push('Phase 10G wiring point must be DamageEngine.');

  assertIncludes(damageEnginePath, 'DamageTimingRiderAdapter', 'DamageEngine must import/use DamageTimingRiderAdapter.');
  assertIncludes(damageEnginePath, 'DamageTimingRiderAdapter.applyToDamagePacket', 'DamageEngine must apply riders before ActorEngine.applyDamage.');
  assertIncludes(damageEnginePath, 'ActorEngine.applyDamage(actor, riderPlan.damagePacket)', 'DamageEngine must pass the rider-mutated packet to ActorEngine.applyDamage.');
  assertIncludes(damageEnginePath, 'sourceActor', 'DamageEngine must preserve sourceActor/attacker context.');
  assertIncludes(damageEnginePath, 'targetActor', 'DamageEngine must preserve targetActor context.');
  assertIncludes(damageEnginePath, 'damageTimingRiders', 'DamageEngine result must expose damage timing rider audit data.');

  assertIncludes(adapterPath, 'export class DamageTimingRiderAdapter', 'DamageTimingRiderAdapter must still exist.');
  assertIncludes(adapterPath, 'applyToDamagePacket', 'DamageTimingRiderAdapter must expose applyToDamagePacket.');
  assertIncludes(actorEnginePath, 'DamageResolutionEngine.resolveDamage', 'ActorEngine.applyDamage must remain the DamageResolutionEngine boundary.');

  const engine = read(damageEnginePath);
  if (/SchemaAdapters\.setHPUpdate|system\.hp\.value|updateActor\s*\(/.test(engine)) {
    errors.push('DamageEngine wiring must not directly mutate HP or actor system fields.');
  }
  if (engine.includes('DamageResolutionEngine.resolveDamage')) {
    errors.push('DamageEngine must not call DamageResolutionEngine directly; ActorEngine.applyDamage remains the authority boundary.');
  }
  if (!engine.includes('ActorEngine.applyDamage')) {
    errors.push('DamageEngine must still route final damage through ActorEngine.applyDamage.');
  }

  warnings.push('Damage callsites still need a follow-up context audit to ensure attacker/sourceActor and targetHasActedThisEncounter are supplied everywhere possible.');
}

const generatedDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(generatedDir, { recursive: true });
const report = {
  phase: 'phase-10g-damage-timing-rider-wiring',
  errors,
  warnings,
  ok: errors.length === 0,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(generatedDir, 'phase10g-damage-timing-wiring-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(generatedDir, 'phase10g-damage-timing-wiring-report.md'), [
  '# Phase 10G Damage Timing Wiring Report',
  '',
  `OK: ${errors.length === 0}`,
  `Errors: ${errors.length}`,
  `Warnings: ${warnings.length}`,
  '',
  '## Errors',
  '',
  ...(errors.length ? errors.map(error => `- ${error}`) : ['- None']),
  '',
  '## Warnings',
  '',
  ...(warnings.length ? warnings.map(warning => `- ${warning}`) : ['- None'])
].join('\n') + '\n');

console.log(`Phase 10G damage timing wiring audit: ${errors.length} errors, ${warnings.length} warnings.`);
if (warnings.length) console.warn(warnings.map(warning => `WARN: ${warning}`).join('\n'));
if (errors.length) console.error(errors.map(error => `ERROR: ${error}`).join('\n'));
if (strict && errors.length) process.exit(1);
