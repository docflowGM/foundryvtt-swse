#!/usr/bin/env node
/**
 * Phase 3H-0 — promote the Archetype Phase 11 semantic vocabulary into a durable repository authority.
 *
 * The 57 tags are NOT authored here: they are read from the Phase 11 artifacts under data/audits/archetype-phase-11/ and cross-checked
 * against the tags actually used by the 297 archetypes in the Phase 11 canonical dataset. Any disagreement fails.
 *   --write   write data/canonical/semantic-tag-vocabulary.json
 *   --check   the committed authority equals a fresh promotion
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'data/audits/archetype-phase-11/';
export const SOURCES = { dataset: DIR + 'SWSE_Archetypes_Phase_11_Canonical_Metadata.json', vocabulary: DIR + 'SWSE_Archetype_Phase_11_Metadata_Vocabulary.json', report: DIR + 'SWSE_Archetype_Phase_11_Canonical_Metadata_Convergence.md' };
export const OUT = 'data/canonical/semantic-tag-vocabulary.json';
const sha = rel => crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const rd = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

export function promote() {
  const ds = rd(SOURCES.dataset), vocab = rd(SOURCES.vocabulary);
  const records = Object.values(ds.archetypes);
  const used = new Set(); for (const a of records) for (const t of a.metadata?.tags?.all ?? []) used.add(t);
  const tags = [...vocab.tags].sort();
  const problems = [];
  if (records.length !== 297) problems.push(`expected 297 archetypes, found ${records.length}`);
  if (tags.length !== 57 || new Set(tags).size !== 57) problems.push(`vocabulary file lists ${tags.length} tags`);
  if (JSON.stringify([...used].sort()) !== JSON.stringify(tags)) problems.push('vocabulary file disagrees with the tags used by the Phase 11 dataset');
  if (!tags.every(t => /^[a-z]+(?:_[a-z]+)*$/.test(t))) problems.push('a tag is not lower_snake_case');
  if (problems.length) throw new Error('[semantic-vocabulary] ' + problems.join('; '));
  const usage = Object.fromEntries(tags.map(t => [t, { archetypesPrimary: records.filter(a => a.metadata.tags.primary?.includes(t)).length, archetypesSupporting: records.filter(a => a.metadata.tags.supporting?.includes(t)).length }]));
  return {
    schemaVersion: 1, phase: '3H-0', status: 'SEMANTIC_VOCABULARY_AUTHORITY',
    authority: 'Archetype Phase 11 (final, roadmap 0-11 closed). Exactly the vocabulary used by the 297 canonical archetypes; no tag is invented, renamed or inferred here.',
    style: 'lower_snake_case', count: tags.length,
    rules: ['Exact canonical references outrank tags.', 'Tags are semantic signals only.', 'Archetype relationship strength (primary/supporting) lives in archetype data, never in talent tags.', 'Class routes are separate from semantic tags.', 'No per-record numeric tag weights.', 'Direction of authority: published SWSE rules -> canonical talent identity/content -> derived certified semantic facts -> exact archetype references + archetype semantic relationships -> suggestion/mentor interpretation. The 57 tags are the project\'s CERTIFIED SHARED SEMANTIC VOCABULARY, not published SWSE canon.'],
    sources: Object.fromEntries(Object.entries(SOURCES).map(([k, rel]) => [k, { path: rel, sha1: sha(rel) }])),
    tags, archetypeUsage: usage
  };
}
export function main(argv = process.argv.slice(2)) {
  const json = JSON.stringify(promote(), null, 2) + '\n';
  if (argv.includes('--check')) { if (!fs.existsSync(path.join(ROOT, OUT)) || fs.readFileSync(path.join(ROOT, OUT), 'utf8') !== json) { console.error('[semantic-vocabulary] STALE'); return 1; } console.log('[semantic-vocabulary] PASS: 57 tags'); return 0; }
  fs.writeFileSync(path.join(ROOT, OUT), json); console.log('[semantic-vocabulary] wrote ' + OUT); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
