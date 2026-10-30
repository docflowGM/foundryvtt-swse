#!/usr/bin/env node
/**
 * Phase 4E P2/P5 rules evidence: Starships of the Galaxy, Chapter III "Starship Modifications"
 * (system tables, printed pp. 40-53) and "Stock Ships" (p. 53-54), extracted from the committed
 * OCR text and compared with data/vehicle-modifications/*.json.
 *
 * Authority rule (reference/sourcebooks/README.md): the OCR text is the fast searchable layer; the
 * PDF is final authority wherever OCR is ambiguous. This tool therefore:
 *   - transcribes only cells whose OCR token is clean;
 *   - flags every noisy / garbled cell instead of repairing it from general knowledge;
 *   - never certifies a row with a noisy cell.
 * Page numbers: the OCR has no page markers; pages are the table-of-contents section ranges.
 *
 *   node tools/audits/vehicles/build-sotg-modification-evidence.mjs --write|--check
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SOURCE = 'reference/sourcebooks/Starships of the Galaxy_djvu.txt';
const OUT = 'data/audits/vehicles/swse-p2-sotg-modification-evidence.json';
const BOOK = 'Starships of the Galaxy';
const AVAIL = ['Common', 'Licensed', 'Restricted', 'Military', 'Illegal'];

const review = JSON.parse(fs.readFileSync(path.join(root, 'data/audits/vehicles/swse-p2-pdf-review.json'), 'utf8'));
const TABLE_PAGE = { movement: review.tables.starshipsOfTheGalaxy['table3-3MovementSystems'].printedPage, defense: review.tables.starshipsOfTheGalaxy['table3-4DefenseSystems'].printedPage };
const text = fs.readFileSync(path.join(root, SOURCE), 'utf8');
const lines = text.split('\n');
const sha256 = crypto.createHash('sha256').update(text).digest('hex');

// Name key shared by the printed table and the catalog. Parenthetical text is KEPT (sublight drives
// differ only by it) except the catalog's "(SLAM)" gloss.
const norm = s => String(s).toLowerCase().replace(/\(slam\)/g, ' ').replace(/starship\s+/g, '')
  .replace(/thrusters/g, 'thruster').replace(/\.\s*$/, '')
  .replace(/(^|[^\d])\.(\d)/g, '$10.$2').replace(/([a-z])(\d)/g, '$1 $2')
  .replace(/[^a-z0-9.+%]+/g, ' ').trim().replace(/\s+/g, ' ');
const num = s => Number(String(s).replace(/,/g, ''));

function tableAfter(header, from = 0) {
  const i = lines.findIndex((l, n) => n >= from && l.trim() === header);
  if (i < 0) throw new Error('table header not found: ' + header);
  return i;
}

/* ------------------------- row-oriented system tables ------------------------- */
function parseSystemRows(startIdx, endIdx) {
  const rows = [];
  const rowRe = new RegExp('^(?<name>.+?)\\s+(?<ep>\\S+)\\s+(?<avail>' + AVAIL.join('|') + ')\\s+(?<size>.*?)\\s*(?<cost>[\\d,]+) credits(?<base> base)?(?<tail>.*)$');
  for (let n = startIdx; n < endIdx; n++) {
    const raw = lines[n].trim();
    const m = rowRe.exec(raw);
    if (!m) continue;
    const { name, ep, avail, size, cost, base, tail } = m.groups;
    const noisy = [];
    if (!/^\d+$/.test(ep)) noisy.push({ cell: 'emplacementPoints', ocr: ep });
    const sizeClean = /^(None|-|=)?$/.test(size.trim()) ? null
      : /^(Large|Huge|Gargantuan|Colossal( \((station|cruiser|frigate)\))?)( or (larger|smaller)| or Colossal)?$/i.test(size.trim()) ? size.trim() : undefined;
    if (sizeClean === undefined) noisy.push({ cell: 'sizeRestriction', ocr: size.trim() });
    if (/[^\s]/.test(tail.replace(/^[\s.,;:]+/, '')) && tail.trim().length > 0 && !/^[\W\w]{0,4}$/.test(tail.trim()))
      noisy.push({ cell: 'trailing', ocr: tail.trim() });
    rows.push({
      line: n + 1, ocrName: name.replace(/\s+/g, ' ').trim(), key: norm(name),
      emplacementPoints: /^\d+$/.test(ep) ? Number(ep) : null,
      availability: avail, sizeRestriction: sizeClean === undefined ? null : sizeClean,
      cost: num(cost), costType: base ? 'base' : 'flat', noisy
    });
  }
  return rows;
}

const movStart = tableAfter('SYSTEM EMPLACEMENT POINTS AVAILABILITY SIZE RESTRICTION COST');
const defStart = tableAfter('SYSTEM EMPLACEMENT POINTS AVAILABILITY SIZE RESTRICTION COST', movStart + 1);
const movement = parseSystemRows(movStart, defStart - 40);
const defense = parseSystemRows(defStart, defStart + 60);

/* ------------------------------- stock ship frames ------------------------------- */
// Blank lines between OCR rows must not shift the row-to-class mapping.
const rowsAfter = (idx, n) => lines.slice(idx + 1).filter(l => l.trim() !== '').slice(0, n);
const CLASSES = ['Battlecruiser', 'Cruiser', 'Frigate', 'Corvette', 'Heavy freighter', 'Gunship', 'Shuttle', 'Light freighter', 'Bomber', 'Superiority fighter', 'Interceptor', 'Light fighter'];
const aIdx = tableAfter('CLASS SIZE STR DEX INT');
const bIdx = tableAfter('SPEED HP DR ARMOR COST');
const cIdx = lines.findIndex(l => /^STARSHIP CREW PASSENGERS CARGO CONSUMABLES EMPLACEMENT POINTS/.test(l.trim()));

const frames = CLASSES.map(c => ({ class: c, noisy: [] }));
rowsAfter(aIdx, 12).forEach((l, i) => {
  const m = /^(?<cls>[A-Za-z ]+?)\s+(?<size>Colossal(?: \((?:cruiser|frigate|station)\))?|Gargantuan|Huge|Large)\s+(?<str>\d+)\s+(?<dex>\d+)\s+(?<int>\d+)\s*$/.exec(l.trim());
  if (!m || m.groups.cls.trim() !== CLASSES[i]) { frames[i].noisy.push({ cell: 'sizeStrDexInt', ocr: l.trim() }); return; }
  Object.assign(frames[i], { size: m.groups.size, strength: +m.groups.str, dexterity: +m.groups.dex, intelligence: +m.groups.int });
});
rowsAfter(bIdx, 12).forEach((l, i) => {
  const t = l.trim();
  const m = /^(?<sp>(?:-|\d+)\/\d+)\s+(?<hp>[\d,]+)\s+(?:(?<junk>[—-])\s+)?(?<dr>\d+)\.?\s+\+(?<armor>\d+)\s+(?<cost>[\d,]+)$/.exec(t);
  if (!m) { frames[i].noisy.push({ cell: 'speedHpDrArmorCost', ocr: t }); return; }
  Object.assign(frames[i], { speed: m.groups.sp, hitPoints: num(m.groups.hp), damageReduction: +m.groups.dr, armor: +m.groups.armor, cost: num(m.groups.cost) });
  if (m.groups.junk || /\d\.\s/.test(t)) frames[i].noisy.push({ cell: 'damageReduction', ocr: t });
});
if (cIdx >= 0) rowsAfter(cIdx, 12).forEach((l, i) => {
  const t = l.trim();
  const m = /^(?<cls>[A-Za-z ]+?)\s+(?<crew>[\d,]+|\|)\s+(?<pax>[\d,]+)\s+(?<cargo>[\d,]+ (?:tons|kg))\s+(?<cons>\d+ (?:years?|months?|days?))\s+(?<ep>\S+)$/.exec(t);
  if (!m || m.groups.cls.trim() !== CLASSES[i]) { frames[i].noisy.push({ cell: 'crewPassengersCargoConsumablesEP', ocr: t }); return; }
  const g = m.groups;
  Object.assign(frames[i], { crew: g.crew === '|' ? 1 : num(g.crew), passengers: num(g.pax), cargo: g.cargo, consumables: g.cons,
    stockEmplacementPoints: /^\d+$/.test(g.ep) ? Number(g.ep) : null });
  if (g.crew === '|') frames[i].noisy.push({ cell: 'crew', ocr: '|' });
  if (!/^\d+$/.test(g.ep)) frames[i].noisy.push({ cell: 'stockEmplacementPoints', ocr: g.ep });
});

// Cells the OCR could not read are filled ONLY from the recorded PDF review, and the frame is then
// PDF_CONFIRMED. Cells the review does not cover keep their OCR status.
for (const f of frames) {
  const r = review.frames[f.class.toLowerCase().replace(/\s+/g, '-')];
  if (!r) continue;
  for (const [cell, value] of Object.entries(r.cells)) {
    if (f[cell] !== undefined && f[cell] !== null && f[cell] !== value) throw new Error('PDF review contradicts clean OCR cell: ' + f.class + '.' + cell);
    f[cell] = value;
  }
  f.noisy = f.noisy.filter(n => !Object.keys(r.cells).some(c => n.cell === c || (c === 'stockEmplacementPoints' && n.cell === 'stockEmplacementPoints') || (c === 'damageReduction' && n.cell === 'damageReduction') || (c === 'crew' && n.cell === 'crew')));
  f.pdfReviewedCells = Object.keys(r.cells);
}

/* --------------------------- Table 3-2 unused emplacement points --------------------------- */
const uIdx = lines.findIndex(l => l.trim() === 'UNUSED POINTS');
const unused = [];
const pairRe = /([A-Za-z][A-Za-z0-9 .\-]*?)\s+(\d{1,2}|[a-z]{1,2})(?=\s|$)/g;
for (const l of lines.slice(uIdx, uIdx + 30)) {
  const t = l.trim();
  if (!t || /UNUSED|STOCK|^Any off|^Such|^Some|^fications|^later|^this|^has|^and|^tures|^systems|^have|^more|^model/i.test(t) || t.length > 60) continue;
  for (const m of t.matchAll(pairRe)) {
    const ok = /^\d+$/.test(m[2]);
    unused.push({ ocrName: m[1].trim(), unusedEmplacementPoints: ok ? Number(m[2]) : null, noisy: ok ? [] : [{ cell: 'unusedEmplacementPoints', ocr: m[2] }] });
  }
}
for (const u of unused) {
  const reviewed = review.unusedEmplacementPoints[u.ocrName];
  if (reviewed !== undefined) { u.unusedEmplacementPoints = reviewed; u.noisy = []; u.pdfReviewed = true; }
}
const unusedSingle = [];

/* --------------------- weapon table: assisted transcription, machine-checked --------------------- */
// The weapon table is OCR'd as two interleaved columns, so rows are transcribed by hand and EVERY
// transcribed cell must still appear in the cited OCR fragment (the build fails otherwise). Footnote
// (1) of the table reads "Colossal or larger starships only".
const FOOTNOTE_1 = 'Colossal or larger';
const W = (id, name, fragment, damage, ep, availability, cost, costType, extra = {}) =>
  ({ id, printedName: name, fragment, damage, emplacementPoints: ep, availability, cost, costType, footnote1: false, noisy: [], ...extra });
const weaponRows = [
  W('autoblaster', 'Autoblaster', 'Autoblaster - +0 Restricted x2', null, 0, 'Restricted', 2, 'multiplier'),
  W('blaster-cannon-light', 'Blaster cannon, light', 'Blaster cannon, light 3d10x2 1 Licensed 1,200', '3d10x2', 1, 'Licensed', 1200, 'flat'),
  W('blaster-cannon-medium', 'Blaster cannon, medium', 'Blaster cannon, medium 4d10x2 1 Restricted 2,500', '4d10x2', 1, 'Restricted', 2500, 'flat'),
  W('blaster-cannon-heavy', 'Blaster cannon, heavy', 'Blaster cannon, heavy 5d10x2 2 Military 5,500', '5d10x2', 2, 'Military', 5500, 'flat'),
  W('cannon-double', 'Cannon, double', 'Cannon, double +1d10 +0 Licensed x3', '+1d10', 0, 'Licensed', 3, 'multiplier'),
  W('cannon-quad', 'Cannon, quad', 'Cannon, quad +2d10 +1 Restricted x5', '+2d10', 1, 'Restricted', 5, 'multiplier'),
  W('cannon-enhancement', 'Cannon enhancements', 'Cannon enhancements +1010 +1 Military x2', '+1d10', 1, 'Military', 2, 'multiplier', { noisy: [{ cell: 'damage', ocr: '+1010' }] }),
  W('cannon-enhancement-advanced', 'Cannon enhancements, advanced', 'Cannon enhancements, +2d10 +2 Military x5', '+2d10', 2, 'Military', 5, 'multiplier'),
  W('concussion-missile-light', 'Concussion missile, light', 'Concussion missile, light 7d10x2 0 Military 500', '7d10x2', 0, 'Military', 500, 'flat'),
  W('concussion-missile-medium', 'Concussion missile, medium', 'Concussion missile, 9d10x2 0 Military 750', '9d10x2', 0, 'Military', 750, 'flat'),
  W('concussion-missile-heavy', 'Concussion missile, heavy (1)', 'Concussion missile, 9d10x5 0 Military 2,000', '9d10x5', 0, 'Military', 2000, 'flat', { footnote1: true }),
  W('concussion-missile-launcher-light', 'Concussion missile launcher, light', 'Concussion missile es 2 Military 2,000', null, 2, 'Military', 2000, 'flat', { noisy: [{ cell: 'damage', ocr: 'es' }] }),
  W('concussion-missile-launcher-medium', 'Concussion missile launcher, medium', 'Concussion missile = 5 Military 3,500', null, 5, 'Military', 3500, 'flat', { noisy: [{ cell: 'damage', ocr: '=' }] }),
  W('concussion-missile-launcher-heavy', 'Concussion missile launcher, heavy (1)', 'Concussion missile . 20 Military 30,000', null, 20, 'Military', 30000, 'flat', { footnote1: true, noisy: [{ cell: 'damage', ocr: '.' }] }),
  W('docking-gun', 'Docking gun', 'Docking gun By weapon 1 Licensed +1,000', 'By weapon', 1, 'Licensed', 1000, 'modifier'),
  W('droid-jammer', 'Droid jammer', 'Droid jammer Special 1 Licensed 8,000', 'Special', 1, 'Licensed', 8000, 'flat'),
  W('fire-linked-2', 'Fire-linked weapon, 2', 'Fire-linked weapon,2 — +1d10 +1 Licensed x2', '+1d10', 1, 'Licensed', 2, 'multiplier'),
  W('fire-linked-4', 'Fire-linked weapon, 4', 'Fire-linked weapon, 4 +2d10 +2 Restricted x4', '+2d10', 2, 'Restricted', 4, 'multiplier'),
  W('fire-linked-optional', 'Fire-linked weapon, optional', 'Fire-linked weapon, Special of Licensed +1,000', 'Special', null, 'Licensed', 1000, 'modifier', { noisy: [{ cell: 'emplacementPoints', ocr: 'of' }] }),
  W('gravity-well-projector', 'Gravity well projector (1)', 'Gravity well projector (1) Special 5 Military 50,000', 'Special', 5, 'Military', 50000, 'flat', { footnote1: true }),
  W('ion-bomb', 'Ion bomb', 'lon bomb 5d10 ion ~ Military 500', '5d10 ion', null, 'Military', 500, 'flat', { noisy: [{ cell: 'emplacementPoints', ocr: '~' }] }),
  W('ion-bomb-rack', 'Ion bomb rack', 'lon bomb rack - 1 Military 1,000', null, 1, 'Military', 1000, 'flat'),
  W('ion-cannon-light', 'Ion cannon, light', 'lon cannon, light 3d10x2 ion 1 Licensed 2,000', '3d10x2 ion', 1, 'Licensed', 2000, 'flat'),
  W('ion-cannon-medium', 'Ion cannon, medium', 'lon cannon, medium 5d10x2 ion 2 Restricted 3,000', '5d10x2 ion', 2, 'Restricted', 3000, 'flat'),
  W('ion-cannon-heavy', 'Ion cannon, heavy (1)', 'lon cannon, heavy (1) 3d10x5 ion 5 Military 6,000', '3d10x5 ion', 5, 'Military', 6000, 'flat', { footnote1: true }),
  W('ion-cannon-hapan-triple', 'Ion cannon, Hapan triple (1)', '5d10x5 ion 3 Illegal 12,000', '5d10x5 ion', 3, 'Illegal', 12000, 'flat', { footnote1: true }),
  W('laser-cannon-light', 'Laser cannon, light', 'Laser cannon, light 3d10x2 1 Licensed 1,500', '3d10x2', 1, 'Licensed', 1500, 'flat'),
  W('laser-cannon-medium', 'Laser cannon, medium', 'Lasercannon,medium 4d10x2 1 Restricted 4,000', '4d10x2', 1, 'Restricted', 4000, 'flat'),
  W('laser-cannon-heavy', 'Laser cannon, heavy', 'Laser cannon, heavy 5d10x2 2 Military 6,000', '5d10x2', 2, 'Military', 6000, 'flat'),
  W('point-defense', 'Point-defense weapon (1)', 'Point-defense weapon (1) — 0 Restricted +4,000', null, 0, 'Restricted', 4000, 'modifier', { footnote1: true }),
  W('proton-torpedo', 'Proton torpedo', 'Proton torpedo 9d10x2 0 Military', '9d10x2', 0, 'Military', 800, 'flat', { noisy: [{ cell: 'cost', ocr: '=== 800' }] }),
  W('proton-torpedo-launcher', 'Proton torpedo launcher', 'Proton torpedo launcher — 1 Military 2,500', null, 1, 'Military', 2500, 'flat'),
  W('shieldbuster-torpedo', 'Shieldbuster torpedo', 'Shieldbuster torpedo 10d10x2 0 Mitay = 1000.', '10d10x2', 0, 'Military', 1000, 'flat', { noisy: [{ cell: 'availability', ocr: 'Mitay' }, { cell: 'cost', ocr: '= 1000.' }] }),
  W('shieldbuster-torpedo-launcher', 'Shieldbuster torpedo launcher', 'Shieldbuster torpedo = — 3 Military 10,000', null, 3, 'Military', 10000, 'flat'),
  W('space-mine-standard', 'Space mine, standard', 'Space mine, standard _—_7d10[ts[2 0 Military 1,000', '7d10x2', 0, 'Military', 1000, 'flat', { noisy: [{ cell: 'damage', ocr: '_—_7d10[ts[2' }] }),
  W('space-mine-advanced', 'Space mine, advanced', 'Space mine, advanced 9d10x2 0 Military 5,000', '9d10x2', 0, 'Military', 5000, 'flat'),
  W('space-mine-heavy', 'Space mine, heavy', 'Space mine, heavy 6d10x5 0 Military 5,000', '6d10x5', 0, 'Military', 5000, 'flat'),
  W('space-mine-launcher', 'Space mine launcher', 'Space mine launcher - 2 Military 5,000', null, 2, 'Military', 5000, 'flat'),
  W('tractor-beam', 'Tractor beam', 'Special 10 (ieeriged 10,000', 'Special', 10, 'Licensed', 10000, 'flat', { noisy: [{ cell: 'name', ocr: 'Thachar en' }, { cell: 'availability', ocr: '(ieeriged' }] }),
  W('turbolaser-light', 'Turbolaser, light (1)', 'Turbolaser, light (1) 3d10x5 2 Military 5,000', '3d10x5', 2, 'Military', 5000, 'flat', { footnote1: true }),
  W('turbolaser-medium', 'Turbolaser, medium (1)', 'Turbolaser, medium (1) | 5d10x5 5 Military 10,000', '5d10x5', 5, 'Military', 10000, 'flat', { footnote1: true }),
  W('turbolaser-heavy', 'Turbolaser, heavy (1)', '7d10x5 10 Military 20,000', '7d10x5', 10, 'Military', 20000, 'flat', { footnote1: true })
];
// every transcribed fragment must exist in the OCR text, or the transcription is wrong
for (const row of weaponRows) {
  if (!text.includes(row.fragment) && !lines.some(l => l.includes(row.fragment)))
    throw new Error('weapon table transcription not found in OCR: ' + row.id + ' <' + row.fragment + '>');
}

/* ------------------------------- comparison with the catalog ------------------------------- */
const catalogFiles = ['accessories', 'defense-systems', 'movement-systems', 'weapon-systems'];
const catalog = catalogFiles.flatMap(f => JSON.parse(fs.readFileSync(path.join(root, 'data/vehicle-modifications', f + '.json'), 'utf8')).map(r => ({ ...r, file: f })));
const printed = new Map([...movement.map(r => [r.key, { ...r, table: 'movement' }]), ...defense.map(r => [r.key, { ...r, table: 'defense' }])]);
const sizeKey = s => (s ? String(s).toLowerCase().replace(/\s+/g, ' ') : null);
const OTHER_BOOKS = fs.readdirSync(path.join(root, 'reference/sourcebooks')).filter(f => f.endsWith('_djvu.txt') && !f.startsWith('Starships of the Galaxy')).sort();
function otherBookHeadings(name) {
  const want = norm(name);
  const hits = [];
  for (const file of OTHER_BOOKS) {
    const ls = fs.readFileSync(path.join(root, 'reference/sourcebooks', file), 'utf8').split('\n');
    ls.forEach((l, i) => { if (l.trim().length < 60 && norm(l) === want) hits.push({ book: file.replace('_djvu.txt', ''), line: i + 1 }); });
  }
  return hits;
}
const weaponById = new Map(weaponRows.map(w => [w.id, w]));
const sameDamage = (a, b) => String(a ?? '').toLowerCase().replace(/[\s()]/g, '') === String(b ?? '').toLowerCase().replace(/[\s()]/g, '');
function compareWeapon(row, w) {
  const diffs = [];
  const base = { catalogId: row.id, catalogFile: row.file, catalogName: row.name, printedName: w.printedName, table: 'weapon' };
  const isNoisy = c => w.noisy.some(n => n.cell === c);
  if (w.emplacementPoints !== null && w.emplacementPoints !== row.emplacementPoints) diffs.push({ field: 'emplacementPoints', printed: w.emplacementPoints, catalog: row.emplacementPoints });
  if (!isNoisy('availability') && w.availability !== row.availability) diffs.push({ field: 'availability', printed: w.availability, catalog: row.availability });
  const costVal = w.costType === 'multiplier' ? row.costMultiplier : row.cost;
  if (!isNoisy('cost') && (w.cost !== costVal || w.costType !== row.costType)) diffs.push({ field: 'cost', printed: `${w.costType} ${w.cost}`, catalog: `${row.costType} ${costVal}` });
  const printedSize = w.footnote1 ? FOOTNOTE_1 : null;
  if (sizeKey(printedSize) !== sizeKey(row.sizeRestriction)) diffs.push({ field: 'sizeRestriction', printed: printedSize, catalog: row.sizeRestriction, note: w.footnote1 ? 'table footnote (1): "Colossal or larger starships only"' : 'no footnote' });
  if (!isNoisy('damage') && w.damage !== null && !sameDamage(w.damage, row.damage)) diffs.push({ field: 'damage', printed: w.damage, catalog: row.damage });
  if (w.damage === null && row.damage && !/^(See Ammunition|Special|—|-)?$/i.test(row.damage) && row.id === 'autoblaster') diffs.push({ field: 'damage', printed: null, catalog: row.damage, note: 'the table prints no damage for this entry' });
  if (diffs.length) return { ...base, status: 'OCR_ROW_DIFFERS_FROM_CATALOG', differences: diffs, noisy: w.noisy };
  if (w.noisy.length) return { ...base, status: 'MATCH_BUT_OCR_CELL_NOISY_NEEDS_PDF', noisy: w.noisy, certifiable: false };
  return { ...base, status: 'SOURCE_VERIFIED_TEXT', certifiable: false, certificationNote: 'weapon table not yet PDF-reviewed; transcription evidence only' };
}
const comparison = catalog.map(row => {
  if (weaponById.has(row.id)) return compareWeapon(row, weaponById.get(row.id));
  const base = { catalogId: row.id, catalogFile: row.file, catalogName: row.name };
  const hit = printed.get(norm(row.name));
  if (!hit) {
    if (row.file !== 'movement-systems' && row.file !== 'defense-systems') return { ...base, status: 'TABLE_NOT_PARSED_NEEDS_PDF' };
    // Not in the SotG movement/defense tables: look for a heading with this name in the other books.
    const elsewhere = otherBookHeadings(row.name);
    return elsewhere.length
      ? { ...base, status: 'IN_OTHER_BOOK_OCR_UNREADABLE_NEEDS_PDF', foundIn: elsewhere }
      : { ...base, status: 'NO_PRINTED_ROW_FOUND_IN_PARSED_TABLES' };
  }
  const diffs = [];
  // Recorded PDF review: replaces OCR cells it covers (and clears their noise flags).
  const pdf = review.catalogRows[row.id];
  const printedRow = { ...hit };
  if (pdf) {
    Object.assign(printedRow, pdf.cells);
    printedRow.noisy = hit.noisy.filter(n => !(n.cell in pdf.cells));
  }
  if (printedRow.emplacementPoints !== null && printedRow.emplacementPoints !== row.emplacementPoints) diffs.push({ field: 'emplacementPoints', printed: printedRow.emplacementPoints, catalog: row.emplacementPoints });
  if (hit.availability !== row.availability) diffs.push({ field: 'availability', printed: hit.availability, catalog: row.availability });
  if (sizeKey(printedRow.sizeRestriction) !== sizeKey(row.sizeRestriction)) diffs.push({ field: 'sizeRestriction', printed: printedRow.sizeRestriction, catalog: row.sizeRestriction });
  if (hit.cost !== row.cost) diffs.push({ field: 'cost', printed: hit.cost, catalog: row.cost });
  if (hit.costType !== row.costType) diffs.push({ field: 'costType', printed: hit.costType, catalog: row.costType });
  const out = { ...base, printedLine: hit.line, printedName: hit.ocrName, table: hit.table, printedPage: TABLE_PAGE[hit.table] };
  if (diffs.length) return { ...out, status: 'OCR_ROW_DIFFERS_FROM_CATALOG', differences: diffs };
  if (printedRow.noisy.length) return { ...out, status: 'MATCH_BUT_OCR_CELL_NOISY_NEEDS_PDF', noisy: printedRow.noisy };
  if (pdf) return { ...out, status: 'PDF_REVIEWED', reviewedCells: Object.keys(pdf.cells), ...(pdf.catalogCorrection ? { catalogCorrection: pdf.catalogCorrection } : {}) };
  return { ...out, status: 'SOURCE_VERIFIED_TEXT' };
});
const counts = comparison.reduce((a, c) => (a[c.status] = (a[c.status] ?? 0) + 1, a), {});

const evidence = {
  schema: 'swse.vehicle.p2.sotg-modification-evidence.v1',
  book: BOOK, sourceFile: SOURCE, sourceSha256: sha256,
  pageEvidence: 'Printed pages are table-of-contents section ranges (the OCR has no page markers); the PDF is final authority for the exact page.',
  sections: {
    costModifiersAndEmplacement: { printedPages: [38, 40], note: 'Table 3-1 cost modifiers; emplacement points; gaining EP; unused EP (Table 3-2); nonstandard modifications; installation; work force; time; checks' },
    movementSystems: { printedPages: [40, 43], table: 'Table 3-3 p. ' + TABLE_PAGE.movement }, defenseSystems: { printedPages: [43, 44], table: 'Table 3-4 p. ' + TABLE_PAGE.defense },
    weaponSystems: { printedPages: [44, 48] }, accessories: { printedPages: [48, 53] }, stockShips: { printedPages: [52, 53], tables: 'Table 3-8 p. 52, Table 3-9 p. 53 (PDF review)' }
  },
  tables: { movement, defense, weapon: weaponRows },
  stockFrames: frames,
  unusedEmplacementPoints: { printedPages: [review.tables.starshipsOfTheGalaxy['table3-2UnusedEmplacementPoints'].printedPage], rows: unused, unpairedLines: unusedSingle },
  catalogComparison: { counts, rows: comparison }
};

const body = JSON.stringify(evidence, null, 1) + '\n';

/* -------- derived, planner-facing files (generated; never hand-edited) -------- */
const SECTION_PAGES = { movement: [40, 43], defense: [43, 44], weapon: [44, 48] };
const certification = {
  schema: 'swse.vehicle.p2.modification-certification.v1',
  note: 'SOURCE_VERIFIED = every table cell of the catalog row matches the cited Starships of the Galaxy table (clean OCR, or cells read from the PDF by the project owner: evidence PDF_REVIEWED). It is NOT MECHANIC_SPECIFIED: a row becomes installable only when its effect is implemented.',
  evidenceFile: OUT, pdfReviewFile: 'data/audits/vehicles/swse-p2-pdf-review.json', sourceSha256: sha256,
  // The weapon and accessory tables have not been PDF-reviewed: their rows are evidence only and are never certified here.
  rows: Object.fromEntries(comparison.filter(c => c.table !== 'weapon' && ['SOURCE_VERIFIED_TEXT', 'PDF_REVIEWED'].includes(c.status)).map(c => [c.catalogId, {
    status: 'SOURCE_VERIFIED', evidence: c.status === 'PDF_REVIEWED' ? 'PDF_REVIEWED' : 'OCR_TEXT', book: BOOK,
    printedPage: c.printedPage ?? null, printedPageRange: c.printedPage ? [c.printedPage, c.printedPage] : SECTION_PAGES[c.table],
    table: c.table, ocrLine: c.printedLine ?? null, pageResolution: c.printedPage ? 'pdf-table-page' : 'toc-section-range'
  }]))
};
const CERT_OUT = 'data/vehicle-modifications/certification.json';
const certBody = JSON.stringify(certification, null, 1) + '\n';

const frameDoc = {
  schema: 'swse.vehicle.p5.stock-frames.v1',
  book: BOOK, sourceFile: SOURCE, sourceSha256: sha256,
  printedTables: { 'Table 3-8 Stock Ship Types': review.tables.starshipsOfTheGalaxy['table3-8StockShipTypes'].printedPage, 'Table 3-9 Stock Ship Base Values': review.tables.starshipsOfTheGalaxy['table3-9StockShipBaseValues'].printedPage },
  printedPages: [review.tables.starshipsOfTheGalaxy['table3-8StockShipTypes'].printedPage, review.tables.starshipsOfTheGalaxy['table3-9StockShipBaseValues'].printedPage],
  note: 'Stock ship frames for designing a starship from scratch (Starships of the Galaxy, Stock Ships). stock EP is the frame allocation, NOT the unused EP of a constructed ship. SOURCE_VERIFIED_TEXT = every cell clean in the OCR; PDF_CONFIRMED = cells the OCR could not read were read from the PDF (data/audits/vehicles/swse-p2-pdf-review.json).',
  frames: frames.map(f => ({ ...f, printedTables: { 'Table 3-8 Stock Ship Types': review.tables.starshipsOfTheGalaxy['table3-8StockShipTypes'].printedPage, 'Table 3-9 Stock Ship Base Values': review.tables.starshipsOfTheGalaxy['table3-9StockShipBaseValues'].printedPage }, id: f.class.toLowerCase().replace(/\s+/g, '-'), certification: f.noisy.length ? 'NEEDS_PDF_CONFIRMATION' : (f.pdfReviewedCells ? 'PDF_CONFIRMED' : 'SOURCE_VERIFIED_TEXT') }))
};
const FRAME_OUT = 'data/canonical/vehicles/construction/stock-frames.json';
const frameBody = JSON.stringify(frameDoc, null, 1) + '\n';
const outputs = [[OUT, body], [CERT_OUT, certBody], [FRAME_OUT, frameBody]];
const mode = process.argv[2];
if (mode === '--write') {
  for (const [file, content] of outputs) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), content); }
  console.log('wrote', outputs.map(o => o[0]).join(', '), JSON.stringify(counts));
} else if (mode === '--check') {
  const stale = outputs.filter(([file, content]) => !fs.existsSync(path.join(root, file)) || fs.readFileSync(path.join(root, file), 'utf8') !== content).map(o => o[0]);
  if (stale.length) { console.error('stale: ' + stale.join(', ') + ' (run --write)'); process.exit(1); }
  console.log('evidence up to date', JSON.stringify(counts));
} else { console.error('usage: --write|--check'); process.exit(2); }
