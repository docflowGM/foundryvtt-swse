#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const WRITE = !process.argv.includes('--no-write');

const MANIFEST_PATH = path.join(ROOT, 'data/feat-source-parity/kotor-jedi-academy-feat-parity-manifest.json');
const CATALOG_PATH = path.join(ROOT, 'data/feat-catalog.json');
const PACK_PATH = path.join(ROOT, 'packs/feats.db');
const OUT_DIR = path.join(ROOT, 'docs/audits/generated');
const JSON_OUT = path.join(OUT_DIR, 'kotor-jedi-academy-feat-parity-report.json');
const MD_OUT = path.join(OUT_DIR, 'kotor-jedi-academy-feat-parity-report.md');

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

function finding(kind, code, message, context = {}) {
  return { kind, code, message, context };
}

function getSource(feat) {
  return String(feat?.system?.source ?? feat?.system?.sourcebook ?? feat?.system?.sourceBook ?? '');
}

function getPrereqText(feat) {
  return String(feat?.system?.prerequisitesText ?? feat?.system?.prerequisites ?? feat?.system?.prerequisite ?? '');
}

function getAbilityMeta(feat) {
  return feat?.system?.abilityMeta ?? {};
}

function tagsOf(feat) {
  return Array.isArray(feat?.system?.tags) ? feat.system.tags.map(String) : [];
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

function includesAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(String(value ?? '')));
}

function enabledUnconditionalNumericModifier(feat) {
  const modifiers = feat?.system?.abilityMeta?.modifiers;
  if (!Array.isArray(modifiers)) return null;
  return modifiers.find((modifier) => {
    const value = Number(modifier?.value ?? 0);
    const enabled = modifier?.enabled === true;
    const predicates = Array.isArray(modifier?.predicates) ? modifier.predicates : [];
    const target = String(modifier?.target ?? '');
    return enabled && value !== 0 && predicates.length === 0 && /attack|damage|defense|skill|use.?the.?force|hit.?points/i.test(target);
  }) ?? null;
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
let kotorCount = 0;
let jatmCount = 0;
let runtimeClassifiedCount = 0;
let selectedChoiceCount = 0;
let notForceReviewedCount = 0;
let forceContextCount = 0;

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
  if (new RegExp(entry.sourcebook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(source)) {
    sourceMatchedCount += 1;
    if (/old republic/i.test(source)) kotorCount += 1;
    if (/jedi academy/i.test(source)) jatmCount += 1;
  } else {
    findings.push(finding('warning', 'SOURCEBOOK_MISMATCH', `${name} is present but not sourced to ${entry.sourcebook}.`, { name, catalogSource: source, expectedSource: entry.sourcebook }));
  }

  const meta = getAbilityMeta(feat);
  const mode = String(meta.mechanicsMode ?? '');
  const scope = String(meta.applicationScope ?? '');
  const policy = String(meta.staticSheetPolicy ?? '');
  const status = String(meta.implementationStatus ?? meta.status ?? '');
  const bucket = textBucket(feat);
  const tags = tagsOf(feat);
  const runtimeMarker = meta.requiresRuntimeContext === true
    || entry.requiresRuntimeContext === true
    || includesAny(`${mode} ${scope} ${policy} ${status} ${bucket}`, [/context/i, /metadata/i, /conditional/i, /runtime/i, /reaction/i, /resource/i, /choice/i, /option/i, /rider/i]);

  if (runtimeMarker) runtimeClassifiedCount += 1;
  if (entry.requiresSelectedChoice || meta.requiresSelectedChoice === true) selectedChoiceCount += 1;

  if (entry.requiresRuntimeContext && !runtimeMarker) {
    findings.push(finding('warning', 'RUNTIME_CONTEXT_NOT_MARKED', `${name} should be runtime/contextual, but metadata does not clearly mark it.`, { name, mode, scope, policy, status }));
  }

  if (entry.requiresSelectedChoice && meta.requiresSelectedChoice !== true) {
    const selectionContext = /choice|picker|selected|selection|entitlement/i.test(`${mode} ${scope} ${policy} ${status} ${bucket}`);
    if (!selectionContext) {
      findings.push(finding('warning', 'SELECTED_CHOICE_NOT_MARKED', `${name} requires a persistent or runtime selection, but metadata does not clearly mark requiresSelectedChoice.`, { name, mode, scope }));
    }
  }

  const riskyStatic = enabledUnconditionalNumericModifier(feat);
  if (riskyStatic) {
    findings.push(finding('warning', 'UNCONDITIONAL_STATIC_MODIFIER_RISK', `${name} has an enabled unconditional numeric modifier. Verify it is not escaping its KOTOR/JATM context.`, { name, modifier: riskyStatic }));
  }

  if (entry.notForceFeat) {
    const featType = String(feat?.system?.featType ?? '');
    if (/force/i.test(featType) || tags.some((tag) => /^force$/i.test(tag))) {
      findings.push(finding('error', 'FALSE_FORCE_CLASSIFICATION', `${name} is marked as a Force feat even though manifest marks it notForceFeat.`, { name, featType, tags }));
    } else {
      notForceReviewedCount += 1;
    }
  }

  if (entry.forceFeat) {
    const prereq = getPrereqText(feat);
    if (!/force sensitivity|use the force|force regimen|force/i.test(`${prereq} ${bucket}`)) {
      findings.push(finding('warning', 'FORCE_CONTEXT_NOT_OBVIOUS', `${name} is classified as Force-context, but prerequisite/benefit context is not obvious.`, { name, prereq }));
    } else {
      forceContextCount += 1;
    }
  }

  if (/Force/.test(name) && !entry.forceFeat && !entry.notForceFeat && !entry.titleKeywordReviewed && !/force/i.test(getPrereqText(feat))) {
    findings.push(finding('warning', 'FORCE_NAME_REQUIRES_REVIEW', `${name} contains Force in the title but is not forceFeat in the manifest. Confirm classification by source context.`, { name, classification: entry.classification }));
  }
}

for (const correction of manifest.taxonomyCorrections ?? []) {
  const feat = findFeat(catalogByName, correction);
  if (!feat) continue;
  const featType = String(feat?.system?.featType ?? '');
  const tags = tagsOf(feat);
  if (correction.to?.featType && featType !== correction.to.featType) {
    findings.push(finding('error', 'TAXONOMY_CORRECTION_NOT_APPLIED', `${correction.name} should have featType ${correction.to.featType}.`, { name: correction.name, featType }));
  }
  for (const tag of correction.to?.removeTags ?? []) {
    if (tags.includes(tag)) {
      findings.push(finding('error', 'REMOVED_TAG_STILL_PRESENT', `${correction.name} still has removed tag ${tag}.`, { name: correction.name, tag, tags }));
    }
  }
  for (const tag of correction.to?.addTags ?? []) {
    if (!tags.includes(tag)) {
      findings.push(finding('warning', 'REVIEW_TAG_MISSING', `${correction.name} is missing review tag ${tag}.`, { name: correction.name, tag, tags }));
    }
  }
}

const kotorCatalogCount = catalog.filter((feat) => /old republic/i.test(getSource(feat))).length;
const jatmCatalogCount = catalog.filter((feat) => /jedi academy/i.test(getSource(feat))).length;

const report = {
  generatedAt: new Date().toISOString(),
  phase: manifest.phase,
  sourcebooks: manifest.sourcebooks,
  catalogFeatCount: catalog.length,
  packFeatCount: pack.length,
  expectedFeatCount: manifest.expectedFeats?.length ?? 0,
  presentExpectedFeatCount,
  sourceMatchedCount,
  kotorCount,
  jatmCount,
  kotorCatalogCount,
  jatmCatalogCount,
  runtimeClassifiedCount,
  selectedChoiceCount,
  notForceReviewedCount,
  forceContextCount,
  taxonomyCorrections: manifest.taxonomyCorrections ?? [],
  sourceReviewQueue: manifest.sourceReviewQueue ?? [],
  outOfScope: manifest.outOfScope ?? [],
  recommendedNextWork: manifest.recommendedNextWork ?? [],
  findings
};

function writeReports() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
  const errors = findings.filter((item) => item.kind === 'error');
  const warnings = findings.filter((item) => item.kind === 'warning');
  const lines = [
    '# KOTOR + Jedi Academy Feat Parity Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Catalog feats: ${report.catalogFeatCount}`,
    `- Pack feats: ${report.packFeatCount}`,
    `- Expected KOTOR/JATM feats: ${report.expectedFeatCount}`,
    `- Present expected feats: ${report.presentExpectedFeatCount}`,
    `- Source-matched expected feats: ${report.sourceMatchedCount}`,
    `- KOTOR expected feats matched: ${report.kotorCount}`,
    `- JATM expected feats matched: ${report.jatmCount}`,
    `- Runtime/context-classified feats: ${report.runtimeClassifiedCount}`,
    `- Selected-choice feats: ${report.selectedChoiceCount}`,
    `- Not-Force taxonomy reviews: ${report.notForceReviewedCount}`,
    `- Force-context feats: ${report.forceContextCount}`,
    `- Warnings: ${warnings.length}`,
    `- Errors: ${errors.length}`,
    '',
    '## Findings',
    ''
  ];

  if (findings.length === 0) {
    lines.push('No warnings or errors.');
  } else {
    for (const item of findings) {
      lines.push(`- **${item.kind.toUpperCase()} ${item.code}:** ${item.message}`);
    }
  }

  lines.push('', '## Recommended next work', '');
  for (const item of manifest.recommendedNextWork ?? []) {
    lines.push(`- ${item}`);
  }

  fs.writeFileSync(MD_OUT, `${lines.join('\n')}\n`);
}

if (WRITE) writeReports();

const errorCount = findings.filter((item) => item.kind === 'error').length;
const warningCount = findings.filter((item) => item.kind === 'warning').length;
console.log(`KOTOR/JATM feat parity audit: ${presentExpectedFeatCount}/${manifest.expectedFeats?.length ?? 0} expected feats present, ${warningCount} warnings, ${errorCount} errors`);

if (STRICT && (errorCount > 0 || warningCount > 0)) {
  process.exit(1);
}
if (!STRICT && errorCount > 0) {
  process.exit(1);
}
