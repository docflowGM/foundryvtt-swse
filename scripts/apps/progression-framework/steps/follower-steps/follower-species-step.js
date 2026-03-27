/**
 * FollowerSpeciesStep
 *
 * Constrained species selection for followers.
 * Shows only follower-compatible species from the registry.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerSpeciesStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._allSpecies = [];
    this._filteredSpecies = [];
    this._searchQuery = '';
    this._selectedSpeciesName = null;
  }

  async onStepEnter(shell) {
    try {
      // Load follower-compatible species
      this._allSpecies = await this.getFollowerCompatibleSpecies();
      this._filteredSpecies = [...this._allSpecies];

      swseLogger.log('[FollowerSpeciesStep] Entered, available species:', this._allSpecies.length);

      // Restore selection from session if available
      const choices = this.getFollowerChoices(shell);
      if (choices.speciesName) {
        this._selectedSpeciesName = choices.speciesName;
      }
    } catch (err) {
      swseLogger.error('[FollowerSpeciesStep] Error entering step:', err);
      ui?.notifications?.error?.('Failed to load species list. Please reload.');
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) {
        swseLogger.warn('[FollowerSpeciesStep] No step content container found');
        return;
      }

      // Build species grid
      const gridHtml = this._renderSpeciesGrid();
      container.innerHTML = gridHtml;

      // Attach event listeners
      this._attachSpeciesListeners(shell, container);
    } catch (err) {
      swseLogger.error('[FollowerSpeciesStep] Error rendering:', err);
    }
  }

  _renderSpeciesGrid() {
    const species = this._filteredSpecies || this._allSpecies || [];

    const speciesHtml = species.map(spec => {
      const isSelected = this._selectedSpeciesName === spec.name;
      return `
        <div class="follower-species-card ${isSelected ? 'selected' : ''}" data-species="${spec.name}">
          <div class="species-card-header">
            <h4>${spec.name}</h4>
          </div>
          <div class="species-card-body">
            <p class="species-description">${spec.description || 'No description'}</p>
          </div>
          <button class="select-species-btn" data-species="${spec.name}">
            ${isSelected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="follower-step-content">
        <h3>Select Follower Species</h3>
        <p class="step-help">Followers must be sentient beings. Choose the follower's species from available options.</p>
        <div class="follower-species-grid">
          ${speciesHtml}
        </div>
      </div>
    `;
  }

  _attachSpeciesListeners(shell, container) {
    const buttons = container.querySelectorAll('.select-species-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const speciesName = btn.getAttribute('data-species');
        this._selectSpecies(shell, speciesName);
      });
    });
  }

  _selectSpecies(shell, speciesName) {
    this._selectedSpeciesName = speciesName;
    this.saveFollowerChoice(shell, 'speciesName', speciesName);
    swseLogger.log('[FollowerSpeciesStep] Selected species:', speciesName);

    // Re-render to show selection highlight
    shell.render();
  }

  async onStepCommit(shell) {
    if (!this._selectedSpeciesName) {
      ui?.notifications?.warn?.('Please select a species for your follower.');
      return false;
    }

    this.saveFollowerChoice(shell, 'speciesName', this._selectedSpeciesName);
    swseLogger.log('[FollowerSpeciesStep] Committed species:', this._selectedSpeciesName);
    return true;
  }

  getUtilityBarConfig() {
    return {
      showSearch: true,
      showSort: true,
      showFilter: false,
    };
  }
}
