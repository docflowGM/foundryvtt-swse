/**
 * FollowerSpeciesStep
 *
 * Step 2 of the compact follower builder. Living beings choose a species here.
 * Droid followers configure chassis size, locomotion, allowed systems, and the
 * single +2 ability in this same step.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';

const ALLOWED_DROID_ABILITIES = ['str', 'dex', 'int', 'wis', 'cha'];
const BASE_DROID_SYSTEMS = [
  { id: 'heuristic', name: 'Heuristic Processor', category: 'processor', cost: 2000, included: true },
  { id: 'appendage-1', name: 'Appendage', category: 'appendages', cost: 50, included: true },
  { id: 'appendage-2', name: 'Appendage', category: 'appendages', cost: 50, included: true },
  { id: 'walking', name: 'Walking Locomotion', category: 'locomotion', cost: 360, included: true }
];
const OPTIONAL_DROID_SYSTEMS = [
  { id: 'probe-appendage', name: 'Probe Appendage', category: 'appendages', cost: 2 },
  { id: 'instrument-appendage', name: 'Instrument Appendage', category: 'appendages', cost: 5 },
  { id: 'tool-appendage', name: 'Tool Appendage', category: 'appendages', cost: 10 },
  { id: 'claw-appendage', name: 'Claw Appendage', category: 'appendages', cost: 20 },
  { id: 'hand-appendage', name: 'Hand Appendage', category: 'appendages', cost: 50 },
  { id: 'internal-comlink', name: 'Internal Comlink', category: 'communication', cost: 250 },
  { id: 'vocabulator', name: 'Vocabulator', category: 'communication', cost: 50 },
  { id: 'compartment-space', name: 'Compartment Space', category: 'compartment', cost: 50 },
  { id: 'secret-compartment', name: 'Secret Compartment', category: 'compartment', cost: 600 },
  { id: 'improved-sensor-package', name: 'Improved Sensor Package', category: 'sensor', cost: 200 },
  { id: 'darkvision', name: 'Darkvision', category: 'sensor', cost: 150 },
  { id: 'sensor-booster', name: 'Sensor Booster', category: 'sensor', cost: 200 },
  { id: 'basic-translator', name: 'Basic Translator Unit', category: 'translator', cost: 100 },
  { id: 'advanced-translator', name: 'Advanced Translator Unit', category: 'translator', cost: 250 },
  { id: 'universal-translator', name: 'Universal Translator Unit', category: 'translator', cost: 500 }
];

export class FollowerSpeciesStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._allSpecies = [];
    this._filteredSpecies = [];
    this._selectedSpeciesName = null;
    this._isDroidPath = false;
    this._allowSizeChoice = false;
    this._droidConfig = null;
  }

  async onStepEnter(shell) {
    try {
      const choices = this.getFollowerChoices(shell);
      this._isDroidPath = choices.followerKind === 'droid' || choices.droidConfig?.isDroid === true;
      this._allowSizeChoice = HouseRuleService.getBoolean('allowDroidFollowerSizeChoice', false);

      if (this._isDroidPath) {
        this._selectedSpeciesName = 'Droid';
        this._droidConfig = this._buildDroidConfig(choices.droidConfig || {});
        this.saveFollowerChoice(shell, 'speciesName', 'Droid');
        this.saveFollowerChoice(shell, 'droidConfig', this._droidConfig);
        return;
      }

      this._allSpecies = await this.getFollowerCompatibleSpecies();
      this._filteredSpecies = [...this._allSpecies];
      this._selectedSpeciesName = choices.speciesName || null;
      swseLogger.log('[FollowerSpeciesStep] Living species loaded:', this._allSpecies.length);
    } catch (err) {
      swseLogger.error('[FollowerSpeciesStep] Error entering step:', err);
      ui?.notifications?.error?.('Failed to load follower species/chassis options. Please reload.');
    }
  }

  async onRender(shell, html) {
    const container = html.querySelector('[data-step-content]');
    if (!container) return;

    container.innerHTML = this._isDroidPath ? this._renderDroidConfiguration() : this._renderSpeciesGrid();
    if (this._isDroidPath) this._attachDroidListeners(shell, container);
    else this._attachSpeciesListeners(shell, container);
  }

  _buildDroidConfig(existing = {}) {
    const size = this._allowSizeChoice ? (existing.size || 'medium') : 'medium';
    const locomotion = existing.locomotion || 'walking';
    return {
      isDroid: true,
      abilityChoice: existing.abilityChoice || 'int',
      size,
      locomotion,
      speed: 6,
      baseSystems: this._baseSystemsForLocomotion(locomotion),
      optionalSystems: Array.isArray(existing.optionalSystems) ? existing.optionalSystems : [],
      allowedOptionalCategories: ['appendages', 'communication', 'compartment', 'sensor', 'translator'],
      unspentCreditsLost: true
    };
  }

  _baseSystemsForLocomotion(locomotion) {
    return BASE_DROID_SYSTEMS.map(system => system.id === 'walking'
      ? { ...system, id: locomotion, name: `${locomotion.charAt(0).toUpperCase() + locomotion.slice(1)} Locomotion` }
      : system);
  }

  _renderDroidConfiguration() {
    const abilityHtml = ALLOWED_DROID_ABILITIES.map(key => `
      <label class="follower-droid-option">
        <input type="radio" name="droidAbility" value="${key}" ${this._droidConfig.abilityChoice === key ? 'checked' : ''}>
        +2 ${key.toUpperCase()}
      </label>
    `).join('');

    const sizeHtml = this._allowSizeChoice
      ? ['small', 'medium', 'large'].map(size => `
          <label class="follower-droid-option">
            <input type="radio" name="droidSize" value="${size}" ${this._droidConfig.size === size ? 'checked' : ''}>
            ${size.charAt(0).toUpperCase() + size.slice(1)}
          </label>
        `).join('')
      : '<p class="step-help">Medium size is enforced by campaign rules.</p>';

    const locomotionHtml = ['walking', 'tracked'].map(type => `
      <label class="follower-droid-option">
        <input type="radio" name="droidLocomotion" value="${type}" ${this._droidConfig.locomotion === type ? 'checked' : ''}>
        ${type.charAt(0).toUpperCase() + type.slice(1)} locomotion, speed 6
      </label>
    `).join('');

    const selected = new Set((this._droidConfig.optionalSystems || []).map(system => system.id));
    const optionalHtml = OPTIONAL_DROID_SYSTEMS.map(system => `
      <label class="follower-droid-system ${selected.has(system.id) ? 'selected' : ''}">
        <input type="checkbox" class="droid-system-checkbox" data-id="${system.id}" ${selected.has(system.id) ? 'checked' : ''}>
        <span>${system.name}</span>
        <small>${system.category}; ${system.cost} cr</small>
      </label>
    `).join('');

    return `
      <div class="follower-step-content">
        <h3>Droid Follower Chassis</h3>
        <p class="step-help">Droid followers start with a heuristic processor, two appendages, and a locomotion system. Starting credits are resolved on the summary screen and may be spent only on the allowed systems below; unspent credits are lost.</p>

        <h4>Size</h4>
        <div class="follower-droid-options">${sizeHtml}</div>

        <h4>Mobility</h4>
        <div class="follower-droid-options">${locomotionHtml}</div>

        <h4>Ability Bonus</h4>
        <p class="step-help">Droids have no Constitution score and gain +2 to one of the other five abilities.</p>
        <div class="follower-droid-options">${abilityHtml}</div>

        <h4>Included Starting Systems</h4>
        <ul>${this._droidConfig.baseSystems.map(system => `<li>${system.name}</li>`).join('')}</ul>

        <h4>Allowed Droid System Spending</h4>
        <div class="follower-droid-system-grid">${optionalHtml}</div>
      </div>
    `;
  }

  _renderSpeciesGrid() {
    const speciesHtml = (this._filteredSpecies || this._allSpecies || []).map(spec => {
      const isSelected = this._selectedSpeciesName === spec.name;
      return `
        <div class="follower-species-card ${isSelected ? 'selected' : ''}" data-species="${spec.name}">
          <div class="species-card-header"><h4>${spec.name}</h4></div>
          <div class="species-card-body"><p class="species-description">${spec.description || 'No description'}</p></div>
          <button type="button" class="select-species-btn" data-species="${spec.name}">
            ${isSelected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="follower-step-content">
        <h3>Select Living Follower Species</h3>
        <p class="step-help">Living followers use normal species languages and traits, then apply follower template rules.</p>
        <div class="follower-species-grid">${speciesHtml}</div>
      </div>
    `;
  }

  _attachSpeciesListeners(shell, container) {
    container.querySelectorAll('.select-species-btn').forEach(btn => {
      btn.addEventListener('click', event => {
        event.preventDefault();
        const speciesName = btn.getAttribute('data-species');
        this._selectedSpeciesName = speciesName;
        this.saveFollowerChoice(shell, 'speciesName', speciesName);
        const selected = (this._allSpecies || []).find(spec => spec.name === speciesName);
        this.saveFollowerChoice(shell, 'speciesId', selected?.id || selected?._id || null);
        if (!this.isHumanSpecies(speciesName)) this.saveFollowerChoice(shell, 'humanTemplateBonus', null);
        this.saveFollowerChoice(shell, 'droidConfig', null);
        shell.render();
      });
    });
  }

  _attachDroidListeners(shell, container) {
    container.querySelectorAll('input[name="droidAbility"]').forEach(input => {
      input.addEventListener('change', () => {
        this._droidConfig.abilityChoice = input.value;
        this._saveDroidConfig(shell);
      });
    });
    container.querySelectorAll('input[name="droidSize"]').forEach(input => {
      input.addEventListener('change', () => {
        this._droidConfig.size = input.value;
        this._saveDroidConfig(shell);
      });
    });
    container.querySelectorAll('input[name="droidLocomotion"]').forEach(input => {
      input.addEventListener('change', () => {
        this._droidConfig.locomotion = input.value;
        this._droidConfig.speed = 6;
        this._droidConfig.baseSystems = this._baseSystemsForLocomotion(input.value);
        this._saveDroidConfig(shell);
        shell.render();
      });
    });
    container.querySelectorAll('.droid-system-checkbox').forEach(input => {
      input.addEventListener('change', () => {
        const selected = new Set((this._droidConfig.optionalSystems || []).map(system => system.id));
        if (input.checked) selected.add(input.dataset.id);
        else selected.delete(input.dataset.id);
        this._droidConfig.optionalSystems = OPTIONAL_DROID_SYSTEMS.filter(system => selected.has(system.id));
        this._saveDroidConfig(shell);
        shell.render();
      });
    });
  }

  _saveDroidConfig(shell) {
    this.saveFollowerChoice(shell, 'followerKind', 'droid');
    this.saveFollowerChoice(shell, 'speciesName', 'Droid');
    this.saveFollowerChoice(shell, 'droidConfig', this._droidConfig);
  }

  async onStepCommit(shell) {
    if (this._isDroidPath) {
      if (!this._droidConfig?.abilityChoice) {
        ui?.notifications?.warn?.('Choose the droid follower +2 ability score.');
        return false;
      }
      this._saveDroidConfig(shell);
      return true;
    }

    if (!this._selectedSpeciesName) {
      ui?.notifications?.warn?.('Please select a species for your follower.');
      return false;
    }
    this.saveFollowerChoice(shell, 'speciesName', this._selectedSpeciesName);
    return true;
  }

  getUtilityBarConfig() {
    return { showSearch: true, showSort: true, showFilter: false };
  }
}
