import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 9 (feat source/prerequisite integrity task): wires two existing,
// previously-manual-only dev audits into the automated test suite so they
// actually run as a regression guard instead of requiring someone to run
// them by hand in a browser console.
//
// IMPORTANT — what this does and does not prove:
// - scripts/dev/prerequisite-authority-audit.js's AUTHORITY_BOUNDARY_STATE
//   is a hand-maintained static ledger, not a live source scanner. It
//   catches growth in already-known bypass categories; it does NOT
//   automatically discover a brand-new direct PrerequisiteChecker call
//   nobody added an entry for. A repo-wide grep performed separately during
//   this task (see docs/audits/feat-integrity-current-state.md) found
//   AbilityEngine.evaluateAcquisition is the real call site for every
//   chargen/level-up/sheet-drop/finalization/integrity-sweep legality check
//   found (~30 sites) — this test guards against regression of the known
//   ledger, it is not a substitute for that grep.
// - scripts/dev/prerequisite-identity-audit.js audits prerequisite DATA
//   identity (ambiguous requirement types, scoped-feat gaps, Force
//   Sensitive/Training confusion, prestige-class requirement completeness)
//   against the real canonical catalog + FEAT_PREREQUISITE_AUTHORITY. It
//   does not evaluate legality.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { verifyAuthorityBoundaryRegression } = await import('/systems/foundryvtt-swse/scripts/dev/prerequisite-authority-audit.js');

const boundaryResult = verifyAuthorityBoundaryRegression();
assert.equal(boundaryResult.passed, true, boundaryResult.message);

const { runPrerequisiteIdentityAudit } = await import('/systems/foundryvtt-swse/scripts/dev/prerequisite-identity-audit.js');

const identityReport = runPrerequisiteIdentityAudit();
assert.equal(
  identityReport.summary.errors,
  0,
  `prerequisite-identity-audit found ${identityReport.summary.errors} hard error(s): ${JSON.stringify(identityReport.issues.filter((i) => i.severity === 'error'))}`
);

console.log(`OK: ${boundaryResult.message}`);
console.log(`OK: prerequisite-identity-audit — ${identityReport.summary.totalIssues} issue(s), 0 errors, ${identityReport.summary.warnings} warning(s) (${identityReport.summary.infos} advisory info-level).`);
