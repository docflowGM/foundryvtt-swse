// The V2 content-pack ids are the implementation identifiers. This locks the crosswalk to the master mapping inventory
// (docs/survey-answer-tag-master-20261115) without importing or activating any tag mapping.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const rec = json('docs/design/mentor-survey-v2/08-l1-id-crosswalk.json');
const pack = json('data/mentor-survey/l1.json');

const v2 = new Map();
for (const c of Object.values(pack.q1)) c.options.forEach((o) => v2.set(o.id, 'selectable'));
for (const p of Object.values(pack.q2.parents)) { v2.set(p.universalReference.id, 'reference'); Object.values(p.byClass).forEach((o) => v2.set(o.id, 'selectable')); }
for (const c of Object.values(pack.q3)) Object.values(c.scenarios).forEach((s) => s.replies.forEach((o) => v2.set(o.id, 'selectable')));
for (const p of Object.values(pack.q4)) [...p.children, ...p.methods].forEach((o) => v2.set(o.id, 'selectable'));
for (const c of Object.values(pack.q5)) c.options.forEach((o) => v2.set(o.id, 'selectable'));

test('SV-05 crosswalk covers every master L1 row exactly once (1,472) with no ambiguity or unmatched rows', () => {
  assert.equal(rec._meta.masterRows, 1472);
  assert.equal(rec.mapping.length, 1472); assert.equal(rec.ambiguous.length, 0); assert.equal(rec.unmatchedMaster.length, 0);
  assert.equal(new Set(rec.mapping.map((m) => m.masterId)).size, 1472, 'master ids unique');
  assert.equal(new Set(rec.mapping.map((m) => m.v2Id)).size, 1472, 'one master row per V2 id');
});

test('SV-05 every crosswalk target is a real V2 id with the right role; only the 2 navigation controls lack a master row', () => {
  for (const m of rec.mapping) assert.equal(v2.get(m.v2Id), m.role, m.v2Id);
  assert.equal(rec.mapping.filter((m) => m.role === 'selectable').length, 1375);
  assert.equal(rec.mapping.filter((m) => m.role === 'reference').length, 97);
  assert.deepEqual(rec.unmatchedV2.map((x) => x.role), ['navigation', 'navigation']);
});

test('SV-05 V2 ids are authoritative: no master id is adopted as a V2 id when it differs, and the crosswalk carries no tags', () => {
  assert.equal(rec._meta.masterIdCollisionsWithDifferentV2Id, 0);
  for (const m of rec.mapping) if (m.masterId !== m.v2Id) assert.ok(!v2.has(m.masterId), `${m.masterId} must not collide with a different V2 record`);
  assert.ok(!JSON.stringify(rec).match(/candidate|primaryTag|supportingTag|tagIds|"tags"/i), 'no tag data in the crosswalk');
});
