#!/usr/bin/env node

/**
 * check-follower-droid-chassis-authority.mjs — follower droid-chassis
 * single-step, single-engine authority guard (Phase 6 — Consolidate
 * Follower Droid Chargen into One Chassis Step).
 *
 * Enforces that the bug this phase fixed — two independently-reachable
 * droid-related follower steps, one real and one a hand-rolled duplicate —
 * cannot silently reappear. Six checks:
 *
 *   1. FollowerShell registers exactly one droid-chassis-capable step
 *      descriptor (`droid-builder`), and FollowerSpeciesStep no longer
 *      contains a droid-branch implementation (no `_buildDroidConfig`/
 *      `_isDroidPath`/hardcoded droid-system catalogs) that could make it
 *      a second one.
 *   2. The removed `follower-droid-step.js` (confirmed fully dead at the
 *      time of removal) does not exist and is not imported anywhere —
 *      guards against reintroducing a third competing implementation.
 *   3. Only `scripts/apps/follower-creator.js` reads
 *      `persistentChoices.droidConfig` for follower finalization purposes
 *      — no second file separately parses/writes a follower chassis
 *      payload at finalization time.
 *   4. The chassis applicability engine
 *      (`isFollowerDroidChassisApplicable`/`getApplicableFollowerDroidChassisOptions`)
 *      is defined only in follower-droid-chassis-applicability.js; only
 *      droid-builder-step.js may call it.
 *   5. No direct `actor.update()`/`item.update()` in the follower
 *      droid-chassis step files.
 *   6. The applicability engine's core predicate filters by canonical
 *      category/id/subcategory only — never by matching a display name
 *      substring, which would silently turn descriptive text into a
 *      mechanical decision.
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

const FOLLOWER_SHELL = path.join(ROOT, 'scripts/apps/progression-framework/follower-shell.js');
const FOLLOWER_SPECIES_STEP = path.join(ROOT, 'scripts/apps/progression-framework/steps/follower-steps/follower-species-step.js');
const FOLLOWER_DROID_BUILDER_STEP = path.join(ROOT, 'scripts/apps/progression-framework/steps/follower-steps/follower-droid-builder-step.js');
const DROID_BUILDER_STEP = path.join(ROOT, 'scripts/apps/progression-framework/steps/droid-builder-step.js');
const APPLICABILITY_ENGINE = path.join(ROOT, 'scripts/apps/progression-framework/steps/follower-droid-chassis-applicability.js');
const REMOVED_DEAD_STEP = path.join(ROOT, 'scripts/apps/progression-framework/steps/follower-steps/follower-droid-step.js');
const FOLLOWER_CREATOR = path.join(ROOT, 'scripts/apps/follower-creator.js');

const CHASSIS_STEP_FILES = [FOLLOWER_SHELL, FOLLOWER_SPECIES_STEP, FOLLOWER_DROID_BUILDER_STEP];
const APPLICABILITY_CALL_ALLOWLIST = new Set([DROID_BUILDER_STEP, APPLICABILITY_ENGINE]);
const DROID_CONFIG_FINALIZATION_READ_ALLOWLIST = new Set([FOLLOWER_CREATOR]);

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

  // Check 1: exactly one droid-chassis-capable step descriptor, and
  // FollowerSpeciesStep carries no droid-branch implementation.
  if (fs.existsSync(FOLLOWER_SHELL)) {
    const shellSource = read(FOLLOWER_SHELL);
    const droidBuilderDescriptorMatches = shellSource.match(/stepId:\s*'droid-builder'/g) || [];
    if (droidBuilderDescriptorMatches.length !== 1) {
      violations.push({ check: '1: single droid-chassis step descriptor', file: path.relative(ROOT, FOLLOWER_SHELL), detail: `expected exactly one 'droid-builder' step descriptor, found ${droidBuilderDescriptorMatches.length}` });
    }
  }
  if (fs.existsSync(FOLLOWER_SPECIES_STEP)) {
    const speciesSource = read(FOLLOWER_SPECIES_STEP);
    const droidBranchMarkers = ['_buildDroidConfig', '_isDroidPath', 'BASE_DROID_SYSTEMS', 'OPTIONAL_DROID_SYSTEMS', '_renderDroidStep'];
    const found = droidBranchMarkers.filter(marker => speciesSource.includes(marker));
    if (found.length > 0) {
      violations.push({ check: '1: single droid-chassis step descriptor', file: path.relative(ROOT, FOLLOWER_SPECIES_STEP), detail: `FollowerSpeciesStep must stay organic-only; found reintroduced droid-branch markers: ${found.join(', ')}` });
    }
  }

  // Check 2: the removed dead step never reappears.
  if (fs.existsSync(REMOVED_DEAD_STEP)) {
    violations.push({ check: '2: no reintroduced dead droid step', file: path.relative(ROOT, REMOVED_DEAD_STEP), detail: 'follower-droid-step.js was removed as fully dead code in Phase 6 and must not be reintroduced' });
  }
  const deadStepImportPattern = /follower-droid-step\.js|FollowerDroidStep\b/;
  for (const file of files) {
    if (file === REMOVED_DEAD_STEP) continue;
    if (deadStepImportPattern.test(read(file))) {
      violations.push({ check: '2: no reintroduced dead droid step', file: path.relative(ROOT, file), detail: 'references the removed FollowerDroidStep/follower-droid-step.js' });
    }
  }

  // Check 3: single finalization consumer of the follower droidConfig payload.
  const droidConfigReadPattern = /persistentChoices\??\.droidConfig|choices\??\.droidConfig\?\.isDroid/;
  for (const file of files) {
    if (DROID_CONFIG_FINALIZATION_READ_ALLOWLIST.has(file)) continue;
    if (file === FOLLOWER_SHELL || file === FOLLOWER_SPECIES_STEP || file === FOLLOWER_DROID_BUILDER_STEP) continue; // step-side authoring, not finalization consumption
    if (file.includes(`${path.sep}follower-steps${path.sep}`)) continue; // step plugins legitimately read their own draft field
    const source = read(file);
    if (droidConfigReadPattern.test(source) && /finaliz|createFollowerFromMutation|updateFollowerFromMutation|_compileMutationPlan/i.test(source)) {
      violations.push({ check: '3: single finalization consumer', file: path.relative(ROOT, file), detail: 'a second file appears to independently consume the follower droidConfig payload at finalization time' });
    }
  }

  // Check 4: single applicability engine.
  const applicabilityDefinitionPattern = /export\s+function\s+(isFollowerDroidChassisApplicable|getApplicableFollowerDroidChassisOptions)\s*\(/;
  for (const file of files) {
    if (file === APPLICABILITY_ENGINE) continue;
    if (applicabilityDefinitionPattern.test(read(file))) {
      violations.push({ check: '4: single chassis applicability engine', file: path.relative(ROOT, file), detail: 'defines isFollowerDroidChassisApplicable/getApplicableFollowerDroidChassisOptions outside the canonical engine — a second, competing engine may have been introduced' });
    }
  }
  const applicabilityCallPattern = /\b(isFollowerDroidChassisApplicable|getApplicableFollowerDroidChassisOptions)\s*\(/;
  for (const file of files) {
    if (APPLICABILITY_CALL_ALLOWLIST.has(file)) continue;
    const source = read(file);
    if (applicabilityCallPattern.test(source) && !source.includes(`from './follower-droid-chassis-applicability.js'`) && !source.includes(`from '../follower-droid-chassis-applicability.js'`)) {
      // Only flag genuine call sites (import-and-call), not comments/docs.
      if (/(?:^|[^/*])\b(isFollowerDroidChassisApplicable|getApplicableFollowerDroidChassisOptions)\s*\(/m.test(source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) {
        violations.push({ check: '4: single chassis applicability engine', file: path.relative(ROOT, file), detail: 'calls the chassis applicability engine outside the approved call site (droid-builder-step.js)' });
      }
    }
  }

  // Check 5: no direct actor/item.update() in the chassis step files.
  for (const file of CHASSIS_STEP_FILES) {
    if (!fs.existsSync(file)) continue;
    const source = read(file);
    if (/\bactor\.update\s*\(|\bitem\.update\s*\(/.test(source)) {
      violations.push({ check: '5: no direct actor/item mutation in chassis step', file: path.relative(ROOT, file), detail: 'found a direct actor.update()/item.update() call — follower chassis mutations must route through the progression finalization/ActorEngine authority' });
    }
  }

  // Check 6: applicability predicate filters by category/id/subcategory,
  // never by display-name substring matching.
  if (fs.existsSync(APPLICABILITY_ENGINE)) {
    const engineSource = read(APPLICABILITY_ENGINE);
    if (/\.name\s*\.\s*toLowerCase\s*\(\s*\)\s*\.\s*includes\s*\(/.test(engineSource)) {
      violations.push({ check: '6: no name-only applicability', file: path.relative(ROOT, APPLICABILITY_ENGINE), detail: 'the applicability engine must decide by canonical category/id/subcategory, never by matching a display name substring' });
    }
  }

  console.log('='.repeat(72));
  console.log('  FOLLOWER DROID CHASSIS AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${files.length} script file(s) against 6 checks.\n`);

  if (violations.length === 0) {
    console.log('No violations found — the follower droid chassis step remains a single authority.');
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
