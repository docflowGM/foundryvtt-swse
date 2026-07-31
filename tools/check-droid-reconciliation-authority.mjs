#!/usr/bin/env node

/**
 * check-droid-reconciliation-authority.mjs — droid converted-system
 * reconciliation single-authority guard (Phase 4 — Converted-System
 * Reconciliation and Runtime Hardening).
 *
 * Enforces that the reconciliation contract introduced in
 * docs/audits/droid-converted-system-reconciliation-phase-4.md stays a
 * single, narrow authority — the same discipline
 * tools/check-droid-calculation-mode-authority.mjs already enforces for
 * Phase 3's calculation-mode field. Eight checks, plus a four-check P1-5
 * addendum below:
 *
 *   1. applyReconciliation()/rollbackReconciliation() are only called from
 *      the approved sheet handler and the service itself — never from the
 *      Actor prepare/render pipeline (context-builder.js, droid-actor.js,
 *      base-actor.js), which would make reconciliation happen
 *      automatically instead of requiring an explicit action.
 *   2. flags.swse.stockDroidReconciliation is assigned only by the
 *      reconciliation service — no other file may write it directly.
 *   3. `mechanicalState.applyModifiers` is referenced only by the approved
 *      read/write sites (the reconciliation service, which writes it; the
 *      droid-part-schema-facing DroidCustomizationEngine, which writes a
 *      default; the mode adapter's shouldSuppressComponentModifiers(),
 *      which reads it; ModifierEngine.js, which calls that reader) —
 *      nowhere else may special-case it.
 *   4. The reconciliation service never calls an embedded-Item creation
 *      API — reconciliation only ever adds system.installedSystems ledger
 *      entries, never a new weapon/system Item, so it cannot create a
 *      duplicate logical weapon.
 *   5. The reconciliation service's auto-apply path only accepts
 *      canonical-match/alias-match classifications — an ambiguous,
 *      descriptive-only, or unsupported candidate can never be
 *      automatically mapped onto a mechanical part.
 *   6. The reconciliation service and classifier never call
 *      actor.update()/item.update() directly.
 *   7. No file outside the reconciliation service and its classifier may
 *      export a function named inspectReconciliation/buildReconciliationPlan/
 *      applyReconciliation/rollbackReconciliation — guards against a
 *      second, competing reconciliation implementation appearing.
 *   8. No file under scripts/ (production code) imports anything from
 *      tests/helpers/foundry-shim/ — the shim is test-only scaffolding and
 *      must never become a runtime dependency.
 *
 * P1-5 addendum (Intent-Based Reconciliation Apply Boundary) — four more
 * checks, narrowly scoped to the reconciliation trust boundary itself
 * (not a repository-wide ban on any object named "plan"):
 *
 *   9. applyReconciliation() must independently verify the caller's
 *      intent.actorId matches the target Actor's own id — guards against
 *      someone quietly removing the cross-Actor identity check.
 *  10. applyReconciliation() must compute a current revision fingerprint
 *      (buildDroidReconciliationRevision) and compare it against
 *      intent.inspectionRevision before mutating — guards against
 *      re-introducing a stale-plan trust gap.
 *  11. applyReconciliation() must explicitly reject an old-API,
 *      plan-shaped second argument (a `plan`/`mutationPlan` property) —
 *      guards against silently resurrecting the old
 *      "apply(actor, builtPlan)" contract.
 *  12. No production call site outside the reconciliation service may
 *      call applyReconciliation() with a caller-held `built`/`plan`
 *      identifier — every call site must pass an intent literal
 *      containing `selectedCanonicalIds` and `inspectionRevision`.
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

const RECONCILIATION_SERVICE = path.join(ROOT, 'scripts/domain/droids/droid-converted-system-reconciliation-service.js');
const RECONCILIATION_CLASSIFIER = path.join(ROOT, 'scripts/domain/droids/droid-converted-system-reconciliation-classifier.js');
const CHARACTER_SHEET = path.join(ROOT, 'scripts/sheets/v2/character-sheet.js');
const CONTEXT_BUILDER = path.join(ROOT, 'scripts/sheets/v2/droid-sheet/context-builder.js');
const MODE_ADAPTER = path.join(ROOT, 'scripts/actors/droid/droid-mode-adapter.js');
const MODIFIER_ENGINE = path.join(ROOT, 'scripts/engine/effects/modifiers/ModifierEngine.js');
const CUSTOMIZATION_ENGINE = path.join(ROOT, 'scripts/engine/customization/droid-customization-engine.js');

// Files allowed to call applyReconciliation()/rollbackReconciliation().
const RECONCILE_CALL_ALLOWLIST = new Set([CHARACTER_SHEET, RECONCILIATION_SERVICE]);

// Files allowed to write flags.swse.stockDroidReconciliation.
const RECONCILIATION_FLAG_WRITE_ALLOWLIST = new Set([RECONCILIATION_SERVICE]);

// Files allowed to reference mechanicalState.applyModifiers at all.
const MECHANICAL_STATE_ALLOWLIST = new Set([
  RECONCILIATION_SERVICE,
  CUSTOMIZATION_ENGINE,
  MODE_ADAPTER,
  MODIFIER_ENGINE,
  path.join(ROOT, 'scripts/domain/droids/droid-installed-component-resolver.js')
]);

// Files allowed to export the reconciliation API function names.
const RECONCILIATION_API_DEFINITION_ALLOWLIST = new Set([RECONCILIATION_SERVICE]);

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

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function main() {
  const files = walk(SCRIPTS);
  const violations = [];

  // Check 1: no automatic reconciliation from the prepare/render pipeline.
  const reconcileCallPattern = /\b(applyReconciliation|rollbackReconciliation)\s*\(/;
  for (const file of files) {
    if (file === RECONCILIATION_SERVICE) continue; // definition site
    const source = read(file);
    if (reconcileCallPattern.test(source) && !RECONCILE_CALL_ALLOWLIST.has(file)) {
      violations.push({ check: '1: no automatic reconciliation', file: path.relative(ROOT, file), detail: 'calls applyReconciliation()/rollbackReconciliation() outside the approved explicit-action call site' });
    }
  }
  if (CONTEXT_BUILDER && fs.existsSync(CONTEXT_BUILDER)) {
    const source = read(CONTEXT_BUILDER);
    if (reconcileCallPattern.test(source)) {
      violations.push({ check: '1: no automatic reconciliation', file: path.relative(ROOT, CONTEXT_BUILDER), detail: 'sheet context preparation must never mutate — only inspect' });
    }
  }

  // Check 2: stockDroidReconciliation write authority.
  const reconciliationFlagWritePattern = /'flags\.swse\.stockDroidReconciliation[.\w]*'\s*:|\.stockDroidReconciliation\s*=(?!=)/;
  for (const file of files) {
    if (RECONCILIATION_FLAG_WRITE_ALLOWLIST.has(file)) continue;
    const source = read(file);
    if (reconciliationFlagWritePattern.test(source)) {
      violations.push({ check: '2: stockDroidReconciliation write authority', file: path.relative(ROOT, file), detail: 'assigns flags.swse.stockDroidReconciliation outside the reconciliation service' });
    }
  }

  // Check 3: mechanicalState.applyModifiers reference sites.
  for (const file of files) {
    const source = read(file);
    if (!source.includes('applyModifiers')) continue;
    if (MECHANICAL_STATE_ALLOWLIST.has(file)) continue;
    violations.push({ check: '3: mechanicalState.applyModifiers routing', file: path.relative(ROOT, file), detail: 'references applyModifiers outside the approved read/write sites — a second modifier-suppression path may have been introduced' });
  }

  // Check 4: reconciliation service never creates embedded Items directly.
  const reconciliationSource = read(RECONCILIATION_SERVICE);
  if (/createEmbeddedDocuments|\bItem\.create\s*\(/.test(reconciliationSource)) {
    violations.push({ check: '4: no weapon/item creation in reconciliation', file: path.relative(ROOT, RECONCILIATION_SERVICE), detail: 'reconciliation must only ever add installedSystems ledger entries, never create a new embedded Item (would risk a duplicate logical weapon)' });
  }

  // Check 5: auto-apply restricted to canonical/alias matches.
  if (!/RECONCILIATION_CLASSIFICATION\.CANONICAL_MATCH/.test(reconciliationSource) || !/RECONCILIATION_CLASSIFICATION\.ALIAS_MATCH/.test(reconciliationSource)) {
    violations.push({ check: '5: no name-only automatic mechanical mapping', file: path.relative(ROOT, RECONCILIATION_SERVICE), detail: 'buildReconciliationPlan() must gate auto-application on classification === CANONICAL_MATCH/ALIAS_MATCH only' });
  }

  // Check 6: no direct actor/item.update() in reconciliation code.
  for (const file of [RECONCILIATION_SERVICE, RECONCILIATION_CLASSIFIER]) {
    const source = read(file);
    if (/\bactor\.update\s*\(|\bitem\.update\s*\(/.test(source)) {
      violations.push({ check: '6: no direct actor/item.update() in reconciliation code', file: path.relative(ROOT, file), detail: 'found a direct actor.update()/item.update() call — mutations must route through ActorEngine/SnapshotManager' });
    }
  }

  // Check 7: single reconciliation API authority.
  const apiFunctionPattern = /export\s+(async\s+)?function\s+(inspectReconciliation|buildReconciliationPlan|applyReconciliation|rollbackReconciliation)\s*\(/;
  for (const file of files) {
    if (RECONCILIATION_API_DEFINITION_ALLOWLIST.has(file)) continue;
    const source = read(file);
    if (apiFunctionPattern.test(source)) {
      violations.push({ check: '7: single reconciliation-API authority', file: path.relative(ROOT, file), detail: 'defines one of the reconciliation API function names outside the canonical service — a competing implementation may have been introduced' });
    }
  }

  // Check 8: no production import of the test-only Foundry shim.
  const shimImportPattern = /tests\/helpers\/foundry-shim/;
  for (const file of files) {
    if (file.includes(`${path.sep}tests${path.sep}`)) continue;
    const source = read(file);
    if (shimImportPattern.test(source)) {
      violations.push({ check: '8: no production import of test shim', file: path.relative(ROOT, file), detail: 'production code must never depend on tests/helpers/foundry-shim/ — it is test-only scaffolding' });
    }
  }

  // P1-5 Check 9: applyReconciliation() must verify intent.actorId against
  // the target Actor's own id.
  const applyReconciliationBody = (() => {
    const match = reconciliationSource.match(/export\s+async\s+function\s+applyReconciliation\s*\([\s\S]*?\n}/);
    return match ? match[0] : '';
  })();
  if (!/intent\.actorId\s*!==\s*actor\.id/.test(applyReconciliationBody)) {
    violations.push({ check: '9: cross-Actor identity verification', file: path.relative(ROOT, RECONCILIATION_SERVICE), detail: 'applyReconciliation() must independently verify intent.actorId === actor.id before mutating' });
  }

  // P1-5 Check 10: applyReconciliation() must compute and compare a
  // revision fingerprint before mutating.
  if (!/buildDroidReconciliationRevision\s*\(\s*actor\s*\)/.test(applyReconciliationBody) || !/intent\.inspectionRevision/.test(applyReconciliationBody)) {
    violations.push({ check: '10: revision/staleness validation', file: path.relative(ROOT, RECONCILIATION_SERVICE), detail: 'applyReconciliation() must recompute the actor\'s current reconciliation revision and compare it against intent.inspectionRevision' });
  }

  // P1-5 Check 11: applyReconciliation() must reject an old-API,
  // plan-shaped second argument.
  if (!/'plan'\s*in\s*intent/.test(applyReconciliationBody) && !/'mutationPlan'\s*in\s*intent/.test(applyReconciliationBody)) {
    violations.push({ check: '11: old plan-based API rejected', file: path.relative(ROOT, RECONCILIATION_SERVICE), detail: 'applyReconciliation() must explicitly detect and reject a caller-supplied plan/mutationPlan-shaped second argument' });
  }

  // P1-5 Check 12: no production call site outside the reconciliation
  // service may call applyReconciliation() with a caller-held plan
  // identifier instead of an intent literal.
  const applyCallSitePattern = /applyReconciliation\s*\(\s*[\w.]+\s*,\s*([\w.]+)\s*\)/g;
  for (const file of files) {
    if (file === RECONCILIATION_SERVICE) continue;
    const source = read(file);
    let match;
    while ((match = applyCallSitePattern.exec(source)) !== null) {
      const secondArg = match[1];
      if (/^(built|plan|mutationPlan)$/i.test(secondArg)) {
        violations.push({ check: '12: intent literal at call sites', file: path.relative(ROOT, file), detail: `applyReconciliation() called with a caller-held "${secondArg}" identifier — pass an intent literal ({actorId, selectedCanonicalIds, inspectionRevision}), never a pre-built plan` });
      }
    }
  }

  console.log('='.repeat(72));
  console.log('  DROID CONVERTED-SYSTEM RECONCILIATION AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${files.length} script file(s) against 12 checks.\n`);

  if (violations.length === 0) {
    console.log('No violations found — droid converted-system reconciliation remains a single authority.');
    console.log('='.repeat(72));
    process.exit(0);
  }

  console.log(`Found ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.log(`  [${violation.check}]`);
    console.log(`    ${violation.file}`);
    console.log(`    ${violation.detail}`);
  }
  console.log('='.repeat(72));

  process.exit(STRICT ? 1 : 0);
}

main();
