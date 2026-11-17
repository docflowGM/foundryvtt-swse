// Keeps docs/design/mentor-survey-v2/05-TRACEABILITY-MATRIX.md honest: every requirement id used in a mentor-survey
// test title must exist in the matrix, and no matrix row may claim "Tested" without at least one such test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matrix = fs.readFileSync(path.join(ROOT, 'docs/design/mentor-survey-v2/05-TRACEABILITY-MATRIX.md'), 'utf8');
const ID = /\b(?:SV|L1|MC|PR)-\d{2}\b/g;

const rows = new Map();
for (const line of matrix.split('\n')) {
  const m = /^\|\s*((?:SV|L1|MC|PR)-\d{2})\s*\|/.exec(line);
  if (m) rows.set(m[1], line);
}

const testFiles = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /^mentor-survey-.*\.test\.mjs$/.test(f) && f !== 'mentor-survey-traceability.test.mjs');
const tested = new Set();
for (const f of testFiles) {
  const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
  for (const m of src.matchAll(/\btest\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) for (const id of m[2].match(ID) || []) tested.add(id);
}

test('every requirement id used in a mentor-survey test title exists in the traceability matrix', () => {
  for (const id of tested) assert.ok(rows.has(id), `${id} is used in a test title but missing from the matrix`);
});

test('no matrix row claims Tested without at least one test title referencing it', () => {
  for (const [id, line] of rows) if (/\bTested\b/.test(line)) assert.ok(tested.has(id), `${id} is marked Tested but no test references it`);
});

test('no matrix row claims Foundry-tested (no live Foundry runtime has been available)', () => {
  assert.ok(!/Foundry[- ]tested/i.test(matrix.replace(/\*\*No row is `Foundry tested`\*\*/, '')), 'matrix must not claim live Foundry certification');
});
