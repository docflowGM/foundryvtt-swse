#!/usr/bin/env node
// Phase 5C-0: pre-cutover census. Records hashes and counts of every feat/weapon authority and production file BEFORE any
// production mutation, re-derives the historical counts against the live repository and FAILS if the repository has drifted
// from the certified expectation. The output is a frozen historical snapshot (not re-checkable against later state);
// `--verify-frozen` only checks the committed artifact's integrity and expected values.
// Usage: node tools/census-phase-5c-precutover.mjs [--verify-frozen]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/phase-5c-precutover-census.json';
export const OUT_MD = 'docs/audits/phase-5c-precutover-census.md';
const text = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const json = (f) => JSON.parse(text(f));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const fileSha = (f) => (fs.existsSync(path.join(ROOT, f)) ? sha(text(f)) : null);
const lines = (f) => text(f).split('\n').filter((l) => l.trim());
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const FEAT_AUTH = [
  'data/audits/feat-phase-0-canonical-census.json', 'data/audits/feat-phase-1a-canonical-identity-manifest.json', 'data/audits/feat-phase-1b-repository-reconciliation.json',
  'data/audits/feat-content-canonical-authority.json', 'data/audits/feat-provenance-canonical-authority.json', 'data/audits/talent-feat-phase3-final-semantic-authority.json',
  'data/audits/feat-tags-pass2-semantic-authority.json', 'data/audits/feat-tags-production-reconciliation.json',
];
const FEAT_PROD = ['data/feat-catalog.json', 'packs/feats.db', 'packs/feats.db.sha256', 'packs/feat-catalog.db', 'data/feat-effects.json', 'data/feat-choice-options.json', 'data/feat-metadata.json', 'data/feat-validity-registry.json', 'data/generated/feat-view-model.json', 'data/fixes/feat-view-model.json', 'data/generated/class-feat-list-bindings.json', 'data/feat_buckets_and_subbuckets.json', 'data/feat-buckets-and-subbuckets.json'];
const WEAPON_AUTH = [
  'data/audits/item-weapons-phase-3b-canonical-authority.json', 'data/audits/item-weapons-phase-3c-production-disposition-ledger.json', 'data/audits/item-weapons-phase-3d-global-freeze.json',
  'data/audits/item-weapons-phase-4h-global-semantic-authority.json', 'data/audits/item-weapons-phase-4h-d-phase-4-certification.json', 'data/weapons/canonical-weapon-registry.json',
  'data/audits/weapon-phase-5b-consumption-map.json', 'data/audits/weapon-phase-5b-r-mode-reconciliation.json',
];
const WEAPON_PROD = ['packs/weapons.db', 'packs/weapons-exotic.db', 'packs/weapons-grenades.db', 'packs/weapons-heavy.db', 'packs/weapons-lightsabers.db', 'packs/weapons-pistols.db', 'packs/weapons-rifles.db', 'packs/weapons-simple.db', 'data/store/weapon-store-descriptions.json', 'data/lightsaber-components.json'];
const REFERENCE_BEARING = ['packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/classes.db', 'data/class-archetypes.json', 'data/nonheroic.json', 'data/heroic.json', 'data/generated/class-feat-list-bindings.json'];

export function buildCensus() {
  const head = fs.existsSync(path.join(ROOT, '.git')) ? fs.readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').trim() : null;
  const hashes = (list) => Object.fromEntries(list.filter((f) => fs.existsSync(path.join(ROOT, f))).sort(cmp).map((f) => [f, { sha256: fileSha(f), bytes: fs.statSync(path.join(ROOT, f)).size }]));
  const fail = [];
  const check = (cond, msg) => { if (!cond) fail.push(msg); };

  // ---- feats ---------------------------------------------------------------------------------------------------------------------
  const catalog = json('data/feat-catalog.json');
  const pack = lines('packs/feats.db').map((l) => JSON.parse(l));
  const m1a = json('data/audits/feat-phase-1a-canonical-identity-manifest.json'), r1b = json('data/audits/feat-phase-1b-repository-reconciliation.json');
  const canon = new Set(m1a.records.map((r) => r.canonicalId));
  const byDisp = {};
  for (const r of r1b.currentRecordDispositions) (byDisp[r.reconciliationDisposition] ??= []).push(r.repoId);
  const catIds = new Set(catalog.map((d) => d._id)), packIds = new Set(pack.map((d) => d._id));
  const present = [...canon].filter((id) => catIds.has(id)), missing = [...canon].filter((id) => !catIds.has(id)).sort(cmp);
  const packEqCatalog = catalog.length === pack.length && catalog.every((d, i) => d._id === pack[i]._id && JSON.stringify(d) === JSON.stringify(pack[i]));
  const sem = json('data/audits/talent-feat-phase3-final-semantic-authority.json').records.filter((r) => r.domain === 'FEAT');
  const feats = {
    canonicalIdentities: canon.size, productionCatalogRecords: catalog.length, productionPackRecords: pack.length, catalogEqualsPack: packEqCatalog,
    canonicalPresentInProduction: present.length, canonicalMissingFromProduction: missing.length, missingCanonicalIds: missing,
    implementationDerivatives: (byDisp.PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C ?? []).length, noncanonicalRemovals: (byDisp.REMOVE_NONCANONICAL_FEAT_RECORD ?? []).length,
    preservedCanonical: (byDisp.PRESERVE_CANONICAL_RECORD ?? []).length, semanticFeatRecords: sem.length,
    derivativeRepoIds: [...(byDisp.PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C ?? [])].sort(cmp), noncanonicalRepoIds: [...(byDisp.REMOVE_NONCANONICAL_FEAT_RECORD ?? [])].sort(cmp),
  };
  check(feats.canonicalIdentities === 353 && feats.productionCatalogRecords === 390 && feats.productionPackRecords === 390, 'feat counts drifted from 353/390');
  check(feats.canonicalPresentInProduction === 351 && feats.canonicalMissingFromProduction === 2 && feats.implementationDerivatives === 6 && feats.noncanonicalRemovals === 33, 'feat partition drifted from 351/2/6/33');
  check(feats.missingCanonicalIds.join() === 'c352f81dde5c9dff,c9c4130a55761330', 'missing canonical feat ids are not Recall/Staggering Attack');
  check(feats.catalogEqualsPack, 'feat catalog and pack are not identical');
  check(feats.semanticFeatRecords === 353, 'semantic feat records != 353');
  check([...byDisp.PRESERVE_CANONICAL_RECORD].every((id) => packIds.has(id)) && [...byDisp.REMOVE_NONCANONICAL_FEAT_RECORD, ...byDisp.PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C].every((id) => packIds.has(id)), 'a 1B-dispositioned record is absent from the pack');

  // ---- weapons -------------------------------------------------------------------------------------------------------------------
  const wlines = lines('packs/weapons.db').map((l) => JSON.parse(l));
  const wdocs = wlines.filter((d) => d.type === 'weapon'), wother = wlines.filter((d) => d.type !== 'weapon');
  const b3 = json('data/audits/item-weapons-phase-3b-canonical-authority.json'), c3 = json('data/audits/item-weapons-phase-3c-production-disposition-ledger.json');
  const wIds = new Set(wdocs.map((d) => d._id));
  const canonPresent = b3.identities.filter((i) => i.repo.present && wIds.has(i.repo.id)), canonMissing = b3.identities.filter((i) => !i.repo.present);
  const sub = Object.fromEntries(['exotic', 'grenades', 'heavy', 'lightsabers', 'pistols', 'rifles', 'simple'].map((k) => [`packs/weapons-${k}.db`, lines(`packs/weapons-${k}.db`).length]));
  const weapons = {
    canonicalIdentities: b3.identities.length, productionWeaponRecords: wdocs.length, productionNonWeaponRecordsInPack: wother.map((d) => ({ id: d._id, type: d.type })),
    canonicalPresentInProduction: canonPresent.length, canonicalMissingFromProduction: canonMissing.length,
    repoOnlyRecords: c3.repoOnlyRecords.length, repoOnlyByDisposition: c3.counts.repoOnlyByDisposition, primaryDispositions: c3.counts.byPrimaryDisposition,
    categoryPackLineCounts: sub, categoryPackTotal: Object.values(sub).reduce((a, b) => a + b, 0),
    registryIdentities: json('data/weapons/canonical-weapon-registry.json').counts.identities,
  };
  check(weapons.canonicalIdentities === 203 && weapons.canonicalPresentInProduction === 151 && weapons.canonicalMissingFromProduction === 52, 'weapon partition drifted from 203/151/52');
  check(weapons.productionWeaponRecords === 186 && weapons.repoOnlyRecords === 35, 'weapon production drifted from 186 (151 canonical + 35 repo-only)');
  check(weapons.productionNonWeaponRecordsInPack.length === 4, 'weapons.db non-weapon record count drifted from 4');
  if (fail.length) throw new Error(`pre-cutover state drifted:\n${fail.join('\n')}`);

  return {
    schemaVersion: '5C.1', phase: '5C-0', purpose: 'Frozen pre-cutover census: hashes and counts of every feat/weapon authority, production file and reference-bearing repository record before any Phase 5C mutation.',
    gitHeadRef: head, productionMutatedByThisCensus: false,
    expected: { feats: { canonical: 353, production: 390, present: 351, missing: 2, derivatives: 6, noncanonical: 33 }, weapons: { canonical: 203, productionWeapons: 186, present: 151, missing: 52, repoOnly: 35 } },
    feats, weapons,
    hashes: { featAuthorities: hashes(FEAT_AUTH), featProduction: hashes(FEAT_PROD), weaponAuthorities: hashes(WEAPON_AUTH), weaponProduction: hashes(WEAPON_PROD), referenceBearingRecords: hashes(REFERENCE_BEARING) },
  };
}

function render(c) {
  const f = c.feats, w = c.weapons;
  return `# Phase 5C-0 — Pre-cutover census

Frozen snapshot taken before any Phase 5C production mutation (\`${OUT_JSON}\`). The generator fails if the repository has drifted from the certified expectation.

## Feats
| Measure | Value |
|---|---:|
| Canonical identities (Phase 1A) | ${f.canonicalIdentities} |
| Production catalog / pack records | ${f.productionCatalogRecords} / ${f.productionPackRecords} (identical: ${f.catalogEqualsPack}) |
| Canonical present / missing | ${f.canonicalPresentInProduction} / ${f.canonicalMissingFromProduction} (Recall \`c352f81dde5c9dff\`, Staggering Attack \`c9c4130a55761330\`) |
| Implementation derivatives | ${f.implementationDerivatives} |
| Noncanonical removals | ${f.noncanonicalRemovals} |
| Certified semantic feat records | ${f.semanticFeatRecords} |

## Weapons
| Measure | Value |
|---|---:|
| Canonical identities | ${w.canonicalIdentities} |
| Production weapon records | ${w.productionWeaponRecords} (+ ${w.productionNonWeaponRecordsInPack.length} non-weapon records in the same pack) |
| Canonical present / missing | ${w.canonicalPresentInProduction} / ${w.canonicalMissingFromProduction} |
| Repo-only records | ${w.repoOnlyRecords} (${JSON.stringify(w.repoOnlyByDisposition)}) |
| Category pack lines | ${w.categoryPackTotal} (${Object.entries(w.categoryPackLineCounts).map(([k, v]) => `${path.basename(k, '.db')} ${v}`).join(', ')}) |
| Runtime registry identities | ${w.registryIdentities} |

## Hashes
Every authority, production and reference-bearing file hash is recorded in the JSON (\`hashes\`). Later phases compare against it to prove exactly what changed.
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--verify-frozen')) {
    const c = json(OUT_JSON);
    if (c.feats.canonicalIdentities !== 353 || c.weapons.canonicalIdentities !== 203 || c.feats.noncanonicalRemovals !== 33 || c.weapons.canonicalMissingFromProduction !== 52) { console.error('frozen census values changed'); process.exit(1); }
    console.log('phase 5C pre-cutover census intact');
  } else {
    const c = buildCensus();
    fs.writeFileSync(path.join(ROOT, OUT_JSON), `${JSON.stringify(c, null, 1)}\n`);
    fs.writeFileSync(path.join(ROOT, OUT_MD), render(c));
    console.log(`wrote ${OUT_JSON}: feats ${c.feats.productionCatalogRecords}/${c.feats.canonicalIdentities}, weapons ${c.weapons.productionWeaponRecords}/${c.weapons.canonicalIdentities}`);
  }
}
