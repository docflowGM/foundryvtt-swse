/**
 * ProgressionShell Explainability Integration — Phase 7 Step 1
 *
 * Mixin/helper for integrating user explainability into the progression shell
 * without modifying the shell class directly.
 *
 * Provides:
 * - Methods to attach explanation badges to rendered elements
 * - Dirty node detection and recovery guidance
 * - Template provenance display integration
 * - Summary step enhancement for clarity
 */

import { UserExplainability } from './user-explainability.js';
import { ExplanationDisplay } from './explanation-display.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ProgressionShellExplainabilityIntegration {
  /**
   * Called after shell renders, to attach explanations to step elements.
   *
   * @param {ProgressionShell} shell - The shell instance
   * @param {HTMLElement} element - The rendered shell element
   */
  static afterShellRender(shell, element) {
    if (!shell.progressionSession || !element) return;

    const session = shell.progressionSession;

    // Add explanations to active steps in the progress rail
    this._attachStepExplanations(element, session);

    // Add alerts for dirty nodes
    this._attachDirtyNodeAlerts(element, session);

    // Add template provenance indicators where applicable
    if (session.templateId) {
      this._attachTemplateProvenance(element, session);
    }
  }

  /**
   * Attach explanation badges to active steps in the progress rail.
   * @private
   */
  static _attachStepExplanations(element, session) {
    const progressRail = element.querySelector('[data-region="progress-rail"]');
    if (!progressRail) return;

    const currentStep = progressRail.querySelector('.prog-step--active');
    if (!currentStep) return;

    const currentStepId = currentStep.dataset.stepId;
    const explanation = UserExplainability.explainNodePresence(session, currentStepId);

    if (explanation.isActive && explanation.reasons && explanation.reasons.length > 0) {
      const badge = ExplanationDisplay.renderNodePresenceBadge(currentStepId, explanation);
      if (badge) {
        const stepLabel = currentStep.querySelector('.prog-step__label');
        if (stepLabel) {
          stepLabel.appendChild(badge);
        }
      }
    }
  }

  /**
   * Attach alerts for nodes that became dirty due to reconciliation.
   * @private
   */
  static _attachDirtyNodeAlerts(element, session) {
    if (!session.dirtyNodes || session.dirtyNodes.size === 0) return;

    const workSurface = element.querySelector('[data-region="work-surface"]');
    if (!workSurface) return;

    // Find the first dirty node
    const dirtyNodeId = Array.from(session.dirtyNodes)[0];

    const alertContainer = workSurface.querySelector('.dirty-node-alerts');
    if (alertContainer) {
      // Clear old alerts
      alertContainer.innerHTML = '';

      const explanation = UserExplainability.explainNodeStateChange(session, dirtyNodeId, {
        state: 'ACTIVE', // Assume it was active before
        isActive: true,
        activation: {},
        dependencies: { dependenciesMet: true },
      });

      const alert = ExplanationDisplay.renderNodeStateChangeAlert(dirtyNodeId, explanation);
      if (alert) {
        alertContainer.appendChild(alert);

        // Add recovery guidance
        const guidance = this._createDirtyNodeGuidance(dirtyNodeId, explanation);
        if (guidance) {
          alertContainer.appendChild(guidance);
        }
      }
    }
  }

  /**
   * Create recovery guidance for a dirty node.
   * @private
   */
  static _createDirtyNodeGuidance(nodeId, explanation) {
    const guidance = document.createElement('div');
    guidance.className = 'dirty-node-guidance';

    guidance.innerHTML = `
      <div class="guidance-title">How to fix this:</div>
      <ol class="guidance-steps">
        <li>Review the change that caused this issue</li>
        <li>Check if you need to make a different choice for this step</li>
        <li>Click the step to revisit your selection</li>
        <li>Confirm your choice when ready</li>
      </ol>
    `;

    return guidance;
  }

  /**
   * Attach template provenance indicators to relevant selections.
   * @private
   */
  static _attachTemplateProvenance(element, session) {
    if (!session.templateId) return;

    // This would require mapping from selections to DOM elements,
    // which is step-specific. For now, add a general template info panel.

    const workSurface = element.querySelector('[data-region="work-surface"]');
    if (!workSurface) return;

    const templatePanel = document.createElement('div');
    templatePanel.className = 'template-info-panel';
    templatePanel.innerHTML = `
      <div class="panel-icon">📦</div>
      <div class="panel-content">
        <div class="panel-title">Using template: ${this._escapeHtml(session.templateName || session.templateId)}</div>
        <div class="panel-hint">Some of your choices are guided by this template.</div>
      </div>
    `;

    // Insert at the top of work surface (after existing content or prepend)
    if (workSurface.firstChild) {
      workSurface.insertBefore(templatePanel, workSurface.firstChild);
    } else {
      workSurface.appendChild(templatePanel);
    }
  }

  /**
   * Enhance summary step to show warnings and explainability.
   *
   * Called by SummaryStep.onDataReady() to integrate explanations.
   *
   * @param {HTMLElement} summaryElement - Summary step's rendered element
   * @param {ProgressionSession} session - Current session
   * @param {ProgressionShell} shell - Shell instance
   */
  static enhanceSummaryStep(summaryElement, session, shell) {
    if (!summaryElement || !session) return;

    // Add template validation issues if any
    if (session.templateValidationReport) {
      const issues = UserExplainability.explainTemplateIssues(session.templateValidationReport);
      if (issues.length > 0) {
        const issuesPanel = ExplanationDisplay.renderTemplateIssuesPanel(issues);
        if (issuesPanel) {
          const reviewSection = summaryElement.querySelector('.summary-step-review-section');
          if (reviewSection) {
            reviewSection.insertBefore(issuesPanel, reviewSection.firstChild);
          } else {
            summaryElement.insertBefore(issuesPanel, summaryElement.firstChild);
          }
        }
      }
    }

    // Add template provenance info if applicable
    if (session.templateId) {
      const templateInfoPanel = document.createElement('div');
      templateInfoPanel.className = 'summary-template-info';
      templateInfoPanel.innerHTML = `
        <div class="info-header">✓ Template Applied</div>
        <div class="info-body">
          <p>This character is built from the <strong>${this._escapeHtml(session.templateName || session.templateId)}</strong> template.</p>
          <p>You can review and change any choice if needed.</p>
        </div>
      `;

      const reviewSection = summaryElement.querySelector('.summary-step-review-section');
      if (reviewSection) {
        reviewSection.insertBefore(templateInfoPanel, reviewSection.firstChild);
      }
    }

    // Add warnings section for blocked or caution items
    const warningsPanel = this._createSummaryWarningsPanel(session);
    if (warningsPanel) {
      const reviewSection = summaryElement.querySelector('.summary-step-review-section');
      if (reviewSection) {
        reviewSection.appendChild(warningsPanel);
      }
    }
  }

  /**
   * Create a warnings panel for summary step.
   * @private
   */
  static _createSummaryWarningsPanel(session) {
    const warnings = [];

    // Unresolved template items
    if (session.unresolvedTemplateItems && session.unresolvedTemplateItems.length > 0) {
      warnings.push({
        severity: 'warning',
        title: 'Unresolved template choices',
        items: session.unresolvedTemplateItems,
      });
    }

    // Dirty nodes
    if (session.dirtyNodes && session.dirtyNodes.size > 0) {
      warnings.push({
        severity: 'caution',
        title: 'Items needing review',
        items: Array.from(session.dirtyNodes),
      });
    }

    if (warnings.length === 0) return null;

    const panel = document.createElement('div');
    panel.className = 'summary-warnings-panel';

    warnings.forEach(warning => {
      const section = document.createElement('div');
      section.className = `warning-section ${warning.severity}`;
      section.innerHTML = `
        <div class="warning-title">⚠️ ${this._escapeHtml(warning.title)}</div>
        <ul class="warning-items">
          ${warning.items.map(item => `<li>${this._escapeHtml(item)}</li>`).join('')}
        </ul>
      `;
      panel.appendChild(section);
    });

    return panel;
  }

  /**
   * Inject CSS for explainability UI elements.
   * @private
   */
  static _injectStyles() {
    if (document.getElementById('progression-explainability-styles')) return;

    const style = document.createElement('style');
    style.id = 'progression-explainability-styles';
    style.textContent = `
      /* Dirty node alerts */
      .dirty-node-alerts {
        margin: 12px 0;
      }

      .dirty-node-guidance {
        padding: 12px;
        background: #fff8e1;
        border: 1px solid #ffeb3b;
        border-radius: 4px;
        margin-top: 8px;
      }

      .guidance-title {
        font-weight: bold;
        margin-bottom: 8px;
      }

      .guidance-steps {
        margin: 0;
        padding-left: 16px;
      }

      .guidance-steps li {
        margin: 4px 0;
        font-size: 13px;
      }

      /* Template info panel */
      .template-info-panel {
        display: flex;
        gap: 12px;
        padding: 12px;
        margin-bottom: 12px;
        background: #e8f5e9;
        border: 1px solid #4caf50;
        border-radius: 4px;
      }

      .panel-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .panel-content {
        flex: 1;
      }

      .panel-title {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .panel-hint {
        font-size: 12px;
        color: #666;
      }

      /* Summary step enhancements */
      .summary-template-info {
        padding: 12px;
        margin: 12px 0;
        background: #e3f2fd;
        border: 1px solid #2196f3;
        border-radius: 4px;
      }

      .info-header {
        font-weight: bold;
        color: #1976d2;
        margin-bottom: 8px;
      }

      .info-body {
        font-size: 13px;
        line-height: 1.5;
      }

      .info-body p {
        margin: 4px 0;
      }

      .summary-warnings-panel {
        margin: 12px 0;
      }

      .warning-section {
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 4px;
        border-left: 4px solid;
      }

      .warning-section.warning {
        background: #fff3e0;
        border-left-color: #ff9800;
      }

      .warning-section.caution {
        background: #f1f8e9;
        border-left-color: #8bc34a;
      }

      .warning-title {
        font-weight: bold;
        margin-bottom: 8px;
      }

      .warning-items {
        margin: 0;
        padding-left: 16px;
        list-style: disc;
      }

      .warning-items li {
        font-size: 12px;
        margin: 2px 0;
      }
    `;

    document.head.appendChild(style);
  }

  static _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Inject styles on module load
ProgressionShellExplainabilityIntegration._injectStyles();
