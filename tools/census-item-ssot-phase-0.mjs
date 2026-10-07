#!/usr/bin/env node
/**
 * Item Phase 0 — Architecture / SSOT census (weapons, armor, equipment, upgrades, implants).
 *
 * Makes ZERO semantic decisions. Measures where item data lives, how the layers relate,
 * and which runtime consumers read which layer. Deterministic: same repo => same output.
 *
 *   node tools/census-item-ssot-phase-0.mjs            # write data/audits/item-phase-0-ssot-census.json
 *   node tools/census-item-ssot-phase-0.mjs --check    # fail if the committed JSON is stale
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/audits/item-phase-0-ssot-census.json');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const readDb = (name) => fs.readFileSync(path.join(ROOT, 'packs', `${name}.db`), 'utf8')
  .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const count = (arr, fn) => arr.reduce((m, x) => { const k = String(fn(x)); m[k] = (m[k] || 0) + 1; return m; }, {});
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const FAMILIES = {
  weapons: { aggregate: 'weapons', subpacks: ['weapons-exotic', 'weapons-grenades', 'weapons-heavy', 'weapons-lightsabers', 'weapons-pistols', 'weapons-rifles', 'weapons-simple'] },
  armor: { aggregate: 'armor', subpacks: ['armor-heavy', 'armor-light', 'armor-medium', 'armor-shields'] },
  equipment: { aggregate: 'equipment', subpacks: ['equipment-comlinks', 'equipment-medical', 'equipment-other', 'equipment-security', 'equipment-survival', 'equipment-tech', 'equipment-tools'] }
};
const STANDALONE_PACKS = ['lightsaber-accessories', 'lightsaber-crystals', 'vehicle-weapons', 'vehicle-weapon-ranges', 'poisons'];

// ---- pack inventory ---------------------------------------------------------------
const systemJson = readJson('system.json');
const registered = new Set(systemJson.packs.map((p) => p.name));

function packProfile(name) {
  const recs = readDb(name);
  const sys = (r) => r.system || {};
  const filled = (v) => v !== undefined && v !== null && v !== '' && v !== 0 && !(Array.isArray(v) && !v.length);
  return {
    pack: name,
    registeredInSystemJson: registered.has(name),
    records: recs.length,
    types: sortObj(count(recs, (r) => r.type)),
    schemaVersion: sortObj(count(recs, (r) => sys(r).schemaVersion ?? 'unstamped')),
    uniqueIds: new Set(recs.map((r) => r._id)).size,
    uniqueNames: new Set(recs.map((r) => r.name)).size,
    provenanceFieldCoverage: {
      'system.source': recs.filter((r) => filled(sys(r).source)).length,
      'system.sourcebook': recs.filter((r) => filled(sys(r).sourcebook)).length,
      'system.page': recs.filter((r) => filled(sys(r).page)).length
    },
    sourcebookValues: sortObj(count(recs.filter((r) => filled(sys(r).sourcebook) || filled(sys(r).source)), (r) => sys(r).sourcebook || sys(r).source)),
    tagFieldCoverage: {
      'system.tags': recs.filter((r) => filled(sys(r).tags)).length,
      'system.traits': recs.filter((r) => filled(sys(r).traits)).length,
      'system.properties': recs.filter((r) => filled(sys(r).properties)).length,
      'metadata.tags(any)': recs.filter((r) => r.metadata?.tags || sys(r).metadata?.tags).length
    },
    systemKeysUniversal: Object.entries(recs.reduce((m, r) => { Object.keys(sys(r)).forEach((k) => { m[k] = (m[k] || 0) + 1; }); return m; }, {}))
      .filter(([, n]) => n === recs.length).map(([k]) => k).sort()
  };
}

const families = {};
for (const [fam, { aggregate, subpacks }] of Object.entries(FAMILIES)) {
  const A = new Map(readDb(aggregate).map((r) => [r._id, r]));
  const S = new Map();
  let duplicateIdAcrossSubpacks = 0;
  for (const sp of subpacks) for (const r of readDb(sp)) { if (S.has(r._id)) duplicateIdAcrossSubpacks++; S.set(r._id, r); }
  const onlyAggregate = [...A.keys()].filter((i) => !S.has(i));
  const onlySubpack = [...S.keys()].filter((i) => !A.has(i));
  const shared = [...S.keys()].filter((i) => A.has(i));
  const keysOnlyInAggregate = {}; const valueDiffs = {}; const valueDiffExamples = {};
  for (const i of shared) {
    const a = A.get(i).system || {}; const s = S.get(i).system || {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(s)])) {
      if (!(k in s)) keysOnlyInAggregate[k] = (keysOnlyInAggregate[k] || 0) + 1;
      else if (!(k in a)) keysOnlyInAggregate[`-${k}`] = (keysOnlyInAggregate[`-${k}`] || 0) + 1;
      else if (!eq(a[k], s[k])) { valueDiffs[k] = (valueDiffs[k] || 0) + 1; (valueDiffExamples[k] ||= []).push({ name: S.get(i).name, subpack: s[k], aggregate: a[k] }); }
    }
  }
  const nameCounts = count([...S.values()], (r) => r.name);
  families[fam] = {
    aggregatePack: aggregate,
    subpacks,
    aggregateRecords: A.size,
    subpackUnionRecords: S.size,
    duplicateIdAcrossSubpacks,
    onlyInAggregate: onlyAggregate.map((i) => ({ _id: i, name: A.get(i).name, type: A.get(i).type })),
    onlyInSubpacks: onlySubpack.length,
    sharedIds: shared.length,
    sharedIdsWithIdenticalFullRecord: shared.filter((i) => eq(A.get(i), S.get(i))).length,
    sharedIdsWithDifferentSystem: shared.filter((i) => !eq(A.get(i).system, S.get(i).system)).length,
    systemKeysPresentOnlyInAggregate: sortObj(keysOnlyInAggregate),
    systemValueDiffsOnSharedKeys: sortObj(valueDiffs),
    systemValueDiffExamples: Object.fromEntries(Object.entries(valueDiffExamples).map(([k, v]) => [k, v.slice(0, 4)])),
    sameNameWithinSubpackUnion: Object.entries(nameCounts).filter(([, n]) => n > 1).map(([n]) => n).sort()
  };
}

const packs = {};
for (const { aggregate, subpacks } of Object.values(FAMILIES)) for (const n of [aggregate, ...subpacks]) packs[n] = packProfile(n);
for (const n of STANDALONE_PACKS) packs[n] = packProfile(n);

// ---- auxiliary data layers ---------------------------------------------------------
const packIdsByFamily = {
  weapon: new Map(readDb('weapons').map((r) => [r._id, r.name])),
  armor: new Map(readDb('armor').map((r) => [r._id, r.name])),
  equipment: new Map(readDb('equipment').map((r) => [r._id, r.name]))
};
const storeLayers = {};
for (const [fam, file] of [['weapon', 'weapon'], ['armor', 'armor'], ['equipment', 'equipment']]) {
  const rows = readJson(`data/store/${file}-store-descriptions.json`);
  const ids = packIdsByFamily[fam];
  storeLayers[`data/store/${file}-store-descriptions.json`] = {
    records: rows.length,
    idMatchesAggregatePack: rows.filter((r) => ids.has(r.id)).length,
    nameMatchesAggregatePack: rows.filter((r) => [...ids.values()].includes(r.name)).length,
    aggregatePackRecordsWithoutStoreDescription: [...ids.entries()].filter(([i]) => !rows.some((r) => r.id === i)).map(([, n]) => n).sort()
  };
}
for (const f of ['modification', 'implant', 'droid', 'vehicle']) {
  const rows = readJson(`data/store/${f}-store-descriptions.json`);
  storeLayers[`data/store/${f}-store-descriptions.json`] = { records: rows.length, note: 'out of Phase 0 family scope unless a later phase claims it' };
}

const packArmorNames = new Set(['armor-light', 'armor-medium', 'armor-heavy'].flatMap((p) => readDb(p).map((r) => r.name)));
const legacyArmorJson = {};
for (const f of ['light', 'medium', 'heavy']) {
  const rows = readJson(`data/armor/${f}.json`);
  legacyArmorJson[`data/armor/${f}.json`] = {
    records: rows.length,
    namesPresentInArmorSubpacks: rows.filter((r) => packArmorNames.has(r.name)).length,
    namesAbsentFromArmorSubpacks: rows.filter((r) => !packArmorNames.has(r.name)).map((r) => r.name).sort()
  };
}

const packUpgradeNames = new Set(['weapons', 'lightsaber-accessories', 'lightsaber-crystals'].flatMap((p) => readDb(p).filter((r) => r.type === 'weaponUpgrade').map((r) => r.name)));
const upgradeJson = {};
for (const f of ['armor-upgrades', 'universal-upgrades', 'weapon-upgrades']) {
  const rows = readJson(`data/upgrades/${f}.json`);
  upgradeJson[`data/upgrades/${f}.json`] = { records: rows.length, namesInWeaponUpgradePacks: rows.filter((r) => packUpgradeNames.has(r.name)).length };
}

// JS-resident catalogs (authoritative for the customization workbench at runtime)
const jsCatalogs = {};
for (const [file, exp] of [['armor-upgrades', 'ARMOR_UPGRADES'], ['blaster-upgrades', 'BLASTER_UPGRADES'], ['melee-upgrades', 'MELEE_UPGRADES'], ['gear-mods', 'GEAR_MODS']]) {
  const mod = await import(pathToFileURL(path.join(ROOT, `scripts/data/${file}.js`)).href);
  jsCatalogs[`scripts/data/${file}.js`] = { export: exp, entries: Object.keys(mod[exp]).length };
}
{
  const src = fs.readFileSync(path.join(ROOT, 'scripts/engine/customization/upgrade-catalog.js'), 'utf8');
  jsCatalogs['scripts/engine/customization/upgrade-catalog.js'] = { export: 'UPGRADE_CATALOG', entries: (src.match(/^\s*def\('/gm) || []).length, note: 'counted by def( call sites' };
}

// ---- consumers --------------------------------------------------------------------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'packs', 'assets', 'reference'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(js|mjs|hbs)$/.test(e.name)) out.push(p);
  }
  return out;
}
const codeFiles = ['scripts', 'tools', 'helpers', 'templates', 'index.js'].flatMap((d) => {
  const p = path.join(ROOT, d); if (!fs.existsSync(p)) return [];
  return fs.statSync(p).isDirectory() ? walk(p) : [p];
});
// Audit tooling is not a runtime consumer; exclude the census and the authority verifier from the scan.
const AUDIT_TOOLS = new Set(['tools/census-item-ssot-phase-0.mjs', 'tools/verify-item-weapons-authority.mjs']);
const sources = new Map(codeFiles.filter((f) => !AUDIT_TOOLS.has(rel(f))).map((f) => [rel(f), fs.readFileSync(f, 'utf8')]));
const grepFiles = (re) => [...sources].filter(([, s]) => re.test(s)).map(([f]) => f).sort();

const packRefRe = (names) => new RegExp(`foundryvtt-swse\\.(${names.join('|')})\\b(?![-\\w])`);
const consumers = {};
for (const [fam, { aggregate, subpacks }] of Object.entries(FAMILIES)) {
  consumers[fam] = {
    referencesAggregatePack: grepFiles(packRefRe([aggregate])),
    referencesSubpacks: grepFiles(packRefRe(subpacks))
  };
}
const consumerOf = (label, re) => { consumers[label] = grepFiles(re); };
consumerOf('data/store/*-store-descriptions.json', /-store-descriptions/);
consumerOf('data/upgrades/*.json', /data\/upgrades|weapon-upgrades\.json|armor-upgrades\.json|universal-upgrades/);
consumerOf('data/armor/{light,medium,heavy}.json', /data\/armor\/|armor\/(light|medium|heavy)\.json/);
consumerOf('data/gear-templates.json (file path)', /gear-templates\.json/);
consumerOf('scripts/data/gear-templates.js (module)', /data\/gear-templates\.js/);
consumerOf('data/vehicle-weapons.json', /data\/vehicle-weapons\.json/);
consumerOf('data/vehicle-modifications/*.json', /vehicle-modifications\/(accessories|defense-systems|movement-systems|weapon-systems)/);
consumerOf('data/implants/*', /implants\/(implant-reference-catalog|sample-implant-items|implant-effects)/);
consumerOf('WorldDataLoader.loadWeapons|loadArmor|loadEquipment', /WorldDataLoader/);
consumerOf('schemaVersion-aware item readers (system.combat / system.economics / system.defense)', /system\.(combat|economics)\b|system\.defense\b|\.system\?\.(combat|economics|defense)\b/);

const worldLoader = fs.readFileSync(path.join(ROOT, 'scripts/core/world-data-loader.js'), 'utf8');
const legacyLoader = {
  file: 'scripts/core/world-data-loader.js',
  fetchTargets: ['weapons', 'armor', 'equipment'].map((n) => {
    const m = worldLoader.match(new RegExp(`systems/foundryvtt-swse/data/${n}\\.json`));
    return { target: `data/${n}.json`, referenced: !!m, existsOnDisk: fs.existsSync(path.join(ROOT, 'data', `${n}.json`)) };
  }),
  autoLoadCallsLoadAll: /^\s*await this\.loadAll\(\);/m.test(worldLoader),
  note: 'autoLoad() has loadAll() commented out; loadWeapons/loadArmor/loadEquipment fetch files that do not exist.'
};

// ---- source text + builders -------------------------------------------------------
const sourcebookDir = path.join(ROOT, 'reference/sourcebooks');
const sourceTexts = fs.readdirSync(sourcebookDir).filter((f) => f.endsWith('.txt')).sort().map((f) => ({ file: `reference/sourcebooks/${f}`, bytes: fs.statSync(path.join(sourcebookDir, f)).size }));
const pdfs = [];
(function findPdf(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === '.git' || e.name === 'node_modules') continue; const p = path.join(d, e.name); if (e.isDirectory()) findPdf(p); else if (/\.pdf$/i.test(e.name)) pdfs.push(rel(p)); } })(ROOT);

const toolFiles = fs.readdirSync(path.join(ROOT, 'tools')).filter((f) => /\.(js|mjs|py|sh)$/.test(f));
// scripts that name a family .db file (writers AND read-only audits; classification is a Phase 0 follow-up)
const packWriters = toolFiles.filter((f) => /packs[\\/'",\s]+.*(weapons|armor|equipment)|(weapons|armor|equipment)\.db/.test(fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8')))
  .map((f) => `tools/${f}`).sort();

// ---- assemble ---------------------------------------------------------------------
const census = {
  schemaVersion: 1,
  authorityType: 'item-phase-0-ssot-census',
  scope: 'weapons, armor, equipment, upgrades/modifications, lightsaber parts, implants, vehicle weapons (identified, not yet claimed)',
  semanticDecisionsMade: 0,
  generatedBy: 'tools/census-item-ssot-phase-0.mjs',
  packs,
  families,
  auxiliaryDataLayers: { storeDescriptions: storeLayers, legacyArmorJson, upgradeJson, jsCatalogs },
  consumers,
  legacyLoader,
  sourceMaterial: { sourcebookTxt: sourceTexts, pdfsInRepo: pdfs },
  toolsReferencingFamilyDbFiles: packWriters,
  packageJsonPresent: fs.existsSync(path.join(ROOT, 'package.json'))
};

const text = `${JSON.stringify(census, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== text) { console.error(`STALE: ${rel(OUT)} differs from a fresh census`); process.exit(1); }
  console.log('item phase 0 census is current');
} else {
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${rel(OUT)} (${text.length} bytes)`);
}
