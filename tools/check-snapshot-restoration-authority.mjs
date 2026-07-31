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
 * ROUND-2 CORRECTION checks (7-13) — added after the exact-head audit
 * found that the first exactness pass verified nothing real: a
 * `verifyRoot` boolean was copied straight into `rootMatched`/
 * `ownershipMatched`/`flagsMatched` without ever comparing state, `exact`
 * was computed without those fields, embedded-document verification
 * compared id sets only (never content), scopes were not enforced on
 * mutation, Actor identity/schema/scope were never validated, and
 * compensation only checked `.success`, never `.exact`.
 *
 *   7. `verifyRestoration()`'s per-field `*Matched` results must each be
 *      derived from an actual comparison (`deepEqualPlain(...)`), never a
 *      bare assignment from a `checkRoot`/`checkSystemAndFlags` gate
 *      boolean.
 *   8. The `exact` computation must include `rootMatched` (not only
 *      id-preservation) — a root update that silently failed or drifted
 *      must not still report `exact: true`.
 *   9. Embedded Item/ActiveEffect mutation calls
 *      (create/update/deleteEmbeddedDocuments) must be gated by the
 *      scope's own `checkItems`/`checkEffects` predicates — a narrow
 *      scope (`system-and-flags`, `embedded-items`) must never
 *      unconditionally restore a document family it didn't ask for.
 *  10. Actor identity (`snapshot.actorId` vs `actor.id`) and schema/scope
 *      validity must be checked and rejected BEFORE any mutation is
 *      attempted.
 *  11. The thin boolean wrapper (`SnapshotManager.restoreSnapshot()`) must
 *      branch on `result.exact`, not merely `result.success` — an
 *      identity-inexact rollback must not collapse to a bare `true`.
 *  12. Compensation success must require `compResult.exact === true`, not
 *      merely `compResult.success === true` — a compensation restore that
 *      "succeeds" but is itself inexact must be reported honestly.
 *  13. The `exact` computation must include id-preservation
 *      (`idsPreserved`) so that an unremapped, `keepId`-refused embedded
 *      document forces `exact: false` — this is the documented
 *      fail-closed choice in place of full cross-reference id remapping.
 *
 * ROUND-3 CORRECTION checks (14-15) — added after a SECOND exact-head
 * audit found the round-2 fail-closed/identity checks still had two
 * edge-case gaps: `requireExact` exempted legacy snapshots from its
 * fail-closed behavior, and schema-v2 identity enforcement only caught a
 * MISMATCHED actorId, never a MISSING one.
 *
 *  14. `requireExact`'s fail-closed condition must not exempt legacy
 *      snapshots via `!isLegacy` — every inexact result (legacy or not)
 *      must fail closed under `requireExact: true`.
 *  15. A non-legacy (schema-v2) snapshot missing `actorId` entirely must
 *      be rejected before any mutation, not merely a snapshot whose
 *      `actorId` mismatches the target Actor's.
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

/** Check 7: verifyRestoration()'s *Matched fields are real comparisons. */
function checkVerificationFieldsAreRealComparisons(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));
  const startIdx = source.search(/function\s+verifyRestoration\s*\(/);
  const endIdx = source.indexOf('\nexport class SnapshotService');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'verification-fields-real-comparisons',
      detail: 'could not locate verifyRestoration() to confirm its *Matched fields are derived from real comparisons'
    });
    return;
  }
  const body = source.slice(startIdx, endIdx);
  const requiredMatchedFields = ['rootMatched', 'ownershipMatched', 'flagsMatched', 'systemMatched', 'prototypeTokenMatched'];
  for (const field of requiredMatchedFields) {
    // A bare "const X = checkY;" or "X = checkY;" assignment (no comparison
    // call anywhere on the same statement) is the exact pre-round-2 defect:
    // the field was a copy of "was this verification requested", not an
    // actual comparison result.
    const bareAssignmentPattern = new RegExp(`${field}\\s*=\\s*(!?check\\w+)\\s*;`);
    const bareMatch = body.match(bareAssignmentPattern);
    if (bareMatch) {
      violations.push({
        file: relative(SNAPSHOT_SERVICE),
        check: 'verification-fields-real-comparisons',
        detail: `${field} is assigned directly from "${bareMatch[1]}" with no comparison call on the same statement — this reintroduces the pre-round-2 bug where a requested-verification boolean was copied straight into the result instead of comparing actual state`
      });
    }
  }
  if (!/deepEqualPlain\s*\(\s*expectedRoot\./.test(body)) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'verification-fields-real-comparisons',
      detail: 'verifyRestoration() no longer calls deepEqualPlain(expectedRoot..., ...) — root-field verification must compare the actor\'s rereread state against the state the patch itself should have produced, not merely trust the mutation succeeded'
    });
  }
}

/** Check 8: `exact` must include rootMatched, not only id-preservation. */
function checkExactIncludesRootAndContent(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));
  const exactMatch = source.match(/const\s+exact\s*=\s*([^;]+);/);
  if (!exactMatch) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'exact-includes-root-and-content',
      detail: 'could not locate the `const exact = ...` computation'
    });
    return;
  }
  const expr = exactMatch[1];
  for (const requiredTerm of ['rootMatched', 'itemsMatched', 'effectsMatched', 'idsPreserved']) {
    if (!expr.includes(requiredTerm)) {
      violations.push({
        file: relative(SNAPSHOT_SERVICE),
        check: 'exact-includes-root-and-content',
        detail: `the \`exact\` computation ("${expr.trim()}") does not include "${requiredTerm}" — a restore that silently failed to verify this dimension could still report exact: true`
      });
    }
  }
}

/** Check 9: embedded Item/Effect mutation calls are gated by scope predicates. */
function checkEmbeddedMutationGatedByScope(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));
  const restoreFnMatch = source.match(/static async restoreFromSnapshot\s*\([\s\S]*?\n  \}\n\}/);
  const body = restoreFnMatch ? restoreFnMatch[0] : source;

  const itemMutationPattern = /ActorEngine\.(?:create|update|delete)EmbeddedDocuments\(\s*actor,\s*['"]Item['"]/g;
  const effectMutationPattern = /ActorEngine\.(?:create|update|delete)EmbeddedDocuments\(\s*actor,\s*['"]ActiveEffect['"]/g;

  // A narrow-window heuristic: every Item/ActiveEffect mutation call must be
  // preceded, within the same guarded block, by an `if (checkItems)` /
  // `if (checkEffects)` line closer than any intervening `failedStep =`
  // step-boundary marker (a cheap proxy for "still inside that step's own
  // scope-gated conditional").
  function everyCallIsGated(pattern, gateName) {
    const calls = [...body.matchAll(pattern)];
    for (const call of calls) {
      const preceding = body.slice(0, call.index);
      const lastGate = preceding.lastIndexOf(`if (${gateName})`);
      const lastStepBoundary = Math.max(preceding.lastIndexOf("failedStep = 'items'"), preceding.lastIndexOf("failedStep = 'effects'"));
      if (lastGate === -1 || lastGate < lastStepBoundary) return false;
    }
    return true;
  }

  if (!everyCallIsGated(itemMutationPattern, 'checkItems')) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'embedded-mutation-gated-by-scope',
      detail: 'an Item mutation call (create/update/deleteEmbeddedDocuments) is not gated by `if (checkItems)` — a narrow scope (e.g. system-and-flags) must never unconditionally restore Items'
    });
  }
  if (!everyCallIsGated(effectMutationPattern, 'checkEffects')) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'embedded-mutation-gated-by-scope',
      detail: 'an ActiveEffect mutation call (create/update/deleteEmbeddedDocuments) is not gated by `if (checkEffects)` — a narrow scope (e.g. embedded-items) must never unconditionally restore Active Effects'
    });
  }
}

/** Check 10: Actor identity and schema/scope validated before any mutation. */
function checkActorIdentityValidatedBeforeMutation(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));
  const restoreFnMatch = source.match(/static async restoreFromSnapshot\s*\([\s\S]*?\n  \}\n\}/);
  if (!restoreFnMatch) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'actor-identity-validated-before-mutation',
      detail: 'could not locate restoreFromSnapshot() to confirm identity/schema validation'
    });
    return;
  }
  const body = restoreFnMatch[0];
  const actorIdCheckIdx = body.search(/snapshot\.actorId[\s\S]{0,40}actorId/);
  const schemaCheckIdx = body.search(/snapshot\.schemaVersion[\s\S]{0,60}CURRENT_SCHEMA_VERSION/);
  const scopeCheckIdx = body.search(/SUPPORTED_SNAPSHOT_SCOPES\.has\s*\(\s*scope\s*\)/);
  const firstMutationIdx = body.search(/ActorEngine\.(?:updateActor|createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments)\(/);

  if (actorIdCheckIdx === -1) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'actor-identity-validated-before-mutation',
      detail: 'no check comparing snapshot.actorId against the target actor\'s id — a snapshot captured for one Actor could be silently applied to a different one'
    });
  } else if (firstMutationIdx !== -1 && actorIdCheckIdx > firstMutationIdx) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'actor-identity-validated-before-mutation',
      detail: 'the Actor-identity check appears AFTER the first ActorEngine mutation call — identity must be rejected before any mutation is attempted'
    });
  }
  if (schemaCheckIdx === -1) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'actor-identity-validated-before-mutation',
      detail: 'no check comparing snapshot.schemaVersion against CURRENT_SCHEMA_VERSION — an unsupported/future schema snapshot could be restored as if it were the current shape'
    });
  }
  if (scopeCheckIdx === -1) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'actor-identity-validated-before-mutation',
      detail: 'no check that scope is a member of SUPPORTED_SNAPSHOT_SCOPES — an unrecognized scope value could silently fall through to full-actor behavior'
    });
  }
}

/** Check 11: the thin boolean wrapper branches on result.exact, not just result.success. */
function checkThinWrapperHonorsExact(violations) {
  if (!fs.existsSync(SNAPSHOT_MANAGER)) return;
  const source = stripComments(read(SNAPSHOT_MANAGER));
  const methodMatch = source.match(/static async restoreSnapshot\s*\([^)]*\)\s*\{([\s\S]*?)\n    \}/);
  if (!methodMatch) return; // already reported by check 5
  const body = methodMatch[1];
  if (!/result\.exact\s*!==\s*true/.test(body) && !/!result\.exact\b/.test(body) && !/result\.exact\s*===\s*true/.test(body)) {
    violations.push({
      file: relative(SNAPSHOT_MANAGER),
      check: 'thin-wrapper-honors-exact',
      detail: 'restoreSnapshot() branches on result.success but not result.exact — an identity-inexact-but-"successful" restore would still collapse to a bare `true`, letting ~10 legacy TransactionEngine/StoreEngine callers treat an inexact rollback as a clean success'
    });
  }
}

/** Check 12: compensation success requires compResult.exact === true. */
function checkCompensationRequiresExact(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));
  const assignMatch = source.match(/compensationSucceeded\s*=\s*(compResult\.[^;]+);/);
  if (!assignMatch) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'compensation-requires-exact',
      detail: 'could not locate the `compensationSucceeded = ...` assignment'
    });
    return;
  }
  if (!/\.exact\s*===\s*true/.test(assignMatch[1])) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'compensation-requires-exact',
      detail: `compensationSucceeded ("${assignMatch[1].trim()}") does not require compResult.exact === true — a compensation restore that "succeeds" but is itself identity-inexact must not be reported as a clean recovery`
    });
  }
}

/**
 * Check 14 (ROUND-3) — requireExact must fail closed for EVERY inexact
 * result, with no `!isLegacy` exemption. The second exact-head audit
 * found `if (requireExact && !exact && !isLegacy)` — a legacy snapshot
 * (always `exact: false` by definition) could slip through
 * `requireExact: true` as a soft `{success: true, exact: false}`, which
 * several high-risk rollback callers (checking only `.success` on the
 * assumption `requireExact: true` guarantees exactness) would have
 * silently accepted.
 */
function checkRequireExactDoesNotExemptLegacy(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));
  const conditionMatch = source.match(/if\s*\(\s*requireExact\s*&&\s*!exact[^)]*\)\s*\{/);
  if (!conditionMatch) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'require-exact-no-legacy-exemption',
      detail: 'could not locate the `if (requireExact && !exact ...)` fail-closed condition'
    });
    return;
  }
  if (/!isLegacy/.test(conditionMatch[0])) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'require-exact-no-legacy-exemption',
      detail: `the requireExact fail-closed condition ("${conditionMatch[0]}") exempts legacy snapshots via "!isLegacy" — a legacy snapshot must fail closed under requireExact: true exactly like any other inexact result, never return a soft {success: true, exact: false}`
    });
  }
}

/**
 * Check 15 (ROUND-3) — a schema-v2 (non-legacy) snapshot MUST carry
 * `actorId`. The second exact-head audit found the identity check only
 * rejected a MISMATCHED actorId, never a MISSING one — a forged or
 * malformed schema-v2 snapshot with no actorId at all bypassed identity
 * enforcement entirely rather than being rejected.
 */
function checkSchemaV2ActorIdMandatory(violations) {
  if (!fs.existsSync(SNAPSHOT_SERVICE)) return;
  const source = stripComments(read(SNAPSHOT_SERVICE));
  const restoreFnMatch = source.match(/static async restoreFromSnapshot\s*\([\s\S]*?\n  \}\n\}/);
  if (!restoreFnMatch) return; // already reported by check 10
  const body = restoreFnMatch[0];
  // Looks for a rejection gated on "!isLegacy" that also inspects
  // snapshot.actorId being absent (undefined/null/empty), appearing
  // BEFORE any ActorEngine mutation call.
  const mandatoryActorIdCheckIdx = body.search(/!isLegacy\s*&&\s*\(\s*snapshot\.actorId[\s\S]{0,80}(undefined|null)/);
  const firstMutationIdx = body.search(/ActorEngine\.(?:updateActor|createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments)\(/);
  if (mandatoryActorIdCheckIdx === -1) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'schema-v2-actor-id-mandatory',
      detail: 'no check rejecting a non-legacy (schema-v2) snapshot that is missing actorId entirely — the existing check only catches a MISMATCHED actorId, not a MISSING one, letting a malformed schema-v2 snapshot bypass identity enforcement'
    });
  } else if (firstMutationIdx !== -1 && mandatoryActorIdCheckIdx > firstMutationIdx) {
    violations.push({
      file: relative(SNAPSHOT_SERVICE),
      check: 'schema-v2-actor-id-mandatory',
      detail: 'the schema-v2 missing-actorId check appears AFTER the first ActorEngine mutation call — it must run before any mutation is attempted'
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
  checkVerificationFieldsAreRealComparisons(violations);
  checkExactIncludesRootAndContent(violations);
  checkEmbeddedMutationGatedByScope(violations);
  checkActorIdentityValidatedBeforeMutation(violations);
  checkThinWrapperHonorsExact(violations);
  checkCompensationRequiresExact(violations);
  checkRequireExactDoesNotExemptLegacy(violations);
  checkSchemaV2ActorIdMandatory(violations);

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
