#!/usr/bin/env node
// Phase 5C-1: the operational canonical feat SSOT, data/canonical/feats.json.
//   certified feat authority chain (1A identity, provenance+content authority, final semantic authority, 1B dispositions)
//      --consolidated losslessly-->  canonical corpus (353 identities)
// AUDIT-DERIVED fields are verified against the audits by `--check`. `production` and `companions` are canonical-owned from the
// moment of consolidation: captured ONCE (`--consolidate`) from the pre-cutover catalog and the feat companion data files, with
// the 33 noncanonical and 6 derivative records removed and their references migrated. Packs, the catalog and the companion data
// files are generated FROM this file; nothing flows back.
// Usage: node tools/build-canonical-feats.mjs --consolidate | (no flag: refresh audit-derived fields) | --check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, readText, readJson, sha, stable, clone, cmp, sortKeys } from './lib/canonical-weapons-shared.mjs';

export const CANONICAL_FEATS = 'data/canonical/feats.json';
export const CORPUS_VERSION = '5C.1';
export const EXPECTED = 353;
const A1 = 'data/audits/feat-phase-1a-canonical-identity-manifest.json';
const A1B = 'data/audits/feat-phase-1b-repository-reconciliation.json';
const PROV = 'data/audits/feat-provenance-canonical-authority.json';
const SEM = 'data/audits/talent-feat-phase3-final-semantic-authority.json';
const CATALOG = 'data/feat-catalog.json';
const COMPANIONS = { featEffects: 'data/feat-effects.json', choiceOptions: 'data/feat-choice-options.json', featMetadata: 'data/feat-metadata.json', combatActions: 'data/feat-combat-actions.json', validityRegistry: 'data/feat-validity-registry.json' };
const WEAPON_PROFICIENCY_ID = 'ecc2471ac96ec2d4';

// Captured Foundry data keeps its authored key order (documents are byte-compared against Foundry exports); the audit-derived
// fields are key-sorted for byte stability.
const CAPTURED = ['legacySystemCapture', 'flags', 'effects', 'automation'];
const sortExceptCaptured = (x) => {
  const { production, ...rest } = x;
  const p = { ...production }; const keep = {};
  for (const k of CAPTURED) { keep[k] = p[k]; delete p[k]; }
  return { ...sortKeys(rest), production: { ...sortKeys(p), ...keep } };
};

export const serializeFeats = (corpus) => {
  const { identities, companions, ...head } = corpus;
  // companions keep their authored key order (consumers iterate some of them); everything else is key-sorted
  const headText = JSON.stringify({ ...sortKeys(head), companions }, null, 1);
  return `${headText.slice(0, -2)},\n "identities": [\n${identities.map((x) => JSON.stringify(sortExceptCaptured(x))).join(',\n')}\n ]\n}\n`;
};

function auditInputs() {
  const t = { a1: readText(A1), a1b: readText(A1B), prov: readText(PROV), sem: readText(SEM) };
  const a1 = JSON.parse(t.a1), a1b = JSON.parse(t.a1b), prov = JSON.parse(t.prov), sem = JSON.parse(t.sem);
  const fail = (m) => { throw new Error(`canonical feats: ${m}`); };
  if (a1.records.length !== EXPECTED) fail(`Phase 1A has ${a1.records.length} identities`);
  const byId = new Map(a1.records.map((r) => [r.canonicalId, r]));
  if (byId.size !== EXPECTED) fail('duplicate canonical id in Phase 1A');
  if (new Set(a1.records.map((r) => r.identityKey)).size !== EXPECTED) fail('duplicate identityKey in Phase 1A');
  // provenance-authority publication records grouped by canonical identity
  const pubs = [];
  for (const [book, b] of Object.entries(prov.books)) for (const f of b.feats ?? []) pubs.push({ book, f });
  for (const f of prov.officialWebSources.feats) pubs.push({ book: 'Official Web', f });
  const nameKey = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const pubsById = new Map();
  for (const { book, f } of pubs) {
    let id = f.canonicalId;
    if (!id) { // Recall carries a null id in the supplied authority; Phase 1A fixes it (name + publication match)
      const cand = a1.records.filter((r) => nameKey(r.displayName) === nameKey(f.name) && r.primaryPublication.sourcebook === (f.canonicalPublication?.source ?? book) && r.primaryPublication.page === (f.canonicalPublication?.page));
      if (cand.length !== 1) fail(`cannot resolve canonical id for ${f.name} (${book})`);
      id = cand[0].canonicalId;
    }
    if (!byId.has(id)) fail(`publication record for unknown canonical id ${id} (${f.name})`);
    (pubsById.get(id) ?? pubsById.set(id, []).get(id)).push({ book, ...f, canonicalId: id });
  }
  for (const r of a1.records) if (!pubsById.has(r.canonicalId)) fail(`no certified publication record for ${r.displayName}`);
  const finals = new Map(sem.records.filter((r) => r.domain === 'FEAT').map((r) => [r.canonicalId, r]));
  if (finals.size !== EXPECTED || [...byId.keys()].some((id) => !finals.has(id))) fail('certified semantic records do not cover the 353 identities');
  return { t, a1, a1b, prov, sem, byId, pubsById, finals };
}

/** Audit-derived part of one canonical feat record. */
export function deriveAuditRecord(r, A) {
  const pubs = A.pubsById.get(r.canonicalId);
  const ordered = [...pubs].sort((x, y) => (x.identityRole.startsWith('FULL_REPRINT') ? 1 : 0) - (y.identityRole.startsWith('FULL_REPRINT') ? 1 : 0) || cmp(x.book, y.book));
  const primary = ordered[0];
  const cert = primary.provenance?.certifiedPrimary ?? primary.provenance?.canonical ?? primary.canonicalPublication;
  const fin = A.finals.get(r.canonicalId);
  return {
    canonicalId: r.canonicalId,
    identityKey: r.identityKey,
    displayName: r.displayName,
    normalizedName: r.normalizedName,
    domain: r.domain,
    publicationCategory: r.publicationCategory,
    primaryPublication: { source: cert.source, page: cert.page },
    phase1APrimaryPublication: r.primaryPublication,
    reprints: r.reprints,
    sameNameCollisionGroup: r.sameNameCollisionGroup,
    sameNameCollisionType: r.sameNameCollisionType,
    crossDomainCollision: r.crossDomainCollision,
    structure: r.structure,
    certifiedPublications: ordered,
    semantic: { finalTags: fin.finalTags, certified: fin.certified === true },
  };
}

const slugOf = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function consolidate(A) {
  const catalog = readJson(CATALOG);
  const cat = new Map(catalog.map((d) => [d._id, d]));
  const disp = new Map(A.a1b.currentRecordDispositions.map((x) => [x.repoId, x]));
  const removedIds = new Set(A.a1b.currentRecordDispositions.filter((x) => x.reconciliationDisposition !== 'PRESERVE_CANONICAL_RECORD').map((x) => x.repoId));
  const removedNames = new Set([...removedIds].map((id) => cat.get(id).name));
  const effects = readJson(COMPANIONS.featEffects);
  const fxByFeatId = new Map(Object.entries(effects.definitions).map(([k, v]) => [v.featId, { featKey: k, def: v }]));
  const prod = new Map();
  for (const r of A.a1.records) {
    const d = cat.get(r.canonicalId);
    const present = !!d;
    const fx = fxByFeatId.get(r.canonicalId) ?? null;
    prod.set(r.canonicalId, {
      id: r.canonicalId, presentBeforeCutover: present, previousName: d?.name ?? null, previousSource: d?.system?.source ?? null, previousPage: d?.system?.page ?? null,
      img: d?.img ?? 'icons/svg/upgrade.svg', folder: d?.folder ?? null, sort: d?.sort ?? 0, ownershipDefault: d?.ownership?.default ?? 0,
      flags: clone(d?.flags ?? {}), effects: clone(d?.effects ?? []), legacySystemCapture: d ? clone(d.system) : null,
      automation: fx ? { featKey: fx.featKey, definition: clone(fx.def) } : null,
    });
  }
  const retired = A.a1b.currentRecordDispositions.filter((x) => x.reconciliationDisposition !== 'PRESERVE_CANONICAL_RECORD').map((x) => {
    const d = cat.get(x.repoId);
    const deriv = x.reconciliationDisposition === 'PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C';
    return {
      oldId: x.repoId, oldName: x.repoName, disposition: deriv ? 'IMPLEMENTATION_DERIVATIVE_MIGRATED_TO_CHOICE' : 'REMOVED_NONCANONICAL',
      parentCanonicalId: deriv ? x.parentCanonicalId : null, replacementCanonicalId: x.replacementCanonicalId ?? null,
      choice: deriv ? { key: 'weaponProficiency', storagePath: 'flags.swse.choices.weaponProficiency', value: d.system.choiceMeta.value } : null,
      phase0Classification: x.phase0Classification ?? null,
    };
  }).sort((a, b) => cmp(a.oldId, b.oldId));
  // companions: captured verbatim, with entries for retired feats removed (this IS the reference migration for those files)
  const idRe = (id) => new RegExp(`(^|[^A-Za-z0-9])${id}([^A-Za-z0-9]|$)`);
  const keepEffects = Object.fromEntries(Object.entries(effects.definitions).filter(([, v]) => !removedIds.has(v.featId)));
  const choice = readJson(COMPANIONS.choiceOptions);
  const metadata = readJson(COMPANIONS.featMetadata);
  const featsMeta = Array.isArray(metadata.feats) ? metadata.feats.filter((m) => !removedNames.has(m.name)) : Object.fromEntries(Object.entries(metadata.feats).filter(([k]) => !removedNames.has(k)));
  const combat = readJson(COMPANIONS.combatActions);
  const validity = readJson(COMPANIONS.validityRegistry);
  const companions = {
    featEffects: { _meta: effects._meta, definitionsByFeatKey: keepEffects },
    choiceOptions: choice,
    featMetadata: { ...metadata, feats: featsMeta },
    combatActions: combat,
    validityRegistry: validity,
  };
  void idRe; void disp;
  return { prod, retired, companions, catalogSha: sha(readText(CATALOG)), removedIds: [...removedIds].sort(cmp) };
}

export function buildCorpus({ consolidate: doConsolidate = false } = {}) {
  const A = auditInputs();
  const existing = fs.existsSync(path.join(ROOT, CANONICAL_FEATS)) ? readText(CANONICAL_FEATS) : null;
  const old = existing ? JSON.parse(existing) : null;
  let prod, retired, companions, capture;
  if (doConsolidate) {
    if (old) throw new Error('canonical feats corpus already exists; --consolidate is a one-time capture');
    const c = consolidate(A);
    prod = c.prod; retired = c.retired; companions = c.companions;
    capture = { source: CATALOG, sha256: c.catalogSha, companions: Object.fromEntries(Object.entries(COMPANIONS).map(([k, f]) => [k, f])), note: 'One-time capture of Foundry document metadata, legacy system data and companion datasets. After this the corpus owns them; packs, the catalog and companion files are generated from it.' };
  } else {
    if (!old) throw new Error('canonical feats corpus missing; run with --consolidate once');
    prod = new Map(old.identities.map((r) => [r.canonicalId, r.production])); retired = old.retiredProductionRecords; companions = old.companions; capture = old.productionCapture;
  }
  const identities = A.a1.records.map((r) => ({ ...deriveAuditRecord(r, A), production: prod.get(r.canonicalId) })).sort((x, y) => cmp(x.displayName, y.displayName) || cmp(x.canonicalId, y.canonicalId));
  return {
    schemaVersion: CORPUS_VERSION, status: 'CANONICAL_SSOT_FEATS', authorityRole: 'OPERATIONAL_CANONICAL_SSOT',
    purpose: 'The single operational authority for feats. data/feat-catalog.json, packs/feats.db and the feat companion data files are generated from this file; audit files are provenance evidence only.',
    productionIdConvention: 'The canonical id is the production _id (Phase 1A certified ids; new ids per the Phase 1A newIdPolicy).',
    inputs: { [A1]: sha(A.t.a1), [A1B]: sha(A.t.a1b), [PROV]: sha(A.t.prov), [SEM]: sha(A.t.sem) },
    productionCapture: capture,
    counts: { identities: identities.length, presentBeforeCutover: identities.filter((x) => x.production.presentBeforeCutover).length, createdByCutover: identities.filter((x) => !x.production.presentBeforeCutover).length, retiredProductionRecords: retired.length, weaponProficiencyCanonicalId: WEAPON_PROFICIENCY_ID },
    retiredProductionRecords: retired,
    companions,
    identities,
  };
}

export function verifyLossless(corpus) {
  const A = auditInputs();
  const errs = [];
  const byId = new Map(corpus.identities.map((x) => [x.canonicalId, x]));
  if (byId.size !== corpus.identities.length) errs.push('duplicate canonical feat id');
  for (const [k, v] of Object.entries(corpus.inputs)) if (sha(readText(k)) !== v) errs.push(`canonical corpus input ${k} changed`);
  for (const r of A.a1.records) {
    const c = byId.get(r.canonicalId);
    if (!c) { errs.push(`missing ${r.displayName}`); continue; }
    const { production, ...rest } = c;
    if (stable(rest) !== stable(deriveAuditRecord(r, A))) errs.push(`audit-derived fields of ${r.displayName} differ from the certified authority`);
  }
  for (const id of byId.keys()) if (!A.byId.has(id)) errs.push(`unexpected canonical feat ${id}`);
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--check')) {
      const cur = readText(CANONICAL_FEATS), corpus = JSON.parse(cur);
      const errs = verifyLossless(corpus);
      if (corpus.identities.length !== EXPECTED) errs.push(`corpus has ${corpus.identities.length} identities`);
      if (serializeFeats(buildCorpus()) !== cur) errs.push('canonical feat corpus is not byte-stable / stale');
      if (errs.length) { console.error(`canonical feats check FAILED:\n${errs.slice(0, 30).join('\n')}`); process.exit(1); }
      console.log(`canonical feats OK: ${corpus.identities.length} identities, lossless against the certified feat authorities, sha256 ${sha(cur)}`);
    } else {
      const text = serializeFeats(buildCorpus({ consolidate: process.argv.includes('--consolidate') }));
      fs.mkdirSync(path.join(ROOT, 'data/canonical'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, CANONICAL_FEATS), text);
      console.log(`wrote ${CANONICAL_FEATS} (${text.length} bytes) sha256 ${sha(text)}`);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
