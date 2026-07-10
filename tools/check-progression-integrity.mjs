#!/usr/bin/env node

/**
 * check-progression-integrity.mjs — Static progression-runtime integrity audit
 *
 * PURPOSE
 * -------
 * Report-only static scan for the progression lifecycle (chargen / level-up /
 * multiclass / prestige / droid / nonheroic / follower / Force tracks). It is a
 * companion to check-architecture-boundaries.mjs and check-combat-math-ssot.mjs
 * and follows the same conventions: line/regex based, additive, no dependencies,
 * exit 0 by default. Pass --strict to exit non-zero when findings exist, and
 * --json to emit machine-readable output.
 *
 * WHAT IT FLAGS (by category)
 * ---------------------------
 *   progression-direct-mutation
 *       Progression code (scripts/apps/progression-framework/**, scripts/engine/
 *       progression/**) calling actor.update()/create|update|deleteEmbeddedDocuments()
 *       or item.update() directly instead of routing through the finalizer →
 *       ActorEngine seam. Progression must never mutate the actor outside
 *       ActorEngine.
 *
 *   draft-write-bypass
 *       Direct assignment to progressionSession.draftSelections.<key> (or
 *       [key]) outside progression-session.js. commitSelection() is the canonical
 *       write path (schema validation, coercion, dedupe, watchers, persistence
 *       hooks); direct writes skip all of that.
 *
 *   non-schema-selection-key
 *       A draft-write-bypass whose key is NOT one of the canonical
 *       ProgressionSession schema keys. These selections live under ad-hoc keys
 *       the finalizer/consumers must special-case, and they never pass schema
 *       validation. (Subset of draft-write-bypass, surfaced separately because it
 *       is the higher-risk shape.)
 *
 *   progression-registry-bypass
 *       Progression code importing a low-level content registry / data DB
 *       directly instead of going through ProgressionContentAuthority, the
 *       canonical read seam.
 *
 *   legacy-session-import
 *       Import of scripts/engine/progression/ProgressionSession.js — the
 *       superseded session class. The canonical session is
 *       scripts/apps/progression-framework/shell/progression-session.js.
 *
 *   step-missing-validation
 *       A file that directly `extends ProgressionStepPlugin` but defines neither
 *       validate() nor getBlockingIssues(). Steps that subclass another step
 *       (e.g. extends SummaryStep) are intentionally NOT flagged — they inherit.
 *
 * ENFORCEMENT
 * -----------
 * Report-only by default (exit 0 regardless of findings). --strict makes it exit
 * 1 when findings exist. There is no package.json / CI runner in this repo, so
 * the default mirrors the other tools/ scripts: a warning/report surface.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const STRICT = argv.includes('--strict');

// Directories that constitute the progression runtime surface.
const PROGRESSION_DIRS = [
  path.join(SCRIPTS, 'apps', 'progression-framework'),
  path.join(SCRIPTS, 'engine', 'progression'),
];

// Canonical ProgressionSession schema keys (see progression-session.js _buildSchema()).
const CANONICAL_SELECTION_KEYS = new Set([
  'species', 'class', 'background', 'attributes', 'skills', 'feats', 'talents',
  'languages', 'forcePowers', 'forceRegimens', 'forceTechniques', 'forceSecrets',
  'medicalSecrets', 'classSurveyDrafts', 'classSurveys', 'starshipManeuvers',
  'survey', 'prestigeSurvey', 'droid', 'pendingSpeciesContext',
  'pendingBackgroundContext', 'backgroundLedger', 'pendingEntitlements',
  'immediateChoices',
  // Follower (dependent participant) sub-schema — declared in ProgressionSession
  // _buildSchema() (Batch A / R2). Intentional fields, no longer non-schema.
  'followerSkills', 'skillChoices', 'followerLanguages', 'languageChoices',
  'followerBackground', 'backgroundChoice',
]);

// Files allowed to write draftSelections directly (the session owner).
const DRAFT_WRITE_ALLOW = [
  'scripts/apps/progression-framework/shell/progression-session.js',
];

// Known transitional draft writers — deliberate direct writes tracked by the audit
// (follower sub-schema whole-list replacement, template/preset bulk hydration, survey
// steps). Not yet routed through commitSelection but documented and understood. Anything
// NOT matching these is labelled "suspicious" so new bypasses stand out.
const DRAFT_WRITE_TRANSITIONAL = [
  /\/steps\/follower-steps\//,
  /\/steps\/base-class-survey-step\.js$/,
  /\/steps\/galactic-profile-step\.js$/,
  /\/steps\/class-step\.js$/,
  /\/progression\/template\/template-adapter\.js$/,
];
function classifyDraftWriter(relPath) {
  return DRAFT_WRITE_TRANSITIONAL.some((re) => re.test(relPath)) ? 'transitional' : 'suspicious';
}

// Direct-mutation regex (mirrors check-architecture-boundaries but scoped to progression).
const DIRECT_MUTATION =
  /\b(?:actor|item)\s*\.\s*(?:update|createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments)\s*\(/;
// Only flag actor.update / item.update when not obviously ActorEngine.updateActor etc.
const ACTOR_ENGINE_HINT = /ActorEngine|updateActor|applyMutationPlan|applyDelta|this\.apply\(/;

// draftSelections.<key> = ...   or   draftSelections['key'] = ...
const DRAFT_WRITE =
  /draftSelections\s*(?:\.\s*([A-Za-z0-9_]+)|\[\s*['"]([A-Za-z0-9_]+)['"]\s*\])\s*=(?!=)/;

// Low-level registries / data DBs that progression should reach via ProgressionContentAuthority.
const REGISTRY_IMPORT =
  /import[^;]*from\s*['"][^'"]*(?:scripts\/registries\/[a-z-]+registry|data\/(?:classes-db|talent-tree-db|talent-db|feat-catalog))[^'"]*['"]/i;

// Files exempt from registry-bypass: the ProgressionContentAuthority seam itself,
// and the progression-local registry/seam wrappers whose whole job is to adapt a
// root registry. Flagging these would just be flagging the seam we want callers to
// use. Kept narrow and documented so the category stays meaningful for step code.
const REGISTRY_BYPASS_ALLOW = [
  'scripts/engine/progression/content/progression-content-authority.js',
];
function isRegistrySeamFile(relPath) {
  const base = relPath.split('/').pop() || '';
  return /registry/i.test(base) || relPath.endsWith('/hooks/system-init-hooks.js');
}

const LEGACY_SESSION_IMPORT =
  /import[^;]*from\s*['"][^'"]*engine\/progression\/ProgressionSession(?:\.js)?['"]/;

const findings = [];
function record(category, file, lineNo, text, extra = {}) {
  findings.push({ category, file: rel(file), line: lineNo, text: text.trim().slice(0, 200), ...extra });
}
function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}
function inAllowlist(relPath, list) {
  return list.some((entry) => relPath === entry || relPath.endsWith(entry));
}
function isCommentOrString(line) {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
}

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    if (stat.isDirectory()) walk(full, out);
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

// Collect every progression file (dedup across overlapping roots).
const fileSet = new Set();
for (const dir of PROGRESSION_DIRS) walk(dir).forEach((f) => fileSet.add(f));
const files = [...fileSet];

for (const file of files) {
  const relPath = rel(file);
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const lines = src.split(/\r?\n/);

  // File-level checks (whole-source).
  const definesStepSubclass = /extends\s+ProgressionStepPlugin\b/.test(src) && !relPath.endsWith('-mixin.js');
  if (definesStepSubclass) {
    const hasValidate = /\bvalidate\s*\(/.test(src);
    const hasBlocking = /\bgetBlockingIssues\s*\(/.test(src);
    if (!hasValidate && !hasBlocking) {
      record('step-missing-validation', file, 1,
        'extends ProgressionStepPlugin but defines neither validate() nor getBlockingIssues()');
    }
  }

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    if (isCommentOrString(line)) return;

    if (DIRECT_MUTATION.test(line) && !ACTOR_ENGINE_HINT.test(line)) {
      record('progression-direct-mutation', file, lineNo, line);
    }

    const draftMatch = line.match(DRAFT_WRITE);
    if (draftMatch && !inAllowlist(relPath, DRAFT_WRITE_ALLOW)) {
      const key = draftMatch[1] || draftMatch[2] || '(dynamic)';
      record('draft-write-bypass', file, lineNo, line, { key, label: classifyDraftWriter(relPath) });
      if (key !== '(dynamic)' && !CANONICAL_SELECTION_KEYS.has(key)) {
        record('non-schema-selection-key', file, lineNo, line, { key });
      }
    }

    if (REGISTRY_IMPORT.test(line)
      && !inAllowlist(relPath, REGISTRY_BYPASS_ALLOW)
      && !isRegistrySeamFile(relPath)) {
      record('progression-registry-bypass', file, lineNo, line);
    }
    if (LEGACY_SESSION_IMPORT.test(line)) {
      record('legacy-session-import', file, lineNo, line);
    }
  });
}

const CATEGORY_INFO = {
  'progression-direct-mutation': 'Progression mutating actor/item outside the ActorEngine seam.',
  'draft-write-bypass': 'Direct draftSelections write that skips commitSelection() validation/hooks.',
  'non-schema-selection-key': 'draftSelections written under a key not in the canonical schema.',
  'progression-registry-bypass': 'Progression importing a low-level registry instead of ProgressionContentAuthority.',
  'legacy-session-import': 'Import of the superseded engine/progression/ProgressionSession.js.',
  'step-missing-validation': 'Direct ProgressionStepPlugin subclass with no validate()/getBlockingIssues().',
};

const byCategory = {};
for (const f of findings) (byCategory[f.category] ||= []).push(f);

if (AS_JSON) {
  console.log(JSON.stringify({
    scannedFiles: files.length,
    total: findings.length,
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, v.length])),
    findings,
  }, null, 2));
} else {
  console.log('\n' + '='.repeat(72));
  console.log('  SWSE PROGRESSION RUNTIME INTEGRITY AUDIT (report-only)');
  console.log('='.repeat(72));
  console.log(`  Scanned ${files.length} progression files`);
  if (findings.length === 0) {
    console.log('\n  ✅ No progression-integrity findings.\n');
  } else {
    for (const [category, items] of Object.entries(byCategory)) {
      console.log(`\n  ── ${category} (${items.length}) ──`);
      console.log(`     ${CATEGORY_INFO[category] || ''}`);
      for (const f of items.slice(0, 40)) {
        const tags = [f.key ? `key=${f.key}` : null, f.label ? `label=${f.label}` : null].filter(Boolean).join(' ');
        console.log(`     ${f.file}:${f.line}${tags ? `  [${tags}]` : ''}`);
        console.log(`        ${f.text}`);
      }
      if (items.length > 40) console.log(`     … and ${items.length - 40} more`);
    }
    console.log('\n' + '-'.repeat(72));
    console.log('  Summary by category:');
    for (const [category, items] of Object.entries(byCategory)) {
      console.log(`     ${category.padEnd(32)} ${items.length}`);
    }
    console.log(`     ${'TOTAL'.padEnd(32)} ${findings.length}`);
  }
  console.log('='.repeat(72) + '\n');
}

if (STRICT && findings.length > 0) process.exit(1);
process.exit(0);
