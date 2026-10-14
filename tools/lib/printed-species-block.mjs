/**
 * Extracts the printed trait names of a species-traits block from the OCR text of a sourcebook (the searchable layer; the
 * PDF stays the final authority). Derived metadata only: names of printed traits, never their rules text.
 */
import { readFileSync } from 'node:fs';

const BOOK_DIR = new URL('../../reference/sourcebooks/', import.meta.url);
const cache = new Map();
export const bookLines = name => {
  if (!cache.has(name)) cache.set(name, readFileSync(new URL(`${name}_djvu.txt`, BOOK_DIR), 'utf8').split('\n'));
  return cache.get(name);
};

const FIELD = /^[\s©*®•\-]*([A-Za-z][A-Za-z'’\-]*(?: [A-Za-z'’\-()]+){0,4}?)\s*[:;]/;
const END = /^[\s©*®•\-]*(Automatic Languages|Languages)\s*:/;

/** `startLine` is the 1-based line of the block's first line ("... share the following species traits" or the heading). */
export function extractPrintedBlock(book, startLine, { maxLines = 90 } = {}) {
  const lines = bookLines(book);
  const names = [];
  let end = null;
  for (let i = startLine - 1; i < Math.min(lines.length, startLine - 1 + maxLines); i++) {
    const m = lines[i].match(FIELD);
    if (m) {
      const n = m[1].trim();
      if (n && !/^(Personality|Physical Description|Homeworld|Example Names|Adventurers)$/.test(n)) names.push(n);
      if (END.test(lines[i])) { end = i + 1; break; }
    }
  }
  return { names, endLine: end };
}
