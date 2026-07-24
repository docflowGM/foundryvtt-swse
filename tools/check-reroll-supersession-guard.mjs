#!/usr/bin/env node

/**
 * check-reroll-supersession-guard.mjs — reroll/damage-supersession guard.
 *
 * Static check for two Phase 3 rolling-system alignment invariants
 * (docs/audits/rolling-system-alignment-phase-3.md):
 *
 *   1. Every chat-driven damage-action handler in
 *      scripts/ui/chat/chat-interaction-bridge.js must refuse to act on an
 *      attack message that has been superseded by a reroll
 *      (flags.swse.superseded === true) rather than silently applying
 *      stale hit/critical/damage data from before the reroll.
 *   2. No file outside scripts/engine/feats/meta-resource-feat-resolver.js
 *      (the sole authority for building a replacement AttackOutcomeResolver
 *      verdict on reroll) writes to `flags.swse.superseded` /
 *      `flags.swse.supersededBy` on a ChatMessage — that would let a second
 *      call site independently declare an attack message authoritative or
 *      superseded, defeating the single-authority point of this system.
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

const BRIDGE_FILE = 'scripts/ui/chat/chat-interaction-bridge.js';
const SUPERSESSION_AUTHORITY = 'scripts/engine/feats/meta-resource-feat-resolver.js';

// Handler functions in the bridge file that perform a damage roll/apply
// action and therefore must check isAttackMessageSuperseded() before doing
// anything else observable (posting a roll, applying damage).
const DAMAGE_HANDLER_PATTERN = /^async function (handle\w*Damage\w*Button)\(/gm;

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

// Invariant 1: every damage handler in the bridge file checks supersession.
const bridgePath = path.join(ROOT, BRIDGE_FILE);
if (fs.existsSync(bridgePath)) {
  const text = fs.readFileSync(bridgePath, 'utf8');
  const handlerStarts = [...text.matchAll(DAMAGE_HANDLER_PATTERN)];
  for (let i = 0; i < handlerStarts.length; i++) {
    const name = handlerStarts[i][1];
    const start = handlerStarts[i].index;
    const end = i + 1 < handlerStarts.length ? handlerStarts[i + 1].index : text.length;
    const body = text.slice(start, Math.min(end, start + 600));
    if (!body.includes('isAttackMessageSuperseded(message)')) {
      problems.push(`${BRIDGE_FILE}: ${name}() does not check isAttackMessageSuperseded(message) before acting.`);
    }
  }
  if (handlerStarts.length === 0) {
    problems.push(`${BRIDGE_FILE}: no damage-action handlers found — pattern may need updating, or the file moved.`);
  }
} else {
  problems.push(`${BRIDGE_FILE} not found.`);
}

// Invariant 2: only the reroll authority writes supersession flags.
for (const file of walk(SCRIPTS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === SUPERSESSION_AUTHORITY) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/flags\.swse\.superseded['"]?\s*:\s*true|'flags\.swse\.superseded':\s*true/.test(text)) {
    problems.push(`${rel}: writes flags.swse.superseded outside the reroll authority (${SUPERSESSION_AUTHORITY}).`);
  }
}

console.log('\n' + '='.repeat(72));
console.log('  REROLL / DAMAGE SUPERSESSION GUARD');
console.log('='.repeat(72));

if (problems.length) {
  console.log(`\n${STRICT ? 'FAILURES' : 'WARNINGS'} (${problems.length}):`);
  for (const problem of problems) console.log(`  - ${problem}`);
} else {
  console.log('\nAll damage-action handlers check supersession; no unauthorized supersession writers found.');
}

console.log('='.repeat(72) + '\n');

if (STRICT && problems.length) {
  process.exit(1);
}
