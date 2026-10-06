#!/usr/bin/env node
// Phase 3D: deterministic global verification and freeze record for the weapon canonical authority.
// Authority-only: re-joins every certified source claim (Phase 1 text -> Phase 2 mechanics -> v2.9 ammo -> Phase 3B
// identity -> Phase 3C disposition) from the committed artifacts and the live production pack, throws on any drift and
// records the frozen counts, hashes, cleanup gates, unresolved fields and schema-gap inventory. It mutates nothing.
// Usage: node tools/build-item-weapons-phase-3d-global-freeze.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/item-weapons-phase-3d-global-freeze.json';
export const OUT_MD = 'docs/audits/item-weapons-phase-3d-global-freeze.md';
const AUTH = 'data/audits/item-canonicalization-rolling-authority.json';
const P3A = 'data/audits/item-weapons-phase-3a-cross-publication-reconciliation.json';
const P3B = 'data/audits/item-weapons-phase-3b-canonical-authority.json';
const P3C = 'data/audits/item-weapons-phase-3c-production-disposition-ledger.json';
const OVERLAY = 'data/audits/item-weapons-schema-v2.9-ammo-normalization.json';
const readText = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const readJson = (f) => JSON.parse(readText(f));
const sortKeys = (x) => (Array.isArray(x) ? x.map(sortKeys) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])])) : x);
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(sortKeys(x))).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const normBook = (b) => String(b).replace(/\s+/g, ' ').trim().replace(/^The /, '');

export const EXPECTED = { claims: 209, identities: 203, single: 197, two: 6, repoPresent: 151, repoMissing: 52, liveWeapons: 186, outOfScope: 4, repoOnly: 35, repoOnlyMerge: 2, repoOnlyRemove: 33, create: 52, update: 149, merge: 2, unresolvedFields: 25, unresolvedIdentities: 21 };
export const FROZEN = 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN';
export const PENDING = 'WEAPON_PHASE_3D_VERIFIED_FREEZE_PENDING_COMBAT_GLOVES_VISUAL_CONFIRMATION';

// Planner flag: are the Core Table 8-3 Combat Gloves rows (150 cr / 0.4 kg and 250 cr / 0.5 kg) keyed to Small/Medium
// WEARER size (current representation) or to WEAPON size headings? Only CONFIRMED_WEARER_SIZE may freeze.
export const COMBAT_GLOVES_VISUAL_CHECK = {
  status: 'UNVERIFIED_PRIMARY_SOURCE_PAGE_NOT_AVAILABLE',
  allowedStatuses: ['CONFIRMED_WEARER_SIZE', 'UNVERIFIED_PRIMARY_SOURCE_PAGE_NOT_AVAILABLE'],
  contradictedBehaviour: 'Stop and back-propagate the smallest correction Phase 2A -> 3B -> 3C (do not freeze).',
  currentRepresentation: 'variantsByWearerSize: Small 150 cr / 0.4 kg, Medium 250 cr / 0.5 kg (sizeRule two_sizes_smaller_than_wearer)',
  evidenceExamined: [
    'reference/sourcebooks/Core Rulebook_djvu.txt: Table 8-3 simple-weapons rows "150 +1 - 0.4 kg Bludgeoning -" and "250 +1 - 0.5 kg Bludgeoning -" survive OCR, but the entire name/size label column of the table is missing, so the row headings cannot be read.',
    'Core description text (p.121): combat gloves "are two sizes smaller than their wearer (for example, a pair of combat gloves designed for a Human are Tiny)".',
    'No Core Rulebook PDF or page image exists in the repository or the session sandbox; the earlier Phase 1/2A "PDF visual table verification" note was recorded in a prior session and cannot be re-performed here.',
  ],
  action: 'Provide Core Rulebook p.123 (Table 8-3, Simple Weapons) as a page image or PDF; if its two glove rows are labelled by wearer size, set status to CONFIRMED_WEARER_SIZE and rebuild; if labelled by weapon size, apply the Phase 2A -> 3B -> 3C correction instead.',
  shockboxingGloves: 'Not reopened: planner accepted variantsByWearerSize.',
};

export function buildPhase3D() {
  const auth = readJson(AUTH);
  const p1 = auth.phases['1-weapons-content'];
  const s2 = auth.phases['2-weapons-numeric-stat-schema'];
  const p3a = readJson(P3A);
  const overlay = readJson(OVERLAY);
  const t3b = readText(P3B), t3c = readText(P3C);
  const b3 = JSON.parse(t3b), c3 = JSON.parse(t3c);
  const fail = (m) => { throw new Error(`Phase 3D freeze: ${m}`); };

  // ---- production pack (live) ----
  const dbText = readText('packs/weapons.db');
  const prod = dbText.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const live = prod.filter((r) => r.type === 'weapon');
  const nonWeapon = prod.filter((r) => r.type !== 'weapon');
  const productionHashes = { 'packs/weapons.db': sha(dbText), 'template.json': sha(readText('template.json')) };
  const baseline = b3.productionBaseline;
  if (productionHashes['packs/weapons.db'] !== baseline['packs/weapons.db'] || productionHashes['template.json'] !== baseline['template.json']) fail('production files differ from the Phase 3B baseline');
  if (c3.inputs.production['packs/weapons.db'] !== productionHashes['packs/weapons.db'] || c3.inputs.production['template.json'] !== productionHashes['template.json']) fail('production files differ from the Phase 3C baseline');
  if (c3.inputs.phase3b.sha256 !== sha(t3b)) fail('Phase 3B changed after Phase 3C was generated');

  // ---- Phase 1 claims ----
  const p1Claims = new Map();
  for (const b of p1.books) for (const r of b.records) {
    const k = `${normBook(r.source.book)}|${r.canonicalName}`;
    if (p1Claims.has(k)) fail(`duplicate Phase 1 claim ${k}`);
    p1Claims.set(k, { phase1: b.phase, rec: r });
  }
  // ---- Phase 2 claims ----
  const p2Claims = new Map();
  const p2Inputs = [{ id: 'phase2a-core-records', sha256: sha(s2.books[0]) }];
  const addP2 = (phase, rec) => {
    const k = `${normBook(rec.source.book)}|${rec.canonicalName}`;
    if (p2Claims.has(k)) fail(`duplicate Phase 2 claim ${k}`);
    p2Claims.set(k, { phase, rec });
  };
  for (const r of s2.books[0].records) addP2('2A', r);
  for (const sb of s2.standaloneBookAuthorities) {
    const d = readJson(sb.file);
    p2Inputs.push({ id: `phase${sb.phase.toLowerCase()}`, file: sb.file, sha256: sha(d) });
    for (const r of d.records) addP2(sb.phase, r);
  }
  if (p1Claims.size !== EXPECTED.claims) fail(`Phase 1 claim count ${p1Claims.size} != ${EXPECTED.claims}`);
  if (p2Claims.size !== EXPECTED.claims) fail(`Phase 2 claim count ${p2Claims.size} != ${EXPECTED.claims}`);
  for (const k of p1Claims.keys()) if (!p2Claims.has(k)) fail(`Phase 1 claim without Phase 2 claim: ${k}`);
  for (const k of p2Claims.keys()) if (!p1Claims.has(k)) fail(`Phase 2 claim without Phase 1 claim: ${k}`);
  const overlayByKey = new Map(overlay.entries.map((e) => [`${e.phase}|${normBook(e.book)}|${e.canonicalName}`, e]));
  if (overlay.entries.length !== EXPECTED.claims || overlayByKey.size !== EXPECTED.claims) fail('v2.9 ammo overlay must hold exactly 209 distinct claims');

  // ---- 3B identity join: each claim maps to exactly one identity ----
  const idOfClaim = new Map();
  const identities = b3.identities;
  if (identities.length !== EXPECTED.identities) fail(`3B identity count ${identities.length}`);
  const idByKey = new Map();
  for (const i of identities) {
    if (idByKey.has(i.identityKey)) fail(`duplicate 3B identity key ${i.identityKey}`);
    idByKey.set(i.identityKey, i);
    for (const c of i.sourceClaims) {
      const k = `${normBook(c.book)}|${c.canonicalName}`;
      if (idOfClaim.has(k)) fail(`claim ${k} maps to two 3B identities (${idOfClaim.get(k)} and ${i.identityKey})`);
      idOfClaim.set(k, i.identityKey);
    }
  }
  if (idOfClaim.size !== EXPECTED.claims) fail(`3B covers ${idOfClaim.size} claims`);
  for (const k of p1Claims.keys()) if (!idOfClaim.has(k)) fail(`claim ${k} has no 3B identity`);

  // ---- 3C join ----
  const led = new Map();
  for (const c of c3.canonical) { if (led.has(c.identityKey)) fail(`duplicate 3C identity ${c.identityKey}`); led.set(c.identityKey, c); }
  if (led.size !== EXPECTED.identities) fail(`3C identity count ${led.size}`);
  for (const k of idByKey.keys()) if (!led.has(k)) fail(`3B identity ${k} absent from 3C`);
  for (const k of led.keys()) if (!idByKey.has(k)) fail(`3C identity ${k} absent from 3B`);

  // ---- claim trace ----
  const claimTrace = [];
  for (const [k, a] of [...p1Claims].sort((x, y) => cmp(x[0], y[0]))) {
    const b = p2Claims.get(k);
    const ov = overlayByKey.get(`${b.phase}|${k}`);
    if (!ov) fail(`no v2.9 ammo overlay entry for ${k}`);
    if (JSON.stringify(sortKeys(ov.ammo)) !== JSON.stringify(sortKeys(b.rec.canonicalStats.ammo))) fail(`ammo overlay differs from Phase 2 for ${k}`);
    const ik = idOfClaim.get(k), id = idByKey.get(ik);
    const sc = id.sourceClaims.find((c) => `${normBook(c.book)}|${c.canonicalName}` === k);
    if (sc.phase2 !== b.phase || sc.phase2Ref.sha256 !== sha(b.rec)) fail(`3B snapshot reference for ${k} does not match the certified Phase 2 claim`);
    if (id.sourceClaims.length === 1 && id.canonicalPlayerText !== a.rec.canonicalPlayerText) fail(`one-claim identity ${ik} text differs from Phase 1`);
    claimTrace.push({
      claimKey: k, phase1: a.phase1, phase2: b.phase, phase1Sha256: sha(a.rec), phase2Sha256: sha(b.rec), ammoOverlaySha256: sha(ov.ammo),
      identityKey: ik, identity3BSha256: sha(id), disposition3C: led.get(ik).primaryDisposition,
    });
  }

  // ---- identity census ----
  const claimsPer = new Map();
  for (const v of idOfClaim.values()) claimsPer.set(v, (claimsPer.get(v) || 0) + 1);
  const single = [...claimsPer.values()].filter((n) => n === 1).length, two = [...claimsPer.values()].filter((n) => n === 2).length;
  if (single !== EXPECTED.single || two !== EXPECTED.two || single + two !== EXPECTED.identities) fail(`claim split ${single}/${two}`);
  const twoNames = [...claimsPer].filter(([, n]) => n === 2).map(([k]) => idByKey.get(k).canonicalName).sort();
  const p3aNames = p3a.records.map((r) => r.canonicalIdentity).sort();
  if (JSON.stringify(twoNames) !== JSON.stringify(p3aNames)) fail('the six two-claim identities are not the six certified 3A cross-publication identities');
  if (p3a.records.some((r) => !String(r.reconciliationStatus).startsWith('RESOLVED') && !String(r.reconciliationStatus).startsWith('COMPATIBLE'))) fail('a 3A cross-publication identity is not resolved');
  const repoPresent = identities.filter((i) => i.repo.present).length;
  if (repoPresent !== EXPECTED.repoPresent || identities.length - repoPresent !== EXPECTED.repoMissing) fail(`repo present/missing ${repoPresent}`);
  const byDisp = {};
  for (const c of led.values()) byDisp[c.primaryDisposition] = (byDisp[c.primaryDisposition] || 0) + 1;
  const dispCounts = { KEEP: byDisp.KEEP || 0, CREATE: byDisp.CREATE || 0, RENAME: byDisp.RENAME || 0, UPDATE: byDisp.UPDATE || 0, MERGE: byDisp.MERGE || 0, REVIEW_PRECEDENCE: byDisp.REVIEW_PRECEDENCE || 0 };
  if (dispCounts.CREATE !== EXPECTED.create || dispCounts.UPDATE !== EXPECTED.update || dispCounts.MERGE !== EXPECTED.merge || dispCounts.KEEP || dispCounts.RENAME || dispCounts.REVIEW_PRECEDENCE) fail(`3C dispositions ${JSON.stringify(dispCounts)}`);
  for (const c of led.values()) if (c.productionMutationAuthorized !== false) fail(`3C identity ${c.identityKey} authorises production mutation`);

  // ---- live weapon coverage exactly once ----
  const liveIds = new Set(live.map((r) => r._id));
  if (live.length !== EXPECTED.liveWeapons || nonWeapon.length !== EXPECTED.outOfScope) fail(`production weapon/non-weapon counts ${live.length}/${nonWeapon.length}`);
  const cover = new Map();
  const mapped = new Map();
  for (const i of identities) if (i.repo.present) { cover.set(i.repo.id, (cover.get(i.repo.id) || 0) + 1); mapped.set(i.repo.id, i.identityKey); }
  const repoOnly = c3.repoOnlyRecords;
  for (const r of repoOnly) cover.set(r.repoId, (cover.get(r.repoId) || 0) + 1);
  for (const id of liveIds) if (cover.get(id) !== 1) fail(`live weapon ${id} is covered ${cover.get(id) || 0} times`);
  for (const id of cover.keys()) if (!liveIds.has(id)) fail(`ledger references ${id}, which is not a live weapon record`);
  // MERGE survivors are mapped records that also receive a merge; they stay covered once through the canonical mapping.
  const liveCoverage = [...liveIds].sort().map((id) => (mapped.has(id) ? { repoId: id, role: 'CANONICAL_MAPPED', identityKey: mapped.get(id) } : { repoId: id, role: 'REPO_ONLY', disposition: repoOnly.find((r) => r.repoId === id).disposition }));

  // ---- cleanup gates (reverse ledger) ----
  const ro = (d) => repoOnly.filter((r) => r.disposition === d).length;
  if (repoOnly.length !== EXPECTED.repoOnly || ro('MERGE_INTO_CANONICAL') !== EXPECTED.repoOnlyMerge || ro('REMOVE_UNSUPPORTED') !== EXPECTED.repoOnlyRemove) fail('repo-only census');
  const cleanupGates = repoOnly.map((r) => {
    if (r.productionMutationAuthorized !== false) fail(`repo-only ${r.repoId} authorises production mutation`);
    if (!r.dependencyGate || r.dependencyGate.status !== 'BLOCKED_PENDING_MIGRATION') fail(`repo-only ${r.repoId} lost its dependency gate`);
    if (!liveIds.has(r.repoId)) fail(`repo-only ${r.repoId} has already been removed from the pack`);
    return { repoId: r.repoId, repoName: r.repoName, disposition: r.disposition, targetRepoId: r.targetRepoId || null, gateStatus: r.dependencyGate.status, referenceFileCount: r.dependencyGate.referenceFileCount, referenceTotal: r.dependencyGate.referenceTotal, executed: false };
  }).sort((x, y) => cmp(x.repoId, y.repoId));

  // ---- source-unresolved fields ----
  const sourceUnresolved = [];
  for (const c of c3.canonical) for (const f of c.blockedFields) {
    if (f.status !== 'SOURCE_UNRESOLVED_NO_MUTATION' || f.productionValueMayNotBecomeCanonical !== true || !f.reason) fail(`blocked field ${c.identityKey} ${f.canonicalPath} lost its guard or reason`);
    sourceUnresolved.push({ identityKey: c.identityKey, canonicalName: c.canonicalName, canonicalPath: f.canonicalPath, reason: f.reason, productionValueMayNotBecomeCanonical: true });
  }
  sourceUnresolved.sort((x, y) => cmp(x.identityKey + x.canonicalPath, y.identityKey + y.canonicalPath));
  const unresolvedIdentities = new Set(sourceUnresolved.map((s) => s.identityKey)).size;
  if (sourceUnresolved.length !== EXPECTED.unresolvedFields || unresolvedIdentities !== EXPECTED.unresolvedIdentities) fail(`source-unresolved ${sourceUnresolved.length}/${unresolvedIdentities}`);
  const bowcaster = sourceUnresolved.find((s) => s.canonicalName === 'Bowcaster' && /range/.test(s.canonicalPath));
  if (!bowcaster) fail('Bowcaster range must remain source-unresolved');
  const unresolvedConflicts = identities.flatMap((i) => (i.crossPublication && i.crossPublication.unresolvedConflicts) || []).length;
  if (unresolvedConflicts) fail('an unresolved cross-publication contradiction remains');

  // ---- schema-gap inventory, recomputed from the per-identity requirements ----
  const gap = new Map();
  for (const c of c3.canonical) for (const s of c.schemaRequirements) {
    const g = gap.get(s.requiredSchemaCapability) || { identities: 0, currentProductionLimitation: s.currentProductionLimitation, futureMigrationRequirement: s.futureMigrationRequirement };
    g.identities++; gap.set(s.requiredSchemaCapability, g);
  }
  const schemaGapInventory = [...gap].sort((x, y) => cmp(x[0], y[0])).map(([capability, g]) => ({
    capability, identities: g.identities,
    canonicalAuthority: 'Represented in the certified Phase 3B v2.9 canonical authority.',
    productionRepresentation: g.currentProductionLimitation,
    futureV2SchemaCapability: g.futureMigrationRequirement,
  }));
  if (JSON.stringify(Object.fromEntries(schemaGapInventory.map((s) => [s.capability, s.identities]))) !== JSON.stringify(c3.counts.schemaRequirementsByCapability)) fail('schema-gap counts differ from the 3C ledger');

  // ---- Combat Gloves ----
  const cg = idByKey.get('unmapped::Combat Gloves');
  if (!cg) fail('Combat Gloves identity missing');
  const cgv = cg.canonicalStats.variantsByWearerSize;
  if (!cgv || cg.canonicalStats.sizeRule !== 'two_sizes_smaller_than_wearer' || JSON.stringify(cgv.map((v) => [v.wearerSize, v.costCredits, v.weightKg])) !== JSON.stringify([['Small', 150, 0.4], ['Medium', 250, 0.5]])) fail('Combat Gloves representation changed outside the planner-gated visual check');
  if (!COMBAT_GLOVES_VISUAL_CHECK.allowedStatuses.includes(COMBAT_GLOVES_VISUAL_CHECK.status)) fail('Combat Gloves visual check status is not an allowed value');
  const frozen = COMBAT_GLOVES_VISUAL_CHECK.status === 'CONFIRMED_WEARER_SIZE';

  const inputs = {
    phase1WeaponsContent: { sha256: sha(p1) }, phase2: p2Inputs, ammoOverlay: { file: OVERLAY, sha256: sha(overlay) },
    phase3a: { file: P3A, sha256: sha(readText(P3A)) }, phase3b: { file: P3B, sha256: sha(t3b) }, phase3c: { file: P3C, sha256: sha(t3c) },
    phase01Weapons: { sha256: sha(auth.phases['0-1-weapons']) }, production: productionHashes,
  };
  const counts = {
    sourceClaims: p1Claims.size, canonicalIdentities: identities.length, singleClaimIdentities: single, twoClaimIdentities: two,
    repoPresentIdentities: repoPresent, repoMissingIdentities: identities.length - repoPresent,
    byPrimaryDisposition: dispCounts, liveWeaponRecords: live.length, liveWeaponRecordsCoveredExactlyOnce: liveCoverage.length,
    canonicalMappedLiveRecords: liveCoverage.filter((l) => l.role === 'CANONICAL_MAPPED').length, repoOnlyRecords: repoOnly.length,
    repoOnlyByDisposition: { MERGE_INTO_CANONICAL: ro('MERGE_INTO_CANONICAL'), REMOVE_UNSUPPORTED: ro('REMOVE_UNSUPPORTED') },
    cleanupRecordsWithDependencyGates: cleanupGates.length, outOfScopeNonWeaponRecordsInWeaponsPack: nonWeapon.length,
    sourceUnresolvedFields: sourceUnresolved.length, identitiesWithSourceUnresolvedFields: unresolvedIdentities,
    unresolvedCrossPublicationContradictions: unresolvedConflicts, schemaGapCapabilityGroups: schemaGapInventory.length,
  };
  const out = {
    schemaVersion: 'weapon-phase-3d-global-freeze-v1', phase: '3D', family: 'weapons',
    status: frozen ? FROZEN : PENDING,
    authorityOnly: true, productionMutationAuthorized: false,
    productionMutationNote: 'The frozen weapon canonical authority may serve as the SOURCE for production migration and weapon tag archaeology; it authorizes neither.',
    identityKeysUnchangedThrough3CAndFreeze: true,
    inputs, counts,
    combatGlovesVisualCheck: COMBAT_GLOVES_VISUAL_CHECK,
    sourceUnresolvedFields: sourceUnresolved, cleanupGates, schemaGapInventory,
    liveWeaponCoverage: liveCoverage, claimTrace,
    identityTrace: identities.map((i) => ({ identityKey: i.identityKey, canonicalName: i.canonicalName, claims: i.sourceClaims.length, repoId: i.repo.id || null, identity3BSha256: sha(i), disposition3C: led.get(i.identityKey).primaryDisposition })).sort((x, y) => cmp(x.identityKey, y.identityKey)),
  };
  const json = JSON.stringify(out, null, 2) + '\n';

  const d = dispCounts;
  const md = `# Phase 3D — Weapon Canonical Authority: Global Verification and Freeze

Status: **${out.status}**. Authority-only. Production mutation is **not** authorized. \`packs/weapons.db\` and \`template.json\` are unchanged (SHA-256 \`${productionHashes['packs/weapons.db'].slice(0, 12)}…\` / \`${productionHashes['template.json'].slice(0, 12)}…\`).

Built by \`tools/build-item-weapons-phase-3d-global-freeze.mjs\` (\`--check\` proves byte-stability). Every figure below is recomputed from the committed Phase 1/2/3A/3B/3C artifacts and the live production pack; the builder throws on drift.

## Frozen counts

| Item | Count |
| --- | ---: |
| Certified source claims | ${counts.sourceClaims} |
| Canonical identities | ${counts.canonicalIdentities} (${single} one-claim, ${two} two-claim = the six 3A cross-publication identities) |
| Repo present / missing identities | ${counts.repoPresentIdentities} / ${counts.repoMissingIdentities} |
| 3C dispositions | CREATE ${d.CREATE}, UPDATE ${d.UPDATE}, MERGE ${d.MERGE}, KEEP ${d.KEEP}, RENAME-only ${d.RENAME}, REVIEW_PRECEDENCE ${d.REVIEW_PRECEDENCE} |
| Live weapon records covered exactly once | ${counts.liveWeaponRecordsCoveredExactlyOnce} (${counts.canonicalMappedLiveRecords} canonical-mapped + ${counts.repoOnlyRecords} repo-only) |
| Repo-only cleanup records | ${counts.repoOnlyRecords} (${counts.repoOnlyByDisposition.MERGE_INTO_CANONICAL} MERGE_INTO_CANONICAL, ${counts.repoOnlyByDisposition.REMOVE_UNSUPPORTED} REMOVE_UNSUPPORTED), all ${counts.cleanupRecordsWithDependencyGates} dependency-gated, none executed |
| Non-weapon records in \`packs/weapons.db\` (out of scope, 0-3G) | ${counts.outOfScopeNonWeaponRecordsInWeaponsPack} |
| Source-unresolved fields | ${counts.sourceUnresolvedFields} across ${counts.identitiesWithSourceUnresolvedFields} identities |
| Unresolved cross-publication contradictions | ${counts.unresolvedCrossPublicationContradictions} |
| Schema-gap capability groups | ${counts.schemaGapCapabilityGroups} |

Traceability: each of the ${counts.sourceClaims} claims is joined Phase 1 text -> Phase 2 mechanics -> v2.9 ammo overlay -> Phase 3B identity -> Phase 3C disposition (see \`claimTrace\` in the JSON, with SHA-256 per link). Identity keys are unchanged through 3C and the freeze.

## Combat Gloves Table 8-3 visual check

Status: **${COMBAT_GLOVES_VISUAL_CHECK.status}**.

${COMBAT_GLOVES_VISUAL_CHECK.evidenceExamined.map((e) => `- ${e}`).join('\n')}

Current representation: ${COMBAT_GLOVES_VISUAL_CHECK.currentRepresentation}. The check is **not contradicted**, but it also cannot be confirmed from the sources available here, so the freeze is not certified until it is. ${COMBAT_GLOVES_VISUAL_CHECK.action} Shockboxing Gloves is not reopened.

## Cleanup gates (all blocked pending migration, none executed)

| Repo record | Disposition | Target | References (files / total) |
| --- | --- | --- | --- |
${cleanupGates.map((g) => `| \`${g.repoId}\` | ${g.disposition} | ${g.targetRepoId ? `\`${g.targetRepoId}\`` : '—'} | ${g.referenceFileCount} / ${g.referenceTotal} |`).join('\n')}

Vehicle/starship terms removed only from the character-weapon corpus are not a deletion from any future vehicle domain.

## Source-unresolved fields (production values may never become canonical)

${sourceUnresolved.map((s) => `- **${s.canonicalName}** \`${s.canonicalPath}\` — ${s.reason}`).join('\n')}

## Schema-gap inventory

| Capability | Identities | Production representation | Future V2 schema capability |
| --- | ---: | --- | --- |
${schemaGapInventory.map((s) => `| ${s.capability} | ${s.identities} | ${s.productionRepresentation} | ${s.futureV2SchemaCapability} |`).join('\n')}

Canonical authority already carries every capability above (3B, schema v2.9); the gap is in the production representation only.

## Inputs

${Object.entries(inputs).filter(([, v]) => v.sha256).map(([k, v]) => `- ${k}: \`${v.sha256}\``).join('\n')}
`;
  return { json, md, out };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { json, md } = buildPhase3D();
  if (process.argv.includes('--check')) {
    const bad = [];
    if (readText(OUT_JSON) !== json) bad.push(OUT_JSON);
    if (readText(OUT_MD) !== md) bad.push(OUT_MD);
    if (bad.length) { console.error(`Phase 3D freeze: committed output is stale or hand-edited: ${bad.join(', ')}`); process.exit(1); }
    console.log('Phase 3D global freeze OK: committed outputs are byte-identical to a rebuild');
  } else {
    fs.writeFileSync(path.join(ROOT, OUT_JSON), json);
    fs.writeFileSync(path.join(ROOT, OUT_MD), md);
    console.log(`wrote ${OUT_JSON} and ${OUT_MD}`);
  }
}
