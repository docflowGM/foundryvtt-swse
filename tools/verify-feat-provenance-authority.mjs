#!/usr/bin/env node
// Deterministic validator for the certified feat PROVENANCE authority.
// Audit-only and read-only: cross-checks the provenance authority against the content authority,
// Phase 0 census, Phase 1A identity manifest, and Phase 1B reconciliation. Exits nonzero on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };
const norm = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[‘’]/g, "'").replace(/'/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '-');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const prov = readJson('data/audits/feat-provenance-canonical-authority.json');
const content = readJson('data/audits/feat-content-canonical-authority.json');
const p0 = readJson('data/audits/feat-phase-0-canonical-census.json');
const p1a = readJson('data/audits/feat-phase-1a-canonical-identity-manifest.json');
const p1b = readJson('data/audits/feat-phase-1b-repository-reconciliation.json');

// ---- Closeout declarations ----
const c = prov.provenancePhaseCloseout;
const want = {
  fullFeatPublicationsCertified: 355, canonicalFeatIdentitiesCertified: 353, uniqueNormalizedDisplayNames: 352, confirmedFullReprints: 2,
  repoCanonicalIdentitiesRepresented: 351, repoCanonicalIdentitiesMissing: 2, booksCertified: 14, bookPublicationClaimsCertified: 352, officialWebPublicationClaimsCertified: 3
};
check(c.status === 'COMPLETE', `provenancePhaseCloseout.status ${c.status}`);
for (const [k, v] of Object.entries(want)) check(c[k] === v, `provenancePhaseCloseout.${k} expected ${v}, got ${c[k]}`);
check(c.officialWebSourcePassCertified === true, 'official web pass not certified');
check(c.productionMutationAuthorized === false, 'productionMutationAuthorized must be false');
check(c.nextPhase === 'TAGS', `nextPhase ${c.nextPhase} != TAGS`);
check(c.requiredBackPropagation.length === 4, `requiredBackPropagation ${c.requiredBackPropagation.length} != 4`);
check(prov.contentPhaseCloseout.productionMutationAuthorized === false, 'contentPhaseCloseout.productionMutationAuthorized must be false');
const pp = prov.provenancePhaseProgress;
check(pp.status === 'COMPLETE' && pp.booksCertified === 14 && pp.publicationClaimsCertified === 355 && pp.canonicalIdentitiesCertified === 353 && pp.fullReprintRelationsCertified === 2 && pp.nextPhase === 'TAGS', 'provenancePhaseProgress mismatch');

// ---- Embedded records ----
const entries = [];
for (const [book, v] of Object.entries(prov.books)) {
  check(v.feats.length === v.fullFeatPublications, `${book}: embedded ${v.feats.length} != declared ${v.fullFeatPublications}`);
  check(v.provenanceCertification?.status === 'CERTIFIED', `${book}: provenanceCertification not CERTIFIED`);
  for (const f of v.feats) entries.push({ book, f });
}
check(Object.keys(prov.books).length === 14, `books object has ${Object.keys(prov.books).length} books != 14`);
const webFeats = prov.officialWebSources.feats;
check(webFeats.length === 3 && prov.officialWebProvenanceCertification.publicationClaimsCertified === 3, 'official web != 3');
for (const f of webFeats) entries.push({ book: 'Official Web', f });
const isReprint = (f) => /^FULL_REPRINT/.test(f.identityRole);
const primaries = entries.filter(e => !isReprint(e.f));
check(entries.length === 355, `publication records ${entries.length} != 355`);
check(primaries.length === 353, `canonical identity records ${primaries.length} != 353`);
check(entries.length - primaries.length === 2, 'full reprint records != 2');
const names = primaries.map(e => norm(e.f.name));
check(new Set(names).size === 352, `unique normalized names ${new Set(names).size} != 352`);
const dups = names.filter((n, i) => names.indexOf(n) !== i);
check(dups.length === 1 && dups[0] === 'staggering-attack', `duplicate normalized names ${JSON.stringify(dups)}`);

// ---- Per-source counts ----
const cnt = (b) => prov.books[b].fullFeatPublications;
check(cnt('Saga Edition Core Rulebook') === 64 && prov.books['Saga Edition Core Rulebook'].newCanonicalIdentities === 64, 'Core canonical identities != 64');
check(cnt('Rebellion Era Campaign Guide') === 60 && prov.books['Rebellion Era Campaign Guide'].newCanonicalIdentities === 60, 'Rebellion Era canonical identities != 60');
check(cnt('Galaxy at War') === 42 && prov.books['Galaxy at War'].newCanonicalIdentities === 41 && prov.books['Galaxy at War'].fullReprints === 1, 'Galaxy at War 42 publications / 41 new identities / 1 reprint mismatch');
check(cnt('The Force Unleashed Campaign Guide') === 21 && primaries.filter(e => e.book === 'The Force Unleashed Campaign Guide').length === 21, 'TFU canonical identities != 21');
check(cnt('Unknown Regions') === 21 && prov.books['Unknown Regions'].feats.length === 21, 'Unknown Regions != 21');
check(primaries.filter(e => e.book === 'Official Web').length === 3, 'official web identities != 3');
check(primaries.filter(e => e.book === 'Saga Edition Core Rulebook').length === 64, 'Core embedded identities != 64');
check(primaries.filter(e => e.book === 'Rebellion Era Campaign Guide').length === 60, 'Rebellion Era embedded identities != 60');
check(entries.filter(e => e.book === 'Galaxy at War').length === 42, 'Galaxy at War embedded publications != 42');
const nl = prov.books['The Force Unleashed Campaign Guide'].feats.find(f => f.name === 'Natural Leader');
check(nl && nl.canonicalPublication.page === 34, 'Natural Leader is not TFU p.34');

// ---- Missing / represented ----
const byId = new Map(p1a.records.map(r => [r.canonicalId, r]));
const missing = c.missingCanonicalRepoIdentities.map(m => `${m.name}|${m.canonicalId}`).sort();
check(eq(missing, ['Recall|c352f81dde5c9dff', 'Staggering Attack|c9c4130a55761330']), `missing identities ${JSON.stringify(missing)}`);
check(c.missingCanonicalRepoIdentities.find(m => m.name === 'Recall')?.primary?.page === 35 && /Force Unleashed/.test(c.missingCanonicalRepoIdentities.find(m => m.name === 'Recall').primary.source), 'Recall missing record is not TFU p.35');
check(c.missingCanonicalRepoIdentities.find(m => m.name === 'Staggering Attack')?.primary?.page === 24 && /Scum and Villainy/.test(c.missingCanonicalRepoIdentities.find(m => m.name === 'Staggering Attack').primary.source), 'Staggering Attack missing record is not Scum p.24');
const recall = primaries.find(e => e.book === 'The Force Unleashed Campaign Guide' && e.f.name === 'Recall');
const scumSA = primaries.find(e => e.book === 'Scum and Villainy' && e.f.name === 'Staggering Attack');
const gawSA = primaries.find(e => e.book === 'Galaxy at War' && e.f.name === 'Staggering Attack');
check(recall && (recall.f.canonicalId === null || recall.f.canonicalId === 'c352f81dde5c9dff'), 'Recall feat record ID is neither null nor c352f81dde5c9dff');
check(scumSA?.f.canonicalId === 'c9c4130a55761330' && gawSA?.f.canonicalId === '192923f60db38831', 'Staggering Attack identities do not both exist with the certified IDs');
check(p1a.records.filter(r => r.repoMapping.status === 'MISSING_REPO_RECORD').map(r => r.canonicalId).sort().join() === 'c352f81dde5c9dff,c9c4130a55761330', 'Phase 1A missing IDs differ');
check(p1a.records.filter(r => r.repoMapping.status === 'EXISTING_CANONICAL_RECORD').length === 351, 'Phase 1A represented != 351');

// ---- Reprints (exact set and relations) ----
const rep = prov.provenanceCertifiedReprints;
check(eq(rep.map(r => r.name).sort(), ['Echani Training', 'Tech Specialist']), `certified reprints ${JSON.stringify(rep.map(r => r.name))}`);
const tech = rep.find(r => r.name === 'Tech Specialist');
check(tech?.canonicalId === '42e2404790756700' && /Web Enhancement 1/.test(tech.primary.source) && tech.primary.page === 3 && tech.reprint.source === 'Starships of the Galaxy' && tech.reprint.page === 21 && tech.relation === 'FULL_REPRINT', 'Tech Specialist reprint certification mismatch');
const ech = rep.find(r => r.name === 'Echani Training');
check(ech?.canonicalId === 'f362e5a4ad0a98bd' && /Knights of the Old Republic/.test(ech.primary.source) && ech.primary.page === 33 && ech.reprint.source === 'Galaxy at War' && ech.reprint.page === 26 && ech.relation === 'FULL_REPRINT_WITH_ADDITIONAL_SPECIAL_CLAUSE', 'Echani Training reprint certification mismatch');
const techP = primaries.find(e => e.f.name === 'Tech Specialist');
check(techP?.book === 'Official Web' && techP.f.canonicalPublication.page === 3 && techP.f.canonicalPublication.locator === 'page 3 of 7' && techP.f.canonicalPublication.publicationDate === '2007-06-21', 'Tech Specialist primary is not Web Enhancement p.3 (page 3 of 7, 2007-06-21)');
check(entries.filter(e => e.f.name === 'Tech Specialist').length === 2 && entries.some(e => e.book === 'Starships of the Galaxy' && e.f.name === 'Tech Specialist' && isReprint(e.f) && e.f.reprints?.[0]?.page === 21), 'Tech Specialist Starships p.21 is not recorded as the reprint');
const echP = primaries.find(e => e.f.name === 'Echani Training');
check(echP?.book === 'Knights of the Old Republic Campaign Guide' && echP.f.canonicalPublication.page === 33, 'Echani Training primary is not KOTOR p.33');
check(entries.some(e => e.book === 'Galaxy at War' && e.f.name === 'Echani Training' && isReprint(e.f) && e.f.provenance?.reprint?.page === 26), 'Echani Training Galaxy at War p.26 is not recorded as reprint/extension');
check(entries.filter(e => e.f.name === 'Echani Training' && !isReprint(e.f)).length === 1, 'Echani Training has more than one primary identity');
// Official web rulings.
const web = Object.fromEntries(prov.officialWebProvenanceCertification.rulings.map(r => [r.name, r]));
check(web['Dreadful Countenance']?.canonicalId === '2e5ada2de01fff4d' && web['Dreadful Countenance'].ruleStatus === 'OFFICIAL_WEB_ARTICLE' && web['Dreadful Countenance'].primary.locator === 'web article; archived rendering page 4 of 4' && web['Dreadful Countenance'].primary.page === null, 'Dreadful Countenance web provenance mismatch');
check(web['Rapid Assault']?.canonicalId === '4be60753991eec43' && web['Rapid Assault'].ruleStatus === 'OFFICIAL_OPTIONAL_RULE' && web['Rapid Assault'].primary.locator === 'E2' && web['Rapid Assault'].primary.source === 'Saga Edition FAQ - Official Optional Rules' && web['Rapid Assault'].primary.page === null && /Original forum post/.test(web['Rapid Assault'].caveat || ''), 'Rapid Assault web provenance mismatch');
check(web['Tech Specialist']?.primary?.page === 3 && web['Tech Specialist'].ruleStatus === 'OFFICIAL', 'Tech Specialist web provenance mismatch');

// ---- Collision guards ----
check(!prov.books['Rebellion Era Campaign Guide'].feats.some(f => norm(f.name) === 'recall'), 'Recall feat collapsed into Rebellion Era (talent) records');
check(recall?.f.provenance?.collisionGuard?.classification === 'SAME_NAME_DIFFERENT_DOMAIN' && recall.f.provenance.collisionGuard.otherDomain === 'talent' && /Rebellion Era/.test(recall.f.provenance.collisionGuard.otherDomainReference), 'Recall collisionGuard missing/incorrect');
const auto = primaries.find(e => e.book === 'Legacy Era Campaign Guide' && e.f.name === 'Autofire Assault');
check(auto?.f.canonicalId === 'c973e43c85382068' && auto.f.canonicalPublication.page === 34, 'Autofire Assault feat is not Legacy Era p.34 c973e43c85382068');
check(auto?.f.provenance?.collisionGuard?.classification === 'SAME_NAME_DIFFERENT_DOMAIN' && auto.f.provenance.collisionGuard.otherDomain === 'talent' && /Galaxy at War p\.22/.test(auto.f.provenance.collisionGuard.otherDomainReference), 'Autofire Assault collisionGuard missing/incorrect');
check(scumSA?.f.provenance?.collisionGuard?.classification === 'SAME_NAME_DISTINCT_FEAT_IDENTITIES' && scumSA.f.provenance.collisionGuard.otherCanonicalId === '192923f60db38831', 'Scum Staggering Attack collisionGuard missing/incorrect');
check(gawSA?.f.canonicalPublication.page === 26 && scumSA?.f.canonicalPublication.page === 24, 'Staggering Attack pages differ from Scum p.24 / Galaxy at War p.26');
for (const cc of p1a.certifiedCrossDomainNameCollisions) check(cc.classification === 'SAME_NAME_DIFFERENT_DOMAIN', 'Phase 1A cross-domain collision classification changed');
check(eq(p1a.certifiedCrossDomainNameCollisions.map(x => x.displayName).sort(), ['Autofire Assault', 'Recall']), 'Phase 1A cross-domain collision set differs');

// ---- Weapon Proficiency architecture (derivative IDs come from Phase 0; none are hard-coded here) ----
const derivativeIds = p0.phase0.subphases['0-QA'].repoOutsideCanonicalCorpus.filter(r => r.classification === 'IMPLEMENTATION_DERIVATIVE_NOT_CANONICAL_IDENTITY').map(r => r.id);
check(derivativeIds.length === 6, `Phase 0 implementation derivatives ${derivativeIds.length} != 6`);
const wp = primaries.filter(e => e.f.name === 'Weapon Proficiency');
check(wp.length === 1 && wp[0].f.canonicalId === 'ecc2471ac96ec2d4' && wp[0].book === 'Saga Edition Core Rulebook', 'Weapon Proficiency is not exactly one canonical identity ecc2471ac96ec2d4');
const authIds = new Set(entries.map(e => e.f.canonicalId).filter(Boolean));
check(derivativeIds.every(id => !authIds.has(id) && !byId.has(id)), 'an implementation derivative is counted as a canonical identity');
check(c.implementationDerivatives === undefined || c.implementationDerivatives === 6, 'closeout implementationDerivatives != 6');
check(prov.contentPhaseCloseout.implementationDerivatives === 6 && prov.contentPhaseCloseout.noncanonicalWrongDomainLegacy === 33 && prov.contentPhaseCloseout.repoBaselineRecords === 390, 'baseline/derivative/noncanonical counts changed');

// ---- Clone Wars page authority ----
const cw = prov.books['Clone Wars Campaign Guide'].feats;
const cwPages = [...new Set(cw.map(f => f.canonicalPublication.page))].sort((a, b) => a - b);
check(cw.length === 21 && eq(cwPages, [28, 29, 31, 32]), `Clone Wars definition pages ${JSON.stringify(cwPages)} != [28,29,31,32]`);
const sup = prov.books['Clone Wars Campaign Guide'].provenanceCertification.authoritySupersession;
check(sup.summaryTablePage === 30 && eq(sup.certifiedPrintedFeatDefinitionPages, [28, 29, 31, 32]), 'Clone Wars p.30 is not recorded as the summary table / pages differ');
check(!entries.some(e => e.f.canonicalPublication?.page === 30 && /Clone Wars/.test(e.f.canonicalPublication.source)), 'a Clone Wars feat is recorded on summary-table page 30');
const CW_EXPECT = { 28: ['Anointed Hunter', 'Artillery Shot', 'Coordinated Barrage', 'Droidcraft'], 29: ['Droid Hunter', 'Experienced Medic', 'Expert Droid Repair', 'Flash and Clear', 'Flood of Fire'],
  31: ['Grand Army of the Republic Training', 'Gunnery Specialist', 'Jedi Familiarity', 'Leader of Droids', 'Overwhelming Attack', 'Pall of the Dark Side', 'Separatist Military Training', 'Spray Shot', 'Trench Warrior', 'Unstoppable Force'], 32: ['Unwavering Resolve', 'Wary Defender'] };
for (const [pg, list] of Object.entries(CW_EXPECT)) check(eq(cw.filter(f => f.canonicalPublication.page === Number(pg)).map(f => f.name).sort(), [...list].sort()), `Clone Wars p.${pg} feat list differs`);
// Corrected audits must match.
const p0cw = p0.phase0.subphases['0G'].canonicalFeatRecords;
check(eq(p0.phase0.subphases['0G'].pageDistribution, { 28: 4, 29: 5, 31: 10, 32: 2 }), 'Phase 0 0G pageDistribution not corrected');
for (const f of cw) {
  check(p0cw.find(r => r.name === f.name)?.canonicalPage === f.canonicalPublication.page, `Phase 0 0G page for ${f.name} differs from authority`);
  const r = byId.get(f.canonicalId);
  check(r?.primaryPublication.page === f.canonicalPublication.page && r.identityKey === `feat::clone-wars-campaign-guide::p${f.canonicalPublication.page}::${norm(f.name)}`, `Phase 1A Clone Wars record for ${f.name} not corrected`);
}

// ---- Overlap with the content authority (must not diverge) ----
for (const [book, v] of Object.entries(content.books)) {
  for (const f of v.feats) {
    const g = prov.books[book].feats.find(x => x.name === f.name && x.identityRole === f.identityRole);
    check(g, `${book}: ${f.name} missing from provenance authority`);
    if (!g) continue;
    check(eq(g.canonicalPublication, f.canonicalPublication) && eq(g.content, f.content) && g.publicationCategory === f.publicationCategory && (f.canonicalId === g.canonicalId || f.canonicalId === null), `${book}: ${f.name} content/identity fields diverge from the content authority`);
  }
}
check(eq(prov.contentPhaseCloseout, content.contentPhaseCloseout), 'contentPhaseCloseout diverges from the content authority');

// ---- Cross-check with Phase 1A (all 353) ----
check(p1a.status === 'PHASE_1A_CANONICAL_IDENTITY_MANIFEST_CERTIFIED' && p1a.records.length === 353, 'Phase 1A not certified / != 353');
const seen = new Set();
for (const { book, f } of primaries) {
  if (!f.canonicalId) continue;
  const r = byId.get(f.canonicalId);
  if (!r) { check(false, `${book}: ${f.name} ${f.canonicalId} not in Phase 1A`); continue; }
  seen.add(f.canonicalId);
  check(norm(r.displayName) === norm(f.name), `${book}: ${f.name} resolves to ${r.displayName} in Phase 1A`);
  if (book !== 'Official Web') check(r.primaryPublication.page === f.canonicalPublication.page, `${book}: ${f.name} page ${f.canonicalPublication.page} != Phase 1A ${r.primaryPublication.page}`);
}
check(eq([...p1a.records.map(r => r.canonicalId).filter(id => !seen.has(id))].sort(), ['c352f81dde5c9dff']), 'Phase 1A IDs not embedded in the provenance authority differ from [Recall]');
const k = (n) => p1a.records.find(r => r.displayName === n);
check(k('Tech Specialist').identityKey === 'feat::saga-edition-web-enhancement-1-the-tech-specialist::p3::tech-specialist', 'Phase 1A Tech Specialist key');
check(k('Dreadful Countenance').identityKey === 'feat::behind-the-threat-the-sith-part-2-the-becoming::web-article-archived-rendering-page-4-of-4::dreadful-countenance', 'Phase 1A Dreadful Countenance key');
check(k('Rapid Assault').identityKey === 'feat::saga-edition-faq-official-optional-rules::e2::rapid-assault', 'Phase 1A Rapid Assault key');
check(k('Echani Training').identityKey === 'feat::knights-of-the-old-republic-campaign-guide::p33::echani-training' && k('Echani Training').reprints.length === 1 && k('Echani Training').reprints[0].sourceKey === 'galaxy-at-war' && k('Echani Training').reprints[0].page === 26, 'Phase 1A Echani Training identity/reprint');
check(p1a.records.filter(r => r.displayName === 'Echani Training').length === 1, 'Phase 1A has more than one Echani Training identity');
check(p1a.records.filter(r => r.displayName === 'Weapon Proficiency').length === 1, 'Phase 1A Weapon Proficiency != 1');
check(p1a.authorityCorrections?.[0]?.type === 'CLONE_WARS_PAGE_MAP_CORRECTION' && p1a.authorityCorrections[0].canonicalIdsChanged === 0, 'Phase 1A Clone Wars correction ledger missing');

// ---- Cross-check with Phase 1B ----
check(p1b.status === 'PHASE_1B_REPOSITORY_RECONCILIATION_CERTIFIED', 'Phase 1B not certified');
const a1b = p1b.acceptance;
check(a1b.currentRecords === 390 && a1b.preserveCanonical === 351 && a1b.preserveDerivativesPending1C === 6 && a1b.removeNoncanonical === 33 && a1b.requiredCanonicalAdditions === 2, 'Phase 1B reconciliation totals changed');
const preserved = p1b.currentRecordDispositions.filter(r => r.reconciliationDisposition === 'PRESERVE_CANONICAL_RECORD');
check(preserved.every(r => byId.get(r.canonicalId)?.identityKey === r.identityKey), 'Phase 1B identityKeys differ from Phase 1A');
check(eq(derivativeIds.slice().sort(), p1b.implementationDerivatives.map(d => d.repoId).sort()), 'Phase 1B derivatives differ from Phase 0');

if (failures.length) {
  console.error(`FEAT PROVENANCE AUTHORITY VERIFICATION FAILED (${failures.length}):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('FEAT PROVENANCE AUTHORITY OK');
console.log('  publications 355 | identities 353 | unique normalized names 352 | full reprints 2 | represented 351 | missing 2');
console.log('  Core 64 | Rebellion Era 60 | Galaxy at War 42 (41 new) | TFU 21 | Unknown Regions 21 | Official Web 3');
console.log('  Clone Wars definition pages 28, 29, 31, 32 (summary table p.30); Phase 0 / 1A / 1B aligned');
