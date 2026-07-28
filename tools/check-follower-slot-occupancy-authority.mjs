#!/usr/bin/env node

/**
 * check-follower-slot-occupancy-authority.mjs — follower-slot occupancy
 * single-authority guard (R4-3 correction pass, "test(governance): add
 * production-path coverage and occupancy guard").
 *
 * Before scripts/domain/followers/follower-slot-occupancy.js existed, "is
 * this slot occupied" had two competing definitions live at once: most call
 * sites checked only the raw `slot.createdActorId` field, while
 * AlliesSurfaceService's local helper also recognized `actorId`/
 * `assignedActorId`/`dependentActorId`/`npcActorId` (fields several live
 * producers — beast conversion, ally rehire, manual-slot occupancy — write
 * instead of createdActorId). A slot occupied via one of those alternate
 * fields read as "open" everywhere except the Allies surface.
 *
 * This guard flags new occurrences of the narrow single-field pattern
 * (`if (slot.createdActorId)`, `!slot.createdActorId`,
 * `entry.createdActorId === id`) used as an OCCUPANCY DECISION outside the
 * canonical module and its narrow, already-reviewed allowlist. It does NOT
 * flag createdActorId as an object-literal WRITE key (`{ createdActorId:
 * null }`, `{ ...slot, createdActorId: x }`) — writing the canonical field
 * is correct and expected; only reading it in isolation, as if the other
 * alias fields did not exist, is the anti-pattern.
 *
 * Deliberately narrow (per this round's explicit "do not create broad
 * repository-wide bans" constraint): only scans files that already mention
 * `followerSlots`/follower-slot logic AND the literal substring
 * `createdActorId`, so it does not touch unrelated code that happens to use
 * a differently-scoped variable also named `createdActorId` (e.g.
 * ActorEngine's snapshot-restore `createdActorIds` array, a different
 * concept entirely).
 *
 * Report-only by default; --strict exits non-zero on any violation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const STRICT = process.argv.includes('--strict');

// The canonical module itself (defines the pattern, does not "check" it).
const OCCUPANCY_MODULE = path.join(ROOT, 'scripts/domain/followers/follower-slot-occupancy.js');

// Files with an already-reviewed, self-consistent, narrow use of the raw
// field — each writes AND reads `createdActorId` exclusively within its own
// scope (never receiving slots from a producer that uses an alias field),
// so the raw check cannot disagree with itself. Adding a file here requires
// the same reasoning, not just silencing a new violation.
const NARROW_SELF_CONSISTENT_ALLOWLIST = new Set([
  // minion-creator.js's own Attract Minion/Privateer slots are only ever
  // filled by minion-creator.js itself, always via createdActorId.
  path.join(ROOT, 'scripts/apps/minion-creator.js'),
  // follower-mutation-transaction.js's buildFollowerSlotUpdate/
  // clearFollowerSlotByActorId are the canonical WRITE builders for
  // talent-granted follower slots specifically — they read back only what
  // they themselves just wrote, in the same governed creation/removal
  // transaction (see docs/audits/follower-mutation-transaction-authority-phase-6-addendum.md).
  path.join(ROOT, 'scripts/apps/progression-framework/adapters/follower-mutation-transaction.js'),
  // Lower-risk, pure-display projections already reviewed and left with
  // partial (createdActorId/actorId) alias awareness rather than full
  // migration, since they never gate a mutation decision.
  path.join(ROOT, 'scripts/ui/shell/HomeSurfaceService.js'),
  path.join(ROOT, 'scripts/ui/shell/AssetBaySurfaceService.js')
]);

const NARROW_CHECK_PATTERNS = [
  /if\s*\(\s*!?\s*[\w.?]*\.createdActorId\s*\)/,
  /!\s*[\w.?]*\.createdActorId\b/,
  /[\w.?]*\.createdActorId\s*===\s*\w/,
  /[\w.?]*\.createdActorId\s*!==\s*\w/
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function main() {
  const files = walk(SCRIPTS);
  const violations = [];

  for (const file of files) {
    if (file === OCCUPANCY_MODULE) continue;
    if (NARROW_SELF_CONSISTENT_ALLOWLIST.has(file)) continue;

    const source = read(file);
    if (!source.includes('createdActorId')) continue;
    if (!/followerSlot|follower-slot|FollowerSlot/.test(source)) continue;

    for (const pattern of NARROW_CHECK_PATTERNS) {
      if (pattern.test(source)) {
        violations.push({
          file: path.relative(ROOT, file),
          detail: `matches narrow single-field occupancy check ${pattern} — use resolveFollowerSlotActorId()/isFollowerSlotOccupied() from scripts/domain/followers/follower-slot-occupancy.js instead`
        });
        break;
      }
    }
  }

  console.log('='.repeat(72));
  console.log('  FOLLOWER SLOT OCCUPANCY AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${files.length} script file(s).\n`);

  if (violations.length === 0) {
    console.log('No violations found — follower-slot occupancy decisions remain centralized in resolveFollowerSlotActorId()/isFollowerSlotOccupied().');
    console.log('='.repeat(72));
    process.exit(0);
  }

  console.log(`Found ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.log(`  ${violation.file}`);
    console.log(`    ${violation.detail}`);
  }
  console.log('='.repeat(72));

  process.exit(STRICT ? 1 : 0);
}

main();
