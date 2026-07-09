#!/usr/bin/env node

/**
 * check-combat-math-ssot.mjs — Combat roll math single-source-of-truth guard
 *
 * Static, report-only check that the canonical combat math seam
 * (scripts/engine/combat/combat-roll-math.js: resolveAttackBonus /
 * resolveDamageBonus) remains the authority:
 *
 *   1. The roll path (scripts/combat/rolls/attacks.js) must call the resolvers.
 *   2. The breakdown/tooltip path (weapons-engine.js getAttackBonusBreakdown /
 *      getDamageBonusBreakdown) must call the resolvers.
 *   3. Report every file that still imports the DEPRECATED combat-utils math
 *      (computeAttackBonus / computeDamageBonus) so the migration list in
 *      docs/systems/COMBAT_MATH_SSOT.md stays honest.
 *
 * A numeric roll-vs-breakdown parity test would need a live Foundry actor/weapon
 * (SchemaAdapters, game, foundry.utils), so it cannot run in plain node. This
 * check locks the structural invariant instead: both paths delegate to the same
 * resolver, which is what guarantees numeric parity at runtime.
 *
 * Report-only by default; --strict exits non-zero if invariants (1) or (2) fail.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const STRICT = process.argv.includes('--strict');

const CANONICAL = 'scripts/engine/combat/combat-roll-math.js';
const ROLL_PATH = 'scripts/combat/rolls/attacks.js';
const BREAKDOWN_PATH = 'scripts/engine/combat/weapons-engine.js';
const LEGACY = 'scripts/combat/utils/combat-utils.js';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

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
const notes = [];

// Invariant 1: roll path delegates to resolvers.
const attacks = read(ROLL_PATH);
for (const fn of ['resolveAttackBonus', 'resolveDamageBonus']) {
  if (!attacks.includes(`${fn}(`)) {
    problems.push(`Roll path ${ROLL_PATH} does not call ${fn}() — combat math may have forked.`);
  }
}

// Invariant 2: breakdown path delegates to resolvers.
const weaponsEngine = read(BREAKDOWN_PATH);
for (const fn of ['resolveAttackBonus', 'resolveDamageBonus']) {
  if (!weaponsEngine.includes(`${fn}(`)) {
    problems.push(`Breakdown path ${BREAKDOWN_PATH} does not call ${fn}() — tooltip math may have forked.`);
  }
}
if (!weaponsEngine.includes(CANONICAL.split('/').pop())) {
  problems.push(`Breakdown path ${BREAKDOWN_PATH} does not import ${CANONICAL}.`);
}

// Invariant 3: enumerate remaining consumers of the deprecated legacy math.
const legacyConsumers = [];
for (const file of walk(SCRIPTS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === LEGACY || rel === CANONICAL) continue;
  const text = fs.readFileSync(file, 'utf8');
  const importsLegacyMath =
    /import[^;]*\b(computeAttackBonus|computeDamageBonus)\b[^;]*from[^;]*combat-utils/.test(text) ||
    /\bcomputeAttackBonus\s*\}?\s*=\s*await import/.test(text) ||
    (text.includes('combat-utils') && /\bcompute(Attack|Damage)Bonus\b/.test(text));
  if (importsLegacyMath) legacyConsumers.push(rel);
}

console.log('\n' + '='.repeat(72));
console.log('  COMBAT MATH SSOT CHECK');
console.log('='.repeat(72));
console.log(`  Canonical seam: ${CANONICAL}`);

if (problems.length === 0) {
  console.log('\n  ✅ Roll path and breakdown path both delegate to the canonical resolvers.');
} else {
  console.log('\n  ❌ Invariant failures:');
  for (const p of problems) console.log(`     - ${p}`);
}

console.log(`\n  Deprecated combat-utils math consumers (${legacyConsumers.length}) — migration candidates:`);
if (legacyConsumers.length === 0) {
  console.log('     (none — legacy duplicate is fully retired)');
} else {
  for (const c of legacyConsumers) console.log(`     - ${c}`);
  console.log('     See docs/systems/COMBAT_MATH_SSOT.md for the parity concern before migrating.');
}
console.log('='.repeat(72) + '\n');

if (STRICT && problems.length > 0) process.exit(1);
process.exit(0);
