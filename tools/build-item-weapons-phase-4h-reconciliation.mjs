#!/usr/bin/env node
// Phase 4H-A: deterministic cross-category census + authority reconciliation for the weapon semantic authorities (4A-4G).
// Authority-only: reads committed artifacts, throws on any drift, mutates nothing else.
// Usage: node tools/build-item-weapons-phase-4h-reconciliation.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/item-weapons-phase-4h-authority-reconciliation.json';
export const OUT_MD = 'docs/audits/item-weapons-phase-4h-authority-reconciliation.md';
const readText = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const readJson = (f) => JSON.parse(readText(f));
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const STATUS = 'WEAPON_PHASE_4H_A_AUTHORITY_RECONCILED';
export const EXPECTED = { categoryRecords: 204, uniqueIdentities: 203, repoPresent: 151, repoMissing: 52, duplicates: ['weapon-interchangeable-weapon-system'] };
const CATEGORIES = [
  { id: '4A', name: 'Simple Weapon', file: 'data/audits/item-weapons-phase-4a-simple-semantic-rolling.json', groups: ['Simple Weapon'], key: (a) => a.identityKey },
  { id: '4B', name: 'Lightsaber', file: 'data/audits/item-weapons-phase-4b-lightsaber-semantic-rolling.json', groups: ['Lightsaber'], key: (a) => a.identityKey },
  { id: '4C', name: 'Pistol', file: 'data/audits/item-weapons-phase-4c-pistol-semantic-rolling.json', groups: ['Pistol'], key: (a) => a.identityKey },
  { id: '4D', name: 'Rifle', file: 'data/audits/item-weapons-phase-4d-rifle-semantic-rolling.json', groups: ['Rifle', 'Rifle (Special)'], key: (a) => a.identityKey },
  { id: '4E', name: 'Advanced Melee Weapon', file: 'data/audits/item-weapons-phase-4e-advanced-melee-semantic-rolling.json', groups: ['Advanced Melee Weapon'], key: (a) => a.phase3BIdentityKey },
  { id: '4F', name: 'Heavy Weapon', file: 'data/audits/item-weapons-phase-4f-heavy-semantic-rolling.json', groups: ['Heavy Weapon', 'Heavy Weapon (Ammunition)'], adjunct: ['weapon-interchangeable-weapon-system'], key: (a) => a.identityKey },
  { id: '4G', name: 'Exotic Weapon', file: 'data/audits/item-weapons-phase-4g-exotic-semantic-rolling.json', groups: ['Exotic Weapon'], key: (a) => a.identityKey },
];

export const CARRIED_DISCREPANCIES = [
  { id: 'DH23_DESCRIPTION_PAGE', identityKey: 'weapon-dh-23-blaster-pistol', status: 'UNVERIFIED_PRIMARY_SOURCE_PDF_REQUIRED', phase3B: { descriptionPage: 61, statTablePage: 61 }, phase4C: { descriptionPage: 62, statTablePage: 61 }, evidence: 'Clone Wars Campaign Guide OCR text places the DH-23 description box in the same text block as the weapons table (stat table p.61), which weakly favours p.61, but OCR order is not page authority and the PDF is not available in this environment.', disposition: 'Neither authority was changed. Phase 3B (controlling canonical authority) is carried provisionally. Needs a visual PDF check; provenance metadata only, no semantic effect.' },
  { id: 'MASSASSI_LANVAROK_SPECIES_CONFLICT', identityKey: 'weapon-massassi-lanvarok', status: 'FROZEN_PHASE3B_RULING_CONTROLS', rule: 'KOTOR Massassi species text: Massassi treat the lanvarok as a simple weapon. Massassi lanvarok weapon entry: Massassi treat it as an advanced melee weapon. Phase 3B froze the weapon-entry advanced-melee reading; both are preserved, not merged.' },
  { id: 'XERROL_NIGHTSTINGER_GROUP', identityKey: 'weapon-xerrol-nightstinger', status: 'PHASE3B_EXOTIC_CLASSIFICATION_CONTROLS', rule: 'Phase 1 prose called it a Rifle; frozen Phase 3B places it in the Exotic proficiency census. No rifle semantic tag.' },
  { id: 'TEHKLA_NAGAI_ROUTE', identityKey: 'unmapped::Tehkla Blade', status: 'CORRECTED_IN_PHASE_4H_A4', rule: 'Nagai treat tehk\'la blades as simple weapons instead of exotic weapons (Legacy Era Campaign Guide). Added structurally; Exotic alternate-case count 9 -> 10. Native Exotic classification and every semantic tag unchanged.' },
  { id: 'VIBRO_SAW_DR_BYPASS', identityKey: 'unmapped::Vibro-Saw', status: 'ONTOLOGY_GAP_STRUCTURAL', rule: 'DAMAGE_REDUCTION_BYPASS stays structured mechanics; damage_reduction means possessing DR and must not be used.' },
  { id: 'SITH_LANVAROK_KISSAI_FAMILIARITY', identityKey: 'weapon-sith-lanvarok', status: 'OPEN_PLANNER_QUESTION', rule: 'KOTOR Kissai species: Kissai treat "the lanvarok" as a simple weapon instead of an exotic weapon. The source does not say which lanvarok variety. No alternate route added until the planner rules.' },
];

export function buildPhase4HA() {
  const b3 = readJson('data/audits/item-weapons-phase-3b-canonical-authority.json');
  const freeze = readJson('data/audits/item-weapons-phase-3d-global-freeze.json');
  if (freeze.status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') throw new Error('Phase 4H-A requires the Phase 3D freeze');
  const fail = (m) => { throw new Error(`Phase 4H-A: ${m}`); };
  const byKey = new Map(b3.identities.map((i) => [i.identityKey, i]));
  const inputs = { 'data/audits/item-weapons-phase-3b-canonical-authority.json': sha(readText('data/audits/item-weapons-phase-3b-canonical-authority.json')) };
  const per = [], seen = new Map(); let records = 0; const repoMismatch = [];
  for (const c of CATEGORIES) {
    const text = readText(c.file); inputs[c.file] = sha(text);
    const keys = JSON.parse(text).assignments.map(c.key);
    if (keys.some((k) => !k)) fail(`${c.id} has an assignment without a Phase 3B identity key`);
    if (new Set(keys).size !== keys.length) fail(`${c.id} duplicates an identity inside its own category`);
    const want = b3.identities.filter((i) => c.groups.includes(i.weaponGroup)).map((i) => i.identityKey).concat(c.adjunct || []);
    const wantSet = [...new Set(want)].sort(cmp);
    if (JSON.stringify([...keys].sort(cmp)) !== JSON.stringify(wantSet)) fail(`${c.id} identity set differs from the Phase 3B group(s) ${c.groups.join(' + ')}`);
    for (const k of keys) {
      if (!byKey.has(k)) fail(`${c.id} unexpected identity ${k}`);
      seen.set(k, [...(seen.get(k) || []), c.id]);
    }
    const assignments = JSON.parse(text).assignments;
    for (const a of assignments) { const k = c.key(a), r = a.repo; if (r && typeof r.present === 'boolean') { const t = byKey.get(k).repo; if (r.present !== t.present || (r.present && r.id !== t.id)) repoMismatch.push(`${c.id}:${k}`); } }
    records += keys.length;
    per.push({ phase: c.id, category: c.name, records: keys.length, phase3BGroups: c.groups, adjunctIdentities: c.adjunct || [] });
  }
  const unique = [...seen.keys()].sort(cmp);
  const missing = b3.identities.map((i) => i.identityKey).filter((k) => !seen.has(k)).sort(cmp);
  const unexpected = unique.filter((k) => !byKey.has(k));
  const duplicates = unique.filter((k) => seen.get(k).length > 1);
  const repoPresent = unique.filter((k) => byKey.get(k).repo.present).length;
  const census = { categoryRecords: records, uniqueIdentities: unique.length, repoPresent, repoMissing: unique.length - repoPresent, duplicates: duplicates.map((k) => ({ identityKey: k, canonicalName: byKey.get(k).canonicalName, categories: seen.get(k) })), missingIdentities: missing, unexpectedIdentities: unexpected, repoMappingMismatchesVsPhase3B: repoMismatch, byCategory: per };
  if (records !== EXPECTED.categoryRecords || unique.length !== EXPECTED.uniqueIdentities || missing.length || unexpected.length || repoMismatch.length) fail(`census failed: ${JSON.stringify({ records, unique: unique.length, missing, unexpected, repoMismatch })}`);
  if (JSON.stringify(duplicates) !== JSON.stringify(EXPECTED.duplicates)) fail(`unexpected duplicate set ${duplicates.join(',')}`);
  if (repoPresent !== EXPECTED.repoPresent || unique.length - repoPresent !== EXPECTED.repoMissing) fail('repo present/missing counts drifted from Phase 3B');
  const exo = readJson('data/audits/item-weapons-phase-4g-exotic-semantic-rolling.json');
  const json = JSON.stringify({
    schemaVersion: 'weapon-phase-4h-a-authority-reconciliation-v1', phase: '4H-A', family: 'weapons', status: STATUS, authorityOnly: true, productionMutationAuthorized: false,
    census, corrections: exo.phase4hCorrections, carriedDiscrepancies: CARRIED_DISCREPANCIES, inputs,
  }, null, 2) + '\n';
  const md = `# Phase 4H-A — Weapon Authority Reconciliation

**Status:** \`${STATUS}\` (authority-only; no production mutation)

## Census

- Phase 4 category records: **${census.categoryRecords}**
- Unique canonical identities: **${census.uniqueIdentities}** (Phase 3B: ${b3.identities.length})
- Repo-present / repo-missing: **${census.repoPresent} / ${census.repoMissing}**
- Missing identities: **${missing.length}** · unexpected identities: **${unexpected.length}** · repo-mapping mismatches vs Phase 3B: **${repoMismatch.length}**
- Intentional cross-category duplicate: ${census.duplicates.map((d) => `**${d.canonicalName}** (${d.categories.join(' + ')})`).join(', ')}

| Phase | Category | Records | Phase 3B group(s) |
| --- | --- | ---: | --- |
${per.map((p) => `| ${p.phase} | ${p.category} | ${p.records} | ${p.phase3BGroups.join(' + ')}${p.adjunctIdentities.length ? ` (+ adjunct ${p.adjunctIdentities.join(', ')})` : ''} |`).join('\n')}

## Corrections applied in 4H-A (selector / provenance only; no semantic tag changed)

${exo.phase4hCorrections.map((c) => `- **${c.id}** (${c.scope}): ${c.change}`).join('\n')}

## Carried authority discrepancies

${CARRIED_DISCREPANCIES.map((d) => `- **${d.id}** — \`${d.status}\`: ${d.rule || d.disposition}${d.evidence ? ` ${d.evidence}` : ''}`).join('\n')}

## Inputs

${Object.entries(inputs).map(([k, v]) => `- ${k}: \`${v}\``).join('\n')}
`;
  return { json, md };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { json, md } = buildPhase4HA();
  if (process.argv.includes('--check')) {
    const bad = [];
    if (readText(OUT_JSON) !== json) bad.push(OUT_JSON);
    if (readText(OUT_MD) !== md) bad.push(OUT_MD);
    if (bad.length) { console.error(`Phase 4H-A: committed output is stale or hand-edited: ${bad.join(', ')}`); process.exit(1); }
    console.log('Phase 4H-A reconciliation OK: committed outputs are byte-identical to a rebuild');
  } else {
    fs.writeFileSync(path.join(ROOT, OUT_JSON), json);
    fs.writeFileSync(path.join(ROOT, OUT_MD), md);
    console.log(`wrote ${OUT_JSON} and ${OUT_MD}`);
  }
}
