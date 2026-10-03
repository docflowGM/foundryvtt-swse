#!/usr/bin/env node
// Phase 1A — Canonical Identity Manifest and Stable-ID Authority builder.
// Deterministically derives the manifest from the frozen Phase 0 authority and pins it to the
// current production catalog. Fails closed: any mismatch exits nonzero naming the identity.
// Audit-only: never writes production feat data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P0_PATH = 'data/audits/feat-phase-0-canonical-census.json';
const OUT_JSON = 'data/audits/feat-phase-1a-canonical-identity-manifest.json';
const OUT_MD = 'docs/audits/feat-phase-1a-canonical-identity-manifest.md';

const BASELINE_MAIN_SHA = '8a2b59da3920c39d2390ba997c9dcf57901bdddc';
const PHASE0_VERSION = '1.1-phase0-authority-corrected-after-persistence-readback';
const PHASE0_STATUS = 'PHASE0_COMPLETE_CANONICAL_CENSUS_FROZEN_AUTHORITY_CORRECTED';

const NEW_IDS = [
  { name: 'Recall', seed: 'swse-feat|the-force-unleashed-campaign-guide::35::Recall', expected: 'c352f81dde5c9dff' },
  { name: 'Staggering Attack', seed: 'swse-feat|scum-and-villainy::24::Staggering Attack', expected: 'c9c4130a55761330' }
];

const IDENTITY_SUBPHASES = ['0A', '0B', '0C', '0D', '0E', '0F', '0G', '0H', '0I', '0J', '0K', '0L', '0M', '0N', '0O'];
const CERTIFIED_FAMILIES = ['Armor Proficiency', 'Dual Weapon Mastery', 'Martial Arts'];

function fail(msg) {
  console.error(`PHASE 1A BUILD FAILED: ${msg}`);
  process.exit(1);
}
function assert(cond, msg) { if (!cond) fail(msg); }

export function normalizeName(s) {
  return String(s)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’‛ʼ′]/g, "'")
    .replace(/'/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ').trim()
    .replace(/ /g, '-');
}
const sourceKey = (book) => normalizeName(book);
const sha16 = (seed) => crypto.createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 16);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function locatorFor(page, locator) {
  if (page !== null && page !== undefined) return `p${page}`;
  assert(locator, 'record has neither page nor locator');
  return normalizeName(locator);
}

// ---------- Phase 0 assertions ----------
const p0 = readJson(P0_PATH);
assert(p0.version === PHASE0_VERSION, `Phase 0 version mismatch: ${p0.version}`);
assert(p0.status === PHASE0_STATUS, `Phase 0 status mismatch: ${p0.status}`);
const sub = p0.phase0.subphases;
const qa = sub['0-QA'];
const gates = qa.acceptanceGates;
const expectGates = {
  finalCanonicalIdentityCount: 353, canonicalUniqueNormalizedDisplayNames: 352, fullFeatPublicationsAcrossAllSources: 355,
  confirmedFullReprints: 2, currentRepoFeatRecords: 390, canonicalIdentitiesRepresentedByCurrentRepoRecords: 351,
  canonicalIdentitiesMissingFromRepo: 2, repoRecordsOutsideCanonicalIdentityCorpus: 39, implementationDerivativeRecords: 6,
  noncanonicalWrongDomainOrLegacyRecords: 33, unresolvedRepoOnlyEnumerationRecords: 0, unresolvedCrossBookReprintCandidates: 0
};
for (const [k, v] of Object.entries(expectGates)) assert(gates[k] === v, `Phase 0 frozen gate ${k} expected ${v}, got ${gates[k]}`);
assert(p0.phase0.workingCounts.wikiSeedClaims === 285, 'Phase 0 wikiSeedClaims != 285');
assert(qa.repoOutsideCanonicalCorpus.length === 39, 'Phase 0 outside-corpus != 39');

// ---------- Baseline ancestry ----------
try {
  execFileSync('git', ['merge-base', '--is-ancestor', BASELINE_MAIN_SHA, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
} catch { fail(`baseline ${BASELINE_MAIN_SHA} is not an ancestor of HEAD`); }

// ---------- Catalog ----------
const rawCat = readJson('data/feat-catalog.json');
const catalog = Array.isArray(rawCat) ? rawCat : (rawCat.feats || rawCat.records || Object.values(rawCat));
assert(catalog.length === 390, `production catalog count ${catalog.length} != 390`);
const catById = new Map();
for (const r of catalog) {
  const id = r.id || r._id;
  assert(id, 'catalog record without id');
  assert(!catById.has(id), `duplicate catalog id ${id}`);
  catById.set(id, r);
}

// ---------- Collect identities ----------
const entries = []; // {subphase, rec, book, page, locator, category}
for (const sp of IDENTITY_SUBPHASES) {
  const s = sub[sp];
  if (sp === 'K0') continue;
  const recs = s.canonicalFeatRecords || s.canonicalFeatPublicationRecords || s.publicationClaims;
  assert(Array.isArray(recs), `subphase ${sp} has no record array`);
  for (const rec of recs) entries.push({ sp, rec });
}
assert(entries.length === 355, `publication-level entries ${entries.length} != 355`);

const identities = []; // primary identities
const reprintClaims = []; // reprint publication entries
for (const { sp, rec } of entries) {
  if (sp === '0B' && rec.identityRole === 'FULL_REPRINT_EXISTING_CANONICAL_IDENTITY') {
    reprintClaims.push({ name: rec.name, book: rec.publicationSourcebook, page: rec.publicationPage, category: rec.publicationCategory, via: '0B' });
    continue;
  }
  if (sp === '0B') {
    identities.push({ sp, rec, name: rec.name, book: rec.publicationSourcebook, page: rec.publicationPage, locator: null, category: rec.publicationCategory });
    continue;
  }
  if (sp === '0K' && rec.reprintSourcebook) {
    reprintClaims.push({ name: rec.name, book: rec.reprintSourcebook, page: rec.reprintPage, category: rec.publicationCategoryInReprint, via: '0K', primaryBook: rec.canonicalSourcebook, primaryPage: rec.canonicalPage });
    continue;
  }
  identities.push({ sp, rec, name: rec.name, book: rec.canonicalSourcebook, page: rec.canonicalPage, locator: rec.canonicalLocator || null, category: rec.publicationCategory });
}
assert(identities.length === 353, `identities ${identities.length} != 353`);
assert(reprintClaims.length === 2, `reprint publication entries ${reprintClaims.length} != 2`);
assert(identities.length + reprintClaims.length === 355, 'publications != 355');

// ---------- Reprint reconciliation ----------
const REPRINT_NAMES = ['Tech Specialist', 'Echani Training'];
assert(JSON.stringify(reprintClaims.map(r => r.name).sort()) === JSON.stringify([...REPRINT_NAMES].sort()), 'reprint set differs from certified Tech Specialist / Echani Training');
const qaReprints = qa.confirmedFullReprints.map(r => r.name).sort();
assert(JSON.stringify(qaReprints) === JSON.stringify([...REPRINT_NAMES].sort()), 'Phase 0 0-QA reprint list differs');

// ---------- Normalized-name collisions ----------
const byNorm = new Map();
for (const i of identities) {
  i.normalizedName = normalizeName(i.name);
  assert(i.normalizedName, `empty normalized name for ${i.name}`);
  if (!byNorm.has(i.normalizedName)) byNorm.set(i.normalizedName, []);
  byNorm.get(i.normalizedName).push(i);
}
const dupNorms = [...byNorm.entries()].filter(([, v]) => v.length > 1);
assert(byNorm.size === 352, `unique normalized names ${byNorm.size} != 352`);
assert(dupNorms.length === 1 && dupNorms[0][0] === 'staggering-attack' && dupNorms[0][1].length === 2,
  `unexpected duplicate normalized names: ${dupNorms.map(([k, v]) => `${k}x${v.length}`).join(', ')}`);

// ---------- IDs ----------
const missing = identities.filter(i => !i.rec.repoId);
assert(missing.length === 2, `identities without repoId ${missing.length} != 2`);
const newIdByKey = new Map();
for (const n of NEW_IDS) {
  const got = sha16(n.seed);
  assert(got === n.expected, `new ID derivation for ${n.name}: expected ${n.expected}, got ${got}`);
  newIdByKey.set(n.seed, got);
}
assert(NEW_IDS[0].expected !== NEW_IDS[1].expected, 'new IDs collide with each other');
let packText = '';
try { packText = fs.readFileSync(path.join(ROOT, 'packs/feats.db'), 'utf8'); } catch { fail('packs/feats.db unreadable'); }
for (const n of NEW_IDS) {
  assert(!catById.has(n.expected), `new ID ${n.expected} (${n.name}) already exists in production catalog`);
  assert(!packText.includes(n.expected), `new ID ${n.expected} (${n.name}) already present in packs/feats.db`);
}

const seenRepoIds = new Set();
for (const i of identities) {
  const label = `${i.name} (${i.book} ${i.page ?? i.locator})`;
  const key = sourceKey(i.book);
  const loc = locatorFor(i.page, i.locator);
  i.identityKey = `feat::${key}::${loc}::${i.normalizedName}`;
  if (i.rec.repoId) {
    const id = i.rec.repoId;
    assert(!seenRepoIds.has(id), `repo ID ${id} assigned to multiple identities (${label})`);
    seenRepoIds.add(id);
    const cat = catById.get(id);
    assert(cat, `repoId ${id} for ${label} not found in production catalog`);
    assert(normalizeName(cat.name) === i.normalizedName, `repoId ${id} resolves to "${cat.name}", expected ${label}`);
    i.canonicalId = id;
    i.mapping = { status: 'EXISTING_CANONICAL_RECORD', repoId: id, repoName: cat.name };
  } else {
    const nid = NEW_IDS.find(n => (n.name === 'Recall' && i.name === 'Recall' && key === 'the-force-unleashed-campaign-guide' && i.page === 35) ||
      (n.name === 'Staggering Attack' && i.name === 'Staggering Attack' && key === 'scum-and-villainy' && i.page === 24));
    assert(nid, `missing-repo identity ${label} is not a certified new-ID identity`);
    i.canonicalId = nid.expected;
    i.mapping = { status: 'MISSING_REPO_RECORD', repoId: null, repoName: null };
  }
}
const ids = identities.map(i => i.canonicalId);
assert(new Set(ids).size === 353, 'canonical IDs not unique');
assert(new Set(identities.map(i => i.identityKey)).size === 353, 'identityKeys not unique');
const outsideIds = new Set(qa.repoOutsideCanonicalCorpus.map(r => r.id));
for (const id of outsideIds) assert(catById.has(id), `outside-corpus id ${id} not in catalog`);
for (const id of seenRepoIds) assert(!outsideIds.has(id), `repo ID ${id} is both canonical and outside-corpus`);
assert(seenRepoIds.size === 351 && seenRepoIds.size + outsideIds.size === 390, 'repo partition 351 + 39 != 390');

// ---------- Collisions, reprints, families ----------
const staggering = byNorm.get('staggering-attack');
for (const s of staggering) {
  s.sameNameCollisionGroup = 'staggering-attack';
  s.sameNameCollisionType = 'DISTINCT_FEAT_IDENTITIES';
}
const scumSA = staggering.find(s => s.canonicalId === 'c9c4130a55761330');
const galaxySA = staggering.find(s => s.rec.repoId === '192923f60db38831');
assert(scumSA && galaxySA, 'Staggering Attack pair does not match Scum p.24 / Galaxy at War p.26');
assert(galaxySA.mapping.status === 'EXISTING_CANONICAL_RECORD' && scumSA.mapping.status === 'MISSING_REPO_RECORD', 'Staggering Attack mapping statuses wrong');

const CROSS = [
  { name: 'Recall', key: 'feat::the-force-unleashed-campaign-guide::p35::recall', otherDomain: 'talent', other: 'Rebellion Era Campaign Guide talent' },
  { name: 'Autofire Assault', key: 'feat::legacy-era-campaign-guide::p34::autofire-assault', otherDomain: 'talent', other: 'Galaxy at War talent p.22' }
];
for (const c of CROSS) {
  const i = identities.find(x => x.identityKey === c.key);
  assert(i, `cross-domain collision identity not found: ${c.name} (${c.key})`);
  i.crossDomainCollision = { classification: 'SAME_NAME_DIFFERENT_DOMAIN', otherDomain: c.otherDomain, otherDomainReference: c.other };
}
assert(qa.crossDomainSameNameCollisions.map(c => c.name).sort().join() === 'Autofire Assault,Recall', 'Phase 0 cross-domain list differs');

const reprintsByName = new Map();
for (const r of reprintClaims) {
  const i = identities.find(x => x.name === r.name);
  assert(i, `reprint primary identity missing: ${r.name}`);
  const reprint = { sourcebook: r.book, sourceKey: sourceKey(r.book), page: r.page, locatorKey: `p${r.page}`, publicationCategory: r.category, relation: 'FULL_REPRINT' };
  i.reprints = [reprint];
}
const tech = identities.find(i => i.name === 'Tech Specialist');
const echani = identities.find(i => i.name === 'Echani Training');
assert(tech.book === 'Saga Edition Web Enhancement 1: The Tech Specialist' && tech.reprints[0].sourceKey === 'starships-of-the-galaxy' && tech.reprints[0].page === 21, 'Tech Specialist primary/reprint mismatch');
assert(echani.identityKey === 'feat::knights-of-the-old-republic-campaign-guide::p33::echani-training' && echani.reprints[0].sourceKey === 'galaxy-at-war' && echani.reprints[0].page === 26, 'Echani Training primary/reprint mismatch');

// Owner-authorized structural mapping (Phase 1A correction). Hard-coded; never inferred from names.
const OWNER_TIERS = {
  'Armor Proficiency (Light)': { familyKey: 'armor-proficiency', tier: 1 },
  'Armor Proficiency (Medium)': { familyKey: 'armor-proficiency', tier: 2 },
  'Armor Proficiency (Heavy)': { familyKey: 'armor-proficiency', tier: 3 },
  'Dual Weapon Mastery I': { familyKey: 'dual-weapon-mastery', tier: 1 },
  'Dual Weapon Mastery II': { familyKey: 'dual-weapon-mastery', tier: 2 },
  'Dual Weapon Mastery III': { familyKey: 'dual-weapon-mastery', tier: 3 },
  'Martial Arts I': { familyKey: 'martial-arts', tier: 1 },
  'Martial Arts II': { familyKey: 'martial-arts', tier: 2 },
  'Martial Arts III': { familyKey: 'martial-arts', tier: 3 }
};
const STRUCTURAL_STATUSES = ['PHASE0_CERTIFIED', 'PENDING_PHASE_1C'];
// Cross-check: the Phase 0 certified tier families must contain exactly these 9 members.
const p0Members = [];
for (const f of sub['0A'].structuralFamilies.tieredPrintedFamilies) {
  assert(CERTIFIED_FAMILIES.includes(f.family), `unexpected certified family ${f.family}`);
  for (const m of f.members) {
    assert(OWNER_TIERS[m] && OWNER_TIERS[m].familyKey === normalizeName(f.family), `Phase 0 family member ${m} not in owner tier mapping`);
    p0Members.push(m);
  }
}
assert(p0Members.length === 9 && Object.keys(OWNER_TIERS).every(k => p0Members.includes(k)), 'Phase 0 certified family members differ from owner tier mapping');
const tierOf = new Map();
for (const [name, v] of Object.entries(OWNER_TIERS)) {
  const hits = identities.filter(x => x.name === name);
  assert(hits.length === 1, `owner-tier identity ${name} matched ${hits.length} identities`);
  tierOf.set(hits[0], v);
}

// ---------- Records ----------
const records = identities.map(i => ({
  canonicalId: i.canonicalId,
  identityKey: i.identityKey,
  displayName: i.name,
  normalizedName: i.normalizedName,
  domain: 'feat',
  primaryPublication: {
    sourcebook: i.book,
    sourceKey: sourceKey(i.book),
    page: i.page ?? null,
    locator: i.locator,
    locatorKey: locatorFor(i.page, i.locator),
    phase0Subphase: i.sp
  },
  reprints: i.reprints || [],
  publicationCategory: i.category,
  repoMapping: i.mapping,
  sameNameCollisionGroup: i.sameNameCollisionGroup || null,
  sameNameCollisionType: i.sameNameCollisionType || null,
  crossDomainCollision: i.crossDomainCollision || null,
  structure: tierOf.has(i)
    ? { familyKey: tierOf.get(i).familyKey, tier: tierOf.get(i).tier, selectionModel: null, scopeType: null, repeatable: null, structuralStatus: 'PHASE0_CERTIFIED', certifiedFields: ['familyKey', 'tier'] }
    : { familyKey: null, tier: null, selectionModel: null, scopeType: null, repeatable: null, structuralStatus: 'PENDING_PHASE_1C', certifiedFields: [] }
}));

const count = (f) => records.filter(f).length;
const acceptance = {
  records: records.length,
  uniqueCanonicalIds: new Set(records.map(r => r.canonicalId)).size,
  uniqueIdentityKeys: new Set(records.map(r => r.identityKey)).size,
  uniqueNormalizedNames: new Set(records.map(r => r.normalizedName)).size,
  publications: records.length + count(r => r.reprints.length) ,
  existingCanonicalRecords: count(r => r.repoMapping.status === 'EXISTING_CANONICAL_RECORD'),
  missingRepoRecords: count(r => r.repoMapping.status === 'MISSING_REPO_RECORD'),
  identitiesWithReprints: count(r => r.reprints.length),
  sameNameCollisionRecords: count(r => r.sameNameCollisionGroup),
  crossDomainCollisionRecords: count(r => r.crossDomainCollision),
  repoIdsAssignedToMultipleIdentities: 0,
  existingRepoIdsResolvedInCatalog: seenRepoIds.size,
  phase0MappingsLost: 0,
  newIdsDerivedAndNonColliding: true,
  productionCatalogRecordCount: catalog.length,
  outsideCorpusRecordsUntouched: outsideIds.size,
  productionMutated: false
};
const want = { records: 353, uniqueCanonicalIds: 353, uniqueIdentityKeys: 353, uniqueNormalizedNames: 352, publications: 355,
  existingCanonicalRecords: 351, missingRepoRecords: 2, identitiesWithReprints: 2, sameNameCollisionRecords: 2, crossDomainCollisionRecords: 2 };
for (const [k, v] of Object.entries(want)) assert(acceptance[k] === v, `acceptance ${k} expected ${v}, got ${acceptance[k]}`);
// Structural authority gates
for (const r of records) assert(STRUCTURAL_STATUSES.includes(r.structure.structuralStatus), `unauthorized structuralStatus ${r.structure.structuralStatus} on ${r.displayName}`);
const certified = records.filter(r => r.structure.structuralStatus === 'PHASE0_CERTIFIED');
const pending = records.filter(r => r.structure.structuralStatus === 'PENDING_PHASE_1C');
assert(certified.length === 9, `PHASE0_CERTIFIED records ${certified.length} != 9`);
assert(pending.length === 344, `PENDING_PHASE_1C records ${pending.length} != 344`);
for (const r of certified) {
  const st = r.structure;
  assert(st.familyKey && Number.isInteger(st.tier), `certified record ${r.displayName} lacks familyKey/numeric tier`);
  assert(JSON.stringify(st.certifiedFields) === '["familyKey","tier"]', `certified record ${r.displayName} certifiedFields wrong`);
  assert(st.selectionModel === null && st.scopeType === null && st.repeatable === null, `certified record ${r.displayName} has non-null selectionModel/scopeType/repeatable`);
  const want = OWNER_TIERS[r.displayName];
  assert(want && want.familyKey === st.familyKey && want.tier === st.tier, `tier mapping mismatch for ${r.displayName}`);
}
for (const r of pending) {
  const st = r.structure;
  assert(st.familyKey === null && st.tier === null && st.selectionModel === null && st.scopeType === null && st.repeatable === null && st.certifiedFields.length === 0,
    `pending record ${r.displayName} has non-null structural fields`);
}
// Owner-ratified Web locator keys
const LOCATORS = {
  'Tech Specialist': 'p3',
  'Dreadful Countenance': 'web-article-archived-rendering-page-4-of-4',
  'Rapid Assault': 'e2'
};
for (const [n, k] of Object.entries(LOCATORS)) {
  const r = records.find(x => x.displayName === n);
  assert(r && r.primaryPublication.locatorKey === k && r.identityKey.split('::')[2] === k, `owner-ratified locator key for ${n} is not ${k}`);
}
acceptance.structuralPhase0Certified = certified.length;
acceptance.structuralPendingPhase1C = pending.length;
acceptance.unauthorizedStructuralStatuses = 0;
acceptance.allGatesPassed = true;

const manifest = {
  schemaVersion: '1.0',
  phase: '1A',
  status: 'PHASE_1A_CANONICAL_IDENTITY_MANIFEST_CERTIFIED',
  generatedFromMainSha: BASELINE_MAIN_SHA,
  phase0Authority: { file: P0_PATH, version: PHASE0_VERSION, status: PHASE0_STATUS },
  frozenCorpus: {
    canonicalIdentities: 353, uniqueNormalizedNames: 352, fullFeatPublications: 355, confirmedFullReprints: 2,
    currentRepoRecords: 390, representedByRepo: 351, missingFromRepo: 2, outsideCanonicalCorpus: 39,
    implementationDerivatives: 6, noncanonicalWrongDomainOrLegacy: 33, unresolvedEnumeration: 0, unresolvedReprintCandidates: 0
  },
  identityPolicy: {
    existingRecords: 'canonicalId equals the current repo feat ID (preserved); validated against data/feat-catalog.json by ID and normalized name.',
    newRecords: 'canonicalId derived deterministically (newIdPolicy); no production record is created in Phase 1A.',
    identityKeyFormat: 'feat::<primarySourceKey>::<primaryLocatorKey>::<normalizedName>',
    locatorKey: 'p<certified printed page>, or normalized special locator when no printed page is certified',
    structuralFields: 'Only Phase 0 explicitly certified facts are carried forward; all else null with PENDING_PHASE_1C.'
  },
  normalizationPolicy: {
    purpose: 'Matching and search field only; not an ID.',
    steps: [
      'NFKD', 'strip combining marks', 'lowercase', 'normalize Unicode apostrophes to ASCII apostrophe', 'remove apostrophes',
      'normalize Unicode dashes to hyphen', '& to and', 'non-alphanumerics (hyphen included) to space', 'collapse whitespace', 'trim', 'spaces to hyphen'
    ],
    examples: { 'Flèche': 'fleche', 'Teräs Käsi Training': 'teras-kasi-training', "K'tara Training": 'ktara-training', 'Point-Blank Shot': 'point-blank-shot' }
  },
  newIdPolicy: {
    algorithm: 'first 16 lowercase hex characters of SHA-256 over the exact UTF-8 seed',
    ids: NEW_IDS.map(n => ({ displayName: n.name, seed: n.seed, canonicalId: n.expected }))
  },
  certifiedReprints: [
    { displayName: 'Tech Specialist', primary: 'Saga Edition Web Enhancement 1: The Tech Specialist', reprint: 'Starships of the Galaxy p.21', ruling: 'SAME_FEAT_FULL_REPRINT' },
    { displayName: 'Echani Training', primary: 'Knights of the Old Republic Campaign Guide p.33', reprint: 'Galaxy at War p.26', ruling: 'SAME_FEAT_FULL_REPRINT_WITH_ADDITIONAL_SPECIAL_CLAUSE' }
  ],
  certifiedSameNameFeatCollisions: [
    { sameNameCollisionGroup: 'staggering-attack', type: 'DISTINCT_FEAT_IDENTITIES',
      identities: [scumSA.canonicalId, galaxySA.canonicalId].map(id => records.find(r => r.canonicalId === id).identityKey) }
  ],
  certifiedCrossDomainNameCollisions: CROSS.map(c => ({ displayName: c.name, feat: c.key, otherDomain: c.otherDomain, otherDomainReference: c.other, classification: 'SAME_NAME_DIFFERENT_DOMAIN' })),
  records,
  acceptance
};

const jsonText = JSON.stringify(manifest, null, 2) + '\n';

// ---------- Markdown ----------
const esc = (s) => String(s).replace(/\|/g, '\\|');
const md = [];
md.push('# Feat Phase 1A — Canonical Identity Manifest', '');
md.push(`Status: \`${manifest.status}\``, '');
md.push('## Purpose', '',
  'Pins the 353 frozen Phase 0 canonical feat identities to stable canonical IDs and deterministic identity keys. ' +
  'Human rendering of `data/audits/feat-phase-1a-canonical-identity-manifest.json` (machine authority), generated by `tools/build-feat-phase-1a-identity-manifest.mjs`.', '');
md.push('## Baseline', '',
  `- Starting main SHA: \`${BASELINE_MAIN_SHA}\``,
  `- Phase 0 authority: \`${PHASE0_VERSION}\` / \`${PHASE0_STATUS}\``, '');
md.push('## Counts', '',
  '- Canonical identities: **353**', '- Unique normalized names: **352**', '- Full publications: **355** (2 confirmed full reprints)',
  '- Existing repo mappings (`EXISTING_CANONICAL_RECORD`): **351**', '- Missing repo records (`MISSING_REPO_RECORD`): **2** (Recall, Scum and Villainy Staggering Attack)',
  '- Production catalog records: 390 (351 represented + 39 outside the canonical corpus, unreconciled here)', '');
md.push('## ID policy', '',
  '- Identities with a current repo record keep that record ID as `canonicalId`; each was validated by ID and normalized name against `data/feat-catalog.json`.',
  '- Two new IDs: first 16 hex of SHA-256 over the exact UTF-8 seed. Neither exists in the production catalog or `packs/feats.db`.', '',
  '| Identity | Seed | canonicalId |', '| --- | --- | --- |',
  ...NEW_IDS.map(n => `| ${n.name} | \`${n.seed}\` | \`${n.expected}\` |`), '');
md.push('## Normalization and identity key', '',
  '`normalizedName`: NFKD, strip combining marks, lowercase, Unicode apostrophes to `\'` then removed, Unicode dashes to `-`, `&` to `and`, non-alphanumerics to space, collapse/trim, spaces to `-`. Matching/search field only.', '',
  '`identityKey`: `feat::<primarySourceKey>::<primaryLocatorKey>::<normalizedName>`.', '');
md.push('## Certified exceptions', '',
  '- **Reprints (metadata on one identity each):** Tech Specialist (Saga Edition Web Enhancement 1 primary; Starships of the Galaxy p.21) and Echani Training (KOTOR Campaign Guide p.33 primary; Galaxy at War p.26).',
  '- **Same-name distinct feats:** `staggering-attack` — Scum and Villainy p.24 (`c9c4130a55761330`, missing from repo) and Galaxy at War p.26 (`192923f60db38831`, represented). Group type `DISTINCT_FEAT_IDENTITIES`.',
  '- **Cross-domain name collisions (`SAME_NAME_DIFFERENT_DOMAIN`, metadata only):** Recall (feat, TFU p.35, vs. a talent) and Autofire Assault (feat, Legacy Era Campaign Guide p.34, vs. a talent). Name-only domain guards are not valid for these.', '');
md.push('## Structural fields', '',
  'Family, tier, selection model, scope, and repeatable fields are not completed here. Only the 9 identities in the three Phase 0-certified tier families (Armor Proficiency, Dual Weapon Mastery, Martial Arts) carry `familyKey` and numeric `tier` (owner-authorized mapping, status `PHASE0_CERTIFIED`, `certifiedFields` = `familyKey`, `tier`). Their `selectionModel`, `scopeType`, and `repeatable` remain null. The other 344 records are `PENDING_PHASE_1C` with all structural fields null. Scope/tier/family completion remains Phase 1C.', '');
md.push('## Acceptance', '', '| Gate | Result |', '| --- | --- |',
  ...Object.entries(acceptance).map(([k, v]) => `| ${k} | ${v} |`), '');
md.push('## Production', '', 'Production was not mutated: no feat records were created, deleted, renamed, re-IDed, or edited; `data/feat-catalog.json`, `packs/feats.db`, the validity registry, domain guard, effects, and prerequisite authority are unchanged. Phase 1B (reconciliation of the 39 outside-corpus records, domain-guard redesign) and Phase 1C are not started.', '');
md.push('## Identity table', '', '| canonicalId | Name | Identity key | Repo mapping | Notes |', '| --- | --- | --- | --- | --- |');
for (const r of records) {
  const notes = [];
  if (r.reprints.length) notes.push(`reprint: ${r.reprints[0].sourceKey} ${r.reprints[0].locatorKey}`);
  if (r.sameNameCollisionGroup) notes.push(`same-name: ${r.sameNameCollisionGroup}`);
  if (r.crossDomainCollision) notes.push('cross-domain: talent');
  if (r.structure.familyKey) notes.push(`family: ${r.structure.familyKey} tier ${r.structure.tier}`);
  md.push(`| \`${r.canonicalId}\` | ${esc(r.displayName)} | \`${r.identityKey}\` | ${r.repoMapping.status === 'EXISTING_CANONICAL_RECORD' ? 'existing' : 'MISSING'} | ${notes.join('; ')} |`);
}
md.push('');

fs.writeFileSync(path.join(ROOT, OUT_JSON), jsonText);
fs.writeFileSync(path.join(ROOT, OUT_MD), md.join('\n'));
console.log(`PHASE 1A OK: ${records.length} identities, ${acceptance.uniqueNormalizedNames} unique names, ` +
  `${acceptance.existingCanonicalRecords} existing / ${acceptance.missingRepoRecords} missing, ${acceptance.publications} publications.`);
