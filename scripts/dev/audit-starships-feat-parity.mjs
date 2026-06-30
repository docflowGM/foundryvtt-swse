#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'data/feat-source-parity/starships-feat-parity-manifest.json');
const CATALOG_PATH = path.join(ROOT, 'data/feat-catalog.json');
const PACK_PATH = path.join(ROOT, 'packs/feats.db');
const OUT_DIR = path.join(ROOT, 'docs/audits/generated');
const OUT_JSON = path.join(OUT_DIR, 'starships-feat-parity-report.json');
const OUT_MD = path.join(OUT_DIR, 'starships-feat-parity-report.md');

const strict = process.argv.includes('--strict');
const failOnWarnings = process.argv.includes('--fail-on-warnings');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readFeatCatalog(filePath) {
  const raw = readJson(filePath);
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.feats)) return raw.feats;
  if (Array.isArray(raw.items)) return raw.items;
  throw new Error(`Unsupported feat catalog shape in ${filePath}`);
}

function readPackDb(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      error.message = `Invalid JSON in ${filePath} line ${index + 1}: ${error.message}`;
      throw error;
    }
  });
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function prereqText(feat) {
  const system = feat?.system || {};
  return String(system.prerequisitesText || system.prerequisites || system.prerequisite || '').replace(/\s+/g, ' ').trim();
}

function getMeta(feat) {
  return feat?.system?.abilityMeta || {};
}

function sourceFields(feat) {
  const system = feat?.system || {};
  return [system.sourcebook, system.source, ...(Array.isArray(system.referenceBooks) ? system.referenceBooks : [])]
    .filter(Boolean)
    .map(String);
}

function includesStarshipsSource(feat) {
  return sourceFields(feat).some((entry) => /starships of the galaxy/i.test(entry));
}

function hasText(feat, expected) {
  const haystack = `${prereqText(feat)} ${JSON.stringify(feat?.system?.description || '')} ${JSON.stringify(feat?.system?.effect || '')}`.toLowerCase();
  return haystack.includes(String(expected).toLowerCase());
}

function indexByName(feats) {
  const map = new Map();
  for (const feat of feats) {
    const key = normalizeName(feat.name);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(feat);
  }
  return map;
}

function checkFeat({ expected, catalogIndex, packIndex, manifest }) {
  const key = normalizeName(expected.name);
  const catalogMatches = catalogIndex.get(key) || [];
  const packMatches = packIndex.get(key) || [];
  const primary = catalogMatches[0] || packMatches[0] || null;
  const result = {
    name: expected.name,
    sourceRole: expected.sourceRole,
    automationClass: expected.automationClass,
    status: 'ok',
    warnings: [],
    errors: [],
    observed: {
      catalogCount: catalogMatches.length,
      packCount: packMatches.length,
      catalogHasStarshipsSource: catalogMatches.some(includesStarshipsSource),
      packHasStarshipsSource: packMatches.some(includesStarshipsSource),
      prerequisiteText: primary ? prereqText(primary) : '',
      mechanicsMode: primary ? getMeta(primary).mechanicsMode || '' : '',
      implementationStatus: primary ? getMeta(primary).implementationStatus || getMeta(primary).status || '' : '',
      staticSheetPolicy: primary ? getMeta(primary).staticSheetPolicy || '' : '',
      requiresRuntimeContext: primary ? Boolean(getMeta(primary).requiresRuntimeContext) : false,
      requiresSelectedChoice: primary ? Boolean(getMeta(primary).requiresSelectedChoice) : false
    }
  };

  if (!primary) {
    result.errors.push('Missing feat from both data/feat-catalog.json and packs/feats.db.');
  }

  if (catalogMatches.length > 1 || packMatches.length > 1) {
    result.warnings.push('Duplicate feat name detected; verify registry deduplication and source-book metadata.');
  }

  if (expected.requiresSourceReference && primary && !includesStarshipsSource(primary)) {
    result.errors.push('Expected an explicit Starships of the Galaxy source/reference entry.');
  }

  if (expected.requiredPrerequisiteText && primary) {
    for (const prereq of expected.requiredPrerequisiteText) {
      if (!hasText(primary, prereq)) {
        result.errors.push(`Missing expected prerequisite/source text fragment: ${prereq}`);
      }
    }
  }

  if (expected.requiresRuntimeContext && primary && !getMeta(primary).requiresRuntimeContext) {
    result.warnings.push('Expected abilityMeta.requiresRuntimeContext for this conditional starship rule.');
  }

  if (expected.requiresSelectedChoice && primary && !getMeta(primary).requiresSelectedChoice) {
    result.warnings.push('Expected abilityMeta.requiresSelectedChoice for this selected maneuver/choice feat.');
  }

  if (expected.name === 'Starship Designer' && primary) {
    const meta = getMeta(primary);
    const policy = manifest.policy.starshipDesigner;
    if (meta.implementationStatus !== policy.implementationStatus) {
      result.errors.push(`Starship Designer implementationStatus should be ${policy.implementationStatus}.`);
    }
    if (meta.mechanicsMode !== policy.mechanicsMode) {
      result.errors.push(`Starship Designer mechanicsMode should be ${policy.mechanicsMode}.`);
    }
    if (meta.applicationScope !== policy.applicationScope) {
      result.errors.push(`Starship Designer applicationScope should be ${policy.applicationScope}.`);
    }
    const noteText = JSON.stringify(meta).toLowerCase();
    if (!noteText.includes('consult starships of the galaxy')) {
      result.errors.push('Starship Designer should carry a pithy consult-Starships-of-the-Galaxy note.');
    }
    if (/punted|deferred|backlog/i.test(noteText)) {
      result.warnings.push('Starship Designer metadata still sounds like backlog/deferred work; prefer intentional metadata-only wording.');
    }
  }

  if (result.errors.length) result.status = 'error';
  else if (result.warnings.length) result.status = 'warning';
  return result;
}

function writeReports(report) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [];
  lines.push('# Starships of the Galaxy Feat Parity Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Manifest entries: ${report.summary.manifestEntries}`);
  lines.push(`- Catalog feats: ${report.summary.catalogFeatCount}`);
  lines.push(`- Pack feats: ${report.summary.packFeatCount}`);
  lines.push(`- OK: ${report.summary.ok}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Errors: ${report.summary.errors}`);
  lines.push('');
  lines.push('## Starship Designer Policy');
  lines.push('');
  lines.push(report.policy.starshipDesigner.uiNote);
  lines.push('');
  lines.push('## Entries');
  lines.push('');
  lines.push('| Feat | Role | Automation Class | Status | Notes |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const entry of report.entries) {
    const notes = [...entry.errors, ...entry.warnings].join(' ') || 'OK';
    lines.push(`| ${entry.name} | ${entry.sourceRole} | ${entry.automationClass} | ${entry.status} | ${notes.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`);
}

const manifest = readJson(MANIFEST_PATH);
const catalog = readFeatCatalog(CATALOG_PATH);
const pack = readPackDb(PACK_PATH);
const catalogIndex = indexByName(catalog);
const packIndex = indexByName(pack);

const entries = manifest.expectedStarshipsEntries.map((expected) => checkFeat({ expected, catalogIndex, packIndex, manifest }));
const summary = {
  manifestEntries: entries.length,
  catalogFeatCount: catalog.length,
  packFeatCount: pack.length,
  ok: entries.filter((entry) => entry.status === 'ok').length,
  warnings: entries.reduce((count, entry) => count + entry.warnings.length, 0),
  errors: entries.reduce((count, entry) => count + entry.errors.length, 0)
};

const report = {
  generatedAt: new Date().toISOString(),
  phase: manifest.phase,
  scope: manifest.scope,
  policy: manifest.policy,
  summary,
  entries
};

writeReports(report);

console.log(`Starships feat parity audit complete: ${summary.ok} ok, ${summary.warnings} warnings, ${summary.errors} errors.`);
console.log(`Wrote ${path.relative(ROOT, OUT_JSON)}`);
console.log(`Wrote ${path.relative(ROOT, OUT_MD)}`);

if (summary.errors > 0 || (strict && summary.warnings > 0) || (failOnWarnings && summary.warnings > 0)) {
  process.exitCode = 1;
}
