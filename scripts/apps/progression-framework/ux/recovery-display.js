/**
 * Recovery Display — Phase 7 Step 2
 *
 * Renders recovery guidance as user-facing UI elements.
 * Provides:
 * - Recovery modals for critical issues
 * - Recovery panels for inline guidance
 * - Action buttons to guide resolution
 * - Clear next-steps messaging
 */

import { RecoveryCoordinator } from './recovery-coordinator.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class RecoveryDisplay {
  /**
   * Render a recovery modal (blocking issue).
   *
   * @param {Object} recoveryPlan - From RecoveryCoordinator
   * @param {Object} callbacks - { onResolve, onCancel }
   * @returns {HTMLElement} Modal element
   */
  static renderRecoveryModal(recoveryPlan, callbacks = {}) {
    const guidance = RecoveryCoordinator.createRecoveryGuidance(recoveryPlan);

    const modal = document.createElement('div');
    modal.className = 'recovery-modal';
    modal.setAttribute('role', 'alertdialog');

    const backdrop = document.createElement('div');
    backdrop.className = 'recovery-modal-backdrop';
    backdrop.addEventListener('click', () => callbacks.onCancel?.());

    const content = document.createElement('div');
    content.className = 'recovery-modal-content';
    content.innerHTML = `
      <div class="recovery-modal-header">
        <h2>${this._escapeHtml(guidance.title)}</h2>
      </div>
      <div class="recovery-modal-body">
        <p class="recovery-message">${this._escapeHtml(guidance.message)}</p>
        ${guidance.details ? `
          <div class="recovery-details">${this._escapeHtml(guidance.details)}</div>
        ` : ''}
        ${guidance.warnings.length > 0 ? `
          <div class="recovery-warnings">
            <div class="warnings-title">Issues to resolve:</div>
            <ul class="warnings-list">
              ${guidance.warnings.map(w => `<li>${this._escapeHtml(w)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${guidance.suggestions.length > 0 ? `
          <div class="recovery-suggestions">
            <div class="suggestions-title">Note:</div>
            <ul class="suggestions-list">
              ${guidance.suggestions.map(s => `<li>${this._escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${guidance.hint ? `
          <div class="recovery-hint">💡 ${this._escapeHtml(guidance.hint)}</div>
        ` : ''}
      </div>
      <div class="recovery-modal-actions">
        ${guidance.actions.map((action, idx) => `
          <button class="recovery-action-btn" data-action-type="${action.type}" data-action-index="${idx}">
            ${this._getActionLabel(action.type, action.label)}
          </button>
        `).join('')}
      </div>
      ${guidance.nextSteps ? `
        <div class="recovery-next-steps">
          <div class="steps-title">Next steps:</div>
          <ol class="steps-list">
            ${guidance.nextSteps.map(step => `<li>${this._escapeHtml(step)}</li>`).join('')}
          </ol>
        </div>
      ` : ''}
    `;

    content.addEventListener('click', (e) => {
      const btn = e.target.closest('.recovery-action-btn');
      if (!btn) return;

      const actionType = btn.dataset.actionType;
      const actionIndex = parseInt(btn.dataset.actionIndex, 10);
      const action = guidance.actions[actionIndex];

      callbacks.onAction?.({
        type: actionType,
        action,
        recoveryPlan,
      });
    });

    modal.appendChild(backdrop);
    modal.appendChild(content);

    return modal;
  }

  /**
   * Render a recovery panel (non-blocking guidance).
   *
   * @param {Object} recoveryPlan - From RecoveryCoordinator
   * @returns {HTMLElement} Panel element
   */
  static renderRecoveryPanel(recoveryPlan) {
    const guidance = RecoveryCoordinator.createRecoveryGuidance(recoveryPlan);

    const panel = document.createElement('div');
    panel.className = 'recovery-panel';
    panel.setAttribute('role', 'status');

    const severity = recoveryPlan.severity || 'warning';
    panel.setAttribute('data-severity', severity);

    const icon = this._severityIcon(severity);

    panel.innerHTML = `
      <div class="recovery-panel-header">
        <span class="recovery-icon">${icon}</span>
        <h3 class="recovery-title">${this._escapeHtml(guidance.title)}</h3>
      </div>
      <div class="recovery-panel-body">
        <p class="recovery-message">${this._escapeHtml(guidance.message)}</p>
        ${guidance.details ? `
          <div class="recovery-details">${this._escapeHtml(guidance.details)}</div>
        ` : ''}
        ${guidance.warnings.length > 0 ? `
          <div class="recovery-warnings">
            <div class="warnings-title">Issues:</div>
            <ul class="warnings-list">
              ${guidance.warnings.slice(0, 3).map(w => `<li>${this._escapeHtml(w)}</li>`).join('')}
              ${guidance.warnings.length > 3 ? `<li><em>+${guidance.warnings.length - 3} more</em></li>` : ''}
            </ul>
          </div>
        ` : ''}
        ${guidance.hint ? `
          <div class="recovery-hint">💡 ${this._escapeHtml(guidance.hint)}</div>
        ` : ''}
      </div>
      ${guidance.actions.length > 0 ? `
        <div class="recovery-panel-actions">
          ${guidance.actions.slice(0, 2).map((action, idx) => `
            <button class="recovery-action-btn small" data-action-type="${action.type}" data-action-index="${idx}">
              ${this._getActionLabel(action.type, action.label)}
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;

    return panel;
  }

  /**
   * Render inline recovery notice (very lightweight).
   *
   * @param {string} title - Title of issue
   * @param {string} message - Brief message
   * @returns {HTMLElement} Notice element
   */
  static renderRecoveryNotice(title, message) {
    const notice = document.createElement('div');
    notice.className = 'recovery-notice';
    notice.innerHTML = `
      <div class="notice-icon">⚠️</div>
      <div class="notice-content">
        <div class="notice-title">${this._escapeHtml(title)}</div>
        <div class="notice-message">${this._escapeHtml(message)}</div>
      </div>
    `;
    return notice;
  }

  /**
   * Inject CSS for recovery UI elements.
   * @private
   */
  static injectRecoveryStyles() {
    if (document.getElementById('recovery-styles')) return;

    const style = document.createElement('style');
    style.id = 'recovery-styles';
    style.textContent = `
      /* Recovery modal */
      .recovery-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .recovery-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: -1;
      }

      .recovery-modal-content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        z-index: 1001;
      }

      .recovery-modal-header {
        padding: 16px 20px;
        border-bottom: 2px solid #e0e0e0;
      }

      .recovery-modal-header h2 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }

      .recovery-modal-body {
        padding: 16px 20px;
      }

      .recovery-message {
        margin: 0 0 12px 0;
        font-size: 14px;
        line-height: 1.5;
        color: #555;
      }

      .recovery-details {
        padding: 12px;
        margin: 8px 0;
        background: #f5f5f5;
        border-left: 3px solid #ff9800;
        border-radius: 3px;
        font-size: 13px;
        color: #666;
      }

      .recovery-warnings {
        margin: 12px 0;
      }

      .warnings-title {
        font-weight: bold;
        margin-bottom: 6px;
        font-size: 13px;
        color: #d32f2f;
      }

      .warnings-list {
        margin: 0;
        padding-left: 16px;
        list-style: disc;
      }

      .warnings-list li {
        font-size: 12px;
        margin: 2px 0;
        color: #666;
      }

      .recovery-suggestions {
        margin: 12px 0;
      }

      .suggestions-title {
        font-weight: bold;
        margin-bottom: 6px;
        font-size: 13px;
        color: #1976d2;
      }

      .suggestions-list {
        margin: 0;
        padding-left: 16px;
        list-style: disc;
      }

      .suggestions-list li {
        font-size: 12px;
        margin: 2px 0;
        color: #666;
      }

      .recovery-hint {
        padding: 12px;
        margin: 12px 0 0 0;
        background: #e8f5e9;
        border-left: 3px solid #4caf50;
        border-radius: 3px;
        font-size: 13px;
        color: #2e7d32;
      }

      .recovery-next-steps {
        padding: 12px;
        margin: 12px 0;
        background: #f9f9f9;
        border-radius: 3px;
      }

      .steps-title {
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 12px;
      }

      .steps-list {
        margin: 0;
        padding-left: 16px;
      }

      .steps-list li {
        font-size: 12px;
        margin: 2px 0;
      }

      .recovery-modal-actions {
        padding: 12px 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        background: #fafafa;
      }

      .recovery-action-btn {
        padding: 8px 16px;
        border: 1px solid #ccc;
        background: white;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .recovery-action-btn:hover {
        background: #f5f5f5;
        border-color: #999;
      }

      .recovery-action-btn:active {
        background: #e0e0e0;
      }

      /* Recovery panel */
      .recovery-panel {
        margin: 12px 0;
        padding: 12px;
        border-radius: 4px;
        border-left: 4px solid;
        background: white;
      }

      .recovery-panel[data-severity="warning"] {
        border-left-color: #ff9800;
        background: #fff3e0;
      }

      .recovery-panel[data-severity="error"] {
        border-left-color: #d32f2f;
        background: #ffebee;
      }

      .recovery-panel[data-severity="info"] {
        border-left-color: #2196f3;
        background: #e3f2fd;
      }

      .recovery-panel-header {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        margin-bottom: 8px;
      }

      .recovery-icon {
        flex-shrink: 0;
        font-size: 16px;
      }

      .recovery-title {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
      }

      .recovery-panel-body {
        padding-left: 24px;
        font-size: 13px;
      }

      .recovery-panel-actions {
        margin-top: 8px;
        padding-left: 24px;
        display: flex;
        gap: 4px;
      }

      .recovery-action-btn.small {
        padding: 6px 12px;
        font-size: 12px;
      }

      /* Recovery notice */
      .recovery-notice {
        display: flex;
        gap: 8px;
        padding: 8px 12px;
        margin: 8px 0;
        background: #fff9c4;
        border-left: 3px solid #fbc02d;
        border-radius: 2px;
        font-size: 12px;
      }

      .notice-icon {
        flex-shrink: 0;
      }

      .notice-content {
        flex: 1;
      }

      .notice-title {
        font-weight: bold;
        margin-bottom: 2px;
      }

      .notice-message {
        color: #666;
      }
    `;

    document.head.appendChild(style);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  static _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static _severityIcon(severity) {
    switch (severity) {
      case 'error':
      case 'blocking':
        return '⛔';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  }

  static _getActionLabel(type, customLabel) {
    if (customLabel) return customLabel;

    const labels = {
      'resume': '✓ Resume session',
      'start-fresh': 'Start new session',
      'retry': 'Try again',
      'retry-apply': 'Try confirming again',
      'fix-validation': 'Fix validation errors',
      'review-prerequisites': 'Review choices',
      'resolve-conflict': 'Resolve conflicts',
      'resolve-unresolved': 'Complete missing choices',
      'exit-template': 'Exit template mode',
      'review-and-confirm': 'Review and confirm',
    };

    return labels[type] || type;
  }
}

// Auto-inject styles on module load
RecoveryDisplay.injectRecoveryStyles();
