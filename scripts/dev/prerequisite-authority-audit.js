// ============================================
// FILE: scripts/dev/prerequisite-authority-audit.js
// Prerequisite Authority Boundary Audit — Phase 6 dev utility
// ============================================
//
// Standalone diagnostic that identifies code calling PrerequisiteChecker
// directly instead of going through AbilityEngine, and flags other
// authority boundary violations.
//
// This is a STATIC analysis helper — it documents known patterns and
// reports where bypasses were found at the time Phase 6 was written.
// It does NOT scan live code at runtime.
//
// Run manually in browser console or test harness:
//   import { runAuthorityAudit } from '.../prerequisite-authority-audit.js';
//   const report = runAuthorityAudit();
//   console.log(report);
//
// Do NOT import this into live startup paths.
// ============================================

/**
 * Known authority boundary state as of Phase 6.
 *
 * Each entry describes a caller, what it calls, and the disposition:
 *   'canonical'  — already uses the correct door (AbilityEngine or PrerequisiteChecker)
 *   'deferred'   — bypass exists but is Phase 4 territory, intentionally deferred
 *   'advisory'   — supplemental check that doesn't replace the canonical path
 */
export const AUTHORITY_BOUNDARY_STATE = [
  // ── Correct callers (Phase 6 verified) ──────────────────────────
  {
    file: 'scripts/apps/chargen/chargen-feats-talents.js',
    caller: 'chargen-feats-talents._onSelectFeat',
    calls: 'AbilityEngine.evaluateAcquisition',
    disposition: 'canonical',
    note: 'Primary legality gate for feat selection during chargen',
  },
  {
    file: 'scripts/apps/chargen/chargen-feats-talents.js',
    caller: 'chargen-feats-talents._onSelectTalent',
    calls: 'AbilityEngine.evaluateAcquisition',
    disposition: 'canonical',
    note: 'Primary legality gate for talent selection during chargen',
  },
  {
    file: 'scripts/apps/progression-framework/shell/mutation-coordinator.js',
    caller: 'MutationCoordinator._validateProjection',
    calls: 'AbilityEngine.evaluateAcquisition',
    disposition: 'canonical',
    note: 'Validates feat legality against projected character state before applying mutations',
  },
  {
    file: 'scripts/governance/integrity/prerequisite-integrity-checker.js',
    caller: 'PrerequisiteIntegrityChecker._evaluateAllItems',
    calls: 'AbilityEngine.evaluateAcquisition (via AbilityEngine.evaluateAcquisition)',
    disposition: 'canonical',
    note: 'Post-mutation integrity sweep uses AbilityEngine correctly',
  },
  {
    file: 'scripts/engine/abilities/AbilityEngine.js',
    caller: 'AbilityEngine.evaluateAcquisition',
    calls: 'PrerequisiteChecker.checkFeatPrerequisites / checkTalentPrerequisites / checkPrestigeClassPrerequisites',
    disposition: 'canonical',
    note: 'AbilityEngine is the public door; PrerequisiteChecker is the internal judge',
  },
  {
    file: 'scripts/engine/abilities/AbilityEngine.js',
    caller: 'AbilityEngine.evaluatePrestigeClassAcquisition',
    calls: 'PrerequisiteChecker.checkPrestigeClassPrerequisites',
    disposition: 'canonical',
    note: 'Prestige class acquisition uses correct path',
  },

  // ── Advisory / supplemental (Phase 6 reviewed, not blocking) ────
  {
    file: 'scripts/apps/chargen/chargen-feats-talents.js',
    caller: 'chargen-feats-talents._onSelectFeat (pre-check)',
    calls: 'feat.system?.prerequisite manual string read',
    disposition: 'advisory',
    note: 'Manual Force+droid string read before AbilityEngine call — supplemental only, does not replace canonical path. Remove in future cleanup.',
  },
  {
    file: 'scripts/apps/chargen/chargen-feats-talents.js',
    caller: 'chargen-feats-talents._onSelectTalent (pre-check)',
    calls: 'tal.system?.prerequisites manual string read',
    disposition: 'advisory',
    note: 'Supplemental pre-check, does not replace AbilityEngine.evaluateAcquisition call. Low priority cleanup.',
  },

  // ── Deferred to Phase 4 ──────────────────────────────────────────
  {
    file: 'scripts/engine/suggestion/ClassSuggestionEngine.js',
    caller: 'ClassSuggestionEngine._checkPrerequisites',
    calls: 'Internal implementation (not AbilityEngine)',
    disposition: 'deferred',
    phase: 4,
    note: 'ClassSuggestionEngine has its own _checkPrerequisites for scoring. Migrating to AbilityEngine belongs to Phase 4 suggestion-engine refactoring. Not safe to change in Phase 6.',
  },
  {
    file: 'scripts/engine/suggestion/CommunityMetaSynergies.js',
    caller: 'synergy trigger callbacks',
    calls: 'state.hasFeat() / state.hasTalent() / state.hasSkill()',
    disposition: 'deferred',
    phase: 4,
    note: 'These are build-coherence OWNERSHIP checks, not prerequisite legality checks. Correct by design — they check "does actor already have X" for scoring purposes. Not bypasses.',
  },
];

// ── Integrity checks ─────────────────────────────────────────────

/**
 * Run the authority audit and return a summary report.
 *
 * @param {{ verbose?: boolean }} [options={}]
 * @returns {{ summary: Object, canonical: Object[], deferred: Object[], advisory: Object[] }}
 */
export function runAuthorityAudit(options = {}) {
  const verbose = options.verbose ?? false;

  const canonical = AUTHORITY_BOUNDARY_STATE.filter(e => e.disposition === 'canonical');
  const advisory = AUTHORITY_BOUNDARY_STATE.filter(e => e.disposition === 'advisory');
  const deferred = AUTHORITY_BOUNDARY_STATE.filter(e => e.disposition === 'deferred');

  const summary = {
    total: AUTHORITY_BOUNDARY_STATE.length,
    canonical: canonical.length,
    advisory: advisory.length,
    deferredToPhase4: deferred.length,
    status: deferred.length === 0 && advisory.length === 0 ? 'clean' :
            deferred.length > 0 ? 'has-phase4-bypasses' : 'has-advisory-items',
  };

  if (verbose) {
    console.group('[AUTHORITY-AUDIT] Prerequisite Authority Boundary Audit (Phase 6)');
    console.log('Summary:', summary);

    if (canonical.length) {
      console.group(`✓ Canonical callers (${canonical.length})`);
      for (const e of canonical) console.log(`  ${e.file}: ${e.note}`);
      console.groupEnd();
    }

    if (advisory.length) {
      console.group(`⚠ Advisory / supplemental (${advisory.length}) — low-priority cleanup`);
      for (const e of advisory) console.warn(`  ${e.file}: ${e.note}`);
      console.groupEnd();
    }

    if (deferred.length) {
      console.group(`⏳ Deferred to Phase 4 (${deferred.length})`);
      for (const e of deferred) console.info(`  ${e.file}: ${e.note}`);
      console.groupEnd();
    }

    console.groupEnd();
  }

  return { summary, canonical, advisory, deferred };
}

/**
 * Verify that the known bypass count has not grown.
 * Useful as a regression guard in test suites.
 *
 * @param {{ maxDeferred?: number, maxAdvisory?: number }} limits
 * @returns {{ passed: boolean, message: string }}
 */
export function verifyAuthorityBoundaryRegression(limits = {}) {
  const maxDeferred = limits.maxDeferred ?? 2;  // Known Phase 4 deferred items
  const maxAdvisory = limits.maxAdvisory ?? 2;  // Known supplemental pre-checks

  const result = runAuthorityAudit({ verbose: false });
  const deferredCount = result.deferred.length;
  const advisoryCount = result.advisory.length;

  if (deferredCount > maxDeferred) {
    return {
      passed: false,
      message: `[AUTHORITY-AUDIT] REGRESSION: ${deferredCount} deferred bypasses found, expected <= ${maxDeferred}. New bypasses were added without going through AbilityEngine.`,
    };
  }
  if (advisoryCount > maxAdvisory) {
    return {
      passed: false,
      message: `[AUTHORITY-AUDIT] REGRESSION: ${advisoryCount} advisory bypasses found, expected <= ${maxAdvisory}. Manual string reads were added.`,
    };
  }

  return {
    passed: true,
    message: `[AUTHORITY-AUDIT] OK — ${result.canonical.length} canonical callers, ${deferredCount} Phase 4 deferred, ${advisoryCount} advisory items`,
  };
}
