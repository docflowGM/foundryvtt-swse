#!/usr/bin/env node
// Builds data/force-v2/definitions.json: the runtime copy of the seven-book Force V2 typed definition corpus
// (docs/audits/force-v2/bookwise-v2.9). Records are passed through unchanged (no mechanics are added or edited here);
// each file's sha256 is recorded so drift between the audit source and the runtime copy is detectable.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SRC = 'docs/audits/force-v2/bookwise-v2.9/';
const OUT = 'data/force-v2/definitions.json';
const files = readdirSync(SRC)
  .filter((f) => /Definitions/.test(f) && f.endsWith('.json') && !/Acceptance|Validation|Influence/.test(f))
  .sort();
const definitions = [];
const sources = [];
for (const f of files) {
  const raw = readFileSync(SRC + f);
  const json = JSON.parse(raw.toString('utf8'));
  const defs = json.definitions;
  if (!Array.isArray(defs)) throw new Error(`${f}: no definitions array`);
  sources.push({ file: f, sha256: createHash('sha256').update(raw).digest('hex'), count: defs.length });
  definitions.push(...defs);
}
const ids = new Set();
for (const d of definitions) {
  if (!d.definitionId || !d.domain) throw new Error('definition without id/domain');
  if (ids.has(d.definitionId)) throw new Error(`duplicate definitionId ${d.definitionId}`);
  ids.add(d.definitionId);
}
const counts = {};
for (const d of definitions) counts[d.domain] = (counts[d.domain] || 0) + 1;
writeFileSync(OUT, JSON.stringify({ schemaVersion: 1, generatedFrom: SRC, total: definitions.length, counts, sources, definitions }));
console.log(`wrote ${OUT}: ${definitions.length} definitions`, counts);
