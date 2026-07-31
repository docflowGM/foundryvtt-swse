#!/usr/bin/env node

/**
 * check-droid-drift-repair-authority.mjs — droid installation drift-repair
 * intent-boundary guard (Phase 2 addendum — P1-6, "Intent-Based
 * Installation Drift Repair Boundary").
 *
 * Enforces that scripts/domain/droids/droid-installation-reconciler.js's
 * repairDroidInstallationDrift() stays a narrow, intent-based apply
 * boundary instead of regressing into a caller-supplied embedded-Item-id
 * deletion endpoint. Deliberately narrow: this does NOT ban `itemIds` (or
 * any of the other flagged field names) repository-wide — those are
 * legitimate at lower layers (e.g. ActorEngine's own mutation-plan shape,
 * `{delete: {items: [...]}}`, which this very module legitimately builds
 * internally). The prohibition applies only to the public drift-repair
 * trust boundary itself and to code that calls it. Eight checks:
 *
 *   1. repairDroidInstallationDrift() must independently verify
 *      intent.actorId === actor.id.
 *   2. repairDroidInstallationDrift() must recompute a current revision
 *      fingerprint (buildDroidInstallationDriftRevision) and compare it
 *      against the caller's inspectionRevision before mutating.
 *   3. repairDroidInstallationDrift() must explicitly detect and reject an
 *      old-API caller-supplied itemIds/embeddedItemIds/itemUuids/uuids
 *      array, or a mutationPlan/delete/installedSystems/droidSystems
 *      payload.
 *   4. No file outside droid-installation-reconciler.js may export a
 *      function named repairDroidInstallationDrift/
 *      inspectDroidInstallationDrift/diagnoseDroidInstallationDrift/
 *      buildDroidDriftIssueId — guards against a second, competing
 *      drift-repair implementation appearing.
 *   5. droid-installation-reconciler.js never calls
 *      actor.deleteEmbeddedDocuments()/item.delete() directly — only
 *      ActorEngine.applyMutationPlan().
 *   6. No production call site of repairDroidInstallationDrift() outside
 *      the reconciler passes a caller-held itemIds/driftIssues/built
 *      identifier, or an array literal, as the second argument — every
 *      call site must pass an intent object.
 *   7. No file outside the reconciler reads `.itemIds` off a value that
 *      came from inspectDroidInstallationDrift()'s return — the public
 *      inspection view model must never be treated as if it carried
 *      authoritative Item ids.
 *   8. No file under scripts/ (production code) imports anything from
 *      tests/helpers/foundry-shim/ — the shim is test-only scaffolding.
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

const RECONCILER = path.join(ROOT, 'scripts/domain/droids/droid-installation-reconciler.js');

// Files allowed to export the drift-repair API function names.
const API_DEFINITION_ALLOWLIST = new Set([RECONCILER]);

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

function extractFunctionBody(source, functionName) {
  const match = source.match(new RegExp(`export\\s+async\\s+function\\s+${functionName}\\s*\\([\\s\\S]*?\\n}`));
  return match ? match[0] : '';
}

function main() {
  const files = walk(SCRIPTS);
  const violations = [];

  const reconcilerSource = read(RECONCILER);
  const repairBody = extractFunctionBody(reconcilerSource, 'repairDroidInstallationDrift');

  // Check 1: cross-Actor identity verification.
  if (!/normalized\.actorId\s*!==\s*actor\.id/.test(repairBody)) {
    violations.push({ check: '1: cross-Actor identity verification', file: path.relative(ROOT, RECONCILER), detail: 'repairDroidInstallationDrift() must independently verify intent.actorId === actor.id before mutating' });
  }

  // Check 2: revision/staleness validation. Requires the ACTUAL comparison
  // pattern, not merely a reference to the field name somewhere in the
  // function (which would still be present even if the comparison itself
  // were deleted).
  const comparesInitialRevision = /normalized\.inspectionRevision\s*!==\s*initial\.inspectionRevision/.test(repairBody);
  const comparesFinalRevision = /final\.inspectionRevision\s*!==\s*initial\.inspectionRevision/.test(repairBody);
  if (!/buildInternalDriftDiagnosis\s*\(/.test(repairBody) || !comparesInitialRevision || !comparesFinalRevision) {
    violations.push({ check: '2: revision/staleness validation', file: path.relative(ROOT, RECONCILER), detail: 'repairDroidInstallationDrift() must recompute the actor\'s current drift-repair revision and compare it against the caller\'s inspectionRevision, both at initial validation and again immediately before mutating (TOCTOU re-check)' });
  }

  // Check 3: old-API plan/Item-id shape rejected.
  const rejectsLegacyShape = /containsLegacyPlanShape\s*\(\s*intent\s*\)/.test(repairBody)
    && /itemIds/.test(reconcilerSource) && /embeddedItemIds/.test(reconcilerSource)
    && /mutationPlan/.test(reconcilerSource) && /installedSystems/.test(reconcilerSource) && /droidSystems/.test(reconcilerSource);
  if (!rejectsLegacyShape) {
    violations.push({ check: '3: old-API Item-id/plan rejection', file: path.relative(ROOT, RECONCILER), detail: 'repairDroidInstallationDrift() must explicitly detect and reject a caller-supplied itemIds/embeddedItemIds/mutationPlan/delete/installedSystems/droidSystems payload' });
  }

  // Check 4: single drift-repair API authority.
  const apiFunctionPattern = /export\s+(async\s+)?function\s+(repairDroidInstallationDrift|inspectDroidInstallationDrift|diagnoseDroidInstallationDrift|buildDroidDriftIssueId)\s*\(/;
  for (const file of files) {
    if (API_DEFINITION_ALLOWLIST.has(file)) continue;
    const source = read(file);
    if (apiFunctionPattern.test(source)) {
      violations.push({ check: '4: single drift-repair API authority', file: path.relative(ROOT, file), detail: 'defines one of the drift-repair API function names outside the canonical reconciler — a competing implementation may have been introduced' });
    }
  }

  // Check 5: no direct embedded-document deletion in the reconciler.
  if (/\bactor\.deleteEmbeddedDocuments\s*\(/.test(reconcilerSource) || /\bitem\.delete\s*\(/.test(reconcilerSource) || /\bliveActor\.deleteEmbeddedDocuments\s*\(/.test(reconcilerSource)) {
    violations.push({ check: '5: no direct embedded-document deletion', file: path.relative(ROOT, RECONCILER), detail: 'drift repair must delete embedded Items only through ActorEngine.applyMutationPlan(), never actor.deleteEmbeddedDocuments()/item.delete() directly' });
  }
  if (!/ActorEngine\.applyMutationPlan\(/.test(reconcilerSource)) {
    violations.push({ check: '5: no direct embedded-document deletion', file: path.relative(ROOT, RECONCILER), detail: 'expected repairDroidInstallationDrift() to delete embedded Items through ActorEngine.applyMutationPlan()' });
  }

  // Check 6: no caller-held plan/array-literal identifier at call sites.
  const callSitePattern = /repairDroidInstallationDrift\s*\(\s*[\w.]+\s*,\s*(\[|[\w.]+)/g;
  for (const file of files) {
    if (file === RECONCILER) continue;
    const source = read(file);
    let match;
    callSitePattern.lastIndex = 0;
    while ((match = callSitePattern.exec(source)) !== null) {
      const secondArgStart = match[1];
      if (secondArgStart === '[') {
        violations.push({ check: '6: intent literal at call sites', file: path.relative(ROOT, file), detail: 'repairDroidInstallationDrift() called with an array literal as the second argument — pass an intent object ({actorId, selectedIssueIds, inspectionRevision}), never a raw issue/Item-id array' });
        continue;
      }
      if (/^(built|plan|mutationPlan|itemIds|embeddedItemIds|driftIssues|issuesToRepair)$/i.test(secondArgStart)) {
        violations.push({ check: '6: intent literal at call sites', file: path.relative(ROOT, file), detail: `repairDroidInstallationDrift() called with a caller-held "${secondArgStart}" identifier — pass an intent literal, never a pre-built issue/Item-id list` });
      }
    }
  }

  // Check 7: inspection view model never treated as an Item-id source.
  const inspectionItemIdPattern = /inspect(?:ion)?[\w.]*\.issues\[[^\]]*\]\.itemIds|inspect(?:ion)?[\w.]*\.itemIds/;
  for (const file of files) {
    if (file === RECONCILER) continue;
    const source = read(file);
    if (inspectionItemIdPattern.test(source)) {
      violations.push({ check: '7: inspection view model is not an Item-id source', file: path.relative(ROOT, file), detail: 'reads .itemIds off an inspectDroidInstallationDrift()-derived value — the public view model never carries authoritative Item ids' });
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

  console.log('='.repeat(72));
  console.log('  DROID INSTALLATION DRIFT-REPAIR AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${files.length} script file(s) against 8 checks.\n`);

  if (violations.length === 0) {
    console.log('No violations found — droid installation drift repair remains an intent-based, single-authority boundary.');
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
