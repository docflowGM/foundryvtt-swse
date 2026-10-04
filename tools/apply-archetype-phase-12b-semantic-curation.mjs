#!/usr/bin/env node
/**
 * Phase 12B — deterministic semantic-curation overlay for data/archetypes.json.
 *
 *   node tools/apply-archetype-phase-12b-semantic-curation.mjs          # apply, write
 *   node tools/apply-archetype-phase-12b-semantic-curation.mjs --check  # no writes; fails on diff
 *
 * Reconstruction order: (1) tools/build-archetype-phase-12a-runtime-ssot.mjs builds the
 * normalized baseline, then (2) this overlay applies the rolling owner authority
 * data/audits/archetype-phase-12b-semantic-curation.json.
 *
 * Contract (owner-certified, no discretion here):
 *  - applies every cumulative records[] entry exactly, replacing ONLY
 *    metadata.tags.primary / .supporting / .all and metadata.tagProvenance;
 *  - every supplied tag must be in the frozen 190-tag ontology;
 *  - the resulting 297-record dataset must pass validateArchetypeDataset;
 *  - no inference, no parent inheritance, no scoring changes.
 * Fails closed on any authority mismatch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateArchetypeDataset } from '../scripts/engine/archetype/archetype-ssot-contract.js';
import { serializeDataset } from './build-archetype-phase-12a-runtime-ssot.mjs';
import { loadArchetypeAuthorities } from './lib/archetype-authorities.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATASET_PATH = 'data/archetypes.json';
export const AUTHORITY_PATH = 'data/audits/archetype-phase-12b-semantic-curation.json';

export const ALLOWED_FIELDS = Object.freeze([
  'metadata.tags.primary',
  'metadata.tags.supporting',
  'metadata.tags.all',
  'metadata.tagProvenance'
]);

const clone = (o) => JSON.parse(JSON.stringify(o));

/** Pure: apply authority to a parsed dataset. Returns { dataset, changedIds }. Throws on any mismatch. */
export function applyCuration(dataset, authority, ontologyTags) {
  if (authority?.executionContract?.claudeMayInfer !== false) throw new Error('authority must declare claudeMayInfer: false');
  const allowed = authority.executionContract.allowedFields ?? [];
  if (JSON.stringify(allowed) !== JSON.stringify(ALLOWED_FIELDS)) throw new Error('authority allowedFields differ from the 12B contract');
  if (!Array.isArray(authority.records) || authority.records.length === 0) throw new Error('authority has no records');

  const out = clone(dataset);
  const seen = new Set();
  const changedIds = [];
  for (const rec of authority.records) {
    const id = rec.archetypeId;
    if (seen.has(id)) throw new Error(`duplicate authority record: ${id}`);
    seen.add(id);
    const target = out.archetypes[id];
    if (!target) throw new Error(`authority record "${id}" does not exist in ${DATASET_PATH}`);
    if (rec.kind !== target.kind || (rec.parentId ?? null) !== (target.parentId ?? null)) {
      throw new Error(`authority record "${id}" kind/parentId disagrees with the dataset`);
    }
    const keys = Object.keys(rec.replace ?? {});
    if (keys.length !== ALLOWED_FIELDS.length || keys.some((k) => !ALLOWED_FIELDS.includes(k))) {
      throw new Error(`authority record "${id}" replace block must contain exactly ${ALLOWED_FIELDS.join(', ')}`);
    }
    const r = rec.replace;
    const supplied = [...r['metadata.tags.primary'], ...r['metadata.tags.supporting'], ...r['metadata.tags.all'], ...Object.values(r['metadata.tagProvenance']).flat()];
    for (const t of supplied) if (!ontologyTags.has(t)) throw new Error(`"${id}": tag "${t}" is not in the frozen ontology`);

    const before = JSON.stringify([target.metadata.tags, target.metadata.tagProvenance]);
    target.metadata.tags.primary = clone(r['metadata.tags.primary']);
    target.metadata.tags.supporting = clone(r['metadata.tags.supporting']);
    target.metadata.tags.all = clone(r['metadata.tags.all']);
    target.metadata.tagProvenance = clone(r['metadata.tagProvenance']);
    if (JSON.stringify([target.metadata.tags, target.metadata.tagProvenance]) !== before) changedIds.push(id);
  }
  return { dataset: out, changedIds, certified: seen.size };
}

export function runOverlay({ check = false, root = ROOT } = {}) {
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  const dataset = JSON.parse(read(DATASET_PATH));
  const authority = JSON.parse(read(AUTHORITY_PATH));
  const authorities = loadArchetypeAuthorities(root);

  const { dataset: next, changedIds, certified } = applyCuration(dataset, authority, authorities.ontologyTags);
  const report = validateArchetypeDataset(next, authorities);
  if (!report.valid) throw new Error(`Validation failed (${report.errors.length}):\n${report.errors.slice(0, 25).join('\n')}`);

  const text = serializeDataset(next);
  const drift = text !== read(DATASET_PATH);
  if (!check && drift) fs.writeFileSync(path.join(root, DATASET_PATH), text);
  return { certified, changedIds, drift, counts: report.counts, refs: report.refs };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  try {
    const r = runOverlay({ check });
    console.log(`certified records: ${r.certified}; archetypes: ${r.counts.records}`);
    if (check) {
      if (r.drift) { console.error(`DRIFT: ${DATASET_PATH} differs from the cumulative authority (${r.changedIds.length} record(s))`); process.exit(1); }
      console.log('check: zero diff');
    } else console.log(r.drift ? `applied; changed: ${r.changedIds.join(', ') || '(serialization only)'}` : 'unchanged (zero diff)');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
