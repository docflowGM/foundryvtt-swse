#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const adapterPath = path.join(root, 'scripts/engine/combat/damage-timing-rider-adapter.js');
const actorEnginePath = path.join(root, 'scripts/governance/actor-engine/actor-engine.js');
const damageEnginePath = path.join(root, 'scripts/engine/combat/damage-resolution-engine.js');
const dataPath = path.join(root, 'data/feat-implementation/phase10f-damage-timing-rider-adapter-implementation.json');
const errors = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function assertIncludes(file, text, message) {
  const content = read(file);
  if (!content.includes(text)) errors.push(message ?? `${path.relative(root, file)} missing ${text}`);
}

for (const file of [adapterPath, actorEnginePath, damageEnginePath, dataPath]) {
  if (!fs.existsSync(file)) errors.push(`Missing required file: ${path.relative(root, file)}`);
}

if (!errors.length) {
  const data = JSON.parse(read(dataPath));
  if (data.phase !== 'phase-10f-damage-timing-rider-adapter-implementation') errors.push(`Unexpected phase ${data.phase}`);
  if (data.implementedAdapter !== 'damage-timing-rider-adapter') errors.push('Phase 10F must implement damage-timing-rider-adapter.');
  if (!Array.isArray(data.runtimeHomes) || !data.runtimeHomes.includes('scripts/engine/combat/damage-timing-rider-adapter.js')) {
    errors.push('Phase 10F data must list damage-timing-rider-adapter.js as a runtime home.');
  }

  assertIncludes(adapterPath, 'export class DamageTimingRiderAdapter', 'Adapter must export DamageTimingRiderAdapter.');
  assertIncludes(adapterPath, 'applyToDamagePacket', 'Adapter must expose applyToDamagePacket.');
  assertIncludes(adapterPath, 'ActorEngine.applyDamage', 'Adapter applyDamage helper must route final damage through ActorEngine.applyDamage.');
  assertIncludes(adapterPath, 'Advantageous Attack', 'Adapter must include Advantageous Attack compatibility handling.');
  assertIncludes(adapterPath, 'requiresTargetNotActed', 'Adapter must support target-not-acted predicates.');
  assertIncludes(adapterPath, 'damageTimingRiders', 'Adapter must record rider audit data on the packet options.');
  assertIncludes(adapterPath, 'targetHasActedThisEncounter', 'Adapter must expose targetHasActedThisEncounter helper.');

  const adapter = read(adapterPath);
  if (/SchemaAdapters\.setHPUpdate|system\.hp|updateActor\s*\(/.test(adapter)) {
    errors.push('DamageTimingRiderAdapter must not directly mutate HP or actor system fields.');
  }
  if (adapter.includes('DamageResolutionEngine.resolveDamage')) {
    errors.push('DamageTimingRiderAdapter must not directly call DamageResolutionEngine; ActorEngine.applyDamage owns final resolution.');
  }
  if (adapter.includes('ChatMessage.create')) {
    errors.push('DamageTimingRiderAdapter must not call ChatMessage.create directly.');
  }

  assertIncludes(actorEnginePath, 'DamageResolutionEngine.resolveDamage', 'ActorEngine.applyDamage must remain the DamageResolutionEngine boundary.');
  assertIncludes(damageEnginePath, 'resolveDamage', 'DamageResolutionEngine must remain present.');

  warnings.push('Damage workflow/UI is not yet wired to call DamageTimingRiderAdapter.applyToDamagePacket before ActorEngine.applyDamage.');
}

const generatedDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(generatedDir, { recursive: true });
const report = {
  phase: 'phase-10f-damage-timing-rider-adapter-implementation',
  errors,
  warnings,
  ok: errors.length === 0,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(generatedDir, 'phase10f-damage-timing-rider-adapter-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(generatedDir, 'phase10f-damage-timing-rider-adapter-report.md'), [
  '# Phase 10F Damage Timing Rider Adapter Report',
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

console.log(`Phase 10F damage timing rider adapter audit: ${errors.length} errors, ${warnings.length} warnings.`);
if (warnings.length) console.warn(warnings.map(warning => `WARN: ${warning}`).join('\n'));
if (errors.length) console.error(errors.map(error => `ERROR: ${error}`).join('\n'));
if (strict && errors.length) process.exit(1);
