#!/usr/bin/env node

/**
 * check-combat-math-ssot.mjs — Combat roll math single-source-of-truth guard
 *
 * Static check that the canonical combat math seam
 * (scripts/engine/combat/combat-roll-math.js: resolveAttackBonus /
 * resolveDamageBonus) remains the authority:
 *
 *   1. The roll path (scripts/combat/rolls/attacks.js) must call the resolvers.
 *   2. The breakdown/tooltip path (weapons-engine.js getAttackBonusBreakdown /
 *      getDamageBonusBreakdown) must call the resolvers.
 *   3. The historical combat-utils computeAttackBonus / computeDamageBonus exports
 *      must remain compatibility wrappers that delegate to the same resolvers.
 *   4. Report files still importing the compatibility wrappers so migration debt
 *      stays visible without implying math is forked.
 *
 * A numeric roll-vs-breakdown parity test would need a live Foundry actor/weapon
 * (SchemaAdapters, game, foundry.utils), so it cannot run in plain node. This
 * check locks the structural invariant instead: roll, breakdown, and legacy
 * wrapper consumers all delegate to the same resolver.
 *
 * Report-only by default; --strict exits non-zero if hard invariants fail.
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

// Invariant 3: legacy compatibility exports delegate to canonical resolvers.
const legacyText = read(LEGACY);
if (!legacyText.includes('resolveAttackBonus(actor, weapon')) {
  problems.push(`${LEGACY} computeAttackBonus() does not delegate to resolveAttackBonus().`);
}
if (!legacyText.includes('resolveDamageBonus(actor, weapon')) {
  problems.push(`${LEGACY} computeDamageBonus() does not delegate to resolveDamageBonus().`);
}

// Invariant 4: enumerate remaining consumers of the compatibility wrappers.
const wrapperConsumers = [];
for (const file of walk(SCRIPTS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === LEGACY || rel === CANONICAL) continue;
  const text = fs.readFileSync(file, 'utf8');
  const importsWrapperMath =
    /import[^;]*\b(computeAttackBonus|computeDamageBonus)\b[^;]*from[^;]*combat-utils/.test(text) ||
    /\bcomputeAttackBonus\s*\}?\s*=\s*await import/.test(text) ||
    (text.includes('combat-utils') && /\bcompute(Attack|Damage)Bonus\b/.test(text));
  if (importsWrapperMath) wrapperConsumers.push(rel);
}

console.log('\n' + '='.repeat(72));
console.log('  COMBAT MATH SSOT CHECK');
console.log('='.repeat(72));
console.log(`  Canonical seam: ${CANONICAL}`);

if (problems.length === 0) {
  console.log('\n  OK: roll path, breakdown path, and compatibility wrappers delegate to canonical resolvers.');
} else {
  console.log('\n  Invariant failures:');
  for (const p of problems) console.log(`     - ${p}`);
}

console.log(`\n  Legacy wrapper consumers (${wrapperConsumers.length}) — API migration candidates:`);
if (wrapperConsumers.length === 0) {
  console.log('     (none — wrapper API is fully retired)');
} else {
  for (const c of wrapperConsumers) console.log(`     - ${c}`);
  console.log('     These consumers inherit canonical math through combat-utils wrappers, but should eventually import combat-roll-math directly.');
}
console.log('='.repeat(72) + '\n');

if (STRICT && problems.length > 0) process.exit(1);
process.exit(0);
