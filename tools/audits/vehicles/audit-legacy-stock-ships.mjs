#!/usr/bin/env node
/**
 * Field-by-field comparison of the legacy data/stock-ships.json frames with the published
 * Starships of the Galaxy Stock Ships tables (printed pp. 53-54), via the certified extraction in
 * data/canonical/vehicles/construction/stock-frames.json. Reports original value, published value
 * and whether the published cell is clean OCR (certifiable) or needs the PDF.
 *
 *   node tools/audits/vehicles/audit-legacy-stock-ships.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const legacy = (process.env.LEGACY_STOCK_SHIPS_FILE ? JSON.parse(fs.readFileSync(process.env.LEGACY_STOCK_SHIPS_FILE, 'utf8')) : read('data/stock-ships.json'));
const frames = read('data/canonical/vehicles/construction/stock-frames.json').frames;

const lower = s => String(s ?? '').trim().toLowerCase();
const sq = s => (s == null ? 'none' : String(Number.parseInt(String(s), 10))); // a dash in the table = no character-scale speed
const speedPart = (speed, i) => { const [a, b] = String(speed).split('/'); const v = i === 0 ? a : b; return v === '-' ? 'none' : v; };
const noisyCells = f => new Set(f.noisy.map(n => n.cell));

// the generic frame rule: a standard stock design generally has 1 unused EP (SotG p. 39)
const GENERAL_UNUSED_EP = 1;

export function compareFrames() {
  const rows = [];
  for (const old of legacy) {
    const f = frames.find(x => lower(x.class) === lower(old.name));
    if (!f) { rows.push({ frame: old.name, field: '*', status: 'NO_PUBLISHED_FRAME' }); continue; }
    const noisy = noisyCells(f);
    const checks = [
      ['size', lower(old.size), lower(f.size), 'sizeStrDexInt'],
      ['strength', old.strength, f.strength, 'sizeStrDexInt'],
      ['dexterity', old.dexterity, f.dexterity, 'sizeStrDexInt'],
      ['intelligence', old.intelligence, f.intelligence, 'sizeStrDexInt'],
      ['speedCharacter', sq(old.speedCharacter), speedPart(f.speed, 0), 'speedHpDrArmorCost'],
      ['speedStarship', sq(old.speedStarship), speedPart(f.speed, 1), 'speedHpDrArmorCost'],
      ['hitPoints', old.hitPoints, f.hitPoints, 'speedHpDrArmorCost'],
      ['dr', old.dr, f.damageReduction, 'damageReduction'],
      ['armor', old.armor, f.armor, 'speedHpDrArmorCost'],
      ['cost', old.cost, f.cost, 'speedHpDrArmorCost'],
      ['crew', old.crew, f.crew, 'crew'],
      ['passengers', old.passengers, f.passengers, 'crewPassengersCargoConsumablesEP'],
      ['cargoCapacity', lower(old.cargoCapacity), lower(f.cargo), 'crewPassengersCargoConsumablesEP'],
      ['consumables', lower(old.consumables), lower(f.consumables), 'crewPassengersCargoConsumablesEP'],
      ['emplacementPoints', old.emplacementPoints, f.stockEmplacementPoints, 'stockEmplacementPoints']
    ];
    for (const [field, was, published, cell] of checks) {
      if (published === null || published === undefined) { rows.push({ frame: old.name, field, legacy: was, published: null, status: 'PUBLISHED_CELL_ILLEGIBLE_NEEDS_PDF' }); continue; }
      const uncertain = noisy.has(cell);
      if (was === published) rows.push({ frame: old.name, field, legacy: was, published, status: uncertain ? 'MATCHES_BUT_CELL_NOISY' : 'VERIFIED' });
      else rows.push({ frame: old.name, field, legacy: was, published, status: uncertain ? 'DIFFERS_CELL_NOISY_NEEDS_PDF' : 'DISCREPANCY' });
    }
    // costModifier is Table 3-1 (the frame prices are already scaled and must not be multiplied again)
    const mod = { huge: 1, gargantuan: 2, colossal: 5, 'colossal (frigate)': 50, 'colossal (cruiser)': 500, 'colossal (station)': 5000 }[lower(f.size)];
    rows.push({ frame: old.name, field: 'costModifier', legacy: old.costModifier, published: mod, status: old.costModifier === mod ? 'VERIFIED' : 'DISCREPANCY' });
    rows.push({ frame: old.name, field: 'unusedEmplacementPoints', legacy: old.unusedEmplacementPoints, published: GENERAL_UNUSED_EP,
      status: old.unusedEmplacementPoints === GENERAL_UNUSED_EP ? 'VERIFIED' : 'DISCREPANCY',
      note: 'SotG p. 39: a standard stock design generally has 1; Table 3-2 / manufacturer exceptions belong to named designs, not to the generic frame' });
  }
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = compareFrames();
  const counts = rows.reduce((a, r) => (a[r.status] = (a[r.status] ?? 0) + 1, a), {});
  if (process.argv.includes('--json')) console.log(JSON.stringify({ counts, rows }, null, 1));
  else {
    console.log(JSON.stringify(counts));
    for (const r of rows.filter(r => r.status !== 'VERIFIED')) console.log(`${r.status.padEnd(34)} ${r.frame.padEnd(20)} ${r.field.padEnd(24)} legacy=${JSON.stringify(r.legacy)} published=${JSON.stringify(r.published)}`);
  }
}
