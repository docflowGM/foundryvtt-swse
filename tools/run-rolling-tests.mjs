#!/usr/bin/env node

/**
 * run-rolling-tests.mjs — focused rolling-system test runner (Phase 5
 * rolling-system alignment CI support).
 *
 * Runs every tests/*.test.mjs file EXCEPT a documented, fixed list of
 * pre-existing Force-power-track failures that are unrelated to the
 * rolling-system work (see docs/audits/rolling-system-alignment-phase-5.md,
 * "Force-power-track failure classification" — all five were verified via
 * git history to predate every rolling-system-alignment commit and to
 * import files no rolling-system-alignment commit has ever touched; they
 * fail under plain Node because their production files use Foundry-only
 * absolute `/systems/foundryvtt-swse/...` imports, not because of any
 * logic defect).
 *
 * This exists so CI can be honestly green for the rolling-system track
 * without either (a) claiming the full, unrelated test suite is green when
 * it is not, or (b) silently skipping tests that ARE part of the rolling
 * system. Every test file this script runs is a real assertion pass/fail;
 * nothing here is mocked away.
 *
 * Usage: node tools/run-rolling-tests.mjs
 * Exit code: 0 if every non-excluded test passes, 1 otherwise.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');

// Pre-existing, verified-unrelated Force-power-track failures (environment
// limitation: absolute Foundry-only imports, not a rolling-system defect).
// See the Phase 5 audit for the git-history evidence behind each entry.
export const KNOWN_EXCLUDED_TESTS = [
  'force-power-final-integration.test.mjs',
  'phase3-force-power-corrections.test.mjs',
  'phase4-force-modifier-automation.test.mjs',
  'phase5-force-healing-mitigation.test.mjs',
  'phase6-force-direct-damage.test.mjs'
];

function main() {
  const allTests = fs.readdirSync(TESTS_DIR)
    .filter(name => name.endsWith('.test.mjs'))
    .sort();
  const excludedSet = new Set(KNOWN_EXCLUDED_TESTS);
  const toRun = allTests.filter(name => !excludedSet.has(name));
  const missingExclusions = KNOWN_EXCLUDED_TESTS.filter(name => !allTests.includes(name));

  console.log('='.repeat(72));
  console.log('  ROLLING-SYSTEM FOCUSED TEST RUN');
  console.log('='.repeat(72));
  console.log(`\nDiscovered ${allTests.length} test file(s); running ${toRun.length}, excluding ${KNOWN_EXCLUDED_TESTS.length} documented pre-existing Force-power-track failures:`);
  for (const name of KNOWN_EXCLUDED_TESTS) console.log(`  - ${name}${missingExclusions.includes(name) ? '  [WARNING: file not found — exclusion list may be stale]' : ''}`);
  console.log('');

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const name of toRun) {
    const result = spawnSync(process.execPath, [path.join(TESTS_DIR, name)], { encoding: 'utf8' });
    if (result.status === 0) {
      pass += 1;
      console.log(`  PASS  ${name}`);
    } else {
      fail += 1;
      failures.push(name);
      console.log(`  FAIL  ${name}`);
      console.log((result.stdout + result.stderr).split('\n').slice(-15).map(l => `        ${l}`).join('\n'));
    }
  }

  console.log('\n' + '-'.repeat(72));
  console.log(`Result: ${pass} passed, ${fail} failed (of ${toRun.length} run; ${KNOWN_EXCLUDED_TESTS.length} excluded as documented pre-existing failures).`);
  if (failures.length) {
    console.log('Failing:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log('='.repeat(72));

  if (missingExclusions.length) {
    console.error(`\nERROR: ${missingExclusions.length} entries in KNOWN_EXCLUDED_TESTS do not exist in tests/ — update this list.`);
    process.exit(1);
  }
  process.exit(fail > 0 ? 1 : 0);
}

// Only run when executed directly (`node tools/run-rolling-tests.mjs`) —
// merely importing this module (e.g. to read KNOWN_EXCLUDED_TESTS from a
// test file) must not trigger a full run, since that run itself spawns
// every tests/*.test.mjs file as a subprocess, including whichever test
// file imported this module — an unbounded recursive spawn otherwise.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
