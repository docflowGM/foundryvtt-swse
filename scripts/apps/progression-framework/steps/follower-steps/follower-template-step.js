/**
 * FollowerTemplateStep
 *
 * CRITICAL: Selects the follower template type (Aggressive, Defensive, Utility).
 * This choice is PERSISTENT and determines:
 * - Ability score focus
 * - HP formula (all use 10 + owner.heroicLevel)
 * - BAB progression table
 * - Skill allowances (Aggressive/Defensive: Endurance; Utility: one choice)
 * - Feat allowances (template-specific)
 * - Defense bonuses (template-specific)
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerTemplateStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._templates = {};
    this._selectedTemplate = null;
  }

  async onStepEnter(shell) {
    try {
      // Load follower templates
      this._templates = await this.getFollowerTemplates();

      swseLogger.log('[FollowerTemplateStep] Entered, available templates:', Object.keys(this._templates));

      // Restore selection from session if available
      const choices = this.getFollowerChoices(shell);
      if (choices.templateType) {
        this._selectedTemplate = choices.templateType;
      }
    } catch (err) {
      swseLogger.error('[FollowerTemplateStep] Error entering step:', err);
      ui?.notifications?.error?.('Failed to load templates. Please reload.');
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) {
        swseLogger.warn('[FollowerTemplateStep] No step content container found');
        return;
      }

      // Build template cards
      const cardsHtml = this._renderTemplateCards();
      container.innerHTML = cardsHtml;

      // Attach event listeners
      this._attachTemplateListeners(shell, container);
    } catch (err) {
      swseLogger.error('[FollowerTemplateStep] Error rendering:', err);
    }
  }

  _renderTemplateCards() {
    const templates = this._templates || {};

    const cardHtml = Object.entries(templates).map(([templateKey, template]) => {
      const isSelected = this._selectedTemplate === templateKey;
      const titleCase = templateKey.charAt(0).toUpperCase() + templateKey.slice(1);

      return `
        <div class="follower-template-card ${isSelected ? 'selected' : ''}" data-template="${templateKey}">
          <div class="template-card-header">
            <h3>${titleCase}</h3>
          </div>
          <div class="template-card-body">
            <div class="template-description">
              <p>${template.description || 'Follower template'}</p>
            </div>
            <div class="template-benefits">
              <h4>Benefits:</h4>
              <ul>
                ${template.abilityBonus ? `<li>+${template.abilityBonus} to one ability</li>` : ''}
                ${template.defenseBonus ? `<li>Defense bonuses: ${JSON.stringify(template.defenseBonus)}</li>` : ''}
                ${template.skillFocus ? `<li>Skill focus: ${template.skillFocus}</li>` : ''}
              </ul>
            </div>
            <div class="template-constraints">
              <h4>Constraints:</h4>
              <ul>
                ${templateKey === 'aggressive' ? '<li>Skills limited to Endurance</li>' : ''}
                ${templateKey === 'defensive' ? '<li>Skills limited to Endurance</li>' : ''}
                ${templateKey === 'utility' ? '<li>One skill choice (excluding Use the Force)</li>' : ''}
                <li>Feats constrained to template allowances</li>
              </ul>
            </div>
          </div>
          <button class="select-template-btn" data-template="${templateKey}">
            ${isSelected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="follower-step-content">
        <h3>Select Follower Template</h3>
        <p class="step-help">The template determines the follower's role, abilities, and constraints. This choice is persistent across follower updates.</p>
        <div class="follower-template-grid">
          ${cardHtml}
        </div>
      </div>
    `;
  }

  _attachTemplateListeners(shell, container) {
    const buttons = container.querySelectorAll('.select-template-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const templateType = btn.getAttribute('data-template');
        this._selectTemplate(shell, templateType);
      });
    });
  }

  _selectTemplate(shell, templateType) {
    this._selectedTemplate = templateType;
    this.saveFollowerChoice(shell, 'templateType', templateType);
    swseLogger.log('[FollowerTemplateStep] Selected template:', templateType);

    // Re-render to show selection highlight
    shell.render();
  }

  async onStepCommit(shell) {
    if (!this._selectedTemplate) {
      ui?.notifications?.warn?.('Please select a template for your follower.');
      return false;
    }

    this.saveFollowerChoice(shell, 'templateType', this._selectedTemplate);
    swseLogger.log('[FollowerTemplateStep] Committed template:', this._selectedTemplate);
    return true;
  }

  getUtilityBarConfig() {
    return {
      showSearch: false,
      showSort: false,
      showFilter: false,
    };
  }
}
