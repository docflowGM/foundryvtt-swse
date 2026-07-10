#!/usr/bin/env node

/**
 * check-architecture-boundaries.mjs — Static architecture-boundary audit
 *
 * PURPOSE
 * -------
 * Report-only static scan that surfaces architecture-boundary violations the
 * existing `scripts/tools/mutation-lint.js` does NOT already cover. It is
 * deliberately simple (line/regex based) and additive: it does not replace
 * mutation-lint, it complements it.
 *
 * WHAT IT FLAGS (by category)
 * ---------------------------
 *   direct-actor-mutation   Direct actor.update()/create|update|deleteEmbeddedDocuments()
 *                           outside the allowed mutation gateway files. (Overlaps
 *                           mutation-lint; kept here so this tool gives one
 *                           consolidated boundary picture. Report-only here.)
 *
 *   derived-write           Writes to system.derived.* (quoted payload key or a
 *                           direct `.system.derived.x =` assignment) outside the
 *                           DerivedCalculator or the ActorEngine derived-apply flow.
 *                           system.derived.* is owned by DerivedCalculator.
 *
 *   broad-system-payload    An update payload that replaces the whole `system`
 *                           object (`system:` object literal handed to an
 *                           update/apply call) outside known adoption / migration /
 *                           finalization / normalization paths.
 *
 *   progression-registry-bypass
 *                           Progression-facing code (scripts/engine/progression/**)
 *                           importing a low-level content registry directly instead
 *                           of going through ProgressionContentAuthority, which is
 *                           the canonical read seam for that content family.
 *
 * ENFORCEMENT
 * -----------
 * Report-only by default (exit 0 regardless of findings). There is no established
 * CI/package check-runner in this repo (no package.json, no .github/workflows), so
 * this script starts as a warning/report tool, matching the repo's other
 * `tools/*.mjs` audits. Pass `--strict` to exit non-zero when any finding exists
 * (useful if wired into a future check runner). Pass `--json` for machine output.
 *
 * USAGE
 * -----
 *   node tools/check-architecture-boundaries.mjs
 *   node tools/check-architecture-boundaries.mjs --strict
 *   node tools/check-architecture-boundaries.mjs --json
 *   node tools/check-architecture-boundaries.mjs --category=derived-write
 *
 * ALLOWLISTS ARE DOCUMENTED INLINE below each category. Keep them narrow and
 * explicit — an over-broad allowlist silently defeats the audit.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_OUT = args.includes('--json');
const CATEGORY_FILTER = (args.find(a => a.startsWith('--category=')) || '').split('=')[1] || null;

// ---------------------------------------------------------------------------
// Allowlists (documented per category)
// ---------------------------------------------------------------------------

// Files permitted to make direct actor.* document mutations. This mirrors the
// gateway contract: ActorEngine is the only public mutation facade. The other
// entries are the low-level shims ActorEngine itself is built on, plus governance
// enforcement/diagnostic layers that inspect or route mutations.
const MUTATION_GATEWAY_ALLOW = [
  'scripts/governance/actor-engine/',       // ActorEngine + hp-recompute-hooks + internals
  'scripts/governance/mutation/',           // interceptor, boundary, normalization, adapter
  'scripts/governance/sentinel/',           // sovereignty/enforcement instrumentation
  'scripts/governance/snapshot/',           // snapshot restore is an ActorEngine-owned gateway
  'scripts/utils/actor-utils.js',           // legacy shared mutation helper (mutation-lint allows)
  'scripts/core/mutation-safety.js',        // validation layer
  'scripts/tools/mutation-lint.js',         // the lint itself references the patterns
];

// system.derived.* is owned by DerivedCalculator. The ActorEngine derived-apply
// flow (_applyDerivedUpdates / recalcAll) merges the DerivedCalculator bundle and
// is therefore also authoritative. preflight-validator inspects derived paths.
const DERIVED_WRITE_ALLOW = [
  'scripts/actors/derived/',                        // DerivedCalculator + sub-calculators
  'scripts/actors/v2/vehicle-derived-builder.js',   // vehicle derived builder (derived authority)
  'scripts/governance/actor-engine/actor-engine.js',// _applyDerivedUpdates / derived apply
  'scripts/governance/enforcement/preflight-validator.js', // derived path validation
  // NOTE: ModifierEngine is intentionally NOT allowlisted. It is documented as
  // impure (writes system.derived.* directly) in the ActorEngine responsibility
  // audit; surfacing it here is the point.
];

// Broad `system:` replacement is legitimate only in identity/adoption, migration/
// repair, progression finalization, and canonical normalization paths.
const BROAD_SYSTEM_ALLOW = [
  'scripts/governance/actor-engine/',       // adoption / apply / normalization
  'scripts/governance/mutation/',
  'scripts/governance/snapshot/',
  'scripts/migration/',
  'scripts/migrations/',
  'scripts/engine/chargen/',                // CharacterGenerationEngine canonical seed
  'scripts/apps/progression-framework/',    // finalizer / mutation-plan
  'scripts/engine/import/',                 // importers build whole system shapes
  'scripts/actors/',                        // actor data-model prepare / seed
];

// Progression-registry seam: within scripts/engine/progression/**, content reads
// should route through ProgressionContentAuthority. These files are exempt because
// they ARE registries/authority/adapters (the seam itself), not consumers.
const PROGRESSION_SEAM_EXEMPT = [
  'progression-content-authority.js',       // the seam
  'class-data-loader.js',                   // documented legacy compatibility adapter
  'class-resolution.js',                    // low-level resolution adapter
];
// Any progression file whose basename contains one of these is treated as a
// registry/adapter surface rather than a progression consumer.
const PROGRESSION_SEAM_EXEMPT_SUBSTR = ['registry', 'registrar'];

const LOW_LEVEL_REGISTRY_IMPORT =
  /import\s+[^;]*?from\s+['"][^'"]*\/(classes-registry|feat-registry|talent-registry|species-registry|background-registry|force-registry)\.js['"]/;

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const DIRECT_MUTATION = /\bactor\.(update|updateEmbeddedDocuments|createEmbeddedDocuments|deleteEmbeddedDocuments)\s*\(/;
const DERIVED_KEY_WRITE = /['"`]system\.derived\.[a-zA-Z0-9_.]+['"`]\s*:/;
const DERIVED_ASSIGN_WRITE = /\.system\.derived\.[a-zA-Z0-9_.]+\s*=[^=]/;
const BROAD_SYSTEM_PAYLOAD = /\.(update|apply)\s*\([^)]*\{\s*system\s*:/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function inAllowlist(relPath, list) {
  return list.some(entry => relPath.startsWith(entry) || relPath === entry);
}

function isCommentOrString(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

function hasException(line) {
  return line.includes('@mutation-exception') || line.includes('@architecture-exception');
}

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

const findings = [];
function record(category, file, lineNo, text) {
  if (CATEGORY_FILTER && category !== CATEGORY_FILTER) return;
  findings.push({ category, file: rel(file), line: lineNo, text: text.trim().slice(0, 200) });
}

const files = walk(SCRIPTS);

for (const file of files) {
  const relPath = rel(file);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const isProgression = relPath.startsWith('scripts/engine/progression/');
  const base = path.basename(relPath);
  const progressionExempt = isProgression && (
    PROGRESSION_SEAM_EXEMPT.includes(base) ||
    PROGRESSION_SEAM_EXEMPT_SUBSTR.some(s => base.includes(s))
  );

  let inBlockComment = false;
  lines.forEach((line, i) => {
    const lineNo = i + 1;

    // Track /* ... */ block comments so interior lines (which may lack a `*`
    // prefix) are not mistaken for code.
    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false;
      return;
    }
    const openIdx = line.indexOf('/*');
    if (openIdx !== -1 && !line.includes('*/', openIdx)) {
      inBlockComment = true;
      // Fall through to scan any code before the '/*' on this same line.
      line = line.slice(0, openIdx);
    }

    if (isCommentOrString(line) || hasException(line)) return;

    // 1. direct-actor-mutation
    if (DIRECT_MUTATION.test(line) && !inAllowlist(relPath, MUTATION_GATEWAY_ALLOW)) {
      record('direct-actor-mutation', file, lineNo, line);
    }

    // 2. derived-write
    if ((DERIVED_KEY_WRITE.test(line) || DERIVED_ASSIGN_WRITE.test(line)) &&
        !inAllowlist(relPath, DERIVED_WRITE_ALLOW)) {
      record('derived-write', file, lineNo, line);
    }

    // 3. broad-system-payload
    if (BROAD_SYSTEM_PAYLOAD.test(line) && !inAllowlist(relPath, BROAD_SYSTEM_ALLOW)) {
      record('broad-system-payload', file, lineNo, line);
    }

    // 4. progression-registry-bypass
    if (isProgression && !progressionExempt && LOW_LEVEL_REGISTRY_IMPORT.test(line)) {
      record('progression-registry-bypass', file, lineNo, line);
    }
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const CATEGORY_INFO = {
  'direct-actor-mutation':
    'Route through ActorEngine.updateActor()/createEmbeddedDocuments()/etc.',
  'derived-write':
    'system.derived.* is owned by DerivedCalculator; write via the derived apply flow.',
  'broad-system-payload':
    'Prefer leaf dot-path updates. Broad system replacement is only for adoption/migration/finalization/normalization.',
  'progression-registry-bypass':
    'Read content through ProgressionContentAuthority rather than importing low-level registries directly.',
};

if (JSON_OUT) {
  console.log(JSON.stringify({ findings, total: findings.length }, null, 2));
} else {
  const byCategory = new Map();
  for (const f of findings) {
    if (!byCategory.has(f.category)) byCategory.set(f.category, []);
    byCategory.get(f.category).push(f);
  }

  console.log('\n' + '='.repeat(72));
  console.log('  SWSE ARCHITECTURE BOUNDARY AUDIT (report-only)');
  console.log('='.repeat(72));
  console.log(`  Scanned ${files.length} files under scripts/`);

  if (findings.length === 0) {
    console.log('\n  ✅ No architecture-boundary findings.\n');
  } else {
    for (const [category, items] of [...byCategory.entries()].sort()) {
      console.log(`\n  ── ${category} (${items.length}) ──`);
      console.log(`     ${CATEGORY_INFO[category] || ''}`);
      for (const f of items) {
        console.log(`     ${f.file}:${f.line}`);
        console.log(`        ${f.text}`);
      }
    }
    console.log('\n' + '-'.repeat(72));
    console.log('  Summary by category:');
    for (const [category, items] of [...byCategory.entries()].sort()) {
      console.log(`     ${category.padEnd(30)} ${items.length}`);
    }
    console.log(`     ${'TOTAL'.padEnd(30)} ${findings.length}`);
  }
  console.log('='.repeat(72) + '\n');
}

if (STRICT && findings.length > 0) {
  process.exit(1);
}
process.exit(0);
