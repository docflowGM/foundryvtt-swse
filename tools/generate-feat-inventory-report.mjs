#!/usr/bin/env node

/**
 * generate-feat-inventory-report.mjs — build the single reconciliation
 * artifact for the feats compendium: current commit, total unique feats,
 * per-feat id/name/source/page/status, and hashes of the catalog and pack
 * so other audits can consume one generated report instead of independently
 * re-counting files.
 *
 *   node tools/generate-feat-inventory-report.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

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

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogDocs = Array.isArray(catalog) ? catalog : catalog.documents;
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const statusByName = new Map();
for (const entry of registry.entries) {
  statusByName.set(entry.name.trim().toLowerCase(), entry);
}

const feats = catalogDocs.map((doc) => {
  const registryEntry = statusByName.get(String(doc.name ?? '').trim().toLowerCase());
  return {
    id: doc._id,
    name: doc.name,
    sourcebook: doc.system?.sourcebook ?? doc.system?.source ?? null,
    page: doc.system?.page ?? null,
    status: registryEntry ? registryEntry.status : registry.defaultStatusForUnlistedEntries,
  };
});

const invalidNames = new Set(
  [...statusByName.values()]
    .filter((entry) => entry.status === 'invalid_not_swse_feat' || entry.status === 'class_feature_not_feat')
    .map((entry) => entry.name)
);

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dir, entry.name));
}

// The strict validity audit is the *source* of the invalid-status
// adjudications, not a stale downstream reference to them — exclude it.
const SCAN_EXCLUSIONS = new Set([
  outJsonPath,
  path.join(repoRoot, 'docs', 'audits', 'strict-combat-bucket-feat-validity-audit-2026-07-03.json'),
]);

const scannedFiles = [...new Set(SCAN_DIRS.flatMap(listJsonFiles))]
  .filter((file) => !SCAN_EXCLUSIONS.has(file));

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
for (const feat of feats) statusCounts[feat.status] = (statusCounts[feat.status] ?? 0) + 1;

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  gitCommit: gitCommit(),
  purpose: 'Single reconciliation artifact for the feats compendium. Other feat audits should consume this report rather than independently counting files.',
  hashes: {
    catalog: { path: 'data/feat-catalog.json', sha256: sha256(catalogPath) },
    pack: { path: 'packs/feats.db', sha256: sha256(packPath) },
    validityRegistry: { path: 'data/feat-validity-registry.json', sha256: sha256(registryPath) },
  },
  totals: {
    catalogDocCount: catalogDocs.length,
    statusCounts,
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
      date: '2026-08-06',
      event: 'Diffed the orphaned packs/feat-catalog.db (413 docs, unreferenced by system.json) against packs/feats.db (401 docs) and found 12 fully-authored, legitimate core feats present in the orphaned file but absent from the shipped catalog/pack: Indomitable Will, Lucky Shot, Stunning Strike, Noble Fencing Style, Greater Weapon Specialization, Force Focus, Educated, Greater Weapon Focus, Weapon Specialization, Recall, Harm’s Way, Forceful Warrior. Restored all 12 into data/feat-catalog.json and rebuilt packs/feats.db (401 -> 413).',
    },
    {
      date: '2026-08-06',
      event: 'Open item: 414 -> 413 still leaves exactly one document unaccounted for. No file currently in the repository lists the full 414-document id/name set, so the identity of this last entry could not be recovered. Flagging here instead of guessing.',
    },
  ],
  knownInvalidEntries: [...statusByName.values()],
  staleReferencesToInvalidEntries: staleReferences,
  feats,
};

fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
fs.writeFileSync(outJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [];
lines.push('# Feat Inventory Report');
lines.push('');
lines.push(`Generated: ${report.generatedAt}`);
lines.push(`Git commit: ${report.gitCommit ?? 'unknown'}`);
lines.push('');
lines.push('## Hashes');
lines.push('');
lines.push(`- data/feat-catalog.json: \`${report.hashes.catalog.sha256}\``);
lines.push(`- packs/feats.db: \`${report.hashes.pack.sha256}\``);
lines.push(`- data/feat-validity-registry.json: \`${report.hashes.validityRegistry.sha256}\``);
lines.push('');
lines.push('## Totals');
lines.push('');
lines.push(`- Catalog documents: ${report.totals.catalogDocCount}`);
for (const [status, count] of Object.entries(statusCounts)) lines.push(`- ${status}: ${count}`);
lines.push('');
lines.push('## Removal and restoration history');
lines.push('');
for (const entry of report.removalAndRestorationHistory) lines.push(`- **${entry.date}**: ${entry.event}`);
lines.push('');
lines.push('## Known invalid / non-feat entries still shipped in the compendium');
lines.push('');
lines.push('These remain in `data/feat-catalog.json` / `packs/feats.db` as `type: "feat"` documents. They must not be treated as implementation-eligible feats.');
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
console.log(`Catalog docs: ${catalogDocs.length}. Stale invalid-entry references found: ${staleReferences.length}.`);
