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
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { canonicallyOrderSelections } from '../utils/selection-ordering.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { resolveClassModel, resolveSelectedClassFromShell, getClassBonusFeatsLookupKeys } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { FEAT_TYPE_LABELS, getFeatTypeLabel, loadFeatBucketsMapping, normalizeFeatRuntime, normalizeFeatTypeKey } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-shape.js';

// Constants
const FEATS_PER_CATEGORY_INITIAL = 5;  // Constrained visible count per category
const TOP_SUGGESTIONS = 4;              // Top N suggested feats to show

// Category icons keyed by lowercase featType
const FEAT_TYPE_ICONS = {
  general:     'fa-star',
  force:       'fa-fan',
  species:     'fa-dna',
  team:        'fa-users',
  martial_arts: 'fa-hand-fist',
};


export class FeatStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // Step configuration
    this._slotType = descriptor.slotType || 'heroic';  // 'heroic' or 'class'
    this._classId = descriptor.classId || null;        // For class feat slots

    // Data
    this._allFeats = [];                 // All feats from registry
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
    this._mapping = await this._loadMapping();

    // Load canonical normalized feats from registry and reattach mapping tags for current page state
    this._allFeats = (FeatRegistry.list?.() || []).map(f => normalizeFeatRuntime(f, { mapping: this._mapping }));

    // Get legal feats for this context
    const legalFeats = await this._getLegalFeats(shell.actor, shell);
    this._noChoicesAvailable = legalFeats.length === 0;

    // Get suggested feats (pass shell so suggestion engine sees chargen choices)
    this._suggestedFeats = await this._getSuggestedFeats(shell.actor, legalFeats, shell);

    // Group feats by category
    this._groupFeats(legalFeats);

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

    // Wire filter-panel toggle buttons (Type / Tags dropdowns)
    const filterPanelBtns = shell.element.querySelectorAll('[data-action="open-filter-panel"]');
    filterPanelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const panelId = btn.dataset.panel;
        this._openFilterPanel = this._openFilterPanel === panelId ? null : panelId;
        shell.render();
      }, { signal });
    });

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

    // Wire category expand/collapse
    const categoryToggles = shell.element.querySelectorAll('[data-action="toggle-category"]');
    categoryToggles.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const category = btn.dataset.category;
        if (this._expandedCategories.has(category)) {
          this._expandedCategories.delete(category);
        } else {
          this._expandedCategories.add(category);
        }
        shell.render();
      }, { signal });
    });

    // Wire feat focus
    const featRows = shell.element.querySelectorAll('[data-action="focus-item"]');
    featRows.forEach(row => {
      row.addEventListener('click', (e) => {
        e.preventDefault();
        const featId = row.dataset.itemId || row.dataset.featId;
        this._focusedFeatId = featId;
        shell.render();
      }, { signal });
    });
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

    for (const feat of this._allFeats) {
      // Check if feat meets prerequisites using pending chargen selections
      const assessment = AbilityEngine.evaluateAcquisition(actor, feat, this._buildPendingAbilityData(shell));

      if (!assessment.legal) {
        continue;  // Skip illegal feats for now (unless showAll is on)
      }

      // Check if feat is slot-compatible
      const slotValidation = await FeatSlotValidator.validateFeatForSlot(
        feat,
        { slotType: this._slotType, classId: this._classId, classLookupKeys: this._getCurrentClassLookupKeys(shell) },
        actor
      );

      if (!slotValidation.valid) {
        continue;  // Skip slot-incompatible feats
      }

      // Check if already owned (unless repeatable)
      const alreadyOwned = actor.items.some(i =>
        i.type === 'feat' && i.name.toLowerCase() === feat.name.toLowerCase()
      );

      if (alreadyOwned && !FeatEngine.repeatables.includes(feat.name.toLowerCase())) {
        continue;  // Skip non-repeatable feats already owned
      }

      legal.push(feat);
    }

    return legal;
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

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'feats',
        available: availableFeats,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      const normalizedSuggestions = (suggested || []).map(f => normalizeFeatRuntime(f, { mapping: this._mapping }));
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
    if (!shell?.committedSelections) {
      return {};
    }

    const committed = shell.committedSelections;

    return {
      classes: committed.get('class') ? [committed.get('class')] : [],
      species: committed.get('species'),
      feats: committed.get('feats') || [],
      talents: committed.get('talents') || [],
      skills: committed.get('skills') || {},
      abilityIncreases: committed.get('attributes') || {},
    };
  }

  /**
   * Group feats by category
   */
  _groupFeats(legalFeats) {
    this._groupedFeats = {};

    // Add suggested group first
    if (this._suggestedFeats.length > 0) {
      this._groupedFeats['suggested'] = {
        label: 'Suggested for Your Build',
        icon: 'fa-star',
        feats: this._suggestedFeats,
        isSuggested: true,
      };
    }

    // Group by category
    const categoryMap = {};
    for (const feat of legalFeats) {
      const category = this._getFeatCategory(feat);
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      // Don't re-add suggestions
      if (!this._suggestedFeats.some(s => (s._id || s.id) === (feat._id || feat.id))) {
        categoryMap[category].push(feat);
      }
    }

    // Convert to grouped object with friendly labels
    for (const [category, feats] of Object.entries(categoryMap)) {
      this._groupedFeats[category] = {
        label: FEAT_TYPE_LABELS[category] || this._toTitleCase(category),
        icon: this._getCategoryIcon(category),
        feats,
        isSuggested: false,
      };
    }
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
    const normalized = normalizeFeatRuntime(feat, { mapping: this._mapping });
    return {
      ...normalized,
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
    return normalizeFeatTypeKey(feat?.featType || feat?.category || feat?.system?.featType);
  }

  _getFeatDescription(feat) {
    return String(feat?.description || '').trim();
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
    return FeatEngine.repeatables.includes(featName.toLowerCase());
  }

  /**
   * Check if feat is already owned
   */
  _isAlreadyOwned(actor, feat) {
    return actor.items.some(i =>
      i.type === 'feat' && i.name.toLowerCase() === feat.name.toLowerCase()
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
          prerequisiteLine: feat.prerequisiteLine || this._getPrerequisiteLine(feat),
          isSuggested: this._suggestedFeats.some(s => (s._id || s.id) === (feat._id || feat.id)),
          isFocused: (feat._id || feat.id) === this._focusedFeatId,
          isSelected: (feat._id || feat.id) === this._selectedFeatId,
          isAvailable: true,
          unavailabilityReason: null,
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
    const selectedCount = committedFeats.length;
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
      return this.renderDetailsPanelEmptyState();
    }

    const feat = this._getFeat(this._focusedFeatId);
    if (!feat) {
      return this.renderDetailsPanelEmptyState();
    }

    const featId = feat._id || feat.id;
    const isSuggested = this._suggestedFeats.some(s => (s._id || s.id) === featId);
    const isSelected = featId === this._selectedFeatId;

    // Normalize detail panel data for canonical display (no fabrication)
    normalizeDetailPanelData(feat, 'feat', {
      metadata: { tags: feat.uiBroadTags || [] },
    });

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/feat-details.hbs',
      data: {
        feat,
        isSuggested,
        isSelected,
        category: feat.featTypeLabel || getFeatTypeLabel(this._getFeatCategory(feat)),
        description: feat.description || '',
        prerequisites: this._getFeatPrerequisites(feat),
        prerequisiteLine: feat.prerequisiteText || feat.prerequisiteLine || this._getPrerequisiteLine(feat),
        isRepeatable: this._isRepeatable(feat.name),
        uiBroadTags: feat.uiBroadTags || [],
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Focus/Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(item) {
    this._focusedFeatId = item?._id || item?.id || item;
  }

  async onItemCommitted(item, shell) {
    if (!item) return;

    const feat = this._getFeat(item?.id || item?._id || item);
    if (!feat) return;

    // Toggle selection
    const featId = feat._id || feat.id;
    if (this._selectedFeatId === featId) {
      this._selectedFeatId = null;
    } else {
      this._selectedFeatId = featId;
    }

    // Update observable build intent (Phase 6 solution)
    // Each feat slot (general/class) commits to shell.committedSelections with its own stepId,
    // and also updates buildIntent for cross-step visibility
    if (shell?.buildIntent && this.descriptor?.stepId) {
      const selectedFeatData = this._selectedFeatId
        ? { featId: this._selectedFeatId, feat, slotType: this._slotType }
        : null;
      shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, selectedFeatData);
    }
  }

  // ---------------------------------------------------------------------------
  // Search & Filter
  // ---------------------------------------------------------------------------

  _filterFeatsBySearch(feats) {
    let filtered = feats;

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

    // Sort
    if (this._sortBy === 'alpha-desc') {
      filtered = [...filtered].sort((a, b) => String(b.name).localeCompare(String(a.name)));
    } else {
      // 'alpha-asc' is the default (also covers legacy 'alpha')
      filtered = [...filtered].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }

    return filtered;
  }

  // ---------------------------------------------------------------------------
  // Mentor Integration
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    await handleAskMentor(shell.actor, 'general-feat', shell);
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'general-feat');
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance
    if (this.isChargen(shell)) {
      return 'Choose feats that strengthen your abilities and define your playstyle. Some feats are better for your build than others.';
    } else if (this.isLevelup(shell)) {
      return 'As you gain experience, you may learn new techniques and abilities. Choose feats that enhance your path.';
    }

    return 'Select a feat wisely.';
  }

  getMentorMode() {
    return 'context-only';
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
      search: { enabled: true, placeholder: 'Search feats…' },
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
