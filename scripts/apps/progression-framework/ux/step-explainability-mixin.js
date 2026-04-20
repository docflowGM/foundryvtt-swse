/**
 * Step Explainability Mixin — Phase 7 Step 1
 *
 * Provides standard explainability methods for step plugins.
 * Mix this into ProgressionStepPlugin subclasses to automatically surface
 * explanations for selections, suggestions, and node states.
 *
 * Usage in a step plugin:
 *
 *   export class MyStep extends ProgressionStepPlugin {
 *     constructor(descriptor) {
 *       super(descriptor);
 *       Object.assign(this, StepExplainabilityMixin);
 *     }
 *
 *     async onDataReady(shell) {
 *       // ... step setup ...
 *       this._attachExplanationsToOptions(shell, shell.element);
 *     }
 *   }
 */

import { UserExplainability } from './user-explainability.js';
import { ExplanationDisplay } from './explanation-display.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export const StepExplainabilityMixin = {
  /**
   * Attach explanation badges to option/item elements in this step's work surface.
   *
   * Looks for elements with data attributes:
   * - data-option-id: The option being rendered
   * - data-item-id: Alternative to option-id
   *
   * @param {ProgressionShell} shell - Shell instance
   * @param {HTMLElement} stepElement - Step's rendered element
   */
  _attachExplanationsToOptions(shell, stepElement) {
    if (!shell?.progressionSession || !stepElement) return;

    const session = shell.progressionSession;
    const options = stepElement.querySelectorAll('[data-option-id], [data-item-id]');

    options.forEach(optEl => {
      const optionId = optEl.getAttribute('data-option-id') || optEl.getAttribute('data-item-id');
      if (!optionId) return;

      // If this is a suggested option, add rationale
      if (optEl.classList.contains('suggested') || optEl.classList.contains('recommended')) {
        const rationale = this._getOptionRationale(shell, optionId);
        if (rationale) {
          const rationaleEl = ExplanationDisplay.renderSuggestionRationale(
            { id: optionId, name: optEl.textContent },
            rationale
          );
          optEl.appendChild(rationaleEl);
        }
      }

      // Add template provenance indicator if applicable
      const provenance = this._getTemplateProvenance(shell, optionId);
      if (provenance) {
        const badge = ExplanationDisplay.renderTemplateProvenanceBadge(provenance);
        optEl.appendChild(badge);
      }
    });
  },

  /**
   * Get rationale for why an option is suggested/ranked.
   * @private
   */
  _getOptionRationale(shell, optionId) {
    // This would integrate with SuggestionEngineCoordinator in the step
    // For now, return stub
    return null; // planned: Integrate with step's suggestion context
  },

  /**
   * Get template provenance for an option.
   * @private
   */
  _getTemplateProvenance(shell, optionId) {
    const session = shell.progressionSession;
    if (!session?.templateId) return null;

    // Check if this option came from the template
    const templateSource = session.draftSelections?.[optionId]?.templateSource;
    if (!templateSource) return null;

    return UserExplainability.explainTemplateProvenance({
      selection: optionId,
      templateId: session.templateId,
      templateName: session.templateName,
      source: templateSource,
      overridden: session.draftSelections[optionId]?.overridden,
    });
  },

  /**
   * Create a styled explanation element for a validation failure.
   *
   * @param {Object} validationIssue - Issue from validator
   * @returns {HTMLElement} Explanation element
   */
  _createValidationExplanation(validationIssue) {
    const el = document.createElement('div');
    el.className = 'step-validation-explanation';
    el.setAttribute('data-severity', validationIssue.severity || 'warning');

    el.innerHTML = `
      <div class="validation-icon">${this._severityIcon(validationIssue.severity)}</div>
      <div class="validation-content">
        <div class="validation-message">${this._escapeHtml(validationIssue.message)}</div>
        ${validationIssue.details ? `
          <div class="validation-details">${this._escapeHtml(validationIssue.details)}</div>
        ` : ''}
        ${validationIssue.hint ? `
          <div class="validation-hint">💡 ${this._escapeHtml(validationIssue.hint)}</div>
        ` : ''}
      </div>
    `;

    return el;
  },

  /**
   * Create a directive explanation for a step (why is this step here?).
   *
   * @param {ProgressionShell} shell - Shell instance
   * @returns {HTMLElement} Explanation card
   */
  _createStepDirectiveCard(shell) {
    const stepId = this._descriptor.stepId;
    const explanation = UserExplainability.explainNodePresence(shell.progressionSession, stepId);

    if (!explanation.isActive || !explanation.reasons) {
      return null;
    }

    return ExplanationDisplay.renderStepExplanationCard(this._descriptor, shell.progressionSession);
  },

  /**
   * Helper to get the icon for a validation severity.
   * @private
   */
  _severityIcon(severity) {
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
  },

  /**
   * Escape HTML in text to prevent XSS.
   * @private
   */
  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
