#!/usr/bin/env node
/**
 * Apply the P6A corrections the reconciliation marks applyStatus 'APPLY' (values read cleanly from the source:
 * table footnotes, explicit size statements, columns a table does not print). Each changed field keeps its
 * previous value under legacy.p6a[field] with the citation. PDF_CONFIRMATION_REQUIRED candidates are never applied.
 * Idempotent. Usage: node tools/audits/vehicles/apply-p6a-corrections.mjs --write | --check
 */
import fs from 'node:fs';
const MODE = process.argv[2];
const rec = JSON.parse(fs.readFileSync('data/audits/vehicles/p6a/reconciliation.json', 'utf8'));
const FILES = ['movement-systems', 'defense-systems', 'weapon-systems', 'accessories'];
const CASE = { 'colossal or larger': 'Colossal or Larger', 'gargantuan or larger': 'Gargantuan or Larger', 'huge or larger': 'Huge or Larger' };
let pending = 0;
for (const f of FILES) {
  const path = `data/vehicle-modifications/${f}.json`;
  const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
  let changed = false;
  for (const row of rows) {
    const r = rec.records.find(x => x.catalogId === row.id && x.applyStatus === 'APPLY');
    if (!r) continue;
    for (const d of r.differences) {
      const value = typeof d.printed === 'string' ? (CASE[d.printed.toLowerCase()] ?? d.printed) : d.printed ?? null;
      if (row[d.field] === value) continue;
      pending++;
      row.legacy = { ...(row.legacy ?? {}), p6a: { ...(row.legacy?.p6a ?? {}), [d.field]: { value: row[d.field] ?? null, correctedFrom: `${r.book}${d.note ? ': ' + d.note : d.basis ? ': ' + d.basis : ''}` } } };
      row[d.field] = value;
      changed = true;
    }
  }
  if (changed && MODE === '--write') fs.writeFileSync(path, JSON.stringify(rows, null, 2) + '\n');
}
if (MODE === '--check' && pending) { console.error(`${pending} P6A corrections not applied`); process.exit(1); }
console.log(MODE === '--write' ? `applied ${pending}` : 'corrections applied');
