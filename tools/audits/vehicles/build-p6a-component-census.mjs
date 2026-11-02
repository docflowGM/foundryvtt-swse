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
const pdf = read(`${OUT}/print-verified-components-v2.json`);
// Authority precedence: published source -> published errata -> explicit project-owner ruling -> implementation.
const errata = read('data/audits/vehicles/errata/sotg-errata-1.0.json');
const rulings = read(`${OUT}/owner-rulings.json`).rulings;
const rulingFor = id => rulings.find(r => r.catalogIds.includes(id));
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

/* ---------- PDF source authority (independent owner review, print-verified-components-v2.json) ---------- */
// Identity is reconciled HERE: suggestedCatalogId is only a lookup aid. Rows map by explicit alias, then by
// normalized printed name; anything unmapped is reported as missing from the catalog.
const nameKey = v => String(v ?? '').toLowerCase().replace(/[^a-z0-9%+]+/g, ' ').trim();
const catalogByName = new Map(catalog.map(c => [nameKey(c.name), c.id]));
const PDF_ALIASES = { 'point defense weapon': 'point-defense', 'docking clamp': 'docking-clamps', 'hypertransceiver': 'hyper-transceiver', 'holonet transceiver': 'holonet-transceiver',
  'passenger seating': 'passenger-seating', 'passenger quarters': 'passenger-quarters', 'transponder disguised 1': 'transponder-disguised-1', 'transponder disguised 2': 'transponder-disguised-2',
  'transponder disguised 3': 'transponder-disguised-3', 'glowing defoliator launcher': 'defoliator-launcher', 'glowing defoliator shell': 'defoliator-shell', 'gravity mine launcher': 'gravity-mine-launcher',
  'hidden cargo hold 25% of cargo': 'hidden-cargo-25', 'hidden cargo hold 50% of cargo': 'hidden-cargo-50', 'hidden cargo hold 75% of cargo': 'hidden-cargo-75',
  'holding cells 25% of passengers': 'holding-cells-25', 'holding cells 50% of passengers': 'holding-cells-50', 'holding cells 75% of passengers': 'holding-cells-75' };
for (const [printed, id] of Object.entries(sources.books[SOTG].accessoryCatalogMap)) PDF_ALIASES[nameKey(printed)] = id;
for (const r of evidence.catalogComparison.rows.filter(x => x.printedName)) PDF_ALIASES[nameKey(r.printedName)] ??= r.catalogId;
for (const c of catalog.filter(c => /^shields-\d+$/.test(c.id))) PDF_ALIASES[`shields sr ${c.id.split('-')[1]}`] = c.id;
const SIZE = v => (v == null ? null : String(v).toLowerCase().replace(/\s*(starships)?\s*only\s*$/, '').replace(/^none$/, '').trim() || null);
const DMG = v => (v == null ? null : String(v).toLowerCase().replace(/[\s()]/g, ''));
const DMG_PLACEHOLDER = new Set(['seeammunition']); // catalog display label for a launcher; the table prints a dash
function pdfCompare(cat, row) {
  const d = [];
  const ep = row.emplacementPoints ?? null;
  if ((cat.emplacementPoints ?? null) !== ep) d.push({ field: 'emplacementPoints', catalog: cat.emplacementPoints ?? null, printed: ep, printedText: row.emplacementPointsPrinted ?? null, ...(ep === null ? { note: 'printed dash: not stated, not zero' } : {}) });
  if (nameKey(cat.availability ?? '') !== nameKey(row.availability ?? '')) d.push({ field: 'availability', catalog: cat.availability ?? null, printed: row.availability ?? null, ...(row.availabilityState ? { note: row.availabilityState } : {}) });
  if (SIZE(cat.sizeRestriction) !== SIZE(row.sizeRestriction)) d.push({ field: 'sizeRestriction', catalog: cat.sizeRestriction ?? null, printed: row.sizeRestriction ?? null });
  if ('damage' in row || 'damageStatus' in row) {
    const c = DMG(cat.damage), p = DMG(row.damage);
    if (c !== p && !(p === null && DMG_PLACEHOLDER.has(c))) d.push({ field: 'damage', catalog: cat.damage ?? null, printed: row.damage ?? null, printedText: row.damagePrinted ?? null });
  }
  const k = row.cost?.kind;
  if (k === 'base' || k === 'flat') { if (cat.cost !== row.cost.credits || cat.costType !== k) d.push({ field: 'cost', catalog: { cost: cat.cost ?? null, costType: cat.costType }, printed: { cost: row.cost.credits, costType: k }, printedText: row.cost.printed }); }
  else if (k === 'multiplier') { if (cat.costType !== 'multiplier' || cat.costMultiplier !== row.cost.value) d.push({ field: 'costMultiplier', catalog: { costType: cat.costType, costMultiplier: cat.costMultiplier ?? null }, printed: { costType: 'multiplier', costMultiplier: row.cost.value }, printedText: row.cost.printed }); }
  else if (k === 'addition') { if (cat.costType !== 'modifier' || cat.cost !== row.cost.value) d.push({ field: 'cost', catalog: { cost: cat.cost ?? null, costType: cat.costType }, printed: { cost: row.cost.value, costType: 'modifier' }, printedText: row.cost.printed }); }
  return d;
}
const pdfRows = pdf.reviewedTables.flatMap(t => t.rows.map(r => ({ ...r, tableId: t.id })));
// Published errata correct the printed cells (the printed value is kept beside the correction).
for (const c of errata.corrections.filter(c => c.appliesTo)) for (const r of pdfRows) {
  if (r.source.book !== errata.book || r.source.table !== c.appliesTo.table) continue;
  if (c.appliesTo.printedSizeRestriction && SIZE(r.sizeRestriction) === SIZE(c.appliesTo.printedSizeRestriction)) {
    r.errata = { id: c.id, field: 'sizeRestriction', printed: r.sizeRestriction }; r.sizeRestriction = c.corrected;
  } else if (c.appliesTo.printedName && nameKey(r.printedName) === nameKey(c.appliesTo.printedName)) {
    if (r[c.appliesTo.field] !== c.printed) fail(`ERRATA_PRINTED_VALUE_MISMATCH ${c.id}: PDF ${r[c.appliesTo.field]}, errata says printed ${c.printed}`);
    r.errata = { id: c.id, field: c.appliesTo.field, printed: r[c.appliesTo.field] }; r[c.appliesTo.field] = c.corrected;
  }
}
for (const c of errata.corrections.filter(c => c.appliesTo)) if (!pdfRows.some(r => r.errata?.id === c.id)) fail(`ERRATA_NOT_APPLIED ${c.id}`);
const pdfByCatalog = new Map(), pdfUnmapped = [];
for (const r of pdfRows) {
  const id = PDF_ALIASES[nameKey(r.printedName)] ?? catalogByName.get(nameKey(r.printedName));
  if (!id || !byId.has(id)) { pdfUnmapped.push(r); continue; }
  if (r.suggestedCatalogId && r.suggestedCatalogId !== id) fail(`PDF_IDENTITY_CONFLICT ${r.printedName}: suggested ${r.suggestedCatalogId}, reconciled ${id}`);
  if (pdfByCatalog.has(id)) fail(`PDF_DUPLICATE_IDENTITY ${id}`);
  pdfByCatalog.set(id, r);
}
const pdfProse = new Map(pdf.supplementalProseOnlySystems.map(p => [p.id, p]));
const ERRATA_CHECK = new Set(pdf.reviewedTables.flatMap(t => t.rows).filter(r => r.requiresErrataCheck).map(r => PDF_ALIASES[nameKey(r.printedName)]));
const pdfReconciliation = catalog.map(cat => {
  const row = pdfByCatalog.get(cat.id), prose = pdfProse.get(cat.id);
  const base = { catalogId: cat.id, catalogFile: cat._file, catalogName: cat.name };
  if (row) {
    const src = { book: row.source.book, printedPage: row.source.printedPage, pdfPage1Based: row.source.pdfPage1Based, table: row.source.table, row: row.row, printedName: row.printedName };
    const differences = pdfCompare(cat, row);
    const ruling = rulingFor(cat.id);
    const authority = row.errata ? 'PUBLISHED_ERRATA' : (ERRATA_CHECK.has(cat.id) && ruling ? 'OWNER_RULING' : 'PUBLISHED_SOURCE');
    const extra = { authority, ...(row.errata ? { errata: row.errata } : {}), ...(ruling ? { ownerRuling: ruling.id } : {}) };
    if (!differences.length) return { ...base, disposition: 'MATCHED_CANONICAL', evidence: 'PDF_VISUAL_REVIEW', source: src, ...extra };
    return { ...base, disposition: 'CORRECTION_REQUIRED', evidence: 'PDF_VISUAL_REVIEW', source: src, differences, ...extra,
      applyStatus: ERRATA_CHECK.has(cat.id) && !(ruling && ruling.effect === 'APPLY_PRINTED_VALUES') ? 'ERRATA_CHECK_REQUIRED' : 'APPLY' };
  }
  if (prose) {
    // Weapon prose without a purchase table: the catalog's economic values have no source.
    const unsourced = ['emplacementPoints', 'availability', 'cost'].filter(f => cat[f] !== null && cat[f] !== undefined)
      .map(f => ({ field: f, catalog: cat[f], printed: null, note: prose.evidenceClass }));
    const src = { book: prose.source.book, printedPage: prose.source.printedPage, pdfPage1Based: prose.source.pdfPage1Based, section: prose.source.section };
    if (prose.evidenceClass === 'PRINTED_COMPONENT_PROSE') return { ...base, disposition: 'MATCHED_CANONICAL', evidence: 'PDF_PROSE_REVIEW', source: src, note: 'values from the printed component entry (Threats of the Galaxy)' };
    return unsourced.length ? { ...base, disposition: 'CORRECTION_REQUIRED', evidence: 'PDF_PROSE_REVIEW', source: src, differences: unsourced, applyStatus: 'APPLY' }
      : { ...base, disposition: 'UNRESOLVED_SOURCE', evidence: 'PDF_PROSE_REVIEW', source: src, unresolved: ['emplacementPoints', 'availability', 'cost'] };
  }
  const prior = reconciliation.find(r => r.catalogId === cat.id);
  return { ...base, disposition: prior.disposition, evidence: 'OCR_ONLY', basis: prior.basis ?? null, note: prior.note ?? null };
});
// The OCR reconciliation is kept as discovery evidence; where the PDF review covers a record it is superseded.
for (const r of reconciliation) {
  const p = pdfReconciliation.find(x => x.catalogId === r.catalogId);
  if (r.applyStatus && String(p?.evidence).startsWith('PDF')) { r.applyStatus = 'SUPERSEDED_BY_PDF_RECONCILIATION'; r.supersededBy = { disposition: p.disposition, authority: p.authority ?? null }; }
}
const worksheetResolution = pdf.reviewedWorksheetItems.map(w => {
  const id = w.requestedCatalogOrCensusId;
  const rec = pdfReconciliation.find(r => r.catalogId === id);
  return { worksheetIndex: w.worksheetIndex, id, pdfDisposition: w.disposition, reconciliation: rec ? rec.disposition : (missing.some(m => m.censusId === id) ? 'MISSING_FROM_CATALOG_PROSE_RULE' : 'NOT_A_CATALOG_ID'),
    applyStatus: rec?.applyStatus ?? null, evidence: w.evidenceRef ?? w.source ?? null, unresolved: w.unresolved ?? null };
});

/* ---------- certification ledger and readiness ---------- */
// P6B-0: atmospheric thrusters apply through the GM-set environment authority (vehicle-operating-context.js).
// P6B-2: cargo pods (Dex -> Reflex/Initiative/Pilot, cargo), consumables and capacities (effective statistics).
// 'intelligence' (sensor arrays) is NOT operational: no runtime consumer reads a vehicle's Intelligence yet.
const OPERATIONAL_KINDS = new Set(['armor', 'shield', 'dexterity', 'hyperdrive', 'atmospheric', 'recharge', 'skill-bonus', 'cargo-pod', 'consumables', 'capacity']);
const certificationP6a = Object.fromEntries(pdfReconciliation.filter(r => r.disposition === 'MATCHED_CANONICAL' && r.evidence.startsWith('PDF') && !certification[r.catalogId])
  .map(r => [r.catalogId, { status: EFFECTS[r.catalogId] ? 'MECHANIC_SPECIFIED' : 'SOURCE_VERIFIED',
    ...(EFFECTS[r.catalogId] ? { effectModule: 'scripts/domain/vehicles/vehicle-modification-effects.js', effectTest: 'tests/vehicle-universal-phase4e-p19-p6b2-accessories.test.mjs' } : {}),
    evidence: r.evidence === 'PDF_VISUAL_REVIEW' ? 'PDF_REVIEWED_P6A' : 'PDF_PROSE_REVIEWED_P6A', book: r.source.book,
    printedPage: r.source.printedPage, printedPageRange: [r.source.printedPage, r.source.printedPage], table: r.source.table ?? r.source.section, pageResolution: 'pdf-table-page' }]));
const ledger = catalog.map(cat => {
  const rec = pdfReconciliation.find(r => r.catalogId === cat.id);
  const cert = certification[cat.id] ?? certificationP6a[cat.id];
  const fx = EFFECTS[cat.id];
  return {
    catalogId: cat.id, name: cat.name, category: cat.category,
    sourceListed: rec.disposition !== 'NOT_FOUND_IN_SOURCE' ? { book: rec.source?.book ?? reconciliation.find(r => r.catalogId === cat.id).book, page: rec.source?.printedPage ?? null } : null,
    sourceVerified: cert ? { status: cert.status === 'MECHANIC_SPECIFIED' ? 'SOURCE_VERIFIED' : cert.status, evidence: cert.evidence, book: cert.book, printedPage: cert.printedPage } : null,
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
  'pdf-review-worksheet.json': { schema: 'swse.vehicle.p6a.pdf-review-worksheet.v2', note: 'The 91 OCR review requests and their PDF dispositions (print-verified-components-v2.json), reconciled against the catalog.', items: worksheet, resolution: worksheetResolution,
    counts: count(worksheetResolution, 'reconciliation') },
  'pdf-reconciliation.json': { schema: 'swse.vehicle.p6a.pdf-reconciliation.v1', note: 'Catalog vs independently PDF-reviewed printed tables/prose. MATCHED = every printed cell equals the catalog. Dash = not stated (null), never zero.',
    counts: { catalog: catalog.length, ...count(pdfReconciliation, 'disposition'), pdfRows: pdfRows.length, pdfRowsUnmappedToCatalog: pdfUnmapped.length },
    records: pdfReconciliation, unmappedPdfRows: pdfUnmapped.map(r => ({ printedName: r.printedName, table: r.tableId, page: r.source.printedPage })) },
};
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
const CERT_P6A = 'data/vehicle-modifications/certification-p6a.json';
files['../../../vehicle-modifications/certification-p6a.json'] = { schema: 'swse.vehicle.p6a.modification-certification-overlay.v1',
  note: 'Rows from the independent P6A PDF review whose catalog values equal every printed cell: SOURCE_VERIFIED, or MECHANIC_SPECIFIED when the effect is registered in vehicle-modification-effects.js and tested (P6B-2). certification.json wins where both exist.',
  rows: certificationP6a };
let stale = 0;
for (const [name, body] of Object.entries(files)) {
  const path = `${OUT}/${name}`, text = JSON.stringify(body, null, 1) + '\n';
  if (MODE === '--write') fs.writeFileSync(path, text);
  else if (!fs.existsSync(path) || fs.readFileSync(path, 'utf8') !== text) { console.error('STALE ' + path); stale++; }
}
if (stale) process.exit(1);
console.log(MODE === '--write' ? 'wrote' : 'up to date', JSON.stringify(files['pdf-reconciliation.json'].counts));
