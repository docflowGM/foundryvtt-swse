#!/usr/bin/env node

/**
 * audit-feat-inventory.mjs — deterministic current-state inventory of the
 * feats compendium: canonical catalog vs generated pack, per-feat source/
 * validity/prerequisite-authority coverage, and identity mismatches
 * (duplicates, drift, invalid contaminants). One reconciliation artifact
 * other feat audits should consume instead of independently counting files.
 *
 *   node tools/audit-feat-inventory.mjs            # write the report
 *   node tools/audit-feat-inventory.mjs --strict    # also fail (exit 1) on
 *                                                    # hard integrity issues
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FEAT_PREREQUISITE_AUTHORITY, normalizeAuthorityKey } from '../scripts/data/authority/feat-prerequisite-authority.js';
import { normalizeContentName } from '../scripts/data/feat-domain-guard.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const catalogPath = path.join(repoRoot, 'data', 'feat-catalog.json');
const packPath = path.join(repoRoot, 'packs', 'feats.db');
const registryPath = path.join(repoRoot, 'data', 'feat-validity-registry.json');
const outJsonPath = path.join(repoRoot, 'docs', 'audits', 'generated', 'feat-inventory-report.json');
const outMdPath = path.join(repoRoot, 'docs', 'audits', 'generated', 'feat-inventory-report.md');

// Directories scanned for stale references to invalid-status feat names in
// implementation queues (highPriority/reviewQueue/backlog entries, etc.).
const SCAN_DIRS = [
  path.join(repoRoot, 'docs', 'audits'),
  path.join(repoRoot, 'docs', 'audits', 'generated'),
  path.join(repoRoot, 'data', 'feat-implementation'),
];
// The strict validity audit is the *source* of the invalid-status
// adjudications, not a stale downstream reference to them — exclude it.
const SCAN_EXCLUSIONS = new Set([
  outJsonPath,
  path.join(repoRoot, 'docs', 'audits', 'strict-combat-bucket-feat-validity-audit-2026-07-03.json'),
]);

const INVALID_STATUSES = new Set(['invalid_not_swse_feat', 'class_feature_not_feat', 'talent_domain_not_feat']);

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim();
  } catch {
    return null;
  }
}

function readCatalog() {
  const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.documents) ? parsed.documents : [];
}

function readPackLines() {
  if (!fs.existsSync(packPath)) return [];
  return fs.readFileSync(packPath, 'utf8').split(/\r?\n/).filter((line) => line.trim().length > 0);
}

const catalogDocs = readCatalog();
const packLines = readPackLines();
const packDocsById = new Map();
for (const line of packLines) {
  try {
    const doc = JSON.parse(line);
    if (doc?._id) packDocsById.set(doc._id, { doc, raw: line });
  } catch {
    // malformed lines surface via mismatches.contentDrift below (count mismatch)
  }
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const registryByName = new Map();
for (const entry of registry.entries) registryByName.set(entry.name.trim().toLowerCase(), entry);

function authorityHasFeat(name, slug) {
  const bySlug = slug ? FEAT_PREREQUISITE_AUTHORITY[normalizeAuthorityKey(slug)] : undefined;
  if (bySlug) return true;
  const byName = FEAT_PREREQUISITE_AUTHORITY[normalizeAuthorityKey(name)];
  return Boolean(byName);
}

// --- identity mismatches -----------------------------------------------
const seenIds = new Map();
const seenNames = new Map();
const duplicateIds = [];
const duplicateNames = [];
const nonFeatRecords = [];

for (const [index, doc] of catalogDocs.entries()) {
  if (doc?.type !== 'feat') nonFeatRecords.push({ index, id: doc?._id ?? null, name: doc?.name ?? null, type: doc?.type ?? null });
  if (typeof doc?._id === 'string' && doc._id) {
    if (seenIds.has(doc._id)) duplicateIds.push(doc._id);
    else seenIds.set(doc._id, index);
  }
  const normalizedName = normalizeContentName(doc?.name);
  if (normalizedName) {
    if (seenNames.has(normalizedName)) duplicateNames.push(doc.name);
    else seenNames.set(normalizedName, index);
  }
}

const missingFromPack = [...seenIds.keys()].filter((id) => !packDocsById.has(id));
const missingFromCatalog = [...packDocsById.keys()].filter((id) => !seenIds.has(id));
const contentDrift = [];
for (const doc of catalogDocs) {
  const id = doc?._id;
  if (typeof id !== 'string' || !packDocsById.has(id)) continue;
  const expected = JSON.stringify(doc);
  const actual = packDocsById.get(id).raw;
  if (expected !== actual) contentDrift.push(id);
}

const invalidEntriesPresent = catalogDocs
  .filter((doc) => {
    const entry = registryByName.get(String(doc?.name ?? '').trim().toLowerCase());
    return entry && INVALID_STATUSES.has(entry.status);
  })
  .map((doc) => doc.name);

const sourceConflicts = [...registryByName.values()]
  .filter((entry) => entry.status === 'source_conflict')
  .map((entry) => entry.name);

// Sourcebooks cited by catalog entries that are not part of this task's
// available source set (no PDF/text for either exists anywhere in this
// repo or session — confirmed by a filesystem search). Per Phase 10 of the
// feat-integrity task: do not claim verification against a book nobody
// checked this session, even if a prior session's audit did have access to
// it. This does not mean the citation is wrong — only that it is unverified
// here.
const UNAVAILABLE_SOURCEBOOKS = new Set([
  'Legacy Era Campaign Guide',
  'Rebellion Era Campaign Guide',
]);

// --- per-feat inventory ---------------------------------------------------
const inventory = catalogDocs.map((doc) => {
  const registryEntry = registryByName.get(String(doc?.name ?? '').trim().toLowerCase());
  const validity = registryEntry ? registryEntry.status : (registry.defaultStatusForUnlistedEntries ?? 'unclassified');
  const sourcebook = doc.system?.sourcebook ?? doc.system?.source ?? null;
  let sourceConfidence;
  if (validity === 'source_unavailable') sourceConfidence = 'source_unavailable';
  else if (validity === 'source_conflict') sourceConfidence = 'source_conflict';
  else if (sourcebook && UNAVAILABLE_SOURCEBOOKS.has(sourcebook)) sourceConfidence = 'source_unavailable';
  else if (sourcebook) sourceConfidence = 'verified_repository_authority';
  else sourceConfidence = 'source_unknown';

  return {
    id: doc._id ?? null,
    name: doc.name ?? null,
    slug: doc.system?.slug ?? null,
    source: sourcebook,
    page: doc.system?.page ?? null,
    sourceConfidence,
    validity,
    catalogPresent: true,
    packPresent: typeof doc._id === 'string' && packDocsById.has(doc._id),
    prerequisiteAuthorityPresent: authorityHasFeat(doc.name, doc.system?.slug),
  };
});

// --- stale references to invalid entries in other generated reports -------
const invalidNames = new Set(
  [...registryByName.values()].filter((e) => INVALID_STATUSES.has(e.status)).map((e) => e.name)
);

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dir, entry.name));
}

const scannedFiles = [...new Set(SCAN_DIRS.flatMap(listJsonFiles))].filter((file) => !SCAN_EXCLUSIONS.has(file));
const staleReferences = [];
for (const file of scannedFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const name of invalidNames) {
    const needle = `"${name}"`;
    if (text.includes(needle)) {
      const occurrences = text.split(needle).length - 1;
      staleReferences.push({ file: path.relative(repoRoot, file), name, occurrences });
    }
  }
}
staleReferences.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));

const statusCounts = {};
for (const item of inventory) statusCounts[item.validity] = (statusCounts[item.validity] ?? 0) + 1;
const sourceConfidenceCounts = {};
for (const item of inventory) sourceConfidenceCounts[item.sourceConfidence] = (sourceConfidenceCounts[item.sourceConfidence] ?? 0) + 1;

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  gitCommit: gitCommit(),
  canonicalSource: 'data/feat-catalog.json',
  catalog: { path: 'data/feat-catalog.json', count: catalogDocs.length, hash: sha256(catalogPath) },
  packSource: { path: 'packs/feats.db', count: packLines.length, hash: fs.existsSync(packPath) ? sha256(packPath) : null },
  totals: { statusCounts, sourceConfidenceCounts, prerequisiteAuthorityCoverage: inventory.filter((i) => i.prerequisiteAuthorityPresent).length },
  mismatches: {
    missingFromCatalog,
    missingFromPack,
    duplicateIds,
    duplicateNames,
    contentDrift,
    invalidEntriesPresent,
    sourceConflicts,
    nonFeatRecords,
  },
  removalAndRestorationHistory: [
    {
      date: '2026-06-10',
      event: 'feat-pack-sanitization pass reported 414 feat documents (docs/audits/feat-pack-sanitization-report.json).',
    },
    {
      date: '2026-06-30',
      event: '414 -> 401. Both packs/feats.db and data/feat-catalog.json were at 401 documents per docs/audits/feat-source-parity-phase-1-implementation-prompt.md. No reconciliation artifact in the repository recorded which ~13 documents were dropped or why.',
    },
    {
      date: '2026-08-06 (superseded same day, see below)',
      event: 'A first pass diffed the orphaned packs/feat-catalog.db (413 docs, unreferenced by system.json) against packs/feats.db (401 docs), found 12 records present in the orphan file but absent from the shipped catalog/pack, and incorrectly merged them back into data/feat-catalog.json as if they were lost content (401 -> 413). This was wrong and was reverted the same day — see the next entry.',
    },
    {
      date: '2026-08-06',
      event: 'Correction: scripts/data/feat-domain-guard.js (TALENT_ONLY_FEAT_CONTAMINANTS, already present on main before this investigation) documents that those exact 12 names — Indomitable Will, Lucky Shot, Stunning Strike, Noble Fencing Style, Greater Weapon Specialization, Force Focus, Educated, Greater Weapon Focus, Weapon Specialization, Recall, Harm’s Way, Forceful Warrior — are real SWSE talents that were scraped into the feat catalog as fabricated feat records with invented mechanical text, and are deliberately filtered out of feat enumeration by three runtime call sites (feat-registry.js, feature-index.js, feat-pack-seeder.js). packs/feat-catalog.db is leftover pre-cleanup scaffolding, not a source of lost content. The 401 -> 413 merge was reverted; data/feat-catalog.json and packs/feats.db are back to the same 401 documents as origin/main. These 12 names (plus a 13th, Redirect Shot, also in the guard’s deny list but never present in the catalog) are now recorded in data/feat-validity-registry.json with status talent_domain_not_feat.',
    },
    {
      date: '2026-08-06',
      event: 'Full reconciliation of 414 -> 401: scripts/data/feat-domain-guard.js TALENT_ONLY_FEAT_CONTAMINANTS lists exactly 13 names. 414 - 13 = 401, an exact match. The two-step history is consistent with the evidence still on disk: 414 (2026-06-10 sanitization) -> 413 (packs/feat-catalog.db, which is missing only "Redirect Shot" of the 13 contaminants: 414 - 1 = 413) -> 401 (current data/feat-catalog.json, which is additionally missing the other 12 contaminants found in the packs/feat-catalog.db diff: 413 - 12 = 401). Treated as a fully reconciled count transition. See docs/audits/feat-inventory-history-reconciliation.md.',
    },
    {
      date: '2026-08-06',
      event: '401 -> 390: removed the 11 entries confirmed invalid_not_swse_feat / class_feature_not_feat by docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json (Spring Attack, Reckless Charge, Wounding Strike, Friendly Fire Avoidance, Heroic Surge, Grappling Strike, Improved Knock Prone, Knock Prone, Hew, Improved Stun, Delay Damage) from data/feat-catalog.json and rebuilt packs/feats.db. Verified no other catalog entry cites any of these 11 in its prerequisite text before removal. This is a canonical-content change, not just a report-filtering change — see Phase 6 of the feat-integrity task.',
    },
  ],
  knownInvalidEntries: [...registryByName.values()],
  staleReferencesToInvalidEntries: staleReferences,
  inventory,
};

fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
fs.writeFileSync(outJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [];
lines.push('# Feat Inventory Report');
lines.push('');
lines.push('_Generated by `tools/audit-feat-inventory.mjs`. Do not hand-edit — regenerate instead. This report is self-identifying (timestamp + git commit + hashes below) so it cannot be mistaken for an older historical audit._');
lines.push('');
lines.push(`Generated: ${report.generatedAt}`);
lines.push(`Git commit: ${report.gitCommit ?? 'unknown'}`);
lines.push('');
lines.push('## Hashes');
lines.push('');
lines.push(`- data/feat-catalog.json: \`${report.catalog.hash}\``);
lines.push(`- packs/feats.db: \`${report.packSource.hash ?? 'MISSING'}\``);
lines.push(`- data/feat-validity-registry.json: \`${sha256(registryPath)}\``);
lines.push('');
lines.push('## Totals');
lines.push('');
lines.push(`- Catalog documents: ${report.catalog.count}`);
lines.push(`- Pack documents: ${report.packSource.count}`);
lines.push(`- Feats with prerequisite-authority coverage: ${report.totals.prerequisiteAuthorityCoverage} / ${report.catalog.count}`);
for (const [status, count] of Object.entries(statusCounts)) lines.push(`- validity ${status}: ${count}`);
for (const [conf, count] of Object.entries(sourceConfidenceCounts)) lines.push(`- source confidence ${conf}: ${count}`);
lines.push('');
lines.push('## Mismatches');
lines.push('');
lines.push(`- Missing from pack: ${missingFromPack.length}`);
lines.push(`- Missing from catalog (extra in pack): ${missingFromCatalog.length}`);
lines.push(`- Duplicate IDs: ${duplicateIds.length}`);
lines.push(`- Duplicate normalized names: ${duplicateNames.length}`);
lines.push(`- Content drift (catalog vs pack): ${contentDrift.length}`);
lines.push(`- Invalid entries present in catalog: ${invalidEntriesPresent.length}${invalidEntriesPresent.length ? ` (${invalidEntriesPresent.join(', ')})` : ''}`);
lines.push(`- Source conflicts: ${sourceConflicts.length}`);
lines.push(`- Non-feat records in catalog: ${nonFeatRecords.length}`);
lines.push('');
lines.push('## Removal and restoration history');
lines.push('');
for (const entry of report.removalAndRestorationHistory) lines.push(`- **${entry.date}**: ${entry.event}`);
lines.push('');
lines.push('## Known invalid / non-feat name authority (data/feat-validity-registry.json)');
lines.push('');
for (const entry of report.knownInvalidEntries) lines.push(`- **${entry.name}** — \`${entry.status}\` (${entry.source})`);
lines.push('');
lines.push('## Stale references to invalid entries in generated reports/backlogs');
lines.push('');
if (staleReferences.length === 0) {
  lines.push('_None found in the scanned directories._');
} else {
  for (const ref of staleReferences) lines.push(`- \`${ref.file}\`: "${ref.name}" (${ref.occurrences} occurrence${ref.occurrences === 1 ? '' : 's'})`);
}
lines.push('');

fs.writeFileSync(outMdPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Wrote ${path.relative(repoRoot, outJsonPath)} and ${path.relative(repoRoot, outMdPath)}.`);
console.log(`Catalog: ${report.catalog.count} docs. Pack: ${report.packSource.count} docs. Stale invalid-entry references: ${staleReferences.length}.`);

if (process.argv.includes('--strict')) {
  const hardFailures = [];
  if (catalogDocs.length === 0) hardFailures.push('canonical catalog is empty');
  if (duplicateIds.length) hardFailures.push(`${duplicateIds.length} duplicate ID(s)`);
  if (duplicateNames.length) hardFailures.push(`${duplicateNames.length} duplicate normalized name(s)`);
  if (nonFeatRecords.length) hardFailures.push(`${nonFeatRecords.length} non-feat record(s) in the catalog`);
  if (invalidEntriesPresent.length) hardFailures.push(`${invalidEntriesPresent.length} known-invalid feat(s) present in the catalog: ${invalidEntriesPresent.join(', ')}`);
  if (missingFromPack.length) hardFailures.push(`${missingFromPack.length} catalog id(s) missing from packs/feats.db`);
  if (missingFromCatalog.length) hardFailures.push(`${missingFromCatalog.length} pack id(s) missing from data/feat-catalog.json`);
  if (contentDrift.length) hardFailures.push(`${contentDrift.length} id(s) with catalog/pack content drift`);

  if (hardFailures.length) {
    console.error('FAIL (--strict): ' + hardFailures.join('; '));
    process.exit(1);
  }
  console.log('--strict: no hard integrity failures.');
}
