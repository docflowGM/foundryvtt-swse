/**
 * GM/Admin Diagnostics — Phase 7 Step 6
 *
 * Provides admin-readable diagnostic tools for troubleshooting progression system.
 * Integrated with Phase 6 debug helpers and Phase 7 explainability/recovery systems.
 *
 * Tools:
 * - Node activation trace viewer
 * - Template validation diagnostics
 * - Advisory reasoning trace
 * - Mutation-plan preview
 * - Support-level report generator
 */

import { ProgressionDebugHelpers } from '/systems/foundryvtt-swse/scripts/engine/progression/debugging/progression-debug-helpers.js';
import { SupportTracker } from '/systems/foundryvtt-swse/scripts/engine/progression/coverage/support-tracker.js';
import { ContentValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/validation/content-validator.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ProgressionDiagnosticsPanel {
  /**
   * Generate comprehensive diagnostic report for a session.
   * Called by GM/admin to troubleshoot issues.
   *
   * @param {ProgressionSession} session - Session to diagnose
   * @param {ProgressionShell} shell - Shell context
   * @returns {Object} Detailed diagnostic report
   */
  static generateDiagnosticReport(session, shell) {
    return {
      timestamp: new Date().toISOString(),
      actor: {
        id: shell.actor.id,
        name: shell.actor.name,
        type: shell.actor.type,
      },
      session: {
        mode: session.mode,
        subtype: session.subtype,
        level: session.currentLevel,
        templateId: session.templateId,
        templateName: session.templateName,
      },
      nodeActivation: this._diagnoseNodeActivation(session),
      templateValidation: this._diagnoseTemplateValidation(session),
      dirtyNodes: this._diagnoseDirtyNodes(session),
      supportLevels: this._diagnoseSupportLevels(session),
      mutations: this._diagnoseMutations(session, shell),
      warnings: this._identifyWarnings(session),
    };
  }

  /**
   * Diagnose why nodes are/aren't active.
   * @private
   */
  static _diagnoseNodeActivation(session) {
    if (!session.activeSteps || session.activeSteps.length === 0) {
      return { count: 0, nodes: [] };
    }

    const nodes = session.activeSteps.map(nodeId =>
      ProgressionDebugHelpers.debugNodeActivation(session, nodeId)
    );

    return {
      count: nodes.length,
      nodes,
      completedCount: session.completedStepIds?.length || 0,
      lockedCount: session.lockedNodes?.size || 0,
    };
  }

  /**
   * Diagnose template validation issues.
   * @private
   */
  static _diagnoseTemplateValidation(session) {
    if (!session.templateValidationReport) {
      return { hasTemplate: false };
    }

    return {
      hasTemplate: true,
      templateId: session.templateId,
      valid: session.templateValidationReport.valid,
      conflicts: session.templateValidationReport.conflicts || [],
      unresolved: session.templateValidationReport.unresolved || [],
      warnings: session.templateValidationReport.warnings || [],
      issueCount:
        (session.templateValidationReport.conflicts?.length || 0) +
        (session.templateValidationReport.unresolved?.length || 0),
    };
  }

  /**
   * Diagnose dirty nodes and their causes.
   * @private
   */
  static _diagnoseDirtyNodes(session) {
    if (!session.dirtyNodes || session.dirtyNodes.size === 0) {
      return { count: 0, nodes: [] };
    }

    const nodes = Array.from(session.dirtyNodes).map(nodeId => ({
      nodeId,
      reasons: ProgressionDebugHelpers.debugNodeActivation(session, nodeId),
    }));

    return {
      count: nodes.length,
      nodes,
      reason: 'Reconciliation marked these nodes as needing review',
    };
  }

  /**
   * Diagnose support levels for used domains.
   * @private
   */
  static _diagnoseSupportLevels(session) {
    const supportMatrix = SupportTracker.getSupportMatrix();
    const activeSupport = {};

    // Check what's being used
    if (session.mode === 'chargen') {
      activeSupport.chargen = supportMatrix.chargen?.[session.subtype] || 'UNKNOWN';
    }
    if (session.mode === 'levelup') {
      activeSupport.levelup = supportMatrix.levelup?.[session.subtype] || 'UNKNOWN';
    }
    if (session.templateId) {
      activeSupport.templates = supportMatrix.templates?.[session.subtype] || 'UNKNOWN';
    }

    const hasPartialSupport = Object.values(activeSupport).includes('PARTIAL');
    const hasStructuralSupport = Object.values(activeSupport).includes('STRUCTURAL');

    return {
      byDomain: activeSupport,
      hasPartialSupport,
      hasStructuralSupport,
      warning: hasStructuralSupport ? 'Using experimental features' : null,
    };
  }

  /**
   * Diagnose mutations that will be applied.
   * @private
   */
  static _diagnoseMutations(session, shell) {
    // Would need MutationPlan to preview mutations
    // For now, return summary
    return {
      note: 'Use MutationPlan.preview() for detailed mutation diagnostics',
      selections: Object.keys(session.draftSelections || {}).length,
      completedSteps: session.completedStepIds?.length || 0,
    };
  }

  /**
   * Identify diagnostic warnings.
   * @private
   */
  static _identifyWarnings(session) {
    const warnings = [];

    if (session.dirtyNodes && session.dirtyNodes.size > 0) {
      warnings.push({
        type: 'dirty-nodes',
        severity: 'warning',
        message: `${session.dirtyNodes.size} nodes marked dirty by reconciliation`,
      });
    }

    if (session.templateValidationReport && !session.templateValidationReport.valid) {
      warnings.push({
        type: 'template-invalid',
        severity: 'warning',
        message: `Template has ${session.templateValidationReport.conflicts?.length || 0} conflicts`,
      });
    }

    if (session.lastError) {
      warnings.push({
        type: 'last-error',
        severity: 'error',
        message: `Previous error: ${session.lastError.message}`,
      });
    }

    return warnings;
  }

  /**
   * Generate admin-friendly diagnostic UI.
   *
   * @param {Object} report - From generateDiagnosticReport()
   * @returns {HTMLElement} Diagnostic panel
   */
  static renderDiagnosticsUI(report) {
    const panel = document.createElement('div');
    panel.className = 'diagnostics-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'diagnostics-header';
    header.innerHTML = `
      <h3>🔧 Progression Diagnostics</h3>
      <p class="timestamp">${report.timestamp}</p>
    `;
    panel.appendChild(header);

    // Actor info
    const actorSection = document.createElement('section');
    actorSection.className = 'diag-section';
    actorSection.innerHTML = `
      <h4>Actor</h4>
      <table class="diag-table">
        <tr><td>ID</td><td>${report.actor.id}</td></tr>
        <tr><td>Name</td><td>${report.actor.name}</td></tr>
        <tr><td>Type</td><td>${report.actor.type}</td></tr>
      </table>
    `;
    panel.appendChild(actorSection);

    // Session info
    const sessionSection = document.createElement('section');
    sessionSection.className = 'diag-section';
    sessionSection.innerHTML = `
      <h4>Session</h4>
      <table class="diag-table">
        <tr><td>Mode</td><td>${report.session.mode}</td></tr>
        <tr><td>Subtype</td><td>${report.session.subtype}</td></tr>
        <tr><td>Level</td><td>${report.session.level}</td></tr>
        ${report.session.templateId ? `<tr><td>Template</td><td>${report.session.templateName}</td></tr>` : ''}
      </table>
    `;
    panel.appendChild(sessionSection);

    // Active nodes
    const nodesSection = document.createElement('section');
    nodesSection.className = 'diag-section';
    nodesSection.innerHTML = `
      <h4>Nodes</h4>
      <p>Active: <strong>${report.nodeActivation.count}</strong></p>
      <p>Completed: <strong>${report.nodeActivation.completedCount}</strong></p>
      <p>Locked: <strong>${report.nodeActivation.lockedCount}</strong></p>
    `;
    panel.appendChild(nodesSection);

    // Dirty nodes
    if (report.dirtyNodes.count > 0) {
      const dirtySection = document.createElement('section');
      dirtySection.className = 'diag-section warning';
      dirtySection.innerHTML = `
        <h4>⚠️ Dirty Nodes (${report.dirtyNodes.count})</h4>
        <ul>
          ${report.dirtyNodes.nodes.map(n => `<li>${n.nodeId}</li>`).join('')}
        </ul>
      `;
      panel.appendChild(dirtySection);
    }

    // Template validation
    if (report.templateValidation.hasTemplate) {
      const templateSection = document.createElement('section');
      templateSection.className = `diag-section ${!report.templateValidation.valid ? 'warning' : ''}`;
      templateSection.innerHTML = `
        <h4>Template</h4>
        <p>Valid: <strong>${report.templateValidation.valid ? '✓' : '✗'}</strong></p>
        <p>Issues: <strong>${report.templateValidation.issueCount}</strong></p>
      `;
      panel.appendChild(templateSection);
    }

    // Support levels
    const supportSection = document.createElement('section');
    supportSection.className = 'diag-section';
    supportSection.innerHTML = `
      <h4>Support Levels</h4>
      ${Object.entries(report.supportLevels.byDomain).map(([domain, level]) => `
        <p>${domain}: <code>${level}</code></p>
      `).join('')}
    `;
    panel.appendChild(supportSection);

    // Warnings
    if (report.warnings.length > 0) {
      const warningsSection = document.createElement('section');
      warningsSection.className = 'diag-section warning';
      warningsSection.innerHTML = `
        <h4>⚠️ Warnings</h4>
        <ul>
          ${report.warnings.map(w => `<li>${w.message}</li>`).join('')}
        </ul>
      `;
      panel.appendChild(warningsSection);
    }

    // Copy JSON button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'diag-copy-btn';
    copyBtn.textContent = 'Copy JSON Report';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy JSON Report', 2000);
    });
    panel.appendChild(copyBtn);

    // Add CSS
    this._injectDiagnosticsCSS();

    return panel;
  }

  /**
   * Inject CSS for diagnostics panel.
   * @private
   */
  static _injectDiagnosticsCSS() {
    if (document.getElementById('diagnostics-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'diagnostics-panel-styles';
    style.textContent = `
      .diagnostics-panel {
        font-family: monospace;
        background: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 16px;
        margin: 12px 0;
        max-height: 600px;
        overflow-y: auto;
      }

      .diagnostics-header {
        margin-bottom: 16px;
        border-bottom: 2px solid #333;
        padding-bottom: 8px;
      }

      .diagnostics-header h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
      }

      .timestamp {
        margin: 0;
        font-size: 11px;
        color: #666;
      }

      .diag-section {
        margin-bottom: 12px;
        padding: 8px;
        background: white;
        border-radius: 3px;
      }

      .diag-section.warning {
        background: #fff3e0;
        border-left: 3px solid #ff9800;
      }

      .diag-section h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        font-weight: bold;
      }

      .diag-table {
        width: 100%;
        font-size: 11px;
        border-collapse: collapse;
      }

      .diag-table td {
        padding: 4px 8px;
        border: 1px solid #e0e0e0;
      }

      .diag-table td:first-child {
        font-weight: bold;
        background: #f9f9f9;
      }

      .diag-section ul {
        margin: 0;
        padding-left: 16px;
        font-size: 12px;
      }

      .diag-copy-btn {
        width: 100%;
        padding: 8px;
        margin-top: 8px;
        background: #2196f3;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      }

      .diag-copy-btn:hover {
        background: #1976d2;
      }
    `;

    document.head.appendChild(style);
  }
}
