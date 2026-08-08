#!/usr/bin/env node

/**
 * audit-feat-prerequisite-inputs.mjs — Phase 7 prerequisite-INPUT audit.
 *
 * Question: does each canonical feat provide accurate, consistent
 * prerequisite data to the existing prerequisite architecture? This does
 * NOT re-implement or second-guess legality evaluation — it reuses the
 * real, live `normalizeFeatPrerequisites` from
 * scripts/engine/progression/prerequisites/prerequisite-normalizer.js
 * (loaded for real, under Node, via the existing
 * tests/helpers/foundry-shim harness) and the real
 * FEAT_PREREQUISITE_AUTHORITY map, and reports where the INPUTS disagree
 * or are incomplete. Legality itself is decided by AbilityEngine ->
 * PrerequisiteChecker at runtime, not by this script.
 *
 *   node tools/audit-feat-prerequisite-inputs.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const catalogPath = path.join(repoRoot, 'data', 'feat-catalog.json');
const outJsonPath = path.join(repoRoot, 'docs', 'audits', 'generated', 'feat-prerequisite-input-report.json');
const outMdPath = path.join(repoRoot, 'docs', 'audits', 'generated', 'feat-prerequisite-input-report.md');

registerFoundryPathLoader();
installFoundryShimGlobals();

const { normalizeFeatPrerequisites } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/prerequisite-normalizer.js');
const { FEAT_PREREQUISITE_AUTHORITY, normalizeAuthorityKey } = await import('/systems/foundryvtt-swse/scripts/data/authority/feat-prerequisite-authority.js');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogNamesLower = new Set(catalog.map((d) => String(d.name).toLowerCase()));
const speciesNamesLower = new Set(
  fs.readFileSync(path.join(repoRoot, 'packs', 'species.db'), 'utf8').trim().split(/\r?\n/)
    .filter(Boolean).map((line) => String(JSON.parse(line).name).toLowerCase())
);
const talentNamesLower = new Set(
  fs.readFileSync(path.join(repoRoot, 'packs', 'talents.db'), 'utf8').trim().split(/\r?\n/)
    .filter(Boolean).map((line) => String(JSON.parse(line).name).toLowerCase())
);

function collapseWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function authorityEntryFor(doc) {
  const slug = doc.system?.slug;
  return (slug && FEAT_PREREQUISITE_AUTHORITY[normalizeAuthorityKey(slug)])
    || FEAT_PREREQUISITE_AUTHORITY[normalizeAuthorityKey(doc.name)]
    || null;
}

const clean = [];
const warnings = [];
const errors = [];
const unresolved = [];

for (const doc of catalog) {
  const record = { name: doc.name, id: doc._id, issues: [] };
  const catalogText = collapseWhitespace(doc.system?.prerequisite || doc.system?.prerequisites || '');
  const authorityEntry = authorityEntryFor(doc);
  const authorityText = authorityEntry ? collapseWhitespace(authorityEntry.prerequisite) : null;

  // 1. Missing authority coverage.
  if (!authorityEntry) {
    record.issues.push({ severity: 'warning', kind: 'missing_authority_entry', detail: 'No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.' });
  } else if (authorityText !== null && catalogText.toLowerCase() !== 'none' && authorityText.toLowerCase() !== 'none') {
    // 2. Catalog text vs authority text disagreement (case-insensitive, whitespace-collapsed).
    if (catalogText.toLowerCase() !== authorityText.toLowerCase()) {
      record.issues.push({
        severity: 'warning',
        kind: 'catalog_authority_text_disagreement',
        detail: `catalog="${catalogText}" authority="${authorityText}"`,
      });
    }
  }

  // 3. Force Sensitivity vs Force Training confusion.
  if (authorityEntry) {
    const looksLikeForceTraining = /force training/i.test(doc.name) || /force training/i.test(catalogText);
    const looksLikeForceSensitivity = /force sensitivity/i.test(doc.name);
    if (looksLikeForceTraining && authorityEntry.isForceSensitive === true) {
      record.issues.push({ severity: 'error', kind: 'force_sensitivity_training_confusion', detail: 'Feat name/text reads as Force Training but authority marks isForceSensitive.' });
    }
    if (looksLikeForceSensitivity && authorityEntry.requiresForceSensitive === true) {
      record.issues.push({ severity: 'error', kind: 'force_sensitivity_training_confusion', detail: 'Force Sensitivity itself is flagged as requiring Force Sensitivity.' });
    }
  }

  // 4. Scoped-choice consistency: authority.isScopedChoice vs catalog choiceMeta.
  if (authorityEntry?.isScopedChoice) {
    if (!doc.system?.choiceMeta?.choiceKind) {
      record.issues.push({ severity: 'warning', kind: 'scoped_choice_missing_catalog_metadata', detail: 'Authority marks isScopedChoice but catalog system.choiceMeta.choiceKind is absent.' });
    }
  }

  // 5. Run the REAL normalizer against the REAL catalog record.
  let normalized;
  try {
    normalized = normalizeFeatPrerequisites(doc);
  } catch (error) {
    record.issues.push({ severity: 'error', kind: 'normalizer_threw', detail: error.message });
  }
  if (normalized) {
    for (const clause of normalized.normalized ?? []) {
      if (clause?.type === 'unknown' || clause?.unresolved) {
        record.issues.push({ severity: 'warning', kind: 'unresolved_normalization', detail: JSON.stringify(clause).slice(0, 200) });
      }
      // 6. Prerequisite clauses the normalizer typed as "feat" but whose
      // referenced name doesn't resolve to a real catalog feat. This is a
      // normalizer-INPUT finding, not proof of a live legality bug — see
      // the report header: normalizeFeatPrerequisites is not the runtime
      // legality path (prerequisite-checker.js has its own independent
      // parser), so these findings describe input-data/normalizer-fallback
      // quality, not confirmed chargen breakage.
      if (clause?.type === 'feat' && clause?.name) {
        const ref = String(clause.name).toLowerCase();
        const refStripped = ref.replace(/\s+feat$/, '');
        if (catalogNamesLower.has(ref)) {
          // Exact match (case-insensitive) — fine, no issue.
        } else if (catalogNamesLower.has(refStripped)) {
          record.issues.push({ severity: 'warning', kind: 'feat_reference_has_spurious_suffix', detail: `Prerequisite text references "${clause.name}" but the real catalog feat name is "${refStripped}" — the trailing "Feat" word breaks exact-name matching.` });
        } else if (speciesNamesLower.has(ref)) {
          record.issues.push({ severity: 'warning', kind: 'species_prerequisite_misclassified_as_feat', detail: `"${clause.name}" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".` });
        } else if (talentNamesLower.has(ref)) {
          record.issues.push({ severity: 'warning', kind: 'talent_prerequisite_misclassified_as_feat', detail: `"${clause.name}" is a real talent (packs/talents.db), not a feat, but the normalizer's fallback string parser typed this clause as type:"feat".` });
        } else {
          record.issues.push({ severity: 'warning', kind: 'special_clause_misclassified_as_feat', detail: `"${clause.name}" does not match any catalog feat, species, or talent name. Likely a freeform/special prerequisite clause (e.g. "Cannot be a Droid", GM approval) that the normalizer's fallback string parser typed as type:"feat" instead of a special/unresolved type.` });
        }
      }
    }
  }

  const worst = record.issues.reduce((acc, issue) => {
    if (issue.severity === 'error') return 'error';
    if (issue.severity === 'warning' && acc !== 'error') return 'warning';
    return acc;
  }, 'clean');

  if (worst === 'clean') clean.push(record);
  else if (worst === 'warning') warnings.push(record);
  else errors.push(record);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: 'Prerequisite INPUT integrity for the canonical feat catalog: does each feat supply data the existing prerequisite architecture (FEAT_PREREQUISITE_AUTHORITY + prerequisite-normalizer.js) can consume consistently? Does not evaluate or decide legality. IMPORTANT: normalizeFeatPrerequisites (progression/prerequisites/prerequisite-normalizer.js) is NOT the runtime legality path for feat acquisition — AbilityEngine.evaluateAcquisition calls PrerequisiteChecker.checkFeatPrerequisites (scripts/data/prerequisite-checker.js), which has its own independent legacy-string parser and was not exercised by this script. Findings here describe normalizer-INPUT/fallback-classification quality on a real but currently orphaned pipeline, not confirmed live chargen breakage. See docs/audits/feat-integrity-current-state.md.',
  totals: { catalogDocCount: catalog.length, clean: clean.length, warnings: warnings.length, errors: errors.length },
  clean: clean.map((r) => r.name),
  warnings,
  errors,
};

fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
fs.writeFileSync(outJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [];
lines.push('# Feat Prerequisite Input Report');
lines.push('');
lines.push(`Generated: ${report.generatedAt}`);
lines.push('');
lines.push('This audits prerequisite **inputs** (catalog text, FEAT_PREREQUISITE_AUTHORITY text, choice metadata) against the real `normalizeFeatPrerequisites` from `scripts/engine/progression/prerequisites/prerequisite-normalizer.js`, loaded and executed for real under Node via `tests/helpers/foundry-shim`. It does not evaluate legality — see docs/audits/feat-integrity-current-state.md for why `prerequisite-checker.js`, not this normalizer, is the live legality path.');
lines.push('');
lines.push('## Totals');
lines.push('');
lines.push(`- Catalog feats audited: ${report.totals.catalogDocCount}`);
lines.push(`- Clean: ${report.totals.clean}`);
lines.push(`- Warnings: ${report.totals.warnings}`);
lines.push(`- Hard errors: ${report.totals.errors}`);
lines.push('');
lines.push('## Hard errors');
lines.push('');
if (errors.length) {
  for (const r of errors) {
    lines.push(`### ${r.name}`);
    for (const issue of r.issues) lines.push(`- **${issue.kind}** (${issue.severity}): ${issue.detail}`);
  }
} else {
  lines.push('_None._');
}
lines.push('');
lines.push('## Warnings (sample of first 40)');
lines.push('');
if (warnings.length) {
  for (const r of warnings.slice(0, 40)) {
    lines.push(`### ${r.name}`);
    for (const issue of r.issues) lines.push(`- **${issue.kind}** (${issue.severity}): ${issue.detail}`);
  }
  if (warnings.length > 40) lines.push(`\n_... and ${warnings.length - 40} more warning-level feats; see the JSON report for the full list._`);
} else {
  lines.push('_None._');
}
lines.push('');

fs.writeFileSync(outMdPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Wrote ${path.relative(repoRoot, outJsonPath)} and ${path.relative(repoRoot, outMdPath)}.`);
console.log(`Feats: ${catalog.length}. Clean: ${clean.length}. Warnings: ${warnings.length}. Errors: ${errors.length}.`);
