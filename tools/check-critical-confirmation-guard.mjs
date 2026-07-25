#!/usr/bin/env node

/**
 * check-critical-confirmation-guard.mjs — no critical-confirmation rolls guard
 *
 * Static check that SWSE's "no critical-confirmation roll" rule stays true.
 * Phase 1/Phase 2 rolling-system alignment (docs/audits/rolling-system-alignment-phase-1.md,
 * docs/audits/rolling-system-alignment-phase-2.md) removed the last active
 * critical-confirmation call sites (scripts/combat/rolls/enhanced-rolls.js's
 * rollAutofire()/rollFullAttack() used to call analyzeCriticalThreat()/
 * rollCriticalConfirmation() from scripts/rolls/roll-config.js). Those two
 * functions remain in roll-config.js only as deprecated, unused compatibility
 * exports.
 *
 * This guard fails (in --strict mode) if any file outside the allowlist below
 * calls rollCriticalConfirmation(...) or re-implements a second attack roll
 * whose only purpose is to "confirm" a critical (a roll gated on an existing
 * threat/hit state that re-compares totals to a defense).
 *
 * Report-only by default; --strict exits non-zero if a new call site appears.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const STRICT = process.argv.includes('--strict');

// The deprecated definitions themselves are allowed to exist (compatibility
// exports); only new CALLERS are a regression.
const DEFINITION_FILE = 'scripts/rolls/roll-config.js';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

const problems = [];

for (const file of walk(SCRIPTS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === DEFINITION_FILE) continue;

  const text = fs.readFileSync(file, 'utf8');
  if (/\brollCriticalConfirmation\s*\(/.test(text)) {
    const lineNumber = text.slice(0, text.search(/\brollCriticalConfirmation\s*\(/)).split('\n').length;
    problems.push(`${rel}:${lineNumber} calls rollCriticalConfirmation() — SWSE does not use a critical-confirmation roll. Use AttackOutcomeResolver instead.`);
  }
}

console.log('\n' + '='.repeat(72));
console.log('  CRITICAL-CONFIRMATION GUARD');
console.log('='.repeat(72));

if (problems.length) {
  console.log(`\n${STRICT ? 'FAILURES' : 'WARNINGS'} (${problems.length}):`);
  for (const problem of problems) {
    console.log(`  - ${problem}`);
  }
} else {
  console.log('\nNo active callers of rollCriticalConfirmation() found outside the deprecated definition file.');
}

console.log('='.repeat(72) + '\n');

if (STRICT && problems.length) {
  process.exit(1);
}
