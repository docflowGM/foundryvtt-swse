#!/usr/bin/env node

/**
 * check-ability-schema-authority.mjs
 *
 * Guardrail for the v2 ability schema contract:
 * - Persistent/editable ability scores live on system.attributes.*
 * - Computed totals/modifiers live on system.derived.attributes.*
 * - system.abilities.* is legacy compatibility/fallback only
 *
 * This scanner flags likely new write or UI-binding sites for system.abilities.*.
 * Reads in adapters, migration code, and documentation are intentionally ignored.
 *
 * READ CHECK (--check-reads / --strict-reads):
 * docs/audits/ability-schema-authority-migration-phase3-ledger.md's read-side
 * remediation fixed every Category C site (a runtime read that checked
 * system.abilities before/instead of system.attributes/system.derived.attributes
 * on a live Actor). That migration also catalogued ~40 remaining files that
 * still read system.abilities directly in live code — reviewed there as
 * Category A (migration-only), B (correct compatibility-boundary order, or
 * governance/guardrail code enforcing the write-side contract), or N/A
 * (an Item's own `abilities`/`abilityMods` field, unrelated to Actor
 * authority), plus a small number explicitly flagged as needing further
 * follow-up rather than fixed in that pass. --check-reads reports every
 * live (non-comment) system.abilities read outside a narrow allowlist, so a
 * NEW read introduced after this baseline gets surfaced instead of silently
 * joining the reviewed set. It is report-only by default (like this file's
 * other debt reports in tools/check-architecture-phase4.mjs) — pass
 * --strict-reads to make it exit non-zero, once the reviewed baseline below
 * is intentionally adopted as a hard gate. --strict continues to gate ONLY
 * the pre-existing write/bind check, unchanged, so existing CI behavior
 * (tools/check-architecture-phase4.mjs's hard gate) is unaffected.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');
const CHECK_READS = process.argv.includes('--check-reads') || process.argv.includes('--strict-reads');
const STRICT_READS = process.argv.includes('--strict-reads');

const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.hbs', '.html']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'packs']);

const ALLOWLIST = [
  /^template\.json$/,
  /^scripts\/utils\/schema-adapters\.js$/,
  /^scripts\/adapters\/ActorAbilityBridge\.js$/,
  /^scripts\/migrations\//,
  /^tools\//,
  /^docs\//
];

const WRITE_PATTERNS = [
  /['"]system\.abilities\.[^'"]+['"]\s*:/,
  /\bname\s*=\s*['"]system\.abilities\./,
  /\bdata-dtype\s*=\s*['"][^'"]*['"][^\n]*system\.abilities\./,
  /setProperty\s*\([^,]+,\s*['"]system\.abilities\./,
  /update\s*\(\s*\{[^}]*['"]system\.abilities\./s,
  /updateActor\s*\([^,]+,\s*\{[^}]*['"]system\.abilities\./s,
  /ActorEngine\.(?:updateActor|applyMutationPlan)\s*\([^,]+,\s*\{[^}]*['"]system\.abilities\./s,
  /system\.abilities\.[a-z]{3}\.(?:base|racial|species|enhancement|misc|temp)\s*=/
];

// Narrow allowlist for READ findings only (--check-reads/--strict-reads),
// per docs/audits/ability-schema-authority-migration-phase3-ledger.md's
// closing recommendation: migration scripts, the ActorEngine compatibility
// boundary, mutation governance/enforcement, explicit import adapters,
// debug/audit tooling, tests exercising legacy input, and Item-schema files
// whose own `abilities`/`abilityMods` field is unrelated to Actor
// ability-score authority (species/droid-chassis templates — see the N/A
// rows in the ledger).
const READ_CATEGORY_ALLOWLIST = [
  /^scripts\/migrations\//,
  /^scripts\/governance\/actor-engine\/actor-engine\.js$/,
  /^scripts\/governance\/mutation\//,
  /^scripts\/governance\/sentinel\//,
  /^scripts\/adapters\//,
  /^scripts\/utils\/schema-adapters\.js$/,
  /^scripts\/debug\//,
  /^tests\//,
  // Item-schema (species/droid-chassis) N/A files, per the ledger.
  /^scripts\/drag-drop\/drop-handler\.js$/,
  /^scripts\/species\/species-grant-ledger-builder\.js$/,
  /^scripts\/apps\/chargen\/chargen-shared\.js$/,
  /^scripts\/engine\/registries\/species-registry\.js$/
];

// Reviewed baseline: every file docs/audits/ability-schema-authority-migration-phase3-ledger.md
// classified as Category A (migration-only), B (correct compatibility-
// boundary order, or governance/guardrail code enforcing the write-side
// contract), or E (comment/doc only, no runtime effect) as of that ledger's
// completion — i.e. every remaining live system.abilities read NOT flagged
// there as needing further follow-up. Deliberately excludes the handful of
// files the ledger flagged as open questions rather than reviewed-correct
// (scripts/infrastructure/hooks/{force-power-hooks,starship-maneuver-hooks}.js,
// scripts/engine/npc-legal-review/{NpcLegalReviewEngine,NpcReviewRepairEngine}.js,
// scripts/apps/progression-framework/shell/mutation-plan.js) so those keep
// surfacing as findings until someone actually resolves them. A file
// leaving this list because it was fixed to route through SchemaAdapters
// is expected and fine — this baseline only needs to shrink over time, not
// grow to match new code. New code should call SchemaAdapters instead of
// reading system.abilities directly at all; this baseline exists to avoid
// retroactively flagging already-reviewed history, not to bless the
// pattern for future use.
const READ_REVIEWED_BASELINE = new Set([
  'scripts/actors/derived/defense-calculator.js',
  'scripts/actors/derived/derived-calculator.js',
  'scripts/engine/progression/feats/feat-grant-entitlement-resolver.js',
  'scripts/engine/progression/utils/force-suite-resolution.js',
  'scripts/engine/feats/force-training-entitlement-runtime-patches.js',
  'scripts/engine/suggestion/equipment/scoring/armor-benefit-simulator.js',
  'scripts/engine/suggestion/equipment/weapon-scoring-engine.js',
  'scripts/engine/suggestion/equipment/gear-suggestions.js',
  'scripts/engine/suggestion/equipment/armor-scoring-engine.js',
  'scripts/engine/suggestion/equipment/equipment-use-evaluator.js',
  'scripts/engine/chargen/CharacterGenerationEngine.js',
  'scripts/engine/core/commands/ActorCommands.js',
  'scripts/engine/store/index.js',
  'scripts/dialogs/entity-dialog/effect-intent-engine.js',
  'scripts/apps/progression-framework/shell/active-step-computer.js',
  'scripts/apps/progression-framework/shell/progression-finalizer.js',
  'scripts/apps/progression-framework/steps/skills-step.js',
  'scripts/apps/progression-framework/steps/attribute-step.js',
  'scripts/sheets/v2/character-sheet/context.js',
  'scripts/sheets/v2/actor-sheet-base.js',
  'scripts/sheets/v2/character-like-sheet.js',
  'scripts/domain/droids/stock-droid-normalizer.js',
  'scripts/domain/droids/stock-droid-comparison-utility.js',
  'scripts/patches/canonical-ability-prerequisite-hotfix.js'
]);

const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function isAllowed(relativePath) {
  return ALLOWLIST.some(pattern => pattern.test(relativePath));
}

function isReadAllowed(relativePath) {
  return isAllowed(relativePath)
    || READ_CATEGORY_ALLOWLIST.some(pattern => pattern.test(relativePath))
    || READ_REVIEWED_BASELINE.has(relativePath);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (SCAN_EXTENSIONS.has(path.extname(name))) out.push(full);
  }
  return out;
}

const findings = [];
const readFindings = [];

for (const file of walk(ROOT)) {
  const relativePath = rel(file);
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('system.abilities')) continue;

  const lines = text.split(/\r?\n/);

  if (!isAllowed(relativePath)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('system.abilities')) continue;
      const windowText = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n');
      if (WRITE_PATTERNS.some(pattern => pattern.test(windowText))) {
        findings.push({ file: relativePath, line: i + 1, text: line.trim() });
      }
    }
  }

  if (CHECK_READS && !isReadAllowed(relativePath)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('system.abilities')) continue;
      if (COMMENT_LINE.test(line)) continue;
      readFindings.push({ file: relativePath, line: i + 1, text: line.trim() });
    }
  }
}

if (JSON_OUT) {
  const out = { findings };
  if (CHECK_READS) out.readFindings = readFindings;
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log('\n' + '='.repeat(72));
  console.log('  ABILITY SCHEMA AUTHORITY CHECK');
  console.log('='.repeat(72));
  console.log('  Canonical persistent path: system.attributes.<ability>.*');
  console.log('  Canonical computed path:   system.derived.attributes.<ability>.*');
  console.log('  Legacy fallback only:      system.abilities.<ability>.*');

  if (!findings.length) {
    console.log('\n  OK: no likely system.abilities write/bind sites found.');
  } else {
    console.log(`\n  Findings (${findings.length}):`);
    for (const finding of findings) {
      console.log(`     - ${finding.file}:${finding.line} ${finding.text}`);
    }
  }

  if (CHECK_READS) {
    console.log('\n  --- Read check (outside the narrow allowlist + reviewed baseline) ---');
    if (!readFindings.length) {
      console.log('\n  OK: no unreviewed system.abilities reads found.');
    } else {
      console.log(`\n  Read findings (${readFindings.length}) -- new or unreviewed; see`);
      console.log('  docs/audits/ability-schema-authority-migration-phase3-ledger.md:');
      for (const finding of readFindings) {
        console.log(`     - ${finding.file}:${finding.line} ${finding.text}`);
      }
    }
  }
  console.log('='.repeat(72) + '\n');
}

if (STRICT && findings.length > 0) process.exit(1);
if (STRICT_READS && readFindings.length > 0) process.exit(1);
process.exit(0);
