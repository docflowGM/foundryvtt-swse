#!/usr/bin/env node
// REPORT-ONLY production reconciliation: Pass 1 semantic finalTags vs current production system.tags.
// Joins authority to production by certified canonical ID (Phase 1A identity / Phase 1B dispositions). Names are diagnostic only.
// Writes only the two report files below; never touches production feat data. Pass 1 is INPUT_TO_PASS2, not production-final.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTHORITY_PATH, ROOT, loadContext, validateAuthority } from './validate-feat-tags-semantic-authority.mjs';

export const OUT_JSON = 'data/audits/feat-tags-production-reconciliation.json';
export const OUT_MD = 'docs/audits/feat-tags-production-reconciliation.md';
const CATALOG_PATH = 'data/feat-catalog.json';
const PACK_PATH = 'packs/feats.db';
const WP_PARENT = 'ecc2471ac96ec2d4';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const norm = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const sorted = (a) => [...a].sort();
const tagsOf = (rec) => (Array.isArray(rec?.system?.tags) ? rec.system.tags : []);

function loadProduction() {
  const raw = readJson(CATALOG_PATH);
  const catalog = Array.isArray(raw) ? raw : Object.values(raw);
  const byId = new Map(catalog.map(r => [r._id, r]));
  const pack = new Map();
  for (const line of fs.readFileSync(path.join(ROOT, PACK_PATH), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(line); pack.set(r._id, r); }
  return { catalog, byId, pack };
}

// Pure: builds the report object from loaded inputs. No writes.
export function reconcile(auth, ctx, prod) {
  const vocab = ctx.vocabulary;
  const disp = new Map(ctx.reconciliation.currentRecordDispositions.map(r => [r.repoId, r]));
  const authById = new Map(auth.assignments.map(a => [a.canonicalId, a]));
  const rows = [];
  for (const a of auth.assignments) {
    const m = ctx.manifest.records.find(r => r.canonicalId === a.canonicalId);
    const rec = prod.byId.get(a.canonicalId);
    const warnings = [];
    const final = a.finalTags;
    if (!rec) {
      rows.push({
        canonicalId: a.canonicalId, name: a.name, source: a.primaryPublication.source, identityKey: m?.identityKey ?? null,
        productionClassification: 'CANONICAL_IDENTITY_MISSING_FROM_PRODUCTION', repoRecord: null, productionTags: null,
        pass1FinalTags: final, tagsToAdd: [...final], tagsToRemove: [], tagsAlreadyMatching: [],
        productionTagsOutsideApprovedVocabulary: [], warnings: ['CANONICAL_IDENTITY_MISSING_FROM_PRODUCTION — report only; not created']
      });
      continue;
    }
    const prodTags = tagsOf(rec);
    const d = disp.get(a.canonicalId);
    if (!d || d.reconciliationDisposition !== 'PRESERVE_CANONICAL_RECORD') warnings.push('PHASE1B_DISPOSITION_NOT_PRESERVE_CANONICAL');
    if (norm(rec.name) !== norm(a.name)) warnings.push(`NAME_DIAGNOSTIC_MISMATCH: production "${rec.name}" vs authority "${a.name}"`);
    const packRec = prod.pack.get(a.canonicalId);
    if (!packRec) warnings.push('NOT_IN_PACK'); else if (JSON.stringify(tagsOf(packRec)) !== JSON.stringify(prodTags)) warnings.push('CATALOG_PACK_TAG_MISMATCH');
    const outside = prodTags.filter(t => !vocab.has(t));
    if (!prodTags.length) warnings.push('PRODUCTION_TAGS_EMPTY');
    if (outside.length) warnings.push(`PRODUCTION_TAGS_OUTSIDE_APPROVED_VOCABULARY (${outside.length})`);
    if (a.status !== 'CERTIFIED_PASS1') warnings.push(`AUTHORITY_STATUS ${a.status}`);
    const fs_ = new Set(final), ps = new Set(prodTags);
    rows.push({
      canonicalId: a.canonicalId, name: a.name, source: a.primaryPublication.source, identityKey: m?.identityKey ?? null,
      productionClassification: 'CANONICAL_RECORD_PRESENT', repoRecord: { path: `${CATALOG_PATH}#_id=${a.canonicalId}`, pack: `${PACK_PATH}#_id=${a.canonicalId}`, name: rec.name },
      productionTags: prodTags, pass1FinalTags: final,
      tagsToAdd: final.filter(t => !ps.has(t)), tagsToRemove: prodTags.filter(t => !fs_.has(t)), tagsAlreadyMatching: final.filter(t => ps.has(t)),
      productionTagsOutsideApprovedVocabulary: outside, warnings
    });
  }
  const wpAuth = authById.get(WP_PARENT);
  const derivatives = ctx.reconciliation.implementationDerivatives.map(dv => {
    const rec = prod.byId.get(dv.repoId);
    return {
      repoId: dv.repoId, name: rec?.name ?? dv.repoName, productionClassification: 'IMPLEMENTATION_DERIVATIVE_NOT_CANONICAL_IDENTITY',
      canonicalIdentity: false, parentCanonicalId: dv.parentCanonicalId, parentName: wpAuth?.name ?? null,
      productionTags: tagsOf(rec), parentPass1FinalTags: wpAuth?.finalTags ?? null, canonicalTagTransfer: 'NOT_PERFORMED_PENDING_PHASE_1C',
      note: 'Relationship only. The parent canonical tag set is not copied onto this derivative.'
    };
  });
  const removal = ctx.reconciliation.noncanonicalRemovalSet.map(r => ({
    repoId: r.repoId, name: r.repoName, phase0Classification: r.phase0Classification, productionClassification: 'NONCANONICAL_FEAT_RECORD_REMOVAL_PENDING',
    productionTags: tagsOf(prod.byId.get(r.repoId)), inCanonicalAuthority: authById.has(r.repoId)
  }));
  const present = rows.filter(r => r.productionClassification === 'CANONICAL_RECORD_PRESENT');
  const missing = rows.filter(r => r.productionClassification === 'CANONICAL_IDENTITY_MISSING_FROM_PRODUCTION');
  const sum = (f) => present.reduce((n, r) => n + f(r), 0);
  const totals = {
    canonicalAssignments: rows.length, canonicalPresentInProduction: present.length, canonicalMissingFromProduction: missing.length,
    missingCanonicalIds: missing.map(r => r.canonicalId).sort(),
    implementationDerivatives: derivatives.length, noncanonicalRecords: removal.length, productionRecords: prod.catalog.length,
    productionPartitionCheck: present.length + derivatives.length + removal.length,
    recordsExactlyMatching: present.filter(r => !r.tagsToAdd.length && !r.tagsToRemove.length).length,
    recordsWithProductionTagsOutsideVocabulary: present.filter(r => r.productionTagsOutsideApprovedVocabulary.length).length,
    recordsWithEmptyProductionTags: present.filter(r => !r.productionTags.length).length,
    tagsToAddTotal: sum(r => r.tagsToAdd.length) + missing.reduce((n, r) => n + r.tagsToAdd.length, 0), tagsToAddForPresentRecords: sum(r => r.tagsToAdd.length),
    tagsToRemoveTotal: sum(r => r.tagsToRemove.length), tagsToRemoveOutsideVocabulary: sum(r => r.productionTagsOutsideApprovedVocabulary.length),
    tagsToRemoveInsideVocabulary: sum(r => r.tagsToRemove.length - r.productionTagsOutsideApprovedVocabulary.length),
    tagsAlreadyMatchingTotal: sum(r => r.tagsAlreadyMatching.length), catalogPackTagMismatches: present.filter(r => r.warnings.includes('CATALOG_PACK_TAG_MISMATCH')).length
  };
  return {
    schemaVersion: '1.0', kind: 'FEAT_TAGS_PRODUCTION_RECONCILIATION', status: 'REPORT_ONLY_NO_PRODUCTION_MUTATION',
    authority: { file: AUTHORITY_PATH, status: auth.status, label: 'PASS1_COMPLETE / INPUT_TO_PASS2 (not production-final)' },
    join: 'canonical ID (Phase 1A identity manifest + Phase 1B dispositions); names are diagnostic only',
    productionSources: { catalog: CATALOG_PATH, pack: PACK_PATH },
    totals, canonical: rows, implementationDerivatives: derivatives, noncanonicalRecords: removal
  };
}

function render(rep) {
  const t = rep.totals;
  const L = ['# Feat Tags — Production Reconciliation (report-only)', '',
    `Authority: \`${rep.authority.file}\` — ${rep.authority.label}. Join key: canonical ID. **No production record was changed.**`, '',
    '## Totals', '', '| Item | Value |', '| --- | ---: |',
    ...Object.entries(t).filter(([, v]) => typeof v === 'number').map(([k, v]) => `| ${k} | ${v} |`), '',
    `Missing canonical identities (reported, not created): ${t.missingCanonicalIds.map(i => `\`${i}\``).join(', ')}.`, '',
    '## Partition', '', `Production ${t.productionRecords} records = ${t.canonicalPresentInProduction} canonical + ${t.implementationDerivatives} implementation derivatives + ${t.noncanonicalRecords} noncanonical (partition check ${t.productionPartitionCheck}). ${t.canonicalMissingFromProduction} canonical identities have no production record.`, '',
    '## Implementation derivatives (isolated; canonical tags are not transferred)', '', '| Repo ID | Name | Parent | Production tags |', '| --- | --- | --- | --- |',
    ...rep.implementationDerivatives.map(d => `| \`${d.repoId}\` | ${d.name} | ${d.parentName} (\`${d.parentCanonicalId}\`) | ${d.productionTags.length} |`), '',
    '## Noncanonical records (isolated; not in canonical authority)', '', `${rep.noncanonicalRecords.length} records; none appears in the semantic authority (${rep.noncanonicalRecords.filter(r => r.inCanonicalAuthority).length} found).`, '',
    '## Canonical feats', '', '| Feat | Canonical ID | Status | Prod tags | Add | Remove (in vocab / outside) | Match | Warnings |', '| --- | --- | --- | ---: | ---: | --- | ---: | --- |'];
  for (const r of rep.canonical) {
    const pt = r.productionTags ? r.productionTags.length : '—';
    L.push(`| ${r.name} | \`${r.canonicalId}\` | ${r.productionClassification === 'CANONICAL_RECORD_PRESENT' ? 'present' : 'MISSING'} | ${pt} | ${r.tagsToAdd.length} | ${r.tagsToRemove.length - r.productionTagsOutsideApprovedVocabulary.length} / ${r.productionTagsOutsideApprovedVocabulary.length} | ${r.tagsAlreadyMatching.length} | ${r.warnings.length} |`);
  }
  L.push('', 'Per-feat tag arrays and warning text are in the JSON report.', '');
  return L.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const auth = readJson(AUTHORITY_PATH);
  const ctx = loadContext();
  const v = validateAuthority(auth, ctx);
  if (v.failures.length) { console.error('authority validation failed; refusing to reconcile'); for (const f of v.failures.slice(0, 20)) console.error(' - ' + f); process.exit(1); }
  const rep = reconcile(auth, ctx, loadProduction());
  const t = rep.totals;
  if (t.canonicalAssignments !== 353 || t.canonicalPresentInProduction !== 351 || t.canonicalMissingFromProduction !== 2 || t.implementationDerivatives !== 6 || t.noncanonicalRecords !== 33 || t.productionPartitionCheck !== 390) {
    console.error('RECONCILIATION TOTALS DIFFER FROM CERTIFIED STATE', JSON.stringify(t)); process.exit(1);
  }
  if (JSON.stringify(t.missingCanonicalIds) !== JSON.stringify(['c352f81dde5c9dff', 'c9c4130a55761330'])) { console.error('missing canonical IDs differ'); process.exit(1); }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), JSON.stringify(rep, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, OUT_MD), render(rep));
  console.log(`FEAT TAGS PRODUCTION RECONCILIATION (report-only): ${t.canonicalAssignments} canonical = ${t.canonicalPresentInProduction} present + ${t.canonicalMissingFromProduction} missing; ${t.implementationDerivatives} derivatives; ${t.noncanonicalRecords} noncanonical; production ${t.productionRecords}`);
  console.log(`  exactly matching ${t.recordsExactlyMatching}; tags to add ${t.tagsToAddTotal}; tags to remove ${t.tagsToRemoveTotal} (${t.tagsToRemoveOutsideVocabulary} outside vocabulary); already matching ${t.tagsAlreadyMatchingTotal}`);
}
