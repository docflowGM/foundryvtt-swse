/**
 * Nonheroic Units Browser Application
 * Provides a searchable, filterable interface for browsing and importing nonheroic units
 */

export class NonheroicUnitsBrowser extends Application {
  constructor(options = {}) {
    super(options);
    this.units = [];
    this.filteredUnits = [];
    this.searchTerm = '';
    this.challengeLevelFilter = 'all';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'nonheroic-units-browser',
      title: 'Nonheroic Units Browser',
      template: 'systems/swse/templates/apps/nonheroic-units-browser.hbs',
      classes: ['swse', 'nonheroic-browser'],
      width: 800,
      height: 700,
      resizable: true,
      scrollY: ['.units-list'],
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'browse' }]
    });
  }

  async getData() {
    // Load units data if not already loaded
    if (this.units.length === 0) {
      try {
        const response = await fetch('systems/swse/data/nonheroic/nonheroic_units.json');
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

  activateListeners(html) {
    super.activateListeners(html);

    // Search functionality
    html.find('#unit-search').on('input', this._onSearch.bind(this));

    // Challenge level filter
    html.find('#cl-filter').on('change', this._onFilterChange.bind(this));

    // Drag functionality for units
    html.find('.unit-entry').each((i, el) => {
      el.setAttribute('draggable', true);
      el.addEventListener('dragstart', this._onDragStart.bind(this), false);
    });

    // Click to view details
    html.find('.unit-entry').on('click', this._onUnitClick.bind(this));

    // Import to compendium button
    html.find('#import-all-btn').on('click', this._onImportAll.bind(this));

    // Import selected button
    html.find('.import-unit-btn').on('click', this._onImportUnit.bind(this));
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
        unit.challengeLevel === parseInt(this.challengeLevelFilter);

      return matchesSearch && matchesCL;
    });

    this.render();
  }

  _onDragStart(event) {
    const unitIndex = parseInt(event.currentTarget.dataset.index);
    const unit = this.filteredUnits[unitIndex];

    if (!unit) return;

    // Create drag data for NPC template
    const dragData = {
      type: 'npc-template',
      templateData: unit
    };

    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  async _onUnitClick(event) {
    event.preventDefault();
    const unitIndex = parseInt(event.currentTarget.dataset.index);
    const unit = this.filteredUnits[unitIndex];

    if (!unit) return;

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

    new Dialog({
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
    const unitIndex = parseInt(event.currentTarget.closest('.unit-entry').dataset.index);
    const unit = this.filteredUnits[unitIndex];

    if (!unit) return;

    await this._importUnitToCompendium(unit);
  }

  async _importUnitToCompendium(unit) {
    const npcPack = game.packs.get('swse.npc');

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
      const actor = await Actor.create(actorData, { pack: npcPack.collection });

      ui.notifications.info(`Imported ${unit.name} to NPC compendium!`);

      // TODO: Add feats, talents, equipment as embedded items

    } catch (error) {
      swseLogger.error(`Error importing ${unit.name}:`, error);
      ui.notifications.error(`Failed to import ${unit.name}`);
    }
  }

  async _onImportAll() {
    const confirm = await Dialog.confirm({
      title: 'Import All Nonheroic Units',
      content: `<p>This will import all ${this.units.length} nonheroic units to the NPC compendium.</p>
                <p>This may take several minutes. Continue?</p>`,
      defaultYes: false
    });

    if (!confirm) return;

    ui.notifications.info('Starting bulk import... This may take a while.');

    // Use the import script
    // For now, just notify the user to run the macro
    ui.notifications.warn('Please run the "Import Nonheroic Units" macro from the compendium scripts to perform a bulk import.');
  }
}
