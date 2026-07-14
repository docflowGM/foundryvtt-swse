#!/usr/bin/env node
/**
 * Conservative, allowlist-driven promotion tool for reviewed nonheroic Lane A
 * candidates (see tools/generate-nonheroic-damage-profile-candidates.mjs).
 *
 * This tool never bulk-promotes all Lane A rows. It only promotes the exact
 * candidates named in a required allowlist file, and only rows whose
 * candidate status is one of the two Lane A "safe" statuses:
 *   - safe-ordinary-weapon-candidate
 *   - safe-ordinary-weapon-with-delta
 *
 * It is dry-run by default. Pass --write to actually create/update the
 * canonical staging output file. Every run (dry-run or --write, success or
 * failure) produces a JSON + Markdown report under docs/audits/generated/.
 *
 * Reusable across promotion passes via CLI flags (all optional; each
 * defaults to the original pass-1 path, so no-flags invocation is unchanged):
 *   --allowlist <path>    (default: data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-1.json)
 *   --output <path>       (default: data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json)
 *   --report-json <path>  (default: docs/audits/generated/nonheroic-profile-promotion-pass-1.json)
 *   --report-md <path>    (default: docs/audits/generated/nonheroic-profile-promotion-pass-1.md)
 *   --max <n>            (default: 10; per-run promotion cap -- each pass's PR
 *                          description must state its intended cap explicitly)
 *

 * Fail-loud guarantees (see README/docs/audits/nonheroic-weapon-damage-bulk-
 * lane-a-pass-1.md for the human-facing writeup):
 *   - An allowlist entry that matches zero or more than one candidate aborts
 *     the entire run (report is still written; the target profile file is
 *     never touched).
 *   - A duplicate slug or duplicate actor/raw marker -- either within this
 *     run's batch or against records already present in the target output
 *     file -- aborts the entire run the same way.
 *   - A candidate that already matches an existing canonical profile record
 *     (by actor slug + rawIncludes marker, across every
 *     data/nonheroic/nonheroic-weapon-damage-profiles.*.json file) is not an
 *     error: it is skipped and reported as already-covered.
 *
 * This tool never mutates actor packs, compendium packs, or any existing
 * canonical profile file. It only ever writes to its own target file
 * (data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json
 * by default) and to its own report files. Every promoted record keeps
 * confidence "manualRequired" -- this tool never marks a row "verified".
 * The target file is intentionally NOT added to the hydrator's PROFILE_FILES
 * list (scripts/engine/import/nonheroic-damage-profile-hydrator.js); it is
 * staged canonical-shaped data awaiting page/source review, not live data.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');

// Minimal CLI overrides so additional promotion passes (pass-2, pass-3, ...)
// can reuse this same tool instead of forking it. Pass-1 filenames remain the
// defaults, so `node tools/promote-nonheroic-damage-profile-candidates.mjs`
// with no flags behaves exactly as it did before these flags existed.
function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}


const CANDIDATE_FILES = [
  'data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json',
  'data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json'
];
const PROFILE_DIR = 'data/nonheroic';
const PROFILE_PREFIX = 'nonheroic-weapon-damage-profiles.';
const ALLOWLIST_FILE = argValue('--allowlist', 'data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-1.json');
const TARGET_PROFILE_FILE = argValue('--output', 'data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json');
const OUTPUT_JSON = argValue('--report-json', 'docs/audits/generated/nonheroic-profile-promotion-pass-1.json');
const OUTPUT_MD = argValue('--report-md', 'docs/audits/generated/nonheroic-profile-promotion-pass-1.md');
// --max lets later passes raise the per-run promotion cap deliberately (each
// pass's PR must still say up front how many rows it promotes); pass-1's
// original hardcoded ceiling of 10 remains the default.
const MAX_PROMOTIONS_ARG = Number(argValue('--max', '10'));


const ALLOWED_STATUSES = new Set(['safe-ordinary-weapon-candidate', 'safe-ordinary-weapon-with-delta']);
// Documented for readers of this file; the two candidate staging files never
// actually contain these statuses (generate-nonheroic-damage-profile-
// candidates.mjs only ever writes the two ALLOWED_STATUSES into them), but
// the explicit check below is defense-in-depth in case that ever changes or
// an allowlist entry's sourceFile is repointed at a broader export.
const EXCLUDED_STATUSES = [
  'ordinary-weapon-special-mode',
  'area-autofire-grenade-special',
  'rider-or-condition',
  'formula-unclear',
  'natural-or-unarmed',
  'no-compendium-match',
  'ambiguous-compendium-match',
  'already-profiled'
];
const MAX_PROMOTIONS = Number.isFinite(MAX_PROMOTIONS_ARG) && MAX_PROMOTIONS_ARG > 0 ? MAX_PROMOTIONS_ARG : 10;

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}
function writeText(relPath, text) {
  fs.mkdirSync(path.dirname(path.join(ROOT, relPath)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, relPath), text);
}
function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}
function readJson(relPath) {
  return JSON.parse(readText(relPath));
}
function clean(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}
function slugify(v) {
  return clean(v).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const errors = [];
function recordError(message) {
  errors.push(message);
  console.error(`ERROR: ${message}`);
}

// ---------------------------------------------------------------------------
// Load inputs
// ---------------------------------------------------------------------------

function loadAllowlist() {
  if (!exists(ALLOWLIST_FILE)) {
    recordError(`Required allowlist file not found: ${ALLOWLIST_FILE}`);
    return null;
  }
  let doc;
  try {
    doc = readJson(ALLOWLIST_FILE);
  } catch (err) {
    recordError(`Allowlist file ${ALLOWLIST_FILE} is not valid JSON: ${err.message}`);
    return null;
  }
  if (!Array.isArray(doc.entries) || doc.entries.length === 0) {
    recordError(`Allowlist file ${ALLOWLIST_FILE} must have a non-empty "entries" array.`);
    return null;
  }
  if (doc.entries.length > MAX_PROMOTIONS) {
    recordError(`Allowlist has ${doc.entries.length} entries; this pass is capped at ${MAX_PROMOTIONS}. Split into additional passes instead of raising the cap here.`);
    return null;
  }
  return doc;
}

function loadCandidatePool() {
  const pool = [];
  for (const file of CANDIDATE_FILES) {
    if (!exists(file)) {
      recordError(`Expected candidate staging file not found: ${file}`);
      continue;
    }
    let doc;
    try {
      doc = readJson(file);
    } catch (err) {
      recordError(`Candidate staging file ${file} is not valid JSON: ${err.message}`);
      continue;
    }
    for (const record of doc.records || []) {
      pool.push({ sourceFile: file, record });
    }
  }
  return pool;
}

function profileFilePaths() {
  if (!exists(PROFILE_DIR)) return [];
  return fs.readdirSync(path.join(ROOT, PROFILE_DIR))
    .filter(f => f.startsWith(PROFILE_PREFIX) && f.endsWith('.json') && !f.endsWith('.schema.json'))
    .sort()
    .map(f => path.join(PROFILE_DIR, f));
}

function loadExistingProfileMatchers() {
  const matchers = [];
  for (const relPath of profileFilePaths()) {
    let data;
    try {
      data = readJson(relPath);
    } catch (err) {
      recordError(`Existing profile file ${relPath} is not valid JSON: ${err.message}`);
      continue;
    }
    for (const record of data.records || []) {
      const actorSlugs = (record.match?.actorSlugs || []).map(slugify).filter(Boolean);
      const rawIncludes = (record.match?.rawIncludes || []).map(v => clean(v).toLowerCase()).filter(Boolean);
      if (!actorSlugs.length || !rawIncludes.length) continue;
      matchers.push({ file: relPath, slug: record.slug, actorSlugs, rawIncludes });
    }
  }
  return matchers;
}

// ---------------------------------------------------------------------------
// Allowlist -> candidate matching
// ---------------------------------------------------------------------------

function describeCandidate({ sourceFile, record }) {
  const bonus = record.printedAttack?.text ?? '';
  const formula = record.formula?.printed ?? '';
  const suffix = record.suffix ? ` with ${record.suffix}` : '';
  return `${record.weapon.printedName} ${bonus} (${formula})${suffix} [${record.actor.name}, ${sourceFile}, ${record.status}]`;
}

function matchAllowlistEntry(entry, pool) {
  return pool.filter(({ sourceFile, record }) => {
    if (entry.sourceFile && sourceFile !== entry.sourceFile) return false;
    if (entry.status && record.status !== entry.status) return false;
    if (entry.actorSlug && !(record.actor?.slugs || []).includes(entry.actorSlug)) return false;
    if (entry.printedName && clean(record.weapon.printedName).toLowerCase() !== clean(entry.printedName).toLowerCase()) return false;
    if (entry.printedFormula && record.formula?.printed !== entry.printedFormula) return false;
    if (entry.attackBonusText && record.printedAttack?.text !== entry.attackBonusText) return false;
    if (entry.slug && record.slug !== entry.slug) return false;
    if (entry.rawText) {
      const bonus = record.printedAttack?.text ?? '';
      const formula = record.formula?.printed ?? '';
      const suffix = record.suffix ? ` with ${record.suffix}` : '';
      const approxRaw = `${record.weapon.printedName} ${bonus} (${formula})${suffix}`;
      if (clean(approxRaw).toLowerCase() !== clean(entry.rawText).toLowerCase()) return false;
    }
    return true;
  });
}

function findAlreadyProfiled(actorSlug, marker, matchers) {
  const normMarker = clean(marker).toLowerCase();
  return matchers.find(m => m.actorSlugs.includes(actorSlug) &&
    m.rawIncludes.some(r => normMarker.includes(r) || r.includes(normMarker)));
}

// ---------------------------------------------------------------------------
// Candidate -> canonical NH profile record
// ---------------------------------------------------------------------------

function nameTags(printedName) {
  return clean(printedName)
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
}

function buildComponents(record) {
  const w = record.weapon;
  const f = record.formula;
  const baseComponent = {
    key: 'base-weapon',
    label: w.printedName,
    formula: w.baseFormula,
    type: w.baseType,
    tags: ['base', w.baseType, ...nameTags(w.printedName)]
  };
  if (f.mode === 'base' || !f.delta) {
    return [baseComponent];
  }
  return [
    baseComponent,
    {
      key: 'printed-statblock-delta',
      label: 'Printed Statblock Delta',
      formula: f.delta,
      type: w.baseType,
      tags: ['printed', 'delta', w.baseType]
    }
  ];
}

function toCanonicalRecord({ sourceFile, record }) {
  const w = record.weapon;
  const f = record.formula;
  return {
    slug: record.slug,
    name: record.weapon.printedName,
    confidence: 'manualRequired',
    reviewRequired: true,
    source: {
      book: record.source?.book ?? 'Unknown / missing source',
      status: 'repo-raw-statblock-field; page review still required',
      page: null,
      evidence: [
        `Bulk-promoted from Lane A candidate "${record.slug}" (status ${record.status}) staged in ${sourceFile}.`,
        `Candidate originally generated from ${record.source?.generatedFrom ?? 'an actor pack raw statblock field'}.`
      ]
    },
    actor: {
      name: record.actor.name,
      slugs: [...record.actor.slugs]
    },
    match: {
      actorSlugs: [...record.match.actorSlugs],
      rawIncludes: [...record.match.rawIncludes]
    },
    weapon: {
      printedName: w.printedName,
      // Schema rowKind enum is melee/ranged/special/natural/unarmed -- there
      // is no literal "ordinary" value. Lane A promotion only ever handles
      // ordinary (non-natural/unarmed/special) rows, so "ordinary" here
      // means "use the row's real melee/ranged kind", not a new enum value
      // that would break nonheroic-weapon-damage-profiles.schema.json.
      rowKind: w.rowKind,
      uuid: w.uuid,
      baseSlug: w.baseSlug,
      basePack: w.basePack,
      baseFormula: w.baseFormula,
      baseType: w.baseType,
      baseFormulaPolicy: w.baseFormulaPolicy
    },
    formula: {
      mode: f.mode,
      printed: f.printed,
      delta: f.delta ?? null,
      deltaSource: 'generated-from-compendium-base-comparison',
      typeOverride: w.baseType,
      notes: ['Formula mode/delta were classified mechanically by comparing the printed statblock formula against the matched compendium base weapon; no sourcebook was read.']
    },
    printedAttack: {
      text: record.printedAttack?.text ?? null,
      bonus: record.printedAttack?.bonus ?? null,
      bonuses: record.printedAttack?.bonuses ?? [],
      source: 'printed-statblock',
      hydratePolicy: 'metadata-only'
    },
    delivery: 'weapon',
    attackShape: 'single-target',
    scale: 'character',
    primaryType: w.baseType,
    tags: ['nonheroic', 'weapon', ...nameTags(w.printedName), 'bulk-lane-a-pass-1', 'generated-candidate'],
    attack: {
      isArea: false,
      halfDamageOnMiss: false,
      noCriticalDouble: false,
      coverCanNegateMissDamage: false,
      attackRollMinimum: null,
      defense: 'reflex'
    },
    area: { shape: null, radius: null, size: null, originMode: null, targetPolicy: 'single' },
    components: buildComponents(record),
    riders: [],
    sourceRefs: [{
      book: record.source?.book ?? 'Unknown / missing source',
      page: null,
      note: `Bulk Lane A promotion pass 1, generated from ${sourceFile}; original row from ${record.source?.generatedFrom ?? 'an actor pack raw statblock field'}.`
    }],
    variants: [],
    notes: [
      'Bulk-promoted by tools/promote-nonheroic-damage-profile-candidates.mjs (pass 1) from an allowlisted Lane A candidate. confidence remains manualRequired: page/book attribution and full sourcebook review have not been performed.',
      'Not wired into scripts/engine/import/nonheroic-damage-profile-hydrator.js PROFILE_FILES; this file is staged canonical-shaped data awaiting review.'
    ]
  };
}

// ---------------------------------------------------------------------------
// Target profile file read/write
// ---------------------------------------------------------------------------

function loadTargetProfileDoc() {
  if (!exists(TARGET_PROFILE_FILE)) return null;
  try {
    return readJson(TARGET_PROFILE_FILE);
  } catch (err) {
    recordError(`Target profile file ${TARGET_PROFILE_FILE} already exists but is not valid JSON: ${err.message}`);
    return null;
  }
}

function newTargetProfileDoc() {
  return {
    $schema: './nonheroic-weapon-damage-profiles.schema.json',
    $schemaVersion: 2,
    schemaVersion: 2,
    profileKind: 'nonheroic-statblock-weapon-damage',
    sourceFamily: 'Bulk Lane A candidate promotion, pass 1 (allowlisted proof-of-concept batch)',
    canonPolicy: {
      authority: 'Records in this file are mechanically promoted from Lane A candidate generation (tools/generate-nonheroic-damage-profile-candidates.mjs) via an explicit, human-curated allowlist (tools/promote-nonheroic-damage-profile-candidates.mjs). They are NOT sourcebook-verified: confidence is manualRequired for every record in this file, and page/book attribution is still outstanding.',
      rowSemantics: 'Each record represents one printed statblock attack/action row with an exact single compendium weapon match and a mechanically-derived base/base-plus-delta/base-plus-dice formula relationship. weapon.uuid identifies the matched compendium base; formula.printed remains authoritative for hydration.',
      unmatchedRows: 'This file only ever contains rows that had an exact single compendium match; ambiguous, unmatched, special-mode, area/autofire/grenade, rider, and natural/unarmed rows are never written here.',
      riders: 'Not applicable to this batch: rows with rider/condition text are excluded from Lane A and never promoted by this tool.'
    },
    notes: [
      'This file is intentionally NOT included in scripts/engine/import/nonheroic-damage-profile-hydrator.js PROFILE_FILES. It is staged canonical-shaped data awaiting page/source review, not live runtime data.',
      'Generated and updated only by tools/promote-nonheroic-damage-profile-candidates.mjs --write, driven by data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-1.json. Do not hand-edit; re-run the tool with an updated allowlist instead.'
    ],
    records: []
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const allowlist = loadAllowlist();
  const pool = loadCandidatePool();
  const existingMatchers = loadExistingProfileMatchers();
  const existingTargetDoc = loadTargetProfileDoc();

  const perEntry = [];
  let aborted = errors.length > 0;

  if (allowlist && pool.length > 0) {
    const seenSlugsThisRun = new Set(existingTargetDoc ? (existingTargetDoc.records || []).map(r => r.slug) : []);
    const seenMarkersThisRun = new Set();
    if (existingTargetDoc) {
      for (const r of existingTargetDoc.records || []) {
        for (const actorSlug of r.match?.actorSlugs || []) {
          for (const marker of r.match?.rawIncludes || []) {
            seenMarkersThisRun.add(`${actorSlug}::${clean(marker).toLowerCase()}`);
          }
        }
      }
    }

    for (const entry of allowlist.entries) {
      const matches = matchAllowlistEntry(entry, pool);
      const entryLabel = JSON.stringify(entry);

      if (matches.length === 0) {
        recordError(`Allowlist entry matched 0 candidates: ${entryLabel}`);
        perEntry.push({ entry, status: 'error-no-match', detail: 'matched 0 candidates', candidateCount: 0 });
        aborted = true;
        continue;
      }
      if (matches.length > 1) {
        recordError(`Allowlist entry matched ${matches.length} candidates (must match exactly 1): ${entryLabel} -> ${matches.map(describeCandidate).join(' | ')}`);
        perEntry.push({ entry, status: 'error-ambiguous-match', detail: `matched ${matches.length} candidates`, candidateCount: matches.length });
        aborted = true;
        continue;
      }

      const candidate = matches[0];
      const { record } = candidate;

      if (!ALLOWED_STATUSES.has(record.status)) {
        recordError(`Allowlist entry resolved to a candidate with disallowed status "${record.status}" (must be one of ${[...ALLOWED_STATUSES].join(', ')}): ${entryLabel}`);
        perEntry.push({ entry, status: 'error-disallowed-status', detail: `disallowed status "${record.status}"`, candidateCount: 1 });
        aborted = true;
        continue;
      }

      const actorSlug = record.actor.slugs[0];
      const marker = record.match.rawIncludes[0];
      const already = findAlreadyProfiled(actorSlug, marker, existingMatchers);
      if (already) {
        perEntry.push({
          entry,
          status: 'skipped-already-covered',
          detail: `matches existing profile record "${already.slug}" in ${already.file}`,
          candidateSlug: record.slug,
          candidateDescription: describeCandidate(candidate)
        });
        continue;
      }

      const canonical = toCanonicalRecord(candidate);

      if (seenSlugsThisRun.has(canonical.slug)) {
        recordError(`Duplicate slug "${canonical.slug}" (already present in ${TARGET_PROFILE_FILE} or earlier in this batch): ${entryLabel}`);
        perEntry.push({ entry, status: 'error-duplicate-slug', detail: `duplicate slug "${canonical.slug}"`, candidateCount: 1 });
        aborted = true;
        continue;
      }
      const markerKeys = canonical.match.actorSlugs.flatMap(a => canonical.match.rawIncludes.map(m => `${a}::${clean(m).toLowerCase()}`));
      const dupMarker = markerKeys.find(k => seenMarkersThisRun.has(k));
      if (dupMarker) {
        recordError(`Duplicate actor/raw marker "${dupMarker}" (already present in ${TARGET_PROFILE_FILE} or earlier in this batch): ${entryLabel}`);
        perEntry.push({ entry, status: 'error-duplicate-marker', detail: `duplicate actor/raw marker "${dupMarker}"`, candidateCount: 1 });
        aborted = true;
        continue;
      }

      seenSlugsThisRun.add(canonical.slug);
      for (const k of markerKeys) seenMarkersThisRun.add(k);

      perEntry.push({
        entry,
        status: 'promoted',
        detail: `promoted as "${canonical.slug}"`,
        candidateSlug: record.slug,
        candidateDescription: describeCandidate(candidate),
        canonical
      });
    }
  }

  const toPromote = perEntry.filter(e => e.status === 'promoted').map(e => e.canonical);
  aborted = aborted || errors.length > 0;

  let writeOutcome = 'not-attempted';
  if (WRITE && !aborted) {
    if (toPromote.length === 0) {
      writeOutcome = 'no-new-records';
    } else if (toPromote.length > MAX_PROMOTIONS) {
      recordError(`Refusing to write: ${toPromote.length} records to promote exceeds MAX_PROMOTIONS (${MAX_PROMOTIONS}).`);
      writeOutcome = 'aborted';
      aborted = true;
    } else {
      const doc = existingTargetDoc ?? newTargetProfileDoc();
      doc.records = [...(doc.records || []), ...toPromote];
      const text = JSON.stringify(doc, null, 2) + '\n';
      JSON.parse(text); // must round-trip cleanly before touching disk
      writeText(TARGET_PROFILE_FILE, text);
      writeOutcome = existingTargetDoc ? 'appended' : 'created';
    }
  } else if (WRITE && aborted) {
    writeOutcome = 'aborted';
  } else if (!WRITE) {
    writeOutcome = 'dry-run';
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: WRITE ? 'write' : 'dry-run',
    ok: !aborted,
    aborted,
    allowlistFile: ALLOWLIST_FILE,
    targetProfileFile: TARGET_PROFILE_FILE,
    maxPromotions: MAX_PROMOTIONS,
    allowlistEntryCount: allowlist ? allowlist.entries.length : 0,
    candidatePoolSize: pool.length,
    existingProfileRecordCount: existingMatchers.length,
    excludedStatuses: EXCLUDED_STATUSES,
    counts: {
      promoted: perEntry.filter(e => e.status === 'promoted').length,
      skippedAlreadyCovered: perEntry.filter(e => e.status === 'skipped-already-covered').length,
      errors: perEntry.filter(e => String(e.status).startsWith('error-')).length
    },
    writeOutcome,
    errors: [...errors]
  };

  const reportResults = perEntry.map(e => ({
    entry: e.entry,
    status: e.status,
    detail: e.detail,
    candidateSlug: e.candidateSlug ?? null,
    candidateDescription: e.candidateDescription ?? null,
    promotedSlug: e.canonical ? e.canonical.slug : null
  }));

  writeText(OUTPUT_JSON, JSON.stringify({ summary, results: reportResults }, null, 2) + '\n');
  writeText(OUTPUT_MD, renderMarkdown(summary, reportResults));

  console.log(JSON.stringify(summary, null, 2));

  if (aborted) process.exitCode = 1;
}

function renderMarkdown(summary, results) {
  const lines = [];
  lines.push('# Nonheroic Profile Promotion -- Pass 1');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Mode: ${summary.mode}`);
  lines.push(`Result: ${summary.ok ? 'OK' : 'ABORTED -- target profile file NOT written'}`);
  lines.push('');
  lines.push('This is a conservative, allowlist-driven promotion of reviewed Lane A');
  lines.push('candidates into a staged canonical profile file. It never bulk-promotes');
  lines.push('all Lane A rows -- only the exact rows named in the allowlist file are');
  lines.push('eligible, and only if they resolve to exactly one candidate with an');
  lines.push('allowed status. All promoted records keep `confidence: "manualRequired"`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Allowlist file: \`${summary.allowlistFile}\` (${summary.allowlistEntryCount} entries, cap ${summary.maxPromotions})`);
  lines.push(`- Target profile file: \`${summary.targetProfileFile}\``);
  lines.push(`- Candidate pool size: ${summary.candidatePoolSize}`);
  lines.push(`- Existing profile records scanned for already-covered check: ${summary.existingProfileRecordCount}`);
  lines.push(`- Write outcome: ${summary.writeOutcome}`);
  lines.push(`- Promoted: ${summary.counts.promoted}`);
  lines.push(`- Skipped (already covered): ${summary.counts.skippedAlreadyCovered}`);
  lines.push(`- Errors: ${summary.counts.errors}`);
  lines.push('');
  if (summary.errors.length) {
    lines.push('## Errors');
    lines.push('');
    for (const e of summary.errors) lines.push(`- ${e}`);
    lines.push('');
  }
  lines.push('## Per-entry results');
  lines.push('');
  for (const r of results) {
    lines.push(`- **${r.status}** — ${r.candidateDescription ?? JSON.stringify(r.entry)} — ${r.detail}`);
  }
  lines.push('');
  lines.push('## Excluded statuses (never promoted by this tool)');
  lines.push('');
  for (const s of summary.excludedStatuses) lines.push(`- \`${s}\``);
  lines.push('');
  return lines.join('\n');
}

main();
