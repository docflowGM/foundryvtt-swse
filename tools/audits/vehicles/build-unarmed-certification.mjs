#!/usr/bin/env node
/**
 * Armed / unarmed classification of the published vehicles that carry NO printed firing group in their canonical record.
 *
 * A vehicle is certified UNARMED only when its printed statblock (found by printed title in the sourcebook text corpus, in the publication named by the record)
 * contains no "Ranged" or "Melee" attack line before the statblock's Availability / Cost line. A statblock that DOES print an attack line while the record has no
 * group is an ARMED_RECORD_GAP (a data-identity defect to repair, never a vehicle to certify unarmed). A statblock the corpus search cannot isolate is UNRESOLVED
 * and stays in the armed-or-unknown denominator. Nothing is invented and no denominator is reduced without evidence.
 *
 * Output: data/audits/vehicles/unarmed-vehicle-certification.json   Usage: node tools/audits/vehicles/build-unarmed-certification.mjs --write | --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildUniversalVehiclePackSources } from '../../build-universal-vehicle-pack-sources.mjs';

const MODE = process.argv[2];
if (!['--write', '--check'].includes(MODE)) { console.error('usage: --write|--check'); process.exit(2); }
const OUT = 'data/audits/vehicles/unarmed-vehicle-certification.json';
const CORPUS = 'reference/sourcebooks';
const norm = s => String(s ?? '').toLowerCase().replace(/[“”"']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const coverage = JSON.parse(fs.readFileSync('data/audits/vehicles/stock-weapon-coverage.json', 'utf8'));
const bookFile = book => fs.readdirSync(CORPUS).find(f => f.toLowerCase().startsWith(String(book).toLowerCase().slice(0, 12)) && f.endsWith('.txt'));
const corpora = new Map();
const lines = book => { const f = bookFile(book); if (!f) return null; if (!corpora.has(f)) corpora.set(f, fs.readFileSync(path.join(CORPUS, f), 'utf8').split('\n')); return { f, ls: corpora.get(f) }; };

// Statblocks the automatic isolation could not frame (the OCR header differs from the printed title), reviewed by hand in the corpus text: no Ranged / Melee line
// appears between the Speed and Fighting Space lines (where the book prints a vehicle's attacks).
const MANUAL_REVIEW = {
  'cw-daystar-dc0052-intergalactic-speeder': { file: 'Clone Wars Campaign Guide_djvu.txt', statblockLine: 12961 },
  'kotor-ubrikkian-pl-90-luxury-speeder': { file: 'Knights of the Old Republic Campaign Guide_djvu.txt', statblockLine: 9083 },
  're-f9-tz-transport': { file: 'Rebellion Era Campaign Guide_djvu.txt', statblockLine: 14933 },
  'sotg-corellian-engineering-corporation-action-vi-bulk-transport': { file: 'Starships of the Galaxy_djvu.txt', statblockLine: 5488 }
};
const rows = [];
for (const v of coverage.vehicles.filter(x => !(x.groups ?? []).length)) {
  const d = docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === v.sourceEntryKey);
  const rec = d.flags.swse.universalVehicleSource.source;
  const { book, page, printedTitle, printedTypeLine } = rec.publication ?? {};
  const c = lines(book);
  const want = norm(printedTitle);
  let status = 'UNRESOLVED', evidence = null;
  if (c && want) {
    // the statblock header is the printed title; the statblock runs to its Availability / Cost line
    const isHeader = l => { const n = norm(l); if (!n.startsWith(want)) return false; const rest = n.slice(want.length).trim(); return rest === '' || /^cl ?\d+( .*)?$/.test(rest) || rest.startsWith('cost'); };
    const starts = c.ls.map((l, i) => (isHeader(l) ? i : -1)).filter(i => i >= 0);
    const blocks = starts.map(i => { let e = i + 1; while (e < Math.min(c.ls.length, i + 80) && !/^\s*(Availability|Cost)\b/.test(c.ls[e])) e++; return { start: i, end: e, text: c.ls.slice(i, e + 1) }; })
      .filter(b => b.text.some(l => /^\s*(Init|Defense|hp|Speed|Fort)\b/.test(l)));
    if (blocks.length >= 1) {
      const attackLines = blocks.flatMap(b => b.text.filter(l => /^\s*(Ranged|Melee)\b/.test(l)));
      status = attackLines.length ? 'ARMED_RECORD_GAP' : 'UNARMED_CONFIRMED';
      evidence = { file: c.f, statblockLine: blocks[0].start + 1, statblocksFound: blocks.length, attackLines: attackLines.map(l => l.trim().slice(0, 140)) };
    }
  }
  if (status === 'UNRESOLVED' && MANUAL_REVIEW[v.sourceEntryKey]) { status = 'UNARMED_CONFIRMED'; evidence = { ...MANUAL_REVIEW[v.sourceEntryKey], statblocksFound: 1, attackLines: [], review: 'manual (corpus text)' }; }
  rows.push({ sourceEntryKey: v.sourceEntryKey, printedTitle, book, page, printedTypeLine, status, evidence });
}
const counts = rows.reduce((m, r) => (m[r.status] = (m[r.status] ?? 0) + 1, m), {});
const out = { schema: 'swse.vehicle.unarmed-certification.v1', note: 'Vehicles with no printed firing group in the canonical record, classified from the printed statblock (sourcebook text corpus; the PDF is the final authority). UNARMED_CONFIRMED = no Ranged/Melee line in the statblock. ARMED_RECORD_GAP = the statblock prints an attack line the record lacks (a data defect to repair). UNRESOLVED = the statblock could not be isolated automatically.', counts, rows };
const text = JSON.stringify(out, null, 1) + '\n';
if (MODE === '--write') { fs.writeFileSync(OUT, text); console.log('wrote', OUT, JSON.stringify(counts)); }
else { const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text; console.log(same ? 'up to date' : 'STALE', JSON.stringify(counts)); process.exit(same ? 0 : 1); }
