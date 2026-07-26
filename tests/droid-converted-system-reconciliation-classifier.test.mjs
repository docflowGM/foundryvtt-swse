import assert from 'node:assert/strict';
import {
  RECONCILIATION_CLASSIFICATION,
  classifyStockSystemEntry,
  classifyStockSystemSources,
  annotateWeaponCandidatesAgainstExistingItems
} from '../scripts/domain/droids/droid-converted-system-reconciliation-classifier.js';

// PHASE 4 — Converted-System Reconciliation. Pure classification logic
// that decides whether a stock-imported droid's published system.droidSystems
// source record can be safely, automatically mapped onto the canonical
// Phase 1 part registry, or whether it needs explicit human review — see
// docs/audits/droid-converted-system-reconciliation-phase-4.md's
// "Reconciliation contract" section for the full policy this implements.

const DEFS = [
  { id: 'heuristic-processor', name: 'Heuristic Processor', category: 'processor' },
  { id: 'basic-processor', name: 'Basic Processor', category: 'processor' },
  { id: 'military-processor', name: 'Military Processor', category: 'processor' },
  { id: 'improved-sensor-package', name: 'Improved Sensor Package', category: 'sensor' },
  { id: 'darkvision', name: 'Darkvision', category: 'sensor' }
];

function normalizeId(v) {
  return String(v ?? '').trim().toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getDefinition(id) {
  return DEFS.find(d => d.id === id) ?? null;
}

function ctx(existingLedger = {}) {
  return { normalizeId, getDefinition, allDefinitions: DEFS, existingLedger };
}

// Test 1: exact canonical id match.
{
  const result = classifyStockSystemEntry({ id: 'darkvision', name: 'Darkvision' }, ctx());
  assert.equal(result.classification, RECONCILIATION_CLASSIFICATION.CANONICAL_MATCH);
  assert.equal(result.canonicalId, 'darkvision');
  assert.equal(result.confidence, 1);
  assert.equal(result.selectedByDefault, true);
}

// Test 2: alias match (name-only, no id field, resolves directly).
{
  const result = classifyStockSystemEntry({ name: 'Improved Sensor Package' }, ctx());
  assert.equal(result.classification, RECONCILIATION_CLASSIFICATION.ALIAS_MATCH);
  assert.equal(result.canonicalId, 'improved-sensor-package');
  assert.equal(result.confidence, 0.85);
  assert.equal(result.selectedByDefault, true);
}

// Test 3: name-only ambiguous match — fuzzy-matches multiple canonical parts.
{
  const result = classifyStockSystemEntry({ name: 'processor' }, ctx());
  assert.equal(result.classification, RECONCILIATION_CLASSIFICATION.AMBIGUOUS_MATCH);
  assert.equal(result.selectedByDefault, false);
  assert.ok(result.reasons[0].includes('fuzzy-matches'));
}

// Test 4: descriptive-only source entry — no id/name match, has narrative text.
{
  const result = classifyStockSystemEntry({ name: 'Reinforced Hull Plating', sourceText: 'unusually thick reinforced plating along the hull' }, ctx());
  assert.equal(result.classification, RECONCILIATION_CLASSIFICATION.DESCRIPTIVE_ONLY);
  assert.equal(result.canonicalId, null);
  assert.equal(result.selectedByDefault, false);
}

// Test 5: unsupported entry — empty/malformed record.
{
  assert.equal(classifyStockSystemEntry({}, ctx()).classification, RECONCILIATION_CLASSIFICATION.UNSUPPORTED);
  assert.equal(classifyStockSystemEntry(null, ctx()).classification, RECONCILIATION_CLASSIFICATION.UNSUPPORTED);
  assert.equal(classifyStockSystemEntry(undefined, ctx()).classification, RECONCILIATION_CLASSIFICATION.UNSUPPORTED);
}

// Test 6: already-canonical entry — matches an existing ledger entry that
// is itself a reconciled stock-import component (not a post-import addition).
{
  const existingLedger = { darkvision: { provenance: { origin: 'stock-import', bakedIntoPublishedTotals: true } } };
  const result = classifyStockSystemEntry({ id: 'darkvision' }, ctx(existingLedger));
  assert.equal(result.classification, RECONCILIATION_CLASSIFICATION.ALREADY_CANONICAL);
  assert.equal(result.alreadyInstalled, true);
  assert.equal(result.selectedByDefault, false);
}

// Test 7: existing post-import modification — matches an existing ledger
// entry added by ordinary Garage/Workshop customization, not reconciliation.
{
  const existingLedger = { darkvision: { provenance: { origin: 'post-import-customization', bakedIntoPublishedTotals: false } } };
  const result = classifyStockSystemEntry({ id: 'darkvision' }, ctx(existingLedger));
  assert.equal(result.classification, RECONCILIATION_CLASSIFICATION.POST_IMPORT_MODIFICATION);
  assert.equal(result.alreadyInstalled, true);
  assert.equal(result.bakedIntoPublishedTotals, false);
}

// Test 8: duplicate source records collapse into one candidate.
{
  const sources = classifyStockSystemSources([
    { sourcePath: 'system.droidSystems.sensors.0', entry: { id: 'darkvision' } },
    { sourcePath: 'system.droidSystems.integratedSystems.2', entry: { id: 'darkvision' } }
  ], ctx());
  assert.equal(sources.length, 1);
  assert.deepEqual(sources[0].sourcePaths, ['system.droidSystems.sensors.0', 'system.droidSystems.integratedSystems.2']);
}

// Test 9: classification performs no mutation on its input.
{
  const entry = { id: 'darkvision', name: 'Darkvision' };
  const before = JSON.parse(JSON.stringify(entry));
  classifyStockSystemEntry(entry, ctx());
  assert.deepEqual(entry, before);

  const sourceEntries = [{ sourcePath: 'a', entry: { id: 'darkvision' } }];
  const beforeSources = JSON.parse(JSON.stringify(sourceEntries));
  classifyStockSystemSources(sourceEntries, ctx());
  assert.deepEqual(sourceEntries, beforeSources);
}

// Test 10: candidate ordering is deterministic across repeated calls.
{
  const input = [
    { sourcePath: 'b', entry: { id: 'improved-sensor-package' } },
    { sourcePath: 'a', entry: { id: 'darkvision' } },
    { sourcePath: 'c', entry: { name: 'totally unknown gadget', sourceText: 'a strange gadget' } }
  ];
  const first = classifyStockSystemSources(input, ctx()).map(c => c.canonicalId ?? c.sourcePaths[0]);
  const second = classifyStockSystemSources(input, ctx()).map(c => c.canonicalId ?? c.sourcePaths[0]);
  assert.deepEqual(first, second);
  assert.deepEqual(first, [...first].sort());
}

// Assumed-default warning: importer-inferred defaults are flagged, not
// silently treated as if the statblock actually described them.
{
  const result = classifyStockSystemEntry({ id: 'heuristic-processor', sourceText: 'Default stock droid processor assumption' }, ctx());
  assert.ok(result.warnings.some(w => w.includes('importer-assumed default')));
}

// ── Weapon reconciliation: annotateWeaponCandidatesAgainstExistingItems ─────

// Test 18/20: a candidate already represented by an existing weapon Item
// is marked already-installed so reconciliation never creates a
// duplicate logical weapon.
{
  const candidates = classifyStockSystemSources([
    { sourcePath: 'system.droidSystems.weapons.0', entry: { id: 'integrated-blaster', name: 'Integrated Blaster' } }
  ], { ...ctx(), getDefinition: (id) => (id === 'integrated-blaster' ? { id, name: 'Integrated Blaster', category: 'weapon' } : null) });
  assert.equal(candidates[0].alreadyInstalled, false);

  const annotated = annotateWeaponCandidatesAgainstExistingItems(candidates, ['integrated-blaster']);
  assert.equal(annotated[0].alreadyInstalled, true);
  assert.equal(annotated[0].selectedByDefault, false);
  assert.ok(annotated[0].warnings.some(w => w.includes('existing weapon Item')));
}

// No existing weapon ids: candidates pass through unchanged.
{
  const candidates = classifyStockSystemSources([{ sourcePath: 'a', entry: { id: 'darkvision' } }], ctx());
  const annotated = annotateWeaponCandidatesAgainstExistingItems(candidates, []);
  assert.deepEqual(annotated, candidates);
}

console.log('Droid converted-system reconciliation classifier tests passed.');
