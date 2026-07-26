#!/usr/bin/env node

/**
 * check-droid-installation-write-authority.mjs — droid installation write
 * single-writer guard (Phase 2 — Droid Authority Consolidation).
 *
 * docs/audits/droid-static-audit.md and Phase 1's follow-up found that
 * system.installedSystems and system.droidSystems were each written
 * independently by the Garage (DroidCustomizationEngine) AND the Upgrade
 * Workshop (UpgradeService, bypassing the Garage entirely and skipping its
 * cost/credit transaction and embedded-Item reconciliation). Phase 2's rule
 * is: no writer may independently mutate system.installedSystems or
 * system.droidSystems outside one approved authority
 * (DroidCustomizationEngine) or a narrow, documented list of one-time
 * actor-creation writers (chargen finalization, follower creation, stock
 * import) that seed initial state before any installation ledger exists to
 * drift against.
 *
 * This checks for the literal assignment shape
 * ('system.installedSystems'/'system.droidSystems' used as an object key,
 * or as a bracket-assignment target) in any scripts/ file outside the
 * allowlist below. It does not flag mere references to the string (e.g. a
 * diagnostic label) because it requires the shape to look like an actual
 * assignment target, not just the string appearing somewhere.
 *
 * Report-only by default; --strict exits non-zero if a violation is found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const STRICT = process.argv.includes('--strict');

// Every entry here must justify itself: either it IS the canonical
// authority, or it is a one-time actor-creation writer that runs before any
// installedSystems ledger exists to drift against, or it is dead code, or it
// is UpgradeService's narrow, documented legacy-data fallback (which routes
// through the canonical authority as its primary path — see the comment at
// its call site).
const ALLOWLIST = new Map([
  ['scripts/engine/customization/droid-customization-engine.js', 'canonical installation authority'],
  ['scripts/engine/upgrades/UpgradeService.js', 'routes through DroidCustomizationEngine as its primary path; this file\'s only direct installedSystems write is a documented fallback for a droid system id that does not resolve against the canonical registry, plus the (out-of-scope) vehicle-actor branch'],
  ['scripts/apps/progression-framework/adapters/default-subtypes.js', 'one-time chargen finalization writer — seeds initial droid state, no pre-existing ledger to drift against'],
  ['scripts/apps/follower-creator.js', 'one-time follower-creation writer — same reasoning as chargen finalization'],
  ['scripts/engine/import/stock-droid-importer-engine.js', 'one-time stock-droid import writer — seeds initial droid state from a published statblock'],
  ['scripts/domain/droids/droid-modification-factory.js', 'dead code — only reachable through droid-transaction-service.js, which nothing in the repo imports (verified at Phase 1 and Phase 2 time)'],
  ['scripts/apps/droid-builder-app.js', 'dead code — only reachable through StockDroidConversionDialog, which nothing in the repo imports (verified at Phase 1 and Phase 2 time)']
].map(([file, reason]) => [path.join(ROOT, file), reason]));

const TARGET_FIELD_PATTERN = /'(system\.(?:installedSystems|droidSystems))'\s*:|\[\s*'(system\.(?:installedSystems|droidSystems))'\s*\]\s*=/g;

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

function findAssignmentTargets(source) {
  const fields = new Set();
  let match;
  TARGET_FIELD_PATTERN.lastIndex = 0;
  while ((match = TARGET_FIELD_PATTERN.exec(source))) {
    fields.add(match[1] ?? match[2]);
  }
  return [...fields];
}

function isVehicleOnlyFile(relPath) {
  return /vehicle/i.test(relPath);
}

function main() {
  const files = walk(SCRIPTS);
  const violations = [];

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    if (isVehicleOnlyFile(relPath)) continue; // vehicles have their own, separate installedSystems authority — out of scope here
    const reason = ALLOWLIST.get(file);
    const source = fs.readFileSync(file, 'utf8');
    const targets = findAssignmentTargets(source);
    if (targets.length === 0) continue;
    if (reason) continue;
    violations.push({ file: relPath, targets });
  }

  console.log('='.repeat(72));
  console.log('  DROID INSTALLATION WRITE AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nAllowlisted files: ${ALLOWLIST.size}.`);
  console.log(`Scanned ${files.length} script file(s).\n`);

  if (violations.length === 0) {
    console.log('No file outside the canonical authority / documented creation-time writers assigns system.installedSystems or system.droidSystems directly.');
    console.log('='.repeat(72));
    process.exit(0);
  }

  console.log(`Found ${violations.length} file(s) directly assigning droid installation state outside the approved authority:\n`);
  for (const violation of violations) {
    console.log(`  ${violation.file}`);
    console.log(`    fields: ${violation.targets.join(', ')}`);
  }
  console.log('\nRoute the mutation through DroidCustomizationEngine.applyDroidCustomization() instead of writing');
  console.log('system.installedSystems / system.droidSystems directly, or — if this is a genuine, reviewed');
  console.log('one-time creation-time writer or dead code — add it to ALLOWLIST above with a comment explaining why.');
  console.log('='.repeat(72));

  process.exit(STRICT ? 1 : 0);
}

main();
