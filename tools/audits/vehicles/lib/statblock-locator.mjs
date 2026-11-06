/**
 * Locate a vehicle's printed statblock in the sourcebook TEXT corpus (reference/sourcebooks; OCR/DjVu text - the PDF stays the final authority).
 * Shared by the unarmed certification and the gap-consolidation analysis so both read the corpus the same way. Read-only; no side effects.
 */
import fs from 'node:fs';
import path from 'node:path';

const CORPUS = 'reference/sourcebooks';
export const normTitle = s => String(s ?? '').toLowerCase().replace(/[“”"']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const corpora = new Map();
const bookFile = book => fs.readdirSync(CORPUS).find(f => f.toLowerCase().startsWith(String(book).toLowerCase().slice(0, 12)) && f.endsWith('.txt'));
export function corpusLines(book) {
  const f = bookFile(book); if (!f) return null;
  if (!corpora.has(f)) corpora.set(f, fs.readFileSync(path.join(CORPUS, f), 'utf8').split('\n'));
  return { f, ls: corpora.get(f) };
}

/** Statblock candidates for a printed title: header line = the title (optionally "CL n" / "Cost"), through the Availability / Cost line, containing a statblock-shaped line. */
export function locateStatblocks(book, printedTitle) {
  const c = corpusLines(book); const want = normTitle(printedTitle);
  if (!c || !want) return { file: c?.f ?? null, blocks: [] };
  const isHeader = l => { const n = normTitle(l); if (!n.startsWith(want)) return false; const rest = n.slice(want.length).trim(); return rest === '' || /^cl ?\d+( .*)?$/.test(rest) || rest.startsWith('cost'); };
  const starts = c.ls.map((l, i) => (isHeader(l) ? i : -1)).filter(i => i >= 0);
  const blocks = starts.map(i => { let e = i + 1; while (e < Math.min(c.ls.length, i + 80) && !/^\s*(Availability|Cost)\b/.test(c.ls[e])) e++; return { start: i, end: e, text: c.ls.slice(i, e + 1) }; })
    .filter(b => b.text.some(l => /^\s*(Init|Defense|hp|Speed|Fort)\b/.test(l)));
  return { file: c.f, blocks };
}
