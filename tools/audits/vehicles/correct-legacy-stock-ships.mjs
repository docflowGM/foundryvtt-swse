#!/usr/bin/env node
/**
 * One-time, reproducible correction of the legacy data/stock-ships.json frames to the published
 * Starships of the Galaxy Stock Ships tables (printed pp. 53-54). Only fields the comparison tool
 * reports as DISCREPANCY against a clean published cell are changed; each change is recorded on the
 * frame as `provenance.corrections` (original value, corrected value, source).
 * The file stays a RETIRED reference: the construction authority is
 * data/canonical/vehicles/construction/stock-frames.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareFrames } from './audit-legacy-stock-ships.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const file = path.join(root, 'data/stock-ships.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const diffs = compareFrames().filter(r => r.status === 'DISCREPANCY');
for (const d of diffs) {
  const ship = data.find(s => s.name === d.frame);
  const key = { dr: 'dr' }[d.field] ?? d.field;
  ship.provenance ??= { book: 'Starships of the Galaxy', printedPages: [53, 54], tables: 'Stock Ships', corrections: [] };
  if (ship.provenance.corrections.some(c => c.field === key)) continue;
  ship.provenance.corrections.push({ field: key, original: ship[key], corrected: d.published,
    basis: d.field === 'unusedEmplacementPoints'
      ? 'SotG p. 39: a standard stock design generally has 1 unused emplacement point; named-design exceptions (Table 3-2, YT-series 10, Corellian Engineering Corporation 5) do not apply to the generic frame'
      : 'SotG Stock Ships table, printed pp. 53-54' });
  ship[key] = d.published;
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('corrected', diffs.length, 'fields');
