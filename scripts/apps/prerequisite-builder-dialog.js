/**
 * PREREQUISITE BUILDER DIALOG
 *
 * Visual UI tool for authors to define prerequisite conditions for talents/feats
 * Supports all condition types: feats, talents, attributes, skills, Force, etc.
 */

import SWSEFormApplication from './base/swse-form-application.js';

export class PrerequisiteBuilderDialog extends SWSEFormApplication {
  constructor(object = {}, options = {}) {
    super(object, options);
    this.conditions = object.conditions ?? [];
    this.mode = object.type ?? 'all';
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplication.DEFAULT_OPTIONS ?? {},
    {
      id: 'prerequisite-builder',
      title: 'Prerequisite Builder',
      template: 'modules/foundryvtt-swse/templates/prerequisite-builder.html',
      position: { width: 700, height: 800 },
      resizable: true,
      classes: ['swse', 'prerequisite-builder']
    }
  );

  

  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }
async _prepareContext(options) {
    return {
      mode: this.mode,
      conditions: this.conditions,
      conditionTypes: this._getConditionTypes(),
      skills: this._getSkillList(),
      feats: this._getFeatList(),
      talents: this._getTalentList(),
      forcePowers: this._getForcePowerList(),
      abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha']
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Mode toggle
    root.querySelectorAll('input[name="mode"]').forEach(el => {
      el.addEventListener('change', e => {
        this.mode = e.target.value;
      });
    });

    // Add condition button
    const addBtn = root.querySelector('button.add-condition');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.conditions.push({
          type: 'feat',
          id: '',
          name: ''
        });
        this.render();
      });
    }

    // Remove condition
    root.querySelectorAll('button.remove-condition').forEach(el => {
      el.addEventListener('click', e => {
        const idx = parseInt(e.target.dataset.index);
        this.conditions.splice(idx, 1);
        this.render();
      });
    });

    // Update condition type
    root.querySelectorAll('select[name="type"]').forEach(el => {
      el.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.index);
        this.conditions[idx].type = e.target.value;
        this.render();
      });
    });

    // Update condition fields
    root.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.index);
        const field = e.target.name.split('[')[1]?.slice(0, -1);
        if (idx !== undefined && field) {
          this.conditions[idx][field] = e.target.value;
        }
      });
    });
  }

  _getConditionTypes() {
    return [
      { value: 'feat', label: 'Feat' },
      { value: 'featPattern', label: 'Any Feat Matching Pattern' },
      { value: 'talent', label: 'Talent' },
      { value: 'talentFromTree', label: 'Talent from Tree' },
      { value: 'attribute', label: 'Ability Score' },
      { value: 'skillTrained', label: 'Skill Trained' },
      { value: 'bab', label: 'Base Attack Bonus' },
      { value: 'level', label: 'Character Level' },
      { value: 'darkSideScore', label: 'Dark Side Score' },
      { value: 'darkSideScoreDynamic', label: 'Dark Side Score vs Ability' },
      { value: 'species', label: 'Species' },
      { value: 'forcePower', label: 'Force Power' },
      { value: 'forceTechnique', label: 'Force Technique' },
      { value: 'forceSecret', label: 'Force Secret' }
    ];
  }

  _getSkillList() {
    return Object.keys(game.system?.model?.Actor?.character?.skills ?? {})
      .map(key => ({ id: key, label: game.system?.model?.Actor?.character?.skills?.[key]?.label ?? key }));
  }

  _getFeatList() {
    return Array.from(game.items.values())
      .filter(i => i.type === 'feat')
      .map(i => ({ id: i.id, name: i.name }));
  }

  _getTalentList() {
    return Array.from(game.items.values())
      .filter(i => i.type === 'talent')
      .map(i => ({ id: i.id, name: i.name }));
  }

  _getForcePowerList() {
    return Array.from(game.items.values())
      .filter(i => i.type === 'forcepower')
      .map(i => ({ id: i.id, name: i.name }));
  }

  async _updateObject(event, formData) {
    return {
      type: this.mode,
      conditions: this.conditions
    };
  }

  /**
   * Static method to open builder and return result
   */
  static async build(existing = {}) {
    return new Promise((resolve) => {
      const dialog = new PrerequisiteBuilderDialog(existing, {
        buttons: {
          save: {
            label: 'Save Prerequisites',
            callback: async (html) => {
              const result = dialog._getCurrentState();
              resolve(result);
              dialog.close();
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => {
              resolve(null);
              dialog.close();
            }
          }
        }
      });
      dialog.render(true);
    });
  }

  _getCurrentState() {
    return {
      type: this.mode,
      conditions: this.conditions.filter(c => c.id || c.pattern || c.skill || c.ability)
    };
  }
}

/**
 * COMPACT BUILDER - Minimal inline builder for quick edits
 */
export class PrerequisiteCompactBuilder {
  static async buildCondition(doc, index) {
    const dialog = new Dialog({
      title: `Edit Condition ${index + 1}`,
      content: this._getTemplate(),
      buttons: {
        save: {
          label: 'Save',
          callback: (html) => {
            return this._parseForm(html);
          }
        },
        delete: {
          label: 'Delete',
          callback: () => {
            return 'DELETE';
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    });
    dialog.render(true);
  }

  static _getTemplate() {
    return `
      <form>
        <div class="form-group">
          <label>Condition Type</label>
          <select name="type" class="condition-type">
            <option value="feat">Feat</option>
            <option value="featPattern">Any Feat Matching Pattern</option>
            <option value="talent">Talent</option>
            <option value="talentFromTree">Talent from Tree</option>
            <option value="attribute">Ability Score</option>
            <option value="skillTrained">Skill Trained</option>
            <option value="bab">Base Attack Bonus</option>
            <option value="level">Character Level</option>
            <option value="darkSideScore">Dark Side Score</option>
            <option value="darkSideScoreDynamic">Dark Side Score vs Ability</option>
            <option value="species">Species</option>
            <option value="forcePower">Force Power</option>
            <option value="forceTechnique">Force Technique</option>
            <option value="forceSecret">Force Secret</option>
          </select>
        </div>
        <div id="condition-fields"></div>
      </form>
    `;
  }

  static _parseForm(html) {
    // Support both jQuery and HTMLElement
    const getVal = (selector) => {
      if (html instanceof HTMLElement) {
        return html.querySelector(selector)?.value ?? '';
      }
      const root = html instanceof HTMLElement ? html : html?.[0];
      return root?.querySelector?.(selector)?.value ?? '';
    };

    const type = getVal('[name="type"]');
    const result = { type };

    // Parse type-specific fields
    switch (type) {
      case 'feat':
      case 'talent':
        result.id = getVal('[name="id"]');
        result.name = getVal('[name="name"]');
        break;
      case 'featPattern':
      case 'forceSecret':
        result.pattern = getVal('[name="pattern"]');
        result.description = getVal('[name="description"]');
        break;
      case 'attribute':
      case 'darkSideScoreDynamic':
        result.ability = getVal('[name="ability"]');
        result.min = parseInt(getVal('[name="min"]'));
        break;
      case 'skillTrained':
        result.skill = getVal('[name="skill"]');
        break;
      case 'forcePower':
        result.names = getVal('[name="names"]').split(',').map(s => s.trim());
        break;
    }

    return result;
  }
}
