import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const matrix = JSON.parse(readFileSync('data/force-v2/coverage-matrix.json', 'utf8'));
const corpus = JSON.parse(readFileSync('data/force-v2/definitions.json', 'utf8'));
assert.equal(matrix.total, 212); assert.equal(matrix.rows.length, corpus.definitions.length);
assert.deepEqual(new Set(matrix.rows.map((r) => r.definitionId)), new Set(corpus.definitions.map((d) => d.definitionId)), 'every definition has exactly one row');
const STATUSES = new Set(['REGISTRY_ONLY', 'CHECK_RESOLVER', 'HANDLER_REFERENCED', 'MAINTAINED']);
for (const r of matrix.rows) {
  assert(STATUSES.has(r.status), r.definitionId);
  if (r.status === 'REGISTRY_ONLY') assert.equal(r.evidenceFiles.length, 0, `${r.definitionId} claims no engine evidence`);
  if (r.status === 'HANDLER_REFERENCED') assert(r.evidenceFiles.length > 0, `${r.definitionId} names its evidence`);
  assert(!r.evidenceFiles.some((f) => /force-card-summaries|force-power-categories/.test(f)), 'display-only lists are never mechanical evidence');
}
assert.equal(matrix.rows.filter((r) => r.needsRuling).length, 19, 'FP-RD-016 scope');
assert(matrix.rows.filter((r) => r.status === 'MAINTAINED').every((r) => r.domain === 'force-power'));
// no row is ever labelled complete/certified: the matrix is evidence of code presence only
assert(!JSON.stringify(matrix).match(/FOUNDRY_TESTED|COMPLETE"/));
assert.match(readFileSync('docs/audits/force-v2/force-v2-mechanical-coverage-matrix.md', 'utf8'), /Nothing here is FOUNDRY_TESTED/);
console.log('force v2 coverage matrix: ok');
