import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCuration, normalizeAuthority, runOverlay, ALLOWED_FIELDS } from '../tools/apply-archetype-phase-12b-semantic-curation.mjs';
import { loadArchetypeAuthorities } from '../tools/lib/archetype-authorities.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const dataset = J('data/archetypes.json');
const authority = J('data/audits/archetype-phase-12b-semantic-curation.json');
const { ontologyTags } = loadArchetypeAuthorities(ROOT);
const normalized = normalizeAuthority(authority);
const clone = (o) => JSON.parse(JSON.stringify(o));

test('12B overlay --check: cumulative authority applied to the current file is zero diff', () => {
  const r = runOverlay({ check: true });
  assert.equal(r.drift, false);
  assert.deepEqual(r.changedIds, []);
  assert.equal(r.certified, authority.certifiedCount);
  assert.equal(r.counts.records, 297);
});

test('12B authority: every certified record is applied; no unlisted record carries 12B provenance', () => {
  const listed = new Set(normalized.records.map((r) => r.archetypeId));
  assert.equal(listed.size, authority.certifiedCount);
  for (const r of Object.values(dataset.archetypes)) {
    assert.equal(Boolean(r.metadata.tagProvenance['phase12b.curated.primary']), listed.has(r.id), r.id);
  }
});

test('12B authority: every supplied tag is in the frozen ontology; normalized fields are exactly the four', () => {
  assert.equal(authority.frozenOntology.tagCount, 190);
  for (const rec of normalized.records) {
    assert.deepEqual(Object.keys(rec.replace), [...ALLOWED_FIELDS]);
    const tags = [...rec.replace['metadata.tags.primary'], ...rec.replace['metadata.tags.supporting'], ...rec.replace['metadata.tags.all']];
    for (const t of tags) assert.ok(ontologyTags.has(t), `${rec.archetypeId}: ${t}`);
  }
});

test('12B provenance: nested owner form maps to the flat dotted keys; owner "authority" string is not stored', () => {
  const rec = authority.records.find((r) => r.id === 'trianii_ranger');
  assert.deepEqual(dataset.archetypes.trianii_ranger.metadata.tagProvenance, {
    'phase12b.curated.primary': rec.tagProvenance.phase12b.curated.primary,
    'phase12b.curated.supporting': rec.tagProvenance.phase12b.curated.supporting
  });
  for (const r of Object.values(dataset.archetypes)) assert.ok(!JSON.stringify(r.metadata.tagProvenance).includes('OWNER_CERTIFIED'));
});

test('12B execution baseline is a full commit SHA; execution ids are all certified records', () => {
  assert.match(authority.currentExecution.requiredBaseline, /^[0-9a-f]{40}$/);
  const certified = new Set(normalized.records.map((r) => r.archetypeId));
  const { newRecordIds, revisionIds } = authority.currentExecution;
  assert.ok(Array.isArray(newRecordIds) && Array.isArray(revisionIds));
  for (const id of [...newRecordIds, ...revisionIds]) assert.ok(certified.has(id), id);
});

test('12B QA revisions (REV-002+): applied data equals each logged "after" and differs from "before"', () => {
  const revs = authority.revisionLog.filter((e) => e.before && e.after);
  assert.ok(revs.length >= 7, 'the seven QA revisions stay in the rolling revision log');
  for (const e of revs) {
    const t = dataset.archetypes[e.recordId].metadata.tags;
    assert.deepEqual(t.primary, e.after.primary, e.id);
    assert.deepEqual(t.supporting, e.after.supporting, e.id);
    assert.notDeepEqual([t.primary, t.supporting], [e.before.primary, e.before.supporting], e.id);
    assert.deepEqual(t.all, [...new Set([...t.primary, ...t.supporting])].sort(), e.id);
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
  badTag.records[0].supporting.push('not_in_ontology');
  assert.throws(() => applyCuration(dataset, badTag, ontologyTags), /frozen ontology/);

  const badProvenance = clone(authority);
  badProvenance.records[0].tagProvenance.phase12b.somethingElse = ['x'];
  assert.throws(() => applyCuration(dataset, badProvenance, ontologyTags), /tagProvenance shape/);

  const unknownId = clone(authority);
  unknownId.records[0].id = 'no_such_archetype';
  assert.throws(() => applyCuration(dataset, unknownId, ontologyTags), /does not exist/);

  const countMismatch = clone(authority);
  countMismatch.certifiedCount = 49;
  assert.throws(() => applyCuration(dataset, countMismatch, ontologyTags), /certifiedCount/);

  const unknownSchema = clone(authority);
  unknownSchema.schemaVersion = '9.9';
  assert.throws(() => applyCuration(dataset, unknownSchema, ontologyTags), /unrecognized authority schema/);
});
