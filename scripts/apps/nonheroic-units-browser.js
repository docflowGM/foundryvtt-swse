/**
 * Nonheroic Units Browser Application
 * Provides a searchable, filterable interface for browsing and importing nonheroic units
 */

import SWSEApplication from './base/swse-application.js';
import { createActor } from '../core/document-api-v13.js';

export class NonheroicUnitsBrowser extends SWSEApplication {
  constructor(options = {}) {
    super(options);
    this.units = [];
    this.filteredUnits = [];
    this.searchTerm = '';
    this.challengeLevelFilter = 'all';
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEApplication.DEFAULT_OPTIONS ?? {},
    {
      id: 'nonheroic-units-browser',
      title: 'Nonheroic Units Browser',
      template: 'systems/foundryvtt-swse/templates/apps/nonheroic-units-browser.hbs',
      classes: ['swse', 'nonheroic-browser', 'swse-app'],
      position: { width: 800, height: 700 },
      resizable: true,
      scrollY: ['.units-list'],
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'browse' }]
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
    // Load units data if not already loaded
    if (this.units.length === 0) {
      try {
        const response = await fetch('systems/foundryvtt-swse/data/nonheroic/nonheroic_units.json');
        this.units = await response.json();
        this.filteredUnits = [...this.units];
      } catch (error) {
        swseLogger.error('Failed to load nonheroic units:', error);
        this.units = [];
        this.filteredUnits = [];
      }
    }

    // Get unique challenge levels for filter
    const challengeLevels = [...new Set(this.units
      .map(u => u.challengeLevel)
      .filter(cl => cl !== undefined && cl !== null)
    )].sort((a, b) => a - b);

    return {
      units: this.filteredUnits,
      searchTerm: this.searchTerm,
      challengeLevels: challengeLevels,
      challengeLevelFilter: this.challengeLevelFilter,
      totalUnits: this.units.length,
      filteredCount: this.filteredUnits.length
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    // Search functionality
    const searchInput = root.querySelector('#unit-search');
    if (searchInput) {
      searchInput.addEventListener('input', this._onSearch.bind(this));
    }

    // Challenge level filter
    const clFilter = root.querySelector('#cl-filter');
    if (clFilter) {
      clFilter.addEventListener('change', this._onFilterChange.bind(this));
    }

    // Drag functionality for units
    root.querySelectorAll('.unit-entry').forEach(el => {
      el.setAttribute('draggable', true);
      el.addEventListener('dragstart', this._onDragStart.bind(this), false);
      el.addEventListener('click', this._onUnitClick.bind(this));
    });

    // Import to compendium button
    const importAllBtn = root.querySelector('#import-all-btn');
    if (importAllBtn) {
      importAllBtn.addEventListener('click', this._onImportAll.bind(this));
    }

    // Import selected buttons
    root.querySelectorAll('.import-unit-btn').forEach(el => {
      el.addEventListener('click', this._onImportUnit.bind(this));
    });
  }

  _onSearch(event) {
    this.searchTerm = event.target.value.toLowerCase();
    this._applyFilters();
  }

  _onFilterChange(event) {
    this.challengeLevelFilter = event.target.value;
    this._applyFilters();
  }

  _applyFilters() {
    this.filteredUnits = this.units.filter(unit => {
      // Search filter
      const matchesSearch = !this.searchTerm ||
        unit.name.toLowerCase().includes(this.searchTerm) ||
        (unit.speciesType && unit.speciesType.toLowerCase().includes(this.searchTerm));

      // Challenge level filter
      const matchesCL = this.challengeLevelFilter === 'all' ||
        unit.challengeLevel === parseInt(this.challengeLevelFilter, 10);

      return matchesSearch && matchesCL;
    });

    this.render();
  }

  _onDragStart(event) {
    const unitIndex = parseInt(event.currentTarget.dataset.index, 10);
    const unit = this.filteredUnits[unitIndex];

    if (!unit) {return;}

    // Create drag data for NPC template
    const dragData = {
      type: 'npc-template',
      templateData: unit
    };

    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  async _onUnitClick(event) {
    event.preventDefault();
    const unitIndex = parseInt(event.currentTarget.dataset.index, 10);
    const unit = this.filteredUnits[unitIndex];

    if (!unit) {return;}

    // Show unit details in a dialog
    const content = `
      <div class="unit-details">
        <h2>${unit.name}</h2>
        ${unit.challengeLevel ? `<p><strong>Challenge Level:</strong> ${unit.challengeLevel}</p>` : ''}
        ${unit.size ? `<p><strong>Size:</strong> ${unit.size}</p>` : ''}
        ${unit.speciesType ? `<p><strong>Type:</strong> ${unit.speciesType}</p>` : ''}

        <h3>Abilities</h3>
        <table class="ability-table">
          <tr>
            <th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th>
          </tr>
          <tr>
            <td>${unit.abilities.str.base} (${unit.abilities.str.mod >= 0 ? '+' : ''}${unit.abilities.str.mod})</td>
            <td>${unit.abilities.dex.base} (${unit.abilities.dex.mod >= 0 ? '+' : ''}${unit.abilities.dex.mod})</td>
            <td>${unit.abilities.con.base} (${unit.abilities.con.mod >= 0 ? '+' : ''}${unit.abilities.con.mod})</td>
            <td>${unit.abilities.int.base} (${unit.abilities.int.mod >= 0 ? '+' : ''}${unit.abilities.int.mod})</td>
            <td>${unit.abilities.wis.base} (${unit.abilities.wis.mod >= 0 ? '+' : ''}${unit.abilities.wis.mod})</td>
            <td>${unit.abilities.cha.base} (${unit.abilities.cha.mod >= 0 ? '+' : ''}${unit.abilities.cha.mod})</td>
          </tr>
        </table>

        <h3>Defenses</h3>
        <p><strong>Reflex:</strong> ${unit.defenses.reflex.total} | <strong>Fortitude:</strong> ${unit.defenses.fortitude.total} | <strong>Will:</strong> ${unit.defenses.will.total}</p>
        <p><strong>HP:</strong> ${unit.hp.max}</p>

        ${unit.feats && unit.feats.length > 0 ? `<h3>Feats</h3><p>${unit.feats.join(', ')}</p>` : ''}
        ${unit.talents && unit.talents.length > 0 ? `<h3>Talents</h3><p>${unit.talents.join(', ')}</p>` : ''}
        ${unit.skillsText ? `<h3>Skills</h3><p>${unit.skillsText}</p>` : ''}
        ${unit.equipment ? `<h3>Equipment</h3><p>${unit.equipment}</p>` : ''}
      </div>
    `;

    new SWSEDialogV2({
      title: unit.name,
      content: content,
      buttons: {
        import: {
          icon: '<i class="fas fa-download"></i>',
          label: 'Import to NPC Compendium',
          callback: () => this._importUnitToCompendium(unit)
        },
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Close'
        }
      },
      default: 'close'
    }, { width: 600 }).render(true);
  }

  async _onImportUnit(event) {
    event.preventDefault();
    event.stopPropagation();
    const unitIndex = parseInt(event.currentTarget.closest('.unit-entry').dataset.index, 10);
    const unit = this.filteredUnits[unitIndex];

    if (!unit) {return;}

    await this._importUnitToCompendium(unit);
  }

  async _importUnitToCompendium(unit) {
    const npcPack = game.packs.get('foundryvtt-swse.npc');

    if (!npcPack) {
      ui.notifications.error('NPC compendium not found!');
      return;
    }

    // Check if already exists
    const existing = npcPack.index.find(i => i.name === unit.name);
    if (existing) {
      ui.notifications.warn(`${unit.name} already exists in the NPC compendium.`);
      return;
    }

    try {
      // Convert to Foundry Actor format
      const actorData = {
        name: unit.name,
        type: 'npc',
        system: foundry.utils.mergeObject({
          abilities: unit.abilities,
          defenses: unit.defenses,
          hp: unit.hp,
          level: unit.level || 1,
          challengeLevel: unit.challengeLevel,
          size: unit.size || 'medium',
          speed: unit.speed || 6,
          bab: unit.bab || 0,
          initiative: unit.initiative || 0,
          damageThreshold: unit.damageThreshold || 10,
          perception: unit.perception,
          senses: unit.senses || '',
          conditionTrack: unit.conditionTrack || { current: 0, persistent: false, penalty: 0 },
          forceSensitive: unit.forceSensitive || false
        }, {})
      };

      // Create actor in compendium
      const actor = await createActor(actorData, { pack: npcPack.collection });

      ui.notifications.info(`Imported ${unit.name} to NPC compendium!`);

    } catch (error) {
      swseLogger.error(`Error importing ${unit.name}:`, error);
      ui.notifications.error(`Failed to import ${unit.name}`);
    }
  }

  async _onImportAll() {
    const confirm = await SWSEDialogV2.confirm({
      title: 'Import All Nonheroic Units',
      content: `<p>This will import all ${this.units.length} nonheroic units to the NPC compendium.</p>
                <p>This may take several minutes. Continue?</p>`,
      defaultYes: false
    });

    if (!confirm) {return;}

    ui.notifications.info('Starting bulk import... This may take a while.');

    // Use the import script
    // For now, just notify the user to run the macro
    ui.notifications.warn('Please run the "Import Nonheroic Units" macro from the compendium scripts to perform a bulk import.');
  }
}
