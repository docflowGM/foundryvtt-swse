#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const adapterPath = path.join(root, 'scripts/engine/combat/reactions/reaction-rule-adapter.js');
const enginePath = path.join(root, 'scripts/engine/combat/reactions/reaction-engine.js');
const registryPath = path.join(root, 'scripts/engine/combat/reactions/reaction-registry.js');
const dataPath = path.join(root, 'data/feat-implementation/phase10d-reaction-adapter-implementation.json');
const errors = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function assertIncludes(file, text, message) {
  const content = read(file);
  if (!content.includes(text)) errors.push(message ?? `${path.relative(root, file)} missing ${text}`);
}

for (const file of [adapterPath, enginePath, registryPath, dataPath]) {
  if (!fs.existsSync(file)) errors.push(`Missing required file: ${path.relative(root, file)}`);
}

if (!errors.length) {
  const data = JSON.parse(read(dataPath));
  if (data.phase !== 'phase-10d-reaction-adapter-implementation') errors.push(`Unexpected phase ${data.phase}`);
  if (data.implementedAdapter !== 'reaction-registry-feat-adapter') errors.push('Phase 10D must implement reaction-registry-feat-adapter.');
  if (!Array.isArray(data.runtimeHomes) || !data.runtimeHomes.includes('scripts/engine/combat/reactions/reaction-rule-adapter.js')) {
    errors.push('Phase 10D data must list reaction-rule-adapter.js as a runtime home.');
  }

  assertIncludes(adapterPath, 'export class ReactionRuleAdapter', 'Adapter must export ReactionRuleAdapter.');
  assertIncludes(adapterPath, 'abilityMeta', 'Adapter must read owned item abilityMeta.');
  assertIncludes(adapterPath, 'reactionRules', 'Adapter must consume reactionRules metadata.');
  assertIncludes(adapterPath, 'ReactionRegistry.registerReaction', 'Adapter must register through ReactionRegistry.');
  assertIncludes(adapterPath, 'metadataBacked: true', 'Adapter definitions must be marked metadataBacked.');
  assertIncludes(adapterPath, 'manualResolution', 'Adapter must preserve manualResolution semantics.');

  const adapter = read(adapterPath);
  if (/updateActor\s*\(|applyDamage\s*\(|createEmbeddedDocuments\s*\(/.test(adapter)) {
    errors.push('ReactionRuleAdapter must not directly mutate actors.');
  }
  if (adapter.includes('ChatMessage.create')) {
    errors.push('ReactionRuleAdapter must not call ChatMessage.create directly.');
  }

  assertIncludes(enginePath, 'ReactionRuleAdapter.ensureActorReactionRulesRegistered(defender)', 'ReactionEngine must register metadata-backed rules before lookup.');
  assertIncludes(enginePath, 'ReactionRuleAdapter.collectActorReactionKeys(defender)', 'ReactionEngine must include adapter reaction keys.');
  assertIncludes(enginePath, 'ReactionRegistry.getReaction(reactionKey)', 'ReactionEngine must still use ReactionRegistry.');
  assertIncludes(registryPath, 'static registerReaction', 'ReactionRegistry must remain the registration boundary.');

  if (!read(enginePath).includes('ReactionRuleAdapter') || read(enginePath).includes('ParallelReactionEngine')) {
    errors.push('ReactionEngine integration is missing or implies a parallel reaction engine.');
  }
}

const generatedDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(generatedDir, { recursive: true });
const report = {
  phase: 'phase-10d-reaction-adapter-implementation',
  errors,
  warnings,
  ok: errors.length === 0,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(generatedDir, 'phase10d-reaction-adapter-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(generatedDir, 'phase10d-reaction-adapter-report.md'), [
  '# Phase 10D Reaction Adapter Report',
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

console.log(`Phase 10D reaction adapter audit: ${errors.length} errors, ${warnings.length} warnings.`);
if (warnings.length) console.warn(warnings.map(warning => `WARN: ${warning}`).join('\n'));
if (errors.length) console.error(errors.map(error => `ERROR: ${error}`).join('\n'));
if (strict && errors.length) process.exit(1);
