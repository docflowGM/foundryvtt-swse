import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCuration, runOverlay, ALLOWED_FIELDS } from '../tools/apply-archetype-phase-12b-semantic-curation.mjs';
import { loadArchetypeAuthorities } from '../tools/lib/archetype-authorities.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const dataset = J('data/archetypes.json');
const authority = J('data/audits/archetype-phase-12b-semantic-curation.json');
const { ontologyTags } = loadArchetypeAuthorities(ROOT);
const clone = (o) => JSON.parse(JSON.stringify(o));

test('12B overlay --check: cumulative authority applied to the current file is zero diff', () => {
  const r = runOverlay({ check: true });
  assert.equal(r.drift, false);
  assert.deepEqual(r.changedIds, []);
  assert.equal(r.certified, authority.rolling.certifiedRecordCount);
  assert.equal(r.counts.records, 297);
});

test('12B authority: every certified record is applied; no unlisted record carries 12B provenance', () => {
  const listed = new Set(authority.records.map((r) => r.archetypeId));
  for (const r of Object.values(dataset.archetypes)) {
    assert.equal(Boolean(r.metadata.tagProvenance['phase12b.curated.primary']), listed.has(r.id), r.id);
  }
});

test('12B authority: every supplied tag is in the frozen ontology; allowed fields are exactly the four', () => {
  assert.deepEqual(authority.executionContract.allowedFields, [...ALLOWED_FIELDS]);
  assert.equal(authority.executionContract.claudeMayInfer, false);
  for (const rec of authority.records) {
    const tags = [...rec.replace['metadata.tags.primary'], ...rec.replace['metadata.tags.supporting'], ...rec.replace['metadata.tags.all']];
    for (const t of tags) assert.ok(ontologyTags.has(t), `${rec.archetypeId}: ${t}`);
  }
});

test('12B revision REV-001: scavenger no longer carries resources anywhere', () => {
  const m = dataset.archetypes.scavenger.metadata;
  assert.ok(!m.tags.all.includes('resources'));
  assert.ok(!m.tags.primary.includes('resources'));
  assert.ok(!m.tagProvenance['phase12b.curated.primary'].includes('resources'));
});

test('12B overlay touches only the four semantic fields and fails closed on bad authority', () => {
  const { dataset: next } = applyCuration(dataset, authority, ontologyTags);
  assert.equal(JSON.stringify(next), JSON.stringify(dataset));

  const badTag = clone(authority);
  badTag.records[0].replace['metadata.tags.supporting'].push('not_in_ontology');
  assert.throws(() => applyCuration(dataset, badTag, ontologyTags), /frozen ontology/);

  const extraField = clone(authority);
  extraField.records[0].replace['mechanics.skills'] = {};
  assert.throws(() => applyCuration(dataset, extraField, ontologyTags), /exactly/);

  const unknownId = clone(authority);
  unknownId.records[0].archetypeId = 'no_such_archetype';
  assert.throws(() => applyCuration(dataset, unknownId, ontologyTags), /does not exist/);

  const infer = clone(authority);
  infer.executionContract.claudeMayInfer = true;
  assert.throws(() => applyCuration(dataset, infer, ontologyTags), /claudeMayInfer/);
});
