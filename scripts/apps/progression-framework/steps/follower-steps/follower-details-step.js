/**
 * FollowerDetailsStep
 *
 * Compact detail step for follower-only choices: optional background, Human
 * cross-template bonus, constrained skills, and languages. Followers do not use
 * normal feat/talent/class steps.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerDetailsStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._choices = null;
    this._templates = {};
    this._backgrounds = [];
    this._backgroundEnabled = true;
    this._selectedBackground = null;
    this._humanOptions = [];
    this._selectedHumanBonus = null;
    this._humanBonusApplicable = false;
    this._templateType = null;
    this._availableSkills = [];
    this._selectedSkills = [];
    this._forcedLanguages = [];
    this._ownerLanguages = [];
    this._allLanguages = [];
    this._selectedLanguages = [];
    this._pickCount = 0;
  }

  async onStepEnter(shell) {
    try {
      this._choices = this.getFollowerChoices(shell);
      this._templates = await this.getFollowerTemplates();
      this._templateType = this._choices.templateType;
      this._backgroundEnabled = HouseRuleService.getBoolean('enableBackgrounds', true)
        && HouseRuleService.getBoolean('enableFollowerBackgrounds', true);
      this._selectedBackground = this._backgroundEnabled ? (this._choices.backgroundChoice || null) : null;
      this._selectedHumanBonus = this._choices.humanTemplateBonus || null;

      if (this._backgroundEnabled) {
        await this._loadBackgrounds();
      }

      const normalHumanBonus = HouseRuleService.getBoolean('allowHumanFollowerNormalBonus', false);
      this._humanBonusApplicable = this.isHumanSpecies(this._choices.speciesName) && !normalHumanBonus;
      this._humanOptions = this._humanBonusApplicable ? this._buildHumanOptions(this._templateType) : [];

      this._availableSkills = await this.getFollowerSkillsForTemplate(this._templateType);
      if (this._templateType === 'aggressive' || this._templateType === 'defensive') {
        this._selectedSkills = ['Endurance'];
        this.saveFollowerChoice(shell, 'skillChoices', this._selectedSkills);
      } else {
        this._selectedSkills = Array.isArray(this._choices.skillChoices) ? [...this._choices.skillChoices] : [];
      }

      const ownerActor = this.getOwnerActor(shell);
      const langData = await this.getFollowerLanguages(ownerActor, this._choices.speciesName, this._choices);
      this._forcedLanguages = langData.forced || ['Basic'];
      this._ownerLanguages = langData.ownerLanguages || [];
      this._allLanguages = langData.allLanguages || [];
      this._pickCount = Math.max(0, Number(langData.pickCount || 0));
      const forcedSet = new Set(this._forcedLanguages);
      this._selectedLanguages = (Array.isArray(this._choices.languageChoices) ? this._choices.languageChoices : [])
        .filter(lang => !forcedSet.has(lang))
        .filter(lang => this._ownerLanguages.includes(lang) || this._allLanguages.includes(lang))
        .slice(0, this._pickCount);
    } catch (err) {
      swseLogger.error('[FollowerDetailsStep] Error entering step:', err);
    }
  }

  async onRender(shell, html) {
    const container = html.querySelector('[data-step-content]');
    if (!container) return;
    container.innerHTML = this._renderDetails();
    this._attachListeners(shell, container);
  }

  _renderDetails() {
    return `
      <div class="follower-step-content follower-details-content">
        <h3>Follower Details</h3>
        <p class="step-help">Followers make only the few choices their template and species require. Feats and later improvements are derived from the owner and follower-granting talents.</p>
        ${this._renderHumanBonusSection()}
        ${this._renderBackgroundSection()}
        ${this._renderSkillsSection()}
        ${this._renderLanguageSection()}
      </div>
    `;
  }

  _renderHumanBonusSection() {
    if (!this._humanBonusApplicable) return '';
    const optionHtml = this._humanOptions.map(option => {
      const selected = this._isSameHumanChoice(option, this._selectedHumanBonus);
      return `
        <div class="follower-human-bonus-card ${selected ? 'selected' : ''}">
          <h5>${option.label}</h5>
          <p>${option.description}</p>
          <button type="button" class="select-human-bonus-btn" data-template="${option.templateType}" data-bonus="${option.bonusType}" data-value="${option.value || ''}">
            ${selected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `;
    }).join('');
    return `
      <section class="follower-detail-section">
        <h4>Human Follower Bonus</h4>
        <p class="step-help">Human followers do not gain the normal Human bonus feat or trained skill by default. Choose one benefit from any follower template other than their own.</p>
        <div class="follower-human-bonus-grid">${optionHtml}</div>
      </section>
    `;
  }

  _renderBackgroundSection() {
    if (!this._backgroundEnabled) {
      return `
        <section class="follower-detail-section">
          <h4>Background</h4>
          <p class="step-help">Follower backgrounds are disabled by campaign houserule.</p>
        </section>
      `;
    }
    const backgroundHtml = (this._backgrounds || []).map(bg => {
      const key = bg.slug || bg.id || bg._id || bg.name;
      const selected = this._selectedBackground === key;
      return `
        <div class="follower-background-item ${selected ? 'selected' : ''}">
          <h5>${bg.name || key}</h5>
          <p>${bg.shortDescription || bg.description || bg.narrativeDescription || ''}</p>
          <button type="button" class="select-background-btn" data-background="${key}">${selected ? '✓ Selected' : 'Select'}</button>
        </div>
      `;
    }).join('');
    return `
      <section class="follower-detail-section">
        <h4>Background</h4>
        <p class="step-help">Background selection is enabled by default and can be switched off by houserule. It is optional for followers.</p>
        ${this._backgrounds.length ? `<div class="follower-background-list">${backgroundHtml}</div>` : '<p class="step-help">No backgrounds are available from the registry in this context.</p>'}
        ${this._selectedBackground ? '<button type="button" class="clear-background-btn">Clear Background</button>' : ''}
      </section>
    `;
  }

  _renderSkillsSection() {
    const titleCase = String(this._templateType || '').charAt(0).toUpperCase() + String(this._templateType || '').slice(1);
    if (this._templateType === 'aggressive' || this._templateType === 'defensive') {
      return `
        <section class="follower-detail-section">
          <h4>${titleCase} Skills</h4>
          <p class="step-help">${titleCase} followers are trained in Endurance.</p>
          <div class="follower-skills-list"><div class="skill-item forced"><span class="skill-name">Endurance</span><span class="skill-badge">Forced</span></div></div>
        </section>
      `;
    }
    const skillHtml = (this._availableSkills || []).map(skill => {
      const selected = this._selectedSkills.includes(skill);
      return `
        <div class="follower-skill-item ${selected ? 'selected' : ''}">
          <input type="checkbox" class="skill-checkbox" data-skill="${skill}" ${selected ? 'checked' : ''}>
          <label class="skill-label">${skill}</label>
        </div>
      `;
    }).join('');
    return `
      <section class="follower-detail-section">
        <h4>Utility Skills</h4>
        <p class="step-help">Utility followers may choose one trained skill. Use the Force is excluded.</p>
        <div class="follower-skills-list">${skillHtml}</div>
      </section>
    `;
  }

  _renderLanguageSection() {
    const forcedHtml = this._forcedLanguages.map(lang => `
      <div class="follower-language-item native"><span class="language-name">${lang}</span><span class="language-badge">Forced</span></div>
    `).join('');
    const selectedCount = this._selectedLanguages.length;
    const ownerSelected = this._selectedLanguages.some(lang => this._ownerLanguages.includes(lang));
    const ownerHtml = this._ownerLanguages.map(lang => this._renderLanguageCheckbox(lang, 'owner')).join('');
    const otherHtml = this._allLanguages.filter(lang => !this._ownerLanguages.includes(lang)).map(lang => this._renderLanguageCheckbox(lang, 'bonus')).join('');

    return `
      <section class="follower-detail-section">
        <h4>Languages</h4>
        <p class="step-help">Followers know species languages and Basic, then choose one language known by the controlling player plus normal positive-INT bonus languages.</p>
        <h5>Forced Languages</h5>
        <div class="follower-languages-native">${forcedHtml}</div>
        <p><strong>Language picks:</strong> ${selectedCount} / ${this._pickCount}</p>
        ${this._pickCount > 0 && this._ownerLanguages.length > 0 && !ownerSelected ? '<p class="warning">At least one selected language must be known by the owner.</p>' : ''}
        ${this._pickCount > 0 ? `
          <h5>Owner Known Languages</h5>
          ${this._ownerLanguages.length ? `<div class="follower-languages-shared">${ownerHtml}</div>` : '<p class="step-help">The owner has no additional language records to choose from.</p>'}
          <h5>Other Bonus Language Options</h5>
          <div class="follower-languages-shared">${otherHtml}</div>
        ` : '<p class="step-help">This follower has no bonus language picks.</p>'}
      </section>
    `;
  }

  _renderLanguageCheckbox(lang, source) {
    const selected = this._selectedLanguages.includes(lang);
    return `
      <div class="follower-language-item ${selected ? 'selected' : ''}">
        <input type="checkbox" class="language-checkbox" data-language="${lang}" data-source="${source}" ${selected ? 'checked' : ''}>
        <label class="language-label">${lang}</label>
        ${source === 'owner' ? '<span class="language-badge">Owner</span>' : ''}
      </div>
    `;
  }

  _attachListeners(shell, container) {
    container.querySelectorAll('.select-human-bonus-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        this._selectedHumanBonus = {
          templateType: button.dataset.template,
          bonusType: button.dataset.bonus,
          value: button.dataset.value || null
        };
        this.saveFollowerChoice(shell, 'humanTemplateBonus', this._selectedHumanBonus);
        shell.render();
      });
    });

    container.querySelectorAll('.select-background-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        this._selectedBackground = button.dataset.background;
        this.saveFollowerChoice(shell, 'backgroundChoice', this._selectedBackground);
        shell.render();
      });
    });
    container.querySelector('.clear-background-btn')?.addEventListener('click', event => {
      event.preventDefault();
      this._selectedBackground = null;
      this.saveFollowerChoice(shell, 'backgroundChoice', null);
      shell.render();
    });

    container.querySelectorAll('.skill-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const skill = checkbox.dataset.skill;
        this._selectedSkills = checkbox.checked ? [skill] : this._selectedSkills.filter(value => value !== skill);
        this.saveFollowerChoice(shell, 'skillChoices', this._selectedSkills);
        shell.render();
      });
    });

    container.querySelectorAll('.language-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const language = checkbox.dataset.language;
        if (checkbox.checked) {
          if (this._selectedLanguages.length >= this._pickCount) {
            checkbox.checked = false;
            ui?.notifications?.warn?.(`You may select only ${this._pickCount} bonus language${this._pickCount === 1 ? '' : 's'}.`);
            return;
          }
          if (!this._selectedLanguages.includes(language)) this._selectedLanguages.push(language);
        } else {
          this._selectedLanguages = this._selectedLanguages.filter(lang => lang !== language);
        }
        this.saveFollowerChoice(shell, 'languageChoices', this._allChosenLanguages());
        shell.render();
      });
    });
  }

  async onStepCommit(shell) {
    if (this._humanBonusApplicable && !this._selectedHumanBonus) {
      ui?.notifications?.warn?.('Choose one Human follower cross-template bonus.');
      return false;
    }

    if (this._templateType === 'utility' && this._selectedSkills.length > 1) {
      ui?.notifications?.warn?.('Utility followers may choose only one trained skill.');
      return false;
    }

    if (this._templateType === 'aggressive' || this._templateType === 'defensive') {
      this._selectedSkills = ['Endurance'];
    }

    if (this._selectedLanguages.length < this._pickCount) {
      ui?.notifications?.warn?.(`Choose ${this._pickCount} bonus language${this._pickCount === 1 ? '' : 's'} for this follower.`);
      return false;
    }

    if (this._pickCount > 0 && this._ownerLanguages.length > 0) {
      const ownerSelected = this._selectedLanguages.some(lang => this._ownerLanguages.includes(lang));
      if (!ownerSelected) {
        ui?.notifications?.warn?.('Choose at least one language known by the controlling owner.');
        return false;
      }
    }

    this.saveFollowerChoice(shell, 'skillChoices', this._selectedSkills);
    this.saveFollowerChoice(shell, 'languageChoices', this._allChosenLanguages());
    if (this._backgroundEnabled && this._selectedBackground) this.saveFollowerChoice(shell, 'backgroundChoice', this._selectedBackground);
    if (this._selectedHumanBonus) this.saveFollowerChoice(shell, 'humanTemplateBonus', this._selectedHumanBonus);
    return true;
  }

  async _loadBackgrounds() {
    try {
      const { BackgroundRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/background-registry.js');
      await BackgroundRegistry.ensureLoaded?.();
      const backgrounds = typeof BackgroundRegistry.getAll === 'function'
        ? (await BackgroundRegistry.getAll()) || []
        : (await BackgroundRegistry.all?.()) || [];
      this._backgrounds = backgrounds.map(bg => ({
        id: bg.id || bg._id || bg.slug || bg.name,
        _id: bg._id,
        slug: bg.slug || bg.id,
        name: bg.name || bg.label || bg.slug,
        description: bg.description,
        shortDescription: bg.shortDescription,
        narrativeDescription: bg.narrativeDescription
      })).filter(bg => bg.name);
    } catch (err) {
      swseLogger.warn('[FollowerDetailsStep] Could not load backgrounds:', err);
      this._backgrounds = [];
    }
  }

  _buildHumanOptions(currentTemplate) {
    const options = [];
    for (const [templateType, template] of Object.entries(this._templates || {})) {
      if (templateType === currentTemplate) continue;
      const display = this._displayTemplate(templateType);
      for (const ability of this.getTemplateAbilityOptions(templateType)) {
        options.push({
          templateType,
          bonusType: 'ability',
          value: ability,
          label: `${display}: +${template.abilityBonus || 2} ${ability.toUpperCase()}`,
          description: `Apply the ${display} template's ability bonus to ${ability.toUpperCase()}.`
        });
      }
      for (const [defense, bonus] of Object.entries(template.defenseBonus || {})) {
        options.push({
          templateType,
          bonusType: 'defense',
          value: defense,
          label: `${display}: +${bonus} ${this._displayDefense(defense)} Defense`,
          description: `Apply the ${display} template's ${this._displayDefense(defense)} Defense bonus.`
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
      for (const feat of template.feats || []) {
        options.push({
          templateType,
          bonusType: 'feat',
          value: feat,
          label: `${display}: ${feat}`,
          description: `Gain this template feat from the ${display} template.`
        });
      }
    }
    return options;
  }

  _allChosenLanguages() {
    return this._uniqueStrings([...this._forcedLanguages, ...this._selectedLanguages]);
  }

  _isSameHumanChoice(a, b) {
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
