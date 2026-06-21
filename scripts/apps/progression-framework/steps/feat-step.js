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
import { FeatGrantEntitlementResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js';
import { buildLevelUpEntitlementManifest, getManifestStartingFeatNameSet, normalizeManifestName } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-entitlement-manifest.js';
import { isDroidProgressionActor } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js';
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { ForceRules } from '/systems/foundryvtt-swse/scripts/engine/force/ForceRules.js';
import { PrereqAdapter } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/prereq-adapter.js';

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

function localizeProgressionText(key, data = null) {
  const i18n = globalThis.game?.i18n;
  if (!i18n) return key;
  return data ? i18n.format(key, data) : i18n.localize(key);
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
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!key) return '';
  return key;
}

function getFeatOwnershipKeys(name) {
  const base = normalizeFeatNameKey(name);
  const keys = new Set([base]);
  if (base === 'force sensitivity') keys.add('force sensitive');
  if (base === 'force sensitive') keys.add('force sensitivity');
  if (base === 'weapon proficiency simple') keys.add('weapon proficiency simple weapons');
  if (base === 'weapon proficiency simple weapons') keys.add('weapon proficiency simple');
  if (base === 'advanced melee weapon proficiency') keys.add('weapon proficiency advanced melee weapons');
  if (base === 'weapon proficiency advanced melee weapons') keys.add('advanced melee weapon proficiency');
  if (base === 'heavy weapon proficiency') keys.add('weapon proficiency heavy weapons');
  if (base === 'weapon proficiency heavy weapons') keys.add('heavy weapon proficiency');
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


function iterableValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set || value instanceof Map) return Array.from(value.values());
  if (typeof value.values === 'function' && typeof value !== 'string') {
    try { return Array.from(value.values()); } catch (_err) { return []; }
  }
  if (typeof value === 'object' && Array.isArray(value.contents)) return value.contents;
  return [];
}

function getEntrySelectedChoiceLabel(entry) {
  const choice = entry?.system?.selectedChoice
    ?? entry?.system?.selectedChoices
    ?? entry?.selectedChoice
    ?? entry?.choice
    ?? entry?.choiceValue
    ?? null;
  return FeatChoiceResolver.getChoiceLabel?.(choice) || '';
}

function addFeatOwnershipEntry(set, entry) {
  const name = getGrantedFeatName(entry);
  if (name) addFeatOwnershipName(set, name);

  const choiceLabel = getEntrySelectedChoiceLabel(entry);
  if (!choiceLabel || !name) return;

  const baseName = String(name || '').replace(/\s*\([^)]*\)\s*$/g, '').trim();
  if (!baseName) return;
  addFeatOwnershipName(set, `${baseName} (${choiceLabel})`);
  addFeatOwnershipName(set, `${name} (${choiceLabel})`);
}

function collectFeatPrerequisiteTokens(text, baseName) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  const needle = String(baseName || '').toLowerCase();
  const tokens = [];
  let index = 0;

  while (needle && index < raw.length) {
    const found = lower.indexOf(needle, index);
    if (found < 0) break;
    let cursor = found + needle.length;
    while (cursor < raw.length && /\s/.test(raw[cursor])) cursor += 1;

    if (raw[cursor] !== '(') {
      tokens.push(baseName);
      index = cursor + 1;
      continue;
    }

    let depth = 0;
    let end = cursor;
    for (; end < raw.length; end += 1) {
      const char = raw[end];
      if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    if (depth === 0 && end > cursor) {
      const inside = raw.slice(cursor + 1, end).trim();
      tokens.push(inside ? `${baseName} (${inside})` : baseName);
      index = end + 1;
    } else {
      tokens.push(baseName);
      index = cursor + 1;
    }
  }

  return [...new Set(tokens.map(token => String(token || '').replace(/\s+/g, ' ').trim()).filter(Boolean))];
}

function collectChoiceFeatPrerequisiteAlternatives(text) {
  const raw = String(text || '');
  const tokens = [
    ...collectFeatPrerequisiteTokens(raw, 'Skill Focus'),
  ];

  if (!tokens.length) return [];

  // These textual prerequisite lines commonly encode alternate choices, e.g.
  // "Skill Focus (Knowledge A) or Skill Focus (Knowledge B)". Treat each
  // "or" group as one requirement that can be satisfied by any listed token.
  if (/\bor\b/i.test(raw) && tokens.length > 1) {
    return [tokens];
  }
  return tokens.map(token => [token]);
}

function buildFeatPrerequisiteOwnershipNames(actor, pendingAbilityData = {}, extraNames = new Set()) {
  const names = new Set();

  for (const item of iterableValues(actor?.items)) {
    if (item?.type === 'feat') addFeatOwnershipEntry(names, item);
  }

  for (const pool of [pendingAbilityData?.selectedFeats, pendingAbilityData?.grantedFeats, pendingAbilityData?.grantedProficiencies]) {
    for (const entry of iterableValues(pool)) addFeatOwnershipEntry(names, entry);
  }

  for (const name of extraNames || []) addFeatOwnershipName(names, name);
  return names;
}

function getUnmetChoiceFeatPrerequisites(feat, ownedFeatNames = new Set()) {
  const raw = feat?.prerequisiteText
    || feat?.prerequisiteLine
    || feat?.system?.prerequisite
    || feat?.system?.prerequisites
    || '';
  const alternatives = collectChoiceFeatPrerequisiteAlternatives(raw);
  const missing = [];

  for (const group of alternatives) {
    const satisfied = group.some(token => hasFeatOwnershipName(ownedFeatNames, token));
    if (!satisfied) missing.push(group.join(' or '));
  }

  return missing;
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
    this._selectedFeatId = null;         // Primary/last committed feat for this slot (legacy single-selection API)
    this._selectedFeatIds = [];          // All committed feat IDs for this slot (Human L1 and other multi-feat budgets)
    this._requiredFeatCount = 1;         // Number of picks owed by this feat step
    this._searchQuery = '';              // Search filter
    this._showAll = false;               // Toggle: show ineligible feats
    this._expandedCategories = new Set();// Legacy expand state retained for compatibility
    this._activeCategory = null;         // Category currently shown in the body browser
    this._categorySidebarCollapsed = false; // Lets players widen the feat list after choosing a category

    // UI state
    this._selectedFeatItem = null;       // The actual feat item for display
    this._noChoicesAvailable = false;     // safety net for zero-option steps
    this._catalogUnavailable = false;     // true when FeatRegistry has no hydrated feat catalog
    this._catalogUnavailableMessage = ''; // player-facing explanation for catalog outages

    // Mapping & filter state
    this._mapping = null;                // feat-buckets-and-subbuckets.json
    this._selectedTypes = new Set();     // Active featType multi-select filter
    this._selectedTags  = new Set();     // Active tag multi-select filter
    this._openFilterPanel = null;        // Which dropdown is open: 'type' | 'tag' | null
    this._sortBy = 'alpha-asc';          // Default sort

    // Event listener cleanup
    this._renderAbort = null;            // AbortController for automatic listener cleanup
    this._isDroidProgression = false;
    this._suppressNextAutoAdvance = false; // Used when a modal choice intentionally keeps the player on/backtracks from the feat step.
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
    this._catalogUnavailable = this._allFeats.length === 0;
    this._catalogUnavailableMessage = this._catalogUnavailable
      ? localizeProgressionText('SWSE.Progression.Feat.Messages.CatalogHydrationFailed')
      : '';
    if (this._catalogUnavailable) this._showAll = false;
    this._isDroidProgression = shell?.progressionSession?.subtype === 'droid';
    this._requiredFeatCount = this._getRequiredFeatCount(shell);
    const existingFeats = this._getCommittedFeatsForSlot(shell);
    this._selectedFeatIds = existingFeats.map(feat => feat?.id || feat?._id || feat?.name).filter(Boolean);
    this._selectedFeatId = this._selectedFeatIds[0] || null;
    this._selectedFeatItem = existingFeats[0] || null;
    // Auto-focus the committed feat so the detail panel shows on step enter
    // without requiring the user to click again.
    if (this._selectedFeatItem) {
      this._focusedFeatId = this._selectedFeatItem._id || this._selectedFeatItem.id || this._selectedFeatId;
    }

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
    this._ensureDefaultFocusedFeat();

    // Group feats by category. Legal-only is the default; Show All uses hydrated feats with status flags.
    this._refreshGroupedFeats();
    emitFeatStepTrace('GROUPING_COMPLETE', {
      groups: Object.fromEntries(Object.entries(this._groupedFeats || {}).map(([key, group]) => [key, group?.feats?.length || 0])),
      suggestedCount: this._suggestedFeats.length,
    });

    // Category-browser default: suggested first when present, otherwise first hydrated category.
    this._expandedCategories.clear();
    if (this._suggestedFeats.length > 0) {
      this._expandedCategories.add('suggested');
    }
    this._ensureActiveCategory();
    this._categorySidebarCollapsed = false;

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
      if (e.detail?.handledByStepHook) return;
      this._searchQuery = e.detail.query || '';
      this._syncSidebarForSearch();
      shell?.requestRender?.({ preserveScroll: true, reason: 'feat-search' }) ?? shell?.render?.();
    };
    const onFilter = e => {
      if (e.detail?.handledByStepHook) return;
      const { filterId, value } = e.detail || {};
      this._filters = this._filters || {};
      this._filters[filterId] = value;
      shell?.requestRender?.({ preserveScroll: true, reason: 'feat-filter' }) ?? shell?.render?.();
    };
    const onSort = e => {
      if (e.detail?.handledByStepHook) return;
      this._sortBy = e.detail?.sortId || 'alpha-asc';
      shell?.requestRender?.({ preserveScroll: true, reason: 'feat-sort' }) ?? shell?.render?.();
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

  async onUtilityChange({ type, detail = {}, shell } = {}) {
    if (type === 'search') {
      this._searchQuery = detail.query || '';
      this._syncSidebarForSearch();
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'feat-search' }) ?? shell?.render?.());
      return true;
    }

    if (type === 'sort') {
      this._sortBy = detail.sortId || 'alpha-asc';
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'feat-sort' }) ?? shell?.render?.());
      return true;
    }

    if (type === 'filter') {
      const { filterId, value } = detail;
      this._filters = this._filters || {};
      if (filterId) this._filters[filterId] = value;
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'feat-filter' }) ?? shell?.render?.());
      return true;
    }

    return false;
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
      if (!Array.isArray(this._allFeats) || this._allFeats.length === 0) {
        this._catalogUnavailable = true;
        this._catalogUnavailableMessage = localizeProgressionText('SWSE.Progression.Feat.Messages.CatalogUnavailableSkippable');
        this._showAll = false;
        this._noChoicesAvailable = true;
        ui?.notifications?.warn?.(localizeProgressionText('SWSE.Progression.Feat.Messages.CatalogUnavailableWarning'));
        await (shell?.requestRender?.({ preserveScroll: true, reason: 'feat-show-all-catalog-unavailable' }) ?? shell?.render?.());
        return true;
      }
      this._showAll = !this._showAll;
      this._refreshGroupedFeats();
      this._ensureActiveCategory();
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'feat-show-all-toggle' }) ?? shell?.render?.());
      return true;
    }

    if (action === 'open-filter-panel') {
      event?.preventDefault?.();
      const panelId = target?.dataset?.panel;
      this._openFilterPanel = this._openFilterPanel === panelId ? null : panelId;
      shell?.render?.();
      return true;
    }

    if (action === 'select-feat-category') {
      event?.preventDefault?.();
      const category = target?.dataset?.category || target?.closest?.('[data-category]')?.dataset?.category;
      if (!category) return true;
      this._activeCategory = category;
      this._searchQuery = '';
      this._expandedCategories.add(category);
      shell?.render?.();
      return true;
    }

    if (action === 'toggle-feat-category-sidebar') {
      event?.preventDefault?.();
      this._categorySidebarCollapsed = !this._categorySidebarCollapsed;
      shell?.render?.();
      return true;
    }

    if (action === 'reset-feat-browser') {
      event?.preventDefault?.();
      this._searchQuery = '';
      this._selectedTypes.clear();
      this._selectedTags.clear();
      this._openFilterPanel = null;
      this._categorySidebarCollapsed = false;
      this._prereqNavigationBanner = null;
      this._ensureActiveCategory();
      shell?.render?.();
      return true;
    }

    if (action === 'jump-feat-prerequisite' || action === 'jump-prerequisite-feat') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const featId = target?.dataset?.featId
        || target?.dataset?.itemId
        || target?.closest?.('[data-feat-id]')?.dataset?.featId
        || target?.closest?.('[data-item-id]')?.dataset?.itemId;
      this._jumpToPrerequisiteFeat(featId, shell);
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

  _getLevelupManifest(shell) {
    if (shell?.mode !== 'levelup' && shell?.progressionSession?.mode !== 'levelup') return null;
    try {
      return buildLevelUpEntitlementManifest(shell?.actor || null, shell?.progressionSession || null);
    } catch (err) {
      swseLogger.warn('[FeatStep] Failed to build level-up entitlement manifest for feat filtering', {
        error: err?.message || String(err),
      });
      return null;
    }
  }

  _isLevelupMulticlassStartingFeatSlot(shell) {
    if (this._slotType !== 'class') return false;
    const manifest = this._getLevelupManifest(shell);
    return manifest?.multiclassStartingFeat?.required === true;
  }

  _getAllowedMulticlassStartingFeatNames(shell) {
    const manifest = this._getLevelupManifest(shell);
    return getManifestStartingFeatNameSet(manifest);
  }

  /**
   * Get all feats legal for this context
   */
  async _getLegalFeats(actor, shell) {
    if (!actor) return [];

    const legal = [];
    this._availabilityByFeatId = new Map();
    const pendingAbilityData = this._buildPendingAbilityData(shell);
    const evaluationActor = this._buildEvaluationActorForPrereqs(actor, shell);
    const classLookupKeys = resolveClassLookupKeysForFeatStep(shell);
    const isMulticlassStartingFeatSlot = this._isLevelupMulticlassStartingFeatSlot(shell);
    const multiclassStartingFeatNames = isMulticlassStartingFeatSlot
      ? this._getAllowedMulticlassStartingFeatNames(shell)
      : new Set();

    if (isMulticlassStartingFeatSlot) {
      this._stripMulticlassStartingFeatPoolFromPending(pendingAbilityData, multiclassStartingFeatNames);
    }

    // Build class grant ledger to identify class-granted feats that are pending.
    // Exception: RAW multiclassing lets the player CHOOSE one starting feat from
    // the new class. Those options must not be treated as already granted.
    const classGrantedFeats = new Set();
    try {
      const selectedClass = resolveSelectedClassFromShell(shell) || resolveClassModel(
        shell?.progressionSession?.getSelection?.('class')
        || shell?.committedSelections?.get?.('class')
        || null
      );

      if (selectedClass) {
        const ledger = buildClassGrantLedger(evaluationActor || actor, selectedClass, pendingAbilityData);
        const merged = mergeLedgerIntoPending(pendingAbilityData, ledger);

        for (const grant of [
          ...(Array.isArray(ledger?.grantedFeats) ? ledger.grantedFeats : []),
          ...(Array.isArray(ledger?.grantedProficiencies) ? ledger.grantedProficiencies : []),
          ...(Array.isArray(merged?.grantedFeats) ? merged.grantedFeats : []),
          ...(Array.isArray(merged?.grantedProficiencies) ? merged.grantedProficiencies : []),
          ...(Array.isArray(merged?.selectedFeats) ? merged.selectedFeats : []),
        ]) {
          addFeatOwnershipName(classGrantedFeats, getGrantedFeatName(grant));
        }

        if (!isDroidProgressionActor(actor, pendingAbilityData) && (ledger?.forceSensitive || merged?.forceSensitive)) {
          addFeatOwnershipName(classGrantedFeats, 'Force Sensitivity');
          addFeatOwnershipName(classGrantedFeats, 'Force Sensitive');
        }
      }
    } catch (err) {
      swseLogger.debug('[FeatStep] Class grant resolution failed (non-critical)', {
        error: err?.message,
      });
    }

    const textualFeatPrereqOwnership = buildFeatPrerequisiteOwnershipNames(evaluationActor || actor, pendingAbilityData, classGrantedFeats);

    for (const feat of this._allFeats) {
      if (isMulticlassStartingFeatSlot && !multiclassStartingFeatNames.has(normalizeManifestName(feat?.name || feat?.id || feat?._id))) {
        continue;
      }
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
        const assessment = AbilityEngine.evaluateAcquisition(evaluationActor || actor, feat, pendingAbilityData) || {};
        status.missingPrerequisites = this._dedupeReasonList(Array.isArray(assessment.missingPrereqs) ? assessment.missingPrereqs : []);
        status.blockingReasons = this._dedupeReasonList(Array.isArray(assessment.blockingReasons) ? assessment.blockingReasons : []);
        const unmetChoiceFeatPrereqs = getUnmetChoiceFeatPrerequisites(feat, textualFeatPrereqOwnership);
        if (unmetChoiceFeatPrereqs.length) {
          status.missingPrerequisites = this._dedupeReasonList([
            ...status.missingPrerequisites,
            ...unmetChoiceFeatPrereqs,
          ]);
        }

        const slotValidation = await FeatSlotValidator.validateFeatForSlot(
          feat,
          { slotType: this._slotType, classId: this._classId, classLookupKeys },
          evaluationActor || actor
        );
        status.slotCompatible = isMulticlassStartingFeatSlot
          ? multiclassStartingFeatNames.has(normalizeManifestName(feat.name))
          : !!slotValidation?.valid;

        status.isGranted = !isMulticlassStartingFeatSlot && hasFeatOwnershipName(classGrantedFeats, feat.name);
        status.isOwned = actor.items.some(i =>
          i.type === 'feat' && hasFeatOwnershipName(new Set(getFeatOwnershipKeys(i.name)), feat.name)
        );

        if (!assessment?.legal || unmetChoiceFeatPrereqs.length > 0) {
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

  _stripMulticlassStartingFeatPoolFromPending(pendingAbilityData, multiclassStartingFeatNames = new Set()) {
    if (!pendingAbilityData || !multiclassStartingFeatNames?.size) return pendingAbilityData;

    const isPoolEntry = (entry) => {
      const name = getGrantedFeatName(entry);
      return multiclassStartingFeatNames.has(normalizeManifestName(name));
    };

    // During a multiclass starting-feat choice, the new class's starting-feat
    // pool is what the player may choose from; it is not already possessed.
    // Leaving that pool in pending.grantedFeats/grantedProficiencies lets chain
    // feats satisfy their own prerequisites, e.g. Armor Proficiency (Medium)
    // falsely seeing Armor Proficiency (Light) from the same Soldier pool.
    pendingAbilityData.grantedFeats = (pendingAbilityData.grantedFeats || []).filter(entry => !isPoolEntry(entry));
    pendingAbilityData.grantedProficiencies = (pendingAbilityData.grantedProficiencies || []).filter(entry => !isPoolEntry(entry));
    pendingAbilityData.selectedFeats = (pendingAbilityData.selectedFeats || []).filter(entry => !isPoolEntry(entry));
    return pendingAbilityData;
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

      swseLogger.debug('[FeatStep] Suggested feats resolved', {
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
      swseLogger.warn('[FeatStep] Suggestion service error:', err);
      return [];
    }
  }

  _findSuggestedFeatFor(feat) {
    const ids = new Set([
      feat?._id,
      feat?.id,
      feat?.name,
      normalizeFeatNameKey(feat?.name),
    ].filter(Boolean).map(value => String(value)));

    return (this._suggestedFeats || []).find(candidate => {
      const candidateIds = [
        candidate?._id,
        candidate?.id,
        candidate?.name,
        candidate?.itemId,
        candidate?.featId,
        candidate?.suggestion?.itemId,
        candidate?.suggestion?.id,
        normalizeFeatNameKey(candidate?.name),
      ].filter(Boolean).map(value => String(value));
      return candidateIds.some(value => ids.has(value));
    }) || null;
  }

  _displayReasonText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
      return String(value.fullReason || value.reasonText || value.reasonSummary || value.shortReason || value.text || value.label || '').trim();
    }
    return String(value).trim();
  }

  _isGenericSuggestionReason(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return true;
    return [
      'you meet the requirements',
      'you meet this requirement',
      'this adds to your selections',
      'adds to your selections',
      'this relates to your pattern',
      'this relates to your patterns',
      'this relates to your progression',
      'this feat synergizes well with your build and class',
      'available',
      'legal option',
    ].some(fragment => text === fragment || text.includes(fragment));
  }

  _extractSuggestionExplanation(featOrSuggestion) {
    const suggestion = featOrSuggestion?.suggestion || {};
    const packet = featOrSuggestion?.reasonPacket || suggestion?.reasonPacket || {};
    const explanation = featOrSuggestion?.explanation || suggestion?.explanation || {};
    const candidates = [
      explanation.full,
      packet.fullReason,
      featOrSuggestion?.reasonText,
      suggestion.reasonText,
      explanation.short,
      packet.shortReason,
      featOrSuggestion?.reasonSummary,
      suggestion.reasonSummary,
      this._displayReasonText(featOrSuggestion?.reason),
      this._displayReasonText(suggestion.reason),
    ];

    const summary = candidates
      .map(value => this._displayReasonText(value))
      .find(value => value && !this._isGenericSuggestionReason(value)) || '';

    const bulletSources = [
      explanation.bullets,
      packet.bullets,
      featOrSuggestion?.reasonBullets,
      suggestion.reasonBullets,
      featOrSuggestion?.reasons,
      suggestion.reasons,
      packet.allReasons,
    ];
    const bullets = [];
    const seen = new Set();
    for (const source of bulletSources) {
      for (const entry of Array.isArray(source) ? source : []) {
        const text = this._displayReasonText(entry)
          .replace(/^because\s+/i, '')
          .replace(/^it\s+/i, 'It ');
        if (!text || this._isGenericSuggestionReason(text)) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        bullets.push(/[.!?]$/.test(text) ? text : `${text}.`);
        if (bullets.length >= 4) break;
      }
      if (bullets.length >= 4) break;
    }

    return {
      summary: summary && /[.!?]$/.test(summary) ? summary : (summary ? `${summary}.` : ''),
      bullets,
    };
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

  _getCommittedFeatsForSlot(shell) {
    return this._getCommittedFeatSelections(shell).filter(feat => this._isFeatSelectionForThisSlot(feat));
  }

  _getCommittedFeatForSlot(shell) {
    return this._getCommittedFeatsForSlot(shell)[0] || null;
  }

  _isFeatSelectionForThisSlot(feat) {
    const expectedSlotKey = this.descriptor?.reconciliationContext?.slotId || this.descriptor?.stepId || null;
    if (this.descriptor?.reconciliationContext && expectedSlotKey) {
      const featSlotKey = feat?.slotKey || feat?.reconciliationSlotId || feat?.slotId || feat?.stepId || null;
      if (featSlotKey) return String(featSlotKey) === String(expectedSlotKey) || String(featSlotKey) === String(this.descriptor?.stepId || '');
      return false;
    }
    const slotType = String(feat?.slotType || '').toLowerCase();
    if (this._slotType === 'class') {
      return slotType === 'class' || String(feat?.source || '').toLowerCase().includes('class');
    }
    if (!slotType) {
      const source = String(feat?.source || '').toLowerCase();
      return !source.includes('class') && !source.includes('multiclass-starting-feat');
    }
    return slotType === this._slotType || (this._slotType === 'heroic' && slotType === 'general');
  }

  _getRequiredFeatCount(shell) {
    if (this.descriptor?.reconciliationContext) return 1;
    if (this._slotType === 'class') return 1;

    const mode = shell?.mode || shell?.progressionSession?.mode || 'chargen';
    if (mode === 'levelup') {
      const manifest = this._getLevelupManifest(shell);
      const count = Number(manifest?.generalFeat?.count ?? manifest?.generalFeat?.requiredCount ?? 0);
      if (Number.isFinite(count) && count > 0) return Math.max(1, Math.floor(count));
      return manifest?.generalFeat?.required === true ? 1 : 0;
    }

    const draft = shell?.progressionSession?.draftSelections || {};
    const species = draft.species || null;
    const pendingSpeciesContext = draft.pendingSpeciesContext || species?.pendingContext || species?.pendingSpeciesContext || null;
    const explicitCount = Number(
      pendingSpeciesContext?.entitlements?.featsRequired
      ?? species?.entitlements?.featsRequired
      ?? species?.featsRequired
      ?? shell?.actor?.system?.featsRequired
    );
    if (Number.isFinite(explicitCount) && explicitCount >= 0) {
      return Math.floor(explicitCount);
    }

    const speciesName = String(
      species?.speciesName
      || species?.name
      || species?.label
      || species?.id
      || pendingSpeciesContext?.identity?.speciesName
      || pendingSpeciesContext?.identity?.name
      || ''
    ).toLowerCase();
    const isHumanLike = speciesName === 'human' || speciesName === 'near-human' || speciesName === 'near human';
    const isNPC = shell?.actor?.type === 'npc' || shell?.progressionSession?.subtype === 'npc';
    return isHumanLike ? (isNPC ? 3 : 2) : (isNPC ? 2 : 1);
  }

  _getSelectedFeatIdsForSlot(shell) {
    return this._getCommittedFeatsForSlot(shell)
      .map(feat => feat?.id || feat?._id || feat?.name)
      .filter(Boolean);
  }

  _isFeatIdSelected(featId) {
    const key = String(featId || '');
    return !!key && (this._selectedFeatIds || []).some(id => String(id) === key);
  }

  _isFeatSelected(featOrId) {
    const candidates = typeof featOrId === 'object'
      ? [featOrId?._id, featOrId?.id, featOrId?.name]
      : [featOrId];
    const selected = new Set((this._selectedFeatIds || []).map(id => String(id)));
    return candidates.filter(Boolean).some(value => selected.has(String(value)));
  }

  _buildCanonicalFeatSelection(feat, shell = null) {
    if (!feat) return null;
    const isMulticlassStartingFeat = this._isLevelupMulticlassStartingFeatSlot(shell);
    return {
      id: feat.id || feat._id,
      name: feat.name || '',
      type: feat.type || 'feat',
      system: {
        ...(feat.system || {}),
        ...(isMulticlassStartingFeat ? {
          sourceType: 'class',
          grantedByClass: true,
          multiclassStartingFeat: true,
          locked: true,
          choiceEditable: false,
        } : {}),
      },
      img: feat.iconPath || feat.img || undefined,
      iconPath: resolveFeatIconPath(feat) || feat.iconPath || feat.img || undefined,
      slotType: this._slotType,
      source: isMulticlassStartingFeat ? 'multiclass-starting-feat' : this._slotType,
      slotKey: this.descriptor?.reconciliationContext?.slotId || this.descriptor?.stepId || this._slotType,
      stepId: this.descriptor?.stepId || null,
      levelupGrantKind: isMulticlassStartingFeat ? 'multiclassStartingFeat' : undefined,
      ...(this.descriptor?.reconciliationContext || {}),
      characterLevel: this.descriptor?.reconciliationContext?.characterLevel || this.descriptor?.characterLevel || undefined,
      classLevel: this.descriptor?.reconciliationContext?.classLevel || this.descriptor?.classLevel || undefined,
      classId: this.descriptor?.reconciliationContext?.classId || this.descriptor?.classId || undefined,
      className: this.descriptor?.reconciliationContext?.className || this.descriptor?.className || undefined,
      sourceClassId: this.descriptor?.reconciliationContext?.classId || this.descriptor?.classId || undefined,
      sourceClass: this.descriptor?.reconciliationContext?.className || this.descriptor?.className || undefined,
      sourceCharacterLevel: this.descriptor?.reconciliationContext?.characterLevel || this.descriptor?.characterLevel || undefined,
    };
  }

  _getCurrentClassLookupKeys(shell) {
    return resolveClassLookupKeysForFeatStep(shell);
  }

  _buildEvaluationActorForPrereqs(actor, shell) {
    const recoveryContext = this.descriptor?.reconciliationContext || null;
    if (!recoveryContext) return actor;
    return PrereqAdapter.buildHistoricalEvaluationContext(actor, recoveryContext, {
      draftSelections: shell?.progressionSession?.draftSelections || {},
      stepId: this.descriptor?.stepId || null,
    });
  }

  _scopePendingAbilityDataForRecovery(pending = {}, shell = null) {
    const recoveryContext = this.descriptor?.reconciliationContext || null;
    if (!recoveryContext) return pending;
    const targetLevel = Number(recoveryContext.characterLevel || recoveryContext.sourceCharacterLevel || recoveryContext.level || 0) || 0;
    const keepForLevel = (entry) => {
      const entryLevel = Number(entry?.characterLevel ?? entry?.sourceCharacterLevel ?? entry?.level ?? 0) || 0;
      return entryLevel <= 0 || targetLevel <= 0 || entryLevel <= targetLevel;
    };
    const out = {
      ...(pending || {}),
      reconciliationContext: { ...recoveryContext },
      historicalEvaluation: true,
    };
    for (const key of ['selectedFeats', 'selectedTalents', 'selectedForcePowers', 'grantedFeats', 'grantedProficiencies']) {
      if (Array.isArray(out[key])) out[key] = out[key].filter(keepForLevel);
    }
    if (recoveryContext.classId || recoveryContext.className) {
      out.selectedClass = {
        ...(typeof out.selectedClass === 'object' && out.selectedClass ? out.selectedClass : {}),
        id: recoveryContext.classId || out.selectedClass?.id || out.selectedClass,
        classId: recoveryContext.classId || out.selectedClass?.classId || out.selectedClass?.id || '',
        sourceId: recoveryContext.classId || out.selectedClass?.sourceId || '',
        name: recoveryContext.className || out.selectedClass?.name || recoveryContext.classId || '',
        level: recoveryContext.classLevel || out.selectedClass?.level || undefined,
      };
    }
    swseLogger.debug('[FeatStep] Scoped pending data for reconciliation recovery', {
      stepId: this.descriptor?.stepId || null,
      slotId: recoveryContext.slotId || null,
      targetLevel,
      selectedFeats: out.selectedFeats?.length || 0,
      selectedTalents: out.selectedTalents?.length || 0,
    });
    return out;
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
      return this._scopePendingAbilityDataForRecovery(mergeLedgerIntoPending(basePending, ledger), shell);
    }

    return this._scopePendingAbilityDataForRecovery(basePending, shell);
  }

  /**
   * Group feats by category
   */
  _groupFeats(featsForDisplay) {
    this._groupedFeats = {};

    // Add suggested group first. Suggestions are always legal/selectable feats.
    if (this._suggestedFeats.length > 0) {
      this._groupedFeats['suggested'] = {
        label: localizeProgressionText('SWSE.Progression.Feat.Groups.SuggestedForYourBuild'),
        icon: 'fa-star',
        feats: this._orderFeatsForTree(this._suggestedFeats),
        isSuggested: true,
      };
    }

    const categoryMap = {};
    for (const feat of featsForDisplay || []) {
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
    if (!raw) return localizeProgressionText('SWSE.Progression.Common.NoPrerequisites');
    if (Array.isArray(raw)) return raw.map(r => typeof r === 'string' ? r : (r?.name || r?.type || JSON.stringify(r))).filter(Boolean).join(', ') || localizeProgressionText('SWSE.Progression.Common.NoPrerequisites');
    if (typeof raw === 'string') return raw.trim() || localizeProgressionText('SWSE.Progression.Common.NoPrerequisites');
    if (typeof raw === 'object') {
      if (raw.raw) return this._formatPrerequisiteLine(raw.raw);
      if (raw.name) return String(raw.name);
      if (raw.type && raw.value != null) return `${raw.type}: ${raw.value}`;
      return Object.entries(raw).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : String(v)}`).join(', ');
    }
    return localizeProgressionText('SWSE.Progression.Common.NoPrerequisites');
  }

  _getCategoryIcon(category) {
    return FEAT_TYPE_ICONS[category] || 'fa-circle';
  }

  _getFeatCategory(feat) {
    return normalizeFeatTypeKey(feat?.featType || feat?.category || feat?.system?.featType || 'general');
  }

  _getFeatDescription(feat) {
    const description = extractDescriptionText(feat);
    const name = String(feat?.name || '').trim().toLowerCase();
    if (name !== 'force training') return description;

    const attr = String(ForceRules.getForceTrainingAttribute?.() || ForceRules.getTrainingAttribute?.() || 'wisdom').toLowerCase();
    const label = attr === 'charisma' ? 'Charisma' : 'Wisdom';
    const other = attr === 'charisma' ? 'Wisdom' : 'Charisma';
    return String(description || '')
      .replace(new RegExp(`\\b${other}\\b`, 'g'), label)
      .replace(/\bWIS(?:DOM)?\b/g, label)
      .replace(/\bCHA(?:RISMA)?\b/g, label);
  }

  _formatChoicePrerequisiteText(feat, text = '') {
    const featName = String(feat?.name || '').trim().toLowerCase();
    const raw = String(text || '').trim();
    if (featName === 'weapon focus' && /proficient\s+with\s+(?:chosen|selected)\s+weapon/i.test(raw)) {
      return localizeProgressionText('SWSE.Progression.Feat.Messages.WeaponProficiencyChosenGroup');
    }
    return raw;
  }

  _getFeatPrerequisites(feat) {
    const text = this._formatChoicePrerequisiteText(feat, feat?.prerequisiteText || feat?.system?.prerequisite || '');
    return text ? [text] : [];
  }

  /**
   * Get prerequisite line for compact middle-panel display
   */
  _getPrerequisiteLine(feat) {
    const cleaned = this._formatChoicePrerequisiteText(feat, feat?.prerequisiteText || feat?.system?.prerequisite || '');
    return cleaned || localizeProgressionText('SWSE.Progression.Common.NoPrerequisite');
  }

  /**
   * Get feat by ID
   */
  _getFeat(featId) {
    return this._allFeats.find(f => (f._id === featId || f.id === featId || f.name === featId));
  }

  _escapePrereqRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _buildFeatPrerequisiteLinks(feat) {
    const currentId = feat?._id || feat?.id || feat?.name || '';
    const currentKey = normalizeFeatNameKey(feat?.name || currentId);
    const text = [
      feat?.prerequisiteText,
      feat?.prerequisiteLine,
      feat?.system?.prerequisite,
      feat?.system?.prerequisites,
    ].flatMap(value => Array.isArray(value) ? value : [value])
      .map(value => typeof value === 'object' ? (value?.name || value?.label || value?.text || '') : value)
      .filter(Boolean)
      .join(' • ');

    if (!text.trim()) return [];

    const matches = [];
    const seen = new Set();
    const feats = [...(this._allFeats || [])]
      .filter(candidate => candidate && normalizeFeatNameKey(candidate?.name || '') !== currentKey)
      .sort((left, right) => String(right?.name || '').length - String(left?.name || '').length);

    for (const candidate of feats) {
      const name = String(candidate?.name || '').trim();
      if (!name || name.length < 3) continue;
      const key = normalizeFeatNameKey(name);
      if (!key || seen.has(key)) continue;
      const pattern = new RegExp(`(^|[^A-Za-z0-9])${this._escapePrereqRegex(name)}([^A-Za-z0-9]|$)`, 'i');
      if (!pattern.test(text)) continue;
      const id = candidate?._id || candidate?.id || candidate?.name;
      if (!id) continue;
      seen.add(key);
      matches.push({
        id,
        name,
        kind: 'feat',
        isAvailable: candidate?.isAvailable !== false,
        isOwned: !!candidate?.isOwned || !!candidate?.isGranted,
        unavailabilityReason: candidate?.unavailabilityReason || '',
      });
      if (matches.length >= 8) break;
    }

    return matches;
  }

  _jumpToPrerequisiteFeat(featId, shell) {
    const target = this._getFeat(featId);
    if (!target) {
      ui?.notifications?.warn?.('That prerequisite feat is not present in the feat catalog.');
      return;
    }

    const targetId = target?._id || target?.id || target?.name;
    this._focusedFeatId = targetId;
    this._showAll = true;
    this._searchQuery = '';
    this._selectedTypes.clear?.();
    this._selectedTags.clear?.();
    this._refreshGroupedFeats();
    const categoryKey = this._getFeatCategory(target);
    if (categoryKey) {
      this._activeCategory = categoryKey;
      this._expandedCategories.add(categoryKey);
    }
    this._prereqNavigationBanner = {
      tone: target?.isAvailable === false ? 'warning' : 'info',
      icon: target?.isAvailable === false ? 'fa-triangle-exclamation' : 'fa-route',
      title: 'Prerequisite jump',
      message: target?.isAvailable === false
        ? `${target.name} is shown because it is a prerequisite, but it is not currently available: ${target.unavailabilityReason || 'requirements are not met yet.'}`
        : `Showing prerequisite feat: ${target.name}.`,
    };
    shell?.setFocusedItem?.({ id: targetId, _id: targetId, name: target.name, type: 'feat' });
    shell?.requestRender?.({ preserveScroll: true, reason: 'feat-prerequisite-jump' }) ?? shell?.render?.();
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

  _buildFeatDisplayEntry(feat, extra = {}) {
    const featId = feat?._id || feat?.id || feat?.name || '';
    return {
      _id: feat?._id || feat?.id,
      id: feat?.id || feat?._id,
      name: feat?.name || 'Unknown Feat',
      category: feat?.featTypeLabel || getFeatTypeLabel(this._getFeatCategory(feat)),
      categoryKey: this._getFeatCategory(feat),
      subcategory: feat?.subcategory || '',
      prerequisiteLine: feat?.prerequisiteLine || this._getPrerequisiteLine(feat),
      isSuggested: this._suggestedFeats.some(s => (s?._id || s?.id || s?.name) === (feat?._id || feat?.id || feat?.name)),
      isFocused: featId === this._focusedFeatId,
      isSelected: this._isFeatSelected(feat),
      isAvailable: feat?.isAvailable !== false,
      isOwned: !!feat?.isOwned,
      isGranted: !!feat?.isGranted,
      unavailabilityReason: feat?.unavailabilityReason || null,
      missingPrerequisites: this._dedupeReasonList(feat?.missingPrerequisites || []),
      blockingReasons: this._dedupeReasonList(feat?.blockingReasons || []),
      treeIndent: feat?.treeIndent || 0,
      shortSummary: feat?.shortSummary || '',
      uiBroadTags: feat?.uiBroadTags || [],
      iconPath: resolveFeatIconPath(feat) || feat?.iconPath || feat?.img || '',
      ...extra,
    };
  }

  _getSearchResultFeats() {
    const query = this._normalizeSearchText(this._searchQuery);
    if (!query) return [];

    // Search should be a reliable lookup, not another collapsed category filter.
    // Use the full evaluated catalog so unavailable feats still appear with their
    // lock reason; on commit, existing legality checks still prevent illegal picks.
    const source = this._allFeats?.length ? this._allFeats : this._legalFeats;
    const seen = new Set();
    const scoreMatch = (feat) => {
      const name = this._normalizeSearchText(feat?.name);
      const prereq = this._normalizeSearchText(feat?.prerequisiteLine || feat?.prerequisiteText || feat?.system?.prerequisite || feat?.system?.prerequisites || '');
      const desc = this._normalizeSearchText(this._getFeatDescription(feat));
      const tags = this._normalizeSearchText([feat?.subcategory, ...(feat?.uiBroadTags || [])].filter(Boolean).join(' '));
      if (name === query) return 0;
      if (name.startsWith(query)) return 1;
      if (name.includes(query)) return 2;
      if (tags.includes(query)) return 3;
      if (prereq.includes(query)) return 4;
      if (desc.includes(query)) return 5;
      return 999;
    };

    return [...(source || [])]
      .map(feat => ({ feat, score: scoreMatch(feat) }))
      .filter(entry => entry.score < 999)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return String(a.feat?.name || '').localeCompare(String(b.feat?.name || ''));
      })
      .filter(({ feat }) => {
        const key = String(feat?._id || feat?.id || feat?.name || '').toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 24)
      .map(({ feat }) => feat);
  }

  _normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019\u201B\u2032']/g, '')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  _searchMatchesFeat(feat, query = this._normalizeSearchText(this._searchQuery)) {
    if (!query) return false;
    const haystack = this._normalizeSearchText([
      feat?.name,
      feat?.subcategory,
      feat?.featTypeLabel,
      feat?.prerequisiteLine,
      feat?.prerequisiteText,
      feat?.system?.prerequisite,
      feat?.system?.prerequisites,
      ...(feat?.uiBroadTags || []),
      this._getFeatDescription(feat),
    ].filter(Boolean).join(' '));
    return haystack.includes(query);
  }

  _expandMatchingCategoriesForSearch() {
    const query = this._normalizeSearchText(this._searchQuery);
    if (!query || !this._groupedFeats) return;

    for (const [categoryKey, group] of Object.entries(this._groupedFeats)) {
      if ((group?.feats || []).some(feat => this._searchMatchesFeat(feat, query))) {
        this._expandedCategories.add(categoryKey);
      }
    }
  }

  _ensureActiveCategory() {
    const keys = Object.keys(this._groupedFeats || {});
    if (!keys.length) {
      this._activeCategory = null;
      return null;
    }

    if (this._activeCategory && this._groupedFeats?.[this._activeCategory]) {
      return this._activeCategory;
    }

    this._activeCategory = this._groupedFeats?.suggested ? 'suggested' : keys[0];
    if (this._activeCategory) this._expandedCategories.add(this._activeCategory);
    return this._activeCategory;
  }

  _syncSidebarForSearch() {
    const hasQuery = !!String(this._searchQuery || '').trim();
    if (hasQuery) {
      this._categorySidebarCollapsed = true;
      this._expandMatchingCategoriesForSearch();
      return;
    }
    this._ensureActiveCategory();
  }

  _buildCategoryBrowserOptions(groupedDisplay = {}) {
    return Object.entries(groupedDisplay || {}).map(([categoryKey, group]) => ({
      key: categoryKey,
      label: group?.label || this._toTitleCase(categoryKey),
      icon: group?.icon || this._getCategoryIcon(categoryKey),
      totalCount: Number(group?.totalCount || 0),
      isSuggested: !!group?.isSuggested,
      isActive: categoryKey === this._activeCategory,
    }));
  }

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
        feats: featsToShow.map(feat => this._buildFeatDisplayEntry(feat)),
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
    this._requiredFeatCount = this._getRequiredFeatCount(context?.shell || context);
    const slotSelections = committedFeats.filter(feat => this._isFeatSelectionForThisSlot(feat));
    this._selectedFeatIds = slotSelections.map(feat => feat?.id || feat?._id || feat?.name).filter(Boolean);
    this._selectedFeatId = this._selectedFeatIds[0] || null;
    const selectedCount = slotSelections.length;
    const requiredCount = Math.max(0, Number(this._requiredFeatCount || 0));
    const remainingCount = Math.max(0, requiredCount - selectedCount);
    const isComplete = remainingCount === 0;

    const slotProgress = {
      selectedCount,
      requiredCount,
      remainingCount,
      isComplete,
      progressLabel: localizeProgressionText('SWSE.Progression.Feat.Progress.SelectedOfRequired', { selected: selectedCount, required: requiredCount }),
      remainingLabel: remainingCount > 0
        ? localizeProgressionText('SWSE.Progression.Feat.Progress.Remaining', { count: remainingCount })
        : localizeProgressionText('SWSE.Progression.Common.Complete'),
    };

    const isMulticlassStartingFeatSlot = this._isLevelupMulticlassStartingFeatSlot(context?.shell || context);
    const suggestedIds = new Set();
    for (const suggestion of this._suggestedFeats || []) {
      [suggestion?._id, suggestion?.id, suggestion?.name].filter(Boolean).forEach(value => suggestedIds.add(String(value)));
    }
    const flatFeatList = this._filterFeatsBySearch(this._legalFeats).map(feat => this._buildFeatDisplayEntry(feat, {
      isSuggested: [feat?._id, feat?.id, feat?.name].filter(Boolean).some(value => suggestedIds.has(String(value))),
    }));

    const normalizedSearchQuery = String(this._searchQuery || '').trim();
    const searchResults = normalizedSearchQuery
      ? this._getSearchResultFeats().map(feat => this._buildFeatDisplayEntry(feat, {
        isSearchResult: true,
        searchCategoryLabel: feat?.featTypeLabel || getFeatTypeLabel(this._getFeatCategory(feat)),
      }))
      : [];

    this._ensureActiveCategory();
    let categoryOptions = this._buildCategoryBrowserOptions(groupedDisplay);
    if (!normalizedSearchQuery && categoryOptions.length && !categoryOptions.some(option => option.isActive)) {
      this._activeCategory = categoryOptions[0].key;
      categoryOptions = this._buildCategoryBrowserOptions(groupedDisplay);
    }
    const activeCategoryKey = normalizedSearchQuery ? null : this._activeCategory;
    const activeCategory = activeCategoryKey ? groupedDisplay?.[activeCategoryKey] : null;
    const activeCategoryFeats = activeCategory?.feats || [];

    return {
      groupedFeats: groupedDisplay,
      flatFeatList,
      searchResults,
      hasSearchQuery: !!normalizedSearchQuery,
      searchQueryLabel: normalizedSearchQuery,
      searchResultCount: searchResults.length,
      isMulticlassStartingFeatSlot,
      focusedFeatId: this._focusedFeatId,
      selectedFeatId: this._selectedFeatId,
      searchQuery: this._searchQuery,
      showAll: this._showAll,
      legalFeatCount: this._legalFeats.length,
      allFeatCount: this._allFeats.length,
      catalogUnavailable: !!this._catalogUnavailable,
      catalogUnavailableMessage: this._catalogUnavailableMessage,
      slotType: this._slotType,
      orderedSelections,
      // PHASE 2 UX: Slot progress
      slotProgress,
      navigationBanner: this._prereqNavigationBanner || null,
      // Category-browser body state
      categoryOptions,
      activeCategoryKey,
      activeCategory,
      activeCategoryFeats,
      activeCategoryLabel: activeCategory?.label || '',
      activeCategoryIcon: activeCategory?.icon || '',
      activeCategoryCount: activeCategoryFeats.length,
      categorySidebarCollapsed: !!normalizedSearchQuery || !!this._categorySidebarCollapsed,
      // Filter state
      typeOptions,
      tagOptions,
      selectedTypesCount: this._selectedTypes.size,
      selectedTagsCount: this._selectedTags.size,
      openFilterPanel: this._openFilterPanel,
    };
  }

  getSelection() {
    const selected = [...(this._selectedFeatIds || [])];
    const requiredCount = Math.max(0, Number(this._requiredFeatCount || 0));
    const skippedForNoChoices = !!this._noChoicesAvailable;
    const isComplete = skippedForNoChoices || selected.length >= requiredCount;
    return {
      selected,
      count: selected.length,
      required: skippedForNoChoices ? 0 : requiredCount,
      isComplete,
      skipped: skippedForNoChoices,
      skipReason: this._catalogUnavailable ? 'feat-catalog-unavailable' : (skippedForNoChoices ? 'no-legal-feats' : null),
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

  _ensureDefaultFocusedFeat() {
    if (this._focusedFeatId) return;

    const selectedId = this._selectedFeatItem?._id || this._selectedFeatItem?.id || this._selectedFeatId;
    if (selectedId && this._getFeat(selectedId)) {
      this._focusedFeatId = selectedId;
      return;
    }

    const suggested = (this._suggestedFeats || []).find(feat => feat?._id || feat?.id);
    if (suggested) {
      this._focusedFeatId = suggested._id || suggested.id;
      return;
    }

    const legal = (this._legalFeats || []).find(feat => feat?._id || feat?.id);
    if (legal) {
      this._focusedFeatId = legal._id || legal.id;
    }
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
    const suggestedFeat = this._findSuggestedFeatFor(feat);
    const isSuggested = !!suggestedFeat;
    const suggestionExplanation = this._extractSuggestionExplanation(suggestedFeat || feat);
    const isSelected = this._isFeatSelected(feat);

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
        prerequisiteLinks: this._buildFeatPrerequisiteLinks(feat),
        shortSummary: feat.shortSummary || '',
        isRepeatable: this._isRepeatable(feat.name),
        isAvailable: feat.isAvailable !== false,
        isOwned: !!feat.isOwned,
        isGranted: !!feat.isGranted,
        missingPrerequisites: this._dedupeReasonList(feat.missingPrerequisites || []),
        blockingReasons: this._dedupeReasonList(feat.blockingReasons || []),
        unavailabilityReason: feat.unavailabilityReason || '',
        uiBroadTags: feat.uiBroadTags || [],
        suggestionReasonSummary: suggestionExplanation.summary,
        suggestionReasonBullets: suggestionExplanation.bullets,
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
      ui.notifications?.warn?.(feat.unavailabilityReason || localizeProgressionText('SWSE.Progression.Feat.Messages.NotCurrentlyAvailable'));
      emitFeatStepTrace('ITEM_COMMIT_REJECTED_UNAVAILABLE', {
        featId: feat?._id || feat?.id || null,
        featName: feat?.name || null,
        reason: feat?.unavailabilityReason || null,
      });
      return;
    }

    const featId = feat._id || feat.id;
    const currentSelections = this._getCommittedFeatSelections(shell);
    const otherSlotSelections = currentSelections.filter(entry => !this._isFeatSelectionForThisSlot(entry));
    const currentSlotSelections = currentSelections.filter(entry => this._isFeatSelectionForThisSlot(entry));
    const requiredCount = Math.max(0, Number(this._getRequiredFeatCount(shell) || 0));
    const isRepeatableFeat = this._isRepeatable(feat?.name);
    const matchingCurrentSelections = currentSlotSelections.filter(entry => String(entry?.id || entry?._id || entry?.name || '') === String(featId));
    const hasRemainingMultiSlot = requiredCount > 1 && currentSlotSelections.length < requiredCount;
    // Repeatable feats such as Force Training can fill multiple picks in the same
    // multi-feat budget. Only toggle them off when there is no remaining slot to add.
    const isTogglingOff = matchingCurrentSelections.length > 0 && !(isRepeatableFeat && hasRemainingMultiSlot);
    let nextSelection = isTogglingOff ? null : this._buildCanonicalFeatSelection(feat, shell);
    if (nextSelection) {
      const choiceMeta = FeatChoiceResolver.getChoiceMeta(feat);
      const choiceSource = FeatChoiceResolver.inferChoiceSource(feat);
      if (choiceMeta?.required && choiceSource !== 'grantPool') {
        const pendingForChoice = this._buildPendingAbilityData(shell);
        pendingForChoice.selectedFeats = currentSlotSelections;
        const evaluationActor = this._buildEvaluationActorForPrereqs(shell.actor, shell);
        const selectedChoice = await FeatChoiceDialog.prompt(evaluationActor || shell.actor, feat, {
          title: localizeProgressionText('SWSE.Progression.Feat.Messages.ChooseTitle', { feat: feat.name }),
          context: { pending: pendingForChoice }
        });
        if (!selectedChoice) {
          emitFeatStepTrace('ITEM_COMMIT_CANCELLED_FOR_CHOICE', {
            featId,
            featName: feat?.name || null,
            choiceKind: choiceMeta?.choiceKind || null,
          });
          return;
        }

        const choiceValidation = await FeatChoiceResolver.validateSelectedChoice(evaluationActor || shell.actor, feat, selectedChoice, { pending: pendingForChoice });
        if (!choiceValidation.valid) {
          ui.notifications?.warn?.(choiceValidation.errors?.join(' ') || localizeProgressionText('SWSE.Progression.Feat.Messages.ChoiceNotLegal'));
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
        const choiceAwareAssessment = AbilityEngine.evaluateAcquisition(evaluationActor || shell.actor, candidateWithChoice, selectedChoicePending);
        if (!choiceAwareAssessment?.legal) {
          const reasons = choiceAwareAssessment?.blockingReasons || choiceAwareAssessment?.missingPrereqs || [localizeProgressionText('SWSE.Progression.Feat.Messages.PrereqsNotMetForChoice')];
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
    let nextSlotSelections;
    if (isTogglingOff) {
      nextSlotSelections = currentSlotSelections.filter(entry => String(entry?.id || entry?._id || entry?.name || '') !== String(featId));
    } else if (this._slotType === 'heroic' && requiredCount > 1) {
      if (currentSlotSelections.length >= requiredCount) {
        ui.notifications?.warn?.(localizeProgressionText('SWSE.Progression.Feat.Messages.GeneralFeatLimit', { count: requiredCount }));
        return;
      }
      nextSlotSelections = nextSelection ? [...currentSlotSelections, nextSelection] : currentSlotSelections;
    } else {
      // Preserve prior single-slot behavior for class feats and ordinary one-pick general feats.
      nextSlotSelections = nextSelection ? [nextSelection] : [];
    }
    const nextSelections = [...otherSlotSelections, ...nextSlotSelections];

    this._selectedFeatIds = nextSlotSelections.map(entry => entry?.id || entry?._id || entry?.name).filter(Boolean);
    this._selectedFeatId = nextSelection?.id || this._selectedFeatIds[0] || null;
    this._selectedFeatItem = nextSelection || nextSlotSelections[0] || null;

    emitFeatStepTrace('ITEM_COMMITTED', {
      featId,
      featName: feat?.name || null,
      selectedFeatId: this._selectedFeatId,
      selectedFeatIds: this._selectedFeatIds,
      slotType: this._slotType,
      requiredCount,
      totalSelections: nextSelections.length,
      slotSelections: nextSlotSelections.length,
    });

    await this._commitNormalized(shell, 'feats', nextSelections);
    await this._syncFeatPendingEntitlements(shell, nextSelections);

    if (shell?.committedSelections && this.descriptor?.stepId) {
      shell.committedSelections.set(this.descriptor.stepId, nextSlotSelections.length === 1 ? nextSlotSelections[0] : nextSlotSelections);
    }

    if (this._shouldPromptForForceSensitivitySkillReturn(feat, { shell, nextSelection, isTogglingOff })) {
      await this._offerForceSensitivitySkillReturn(shell);
    }
  }

  _shouldPromptForForceSensitivitySkillReturn(feat, { shell = null, nextSelection = null, isTogglingOff = false } = {}) {
    if (!nextSelection || isTogglingOff) return false;
    if (!this.isChargen(shell)) return false;
    const stepId = this.descriptor?.stepId || shell?.progressionSession?.currentStepId || '';
    if (stepId !== 'general-feat' && stepId !== 'class-feat') return false;
    return this._isForceSensitivityFeat(feat);
  }

  _isForceSensitivityFeat(feat) {
    const candidates = [
      feat?.name,
      feat?.label,
      feat?.id,
      feat?._id,
      feat?.system?.slug,
      feat?.system?.key,
    ];
    return candidates.some(value => {
      const key = normalizeFeatNameKey(value);
      return key === 'force sensitivity' || key === 'force sensitive';
    });
  }

  async _offerForceSensitivitySkillReturn(shell) {
    this._suppressNextAutoAdvance = true;

    let returnToSkills = false;
    try {
      const result = await SWSEDialogV2.wait({
        title: localizeProgressionText('SWSE.Progression.Feat.Messages.ClassSkillsUpdatedTitle'),
        content: `
          <p><strong>Force Sensitivity</strong> ${localizeProgressionText('SWSE.Progression.Feat.Messages.ForceSensitivityChangesClassSkills')}</p>
          <p><strong>Use the Force</strong> ${localizeProgressionText('SWSE.Progression.Feat.Messages.UseTheForceNowClassSkill')}</p>
          <p>${localizeProgressionText('SWSE.Progression.Feat.Messages.ReturnToSkillsQuestion')}</p>
        `,
        buttons: {
          returnSkills: {
            icon: '<i class="fa-solid fa-arrow-left"></i>',
            label: localizeProgressionText('SWSE.Progression.Feat.Actions.ReturnToSkills'),
            callback: () => 'return-skills',
          },
          stay: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: localizeProgressionText('SWSE.Progression.Feat.Actions.StayHere'),
            callback: () => 'stay',
          },
        },
        default: 'returnSkills',
      }, {
        width: 480,
        classes: ['swse-force-sensitivity-skill-return-dialog'],
      });
      returnToSkills = result === 'return-skills' || result === 'returnSkills';
    } catch (err) {
      swseLogger.warn('[FeatStep] Failed to show Force Sensitivity skill return prompt', {
        error: err?.message || String(err),
      });
      return;
    }

    if (!returnToSkills) return;

    globalThis.setTimeout?.(() => {
      void this._navigateBackToSkillsStep(shell);
    }, 0);
  }

  async _navigateBackToSkillsStep(shell) {
    const stepIndex = shell?.getStepIndex?.('skills')
      ?? shell?.steps?.findIndex?.(descriptor => descriptor?.stepId === 'skills')
      ?? -1;

    if (!Number.isInteger(stepIndex) || stepIndex < 0) {
      ui.notifications?.warn?.(localizeProgressionText('SWSE.Progression.Feat.Messages.SkillsStepUnavailable'));
      return;
    }

    if (stepIndex >= Number(shell?.currentStepIndex ?? 0)) {
      ui.notifications?.warn?.(localizeProgressionText('SWSE.Progression.Feat.Messages.SkillSelectionNotBehindCurrent'));
      return;
    }

    shell?._cancelAutoAdvance?.('force-sensitivity-return-to-skills');
    await shell?.navigateToStep?.(stepIndex, { source: 'force-sensitivity-return-to-skills' });
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
    if (entitlementType === 'force_power_pick') {
      return FeatGrantEntitlementResolver.getForceTrainingSlotsPerInstance(shell?.actor || null, shell);
    }
    if (entitlementType === 'maneuver_pick') return FeatGrantEntitlementResolver.getStarshipTacticsSlotsPerInstance(shell?.actor || null, shell);
    return 1;
  }

  _getPendingAbilityModifier(shell, abilityKey) {
    const pending = shell?.progressionSession?.draftSelections?.attributes || {};
    const values = pending?.values && typeof pending.values === 'object' ? pending.values : pending || {};
    const actorSystem = shell?.actor?.system || {};
    const actorAbility = actorSystem.abilities?.[abilityKey] || actorSystem.attributes?.[abilityKey] || actorSystem.stats?.[abilityKey] || {};

    const candidates = [
      { value: pending?.modifiers?.[abilityKey], kind: 'modifier' },
      { value: values?.[abilityKey]?.mod, kind: 'modifier' },
      { value: values?.[abilityKey]?.modifier, kind: 'modifier' },
      { value: actorAbility?.mod, kind: 'modifier' },
      { value: actorAbility?.modifier, kind: 'modifier' },
      { value: pending?.finalValues?.[abilityKey], kind: 'score' },
      { value: values?.[abilityKey]?.score, kind: 'score' },
      { value: values?.[abilityKey]?.base, kind: 'score' },
      { value: values?.[abilityKey]?.value, kind: 'score' },
      { value: values?.[abilityKey], kind: 'score' },
      { value: actorAbility?.total, kind: 'score' },
      { value: actorAbility?.value, kind: 'score' },
      { value: actorAbility?.base, kind: 'score' },
    ];

    for (const candidate of candidates) {
      const numeric = Number(candidate.value);
      if (!Number.isFinite(numeric)) continue;
      return candidate.kind === 'modifier'
        ? Math.floor(numeric)
        : Math.floor((numeric - 10) / 2);
    }

    return 0;
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
    const customGuidance = getStepGuidance(shell.actor, 'general-feat', shell);
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance
    if (this.isChargen(shell)) {
      return this._isDroidProgression
        ? localizeProgressionText('SWSE.Progression.Feat.Mentor.DroidChargen')
        : localizeProgressionText('SWSE.Progression.Feat.Mentor.Chargen');
    } else if (this.isLevelup(shell)) {
      return localizeProgressionText('SWSE.Progression.Feat.Mentor.LevelUp');
    }

    return localizeProgressionText('SWSE.Progression.Feat.Mentor.Default');
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
    const selectedCount = (this._selectedFeatIds || []).length;
    const requiredCount = Math.max(0, Number(this._requiredFeatCount || 0));
    if (!this._noChoicesAvailable && selectedCount < requiredCount) {
      const remaining = requiredCount - selectedCount;
      issues.push(localizeProgressionText('SWSE.Progression.Feat.Validation.SelectMoreFeats', { count: remaining }));
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
    const selectedCount = (this._selectedFeatIds || []).length;
    const requiredCount = Math.max(0, Number(this._requiredFeatCount || 0));
    if (selectedCount < requiredCount) {
      const remaining = requiredCount - selectedCount;
      return [localizeProgressionText('SWSE.Progression.Feat.Validation.SelectMoreTypedFeats', { count: remaining, type: this._slotType === 'class' ? localizeProgressionText('SWSE.Progression.Feat.Slot.Class') : localizeProgressionText('SWSE.Progression.Feat.Slot.General') })];
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
    const selectedCount = (this._selectedFeatIds || []).length;
    const requiredCount = Math.max(0, Number(this._requiredFeatCount || 0));
    if (selectedCount < requiredCount) {
      const slotTypeLabel = this._slotType === 'class' ? localizeProgressionText('SWSE.Progression.Feat.Slot.Class') : localizeProgressionText('SWSE.Progression.Feat.Slot.General');
      const remaining = requiredCount - selectedCount;
      return localizeProgressionText('SWSE.Progression.Feat.Progress.ChooseMoreToContinue', { count: remaining, type: slotTypeLabel });
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Utility Bar
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: this._isDroidProgression ? localizeProgressionText('SWSE.Progression.Feat.Search.DroidPlaceholder') : localizeProgressionText('SWSE.Progression.Feat.Search.Placeholder') },
      // Type and tag filters are rendered inline in the work surface, not as utility-bar chips.
      sorts: [
        { id: 'alpha-asc',  label: localizeProgressionText('SWSE.Progression.Common.Sort.NameAZ') },
        { id: 'alpha-desc', label: localizeProgressionText('SWSE.Progression.Common.Sort.NameZA') },
      ],
    };
  }

  getAutoAdvanceConfig(shell) {
    if (this._suppressNextAutoAdvance) {
      this._suppressNextAutoAdvance = false;
      return { enabled: false };
    }

    return {
      enabled: true,
      delayMs: 700,
      requireNoRemainingPicks: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  getRemainingPicks() {
    if (this._noChoicesAvailable) {
      const slotTypeLabel = this._slotType === 'class' ? localizeProgressionText('SWSE.Progression.Feat.Slot.ClassFeat') : localizeProgressionText('SWSE.Progression.Feat.Slot.GeneralFeat');
      const reason = this._catalogUnavailable ? localizeProgressionText('SWSE.Progression.Feat.Slot.CatalogUnavailable') : localizeProgressionText('SWSE.Progression.Feat.Slot.NoLegalOptions');
      return [{ label: `${slotTypeLabel}: ${reason}`, count: 0, total: 0, selected: 0, isWarning: false }];
    }

    const selected = (this._selectedFeatIds || []).length;
    const total = Math.max(0, Number(this._requiredFeatCount || 0));
    return [{
      label: this._slotType === 'class' ? localizeProgressionText('SWSE.Progression.Feat.Slot.ClassFeat') : localizeProgressionText('SWSE.Progression.Feat.Slot.GeneralFeat'),
      count: Math.max(0, total - selected),
      total,
      selected,
      isWarning: selected < total,
    }];
  }

  getFooterConfig() {
    const slotTypeLabel = this._slotType === 'class' ? localizeProgressionText('SWSE.Progression.Feat.Slot.Class') : localizeProgressionText('SWSE.Progression.Feat.Slot.General');

    let statusText = '';
    if (this._noChoicesAvailable) {
      statusText = this._catalogUnavailable
        ? localizeProgressionText('SWSE.Progression.Feat.Footer.CatalogUnavailableSafeToSkip', { type: slotTypeLabel })
        : localizeProgressionText('SWSE.Progression.Feat.Footer.NoLegalOptionsSafeToSkip', { type: slotTypeLabel });
    } else if ((this._selectedFeatIds || []).length) {
      const selectedNames = (this._selectedFeatIds || [])
        .map(id => this._getFeat(id)?.name || id)
        .filter(Boolean);
      statusText = localizeProgressionText('SWSE.Progression.Feat.Footer.Selected', { type: slotTypeLabel, names: selectedNames.join(', ') });
    } else {
      statusText = localizeProgressionText('SWSE.Progression.Feat.Footer.NotYetChosen', { type: slotTypeLabel });
    }

    const selectedCount = (this._selectedFeatIds || []).length;
    const requiredCount = Math.max(0, Number(this._requiredFeatCount || 0));
    return {
      mode: 'feat-selection',
      statusText,
      isComplete: this._noChoicesAvailable || selectedCount >= requiredCount,
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
