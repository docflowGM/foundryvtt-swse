/**
 * Explanation Display — Phase 7 Step 1
 *
 * Renders user explainability data as UI-ready HTML/DOM elements.
 * Integrates with ProgressionShell, step plugins, and tooltip/modal systems.
 *
 * Provides:
 * - Node explanation badges/icons
 * - Suggestion rationale tooltips
 * - Template provenance badges
 * - Warning/conflict explanations
 * - Dirty node recovery guidance
 */

import { UserExplainability } from './user-explainability.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ExplanationDisplay {
  /**
   * Render an explanation badge for why a node is active/present.
   *
   * @param {string} nodeId - Node to explain
   * @param {Object} explanation - From UserExplainability.explainNodePresence()
   * @returns {HTMLElement} Badge element
   */
  static renderNodePresenceBadge(nodeId, explanation) {
    if (explanation.error) {
      return this._createBadge('⚠️', 'error', 'Could not load explanation');
    }

    if (!explanation.isActive) {
      return null; // Node not active, no badge needed
    }

    const badge = document.createElement('span');
    badge.className = 'explanation-badge node-presence-badge';
    badge.setAttribute('data-node-id', nodeId);
    badge.setAttribute('title', 'Why is this here?');
    badge.innerHTML = '?';

    // Add tooltip with reasons
    const tooltip = document.createElement('div');
    tooltip.className = 'explanation-tooltip';
    tooltip.innerHTML = `
      <div class="explanation-header">Why this step is here:</div>
      <ul class="explanation-reasons">
        ${explanation.reasons.map(r => `<li>${this._escapeHtml(r)}</li>`).join('')}
      </ul>
    `;
    badge.appendChild(tooltip);

    return badge;
  }

  /**
   * Render an explanation for a dirty or disappearing node.
   *
   * @param {string} nodeId - Node that changed
   * @param {Object} explanation - From UserExplainability.explainNodeStateChange()
   * @returns {HTMLElement} Alert/notice element
   */
  static renderNodeStateChangeAlert(nodeId, explanation) {
    if (!explanation.isDirty && explanation.currentState === explanation.previousState) {
      return null; // No state change
    }

    const alert = document.createElement('div');
    alert.className = 'explanation-alert node-state-change-alert';
    alert.setAttribute('data-node-id', nodeId);
    alert.setAttribute('data-severity', explanation.isDirty ? 'warning' : 'info');

    if (explanation.isDirty) {
      alert.innerHTML = `
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <div class="alert-title">This step needs your attention</div>
          <div class="alert-reason">${this._escapeHtml(explanation.dirtyReason)}</div>
          ${explanation.reasons.length > 0 ? `
            <div class="alert-details">
              <strong>Why:</strong> ${this._escapeHtml(explanation.reasons.join('; '))}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      alert.innerHTML = `
        <div class="alert-icon">ℹ️</div>
        <div class="alert-content">
          <div class="alert-title">${this._escapeHtml(explanation.label)} is no longer available</div>
          ${explanation.reasons.length > 0 ? `
            <div class="alert-details">
              ${this._escapeHtml(explanation.reasons.join('; '))}
            </div>
          ` : ''}
        </div>
      `;
    }

    return alert;
  }

  /**
   * Render suggestion rationale as a compact explanation.
   *
   * @param {Object} option - The option being explained
   * @param {Object} explanation - From UserExplainability.explainSuggestionRationale()
   * @returns {HTMLElement} Explanation element
   */
  static renderSuggestionRationale(option, explanation) {
    const container = document.createElement('div');
    container.className = 'suggestion-explanation';
    container.setAttribute('data-option', option.id);
    container.setAttribute('data-recommended', explanation.isRecommended);

    if (!explanation.legal) {
      container.innerHTML = `
        <div class="rationale-reason unavailable">
          <span class="reason-label">Not available:</span>
          <span class="reason-text">${this._escapeHtml(explanation.whyNotLegal)}</span>
        </div>
      `;
      return container;
    }

    // Build reasons list
    const reasonsHtml = explanation.reasons
      .map(r => `<li class="rationale-reason-item">${this._escapeHtml(r)}</li>`)
      .join('');

    // Build tradeoffs section (if any)
    const tradeoffsHtml = explanation.tradeoffs && explanation.tradeoffs.length > 0 ? `
      <div class="rationale-tradeoffs">
        <span class="tradeoff-label">⚠️ Note:</span>
        ${explanation.tradeoffs.map(t => `<span class="tradeoff-item">${this._escapeHtml(t)}</span>`).join(' ')}
      </div>
    ` : '';

    container.innerHTML = `
      <div class="rationale-reasons">
        ${explanation.isRecommended ? '<div class="reason-badge recommended">Top choice</div>' : ''}
        <ul class="rationale-list">
          ${reasonsHtml}
        </ul>
      </div>
      ${tradeoffsHtml}
    `;

    return container;
  }

  /**
   * Render template provenance indicator.
   *
   * @param {Object} explanation - From UserExplainability.explainTemplateProvenance()
   * @returns {HTMLElement} Provenance badge
   */
  static renderTemplateProvenanceBadge(explanation) {
    const badge = document.createElement('span');
    badge.className = 'provenance-badge';
    badge.setAttribute('title', explanation.source);

    const icon = explanation.overridden
      ? '✏️'
      : explanation.source.includes('Locked')
        ? '🔒'
        : explanation.source.includes('Suggested')
          ? '💡'
          : '✓';

    badge.innerHTML = `
      <span class="provenance-icon">${icon}</span>
      <span class="provenance-hint" hidden>${this._escapeHtml(explanation.hint)}</span>
    `;

    // Show hint on hover
    badge.addEventListener('mouseenter', () => {
      badge.querySelector('.provenance-hint').removeAttribute('hidden');
    });
    badge.addEventListener('mouseleave', () => {
      badge.querySelector('.provenance-hint').setAttribute('hidden', '');
    });

    return badge;
  }

  /**
   * Render template validation issues as user-friendly warnings.
   *
   * @param {Object[]} issues - From UserExplainability.explainTemplateIssues()
   * @returns {HTMLElement} Issues container
   */
  static renderTemplateIssuesPanel(issues) {
    if (!issues || issues.length === 0) {
      return null;
    }

    const container = document.createElement('div');
    container.className = 'template-issues-panel';

    // Group by severity
    const byLevel = {
      blocking: issues.filter(i => i.severity === 'blocking'),
      incomplete: issues.filter(i => i.severity === 'incomplete'),
      caution: issues.filter(i => i.severity === 'caution'),
    };

    // Blocking issues (must fix)
    if (byLevel.blocking.length > 0) {
      const section = document.createElement('div');
      section.className = 'issues-section blocking';
      section.innerHTML = `
        <div class="section-title">⛔ These must be fixed</div>
        <ul class="issues-list">
          ${byLevel.blocking.map(issue => `
            <li class="issue-item">
              <div class="issue-summary">${this._escapeHtml(issue.issue)}</div>
              <div class="issue-detail">${this._escapeHtml(issue.reason)}</div>
            </li>
          `).join('')}
        </ul>
      `;
      container.appendChild(section);
    }

    // Incomplete items
    if (byLevel.incomplete.length > 0) {
      const section = document.createElement('div');
      section.className = 'issues-section incomplete';
      section.innerHTML = `
        <div class="section-title">📝 These need your choice</div>
        <ul class="issues-list">
          ${byLevel.incomplete.map(issue => `
            <li class="issue-item">
              <div class="issue-summary">${this._escapeHtml(issue.issue)}</div>
              <div class="issue-detail">${this._escapeHtml(issue.reason)}</div>
            </li>
          `).join('')}
        </ul>
      `;
      container.appendChild(section);
    }

    // Cautions/warnings
    if (byLevel.caution.length > 0) {
      const section = document.createElement('div');
      section.className = 'issues-section caution';
      section.innerHTML = `
        <div class="section-title">⚠️ Worth knowing</div>
        <ul class="issues-list">
          ${byLevel.caution.map(issue => `
            <li class="issue-item">
              <div class="issue-summary">${this._escapeHtml(issue.issue)}</div>
            </li>
          `).join('')}
        </ul>
      `;
      container.appendChild(section);
    }

    return container;
  }

  /**
   * Render a step explanation card (why is this step in the progression?).
   *
   * @param {Object} stepDescriptor - Step description
   * @param {ProgressionSession} session - Current session
   * @returns {HTMLElement} Explanation card
   */
  static renderStepExplanationCard(stepDescriptor, session) {
    const explanation = UserExplainability.explainNodePresence(session, stepDescriptor.stepId);

    const card = document.createElement('div');
    card.className = 'step-explanation-card';

    card.innerHTML = `
      <div class="card-header">
        <h4>${this._escapeHtml(stepDescriptor.label)}</h4>
      </div>
      <div class="card-body">
        ${explanation.reasons ? `
          <div class="explanation-text">
            <strong>Why this step:</strong>
            <ul class="reasons-list">
              ${explanation.reasons.map(r => `<li>${this._escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    return card;
  }

  // -----------------------------------------------------------------------
  // CSS injection for explanation styles
  // -----------------------------------------------------------------------

  static injectExplanationStyles() {
    if (document.getElementById('explanation-styles')) return; // Already injected

    const style = document.createElement('style');
    style.id = 'explanation-styles';
    style.textContent = `
      /* Explanation badges */
      .explanation-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        margin-left: 4px;
        border-radius: 50%;
        background: #e8f4f8;
        border: 1px solid #5ba3bf;
        color: #5ba3bf;
        font-weight: bold;
        font-size: 12px;
        cursor: help;
        position: relative;
      }

      .explanation-badge:hover {
        background: #d0e9f0;
      }

      .explanation-tooltip {
        display: none;
        position: absolute;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 1px solid #5ba3bf;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 12px;
        z-index: 1000;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .explanation-badge:hover .explanation-tooltip {
        display: block;
      }

      .explanation-header {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .explanation-reasons {
        margin: 0;
        padding-left: 16px;
        list-style: disc;
      }

      .explanation-reasons li {
        margin: 2px 0;
      }

      /* Alerts */
      .explanation-alert {
        display: flex;
        gap: 12px;
        padding: 12px;
        margin: 8px 0;
        border-radius: 4px;
        border-left: 4px solid #ff9800;
        background: #fff3e0;
      }

      .explanation-alert[data-severity="info"] {
        border-left-color: #2196f3;
        background: #e3f2fd;
      }

      .alert-icon {
        flex-shrink: 0;
        font-size: 18px;
      }

      .alert-content {
        flex: 1;
      }

      .alert-title {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .alert-reason {
        font-size: 13px;
        margin-bottom: 4px;
      }

      .alert-details {
        font-size: 12px;
        color: #666;
      }

      /* Suggestion explanations */
      .suggestion-explanation {
        padding: 8px;
        background: #f5f5f5;
        border-radius: 3px;
        font-size: 12px;
      }

      .rationale-reasons {
        margin: 0;
      }

      .reason-badge {
        display: inline-block;
        padding: 2px 6px;
        margin-right: 8px;
        background: #4caf50;
        color: white;
        border-radius: 3px;
        font-size: 11px;
        font-weight: bold;
      }

      .rationale-list {
        margin: 4px 0 0 0;
        padding-left: 16px;
        list-style: disc;
      }

      .rationale-reason {
        margin: 4px 0;
        font-size: 12px;
      }

      .rationale-reason.unavailable {
        color: #d32f2f;
      }

      .reason-label {
        font-weight: bold;
      }

      .rationale-tradeoffs {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #ddd;
        font-size: 11px;
        color: #666;
      }

      .tradeoff-label {
        margin-right: 4px;
      }

      /* Provenance badges */
      .provenance-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        background: #f0f0f0;
        border-radius: 3px;
        font-size: 11px;
        border: 1px solid #ddd;
        cursor: help;
      }

      .provenance-icon {
        font-size: 14px;
      }

      .provenance-hint {
        max-width: 150px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 3px;
        padding: 4px 6px;
        font-size: 11px;
        white-space: normal;
      }

      /* Template issues panel */
      .template-issues-panel {
        margin: 12px 0;
        padding: 0;
      }

      .issues-section {
        margin-bottom: 12px;
      }

      .section-title {
        font-weight: bold;
        margin-bottom: 8px;
        padding: 4px 8px;
        border-radius: 3px;
      }

      .issues-section.blocking .section-title {
        background: #ffebee;
        color: #c62828;
      }

      .issues-section.incomplete .section-title {
        background: #fff3e0;
        color: #e65100;
      }

      .issues-section.caution .section-title {
        background: #f1f8e9;
        color: #558b2f;
      }

      .issues-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .issue-item {
        padding: 8px;
        margin-bottom: 4px;
        background: white;
        border-left: 3px solid;
        border-radius: 2px;
      }

      .issues-section.blocking .issue-item {
        border-left-color: #d32f2f;
      }

      .issues-section.incomplete .issue-item {
        border-left-color: #f57c00;
      }

      .issues-section.caution .issue-item {
        border-left-color: #7cb342;
      }

      .issue-summary {
        font-weight: bold;
        font-size: 13px;
      }

      .issue-detail {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
      }

      /* Step explanation card */
      .step-explanation-card {
        padding: 12px;
        background: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        margin: 8px 0;
      }

      .card-header h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
      }

      .explanation-text {
        font-size: 13px;
      }

      .reasons-list {
        margin: 4px 0 0 0;
        padding-left: 16px;
        list-style: disc;
      }

      .reasons-list li {
        margin: 2px 0;
      }
    `;

    document.head.appendChild(style);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  static _createBadge(icon, severity, title) {
    const badge = document.createElement('span');
    badge.className = `explanation-badge ${severity}`;
    badge.setAttribute('title', title);
    badge.textContent = icon;
    return badge;
  }

  static _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-inject styles on module load
ExplanationDisplay.injectExplanationStyles();
