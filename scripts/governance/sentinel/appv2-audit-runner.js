/**
 * AppV2 Audit Runner
 * Discovers and audits all V2 sheets/apps
 * Phase A: Generates audit report without making changes
 */

import { AppV2InteractionAuditor } from '/systems/foundryvtt-swse/scripts/governance/sentinel/appv2-interaction-auditor.js';

export class AppV2AuditRunner {
  /**
   * Run audit on all open V2 apps
   * Call from console: await game.swse.AppV2AuditRunner.runAudit()
   */
  static async runAudit() {
    console.log('🔍 Starting AppV2 Interaction Audit...');

    const reports = [];
    const apps = Object.values(ui.windows).filter(app => app && app.element);

    console.log(`Found ${apps.length} open windows`);

    for (const app of apps) {
      const appClass = app.constructor.name;
      console.log(`  Auditing: ${appClass}...`);

      try {
        const report = await AppV2InteractionAuditor.auditApp(app, appClass);
        reports.push(report);

        // Report to Sentinel if available
        if (report.issues.length > 0 && Sentinel?.isActive?.()) {
          const severity = report.issues.some(i => i.severity === 'ERROR')
            ? Sentinel.SEVERITY.WARN
            : Sentinel.SEVERITY.INFO;

          Sentinel.report('appv2-audit', severity,
            `${appClass}: ${report.issues.length} issue(s)`, {
            appClass,
            appId: report.appId,
            issues: report.issues.length,
            errors: report.issues.filter(i => i.severity === 'ERROR').length
          });
        }
      } catch (err) {
        console.error(`  Error auditing ${appClass}:`, err);
      }
    }

    const summary = AppV2InteractionAuditor.generateReport(reports);

    console.log('\n📊 AUDIT REPORT');
    console.log('===============');
    console.log(`Total apps: ${summary.summary.totalApps}`);
    console.log(`Errors: ${summary.summary.errors}`);
    console.log(`Warnings: ${summary.summary.warnings}`);
    console.table(summary.table);

    // Detailed issues
    if (summary.summary.errors > 0 || summary.summary.warnings > 0) {
      console.log('\n⚠️  ISSUES FOUND:');
      for (const report of summary.reports) {
        if (report.issues.length > 0) {
          console.log(`\n${report.appClass}:`);
          for (const issue of report.issues) {
            console.log(`  [${issue.severity}] ${issue.category}: ${issue.message}`);
          }
        }
      }
    }

    return summary;
  }

  /**
   * Export audit report as JSON (for Phase B processing)
   */
  static async exportReport() {
    const summary = await this.runAudit();
    const json = JSON.stringify(summary, null, 2);
    console.log('\n📋 COPY THIS REPORT FOR PHASE B:');
    console.log(json);
    return json;
  }

  /**
   * Quick check: Only show apps with errors
   */
  static async quickCheck() {
    const summary = await this.runAudit();
    const withErrors = summary.reports.filter(r => r.issues.some(i => i.severity === 'ERROR'));

    if (withErrors.length === 0) {
      console.log('✅ All apps pass basic checks!');
      return null;
    }

    console.log(`\n🔴 ${withErrors.length} app(s) with errors:`);
    for (const report of withErrors) {
      console.log(`\n${report.appClass}:`);
      const errors = report.issues.filter(i => i.severity === 'ERROR');
      for (const err of errors) {
        console.log(`  ❌ [${err.category}] ${err.message}`);
      }
    }

    return withErrors;
  }
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.SWSE_AppV2_Audit = AppV2AuditRunner;
}
