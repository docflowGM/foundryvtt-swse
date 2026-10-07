#!/usr/bin/env node
// Phase 5C-8: the ONLY legitimate path to the production weapon packs.
//   data/canonical/weapons.json  -->  packs/weapons.db (+ category packs)  [+ migration aliases]
// Reads nothing but the canonical corpus. `--check` regenerates in memory and requires byte equality with the committed files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, CANONICAL_WEAPONS, readText, sha, cmp, packText, serializeCorpus, sortKeys, slug as slugify } from './lib/canonical-weapons-shared.mjs';
import { projectDocument, projectSystem, categoryPackFor, PROJECTION_TABLE, LIMITATIONS } from './lib/canonical-weapons-projection.mjs';

export const MASTER_PACK = 'packs/weapons.db';
export const CATEGORY_PACKS = ['exotic', 'grenades', 'heavy', 'lightsabers', 'pistols', 'rifles', 'simple'].map((k) => `packs/weapons-${k}.db`);
export const ALIASES = 'data/migrations/weapon-canonical-aliases.json';
export const STORE_DESCRIPTIONS = 'data/store/weapon-store-descriptions.json';
export const PROJECTION_REPORT = 'data/audits/phase-5c-weapon-projection-report.json';

export function buildProduction(corpus = JSON.parse(readText(CANONICAL_WEAPONS))) {
  const docs = [], byRec = new Map(), notes = {};
  for (const rec of corpus.identities) {
    const d = projectDocument(rec, corpus.schemaVersion);
    docs.push(d); byRec.set(d._id, rec); notes[rec.identityKey] = projectSystem(rec).notes;
  }
  docs.sort((a, b) => cmp(a._id, b._id));
  const master = [...docs, ...corpus.nonWeaponPackRecords].sort((a, b) => cmp(a._id, b._id));
  const cats = Object.fromEntries(['exotic', 'grenades', 'heavy', 'lightsabers', 'pistols', 'rifles', 'simple'].map((k) => [k, []]));
  for (const d of docs) cats[categoryPackFor(byRec.get(d._id), d)].push(d);
  const files = { [MASTER_PACK]: packText(master) };
  for (const k of Object.keys(cats)) files[`packs/weapons-${k}.db`] = packText(cats[k]);
  // migration aliases: relationships only, never definitions
  const aliases = {
    schemaVersion: '5C.1', role: 'MIGRATION_ALIAS_ONLY', note: 'Old production ids/names -> canonical production id. Contains no weapon definitions.',
    renamed: corpus.identities.filter((r) => r.production.presentBeforeCutover && r.production.previousName !== r.canonicalName).map((r) => ({ id: r.production.id, oldName: r.production.previousName, canonicalName: r.canonicalName })).sort((a, b) => cmp(a.id, b.id)),
    retired: corpus.retiredProductionRecords.map((r) => ({ oldId: r.oldId, oldName: r.oldName, disposition: r.disposition, canonicalProductionId: r.canonicalProductionId })),
  };
  // store card descriptions: GENERATED_COMPATIBILITY projection of the certified player summary (was a hand-maintained mirror)
  files[STORE_DESCRIPTIONS] = `${JSON.stringify(docs.map((d) => { const r = byRec.get(d._id); return { slug: d._id.startsWith('lightsaber-chassis-') ? d._id.slice('lightsaber-chassis-'.length) : slugify(r.canonicalName), id: d._id, name: r.canonicalName, description: r.summary ?? '' }; }), null, 2)}\n`;
  files[ALIASES] = `${JSON.stringify(aliases, null, 1)}\n`;
  const limitCount = {};
  for (const n of Object.values(notes)) for (const x of n) limitCount[x] = (limitCount[x] ?? 0) + 1;
  files[PROJECTION_REPORT] = `${JSON.stringify({ schemaVersion: '5C.1', role: 'GENERATED_REPORT', corpusSha256: sha(serializeCorpus(corpus)), projectionTable: PROJECTION_TABLE, limitations: LIMITATIONS, limitationCounts: sortKeys(limitCount), perIdentity: sortKeys(notes) }, null, 1)}\n`;
  return { files, counts: { weapons: docs.length, master: master.length, byCategory: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, v.length])) } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files, counts } = buildProduction();
  if (process.argv.includes('--check')) {
    const bad = Object.entries(files).filter(([f, t]) => !fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), 'utf8') !== t).map(([f]) => f);
    if (bad.length) { console.error(`weapon production is stale or hand-edited: ${bad.join(', ')}`); process.exit(1); }
    console.log(`weapon production current: ${JSON.stringify(counts)} master sha256 ${sha(files[MASTER_PACK])}`);
  } else {
    fs.mkdirSync(path.join(ROOT, 'data/migrations'), { recursive: true });
    for (const [f, t] of Object.entries(files)) fs.writeFileSync(path.join(ROOT, f), t);
    console.log(`wrote weapon production: ${JSON.stringify(counts)} master sha256 ${sha(files[MASTER_PACK])}`);
  }
}
