#!/usr/bin/env node

/**
 * check-full-attack-reroll-guard.mjs — Phase 5 interactive full-attack
 * reroll guard.
 *
 * Static check for rolling-system alignment invariants added in Phase 5
 * (docs/audits/rolling-system-alignment-phase-5.md):
 *
 *   1. Only full-attack-message-state.js writes 'flags.swse.attacks' on a
 *      ChatMessage — no other file bypasses the state service to mutate a
 *      combined Full Attack card's per-attack revision state directly.
 *   2. The full-attack reroll handler (meta-resource-feat-resolver.js)
 *      never calls ActionEconomyConsumption.spend / _spendFullAttackEconomy
 *      — a reroll must never re-spend the shared sequence declaration cost.
 *   3. The card renderer (full-attack-card-renderer.js) never computes
 *      attack math or hit/critical state — no BAB/ability-modifier
 *      lookups and no AttackOutcomeResolver.resolve() call; it only
 *      formats already-resolved values from stored state.
 *   4. No new Roll( construction outside RollEngine in the reroll handler
 *      or the state service (dice execution stays in RollEngine/RollCore).
 *   5. No direct actor.update() in any Phase 5 full-attack file.
 *
 * Report-only by default; --strict exits non-zero on violations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const STRICT = process.argv.includes('--strict');

const STATE_SERVICE_FILE = 'scripts/engine/combat/full-attack-message-state.js';
const RENDERER_FILE = 'scripts/engine/combat/full-attack-card-renderer.js';
const RESOLVER_FILE = 'scripts/engine/feats/meta-resource-feat-resolver.js';
const FULL_ATTACK_FILES = new Set([
  STATE_SERVICE_FILE,
  RENDERER_FILE,
  'scripts/engine/combat/full-attack-executor.js',
  RESOLVER_FILE,
  'scripts/ui/chat/chat-interaction-bridge.js'
]);

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

// Invariant 1: only the state service writes 'flags.swse.attacks'.
const ATTACKS_FLAG_WRITE_PATTERN = /'flags\.swse\.attacks'/;
for (const file of walk(SCRIPTS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === STATE_SERVICE_FILE) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (ATTACKS_FLAG_WRITE_PATTERN.test(text)) {
    problems.push(`${rel}: writes 'flags.swse.attacks' directly, bypassing full-attack-message-state.js — the state service must be the only writer of combined-card attack-revision state.`);
  }
}

// Invariant 2: the reroll handler never re-spends the shared sequence cost.
const resolverPath = path.join(ROOT, RESOLVER_FILE);
if (fs.existsSync(resolverPath)) {
  const text = fs.readFileSync(resolverPath, 'utf8');
  const start = text.indexOf('static async resolveFullAttackRerollButton(');
  if (start < 0) {
    problems.push(`${RESOLVER_FILE}: resolveFullAttackRerollButton() not found — guard pattern may need updating.`);
  } else {
    const nextStatic = text.indexOf('\n  static ', start + 10);
    const body = nextStatic > 0 ? text.slice(start, nextStatic) : text.slice(start);
    if (/ActionEconomyConsumption\.spend\(|_spendFullAttackEconomy\(/.test(body)) {
      problems.push(`${RESOLVER_FILE}: resolveFullAttackRerollButton() calls a shared sequence-cost spend function — a per-attack reroll must never re-spend the shared declaration cost.`);
    }
  }
} else {
  problems.push(`${RESOLVER_FILE} not found.`);
}

// Invariant 3: the card renderer never computes attack math.
const rendererPath = path.join(ROOT, RENDERER_FILE);
if (fs.existsSync(rendererPath)) {
  const text = fs.readFileSync(rendererPath, 'utf8');
  if (/getBAB\(|getAbilityMod\(|AttackOutcomeResolver\.resolve\(/.test(text)) {
    problems.push(`${RENDERER_FILE}: computes attack math or hit/critical state — chat rendering must only format already-resolved stored values.`);
  }
} else {
  problems.push(`${RENDERER_FILE} not found.`);
}

// Invariant 4/5: no new Roll(/actor.update( in the Phase 5 full-attack files.
for (const rel of FULL_ATTACK_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  if (/new Roll\(/.test(text)) {
    problems.push(`${rel}: constructs 'new Roll(' directly — dice execution must go through RollEngine/RollCore.`);
  }
  if (/actor\.update\(/.test(text)) {
    problems.push(`${rel}: calls 'actor.update(' directly — actor mutations must go through an ActorEngine-backed authority.`);
  }
}

console.log('\n' + '='.repeat(72));
console.log('  FULL-ATTACK REROLL GUARD (Phase 5)');
console.log('='.repeat(72));

if (problems.length) {
  console.log(`\n${STRICT ? 'FAILURES' : 'WARNINGS'} (${problems.length}):`);
  for (const problem of problems) console.log(`  - ${problem}`);
} else {
  console.log('\nOnly the state service writes combined-card attack state; the reroll handler never re-spends shared costs; the renderer computes no attack math; no new Roll(/actor.update( bypasses found.');
}

console.log('='.repeat(72) + '\n');

if (STRICT && problems.length) {
  process.exit(1);
}
