#!/usr/bin/env node
/**
 * Unused emplacement points (the points a stock ship has available for modifications) for each of the
 * 429 published vehicles, from the book statements below, in precedence order:
 *   1. an explicit statement for that ship (Rebellion Era Campaign Guide; record special rule)
 *   2. Starships of the Galaxy Table 3-2 (printed p. 39) for the designs it names
 *   3. the YT-series statement (SotG p. 154): 10
 *   4. Corellian Engineering Corporation designs: 5 "unless otherwise specified" (p. 39)
 *   5. the general rule: a standard design "generally has 1" (p. 39)
 * Entries that cannot be decided from the text are null with a basis saying why (never guessed).
 * Table 3-2 names that cannot be mapped to a single record are listed under `unmapped`.
 *
 *   node tools/audits/vehicles/build-unused-emplacement-table.mjs --write|--check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUniversalVehiclePackSources } from '../../build-universal-vehicle-pack-sources.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = 'data/canonical/vehicles/construction/unused-emplacement-points.json';
const review = JSON.parse(fs.readFileSync(path.join(root, 'data/audits/vehicles/swse-p2-pdf-review.json'), 'utf8'));

const TABLE_3_2 = {
  'sotg-corellian-engineering-corporation-action-vi-bulk-transport': ['Action IV transport', 3],
  'sotg-baudo-class-star-yacht': ['Baudo-class star yacht', 2],
  'sotg-koensayr-ilh-kk-citadel-class-cruiser': ['Citadel cruiser', 3],
  'sotg-cloakshape-fighter': ['CloakShape fighter', 2],
  'sotg-corellian-gunship': ['Corellian gunship', 5],
  'sotg-rendili-stardrive-dreadnaught-class-heavy-cruiser': ['Dreadnaught', 3],
  'sotg-dynamic-class-freighter': ['Dynamic-class freighter', 6],
  'sotg-kuat-systems-engineering-firespray-31-patrol-craft': ['Firespray-31', 3],
  'sotg-ghtroc-industries-class-720-freighter': ['Ghtroc-720', 3],
  'sotg-sorosuub-cutlass-9-patrol-fighter': ['SoroSuub patrol fighter', 3],
  'sotg-kuat-drive-yards-star-galleon': ['Star Galleon-class frigate', 4]
};
const UNMAPPED = [
  { tableName: 'Blockade runner', unusedEmplacementPoints: 5, reason: 'several records could be the named design' },
  { tableName: 'J-Type transports', unusedEmplacementPoints: review.unusedEmplacementPoints['J-Type transports'], reason: 'the only SotG J-type record is a star skiff, not a transport' },
  { tableName: 'Republic cruiser', unusedEmplacementPoints: 5, reason: 'several records could be the named design' }
];
const REBELLION = {
  're-g1-m4-c-dunelizard-fighter': 3, 're-mobquet-medium-transport': 10, 're-ykl-37r-nova-courier': 5
};
const KOTOR_STATBLOCK = new Set([
  'kotor-amalgamated-hyperdyne-578-r-space-transport', 'kotor-arakyd-industries-lethisk-class-armed-freighter',
  'kotor-corellia-stardrive-quartermaster-class-supply-carrier'
]);
const specialRulePoints = r => {
  for (const s of r.exceptions?.specialRules ?? []) {
    if (!/unused|unspent/i.test(s.key ?? '')) continue;
    const m = String(s.summary).match(/"points":\s*(\d+)|^(\d+)$/);
    if (m) return Number(m[1] ?? m[2]);
  }
  return null;
};

const records = [...buildUniversalVehiclePackSources().output.values()].flat()
  .map(a => a.flags.swse.universalVehicleSource.source).sort((a, b) => a.identity.sourceEntryKey.localeCompare(b.identity.sourceEntryKey));
const entries = records.map(r => {
  const key = r.identity.sourceEntryKey;
  const special = specialRulePoints(r);
  const statements = [];
  if (key in REBELLION) statements.push({ basis: 'REBELLION_ERA_STATEMENT', points: REBELLION[key], book: 'Rebellion Era Campaign Guide', printedPage: null });
  if (key in TABLE_3_2) statements.push({ basis: 'SOTG_TABLE_3_2', points: TABLE_3_2[key][1], book: 'Starships of the Galaxy', printedPage: 39 });
  if (special !== null) statements.push({ basis: 'RECORD_SPECIAL_RULE', points: special, book: r.publication.book, printedPage: r.publication.page });
  const distinct = new Set(statements.map(s => s.points));
  if (distinct.size > 1) throw new Error('conflicting unused-EP statements for ' + key + ': ' + JSON.stringify(statements));
  let pick = statements[0];
  if (!pick && /(^|-)yt-\d{3,4}(-|$)/.test(key) && !/modified/.test(key)) pick = { basis: 'SOTG_YT_SERIES', points: 10, book: 'Starships of the Galaxy', printedPage: 154 };
  if (!pick && KOTOR_STATBLOCK.has(key)) return { sourceEntryKey: key, unusedEmplacementPoints: null, basis: 'KOTOR_STATBLOCK_EMPLACEMENT_POINTS_UNRULED', book: r.publication.book, printedPage: r.publication.page, note: 'the statblock prints "Emplacement Points: N" without saying "unused"' };
  if (!pick && key.includes('corellian-engineering-corporation')) pick = { basis: 'SOTG_CEC_DEFAULT', points: 5, book: 'Starships of the Galaxy', printedPage: 39 };
  if (!pick) pick = { basis: 'SOTG_GENERAL_RULE', points: 1, book: 'Starships of the Galaxy', printedPage: 39 };
  return { sourceEntryKey: key, unusedEmplacementPoints: pick.points, basis: pick.basis, book: pick.book, printedPage: pick.printedPage };
});
for (const k of Object.keys(TABLE_3_2)) if (!entries.find(e => e.sourceEntryKey === k)) throw new Error('Table 3-2 key not found: ' + k);
for (const k of Object.keys(REBELLION)) if (!entries.find(e => e.sourceEntryKey === k)) throw new Error('Rebellion key not found: ' + k);

const counts = entries.reduce((a, e) => (a[e.basis] = (a[e.basis] ?? 0) + 1, a), {});
const doc = {
  schema: 'swse.vehicle.p2.unused-emplacement-points.v1',
  note: 'Unused emplacement points available for modifications, per published vehicle. A stock frame\'s own "Emplacement Points" figure (stock-frames.json) is its allocation and is a different quantity. null = cannot be decided from the text.',
  precedence: ['explicit statement for the ship', 'SotG Table 3-2', 'YT-series (10)', 'Corellian Engineering Corporation (5)', 'general rule (1)'],
  counts, unmapped: UNMAPPED, entries
};
const body = JSON.stringify(doc, null, 1) + '\n';
const mode = process.argv[2];
if (mode === '--write') { fs.writeFileSync(path.join(root, OUT), body); console.log('wrote', OUT, JSON.stringify(counts)); }
else if (mode === '--check') {
  const cur = fs.existsSync(path.join(root, OUT)) ? fs.readFileSync(path.join(root, OUT), 'utf8') : '';
  if (cur !== body) { console.error('stale: ' + OUT); process.exit(1); }
  console.log('unused-EP table up to date', JSON.stringify(counts));
} else { console.error('usage: --write|--check'); process.exit(2); }
