#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const WRITE = !process.argv.includes('--no-write');

const MANIFEST_PATH = path.join(ROOT, 'data/feat-source-parity/scum-threats-unknown-feat-parity-manifest.json');
const CATALOG_PATH = path.join(ROOT, 'data/feat-catalog.json');
const PACK_PATH = path.join(ROOT, 'packs/feats.db');
const OUT_DIR = path.join(ROOT, 'docs/audits/generated');
const JSON_OUT = path.join(OUT_DIR, 'scum-threats-unknown-feat-parity-report.json');
const MD_OUT = path.join(OUT_DIR, 'scum-threats-unknown-feat-parity-report.md');

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) {
    if (fallback !== null) return fallback;
    throw new Error(`Unable to read JSON at ${filePath}: ${error.message}`);
  }
}

function readPack(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { return { __parseError: error.message, __line: index + 1 }; }
    });
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function byName(records) {
  const map = new Map();
  for (const record of records) {
    if (!record?.name) continue;
    map.set(String(record.name).toLowerCase(), record);
    map.set(slugify(record.name), record);
  }
  return map;
}

function findFeat(map, entry) {
  const candidates = [entry.name, slugify(entry.name), ...(entry.aliases ?? [])];
  for (const candidate of candidates) {
    const found = map.get(String(candidate).toLowerCase()) || map.get(slugify(candidate));
    if (found) return found;
  }
  return null;
}

function finding(kind, code, message, context = {}) { return { kind, code, message, context }; }
function systemOf(feat) { return feat?.system ?? feat ?? {}; }
function getSource(feat) { const s = systemOf(feat); return String(s.source ?? s.sourcebook ?? s.sourceBook ?? feat?.source ?? ''); }
function getFeatType(feat) { const s = systemOf(feat); return String(s.featType ?? feat?.featType ?? ''); }
function getAbilityMeta(feat) { return systemOf(feat)?.abilityMeta ?? feat?.abilityMeta ?? {}; }
function tagsOf(feat) { const s = systemOf(feat); return Array.isArray(s.tags) ? s.tags.map(String) : []; }
function textBucket(feat) {
  const s = systemOf(feat);
  return [feat?.name, s.description, s.benefit, s.effect, s.shortSummary, s.prerequisites, s.prerequisitesText, JSON.stringify(getAbilityMeta(feat))]
    .filter(Boolean).join('\n');
}
function includesAny(value, patterns) { return patterns.some((pattern) => pattern.test(String(value ?? ''))); }
function enabledUnconditionalNumericModifier(feat) {
  const modifiers = getAbilityMeta(feat)?.modifiers;
  if (!Array.isArray(modifiers)) return null;
  return modifiers.find((modifier) => {
    const value = Number(modifier?.value ?? 0);
    const enabled = modifier?.enabled === true;
    const predicates = Array.isArray(modifier?.predicates) ? modifier.predicates : [];
    const target = String(modifier?.target ?? '');
    return enabled && value !== 0 && predicates.length === 0 && /attack|damage|defense|skill|use.?the.?force|hit.?points|threshold/i.test(target);
  }) ?? null;
}

const manifest = readJson(MANIFEST_PATH);
const catalog = readJson(CATALOG_PATH, []);
const pack = readPack(PACK_PATH);
const catalogByName = byName(catalog);
const packByName = byName(pack);
const findings = [];

if (!Array.isArray(catalog) || catalog.length === 0) findings.push(finding('error', 'CATALOG_EMPTY', 'data/feat-catalog.json is missing or empty.'));
if (!Array.isArray(pack) || pack.length === 0) findings.push(finding('error', 'PACK_EMPTY', 'packs/feats.db is missing or empty.'));

let presentExpectedFeatCount = 0;
let sourceMatchedCount = 0;
let runtimeClassifiedCount = 0;
let selectedChoiceCount = 0;
let sourceReviewCount = 0;
let metadataOnlyCount = 0;
let notForceReviewedCount = 0;
const sourceCounts = Object.fromEntries((manifest.sourcebooks ?? []).map((source) => [source, 0]));
const implementationHomeCounts = {};

for (const entry of manifest.expectedFeats ?? []) {
  const feat = findFeat(catalogByName, entry);
  const packFeat = findFeat(packByName, entry);
  const name = entry.name;

  if (!feat) {
    findings.push(finding('error', 'MISSING_CATALOG_FEAT', `${name} is missing from data/feat-catalog.json.`, { name }));
    continue;
  }
  presentExpectedFeatCount += 1;

  if (!packFeat) findings.push(finding('error', 'MISSING_PACK_FEAT', `${name} is missing from packs/feats.db.`, { name }));

  const source = getSource(feat);
  if (new RegExp(entry.sourcebook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(source)) {
    sourceMatchedCount += 1;
    sourceCounts[entry.sourcebook] = (sourceCounts[entry.sourcebook] ?? 0) + 1;
  } else {
    findings.push(finding('warning', 'SOURCEBOOK_MISMATCH', `${name} is present but not sourced to ${entry.sourcebook}.`, { name, catalogSource: source, expectedSource: entry.sourcebook }));
  }

  const meta = getAbilityMeta(feat);
  const mode = String(meta.mechanicsMode ?? '');
  const scope = String(meta.applicationScope ?? '');
  const policy = String(meta.staticSheetPolicy ?? '');
  const status = String(meta.implementationStatus ?? meta.status ?? meta.executionModel ?? '');
  const bucket = textBucket(feat);
  const tags = tagsOf(feat);
  const implementationHome = String(entry.expectedImplementationHome ?? entry.classification ?? '');
  implementationHomeCounts[implementationHome] = (implementationHomeCounts[implementationHome] ?? 0) + 1;

  const runtimeMarker = meta.requiresRuntimeContext === true
    || entry.requiresRuntimeContext === true
    || includesAny(`${mode} ${scope} ${policy} ${status} ${bucket} ${implementationHome}`, [/context/i, /metadata/i, /conditional/i, /runtime/i, /reaction/i, /resource/i, /choice/i, /option/i, /rider/i, /encounter/i, /vehicle/i, /mounted/i, /grapple/i, /social/i]);
  if (runtimeMarker) runtimeClassifiedCount += 1;

  if (entry.requiresSelectedChoice || meta.requiresSelectedChoice === true) selectedChoiceCount += 1;
  if (entry.sourceReviewRequired) sourceReviewCount += 1;
  if (entry.metadataOnlyOrAdvisory) metadataOnlyCount += 1;

  if (entry.requiresRuntimeContext && !runtimeMarker) {
    findings.push(finding('warning', 'RUNTIME_CONTEXT_NOT_MARKED', `${name} should be runtime/contextual, but metadata does not clearly mark it.`, { name, mode, scope, policy, status }));
  }

  if (entry.requiresSelectedChoice && meta.requiresSelectedChoice !== true) {
    const selectionContext = /choice|picker|selected|selection|entitlement|exclude|target|manual/i.test(`${mode} ${scope} ${policy} ${status} ${bucket}`);
    if (!selectionContext) findings.push(finding('warning', 'SELECTED_CHOICE_NOT_MARKED', `${name} requires a persistent or runtime selection, but metadata does not clearly mark requiresSelectedChoice.`, { name, mode, scope }));
  }

  const riskyStatic = enabledUnconditionalNumericModifier(feat);
  if (riskyStatic) findings.push(finding('warning', 'UNCONDITIONAL_STATIC_MODIFIER_RISK', `${name} has an enabled unconditional numeric modifier. Verify it is not escaping its source/context.`, { name, modifier: riskyStatic }));

  if (entry.notForceFeat) {
    const featType = getFeatType(feat);
    const exactForceTag = tags.some((tag) => /^force$/i.test(tag));
    if (/^force$/i.test(featType) || exactForceTag) {
      findings.push(finding('error', 'FALSE_FORCE_CLASSIFICATION', `${name} is marked as a Force feat even though this manifest marks it notForceFeat.`, { name, featType, tags }));
    } else {
      notForceReviewedCount += 1;
    }
  }

  if (/Force/.test(name) && !entry.forceFeat && !entry.notForceFeat && !entry.forceContextOnly && !entry.titleKeywordReviewed) {
    findings.push(finding('warning', 'FORCE_KEYWORD_UNREVIEWED', `${name} contains Force in the title but has no taxonomy review flag.`, { name }));
  }
}

for (const [sourcebook, expectedCount] of Object.entries(manifest.counts ?? {})) {
  if ((sourceCounts[sourcebook] ?? 0) !== expectedCount) {
    findings.push(finding('warning', 'SOURCEBOOK_COUNT_MISMATCH', `${sourcebook} expected ${expectedCount} feats, found ${sourceCounts[sourcebook] ?? 0}.`, { sourcebook, expectedCount, found: sourceCounts[sourcebook] ?? 0 }));
  }
}

const summary = {
  phase: manifest.phase,
  name: manifest.name,
  catalogFeatCount: Array.isArray(catalog) ? catalog.length : 0,
  packFeatCount: pack.length,
  expectedFeatCount: manifest.expectedFeats?.length ?? 0,
  presentExpectedFeatCount,
  sourceMatchedCount,
  sourceCounts,
  runtimeClassifiedCount,
  selectedChoiceCount,
  sourceReviewCount,
  metadataOnlyCount,
  notForceReviewedCount,
  implementationHomeCounts,
  warningCount: findings.filter((item) => item.kind === 'warning').length,
  errorCount: findings.filter((item) => item.kind === 'error').length
};

const report = { summary, findings };
if (WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Scum and Villainy + Threats of the Galaxy + Unknown Regions Feat Parity Report',
    '',
    `Phase: ${summary.phase}`,
    `Expected feats: ${summary.expectedFeatCount}`,
    `Present expected feats: ${summary.presentExpectedFeatCount}`,
    `Source matched feats: ${summary.sourceMatchedCount}`,
    `Runtime/context classified feats: ${summary.runtimeClassifiedCount}`,
    `Selected-choice feats: ${summary.selectedChoiceCount}`,
    `Source-review flagged feats: ${summary.sourceReviewCount}`,
    `Metadata/advisory flagged feats: ${summary.metadataOnlyCount}`,
    `False-Force reviewed feats: ${summary.notForceReviewedCount}`,
    `Warnings: ${summary.warningCount}`,
    `Errors: ${summary.errorCount}`,
    '',
    '## Source counts',
    '',
    ...Object.entries(summary.sourceCounts).map(([source, count]) => `- ${source}: ${count}`),
    '',
    '## Implementation homes',
    '',
    ...Object.entries(summary.implementationHomeCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([home, count]) => `- ${home}: ${count}`),
    '',
    '## Findings',
    '',
    findings.length === 0 ? '- None.' : findings.map((item) => `- ${item.kind.toUpperCase()} ${item.code}: ${item.message}`).join('\n')
  ];
  fs.writeFileSync(MD_OUT, `${lines.join('\n')}\n`);
}

console.log(`${summary.presentExpectedFeatCount}/${summary.expectedFeatCount} expected feats present`);
console.log(`${summary.warningCount} warnings, ${summary.errorCount} errors`);

if (STRICT && summary.errorCount > 0) process.exit(1);
