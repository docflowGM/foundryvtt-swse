#!/usr/bin/env node
// Phase 3D-1: read-only census of the 92 production records protected in Phase 3C
// (90 production-only deferred + 2 review-only extras). Writes no production data.
//   node tools/build-talent-phase-3d-census.mjs           -> writes census JSON + MD
//   node tools/build-talent-phase-3d-census.mjs --check   -> fails if committed census is stale
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JSON = 'data/audits/talent-phase-3d-production-extras-census.json';
const OUT_MD = 'docs/audits/talent-phase-3d-production-extras-census.md';
const OUT_REF = 'data/audits/talent-phase-3d-reference-impact.json';
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readDb = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const norm = s => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const closeout = readJson('data/audits/talent-phase-3b-global-closeout.json');
const canonical = readJson('data/canonical/talents.json');
const talents = readDb('packs/talents.db');
const trees = readDb('packs/talent_trees.db');
const classes = readDb('packs/classes.db');
const byId = new Map(talents.map(t => [t._id, t]));
const treeById = new Map(trees.map(t => [t._id, t]));

/* ---- protected population (exactly the Phase 3C closeout's) ---- */
const deferred = closeout.productionOnlyDeferred.map(d => ({ ...d, group: 'DEFERRED_PRODUCTION_ONLY' }));
const extras = closeout.reviewExtras.map(e => ({
  productionRecordId: e.productionRecordId, name: e.name, treeId: e.treeClaims[0].treeId, treeName: e.treeClaims[0].treeName,
  registryKey: `${e.sourcebook}|${e.treeClaims[0].treeName}`, registryStatus: 'REVIEW_EXTRA', classification: e.classification,
  relatedCanonicalIdentity: e.relatedCanonicalIdentity, group: 'REVIEW_EXTRA'
}));
const protectedList = [...extras, ...deferred];
if (protectedList.length !== 92 || new Set(protectedList.map(p => p.productionRecordId)).size !== 92) {
  throw new Error(`census population must be exactly 92 unique records, got ${protectedList.length}`);
}

/* ---- sourcebook text index ---- */
const bookDir = path.join(ROOT, 'reference/sourcebooks');
const books = fs.readdirSync(bookDir).filter(f => f.endsWith('.txt')).sort().map(f => ({
  file: f, lines: fs.readFileSync(path.join(bookDir, f), 'utf8').split('\n')
}));
const normBooks = books.map(b => ({ file: b.file, lines: b.lines.map(norm) }));
function sourcebookSearch(name) {
  const n = norm(name); if (!n) return [];
  const hits = [];
  for (const b of normBooks) {
    const at = [];
    b.lines.forEach((l, i) => { if (l === n || l.startsWith(n + ' ') || l.includes(' ' + n + ' ') || l.endsWith(' ' + n)) at.push(i + 1); });
    if (at.length) hits.push({ file: b.file, matchLines: at.length, firstLines: at.slice(0, 5), headingLikeLines: at.filter(i => b.lines[i - 1] === n).slice(0, 5) });
  }
  return hits;
}

/* ---- repository reference search (by production ID) ---- */
function repoRefs(id) {
  const r = spawnSync('git', ['grep', '-c', '-F', id, '--', '.', ':!packs/talents.db', ':!data/audits/talent-phase-3d-*', ':!docs/audits/talent-phase-3d-*', ':!tools/*talent-phase-3d*', ':!tests/talent-phase-3d-*'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  return (r.stdout || '').split('\n').filter(Boolean).map(l => { const i = l.lastIndexOf(':'); return { file: l.slice(0, i), count: Number(l.slice(i + 1)) }; })
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(x => ({ ...x, classification: classifyRef(x.file) }));
}
// Reference classes drive the Phase 3D reference-impact report (which must be repointed before any deletion).
function classifyRef(f) {
  if (f === 'packs/talent_trees.db') return 'STRUCTURAL_TREE_MEMBERSHIP';
  if (/^data\/(generated|fixes)\/talent-trees\.registry\.json$/.test(f)) return 'STRUCTURAL_RUNTIME_REGISTRY';
  if (/^data\/(generated|fixes)\/talents\.fixed\.json$/.test(f)) return 'GENERATED_DERIVED_DATA';
  if (/^packs\/(heroic|nonheroic|npc|droids|vehicles|beasts)[^/]*\.db$/.test(f) || /^packs\/[^/]+\.db$/.test(f)) return 'ACTOR_OR_PACK_DATA';
  if (/^data\/audits?\//.test(f) || /^docs\/audits\//.test(f)) return 'AUDIT_HISTORY';
  if (/^tests\//.test(f)) return 'TEST';
  if (/^tools\//.test(f)) return 'TOOL';
  if (/^docs\//.test(f)) return 'DOC_OR_CLEANUP_PLAN';
  if (/^scripts\//.test(f)) return 'RUNTIME_CODE';
  return 'OTHER_DATA';
}

/* ---- canonical index ---- */
const canByName = new Map();
for (const c of canonical.records) { const k = norm(c.name); if (!canByName.has(k)) canByName.set(k, []); canByName.get(k).push(c); }
const canByTreeName = new Map();
for (const c of canonical.records) { const k = norm(c.tree); if (!canByTreeName.has(k)) canByTreeName.set(k, []); canByTreeName.get(k).push(c); }
const slim = c => ({ canonicalIdentity: c.canonicalIdentity, name: c.name, tree: c.tree, source: c.source, page: c.page });

/* ---- provisional (NON-FINAL) disposition; Phase 3D-2 owns the final ones ---- */
function provisional(p, rec, sameNameCanon, sameTreeCanon, hits) {
  if (p.group === 'REVIEW_EXTRA') return { value: 'REVIEW_REQUIRED', basis: 'known duplicate-name review extra; needs explicit identity proof', confidence: 'LOW' };
  const st = p.registryStatus ?? 'UNREGISTERED_OR_NONCANONICAL_TREE';
  const exact = sameNameCanon.some(c => norm(c.tree) === norm(p.treeName));
  if (exact) return { value: 'MERGE_DUPLICATE', basis: 'same normalized name inside a same-named canonical tree', confidence: 'MEDIUM' };
  if (st === 'REPO_ONLY_NONCANONICAL_HOMEBREW') return { value: 'REVIEW_REQUIRED', basis: 'registry flags repo-only noncanonical/homebrew; needs source proof' + (hits.length ? ' (name appears in sourcebook text)' : ''), confidence: 'LOW' };
  if (st === 'SOURCE_VERIFIED_SPECIAL_TREE') return { value: 'KEEP_NONBOOK_SUPPORTED', basis: 'registry status SOURCE_VERIFIED_SPECIAL_TREE; publication evidence to be confirmed', confidence: 'LOW' };
  if (st === 'REPO_TREE_PRESENT') return { value: 'REVIEW_REQUIRED', basis: sameTreeCanon.length ? 'tree exists in canon; talent is not a canonical member' : 'tree present in repo only', confidence: 'LOW' };
  return { value: 'REVIEW_REQUIRED', basis: `registry status ${st}`, confidence: 'LOW' };
}

const records = protectedList.map(p => {
  const rec = byId.get(p.productionRecordId);
  if (!rec) throw new Error('protected record missing from packs: ' + p.productionRecordId);
  const memberOf = trees.filter(t => (t.system.talentIds || []).includes(rec._id)).map(t => ({ treeId: t._id, treeName: t.name }));
  const tid = rec.system.treeId || p.treeId; const tree = treeById.get(tid);
  const classAccess = classes.filter(c => (c.system.talentTreeIds || []).includes(tid)).map(c => ({ classId: c._id, className: c.name }));
  const sameNameCanon = (canByName.get(norm(rec.name)) || []).map(slim);
  const sameTreeCanon = (canByTreeName.get(norm(p.treeName)) || []).map(slim);
  const hits = sourcebookSearch(rec.name);
  const refs = repoRefs(rec._id);
  const s = rec.system || {};
  return {
    productionId: rec._id, name: rec.name, group: p.group,
    registryKey: p.registryKey, registryStatus: p.registryStatus ?? 'UNREGISTERED_OR_NONCANONICAL_TREE', classification: p.classification,
    treeId: tid, treeName: tree?.name ?? p.treeName, treeExists: !!tree,
    source: s.source ?? s.sourcebook ?? null, page: s.page ?? s.sourcePage ?? null,
    prerequisites: s.prerequisites ?? '', benefit: s.benefit ?? '', description: s.description ?? '', summary: s.summary ?? s.quickSummary ?? '',
    runtime: { executionModel: s.executionModel ?? null, subType: s.subType ?? null, costNumeric: s.costNumeric ?? null, tags: s.tags ?? [],
      hasAbilityMeta: !!(s.abilityMeta && Object.keys(s.abilityMeta).length), hasPrerequisitesStructured: !!s.prerequisitesStructured,
      effectCount: (rec.effects || []).length, flagKeys: Object.keys(rec.flags || {}) },
    treeMembership: memberOf, classAccess,
    relatedCanonicalIdentity: p.relatedCanonicalIdentity ?? null,
    sameNameCanonicalIdentities: sameNameCanon, sameTreeCanonicalIdentityCount: sameTreeCanon.length,
    sourcebookSearch: hits, repoReferences: refs,
    provisionalDisposition: provisional(p, rec, sameNameCanon, sameTreeCanon, hits),
    evidenceStatus: 'UNADJUDICATED'
  };
});

/* ---- grouping analysis (analysis only) ---- */
const tally = (fn) => records.reduce((m, r) => { const k = fn(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const grouping = {
  byGroup: tally(r => r.group),
  byRegistryStatus: tally(r => r.registryStatus),
  byTree: tally(r => `${r.treeName} [${r.treeId}]`),
  sameNameCanonicalExists: tally(r => r.sameNameCanonicalIdentities.length ? 'yes' : 'no'),
  nameFoundInSourcebookText: tally(r => r.sourcebookSearch.length ? 'yes' : 'no'),
  hasHeadingLikeSourcebookLine: tally(r => r.sourcebookSearch.some(h => h.headingLikeLines.length) ? 'yes' : 'no'),
  treeMissingFromPack: tally(r => r.treeExists ? 'no' : 'yes'),
  productionSourceField: tally(r => r.source ? 'has-source' : 'no-source-field (records carry no source/page in production)'),
  carriesAbilityMeta: tally(r => r.runtime.hasAbilityMeta ? 'yes' : 'no'),
  referenceClassesPresent: Object.fromEntries(Object.entries(records.flatMap(r => [...new Set(r.repoReferences.map(x => x.classification))]).reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {})).sort()),
  referencedByActorOrPackData: tally(r => r.repoReferences.some(x => x.classification === 'ACTOR_OR_PACK_DATA') ? 'yes' : 'no'),
  provisionalDisposition: tally(r => r.provisionalDisposition.value)
};

const census = {
  schemaVersion: 1, phase: '3D-1', status: 'CENSUS_ONLY', productionMutationPerformed: false,
  basis: { mainMergeOfPhase3C: '5aedbd65', closeout: 'data/audits/talent-phase-3b-global-closeout.json', canonical: 'data/canonical/talents.json' },
  counts: { total: records.length, reviewExtras: extras.length, deferredProductionOnly: deferred.length, productionTalents: talents.length, productionTrees: trees.length },
  note: 'provisionalDisposition is a heuristic starting point, never a decision. Every record stays UNADJUDICATED until Phase 3D-2.',
  grouping, records
};
const json = JSON.stringify(census, null, 2) + '\n';

function markdown() {
  const L = [];
  L.push('# Phase 3D-1 — Production Extras Census', '',
    `Read-only census of the **${records.length}** production talent records that Phase 3C protected (90 production-only deferred + 2 review-only extras).`,
    'Machine-readable source: `data/audits/talent-phase-3d-production-extras-census.json` (regenerate with `node tools/build-talent-phase-3d-census.mjs`).',
    'No production data was modified. `provisionalDisposition` is a heuristic, not a decision; every record is `UNADJUDICATED`.', '',
    '## Grouping analysis (analysis only)', '');
  for (const [k, v] of Object.entries(grouping)) {
    if (k === 'byTree') continue;
    L.push(`- **${k}**: ` + Object.entries(v).map(([a, b]) => `${a} = ${b}`).join(', '));
  }
  L.push('', '### Records per tree', '', '| Tree | Records |', '|---|---|');
  for (const [k, v] of Object.entries(grouping.byTree).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push('', '## Records', '', '| ID | Name | Tree | Registry status | Same-name canon | In sourcebook TXT | Ref files (actor/pack data) | Provisional |', '|---|---|---|---|---|---|---|---|');
  for (const r of records) {
    L.push(`| \`${r.productionId}\` | ${r.name} | ${r.treeName} | ${r.registryStatus} | ${r.sameNameCanonicalIdentities.length} | ${r.sourcebookSearch.length ? r.sourcebookSearch.map(h => h.file.replace('_djvu.txt', '')).slice(0, 2).join('; ') : '—'} | ${r.repoReferences.length} (${r.repoReferences.filter(x => x.classification === 'ACTOR_OR_PACK_DATA').length}) | ${r.provisionalDisposition.value} |`);
  }
  L.push('');
  return L.join('\n');
}
const md = markdown();

// Reference-impact report: every repository reference per candidate ID, so no deletion can proceed with unresolved live references.
// Only structural/actor/runtime references block deletion; audit-history/doc/test references are documentation to update or exempt.
const BLOCKING = new Set(['STRUCTURAL_TREE_MEMBERSHIP', 'STRUCTURAL_RUNTIME_REGISTRY', 'ACTOR_OR_PACK_DATA', 'RUNTIME_CODE', 'GENERATED_DERIVED_DATA', 'OTHER_DATA']);
const impact = {
  schemaVersion: 1, phase: '3D-1', status: 'CENSUS_ONLY', productionMutationPerformed: false,
  note: 'replacementId/mustRepoint stay null/undecided until Phase 3D-2 adjudication; blockingReferences lists what must be resolved before any delete.',
  records: records.map(r => ({
    productionId: r.productionId, name: r.name, treeId: r.treeId,
    references: r.repoReferences.map(x => ({ ...x, blocksDeletion: BLOCKING.has(x.classification), mustRepoint: null, replacementId: null })),
    blockingReferenceCount: r.repoReferences.filter(x => BLOCKING.has(x.classification)).length
  }))
};
const impactJson = JSON.stringify(impact, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const okJ = fs.existsSync(path.join(ROOT, OUT_JSON)) && fs.readFileSync(path.join(ROOT, OUT_JSON), 'utf8') === json;
  const okM = fs.existsSync(path.join(ROOT, OUT_MD)) && fs.readFileSync(path.join(ROOT, OUT_MD), 'utf8') === md;
  const okR = fs.existsSync(path.join(ROOT, OUT_REF)) && fs.readFileSync(path.join(ROOT, OUT_REF), 'utf8') === impactJson;
  if (!okJ || !okM || !okR) { console.error('[phase-3d-census] STALE: regenerate with node tools/build-talent-phase-3d-census.mjs'); process.exit(1); }
  console.log(`[phase-3d-census] PASS: census current (${records.length} records)`);
} else {
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json);
  fs.writeFileSync(path.join(ROOT, OUT_MD), md);
  fs.writeFileSync(path.join(ROOT, OUT_REF), impactJson);
  console.log(`[phase-3d-census] wrote ${records.length} records`);
  console.log(JSON.stringify(grouping, null, 1).slice(0, 3000));
}
