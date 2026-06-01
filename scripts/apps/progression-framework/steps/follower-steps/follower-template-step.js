/**
 * FollowerTemplateStep
 *
 * The follower-only template choice, presented with the same visual card idiom as
 * the class selection step. This is one of the two genuinely follower-specific
 * steps: Living/Droid origin and Template.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const TEMPLATE_CARD_META = Object.freeze({
  aggressive: {
    img: 'systems/foundryvtt-swse/assets/templates/soldier_brawler.webp',
    quote: 'Point me at the problem and get behind cover.',
    type: 'Aggressive Asset',
    skillText: 'Template Skill: Endurance',
    attributeText: 'Choose +2 STR or +2 CON'
  },
  defensive: {
    img: 'systems/foundryvtt-swse/assets/templates/soldier_tank.webp',
    quote: 'I hold the line so everyone else comes home.',
    type: 'Defensive Asset',
    skillText: 'Template Skill: Endurance',
    attributeText: 'Choose +2 DEX or +2 WIS'
  },
  utility: {
    img: 'systems/foundryvtt-swse/assets/templates/Worker.webp',
    quote: 'Right tool, right moment, no wasted motion.',
    type: 'Utility Asset',
    skillText: 'Skill Training: choose one non-Force skill',
    attributeText: 'Choose +2 INT or +2 CHA'
  }
});

export class FollowerTemplateStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._templates = {};
    this._selectedTemplate = null;
    this._focusedTemplate = null;
    this._abilityChoice = null;
    this._isDroid = false;
  }

  async onStepEnter(shell) {
    try {
      this._templates = await this.getFollowerTemplates();
      const choices = this.getFollowerChoices(shell);
      this._selectedTemplate = choices.templateType || null;
      this._focusedTemplate = this._selectedTemplate || null;
      this._abilityChoice = choices.abilityChoice || this.getDefaultTemplateAbility(this._selectedTemplate);
      this._isDroid = this.isDroidFollowerChoice(choices);
      swseLogger.log('[FollowerTemplateStep] Entered, available templates:', Object.keys(this._templates));
    } catch (err) {
      swseLogger.error('[FollowerTemplateStep] Error entering step:', err);
      ui?.notifications?.error?.('Failed to load templates. Please reload.');
    }
  }

  getStepData() {
    return {
      stepId: this.descriptor?.stepId,
      templates: this._formatTemplateCards(),
      selectedTemplate: this._selectedTemplate,
      focusedTemplate: this._focusedTemplate,
      isDroid: this._isDroid,
      abilityChoice: this._abilityChoice,
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/follower-template-work-surface.hbs',
      data: stepData,
    };
  }

  async afterRender(shell, workSurfaceEl) {
    workSurfaceEl?.querySelectorAll?.('[data-follower-template-card]').forEach(card => {
      const template = card.dataset.template;
      card.addEventListener('mouseenter', () => this._focusTemplate(shell, template, { render: false }));
      card.addEventListener('focus', () => this._focusTemplate(shell, template, { render: false }));
      card.addEventListener('click', event => {
        event.preventDefault();
        this._selectTemplate(shell, template);
      });
    });

    workSurfaceEl?.querySelectorAll?.('input[name="templateAbility"]').forEach(input => {
      input.addEventListener('change', () => {
        const value = input.value;
        if (!this.getTemplateAbilityOptions(this._selectedTemplate).includes(value)) return;
        this._abilityChoice = value;
        this.saveFollowerChoice(shell, 'abilityChoice', value);
        this._focusTemplate(shell, this._selectedTemplate, { render: false });
        shell.render();
      });
    });
  }

  async onItemFocused(itemId, shell) {
    this._focusTemplate(shell, itemId, { render: true });
  }

  async onItemCommitted(itemId, shell) {
    this._selectTemplate(shell, itemId);
  }

  _formatTemplateCards() {
    return Object.entries(this._templates || {}).map(([id, template]) => {
      const meta = TEMPLATE_CARD_META[id] || {};
      const abilityOptions = this.getTemplateAbilityOptions(id);
      const selected = this._selectedTemplate === id;
      const focused = this._focusedTemplate === id;
      return {
        id,
        name: template.name || id.charAt(0).toUpperCase() + id.slice(1),
        type: meta.type || 'Follower Template',
        img: meta.img || template.img || 'icons/svg/mystery-man.svg',
        profileQuote: meta.quote || template.description || 'A reliable hand when the job goes sideways.',
        skillText: meta.skillText || (id === 'utility' ? 'Choose one trained skill' : 'Trained Skill: Endurance'),
        attributeText: this._isDroid ? 'Droid +2 comes from chassis selection' : (meta.attributeText || `Choose +${template.abilityBonus || 2}: ${abilityOptions.map(a => a.toUpperCase()).join(' or ')}`),
        description: template.description || 'Follower template',
        selected,
        focused,
        abilityOptions,
        abilityBonus: template.abilityBonus || 2,
        defenseText: this._formatDefenseBonus(template.defenseBonus),
      };
    });
  }

  _focusTemplate(shell, templateType, { render = true } = {}) {
    if (!templateType || !this._templates?.[templateType]) return;
    this._focusedTemplate = templateType;
    const template = this._formatTemplateCards().find(t => t.id === templateType);
    shell.focusedItem = template || null;
    if (render) shell.render();
  }

  _selectTemplate(shell, templateType) {
    if (!templateType || !this._templates?.[templateType]) return;
    this._selectedTemplate = templateType;
    this._focusedTemplate = templateType;
    this.saveFollowerChoice(shell, 'templateType', templateType);

    if (this._isDroid) {
      this.saveFollowerChoice(shell, 'abilityChoice', null);
      this._abilityChoice = null;
    } else {
      const options = this.getTemplateAbilityOptions(templateType);
      const current = options.includes(this._abilityChoice)
        ? this._abilityChoice
        : this.getDefaultTemplateAbility(templateType);
      this._abilityChoice = current;
      this.saveFollowerChoice(shell, 'abilityChoice', current);
    }

    const automaticSkills = templateType === 'aggressive' || templateType === 'defensive'
      ? ['Endurance']
      : [];
    this.saveFollowerChoice(shell, 'skillChoices', automaticSkills);
    this.saveFollowerChoice(shell, 'followerSkills', automaticSkills);

    this._focusTemplate(shell, templateType, { render: false });
    swseLogger.log('[FollowerTemplateStep] Selected template:', { templateType, abilityChoice: this._abilityChoice, automaticSkills });
    shell.render();
  }

  renderDetailsPanel(focusedItem) {
    const item = focusedItem || this._formatTemplateCards().find(t => t.id === this._focusedTemplate || t.id === this._selectedTemplate);
    if (!item) return this.renderDetailsPanelEmptyState();
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/follower-template-details.hbs',
      data: { template: item, isDroid: this._isDroid }
    };
  }

  async onStepCommit(shell) {
    if (!this._selectedTemplate) {
      ui?.notifications?.warn?.('Please select a template for your follower.');
      return false;
    }
    if (!this._isDroid && !this._abilityChoice) {
      ui?.notifications?.warn?.('Choose the follower template ability bonus.');
      return false;
    }
    this.saveFollowerChoice(shell, 'templateType', this._selectedTemplate);
    this.saveFollowerChoice(shell, 'abilityChoice', this._isDroid ? null : this._abilityChoice);
    return true;
  }

  validate() {
    const errors = [];
    if (!this._selectedTemplate) errors.push('Select a follower template.');
    if (!this._isDroid && this._selectedTemplate && !this._abilityChoice) errors.push('Choose the template ability bonus.');
    return { isValid: errors.length === 0, errors, warnings: [] };
  }

  getBlockingIssues() {
    return this.validate().errors;
  }

  getSelection() {
    return {
      selected: this._selectedTemplate ? [this._selectedTemplate] : [],
      count: this._selectedTemplate ? 1 : 0,
      isComplete: this.getBlockingIssues().length === 0,
    };
  }

  getRemainingPicks() {
    return this.getBlockingIssues().length ? [{ label: 'Template', count: 1, isWarning: true }] : [];
  }

  _formatDefenseBonus(defenseBonus) {
    const map = { fort: 'Fortitude', fortitude: 'Fortitude', ref: 'Reflex', reflex: 'Reflex', will: 'Will' };
    return Object.entries(defenseBonus || {}).map(([key, value]) => `+${value} ${map[key] || key}`).join(', ');
  }

  getUtilityBarConfig() {
    return { showSearch: false, showSort: false, showFilter: false };
  }

  getMentorContext() {
    return 'Templates set the follower role. Pick the job this ally was trained to do, then choose the ability bonus the template allows.';
  }
}
