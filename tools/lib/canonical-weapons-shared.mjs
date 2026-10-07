// Phase 5C -- shared helpers for the canonical weapons corpus (data/canonical/weapons.json).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CANONICAL_WEAPONS = 'data/canonical/weapons.json';
export const P3B = 'data/audits/item-weapons-phase-3b-canonical-authority.json';
export const P4H = 'data/audits/item-weapons-phase-4h-global-semantic-authority.json';
export const P3C = 'data/audits/item-weapons-phase-3c-production-disposition-ledger.json';
export const readText = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
export const readJson = (f) => JSON.parse(readText(f));
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const sortKeys = (x) => (Array.isArray(x) ? x.map(sortKeys) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])])) : x);
export const stable = (x) => JSON.stringify(sortKeys(x));
export const clone = (x) => JSON.parse(JSON.stringify(x));
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const slug = (n) => String(n).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** Production id convention for identities that never had a production record: weapon-<slug(canonicalName)> (matches the existing weapon-* ids). */
export const newProductionId = (canonicalName) => `weapon-${slug(canonicalName)}`;

/** One canonical record per line (diff-friendly), header pretty-printed. */
export function serializeCorpus(corpus) {
  const { identities, ...head } = corpus;
  const headText = JSON.stringify(sortKeys(head), null, 1);
  return `${headText.slice(0, -2)},\n "identities": [\n${identities.map((x) => JSON.stringify(sortKeys(x))).join(',\n')}\n ]\n}\n`;
}
export const readPackLines = (f) => readText(f).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
export const packText = (docs) => (docs.length ? `${docs.map((d) => JSON.stringify(d)).join('\n')}\n` : '');
