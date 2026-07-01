#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const contractsPath = path.join(root, 'data/feat-implementation/phase10c-adapter-contracts.json');
const requiredAdapters = new Set([
  'reaction-registry-feat-adapter',
  'combat-target-effect-adapter',
  'damage-timing-rider-adapter',
  'skill-use-rule-adapter',
  'aid-another-support-adapter',
  'force-power-context-adapter',
  'area-autofire-context-adapter'
]);
const allowedPriorities = new Set(['P0', 'P1', 'P2', 'P3']);
const allowedStatuses = new Set(['contract_ready', 'implemented_partial', 'implemented_correct', 'blocked']);
const allowedClassifications = new Set([
  'exists_wholecloth',
  'exists_partial_needs_adapters',
  'exists_partial_needs_refactor',
  'missing_runtime'
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const errors = [];
const warnings = [];

if (!fs.existsSync(contractsPath)) {
  errors.push(`Missing Phase 10C contracts file: ${contractsPath}`);
}

let contracts = null;
if (!errors.length) {
  contracts = readJson(contractsPath);
  if (contracts.phase !== 'phase-10c-adapter-contracts') errors.push(`Unexpected phase: ${contracts.phase}`);
  if (!Array.isArray(contracts.adapters)) errors.push('contracts.adapters must be an array.');
  if (!Array.isArray(contracts.globalRules) || contracts.globalRules.length === 0) errors.push('globalRules must be present.');
}

if (contracts?.adapters) {
  const byId = new Map();
  const priorityCounts = {};
  const statusCounts = {};

  for (const adapter of contracts.adapters) {
    if (!adapter.id) errors.push('Adapter missing id.');
    if (adapter.id && byId.has(adapter.id)) errors.push(`Duplicate adapter id: ${adapter.id}`);
    if (adapter.id) byId.set(adapter.id, adapter);

    if (!allowedPriorities.has(adapter.priority)) errors.push(`${adapter.id} has invalid priority: ${adapter.priority}`);
    if (!allowedStatuses.has(adapter.status)) errors.push(`${adapter.id} has invalid status: ${adapter.status}`);
    if (!allowedClassifications.has(adapter.classificationFrom10B)) errors.push(`${adapter.id} has invalid classificationFrom10B: ${adapter.classificationFrom10B}`);

    priorityCounts[adapter.priority] = (priorityCounts[adapter.priority] || 0) + 1;
    statusCounts[adapter.status] = (statusCounts[adapter.status] || 0) + 1;

    for (const field of ['existingRuntimeHomes', 'mustReuse', 'mustNotCreate', 'inputMetadataFamilies', 'requiredEventContext', 'outputContract', 'unlocksPhase9Feats', 'firstImplementationSlice', 'doneWhen']) {
      if (!Array.isArray(adapter[field]) || adapter[field].length === 0) {
        errors.push(`${adapter.id} missing non-empty ${field}.`);
      }
    }

    if (adapter.mustNotCreate.some(value => /parallel/i.test(String(value))) && !adapter.mustReuse.length) {
      errors.push(`${adapter.id} blocks parallel systems but does not name a reused runtime.`);
    }

    if (adapter.id.includes('reaction') && !adapter.mustReuse.includes('ReactionEngine')) {
      errors.push(`${adapter.id} must reuse ReactionEngine.`);
    }
    if (adapter.id.includes('reaction') && !adapter.mustReuse.includes('ReactionRegistry')) {
      errors.push(`${adapter.id} must reuse ReactionRegistry.`);
    }
    if (adapter.id.includes('damage') && !adapter.mustReuse.includes('DamageResolutionEngine')) {
      errors.push(`${adapter.id} must reuse DamageResolutionEngine.`);
    }
    if (adapter.id.includes('target-effect') && !adapter.mustReuse.includes('CombatOptionResolver')) {
      errors.push(`${adapter.id} must reuse CombatOptionResolver.`);
    }
    if (adapter.id.includes('skill-use') && !adapter.mustReuse.includes('SkillFeatResolver')) {
      errors.push(`${adapter.id} must reuse SkillFeatResolver.`);
    }
    if (adapter.id.includes('force-power') && !adapter.mustReuse.includes('ForceEngine')) {
      errors.push(`${adapter.id} must reuse ForceEngine.`);
    }
  }

  for (const id of requiredAdapters) {
    if (!byId.has(id)) errors.push(`Missing required adapter contract: ${id}`);
  }

  if ((priorityCounts.P0 || 0) < 3) warnings.push('Expected at least three P0 adapters: reaction, target effect, damage timing.');
  if ((statusCounts.contract_ready || 0) !== contracts.adapters.length) warnings.push('Some adapters are no longer contract_ready; ensure implementation status is intentional.');

  const summary = contracts.summary ?? {};
  if (summary.totalAdapters !== contracts.adapters.length) errors.push(`summary.totalAdapters=${summary.totalAdapters} does not match adapters length ${contracts.adapters.length}.`);

  const generatedDir = path.join(root, 'docs/audits/generated');
  fs.mkdirSync(generatedDir, { recursive: true });
  const report = {
    phase: contracts.phase,
    adapterCount: contracts.adapters.length,
    priorityCounts,
    statusCounts,
    warnings,
    errors,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(generatedDir, 'phase10c-adapter-contracts-report.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(generatedDir, 'phase10c-adapter-contracts-report.md'), [
    '# Phase 10C Adapter Contracts Report',
    '',
    `Adapters audited: ${contracts.adapters.length}`,
    '',
    '## Priority counts',
    '',
    ...Object.entries(priorityCounts).sort().map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Status counts',
    '',
    ...Object.entries(statusCounts).sort().map(([key, value]) => `- ${key}: ${value}`),
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

console.log(`Phase 10C adapter contract audit: ${contracts?.adapters?.length ?? 0} adapters.`);
if (warnings.length) console.warn(warnings.map(warning => `WARN: ${warning}`).join('\n'));
if (errors.length) console.error(errors.map(error => `ERROR: ${error}`).join('\n'));
if (strict && errors.length) process.exit(1);
