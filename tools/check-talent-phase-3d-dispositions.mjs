#!/usr/bin/env node
// Phase 3D disposition manifest checker (read-only). Fails when:
//  - the manifest does not account for exactly the 92 census records, once each
//  - a disposition is unknown
//  - a MERGE_DUPLICATE survivor / any repoint replacement does not exist in the production packs
//  - a deletion (MERGE_DUPLICATE / REMOVE_CONTAMINATION) leaves a live actor-pack reference unlisted or unrepointed
//  - a KEEP record no longer exists
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readDb = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

export function checkDispositions({ manifest, census, talents, actors }) {
  const errors = [];
  const ids = new Set(talents.map(t => t._id));
  const allowed = new Set(manifest.allowedDispositions);
  const expected = new Set(census.records.map(r => r.productionId));
  const seen = new Map();
  for (const r of manifest.records) seen.set(r.productionId, (seen.get(r.productionId) || 0) + 1);
  for (const id of expected) if (!seen.has(id)) errors.push(`missing record ${id}`);
  for (const [id, n] of seen) { if (n > 1) errors.push(`record appears ${n} times: ${id}`); if (!expected.has(id)) errors.push(`record not in census: ${id}`); }
  if (manifest.records.length !== 92 || manifest.inputPopulation !== 92) errors.push(`manifest must account for exactly 92 input records (got ${manifest.records.length})`);
  for (const r of manifest.records) {
    const tag = `${r.productionId} ${r.name}`;
    if (!allowed.has(r.finalDisposition)) { errors.push(`${tag}: unknown disposition ${r.finalDisposition}`); continue; }
    const deletes = r.finalDisposition === 'MERGE_DUPLICATE' || r.finalDisposition === 'REMOVE_CONTAMINATION';
    if (r.finalDisposition === 'MERGE_DUPLICATE') {
      if (!r.survivorId || !ids.has(r.survivorId)) errors.push(`${tag}: MERGE_DUPLICATE survivor ${r.survivorId} does not exist`);
      if (r.survivorId === r.productionId) errors.push(`${tag}: survivor equals duplicate`);
    }
    if (r.finalDisposition.startsWith('KEEP') && !ids.has(r.productionId)) errors.push(`${tag}: KEEP record missing from production`);
    if (deletes && r.adjudicationStatus === 'ADJUDICATED') {
      const listed = r.referencesToRepoint?.actorPackEmbeddedItems || [];
      const live = [];
      for (const [pack, list] of Object.entries(actors)) for (const a of list) (a.items || []).forEach((it, i) => {
        if ((it.flags?.core?.sourceId || '').endsWith(r.productionId)) live.push(`${pack}|${a._id}|${i}`);
      });
      const listedKeys = new Set(listed.map(x => `${x.pack}|${x.actorId}|${x.itemIndex}`));
      for (const k of live) if (!listedKeys.has(k)) errors.push(`${tag}: unresolved live actor reference ${k}`);
      for (const k of listedKeys) if (!live.includes(k)) errors.push(`${tag}: listed reference ${k} is not live (stale manifest)`);
      for (const x of listed) if (!x.replacementId || !ids.has(x.replacementId)) errors.push(`${tag}: repoint replacement ${x.replacementId} for ${x.actor} does not exist`);
      if (!r.referencesToRepoint?.structural?.length) errors.push(`${tag}: deletion lists no structural (tree/registry) handling`);
      if (r.expectedFinal?.recordExists !== false) errors.push(`${tag}: deletion must declare expectedFinal.recordExists=false`);
    }
    if (deletes && r.adjudicationStatus !== 'ADJUDICATED') errors.push(`${tag}: deletion disposition without adjudication`);
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkDispositions({
    manifest: readJson('data/audits/talent-phase-3d-dispositions.json'),
    census: readJson('data/audits/talent-phase-3d-production-extras-census.json'),
    talents: readDb('packs/talents.db'),
    actors: { heroic: readDb('packs/heroic.db'), nonheroic: readDb('packs/nonheroic.db'), npc: readDb('packs/npc.db') }
  });
  const m = readJson('data/audits/talent-phase-3d-dispositions.json');
  const tally = m.records.reduce((o, r) => (o[r.finalDisposition] = (o[r.finalDisposition] || 0) + 1, o), {});
  console.log('[phase-3d-dispositions]', JSON.stringify(tally), `adjudicated=${m.records.filter(r => r.adjudicationStatus === 'ADJUDICATED').length}/92`);
  if (errors.length) { errors.forEach(e => console.error('  FAIL ' + e)); process.exit(1); }
  console.log('[phase-3d-dispositions] PASS');
}
