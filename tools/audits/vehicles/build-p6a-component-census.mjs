#!/usr/bin/env node
/**
 * P6A - Canonical starship component census, 187-record reconciliation, certification ledger and
 * Shipyard readiness manifest.
 *
 * Inputs (all committed): the OCR texts (SHA-256 pinned per book), the curated census sources
 * (data/audits/vehicles/p6a/census-sources.json: every entry carries OCR line anchors re-checked here),
 * the Starships of the Galaxy table evidence (swse-p2-sotg-modification-evidence.json), the catalog
 * (data/vehicle-modifications/*.json), certification.json and the implemented effects module.
 *
 * Outputs (data/audits/vehicles/p6a/): registry.json, reconciliation.json, certification-ledger.json,
 * readiness-manifest.json, pdf-review-worksheet.json. Discovery/uncertain data never enters production files.
 *
 * Usage: node tools/audits/vehicles/build-p6a-component-census.mjs --write | --check
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { EFFECTS } from '../../../scripts/domain/vehicles/vehicle-modification-effects.js';

const MODE = process.argv[2];
if (!['--write', '--check'].includes(MODE)) { console.error('usage: --write|--check'); process.exit(2); }
const OUT = 'data/audits/vehicles/p6a';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sources = read(`${OUT}/census-sources.json`);
const evidence = read('data/audits/vehicles/swse-p2-sotg-modification-evidence.json');
const certification = read('data/vehicle-modifications/certification.json').rows;
const CATALOG_FILES = ['movement-systems', 'defense-systems', 'weapon-systems', 'accessories'];
const catalog = CATALOG_FILES.flatMap(f => read(`data/vehicle-modifications/${f}.json`).map(e => ({ ...e, _file: f })));
const byId = new Map(catalog.map(e => [e.id, e]));
const failures = [];
const fail = msg => failures.push(msg);

/* ---------- OCR with SHA pinning and anchor verification ---------- */
const ocr = {};
const bookMeta = {};
for (const [title, b] of Object.entries(sources.books)) {
  const raw = fs.readFileSync(`reference/sourcebooks/${b.file}`, 'utf8');
  ocr[title] = raw.split('\n');
  bookMeta[title] = { file: b.file, sha256: crypto.createHash('sha256').update(raw).digest('hex'), status: b.status, scope: b.scope };
}
function checkAnchor(title, a, what) {
  const lines = ocr[title];
  for (let d = 0; d <= 3; d++) for (const ln of [a.line - d, a.line + d]) {
    const t = lines[ln - 1];
    if (t !== undefined && a.contains.every(c => t.includes(c))) return { line: ln, text: t.trim() };
  }
  fail(`ANCHOR_NOT_FOUND ${title}:${a.line} ${JSON.stringify(a.contains)} (${what})`);
  return null;
}

/* ---------- registry ---------- */
const registry = [];
const SOTG = 'Starships of the Galaxy';
// 1. SotG movement/defense/weapon rows: the existing evidence comparison (already reproducible and PDF-reviewed where noted)
for (const row of evidence.catalogComparison.rows.filter(r => r.table)) {
  const cat = byId.get(row.catalogId);
  registry.push({
    censusId: `sotg-${row.catalogId}`, name: row.printedName ?? cat?.name, book: SOTG, category: cat?.category ?? null,
    table: `${row.table} table`, page: row.table === 'weapon' ? { value: null, resolution: 'WEAPON_SECTION_PP_44_48' } : { value: row.table === 'movement' ? 41 : 43, resolution: 'PDF_TABLE_PAGE' },
    evidenceStatus: row.status, differences: row.differences ?? [], noisy: row.noisy ?? [], installable: true, catalogIds: [row.catalogId], origin: 'swse-p2-sotg-modification-evidence'
  });
}
// 2. SotG accessory table, parsed from the OCR columns (names / availability / cost are aligned; EP and size are not)
{
  const t = sources.books[SOTG].accessoryTable, L = ocr[SOTG];
  const block = ([a, b]) => L.slice(a - 1, b).map(s => s.trim()).filter(Boolean);
  const names = block(t.nameLines).map(n => n.replace('|FF', 'IFF'));
  const avail = block(t.availabilityLines);
  const costs = []; for (let i = t.costHeaderLine; costs.length < t.rowCount && i < L.length; i++) { const s = L[i].trim(); if (/credits/.test(s)) costs.push(s); }
  if (names.length !== t.rowCount || avail.length !== t.rowCount || costs.length !== t.rowCount)
    fail(`SOTG_ACCESSORY_COLUMNS_MISALIGNED names=${names.length} availability=${avail.length} cost=${costs.length}`);
  names.forEach((name, i) => {
    const m = /^([\d,]+) credits( base)?$/.exec(costs[i] ?? '');
    const catalogId = sources.books[SOTG].accessoryCatalogMap[name];
    if (!catalogId) fail(`SOTG_ACCESSORY_UNMAPPED ${name}`);
    registry.push({
      censusId: `sotg-${catalogId ?? name}`, name, book: SOTG, category: 'Accessory', table: 'Accessories table',
      page: { value: null, resolution: 'ACCESSORY_SECTION_PP_48_53' },
      cells: {
        availability: { value: avail[i], evidence: 'OCR_CLEAN' },
        cost: m ? { value: Number(m[1].replace(/,/g, '')), costType: m[2] ? 'base' : 'flat', evidence: 'OCR_CLEAN' } : { value: null, evidence: 'OCR_NOISY_NEEDS_PDF' },
        emplacementPoints: { value: null, evidence: 'OCR_NOISY_NEEDS_PDF' }, sizeRestriction: { value: null, evidence: 'OCR_NOISY_NEEDS_PDF' }
      },
      installable: true, catalogIds: catalogId ? [catalogId] : [], origin: 'p6a-accessory-columns'
    });
  });
}
// 3. curated entries (all books)
for (const [title, b] of Object.entries(sources.books)) {
  for (const e of b.entries ?? []) {
    const anchors = e.anchors.map(a => checkAnchor(title, a, e.censusId)).filter(Boolean);
    registry.push({ ...e, book: title, anchors, origin: 'p6a-curated' });
  }
  for (const [name, line, ids] of b.headingEntries ?? []) {
    const contains = b.headingContains?.[name] ?? name;
    const a = checkAnchor(title, { line, contains: [contains] }, name);
    registry.push({ censusId: `sav-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, book: title, category: 'Accessory', table: 'Starship Systems',
      page: { value: null, resolution: 'OCR_UNREADABLE_NEEDS_PDF' }, cells: { all: { value: null, evidence: 'OCR_UNREADABLE_NEEDS_PDF' } },
      anchors: a ? [a] : [], installable: true, catalogIds: ids, origin: 'p6a-heading' });
  }
  for (const x of b.excluded ?? []) checkAnchor(title, x, 'excluded:' + x.name);
}
const ids = new Set();
for (const r of registry) { if (ids.has(r.censusId)) fail('DUPLICATE_CENSUS_ID ' + r.censusId); ids.add(r.censusId); }

/* ---------- reconciliation of the 187 catalog records ---------- */
const claimed = new Map();
for (const r of registry) for (const id of r.catalogIds ?? []) { if (!byId.has(id)) fail(`CENSUS_CLAIMS_UNKNOWN_CATALOG_ID ${r.censusId} -> ${id}`); (claimed.get(id) ?? claimed.set(id, []).get(id)).push(r); }
const statblock = new Map(sources.statblockOnly.map(s => [s.catalogId, s]));
const norm = v => (typeof v === 'string' ? v.trim().toLowerCase() : v);
function compareCells(cat, cells) {
  const differences = [], unresolved = [], matched = [];
  for (const [field, c] of Object.entries(cells ?? {})) {
    if (field === 'all') { unresolved.push('all'); continue; }
    if (c.evidence === 'NOT_PRINTED') { if (cat[field] !== undefined && cat[field] !== null && cat[field] !== '') differences.push({ field, catalog: cat[field], printed: null, note: 'the source prints no value; catalog value has no source' }); else matched.push(field); continue; }
    if (!['OCR_CLEAN', 'PDF_REVIEWED'].includes(c.evidence)) { unresolved.push(field); continue; }
    const catalogValue = field === 'cost' ? cat.cost : cat[field];
    if (field === 'cost') {
      if (typeof c.value === 'number' && (catalogValue !== c.value || (c.costType && cat.costType !== c.costType))) differences.push({ field, catalog: `${catalogValue} ${cat.costType}`, printed: `${c.value} ${c.costType}` });
      else matched.push(field);
    } else if (norm(catalogValue ?? null) !== norm(c.value)) differences.push({ field, catalog: catalogValue ?? null, printed: c.value, ...(c.basis ? { basis: c.basis } : {}) });
    else matched.push(field);
  }
  return { differences, unresolved, matched };
}
const reconciliation = catalog.map(cat => {
  const hits = claimed.get(cat.id) ?? [];
  const base = { catalogId: cat.id, catalogFile: cat._file, catalogName: cat.name };
  if (!hits.length) {
    const s = statblock.get(cat.id);
    if (s) { const a = checkAnchor(s.book, s, 'statblock:' + cat.id); return { ...base, disposition: 'NOT_FOUND_IN_SOURCE', basis: 'STATBLOCK_EQUIPMENT_ONLY', evidence: { book: s.book, ...a }, note: s.note }; }
    return { ...base, disposition: 'NOT_FOUND_IN_SOURCE', basis: 'NO_SOURCE_LOCATED', note: 'not located in any of the 14 OCR texts as an installable option; the Scum and Villainy chapter OCR is corrupted, so a PDF check is still advised' };
  }
  const r = hits[0];
  const out = { ...base, censusId: r.censusId, book: r.book, page: r.page };
  if (r.origin === 'swse-p2-sotg-modification-evidence') {
    const st = r.evidenceStatus;
    if (st === 'SOURCE_VERIFIED_TEXT' || st === 'PDF_REVIEWED') return { ...out, disposition: 'MATCHED_CANONICAL', evidence: st };
    if (st === 'OCR_ROW_DIFFERS_FROM_CATALOG') return { ...out, disposition: 'CORRECTION_REQUIRED', applyStatus: 'APPLY', differences: r.differences };
    return { ...out, disposition: 'UNRESOLVED_SOURCE', unresolved: r.noisy.map(n => n.cell ?? n), evidence: st };
  }
  const cmp = compareCells(cat, r.cells);
  if (hits.length > 1) out.alsoClaimedBy = hits.slice(1).map(h => h.censusId);
  if (r.catalogIds.length > 1) out.sharedCensusEntry = r.catalogIds;
  // A difference read from an inferred column alignment (SotG accessory OCR) is a candidate only; the PDF decides.
  const applyStatus = r.origin === 'p6a-accessory-columns' ? 'PDF_CONFIRMATION_REQUIRED' : 'APPLY';
  if (cmp.differences.length) return { ...out, disposition: 'CORRECTION_REQUIRED', applyStatus, differences: cmp.differences, unresolved: cmp.unresolved, matched: cmp.matched };
  if (cmp.unresolved.length) return { ...out, disposition: 'UNRESOLVED_SOURCE', unresolved: cmp.unresolved, matched: cmp.matched };
  return { ...out, disposition: 'MATCHED_CANONICAL', matched: cmp.matched };
});
const missing = registry.filter(r => r.installable && !(r.catalogIds ?? []).length)
  .map(r => ({ censusId: r.censusId, name: r.name, book: r.book, category: r.category, subtype: r.subtype ?? null, aliasOf: r.aliasOf ?? null, effectSummary: r.effectSummary ?? null, disposition: r.aliasOf ? 'ALIAS_OF_EXISTING' : 'MISSING_FROM_CATALOG' }));

/* ---------- certification ledger and readiness ---------- */
const OPERATIONAL_KINDS = new Set(['armor', 'shield', 'dexterity', 'hyperdrive']);
const ledger = catalog.map(cat => {
  const rec = reconciliation.find(r => r.catalogId === cat.id);
  const cert = certification[cat.id];
  const fx = EFFECTS[cat.id];
  return {
    catalogId: cat.id, name: cat.name, category: cat.category,
    sourceListed: rec.disposition !== 'NOT_FOUND_IN_SOURCE' ? { book: rec.book, censusId: rec.censusId } : null,
    sourceVerified: cert ? { status: cert.status, evidence: cert.evidence, book: cert.book, printedPage: cert.printedPage } : null,
    mechanicSpecified: cert?.status === 'MECHANIC_SPECIFIED' ? { effectKind: fx?.kind ?? null, test: cert.effectTest } : null,
    operationallyIntegrated: fx && OPERATIONAL_KINDS.has(fx.kind) ? 'OFFLINE_INTEGRATED_LIVE_PENDING' : fx ? 'EXPOSED_NOT_APPLIED' : null,
    reconciliation: rec.disposition
  };
});
const readiness = ledger.map(l => ({
  catalogId: l.catalogId, name: l.name,
  exposeAsReference: !!l.sourceListed,
  installable: !!l.mechanicSpecified,
  mechanicallyApplied: l.operationallyIntegrated === 'OFFLINE_INTEGRATED_LIVE_PENDING',
  combatUsable: false,
  reasons: [
    ...(l.sourceListed ? [] : ['NOT_FOUND_IN_SOURCE']),
    ...(l.mechanicSpecified ? [] : [l.sourceVerified ? 'EFFECT_NOT_IMPLEMENTED' : 'NOT_SOURCE_VERIFIED']),
    ...(l.operationallyIntegrated === 'EXPOSED_NOT_APPLIED' ? ['CONDITIONAL_EFFECT_NOT_APPLIED'] : []),
    'NO_EXECUTABLE_WEAPON_AUTHORITY_FROM_CATALOG'
  ]
}));
const worksheet = [
  ...reconciliation.filter(r => r.applyStatus === 'PDF_CONFIRMATION_REQUIRED').map(r => ({ catalogId: r.catalogId, book: r.book, fields: r.differences.map(d => d.field), reason: 'OCR column value disagrees with the catalog: ' + JSON.stringify(r.differences) })),
  ...reconciliation.filter(r => r.disposition === 'UNRESOLVED_SOURCE').map(r => ({ catalogId: r.catalogId, book: r.book, fields: r.unresolved })),
  ...missing.filter(m => m.disposition === 'MISSING_FROM_CATALOG').map(m => ({ censusId: m.censusId, book: m.book, fields: ['all'], reason: 'missing component: confirm printed values before adding' }))
];

/* ---------- write / check ---------- */
const count = (list, key) => list.reduce((m, x) => ((m[x[key]] = (m[x[key]] ?? 0) + 1), m), {});
const files = {
  'registry.json': { schema: 'swse.vehicle.p6a.registry.v1', books: bookMeta, counts: { entries: registry.length, byBook: count(registry, 'book') }, entries: registry },
  'reconciliation.json': { schema: 'swse.vehicle.p6a.reconciliation.v1', counts: { catalog: catalog.length, ...count(reconciliation, 'disposition'), missingFromCatalog: missing.filter(m => m.disposition === 'MISSING_FROM_CATALOG').length }, records: reconciliation, missing },
  'certification-ledger.json': { schema: 'swse.vehicle.p6a.certification-ledger.v1', note: 'Audit dimensions alongside the production certification.json status (unchanged).', counts: {
    sourceListed: ledger.filter(l => l.sourceListed).length, sourceVerified: ledger.filter(l => l.sourceVerified).length, mechanicSpecified: ledger.filter(l => l.mechanicSpecified).length,
    operationallyIntegrated: ledger.filter(l => l.operationallyIntegrated === 'OFFLINE_INTEGRATED_LIVE_PENDING').length }, rows: ledger },
  'readiness-manifest.json': { schema: 'swse.vehicle.p6a.readiness.v1', counts: { exposeAsReference: readiness.filter(r => r.exposeAsReference).length, installable: readiness.filter(r => r.installable).length, mechanicallyApplied: readiness.filter(r => r.mechanicallyApplied).length, combatUsable: 0 }, rows: readiness },
  'pdf-review-worksheet.json': { schema: 'swse.vehicle.p6a.pdf-review-worksheet.v1', note: 'Cells the OCR cannot settle. Fill from the printed PDF; the generator then updates the census sources.', items: worksheet }
};
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
let stale = 0;
for (const [name, body] of Object.entries(files)) {
  const path = `${OUT}/${name}`, text = JSON.stringify(body, null, 1) + '\n';
  if (MODE === '--write') fs.writeFileSync(path, text);
  else if (!fs.existsSync(path) || fs.readFileSync(path, 'utf8') !== text) { console.error('STALE ' + path); stale++; }
}
if (stale) process.exit(1);
console.log(MODE === '--write' ? 'wrote' : 'up to date', JSON.stringify(files['reconciliation.json'].counts));
