#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const WRITE = !process.argv.includes('--no-write');

const MANIFEST_PATH = path.join(ROOT, 'data/feat-source-parity/scavengers-droids-feat-parity-manifest.json');
const CATALOG_PATH = path.join(ROOT, 'data/feat-catalog.json');
const PACK_PATH = path.join(ROOT, 'packs/feats.db');
const OUT_DIR = path.join(ROOT, 'docs/audits/generated');
const JSON_OUT = path.join(OUT_DIR, 'scavengers-droids-feat-parity-report.json');
const MD_OUT = path.join(OUT_DIR, 'scavengers-droids-feat-parity-report.md');

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

function getTextBucket(feat) {
  return [
    feat?.name,
    feat?.system?.description,
    feat?.system?.benefit,
    feat?.system?.effect,
    feat?.system?.shortSummary,
    getPrereqText(feat),
    JSON.stringify(feat?.system?.abilityMeta ?? {})
  ].filter(Boolean).join('\n');
}

function hasDroidPrereq(text) {
  return /\bdroid\b|cyborg hybrid/i.test(text);
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
let metadataAlignedCount = 0;
const expected = manifest.expectedFeats ?? [];

for (const entry of expected) {
  const feat = findFeat(catalogByName, entry);
  const packFeat = findFeat(packByName, entry);
  const displayName = entry.name;

  if (!feat) {
    findings.push(finding('error', 'MISSING_CATALOG_FEAT', `${displayName} is missing from data/feat-catalog.json.`, { name: displayName }));
    continue;
  }

  presentExpectedFeatCount += 1;

  if (!packFeat) {
    findings.push(finding('error', 'MISSING_PACK_FEAT', `${displayName} is missing from packs/feats.db.`, { name: displayName }));
  }

  const source = getSource(feat);
  if (!/scavenger'?s guide to droids/i.test(source)) {
    findings.push(finding('warning', 'SOURCEBOOK_MISMATCH', `${displayName} is present but is not sourced to Scavenger's Guide to Droids.`, { name: displayName, catalogSource: source }));
  }

  const prereqText = getPrereqText(feat);
  if (!prereqText) {
    findings.push(finding('warning', 'MISSING_PREREQUISITE_TEXT', `${displayName} has no prerequisite text.`, { name: displayName }));
  } else if (displayName !== 'Droid Focus' && displayName !== 'Sensor Link' && !hasDroidPrereq(prereqText)) {
    findings.push(finding('warning', 'DROID_PREREQ_NOT_OBVIOUS', `${displayName} should be droid/cyborg-facing, but prerequisite text does not clearly show that.`, { name: displayName, prereqText }));
  }

  const abilityMeta = getAbilityMeta(feat);
  const textBucket = getTextBucket(feat);
  const mode = String(abilityMeta.mechanicsMode ?? '');
  const status = String(abilityMeta.implementationStatus ?? abilityMeta.status ?? '');
  const staticSheetPolicy = String(abilityMeta.staticSheetPolicy ?? '');
  const hasRuntimeContextMarker = abilityMeta.requiresRuntimeContext === true
    || /context|manual|active|reaction|rider|workflow|metadata|conditional|toggle|shield|damage|attack|grapple/i.test(`${mode} ${status} ${staticSheetPolicy}`);

  if (entry.requiresSelectedChoice && abilityMeta.requiresSelectedChoice !== true && !/choice/i.test(`${mode} ${status} ${textBucket}`)) {
    findings.push(finding('warning', 'CHOICE_NOT_MARKED', `${displayName} should be marked as requiring a selected choice.`, { name: displayName, mechanicsMode: mode, implementationStatus: status }));
  }

  if (entry.staticSheetPolicy === 'exclude') {
    const safeStaticPolicy = /exclude|manual|context|roll|toggle/.test(staticSheetPolicy) || !includesAny(textBucket, [/staticSheetPolicy/i]);
    const suspiciousPassiveBonus = includesAny(textBucket, [/grantsBonuses"\s*:\s*\{[^}]*"combat"\s*:\s*\{[^}]*[1-9]/i, /static.*defense.*bonus/i]);
    if (!safeStaticPolicy && suspiciousPassiveBonus) {
      findings.push(finding('warning', 'STATIC_POLICY_DRIFT', `${displayName} looks like it may be leaking contextual droid mechanics into static sheet math.`, { name: displayName, staticSheetPolicy }));
    }
  }

  if (entry.requiresRuntimeContext && !hasRuntimeContextMarker) {
    findings.push(finding('warning', 'RUNTIME_CONTEXT_NOT_MARKED', `${displayName} should stay runtime/contextual, but ability metadata does not clearly mark that.`, { name: displayName, mechanicsMode: mode, implementationStatus: status }));
  }

  if (entry.classification.includes('shield') && !/shield/i.test(textBucket)) {
    findings.push(finding('warning', 'SHIELD_TEXT_MISSING', `${displayName} should describe shield interaction but the text bucket did not include shield language.`, { name: displayName }));
  }

  if (entry.classification.includes('damage') && !/damage|condition track|threshold/i.test(textBucket)) {
    findings.push(finding('warning', 'DAMAGE_TEXT_MISSING', `${displayName} should describe damage/condition-track interaction but the text bucket did not include it.`, { name: displayName }));
  }

  metadataAlignedCount += 1;
}

const sgdCatalogFeats = catalog.filter((feat) => /scavenger'?s guide to droids/i.test(getSource(feat)));
const expectedNames = new Set(expected.map((entry) => String(entry.name).toLowerCase()));
const unexpected = sgdCatalogFeats
  .filter((feat) => !expectedNames.has(String(feat.name).toLowerCase()))
  .map((feat) => feat.name)
  .sort();

if (unexpected.length > 0) {
  findings.push(finding('warning', 'UNMANIFESTED_SCAVENGERS_DROIDS_FEATS', 'Catalog contains Scavenger\'s Guide to Droids feats not listed in the Phase 5 manifest.', { names: unexpected }));
}

const fatalErrors = findings.filter((item) => item.kind === 'error');
const warnings = findings.filter((item) => item.kind === 'warning');

const report = {
  summary: {
    phase: manifest.phase,
    sourcebook: manifest.sourcebook,
    checkedAt: new Date().toISOString(),
    catalogFeatCount: catalog.length,
    packFeatCount: pack.length,
    expectedFeatCount: expected.length,
    presentExpectedFeatCount,
    scavengersDroidsCatalogFeatCount: sgdCatalogFeats.length,
    metadataAlignedCount,
    errorCount: fatalErrors.length,
    warningCount: warnings.length,
    okCount: expected.length - fatalErrors.length
  },
  droidRulesNotInThisPhase: manifest.droidRulesNotInThisPhase ?? [],
  recommendedNextWork: manifest.recommendedNextWork ?? [],
  findings
};

function toMarkdown(data) {
  const lines = [];
  lines.push('# Scavenger\'s Guide to Droids Feat Parity Report');
  lines.push('');
  lines.push(`Generated: ${data.summary.checkedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Sourcebook: ${data.summary.sourcebook}`);
  lines.push(`- Catalog feats: ${data.summary.catalogFeatCount}`);
  lines.push(`- Pack feats: ${data.summary.packFeatCount}`);
  lines.push(`- Expected Phase 5 feats: ${data.summary.expectedFeatCount}`);
  lines.push(`- Present expected feats: ${data.summary.presentExpectedFeatCount}`);
  lines.push(`- Catalog feats sourced to Scavenger's Guide to Droids: ${data.summary.scavengersDroidsCatalogFeatCount}`);
  lines.push(`- Errors: ${data.summary.errorCount}`);
  lines.push(`- Warnings: ${data.summary.warningCount}`);
  lines.push('');
  lines.push('## Explicitly out of scope for this phase');
  lines.push('');
  for (const item of data.droidRulesNotInThisPhase) {
    lines.push(`- **${item.domain}:** ${item.reason}`);
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
  if (data.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const item of data.findings) {
      lines.push(`- **${item.kind.toUpperCase()} ${item.code}:** ${item.message}`);
      if (item.context && Object.keys(item.context).length > 0) {
        lines.push(`  - Context: ${JSON.stringify(item.context)}`);
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

if (WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_OUT, `${toMarkdown(report)}\n`);
}

console.log(`Scavenger's Guide to Droids feat parity audit: ${report.summary.okCount} ok, ${report.summary.warningCount} warnings, ${report.summary.errorCount} errors`);

if (STRICT && fatalErrors.length > 0) {
  process.exitCode = 1;
}
