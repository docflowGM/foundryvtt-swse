#!/usr/bin/env node
// Phase 1B — Deterministic Repository Reconciliation Authority builder.
// Mechanical execution of owner-decided dispositions for the 390 current feat records.
// Fails closed (nonzero exit naming the offending ID/name). Audit-only: never writes production data.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P0_PATH = 'data/audits/feat-phase-0-canonical-census.json';
const P1A_PATH = 'data/audits/feat-phase-1a-canonical-identity-manifest.json';
const OUT_JSON = 'data/audits/feat-phase-1b-repository-reconciliation.json';
const OUT_MD = 'docs/audits/feat-phase-1b-repository-reconciliation.md';

const BASELINE_MAIN_SHA = '2a7723d2f8b80a4de48e343988c3224a6a9cc832';
const PHASE1A_FINAL_COMMIT = 'ba2b8b925b24284c2fc4045eec73ec79e5f16b73';
const PHASE0_VERSION = '1.1-phase0-authority-corrected-after-persistence-readback';
const PHASE1A_STATUS = 'PHASE_1A_CANONICAL_IDENTITY_MANIFEST_CERTIFIED';

const D_CANON = 'PRESERVE_CANONICAL_RECORD';
const D_DERIV = 'PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C';
const D_REMOVE = 'REMOVE_NONCANONICAL_FEAT_RECORD';
const ALLOWED_DISPOSITIONS = [D_CANON, D_DERIV, D_REMOVE];
const DERIV_CLASS = 'IMPLEMENTATION_DERIVATIVE_NOT_CANONICAL_IDENTITY';

const WP_PARENT_ID = 'ecc2471ac96ec2d4';
const WP_PARENT_KEY = 'feat::saga-edition-core-rulebook::p89::weapon-proficiency';
const DERIVATIVES = [
  ['2d680cc46a7972da', 'Weapon Proficiency (Simple Weapons)'],
  ['765ff8a34e58acac', 'Weapon Proficiency (Rifles)'],
  ['8329a353aa3899be', 'Weapon Proficiency (Heavy Weapons)'],
  ['e5d361d01d1b44e4', 'Weapon Proficiency (Pistols)'],
  ['cf28ec45cabaff59', 'Advanced Melee Weapon Proficiency'],
  ['41a9ce755ecffb5b', 'Heavy Weapon Proficiency']
];
const REQUIRED_ADDITIONS = [
  { canonicalId: 'c352f81dde5c9dff', identityKey: 'feat::the-force-unleashed-campaign-guide::p35::recall', displayName: 'Recall', futureAction: 'CREATE_CANONICAL_FEAT_RECORD' },
  { canonicalId: 'c9c4130a55761330', identityKey: 'feat::scum-and-villainy::p24::staggering-attack', displayName: 'Staggering Attack', futureAction: 'CREATE_CANONICAL_FEAT_RECORD' }
];
// Paths whose ID occurrences are not dependency evidence (spec section 14).
const SCAN_EXCLUDE_EXACT = new Set(['data/feat-catalog.json', 'packs/feats.db']);
const SCAN_EXCLUDE_PATTERNS = [
  /^data\/audits\/feat-phase-[0-9a-z]+-.*\.json$/,
  /^docs\/audits\/feat-phase-[0-9a-z]+-.*\.md$/,
  /^tools\/build-feat-phase-[0-9a-z]+-.*\.mjs$/
];
// Owner-defined reference classes (Phase 1B correction). Exact path rulings; no directory-based importance heuristic.
const C_LIVE = 'LIVE_RUNTIME_AUTHORITY';
const C_DERIVED = 'DERIVED_REBUILD_ARTIFACT';
const C_FIX = 'FIX_OR_MIGRATION_ARTIFACT';
const C_ORPHAN = 'ORPHAN_HISTORICAL_ARTIFACT';
const C_AUDIT = 'AUDIT_OR_DOCUMENTATION_REFERENCE';
const C_REVIEW = 'OTHER_REFERENCE_REQUIRES_REVIEW';
const EXACT_PATH_CLASS = {
  'data/feat-effects.json': C_LIVE,
  'data/class-archetypes.json': C_LIVE,
  'data/generated/class-feat-list-bindings.json': C_LIVE,
  'packs/heroic.db': C_LIVE,
  'packs/nonheroic.db': C_LIVE,
  'packs/npc.db': C_LIVE,
  'scripts/engine/progression/prerequisites/class-prereq-normalizer.js': C_LIVE,
  'data/prestige-prerequisites-reference.json': C_AUDIT,
  'data/feat_buckets_and_subbuckets.json': C_DERIVED,
  'data/generated/feat-view-model.json': C_DERIVED,
  'data/fixes/feat-view-model.json': C_FIX,
  'packs/feat-catalog.db': C_ORPHAN
};
const LIVE_PATHS = new Set(Object.entries(EXACT_PATH_CLASS).filter(([, c]) => c === C_LIVE).map(([k]) => k));
function classifyPath(p) {
  if (Object.prototype.hasOwnProperty.call(EXACT_PATH_CLASS, p)) return EXACT_PATH_CLASS[p];
  if (p.startsWith('docs/') || p.startsWith('data/audits/') || /^tools\/build-feat-phase-[0-9a-z]+-.*\.mjs$/.test(p)) return C_AUDIT;
  return C_REVIEW;
}
const DS_LIVE = 'LIVE_RUNTIME_REFERENCE_PRESENT';
const DS_NONE = 'NO_LIVE_RUNTIME_REFERENCE';
const FM_REMEDIATE = 'REMEDIATE_LIVE_REFERENCES_BEFORE_RECORD_DELETION';
const FM_NO_BLOCKER = 'NO_LIVE_REFERENCE_BLOCKER_REFRESH_DERIVED_ARTIFACTS_DURING_MUTATION';
const FM_DERIV = 'PRESERVE_REFERENCES_PENDING_PHASE_1C';

function fail(msg) { console.error(`PHASE 1B BUILD FAILED: ${msg}`); process.exit(1); }
function assert(c, msg) { if (!c) fail(msg); }
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const sortStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---------- Baseline ----------
try {
  execFileSync('git', ['merge-base', '--is-ancestor', PHASE1A_FINAL_COMMIT, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
  execFileSync('git', ['merge-base', '--is-ancestor', BASELINE_MAIN_SHA, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
} catch { fail('Phase 1A final commit / baseline main SHA is not an ancestor of HEAD'); }

// ---------- Authority assertions ----------
const p0 = readJson(P0_PATH);
assert(p0.version === PHASE0_VERSION, `Phase 0 version ${p0.version} != ${PHASE0_VERSION}`);
const qa = p0.phase0.subphases['0-QA'];
const g = qa.acceptanceGates;
const p0Expect = {
  finalCanonicalIdentityCount: 353, canonicalUniqueNormalizedDisplayNames: 352, fullFeatPublicationsAcrossAllSources: 355,
  confirmedFullReprints: 2, currentRepoFeatRecords: 390, canonicalIdentitiesRepresentedByCurrentRepoRecords: 351,
  canonicalIdentitiesMissingFromRepo: 2, repoRecordsOutsideCanonicalIdentityCorpus: 39, implementationDerivativeRecords: 6,
  noncanonicalWrongDomainOrLegacyRecords: 33
};
for (const [k, v] of Object.entries(p0Expect)) assert(g[k] === v, `Phase 0 gate ${k} expected ${v}, got ${g[k]}`);
assert(qa.repoOutsideCanonicalCorpus.length === 39, 'Phase 0 outside-corpus != 39');

const p1a = readJson(P1A_PATH);
assert(p1a.status === PHASE1A_STATUS, `Phase 1A status ${p1a.status} != ${PHASE1A_STATUS}`);
const a1 = p1a.acceptance;
const p1aExpect = { records: 353, uniqueCanonicalIds: 353, uniqueIdentityKeys: 353, uniqueNormalizedNames: 352, existingCanonicalRecords: 351, missingRepoRecords: 2 };
for (const [k, v] of Object.entries(p1aExpect)) assert(a1[k] === v, `Phase 1A acceptance ${k} expected ${v}, got ${a1[k]}`);
assert(p1a.records.length === 353, 'Phase 1A records != 353');
assert(p1a.records.filter(r => r.structure.structuralStatus === 'PHASE0_CERTIFIED').length === 9, 'Phase 1A PHASE0_CERTIFIED != 9');
assert(p1a.records.filter(r => r.structure.structuralStatus === 'PENDING_PHASE_1C').length === 344, 'Phase 1A PENDING_PHASE_1C != 344');

// ---------- Current catalog ----------
const rawCat = readJson('data/feat-catalog.json');
const catalog = Array.isArray(rawCat) ? rawCat : (rawCat.feats || rawCat.records || Object.values(rawCat));
assert(catalog.length === 390, `catalog count ${catalog.length} != 390`);
const catById = new Map();
for (const r of catalog) {
  const id = r._id || r.id;
  assert(id, 'catalog record without id');
  assert(!catById.has(id), `duplicate catalog ID ${id} (${r.name})`);
  catById.set(id, r);
}

// ---------- Groups ----------
const A = new Map(); // canonical existing
for (const r of p1a.records) {
  if (r.repoMapping.status !== 'EXISTING_CANONICAL_RECORD') continue;
  assert(r.repoMapping.repoId === r.canonicalId, `canonicalId != repoId for ${r.displayName}`);
  assert(catById.has(r.canonicalId), `Phase 1A canonical ID ${r.canonicalId} (${r.displayName}) not found in catalog`);
  assert(!A.has(r.canonicalId), `canonical ID ${r.canonicalId} duplicated`);
  A.set(r.canonicalId, r);
}
assert(A.size === 351, `canonical existing ${A.size} != 351`);

const missing = p1a.records.filter(r => r.repoMapping.status === 'MISSING_REPO_RECORD');
assert(missing.length === 2 && JSON.stringify(missing.map(r => r.canonicalId).sort()) === JSON.stringify(REQUIRED_ADDITIONS.map(r => r.canonicalId).sort()),
  `missing canonical IDs differ from authorized: ${missing.map(r => `${r.displayName} ${r.canonicalId}`).join(', ')}`);
for (const req of REQUIRED_ADDITIONS) {
  const rec = missing.find(r => r.canonicalId === req.canonicalId);
  assert(rec.identityKey === req.identityKey && rec.displayName === req.displayName, `required addition mismatch for ${req.displayName}`);
}

const wp = p1a.records.find(r => r.canonicalId === WP_PARENT_ID);
assert(wp && wp.identityKey === WP_PARENT_KEY && wp.displayName === 'Weapon Proficiency', 'Weapon Proficiency parent not in Phase 1A manifest as authorized');

const outside = new Map(qa.repoOutsideCanonicalCorpus.map(r => [r.id, r]));
assert(outside.size === 39, 'outside-corpus IDs not unique');
const B = new Map();
for (const [id, name] of DERIVATIVES) {
  const o = outside.get(id);
  assert(o, `derivative ${id} (${name}) absent from Phase 0 outside-corpus`);
  assert(o.classification === DERIV_CLASS, `derivative ${id} (${name}) Phase 0 classification is ${o.classification}`);
  assert(catById.has(id) && catById.get(id).name === name, `derivative ${id} does not resolve to "${name}" in catalog`);
  B.set(id, o);
}
const derivFromP0 = [...outside.values()].filter(o => o.classification === DERIV_CLASS).map(o => o.id).sort();
assert(JSON.stringify(derivFromP0) === JSON.stringify(DERIVATIVES.map(d => d[0]).sort()), 'Phase 0 derivative set differs from the six authorized IDs');
const C = new Map([...outside].filter(([, o]) => o.classification !== DERIV_CLASS));
assert(C.size === 33, `noncanonical removal set ${C.size} != 33`);
for (const [id, o] of C) assert(catById.has(id), `noncanonical ID ${id} (${o.name}) absent from catalog`);

for (const id of A.keys()) { assert(!B.has(id), `ID ${id} in canonical and derivative groups`); assert(!C.has(id), `ID ${id} (${catById.get(id).name}) in canonical and removal groups — outside-corpus record promoted?`); }
for (const id of B.keys()) assert(!C.has(id), `ID ${id} in derivative and removal groups`);
const union = new Set([...A.keys(), ...B.keys(), ...C.keys()]);
assert(A.size + B.size + C.size === 390 && union.size === 390, `partition ${A.size}+${B.size}+${C.size} does not give 390 distinct IDs`);
for (const id of catById.keys()) assert(union.has(id), `current record ${id} (${catById.get(id).name}) is unclassified`);
for (const id of union) assert(catById.has(id), `classified ID ${id} not in current catalog`);

// ---------- Dependency scan (exact 16-char IDs, tracked files) ----------
const scanIds = [...outside.keys()].sort(sortStr);
function scan(id) {
  let out = '';
  try {
    out = execFileSync('git', ['grep', '-l', '-a', '-F', '-e', id], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) { if (e.status !== 1) fail(`git grep failed for ${id}`); }
  return out.split('\n').filter(Boolean)
    .filter(p => !SCAN_EXCLUDE_EXACT.has(p) && !SCAN_EXCLUDE_PATTERNS.some(re => re.test(p)))
    .sort(sortStr);
}
const refs = new Map();
for (const id of scanIds) refs.set(id, scan(id));
// Fail closed on any unclassified reference path (spec: do not classify it ourselves).
for (const [id, paths] of refs) for (const p of paths) {
  if (classifyPath(p) === C_REVIEW) fail(`exact-ID reference path requires owner review: ${p} (references ${id} ${catById.get(id).name})`);
}

// ---------- Current record dispositions ----------
const entry = (id, base) => {
  const cat = catById.get(id);
  const s = cat.system || {};
  return {
    repoId: id,
    repoName: cat.name,
    repoSource: s.source ?? null,
    repoPage: s.page ?? null,
    reconciliationDisposition: null,
    canonicalId: null,
    identityKey: null,
    phase0Classification: null,
    parentCanonicalId: null,
    replacementCanonicalId: null,
    dependencyStatus: null,
    exactIdReferenceCount: null,
    exactIdReferencePaths: [],
    referenceDetails: [],
    liveRuntimeReferenceCount: null,
    liveRuntimeReferencePaths: [],
    derivedArtifactReferenceCount: null,
    derivedArtifactReferencePaths: [],
    fixArtifactReferenceCount: null,
    fixArtifactReferencePaths: [],
    orphanHistoricalReferenceCount: null,
    orphanHistoricalReferencePaths: [],
    auditDocumentationReferenceCount: null,
    auditDocumentationReferencePaths: [],
    futureMutationRequirement: null,
    ...base
  };
};
const withDeps = (id, derivative) => {
  const p = refs.get(id);
  const details = p.map(path_ => ({ path: path_, classification: classifyPath(path_) }));
  const of = (cls) => details.filter(d => d.classification === cls).map(d => d.path);
  const live = of(C_LIVE);
  return {
    dependencyStatus: live.length ? DS_LIVE : DS_NONE,
    exactIdReferenceCount: p.length,
    exactIdReferencePaths: p,
    referenceDetails: details,
    liveRuntimeReferenceCount: live.length,
    liveRuntimeReferencePaths: live,
    derivedArtifactReferenceCount: of(C_DERIVED).length,
    derivedArtifactReferencePaths: of(C_DERIVED),
    fixArtifactReferenceCount: of(C_FIX).length,
    fixArtifactReferencePaths: of(C_FIX),
    orphanHistoricalReferenceCount: of(C_ORPHAN).length,
    orphanHistoricalReferencePaths: of(C_ORPHAN),
    auditDocumentationReferenceCount: of(C_AUDIT).length,
    auditDocumentationReferencePaths: of(C_AUDIT),
    futureMutationRequirement: derivative ? FM_DERIV : (live.length ? FM_REMEDIATE : FM_NO_BLOCKER)
  };
};
const records = [];
for (const id of [...catById.keys()].sort(sortStr)) {
  if (A.has(id)) {
    const r = A.get(id);
    records.push(entry(id, { reconciliationDisposition: D_CANON, canonicalId: id, identityKey: r.identityKey }));
  } else if (B.has(id)) {
    records.push(entry(id, {
      reconciliationDisposition: D_DERIV, phase0Classification: B.get(id).classification, parentCanonicalId: WP_PARENT_ID, ...withDeps(id, true)
    }));
  } else {
    records.push(entry(id, { reconciliationDisposition: D_REMOVE, phase0Classification: C.get(id).classification, ...withDeps(id, false) }));
  }
}
for (const r of records) assert(ALLOWED_DISPOSITIONS.includes(r.reconciliationDisposition), `unauthorized disposition on ${r.repoId}`);
const byDisp = (d) => records.filter(r => r.reconciliationDisposition === d);

// ---------- Derived sections ----------
const depFields = (r) => ({
  dependencyStatus: r.dependencyStatus, futureMutationRequirement: r.futureMutationRequirement,
  exactIdReferenceCount: r.exactIdReferenceCount, exactIdReferencePaths: r.exactIdReferencePaths, referenceDetails: r.referenceDetails,
  liveRuntimeReferenceCount: r.liveRuntimeReferenceCount, liveRuntimeReferencePaths: r.liveRuntimeReferencePaths,
  derivedArtifactReferenceCount: r.derivedArtifactReferenceCount, derivedArtifactReferencePaths: r.derivedArtifactReferencePaths,
  fixArtifactReferenceCount: r.fixArtifactReferenceCount, fixArtifactReferencePaths: r.fixArtifactReferencePaths,
  orphanHistoricalReferenceCount: r.orphanHistoricalReferenceCount, orphanHistoricalReferencePaths: r.orphanHistoricalReferencePaths,
  auditDocumentationReferenceCount: r.auditDocumentationReferenceCount, auditDocumentationReferencePaths: r.auditDocumentationReferencePaths
});
const implementationDerivatives = DERIVATIVES.map(([id, name]) => {
  const r = records.find(x => x.repoId === id);
  return {
    repoId: id, repoName: name, canonicalIdentity: false, parentCanonicalId: WP_PARENT_ID, parentIdentityKey: WP_PARENT_KEY,
    structuralResolution: 'PENDING_PHASE_1C', reconciliationDisposition: D_DERIV,
    ...depFields(r)
  };
});
const removalSet = byDisp(D_REMOVE).map(r => ({
  repoId: r.repoId, repoName: r.repoName, phase0Classification: r.phase0Classification, replacementCanonicalId: null,
  ...depFields(r)
}));
// Owner-fixed live-runtime result for the 33 removals.
const LIVE_EXPECT = {
  'data/class-archetypes.json': ['0c53cb8b7c29d865', '6d8ce2807c579289'],
  'data/feat-effects.json': ['10a017a020aa4a9c', '17e317292814e13e', '37cb4455a70876ad', '465434fb7b44aee1', '5824e2360feb505a', '647d77a8f5ab9af3', '6673cd53493a9d6c',
    '88cdedff38b610c0', '9a89576b3cc1347e', 'bee76d01da40677d', 'db564cc6f9879ec8', 'ff76bea42641ca5b', 'ffd5fecab0550bb6']
};
for (const [file, ids] of Object.entries(LIVE_EXPECT)) {
  const got = removalSet.filter(r => r.liveRuntimeReferencePaths.includes(file)).map(r => r.repoId).sort();
  assert(JSON.stringify(got) === JSON.stringify([...ids].sort()), `live-reference removals for ${file} differ from owner authority: got ${got.join(',')}`);
}
const liveRemovals = removalSet.filter(r => r.dependencyStatus === DS_LIVE);
assert(liveRemovals.length === 15, `removal live-runtime references ${liveRemovals.length} != 15`);
assert(removalSet.filter(r => r.dependencyStatus === DS_NONE).length === 18, 'removal no-live-runtime references != 18');
assert(removalSet.every(r => r.exactIdReferenceCount > 0), 'a removal record has no exact-ID reference');
assert(liveRemovals.every(r => r.liveRuntimeReferencePaths.length === 1), 'a removal record has live references in both live files (owner stated no overlap)');
for (const r of records) for (const d of r.referenceDetails) {
  if (d.path === 'packs/feat-catalog.db') assert(d.classification === C_ORPHAN, 'feat-catalog.db not classified ORPHAN_HISTORICAL_ARTIFACT');
  if (d.classification === C_LIVE) assert(LIVE_PATHS.has(d.path), `unexpected LIVE_RUNTIME_AUTHORITY path ${d.path}`);
}
// Owner rulings for the six formerly unclassified paths (exact-path specific; not generalized by directory).
const SIX_RULINGS = {
  'data/generated/class-feat-list-bindings.json': C_LIVE,
  'packs/heroic.db': C_LIVE,
  'packs/nonheroic.db': C_LIVE,
  'packs/npc.db': C_LIVE,
  'scripts/engine/progression/prerequisites/class-prereq-normalizer.js': C_LIVE,
  'data/prestige-prerequisites-reference.json': C_AUDIT
};
for (const [pth, cls] of Object.entries(SIX_RULINGS)) assert(classifyPath(pth) === cls, `owner ruling for ${pth} expected ${cls}, got ${classifyPath(pth)}`);
assert(classifyPath('data/generated/feat-view-model.json') === C_DERIVED, 'generated feat-view-model must remain DERIVED_REBUILD_ARTIFACT');
// The six new paths must not alter the removal split: removal live paths are limited to the two original live files.
for (const r of removalSet) for (const lp of r.liveRuntimeReferencePaths) assert(lp === 'data/feat-effects.json' || lp === 'data/class-archetypes.json', `removal ${r.repoId} (${r.repoName}) has live path ${lp} outside the owner-fixed 15/18 basis`);
// Derivative dependency rulings.
const DERIV_LIVE_MIN = {
  '2d680cc46a7972da': ['data/feat-effects.json', 'data/generated/class-feat-list-bindings.json', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db'],
  '765ff8a34e58acac': ['data/feat-effects.json', 'data/generated/class-feat-list-bindings.json', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db'],
  '8329a353aa3899be': ['data/class-archetypes.json', 'data/feat-effects.json', 'data/generated/class-feat-list-bindings.json', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db'],
  'e5d361d01d1b44e4': ['data/feat-effects.json', 'data/generated/class-feat-list-bindings.json', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'scripts/engine/progression/prerequisites/class-prereq-normalizer.js'],
  'cf28ec45cabaff59': ['data/feat-effects.json', 'data/generated/class-feat-list-bindings.json', 'scripts/engine/progression/prerequisites/class-prereq-normalizer.js'],
  '41a9ce755ecffb5b': ['data/feat-effects.json']
};
for (const d of implementationDerivatives) {
  assert(d.dependencyStatus === DS_LIVE, `derivative ${d.repoId} (${d.repoName}) is not LIVE_RUNTIME_REFERENCE_PRESENT`);
  assert(d.futureMutationRequirement === FM_DERIV, `derivative ${d.repoId} futureMutationRequirement wrong`);
  for (const lp of DERIV_LIVE_MIN[d.repoId]) assert(d.liveRuntimeReferencePaths.includes(lp), `derivative ${d.repoId} (${d.repoName}) missing owner-verified live path ${lp}`);
  if (d.repoId === '41a9ce755ecffb5b') assert(JSON.stringify(d.liveRuntimeReferencePaths) === '["data/feat-effects.json"]', 'Heavy Weapon Proficiency live paths differ from owner authority');
  if (d.repoId === 'e5d361d01d1b44e4' || d.repoId === 'cf28ec45cabaff59') assert(!d.liveRuntimeReferencePaths.includes('data/prestige-prerequisites-reference.json') && d.auditDocumentationReferencePaths.includes('data/prestige-prerequisites-reference.json'), `prestige reference misclassified for ${d.repoId}`);
}
assert(implementationDerivatives.length === 6 && implementationDerivatives.filter(d => d.dependencyStatus === DS_LIVE).length === 6 && implementationDerivatives.filter(d => d.dependencyStatus === DS_NONE).length === 0, 'derivative live-reference counts != 6/0');
assert(classifyPath('packs/feat-catalog.db') === C_ORPHAN && classifyPath('data/generated/feat-view-model.json') === C_DERIVED &&
  classifyPath('data/feat_buckets_and_subbuckets.json') === C_DERIVED && classifyPath('data/fixes/feat-view-model.json') === C_FIX, 'artifact class assertions failed');
const scanned = records.filter(r => r.dependencyStatus !== null);
const dependencyScan = {
  method: 'Exact 16-character repo ID match over tracked files (git grep -a -F). Plain-name matches are not dependency evidence.',
  scannedRecords: scanned.length,
  exactIdReferenceCount: 'distinct tracked file paths containing the ID',
  excludedPathsExact: [...SCAN_EXCLUDE_EXACT].sort(sortStr),
  excludedPathPatterns: SCAN_EXCLUDE_PATTERNS.map(re => re.source),
  exactPathClassification: EXACT_PATH_CLASS,
  auditDocumentationPaths: 'anything under docs/ or data/audits/, or a Phase 0/1 audit builder under tools/',
  unclassifiedPathPolicy: 'Any path outside the owner-defined classes is OTHER_REFERENCE_REQUIRES_REVIEW and fails the build.',
  orphanPackRules: [
    'packs/feat-catalog.db MUST NOT block deletion of a noncanonical feat record.',
    'packs/feat-catalog.db MUST NOT be regenerated as the production feat pack unless separately authorized.',
    'The live Foundry feat pack remains packs/feats.db as declared in system.json.',
    'packs/feat-catalog.db is not declared by system.json, is not a canonical source, and is not a restoration authority.'
  ],
  note: 'Canonical records (351) are not scanned; their dependency fields are null. Derivative references are preserved as evidence for Phase 1C and are not rewritten. Dependency classification does not change any reconciliationDisposition or replacementCanonicalId.',
  removalRecordsWithExactIdReferences: removalSet.filter(r => r.exactIdReferenceCount > 0).length,
  removalRecordsWithLiveRuntimeReferences: liveRemovals.length,
  removalRecordsWithNoLiveRuntimeReference: removalSet.filter(r => r.dependencyStatus === DS_NONE).length,
  removalLiveReferencesByFile: Object.fromEntries(Object.keys(LIVE_EXPECT).map(f => [f, removalSet.filter(r => r.liveRuntimeReferencePaths.includes(f)).length])),
  otherReferenceRequiresReviewPaths: 0,
  derivativeRecordsWithLiveRuntimeReferences: implementationDerivatives.filter(r => r.dependencyStatus === DS_LIVE).length
};
assert(dependencyScan.removalLiveReferencesByFile['data/feat-effects.json'] === 13 && dependencyScan.removalLiveReferencesByFile['data/class-archetypes.json'] === 2, 'live reference file split != 13 / 2');

// ---------- Domain guard authority (mechanical facts only) ----------
const guardSrc = fs.readFileSync(path.join(ROOT, 'scripts/data/feat-domain-guard.js'), 'utf8');
assert(/TALENT_ONLY_FEAT_CONTAMINANTS/.test(guardSrc) && /'recall'/.test(guardSrc), 'feat-domain-guard.js no longer has the name-only deny-list entry for recall; authority conflict');
const registry = readJson('data/feat-validity-registry.json');
const registryRecall = (registry.entries || []).find(e => String(e.name).toLowerCase() === 'recall') || null;
const domainGuardAuthority = {
  status: 'NAME_ONLY_DOMAIN_GUARD_REJECTED',
  currentMechanism: { file: 'scripts/data/feat-domain-guard.js', symbol: 'TALENT_ONLY_FEAT_CONTAMINANTS', keyedBy: 'normalized display name' },
  validityRegistryFinding: 'NAME_ONLY_VALIDITY_AUTHORITY_INSUFFICIENT_FOR_SAME_NAME_CROSS_DOMAIN_IDENTITIES',
  validityRegistryFile: 'data/feat-validity-registry.json',
  validityRegistryRecallEntry: registryRecall ? { status: registryRecall.status, source: registryRecall.source } : null,
  rule: 'No canonical feat eligibility or canonicality decision may reject a record solely because another domain contains the same normalized name.',
  recallDefect: {
    currentRuling: 'Recall -> talent_domain_not_feat',
    correctOnFeatSide: false,
    feat: { displayName: 'Recall', canonicalId: 'c352f81dde5c9dff', identityKey: 'feat::the-force-unleashed-campaign-guide::p35::recall', source: 'The Force Unleashed Campaign Guide p.35' },
    talent: { displayName: 'Recall', identity: 'separate talent identity', source: 'Rebellion Era Campaign Guide' },
    futureConvergence: 'Permit both identities; do not delete or rename the talent; do not create the feat in Phase 1B.'
  },
  autofireAssaultCollision: {
    feat: 'Autofire Assault, Legacy Era Campaign Guide p.34',
    talent: 'Autofire Assault, Galaxy at War p.22',
    ruling: 'Both identities are legal in their own domain; same normalized name != same identity.'
  },
  retainedCrossDomainCollisions: p1a.certifiedCrossDomainNameCollisions.map(c => ({ displayName: c.displayName, feat: c.feat, classification: c.classification })),
  futureDomainAuthorityModel: {
    implemented: false,
    sets: {
      CANONICAL_FEAT_IDS: { count: p1a.records.length, source: 'Phase 1A canonicalId (all 353)' },
      FEAT_IMPLEMENTATION_DERIVATIVE_IDS: { count: DERIVATIVES.length, ids: DERIVATIVES.map(d => d[0]) },
      NONCANONICAL_FEAT_RECORD_IDS: { count: removalSet.length, ids: removalSet.map(r => r.repoId) }
    },
    rules: [
      'Canonical feat enumeration uses CANONICAL_FEAT_IDS.',
      'A document must never become canonical merely because its name resembles a canonical feat.',
      'A canonical feat must never be rejected merely because another domain contains the same name.',
      'The six derivative IDs are not canonical feat identities.',
      'The six derivative IDs may remain implementation records until Phase 1C decides final scope architecture.',
      'The 33 noncanonical IDs are not legal canonical feat identities.',
      'Unknown IDs must not silently become canonical by name matching.',
      'Talent documents remain talent-domain records independently of same-name feat records.'
    ]
  }
};

// ---------- Projection ----------
const interimProjection = {
  currentProductionRecords: 390,
  removeNoncanonicalRecords: -33,
  addMissingCanonicalRecords: 2,
  derivativesRemoved: 0,
  interimProjectedProductionDocumentCountBefore1C: 390 - 33 + 2,
  canonicalIdentityCount: 353,
  finalProductionDocumentCount: null,
  finalProductionDocumentCountStatus: 'PENDING_PHASE_1C',
  note: 'The projection retains the six derivatives and is not final; Phase 1C controls derivative structure.'
};
assert(interimProjection.interimProjectedProductionDocumentCountBefore1C === 359, 'interim projection != 359');
assert(interimProjection.finalProductionDocumentCount === null, 'final production document count must not be frozen');

// ---------- Acceptance ----------
const acceptance = {
  currentRecords: records.length,
  uniqueCurrentIds: new Set(records.map(r => r.repoId)).size,
  preserveCanonical: byDisp(D_CANON).length,
  canonicalIdsRepresented: new Set(byDisp(D_CANON).map(r => r.canonicalId)).size,
  preserveDerivativesPending1C: byDisp(D_DERIV).length,
  derivativeParentCanonicalId: WP_PARENT_ID,
  derivativesCountedAsCanonical: 0,
  removeNoncanonical: byDisp(D_REMOVE).length,
  replacementCanonicalIdNonNullCount: records.filter(r => r.replacementCanonicalId !== null).length,
  requiredCanonicalAdditions: REQUIRED_ADDITIONS.length,
  unclassifiedCurrentRecords: 0,
  multiplyClassifiedCurrentRecords: 0,
  interimProjectedProductionDocumentCountBefore1C: interimProjection.interimProjectedProductionDocumentCountBefore1C,
  finalProductionDocumentCount: null,
  nameOnlyDomainGuardStatus: 'NAME_ONLY_DOMAIN_GUARD_REJECTED',
  removalLiveRuntimeReferences: liveRemovals.length,
  removalNoLiveRuntimeReferences: removalSet.filter(r => r.dependencyStatus === DS_NONE).length,
  featEffectsLiveReferenceRemovals: dependencyScan.removalLiveReferencesByFile['data/feat-effects.json'],
  classArchetypesLiveReferenceRemovals: dependencyScan.removalLiveReferencesByFile['data/class-archetypes.json'],
  otherReferenceRequiresReviewPaths: 0,
  derivativeLiveRuntimeReferences: implementationDerivatives.filter(d => d.dependencyStatus === DS_LIVE).length,
  derivativeNoLiveRuntimeReferences: implementationDerivatives.filter(d => d.dependencyStatus === DS_NONE).length,
  recallCrossDomainCollisionRetained: p1a.certifiedCrossDomainNameCollisions.some(c => c.displayName === 'Recall'),
  autofireAssaultCrossDomainCollisionRetained: p1a.certifiedCrossDomainNameCollisions.some(c => c.displayName === 'Autofire Assault'),
  productionMutated: false
};
const want = { derivativeLiveRuntimeReferences: 6, derivativeNoLiveRuntimeReferences: 0, removalLiveRuntimeReferences: 15, removalNoLiveRuntimeReferences: 18, featEffectsLiveReferenceRemovals: 13, classArchetypesLiveReferenceRemovals: 2, otherReferenceRequiresReviewPaths: 0, currentRecords: 390, uniqueCurrentIds: 390, preserveCanonical: 351, canonicalIdsRepresented: 351, preserveDerivativesPending1C: 6,
  removeNoncanonical: 33, replacementCanonicalIdNonNullCount: 0, requiredCanonicalAdditions: 2,
  recallCrossDomainCollisionRetained: true, autofireAssaultCrossDomainCollisionRetained: true };
for (const [k, v] of Object.entries(want)) assert(acceptance[k] === v, `acceptance ${k} expected ${v}, got ${acceptance[k]}`);
assert(351 + 6 + 33 === acceptance.currentRecords, '351 + 6 + 33 != 390');
acceptance.allGatesPassed = true;

const manifest = {
  schemaVersion: '1.0',
  phase: '1B',
  status: 'PHASE_1B_REPOSITORY_RECONCILIATION_CERTIFIED',
  generatedFromMainSha: BASELINE_MAIN_SHA,
  phase0Authority: { file: P0_PATH, version: p0.version, status: p0.status },
  phase1AAuthority: { file: P1A_PATH, status: p1a.status, finalCommit: PHASE1A_FINAL_COMMIT },
  currentProduction: { catalogFile: 'data/feat-catalog.json', records: 390, partition: { canonicalExisting: 351, implementationDerivatives: 6, noncanonicalRemoval: 33 }, missingCanonicalIdentities: 2 },
  reconciliationPolicy: {
    allowedCurrentRecordDispositions: ALLOWED_DISPOSITIONS,
    totals: { [D_CANON]: 351, [D_DERIV]: 6, [D_REMOVE]: 33 },
    noAutomaticReplacements: true,
    replacementCanonicalId: 'null for all 33 removals; no automatic identity replacement or redirect is permitted',
    removalWithReferences: 'Live runtime references (data/feat-effects.json, data/class-archetypes.json) require REMEDIATE_LIVE_REFERENCES_BEFORE_RECORD_DELETION; derived, fix, orphan, and documentation references do not block removal. References are not redirected to another canonical feat without future owner authority.',
    phase0ClassificationPreserved: 'phase0Classification copies the Phase 0 value; reconciliationDisposition is the separate future action',
    productionMutationAuthorized: false
  },
  currentRecordDispositions: records,
  requiredCanonicalAdditions: REQUIRED_ADDITIONS,
  implementationDerivatives,
  noncanonicalRemovalSet: removalSet,
  dependencyScan,
  domainGuardAuthority,
  interimProjection,
  acceptance
};
const jsonText = JSON.stringify(manifest, null, 2) + '\n';

// ---------- Markdown ----------
const esc = (s) => String(s).replace(/\|/g, '\\|');
const md = [];
md.push('# Feat Phase 1B — Repository Reconciliation Authority', '', `Status: \`${manifest.status}\``, '',
  'Generated from `data/audits/feat-phase-1b-repository-reconciliation.json` by `tools/build-feat-phase-1b-reconciliation-authority.mjs`.', '');
md.push('## Baseline', '', `- Starting main SHA: \`${BASELINE_MAIN_SHA}\``, `- Phase 0 version: \`${p0.version}\``,
  `- Phase 1A: \`${p1a.status}\` (final commit \`${PHASE1A_FINAL_COMMIT}\`)`, '');
md.push('## Exact partition', '', '```text', '390 current records', '351 preserve canonical', '6 preserve derivatives pending 1C', '33 remove noncanonical', '```', '',
  'Two canonical identities are missing from production and are future additions, not current records.', '');
md.push('## Missing canonical identities (future additions)', '', '| Name | canonicalId | identityKey | futureAction |', '| --- | --- | --- | --- |',
  ...REQUIRED_ADDITIONS.map(r => `| ${r.displayName} | \`${r.canonicalId}\` | \`${r.identityKey}\` | \`${r.futureAction}\` |`), '');
md.push('## Six implementation derivatives', '',
  `Parent: Weapon Proficiency, \`${WP_PARENT_ID}\` (\`${WP_PARENT_KEY}\`). None is a canonical identity; none is counted among the 353; structural resolution is \`PENDING_PHASE_1C\`. Their references are preserved as evidence (\`${FM_DERIV}\`) and not rewritten.`, '',
  '| Repo ID | Name | Disposition | Exact-ID reference paths | Live runtime paths |', '| --- | --- | --- | --- | --- |',
  ...implementationDerivatives.map(r => `| \`${r.repoId}\` | ${esc(r.repoName)} | \`${D_DERIV}\` | ${r.exactIdReferenceCount} | ${r.liveRuntimeReferencePaths.length ? r.liveRuntimeReferencePaths.map(p => `\`${p}\``).join('<br>') : '—'} |`), '');
md.push('## 33 removals', '', 'Disposition `REMOVE_NONCANONICAL_FEAT_RECORD` for all; `replacementCanonicalId` is null for all (no automatic replacements). Dependency analysis tells a later execution phase what else must be cleaned; it does not change canonicality.', '',
  '| Repo ID | Name | Phase 0 classification | Dependency status | Exact-ID paths | Live runtime path |', '| --- | --- | --- | --- | --- | --- |',
  ...removalSet.map(r => `| \`${r.repoId}\` | ${esc(r.repoName)} | \`${r.phase0Classification}\` | \`${r.dependencyStatus}\` | ${r.exactIdReferenceCount} | ${r.liveRuntimeReferencePaths.length ? r.liveRuntimeReferencePaths.map(p => `\`${p}\``).join('<br>') : '—'} |`), '');
md.push('## Dependency classification', '',
  'Reference classes are owner-defined by exact path (not by directory): `LIVE_RUNTIME_AUTHORITY` = `data/feat-effects.json`, `data/class-archetypes.json`, `data/generated/class-feat-list-bindings.json`, `packs/heroic.db`, `packs/nonheroic.db`, `packs/npc.db`, `scripts/engine/progression/prerequisites/class-prereq-normalizer.js`; `DERIVED_REBUILD_ARTIFACT` = `data/feat_buckets_and_subbuckets.json`, `data/generated/feat-view-model.json`; `FIX_OR_MIGRATION_ARTIFACT` = `data/fixes/feat-view-model.json`; `ORPHAN_HISTORICAL_ARTIFACT` = `packs/feat-catalog.db`; `AUDIT_OR_DOCUMENTATION_REFERENCE` = `data/prestige-prerequisites-reference.json` (live prestige authority is `scripts/data/prestige-prerequisites.js`), `docs/`, `data/audits/`, Phase 0/1 audit builders. Classification is exact-path specific (e.g. `data/generated/class-feat-list-bindings.json` is live, `data/generated/feat-view-model.json` is derived). Any other path fails the build as `OTHER_REFERENCE_REQUIRES_REVIEW` (0 found).', '',
  `- All ${dependencyScan.removalRecordsWithExactIdReferences} of the 33 removal records have exact-ID references somewhere in tracked repository artifacts.`,
  `- ${dependencyScan.removalRecordsWithLiveRuntimeReferences} have exact-ID references in live runtime authorities (${dependencyScan.removalLiveReferencesByFile['data/feat-effects.json']} in \`data/feat-effects.json\`, ${dependencyScan.removalLiveReferencesByFile['data/class-archetypes.json']} in \`data/class-archetypes.json\`): \`${FM_REMEDIATE}\`.`,
  `- ${dependencyScan.removalRecordsWithNoLiveRuntimeReference} have no live runtime exact-ID blocker: \`${FM_NO_BLOCKER}\`.`,
  '- All 33 also occur in stale/derived/fix/orphan artifacts that require regeneration, cleanup, or historical handling during the later mutation phase; these are not deletion blockers and create no replacement requirement.',
  '- `packs/feat-catalog.db` is orphaned and nonblocking. It MUST NOT block deletion of a noncanonical feat record, and it MUST NOT be regenerated as the production feat pack unless separately authorized. The live Foundry feat pack remains `packs/feats.db` as declared in `system.json`.', '',
  '### Live-reference removal records (15)', '', '| Repo ID | Name | Live path |', '| --- | --- | --- |',
  ...liveRemovals.map(r => `| \`${r.repoId}\` | ${esc(r.repoName)} | \`${r.liveRuntimeReferencePaths[0]}\` |`), '');
md.push('## Domain guard', '',
  '- `NAME_ONLY_DOMAIN_GUARD_REJECTED`: no canonical feat decision may reject a record solely because another domain has the same normalized name.',
  '- Recall proves the failure: `scripts/data/feat-domain-guard.js` denies the name `recall` as a talent-only contaminant, yet the feat Recall (`c352f81dde5c9dff`, The Force Unleashed Campaign Guide p.35) is a certified canonical identity distinct from the Rebellion Era Campaign Guide talent.',
  '- Autofire Assault independently demonstrates same-name cross-domain legality: feat (Legacy Era Campaign Guide p.34) and talent (Galaxy at War p.22).',
  '- `NAME_ONLY_VALIDITY_AUTHORITY_INSUFFICIENT_FOR_SAME_NAME_CROSS_DOMAIN_IDENTITIES`: `data/feat-validity-registry.json` is name-keyed; future validity must key to stable feat identity.',
  '- Future domain authority must be identity-aware, using `CANONICAL_FEAT_IDS` (353), `FEAT_IMPLEMENTATION_DERIVATIVE_IDS` (6), and `NONCANONICAL_FEAT_RECORD_IDS` (33). Not implemented in Phase 1B.', '');
md.push('## Projection', '',
  '- Canonical identity count: 353.',
  '- Interim projected documents before Phase 1C: 390 − 33 + 2 = **359** (derivatives retained).',
  '- Final production document count is **not frozen** (`null`, `PENDING_PHASE_1C`); Phase 1C controls derivative structure.', '');
md.push('## Acceptance', '', '| Gate | Result |', '| --- | --- |', ...Object.entries(acceptance).map(([k, v]) => `| ${k} | ${v === null ? 'null' : v} |`), '');
md.push('## Mutation statement', '', 'Phase 1B is authority-only. No production feat record was added, removed, renamed, re-IDed, or rewritten.', '');
md.push('## Current record dispositions (390)', '', '| Repo ID | Name | Disposition |', '| --- | --- | --- |',
  ...records.map(r => `| \`${r.repoId}\` | ${esc(r.repoName)} | \`${r.reconciliationDisposition}\` |`), '');

fs.writeFileSync(path.join(ROOT, OUT_JSON), jsonText);
fs.writeFileSync(path.join(ROOT, OUT_MD), md.join('\n'));
console.log(`PHASE 1B OK: 390 = ${acceptance.preserveCanonical} + ${acceptance.preserveDerivativesPending1C} + ${acceptance.removeNoncanonical}; ` +
  `additions ${REQUIRED_ADDITIONS.length}; projection ${interimProjection.interimProjectedProductionDocumentCountBefore1C}; ` +
  `removals live-referenced ${dependencyScan.removalRecordsWithLiveRuntimeReferences}/33.`);
