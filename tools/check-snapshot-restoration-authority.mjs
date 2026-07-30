#!/usr/bin/env node

/**
 * check-snapshot-restoration-authority.mjs — Actor snapshot restoration
 * exactness/failure-awareness guard (P1-7, "fix(governance): make Actor
 * snapshot restoration exact").
 *
 * Before this pass, Actor snapshot restoration
 * (scripts/governance/snapshot/snapshot-service.js) merged root data back
 * in (never deletion-aware), never touched flags/ownership/prototypeToken
 * at all, and unconditionally deleted-then-recreated every embedded
 * Item/ActiveEffect without preserving `_id` — breaking every reference a
 * talent grant, provenance field, or follower-slot occupancy record held.
 * Failures partway through were thrown with no structured detail and no
 * compensation. This guard keeps that class of regression from coming
 * back, in either the canonical authority module itself or its callers.
 *
 * Checks (each independently verified via inject/detect/revert during
 * this pass — see docs/audits/droid-authority-consolidation-phase-2.md's
 * "P1-7" section for the byte-identical-restoration confirmation table):
 *
 *   1. No direct `actor.update()`/`actor.createEmbeddedDocuments()`/
 *      `actor.updateEmbeddedDocuments()`/`actor.deleteEmbeddedDocuments()`
 *      calls inside the canonical restoration-authority modules — every
 *      mutation must route through ActorEngine.
 *   2. Embedded-document recreation inside the authority modules must
 *      request `keepId: true` and must never strip `_id` from a create
 *      payload.
 *   3. The full-actor root restoration patch builder must cover
 *      `system`, `flags`, `ownership`, and `prototypeToken` — an
 *      "ordinary merge, root-fields-only" restoration (the pre-P1-7 bug)
 *      is flagged if any of those four is dropped from the builder.
 *   4. High-risk callers (droid conversion/reconciliation/drift-repair/
 *      ally-conversion rollback paths) must inspect `.success` on the
 *      result of `restoreSnapshotExact()` before treating the rollback as
 *      complete — "Do not let callers continue after `{success: false}`."
 *   5. `SnapshotManager.restoreSnapshot()` must not return a bare `true`
 *      unconditionally — it must derive its boolean from the structured
 *      result's `success` field.
 *   6. The in-memory pre-restore safety snapshot must never be persisted
 *      to the actor's snapshot-history flag (that would defeat the
 *      bounded-retention policy the safety-snapshot design exists to
 *      avoid disturbing).
 *
 * Deliberately narrow, per this round's "do not ban legitimate
 * embedded-document recreation elsewhere" constraint: only the canonical
 * authority modules are held to checks 1-3/5-6; check 4 only scans an
 * explicit, reviewed allowlist of high-risk callers, not every file that
 * happens to mention `restoreSnapshotExact`.
 *
 * Report-only by default; --strict exits non-zero on any violation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const SNAPSHOT_SERVICE = path.join(ROOT, 'scripts/governance/snapshot/snapshot-service.js');
const SNAPSHOT_RESTORATION_PLAN = path.join(ROOT, 'scripts/governance/snapshot/snapshot-restoration-plan.js');
const SNAPSHOT_MANAGER = path.join(ROOT, 'scripts/engine/progression/utils/snapshot-manager.js');
const DELETION_AWARE_PATCH = path.join(ROOT, 'scripts/governance/snapshot/deletion-aware-patch.js');

const AUTHORITY_MODULES = [SNAPSHOT_SERVICE, SNAPSHOT_RESTORATION_PLAN, SNAPSHOT_MANAGER, DELETION_AWARE_PATCH];

// Reviewed high-risk callers whose rollback paths depend on
// restoreSnapshotExact()'s structured result rather than the old
// boolean-ish restoreSnapshot() wrapper. Adding a file here requires the
// same "inspects .success before continuing" review, not just silencing
// a violation.
const HIGH_RISK_CALLERS = [
  path.join(ROOT, 'scripts/domain/droids/droid-statblock-conversion-service.js'),
  path.join(ROOT, 'scripts/domain/droids/droid-converted-system-reconciliation-service.js'),
  path.join(ROOT, 'scripts/domain/droids/droid-installation-reconciler.js'),
  path.join(ROOT, 'scripts/engine/crew/ally-assignment-service.js')
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/**
 * Strip `/* ... *\/` block comments and `// ...` line comments so doc
 * comments that merely MENTION a pattern (e.g. this very guard's own
 * source, or a caller's doc comment describing what it migrated to)
 * don't register as a code match. Deliberately simple (no string-literal
 * awareness) — adequate for this codebase's comment style, matching the
 * same tradeoff every other check-*.mjs guard already makes.
 */
function stripComments(source) {
  // Newlines inside a stripped comment are preserved (replaced with
  // themselves) so line numbers computed against the stripped source
  // still line up with the original file.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function relative(file) {
  return path.relative(ROOT, file);
}

/** Check 1: no direct actor.* mutation calls in the authority modules. */
function checkNoDirectActorMutation(violations) {
  const DIRECT_MUTATION_PATTERNS = [
    /\bactor\.update\s*\(/,
    /\bactor\.createEmbeddedDocuments\s*\(/,
    /\bactor\.updateEmbeddedDocuments\s*\(/,
    /\bactor\.deleteEmbeddedDocuments\s*\(/
  ];
  for (const file of AUTHORITY_MODULES) {
    if (!fs.existsSync(file)) continue;
    const source = stripComments(read(file));
    for (const pattern of DIRECT_MUTATION_PATTERNS) {
      if (pattern.test(source)) {
        violations.push({
          file: relative(file),
          check: 'no-direct-actor-mutation',
          detail: `matches ${pattern} — snapshot restoration must route every mutation through ActorEngine, never call the Document API directly`
        });
      }
    }
  }
}

/** Check 2: embedded-document recreation preserves _id via keepId. */
function checkEmbeddedRecreationPreservesId(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));

  const createCalls = [...source.matchAll(/ActorEngine\.createEmbeddedDocuments\([^)]*\)/gs)];
  if (createCalls.length === 0) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'embedded-recreation-keepid',
      detail: 'no ActorEngine.createEmbeddedDocuments() call found for embedded-document restoration — recreation path may have been removed or bypassed'
    });
  }
  for (const match of createCalls) {
    if (!/keepId\s*:\s*true/.test(match[0])) {
      violations.push({
        file: relative(SNAPSHOT_SERVICE),
        check: 'embedded-recreation-keepid',
        detail: `createEmbeddedDocuments() call does not request keepId: true — recreated Items/Effects would silently get new ids: ${match[0].slice(0, 120)}`
      });
    }
  }

  if (!fs.existsSync(SNAPSHOT_RESTORATION_PLAN)) return;
  const planSource = stripComments(read(SNAPSHOT_RESTORATION_PLAN));
  if (/delete\s+\w+\.\s*_id\b|_id\s*:\s*undefined/.test(planSource)) {
    violations.push({
      file: relative(SNAPSHOT_RESTORATION_PLAN),
      check: 'embedded-recreation-keepid',
      detail: 'restoration plan builder appears to strip _id from a create payload — recreated documents must retain their original snapshot _id'
    });
  }
}

/** Check 3: full-actor root restoration covers system/flags/ownership/prototypeToken. */
function checkRootRestorationScope(violations) {
  if (!fs.existsSync(SNAPSHOT_RESTORATION_PLAN)) {
    violations.push({
      file: relative(SNAPSHOT_RESTORATION_PLAN),
      check: 'root-restoration-scope',
      detail: 'canonical restoration-plan module is missing entirely'
    });
    return;
  }
  const source = stripComments(read(SNAPSHOT_RESTORATION_PLAN));
  const requiredFields = ['system', 'flags', 'ownership', 'prototypeToken'];
  for (const field of requiredFields) {
    const pattern = new RegExp(`rootPath:\\s*['"]${field}['"]`);
    if (!pattern.test(source)) {
      violations.push({
        file: relative(SNAPSHOT_RESTORATION_PLAN),
        check: 'root-restoration-scope',
        detail: `buildActorRootRestorationPatch() no longer restores '${field}' via a deletion-aware patch — this reintroduces the pre-P1-7 "ordinary merge, partial root" gap`
      });
    }
  }
}

/** Check 4: high-risk callers inspect .success on restoreSnapshotExact(). */
function checkHighRiskCallersInspectResult(violations) {
  for (const file of HIGH_RISK_CALLERS) {
    if (!fs.existsSync(file)) continue;
    const source = stripComments(read(file));
    if (!source.includes('restoreSnapshotExact')) {
      violations.push({
        file: relative(file),
        check: 'high-risk-caller-inspects-result',
        detail: 'reviewed high-risk caller does not call restoreSnapshotExact() at all — confirm it still uses the exact, structured-result restore path rather than the boolean-ish restoreSnapshot() wrapper'
      });
      continue;
    }
    // Every restoreSnapshotExact( call site in the file must have a
    // `.success` check within a short window after it — a purely
    // textual proxy for "the result is inspected before the caller
    // treats the rollback as complete."
    const callSites = [...source.matchAll(/restoreSnapshotExact\s*\(/g)];
    for (const call of callSites) {
      const windowEnd = Math.min(source.length, call.index + 600);
      const window = source.slice(call.index, windowEnd);
      if (!/\.success\b/.test(window)) {
        const line = source.slice(0, call.index).split('\n').length;
        violations.push({
          file: relative(file),
          check: 'high-risk-caller-inspects-result',
          detail: `restoreSnapshotExact() call near line ${line} has no nearby '.success' check — a failed/inexact restore could be silently treated as complete`
        });
      }
    }
  }
}

/** Check 5: restoreSnapshot() derives its boolean from result.success. */
function checkThinWrapperNotBareBoolean(violations) {
  if (!fs.existsSync(SNAPSHOT_MANAGER)) return;
  const source = stripComments(read(SNAPSHOT_MANAGER));
  const methodMatch = source.match(/static async restoreSnapshot\s*\([^)]*\)\s*\{([\s\S]*?)\n    \}/);
  if (!methodMatch) {
    violations.push({
      file: relative(SNAPSHOT_MANAGER),
      check: 'thin-wrapper-not-bare-boolean',
      detail: 'could not locate restoreSnapshot() method body to verify it derives its boolean from a structured result'
    });
    return;
  }
  const body = methodMatch[1];
  if (!/restoreSnapshotExact/.test(body)) {
    violations.push({
      file: relative(SNAPSHOT_MANAGER),
      check: 'thin-wrapper-not-bare-boolean',
      detail: 'restoreSnapshot() no longer delegates to restoreSnapshotExact() — it must not reintroduce an independent, non-exact restore path'
    });
  }
  if (!/result\.success/.test(body)) {
    violations.push({
      file: relative(SNAPSHOT_MANAGER),
      check: 'thin-wrapper-not-bare-boolean',
      detail: 'restoreSnapshot() does not branch on result.success — a partial/failed restore could be reported as a bare `true`'
    });
  }
}

/** Check 6: the in-memory safety snapshot is never persisted. */
function checkSafetySnapshotNeverPersisted(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));
  if (!/captureSafetySnapshot/.test(source)) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'safety-snapshot-not-persisted',
      detail: 'no in-memory safety-snapshot capture found — bounded, non-recursive compensation depends on one being taken before the first mutating step'
    });
    return;
  }
  if (/flags\.foundryvtt-swse\.snapshots['"]?\s*[:=][^=]/.test(source) || /flags\.swse\.snapshots['"]?\s*[:=][^=]/.test(source)) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'safety-snapshot-not-persisted',
      detail: 'snapshot-service.js appears to write to the persisted snapshot-history flag directly — the pre-restore safety snapshot must stay in-memory-only, never bloating the bounded, persisted retention SnapshotManager already enforces'
    });
  }
}

function main() {
  const violations = [];

  checkNoDirectActorMutation(violations);
  checkEmbeddedRecreationPreservesId(violations);
  checkRootRestorationScope(violations);
  checkHighRiskCallersInspectResult(violations);
  checkThinWrapperNotBareBoolean(violations);
  checkSafetySnapshotNeverPersisted(violations);

  console.log('='.repeat(72));
  console.log('  SNAPSHOT RESTORATION AUTHORITY GUARD (P1-7)');
  console.log('='.repeat(72));
  console.log(`\nScanned ${AUTHORITY_MODULES.length} authority module(s) and ${HIGH_RISK_CALLERS.length} high-risk caller(s).\n`);

  if (violations.length === 0) {
    console.log('No violations found — snapshot restoration remains exact, deletion-aware, id-preserving, and failure-aware, and all reviewed high-risk callers inspect the structured restore result.');
    console.log('='.repeat(72));
    process.exit(0);
  }

  console.log(`Found ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.log(`  [${violation.check}] ${violation.file}`);
    console.log(`    ${violation.detail}`);
  }
  console.log('='.repeat(72));

  process.exit(STRICT ? 1 : 0);
}

main();
