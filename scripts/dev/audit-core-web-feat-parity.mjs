#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'data', 'feat-source-parity', 'core-web-feat-parity-manifest.json');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'generated');
const JSON_OUT = path.join(OUT_DIR, 'core-web-feat-parity-report.json');
const MD_OUT = path.join(OUT_DIR, 'core-web-feat-parity-report.md');

const args = new Set(process.argv.slice(2));
const FAIL_ON_MISSING = args.has('--fail-on-missing');
const FAIL_ON_EMPTY = args.has('--fail-on-empty');
const STRICT = args.has('--strict');

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const text = fs.readFileSync(filePath, 'utf8').trim();
    if (!text) return fallback;
    return JSON.parse(text);
  } catch (err) {
    return { __error: String(err?.message ?? err) };
  }
}

function readText(filePath) {
  try {
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function compact(value) {
  return String(value ?? '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
}

function flattenObject(value, prefix = '', out = {}) {
  if (value === null || value === undefined) return out;
  if (typeof value !== 'object') {
    out[prefix] = value;
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => flattenObject(entry, `${prefix}[${index}]`, out));
    return out;
  }
  for (const [key, entry] of Object.entries(value)) {
    flattenObject(entry, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function parseJsonLines(filePath) {
  const text = readText(filePath).trim();
  if (!text) return [];
  const docs = [];
  const errors = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      docs.push(JSON.parse(line));
    } catch (err) {
      errors.push({ line: index + 1, error: String(err?.message ?? err) });
    }
  }
  if (errors.length) docs.__errors = errors;
  return docs;
}

function asArrayFromCatalog(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.feats)) return value.feats;
  if (Array.isArray(value.items)) return value.items;
  if (value.__error) return [];
  return Object.values(value).filter((entry) => entry && typeof entry === 'object');
}

function getName(doc) {
  return doc?.name ?? doc?.title ?? doc?.system?.name ?? doc?.data?.name ?? '';
}

function getSystem(doc) {
  return doc?.system ?? doc?.data?.data ?? doc?.data ?? {};
}

function searchableText(doc) {
  const flat = flattenObject(doc);
  return Object.entries(flat)
    .filter(([key]) => !/img|image|icon|uuid|_id/i.test(key))
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('\n')
    .toLowerCase();
}

function hasAnyText(doc, patterns) {
  const haystack = searchableText(doc);
  return patterns.some((pattern) => haystack.includes(pattern.toLowerCase()));
}

function loadFeatDocs() {
  const packPath = path.join(ROOT, 'packs', 'feats.db');
  const catalogPath = path.join(ROOT, 'data', 'feat-catalog.json');
  const effectPath = path.join(ROOT, 'data', 'feat-effects.json');
  const prereqAuthorityPath = path.join(ROOT, 'scripts', 'data', 'authority', 'feat-prerequisite-authority.js');

  const packDocs = parseJsonLines(packPath);
  const catalog = readJson(catalogPath, null);
  const catalogDocs = asArrayFromCatalog(catalog);
  const effectCatalog = readJson(effectPath, null);
  const prereqAuthorityText = readText(prereqAuthorityPath);

  const docs = [...packDocs, ...catalogDocs].filter(Boolean);
  const byName = new Map();
  for (const doc of docs) {
    const name = getName(doc);
    if (!name) continue;
    const key = normalizeName(name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(doc);
  }

  return {
    packPath,
    catalogPath,
    effectPath,
    prereqAuthorityPath,
    packDocs,
    catalogDocs,
    effectCatalog,
    prereqAuthorityText,
    docs,
    byName
  };
}

function buildSearchIndex(docs) {
  const seen = new Map();
  for (const doc of docs) {
    const name = getName(doc);
    if (!name) continue;
    const system = getSystem(doc);
    const source = system.source ?? system.sourcebook ?? '';
    const key = `${normalizeName(name)}::${normalizeName(source)}`;
    if (!seen.has(key)) seen.set(key, doc);
  }

  return [...seen.values()].map((doc) => ({
    name: getName(doc),
    key: normalizeName(getName(doc)),
    compact: compact(getName(doc)),
    text: searchableText(doc),
    doc
  }));
}

function findDocsForEntry(entry, index) {
  const names = [entry.name, ...(entry.aliases ?? [])].filter(Boolean);
  const normalizedNames = new Set(names.map(normalizeName));
  const compactNames = new Set(names.map(compact));
  const matches = index.filter((candidate) => normalizedNames.has(candidate.key) || compactNames.has(candidate.compact));
  if (matches.length) return matches;

  const familyName = normalizeName(entry.name);
  if (entry.requiredScopes || entry.requiredTiers) {
    return index.filter((candidate) => {
      if (!candidate.key.startsWith(familyName)) return false;
      const scopes = [...(entry.requiredScopes ?? []), ...(entry.requiredTiers ?? [])].map(normalizeName);
      return scopes.some((scope) => candidate.key.includes(scope));
    });
  }

  return [];
}

function inferChoiceSupport(entry, matches) {
  if (!entry.requiredScopeKind && !entry.requiredScopes && !entry.requiredTiers) return { required: false, ok: true, evidence: [] };
  const evidence = [];
  const directScopedDocs = matches.filter((m) => m.key !== normalizeName(entry.name));
  if (directScopedDocs.length) evidence.push(`${directScopedDocs.length} scoped/tiered docs`);

  const choicePatterns = ['choice', 'scope', 'selected', 'selection', 'weapon group', 'weapongroup', 'skill', 'category', 'subtype'];
  const docsWithChoiceText = matches.filter((m) => choicePatterns.some((p) => m.text.includes(p)));
  if (docsWithChoiceText.length) evidence.push(`${docsWithChoiceText.length} docs mention choice/scope fields`);

  return {
    required: true,
    ok: directScopedDocs.length > 0 || docsWithChoiceText.length > 0,
    evidence
  };
}

function inferPrereqSupport(entry, matches, prereqAuthorityText) {
  const checkKeys = Object.keys(entry.checks ?? {});
  const prereqCheckKeys = checkKeys.filter((key) => /require|prereq|trained|bab|strength|dexterity|forceSensitivity|pin|doubleAttack|proficiency/i.test(key));
  if (!prereqCheckKeys.length) return { required: false, ok: true, evidence: [] };

  const evidence = [];
  const docPrereqPatterns = ['prereq', 'prerequisite', 'base attack', 'bab', 'trained', 'strength', 'dexterity', 'force sensitivity', 'weapon proficiency', 'pin', 'double attack'];
  const docsWithPrereqs = matches.filter((m) => docPrereqPatterns.some((p) => m.text.includes(p)));
  if (docsWithPrereqs.length) evidence.push(`${docsWithPrereqs.length} matched docs contain prerequisite-like text`);

  const authorityHit = prereqAuthorityText && [entry.name, ...(entry.aliases ?? [])].some((name) => prereqAuthorityText.toLowerCase().includes(String(name).toLowerCase()));
  if (authorityHit) evidence.push('feat-prerequisite-authority.js contains this feat/family name');

  return {
    required: true,
    ok: docsWithPrereqs.length > 0 || Boolean(authorityHit),
    evidence
  };
}

function inferEffectSupport(entry, matches, effectCatalog) {
  const classes = new Set(entry.implementationClass ?? []);
  const needsAutomation = ['passiveActorMath', 'passiveRollMath', 'activeCombatOption'].some((klass) => classes.has(klass));
  if (!needsAutomation) return { required: false, ok: true, evidence: [] };

  const effectText = JSON.stringify(effectCatalog ?? {}).toLowerCase();
  const names = [entry.name, ...(entry.aliases ?? [])].filter(Boolean);
  const effectHit = effectText && names.some((name) => effectText.includes(String(name).toLowerCase()));

  const docEffectPatterns = ['effect', 'bonus', 'attack', 'damage', 'defense', 'threshold', 'hit point', 'force point', 'initiative', 'proficiency'];
  const docsWithEffects = matches.filter((m) => docEffectPatterns.some((p) => m.text.includes(p)));
  const evidence = [];
  if (effectHit) evidence.push('data/feat-effects.json contains this feat/family name');
  if (docsWithEffects.length) evidence.push(`${docsWithEffects.length} matched docs contain automation-relevant text`);

  return {
    required: true,
    ok: Boolean(effectHit) || docsWithEffects.length > 0,
    evidence
  };
}

function classifySeverity(entry, presence, choice, prereq, effect) {
  if (!presence.ok) return 'error';
  if (!choice.ok || !prereq.ok) return 'warning';
  const classes = new Set(entry.implementationClass ?? []);
  if ((classes.has('passiveActorMath') || classes.has('passiveRollMath') || classes.has('activeCombatOption')) && !effect.ok) return 'warning';
  return 'ok';
}

function auditEntry(entry, kind, index, featData) {
  const matches = findDocsForEntry(entry, index);
  const presence = {
    ok: matches.length > 0,
    count: matches.length,
    matchedNames: [...new Set(matches.map((m) => m.name).filter(Boolean))].sort()
  };
  const choice = inferChoiceSupport(entry, matches);
  const prereq = inferPrereqSupport(entry, matches, featData.prereqAuthorityText);
  const effect = inferEffectSupport(entry, matches, featData.effectCatalog);
  const severity = classifySeverity(entry, presence, choice, prereq, effect);

  return {
    kind,
    id: entry.id ?? compact(entry.name),
    name: entry.name,
    source: entry.source,
    implementationClass: entry.implementationClass ?? [],
    presence,
    choice,
    prereq,
    effect,
    checks: entry.checks ?? {},
    severity
  };
}

function summarize(results, featData, manifest) {
  const counts = results.reduce((acc, entry) => {
    acc[entry.severity] = (acc[entry.severity] ?? 0) + 1;
    return acc;
  }, { ok: 0, warning: 0, error: 0 });

  return {
    generatedAt: new Date().toISOString(),
    phase: manifest.phase,
    scope: manifest.scope,
    inputs: {
      manifestPath: path.relative(ROOT, MANIFEST_PATH),
      packPath: path.relative(ROOT, featData.packPath),
      catalogPath: path.relative(ROOT, featData.catalogPath),
      effectPath: path.relative(ROOT, featData.effectPath),
      prereqAuthorityPath: path.relative(ROOT, featData.prereqAuthorityPath),
      packDocCount: featData.packDocs.length,
      catalogDocCount: featData.catalogDocs.length,
      combinedNamedDocCount: featData.docs.filter((doc) => getName(doc)).length,
      uniqueNamedDocCount: buildSearchIndex(featData.docs).length,
      hasFeatEffects: Boolean(featData.effectCatalog && !featData.effectCatalog.__error),
      hasPrereqAuthority: featData.prereqAuthorityText.length > 0
    },
    exclusions: manifest.exclusions ?? [],
    counts,
    results
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Core/Web Feat Parity Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push(`Scope: ${report.scope}`);
  lines.push('');
  lines.push('## Inputs');
  lines.push('');
  for (const [key, value] of Object.entries(report.inputs)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  if (Array.isArray(report.exclusions) && report.exclusions.length) {
    lines.push('## Explicit exclusions');
    lines.push('');
    for (const exclusion of report.exclusions) {
      lines.push(`- ${exclusion.name}: ${exclusion.reason}`);
    }
    lines.push('');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push(`- OK: ${report.counts.ok ?? 0}`);
  lines.push(`- Warnings: ${report.counts.warning ?? 0}`);
  lines.push(`- Errors: ${report.counts.error ?? 0}`);
  lines.push('');

  const sections = [
    ['Errors', report.results.filter((entry) => entry.severity === 'error')],
    ['Warnings', report.results.filter((entry) => entry.severity === 'warning')],
    ['OK', report.results.filter((entry) => entry.severity === 'ok')]
  ];

  for (const [title, entries] of sections) {
    lines.push(`## ${title}`);
    lines.push('');
    if (!entries.length) {
      lines.push('_None._');
      lines.push('');
      continue;
    }
    for (const entry of entries) {
      lines.push(`### ${entry.name}`);
      lines.push('');
      lines.push(`- Kind: ${entry.kind}`);
      lines.push(`- Source: ${entry.source}`);
      lines.push(`- Implementation class: ${entry.implementationClass.join(', ') || 'none'}`);
      lines.push(`- Presence: ${entry.presence.ok ? 'found' : 'missing'} (${entry.presence.count})`);
      if (entry.presence.matchedNames.length) lines.push(`- Matched docs: ${entry.presence.matchedNames.join('; ')}`);
      if (entry.choice.required) lines.push(`- Scoped choice support: ${entry.choice.ok ? 'ok' : 'needs review'}${entry.choice.evidence.length ? ` (${entry.choice.evidence.join('; ')})` : ''}`);
      if (entry.prereq.required) lines.push(`- Prerequisite support: ${entry.prereq.ok ? 'ok' : 'needs review'}${entry.prereq.evidence.length ? ` (${entry.prereq.evidence.join('; ')})` : ''}`);
      if (entry.effect.required) lines.push(`- Effect/action support: ${entry.effect.ok ? 'candidate found' : 'needs implementation review'}${entry.effect.evidence.length ? ` (${entry.effect.evidence.join('; ')})` : ''}`);
      lines.push('');
    }
  }

  lines.push('## Recommended next actions');
  lines.push('');
  lines.push('1. If packDocCount and catalogDocCount are both zero, stop and repair Phase 0 data source drift before changing feat rules.');
  lines.push('2. Fix every missing core/Web Enhancement feat or family before expanding to later sourcebooks, but do not add excluded non-feats just to satisfy a stale checklist.');
  lines.push('3. For scoped feats, prefer one canonical family document with explicit choice metadata or clearly linked scoped documents. Do not silently grant every scope.');
  lines.push('4. For manualWorkflow feats, surface an explicit sheet/detail-rail warning rather than fake automation.');
  lines.push('5. For passive/active feats, make the sheet breakdown use the same calculation path as the final roll or derived stat.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const manifest = readJson(MANIFEST_PATH, null);
  if (!manifest || manifest.__error) {
    console.error(`Unable to read manifest at ${MANIFEST_PATH}: ${manifest?.__error ?? 'missing file'}`);
    process.exit(2);
  }

  const featData = loadFeatDocs();
  const index = buildSearchIndex(featData.docs);
  const entries = [
    ...(manifest.families ?? []).map((entry) => ({ ...entry, __kind: 'family' })),
    ...(manifest.singleFeats ?? []).map((entry) => ({ ...entry, __kind: 'single' }))
  ];
  const results = entries.map((entry) => auditEntry(entry, entry.__kind, index, featData));
  const report = summarize(results, featData, manifest);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_OUT, renderMarkdown(report));

  console.log(`Wrote ${path.relative(ROOT, JSON_OUT)}`);
  console.log(`Wrote ${path.relative(ROOT, MD_OUT)}`);
  console.log(`Core/Web feat parity: ${report.counts.ok ?? 0} ok, ${report.counts.warning ?? 0} warnings, ${report.counts.error ?? 0} errors`);

  const emptyData = report.inputs.packDocCount === 0 && report.inputs.catalogDocCount === 0;
  if ((FAIL_ON_EMPTY && emptyData) || (FAIL_ON_MISSING && (report.counts.error ?? 0) > 0) || (STRICT && ((report.counts.error ?? 0) > 0 || (report.counts.warning ?? 0) > 0))) {
    process.exit(1);
  }
}

main();
