/**
 * FeatStep plugin
 *
 * Handles constrained feat selection with:
 * - Feat slot authority (general/heroic vs class)
 * - Grouped discovery browsing
 * - Default legality filtering (show only legal feats)
 * - Optional Show All toggle (reveal ineligible feats)
 * - Suggested feats from SuggestionService
 * - Explicit prerequisite display
 * - Mentor suggestions modal
 * - Repeatable feat handling
 *
 * Key challenge: At scale (50+ feats per category), the UI must remain
 * readable and not overwhelming.
 *
 * Solution: Grouped browsing with constrained visible counts, suggestions first,
 * legality filtering default ON, optional Show All.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { FeatRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-registry.js';
import { FeatSlotValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-slot-validator.js';
import { FeatEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-engine.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithPicker } from './mentor-step-integration.js';
import { canonicallyOrderSelections } from '../utils/selection-ordering.js';
import { extractDescriptionText, normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { resolveClassModel, resolveSelectedClassFromShell, getClassBonusFeatsLookupKeys } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import { FEAT_TYPE_LABELS, getFeatTypeLabel, loadFeatBucketsMapping, normalizeFeatRuntime, normalizeFeatTypeKey } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-shape.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { FeatChoiceResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js';
import { FeatChoiceDialog } from '/systems/foundryvtt-swse/scripts/apps/choices/feat-choice-dialog.js';
import { attachFeatIconPath, resolveFeatIconPath } from './feat-icon-resolver.js';
import { PendingEntitlementService } from '../services/pending-entitlement-service.js';

function resolveClassLookupKeysForFeatStep(shell) {
  try {
    const classModel = resolveSelectedClassFromShell(shell) || resolveClassModel(
      shell?.progressionSession?.getSelection?.('class')
      || shell?.committedSelections?.get?.('class')
      || null
    );

    if (!classModel) {
      return [];
    }

    const lookup = getClassBonusFeatsLookupKeys(classModel);
    return [lookup.classId, lookup.sourceId, lookup.name].filter(Boolean);
  } catch (error) {
    swseLogger.warn('[FeatStep] Failed to resolve class lookup keys; continuing without class feat lookup hints', {
      error: error?.message || String(error),
      currentStepId: shell?.progressionSession?.currentStepId || null,
    });
    return [];
  }
}

// Constants
const FEATS_PER_CATEGORY_INITIAL = 5;  // Constrained visible count per category
const TOP_SUGGESTIONS = 4;              // Top N suggested feats to show

// Category icons keyed by lowercase featType


function emitFeatStepTrace(label, payload = {}) {
  // Only emit trace logs when debug mode is enabled
  if (!game?.settings?.get?.('foundryvtt-swse', 'debugMode')) {
    return;
  }
  try {
    console.warn(`SWSE [FEAT STEP TRACE] ${label}`, payload);
  } catch (_err) {
    // no-op
  }
}

const FEAT_TYPE_ICONS = {
  recommended: 'fa-star',
  general:     'fa-star',
  combat:      'fa-khanda',
  weapon_armor:'fa-shield-halved',
  force:       'fa-fan',
  skill:       'fa-screwdriver-wrench',
  species:     'fa-dna',
  droid_cybernetic: 'fa-robot',
  faction:     'fa-flag',
  destiny_story: 'fa-scroll',
  team:        'fa-users',
  uncategorized: 'fa-circle-question',
  martial_arts: 'fa-hand-fist',
};


function normalizeFeatNameKey(name) {
  const key = String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
  if (!key) return '';
  return key;
}

function getFeatOwnershipKeys(name) {
  const base = normalizeFeatNameKey(name);
  const keys = new Set([base]);
  if (base === 'force sensitivity') keys.add('force sensitive');
  if (base === 'force sensitive') keys.add('force sensitivity');
  return Array.from(keys).filter(Boolean);
}

function addFeatOwnershipName(set, name) {
  for (const key of getFeatOwnershipKeys(name)) set.add(key);
}

function hasFeatOwnershipName(set, name) {
  return getFeatOwnershipKeys(name).some(key => set.has(key));
}

function getGrantedFeatName(grant) {
  if (!grant) return '';
  if (typeof grant === 'string') return grant;
  return grant.name || grant.featName || grant.label || grant.id || grant.key || '';
}


export class FeatStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // Step configuration
    this._slotType = descriptor.slotType || 'heroic';  // 'heroic' or 'class'
    this._classId = descriptor.classId || null;        // For class feat slots

    // Data
    this._allFeats = [];                 // All feats from registry
    this._legalFeats = [];               // Legal/selectable feats for the current slot
    this._availabilityByFeatId = new Map();// Feat id -> legality/status snapshot
    this._groupedFeats = {};             // Feats grouped by category
    this._suggestedFeats = [];           // Top suggested feats (from SuggestionService)
    this._focusedFeatId = null;          // Currently focused feat
    this._selectedFeatId = null;         // Committed feat for this slot
    this._searchQuery = '';              // Search filter
    this._showAll = false;               // Toggle: show ineligible feats
    this._expandedCategories = new Set();// Which categories are expanded

    // UI state
    this._selectedFeatItem = null;       // The actual feat item for display
    this._noChoicesAvailable = false;     // safety net for zero-option steps

    // Mapping & filter state
    this._mapping = null;                // feat-buckets-and-subbuckets.json
    this._selectedTypes = new Set();     // Active featType multi-select filter
    this._selectedTags  = new Set();     // Active tag multi-select filter
    this._openFilterPanel = null;        // Which dropdown is open: 'type' | 'tag' | null
    this._sortBy = 'alpha-asc';          // Default sort

    // Event listener cleanup
    this._renderAbort = null;            // AbortController for automatic listener cleanup
    this._isDroidProgression = false;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Ensure registry loaded
    if (!FeatRegistry.isBuilt && typeof FeatRegistry.build === 'function') {
      await FeatRegistry.build();
    }

    // Load tag/bucket mapping (cached after first load)
    try {
      this._mapping = await this._loadMapping();
    } catch (error) {
      swseLogger.warn('[FeatStep] Failed to load feat bucket mapping; continuing with unbucketed feat data', {
        error: error?.message || String(error),
        stepId: this.descriptor?.stepId || null,
      });
      this._mapping = null;
    }

    // Load canonical normalized feats from registry and reattach mapping tags for current page state
    this._allFeats = (FeatRegistry.list?.() || [])
      .map(f => normalizeFeatRuntime(f, { mapping: this._mapping }))
      .map(feat => attachFeatIconPath(feat));
    this._isDroidProgression = shell?.progressionSession?.subtype === 'droid';
    const existingFeat = this._getCommittedFeatForSlot(shell);
    this._selectedFeatId = existingFeat?.id || existingFeat?._id || null;
    this._selectedFeatItem = existingFeat || null;

    emitFeatStepTrace('STEP_ENTER_START', {
      stepId: this.descriptor?.stepId || null,
      slotType: this._slotType,
      actorName: shell?.actor?.name || null,
      registryCount: this._allFeats.length,
    });

    // Get legal feats for this context
    let legalFeats = [];
    try {
      legalFeats = await this._getLegalFeats(shell.actor, shell);
    } catch (error) {
      swseLogger.error('[FeatStep] Failed to compute legal feats; degrading to empty state instead of hard-blocking progression', {
        error: error?.message || String(error),
        stepId: this.descriptor?.stepId || null,
        actor: shell?.actor?.name || null,
      });
      legalFeats = [];
    }
    this._legalFeats = legalFeats;
    this._noChoicesAvailable = legalFeats.length === 0;
    emitFeatStepTrace('LEGAL_FEATS_RESULT', {
      stepId: this.descriptor?.stepId || null,
      slotType: this._slotType,
      legalCount: legalFeats.length,
      allCount: this._allFeats.length,
      noChoicesAvailable: this._noChoicesAvailable,
      sampleLegalFeats: legalFeats.slice(0, 10).map(f => f?.name || f?.id || '(unknown)'),
    });

    // Get suggested feats (pass shell so suggestion engine sees chargen choices)
    this._suggestedFeats = await this._getSuggestedFeats(shell.actor, legalFeats, shell);

    // Group feats by category. Legal-only is the default; Show All uses hydrated feats with status flags.
    this._refreshGroupedFeats();
    emitFeatStepTrace('GROUPING_COMPLETE', {
      groups: Object.fromEntries(Object.entries(this._groupedFeats || {}).map(([key, group]) => [key, group?.feats?.length || 0])),
      suggestedCount: this._suggestedFeats.length,
    });

    // Expand suggested category by default, collapse others
    this._expandedCategories.clear();
    if (this._suggestedFeats.length > 0) {
      this._expandedCategories.add('suggested');
    }

    // Enable mentor
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const onSearch = e => {
      this._searchQuery = e.detail.query || '';
      shell.render();
    };
    const onFilter = e => {
      const { filterId, value } = e.detail || {};
      this._filters = this._filters || {};
      this._filters[filterId] = value;
      shell.render();
    };
    const onSort = e => {
      this._sortBy = e.detail?.sortId || 'alpha-asc';
      shell.render();
    };

    shell.element.addEventListener('prog:utility:search', onSearch, { signal });
    shell.element.addEventListener('prog:utility:filter', onFilter, { signal });
    shell.element.addEventListener('prog:utility:sort', onSort, { signal });

    // Wire filter checkboxes (type & tag)
    const filterCheckboxes = shell.element.querySelectorAll('[data-filter-group]');
    filterCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const group = cb.dataset.filterGroup;
        if (group === 'type') {
          if (cb.checked) this._selectedTypes.add(cb.value);
          else            this._selectedTypes.delete(cb.value);
        } else if (group === 'tag') {
          if (cb.checked) this._selectedTags.add(cb.value);
          else            this._selectedTags.delete(cb.value);
        }
        shell.render();
      }, { signal });
    });

  }

  async handleAction(action, event, target, shell) {
    if (action === 'toggle-category') {
      event?.preventDefault?.();
      const category = target?.dataset?.category || target?.closest?.('[data-category]')?.dataset?.category;
      if (!category) return true;
      if (this._expandedCategories.has(category)) {
        this._expandedCategories.delete(category);
      } else {
        this._expandedCategories.add(category);
      }
      shell?.render?.();
      return true;
    }

    if (action === 'toggle-show-all-feats') {
      event?.preventDefault?.();
      this._showAll = !this._showAll;
      this._refreshGroupedFeats();
      shell?.render?.();
      return true;
    }

    if (action === 'open-filter-panel') {
      event?.preventDefault?.();
      const panelId = target?.dataset?.panel;
      this._openFilterPanel = this._openFilterPanel === panelId ? null : panelId;
      shell?.render?.();
      return true;
    }

    return false;
  }

  async onStepExit(shell) {
    // Do not mutate actor here; finalizer owns application of draft selections.
  }

  // ---------------------------------------------------------------------------
  // Data Retrieval & Processing
  // ---------------------------------------------------------------------------

  /**
   * Get all feats legal for this context
   */
  async _getLegalFeats(actor, shell) {
    if (!actor) return [];

    const legal = [];
    this._availabilityByFeatId = new Map();
    const pendingAbilityData = this._buildPendingAbilityData(shell);
    const classLookupKeys = resolveClassLookupKeysForFeatStep(shell);

    // Build class grant ledger to identify class-granted feats that are pending
    const classGrantedFeats = new Set();
    try {
      const selectedClass = resolveSelectedClassFromShell(shell) || resolveClassModel(
        shell?.progressionSession?.getSelection?.('class')
        || shell?.committedSelections?.get?.('class')
        || null
      );

      if (selectedClass) {
        const ledger = buildClassGrantLedger(actor, selectedClass, pendingAbilityData);
        const merged = mergeLedgerIntoPending(pendingAbilityData, ledger);

        for (const grant of [
          ...(Array.isArray(ledger?.grantedFeats) ? ledger.grantedFeats : []),
          ...(Array.isArray(merged?.grantedFeats) ? merged.grantedFeats : []),
          ...(Array.isArray(merged?.selectedFeats) ? merged.selectedFeats : []),
        ]) {
          addFeatOwnershipName(classGrantedFeats, getGrantedFeatName(grant));
        }

        if (ledger?.forceSensitive || merged?.forceSensitive) {
          addFeatOwnershipName(classGrantedFeats, 'Force Sensitivity');
          addFeatOwnershipName(classGrantedFeats, 'Force Sensitive');
        }
      }
    } catch (err) {
      swseLogger.debug('[FeatStep] Class grant resolution failed (non-critical)', {
        error: err?.message,
      });
    }

    for (const feat of this._allFeats) {
      const featId = feat?._id || feat?.id || feat?.name;
      const status = {
        isAvailable: false,
        isOwned: false,
        isGranted: false,
        isRepeatable: this._isRepeatable(feat?.name),
        missingPrerequisites: [],
        blockingReasons: [],
        unavailabilityReason: '',
        slotCompatible: false,
      };

      try {
        const assessment = AbilityEngine.evaluateAcquisition(actor, feat, pendingAbilityData) || {};
        status.missingPrerequisites = this._dedupeReasonList(Array.isArray(assessment.missingPrereqs) ? assessment.missingPrereqs : []);
        status.blockingReasons = this._dedupeReasonList(Array.isArray(assessment.blockingReasons) ? assessment.blockingReasons : []);

        const slotValidation = await FeatSlotValidator.validateFeatForSlot(
          feat,
          { slotType: this._slotType, classId: this._classId, classLookupKeys },
          actor
        );
        status.slotCompatible = !!slotValidation?.valid;

        status.isGranted = hasFeatOwnershipName(classGrantedFeats, feat.name);
        status.isOwned = actor.items.some(i =>
          i.type === 'feat' && hasFeatOwnershipName(new Set(getFeatOwnershipKeys(i.name)), feat.name)
        );

        if (!assessment?.legal) {
          status.unavailabilityReason = this._formatUnavailableReason(status.missingPrerequisites, status.blockingReasons, 'Prerequisites not met');
        } else if (!status.slotCompatible) {
          status.blockingReasons = status.blockingReasons.length ? status.blockingReasons : this._dedupeReasonList([slotValidation?.reason || 'Not valid for this feat slot']);
          status.unavailabilityReason = this._formatUnavailableReason([], status.blockingReasons, 'Not valid for this feat slot');
        } else if ((status.isOwned || status.isGranted) && !status.isRepeatable) {
          status.unavailabilityReason = status.isGranted ? 'Already granted by class/species/background.' : 'Already owned.';
        } else {
          status.isAvailable = true;
        }
      } catch (error) {
        status.blockingReasons = this._dedupeReasonList([error?.message || String(error)]);
        status.unavailabilityReason = 'Could not evaluate this feat.';
        swseLogger.warn('[FeatStep] Skipping feat after legality evaluation failure', {
          featId: feat?._id || feat?.id || null,
          featName: feat?.name || null,
          error: error?.message || String(error),
          stepId: this.descriptor?.stepId || null,
        });
      }

      Object.assign(feat, status);
      this._availabilityByFeatId.set(String(featId), status);
      if (status.isAvailable) legal.push(feat);
    }

    return legal;
  }

  _dedupeReasonList(values = []) {
    const seen = new Set();
    const out = [];
    for (const value of Array.isArray(values) ? values : []) {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(text);
    }
    return out;
  }

  _normalizeReasonComparison(value = '') {
    return String(value || '')
      .replace(/^missing:\s*/i, '')
      .replace(/^requires\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  _formatUnavailableReason(missing = [], blocking = [], fallback = 'Unavailable') {
    const missingList = this._dedupeReasonList(missing);
    const missingKeys = new Set(missingList.map(entry => this._normalizeReasonComparison(entry)).filter(Boolean));
    const blockingList = this._dedupeReasonList(blocking)
      .filter(entry => !missingKeys.has(this._normalizeReasonComparison(entry)));

    const parts = [];
    if (missingList.length) parts.push(`Missing: ${missingList.join(', ')}`);
    if (blockingList.length) parts.push(blockingList.join(', '));
    return parts.join(' • ') || fallback;
  }

  _refreshGroupedFeats() {
    const source = this._showAll ? this._allFeats : this._legalFeats;
    this._groupFeats(source || []);
  }

  /**
   * Get suggested feats from SuggestionService
   * CRITICAL: Pass characterData (chargen choices so far) for coherent suggestions
   */
  async _getSuggestedFeats(actor, availableFeats, shell) {
    try {
      // ✓ Build characterData from shell's committedSelections
      // This ensures suggestion engine understands the build-in-progress
      const characterData = this._buildCharacterDataFromShell(shell);

      const mode = shell?.mode || this.descriptor?.mode || 'chargen';
      const pendingData = SuggestionContextBuilder.buildPendingData(actor, characterData);
      pendingData.activeSlotContext = {
        slotKind: 'feat',
        slotType: this._slotType,
        classId: this._classId || null,
        activeSlotIndex: 0,
        domains: null
      };
      pendingData.classFeatLookupKeys = this._getCurrentClassLookupKeys(shell);
      const selectedClass = characterData.classes?.[0] || shell?.committedSelections?.get?.('class') || null;
      if (selectedClass && actor) {
        const ledger = buildClassGrantLedger(actor, selectedClass, pendingData);
        const merged = mergeLedgerIntoPending(pendingData, ledger);
        Object.assign(pendingData, merged);
      }

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, mode, {
        domain: 'feats',
        available: availableFeats,
        pendingData,
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      const normalizedSuggestions = (suggested || [])
        .map(f => normalizeFeatRuntime(f, { mapping: this._mapping }))
        .map(feat => attachFeatIconPath(feat));
      const rankedSuggestions = SuggestionService.sortBySuggestion(normalizedSuggestions)
        .filter(feat => (feat?.suggestion?.tier ?? feat?.tier ?? 0) > 0);

      console.info('[FeatStep] Suggested feats resolved', {
        returned: normalizedSuggestions.length,
        ranked: rankedSuggestions.length,
        top: rankedSuggestions.slice(0, TOP_SUGGESTIONS).map(feat => ({
          name: feat.name,
          tier: feat?.suggestion?.tier ?? feat?.tier ?? 0,
          confidence: feat?.suggestion?.confidence ?? feat?.confidence ?? 0,
        })),
      });

      return rankedSuggestions.slice(0, TOP_SUGGESTIONS);
    } catch (err) {
      console.warn('[FeatStep] Suggestion service error:', err);
      return [];
    }
  }

  /**
   * Extract character data from shell's committed selections
   * Allows suggestion engine to see what choices have been made so far in chargen
   */
  _buildCharacterDataFromShell(shell) {
    const selections = shell?.progressionSession?.draftSelections || null;
    const committed = shell?.committedSelections || null;

    if (!selections && !committed) {
      return {};
    }

    const committedSkills = selections?.skills || committed?.get?.('skills') || {};
    const normalizedSkills = Array.isArray(committedSkills?.trained)
      ? Object.fromEntries(committedSkills.trained.map((skillKey) => [skillKey, { trained: true }]))
      : committedSkills;

    return {
      classes: selections?.class ? [selections.class] : (committed?.get?.('class') ? [committed.get('class')] : []),
      species: selections?.species || committed?.get?.('species'),
      feats: selections?.feats || committed?.get?.('feats') || [],
      talents: selections?.talents || committed?.get?.('talents') || [],
      skills: normalizedSkills,
      abilityIncreases: selections?.attributes || committed?.get?.('attributes') || {},
    };
  }

  _getCommittedFeatSelections(shell) {
    return Array.isArray(shell?.progressionSession?.draftSelections?.feats)
      ? [...shell.progressionSession.draftSelections.feats]
      : [];
  }

  _getCommittedFeatForSlot(shell) {
    return this._getCommittedFeatSelections(shell).find(feat => feat?.slotType === this._slotType) || null;
  }

  _buildCanonicalFeatSelection(feat) {
    if (!feat) return null;
    return {
      id: feat.id || feat._id,
      name: feat.name || '',
      type: feat.type || 'feat',
      system: feat.system || {},
      img: feat.iconPath || feat.img || undefined,
      iconPath: resolveFeatIconPath(feat) || feat.iconPath || feat.img || undefined,
      slotType: this._slotType,
      source: this._slotType,
    };
  }

  _getCurrentClassLookupKeys(shell) {
    return resolveClassLookupKeysForFeatStep(shell);
  }

  _buildPendingAbilityData(shell) {
    const characterData = this._buildCharacterDataFromShell(shell);
    const selectedSkills = Array.isArray(characterData.skills?.trained)
      ? characterData.skills.trained.map(key => ({ key }))
      : Object.keys(characterData.skills || {})
        .filter(key => characterData.skills[key]?.trained || characterData.skills[key] === true)
        .map(key => ({ key }));

    const selectedClass = characterData.classes?.[0] || shell?.committedSelections?.get?.('class') || null;

    // Build provisional pending state for grant derivation
    const basePending = {
      selectedClass,
      selectedFeats: characterData.feats || [],
      selectedTalents: characterData.talents || [],
      selectedSkills,
      skillRanks: {},
      grantedFeats: [],
      pendingSpeciesContext: shell?.progressionSession?.draftSelections?.pendingSpeciesContext || null,
    };

    // Derive class-granted features (feats, proficiencies, force sensitivity)
    if (selectedClass && shell?.actor) {
      const ledger = buildClassGrantLedger(shell.actor, selectedClass, basePending);
      return mergeLedgerIntoPending(basePending, ledger);
    }

    return basePending;
  }

  /**
   * Group feats by category
   */
  _groupFeats(featsForDisplay) {
    this._groupedFeats = {};

    // Add suggested group first. Suggestions are always legal/selectable feats.
    if (this._suggestedFeats.length > 0) {
      this._groupedFeats['suggested'] = {
        label: 'Suggested for Your Build',
        icon: 'fa-star',
        feats: this._orderFeatsForTree(this._suggestedFeats),
        isSuggested: true,
      };
    }

    const suggestedIds = new Set(this._suggestedFeats.map(s => String(s?._id || s?.id || s?.name)));
    const categoryMap = {};
    for (const feat of featsForDisplay || []) {
      const featId = String(feat?._id || feat?.id || feat?.name);
      if (!this._showAll && suggestedIds.has(featId)) continue;
      const category = this._getFeatCategory(feat);
      if (!categoryMap[category]) categoryMap[category] = [];
      categoryMap[category].push(feat);
    }

    const order = ['combat', 'weapon_armor', 'force', 'skill', 'species', 'droid_cybernetic', 'faction', 'destiny_story', 'team', 'general', 'uncategorized'];
    const orderedCategories = Object.keys(categoryMap).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });

    for (const category of orderedCategories) {
      this._groupedFeats[category] = {
        label: FEAT_TYPE_LABELS[category] || this._toTitleCase(category),
        icon: this._getCategoryIcon(category),
        feats: this._orderFeatsForTree(categoryMap[category]),
        isSuggested: false,
      };
    }
  }

  _orderFeatsForTree(feats, options = {}) {
    const list = [...(feats || [])];
    const descending = options?.descending === true;
    const compareNames = (a, b) => {
      const result = String(a?.name || '').localeCompare(String(b?.name || ''));
      return descending ? -result : result;
    };

    const getFeatId = feat => String(feat?._id || feat?.id || feat?.name || '');
    const byName = new Map(list.map(feat => [normalizeFeatNameKey(feat?.name), feat]).filter(([key]) => key));

    const prerequisiteKeysById = new Map();
    for (const feat of list) {
      const id = getFeatId(feat);
      const prereqLine = String(
        feat?.prerequisiteText
        || feat?.prerequisiteLine
        || feat?.system?.prerequisite
        || feat?.system?.prerequisites
        || ''
      ).toLowerCase();
      const matches = [...byName.entries()]
        .filter(([key, parentFeat]) => parentFeat !== feat && key && prereqLine.includes(key))
        .map(([key]) => key);
      prerequisiteKeysById.set(id, matches);
    }

    const depthCache = new Map();
    const getPrereqDepth = (feat, seen = new Set()) => {
      const id = getFeatId(feat);
      if (!id || seen.has(id)) return 0;
      if (depthCache.has(id)) return depthCache.get(id);
      seen.add(id);
      const prereqKeys = prerequisiteKeysById.get(id) || [];
      let depth = 0;
      for (const key of prereqKeys) {
        const parentFeat = byName.get(key);
        if (!parentFeat) continue;
        depth = Math.max(depth, 1 + getPrereqDepth(parentFeat, new Set(seen)));
      }
      depthCache.set(id, depth);
      return depth;
    };

    const children = new Map();
    const hasParent = new Set();

    for (const feat of list) {
      const id = getFeatId(feat);
      const parentCandidates = (prerequisiteKeysById.get(id) || [])
        .map(key => [key, byName.get(key)])
        .filter(([, parentFeat]) => parentFeat && parentFeat !== feat)
        .sort((a, b) => {
          // Prefer the deepest prerequisite in the chain, so a feat that requires
          // both Force Sensitivity and Force Training nests under Force Training.
          const depthDelta = getPrereqDepth(b[1]) - getPrereqDepth(a[1]);
          if (depthDelta) return depthDelta;
          const lengthDelta = b[0].length - a[0].length;
          if (lengthDelta) return lengthDelta;
          return String(a[1]?.name || '').localeCompare(String(b[1]?.name || ''));
        });

      const parent = parentCandidates[0];
      if (parent) {
        const parentId = getFeatId(parent[1]);
        if (!children.has(parentId)) children.set(parentId, []);
        children.get(parentId).push(feat);
        hasParent.add(id);
      }
    }

    const sorted = [];
    const visit = (feat, depth = 0, seen = new Set()) => {
      const id = getFeatId(feat);
      if (!id || seen.has(id)) return;
      seen.add(id);
      sorted.push({ ...feat, treeIndent: Math.min(depth, 6) });
      const kids = (children.get(id) || []).sort(compareNames);
      for (const child of kids) visit(child, depth + 1, new Set(seen));
    };

    const roots = list
      .filter(feat => !hasParent.has(getFeatId(feat)))
      .sort(compareNames);
    for (const root of roots) visit(root, 0);
    return sorted;
  }

  _toTitleCase(str) {
    return String(str).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Normalize a raw featType string to a stable lowercase key
   */
  _normalizeFeatTypeKey(raw) {
    if (!raw) return 'general';
    return String(raw).toLowerCase().trim();
  }

  /**
   * Get icon for category
   */
  _normalizeFeat(feat) {
    if (!feat) return feat;
    const normalized = attachFeatIconPath(normalizeFeatRuntime(feat, { mapping: this._mapping }));
    return {
      ...normalized,
      iconPath: resolveFeatIconPath(normalized) || normalized.iconPath || normalized.img || '',
      prerequisiteLine: normalized.prerequisiteText || this._formatPrerequisiteLine(normalized.prerequisitesStructured),
      isAvailable: true,
    };
  }

  _formatPrerequisiteLine(raw) {
    if (!raw) return 'No prerequisites';
    if (Array.isArray(raw)) return raw.map(r => typeof r === 'string' ? r : (r?.name || r?.type || JSON.stringify(r))).filter(Boolean).join(', ') || 'No prerequisites';
    if (typeof raw === 'string') return raw.trim() || 'No prerequisites';
    if (typeof raw === 'object') {
      if (raw.raw) return this._formatPrerequisiteLine(raw.raw);
      if (raw.name) return String(raw.name);
      if (raw.type && raw.value != null) return `${raw.type}: ${raw.value}`;
      return Object.entries(raw).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : String(v)}`).join(', ');
    }
    return 'No prerequisites';
  }

  _getCategoryIcon(category) {
    return FEAT_TYPE_ICONS[category] || 'fa-circle';
  }

  _getFeatCategory(feat) {
    return normalizeFeatTypeKey(feat?.featType || feat?.category || feat?.system?.featType || 'general');
  }

  _getFeatDescription(feat) {
    return extractDescriptionText(feat);
  }

  _getFeatPrerequisites(feat) {
    const text = String(feat?.prerequisiteText || '').trim();
    return text ? [text] : [];
  }

  /**
   * Get prerequisite line for compact middle-panel display
   */
  _getPrerequisiteLine(feat) {
    const cleaned = String(feat?.prerequisiteText || '').trim();
    return cleaned || 'No prerequisite';
  }

  /**
   * Get feat by ID
   */
  _getFeat(featId) {
    return this._allFeats.find(f => (f._id === featId || f.id === featId || f.name === featId));
  }

  // ---------------------------------------------------------------------------
  // Mapping Helpers
  // ---------------------------------------------------------------------------

  /**
   * Load feat-buckets-and-subbuckets.json once and cache at module level
   */
  async _loadMapping() {
    return loadFeatBucketsMapping();
  }

  /**
   * Attach uiBroadTags from mapping to every feat in _allFeats (mutates in place)
   */
  _annotateFeatsWithTags() {
    const perFeat = this._mapping?.perFeat || {};
    for (const feat of this._allFeats) {
      feat.uiBroadTags = this._getFeatTagsFromMapping(feat);
    }
  }

  /**
   * Return uiBroadTags for a feat from the mapping (safe, returns [] when unmapped)
   */
  _getFeatTagsFromMapping(feat) {
    return Array.isArray(feat?.uiBroadTags) ? feat.uiBroadTags : [];
  }

  /**
   * Check if a feat is legal for current actor
   */
  async _isLegal(actor, feat) {
    const assessment = AbilityEngine.evaluateAcquisition(actor, feat);
    return assessment.legal;
  }

  /**
   * Get prerequisite details for display
   */
  async _getPrerequisiteDetails(actor, feat) {
    const assessment = AbilityEngine.evaluateAcquisition(actor, feat);

    return {
      legal: assessment.legal,
      met: assessment.legal,
      missing: assessment.missingPrereqs || [],
      blocking: assessment.blockingReasons || [],
    };
  }

  /**
   * Check if feat is repeatable
   */
  _isRepeatable(featName) {
    const repeatables = Array.isArray(FeatEngine.repeatables) ? FeatEngine.repeatables : [];
    return getFeatOwnershipKeys(featName).some(key =>
      repeatables.some(entry => normalizeFeatNameKey(entry) === key)
    );
  }

  /**
   * Check if feat is already owned
   */
  _isAlreadyOwned(actor, feat) {
    return actor.items.some(i =>
      i.type === 'feat' && hasFeatOwnershipName(new Set(getFeatOwnershipKeys(i.name)), feat?.name)
    );
  }

  // ---------------------------------------------------------------------------
  // Step Plugin Methods
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    // Prepare grouped feats for display
    const groupedDisplay = {};

    for (const [categoryKey, group] of Object.entries(this._groupedFeats)) {
      // Apply type filter: skip groups that don't match (suggested group always passes)
      if (this._selectedTypes.size > 0 && !group.isSuggested && !this._selectedTypes.has(categoryKey)) {
        continue;
      }

      const featsToShow = this._filterFeatsBySearch(group.feats);

      groupedDisplay[categoryKey] = {
        label: group.label,
        icon: group.icon,
        isSuggested: group.isSuggested,
        isExpanded: this._expandedCategories.has(categoryKey),
        feats: featsToShow.map(feat => ({
          _id: feat._id || feat.id,
          id: feat.id || feat._id,
          name: feat.name,
          category: feat.featTypeLabel || getFeatTypeLabel(this._getFeatCategory(feat)),
          subcategory: feat.subcategory || '',
          prerequisiteLine: feat.prerequisiteLine || this._getPrerequisiteLine(feat),
          isSuggested: this._suggestedFeats.some(s => (s._id || s.id) === (feat._id || feat.id)),
          isFocused: (feat._id || feat.id) === this._focusedFeatId,
          isSelected: (feat._id || feat.id) === this._selectedFeatId,
          isAvailable: feat.isAvailable !== false,
          isOwned: !!feat.isOwned,
          isGranted: !!feat.isGranted,
          unavailabilityReason: feat.unavailabilityReason || null,
          missingPrerequisites: this._dedupeReasonList(feat.missingPrerequisites || []),
          blockingReasons: this._dedupeReasonList(feat.blockingReasons || []),
          treeIndent: feat.treeIndent || 0,
          shortSummary: feat.shortSummary || '',
          uiBroadTags: feat.uiBroadTags || [],
        })),
        visibleCount: Math.min(featsToShow.length, FEATS_PER_CATEGORY_INITIAL),
        totalCount: featsToShow.length,
        canExpand: featsToShow.length > FEATS_PER_CATEGORY_INITIAL,
      };
    }

    // Type options — built from all available groups (excluding suggested)
    const typeOptions = Object.keys(this._groupedFeats)
      .filter(k => k !== 'suggested')
      .sort()
      .map(t => ({
        value: t,
        label: getFeatTypeLabel(t),
        checked: this._selectedTypes.has(t),
      }));

    // Tag options — from mapping intent (the canonical UI sub-bucket list)
    const rawTags = this._mapping?.intent?.addsUiSubBuckets || [];
    const tagOptions = [...rawTags].sort().map(t => ({
      value: t,
      label: t,
      checked: this._selectedTags.has(t),
    }));

    // Get committed feats from session and order them canonically
    const committedFeats = context?.shell?.progressionSession?.draftSelections?.feats || [];
    const orderedSelections = canonicallyOrderSelections(committedFeats);

    // PHASE 2 UX: Micro-progress — show slot progress
    // Note: For a single feat slot, this step shows 0-1 selection
    // For normalized Feat step (Phase: Normalized Steps), this will show dual subsection progress
    const slotSelections = committedFeats.filter(feat => feat?.slotType === this._slotType);
    const selectedCount = slotSelections.length;
    const requiredCount = 1; // Single feat slot per step
    const remainingCount = Math.max(0, requiredCount - selectedCount);
    const isComplete = remainingCount === 0;

    const slotProgress = {
      selectedCount,
      requiredCount,
      remainingCount,
      isComplete,
      progressLabel: `${selectedCount} of ${requiredCount} feat${requiredCount === 1 ? '' : 's'}`,
      remainingLabel: remainingCount > 0
        ? `${remainingCount} feat${remainingCount === 1 ? '' : 's'} remaining`
        : 'Complete',
    };

    return {
      groupedFeats: groupedDisplay,
      focusedFeatId: this._focusedFeatId,
      selectedFeatId: this._selectedFeatId,
      searchQuery: this._searchQuery,
      showAll: this._showAll,
      legalFeatCount: this._legalFeats.length,
      allFeatCount: this._allFeats.length,
      slotType: this._slotType,
      orderedSelections,
      // PHASE 2 UX: Slot progress
      slotProgress,
      // Filter state
      typeOptions,
      tagOptions,
      selectedTypesCount: this._selectedTypes.size,
      selectedTagsCount: this._selectedTags.size,
      openFilterPanel: this._openFilterPanel,
    };
  }

  getSelection() {
    const isComplete = !!this._selectedFeatId;
    return {
      selected: this._selectedFeatId ? [this._selectedFeatId] : [],
      count: this._selectedFeatId ? 1 : 0,
      isComplete,
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/feat-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!this._focusedFeatId) {
      emitFeatStepTrace('DETAILS_EMPTY', {
        reason: 'no-focused-feat-id',
        stepId: this.descriptor?.stepId || null,
        selectedFeatId: this._selectedFeatId,
      });
      return this.renderDetailsPanelEmptyState();
    }

    const feat = this._getFeat(this._focusedFeatId);
    if (!feat) {
      emitFeatStepTrace('DETAILS_EMPTY', {
        reason: 'focused-feat-not-found',
        stepId: this.descriptor?.stepId || null,
        focusedFeatId: this._focusedFeatId,
      });
      return this.renderDetailsPanelEmptyState();
    }

    attachFeatIconPath(feat);
    const featId = feat._id || feat.id;
    const isSuggested = this._suggestedFeats.some(s => (s._id || s.id) === featId);
    const isSelected = featId === this._selectedFeatId;

    // Normalize detail panel data for canonical display (no fabrication)
    const normalizedDetails = normalizeDetailPanelData(feat, 'feat', {
      metadata: { tags: feat.uiBroadTags || [] },
    });

    emitFeatStepTrace('DETAILS_READY', {
      featId,
      featName: feat?.name || null,
      isSuggested,
      isSelected,
      prerequisiteLine: feat.prerequisiteText || feat.prerequisiteLine || this._getPrerequisiteLine(feat),
    });

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/feat-details.hbs',
      data: {
        feat: { ...feat, iconPath: resolveFeatIconPath(feat) || feat.iconPath || feat.img || '' },
        categoryIcon: this._getCategoryIcon(this._getFeatCategory(feat)),
        isSuggested,
        isSelected,
        category: feat.featTypeLabel || getFeatTypeLabel(this._getFeatCategory(feat)),
        description: normalizedDetails.description || this._getFeatDescription(feat) || '',
        prerequisites: this._getFeatPrerequisites(feat),
        prerequisiteLine: feat.prerequisiteText || feat.prerequisiteLine || this._getPrerequisiteLine(feat),
        shortSummary: feat.shortSummary || '',
        isRepeatable: this._isRepeatable(feat.name),
        isAvailable: feat.isAvailable !== false,
        isOwned: !!feat.isOwned,
        isGranted: !!feat.isGranted,
        missingPrerequisites: this._dedupeReasonList(feat.missingPrerequisites || []),
        blockingReasons: this._dedupeReasonList(feat.blockingReasons || []),
        unavailabilityReason: feat.unavailabilityReason || '',
        uiBroadTags: feat.uiBroadTags || [],
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Focus/Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(item) {
    this._focusedFeatId = item?._id || item?.id || item;
    emitFeatStepTrace('ITEM_FOCUSED', {
      focusedFeatId: this._focusedFeatId,
      itemName: item?.name || null,
    });
  }

  async onItemCommitted(item, shell) {
    if (!item) return;

    const feat = this._getFeat(item?.id || item?._id || item);
    if (!feat) {
      emitFeatStepTrace('ITEM_COMMIT_FAILED', {
        reason: 'feat-not-found',
        incomingItem: item?.id || item?._id || item || null,
      });
      return;
    }

    if (feat.isAvailable === false) {
      ui.notifications?.warn?.(feat.unavailabilityReason || 'That feat is not currently available.');
      emitFeatStepTrace('ITEM_COMMIT_REJECTED_UNAVAILABLE', {
        featId: feat?._id || feat?.id || null,
        featName: feat?.name || null,
        reason: feat?.unavailabilityReason || null,
      });
      return;
    }

    const featId = feat._id || feat.id;
    const currentSelections = this._getCommittedFeatSelections(shell);
    const slotSelections = currentSelections.filter(entry => entry?.slotType !== this._slotType);
    const isTogglingOff = this._selectedFeatId === featId;
    let nextSelection = isTogglingOff ? null : this._buildCanonicalFeatSelection(feat);
    if (nextSelection) {
      const choiceMeta = FeatChoiceResolver.getChoiceMeta(feat);
      const choiceSource = FeatChoiceResolver.inferChoiceSource(feat);
      if (choiceMeta?.required && choiceSource !== 'grantPool') {
        const pendingForChoice = this._buildPendingAbilityData(shell);
        pendingForChoice.selectedFeats = slotSelections;
        const selectedChoice = await FeatChoiceDialog.prompt(shell.actor, feat, { title: `Choose: ${feat.name}` });
        if (!selectedChoice) {
          emitFeatStepTrace('ITEM_COMMIT_CANCELLED_FOR_CHOICE', {
            featId,
            featName: feat?.name || null,
            choiceKind: choiceMeta?.choiceKind || null,
          });
          return;
        }

        const choiceValidation = await FeatChoiceResolver.validateSelectedChoice(shell.actor, feat, selectedChoice, { pending: pendingForChoice });
        if (!choiceValidation.valid) {
          ui.notifications?.warn?.(choiceValidation.errors?.join(' ') || 'That feat choice is not currently legal.');
          emitFeatStepTrace('ITEM_COMMIT_REJECTED_FOR_CHOICE_LEGALITY', {
            featId,
            featName: feat?.name || null,
            choiceKind: choiceMeta?.choiceKind || null,
            errors: choiceValidation.errors || [],
          });
          return;
        }

        const candidateWithChoice = {
          ...feat,
          system: {
            ...(feat.system || {}),
            selectedChoice
          }
        };
        const selectedChoicePending = {
          ...pendingForChoice,
          selectedChoice,
          candidateChoice: selectedChoice
        };
        const choiceAwareAssessment = AbilityEngine.evaluateAcquisition(shell.actor, candidateWithChoice, selectedChoicePending);
        if (!choiceAwareAssessment?.legal) {
          const reasons = choiceAwareAssessment?.blockingReasons || choiceAwareAssessment?.missingPrereqs || ['Feat prerequisites are not met for that selected choice.'];
          ui.notifications?.warn?.(reasons.join(' '));
          emitFeatStepTrace('ITEM_COMMIT_REJECTED_FOR_PREREQ_LEGALITY', {
            featId,
            featName: feat?.name || null,
            choiceKind: choiceMeta?.choiceKind || null,
            reasons,
          });
          return;
        }

        nextSelection = {
          ...nextSelection,
          system: {
            ...(nextSelection.system || {}),
            selectedChoice,
            choiceResolved: true,
            choiceResolvedAt: new Date().toISOString()
          }
        };
      }
    }
    const nextSelections = nextSelection ? [...slotSelections, nextSelection] : slotSelections;

    this._selectedFeatId = nextSelection?.id || null;
    this._selectedFeatItem = nextSelection || null;

    emitFeatStepTrace('ITEM_COMMITTED', {
      featId,
      featName: feat?.name || null,
      selectedFeatId: this._selectedFeatId,
      slotType: this._slotType,
      totalSelections: nextSelections.length,
    });

    await this._commitNormalized(shell, 'feats', nextSelections);
    await this._syncFeatPendingEntitlements(shell, nextSelections);

    if (shell?.committedSelections && this.descriptor?.stepId) {
      shell.committedSelections.set(this.descriptor.stepId, nextSelection);
    }
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, nextSelection);
    }
  }

  // ---------------------------------------------------------------------------
  // Pending Entitlement Integration
  // ---------------------------------------------------------------------------

  _getPendingEntitlementTypeForFeat(feat) {
    const name = String(feat?.name || feat?.label || feat?.id || feat?._id || '').trim().toLowerCase();
    const slug = name.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (name === 'skill training' || slug === 'skill-training') return 'skill_training_slot';
    if (name === 'linguist' || slug === 'linguist') return 'language_pick';
    if (name === 'force training' || slug === 'force-training') return 'force_power_pick';
    if (name === 'starship tactics' || slug === 'starship-tactics') return 'maneuver_pick';

    const grants = feat?.system?.grants || feat?.system?.progression?.grants || [];
    const grantTypes = Array.isArray(grants) ? grants : Object.values(grants || {});
    for (const grant of grantTypes) {
      const type = String(grant?.type || grant?.kind || grant?.grantType || '').toLowerCase();
      if (type === 'skill_training_slot' || type === 'skill_training') return 'skill_training_slot';
      if (type === 'language_pick' || type === 'language_slot') return 'language_pick';
      if (type === 'force_power_pick' || type === 'force_power_choice') return 'force_power_pick';
      if (type === 'maneuver_pick' || type === 'starship_maneuver_pick') return 'maneuver_pick';
    }

    return null;
  }

  _getPendingFeatEntitlementQuantity(shell, feat, entitlementType) {
    const explicit = Number(
      feat?.system?.entitlementQuantity
      ?? feat?.system?.progression?.quantity
      ?? feat?.system?.quantity
      ?? 0
    );
    if (Number.isFinite(explicit) && explicit > 0) return Math.max(1, Math.floor(explicit));

    const mod = (abilityKey) => this._getPendingAbilityModifier(shell, abilityKey);

    if (entitlementType === 'language_pick') return Math.max(1, 1 + mod('int'));
    if (entitlementType === 'force_power_pick') return Math.max(1, 1 + mod('wis'));
    if (entitlementType === 'maneuver_pick') return Math.max(1, 1 + mod('wis'));
    return 1;
  }

  _getPendingAbilityModifier(shell, abilityKey) {
    const pending = shell?.progressionSession?.draftSelections?.attributes;
    const values = pending?.values && typeof pending.values === 'object' ? pending.values : pending || {};
    const raw = values?.[abilityKey]?.score
      ?? values?.[abilityKey]?.base
      ?? values?.[abilityKey]?.value
      ?? values?.[abilityKey]
      ?? shell?.actor?.system?.abilities?.[abilityKey]?.mod
      ?? shell?.actor?.system?.abilities?.[abilityKey]?.modifier
      ?? shell?.actor?.system?.abilities?.[abilityKey]?.base
      ?? shell?.actor?.system?.abilities?.[abilityKey]?.value
      ?? 10;

    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return 0;

    // If the stored value already looks like a modifier, use it as-is.
    if (numeric >= -5 && numeric <= 10 && (raw === shell?.actor?.system?.abilities?.[abilityKey]?.mod || raw === shell?.actor?.system?.abilities?.[abilityKey]?.modifier)) {
      return Math.floor(numeric);
    }

    return Math.floor((numeric - 10) / 2);
  }

  async _syncFeatPendingEntitlements(shell, featSelections = []) {
    const existing = shell?.progressionSession?.draftSelections?.pendingEntitlements || [];
    const stepId = this.descriptor?.stepId || 'feat-step';
    const retained = existing.filter((entry) => entry?.source?.stepId !== stepId);
    const next = [...retained];

    for (const feat of featSelections || []) {
      const entitlementType = this._getPendingEntitlementTypeForFeat(feat);
      if (!entitlementType) continue;

      const featId = feat?._id || feat?.id || feat?.uuid || feat?.name || null;
      const source = {
        stepId,
        selectionKey: 'feats',
        featId,
        featName: feat?.name || feat?.label || String(featId || 'Feat'),
      };
      const quantity = this._getPendingFeatEntitlementQuantity(shell, feat, entitlementType);
      try {
        next.push(PendingEntitlementService.createEntitlement(entitlementType, source, quantity));
      } catch (err) {
        swseLogger.warn('[FeatStep] Failed to create pending entitlement for feat:', { feat: source.featName, entitlementType, err });
      }
    }

    await this._commitNormalized(shell, 'pendingEntitlements', next);
  }

  // ---------------------------------------------------------------------------
  // Search & Filter
  // ---------------------------------------------------------------------------

  _filterFeatsBySearch(feats) {
    let filtered = [...(feats || [])];

    // Search filter
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(feat =>
        feat.name.toLowerCase().includes(q) ||
        this._getFeatDescription(feat).toLowerCase().includes(q)
      );
    }

    // Tag filter: include feats that have ANY of the selected tags
    // Unmapped feats (uiBroadTags = []) are excluded only when tags are actively selected
    if (this._selectedTags.size > 0) {
      filtered = filtered.filter(feat => {
        const tags = feat.uiBroadTags || [];
        return tags.some(t => this._selectedTags.has(t));
      });
    }

    // Preserve prerequisite-tree ordering for display. The default sort is
    // "core feat A-Z": root feats are alphabetized, then prerequisite-locked
    // descendants are shown indented beneath their nearest prerequisite parent.
    return this._orderFeatsForTree(filtered, { descending: this._sortBy === 'alpha-desc' });
  }

  // ---------------------------------------------------------------------------
  // Mentor Integration
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    if (this._suggestedFeats?.length) {
      await handleAskMentorWithPicker(shell.actor, 'general-feat', this._suggestedFeats, shell, {
        domain: 'feats',
        archetype: 'your feat choice',
        stepLabel: 'feats'
      }, async (selected) => {
        const item = selected?.id || selected?._id ? selected : (selected?.name ? selected : null);
        if (!item) return;
        await this.onItemFocused(item);
        await this.onItemCommitted(item, shell);
        shell.render();
      });
      return;
    }
    await handleAskMentor(shell.actor, 'general-feat', shell);
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'general-feat');
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance
    if (this.isChargen(shell)) {
      return this._isDroidProgression
        ? 'Choose feats that reinforce your chassis role package and complement your installed systems.'
        : 'Choose feats that strengthen your abilities and define your playstyle. Some feats are better for your build than others.';
    } else if (this.isLevelup(shell)) {
      return 'As you gain experience, you may learn new techniques and abilities. Choose feats that enhance your path.';
    }

    return 'Select a feat wisely.';
  }

  getMentorMode() {
    return 'interactive';
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const issues = [];
    const warnings = [];

    // Safety net: if there are no legal choices, step is auto-valid/skippable
    if (!this._noChoicesAvailable && !this._selectedFeatId) {
      issues.push('No feat selected');
    }

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings,
    };
  }

  getBlockingIssues() {
    if (this._noChoicesAvailable) {
      return [];
    }
    if (!this._selectedFeatId) {
      return [`Select a ${this._slotType === 'class' ? 'Class' : 'General'} Feat`];
    }
    return [];
  }

  /**
   * PHASE 3 UX: Specific, actionable explanation for why Next is blocked
   */
  getBlockerExplanation() {
    if (this._noChoicesAvailable) {
      return null;
    }
    if (!this._selectedFeatId) {
      const slotTypeLabel = this._slotType === 'class' ? 'Class' : 'General';
      return `Choose a ${slotTypeLabel} Feat to continue`;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Utility Bar
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: this._isDroidProgression ? 'Search droid feats…' : 'Search feats…' },
      // Type and tag filters are rendered inline in the work surface, not as utility-bar chips.
      sorts: [
        { id: 'alpha-asc',  label: 'Name A→Z' },
        { id: 'alpha-desc', label: 'Name Z→A' },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  getFooterConfig() {
    const slotTypeLabel = this._slotType === 'class' ? 'Class' : 'General';

    let statusText = '';
    if (this._noChoicesAvailable) {
      statusText = `${slotTypeLabel} Feat: No legal options — safe to skip`;
    } else if (this._selectedFeatId) {
      const feat = this._getFeat(this._selectedFeatId);
      statusText = `${slotTypeLabel} Feat: ${feat?.name || 'Selected'}`;
    } else {
      statusText = `${slotTypeLabel} Feat not yet chosen`;
    }

    return {
      mode: 'feat-selection',
      statusText,
      isComplete: this._noChoicesAvailable || !!this._selectedFeatId,
      slotType: this._slotType,
    };
  }
}

/**
 * GeneralFeatStep — Instance for heroic/general feat slots
 */
export class GeneralFeatStep extends FeatStep {
  constructor(descriptor) {
    super({
      ...descriptor,
      slotType: 'heroic',
    });
  }
}

/**
 * ClassFeatStep — Instance for class-bonus feat slots
 */
export class ClassFeatStep extends FeatStep {
  constructor(descriptor) {
    super({
      ...descriptor,
      slotType: 'class',
    });
  }
}
