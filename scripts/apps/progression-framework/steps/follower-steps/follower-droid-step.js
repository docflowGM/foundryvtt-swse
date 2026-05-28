/**
 * Droid follower configuration.
 *
 * Droid followers use a constrained follower droid chassis, not the full PC droid
 * build route. This step records the fixed chassis choices needed by the deriver
 * and creator.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';

const ALLOWED_ABILITIES = ['str', 'dex', 'int', 'wis', 'cha'];
const BASE_SYSTEMS = [
  { id: 'heuristic', name: 'Heuristic Processor', category: 'processor', cost: 2000, included: true },
  { id: 'hand-appendage-1', name: 'Hand Appendage', category: 'appendages', cost: 50, included: true },
  { id: 'hand-appendage-2', name: 'Hand Appendage', category: 'appendages', cost: 50, included: true },
  { id: 'walking', name: 'Walking Locomotion', category: 'locomotion', cost: 360, included: true }
];
const OPTIONAL_SYSTEMS = [
  { id: 'probe-appendage', name: 'Probe Appendage', category: 'appendages', cost: 2 },
  { id: 'instrument-appendage', name: 'Instrument Appendage', category: 'appendages', cost: 5 },
  { id: 'tool-appendage', name: 'Tool Appendage', category: 'appendages', cost: 10 },
  { id: 'claw-appendage', name: 'Claw Appendage', category: 'appendages', cost: 20 },
  { id: 'hand-appendage', name: 'Hand Appendage', category: 'appendages', cost: 50 },
  { id: 'internal-comlink', name: 'Internal Comlink', category: 'communication', cost: 250 },
  { id: 'vocabulator', name: 'Vocabulator', category: 'communication', cost: 50 },
  { id: 'internal-storage', name: 'Internal Storage / Compartment Space', category: 'compartment', cost: 50 },
  { id: 'secret-compartment', name: 'Secret Compartment', category: 'compartment', cost: 600 },
  { id: 'improved-sensor-package', name: 'Improved Sensor Package', category: 'sensor', cost: 200 },
  { id: 'darkvision', name: 'Darkvision', category: 'sensor', cost: 150 },
  { id: 'sensor-booster', name: 'Sensor Booster', category: 'sensor', cost: 200 },
  { id: 'basic-translator', name: 'Basic Translator Unit', category: 'translator', cost: 100 },
  { id: 'advanced-translator', name: 'Advanced Translator Unit', category: 'translator', cost: 250 },
  { id: 'universal-translator', name: 'Universal Translator Unit', category: 'translator', cost: 500 }
];

export class FollowerDroidStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._choices = null;
    this._isApplicable = false;
    this._allowSizeChoice = false;
    this._config = null;
  }

  async onStepEnter(shell) {
    this._choices = this.getFollowerChoices(shell);
    this._isApplicable = this.isDroidSpeciesRecord({ name: this._choices.speciesName });
    this._allowSizeChoice = HouseRuleService.getBoolean('allowDroidFollowerSizeChoice', false);
    if (!this._isApplicable) return;

    const existing = this._choices.droidConfig || {};
    this._config = {
      isDroid: true,
      abilityChoice: existing.abilityChoice || 'int',
      size: this._allowSizeChoice ? (existing.size || 'medium') : 'medium',
      locomotion: existing.locomotion || 'walking',
      speed: 6,
      baseSystems: BASE_SYSTEMS,
      optionalSystems: Array.isArray(existing.optionalSystems) ? existing.optionalSystems : [],
      allowedOptionalCategories: ['appendages', 'communication', 'compartment', 'sensor', 'translator'],
      unspentCreditsLost: true
    };
    this.saveFollowerChoice(shell, 'droidConfig', this._config);
  }

  async onRender(shell, html, context) {
    const container = html.querySelector('[data-step-content]');
    if (!container) return;

    if (!this._isApplicable) {
      container.innerHTML = `
        <div class="follower-step-content">
          <h3>Droid Follower Configuration</h3>
          <p class="step-help">This step applies only to droid followers.</p>
        </div>
      `;
      return;
    }

    const abilityHtml = ALLOWED_ABILITIES.map(key => `
      <label class="follower-droid-option">
        <input type="radio" name="droidAbility" value="${key}" ${this._config.abilityChoice === key ? 'checked' : ''}>
        +2 ${key.toUpperCase()}
      </label>
    `).join('');

    const sizeHtml = this._allowSizeChoice
      ? ['small', 'medium', 'large'].map(size => `
          <label class="follower-droid-option">
            <input type="radio" name="droidSize" value="${size}" ${this._config.size === size ? 'checked' : ''}>
            ${size.charAt(0).toUpperCase() + size.slice(1)}
          </label>
        `).join('')
      : '<p class="step-help">Medium size is enforced by campaign rules.</p>';

    const locomotionHtml = ['walking', 'tracked'].map(type => `
      <label class="follower-droid-option">
        <input type="radio" name="droidLocomotion" value="${type}" ${this._config.locomotion === type ? 'checked' : ''}>
        ${type.charAt(0).toUpperCase() + type.slice(1)} Locomotion, speed 6
      </label>
    `).join('');

    const baseHtml = BASE_SYSTEMS.map(system => `<li>${system.name}</li>`).join('');
    const optionalHtml = OPTIONAL_SYSTEMS.map(system => {
      const selected = this._config.optionalSystems.some(item => item.id === system.id);
      return `
        <label class="follower-droid-system ${selected ? 'selected' : ''}">
          <input type="checkbox" class="droid-system-checkbox" data-id="${system.id}" ${selected ? 'checked' : ''}>
          <span>${system.name}</span>
          <small>${system.category}; ${system.cost} cr</small>
        </label>
      `;
    }).join('');

    container.innerHTML = `
      <div class="follower-step-content">
        <h3>Droid Follower Configuration</h3>
        <p class="step-help">Droid followers use 10 in all abilities, no Constitution score, and +2 to one ability of your choice.</p>

        <h4>Ability Bonus</h4>
        <div class="follower-droid-options">${abilityHtml}</div>

        <h4>Size</h4>
        <div class="follower-droid-options">${sizeHtml}</div>

        <h4>Locomotion</h4>
        <div class="follower-droid-options">${locomotionHtml}</div>

        <h4>Included Starting Systems</h4>
        <ul>${baseHtml}</ul>

        <h4>Allowed Droid System Spending</h4>
        <p class="step-help">When starting credits are resolved on the summary screen, droid followers may spend that budget only on appendages, communication systems, compartment space, sensor systems, and translator units. Unspent credits are lost.</p>
        <div class="follower-droid-system-grid">${optionalHtml}</div>
      </div>
    `;

    this._attachListeners(shell, container);
  }

  async onStepCommit(shell) {
    if (!this._isApplicable) return true;
    if (!this._config?.abilityChoice) {
      ui?.notifications?.warn?.('Choose the droid follower +2 ability score.');
      return false;
    }
    this.saveFollowerChoice(shell, 'droidConfig', this._config);
    return true;
  }

  _attachListeners(shell, container) {
    container.querySelectorAll('input[name="droidAbility"]').forEach(input => {
      input.addEventListener('change', () => {
        this._config.abilityChoice = input.value;
        this.saveFollowerChoice(shell, 'droidConfig', this._config);
      });
    });
    container.querySelectorAll('input[name="droidSize"]').forEach(input => {
      input.addEventListener('change', () => {
        this._config.size = input.value;
        this.saveFollowerChoice(shell, 'droidConfig', this._config);
      });
    });
    container.querySelectorAll('input[name="droidLocomotion"]').forEach(input => {
      input.addEventListener('change', () => {
        this._config.locomotion = input.value;
        this._config.speed = 6;
        this._config.baseSystems = BASE_SYSTEMS.map(system => system.id === 'walking'
          ? { ...system, id: input.value, name: `${input.value.charAt(0).toUpperCase() + input.value.slice(1)} Locomotion` }
          : system);
        this.saveFollowerChoice(shell, 'droidConfig', this._config);
      });
    });
    container.querySelectorAll('.droid-system-checkbox').forEach(input => {
      input.addEventListener('change', () => {
        const selected = new Set(this._config.optionalSystems.map(item => item.id));
        if (input.checked) selected.add(input.dataset.id);
        else selected.delete(input.dataset.id);
        this._config.optionalSystems = OPTIONAL_SYSTEMS.filter(system => selected.has(system.id));
        this.saveFollowerChoice(shell, 'droidConfig', this._config);
        shell.render();
      });
    });
  }

  getUtilityBarConfig() {
    return { showSearch: false, showSort: false, showFilter: false };
  }
}
