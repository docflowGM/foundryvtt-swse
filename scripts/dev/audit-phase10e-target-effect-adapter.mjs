#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const adapterPath = path.join(root, 'scripts/engine/combat/combat-target-effect-adapter.js');
const attacksPath = path.join(root, 'scripts/combat/rolls/attacks.js');
const resolverPath = path.join(root, 'scripts/engine/combat/combat-option-resolver.js');
const dataPath = path.join(root, 'data/feat-implementation/phase10e-target-effect-adapter-implementation.json');
const errors = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function assertIncludes(file, text, message) {
  const content = read(file);
  if (!content.includes(text)) errors.push(message ?? `${path.relative(root, file)} missing ${text}`);
}

for (const file of [adapterPath, attacksPath, resolverPath, dataPath]) {
  if (!fs.existsSync(file)) errors.push(`Missing required file: ${path.relative(root, file)}`);
}

if (!errors.length) {
  const data = JSON.parse(read(dataPath));
  if (data.phase !== 'phase-10e-target-effect-adapter-implementation') errors.push(`Unexpected phase ${data.phase}`);
  if (data.implementedAdapter !== 'combat-target-effect-adapter') errors.push('Phase 10E must implement combat-target-effect-adapter.');
  if (!Array.isArray(data.runtimeHomes) || !data.runtimeHomes.includes('scripts/engine/combat/combat-target-effect-adapter.js')) {
    errors.push('Phase 10E data must list combat-target-effect-adapter.js as a runtime home.');
  }

  assertIncludes(adapterPath, 'export class CombatTargetEffectAdapter', 'Adapter must export CombatTargetEffectAdapter.');
  assertIncludes(adapterPath, 'targetEffectsOnHit', 'Adapter must consume targetEffectsOnHit.');
  assertIncludes(adapterPath, 'targetEffectsOnCritical', 'Adapter must consume targetEffectsOnCritical.');
  assertIncludes(adapterPath, 'ActorEngine.setConditionStep', 'Supported target mutations must route through ActorEngine.setConditionStep.');
  assertIncludes(adapterPath, 'ActorEngine.setConditionPersistent', 'Persistent condition effects must route through ActorEngine.setConditionPersistent.');
  assertIncludes(adapterPath, 'manualNotes', 'Unsupported effects must produce manual notes.');
  assertIncludes(adapterPath, 'ConditionTrackRules.getConditionStepCap', 'Condition-track effects must respect ConditionTrackRules cap.');

  const adapter = read(adapterPath);
  if (/\.update\s*\(|updateActor\s*\(|applyDamage\s*\(|createEmbeddedDocuments\s*\(/.test(adapter)) {
    errors.push('CombatTargetEffectAdapter must not directly update actors or damage; use ActorEngine authority methods only.');
  }
  if (adapter.includes('ChatMessage.create')) {
    errors.push('CombatTargetEffectAdapter must not call ChatMessage.create directly.');
  }

  assertIncludes(attacksPath, 'targetEffectsOnHit: optionModifiers.targetEffectsOnHit || []', 'Attack rolls must continue carrying targetEffectsOnHit from CombatOptionResolver.');
  assertIncludes(attacksPath, 'targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || []', 'Attack rolls must continue carrying targetEffectsOnCritical from CombatOptionResolver.');
  assertIncludes(resolverPath, 'targetEffectsOnHit', 'CombatOptionResolver must continue collecting targetEffectsOnHit.');
  assertIncludes(resolverPath, 'targetEffectsOnCritical', 'CombatOptionResolver must continue collecting targetEffectsOnCritical.');

  if (!attacksPath.includes('CombatTargetEffectAdapter')) {
    warnings.push('Attack chat/UI is not yet auto-applying CombatTargetEffectAdapter; this phase provides the safe consumer module and plan/apply API.');
  }
}

const generatedDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(generatedDir, { recursive: true });
const report = {
  phase: 'phase-10e-target-effect-adapter-implementation',
  errors,
  warnings,
  ok: errors.length === 0,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(generatedDir, 'phase10e-target-effect-adapter-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(generatedDir, 'phase10e-target-effect-adapter-report.md'), [
  '# Phase 10E Target Effect Adapter Report',
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

console.log(`Phase 10E target effect adapter audit: ${errors.length} errors, ${warnings.length} warnings.`);
if (warnings.length) console.warn(warnings.map(warning => `WARN: ${warning}`).join('\n'));
if (errors.length) console.error(errors.map(error => `ERROR: ${error}`).join('\n'));
if (strict && errors.length) process.exit(1);
