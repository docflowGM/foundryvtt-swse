#!/usr/bin/env node
// Phase 3D disposition manifest checker (read-only). Fails when:
//  - the manifest does not account for exactly the 92 census records, once each
//  - a disposition is unknown
//  - a MERGE_DUPLICATE survivor / any repoint replacement does not exist in the production packs
//  - a removal from the canonical pack (MERGE_DUPLICATE / REMOVE_CONTAMINATION / MOVE_HOMEBREW_PACK) leaves a live actor-pack reference unlisted or unrepointed
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
  const deletedIds = new Set(manifest.records.filter(r => r.finalDisposition === 'MERGE_DUPLICATE' || r.finalDisposition === 'REMOVE_CONTAMINATION' || r.finalDisposition === 'MOVE_HOMEBREW_PACK').map(r => r.productionId));
  for (const r of manifest.records) {
    const tag = `${r.productionId} ${r.name}`;
    if (!allowed.has(r.finalDisposition)) { errors.push(`${tag}: unknown disposition ${r.finalDisposition}`); continue; }
    const deletes = r.finalDisposition === 'MERGE_DUPLICATE' || r.finalDisposition === 'REMOVE_CONTAMINATION' || r.finalDisposition === 'MOVE_HOMEBREW_PACK';
    if (r.finalDisposition === 'MOVE_HOMEBREW_PACK' && (r.homebrewMove?.idPreserved !== true || !r.homebrewMove?.targetPack)) errors.push(`${tag}: MOVE_HOMEBREW_PACK must preserve the _id and name a target pack`);
    if (r.finalDisposition === 'MERGE_DUPLICATE') {
      if (!r.survivorId || !ids.has(r.survivorId)) errors.push(`${tag}: MERGE_DUPLICATE survivor ${r.survivorId} does not exist`);
      if (r.survivorId === r.productionId) errors.push(`${tag}: survivor equals duplicate`);
    }
    if (r.finalDisposition === 'MERGE_DUPLICATE' && deletedIds.has(r.survivorId)) errors.push(`${tag}: survivor ${r.survivorId} is itself scheduled for deletion`);
    if (r.finalDisposition === 'REVIEW_REQUIRED' && !r.reviewRequiredReason) errors.push(`${tag}: REVIEW_REQUIRED without a concrete reviewRequiredReason`);
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
  for (const rp of manifest.runtimeDataRepoints ?? []) {
    if (!deletedIds.has(rp.from)) errors.push(`runtime repoint ${rp.file}: source ${rp.from} is not a record leaving the canonical pack`);
    if (!ids.has(rp.to) || deletedIds.has(rp.to)) errors.push(`runtime repoint ${rp.file}: target ${rp.to} must exist and stay canonical`);
    if (!(rp.expectedOccurrences > 0)) errors.push(`runtime repoint ${rp.file}: expectedOccurrences missing`);
  }
  const cp = manifest.canonicalPrerequisiteRepoints;
  if (cp) {
    if (cp.flag !== 'PHASE_3C_CANONICAL_RECORD_TOUCHED') errors.push('canonicalPrerequisiteRepoints must carry the PHASE_3C_CANONICAL_RECORD_TOUCHED flag');
    const byId = new Map(talents.map(t => [t._id, t]));
    const seen = new Set();
    for (const r of cp.repoints) {
      const t = byId.get(r.recordId), key = r.recordId + '|' + r.path;
      if (seen.has(key)) errors.push(`canonical prerequisite repoint listed twice: ${key}`); seen.add(key);
      if (!t) { errors.push(`canonical prerequisite repoint: record ${r.recordId} does not exist`); continue; }
      if (deletedIds.has(r.recordId) || expected.has(r.recordId)) errors.push(`canonical prerequisite repoint: ${r.recordName} must be a canonical record outside the inherited 92`);
      if (!/^system\.prerequisitesStructured\.conditions\[\d+\]\.id$/.test(r.path)) errors.push(`canonical prerequisite repoint ${key}: path is not an allow-listed prerequisitesStructured condition id leaf`);
      if (!ids.has(r.to) || deletedIds.has(r.to)) errors.push(`canonical prerequisite repoint ${key}: target ${r.to} must exist and stay canonical`);
      if (r.phase3cCanonicalRecordTouched !== true) errors.push(`canonical prerequisite repoint ${key}: must be marked phase3cCanonicalRecordTouched`);
      if (manifest.records.length && t.system.prerequisites !== r.preservePrerequisiteText && ids.has(r.recordId)) errors.push(`canonical prerequisite repoint ${key}: prerequisite text is ${JSON.stringify(t.system.prerequisites)}, expected ${JSON.stringify(r.preservePrerequisiteText)}`);
    }
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
