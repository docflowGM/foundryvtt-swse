import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const L = json('docs/design/mentor-survey-v2/15-answer-id-ledger.json');

test('SV-05 answer-ID ledger: every master row for Multiclass and Prestige joins a V2 id by deterministic transform and exact text; none unmatched, ambiguous or text-different', () => {
  assert.equal(L.masterCommit, '08561be4a334beb94fc09d6a8780cce6be4dc917');
  const totals = Object.fromEntries(Object.entries(L.report).map(([k, r]) => [k, r.masterRows]));
  assert.deepEqual(totals, { 'mc.q1': 120, 'mc.q2': 625, 'mc.q3': 20, 'mc.q4': 1500, 'mc.q5': 500, 'pr.q1': 977, 'pr.q3': 800, 'pr.q4': 128, 'pr.q5': 224 });
  for (const [k, r] of Object.entries(L.report)) { assert.equal(r.matched, r.masterRows, k); assert.equal(r.unmatched + r.ambiguous + r.textMismatch, 0, k); }
});

test('SV-05 the only V2-side exceptions are rows the master omitted (316 Prestige Q1 routes, 32 second-purpose declines); many-to-one rows are the shared approved depth answers', () => {
  const k = {}; for (const e of L.exceptions) k[`${e.section}:${e.kind}`] = (k[`${e.section}:${e.kind}`] || 0) + 1;
  assert.deepEqual(k, { 'pr.q1:v2_without_master_row': 316, 'pr.q5:v2_without_master_row': 32 });
  assert.equal(L.report['mc.q3'].manyToOne, 16); assert.equal(L.report['pr.q4'].manyToOne, 124); assert.equal(L.report['pr.q5'].joinedByText, 96);
});

test('SV-16 no candidate tag, mapping status or primary/supporting column from the master mapping appears in any runtime pack or survey module', () => {
  const dirs = ['data/mentor-survey', 'scripts/mentor/mentor-survey-v2'];
  const files = dirs.flatMap((d) => fs.readdirSync(path.join(ROOT, d), { recursive: true }).filter((f) => /\.(json|js)$/.test(f)).map((f) => path.join(d, f)));
  for (const f of files) assert.ok(!/AUTHOR_TAG_CANDIDATE|TEXT_CANDIDATE|REVIEW_UNMAPPED|Primary candidate|ontologyTopicCandidates|mechanicalBiasKeys/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), f);
});
