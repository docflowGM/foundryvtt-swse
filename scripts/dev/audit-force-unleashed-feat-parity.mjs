#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const WRITE = !process.argv.includes('--no-write');

const MANIFEST_PATH = path.join(ROOT, 'data/feat-source-parity/force-unleashed-feat-parity-manifest.json');
const CATALOG_PATH = path.join(ROOT, 'data/feat-catalog.json');
const PACK_PATH = path.join(ROOT, 'packs/feats.db');
const OUT_DIR = path.join(ROOT, 'docs/audits/generated');
const JSON_OUT = path.join(OUT_DIR, 'force-unleashed-feat-parity-report.json');
const MD_OUT = path.join(OUT_DIR, 'force-unleashed-feat-parity-report.md');

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
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
      try {
        return JSON.parse(line);
      } catch (error) {
        return { __parseError: error.message, __line: index + 1 };
      }
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
    if (!record || !record.name) continue;
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

function finding(kind, code, message, context = {}) {
  return { kind, code, message, context };
}

function getSource(feat) {
  return String(feat?.system?.source ?? feat?.system?.sourcebook ?? feat?.system?.sourceBook ?? '');
}

function getAbilityMeta(feat) {
  return feat?.system?.abilityMeta ?? {};
}

function getPrereqText(feat) {
  return String(feat?.system?.prerequisitesText ?? feat?.system?.prerequisites ?? feat?.system?.prerequisite ?? '');
}

function textBucket(feat) {
  return [
    feat?.name,
    feat?.system?.description,
    feat?.system?.benefit,
    feat?.system?.effect,
    feat?.system?.shortSummary,
    getPrereqText(feat),
    JSON.stringify(getAbilityMeta(feat))
  ].filter(Boolean).join('\n');
}

function enabledPositiveStaticModifier(feat) {
  const modifiers = feat?.system?.abilityMeta?.modifiers;
  if (!Array.isArray(modifiers)) return null;
  return modifiers.find((modifier) => {
    const value = Number(modifier?.value ?? 0);
    const target = String(modifier?.target ?? '');
    const enabled = modifier?.enabled === true;
    const hasPredicates = Array.isArray(modifier?.predicates) && modifier.predicates.length > 0;
    return enabled && value !== 0 && !hasPredicates && /attack|damage|defense|skill|use.?the.?force/i.test(target);
  }) ?? null;
}

function includesAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(String(value ?? '')));
}

const manifest = readJson(MANIFEST_PATH);
const catalog = readJson(CATALOG_PATH, []);
const pack = readPack(PACK_PATH);
const catalogByName = byName(catalog);
const packByName = byName(pack);
const findings = [];

if (!Array.isArray(catalog) || catalog.length === 0) {
  findings.push(finding('error', 'CATALOG_EMPTY', 'data/feat-catalog.json is missing or empty.'));
}
if (!Array.isArray(pack) || pack.length === 0) {
  findings.push(finding('error', 'PACK_EMPTY', 'packs/feats.db is missing or empty.'));
}

let presentExpectedFeatCount = 0;
let sourceMatchedCount = 0;
let runtimeClassifiedCount = 0;
let forcePowerScopedCount = 0;
let outOfScopePolicyCount = manifest.outOfScope?.length ?? 0;

for (const entry of manifest.expectedFeats ?? []) {
  const feat = findFeat(catalogByName, entry);
  const packFeat = findFeat(packByName, entry);
  const name = entry.name;

  if (!feat) {
    findings.push(finding('error', 'MISSING_CATALOG_FEAT', `${name} is missing from data/feat-catalog.json.`, { name }));
    continue;
  }
  presentExpectedFeatCount += 1;

  if (!packFeat) {
    findings.push(finding('error', 'MISSING_PACK_FEAT', `${name} is missing from packs/feats.db.`, { name }));
  }

  const source = getSource(feat);
  if (/force unleashed/i.test(source)) {
    sourceMatchedCount += 1;
  } else {
    findings.push(finding('warning', 'SOURCEBOOK_MISMATCH', `${name} is present but not sourced to The Force Unleashed Campaign Guide.`, { name, catalogSource: source }));
  }

  const prereqText = getPrereqText(feat);
  if (!prereqText && name !== 'Unstoppable Force' && name !== 'Bad Feeling' && name !== 'Cunning Attack') {
    findings.push(finding('warning', 'MISSING_PREREQUISITE_TEXT', `${name} has no prerequisite text.`, { name }));
  }

  const meta = getAbilityMeta(feat);
  const bucket = textBucket(feat);
  const mode = String(meta.mechanicsMode ?? '');
  const status = String(meta.implementationStatus ?? meta.status ?? '');
  const staticSheetPolicy = String(meta.staticSheetPolicy ?? '');
  const runtimeMarker = meta.requiresRuntimeContext === true
    || entry.requiresRuntimeContext === true
    || includesAny(`${mode} ${status} ${staticSheetPolicy} ${bucket}`, [/context/i, /metadata/i, /conditional/i, /runtime/i, /workflow/i, /rider/i, /rage/i, /force/i, /capability/i]);

  if (runtimeMarker) runtimeClassifiedCount += 1;

  if (entry.requiresRuntimeContext && !runtimeMarker) {
    findings.push(finding('warning', 'RUNTIME_CONTEXT_NOT_MARKED', `${name} should be treated as runtime/contextual, but metadata does not clearly mark it.`, { name, mechanicsMode: mode, implementationStatus: status, staticSheetPolicy }));
  }

  const riskyStatic = enabledPositiveStaticModifier(feat);
  if (riskyStatic) {
    findings.push(finding('warning', 'UNCONDITIONAL_STATIC_MODIFIER_RISK', `${name} has an enabled unconditional numeric modifier. Verify it is not being applied outside its TFU context.`, { name, modifier: riskyStatic }));
  }

  if (entry.classification === 'force_power_activation_bonus') {
    forcePowerScopedCount += 1;
    if (!/trained\s+in\s+use\s+the\s+force|use\s+the\s+force/i.test(prereqText + bucket)) {
      findings.push(finding('warning', 'FORCE_POWER_FEAT_NOT_UTF_SCOPED', `${name} should remain scoped to a Use the Force activation.`, { name, prereqText }));
    }
    if (!entry.forcePower || !bucket.toLowerCase().includes(entry.forcePower.toLowerCase().split(' ')[0])) {
      findings.push(finding('warning', 'FORCE_POWER_NAME_NOT_OBVIOUS', `${name} manifest expects a named Force power, but the catalog text does not obviously expose it.`, { name, expectedPower: entry.forcePower }));
    }
    if (!/exclude|metadata|context|manual|conditional/i.test(`${staticSheetPolicy} ${mode} ${status}`)) {
      findings.push(finding('warning', 'FORCE_POWER_STATIC_POLICY_WEAK', `${name} should not be a global Use the Force modifier.`, { name, mechanicsMode: mode, staticSheetPolicy }));
    }
  }

  if (name === 'Unleashed' && !/unleashed|destiny|grant|unlock|capability/i.test(bucket)) {
    findings.push(finding('warning', 'UNLEASHED_CAPABILITY_NOT_OBVIOUS', 'Unleashed should remain modeled as capability metadata until an Unleashed Ability subsystem exists.'));
  }

  if (/rage/i.test(name) && !/rage/i.test(`${mode} ${status} ${bucket}`)) {
    findings.push(finding('warning', 'RAGE_FEAT_NOT_RAGE_SCOPED', `${name} should be classified under rage state/context rules.`, { name }));
  }
}

const forceUnleashedCatalogCount = catalog.filter((feat) => /force unleashed/i.test(getSource(feat))).length;
const report = {
  generatedAt: new Date().toISOString(),
  phase: manifest.phase,
  sourcebook: manifest.sourcebook,
  catalogFeatCount: catalog.length,
  packFeatCount: pack.length,
  expectedFeatCount: manifest.expectedFeats?.length ?? 0,
  presentExpectedFeatCount,
  sourceMatchedCount,
  forceUnleashedCatalogCount,
  runtimeClassifiedCount,
  forcePowerScopedCount,
  outOfScopePolicyCount,
  outOfScope: manifest.outOfScope ?? [],
  recommendedNextWork: manifest.recommendedNextWork ?? [],
  findings
};

function renderMarkdown(data) {
  const errors = data.findings.filter((item) => item.kind === 'error');
  const warnings = data.findings.filter((item) => item.kind === 'warning');
  const lines = [];
  lines.push('# The Force Unleashed Campaign Guide Feat Parity Report');
  lines.push('');
  lines.push(`Generated: ${data.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Sourcebook: ${data.sourcebook}`);
  lines.push(`- Catalog feats: ${data.catalogFeatCount}`);
  lines.push(`- Pack feats: ${data.packFeatCount}`);
  lines.push(`- Expected Phase 6 feats: ${data.expectedFeatCount}`);
  lines.push(`- Present expected feats: ${data.presentExpectedFeatCount}`);
  lines.push(`- Catalog feats sourced to TFUCG: ${data.forceUnleashedCatalogCount}`);
  lines.push(`- Source-matched expected feats: ${data.sourceMatchedCount}`);
  lines.push(`- Runtime/context classified feats: ${data.runtimeClassifiedCount}`);
  lines.push(`- Force-power scoped feats: ${data.forcePowerScopedCount}`);
  lines.push(`- Errors: ${errors.length}`);
  lines.push(`- Warnings: ${warnings.length}`);
  lines.push('');
  lines.push('## Explicitly out of scope for this phase');
  lines.push('');
  for (const item of data.outOfScope) {
    lines.push(`- **${item.id}:** ${item.reason}`);
  }
  lines.push('');
  lines.push('## Recommended next work');
  lines.push('');
  for (const item of data.recommendedNextWork) {
    lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  if (!data.findings.length) {
    lines.push('No findings.');
  } else {
    for (const item of data.findings) {
      lines.push(`- **${item.kind.toUpperCase()} ${item.code}:** ${item.message}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

if (WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_OUT, renderMarkdown(report));
}

const errors = findings.filter((item) => item.kind === 'error');
const warnings = findings.filter((item) => item.kind === 'warning');
console.log(`The Force Unleashed feat parity audit: ${presentExpectedFeatCount} expected feats present, ${warnings.length} warnings, ${errors.length} errors.`);

if (STRICT && (errors.length > 0 || warnings.length > 0)) {
  process.exitCode = 1;
} else if (errors.length > 0) {
  process.exitCode = 1;
}
