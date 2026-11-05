#!/usr/bin/env node
/**
 * Apply P6A corrections marked applyStatus 'APPLY' in the OCR reconciliation (reconciliation.json) and the
 * PDF reconciliation (pdf-reconciliation.json). Each changed field keeps its previous value under
 * legacy.p6a[field] with the citation. ERRATA_CHECK_REQUIRED and PDF_CONFIRMATION_REQUIRED candidates are never
 * applied. A printed dash becomes null (unknown), never 0. Idempotent.
 * Usage: node tools/audits/vehicles/apply-p6a-corrections.mjs --write | --check
 */
import fs from 'node:fs';
const MODE = process.argv[2];
const load = p => JSON.parse(fs.readFileSync(p, 'utf8'));
// The PDF reconciliation (published source + errata + owner rulings) supersedes the OCR reconciliation.
const pdfRecords = load('data/audits/vehicles/p6a/pdf-reconciliation.json').records;
const pdfEvidenced = new Set(pdfRecords.filter(r => String(r.evidence).startsWith('PDF')).map(r => r.catalogId));
const records = [...load('data/audits/vehicles/p6a/reconciliation.json').records.filter(r => !pdfEvidenced.has(r.catalogId)), ...pdfRecords]
  .filter(r => r.applyStatus === 'APPLY');
const rulings = load('data/audits/vehicles/p6a/owner-rulings.json').rulings;
const FILES = ['movement-systems', 'defense-systems', 'weapon-systems', 'accessories'];
// catalog convention: capitalized "Larger"/"Smaller"
const sizeCase = v => (typeof v === 'string' ? v.replace(/\s*(starships)?\s*only\s*$/i, '').replace(/\b(larger|smaller)\b/, w => w[0].toUpperCase() + w.slice(1)).replace(/\((frigate|cruiser|station)\)/, (_, t) => `(${t[0].toUpperCase()}${t.slice(1)})`) : v);
const cite = r => r.source ? `${r.source.book} p. ${r.source.printedPage}${r.source.table ? ' Table ' + r.source.table : r.source.section ? ' (' + r.source.section + ')' : ''}` : r.book;
let pending = 0;
for (const f of FILES) {
  const path = `data/vehicle-modifications/${f}.json`;
  const rows = load(path);
  let changed = false;
  const set = (row, field, value, r, d) => {
    if (JSON.stringify(row[field] ?? null) === JSON.stringify(value ?? null)) return;
    pending++; changed = true;
    const prior = row.legacy?.p6a?.[field];
    const basis = `${cite(r)}${r.authority && r.authority !== 'PUBLISHED_SOURCE' ? ' [' + r.authority + (r.errata ? ' ' + r.errata.id : '') + (r.ownerRuling ? ' ' + r.ownerRuling : '') + ']' : ''}${d.note ? ': ' + d.note : ''}${d.printedText ? ' (printed "' + d.printedText + '")' : ''}`;
    // legacy.p6a keeps the ORIGINAL catalog value; legacy.p6aHistory records every change (including reversals).
    row.legacy = { ...(row.legacy ?? {}), p6a: { ...(row.legacy?.p6a ?? {}), [field]: prior ?? { value: row[field] ?? null, correctedFrom: basis } },
      p6aHistory: [...(row.legacy?.p6aHistory ?? []), { field, from: row[field] ?? null, to: value ?? null, authority: r.authority ?? 'PUBLISHED_SOURCE', basis }] };
    row[field] = value;
  };
  for (const row of rows) {
    for (const r of records.filter(x => x.catalogId === row.id)) for (const d of r.differences) {
      if (d.field === 'cost' && d.printed && typeof d.printed === 'object') { set(row, 'cost', d.printed.cost, r, d); set(row, 'costType', d.printed.costType, r, d); }
      else if (d.field === 'costMultiplier') { set(row, 'costType', 'multiplier', r, d); set(row, 'costMultiplier', d.printed.costMultiplier, r, d); }
      else if (d.field === 'sizeRestriction') set(row, 'sizeRestriction', sizeCase(d.printed ?? null), r, d);
      else set(row, d.field, d.printed ?? null, r, d);
    }
  }
  // V-P6A-06: dash-EP ammunition is consumable, not an installed modification (EP stays unknown, never 0).
  for (const row of rows) for (const ru of rulings.filter(x => x.effect === 'CONSUMABLE_AMMUNITION' && x.catalogIds.includes(row.id))) {
    if (row.installationKind === 'consumable-ammunition' && row.emplacementPoints === null) continue;
    pending++; changed = true;
    row.installationKind = 'consumable-ammunition'; row.emplacementPointsPrinted = '\u2014'; row.emplacementPoints = null;
    row.legacy = { ...(row.legacy ?? {}), p6aHistory: [...(row.legacy?.p6aHistory ?? []), { field: 'installationKind', from: null, to: 'consumable-ammunition', authority: 'OWNER_RULING', basis: ru.id }] };
  }
  if (changed && MODE === '--write') fs.writeFileSync(path, JSON.stringify(rows, null, 2) + '\n');
}
if (MODE === '--check' && pending) { console.error(`${pending} P6A corrections not applied`); process.exit(1); }
console.log(MODE === '--write' ? `applied ${pending}` : 'corrections applied');
