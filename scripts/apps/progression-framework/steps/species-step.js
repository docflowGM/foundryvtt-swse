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
import { ProgressionDebugCapture } from '../debug/progression-debug-capture.js';
// PHASE 2: Pending species context builder
import { buildPendingSpeciesContext } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js';
import { humanizeSpeciesTag } from '/systems/foundryvtt-swse/scripts/engine/species/species-tag-profile-utils.js';

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
      'source': '',                     // selected source book/package name
    };
    this._sortBy = 'source';          // 'source' | 'alpha' — source groups Humans/Near-Humans first

    // Near-Human builder
    this._nearHumanBuilder = new NearHumanBuilder();

    // Focus version guard — prevents stale async completion from overwriting newer focus
    this._focusVersion = 0;

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

    // Variant option state: speciesId -> variantId. Missing/null means Default.
    this._selectedVariantBySpeciesId = new Map();

    // Species ability choice state: speciesId -> selected choice descriptor.
    this._selectedAbilityChoiceBySpeciesId = new Map();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    console.log('[SpeciesStep] ═══════════════════════════════════════════════════════════');
    console.log('[SpeciesStep] STEP ENTER — HYDRATION START');

    // Guard against uninitialized registry — initialize if needed
    if (!SpeciesRegistry.isInitialized()) {
      console.warn('[SpeciesStep] ⚠ SpeciesRegistry not initialized on step enter; initializing now');
      await SpeciesRegistry.initialize();
      console.log('[SpeciesStep] ✓ SpeciesRegistry initialized');
    }

    // Load all species from registry and harden identity handoff.
    this._allSpecies = SpeciesRegistry.getAll().map(species => this._ensureSpeciesIdentity(species));
    if (!Array.isArray(this._allSpecies)) this._allSpecies = [];

    console.log('[SpeciesStep] ✓ Loaded species count:', this._allSpecies.length);

    // Log first 3 species structure for debugging
    if (this._allSpecies.length > 0) {
      console.log('[SpeciesStep] Sample species (first 3):');
      this._allSpecies.slice(0, 3).forEach((s, i) => {
        console.log(`  [${i}]`, {
          name: s.name,
          size: s.size,
          source: s.source,
          abilityScores: s.abilityScores,
          abilities: Array.isArray(s.abilities) ? `${s.abilities.length} abilities` : 'none',
          languages: Array.isArray(s.languages) ? `${s.languages.length} languages` : 'none',
        });
      });
    }

    // Warn if empty
    if (this._allSpecies.length === 0) {
      console.error('[SpeciesStep] ✗ CRITICAL: Species authority is empty after initialization attempt');
    }

    console.log('[SpeciesStep] ═══════════════════════════════════════════════════════════');

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

    // HYDRATION: Restore draft selection if navigating backward
    const draftSpecies = shell?.progressionSession?.draftSelections?.species;
    if (draftSpecies) {
      const speciesId = draftSpecies.speciesId;
      if (speciesId) {
        this._committedSpeciesId = speciesId;
        this._committedSpeciesName = draftSpecies.speciesName || draftSpecies.name;
        console.log('[SpeciesStep] Hydrated draft species selection:', {
          speciesId,
          speciesName: this._committedSpeciesName,
        });
      }
    }

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
    const root = shell.getRootElement?.() ?? shell.element;
    if (!root) return;

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

    root.addEventListener('prog:utility:search', onSearch, { signal });
    root.addEventListener('prog:utility:filter', onFilter, { signal });
    root.addEventListener('prog:utility:sort', onSort, { signal });

    this._utilityUnlisteners = [
      () => root.removeEventListener('prog:utility:search', onSearch),
      () => root.removeEventListener('prog:utility:filter', onFilter),
      () => root.removeEventListener('prog:utility:sort', onSort),
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

  async handleAction(action, event, target, shell) {
    if (action === 'select-species-ability-choice') {
      event?.preventDefault?.();
      const speciesId = target?.dataset?.speciesId || shell?.focusedItem?.id || null;
      const ability = String(target?.dataset?.ability || '').toLowerCase();
      const choiceIndex = Number(target?.dataset?.choiceIndex ?? -1);
      const species = speciesId ? this._resolveSpeciesEntry(speciesId) : null;
      const choice = species ? this._formatSpeciesAbilityChoices(species).find(option => option.index === choiceIndex || option.ability === ability) : null;
      if (speciesId && choice) {
        this._selectedAbilityChoiceBySpeciesId.set(speciesId, {
          id: choice.id,
          ability: choice.ability,
          label: choice.label,
          mods: choice.mods,
        });
      }
      shell?.render?.();
      return true;
    }

    if (action === 'select-species-variant') {
      event?.preventDefault?.();
      const speciesId = target?.dataset?.speciesId || shell?.focusedItem?.id || null;
      const variantId = target?.dataset?.variantId || 'default';
      if (!speciesId) return true;
      if (variantId === 'default') {
        this._selectedVariantBySpeciesId.delete(speciesId);
      } else {
        this._selectedVariantBySpeciesId.set(speciesId, variantId);
      }
      shell?.render?.();
      return true;
    }
    return false;
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
    const cards = this._filteredSpecies.map(s => this._formatSpeciesCard(s, suggestedIds, confidenceMap));

    // DIAGNOSTICS: Check for missing ids in rendered cards
    const missingIds = cards.filter(c => !c.id).map(c => c.name);
    if (missingIds.length > 0) {
      swseLogger.warn('[SpeciesStep] Rendering species cards with missing ids', {
        count: missingIds.length,
        sample: missingIds.slice(0, 10),
        totalCards: cards.length,
      });
    }

    return {
      mode: this._mode,
      species: cards,
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

    // Phase 3B: Class - prefer canonical system.class (object), fall back to legacy system.classes
    // Extract name regardless of storage format for display
    const classObj = system.class ?? system.classes?.[0] ?? null;
    const currentClass = (typeof classObj === 'object' && classObj?.name)
      ? classObj.name
      : (typeof classObj === 'string' ? classObj : null);

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
        suppressedProficiencies: this._getSuppressedProficiencySummary(context),
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
    swseLogger.log('[SpeciesStep] ===== HYDRATION START: renderDetailsPanel() =====');

    console.debug(`[SWSE Species Hydration Debug] renderDetailsPanel() entry | focusedItem: ${focusedItem?.id ?? '(null)'} (${focusedItem?.name ?? '(null)'})`);

    // [DEBUG] Entry logging
    console.log('[SWSE Details Debug] renderDetailsPanel() called with:', {
      focusedItem_present: !!focusedItem,
      focusedItem_id: focusedItem?.id ?? '(null)',
      focusedItem_name: focusedItem?.name ?? '(null)',
      focusedItem_keys: focusedItem ? Object.keys(focusedItem).slice(0, 8) : [],
    });

    // Step 1: Validate input
    swseLogger.log('[SpeciesStep] STEP 1: Validating focusedItem', {
      focusedItemPresent: !!focusedItem,
      focusedItemId: focusedItem?.id,
      focusedItemType: focusedItem?.type,
    });

    if (!focusedItem) {
      swseLogger.error('[SpeciesStep] FAIL: No focusedItem provided');
      return this.renderDetailsPanelEmptyState();
    }

    // Step 2: Registry lookup
    swseLogger.log('[SpeciesStep] STEP 2: Looking up species in registry', {
      lookupId: focusedItem.id,
    });

    const species = this._resolveSpeciesEntry(focusedItem);

    // [DEBUG] Log resolution result
    console.log('[SWSE Details Debug] _resolveSpeciesEntry(focusedItem) result:', {
      species_found: !!species,
      species_id: species?.id ?? '(null)',
      species_name: species?.name ?? '(null)',
      species_keys: species ? Object.keys(species).slice(0, 8) : [],
    });

    if (!species) {
      console.error('[SWSE Details Debug] FAIL: _resolveSpeciesEntry returned null', {
        focusedItem_id: focusedItem?.id,
        focusedItem_name: focusedItem?.name,
        focusedItem_keys: focusedItem ? Object.keys(focusedItem) : [],
      });
      swseLogger.error('[SpeciesStep] FAIL: Registry lookup failed', {
        attemptedId: focusedItem.id,
        registryEntries: SpeciesRegistry.getAll()?.length ?? 0,
      });
      return this.renderDetailsPanelEmptyState();
    }

    swseLogger.log('[SpeciesStep] STEP 2: ✓ Species found', {
      id: species.id,
      name: species.name,
      hasAbilities: !!species.abilities?.length,
      abilityCount: species.abilities?.length ?? 0,
      hasLanguages: !!species.languages?.length,
      languageCount: species.languages?.length ?? 0,
    });

    // Step 3: Format ability rows
    swseLogger.log('[SpeciesStep] STEP 3: Formatting ability rows', {
      abilityScores: species.abilityScores,
    });

    const abilityRows = this._formatAbilityRows(species.abilityScores);
    swseLogger.log('[SpeciesStep] STEP 3: ✓ Ability rows formatted', {
      rowCount: abilityRows?.length ?? 0,
      rows: abilityRows,
    });

    // Step 4: Get mentor data
    swseLogger.log('[SpeciesStep] STEP 4: Preparing mentor data');
    const salty = MENTORS?.Scoundrel;
    const defaultSpeciesGuidance = salty ? getMentorGuidance(salty, 'species') : 'Choose wisely, friend.';
    swseLogger.log('[SpeciesStep] STEP 4: ✓ Mentor data prepared', {
      hasSalty: !!salty,
      guidanceLength: defaultSpeciesGuidance?.length ?? 0,
    });

    // Step 5: Normalize detail panel data
    swseLogger.log('[SpeciesStep] STEP 5: Normalizing detail panel data');
    let normalized;
    try {
      normalized = normalizeDetailPanelData(species, 'species', {
        mentorProseSource: this._olSaltyDialogues,
      });
      swseLogger.log('[SpeciesStep] STEP 5: ✓ Data normalized', {
        hasDescription: !!normalized.description,
        hasMentorProse: !!normalized.mentorProse,
        mentorProseLength: normalized.mentorProse?.length ?? 0,
      });
    } catch (err) {
      swseLogger.error('[SpeciesStep] STEP 5: FAIL - normalization error', err);
      normalized = { description: null, mentorProse: null, fallbacks: {} };
    }

    // Step 6: Build details data object
    swseLogger.log('[SpeciesStep] STEP 6: Building details data object');
    try {
      const detailsData = {
        species,
        isNearHuman: species.name === 'Near-Human',
        abilityRows: abilityRows,
        abilities: (species.abilities ?? []).map(a => ({ name: a })),
        speciesVariants: this._formatSpeciesVariants(species),
        abilityChoices: this._formatSpeciesAbilityChoices(species),
        requiresAbilityChoice: this._requiresAbilityChoice(species),
        abilityChoiceSelected: !!this._selectedAbilityChoiceBySpeciesId.get(species.id),
        selectedAbilityChoiceId: this._selectedAbilityChoiceBySpeciesId.get(species.id)?.id || null,
        selectedVariantId: this._selectedVariantBySpeciesId.get(species.id) || 'default',
        defaultVariantSelected: !(this._selectedVariantBySpeciesId.get(species.id)),
        languages: species.languages ?? [],
        size: species.size ?? 'Medium',
        speed: this._formatMovementLine(species) ?? '6',
        source: species.source ?? 'Unknown',
        img: this._resolveSpeciesImg(species),
        mentorProse: normalized.mentorProse ?? this._getOlSaltyDialogue(species.name) ?? null,
        defaultSpeciesGuidance,
        canonicalDescription: normalized.description,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
        speciesTags: this._getDisplaySpeciesTags(species),
        attributeForecast: species.attributeForecast ?? { boosts: [], mitigations: [] },
      };

      swseLogger.log('[SpeciesStep] STEP 6: ✓ Details data object built', {
        dataKeys: Object.keys(detailsData),
        totalKeys: Object.keys(detailsData).length,
        hasImg: !!detailsData.img,
        hasMentorProse: !!detailsData.mentorProse,
        abilityRowsCount: detailsData.abilityRows?.length ?? 0,
        abilitiesCount: detailsData.abilities?.length ?? 0,
        languagesCount: detailsData.languages?.length ?? 0,
      });

      // Step 7: Return template spec
      const templateSpec = {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/species-details.hbs',
        data: detailsData,
      };

      // [DEBUG] Log final template spec
      console.log('[SWSE Details Debug] Template spec built successfully:', {
        template_path: templateSpec.template.split('/').pop(),
        data_keys: Object.keys(templateSpec.data).slice(0, 10),
        has_mentorProse: !!detailsData.mentorProse,
        has_species: !!detailsData.species,
        abilityRows_count: detailsData.abilityRows?.length ?? 0,
        abilities_count: detailsData.abilities?.length ?? 0,
      });

      swseLogger.log('[SpeciesStep] STEP 7: ✓ Template spec built', {
        template: templateSpec.template,
        dataKeysCount: Object.keys(templateSpec.data).length,
      });

      swseLogger.log('[SpeciesStep] ===== HYDRATION COMPLETE: renderDetailsPanel() SUCCESS =====');
      return templateSpec;
    } catch (err) {
      swseLogger.error('[SpeciesStep] STEP 6: FAIL - details data object error', err);
      return this.renderDetailsPanelEmptyState();
    }
  }

  // ---------------------------------------------------------------------------
  // Interaction: Focus vs Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(id, shell) {
    // [DEBUG] Click sequence tracking
    const clickNum = ProgressionDebugCapture?.nextClickSequence?.() ?? 0;
    console.log(`[SWSE Species Debug] [Click #${clickNum}] onItemFocused START`, { id });
    console.log('[SpeciesStep] onItemFocused called with id:', id);

    const entry = this._resolveSpeciesEntry(id);

    // [DEBUG] Log resolution
    console.log(`[SWSE Species Debug] [Click #${clickNum}] _resolveSpeciesEntry result`, {
      found: !!entry,
      entry_id: entry?.id ?? '(null)',
      entry_name: entry?.name ?? '(null)',
      entry_keys: entry ? Object.keys(entry).slice(0, 8) : [],
      has_abilityScores: !!entry?.abilityScores,
    });

    if (!entry) {
      console.error(`[SpeciesStep] ✗ onItemFocused: no registry entry for id "${id}" — focus ignored`);
      console.error(`[SWSE Species Debug] [Click #${clickNum}] Entry resolution FAILED`);
      return;
    }

    console.log('[SpeciesStep] ✓ Species focused:', entry.name);
    console.log('[SpeciesStep]   Species data:', {
      id: entry.id,
      name: entry.name,
      size: entry.size,
      source: entry.source,
      abilityScores: entry.abilityScores,
      abilities: Array.isArray(entry.abilities) ? entry.abilities.length : 0,
      languages: Array.isArray(entry.languages) ? entry.languages.length : 0,
    });

    // CRITICAL: Verify abilityScores are non-zero (parsing worked)
    const hasNonZeroAbilities = Object.values(entry.abilityScores || {}).some(v => v !== 0);
    if (!hasNonZeroAbilities) {
      swseLogger.warn('[SpeciesStep] ⚠ WARNING: Species has no non-zero ability modifiers', {
        abilityScores: entry.abilityScores,
        species: entry.name,
      });
    }

    // [DEBUG] Log before focusedItem assignment
    console.log(`[SWSE Species Debug] [Click #${clickNum}] About to set shell.focusedItem`, {
      previous_id: shell.focusedItem?.id ?? '(null)',
      new_id: entry.id,
    });

    // Capture focus version before any async work to guard against stale completion
    const focusVersion = ++this._focusVersion;
    console.debug(`[SWSE Stale Focus Guard] [Species] Focus version incremented to ${focusVersion} for ${entry.id}`);

    shell.focusedItem = entry;

    console.log(`[SWSE Species Debug] [Click #${clickNum}] shell.focusedItem assigned`, {
      current_id: shell.focusedItem?.id,
      current_name: shell.focusedItem?.name,
    });

    // Look up Ol' Salty dialogue for species name
    const dialogue = this._getOlSaltyDialogue(entry.name);

    // [DEBUG] Log dialogue lookup
    console.log(`[SWSE Species Debug] [Click #${clickNum}] Dialogue lookup for "${entry.name}"`, {
      dialogue_found: !!dialogue,
      dialogue_type: typeof dialogue,
      dialogue_length: typeof dialogue === 'string' ? dialogue.length : null,
      dialogue_first_30: typeof dialogue === 'string' ? dialogue.slice(0, 30) : null,
    });

    console.log('[SpeciesStep] Triggering shell.render() to update detail panel');
    console.log('[SpeciesStep] shell.focusedItem is now:', shell.focusedItem);

    // [DEBUG] Log before render
    console.log(`[SWSE Species Debug] [Click #${clickNum}] About to call shell.render()`, {
      focusedItem_id: shell.focusedItem?.id,
      focusedItem_name: shell.focusedItem?.name,
    });

    console.debug(`[SWSE Species Hydration Debug] [Click #${clickNum}] Requesting rerender for species hydration | selected: ${entry.name} (${entry.id}) | focusedItem: ${shell.focusedItem?.id ?? '(null)'}`);
    shell.render();
    console.debug(`[SWSE Species Hydration Debug] [Click #${clickNum}] Rerender requested | focusedItem: ${shell.focusedItem?.id ?? '(null)'}`);

    if (dialogue) {
      console.log('[SpeciesStep] ✓ Found mentor dialogue for', entry.name);

      // [DEBUG] Log before non-blocking speak call
      console.log(`[SWSE Species Debug] [Click #${clickNum}] About to call shell.mentorRail.speak() non-blocking`, {
        mentor_isAnimating_before: shell.mentor?.isAnimating ?? '(null)',
        mentor_currentDialogue_before: shell.mentor?.currentDialogue?.slice?.(0, 30) ?? '(null)',
      });

      void shell.mentorRail.speak(dialogue, 'encouraging')
        .then(() => {
          console.log(`[SWSE Species Debug] [Click #${clickNum}] shell.mentorRail.speak() completed`);

          // GUARD: Keep stale completion from re-touching UI state if focus moved on.
          if (this._focusVersion !== focusVersion) {
            console.debug(`[SWSE Stale Focus Guard] [Species] Discarding stale mentor speak completion | was: v${focusVersion}, now: v${this._focusVersion} | species: ${entry.id}`);
          }
        })
        .catch(speakErr => {
          console.error(`[SWSE Species Debug] [Click #${clickNum}] shell.mentorRail.speak() threw:`, speakErr);
          console.error(`[SWSE Species Debug] [Click #${clickNum}] Speak error details:`, {
            message: speakErr.message,
            stack: speakErr.stack?.split('\n').slice(0, 4).join(' | '),
          });
        });
    } else {
      console.log('[SpeciesStep] ⚠ No mentor dialogue found for', entry.name);
      console.log(`[SWSE Species Debug] [Click #${clickNum}] No dialogue, skipping speak()`);
    }

    console.log(`[SWSE Species Debug] [Click #${clickNum}] onItemFocused COMPLETE`);
  }

  async onItemCommitted(id, shell) {
    // Use stable id-based lookup — avoids name-based fragility and is O(1).
    // SpeciesRegistry.getById is synchronous; no await needed.
    const entry = this._resolveSpeciesEntry(id);
    if (!entry) {
      console.warn(`[SpeciesStep] No registry entry found for id: ${id}`);
      return;
    }

    // If Near-Human: enter builder mode instead of committing directly
    if (id === 'near-human' || entry.name === 'Near-Human') {
      await this.enterNearHumanMode(shell);
      return;
    }

    const selectedVariantId = this._selectedVariantBySpeciesId.get(entry.id) || null;
    const selectedAbilityChoice = this._selectedAbilityChoiceBySpeciesId.get(entry.id) || null;
    if (this._requiresAbilityChoice(entry) && !selectedAbilityChoice) {
      ui?.notifications?.warn?.(`Choose a ${entry.name} species option before confirming.`);
      return;
    }
    const effectiveEntry = {
      ...entry,
      ...(selectedVariantId ? { selectedVariantId, variantId: selectedVariantId } : {}),
      ...(selectedAbilityChoice ? { selectedAbilityChoice } : {}),
    };

    // PHASE 2: Build pending species context from canonical ledger
    const pendingContext = await buildPendingSpeciesContext(shell.actor, effectiveEntry, {
      source: 'progression',
    });

    if (!pendingContext) {
      console.warn(`[SpeciesStep] Failed to build pending context for ${entry.name}`);
      return;
    }

    // Log what we're about to commit
    console.log('[SpeciesStep] Pending species context built:', {
      speciesId:        id,
      speciesName:      entry.name,
      selectedVariant:  pendingContext.identity?.variant?.label || 'Default',
      featsRequired:    pendingContext.entitlements.featsRequired,
      abilities:        pendingContext.abilities,
      hasTraits:        pendingContext.traits?.length ?? 0,
    });

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

    // PHASE 1/2: Normalize and commit to canonical session
    // Now includes ledger context and pending grants
    const normalizedSpecies = normalizeSpecies({
      speciesId: id,
      speciesName: entry.name,
      speciesData: effectiveEntry,
      selectedVariant: pendingContext.identity?.variant || null,
      selectedAbilityChoice: pendingContext.identity?.abilityChoice || selectedAbilityChoice || null,
      patch,
      pendingContext, // NEW: Full pending context from ledger
    });

    if (!normalizedSpecies) {
      console.warn(`[SpeciesStep] Failed to normalize species data for ${entry.name}`);
      return;
    }

    // Commit to canonical session (also updates committedSelections for backward compat)
    await this._commitNormalized(shell, 'species', normalizedSpecies);
    await this._commitNormalized(shell, 'pendingSpeciesContext', pendingContext);

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

    // PHASE 2: Build pending context for Near-Human
    // Near-Human treats as Human for entitlements, but with custom trait selected
    const nearHumanEntry = {
      id: 'near-human',
      name: 'Near-Human',
      source: 'Core Rulebook',
    };

    const pendingContext = await buildPendingSpeciesContext(shell.actor, nearHumanEntry, {
      source: 'progression',
    });

    if (!pendingContext) {
      console.warn(`[SpeciesStep] Failed to build pending context for near-human`);
      return;
    }

    console.log('[SpeciesStep] Near-Human pending context built:', {
      featsRequired:    pendingContext.entitlements.featsRequired,
      trait:            pkg?.trait?.name,
      sacrifice:        pkg?.sacrifice,
      variants:         pkg?.variants?.length ?? 0,
    });

    // PHASE 1/2: Normalize and commit to canonical session
    const normalizedSpecies = normalizeSpecies({
      speciesId: 'near-human',
      speciesName: 'Near-Human',
      nearHumanData: pkg,
      pendingContext, // NEW: Full pending context from ledger
    });

    if (!normalizedSpecies) {
      console.warn(`[SpeciesStep] Failed to normalize near-human species data`);
      return;
    }

    // Commit to canonical session (also updates committedSelections for backward compat)
    await this._commitNormalized(shell, 'species', normalizedSpecies);
    await this._commitNormalized(shell, 'pendingSpeciesContext', pendingContext);

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
    // Build dynamic source options from unique sources in all species
    const uniqueSources = [...new Set(this._allSpecies.map(s => s.source || 'Unknown'))].sort();
    const sourceOptions = [
      { value: '', label: '— All Sources —' },
      ...uniqueSources.map(source => ({ value: source, label: source }))
    ];

    return {
      mode: 'rich',
      search: {
        enabled: true,
        placeholder: 'Search species…',
        supportsWildcards: false,
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
      sourceDropdown: {
        id: 'source',
        label: 'Source:',
        type: 'select',
        options: sourceOptions,
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
    console.log('[SpeciesStep] ═══════════════════════════════════════════════════════════');
    console.log('[SpeciesStep] FILTER PIPELINE START');
    console.log('[SpeciesStep] Initial species count:', filtered.length);
    console.log('[SpeciesStep] Search query:', this._searchQuery || '(none)');
    console.log('[SpeciesStep] Active filters:', JSON.stringify(this._filters));
    console.log('[SpeciesStep] Sort mode:', this._sortBy);

    // Log sample species structure for debugging
    if (filtered.length > 0) {
      const sample = filtered[0];
      console.log('[SpeciesStep] Sample species structure:', {
        name: sample.name,
        size: sample.size,
        abilityScores: sample.abilityScores,
        source: sample.source,
        allKeys: Object.keys(sample).slice(0, 15),
      });
    }

    // Search by name — supports wildcard regex if * is present, otherwise substring match
    if (this._searchQuery) {
      const before = filtered.length;

      // Wildcard mode: if query contains *, treat as regex pattern
      if (this._searchQuery.includes('*')) {
        try {
          // Convert * to .* for regex matching, escape other special chars
          const pattern = this._searchQuery
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars except *
            .replace(/\*/g, '.*');                  // * → .*
          const regex = new RegExp(`^${pattern}$`, 'i');  // Case-insensitive anchored match
          filtered = filtered.filter(s => regex.test(s.name));
          console.log('[SpeciesStep] After wildcard search "' + this._searchQuery + '" (regex: ^' + pattern + '$):', before, '→', filtered.length);
        } catch (err) {
          console.warn('[SpeciesStep] Wildcard regex error:', err.message);
          // Fallback: substring search if regex fails
          filtered = filtered.filter(s => s.name.toLowerCase().includes(this._searchQuery.toLowerCase()));
        }
      } else {
        // Substring mode: case-insensitive contains
        const q = this._searchQuery.toLowerCase();
        filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
        console.log('[SpeciesStep] After substring search "' + this._searchQuery + '":', before, '→', filtered.length);
      }
      console.log('[SpeciesStep]   Matching species:', filtered.map(s => s.name).slice(0, 5));
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
      console.log('[SpeciesStep] Bonus filter: looking for ability "' + targetAbility + '"');

      // Debug: inspect ability structure in sample
      if (filtered.length > 0) {
        const sample = filtered[0];
        console.log('[SpeciesStep]   Sample abilityScores:', sample.abilityScores);
        if (sample.abilityScores) {
          console.log('[SpeciesStep]   Ability keys:', Object.keys(sample.abilityScores));
          console.log('[SpeciesStep]   Value for "' + targetAbility + '":', sample.abilityScores[targetAbility]);
        }
      }

      filtered = filtered.filter(s => {
        const abilityScores = s.abilityScores || {};
        const value = abilityScores[targetAbility];
        return value && value > 0;  // Check that value exists and is > 0
      });
      console.log('[SpeciesStep] After bonus-stat filter (' + targetAbility + '):', before, '→', filtered.length);
      if (filtered.length > 0) {
        console.log('[SpeciesStep]   Matching species:', filtered.map(s => s.name).slice(0, 5));
      }
    }

    // Penalty stat filter (dropdown) — filters for specific ability with negative penalty
    if (this._filters['penalty-stat']) {
      const targetAbility = this._filters['penalty-stat'];
      const before = filtered.length;
      console.log('[SpeciesStep] Penalty filter: looking for ability "' + targetAbility + '"');

      filtered = filtered.filter(s => {
        const abilityScores = s.abilityScores || {};
        const value = abilityScores[targetAbility];
        return value && value < 0;  // Check that value exists and is < 0
      });
      console.log('[SpeciesStep] After penalty-stat filter (' + targetAbility + '):', before, '→', filtered.length);
      if (filtered.length > 0) {
        console.log('[SpeciesStep]   Matching species:', filtered.map(s => s.name).slice(0, 5));
      }
    }

    // Source filter (dropdown) — NEW IMPLEMENTATION
    if (this._filters['source'] && this._filters['source'] !== '') {
      const targetSource = this._filters['source'];
      const before = filtered.length;
      console.log('[SpeciesStep] Source filter: looking for source "' + targetSource + '"');

      filtered = filtered.filter(s => {
        return (s.source || 'Unknown') === targetSource;
      });
      console.log('[SpeciesStep] After source filter (' + targetSource + '):', before, '→', filtered.length);
      if (filtered.length > 0) {
        console.log('[SpeciesStep]   Matching species:', filtered.map(s => s.name).slice(0, 5));
      }
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
    console.log('[SpeciesStep] ═══════════════════════════════════════════════════════════');
    console.log('[SpeciesStep] FINAL RESULT: ' + filtered.length + ' species (sorted by ' + this._sortBy + ')');
    console.log('[SpeciesStep] ═══════════════════════════════════════════════════════════');
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
  _computeSpeciesFallbackId(species) {
    if (!species) return null;

    const basis = [
      species.id,
      species._id,
      species.uuid,
      species.name,
      species.source,
      species.pack,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .trim();

    if (!basis) {
      return null;
    }

    return basis
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  _ensureSpeciesIdentity(species) {
    if (!species || typeof species !== 'object') {
      return species;
    }

    if (species.id) {
      return species;
    }

    return {
      ...species,
      id: this._computeSpeciesFallbackId(species),
    };
  }

  _resolveSpeciesEntry(itemRef) {
    const requestedId = typeof itemRef === 'string' ? itemRef : itemRef?.id;
    if (!requestedId) {
      return null;
    }

    const direct = SpeciesRegistry.getById(requestedId);
    if (direct) {
      return this._ensureSpeciesIdentity(direct);
    }

    const normalizedRequestedId = String(requestedId).toLowerCase();
    return (SpeciesRegistry.getAll() || [])
      .map(species => this._ensureSpeciesIdentity(species))
      .find(species => {
        const speciesId = String(species?.id ?? '').toLowerCase();
        const fallbackId = String(this._computeSpeciesFallbackId(species) ?? '').toLowerCase();
        const speciesName = String(species?.name ?? '').toLowerCase();
        return normalizedRequestedId === speciesId
          || normalizedRequestedId === fallbackId
          || normalizedRequestedId === speciesName;
      }) || null;
  }

  _resolveSpeciesImg(species) {
    // Use existing img if it looks like real art (not a default Foundry icon)
    if (species.img
      && !species.img.includes('mystery-man')
      && !species.img.includes('icons/tokens')) {
      return species.img;
    }
    // Look up by name in the scanned file map
    const key = (species.name ?? '').toLowerCase();
    if (this._speciesImgMap.has(key)) {
      return this._speciesImgMap.get(key);
    }
    return null;
  }


  _formatMovementLine(species) {
    const movement = species?.movement || species?.system?.movement || {};
    const parts = [];
    const pushMode = (label, value) => {
      if (value === null || value === undefined || value === '') return;
      parts.push(`${label} ${value}`);
    };

    pushMode('Walk', movement.walk ?? species?.speed);
    pushMode('Swim', movement.swim);
    pushMode('Fly', movement.fly);
    pushMode('Climb', movement.climb);
    pushMode('Hover', movement.hover);

    if (movement.bySize && typeof movement.bySize === 'object') {
      const sizeParts = Object.entries(movement.bySize)
        .map(([size, modes]) => {
          const walk = modes?.walk ?? modes?.speed ?? null;
          return walk ? `${size} ${walk}` : null;
        })
        .filter(Boolean);
      if (sizeParts.length) {
        parts.push(sizeParts.join(' / '));
      }
    }

    return parts.length ? parts.join(', ') : (species?.speed ?? null);
  }

  _formatSpeciesCard(species, suggestedIds = new Set(), confidenceMap = new Map()) {
    species = this._ensureSpeciesIdentity(species);

    // DIAGNOSTICS: Check for missing id early
    if (!species?.id) {
      swseLogger.warn('[SpeciesStep] _formatSpeciesCard received species without id', {
        name: species.name,
        source: species.source,
        hasId: !!species.id,
      });
    }

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
      speed: this._formatMovementLine(species) ?? '6',
      description: species.description ?? '',
      abilityModLine,
      abilityRows,
      tags: this._getDisplaySpeciesTags(species).slice(0, 3),
      abilities: species.abilities ?? [],
      variantCount: Array.isArray(species.variants) ? species.variants.length : 0,
      hasVariants: Array.isArray(species.variants) && species.variants.length > 0,
      languages: species.languages ?? [],
      isSuggested,
      badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
  }



  _getSuppressedProficiencySummary(context) {
    const pending = context?.committedSelections?.get?.('pendingSpeciesContext')
      ?? context?.shell?.progressionSession?.draftSelections?.pendingSpeciesContext
      ?? null;
    const suppressed = pending?.entitlements?.suppressedClassProficiencies
      ?? pending?.metadata?.speciesRules?.suppressedClassProficiencies
      ?? [];
    return Array.isArray(suppressed) ? suppressed : [];
  }

  _requiresAbilityChoice(species) {
    const choice = species?.abilityChoice || species?.system?.abilityChoice || null;
    return !!choice && choice.type === 'choice';
  }

  _formatSpeciesAbilityChoices(species) {
    const choice = species?.abilityChoice || species?.system?.abilityChoice || null;
    if (!choice || typeof choice !== 'object') return [];
    const selected = this._selectedAbilityChoiceBySpeciesId.get(species.id) || null;
    const labelMap = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
    const normalize = (raw = {}) => Object.entries(raw || {}).reduce((acc, [key, value]) => {
      const lower = String(key || '').toLowerCase();
      const normalized = ({ strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' })[lower] || lower;
      const numeric = Number(value);
      if (['str','dex','con','int','wis','cha'].includes(normalized) && Number.isFinite(numeric)) acc[normalized] = numeric;
      return acc;
    }, {});

    if (choice.type === 'fixedArray') {
      // Republic Clone-style fixed arrays are resolved in the Attribute step so the player
      // can distribute the two +1 increases there and request a GM-reviewed override if needed.
      return [];
    }

    const fixed = normalize(choice.fixed || {});
    const options = Array.isArray(choice.chooseOne) ? choice.chooseOne : [];
    return options.map((rawOption, index) => {
      const mods = normalize(rawOption);
      const [ability, value] = Object.entries(mods)[0] || [null, null];
      const signed = Number(value) > 0 ? `+${Number(value)}` : `${Number(value)}`;
      const fixedText = Object.entries(fixed).map(([key, val]) => `${val > 0 ? '+' : ''}${val} ${labelMap[key] || key.toUpperCase()}`).join(', ');
      return {
        id: `${ability || 'choice'}-${index}`,
        index,
        ability,
        label: `${signed} ${labelMap[ability] || String(ability || '').toUpperCase()}`,
        detail: fixedText ? `${signed} ${labelMap[ability] || ability}; ${fixedText}` : `${signed} ${labelMap[ability] || ability}`,
        mods,
        isSelected: selected?.id === `${ability || 'choice'}-${index}` || selected?.ability === ability,
      };
    });
  }

  _formatSpeciesVariants(species) {
    const variants = Array.isArray(species?.variants) ? species.variants : [];
    if (!variants.length) {
      return [];
    }

    return variants.map((variant, index) => {
      const traits = Array.isArray(variant?.traits)
        ? variant.traits.map(trait => ({
            name: trait?.name ?? 'Trait',
            description: trait?.description ?? '',
          }))
        : [];

      const special = Array.isArray(variant?.special)
        ? variant.special.filter(Boolean).map(name => ({ name }))
        : [];

      const id = variant?.id ?? `variant-${index + 1}`;
      const selectedVariantId = this._selectedVariantBySpeciesId.get(species.id) || 'default';
      return {
        id,
        isSelected: selectedVariantId === id,
        speciesId: species.id,
        label: variant?.label ?? `Variant ${index + 1}`,
        source: variant?.source ?? null,
        size: variant?.size ?? null,
        speed: this._formatMovementLine(variant) ?? variant?.speed ?? null,
        abilities: variant?.abilities ?? null,
        description: variant?.description ?? '',
        skillBonuses: Array.isArray(variant?.skillBonuses) ? variant.skillBonuses : [],
        special,
        traits,
        languages: Array.isArray(variant?.languages) ? variant.languages : [],
      };
    });
  }


  _getDisplaySpeciesTags(species) {
    const blocked = new Set(['species', 'heritage', 'humanoid']);
    return (species?.tags || [])
      .filter(tag => tag && !blocked.has(String(tag).toLowerCase()))
      .slice(0, 12)
      .map(tag => ({ key: tag, label: humanizeSpeciesTag(tag) }));
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
      this._suggestedSpecies = (suggested || []).slice(0, 6);
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
