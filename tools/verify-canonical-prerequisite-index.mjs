#!/usr/bin/env node
// PRQ.1C: verify the committed generated canonical prerequisite index against its sources. EXACT-MATCH mode: rebuilds in memory and compares bytes;
// it never rewrites the file. Exit 0 = current, 1 = stale / rejected. Usage: node tools/verify-canonical-prerequisite-index.mjs [--file <path>]
import fs from 'node:fs';
import { buildIndex, serialize } from './build-canonical-prerequisite-index.mjs';

const fi = process.argv.indexOf('--file');
const file = fi >= 0 ? process.argv[fi + 1] : 'data/generated/canonical-prerequisite-index.json';
const { index, errors } = buildIndex();
if (errors.length) { console.error(`REJECTED: sources do not compile (${errors.length}):\n  ` + errors.slice(0, 20).join('\n  ')); process.exit(1); }
if (!fs.existsSync(file)) { console.error(`MISSING: ${file} (run tools/build-canonical-prerequisite-index.mjs)`); process.exit(1); }
const committed = fs.readFileSync(file, 'utf8');
if (committed !== serialize(index)) { console.error(`STALE: ${file} differs from a fresh build of the packs (run tools/build-canonical-prerequisite-index.mjs and review the diff)`); process.exit(1); }
console.log(`canonical prerequisite index is current: ${Object.keys(index.entries).length} entries`);
