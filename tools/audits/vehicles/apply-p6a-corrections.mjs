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
const records = [...load('data/audits/vehicles/p6a/reconciliation.json').records, ...load('data/audits/vehicles/p6a/pdf-reconciliation.json').records]
  .filter(r => r.applyStatus === 'APPLY');
const FILES = ['movement-systems', 'defense-systems', 'weapon-systems', 'accessories'];
// catalog convention: capitalized "Larger"/"Smaller"
const sizeCase = v => (typeof v === 'string' ? v.replace(/\s*(starships)?\s*only\s*$/i, '').replace(/\b(larger|smaller)\b/, w => w[0].toUpperCase() + w.slice(1)) : v);
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
    row.legacy = { ...(row.legacy ?? {}), p6a: { ...(row.legacy?.p6a ?? {}), [field]: prior ?? { value: row[field] ?? null, correctedFrom: `${cite(r)}${d.note ? ': ' + d.note : ''}${d.printedText ? ' (printed "' + d.printedText + '")' : ''}` } } };
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
  if (changed && MODE === '--write') fs.writeFileSync(path, JSON.stringify(rows, null, 2) + '\n');
}
if (MODE === '--check' && pending) { console.error(`${pending} P6A corrections not applied`); process.exit(1); }
console.log(MODE === '--write' ? `applied ${pending}` : 'corrections applied');
