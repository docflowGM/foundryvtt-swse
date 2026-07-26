#!/usr/bin/env node

/**
 * check-droid-calculation-mode-authority.mjs — droid stock-statblock
 * calculation-mode single-authority guard (Phase 3 — Droid Stock-Statblock
 * Authority).
 *
 * Enforces that the calculation-mode distinction introduced in
 * docs/audits/droid-stock-statblock-authority-phase-3.md stays a single,
 * narrow authority instead of accumulating parallel implementations the way
 * the original droid-part registry did (see
 * docs/audits/droid-static-audit.md). Seven related checks, all variations
 * on "only the approved authority touches this":
 *
 *   1. system.droidCalculationMode is assigned only by the stock importer
 *      (initial statblock mode) and the conversion service (playable mode)
 *      — no other file may write it directly.
 *   2. (same check as 1 — writing the field IS the "direct change".)
 *   3. Only scripts/engine/combat/combat-roll-math.js's resolveAttackBonus()
 *      may special-case flags.swse.stockDroidAttack.publishedAttackTotal as
 *      a complete attack total; every other reference must be read-only
 *      (display/inspection/import), not a second attack-math path.
 *   4. scripts/actors/v2/droid-actor.js must still call both
 *      isDroidStatblockMode() and computeStatblockDerivedOverrides() (the
 *      preservation seam) — guards against someone quietly deleting the
 *      override call while leaving the mode adapter itself intact.
 *   5. Nothing outside the approved caller (the sheet's explicit button
 *      handler) invokes convertToPlayableDerived() — in particular not
 *      scripts/actors/v2/base-actor.js, scripts/actors/v2/droid-actor.js, or
 *      scripts/sheets/v2/droid-sheet/context-builder.js (the
 *      prepare/render pipeline), which would make conversion happen
 *      automatically on sheet open/actor prepare instead of requiring an
 *      explicit action.
 *   6. scripts/domain/droids/droid-statblock-conversion-service.js must not
 *      call actor.update()/item.update() directly — only through
 *      ActorEngine/SnapshotManager.
 *   7. No file outside scripts/actors/droid/droid-mode-adapter.js may check
 *      flags.swse.stockDroidImport.importMode or
 *      system.droidCalculationMode against a literal mode string directly
 *      — everything must go through resolveDroidCalculationMode()/
 *      isDroidStatblockMode() so there is exactly one place that knows the
 *      resolution rules.
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

const MODE_ADAPTER = path.join(ROOT, 'scripts/actors/droid/droid-mode-adapter.js');
const CONVERSION_SERVICE = path.join(ROOT, 'scripts/domain/droids/droid-statblock-conversion-service.js');
const COMBAT_ROLL_MATH = path.join(ROOT, 'scripts/engine/combat/combat-roll-math.js');
const DROID_ACTOR = path.join(ROOT, 'scripts/actors/v2/droid-actor.js');
const STOCK_IMPORTER = path.join(ROOT, 'scripts/engine/import/stock-droid-importer-engine.js');
const CHARACTER_SHEET = path.join(ROOT, 'scripts/sheets/v2/character-sheet.js');

// Files allowed to assign system.droidCalculationMode directly.
const CALCULATION_MODE_WRITE_ALLOWLIST = new Set([STOCK_IMPORTER, CONVERSION_SERVICE]);

// Files allowed to call convertToPlayableDerived(...).
const CONVERT_CALL_ALLOWLIST = new Set([CHARACTER_SHEET, CONVERSION_SERVICE]);

// Files allowed to reference stockDroidAttack.publishedAttackTotal at all
// (reading it for display/inspection/import is fine; only combat-roll-math.js
// may use it to REPLACE the composed attack-bonus formula).
const STOCK_ATTACK_TOTAL_READ_ALLOWLIST = new Set([
  MODE_ADAPTER,
  COMBAT_ROLL_MATH,
  STOCK_IMPORTER,
  CONVERSION_SERVICE,
  CHARACTER_SHEET,
  path.join(ROOT, 'scripts/debug/droid-authority-diagnostics.js')
]);

// Files allowed to check the legacy flag / explicit field against a literal
// mode string directly, instead of going through the resolver.
const MODE_LITERAL_CHECK_ALLOWLIST = new Set([MODE_ADAPTER, STOCK_IMPORTER, CONVERSION_SERVICE]);

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

  // Checks 1 & 2: droidCalculationMode assignment authority.
  const modeAssignPattern = /'system\.droidCalculationMode'\s*:|\[\s*'system\.droidCalculationMode'\s*\]\s*=|\.droidCalculationMode\s*=(?!=)/;
  for (const file of files) {
    if (CALCULATION_MODE_WRITE_ALLOWLIST.has(file)) continue;
    if (file === MODE_ADAPTER) continue; // reads/validates the field; never assigns it
    const source = read(file);
    if (modeAssignPattern.test(source)) {
      violations.push({ check: '1/2: droidCalculationMode write authority', file: path.relative(ROOT, file), detail: 'assigns system.droidCalculationMode outside the stock importer / conversion service' });
    }
  }

  // Check 3: stockDroidAttack.publishedAttackTotal usage.
  for (const file of files) {
    const source = read(file);
    if (!source.includes('publishedAttackTotal')) continue;
    if (STOCK_ATTACK_TOTAL_READ_ALLOWLIST.has(file)) continue;
    violations.push({ check: '3: stock attack routing', file: path.relative(ROOT, file), detail: 'references stockDroidAttack.publishedAttackTotal outside the approved read/write sites — a second attack-math path may have been introduced' });
  }

  // Check 4: droid-actor.js still calls the preservation seam.
  const droidActorSource = read(DROID_ACTOR);
  if (!droidActorSource.includes('isDroidStatblockMode(') || !droidActorSource.includes('computeStatblockDerivedOverrides(')) {
    violations.push({ check: '4: stock-total preservation seam', file: path.relative(ROOT, DROID_ACTOR), detail: 'computeDroidDerived() must call both isDroidStatblockMode() and computeStatblockDerivedOverrides()' });
  }

  // Check 5: convertToPlayableDerived() call sites.
  const convertCallPattern = /\bconvertToPlayableDerived\s*\(/;
  for (const file of files) {
    if (file === CONVERSION_SERVICE) continue; // definition site, not a call
    const source = read(file);
    if (convertCallPattern.test(source) && !CONVERT_CALL_ALLOWLIST.has(file)) {
      violations.push({ check: '5: no automatic conversion', file: path.relative(ROOT, file), detail: 'calls convertToPlayableDerived() outside the approved explicit-action call site' });
    }
  }

  // Check 6: conversion service must not mutate documents directly.
  const conversionSource = read(CONVERSION_SERVICE);
  if (/\bactor\.update\s*\(|\bitem\.update\s*\(/.test(conversionSource)) {
    violations.push({ check: '6: no direct actor/item.update() in conversion code', file: path.relative(ROOT, CONVERSION_SERVICE), detail: 'found a direct actor.update()/item.update() call — mutations must route through ActorEngine/SnapshotManager' });
  }

  // Check 7: no duplicate mode-resolution logic.
  const literalModeCheckPattern = /importMode\s*===\s*['"]statblock['"]|importMode\s*===\s*['"]playable['"]|droidCalculationMode\s*===\s*['"]stock-statblock['"]|droidCalculationMode\s*===\s*['"]playable-derived['"]/;
  for (const file of files) {
    if (MODE_LITERAL_CHECK_ALLOWLIST.has(file)) continue;
    const source = read(file);
    if (literalModeCheckPattern.test(source)) {
      violations.push({ check: '7: single mode-resolution authority', file: path.relative(ROOT, file), detail: 'checks the stock-mode flag/field against a literal string directly instead of calling resolveDroidCalculationMode()/isDroidStatblockMode()' });
    }
  }

  console.log('='.repeat(72));
  console.log('  DROID CALCULATION MODE AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${files.length} script file(s) against 7 checks.\n`);

  if (violations.length === 0) {
    console.log('No violations found — droid calculation mode remains a single authority.');
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
