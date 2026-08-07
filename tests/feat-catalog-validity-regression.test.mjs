import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Regression guard for the feat-source-integrity work: known-invalid feat
// names (confirmed not-a-real-SWSE-feat / class-feature / talent-domain
// contaminant by data/feat-validity-registry.json) must never silently
// reappear in the canonical feat catalog or the generated compendium pack.
// See docs/audits/feat-inventory-history-reconciliation.md for how each
// name earned its status.

const catalogPath = fileURLToPath(new URL('../data/feat-catalog.json', import.meta.url));
const packPath = fileURLToPath(new URL('../packs/feats.db', import.meta.url));
const registryPath = fileURLToPath(new URL('../data/feat-validity-registry.json', import.meta.url));

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const packLines = readFileSync(packPath, 'utf8').split(/\r?\n/).filter((line) => line.trim().length > 0);
const packDocs = packLines.map((line) => JSON.parse(line));
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

const INVALID_STATUSES = new Set(['invalid_not_swse_feat', 'class_feature_not_feat', 'talent_domain_not_feat']);
const invalidNames = registry.entries
  .filter((entry) => INVALID_STATUSES.has(entry.status))
  .map((entry) => entry.name);

// Sanity: the registry itself must actually list the names this test
// exists to guard, so a wiped-out registry can't make this test vacuous.
assert.ok(invalidNames.length >= 13, `expected at least 13 invalid-status entries in the validity registry, found ${invalidNames.length}`);

const catalogNames = new Set(catalog.map((doc) => doc.name));
const packNames = new Set(packDocs.map((doc) => doc.name));

for (const name of invalidNames) {
  assert.ok(!catalogNames.has(name), `"${name}" is marked invalid in data/feat-validity-registry.json but is present in data/feat-catalog.json`);
  assert.ok(!packNames.has(name), `"${name}" is marked invalid in data/feat-validity-registry.json but is present in packs/feats.db`);
}

// Every catalog document must be a real feat record, not a stray
// non-feat/malformed entry.
for (const doc of catalog) {
  assert.equal(doc.type, 'feat', `catalog entry "${doc.name}" has type "${doc.type}", expected "feat"`);
  assert.ok(typeof doc._id === 'string' && doc._id.length > 0, `catalog entry "${doc.name}" is missing a string _id`);
}

// No duplicate ids or normalized names in the canonical catalog.
const ids = new Set();
for (const doc of catalog) {
  assert.ok(!ids.has(doc._id), `duplicate catalog _id: ${doc._id} (${doc.name})`);
  ids.add(doc._id);
}
const normalizedNames = new Set();
for (const doc of catalog) {
  const key = String(doc.name).trim().toLowerCase();
  assert.ok(!normalizedNames.has(key), `duplicate normalized catalog name: ${doc.name}`);
  normalizedNames.add(key);
}

console.log(`OK: ${invalidNames.length} known-invalid feat name(s) absent from catalog (${catalog.length} docs) and pack (${packDocs.length} docs); no duplicate ids/names; all records type "feat".`);
