#!/usr/bin/env node

/**
 * check-attack-outcome-ssot.mjs — Attack hit/critical interpretation guard.
 *
 * Static check that makes independent attack hit/critical interpretation
 * visible instead of allowing it to silently proliferate. Phase 1 of the
 * rolling-system alignment work introduced
 * scripts/engine/combat/attack-outcome-resolver.js as the single authority
 * for natural-1/natural-20/critical-threat interpretation and wired the
 * canonical attack path (scripts/combat/rolls/attacks.js) and the vehicle
 * missile second-attack path through it.
 *
 * This does NOT prove every hit/critical decision in the repo is unified —
 * scripts/combat/rolls/enhanced-rolls.js and scripts/rolls/roll-config.js
 * are known, pre-existing duplicate implementations (including an actual
 * critical-confirmation roll, which SWSE does not use) left for Phase 2.
 * They are listed in KNOWN_DEBT below so this check reports them without
 * treating them as new regressions.
 *
 * Report-only by default; --strict exits non-zero on any file with
 * ad hoc hit/critical heuristics that is neither the resolver itself nor an
 * allowlisted/known-debt consumer.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const STRICT = process.argv.includes('--strict');

const RESOLVER = 'scripts/engine/combat/attack-outcome-resolver.js';

// Files that legitimately compare a roll total to a defense value for
// purposes other than declaring an attack hit/critical (e.g. skill checks,
// saves, DCs), or that already delegate to AttackOutcomeResolver and are
// covered by tests/attack-outcome-wiring.test.mjs.
const ALLOWLIST = new Set([
  RESOLVER,
  'scripts/combat/rolls/attacks.js',
  'scripts/combat/systems/vehicle/vehicle-weapons.js',
  'scripts/engine/combat/full-attack-executor.js' // consumes rollAttack()'s outcome-derived isHit/isCritical, does not compute them
]);

// Pre-existing duplicate hit/critical logic, confirmed during the Phase 1
// audit (docs/audits/rolling-system-alignment-phase-1.md) and intentionally
// left out of this pass per the "do not rewrite the entire combat system"
// constraint. Reported, not hidden — remove entries here only once a file is
// migrated to AttackOutcomeResolver.
const KNOWN_DEBT = new Set([
  'scripts/combat/rolls/enhanced-rolls.js',
  'scripts/rolls/roll-config.js'
]);

const HIT_ASSIGNMENT = /\b(?:const|let)\s+(isHit|isCritical|hits|critConfirmed)\s*=\s*[^;]*(?:>=|===)\s*(?:targetReflex|targetDefense|target(?:'s)?[A-Za-z]*Defense|20)\b/;

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

const hits = [];

for (const file of walk(SCRIPTS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (ALLOWLIST.has(rel)) continue;

  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (HIT_ASSIGNMENT.test(line)) {
      hits.push({ file: rel, line: index + 1, text: line.trim(), knownDebt: KNOWN_DEBT.has(rel) });
    }
  });
}

console.log('\n' + '='.repeat(72));
console.log('  ATTACK OUTCOME SSOT CHECK');
console.log('='.repeat(72));

const newHits = hits.filter(h => !h.knownDebt);
const debtHits = hits.filter(h => h.knownDebt);

if (debtHits.length) {
  console.log(`\nKnown pre-existing debt (${debtHits.length} site(s), not new):`);
  for (const hit of debtHits) {
    console.log(`  - ${hit.file}:${hit.line}  ${hit.text}`);
  }
}

if (newHits.length) {
  console.log(`\n${STRICT ? 'FAILURES' : 'WARNINGS'} — independent attack hit/critical interpretation outside the allowlist (${newHits.length}):`);
  for (const hit of newHits) {
    console.log(`  - ${hit.file}:${hit.line}  ${hit.text}`);
  }
} else {
  console.log('\nNo new independent attack hit/critical interpretation found outside the known-debt list.');
}

console.log('='.repeat(72) + '\n');

if (STRICT && newHits.length) {
  process.exit(1);
}
