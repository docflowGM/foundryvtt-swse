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
// Patch builder lives in the shared progression-framework module — NOT the legacy chargen path.
import { buildSpeciesAtomicPatch } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shared/species-patch.js';
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
    this._filters = {
      size: null,
      small: false,
      medium: false,
      large: false,
      'bonus-stat': '',                 // selected stat ('str', 'dex', 'con', 'int', 'wis', 'cha', or '')
      'penalty-stat': '',               // selected stat ('str', 'dex', 'con', 'int', 'wis', 'cha', or '')
    };
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

    // Species image map: lowercased name → resolved file path (built once on step enter)
    this._speciesImgMap = new Map();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Load all species from registry
    this._allSpecies = SpeciesRegistry.getAll();
    if (!this._allSpecies) this._allSpecies = [];

    // Build image map from assets/species/ directory
    await this._buildSpeciesImgMap();

    // Load Ol' Salty species dialogues from the authoritative JSON file.
    // Each key is a species name; each value is an array of one or more lines.
    // _getOlSaltyDialogue() picks randomly when multiple lines are available.
    try {
      const res = await fetch('systems/foundryvtt-swse/data/dialogue/mentors/ol_salty/ol-salty-species-dialogues.json');
      if (res.ok) {
        this._olSaltyDialogues = await res.json();
      } else {
        console.warn('[SpeciesStep] Could not load ol-salty-species-dialogues.json — status', res.status);
        this._olSaltyDialogues = {};
      }
    } catch (err) {
      console.warn('[SpeciesStep] Failed to fetch ol-salty-species-dialogues.json:', err);
      this._olSaltyDialogues = {};
    }

    // Initial filter
    this._applyFilters();

    // Enable Ask Mentor for this step
    shell.mentor.askMentorEnabled = true;

    // Trigger initial mentor greeting on Species entry
    // This ensures Ol' Salty appears and speaks when entering Species
    const initialDialogue = "Species selection, eh? Choose wisely — your ancestry shapes everything ahead. Browse the options and pick what calls to you.";
    if (shell.mentorRail) {
      await shell.mentorRail.speak(initialDialogue, 'neutral');
    }
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

  renderSummaryPanel(context) {
    const actor = context.actor;
    const system = actor?.system ?? {};

    // Species: prefer committed selection, fall back to actor data
    const committedSpecies = this._committedSpeciesName
      ?? system.details?.species
      ?? system.species?.value
      ?? null;

    // Class: read from actor system — first class entry if available
    const classes = system.classes ?? system.class ?? null;
    const currentClass = Array.isArray(classes)
      ? (classes[0]?.name ?? null)
      : (typeof classes === 'string' ? classes : null);

    // Talents: count from actor items
    const talentItems = actor?.items?.filter(i => i.type === 'talent') ?? [];
    const talentCount = talentItems.length > 0 ? talentItems.length : null;

    // Credits: from actor system
    const credits = system.credits?.value ?? system.credits ?? null;

    // Languages: from actor system — baseline + known
    const langSystem = system.languages ?? {};
    const langList = [
      ...(langSystem.value ?? []),
      ...(langSystem.custom ? langSystem.custom.split(',').map(s => s.trim()).filter(Boolean) : []),
    ];
    const languages = langList.length > 0 ? langList : null;

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/summary-panel/species-summary.hbs',
      data: {
        actor,
        currentSpecies: committedSpecies,
        currentClass,
        talentCount,
        credits,
        languages,
      },
    };
  }

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

    // Stable id-based lookup — same identity used by commit path
    const species = SpeciesRegistry.getById(focusedItem.id);
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
        img: this._resolveSpeciesImg(species),
        olSaltyDialogue: this._getOlSaltyDialogue(species.name) ?? null,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Interaction: Focus vs Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(id, shell) {
    const entry = SpeciesRegistry.getById(id);
    if (!entry) {
      console.warn(`[SpeciesStep] onItemFocused: no registry entry for id "${id}" — focus ignored`);
      return;
    }

    shell.focusedItem = entry;

    // Look up Ol' Salty dialogue for species name
    const dialogue = this._getOlSaltyDialogue(entry.name);
    if (dialogue) {
      await shell.mentorRail.speak(dialogue, 'encouraging');
    }

    shell.render();
  }

  async onItemCommitted(id, shell) {
    // Use stable id-based lookup — avoids name-based fragility and is O(1).
    // SpeciesRegistry.getById is synchronous; no await needed.
    const entry = SpeciesRegistry.getById(id);
    if (!entry) {
      console.warn(`[SpeciesStep] No registry entry found for id: ${id}`);
      return;
    }

    // If Near-Human: enter builder mode instead of committing directly
    if (id === 'near-human' || entry.name === 'Near-Human') {
      await this.enterNearHumanMode(shell);
      return;
    }

    // Build the patch from the registry entry directly.
    // buildSpeciesAtomicPatch accepts SpeciesRegistryEntry (entry.source) — no
    // full Foundry document needed, and no second registry lookup required.
    const patch = buildSpeciesAtomicPatch(
      shell.actor?.system ?? {},
      entry,                 // SpeciesRegistryEntry — .source is top-level, not .system.source
      shell.actor?.type ?? 'character'
    );

    // Dev-aid: log the resolved patch ops so the sanity matrix can confirm
    // species, speciesSource, and featsRequired are all present and correct.
    console.debug('[SpeciesStep] Committing species patch:', {
      speciesId:     id,
      speciesName:   entry.name,
      speciesSource: entry.source ?? '(none)',
      patchOps:      patch?.ops ?? [],
    });

    shell.committedSelections.set('species', {
      speciesId:   id,
      speciesName: entry.name,
      speciesData: entry,    // Store entry for downstream reference
      patch,
    });

    this._committedSpeciesId   = id;
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
      search: {
        enabled: true,
        placeholder: 'Search species… (supports wildcards: *)',
        supportsWildcards: true,
      },
      filters: [
        { id: 'size', label: 'Size', type: 'toggle-group', defaultOn: false },
        { id: 'small', label: 'Small', type: 'toggle', defaultOn: false },
        { id: 'medium', label: 'Medium', type: 'toggle', defaultOn: false },
        { id: 'large', label: 'Large', type: 'toggle', defaultOn: false },
      ],
      bonusDropdown: {
        id: 'bonus-stat',
        label: 'Has Bonus:',
        type: 'select',
        options: [
          { value: '', label: '—' },
          { value: 'str', label: 'Strength' },
          { value: 'dex', label: 'Dexterity' },
          { value: 'con', label: 'Constitution' },
          { value: 'int', label: 'Intelligence' },
          { value: 'wis', label: 'Wisdom' },
          { value: 'cha', label: 'Charisma' },
        ],
        defaultValue: '',
      },
      penaltyDropdown: {
        id: 'penalty-stat',
        label: 'Has Penalty:',
        type: 'select',
        options: [
          { value: '', label: '—' },
          { value: 'str', label: 'Strength' },
          { value: 'dex', label: 'Dexterity' },
          { value: 'con', label: 'Constitution' },
          { value: 'int', label: 'Intelligence' },
          { value: 'wis', label: 'Wisdom' },
          { value: 'cha', label: 'Charisma' },
        ],
        defaultValue: '',
      },
      sorts: [
        { id: 'alpha', label: 'A–Z', isDefault: true },
        { id: 'source', label: 'Source' },
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

    // Search by name (case-insensitive, with wildcard support)
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      // Convert wildcard patterns (* → .*) to regex for pattern matching
      const pattern = q.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`, 'i');
      filtered = filtered.filter(s => regex.test(s.name));
    }

    // Size filters (small, medium, large) — combinable toggle buttons
    const sizeFilters = ['small', 'medium', 'large'];
    const activeSizeFilters = sizeFilters.filter(size => this._filters[size]);
    if (activeSizeFilters.length > 0) {
      filtered = filtered.filter(s => {
        const speciesSize = (s.size || 'Medium').toLowerCase();
        return activeSizeFilters.some(size => speciesSize === size.toLowerCase());
      });
    }

    // Bonus stat filter (dropdown) — filters for specific ability with positive bonus
    if (this._filters['bonus-stat']) {
      const targetAbility = this._filters['bonus-stat'];
      filtered = filtered.filter(s => {
        const abilityScores = s.abilityScores || {};
        return abilityScores[targetAbility] > 0;
      });
    }

    // Penalty stat filter (dropdown) — filters for specific ability with negative penalty
    if (this._filters['penalty-stat']) {
      const targetAbility = this._filters['penalty-stat'];
      filtered = filtered.filter(s => {
        const abilityScores = s.abilityScores || {};
        return abilityScores[targetAbility] < 0;
      });
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

  /**
   * Return an Ol' Salty dialogue line for the given species name.
   * The JSON stores each entry as a string[] — if more than one line exists,
   * one is chosen at random so repeated hovers feel natural.
   * Returns null if no entry exists for this species.
   *
   * @param {string} speciesName
   * @returns {string|null}
   */
  _getOlSaltyDialogue(speciesName) {
    const entry = this._olSaltyDialogues?.[speciesName];
    if (!entry) return null;
    // Single string (legacy compatibility) or array
    if (typeof entry === 'string') return entry;
    if (Array.isArray(entry) && entry.length > 0) {
      const idx = Math.floor(Math.random() * entry.length);
      return entry[idx];
    }
    return null;
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

  /**
   * Build a Map from lowercased species name → resolved file path,
   * by scanning the assets/species/ directory via FilePicker.
   * Files are named like "Bothan.webp", "Blood_Carver.webp", etc.
   * Underscores in filenames map back to spaces.
   */
  async _buildSpeciesImgMap() {
    this._speciesImgMap = new Map();
    try {
      // Prefer V13 API path; fall back to legacy global for compatibility
      const FP = foundry.applications?.apps?.FilePicker ?? globalThis.FilePicker;
      const result = await FP.browse('data', 'systems/foundryvtt-swse/assets/species');
      for (const filePath of (result.files ?? [])) {
        const basename = filePath.split('/').pop();           // "Blood_Carver.webp"
        const namePart = basename
          .replace(/\.[^.]+$/, '')                            // strip extension → "Blood_Carver"
          .replace(/_/g, ' ');                                // underscores → spaces → "Blood Carver"
        this._speciesImgMap.set(namePart.toLowerCase(), filePath);
      }
    } catch (err) {
      console.warn('SpeciesStep | Could not browse assets/species/:', err);
    }
  }

  /**
   * Resolve the display image for a species entry.
   * Priority: species.img (if set and not a generic placeholder) →
   *           assets/species/{name}.webp|jpg lookup → null
   */
  _resolveSpeciesImg(species) {
    // Use existing img if it looks like real art (not a default Foundry icon)
    if (species.img
      && !species.img.includes('mystery-man')
      && !species.img.includes('icons/svg')
      && !species.img.includes('icons/tokens')
      && species.img !== 'icons/svg/mystery-man.svg') {
      return species.img;
    }
    // Look up by name in the scanned file map
    const key = (species.name ?? '').toLowerCase();
    if (this._speciesImgMap.has(key)) {
      return this._speciesImgMap.get(key);
    }
    return null;
  }

  _formatSpeciesCard(species) {
    // Compact ability modifier string — e.g. "+2 DEX, -2 CON"
    const abilityModLine = Object.entries(species.abilityScores ?? {})
      .filter(([, v]) => v !== 0)
      .map(([key, value]) => `${value > 0 ? '+' : ''}${value} ${key.toUpperCase()}`)
      .join(', ');

    return {
      id: species.id,
      name: species.name,
      img: this._resolveSpeciesImg(species),               // resolved from assets/species/ map
      thumbLabel: (species.name ?? '??').substring(0, 2).toUpperCase(), // fallback badge
      source: species.source ?? 'Unknown',
      size: species.size ?? 'Medium',
      speed: species.speed ?? '30 ft.',
      description: species.description ?? '',
      abilityModLine,                                     // compact one-liner for row
      abilityRows: this._formatAbilityRows(species.abilityScores),
      tags: (species.abilities ?? []).slice(0, 3),        // first 3 traits as tags
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
