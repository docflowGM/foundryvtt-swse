/**
 * Human follower special rule.
 *
 * By default, Human followers do not receive the normal Human bonus feat or
 * trained skill. Instead, they choose one benefit from another follower template.
 * A houserule can restore normal Human behavior and auto-skip this step.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';

export class FollowerHumanBonusStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._choices = null;
    this._templates = {};
    this._options = [];
    this._selected = null;
    this._isApplicable = false;
    this._normalHumanBonus = false;
  }

  async onStepEnter(shell) {
    this._choices = this.getFollowerChoices(shell);
    this._templates = await this.getFollowerTemplates();
    this._normalHumanBonus = HouseRuleService.getBoolean('allowHumanFollowerNormalBonus', false);
    this._isApplicable = this.isHumanSpecies(this._choices.speciesName) && !this._normalHumanBonus;

    if (!this._isApplicable) return;

    this._options = this._buildOptions(this._choices.templateType);
    this._selected = this._choices.humanTemplateBonus || null;
    swseLogger.log('[FollowerHumanBonusStep] Options prepared', this._options);
  }

  async onRender(shell, html, context) {
    const container = html.querySelector('[data-step-content]');
    if (!container) return;

    if (!this._isApplicable) {
      container.innerHTML = `
        <div class="follower-step-content">
          <h3>Human Follower Bonus</h3>
          <p class="step-help">This step applies only to Human followers using the default follower-only Human rule.</p>
        </div>
      `;
      return;
    }

    const optionHtml = this._options.map(option => {
      const selected = this._isSameChoice(option, this._selected);
      return `
        <div class="follower-human-bonus-card ${selected ? 'selected' : ''}" data-template="${option.templateType}" data-bonus="${option.bonusType}" data-value="${option.value || ''}">
          <h4>${option.label}</h4>
          <p>${option.description}</p>
          <button type="button" class="select-human-bonus-btn" data-template="${option.templateType}" data-bonus="${option.bonusType}" data-value="${option.value || ''}">
            ${selected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="follower-step-content">
        <h3>Human Follower Bonus</h3>
        <p class="step-help">Human followers do not gain the normal Human bonus feat or trained skill by default. Choose one benefit from any follower template other than ${this._displayTemplate(this._choices.templateType)}.</p>
        <div class="follower-human-bonus-grid">
          ${optionHtml}
        </div>
      </div>
    `;

    container.querySelectorAll('.select-human-bonus-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        this._selected = {
          templateType: button.dataset.template,
          bonusType: button.dataset.bonus,
          value: button.dataset.value || null
        };
        this.saveFollowerChoice(shell, 'humanTemplateBonus', this._selected);
        shell.render();
      });
    });
  }

  async onStepCommit(shell) {
    if (!this._isApplicable) return true;
    if (!this._selected) {
      ui?.notifications?.warn?.('Choose one Human follower cross-template bonus.');
      return false;
    }
    this.saveFollowerChoice(shell, 'humanTemplateBonus', this._selected);
    return true;
  }

  _buildOptions(currentTemplate) {
    const options = [];
    for (const [templateType, template] of Object.entries(this._templates || {})) {
      if (templateType === currentTemplate) continue;
      const display = this._displayTemplate(templateType);
      if (template.defenseBonus) {
        for (const [defense, bonus] of Object.entries(template.defenseBonus)) {
          options.push({
            templateType,
            bonusType: 'defense',
            value: defense,
            label: `${display}: +${bonus} ${this._displayDefense(defense)} Defense`,
            description: `Apply the ${display} template's ${this._displayDefense(defense)} Defense bonus to this Human follower.`
          });
        }
      }
      const fixedAbility = this.getFixedTemplateAbility(templateType);
      if (fixedAbility && template.abilityBonus) {
        options.push({
          templateType,
          bonusType: 'ability',
          value: fixedAbility,
          label: `${display}: +${template.abilityBonus} ${fixedAbility.toUpperCase()}`,
          description: `Apply the ${display} template's fixed ability bonus to ${fixedAbility.toUpperCase()}.`
        });
      }
      for (const feat of template.feats || template.featChoices || []) {
        options.push({
          templateType,
          bonusType: 'feat',
          value: feat,
          label: `${display}: ${feat}`,
          description: `Gain this feat from the ${display} template.`
        });
      }
      for (const skill of template.trainedSkills || []) {
        options.push({
          templateType,
          bonusType: 'skill',
          value: skill,
          label: `${display}: Trained ${skill}`,
          description: `Gain this trained skill from the ${display} template.`
        });
      }
    }
    return options;
  }

  _isSameChoice(a, b) {
    return !!a && !!b && a.templateType === b.templateType && a.bonusType === b.bonusType && String(a.value || '') === String(b.value || '');
  }

  _displayTemplate(templateType) {
    return String(templateType || 'template').charAt(0).toUpperCase() + String(templateType || 'template').slice(1);
  }

  _displayDefense(defense) {
    const map = { fort: 'Fortitude', fortitude: 'Fortitude', ref: 'Reflex', reflex: 'Reflex', will: 'Will' };
    return map[defense] || defense;
  }

  getUtilityBarConfig() {
    return { showSearch: false, showSort: false, showFilter: false };
  }
}
