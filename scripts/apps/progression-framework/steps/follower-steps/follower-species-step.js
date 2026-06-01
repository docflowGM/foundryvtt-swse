/**
 * FollowerSpeciesStep
 *
 * Thin adapter over the mature SpeciesStep. Living followers use the exact same
 * species browser/details rail as normal chargen. Droid followers keep the
 * follower-only chassis configuration because that rule contract is different.
 */

import { SpeciesStep } from '../species-step.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

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

export class FollowerSpeciesStep extends SpeciesStep {
  constructor(descriptor) {
    super(descriptor);
    this._isDroidPath = false;
    this._allowSizeChoice = false;
    this._droidConfig = null;
  }

  async onStepEnter(shell) {
    const choices = this._getFollowerChoices(shell);
    this._isDroidPath = choices.followerKind === 'droid' || choices.droidConfig?.isDroid === true;
    this._allowSizeChoice = HouseRuleService.getBoolean('allowDroidFollowerSizeChoice', false);

    if (this._isDroidPath) {
      this._committedSpeciesId = 'droid';
      this._committedSpeciesName = 'Droid';
      this._droidConfig = this._buildDroidConfig(choices.droidConfig || {});
      this._saveFollowerChoice(shell, 'speciesName', 'Droid');
      this._saveFollowerChoice(shell, 'speciesId', null);
      this._saveFollowerChoice(shell, 'droidConfig', this._droidConfig);
      return;
    }

    await super.onStepEnter(shell);
    this._allSpecies = (this._allSpecies || []).filter(species => !this._isDroidSpeciesRecord(species));
    this._applyFilters?.();

    const draft = shell?.progressionSession?.draftSelections || {};
    const species = draft.species || null;
    if (species?.id || species?.name) {
      this._committedSpeciesId = species.id || species.speciesId || species.name;
      this._committedSpeciesName = species.name || species.speciesName || species.id;
      this._saveFollowerChoice(shell, 'speciesName', this._committedSpeciesName);
      this._saveFollowerChoice(shell, 'speciesId', this._committedSpeciesId);
    }
  }

  async getStepData(context) {
    if (!this._isDroidPath) return super.getStepData(context);
    return { stepId: this.descriptor?.stepId, droidConfig: this._droidConfig };
  }

  renderWorkSurface(stepData) {
    if (!this._isDroidPath) return super.renderWorkSurface(stepData);
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/follower-work-surface.hbs',
      data: { stepId: this.descriptor?.stepId, ...stepData }
    };
  }

  async afterRender(shell, workSurfaceEl) {
    if (!this._isDroidPath) return super.afterRender(shell, workSurfaceEl);
    this._renderDroidStep(shell, workSurfaceEl);
  }


  renderDetailsPanel(focusedItem) {
    if (!focusedItem) return this.renderDetailsPanelEmptyState?.() || {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: { message: 'Select a species to see details.' }
    };
    return super.renderDetailsPanel(focusedItem);
  }

  async onItemCommitted(id, shell) {
    if (this._isDroidPath) return;
    await super.onItemCommitted(id, shell);
    const draftSpecies = shell?.progressionSession?.draftSelections?.species || null;
    if (draftSpecies) {
      this._saveFollowerChoice(shell, 'speciesName', draftSpecies.name || draftSpecies.speciesName || id);
      this._saveFollowerChoice(shell, 'speciesId', draftSpecies.id || draftSpecies.speciesId || id);
      this._saveFollowerChoice(shell, 'speciesSelection', draftSpecies);
      this._saveFollowerChoice(shell, 'droidConfig', null);
    }
  }

  validate() {
    if (!this._isDroidPath) return super.validate();
    const ok = !!this._droidConfig?.abilityChoice;
    return { isValid: ok, errors: ok ? [] : ['Choose the droid follower +2 ability score.'], warnings: [] };
  }

  getBlockingIssues() {
    if (!this._isDroidPath) return super.getBlockingIssues();
    return this._droidConfig?.abilityChoice ? [] : ['Choose the droid follower +2 ability score.'];
  }

  getSelection() {
    if (!this._isDroidPath) return super.getSelection();
    return { selected: this._droidConfig?.abilityChoice ? ['Droid'] : [], count: this._droidConfig?.abilityChoice ? 1 : 0, isComplete: !!this._droidConfig?.abilityChoice };
  }

  _getFollowerChoices(shell) {
    const draft = shell?.progressionSession?.draftSelections || {};
    const persistent = shell?.progressionSession?.dependencyContext?.persistentChoices || {};
    return {
      followerKind: draft.followerKind ?? persistent.followerKind ?? null,
      speciesName: draft.speciesName ?? draft.species?.name ?? persistent.speciesName ?? null,
      droidConfig: draft.droidConfig ?? persistent.droidConfig ?? null
    };
  }

  _saveFollowerChoice(shell, choiceType, value) {
    if (!shell?.progressionSession) return;
    shell.progressionSession.draftSelections = shell.progressionSession.draftSelections || {};
    shell.progressionSession.draftSelections[choiceType] = value;
    shell.progressionSession.lastModifiedAt = Date.now();
  }

  _isDroidSpeciesRecord(species) {
    const name = String(species?.name || '').toLowerCase();
    const system = species?.system || species || {};
    return name === 'droid'
      || name.includes('droid')
      || system.speciesActsAsDroid === true
      || system.noConstitution === true
      || !!system.droidBuilder
      || (Array.isArray(system.tags) && system.tags.some(tag => String(tag).toLowerCase().includes('droid')));
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

  _renderDroidStep(shell, html) {
    const container = html?.querySelector?.('[data-step-content]');
    if (!container) return;
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

    container.innerHTML = `
      <div class="follower-step-content">
        <h3>Droid Follower Chassis</h3>
        <p class="step-help">Droid followers use a follower-only chassis step because they have no Constitution score and buy droid systems from their starting-credit budget.</p>
        <h4>Size</h4><div class="follower-droid-options">${sizeHtml}</div>
        <h4>Mobility</h4><div class="follower-droid-options">${locomotionHtml}</div>
        <h4>Ability Bonus</h4><div class="follower-droid-options">${abilityHtml}</div>
        <h4>Included Starting Systems</h4><ul>${this._droidConfig.baseSystems.map(system => `<li>${system.name}</li>`).join('')}</ul>
        <h4>Allowed Droid System Spending</h4><div class="follower-droid-system-grid">${optionalHtml}</div>
      </div>
    `;
    this._attachDroidListeners(shell, container);
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
    this._saveFollowerChoice(shell, 'followerKind', 'droid');
    this._saveFollowerChoice(shell, 'speciesName', 'Droid');
    this._saveFollowerChoice(shell, 'speciesId', null);
    this._saveFollowerChoice(shell, 'droidConfig', this._droidConfig);
  }
}
