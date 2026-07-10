#!/usr/bin/env node

/**
 * check-progression-integrity.mjs
 *
 * Report-only static audit for the progression runtime pipeline. This script does
 * not execute Foundry and does not prove runtime behavior. It inspects source
 * shape for producer/consumer drift between progression nodes, step plugins,
 * finalizer selection consumers, entitlement keys, and mutation boundaries.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const NO_WRITE = argv.includes('--no-write');
const STRICT = argv.includes('--strict');

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      walk(p, predicate, out);
    } else if (predicate(p)) {
      out.push(p);
    }
  }
  return out;
}

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function matchAll(text, regex, group = 1) {
  return Array.from(text.matchAll(regex)).map(m => m[group]).filter(Boolean);
}

function parseNodes() {
  const text = read('scripts/engine/progression/registries/progression-node-definitions.js');
  const nodeMatches = Array.from(text.matchAll(/(['"])([^'"]+)\1\s*:\s*\{([\s\S]*?)(?=\n\s*\},\n\s*(?:['"]|\w)|\n\s*\}\);)/g));
  return nodeMatches.map(([, , id, body]) => ({
    id,
    label: (body.match(/label:\s*['"]([^'"]+)['"]/) || [])[1] || id,
    selectionKey: (body.match(/selectionKey:\s*['"]([^'"]+)['"]/) || [])[1] || null,
    optional: /optional:\s*true/.test(body),
    isFinal: /isFinal:\s*true/.test(body),
    modes: matchAll(body, /modes:\s*\[([^\]]*)\]/, 1)[0]?.match(/['"]([^'"]+)['"]/g)?.map(s => s.slice(1, -1)) || [],
    subtypes: matchAll(body, /subtypes:\s*\[([^\]]*)\]/, 1)[0]?.match(/['"]([^'"]+)['"]/g)?.map(s => s.slice(1, -1)) || [],
    dependsOn: matchAll(body, /dependsOn:\s*\[([^\]]*)\]/, 1)[0]?.match(/['"]([^'"]+)['"]/g)?.map(s => s.slice(1, -1)) || [],
  }));
}

function parsePluginMap() {
  const text = read('scripts/apps/progression-framework/registries/node-descriptor-mapper.js');
  const entries = Array.from(text.matchAll(/(['"])([^'"]+)\1\s*:\s*([A-Za-z0-9_]+)/g));
  return Object.fromEntries(entries.map(([, , id, plugin]) => [id, plugin]));
}

function parseStepPlugins() {
  const files = walk(path.join(ROOT, 'scripts/apps/progression-framework/steps'), p => p.endsWith('.js'));
  const plugins = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const classes = Array.from(text.matchAll(/export\s+class\s+([A-Za-z0-9_]+)\s+extends\s+ProgressionStepPlugin/g));
    for (const [, className] of classes) {
      const bodyStart = text.indexOf(`class ${className}`);
      const slice = bodyStart >= 0 ? text.slice(bodyStart) : text;
      plugins.push({
        className,
        path: rel(file),
        hasValidate: /\n\s*validate\s*\(/.test(slice),
        hasBlockingIssues: /\n\s*getBlockingIssues\s*\(/.test(slice),
        hasRemainingPicks: /\n\s*getRemainingPicks\s*\(/.test(slice),
        hasGetSelection: /\n\s*getSelection\s*\(/.test(slice),
        hasCommit: /\n\s*async\s+onItemCommitted\s*\(|\n\s*onItemCommitted\s*\(/.test(slice),
        usesCommitNormalized: /_commitNormalized\s*\(/.test(slice),
        writesDraftSelections: /draftSelections\s*\.[A-Za-z0-9_]+\s*=|draftSelections\s*\[[^\]]+\]\s*=/.test(slice),
        readsDraftSelections: /draftSelections\??\./.test(slice),
        directActorMutation: /\bactor\.(?:update|createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments)\s*\(/.test(slice),
      });
    }
  }
  return plugins;
}

function parseFinalizerConsumers() {
  const text = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  const keys = [
    ...matchAll(text, /draftSelections\?\.([A-Za-z0-9_]+)/g),
    ...matchAll(text, /draftSelections\[(['"])([^'"]+)\1\]/g, 2),
    ...matchAll(text, /selections\.([A-Za-z0-9_]+)/g),
    ...matchAll(text, /selections\[(['"])([^'"]+)\1\]/g, 2),
    ...matchAll(text, /selectionArray\([^,]+,\s*['"]([^'"]+)['"]\)/g),
  ];
  return unique(keys).sort();
}

function parseLevelupChoiceKeys() {
  const text = read('scripts/engine/progression/utils/levelup-entitlement-manifest.js');
  const choiceTargets = matchAll(text, /([a-zA-Z0-9_]+):\s*'([a-zA-Z0-9_]+)'/g, 2);
  const returnKeys = matchAll(text, /\n\s*([a-zA-Z0-9_]+):\s*\{/g, 1);
  return unique([...choiceTargets, ...returnKeys].filter(k => /Choices$|Feat|Talent|Powers|Secrets|Techniques|Regimens|Maneuvers|Increases/i.test(k))).sort();
}

function scanProgressionBoundaries() {
  const files = walk(path.join(ROOT, 'scripts'), p => p.endsWith('.js'))
    .filter(p => rel(p).includes('progression'));
  const directMutations = [];
  const registryBypasses = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const pathRel = rel(file);
    if (/\bactor\.(?:update|createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments)\s*\(/.test(text)) {
      directMutations.push(pathRel);
    }
    if (/from\s+['"][^'"]*engine\/registries\//.test(text) && !pathRel.includes('content/progression-content-authority')) {
      registryBypasses.push(pathRel);
    }
  }
  return { directMutations: unique(directMutations).sort(), registryBypasses: unique(registryBypasses).sort() };
}

function buildReport() {
  const nodes = parseNodes();
  const pluginMap = parsePluginMap();
  const plugins = parseStepPlugins();
  const pluginByName = Object.fromEntries(plugins.map(p => [p.className, p]));
  const finalizerSelectionConsumers = parseFinalizerConsumers();
  const entitlementKeys = parseLevelupChoiceKeys();
  const boundaries = scanProgressionBoundaries();
  const nodeRows = nodes.map(node => {
    const pluginClass = pluginMap[node.id] || null;
    const plugin = pluginClass ? pluginByName[pluginClass] : null;
    return {
      nodeId: node.id,
      label: node.label,
      selectionKey: node.selectionKey,
      optional: node.optional,
      isFinal: node.isFinal,
      pluginClass,
      pluginPath: plugin?.path || null,
      pluginFound: !!plugin,
      hasValidate: plugin?.hasValidate ?? false,
      hasBlockingIssues: plugin?.hasBlockingIssues ?? false,
      hasRemainingPicks: plugin?.hasRemainingPicks ?? false,
      hasGetSelection: plugin?.hasGetSelection ?? false,
      hasCommit: plugin?.hasCommit ?? false,
      usesCommitNormalized: plugin?.usesCommitNormalized ?? false,
      readsDraftSelections: plugin?.readsDraftSelections ?? false,
      writesDraftSelections: plugin?.writesDraftSelections ?? false,
      directActorMutation: plugin?.directActorMutation ?? false,
      finalizerConsumesSelectionKey: node.selectionKey ? finalizerSelectionConsumers.includes(node.selectionKey) : false,
      risk: (() => {
        if (!plugin) return 'HIGH: mapped plugin missing';
        if (!node.isFinal && !plugin.hasValidate) return 'HIGH: step lacks validate override';
        if (!node.isFinal && node.selectionKey && !plugin.usesCommitNormalized && !plugin.writesDraftSelections && !plugin.readsDraftSelections) return 'MEDIUM: no obvious canonical session interaction';
        if (plugin.directActorMutation) return 'HIGH: direct actor mutation in step plugin';
        if (node.selectionKey && !node.optional && !node.isFinal && !finalizerSelectionConsumers.includes(node.selectionKey)) return 'MEDIUM: required node selection key not directly consumed by finalizer';
        return 'LOW';
      })(),
    };
  });

  const selectionKeys = unique(nodes.map(n => n.selectionKey)).sort();
  const selectionKeysWithoutFinalizerConsumer = selectionKeys.filter(k => !finalizerSelectionConsumers.includes(k));
  const finalizerConsumersWithoutNode = finalizerSelectionConsumers.filter(k => !selectionKeys.includes(k));

  return {
    _meta: {
      generatedBy: 'tools/check-progression-integrity.mjs',
      staticOnly: true,
      note: 'Static source-shape audit only. Foundry runtime verification is still required.',
    },
    summary: {
      nodes: nodes.length,
      mappedPlugins: Object.keys(pluginMap).length,
      discoveredStepPluginClasses: plugins.length,
      nodeRowsByRisk: nodeRows.reduce((acc, row) => {
        const key = row.risk.split(':')[0];
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      directProgressionMutations: boundaries.directMutations.length,
      progressionRegistryBypasses: boundaries.registryBypasses.length,
      selectionKeysWithoutFinalizerConsumer,
      finalizerConsumersWithoutNode,
    },
    authorityMap: {
      nodeRegistry: 'scripts/engine/progression/registries/progression-node-definitions.js',
      nodeToPluginMap: 'scripts/apps/progression-framework/registries/node-descriptor-mapper.js',
      activeStepComputer: 'scripts/apps/progression-framework/shell/active-step-computer.js',
      finalizer: 'scripts/apps/progression-framework/shell/progression-finalizer.js',
      levelupEntitlementManifest: 'scripts/engine/progression/utils/levelup-entitlement-manifest.js',
      finalizationAudit: 'scripts/engine/progression/utils/levelup-finalization-audit.js',
      mutationGateway: 'scripts/governance/actor-engine/actor-engine.js',
    },
    nodeRows,
    finalizerSelectionConsumers,
    entitlementKeys,
    boundaries,
  };
}

const report = buildReport();

if (!NO_WRITE) {
  const outDir = path.join(ROOT, 'docs/audits');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'progression-runtime-integrity-status.json'), JSON.stringify(report, null, 2));
}

if (JSON_OUT) {
  console.log(JSON.stringify(report.summary, null, 2));
} else {
  console.log('\n' + '='.repeat(72));
  console.log('  PROGRESSION RUNTIME INTEGRITY (static source-shape audit)');
  console.log('='.repeat(72));
  console.log(`  nodes: ${report.summary.nodes}`);
  console.log(`  mapped plugins: ${report.summary.mappedPlugins}`);
  console.log(`  discovered step plugin classes: ${report.summary.discoveredStepPluginClasses}`);
  console.log(`  direct progression actor mutations: ${report.summary.directProgressionMutations}`);
  console.log(`  progression registry bypasses: ${report.summary.progressionRegistryBypasses}`);
  console.log(`  selection keys without finalizer consumer: ${report.summary.selectionKeysWithoutFinalizerConsumer.join(', ') || '(none)'}`);
  console.log(`  finalizer consumers without node: ${report.summary.finalizerConsumersWithoutNode.join(', ') || '(none)'}`);
  console.log('  node risk counts:', report.summary.nodeRowsByRisk);
  if (!NO_WRITE) console.log('  wrote docs/audits/progression-runtime-integrity-status.json');
  console.log('='.repeat(72) + '\n');
}

if (STRICT) {
  const hardFailures = report.nodeRows.filter(row => row.risk.startsWith('HIGH'));
  if (hardFailures.length) process.exitCode = 1;
}
