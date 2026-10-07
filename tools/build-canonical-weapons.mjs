#!/usr/bin/env node
// Phase 5C-1: the operational canonical weapon SSOT, data/canonical/weapons.json.
//   audit evidence (Phase 3B mechanics + Phase 4H semantics, incl. the 5B-R completeness amendments)  --consolidated losslessly-->  canonical corpus
// The corpus has two kinds of content:
//   * AUDIT-DERIVED fields (everything certified about a weapon). `--check` proves they equal a fresh derivation from the audits.
//   * `production` fields (stable production id, Foundry document metadata, legacy-system carry-over). Canonical-owned from the
//     moment of consolidation; captured once from the pre-cutover pack with `--consolidate`; never re-read from the pack afterwards.
// Production packs, the runtime registry and compatibility outputs are generated FROM this file. Nothing flows back.
// Usage: node tools/build-canonical-weapons.mjs --consolidate   (one-time capture; refuses to run if the corpus already exists)
//        node tools/build-canonical-weapons.mjs                  (rewrite audit-derived fields, preserve production fields)
//        node tools/build-canonical-weapons.mjs --check          (lossless + schema verification)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, CANONICAL_WEAPONS, P3B, P4H, P3C, readText, readJson, sha, stable, clone, cmp, newProductionId, serializeCorpus, readPackLines } from './lib/canonical-weapons-shared.mjs';

export const CORPUS_VERSION = '5C.1';
export const EXPECTED = 203;
const LEGACY_PACK = 'packs/weapons.db';
const CHASSIS_KEYS = ['subtype', 'chassisId', 'constructible', 'baseBuildDc', 'baseCost', 'upgradeSlots', 'installedUpgrades'];

/** Audit-derived part of one canonical record (no production fields). */
export function deriveAuditRecord(i, r) {
  const k = i.identityKey;
  return {
    identityKey: k,
    canonicalName: i.canonicalName,
    weaponGroup: i.weaponGroup,
    schemaFamily: i.schemaFamily,
    canonicalStats: i.canonicalStats,
    qualities: i.qualities ?? null,
    conditionalQualities: i.conditionalQualities ?? null,
    conditionalDamageProfiles: i.conditionalDamageProfiles ?? null,
    qualityParameters: i.qualityParameters ?? null,
    qualityAuthority: i.qualityAuthority ?? null,
    operation: i.operation ?? null,
    summary: i.summary ?? null,
    canonicalPlayerText: i.canonicalPlayerText ?? null,
    firstPublication: i.firstPublication ?? null,
    sourceClaims: i.sourceClaims ?? [],
    sourceFootnotes: i.sourceFootnotes ?? [],
    ambiguities: i.ambiguities ?? [],
    proficiencyRules: i.proficiencyRules ?? [],
    semantic: { categories: r.categories, tags: r.semantic },
    selectors: r.selectors,
    proficiency: r.proficiency,
    abilityInteractions: r.abilityInteractions ?? [],
    authorityDiscrepancies: r.authorityDiscrepancies ?? [],
    ontologyGapsAndUnrepresentedMechanics: r.ontologyGapsAndUnrepresentedMechanics ?? [],
    authorities: r.authorities ?? [],
    provenance: {
      phase3B: { pointer: `${P3B}#identities[${k}]`, recordSha256: sha(stable(i)), mechanicsRecordSha256: sha(JSON.stringify(i.canonicalStats ?? null)) },
      phase4H: { pointer: `${P4H}#records[${k}]`, recordSha256: sha(stable(r)) },
    },
  };
}

function auditInputs() {
  const t3b = readText(P3B), t4h = readText(P4H);
  const b = JSON.parse(t3b), h = JSON.parse(t4h);
  const fail = (m) => { throw new Error(`canonical weapons: ${m}`); };
  if (h.inputs?.[P3B] !== sha(t3b)) fail('Phase 4H does not pin the current Phase 3B file');
  if (b.identities.length !== EXPECTED || h.records.length !== EXPECTED) fail(`expected ${EXPECTED} identities`);
  const by4h = new Map(h.records.map((r) => [r.identityKey, r]));
  if (by4h.size !== EXPECTED) fail('duplicate Phase 4H identity');
  const seen = new Set();
  const pairs = b.identities.map((i) => {
    if (seen.has(i.identityKey)) fail(`duplicate Phase 3B identity ${i.identityKey}`);
    seen.add(i.identityKey);
    const r = by4h.get(i.identityKey);
    if (!r) fail(`no Phase 4H record for ${i.identityKey}`);
    return [i, r];
  });
  return { b, h, pairs, t3b, t4h };
}

function consolidateProduction({ b, pairs }) {
  const c3 = readJson(P3C);
  const pack = readPackLines(LEGACY_PACK);
  const byId = new Map(pack.map((d) => [d._id, d]));
  const disp = new Map(c3.canonical.map((c) => [c.identityKey, c]));
  const merged = new Map(); // survivor repoId -> removed repo ids
  for (const r of c3.repoOnlyRecords) if (r.disposition === 'MERGE_INTO_CANONICAL') (merged.get(r.targetRepoId) ?? merged.set(r.targetRepoId, []).get(r.targetRepoId)).push(r.repoId);
  const catPack = new Map();
  for (const k of ['exotic', 'grenades', 'heavy', 'lightsabers', 'pistols', 'rifles', 'simple']) for (const d of readPackLines(`packs/weapons-${k}.db`)) catPack.set(d._id, k);
  const out = new Map();
  for (const [i] of pairs) {
    const d = disp.get(i.identityKey);
    const present = i.repo.present && byId.has(i.repo.id);
    const doc = present ? byId.get(i.repo.id) : null;
    const id = present ? i.repo.id : newProductionId(i.canonicalName);
    const prod = {
      id,
      presentBeforeCutover: present,
      phase3CDisposition: d.primaryDisposition,
      previousName: doc?.name ?? null,
      img: doc?.img ?? 'icons/svg/sword.svg',
      sort: doc?.sort ?? 0,
      folder: doc?.folder ?? null,
      ownershipDefault: doc?.ownership?.default ?? 0,
      flags: clone(doc?.flags ?? {}),
      effects: clone(doc?.effects ?? []),
      categoryPack: present ? (catPack.get(id) ?? null) : null,
      legacySystemCapture: doc ? clone(doc.system) : null,
      mergedFrom: [],
    };
    if ((merged.get(id) ?? []).length) prod.categoryPack = 'lightsabers'; // merge survivors carry the chassis role: the lightsaber workbench reads constructible chassis from the lightsabers pack
    for (const rid of merged.get(id) ?? []) {
      const m = byId.get(rid);
      prod.mergedFrom.push({ id: rid, name: m.name, systemOverlay: Object.fromEntries(CHASSIS_KEYS.filter((k) => k in m.system).map((k) => [k, clone(m.system[k])])), flags: clone(m.flags ?? {}) });
    }
    out.set(i.identityKey, prod);
  }
  const ids = [...out.values()].map((p) => p.id);
  if (new Set(ids).size !== ids.length) throw new Error('canonical weapons: production id collision');
  const retired = c3.repoOnlyRecords.map((r) => ({
    oldId: r.repoId, oldName: r.repoName, disposition: r.disposition,
    canonicalProductionId: r.disposition === 'MERGE_INTO_CANONICAL' ? r.targetRepoId : null,
    targetCanonicalIdentity: r.targetCanonicalIdentity ?? null, reason: r.reason,
  })).sort((x, y) => cmp(x.oldId, y.oldId));
  const nonWeapon = pack.filter((d) => d.type !== 'weapon');
  return { out, retired, nonWeapon, c3sha: sha(readText(P3C)) };
}

export function buildCorpus({ consolidate = false } = {}) {
  const A = auditInputs();
  const existing = fs.existsSync(path.join(ROOT, CANONICAL_WEAPONS)) ? readText(CANONICAL_WEAPONS) : null;
  const old = existing ? JSON.parse(existing) : null;
  let prodByKey, retired, nonWeapon, extra = {};
  if (consolidate) {
    if (old) throw new Error('canonical weapons corpus already exists; --consolidate is a one-time capture');
    const c = consolidateProduction(A);
    prodByKey = c.out; retired = c.retired; nonWeapon = c.nonWeapon;
    extra = { productionCapture: { source: LEGACY_PACK, sha256: sha(readText(LEGACY_PACK)), phase3CLedgerSha256: c.c3sha, note: 'One-time capture of Foundry document metadata and legacy system carry-over. After this the corpus owns these fields; packs are generated from it.' } };
  } else {
    if (!old) throw new Error('canonical weapons corpus missing; run with --consolidate once');
    prodByKey = new Map(old.identities.map((r) => [r.identityKey, r.production]));
    retired = old.retiredProductionRecords; nonWeapon = old.nonWeaponPackRecords; extra = { productionCapture: old.productionCapture };
  }
  const identities = A.pairs.map(([i, r]) => ({ ...deriveAuditRecord(i, r), production: prodByKey.get(i.identityKey) }))
    .sort((x, y) => cmp(x.canonicalName, y.canonicalName) || cmp(x.identityKey, y.identityKey));
  return {
    schemaVersion: CORPUS_VERSION,
    status: 'CANONICAL_SSOT_WEAPONS',
    authorityRole: 'OPERATIONAL_CANONICAL_SSOT',
    purpose: 'The single operational authority for weapons. Production packs, the runtime registry and compatibility projections are generated from this file; audit files are provenance evidence only.',
    productionIdConvention: 'Existing ids are preserved; identities that had no production record get weapon-<slug(canonicalName)>.',
    inputs: { [P3B]: sha(A.t3b), [P4H]: sha(A.t4h) },
    ...extra,
    counts: { identities: identities.length, presentBeforeCutover: identities.filter((x) => x.production.presentBeforeCutover).length, createdByCutover: identities.filter((x) => !x.production.presentBeforeCutover).length, retiredProductionRecords: retired.length, nonWeaponPackRecords: nonWeapon.length },
    retiredProductionRecords: retired,
    nonWeaponPackRecords: nonWeapon,
    identities,
  };
}

/** Audit-derived equality (production fields excluded). */
export function verifyLossless(corpus) {
  const A = auditInputs();
  const errs = [];
  const byKey = new Map(corpus.identities.map((x) => [x.identityKey, x]));
  if (byKey.size !== corpus.identities.length) errs.push('duplicate canonical identity');
  if (corpus.inputs[P3B] !== sha(A.t3b) || corpus.inputs[P4H] !== sha(A.t4h)) errs.push('canonical corpus inputs do not match the audit files');
  for (const [i, r] of A.pairs) {
    const c = byKey.get(i.identityKey);
    if (!c) { errs.push(`missing ${i.identityKey}`); continue; }
    const { production, ...rest } = c;
    if (stable(rest) !== stable(deriveAuditRecord(i, r))) errs.push(`audit-derived fields of ${i.identityKey} differ from the certified authority`);
  }
  for (const k of byKey.keys()) if (!A.pairs.some(([i]) => i.identityKey === k)) errs.push(`unexpected canonical identity ${k}`);
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const consolidate = process.argv.includes('--consolidate');
    if (process.argv.includes('--check')) {
      const cur = readText(CANONICAL_WEAPONS), corpus = JSON.parse(cur);
      const errs = verifyLossless(corpus);
      const ids = corpus.identities.map((x) => x.production.id);
      if (new Set(ids).size !== ids.length) errs.push('duplicate production id');
      if (corpus.identities.length !== EXPECTED) errs.push(`corpus has ${corpus.identities.length} identities`);
      if (serializeCorpus(buildCorpus()) !== cur) errs.push('canonical corpus is not byte-stable / stale');
      if (errs.length) { console.error(`canonical weapons check FAILED:\n${errs.slice(0, 30).join('\n')}`); process.exit(1); }
      console.log(`canonical weapons OK: ${corpus.identities.length} identities, lossless against Phase 3B/4H, sha256 ${sha(cur)}`);
    } else {
      const text = serializeCorpus(buildCorpus({ consolidate }));
      fs.mkdirSync(path.join(ROOT, 'data/canonical'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, CANONICAL_WEAPONS), text);
      console.log(`wrote ${CANONICAL_WEAPONS} (${text.length} bytes) sha256 ${sha(text)}`);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
