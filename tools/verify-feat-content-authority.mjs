#!/usr/bin/env node
// Deterministic validator for the feat CONTENT canonical authority closeout.
// Audit-only: reads the authority JSON/MD, the Phase 0 census, and the Phase 1A identity manifest. Writes nothing.
// Exits nonzero (naming the failed invariant) if any invariant no longer holds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUTH_JSON = 'data/audits/feat-content-canonical-authority.json';
const AUTH_MD = 'docs/audits/feat-content-canonical-authority.md';
const P0 = 'data/audits/feat-phase-0-canonical-census.json';
const P1A = 'data/audits/feat-phase-1a-canonical-identity-manifest.json';

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const norm = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[‘’]/g, "'").replace(/'/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '-');

const auth = readJson(AUTH_JSON);
const md = fs.readFileSync(path.join(ROOT, AUTH_MD), 'utf8');
const p0 = readJson(P0);
const p1a = readJson(P1A);

// ---- Declared closeout invariants ----
const c = auth.contentPhaseCloseout;
const declared = {
  fullFeatPublicationsReviewed: 355, canonicalIdentityCount: 353, uniqueNormalizedDisplayNames: 352, confirmedFullReprints: 2,
  repoBaselineRecords: 390, repoCanonicalRepresented: 351, repoCanonicalMissing: 2, implementationDerivatives: 6, noncanonicalWrongDomainLegacy: 33
};
for (const [k, v] of Object.entries(declared)) check(c[k] === v, `closeout.${k} expected ${v}, got ${c[k]}`);
check(c.productionMutationAuthorized === false, 'closeout.productionMutationAuthorized must be false');
check(c.status === 'COMPLETE_WITH_EXPLICIT_SOURCE_CONFLICTS_RETAINED', `closeout.status is ${c.status}`);
check(c.nextRecommendedPhase === 'PROVENANCE', 'closeout.nextRecommendedPhase must be PROVENANCE');
check(c.retainedSourceConflicts.length === 12, `retainedSourceConflicts ${c.retainedSourceConflicts.length} != 12`);
check(c.knownAuthorityCorrectionsToBackPropagate.length === 3, 'knownAuthorityCorrectionsToBackPropagate != 3');
const pr = auth.contentPhaseProgress;
check(pr.booksCompleted === 14 && pr.officialWebSourcePassCompleted === true, 'contentPhaseProgress books/web pass mismatch');
check(pr.fullFeatPublicationsReviewed === 355 && pr.canonicalIdentitiesRepresented === 353 && pr.repoCanonicalIdentitiesPresent === 351 && pr.repoCanonicalIdentitiesMissing === 2, 'contentPhaseProgress counts mismatch');
check(/Missing canonical repo identities: \*\*2\*\*/.test(md) && /Current repo canonical identities represented: \*\*351 \/ 353\*\*/.test(md), 'authority MD closeout lines do not match JSON');

// ---- Per-source declared counts ----
const order = auth.bookOrder;
check(order.length === 14, `bookOrder length ${order.length} != 14`);
const byBook = Object.fromEntries(order.map(o => [o.source, o.fullFeatPublications]));
check(order.reduce((a, o) => a + o.fullFeatPublications, 0) === 352, 'bookOrder (14 books) publications do not sum to 352; 352 + 3 Official Web = 355');
check(byBook['Saga Edition Core Rulebook'] === 64, 'Core Rulebook publications != 64');
check(byBook['Rebellion Era Campaign Guide'] === 60, 'Rebellion Era publications != 60');
check(byBook['Galaxy at War'] === 42, 'Galaxy at War publications != 42');
check(auth.separateOfficialWebSources.fullFeatPublications === 3, 'Official Web publications != 3');
check(auth.officialWebSources.feats.length === 3, 'embedded Official Web feats != 3');
check(order.reduce((a, o) => a + o.fullFeatPublications, 0) + auth.separateOfficialWebSources.fullFeatPublications === 355, 'book publications + Official Web != 355');

// ---- Embedded records ----
// KNOWN GAP (retained, not repaired): the supplied authority embeds no per-feat records for Unknown Regions (21 declared).
const KNOWN_ABSENT_BOOKS = { 'Unknown Regions': 21 };
const entries = [];
for (const [book, v] of Object.entries(auth.books)) {
  check(v.feats.length === v.fullFeatPublications, `${book}: embedded ${v.feats.length} != declared ${v.fullFeatPublications}`);
  check(v.fullFeatPublications === byBook[book], `${book}: books.${book} count differs from bookOrder`);
  for (const f of v.feats) entries.push({ book, f });
}
for (const f of auth.officialWebSources.feats) entries.push({ book: 'Official Web', f });
for (const [book, n] of Object.entries(KNOWN_ABSENT_BOOKS)) {
  check(!(book in auth.books) && byBook[book] === n, `known gap changed: ${book} embedded-or-declared state differs (expected absent from books, declared ${n})`);
}
const absentTotal = Object.values(KNOWN_ABSENT_BOOKS).reduce((a, b) => a + b, 0);
check(entries.length === 355 - absentTotal, `embedded publication entries ${entries.length} != ${355 - absentTotal}`);
const isReprint = (f) => /^FULL_REPRINT/.test(f.identityRole);
const primaries = entries.filter(e => !isReprint(e.f));
check(entries.length - primaries.length === 2, 'embedded full-reprint entries != 2');
check(primaries.length === 353 - absentTotal, `embedded primary identities ${primaries.length} != ${353 - absentTotal}`);

// ---- Cross-check against Phase 1A (merged identity authority) ----
check(p1a.status === 'PHASE_1A_CANONICAL_IDENTITY_MANIFEST_CERTIFIED' && p1a.records.length === 353, 'Phase 1A manifest not certified / != 353 records');
const byId = new Map(p1a.records.map(r => [r.canonicalId, r]));
for (const { book, f } of primaries) {
  if (!f.canonicalId) continue;
  const r = byId.get(f.canonicalId);
  if (!r) { check(false, `${book}: ${f.name} canonicalId ${f.canonicalId} not in Phase 1A manifest`); continue; }
  check(norm(r.displayName) === norm(f.name), `${book}: ${f.name} ${f.canonicalId} resolves to ${r.displayName} in Phase 1A`);
}
const embeddedIds = new Set(primaries.map(e => e.f.canonicalId).filter(Boolean));
const unknownRegions1A = p1a.records.filter(r => r.primaryPublication.sourcebook === 'Unknown Regions');
check(unknownRegions1A.length === 21, `Phase 1A Unknown Regions identities ${unknownRegions1A.length} != 21`);
check(unknownRegions1A.every(r => !embeddedIds.has(r.canonicalId)), 'Unknown Regions Phase 1A IDs unexpectedly embedded');
const names = new Set([...primaries.map(e => norm(e.f.name)), ...unknownRegions1A.map(r => r.normalizedName)]);
check(names.size === 352, `unique normalized names ${names.size} != 352`);
check(primaries.length + unknownRegions1A.length === 353, 'primary identities + Unknown Regions != 353');
const dupNames = [...primaries.map(e => norm(e.f.name)), ...unknownRegions1A.map(r => r.normalizedName)].filter((n, i, a) => a.indexOf(n) !== i);
check(dupNames.length === 1 && dupNames[0] === 'staggering-attack', `duplicate normalized names are ${JSON.stringify(dupNames)}`);

// ---- Represented / missing ----
const missingEntries = primaries.filter(e => /^MISSING_CANONICAL_REPO_RECORD/.test(e.f.content?.status || ''));
const missingKeys = missingEntries.map(e => `${e.book}|${e.f.name}`).sort();
check(JSON.stringify(missingKeys) === JSON.stringify(['Scum and Villainy|Staggering Attack', 'The Force Unleashed Campaign Guide|Recall']), `missing canonical entries: ${JSON.stringify(missingKeys)}`);
const recall = primaries.find(e => e.book === 'The Force Unleashed Campaign Guide' && e.f.name === 'Recall');
const scumSA = primaries.find(e => e.book === 'Scum and Villainy' && e.f.name === 'Staggering Attack');
check(recall && (recall.f.canonicalId === null || recall.f.canonicalId === 'c352f81dde5c9dff'), 'Recall canonicalId in authority is neither null nor c352f81dde5c9dff');
check(byId.get('c352f81dde5c9dff')?.identityKey === 'feat::the-force-unleashed-campaign-guide::p35::recall', 'Phase 1A Recall c352f81dde5c9dff missing/mismatched');
check(scumSA?.f.canonicalId === 'c9c4130a55761330', 'Scum Staggering Attack authority ID != c9c4130a55761330');
check(byId.get('c9c4130a55761330')?.identityKey === 'feat::scum-and-villainy::p24::staggering-attack', 'Phase 1A Scum Staggering Attack c9c4130a55761330 missing/mismatched');
check(p1a.records.filter(r => r.repoMapping.status === 'MISSING_REPO_RECORD').map(r => r.canonicalId).sort().join() === 'c352f81dde5c9dff,c9c4130a55761330', 'Phase 1A missing IDs differ');
check(p1a.records.filter(r => r.repoMapping.status === 'EXISTING_CANONICAL_RECORD').length === 351, 'Phase 1A represented != 351');

// ---- Reprints ----
const tech = entries.filter(e => e.f.name === 'Tech Specialist');
const techPrimary = tech.find(e => !isReprint(e.f));
const techReprint = tech.find(e => isReprint(e.f));
check(tech.length === 2 && techPrimary && techReprint, 'Tech Specialist must have one primary and one reprint entry');
check(techPrimary?.book === 'Official Web' && techPrimary.f.canonicalPublication.page === 3 && /Web Enhancement 1/.test(techPrimary.f.canonicalPublication.source), 'Tech Specialist primary is not Web Enhancement 1 p.3');
check(techReprint?.book === 'Starships of the Galaxy' && techReprint.f.reprints?.[0]?.page === 21 && techReprint.f.canonicalPublication.page === 3, 'Tech Specialist reprint is not Starships p.21 of Web Enhancement p.3');
check(techPrimary?.f.canonicalId === techReprint?.f.canonicalId && techPrimary?.f.canonicalId === '42e2404790756700', 'Tech Specialist identity IDs differ');
const ech = entries.filter(e => e.f.name === 'Echani Training');
const echPrimary = ech.find(e => !isReprint(e.f));
const echReprint = ech.find(e => isReprint(e.f));
check(ech.length === 2 && echPrimary && echReprint, 'Echani Training must have one primary and one reprint entry');
check(echPrimary?.book === 'Knights of the Old Republic Campaign Guide' && echPrimary.f.canonicalPublication.page === 33, 'Echani Training primary is not KOTOR p.33');
check(echReprint?.book === 'Galaxy at War' && echReprint.f.bookPublication?.page === 26 && echReprint.f.provenance?.reprint?.page === 26 && echReprint.f.canonicalPublication.page === 33 && /Knights of the Old Republic/.test(echReprint.f.canonicalPublication.source), 'Echani Training reprint is not Galaxy at War p.26 of KOTOR p.33');
check(echPrimary?.f.canonicalId === echReprint?.f.canonicalId && echPrimary?.f.canonicalId === 'f362e5a4ad0a98bd', 'Echani Training identity IDs differ');

// ---- Weapon Proficiency / derivatives ----
const DERIVATIVE_IDS = p0.phase0.subphases['0-QA'].repoOutsideCanonicalCorpus.filter(r => r.classification === 'IMPLEMENTATION_DERIVATIVE_NOT_CANONICAL_IDENTITY').map(r => r.id);
check(DERIVATIVE_IDS.length === 6, `Phase 0 implementation derivative IDs ${DERIVATIVE_IDS.length} != 6`);
const wp = primaries.filter(e => e.f.name === 'Weapon Proficiency');
check(wp.length === 1 && wp[0].f.canonicalId === 'ecc2471ac96ec2d4' && wp[0].book === 'Saga Edition Core Rulebook', 'Weapon Proficiency is not exactly one Core canonical identity ecc2471ac96ec2d4');
check(p1a.records.filter(r => r.displayName === 'Weapon Proficiency').length === 1, 'Phase 1A has != 1 Weapon Proficiency identity');
check(DERIVATIVE_IDS.every(id => !embeddedIds.has(id) && !byId.has(id)), 'a Weapon Proficiency derivative ID is counted as a canonical identity');
check(c.implementationDerivatives === 6 && p0.phase0.subphases['0-QA'].acceptanceGates.implementationDerivativeRecords === 6, 'implementation derivative count != 6');

// ---- Same-name / cross-domain ----
const gawSA = primaries.find(e => e.book === 'Galaxy at War' && e.f.name === 'Staggering Attack');
check(gawSA && gawSA.f.canonicalId === '192923f60db38831' && scumSA && gawSA.f.canonicalId !== scumSA.f.canonicalId, 'Scum and Galaxy at War Staggering Attack are not distinct identities');
check(auth.books['Scum and Villainy'].sameNameIdentityCollision?.type === 'DISTINCT_FEAT_IDENTITIES', 'Scum sameNameIdentityCollision type != DISTINCT_FEAT_IDENTITIES');
check(!auth.books['Rebellion Era Campaign Guide'].feats.some(f => norm(f.name) === 'recall'), 'a Recall feat appears under Rebellion Era (talent collapsed into feat)');
check(/Rebellion Era talent/.test(recall?.f.automation?.observation || '') && /name-only domain guards are invalid/.test(recall?.f.automation?.observation || ''), 'Recall entry no longer records the separate Rebellion Era talent / name-only guard finding');
check(p1a.records.find(r => r.canonicalId === 'c352f81dde5c9dff')?.crossDomainCollision?.classification === 'SAME_NAME_DIFFERENT_DOMAIN', 'Phase 1A Recall cross-domain collision missing');

// ---- Known authority corrections ----
const tfu = auth.books['The Force Unleashed Campaign Guide'].feats;
const nl = tfu.find(f => f.name === 'Natural Leader');
check(tfu.length === 21 && nl && nl.canonicalPublication.page === 34, 'TFU must have 21 feats with Natural Leader p.34');
check(p0.phase0.subphases['0E'].canonicalFeatRecords.length === 21, 'Phase 0 0E TFU != 21 (frozen audit contradicts correction)');

// ---- Clone Wars page map: Phase 0 / Phase 1A were corrected to the authority pages (provenance closeout) ----
const cw = auth.books['Clone Wars Campaign Guide'].feats;
const cwMismatch = cw.filter(f => byId.get(f.canonicalId).primaryPublication.page !== f.canonicalPublication.page);
check(cw.length === 21 && cwMismatch.length === 0, `Clone Wars page-map discrepancies ${cwMismatch.length} != 0 (corrected in provenance closeout)`);
const otherMismatch = primaries.filter(e => e.book !== 'Clone Wars Campaign Guide' && e.f.canonicalId && e.book !== 'Official Web')
  .filter(e => byId.get(e.f.canonicalId).primaryPublication.page !== e.f.canonicalPublication.page);
check(otherMismatch.length === 0, `unexpected page discrepancies outside Clone Wars: ${otherMismatch.map(e => e.f.name).join(', ')}`);

if (failures.length) {
  console.error(`FEAT CONTENT AUTHORITY VERIFICATION FAILED (${failures.length}):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('FEAT CONTENT AUTHORITY OK');
console.log(`  publications 355 | identities 353 | unique normalized names 352 | full reprints 2`);
console.log(`  represented 351 | missing 2 (Recall c352f81dde5c9dff, Scum Staggering Attack c9c4130a55761330)`);
console.log(`  Core 64 | Rebellion Era 60 | Galaxy at War 42 | Official Web 3`);
console.log(`  embedded publication records ${entries.length} of 355; Unknown Regions (21) per-feat records absent from supplied authority (retained known gap, cross-checked via Phase 1A)`);
console.log(`  Clone Wars page map: Phase 0/1A match the authority (0 discrepancies)`);
