#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const WRITE = !process.argv.includes('--no-write');

const MANIFEST_PATH = path.join(ROOT, 'data/feat-source-parity/galaxy-intrigue-feat-parity-manifest.json');
const CATALOG_PATH = path.join(ROOT, 'data/feat-catalog.json');
const PACK_PATH = path.join(ROOT, 'packs/feats.db');
const EFFECTS_PATH = path.join(ROOT, 'data/feat-effects.json');
const MODEL_PATH = path.join(ROOT, 'data/skill-challenges/skill-challenge-system-model.json');
const OUT_DIR = path.join(ROOT, 'docs/audits/generated');
const JSON_OUT = path.join(OUT_DIR, 'galaxy-intrigue-feat-parity-report.json');
const MD_OUT = path.join(OUT_DIR, 'galaxy-intrigue-feat-parity-report.md');

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

function status(kind, code, message, context = {}) {
  return { kind, code, message, context };
}

const manifest = readJson(MANIFEST_PATH);
const catalog = readJson(CATALOG_PATH, []);
const pack = readPack(PACK_PATH);
const effects = readJson(EFFECTS_PATH, {});
const skillChallengeModel = readJson(MODEL_PATH, {});

const catalogByName = byName(catalog);
const packByName = byName(pack);
const findings = [];

if (!Array.isArray(catalog) || catalog.length === 0) {
  findings.push(status('error', 'CATALOG_EMPTY', 'data/feat-catalog.json is missing or empty.'));
}
if (!Array.isArray(pack) || pack.length === 0) {
  findings.push(status('error', 'PACK_EMPTY', 'packs/feats.db is missing or empty.'));
}
if (!skillChallengeModel?.recommendedArchitecture?.engine) {
  findings.push(status('warning', 'SKILL_CHALLENGE_MODEL_INCOMPLETE', 'Skill Challenge system model is missing recommended architecture.'));
}

const expected = manifest.expectedFeats ?? [];
let okCount = 0;

for (const entry of expected) {
  const feat = findFeat(catalogByName, entry);
  const packFeat = findFeat(packByName, entry);
  const displayName = entry.name;

  if (!feat) {
    findings.push(status('error', 'MISSING_CATALOG_FEAT', `${displayName} is missing from data/feat-catalog.json.`, { name: displayName }));
    continue;
  }
  if (!packFeat) {
    findings.push(status('error', 'MISSING_PACK_FEAT', `${displayName} is missing from packs/feats.db.`, { name: displayName }));
  }

  const source = feat.system?.source ?? feat.system?.sourcebook ?? '';
  if (entry.classification === 'source_review_required') {
    findings.push(status('warning', 'SOURCE_REVIEW_REQUIRED', `${displayName} needs manual source verification before automated parity claims.`, { name: displayName, catalogSource: source, notes: entry.notes ?? '' }));
  } else if (!/galaxy of intrigue/i.test(String(source))) {
    findings.push(status('warning', 'SOURCEBOOK_MISMATCH', `${displayName} is present but is not sourced to Galaxy of Intrigue.`, { name: displayName, catalogSource: source }));
  }

  const prereqText = feat.system?.prerequisitesText ?? feat.system?.prerequisites ?? feat.system?.prerequisite ?? '';
  if (prereqText === '') {
    findings.push(status('warning', 'MISSING_PREREQUISITE_TEXT', `${displayName} has no prerequisite text.`, { name: displayName }));
  }

  const abilityMeta = feat.system?.abilityMeta ?? {};
  const classification = entry.classification ?? '';
  if (entry.requiresSelectedChoice && abilityMeta.requiresSelectedChoice !== true) {
    findings.push(status('warning', 'CHOICE_NOT_MARKED', `${displayName} should be marked as requiring a selected choice.`, { name: displayName }));
  }

  if (classification === 'skill_challenge_metadata_only') {
    const rules = abilityMeta.skillChallengeRules ?? [];
    const mode = abilityMeta.mechanicsMode ?? '';
    const staticPolicy = abilityMeta.staticSheetPolicy ?? '';
    const ruleOk = Array.isArray(rules) && rules.some((rule) => rule.manualResolution === true);
    const modeOk = /manual|metadata/.test(String(mode));
    const sheetOk = /exclude|manual|punted/.test(String(staticPolicy));

    if (!ruleOk) {
      findings.push(status('warning', 'SKILL_CHALLENGE_RULE_MISSING', `${displayName} should carry manual skillChallengeRules metadata.`, { name: displayName }));
    }
    if (!modeOk || !sheetOk) {
      findings.push(status('warning', 'SKILL_CHALLENGE_STATIC_POLICY_DRIFT', `${displayName} should stay out of static actor math until the Skill Challenge subsystem exists.`, { name: displayName, mechanicsMode: mode, staticSheetPolicy: staticPolicy }));
    }
  }

  okCount += 1;
}

const goiCatalogFeats = catalog.filter((feat) => /galaxy of intrigue/i.test(String(feat.system?.source ?? feat.system?.sourcebook ?? '')));
const expectedNames = new Set(expected.map((entry) => String(entry.name).toLowerCase()));
const goiUnexpected = goiCatalogFeats
  .filter((feat) => !expectedNames.has(String(feat.name).toLowerCase()))
  .map((feat) => feat.name)
  .sort();

if (goiUnexpected.length > 0) {
  findings.push(status('warning', 'UNMANIFESTED_GOI_FEATS', 'Catalog contains Galaxy of Intrigue feats not listed in the Phase 3 manifest.', { names: goiUnexpected }));
}

const summary = {
  phase: manifest.phase,
  sourcebook: manifest.sourcebook,
  checkedAt: new Date().toISOString(),
  catalogFeatCount: catalog.length,
  packFeatCount: pack.length,
  expectedFeatCount: expected.length,
  presentExpectedFeatCount: okCount,
  galaxyOfIntrigueCatalogFeatCount: goiCatalogFeats.length,
  errorCount: findings.filter((item) => item.kind === 'error').length,
  warningCount: findings.filter((item) => item.kind === 'warning').length,
  okCount: okCount - findings.filter((item) => item.kind === 'error').length
};

const report = {
  summary,
  skillChallengeSubsystem: manifest.skillChallengeSubsystemRecommendation,
  skillChallengeFeatPolicy: manifest.skillChallengeFeatPolicy,
  findings
};

function toMarkdown(data) {
  const lines = [];
  lines.push('# Galaxy of Intrigue Feat Parity Report');
  lines.push('');
  lines.push(`Generated: ${data.summary.checkedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Sourcebook: ${data.summary.sourcebook}`);
  lines.push(`- Catalog feats: ${data.summary.catalogFeatCount}`);
  lines.push(`- Pack feats: ${data.summary.packFeatCount}`);
  lines.push(`- Expected Phase 3 feats: ${data.summary.expectedFeatCount}`);
  lines.push(`- Present expected feats: ${data.summary.presentExpectedFeatCount}`);
  lines.push(`- Galaxy of Intrigue catalog feats: ${data.summary.galaxyOfIntrigueCatalogFeatCount}`);
  lines.push(`- Errors: ${data.summary.errorCount}`);
  lines.push(`- Warnings: ${data.summary.warningCount}`);
  lines.push('');
  lines.push('## Skill Challenge policy');
  lines.push('');
  lines.push(`- Implementation status: ${data.skillChallengeFeatPolicy.implementationStatus}`);
  lines.push(`- Static sheet policy: ${data.skillChallengeFeatPolicy.staticSheetPolicy}`);
  lines.push(`- GM note: ${data.skillChallengeFeatPolicy.gmNote}`);
  lines.push('');
  lines.push('## Recommended subsystem slot');
  lines.push('');
  lines.push(`- MVP: ${data.skillChallengeSubsystem.minimumViableProduct}`);
  lines.push(`- Preferred slot: ${data.skillChallengeSubsystem.preferredSlot}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  if (data.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of data.findings) {
      lines.push(`- **${finding.kind.toUpperCase()} ${finding.code}:** ${finding.message}`);
      if (finding.context && Object.keys(finding.context).length > 0) {
        lines.push(`  - Context: ${JSON.stringify(finding.context)}`);
      }
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

if (WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_OUT, toMarkdown(report));
}

console.log(JSON.stringify(summary, null, 2));

if (STRICT && summary.errorCount > 0) {
  process.exitCode = 1;
}
