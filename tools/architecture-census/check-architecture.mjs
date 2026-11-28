#!/usr/bin/env node
/**
 * Architecture ratchet (Phase 3A.4).
 *
 * Censuses the CURRENT code (build-census.mjs --current) and runs the invariant probes
 * against it, then compares with the committed limits in
 *   data/audits/architecture-census/implementation/ratchet-baseline.json
 * Existing violations are baseline debt and do not fail. A check FAILS when:
 *   - any per-file violation count rises above its limit (a new violation, or a new file with one), or
 *   - any aggregate metric rises above its limit.
 * Per-file comparison means a fix in one file cannot offset a new violation in another.
 *
 * Usage:
 *   node tools/architecture-census/check-architecture.mjs            # check (exit 1 on regression)
 *   node tools/architecture-census/check-architecture.mjs --lower     # lower limits to current values
 *                                                                      # (refuses if anything rose)
 *   node tools/architecture-census/check-architecture.mjs --init      # write limits from the current tree
 *                                                                      # (used once to seed from the baseline)
 *   --json            print the machine-readable result
 *
 * Needs acorn + acorn-walk (see build-census.mjs; CI sets NODE_TOOLS). Read-only for the system:
 * writes only its temp dir and (with --lower/--init) the ratchet baseline file.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const LIMITS = path.join(ROOT, 'data', 'audits', 'architecture-census', 'implementation', 'ratchet-baseline.json');
const arg = n => process.argv.includes(n);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-ratchet-'));

function run(script, args) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) { console.error(`${script} failed (exit ${r.status})\n${r.stderr || r.stdout}`); process.exit(2); }
}
run('build-census.mjs', ['--current', '--out', TMP]);
run('probe-invariants.mjs', ['--census-dir', TMP]);

const J = p => JSON.parse(fs.readFileSync(path.join(TMP, p), 'utf8'));
const base = J('census-baseline.json');
const probes = Object.fromEntries(J('contracts/invariant-probes.json').probes.map(p => [p.id, p]));

// per-file (or per-edge) counts for each probe; a violation is "new" when its key's count rises
const perKey = {};
const countBy = (arr, keyFn) => arr.reduce((o, x) => { const k = keyFn(x); o[k] = (o[k] || 0) + (x.count ?? 1); return o; }, {});
perKey['P-A02'] = countBy(probes['P-A02-direct-document-writes'].sites, s => s.path);
perKey['P-A03'] = countBy(probes['P-A03-derived-writes-outside-actor-classes'].sites, s => s.path);
perKey['P-A04'] = countBy(probes['P-A04-presentation-direct-writes'].sites, s => s.path);
perKey['P-A05'] = countBy(probes['P-A05-chat-outside-swse-chat'].sites, s => s.path);
perKey['P-A06'] = countBy(probes['P-A06-settings-get-in-engines'].sites, s => s.path);
perKey['P-A07-ui'] = countBy(probes['P-A07-engine-imports-ui'].edges, e => `${e.path}>${e.target}`);
perKey['P-A08'] = countBy(probes['P-A08-writes-in-render-or-prepare'].sites, s => s.path);
perKey['P-A09-prototype'] = countBy(probes['P-A09-compat-and-monkeypatch'].prototypePatches, s => s.path);
perKey['P-A09-modules'] = countBy(probes['P-A09-compat-and-monkeypatch'].patchModules, s => s.path);
perKey['P-A10'] = countBy(probes['P-A10-credit-writes-outside-transaction-engine'].sites, s => s.path);
perKey['P-A16'] = countBy(probes['P-A16-module-caches'].sites.filter(s => !s.hasInvalidate), s => s.path);

const reach = base.js.runtimeReachability;
const aggregate = {
  staticImportCycles: base.js.staticImportCycles,
  filesInStaticCycles: base.js.filesInStaticCycles,
  unreachableRuntimeModules: (reach['orphan-unreferenced'] || 0) + (reach['unreachable-importers-only'] || 0),
  testOnlyRuntimeModules: reach['test-only-import'] || 0,
  exactFunctionCloneGroupsRuntime: base.complexity.exactFunctionCloneGroups.runtime,
  compatPatchModules: base.complexity.compatPatchModules,
  chatMessageCreateOutsideSwseChat: base.stateWrites.chatMessageCreateOutsideSwseChat,
  runtimeDirectDocumentWriteSites: base.stateWrites.runtimeDirectDocumentWriteSites,
};
const current = { aggregate, perKey };

if (arg('--init')) {
  fs.mkdirSync(path.dirname(LIMITS), { recursive: true });
  fs.writeFileSync(LIMITS, JSON.stringify({ schema: 'swse.architecture-ratchet/1', note: 'Limits only go DOWN. Raise requires an explicit owner-approved exception recorded in docs/architecture/v2-contracts/DECISIONS.md.', seededFromCommit: base.auditedCommit, ...current }, null, 1) + '\n');
  console.log(`ratchet baseline written (${Object.keys(perKey).length} probes, ${Object.keys(aggregate).length} aggregates)`);
  process.exit(0);
}

const lim = JSON.parse(fs.readFileSync(LIMITS, 'utf8'));
const regressions = []; const improvements = [];
for (const [k, v] of Object.entries(aggregate)) {
  const l = lim.aggregate[k];
  if (l === undefined) regressions.push(`aggregate ${k}: no limit recorded`);
  else if (v > l) regressions.push(`aggregate ${k}: ${v} > limit ${l}`);
  else if (v < l) improvements.push(`aggregate ${k}: ${v} < limit ${l}`);
}
for (const [probe, cur] of Object.entries(perKey)) {
  const lp = lim.perKey[probe] || {};
  for (const [key, v] of Object.entries(cur)) {
    const l = lp[key] || 0;
    if (v > l) regressions.push(`${probe} ${key}: ${v} > limit ${l}${l === 0 ? ' (NEW)' : ''}`);
  }
  const lowered = Object.entries(lp).filter(([key, l]) => (cur[key] || 0) < l).length;
  if (lowered) improvements.push(`${probe}: ${lowered} key(s) below limit`);
}

if (arg('--lower')) {
  if (regressions.length) { console.error('Refusing to lower limits while regressions exist:\n' + regressions.join('\n')); process.exit(1); }
  const next = { ...lim, aggregate, perKey };
  fs.writeFileSync(LIMITS, JSON.stringify(next, null, 1) + '\n');
  console.log(`limits lowered (${improvements.length} improvement group(s))`);
  process.exit(0);
}
if (arg('--json')) console.log(JSON.stringify({ regressions, improvements, aggregate }, null, 1));
else {
  console.log('Architecture ratchet (current code vs committed limits)');
  for (const [k, v] of Object.entries(aggregate)) console.log(`  ${k.padEnd(36)} ${String(v).padStart(6)}  (limit ${lim.aggregate[k]})`);
  for (const [k, v] of Object.entries(perKey)) console.log(`  ${k.padEnd(36)} ${String(Object.values(v).reduce((a, b) => a + b, 0)).padStart(6)}  in ${Object.keys(v).length} key(s)`);
  if (improvements.length) console.log('\nBelow limit (run with --lower to lock in):\n  ' + improvements.join('\n  '));
}
if (regressions.length) { console.error('\nARCHITECTURE REGRESSION (new violations above the committed baseline):\n  ' + regressions.join('\n  ')); process.exit(1); }
console.log('\nRatchet OK: no new violations above baseline debt.');
