#!/usr/bin/env node
// Deterministic Pass 3 baseline checkpoint: the certified Phase 12 final talent tag state for all 1,187 canonical talents.
// Reconstructed ONLY from the existing authority chain (QA5 certified assignments for 1,185 + the final ontology adjudication for the other 2)
// and verified EXACTLY (tag arrays, element order) against packs/talents.db. Fails closed on any mismatch; never guesses.
// Phase 12 authority files are historical evidence: they are hashed here and never rewritten. No production mutation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE_PATH = 'data/audits/talent-feat-pass3a-baseline.json';
export const PACK_PATH = 'packs/talents.db';
export const PHASE12_FILES = {
  qa5: 'data/audits/talent-phase-12-global-semantic-authority-qa5.json',
  p121: 'data/audits/talent-phase-12-1-semantic-tag-authority.json',
  p122: 'data/audits/talent-phase-12-2-existing-tag-authority.json',
  final: 'data/audits/talent-phase-12-final-ontology-adjudication.json'
};
export const OWNER_SKILL_TAGS = ['acrobatics', 'climb', 'endurance', 'gather_information', 'jump', 'swim'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function loadPack() {
  const recs = fs.readFileSync(path.join(ROOT, PACK_PATH), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const byId = new Map(recs.map(r => [r._id, r]));
  if (byId.size !== recs.length) throw new Error('duplicate _id in packs/talents.db');
  return { recs, byId };
}

// Shared Pass 3 vocabulary = Phase 12 final 181-tag vocabulary + the six owner-authorized skill tags (187). Phase 12 file is not rewritten.
export function sharedVocabulary() {
  const final = readJson(PHASE12_FILES.final);
  const base = final.vocabulary.finalVocabulary;
  if (base.length !== 181 || final.vocabulary.finalVocabularyCount !== 181) throw new Error('Phase 12 final vocabulary != 181');
  for (const t of OWNER_SKILL_TAGS) if (base.includes(t)) throw new Error(`owner skill tag ${t} unexpectedly already in the Phase 12 vocabulary`);
  const list = [...base, ...OWNER_SKILL_TAGS];
  if (new Set(list).size !== 187) throw new Error('shared vocabulary != 187 unique tags');
  return { base, list, set: new Set(list), retired: new Set(final.vocabulary.retiredTags) };
}

export function buildBaseline() {
  const fail = (m) => { throw new Error(`PASS3A BASELINE FAILED: ${m}`); };
  const { recs, byId } = loadPack();
  const qa5 = readJson(PHASE12_FILES.qa5), fin = readJson(PHASE12_FILES.final);
  if (fin.status !== 'FINAL_FOR_EXECUTION') fail(`final ontology status ${fin.status}`);
  const vocab = sharedVocabulary();
  const chain = new Map();
  for (const a of qa5.certifiedAssignments) { if (chain.has(a.canonicalId)) fail(`duplicate QA5 assignment ${a.canonicalId}`); chain.set(a.canonicalId, { tags: a.finalTags, name: a.name, source: a.sourcebook, page: a.page, authority: `PHASE12_QA5_CERTIFIED:${a.origin}:${a.batch}` }); }
  if (chain.size !== 1185) fail(`QA5 certified assignments ${chain.size} != 1185`);
  for (const a of fin.assignments) { if (chain.has(a.canonicalId)) fail(`final adjudication overlaps QA5 for ${a.canonicalId}`); chain.set(a.canonicalId, { tags: a.finalTags, name: a.name, source: a.sourcebook, page: a.page, authority: 'PHASE12_FINAL_ONTOLOGY_ADJUDICATION' }); }
  if (chain.size !== 1187 || recs.length !== 1187) fail(`chain ${chain.size} / pack ${recs.length} != 1187`);
  const records = [];
  for (const r of recs) {
    const c = chain.get(r._id);
    if (!c) fail(`pack record ${r._id} (${r.name}) is not in the Phase 12 authority chain`);
    const tags = r.system?.tags;
    if (!Array.isArray(tags)) fail(`${r._id}: pack tags is not an array`);
    if (JSON.stringify(tags) !== JSON.stringify(c.tags)) fail(`${r._id} (${r.name}): pack tags differ from the Phase 12 final state (${JSON.stringify(tags)} vs ${JSON.stringify(c.tags)})`);
    if (r.name !== c.name) fail(`${r._id}: pack name "${r.name}" != authority "${c.name}"`);
    for (const t of tags) if (!vocab.set.has(t) || !vocab.base.includes(t)) fail(`${r._id} (${r.name}): tag ${t} is outside the 181-tag Phase 12 vocabulary`);
    if (new Set(tags).size !== tags.length) fail(`${r._id}: duplicate tags`);
    if (tags.includes('use_the_force') && !tags.includes('force')) fail(`${r._id} (${r.name}): use_the_force without force in the baseline`);
    records.push({ canonicalId: r._id, name: r.name, source: r.system.source ?? null, page: r.system.page ?? null, authoritySource: c.authority, tags: [...tags] });
  }
  records.sort((a, b) => cmp(a.canonicalId, b.canonicalId));
  const used = new Set(records.flatMap(r => r.tags));
  if (used.size !== 181) fail(`baseline uses ${used.size} distinct tags != 181`);
  const instances = records.reduce((n, r) => n + r.tags.length, 0);
  return {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3A_BASELINE', status: 'RECONSTRUCTED_EXACT_MATCH_TO_PACK',
    note: 'Pre-Pass-3 certified talent tag state, reconstructed from the Phase 12 chain and verified exactly (including tag order) against packs/talents.db. Canonical ID is the mutation identity; name/source/page are guards.',
    counts: { records: records.length, qa5CertifiedRecords: 1185, finalOntologyAdjudicatedRecords: 2, tagInstances: instances, distinctTagsUsed: used.size, phase12FinalVocabulary: 181, sharedPass3Vocabulary: 187 },
    packSha256: sha(PACK_PATH),
    phase12AuthoritySha256: Object.fromEntries(Object.entries(PHASE12_FILES).map(([k, f]) => [f, sha(f)])),
    records
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = JSON.stringify(buildBaseline(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path.join(ROOT, BASELINE_PATH), 'utf8') !== out) { console.error('Committed Pass 3A baseline differs from a fresh reconstruction'); process.exit(1); }
    console.log('PASS 3A BASELINE MATCHES A FRESH RECONSTRUCTION');
  } else {
    fs.writeFileSync(path.join(ROOT, BASELINE_PATH), out);
    const b = JSON.parse(out);
    console.log(`PASS 3A BASELINE: ${b.counts.records} talents exactly match the Phase 12 final state; ${b.counts.tagInstances} tag instances; ${b.counts.distinctTagsUsed} distinct tags; shared vocabulary ${b.counts.sharedPass3Vocabulary}`);
  }
}
