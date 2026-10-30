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
const unusedSingle = [];

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
const comparison = catalog.map(row => {
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
  if (hit.emplacementPoints !== null && hit.emplacementPoints !== row.emplacementPoints) diffs.push({ field: 'emplacementPoints', printed: hit.emplacementPoints, catalog: row.emplacementPoints });
  if (hit.availability !== row.availability) diffs.push({ field: 'availability', printed: hit.availability, catalog: row.availability });
  if (sizeKey(hit.sizeRestriction) !== sizeKey(row.sizeRestriction)) diffs.push({ field: 'sizeRestriction', printed: hit.sizeRestriction, catalog: row.sizeRestriction });
  if (hit.cost !== row.cost) diffs.push({ field: 'cost', printed: hit.cost, catalog: row.cost });
  if (hit.costType !== row.costType) diffs.push({ field: 'costType', printed: hit.costType, catalog: row.costType });
  const out = { ...base, printedLine: hit.line, printedName: hit.ocrName, table: hit.table };
  if (diffs.length) return { ...out, status: 'OCR_ROW_DIFFERS_FROM_CATALOG', differences: diffs };
  if (hit.noisy.length) return { ...out, status: 'MATCH_BUT_OCR_CELL_NOISY_NEEDS_PDF', noisy: hit.noisy };
  return { ...out, status: 'SOURCE_VERIFIED_TEXT' };
});
const counts = comparison.reduce((a, c) => (a[c.status] = (a[c.status] ?? 0) + 1, a), {});

const evidence = {
  schema: 'swse.vehicle.p2.sotg-modification-evidence.v1',
  book: BOOK, sourceFile: SOURCE, sourceSha256: sha256,
  pageEvidence: 'Printed pages are table-of-contents section ranges (the OCR has no page markers); the PDF is final authority for the exact page.',
  sections: {
    costModifiersAndEmplacement: { printedPages: [38, 40], note: 'Table 3-1 cost modifiers; emplacement points; gaining EP; unused EP (Table 3-2); nonstandard modifications; installation; work force; time; checks' },
    movementSystems: { printedPages: [40, 43] }, defenseSystems: { printedPages: [43, 44] },
    weaponSystems: { printedPages: [44, 48] }, accessories: { printedPages: [48, 53] }, stockShips: { printedPages: [53, 54] }
  },
  tables: { movement, defense },
  stockFrames: frames,
  unusedEmplacementPoints: { printedPages: [39, 39], rows: unused, unpairedLines: unusedSingle },
  catalogComparison: { counts, rows: comparison }
};

const body = JSON.stringify(evidence, null, 1) + '\n';

/* -------- derived, planner-facing files (generated; never hand-edited) -------- */
const SECTION_PAGES = { movement: [40, 43], defense: [43, 44] };
const certification = {
  schema: 'swse.vehicle.p2.modification-certification.v1',
  note: 'SOURCE_VERIFIED = every table cell of the catalog row matches a clean OCR row of the cited Starships of the Galaxy table. It is NOT MECHANIC_SPECIFIED: a row becomes installable only when its effect is implemented. Page ranges are table-of-contents section ranges; the PDF is final authority for the exact page.',
  evidenceFile: OUT, sourceSha256: sha256,
  rows: Object.fromEntries(comparison.filter(c => c.status === 'SOURCE_VERIFIED_TEXT').map(c => [c.catalogId, {
    status: 'SOURCE_VERIFIED', book: BOOK, printedPageRange: SECTION_PAGES[c.table], table: c.table, ocrLine: c.printedLine, pageResolution: 'toc-section-range'
  }]))
};
const CERT_OUT = 'data/vehicle-modifications/certification.json';
const certBody = JSON.stringify(certification, null, 1) + '\n';

const frameDoc = {
  schema: 'swse.vehicle.p5.stock-frames.v1',
  book: BOOK, sourceFile: SOURCE, sourceSha256: sha256, printedPages: [53, 54],
  note: 'Stock ship frames for designing a starship from scratch (Starships of the Galaxy, Stock Ships). A frame is certified only when every cell parsed cleanly; others need the PDF.',
  frames: frames.map(f => ({ ...f, id: f.class.toLowerCase().replace(/\s+/g, '-'), certification: f.noisy.length ? 'NEEDS_PDF_CONFIRMATION' : 'SOURCE_VERIFIED_TEXT' }))
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
