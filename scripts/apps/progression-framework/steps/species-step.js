/**
 * SpeciesStep plugin
 *
 * Handles species selection (standard or Near-Human builder).
 * Implements focus/commit interaction model.
 * Manages utility bar search/filter/sort.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { getStepMentorObject, getStepGuidance, handleAskMentor, STEP_TO_CHOICE_TYPE } from './mentor-step-integration.js';
import { buildSpeciesAtomicPatch } from '/systems/foundryvtt-swse/scripts/apps/chargen/steps/species-step.js';
import { NearHumanBuilder } from './near-human-builder.js';

// Maps stepId → mentor guidance choiceType
const STEP_CHOICE_TYPE = {
  'species': 'species',
};

export class SpeciesStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // Browse/builder mode
    this._mode = 'browse';           // 'browse' | 'near-human-builder'
    this._allSpecies = [];            // SpeciesRegistryEntry[] from SpeciesRegistry.getAll()
    this._filteredSpecies = [];       // after search + filter + sort applied
    this._searchQuery = '';
    this._filters = { size: null, hasBonus: false, hasPenalty: false };
    this._sortBy = 'source';          // 'source' | 'alpha'

    // Near-Human builder
    this._nearHumanBuilder = new NearHumanBuilder();

    // Mentor dialogues
    this._olSaltyDialogues = null;    // loaded once in onStepEnter

    // Event listener cleanup
    this._utilityUnlisteners = [];    // cleanup fns for utility bar events

    // Committed selection tracking
    this._committedSpeciesId = null;
    this._committedSpeciesName = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Load all species from registry
    this._allSpecies = SpeciesRegistry.getAll();
    if (!this._allSpecies) this._allSpecies = [];

    // Load Ol' Salty species dialogues (placeholder — replace with real data source)
    this._olSaltyDialogues = {
      // Fallback map: species name → dialogue
      'Human': "A Human, eh? Versatile. Ambitious. Good all-around choice. Let's see what you make of it.",
      'Near-Human': "A Near-Human variant... customizable. Dangerous if wielded by the clever type. Which you are.",
      // Add more as needed
    };

    // Initial filter
    this._applyFilters();

    // Enable Ask Mentor for this step
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    // Clean up any existing listeners before rewiring (idempotent)
    this._cleanupUtilityListeners();

    const onSearch = e => {
      this._searchQuery = e.detail.query;
      this._applyFilters();
      shell.render();
    };
    const onFilter = e => {
      const { filterId, value } = e.detail;
      this._filters[filterId] = value;
      this._applyFilters();
      shell.render();
    };
    const onSort = e => {
      this._sortBy = e.detail.sortId;
      this._applyFilters();
      shell.render();
    };

    shell.element.addEventListener('prog:utility:search', onSearch);
    shell.element.addEventListener('prog:utility:filter', onFilter);
    shell.element.addEventListener('prog:utility:sort', onSort);

    this._utilityUnlisteners = [
      () => shell.element.removeEventListener('prog:utility:search', onSearch),
      () => shell.element.removeEventListener('prog:utility:filter', onFilter),
      () => shell.element.removeEventListener('prog:utility:sort', onSort),
    ];
  }

  async afterRender(shell, workSurfaceEl) {
    if (this._mode === 'near-human-builder') {
      this._nearHumanBuilder.wireDOM(workSurfaceEl, shell);
    }
  }

  async onStepExit(shell) {
    this._cleanupUtilityListeners();
    this._nearHumanBuilder.exitBuilderMode(true);  // true = full cleanup on exit
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    return {
      mode: this._mode,
      species: this._filteredSpecies.map(s => this._formatSpeciesCard(s)),
      focusedSpeciesId: context.focusedItem?.id ?? null,
      committedSpeciesId: context.committedSelections?.get('species')?.speciesId ?? null,
      nearHuman: this._nearHumanBuilder.getBuilderData(),
    };
  }

  getSelection() {
    const committed = this._committedSpeciesId ?? null;
    return {
      selected: committed ? [committed] : [],
      count: committed ? 1 : 0,
      isComplete: !!committed,
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    if (this._mode === 'near-human-builder') {
      return {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/near-human-work-surface.hbs',
        data: stepData,
      };
    }
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/species-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem) return this.renderDetailsPanelEmptyState();

    const species = this._allSpecies.find(s => s.id === focusedItem.id);
    if (!species) return this.renderDetailsPanelEmptyState();

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/species-details.hbs',
      data: {
        species,
        isNearHuman: species.name === 'Near-Human',
        abilityRows: this._formatAbilityRows(species.abilityScores),
        abilities: (species.abilities ?? []).map(a => ({ name: a })),
        languages: species.languages ?? [],
        size: species.size ?? 'Medium',
        speed: species.speed ?? '30 ft.',
        source: species.source ?? 'Unknown',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Interaction: Focus vs Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(id, shell) {
    const entry = this._allSpecies.find(s => s.id === id);
    if (!entry) return;

    shell.focusedItem = entry;

    // Look up Ol' Salty dialogue for species name
    const dialogue = this._getOlSaltyDialogue(entry.name);
    if (dialogue) {
      await shell.mentorRail.speak(dialogue, 'encouraging');
    }

    shell.render();
  }

  async onItemCommitted(id, shell) {
    const entry = this._allSpecies.find(s => s.id === id);
    if (!entry) return;

    // If Near-Human: enter builder mode instead of committing
    if (id === 'near-human' || entry.name === 'Near-Human') {
      await this.enterNearHumanMode(shell);
      return;
    }

    // Load full species document/data from SpeciesRegistry
    const speciesData = await SpeciesRegistry.getByName(entry.name);
    if (!speciesData) {
      console.warn(`[SpeciesStep] Failed to load species data for ${entry.name}`);
      return;
    }

    // Use the authoritative species patch builder with real data
    const patch = buildSpeciesAtomicPatch(
      shell.actor?.system ?? {},
      speciesData,           // Full species doc/entry (not thin stub)
      shell.actor?.type ?? 'character'
    );

    shell.committedSelections.set('species', {
      speciesId: id,
      speciesName: entry.name,
      speciesData,           // Store full data for downstream use
      patch,
    });

    this._committedSpeciesId = id;
    this._committedSpeciesName = entry.name;
    shell.focusedItem = null;
    shell.render();
  }

  // ---------------------------------------------------------------------------
  // Near-Human Builder Mode
  // ---------------------------------------------------------------------------

  async enterNearHumanMode(shell) {
    this._mode = 'near-human-builder';
    await this._nearHumanBuilder.loadData();
    shell.render();
  }

  async exitNearHumanMode(shell) {
    this._nearHumanBuilder.exitBuilderMode(false);  // false = don't reset, may re-enter
    this._mode = 'browse';
    shell.focusedItem = null;
    shell.render();
  }

  async confirmNearHuman(shell) {
    const validation = this._nearHumanBuilder.validate();
    if (!validation.isValid) return;

    const pkg = this._nearHumanBuilder.buildNearHumanPackage();

    shell.committedSelections.set('species', {
      speciesId: 'near-human',
      speciesName: 'Near-Human',
      nearHumanData: pkg,
    });

    this._committedSpeciesId = 'near-human';
    this._committedSpeciesName = 'Near-Human';
    this._mode = 'browse';
    shell.render();
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    if (this._mode === 'near-human-builder') {
      return this._nearHumanBuilder.validate().isValid
        ? { isValid: true, errors: [], warnings: [] }
        : { isValid: false, errors: ['Complete Near-Human configuration'], warnings: [] };
    }

    return {
      isValid: !!this._committedSpeciesId,
      errors: this._committedSpeciesId ? [] : ['Select a species to continue'],
      warnings: [],
    };
  }

  getBlockingIssues() {
    if (this._mode === 'near-human-builder') {
      return this._nearHumanBuilder.validate().isValid ? [] : ['Complete Near-Human configuration before continuing'];
    }
    return this._committedSpeciesId ? [] : ['Select a species to continue'];
  }

  getRemainingPicks() {
    if (this._mode === 'near-human-builder') {
      const validation = this._nearHumanBuilder.validate();
      return [{
        label: validation.isValid ? 'Near-Human ready — confirm to continue' : 'Near-Human build in progress',
        count: 0,
        isWarning: !validation.isValid,
      }];
    }

    if (!this._committedSpeciesId) {
      return [{ label: 'No species selected', count: 0, isWarning: true }];
    }

    return [{ label: `✓ ${this._committedSpeciesName}`, count: 0, isWarning: false }];
  }

  // ---------------------------------------------------------------------------
  // Utility Bar Config
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: 'Search species…' },
      filters: [
        { id: 'small', label: 'Small', defaultOn: false },
        { id: 'medium', label: 'Medium', defaultOn: false },
        { id: 'large', label: 'Large', defaultOn: false },
        { id: 'has-bonus', label: 'Has Bonus', defaultOn: false },
        { id: 'has-penalty', label: 'Has Penalty', defaultOn: false },
      ],
      sorts: [
        { id: 'source', label: 'Source' },
        { id: 'alpha', label: 'A–Z' },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Mentor
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    await handleAskMentor(shell.actor, 'species', shell);
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'species') || 'Choose your species carefully — it shapes your abilities and destiny.';
  }

  getMentorMode() {
    return 'context-only';
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  _cleanupUtilityListeners() {
    this._utilityUnlisteners?.forEach(fn => fn());
    this._utilityUnlisteners = [];
  }

  _applyFilters() {
    let filtered = [...this._allSpecies];

    // Search by name (case-insensitive substring)
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
    }

    // Size filter
    if (this._filters.size) {
      filtered = filtered.filter(s => s.size === this._filters.size);
    }

    // Has bonus (any abilityScore > 0)
    if (this._filters.hasBonus) {
      filtered = filtered.filter(s =>
        Object.values(s.abilityScores || {}).some(v => v > 0)
      );
    }

    // Has penalty (any abilityScore < 0)
    if (this._filters.hasPenalty) {
      filtered = filtered.filter(s =>
        Object.values(s.abilityScores || {}).some(v => v < 0)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (this._sortBy === 'alpha') {
        return a.name.localeCompare(b.name);
      }

      // Default: 'source' — Human first, Near-Human second, Core, then others, then alpha
      const sourceOrder = { 'Human': 0, 'Near-Human': 1, 'Core Rulebook': 2 };
      const aOrder = sourceOrder[a.source] ?? 3;
      const bOrder = sourceOrder[b.source] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;

      return a.name.localeCompare(b.name);
    });

    this._filteredSpecies = filtered;
  }

  _getOlSaltyDialogue(speciesName) {
    return this._olSaltyDialogues?.[speciesName] ?? null;
  }

  _formatAbilityRows(scores) {
    return Object.entries(scores ?? {})
      .filter(([, v]) => v !== 0)
      .map(([key, value]) => ({
        label: this._abilityLabel(key),
        value,
        cssClass: value > 0 ? 'prog-num--pos' : 'prog-num--neg',
      }));
  }

  _formatSpeciesCard(species) {
    return {
      id: species.id,
      name: species.name,
      source: species.source ?? 'Unknown',
      size: species.size ?? 'Medium',
      speed: species.speed ?? '30 ft.',
      description: species.description ?? '',
      abilityRows: this._formatAbilityRows(species.abilityScores),
      metaChips: [
        species.size && { label: species.size },
        species.source && { label: species.source },
      ].filter(Boolean),
      abilities: species.abilities ?? [],
      languages: species.languages ?? [],
    };
  }

  _abilityLabel(key) {
    const map = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma',
    };
    return map[key] ?? key;
  }
}
