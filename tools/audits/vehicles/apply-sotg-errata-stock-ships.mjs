#!/usr/bin/env node
/**
 * Reverse the earlier printed-table Strength "corrections" in the RETIRED legacy data/stock-ships.json:
 * Starships of the Galaxy Errata 1.0 restores the lower Strength scores the legacy file originally held.
 * Each reversal is recorded in provenance.corrections. Idempotent. Usage: --write | --check
 */
import fs from 'node:fs';
const MODE = process.argv[2];
const file = 'data/stock-ships.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const errata = JSON.parse(fs.readFileSync('data/audits/vehicles/errata/sotg-errata-1.0.json', 'utf8'));
const strength = errata.corrections.find(c => c.id === 'SOTG-E1-STOCK-STRENGTH');
let pending = 0;
for (const [id, e] of Object.entries(strength.frames)) {
  const ship = data.find(s => s.name.toLowerCase().replace(/\s+/g, '-') === id);
  if (!ship) throw new Error('legacy frame not found: ' + id);
  if (ship.strength === e.corrected) continue;
  pending++;
  ship.provenance.corrections.push({ field: 'strength', original: ship.strength, corrected: e.corrected, basis: `${errata.errata} (${strength.id}); reverses the printed-table correction (printed ${e.printed})` });
  ship.strength = e.corrected;
}
if (MODE === '--write' && pending) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
if (MODE === '--check' && pending) { console.error(`${pending} errata strength reversals not applied`); process.exit(1); }
console.log(MODE === '--write' ? `reverted ${pending}` : 'errata applied');
