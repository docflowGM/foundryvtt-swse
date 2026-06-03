// ============================================
// FILE: scripts/dev/prerequisite-identity-audit.js
// Prerequisite Identity Audit — Phase 5 dev utility
// ============================================
//
// A STANDALONE diagnostic that audits prerequisite data for identity gaps.
// Run manually — never imported into live startup paths.
//
// Usage (browser console or test harness):
//   import { runPrerequisiteIdentityAudit } from '.../prerequisite-identity-audit.js';
//   const report = runPrerequisiteIdentityAudit();
//   console.log(report.summary);
//
// Reports:
//   - Prestige class entries missing requirements arrays
//   - requirements entries with ambiguous/unresolved types
//   - Scoped feat requirements missing choice identity
//   - Talent tree entries not resolvable through TalentTreeDB or metadata
//   - Force Sensitive confused with Force Training
//   - Dark Side / DSP ambiguous entries
//   - Unknown/table-state prerequisites
//   - Class prerequisites that can't resolve to a class key
//   - Any prestige class missing structured identity for every required prereq type
//
// Does NOT modify any data. Does NOT run on startup.
// ============================================

import { PRESTIGE_PREREQUISITES } from "/systems/foundryvtt-swse/scripts/data/prestige-prerequisites.js";
import { FEAT_PREREQUISITE_AUTHORITY } from "/systems/foundryvtt-swse/scripts/data/authority/feat-prerequisite-authority.js";
import { TALENT_TREE_METADATA, getTalentTreeMetadata } from "/systems/foundryvtt-swse/scripts/data/talent-tree-metadata.js";
import { TalentTreeDB } from "/systems/foundryvtt-swse/scripts/data/talent-tree-db.js";
import { normalizePrerequisites } from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/prerequisite-normalizer.js";
import { normalizeAuthorityKey } from "/systems/foundryvtt-swse/scripts/data/authority/authority-key-normalizer.js";

// ── Internal helpers ─────────────────────────────────────────────

function looseKey(v) {
  return String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Check if a feat name is a scoped choice family. */
const SCOPED_BASES = new Set([
  'skill focus', 'weapon focus', 'greater weapon focus',
  'weapon specialization', 'greater weapon specialization', 'weapon proficiency',
  'double attack', 'triple attack', 'exotic weapon proficiency',
]);

function isScopedFeatBase(name) {
  return SCOPED_BASES.has(looseKey(name));
}

function extractBase(name) {
  const idx = String(name).indexOf('(');
  return idx > 0 ? String(name).slice(0, idx).trim() : String(name).trim();
}

function hasChoice(name) {
  return /\(/.test(name);
}

// ── Audit sections ────────────────────────────────────────────────

/**
 * Audit prestige prerequisites for identity gaps.
 */
function auditPrestigePrerequisites() {
  const issues = [];
  const stats = { total: 0, hasRequirements: 0, missingRequirements: 0, unresolvedCount: 0 };

  for (const [className, entry] of Object.entries(PRESTIGE_PREREQUISITES)) {
    stats.total++;

    // Check for requirements array
    if (!entry.requirements || !Array.isArray(entry.requirements) || entry.requirements.length === 0) {
      stats.missingRequirements++;
      issues.push({
        severity: 'warning',
        className,
        type: 'missing_requirements',
        message: `${className}: no requirements array — normalizer will fall back to legacy string parsing`,
      });
      continue;
    }

    stats.hasRequirements++;

    // Audit each requirement
    for (const req of entry.requirements) {
      const reqIssues = auditRequirement(req, className);
      issues.push(...reqIssues);
      if (reqIssues.some(r => r.severity === 'error')) stats.unresolvedCount++;
    }
  }

  return { issues, stats };
}

/**
 * Audit a single requirement record.
 */
function auditRequirement(req, context) {
  const issues = [];
  if (!req || !req.type) {
    issues.push({ severity: 'error', context, type: 'missing_type', message: `${context}: requirement missing type: ${JSON.stringify(req)}` });
    return issues;
  }

  switch (req.type) {
    case 'feat': {
      const name = req.name || '';
      const base = extractBase(name);
      if (isScopedFeatBase(base) && !req.choice) {
        issues.push({
          severity: 'warning', context,
          type: 'scoped_feat_missing_choice',
          message: `${context}: feat "${name}" is a scoped family but has no choice identity — Skill Focus (Stealth) vs (Mechanics) won't be distinguished`,
        });
      }
      if (!req.key) {
        issues.push({
          severity: 'info', context,
          type: 'feat_missing_key',
          message: `${context}: feat "${name}" has no key — will fall back to name-based lookup`,
        });
      }
      // Warn if Force Training is being used as a force_sensitive proxy
      if (looseKey(name) === 'force training') {
        issues.push({
          severity: 'info', context,
          type: 'force_training_as_feat',
          message: `${context}: "Force Training" is a feat prerequisite — distinct from force_sensitive`,
        });
      }
      break;
    }

    case 'force_sensitive': {
      // Good — explicit type, no issues
      break;
    }

    case 'talent_count': {
      if (!req.trees || req.trees.length === 0) {
        if (!req.count) {
          issues.push({ severity: 'warning', context, type: 'talent_count_no_trees', message: `${context}: talent_count has no trees and no count` });
        }
        break;
      }
      for (const tree of req.trees) {
        const treeName = tree.name || tree.key || '';
        const meta = getTalentTreeMetadata(tree.key || treeName);
        if (!meta) {
          // Check runtime TalentTreeDB
          const rtTree = TalentTreeDB.byName?.(treeName) || TalentTreeDB.get?.(tree.key || '');
          if (!rtTree) {
            issues.push({
              severity: 'warning', context,
              type: 'talent_tree_unresolved',
              message: `${context}: talent tree "${treeName}" not found in TALENT_TREE_METADATA or TalentTreeDB — tree key may be wrong`,
            });
          }
        }
        if (!tree.sourceId && !meta?.sourceId) {
          issues.push({
            severity: 'info', context,
            type: 'talent_tree_missing_sourceid',
            message: `${context}: talent tree "${treeName}" has no sourceId — resolution depends on name matching`,
          });
        }
      }
      break;
    }

    case 'talent': {
      if (!req.key && !req.name) {
        issues.push({ severity: 'error', context, type: 'talent_missing_identity', message: `${context}: talent requirement has no key or name` });
      }
      break;
    }

    case 'skill': {
      if (!req.key) {
        issues.push({ severity: 'info', context, type: 'skill_missing_key', message: `${context}: skill "${req.name}" has no key` });
      }
      break;
    }

    case 'dark_side':
    case 'dark_side_score': {
      if (req.min === undefined && req.minimum === undefined) {
        issues.push({ severity: 'warning', context, type: 'dark_side_no_minimum', message: `${context}: dark_side requirement has no min value` });
      }
      break;
    }

    case 'unknown':
    case 'table_state': {
      issues.push({
        severity: 'info', context,
        type: 'unresolved_prerequisite',
        message: `${context}: unresolved prerequisite "${req.raw || req.key || 'unknown'}" (${req.type}) — will appear as advisory`,
      });
      break;
    }

    case 'droid_systems': {
      issues.push({
        severity: 'info', context,
        type: 'droid_systems_advisory',
        message: `${context}: droid_systems requirement "${(req.systems || []).join(', ')}" is not auto-evaluated — will appear as advisory`,
      });
      break;
    }

    case 'or': {
      for (const cond of req.conditions || []) {
        const subIssues = auditRequirement(cond, `${context} [or]`);
        issues.push(...subIssues);
      }
      break;
    }
  }

  return issues;
}

/**
 * Audit feat authority for isScopedChoice completeness.
 */
function auditFeatAuthority() {
  const issues = [];
  const scoped = [];
  const nonScoped = [];

  for (const [key, entry] of Object.entries(FEAT_PREREQUISITE_AUTHORITY)) {
    if (entry.isScopedChoice) {
      scoped.push({ key, name: entry.name, choiceKind: entry.choiceKind });
      if (!entry.choiceKind) {
        issues.push({
          severity: 'warning', context: 'feat-authority',
          type: 'scoped_feat_missing_choicekind',
          message: `feat_authority[${key}]: isScopedChoice=true but no choiceKind defined`,
        });
      }
    }
    if (looseKey(entry.name).includes('force sensitive') || looseKey(entry.name).includes('force sensitivity')) {
      if (!entry.isForceSensitive) {
        issues.push({
          severity: 'info', context: 'feat-authority',
          type: 'force_sensitive_missing_flag',
          message: `feat_authority[${key}]: "${entry.name}" appears to be Force Sensitive but lacks isForceSensitive: true`,
        });
      }
    }
  }

  return { issues, stats: { scopedFamilies: scoped.length, families: scoped } };
}

/**
 * Audit talent tree metadata for completeness.
 */
function auditTalentTreeMetadata() {
  const issues = [];
  let missingSourceId = 0;

  for (const meta of Object.values(TALENT_TREE_METADATA)) {
    if (!meta.sourceId) {
      missingSourceId++;
      issues.push({
        severity: 'info', context: 'talent-tree-metadata',
        type: 'tree_missing_sourceid',
        message: `TalentTreeMetadata["${meta.key}"]: no sourceId — runtime resolution depends on TalentTreeDB name match`,
      });
    }
    if (!meta.aliases || meta.aliases.length === 0) {
      issues.push({
        severity: 'info', context: 'talent-tree-metadata',
        type: 'tree_missing_aliases',
        message: `TalentTreeMetadata["${meta.key}"]: no aliases — "Awareness Talent Tree" won't resolve to this key`,
      });
    }
  }

  return { issues, stats: { total: Object.keys(TALENT_TREE_METADATA).length, missingSourceId } };
}

/**
 * Audit normalizer output for prestige prerequisites.
 * Runs normalizePrerequisites on each prestige class's requirements array
 * and checks the output for unresolved/advisory records.
 */
function auditNormalizerOutput() {
  const issues = [];
  let totalNormalized = 0;
  let totalUnresolved = 0;

  for (const [className, entry] of Object.entries(PRESTIGE_PREREQUISITES)) {
    if (!entry.requirements) continue;

    try {
      const records = normalizePrerequisites(entry.requirements, { source: `prestige:${className}` });
      totalNormalized += records.length;

      for (const rec of records) {
        if (rec.type === 'unknown' || rec.type === 'table_state') {
          totalUnresolved++;
          issues.push({
            severity: 'info', context: className,
            type: 'normalizer_unresolved',
            message: `${className}: normalizer produced unresolved record: "${rec.raw || rec.key || rec.type}"`,
          });
        }
      }
    } catch (e) {
      issues.push({
        severity: 'error', context: className,
        type: 'normalizer_error',
        message: `${className}: normalizer threw an error: ${e.message}`,
      });
    }
  }

  return { issues, stats: { totalNormalized, totalUnresolved } };
}

// ── Main entry point ─────────────────────────────────────────────

/**
 * Run the full prerequisite identity audit.
 *
 * @param {{ verbose?: boolean }} [options={}]
 * @returns {{ summary: Object, issues: Object[], byClass: Object, bySeverity: Object }}
 */
export function runPrerequisiteIdentityAudit(options = {}) {
  const verbose = options.verbose ?? false;
  const startTime = Date.now();

  const prestAnResult = auditPrestigePrerequisites();
  const featAuthResult = auditFeatAuthority();
  const treeMetaResult = auditTalentTreeMetadata();
  const normResult = auditNormalizerOutput();

  const allIssues = [
    ...prestAnResult.issues,
    ...featAuthResult.issues,
    ...treeMetaResult.issues,
    ...normResult.issues,
  ];

  // Aggregate by severity
  const bySeverity = { error: [], warning: [], info: [] };
  for (const issue of allIssues) {
    const bucket = bySeverity[issue.severity] || bySeverity.info;
    bucket.push(issue);
  }

  // Aggregate by class
  const byClass = {};
  for (const issue of allIssues) {
    if (!issue.context) continue;
    if (!byClass[issue.context]) byClass[issue.context] = [];
    byClass[issue.context].push(issue);
  }

  const summary = {
    elapsed: Date.now() - startTime,
    totalIssues: allIssues.length,
    errors: bySeverity.error.length,
    warnings: bySeverity.warning.length,
    infos: bySeverity.info.length,
    prestige: {
      total: prestAnResult.stats.total,
      hasRequirements: prestAnResult.stats.hasRequirements,
      missingRequirements: prestAnResult.stats.missingRequirements,
    },
    featAuthority: {
      scopedFamilies: featAuthResult.stats.scopedFamilies,
    },
    talentTreeMetadata: {
      total: treeMetaResult.stats.total,
      missingSourceId: treeMetaResult.stats.missingSourceId,
    },
    normalizer: {
      totalRecords: normResult.stats.totalNormalized,
      unresolved: normResult.stats.totalUnresolved,
    },
  };

  if (verbose) {
    console.group('[PREREQ-AUDIT] Prerequisite Identity Audit');
    console.log('Summary:', summary);
    if (bySeverity.error.length) {
      console.error('[ERRORS]');
      for (const e of bySeverity.error) console.error(' •', e.message);
    }
    if (bySeverity.warning.length) {
      console.warn('[WARNINGS]');
      for (const w of bySeverity.warning) console.warn(' •', w.message);
    }
    if (verbose && bySeverity.info.length) {
      console.info('[INFO]');
      for (const i of bySeverity.info) console.info(' •', i.message);
    }
    console.groupEnd();
  }

  return { summary, issues: allIssues, byClass, bySeverity };
}

/**
 * Quick check: run the audit and return a one-line status string.
 * Useful for console quick-checks.
 *
 * @returns {string}
 */
export function quickPrerequisiteAudit() {
  const result = runPrerequisiteIdentityAudit({ verbose: false });
  const { summary } = result;
  const status = summary.errors > 0 ? '❌ ERRORS' : summary.warnings > 0 ? '⚠️  WARNINGS' : '✓ OK';
  return `[PREREQ-AUDIT] ${status} — ${summary.prestige.hasRequirements}/${summary.prestige.total} prestige classes have requirements, ` +
    `${summary.errors} errors, ${summary.warnings} warnings, ${summary.infos} info items`;
}
