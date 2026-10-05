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

/**
 * Normalize an owner authority file to [{ archetypeId, replace }]. Two owner schemas exist:
 *  - v2: records[].{archetypeId, replace{4 dotted fields}}, with an executionContract.
 *  - v1.0: records[].{id, primary, supporting, all, tagProvenance:{phase12b:{curated:{...},authority}}}.
 * For v1.0 the nested provenance is mapped mechanically to the flat dotted-key form already used
 * in data/archetypes.json ("phase12b.curated.primary": [...]); the informational `authority`
 * string is not carried into the dataset (owner ruling). Anything unrecognized fails closed.
 */
export function normalizeAuthority(authority) {
  if (!Array.isArray(authority?.records) || authority.records.length === 0) throw new Error('authority has no records');
  if (authority.schemaVersion === 2) {
    if (authority.executionContract?.claudeMayInfer !== false) throw new Error('authority must declare claudeMayInfer: false');
    if (JSON.stringify(authority.executionContract.allowedFields ?? []) !== JSON.stringify(ALLOWED_FIELDS)) {
      throw new Error('authority allowedFields differ from the 12B contract');
    }
    return {
      certified: authority.rolling?.certifiedRecordCount ?? authority.records.length,
      records: authority.records.map((r) => ({ archetypeId: r.archetypeId, kind: r.kind, parentId: r.parentId ?? null, replace: r.replace }))
    };
  }
  if (authority.schemaVersion === '1.0' && authority.kind === 'SWSE_ARCHETYPE_PHASE_12B_SEMANTIC_CURATION') {
    const records = authority.records.map((r) => {
      const phase = r.tagProvenance?.phase12b;
      const extra = Object.keys(r.tagProvenance ?? {}).filter((k) => k !== 'phase12b');
      const phaseExtra = Object.keys(phase ?? {}).filter((k) => k !== 'curated' && k !== 'authority');
      const curatedKeys = Object.keys(phase?.curated ?? {});
      if (!phase?.curated || extra.length || phaseExtra.length || curatedKeys.some((k) => k !== 'primary' && k !== 'supporting')) {
        throw new Error(`authority record "${r.id}": unrecognized tagProvenance shape`);
      }
      return {
        archetypeId: r.id,
        replace: {
          'metadata.tags.primary': r.primary,
          'metadata.tags.supporting': r.supporting,
          'metadata.tags.all': r.all,
          'metadata.tagProvenance': Object.fromEntries(curatedKeys.map((k) => [`phase12b.curated.${k}`, phase.curated[k]]))
        }
      };
    });
    if (authority.certifiedCount !== records.length) throw new Error(`authority certifiedCount ${authority.certifiedCount} != ${records.length} records`);
    return { certified: authority.certifiedCount, records };
  }
  throw new Error('unrecognized authority schema');
}

/** Pure: apply authority to a parsed dataset. Returns { dataset, changedIds }. Throws on any mismatch. */
export function applyCuration(dataset, rawAuthority, ontologyTags) {
  const { records, certified } = normalizeAuthority(rawAuthority);
  const out = clone(dataset);
  const seen = new Set();
  const changedIds = [];
  for (const rec of records) {
    const id = rec.archetypeId;
    if (seen.has(id)) throw new Error(`duplicate authority record: ${id}`);
    seen.add(id);
    const target = out.archetypes[id];
    if (!target) throw new Error(`authority record "${id}" does not exist in ${DATASET_PATH}`);
    if (rec.kind !== undefined && (rec.kind !== target.kind || (rec.parentId ?? null) !== (target.parentId ?? null))) {
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
  return { dataset: out, changedIds, certified };
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
