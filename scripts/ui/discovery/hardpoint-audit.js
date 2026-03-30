/**
 * Tooltip System Hardpoint Audit Utility
 *
 * DEVELOPER-ONLY DIAGNOSTIC TOOL
 *
 * Scans the rendered sheet for tooltip/breakdown hardpoints and reports:
 * - Which tooltip keys are present on the sheet
 * - Which keys are missing from the glossary
 * - Which glossary entries are unused by the current sheet
 * - Which breakdown targets lack providers
 * - Tier distribution of present hardpoints
 * - Breakdown coverage statistics
 *
 * Usage (developer console):
 * const audit = await auditTooltipHardpoints(document.body);
 * console.table(audit.summary);
 * console.log(audit.issues);
 *
 * This is a low-cost, reusable diagnostic for catching drift.
 * Safe to run repeatedly during maintenance.
 */

import { TooltipGlossary } from '/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-glossary.js';
import { TooltipRegistry } from '/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js';
import { ReferenceService } from '/systems/foundryvtt-swse/scripts/ui/discovery/reference-service.js';

/**
 * Audit tooltip/breakdown hardpoints on the given root element.
 * @param {HTMLElement} root - The element to scan (usually document.body or sheet root)
 * @returns {Object} Audit report with findings
 */
export async function auditTooltipHardpoints(root = document.body) {
  const report = {
    timestamp: new Date().toISOString(),
    sheetType: _detectSheetType(root),
    summary: {},
    findings: {
      presentKeys: [],
      missingFromGlossary: [],
      unusedGlossaryEntries: [],
      missingProviders: [],
      tierDistribution: {
        tier1: 0,
        tier2: 0,
        tier3: 0,
        unknown: 0
      },
      breakdown_coverage: {
        total: 0,
        with_breakdown: 0,
        coverage_pct: 0
      }
    },
    issues: []
  };

  // ========================================================================
  // PHASE 1: Scan DOM for tooltip keys
  // ========================================================================

  const tooltipElements = root.querySelectorAll('[data-swse-tooltip]');
  const tooltipKeys = new Set();

  tooltipElements.forEach(el => {
    const key = el.getAttribute('data-swse-tooltip');
    if (key) {
      tooltipKeys.add(key);
    }
  });

  report.findings.presentKeys = Array.from(tooltipKeys).sort();

  // ========================================================================
  // PHASE 2: Scan DOM for breakdown keys
  // ========================================================================

  const breakdownElements = root.querySelectorAll('[data-breakdown]');
  const breakdownKeys = new Set();

  breakdownElements.forEach(el => {
    const key = el.getAttribute('data-breakdown');
    if (key) {
      breakdownKeys.add(key);
    }
  });

  // ========================================================================
  // PHASE 3: Cross-reference against glossary
  // ========================================================================

  const glossaryKeys = Object.keys(TooltipGlossary);

  // Find tooltip keys not in glossary
  tooltipKeys.forEach(key => {
    if (!glossaryKeys.includes(key)) {
      report.findings.missingFromGlossary.push(key);
      report.issues.push({
        severity: 'ERROR',
        type: 'GLOSSARY_MISSING',
        key,
        message: `Tooltip key "${key}" used on sheet but not in glossary`
      });
    }
  });

  // Find glossary entries not used on sheet
  glossaryKeys.forEach(key => {
    if (!tooltipKeys.has(key)) {
      report.findings.unusedGlossaryEntries.push(key);
      // Don't report as error — entries are added in advance of use
    }
  });

  // ========================================================================
  // PHASE 4: Check breakdown provider coverage
  // ========================================================================

  breakdownKeys.forEach(key => {
    const glossaryEntry = TooltipGlossary[key];

    if (!glossaryEntry) {
      report.issues.push({
        severity: 'ERROR',
        type: 'BREAKDOWN_NO_GLOSSARY',
        key,
        message: `Breakdown key "${key}" has no glossary entry`
      });
      return;
    }

    if (!glossaryEntry.hasBreakdown) {
      report.issues.push({
        severity: 'WARNING',
        type: 'BREAKDOWN_NOT_FLAGGED',
        key,
        message: `Breakdown key "${key}" wired on sheet but glossary.hasBreakdown = false`
      });
      return;
    }

    const provider = TooltipRegistry.getBreakdownProvider(key);
    if (!provider) {
      report.findings.missingProviders.push(key);
      report.issues.push({
        severity: 'ERROR',
        type: 'PROVIDER_MISSING',
        key,
        message: `Breakdown key "${key}" is wired but no provider registered in TooltipRegistry`
      });
    }
  });

  // ========================================================================
  // PHASE 5: Calculate tier distribution
  // ========================================================================

  tooltipKeys.forEach(key => {
    const entry = TooltipGlossary[key];
    if (!entry) {
      report.findings.tierDistribution.unknown++;
      return;
    }

    const tier = entry.tier || 'unknown';
    if (report.findings.tierDistribution.hasOwnProperty(tier)) {
      report.findings.tierDistribution[tier]++;
    } else {
      report.findings.tierDistribution.unknown++;
    }
  });

  // ========================================================================
  // PHASE 6: Breakdown coverage statistics
  // ========================================================================

  const breakdownCapableKeys = Array.from(tooltipKeys).filter(key => {
    const entry = TooltipGlossary[key];
    return entry && entry.hasBreakdown;
  });

  const providedKeys = breakdownCapableKeys.filter(key => {
    return TooltipRegistry.getBreakdownProvider(key);
  });

  report.findings.breakdown_coverage.total = breakdownCapableKeys.length;
  report.findings.breakdown_coverage.with_breakdown = providedKeys.length;
  if (breakdownCapableKeys.length > 0) {
    report.findings.breakdown_coverage.coverage_pct = Math.round(
      (providedKeys.length / breakdownCapableKeys.length) * 100
    );
  }

  // ========================================================================
  // PHASE 7: Reference mapping validation
  // ========================================================================

  const referenceMapping = {
    total_glossary_entries: glossaryKeys.length,
    mapped_references: 0,
    valid_references: 0,
    missing_references: [],
    all_mapped: []
  };

  glossaryKeys.forEach(key => {
    const entry = TooltipGlossary[key];
    if (entry && entry.hasReference === true && entry.referenceId) {
      referenceMapping.all_mapped.push({
        key,
        referenceId: entry.referenceId,
        label: entry.label
      });
      referenceMapping.mapped_references++;

      // Check if reference actually exists in Foundry
      const journalEntry = game?.journal?.get(entry.referenceId);
      if (journalEntry) {
        referenceMapping.valid_references++;
      } else {
        referenceMapping.missing_references.push({
          key,
          referenceId: entry.referenceId,
          label: entry.label
        });
        report.issues.push({
          severity: 'WARNING',
          type: 'REFERENCE_MISSING',
          key,
          message: `Reference mapped for "${key}" but journal entry "${entry.referenceId}" not found`
        });
      }
    }
  });

  report.findings.reference_mapping = referenceMapping;

  // ========================================================================
  // PHASE 8: Generate summary
  // ========================================================================

  report.summary = {
    sheetType: report.sheetType,
    totalTooltips: tooltipKeys.size,
    totalBreakdowns: breakdownKeys.size,
    glossarySize: glossaryKeys.length,
    missingFromGlossary: report.findings.missingFromGlossary.length,
    unusedGlossaryEntries: report.findings.unusedGlossaryEntries.length,
    missingProviders: report.findings.missingProviders.length,
    errors: report.issues.filter(i => i.severity === 'ERROR').length,
    warnings: report.issues.filter(i => i.severity === 'WARNING').length,
    tier1_count: report.findings.tierDistribution.tier1,
    tier2_count: report.findings.tierDistribution.tier2,
    tier3_count: report.findings.tierDistribution.tier3,
    breakdown_coverage: `${report.findings.breakdown_coverage.with_breakdown}/${report.findings.breakdown_coverage.total} (${report.findings.breakdown_coverage.coverage_pct}%)`,
    reference_mapping: `${report.findings.reference_mapping.mapped_references} mapped, ${report.findings.reference_mapping.valid_references} valid`
  };

  return report;
}

/**
 * Pretty-print audit results to console (human-readable format).
 * @param {Object} audit - Audit report from auditTooltipHardpoints()
 */
export function printAuditReport(audit) {
  console.group('📊 SWSE Tooltip Hardpoint Audit');

  // Summary
  console.group('Summary');
  console.table(audit.summary);
  console.groupEnd();

  // Present keys
  if (audit.findings.presentKeys.length > 0) {
    console.group(`✓ Present on Sheet (${audit.findings.presentKeys.length})`);
    console.log(audit.findings.presentKeys.join(', '));
    console.groupEnd();
  }

  // Glossary coverage
  if (audit.findings.missingFromGlossary.length > 0) {
    console.group('⚠️ Missing from Glossary');
    console.error(audit.findings.missingFromGlossary);
    console.groupEnd();
  }

  if (audit.findings.unusedGlossaryEntries.length > 0) {
    console.group('ℹ️ Unused Glossary Entries (OK, they're added in advance)');
    console.log(audit.findings.unusedGlossaryEntries.join(', '));
    console.groupEnd();
  }

  // Provider coverage
  if (audit.findings.missingProviders.length > 0) {
    console.group('⚠️ Breakdown Targets Missing Providers');
    console.error(audit.findings.missingProviders);
    console.groupEnd();
  }

  // Tier distribution
  console.group('Tier Distribution');
  console.table({
    'Tier 1 (Core)': audit.findings.tierDistribution.tier1,
    'Tier 2 (Situational)': audit.findings.tierDistribution.tier2,
    'Tier 3 (Advanced)': audit.findings.tierDistribution.tier3,
    'Unknown': audit.findings.tierDistribution.unknown
  });
  console.groupEnd();

  // Reference mapping
  if (audit.findings.reference_mapping.mapped_references > 0) {
    console.group(`📖 Reference Mapping (${audit.findings.reference_mapping.mapped_references} mapped)`);
    console.log(`✓ Valid: ${audit.findings.reference_mapping.valid_references}`);
    if (audit.findings.reference_mapping.missing_references.length > 0) {
      console.warn(`⚠️ Missing: ${audit.findings.reference_mapping.missing_references.length}`);
      console.table(audit.findings.reference_mapping.missing_references);
    }
    if (audit.findings.reference_mapping.all_mapped.length > 0) {
      console.log('All Mapped References:');
      console.table(audit.findings.reference_mapping.all_mapped);
    }
    console.groupEnd();
  }

  // Issues
  if (audit.issues.length > 0) {
    console.group(`Issues (${audit.issues.length})`);
    const errorCount = audit.issues.filter(i => i.severity === 'ERROR').length;
    const warningCount = audit.issues.filter(i => i.severity === 'WARNING').length;
    console.log(`${errorCount} errors, ${warningCount} warnings`);
    console.table(audit.issues);
    console.groupEnd();
  } else {
    console.log('✓ No issues found');
  }

  console.groupEnd();
}

/**
 * Detect sheet type from DOM (heuristic).
 * @private
 */
function _detectSheetType(root) {
  if (root.classList?.contains('swse-character-sheet')) return 'V2 Character';
  if (root.classList?.contains('swse-npc-sheet')) return 'V2 NPC';
  if (root.classList?.contains('swse-droid-sheet')) return 'V2 Droid';
  if (root.classList?.contains('swse-vehicle-sheet')) return 'V2 Vehicle';
  return 'Unknown';
}

/**
 * Run full audit and print results to console.
 * Convenience wrapper for one-command usage.
 * @param {HTMLElement} root - Element to audit (defaults to document.body)
 */
export async function runAudit(root = document.body) {
  const audit = await auditTooltipHardpoints(root);
  printAuditReport(audit);
  return audit; // Also return for programmatic use
}

export default { auditTooltipHardpoints, printAuditReport, runAudit };
