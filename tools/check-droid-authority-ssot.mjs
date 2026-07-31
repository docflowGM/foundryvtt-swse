#!/usr/bin/env node

/**
 * check-droid-authority-ssot.mjs — Droid part registry single-source-of-truth guard
 *
 * PHASE 1 — Droid Authority Consolidation static guard.
 *
 * docs/audits/droid-static-audit.md's headline finding was that the repo
 * had accumulated multiple independently-maintained droid-part rule tables
 * (scripts/data/droid-part-schema.js, scripts/domain/droids/droid-part-schema.js,
 * and a private LEGACY_DROID_SYSTEM_DEFINITIONS catalog inside
 * scripts/domain/droids/droid-system-definitions.js) that disagreed with each
 * other. Phase 1 selected scripts/data/droid-part-schema.js as canonical and
 * left the others in place only as narrowly-scoped compatibility modules
 * (see that file's header comment). This guard keeps a FOURTH one from
 * appearing: it flags any file outside an explicit allowlist that defines an
 * object literal containing several real canonical droid-part ids as keys —
 * the shape a new "just this one extra part table" catalog would take.
 *
 * This is intentionally narrow (content-aware: it checks for co-occurring
 * real canonical ids, not a generic text ban) rather than a blanket
 * "droid" keyword search, which would flag ordinary consumers that legitimately
 * reference a part id or two.
 *
 * Report-only by default; --strict exits non-zero if a violation is found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DROID_SYSTEMS } from '../scripts/data/droid-systems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const STRICT = process.argv.includes('--strict');

// Files permitted to define droid-part rule tables. Everything else must
// consume the canonical registry rather than define its own.
const ALLOWLIST = new Set([
  'scripts/data/droid-part-schema.js',                    // canonical registry
  'scripts/data/droid-systems.js',                        // raw underlying data source the canonical registry overlays
  'scripts/domain/droids/droid-part-schema.js',            // prerequisite/identity compatibility module (documented, unchanged in Phase 1)
  'scripts/domain/droids/droid-system-definitions.js'      // compatibility facade merging the above + legacy catalog (documented, dormant consumers only)
].map(p => path.join(ROOT, p)));

// Minimum number of distinct canonical ids that must co-occur as object keys
// in a single file before it looks like a competing part-rule table rather
// than a file that merely references one or two ids in passing.
const MIN_MATCHING_KEYS = 3;

// Locomotion-mode vocabulary ("wheeled", "tracked", ...) is legitimately
// shared between the droid and vehicle domains in SWSE — vehicles have their
// own, unrelated category registry that happens to use the same English
// words for its own locomotion modes. Matching on these alone is not
// meaningful signal that a file is defining droid-part rules, so they are
// excluded from this guard's id sample (the real canonical registry is
// unaffected — this only narrows what counts as a match here).
const CROSS_DOMAIN_LOCOMOTION_WORDS = new Set(['wheeled', 'tracked', 'hovering', 'flying', 'walking', 'stationary', 'mount']);

function slug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// scripts/data/droid-part-schema.js — the canonical registry — cannot be
// imported here: it pulls in DROID_SYSTEMS via an absolute
// /systems/foundryvtt-swse/... specifier that only resolves inside a running
// Foundry instance, not plain Node (see that file's own header + this repo's
// CI, which is Node-only). Its RAW_OVERLAY entries are the actual
// normalized part ids most consumers key off (e.g. 'heuristic-processor',
// 'self-destruct-system') and are NOT all present as literal ids in the raw
// DROID_SYSTEMS data below, so they are extracted textually instead of by
// import: every `'quoted-id': {` at the top level of RAW_OVERLAY is a part
// id. This pattern reliably excludes RAW_OVERLAY's own nested fields
// (category, slot, rules, modifiers, weaponProfile, ...) because those are
// unquoted identifiers, not quoted strings, in this file's style.
function collectSchemaOverlayIds() {
  const schemaPath = path.join(ROOT, 'scripts/data/droid-part-schema.js');
  const source = fs.readFileSync(schemaPath, 'utf8');
  const start = source.indexOf('const RAW_OVERLAY');
  const end = source.indexOf('\n};', start);
  const block = start >= 0 && end > start ? source.slice(start, end) : '';
  const ids = new Set();
  const pattern = /'([a-z0-9-]+)':\s*\{/g;
  let match;
  while ((match = pattern.exec(block))) ids.add(match[1]);
  return ids;
}

function collectCanonicalIds() {
  const ids = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) {
      for (const entry of node) {
        if (entry && typeof entry === 'object' && (entry.id || entry.name)) {
          if (entry.id) ids.add(slug(entry.id));
          if (entry.name) ids.add(slug(entry.name));
        } else {
          visit(entry);
        }
      }
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const value of Object.values(node)) visit(value);
  };
  visit(DROID_SYSTEMS);
  for (const id of collectSchemaOverlayIds()) ids.add(id);
  // Drop ids that are too short/common to be meaningful signal on their own
  // (avoids false positives from generic keys like "type" or "id" that a
  // slug() pass could theoretically produce from unrelated data), and drop
  // cross-domain locomotion vocabulary shared with the vehicle registry.
  return [...ids].filter(id => id.length >= 4 && !CROSS_DOMAIN_LOCOMOTION_WORDS.has(id));
}

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

// Matches `'some-id':` / `"some-id":` / `some_id:` style object keys so we
// only count identifiers actually used AS OBJECT KEYS, not id strings that
// merely appear somewhere in a file (e.g. inside a comment or an unrelated
// string literal).
function objectKeysIn(source) {
  const keys = new Set();
  const pattern = /(?:^|[{,\n])\s*(?:['"]([a-zA-Z0-9_-]+)['"]|([a-zA-Z_$][a-zA-Z0-9_$]*))\s*:/g;
  let match;
  while ((match = pattern.exec(source))) {
    keys.add(slug(match[1] ?? match[2]));
  }
  return keys;
}

function main() {
  const canonicalIds = new Set(collectCanonicalIds());
  const files = walk(SCRIPTS);
  const violations = [];

  for (const file of files) {
    if (ALLOWLIST.has(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    const keys = objectKeysIn(source);
    const matches = [...keys].filter(key => canonicalIds.has(key));
    if (matches.length >= MIN_MATCHING_KEYS) {
      violations.push({ file: path.relative(ROOT, file), matches });
    }
  }

  console.log('='.repeat(72));
  console.log('  DROID PART REGISTRY SSOT GUARD');
  console.log('='.repeat(72));
  console.log(`\nCanonical id sample size: ${canonicalIds.size}. Allowlisted files: ${ALLOWLIST.size}.`);
  console.log(`Scanned ${files.length} script file(s).\n`);

  if (violations.length === 0) {
    console.log('No file outside the canonical registry / documented compatibility facades defines an independent droid-part rule table.');
    console.log('='.repeat(72));
    process.exit(0);
  }

  console.log(`Found ${violations.length} file(s) that look like a competing droid-part rule table (>= ${MIN_MATCHING_KEYS} canonical ids used as object keys):\n`);
  for (const violation of violations) {
    console.log(`  ${violation.file}`);
    console.log(`    matched ids: ${violation.matches.slice(0, 10).join(', ')}${violation.matches.length > 10 ? ', …' : ''}`);
  }
  console.log('\nIf this file legitimately needs to reference several canonical droid-part ids,');
  console.log('either consume them from scripts/data/droid-part-schema.js (getDroidPartDefinition /');
  console.log('getAllDroidPartDefinitions) instead of redefining their rules, or — if it is a genuine,');
  console.log('reviewed compatibility facade like the ones already listed — add it to ALLOWLIST above');
  console.log('with a comment explaining why it is not a fourth authority.');
  console.log('='.repeat(72));

  process.exit(STRICT ? 1 : 0);
}

main();
