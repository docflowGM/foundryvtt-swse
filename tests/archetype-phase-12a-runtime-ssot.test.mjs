import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EXACT_REF_BASELINE,
  EXPECTED_COUNTS,
  FORM_POWER_ID_CORRECTIONS,
  PHASE11_ONLY_TAGS,
  collectExactRefs,
  validateArchetypeDataset
} from '../scripts/engine/archetype/archetype-ssot-contract.js';
import { loadArchetypeAuthorities } from '../tools/lib/archetype-authorities.mjs';
import { normalizeRecord, serializeDataset, legacyConsumerCensus } from '../tools/build-archetype-phase-12a-runtime-ssot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const dataText = read('data/archetypes.json');
const dataset = JSON.parse(dataText);
const records = Object.values(dataset.archetypes);
const authorities = loadArchetypeAuthorities(ROOT);
const report = validateArchetypeDataset(dataset, authorities);
const clone = (o) => JSON.parse(JSON.stringify(o));

// ── Dataset ────────────────────────────────────────────────────────────────
test('dataset: 297 records, 97 parents, 200 specializations', () => {
  assert.equal(records.length, EXPECTED_COUNTS.records);
  assert.equal(records.filter((r) => r.kind === 'parent').length, EXPECTED_COUNTS.parents);
  assert.equal(records.filter((r) => r.kind === 'specialization').length, EXPECTED_COUNTS.specializations);
  assert.equal(dataset._meta.recordCount, 297);
  assert.equal(dataset._meta.runtimePath, 'data/archetypes.json');
  assert.equal(dataset._meta.replacesRuntimeAuthority, 'data/class-archetypes.json');
});

test('dataset: stable unique ids, keys match ids, no class-owned identity', () => {
  assert.equal(new Set(records.map((r) => r.id)).size, 297);
  for (const [k, r] of Object.entries(dataset.archetypes)) {
    assert.equal(r.id, k);
    assert.ok(!('baseClassId' in r), k);
    assert.match(r.id, /^[a-z0-9]+(?:_[a-z0-9]+)*$/);
  }
});

test('dataset: parent graph is valid (one parent, parents have none, no self/cycle)', () => {
  for (const r of records) {
    if (r.kind === 'parent') assert.equal(r.parentId, null, r.id);
    else {
      assert.equal(typeof r.parentId, 'string', r.id);
      assert.equal(dataset.archetypes[r.parentId]?.kind, 'parent', `${r.id} -> ${r.parentId}`);
    }
  }
});

test('contract validator accepts the shipped dataset with zero errors', () => {
  assert.deepEqual(report.errors, []);
  assert.equal(report.valid, true);
});

// ── Semantics ──────────────────────────────────────────────────────────────
test('semantics: every tag is in the frozen 190-tag ontology', () => {
  assert.equal(authorities.ontologyTags.size, 190);
  for (const r of records) {
    for (const t of [...r.metadata.tags.primary, ...r.metadata.tags.supporting, ...r.metadata.tags.all]) {
      assert.ok(authorities.ontologyTags.has(t), `${r.id}: ${t}`);
    }
  }
});

test('semantics: 0 Phase-11-only tags remain in tags or tagProvenance', () => {
  const legacy = new Set(PHASE11_ONLY_TAGS);
  assert.equal(legacy.size, 15);
  for (const r of records) {
    for (const t of r.metadata.tags.all) assert.ok(!legacy.has(t), `${r.id}: ${t}`);
    for (const list of Object.values(r.metadata.tagProvenance)) for (const t of list) assert.ok(!legacy.has(t), `${r.id}: prov ${t}`);
  }
});

test('semantics: no primary/supporting collision; 297/297 keep a canonical primary tag', () => {
  for (const r of records) {
    const { primary, supporting } = r.metadata.tags;
    assert.deepEqual(primary.filter((t) => supporting.includes(t)), [], r.id);
    assert.ok(primary.length > 0, r.id);
  }
});

test('semantics: typed ability priorities are preserved (not duplicated into tags)', () => {
  assert.ok(records.every((r) => r.mechanics.abilities.primary.length > 0));
  assert.ok(records.every((r) => !r.metadata.tags.all.some((t) => /^ability_(str|dex|con|int|wis|cha)$/.test(t))));
});

test('normalization only deletes the 15 tags: remaining tags are an exact subset, order preserved', () => {
  const src = clone(records[0]);
  src.metadata.tags.primary = ['ability_dex', ...src.metadata.tags.primary, 'rifle'];
  src.metadata.tags.supporting = ['fieldcraft', ...src.metadata.tags.supporting];
  const stats = { removedByTag: {}, formPowerReplacements: {} };
  const out = normalizeRecord(src, stats);
  assert.deepEqual(out.metadata.tags.primary, records[0].metadata.tags.primary);
  assert.deepEqual(out.metadata.tags.supporting, records[0].metadata.tags.supporting);
  assert.deepEqual(stats.removedByTag, { ability_dex: 1, rifle: 1, fieldcraft: 1 });
});

// ── Exact references ───────────────────────────────────────────────────────
test('exact refs: all nine domains resolve at the audited baseline (exact match, no fuzzy)', () => {
  for (const [domain, baseline] of Object.entries(EXACT_REF_BASELINE)) {
    const d = report.refs[domain];
    assert.equal(d.checked, true, domain);
    assert.equal(d.total, baseline, `${domain} total`);
    assert.equal(d.resolved, baseline, `${domain} resolved`);
    assert.deepEqual(d.unresolved, [], domain);
  }
});

test('exact refs: 12 form-power ids use ForceRegistry identities; no synthetic prefix remains', () => {
  assert.equal(Object.keys(FORM_POWER_ID_CORRECTIONS).length, 12);
  // _meta legitimately documents the correction map; records must not carry the old ids.
  assert.ok(!JSON.stringify(dataset.archetypes).includes('lightsaber-form-power-'), 'synthetic form-power prefix still present');
  const powers = new Set(records.flatMap((r) => collectExactRefs(r).forcePowers));
  for (const corrected of Object.values(FORM_POWER_ID_CORRECTIONS)) assert.ok(powers.has(corrected), corrected);
  assert.equal(FORM_POWER_ID_CORRECTIONS['lightsaber-form-power-vornskr-s-ferocity'], 'vornskrs-ferocity');
});

test('exact refs: validator is fail-closed on unresolved references', () => {
  const bad = clone(dataset);
  bad.archetypes.jedi_shadow.mechanics.feats.signature.push('not_a_real_feat');
  bad.archetypes.jedi_shadow.metadata.exactRefs.feats.signature.push('not_a_real_feat');
  const r = validateArchetypeDataset(bad, authorities);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('not_a_real_feat')));
});

test('exact refs: Jedi Shadow route needs a Stealth bridge from the Jedi route (class-skill authority)', () => {
  const shadow = dataset.archetypes.jedi_shadow.mechanics.backgrounds.foundationRouteAnalysis.jedi;
  assert.ok(shadow.missingSignatureSkills.includes('stealth'));
});

// ── Validator negative cases ───────────────────────────────────────────────
const mutate = (fn) => { const d = clone(dataset); fn(d.archetypes); return validateArchetypeDataset(d, authorities); };
test('validator rejects: broken parent, parent with parent, unknown tag, legacy tag, collision, class identity', () => {
  const firstSpec = records.find((r) => r.kind === 'specialization').id;
  const firstParent = records.find((r) => r.kind === 'parent').id;
  assert.ok(mutate((a) => { a[firstSpec].parentId = 'nope'; }).errors.some((e) => e.includes('parentId')));
  assert.ok(mutate((a) => { a[firstParent].parentId = firstSpec; }).errors.some((e) => e.includes('parent record must not')));
  assert.ok(mutate((a) => { a[firstSpec].metadata.tags.supporting.push('totally_unknown'); }).errors.some((e) => e.includes('frozen ontology')));
  assert.ok(mutate((a) => { a[firstSpec].metadata.tags.primary.push('rifle'); }).errors.some((e) => e.includes('Phase-11-only')));
  assert.ok(mutate((a) => { const t = a[firstSpec].metadata.tags; t.supporting.push(t.primary[0]); }).errors.some((e) => e.includes('collision')));
  assert.ok(mutate((a) => { a[firstSpec].baseClassId = 'jedi'; }).errors.some((e) => e.includes('baseClassId')));
  assert.ok(mutate((a) => { delete a[firstSpec]; }).errors.some((e) => e.includes('record count')));
});

// ── Deterministic generation / provenance ──────────────────────────────────
test('serialization is deterministic: re-serializing the shipped file is byte-identical', () => {
  assert.equal(serializeDataset(dataset), dataText);
});

// Phase 12A fingerprint is a HISTORICAL certified baseline (owner ruling M-001): data/archetypes.json
// is now further curated by the Phase 12B overlay, so the audit's output hash is NOT compared to the
// current file bytes. The 12A audit artifact itself is never rewritten.
const CERTIFIED_PHASE_12A_OUTPUT_SHA256 = 'a8e08c6347a2126ba7647f0a671034857099d1b797e383a9417e873a048d3cae';

test('phase 12A audit artifact is a historical certified baseline and reports no regression', () => {
  const audit = JSON.parse(read('data/audits/archetype-phase-12a-runtime-ssot.json'));
  assert.equal(audit.output.sha256, CERTIFIED_PHASE_12A_OUTPUT_SHA256);
  assert.equal(audit.status, 'RUNTIME_SSOT_VALIDATED');
  assert.equal(audit.scoringChanged, false);
  assert.equal(audit.semanticTags.after.uniqueTags, 42);
  assert.equal(audit.semanticTags.archetypesLosingAllPrimary, 0);
  assert.equal(audit.formPowerIdCorrections.byId['lightsaber-form-power-assured-strike'] > 0, true);
  assert.equal(dataset._meta.phase12a.sourceArtifact.sha256, audit.input.sha256);
});

test('legacy consumer census is classified and still shows live dependencies', () => {
  const census = legacyConsumerCensus(ROOT);
  assert.ok(census.byClassification.CURRENT_RUNTIME_DEPENDENCY > 0);
  assert.ok(census.files.some((f) => f.file.includes('SuggestionScorer')));
  assert.ok(fs.existsSync(path.join(ROOT, 'data/class-archetypes.json')), 'legacy file must remain until Phase 12F');
});
