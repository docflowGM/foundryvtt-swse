#!/usr/bin/env node
/**
 * ti4-authority-inventory.mjs — TI-4A REPORT-ONLY mutation-boundary inventory.
 *
 * Reports writes to protected mechanical state (credits, Force Points, ammunition/fire state, action economy, equipment state,
 * upgrade/modification state, progression entitlements, ownership/followers, GM approval state). It NEVER blocks anything:
 * a reported or newly discovered writer does not change the exit code. Exit codes:
 *   0  analysis completed (violations, if any, are only reported)
 *   1  --check-artifact found a MALFORMED artifact (schema/ordering/total mismatch)
 *   2  execution error (bad arguments, unreadable root, I/O failure)
 *
 * Usage:
 *   node tools/ti4-authority-inventory.mjs [--root <dir>] [--source-ref <label>] [--out-json <file>] [--out-md <file>] [--quiet]
 *   node tools/ti4-authority-inventory.mjs --check-artifact <file.json>
 *
 * See docs/audits/transaction-integrity/ti-4/ti4a-static-analysis-coverage-and-limitations.md for what it cannot see.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeTree, renderSummary, validateArtifact } from './lib/ti4-authority-inventory.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const has = (name) => args.includes(name);

function die(msg) { console.error(`ti4-authority-inventory: ${msg}`); process.exit(2); }

try {
  const checkPath = opt('--check-artifact');
  if (checkPath) {
    const art = JSON.parse(fs.readFileSync(checkPath, 'utf8'));
    const problems = validateArtifact(art);
    if (problems.length) { for (const p of problems.slice(0, 20)) console.error(`MALFORMED: ${p}`); process.exit(1); }
    console.log(`artifact OK: ${art.records.length} records, sourceRef=${art.sourceRef}`);
    process.exit(0);
  }
  const root = path.resolve(opt('--root') ?? path.join(here, '..'));
  if (!fs.existsSync(root)) die(`root not found: ${root}`);
  const art = analyzeTree(root, { sourceRef: opt('--source-ref') ?? 'unspecified' });
  const outJson = opt('--out-json');
  const outMd = opt('--out-md');
  if (outJson) fs.writeFileSync(outJson, JSON.stringify(art, null, 1) + '\n');
  if (outMd) fs.writeFileSync(outMd, renderSummary(art));
  if (!has('--quiet')) console.log(renderSummary(art));
  process.exit(0);
} catch (e) {
  die(String(e?.stack ?? e));
}
