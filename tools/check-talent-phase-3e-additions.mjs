#!/usr/bin/env node
// Phase 3E-1 checker (read-only): the authority addendum must bring the certified authority layer level with production.
//   1. the 1,180 certified identities map 1:1 to 1,180 production ids (Phase 3B manifests)
//   2. production ids outside that set are EXACTLY the addendum's additions (no unexplained extra, none missing)
//   3. each addition is a new identity, sits in a registry tree, is a member of that tree, and production matches either the audited
//      snapshot or the authority text (so a later, manifest-driven repair keeps the gate green)
//   4. verification evidence is internally consistent (PDF_VERIFIED rows carry exact text and a page)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCommittedManifests } from './apply-talent-phase-3c.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const ndjson = rel => read(rel).split('\n').filter(Boolean).map(JSON.parse);
const norm = s => String(s ?? '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function checkAdditions({ addendum, certifiedIds, canonicalIdentities, production, trees, registry, census }) {
  const errors = [];
  const fail = m => errors.push(m);
  const prodById = new Map(production.map(t => [t._id, t]));
  const adds = addendum.additions;

  // 1 + 2: the completeness equation between authority and production
  if (certifiedIds.size !== addendum.arithmetic.certifiedIdentities) fail(`certified identities map to ${certifiedIds.size} production ids, expected ${addendum.arithmetic.certifiedIdentities}`);
  for (const id of certifiedIds) if (!prodById.has(id)) fail(`certified identity id ${id} is missing from production`);
  const leftover = production.filter(t => !certifiedIds.has(t._id)).map(t => t._id).sort();
  const addIds = adds.map(a => a.production.id).sort();
  if (JSON.stringify(leftover) !== JSON.stringify(addIds)) fail(`production ids outside the certified authority (${leftover.join(',')}) differ from the addendum (${addIds.join(',')})`);
  if (production.length !== addendum.arithmetic.productionCanonicalPack && production.length !== certifiedIds.size + adds.length) fail(`production pack has ${production.length} records, expected ${certifiedIds.size + adds.length}`);
  if (addendum.arithmetic.resultingIdentities !== certifiedIds.size + adds.length || addendum.arithmetic.resultingClaims !== addendum.arithmetic.certifiedClaims + adds.length) fail('addendum arithmetic does not add up');

  // 3: per-addition identity checks
  const seen = new Set();
  for (const a of adds) {
    const tag = `${a.canonicalIdentity}`;
    if (seen.has(a.canonicalIdentity)) fail(`${tag}: listed twice`); seen.add(a.canonicalIdentity);
    if (canonicalIdentities.has(a.canonicalIdentity)) fail(`${tag}: already a certified canonical identity`);
    if (a.canonicalIdentity !== `${a.treeOriginSourcebook}|${a.treeName}|${a.name}`) fail(`${tag}: identity is not treeOrigin|tree|name`);
    const entry = registry.find(e => e.canonicalTreeKey === a.canonicalTreeKey);
    if (!entry) { fail(`${tag}: tree ${a.canonicalTreeKey} is not in the Phase 1D registry`); continue; }
    const p = prodById.get(a.production.id);
    if (!p) { fail(`${tag}: production record ${a.production.id} missing`); continue; }
    if (p.name !== a.name) fail(`${tag}: production name is "${p.name}"`);
    if (!entry.repoTreeIds.includes(p.system.treeId)) fail(`${tag}: production treeId ${p.system.treeId} is not a registry tree for ${a.canonicalTreeKey}`);
    const tree = trees.find(t => entry.repoTreeIds.includes(t._id) && t.system.talentIds.includes(p._id));
    if (!tree) fail(`${tag}: not a member of any registry tree for ${a.canonicalTreeKey}`);
    if (!a.verification?.evidence?.length) fail(`${tag}: no verification evidence`);
    // production matches the audited snapshot OR the authority (repaired)
    const snap = a.production, cur = { source: p.system.source ?? null, page: p.system.page ?? null, prerequisites: p.system.prerequisites ?? '', benefit: p.system.benefit };
    const audited = JSON.stringify([snap.source, snap.page, snap.prerequisites, snap.benefit]) === JSON.stringify([cur.source, cur.page, cur.prerequisites, cur.benefit]);
    const repaired = cur.source === a.publication.sourcebook && cur.page === a.publication.page && norm(cur.prerequisites) === norm(a.prerequisites) && (a.rulesText ? norm(cur.benefit) === norm(a.rulesText) : true);
    if (!audited && !repaired) fail(`${tag}: production has drifted from both the audited snapshot and the authority text`);
    // 4: evidence consistency
    if (a.publication.pageStatus === 'PDF_VERIFIED' && !(a.publication.page > 0)) fail(`${tag}: PDF_VERIFIED page without a page number`);
    if (a.rulesTextStatus === 'PDF_VERIFIED' && !a.rulesText) fail(`${tag}: PDF_VERIFIED text without the exact wording`);
    if (a.publication.pageStatus === 'PDF_REQUIRED' && a.publication.page !== null) fail(`${tag}: PDF_REQUIRED page must stay null until verified`);
  }

  // Gunslinger: the addendum's two p.217 rows equal the PDF-verified census
  for (const name of ['Ranged Disarm', 'Trigger Work']) {
    const a = adds.find(x => x.name === name);
    if (!a) { fail(`addendum is missing ${name}`); continue; }
    if (norm(a.rulesText) !== norm(census.pdfVerification.exactWording[name])) fail(`${name}: addendum wording differs from the PDF-verified census`);
    if (a.publication.page !== census.pdfVerification.pages[name]) fail(`${name}: addendum page differs from the PDF-verified census`);
  }
  const gun = registry.find(e => e.canonicalTreeKey === 'Saga Edition Core Rulebook|Gunslinger');
  const delta = addendum.treeRosterDeltas.find(d => d.tree === 'Gunslinger');
  if (!delta || delta.originRosterBefore !== gun.originTalentNames.length || delta.originRosterAfter !== gun.originTalentNames.length + delta.add.length || delta.originRosterAfter !== census.layerCounts.sourceTxt) fail('Gunslinger roster delta does not reconcile registry (5) -> source census (7)');
  return errors;
}

export function loadAll() {
  const certifiedIds = new Set();
  for (const { manifest } of loadCommittedManifests()) for (const r of manifest.records) { const i = r.identityResolution; const id = i.productionRecordId || i.createRecordId; if (id) certifiedIds.add(id); }
  return {
    addendum: readJson('data/audits/talent-phase-3e-canonical-additions.json'), certifiedIds,
    canonicalIdentities: new Set(readJson('data/canonical/talents.json').records.map(r => r.canonicalIdentity)),
    production: ndjson('packs/talents.db'), trees: ndjson('packs/talent_trees.db'),
    registry: readJson('data/audits/talent-canonical-tree-registry.json').entries,
    census: readJson('data/audits/talent-phase-3e-core-gunslinger-census.json')
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = loadAll();
  const errors = checkAdditions(input);
  const a = input.addendum;
  console.log(`[3e-additions] certified ${a.arithmetic.certifiedIdentities} + additions ${a.additions.length} = ${a.arithmetic.resultingIdentities} identities (production ${input.production.length})`);
  if (errors.length) { errors.forEach(e => console.error('  FAIL ' + e)); process.exit(1); }
  console.log('[3e-additions] PASS');
}
