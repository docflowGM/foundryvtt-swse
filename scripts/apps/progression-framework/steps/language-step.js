/**
 * LanguageStep plugin
 *
 * Handles constrained multi-select language choice with:
 * - Species-granted languages (automatic, non-selectable)
 * - Background-granted languages (automatic if applicable, non-selectable)
 * - INT modifier bonus languages (selectable up to the count)
 * - Linguist feat bonus languages (selectable)
 * - Class feature languages if applicable (selectable)
 *
 * Key challenge: already-granted languages must not appear in the selectable pool.
 * Selection model:
 * - Known/Granted: from species, background, class/features
 * - Selected Bonus: player-chosen this step from available pool
 * - Available: valid choices not yet granted or selected
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { LanguageRegistry } from '/systems/foundryvtt-swse/scripts/registries/language-registry.js';
import { LanguageEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/engine/language-engine.js';
import { normalizeLanguages } from './step-normalizers.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';
import { getPendingBackgroundLanguages } from '/systems/foundryvtt-swse/scripts/engine/progression/backgrounds/background-pending-context-builder.js';
import { FeatGrantEntitlementResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js';
import { CustomLanguageDialog } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/custom-language-dialog.js';

export class LanguageStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // Data
    this._allLanguages = [];              // All languages from registry
    this._knownLanguages = [];            // Full granted languages (species, background, class)
    this._knownLanguageGrants = [];       // Rich display grants, including understand-only/partial languages
    this._speciesLanguageRules = null;    // Canonical species-language helper data
    this._bonusLanguagesAvailable = 0;    // Total bonus picks (INT + Linguist + class)
    this._selectedBonusLanguages = [];    // Bonus languages chosen this step
    this._focusedLanguageId = null;       // Currently focused language
    this._searchQuery = '';               // Search filter
    this._categoryFilters = {              // Utility rail category filters
      widelyUsed: false,
      localTrade: false,
      speciesNative: false,
    };
    this._sortMode = 'alpha';              // Languages default to A-Z

    // Categories from languages.json
    this._categories = {};
    this._categoryLabels = {
      'widelyUsed': 'Widely Used',
      'localTrade': 'Local & Trade',
      'speciesNative': 'Species Native',
      'custom': 'Custom',
    };

    // Suggestions
    this._suggestedLanguages = [];

    // Event listener cleanup
    this._renderAbort = null;
  }


  _captureStepScroll(shell) {
    const root = shell?.element;
    if (!(root instanceof HTMLElement)) return [];
    const nodes = [root, ...root.querySelectorAll('*')];
    return nodes
      .filter(el => el instanceof HTMLElement && (el.scrollTop > 0 || el.scrollLeft > 0))
      .map(el => {
        const scrollKey = el.dataset?.progScrollKey ? `scroll-key:${el.dataset.progScrollKey}` : null;
        const region = el.dataset?.region || el.closest?.('[data-region]')?.dataset?.region || '';
        const classes = Array.from(el.classList || []).filter(name => /^(prog|swse|language)-/.test(name)).slice(0, 3).join('.');
        return {
          key: scrollKey || (el.dataset?.region ? `region:${el.dataset.region}` : (region && classes ? `region:${region}:class:${classes}` : null)),
          path: (() => {
            const path = [];
            let node = el;
            while (node && node !== root) {
              const parent = node.parentElement;
              if (!parent) return null;
              path.unshift(Array.prototype.indexOf.call(parent.children, node));
              node = parent;
            }
            return node === root ? path : null;
          })(),
          top: el.scrollTop,
          left: el.scrollLeft,
        };
      })
      .filter(snap => snap.key || Array.isArray(snap.path));
  }

  _renderPreservingScroll(shell) {
    if (shell) {
      shell._pendingScrollSnapshots = this._captureStepScroll(shell);
      shell.render?.();
    }
  }

  _isActiveLanguageStep(shell) {
    const currentStepId = shell?.getCurrentStepId?.()
      || shell?.progressionSession?.currentStepId
      || shell?.steps?.[shell?.currentStepIndex]?.stepId
      || null;
    return currentStepId === this.descriptor?.stepId || currentStepId === 'languages';
  }

  _syncUtilityState(shell) {
    const utility = shell?.utilityBar;
    if (!utility) return;

    const searchQuery = utility.getSearchQuery?.();
    if (typeof searchQuery === 'string') this._searchQuery = searchQuery;

    const filterState = utility.getFilterState?.() || {};
    this._categoryFilters.widelyUsed = Boolean(filterState.widelyUsed);
    this._categoryFilters.localTrade = Boolean(filterState.localTrade);
    this._categoryFilters.speciesNative = Boolean(filterState.speciesNative);

    const sortValue = utility.getSortValue?.();
    if (sortValue === 'alpha' || sortValue === 'category') this._sortMode = sortValue;
  }

  _attachUtilityListeners(shell, signal) {
    const roots = [
      shell?._inlineElement,
      shell?.element,
      shell?.getRootElement?.(),
      document,
    ].filter((root, index, list) => root && list.indexOf(root) === index);

    const rerenderFromUtility = () => {
      this._syncUtilityState(shell);
      this._renderPreservingScroll(shell);
    };

    const claimUtilityEvent = (e, token) => {
      const key = `__swseLanguageUtilityHandled_${token}`;
      if (e?.[key]) return false;
      try { e[key] = true; } catch (_) {}
      return true;
    };

    const onUtilitySearch = (e) => {
      if (e?.detail?.handledByStepHook) return;
      if (!this._isActiveLanguageStep(shell) || !claimUtilityEvent(e, 'search')) return;
      this._searchQuery = String(e?.detail?.query || '');
      rerenderFromUtility();
    };
    const onUtilityFilter = (e) => {
      if (e?.detail?.handledByStepHook) return;
      if (!this._isActiveLanguageStep(shell) || !claimUtilityEvent(e, `filter_${e?.detail?.filterId || ''}`)) return;
      const filterId = String(e?.detail?.filterId || '');
      if (filterId === 'widelyUsed' || filterId === 'localTrade' || filterId === 'speciesNative') {
        this._categoryFilters[filterId] = Boolean(e?.detail?.value);
        rerenderFromUtility();
      }
    };
    const onUtilitySort = (e) => {
      if (e?.detail?.handledByStepHook) return;
      if (!this._isActiveLanguageStep(shell) || !claimUtilityEvent(e, 'sort')) return;
      const sortId = String(e?.detail?.sortId || 'alpha');
      this._sortMode = sortId === 'category' ? 'category' : 'alpha';
      rerenderFromUtility();
    };

    roots.forEach(root => {
      root.addEventListener('prog:utility:search', onUtilitySearch, { signal });
      root.addEventListener('prog:utility:filter', onUtilityFilter, { signal });
      root.addEventListener('prog:utility:sort', onUtilitySort, { signal });
    });
  }


  _applyUtilityChange(type, detail = {}, shell) {
    if (!this._isActiveLanguageStep(shell)) return false;

    if (type === 'search') {
      this._searchQuery = String(detail.query || '');
      return true;
    }

    if (type === 'filter') {
      const filterId = String(detail.filterId || '');
      if (filterId !== 'widelyUsed' && filterId !== 'localTrade' && filterId !== 'speciesNative') return false;
      this._categoryFilters[filterId] = Boolean(detail.value);
      return true;
    }

    if (type === 'sort') {
      const sortId = String(detail.sortId || 'alpha');
      this._sortMode = sortId === 'category' ? 'category' : 'alpha';
      return true;
    }

    return false;
  }

  onUtilityChange({ type, detail, shell } = {}) {
    const didApply = this._applyUtilityChange(type, detail, shell);
    if (!didApply) return false;
    this._renderPreservingScroll(shell);
    return true;
  }

  _restoreSelectedBonusLanguagesFromSession(shell) {
    const saved = shell?.progressionSession?.draftSelections?.languages;
    if (!Array.isArray(saved) || saved.length === 0) return;
    const names = saved
      .map(entry => typeof entry === 'string' ? entry : (entry?.name || entry?.label || entry?.id || entry?.slug))
      .map(name => String(name || '').trim())
      .filter(Boolean);
    if (names.length > 0) this._selectedBonusLanguages = Array.from(new Set(names));
  }

  async _commitLanguageSelection(shell) {
    const normalizedLanguages = normalizeLanguages(
      this._selectedBonusLanguages.map(name => ({ id: name, source: 'selected' }))
    );
    if (normalizedLanguages && shell) {
      await this._commitNormalized(shell, 'languages', normalizedLanguages);
    }
    // Do not commit the step-local {knownLanguages, bonusLanguages} object to
    // the canonical languages key. The session schema expects an array of bonus
    // language selections; granted species/background languages are re-derived
    // by ProjectionEngine/ProgressionFinalizer from the selected species and
    // background. Keep the richer view-only context out of canonical state so a
    // display payload cannot poison session recovery or final summary.
    if (shell?.committedSelections && this.descriptor?.stepId) {
      shell.committedSelections.set('languageContext', {
        knownLanguages: [...this._knownLanguages],
        knownLanguageGrants: [...this._knownLanguageGrants],
        bonusLanguages: [...this._selectedBonusLanguages],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Ensure registry loaded
    await LanguageRegistry.ensureLoaded();
    this._allLanguages = await this._getAllLanguages();
    await this._loadSpeciesLanguageRules();

    // Compute known/granted languages from all sources
    this._knownLanguages = await this._getKnownLanguages(shell.actor, shell);
    this._restoreSelectedBonusLanguagesFromSession(shell);

    // FIX 4: Compute available bonus language picks including pending selections
    this._bonusLanguagesAvailable = await this._calculateBonusLanguagesAvailable(shell.actor, shell);

    // Get suggested languages from SuggestionService
    await this._getSuggestedLanguages(shell.actor, shell);

    // Wire up mentor
    shell.mentor.askMentorEnabled = false;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire utility rail search/filter/sort controls. In embedded chargen the live
    // utility rail can sit outside shell.element, so listen on all possible roots
    // plus document and guard by active step.
    this._syncUtilityState(shell);
    this._attachUtilityListeners(shell, signal);

    // Legacy in-surface search input support, if older templates still render it.
    const searchInput = shell.element.querySelector('.lang-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        this._renderPreservingScroll(shell);
      }, { signal });
    }

    // Wire clear search button
    const clearBtn = shell.element.querySelector('.lang-clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._searchQuery = '';
        if (searchInput) searchInput.value = '';
        this._renderPreservingScroll(shell);
      }, { signal });
    }

    // Wire add/remove buttons in work surface
    const addBtns = shell.element.querySelectorAll('[data-action="select-language"], [data-action="add-language"]');
    addBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        const langId = btn.dataset.languageId;
        await this._selectLanguage(langId, shell);
      }, { signal });
    });

    const removeBtns = shell.element.querySelectorAll('[data-action="remove-language"], [data-action="remove-bonus-language"]');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        const langId = btn.dataset.languageId;
        await this._deselectLanguage(langId, shell);
      }, { signal });
    });

    const customBtns = shell.element.querySelectorAll('[data-action="add-custom-language"]');
    customBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        await this._addCustomLanguage(shell);
      }, { signal });
    });
  }

  async onStepExit(shell) {
    // FIX 2: Do NOT mutate actor here - defer to finalization
    // Store selected languages in progression state only
    // All mutations happen in progression-finalizer, not during step lifecycle

    // Commit to canonical session state (buildIntent for backward compat)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(
        this.descriptor.stepId,
        'languages',
        {
          knownLanguages: [...this._knownLanguages],
          knownLanguageGrants: [...this._knownLanguageGrants],
          selectedBonusLanguages: [...this._selectedBonusLanguages],
          bonusLanguagesAvailable: this._bonusLanguagesAvailable,
        }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Data Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Get all languages from registry
   * FIX 1: Use correct registry API (.all() not .getAll?.())
   */
  async _getAllLanguages() {
    const records = await LanguageRegistry.all();
    return records.map(r => ({
      id: r.id || r.slug,
      name: r.name,
      slug: r.slug,
      category: r.category || 'other',
      description: r.description || '',
    }));
  }

  _readDraftSelection(shell, key) {
    return shell?.progressionSession?.draftSelections?.[key]
      ?? shell?.draftSelections?.[key]
      ?? shell?.draftSelections?.get?.(key)
      ?? shell?.committedSelections?.get?.(key)
      ?? null;
  }

  _normalizeLanguageName(value) {
    if (!value) return null;
    if (typeof value === 'string') return value.trim() || null;
    return value.name || value.label || value.language || value.id || null;
  }

  _normalizeLanguageToken(value) {
    return String(value || '').trim().toLowerCase();
  }

  _languageMatchesName(value, name) {
    return this._normalizeLanguageToken(value) === this._normalizeLanguageToken(name);
  }

  _grantModeLabel(mode) {
    const normalized = String(mode || 'full');
    const labels = {
      full: 'Speak / Read / Write',
      speakOnly: 'Speak Only',
      understandOnly: 'Understand Only',
      readWriteUnderstand: 'Read / Write / Understand',
      communicate: 'Communicate',
      conditionalLiteracy: 'Conditional Literacy',
      writtenOnly: 'Written Only',
      variable: 'Variable',
      choice: 'Choice',
    };
    return labels[normalized] || 'Special';
  }

  _grantSourceLabel(origin) {
    const normalized = String(origin || 'default').toLowerCase();
    const labels = {
      default: 'Default',
      species: 'Species',
      background: 'Background',
      linguist: 'Linguist',
      learned: 'Learned',
      feature: 'Feature',
      custom: 'Custom',
    };
    return labels[normalized] || 'Granted';
  }

  _grantSourceClass(origin) {
    const normalized = String(origin || 'default').toLowerCase();
    if (['default', 'species', 'background', 'linguist', 'learned', 'feature', 'custom'].includes(normalized)) {
      return normalized;
    }
    return 'default';
  }

  _isFullGrantMode(mode) {
    return String(mode || 'full') === 'full';
  }

  _makeLanguageGrant(name, origin = 'default', options = {}) {
    const cleanName = this._normalizeLanguageName(name);
    if (!cleanName) return null;
    const mode = options.mode || 'full';
    const originClass = this._grantSourceClass(origin);
    return {
      name: cleanName,
      origin: originClass,
      sourceLabel: this._grantSourceLabel(originClass),
      sourceClass: originClass,
      mode,
      modeLabel: this._grantModeLabel(mode),
      isFull: this._isFullGrantMode(mode),
      isPartial: !this._isFullGrantMode(mode),
      note: options.note || '',
    };
  }

  _dedupeLanguageGrants(grants = []) {
    const byName = new Map();
    for (const grant of grants.filter(Boolean)) {
      const token = this._normalizeLanguageToken(grant.name);
      const prior = byName.get(token);
      if (!prior) {
        byName.set(token, { ...grant, origins: [grant.sourceLabel] });
        continue;
      }
      // A full grant supersedes an understand-only/partial grant. Otherwise keep the
      // first display mode and merge source labels so the rail can explain overlap.
      if (!prior.isFull && grant.isFull) {
        byName.set(token, { ...grant, origins: Array.from(new Set([...(prior.origins || []), grant.sourceLabel])) });
      } else {
        prior.origins = Array.from(new Set([...(prior.origins || []), grant.sourceLabel]));
        if (!prior.note && grant.note) prior.note = grant.note;
      }
    }
    return Array.from(byName.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }

  _getKnownLanguageGrant(name) {
    const token = this._normalizeLanguageToken(name);
    return this._knownLanguageGrants.find(grant => this._normalizeLanguageToken(grant.name) === token) || null;
  }

  _isKnownLanguageName(name) {
    return Boolean(this._getKnownLanguageGrant(name));
  }

  _isFullKnownLanguageName(name) {
    return Boolean(this._getKnownLanguageGrant(name)?.isFull);
  }

  _isSelectedLanguageName(name) {
    const token = this._normalizeLanguageToken(name);
    return this._selectedBonusLanguages.some(selected => this._normalizeLanguageToken(selected) === token);
  }

  _customLanguageId(name) {
    return `custom:${String(name || '').trim()}`;
  }

  _extractCustomLanguageName(id) {
    const value = String(id || '').trim();
    return value.startsWith('custom:') ? value.slice('custom:'.length).trim() : value;
  }

  _buildCustomLanguageRecord(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) return null;
    return {
      id: this._customLanguageId(cleanName),
      name: cleanName,
      slug: this._customLanguageId(cleanName),
      category: 'custom',
      description: `${cleanName} is a custom campaign language approved for this character. Work with the GM to decide who speaks it, where it is used, and what it sounds like at the table. It may represent a clan cant, lost dialect, local code, trade argot, or any other language that fits the campaign.` ,
      isCustom: true,
    };
  }

  async _loadSpeciesLanguageRules() {
    if (this._speciesLanguageRules) return this._speciesLanguageRules;
    try {
      const resp = await fetch('systems/foundryvtt-swse/data/species-languages.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this._speciesLanguageRules = data?.species || data || {};
    } catch (err) {
      swseLogger.warn('[LanguageStep] Could not load species-language rules; falling back to species data.', err);
      this._speciesLanguageRules = {};
    }
    return this._speciesLanguageRules;
  }

  _normalizeSpeciesKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9' ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _resolveSpeciesLanguageRule(speciesRef) {
    const rules = this._speciesLanguageRules || {};
    const target = this._normalizeSpeciesKey(speciesRef);
    if (!target) return null;
    for (const [name, rule] of Object.entries(rules)) {
      const normalized = this._normalizeSpeciesKey(name);
      if (normalized === target) return rule;
      if (normalized.endsWith('s') && normalized.slice(0, -1) === target) return rule;
      if (target.endsWith('s') && target.slice(0, -1) === normalized) return rule;
    }
    return null;
  }

  _languageModeHint(mode, note) {
    if (note) return note;
    const normalized = String(mode || 'full');
    if (normalized === 'understandOnly') return 'This language is understood but not spoken by default.';
    if (normalized === 'speakOnly') return 'This language is spoken by default, but no literacy is granted.';
    if (normalized === 'readWriteUnderstand') return 'This language is understood, read, and written, but not spoken by default.';
    if (normalized === 'communicate') return 'This is a special communication mode rather than a full spoken/read/write language.';
    if (normalized === 'writtenOnly') return 'This grant covers the written language, not ordinary speech.';
    if (normalized === 'choice') return 'This species grant requires a character-creation choice or GM adjudication.';
    return '';
  }

  _extractSpeciesLanguageNames(species) {
    const raw = [
      ...(Array.isArray(species?.languages) ? species.languages : []),
      ...(Array.isArray(species?.system?.languages) ? species.system.languages : []),
      ...(Array.isArray(species?.canonicalStats?.languages) ? species.canonicalStats.languages : []),
    ];
    return Array.from(new Set(raw.map(value => this._normalizeLanguageName(value)).filter(Boolean)));
  }

  /**
   * Compute known/granted languages from species, background, class sources
   * FIX 3: Read from pending selection state, not just committed actor state
   */
  async _getKnownLanguages(actor, shell) {
    if (!actor) return [];

    const grants = [];

    // Species languages: read live chargen draft first, then committed actor.
    const speciesSelection = this._readDraftSelection(shell, 'species');
    const speciesCandidate = Array.isArray(speciesSelection) ? speciesSelection[0] : speciesSelection;
    let speciesRef = speciesCandidate?.name || speciesCandidate?.speciesName || speciesCandidate?.id || speciesCandidate;
    if (!speciesRef) {
      speciesRef = actor.system?.species?.primary?.name || actor.system?.species?.name || actor.system?.species;
    }

    let usedSpeciesRule = false;
    if (speciesRef) {
      const speciesRule = this._resolveSpeciesLanguageRule(speciesRef);
      if (speciesRule?.languages?.length) {
        usedSpeciesRule = true;
        speciesRule.languages.forEach(entry => {
          const grant = this._makeLanguageGrant(entry.name, entry.origin || 'species', {
            mode: entry.mode || 'full',
            note: this._languageModeHint(entry.mode, entry.note),
          });
          if (grant) grants.push(grant);
        });
      }

      if (!usedSpeciesRule) {
        const speciesEntry = ProgressionContentAuthority.resolveSpecies?.(speciesRef) || null;
        const speciesDoc = await ProgressionContentAuthority.getSpeciesDocument(speciesRef);
        const speciesLanguages = this._extractSpeciesLanguageNames(speciesEntry).concat(this._extractSpeciesLanguageNames(speciesDoc));
        speciesLanguages.forEach(lang => {
          const grant = this._makeLanguageGrant(lang, 'species');
          if (grant) grants.push(grant);
        });
      }
    }

    // If no selected/committed species language source has spoken/read/write Basic,
    // show Basic as a default understand-only baseline rather than silently treating
    // every species as a Basic speaker. This is important for Wookiees, Ewoks,
    // Jawas, Gamorreans, and similar edge cases.
    const hasBasicGrant = grants.some(grant => this._languageMatchesName(grant.name, 'Basic'));
    if (!hasBasicGrant) {
      grants.push(this._makeLanguageGrant('Basic', 'default', {
        mode: speciesRef ? 'understandOnly' : 'full',
        note: speciesRef
          ? 'Most characters understand Basic, but this species does not speak/read/write it automatically.'
          : 'Default galactic language when no species language grant is available yet.',
      }));
    }

    // Background languages from the Background Grant Ledger / pending context.
    const pendingBackground = shell?.progressionSession?.currentPendingBackgroundContext
      || this._readDraftSelection(shell, 'pendingBackgroundContext')
      || this._readDraftSelection(shell, 'background')?.pendingContext
      || {};
    const bgLanguages = getPendingBackgroundLanguages(pendingBackground);
    if (Array.isArray(bgLanguages) && bgLanguages.length > 0) {
      bgLanguages.forEach(lang => {
        const grant = this._makeLanguageGrant(lang, 'background');
        if (grant) grants.push(grant);
      });
    }

    this._knownLanguageGrants = this._dedupeLanguageGrants(grants);
    return this._knownLanguageGrants.filter(grant => grant.isFull).map(grant => grant.name);
  }

  /**
   * Calculate bonus languages including pending selections.
   * SWSE Linguist rule: each Linguist feat instance grants 1 + INT modifier
   * additional languages, minimum 1, and updates dynamically when INT changes.
   */
  async _calculateBonusLanguagesAvailable(actor, shell) {
    if (!this.isLevelup?.(shell)) {
      return LanguageEngine.calculateBonusLanguagesAvailable(actor, { shell, includePending: true });
    }

    const intDelta = this._getPendingIntModifierDelta(actor, shell);
    const pendingIntMod = Math.max(0, this._abilityModifier(this._getPendingAbilityScore(actor, shell, 'int')));
    const ownedLinguistSlotsFromIntDelta = this._countOwnedLinguistInstances(actor) * intDelta;
    const pendingLinguistSlots = this._countPendingLinguistInstances(shell) * Math.max(1, 1 + pendingIntMod);
    return intDelta + ownedLinguistSlotsFromIntDelta + pendingLinguistSlots + this._countPendingLanguageEntitlementSlots(shell);
  }

  _getActorAbilityScore(actor, abilityKey = 'int') {
    const ability = actor?.system?.abilities?.[abilityKey] || actor?.system?.attributes?.[abilityKey] || {};
    const explicit = Number(ability.total ?? ability.score ?? ability.value);
    if (Number.isFinite(explicit)) return explicit;
    const base = Number(ability.base ?? 10);
    const racial = Number(ability.racial ?? ability.species ?? 0);
    const enhancement = Number(ability.enhancement ?? 0);
    const temp = Number(ability.temp ?? 0);
    const total = (Number.isFinite(base) ? base : 10)
      + (Number.isFinite(racial) ? racial : 0)
      + (Number.isFinite(enhancement) ? enhancement : 0)
      + (Number.isFinite(temp) ? temp : 0);
    return Number.isFinite(total) ? total : 10;
  }

  _abilityModifier(score) {
    const safe = Number(score);
    return Math.floor(((Number.isFinite(safe) ? safe : 10) - 10) / 2);
  }

  _getPendingAbilityScore(actor, shell, abilityKey = 'int') {
    const current = this._getActorAbilityScore(actor, abilityKey);
    const attributes = shell?.progressionSession?.draftSelections?.attributes || null;
    if (!attributes) return current;
    const direct = Number(
      attributes?.finalValues?.[abilityKey]
        ?? attributes?.values?.[abilityKey]
        ?? attributes?.[abilityKey]?.score
        ?? attributes?.[abilityKey]?.value
        ?? attributes?.[abilityKey]
    );
    if (Number.isFinite(direct)) return direct;
    const increase = Number(attributes?.increases?.[abilityKey] ?? 0);
    if (Number.isFinite(increase) && increase > 0) return current + increase;
    return current;
  }

  _getPendingIntModifierDelta(actor, shell) {
    const currentMod = this._abilityModifier(this._getActorAbilityScore(actor, 'int'));
    const attributes = shell?.progressionSession?.draftSelections?.attributes || null;
    const explicitPendingMod = Number(attributes?.modifiers?.int);
    const pendingMod = Number.isFinite(explicitPendingMod)
      ? explicitPendingMod
      : this._abilityModifier(this._getPendingAbilityScore(actor, shell, 'int'));
    return Math.max(0, pendingMod - currentMod);
  }

  _countOwnedLinguistInstances(actor) {
    return (actor?.items || []).filter(item => {
      const name = String(item?.name || item?.system?.name || '').toLowerCase();
      return item?.type === 'feat' && (name === 'linguist' || name.includes('linguist'));
    }).length;
  }

  _countPendingLinguistInstances(shell) {
    const pendingFeats = Array.isArray(shell?.progressionSession?.draftSelections?.feats)
      ? shell.progressionSession.draftSelections.feats
      : [];
    return pendingFeats.reduce((total, feat) => {
      const name = String(feat?.name || feat?.label || feat?.id || feat || '').toLowerCase();
      if (name !== 'linguist' && !name.includes('linguist')) return total;
      return total + Math.max(1, Number(feat?.count || 1));
    }, 0);
  }

  _countPendingLanguageEntitlementSlots(shell) {
    const entitlements = Array.isArray(shell?.progressionSession?.draftSelections?.pendingEntitlements)
      ? shell.progressionSession.draftSelections.pendingEntitlements
      : [];
    return entitlements.reduce((total, entry) => {
      const type = String(entry?.type || entry?.kind || '').toLowerCase();
      if (type !== 'language_slot' && type !== 'language_training_slot' && type !== 'bonus_language') return total;
      const quantity = Math.max(1, Number(entry?.quantity ?? entry?.count ?? 1));
      const spent = Math.max(0, Number(entry?.spent ?? entry?.spentSelections?.length ?? 0));
      return total + Math.max(0, quantity - spent);
    }, 0);
  }

  /**
   * Get available languages for selection
   * (all languages minus known/granted minus already selected)
   */
  _getAvailableLanguages() {
    const knownSet = new Set(this._knownLanguageGrants
      .filter(grant => grant.isFull)
      .map(grant => this._normalizeLanguageToken(grant.name)));
    const selectedSet = new Set(this._selectedBonusLanguages.map(name => this._normalizeLanguageToken(name)));

    return this._allLanguages.filter(lang =>
      !knownSet.has(this._normalizeLanguageToken(lang.name)) && !selectedSet.has(this._normalizeLanguageToken(lang.name))
    );
  }

  /**
   * Get filtered available languages based on search
   */
  _getFilteredAvailableLanguages() {
    const q = String(this._searchQuery || '').trim().toLowerCase();
    const activeCategories = Object.entries(this._categoryFilters || {})
      .filter(([, active]) => Boolean(active))
      .map(([category]) => category);

    const filtered = this._getAvailableLanguages().filter(lang => {
      const category = String(lang.category || 'other');
      const categoryLabel = this._categoryLabels[category] || category;
      const matchesCategory = activeCategories.length === 0 || activeCategories.includes(category);
      const matchesSearch = !q
        || String(lang.name || '').toLowerCase().includes(q)
        || category.toLowerCase().includes(q)
        || String(categoryLabel || '').toLowerCase().includes(q)
        || String(lang.description || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (this._sortMode === 'category') {
        const categoryCompare = String(this._categoryLabels[a.category] || a.category || '')
          .localeCompare(String(this._categoryLabels[b.category] || b.category || ''));
        if (categoryCompare !== 0) return categoryCompare;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  /**
   * Get language by ID/name
   */
  _getLanguage(id) {
    const ref = String(id || '').trim();
    const customName = this._extractCustomLanguageName(ref);
    const match = this._allLanguages.find(l => l.id === ref || l.name === ref || this._languageMatchesName(l.name, customName));
    if (match) return match;
    if (this._isSelectedLanguageName(customName) || this._isKnownLanguageName(customName)) {
      return this._buildCustomLanguageRecord(customName);
    }
    return null;
  }

  /**
   * Select a bonus language
   */
  async _selectLanguage(langId, shell) {
    if (this._selectedBonusLanguages.length >= this._bonusLanguagesAvailable) {
      return; // Already at max
    }

    const lang = this._getLanguage(langId);
    if (!lang || this._isFullKnownLanguageName(lang.name) || this._isSelectedLanguageName(lang.name)) {
      return; // Already selected or known
    }

    this._selectedBonusLanguages.push(lang.name);
    this._focusedLanguageId = lang.id;
    await this._commitLanguageSelection(shell);
    this._renderPreservingScroll(shell);
  }

  async _addCustomLanguage(shell) {
    if (this._selectedBonusLanguages.length >= this._bonusLanguagesAvailable) {
      ui?.notifications?.warn?.('You do not have any bonus language picks remaining.');
      return;
    }

    const customName = await CustomLanguageDialog.prompt();
    const name = String(customName || '').trim();
    if (!name) return;

    if (this._isFullKnownLanguageName(name) || this._isSelectedLanguageName(name)) {
      ui?.notifications?.warn?.(`${name} is already in your language list.`);
      return;
    }

    this._selectedBonusLanguages.push(name);
    this._focusedLanguageId = this._customLanguageId(name);
    await this._commitLanguageSelection(shell);
    this._renderPreservingScroll(shell);
  }

  /**
   * Deselect a bonus language
   */
  async _deselectLanguage(langId, shell) {
    const lang = this._getLanguage(langId);
    if (!lang) return;

    this._selectedBonusLanguages = this._selectedBonusLanguages.filter(
      name => !this._languageMatchesName(name, lang.name)
    );
    this._focusedLanguageId = lang.id;
    await this._commitLanguageSelection(shell);
    this._renderPreservingScroll(shell);
  }

  _getSelectedLanguageSource(shell, index = 0) {
    const rules = this._buildLanguageRuleBreakdown(shell);
    const intPicks = Math.max(0, Number(rules.intModPicks) || 0);
    const linguistPicks = Math.max(0, Number(rules.linguistPicks) || 0);
    if (index < intPicks) return 'learned';
    if (index < intPicks + linguistPicks) return 'linguist';
    return 'learned';
  }

  _getSelectedLanguageDisplay(name, index = 0, shell = null) {
    const language = this._getLanguage(name) || this._buildCustomLanguageRecord(name);
    const origin = language?.isCustom ? 'custom' : this._getSelectedLanguageSource(shell, index);
    return {
      name,
      language,
      sourceLabel: this._grantSourceLabel(origin),
      sourceClass: this._grantSourceClass(origin),
      modeLabel: 'Speak / Read / Write',
    };
  }

  _buildLanguageRuleBreakdown(shell) {
    const intMod = FeatGrantEntitlementResolver.getIntBonusLanguageCount(shell?.actor || null);
    const entitlements = FeatGrantEntitlementResolver.resolve(shell?.actor || null, { shell, includePending: true }) || [];
    const linguistEntries = entitlements.filter(entry => String(entry?.sourceName || '').toLowerCase() === 'linguist');
    const linguist = linguistEntries
      .filter(entry => entry.grantType === 'languageSlots')
      .reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
    return {
      nativeAndBasic: true,
      intModPicks: Math.max(0, intMod),
      linguistPicks: Math.max(0, linguist),
      totalSelectable: this._bonusLanguagesAvailable,
      linguistNote: linguistEntries.length
        ? 'Linguist was found and counted.'
        : "Conditional class grants such as Noble's Linguist only count when prerequisites are met."
    };
  }

  // ---------------------------------------------------------------------------
  // Step Plugin Methods
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    this._syncUtilityState(context?.shell);
    const available = this._getFilteredAvailableLanguages();
    const remainingPicks = this._bonusLanguagesAvailable - this._selectedBonusLanguages.length;
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedLanguages);

    return {
      knownLanguages: this._knownLanguageGrants.map(grant => ({
        ...grant,
        language: this._getLanguage(grant.name) || this._buildCustomLanguageRecord(grant.name),
      })).filter(item => item.language),

      selectedBonusLanguages: this._selectedBonusLanguages.map((name, index) => this._getSelectedLanguageDisplay(name, index, context?.shell)).filter(item => item.language),

      availableLanguages: available.map(lang => {
        const isSuggested = this.isSuggestedItem(lang.id, suggestedIds);
        const confidenceData = confidenceMap.get ? confidenceMap.get(lang.id) : confidenceMap[lang.id];
        return {
          id: lang.id,
          name: lang.name,
          category: lang.category,
          categoryLabel: this._categoryLabels[lang.category] || lang.category,
          canSelect: true,
          isSuggested,
          badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
          badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
          confidenceLevel: confidenceData?.confidenceLevel || null,
        };
      }),

      bonusLanguagesAvailable: this._bonusLanguagesAvailable,
      languageRuleBreakdown: this._buildLanguageRuleBreakdown(context?.shell),
      remainingPicks,
      canAddCustomLanguage: remainingPicks > 0,
      searchQuery: this._searchQuery,
      hasAvailableLanguages: available.length > 0,
      hasSuggestions,
      suggestedLanguageIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  getSelection() {
    // FIX 5: Allow completing even if not all picks spent
    // Player can choose fewer languages and still progress
    const isComplete = true;

    return {
      selected: this._selectedBonusLanguages,
      count: this._selectedBonusLanguages.length,
      isComplete,
      picksSpent: this._selectedBonusLanguages.length,
      picksAvailable: this._bonusLanguagesAvailable,
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/language-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!this._focusedLanguageId) {
      return this.renderDetailsPanelEmptyState();
    }

    const language = this._getLanguage(this._focusedLanguageId);
    if (!language) {
      return this.renderDetailsPanelEmptyState();
    }

    const knownGrant = this._getKnownLanguageGrant(language.name);
    const isKnown = Boolean(knownGrant);
    const isFullKnown = Boolean(knownGrant?.isFull);
    const isSelected = this._isSelectedLanguageName(language.name);
    const canSelect = !isFullKnown && !isSelected && !language.isCustom && this._getAvailableLanguages().some(l => this._languageMatchesName(l.name, language.name));
    const remainingPicks = this._bonusLanguagesAvailable - this._selectedBonusLanguages.length;

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(language, 'language');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/language-details.hbs',
      data: {
        language,
        isKnown,
        isFullKnown,
        isPartialKnown: Boolean(knownGrant && !knownGrant.isFull),
        knownGrant,
        isSelected,
        canSelect,
        remainingPicks,
        categoryLabel: language.isCustom ? 'Custom' : (this._categoryLabels[language.category] || language.category),
        isCustom: Boolean(language.isCustom),
        // Add normalized fields for enhanced detail rail
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Focus/Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(item) {
    this._focusedLanguageId = item?.id || item;
  }

  async onItemCommitted(item, shell) {
    if (!item) return;

    const lang = this._getLanguage(item.id || item);
    if (!lang) return;

    // If known, just focus it
    if (this._isFullKnownLanguageName(lang.name)) {
      this._focusedLanguageId = lang.id;
      return;
    }

    // If already selected, deselect
    if (this._isSelectedLanguageName(lang.name)) {
      this._selectedBonusLanguages = this._selectedBonusLanguages.filter(
        name => !this._languageMatchesName(name, lang.name)
      );
    } else if (this._selectedBonusLanguages.length < this._bonusLanguagesAvailable) {
      // Otherwise, select if room available
      this._selectedBonusLanguages.push(lang.name);
    }

    await this._commitLanguageSelection(shell);
  }


  async handleAction(action, event, target, shell) {
    if (action === 'add-custom-language') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      await this._addCustomLanguage(shell);
      return true;
    }

    if (action === 'select-language') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      await this._selectLanguage(target?.dataset?.languageId, shell);
      return true;
    }

    if (action === 'remove-bonus-language') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      await this._deselectLanguage(target?.dataset?.languageId, shell);
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Mentor Integration
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedLanguages && this._suggestedLanguages.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'languages', this._suggestedLanguages, shell, {
        domain: 'languages',
        archetype: 'your linguistic choices'
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'languages', shell);
    }
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'languages', shell);
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance (languages is primarily chargen)
    if (this.isChargen(shell)) {
      return 'Language is more than words — it is connection. Choose wisely which voices you will carry with you.';
    }

    // Fallback for any levelup usage
    return 'Expand your voice. Learn new languages that open doors to new understanding.';
  }

  getMentorMode() {
    return 'interactive';
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const issues = this.getBlockingIssues();
    const warnings = this.getWarnings();

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings,
    };
  }

  getBlockingIssues() {
    const remainingPicks = Math.max(0, this._bonusLanguagesAvailable - this._selectedBonusLanguages.length);
    if (remainingPicks <= 0) {
      return [];
    }

    return [
      remainingPicks === 1
        ? 'Select 1 more bonus language to continue'
        : `Select ${remainingPicks} more bonus languages to continue`,
    ];
  }

  getWarnings() {
    const remainingPicks = Math.max(0, this._bonusLanguagesAvailable - this._selectedBonusLanguages.length);
    if (remainingPicks <= 0) {
      return [];
    }

    return [
      remainingPicks === 1
        ? '1 bonus language pick remains'
        : `${remainingPicks} bonus language picks remain`,
    ];
  }

  getRemainingPicks() {
    const remainingPicks = Math.max(0, this._bonusLanguagesAvailable - this._selectedBonusLanguages.length);

    if (this._bonusLanguagesAvailable <= 0) {
      return [{ label: 'No bonus languages', count: 0, isWarning: false }];
    }

    return [{
      label: 'Bonus languages',
      count: remainingPicks,
      total: Math.max(0, Number(this._bonusLanguagesAvailable || 0)),
      selected: Math.max(0, Number(this._selectedBonusLanguages.length || 0)),
      isWarning: remainingPicks > 0,
    }];
  }

  getBlockerExplanation() {
    return this.getBlockingIssues()[0] || null;
  }

  // ---------------------------------------------------------------------------
  // Utility Bar
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: {
        enabled: true,
        placeholder: 'Search languages...',
        supportsWildcards: false,
      },
      filters: [
        { id: 'widelyUsed', label: 'Widely Used', type: 'toggle', defaultOn: false },
        { id: 'localTrade', label: 'Local & Trade', type: 'toggle', defaultOn: false },
        { id: 'speciesNative', label: 'Species Native', type: 'toggle', defaultOn: false },
      ],
      sorts: [
        { id: 'alpha', label: 'A-Z', isDefault: true },
        { id: 'category', label: 'Category' },
      ],
      summaryText: `${this._selectedBonusLanguages.length}/${this._bonusLanguagesAvailable} picks`,
    };
  }

  getAutoAdvanceConfig(shell) {
    return {
      enabled: true,
      delayMs: 700,
      requireNoRemainingPicks: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  getFooterConfig() {
    const remainingPicks = this._bonusLanguagesAvailable - this._selectedBonusLanguages.length;
    const isComplete = remainingPicks === 0;

    let statusText = '';
    if (this._bonusLanguagesAvailable === 0) {
      statusText = 'No bonus language picks available';
    } else if (remainingPicks === 0) {
      statusText = 'All language picks assigned';
    } else if (remainingPicks === 1) {
      statusText = '1 language pick remaining';
    } else {
      statusText = `${remainingPicks} language picks remaining`;
    }

    return {
      mode: 'language-selection',
      statusText,
      isComplete,
      knownLanguagesCount: this._knownLanguages.length,
      selectedLanguagesCount: this._selectedBonusLanguages.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested languages from SuggestionService
   * Recommendations based on species, background, and other selections
   * @private
   */
  async _getSuggestedLanguages(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'languages',
        available: this._allLanguages,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedLanguages = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[LanguageStep] Suggestion service error:', err);
      this._suggestedLanguages = [];
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
