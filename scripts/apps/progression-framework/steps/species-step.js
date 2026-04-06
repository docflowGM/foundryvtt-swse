/**
 * SpeciesStep plugin
 *
 * Handles species selection (standard or Near-Human builder).
 * Implements focus/commit interaction model.
 * Manages utility bar search/filter/sort.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { normalizeSpecies } from './step-normalizers.js';
import { getStepMentorObject, getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions, STEP_TO_CHOICE_TYPE } from './mentor-step-integration.js';
// Patch builder lives in the shared progression-framework module — NOT the legacy chargen path.
import { buildSpeciesAtomicPatch } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shared/species-patch.js';
import { NearHumanBuilder } from './near-human-builder.js';
import { getMentorGuidance, getMentorForClass, MENTORS } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';

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
    this._sortBy = 'source';          // 'source' | 'alpha' — source groups Humans/Near-Humans first

    // Near-Human builder
    this._nearHumanBuilder = new NearHumanBuilder();

    // Mentor dialogues
    this._olSaltyDialogues = null;    // loaded once in onStepEnter

    // Event listener cleanup
    this._renderAbort = null;
    this._utilityUnlisteners = [];    // cleanup fns for utility bar events

    // Committed selection tracking
    this._committedSpeciesId = null;
    this._committedSpeciesName = null;

    // Species image map: lowercased name → resolved file path (built once on step enter)
    this._speciesImgMap = new Map();

    // Suggestions
    this._suggestedSpecies = [];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Guard against uninitialized registry — initialize if needed
    if (!SpeciesRegistry.isInitialized()) {
      console.warn('[SpeciesStep] SpeciesRegistry not initialized on step enter; initializing now');
      await SpeciesRegistry.initialize();
    }

    // Load all species from registry
    this._allSpecies = SpeciesRegistry.getAll();
    if (!Array.isArray(this._allSpecies)) this._allSpecies = [];
    console.log('[SpeciesStep] Loaded species count:', this._allSpecies.length);

    // Warn if empty
    if (this._allSpecies.length === 0) {
      console.warn('[SpeciesStep] ⚠ Species authority is empty after initialization attempt');
    }

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

    // Get suggested species
    await this._getSuggestedSpecies(shell.actor, shell);

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
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

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

    shell.element.addEventListener('prog:utility:search', onSearch, { signal });
    shell.element.addEventListener('prog:utility:filter', onFilter, { signal });
    shell.element.addEventListener('prog:utility:sort', onSort, { signal });

    this._utilityUnlisteners = [
      () => shell.element.removeEventListener('prog:utility:search', onSearch),
      () => shell.element.removeEventListener('prog:utility:filter', onFilter),
      () => shell.element.removeEventListener('prog:utility:sort', onSort),
    ];
  }

  async afterRender(shell, workSurfaceEl) {
    if (this._mode === 'near-human-builder') {
      this._nearHumanBuilder.wireDOM(workSurfaceEl, shell);
      return;
    }

    // Wire up double-click to commit species directly
    const rows = workSurfaceEl?.querySelectorAll('.prog-species-row');
    if (rows) {
      rows.forEach(row => {
        row.addEventListener('dblclick', async (e) => {
          e.preventDefault();
          const itemId = row.dataset.itemId;
          if (itemId) {
            await this.onItemCommitted(itemId, shell);
          }
        });
      });
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
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedSpecies);
    return {
      mode: this._mode,
      species: this._filteredSpecies.map(s => this._formatSpeciesCard(s, suggestedIds, confidenceMap)),
      focusedSpeciesId: context.focusedItem?.id ?? null,
      committedSpeciesId: context.committedSelections?.get('species')?.speciesId ?? null,
      nearHuman: this._nearHumanBuilder.getBuilderData(),
      hasSuggestions,
      suggestedSpeciesIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
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

    // Get Ol' Salty's mentor object (Scoundrel class mentor) for guidance fallback
    const salty = MENTORS?.Scoundrel;
    const defaultSpeciesGuidance = salty ? getMentorGuidance(salty, 'species') : 'Choose wisely, friend.';

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(species, 'species', {
      mentorProseSource: this._olSaltyDialogues,
    });

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
        mentorProse: normalized.mentorProse ?? this._getOlSaltyDialogue(species.name) ?? null,
        defaultSpeciesGuidance,
        // Add normalized fields for enhanced detail rail
        canonicalDescription: normalized.description,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
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

    // PHASE 1: Normalize and commit to canonical session
    const normalizedSpecies = normalizeSpecies({
      speciesId: id,
      speciesName: entry.name,
      speciesData: entry,
      patch,
    });

    if (!normalizedSpecies) {
      console.warn(`[SpeciesStep] Failed to normalize species data for ${entry.name}`);
      return;
    }

    // Commit to canonical session (also updates committedSelections for backward compat)
    await this._commitNormalized(shell, 'species', normalizedSpecies);

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

    // PHASE 1: Normalize and commit to canonical session
    const normalizedSpecies = normalizeSpecies({
      speciesId: 'near-human',
      speciesName: 'Near-Human',
      nearHumanData: pkg,
    });

    if (!normalizedSpecies) {
      console.warn(`[SpeciesStep] Failed to normalize near-human species data`);
      return;
    }

    // Commit to canonical session (also updates committedSelections for backward compat)
    await this._commitNormalized(shell, 'species', normalizedSpecies);

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
        { id: 'source', label: 'Source', isDefault: true },
        { id: 'alpha', label: 'A–Z' },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Mentor
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedSpecies && this._suggestedSpecies.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'species', this._suggestedSpecies, shell, {
        domain: 'species',
        archetype: 'your species choice'
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'species', shell);
    }
  }

  getMentorContext(shell) {
    // Use the focused species to provide contextual mentor guidance
    if (shell.focusedItem) {
      const speciesName = shell.focusedItem.name;
      const speciesDialogue = this._getOlSaltyDialogue(speciesName);
      if (speciesDialogue) {
        return speciesDialogue;
      }
    }
    // Fall back to generic species guidance from mentor authority
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
    console.log('[SpeciesStep] Filter pipeline: start with', filtered.length, 'species');

    // Search by name (case-insensitive, with wildcard support)
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      // Convert wildcard patterns (* → .*) to regex for pattern matching
      const pattern = q.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`, 'i');
      const before = filtered.length;
      filtered = filtered.filter(s => regex.test(s.name));
      console.log('[SpeciesStep] After search query "' + this._searchQuery + '":', before, '→', filtered.length);
    }

    // Size filters (small, medium, large) — combinable toggle buttons
    const sizeFilters = ['small', 'medium', 'large'];
    const activeSizeFilters = sizeFilters.filter(size => this._filters[size]);
    if (activeSizeFilters.length > 0) {
      const before = filtered.length;
      filtered = filtered.filter(s => {
        const speciesSize = (s.size || 'Medium').toLowerCase();
        return activeSizeFilters.some(size => speciesSize === size.toLowerCase());
      });
      console.log('[SpeciesStep] After size filter [' + activeSizeFilters.join(', ') + ']:', before, '→', filtered.length);
    }

    // Bonus stat filter (dropdown) — filters for specific ability with positive bonus
    if (this._filters['bonus-stat']) {
      const targetAbility = this._filters['bonus-stat'];
      const before = filtered.length;
      filtered = filtered.filter(s => {
        const abilityScores = s.abilityScores || {};
        return abilityScores[targetAbility] > 0;
      });
      console.log('[SpeciesStep] After bonus-stat filter (' + targetAbility + '):', before, '→', filtered.length);
    }

    // Penalty stat filter (dropdown) — filters for specific ability with negative penalty
    if (this._filters['penalty-stat']) {
      const targetAbility = this._filters['penalty-stat'];
      const before = filtered.length;
      filtered = filtered.filter(s => {
        const abilityScores = s.abilityScores || {};
        return abilityScores[targetAbility] < 0;
      });
      console.log('[SpeciesStep] After penalty-stat filter (' + targetAbility + '):', before, '→', filtered.length);
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
    console.log('[SpeciesStep] Final result: ' + filtered.length + ' species (sorted by ' + this._sortBy + ')');
  }

  /**
   * Normalize a species name for reliable lookup in the species-dialogue authority.
   * Handles potential mismatches like spacing, punctuation, or variant names.
   *
   * @param {string} speciesName - The species display name
   * @returns {string|null} The normalized key to use for dialogue lookup, or null if not found
   */
  _normalizeSpeciesName(speciesName) {
    if (!speciesName || !this._olSaltyDialogues) return null;

    // Try exact match first
    if (this._olSaltyDialogues[speciesName]) {
      return speciesName;
    }

    // Try case-insensitive match
    const normalized = speciesName.trim();
    for (const key of Object.keys(this._olSaltyDialogues)) {
      if (key.toLowerCase() === normalized.toLowerCase()) {
        return key;
      }
    }

    // Try fuzzy match (first word match for hyphenated or complex names)
    const firstWord = normalized.split(/[\s-]/)[0].toLowerCase();
    for (const key of Object.keys(this._olSaltyDialogues)) {
      if (key.toLowerCase().startsWith(firstWord)) {
        return key;
      }
    }

    return null;
  }

  /**
   * Return an Ol' Salty dialogue line for the given species name.
   * The JSON stores each entry as a string[] — if more than one line exists,
   * one is chosen at random so repeated hovers feel natural.
   * Returns null if no entry exists for this species.
   *
   * Implements species-name normalization for reliable lookups.
   *
   * @param {string} speciesName
   * @returns {string|null}
   */
  _getOlSaltyDialogue(speciesName) {
    // Normalize the species name for reliable lookup
    const normalizedKey = this._normalizeSpeciesName(speciesName);
    if (!normalizedKey) {
      return null;
    }

    const entry = this._olSaltyDialogues[normalizedKey];
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
        key,
        shortLabel: key.toUpperCase(),
        label: this._abilityLabel(key),
        value,
        signedValue: `${value > 0 ? '+' : ''}${value}`,
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

  _formatSpeciesCard(species, suggestedIds = new Set(), confidenceMap = new Map()) {
    const abilityRows = this._formatAbilityRows(species.abilityScores);
    const abilityModLine = abilityRows
      .map(row => `${row.signedValue} ${row.shortLabel}`)
      .join(', ');
    const isSuggested = this.isSuggestedItem(species.id, suggestedIds);
    const confidenceData = confidenceMap.get ? confidenceMap.get(species.id) : confidenceMap[species.id];

    return {
      id: species.id,
      name: species.name,
      img: this._resolveSpeciesImg(species),               // resolved from assets/species/ map
      thumbLabel: (species.name ?? '??').substring(0, 2).toUpperCase(), // fallback badge
      source: species.source ?? 'Unknown',
      size: species.size ?? 'Medium',
      speed: species.speed ?? '30 ft.',
      description: species.description ?? '',
      abilityModLine,
      abilityRows,
      tags: (species.abilities ?? []).slice(0, 3),
      abilities: species.abilities ?? [],
      languages: species.languages ?? [],
      isSuggested,
      badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
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

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested species from SuggestionService
   * Recommendations based on class archetype and roleplay preferences
   * @private
   */
  async _getSuggestedSpecies(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'species',
        available: this._allSpecies,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedSpecies = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[SpeciesStep] Suggestion service error:', err);
      this._suggestedSpecies = [];
    }
  }

  /**
   * Extract character data from shell for suggestion engine
   * Allows suggestions to understand what choices have been made so far
   * @private
   */
  _buildCharacterDataFromShell(shell) {
    if (!shell?.buildIntent) {
      return {};
    }

    return shell.buildIntent.toCharacterData();
  }
}
