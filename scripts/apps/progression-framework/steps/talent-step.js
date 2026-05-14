/**
 * TalentStep plugin
 *
 * Two-stage talent selection with tree browsing and graph visualization:
 * - Stage 1: Tree Browser (choose which tree to inspect)
 * - Stage 2: Tree Graph (inspect and select node from chosen tree)
 *
 * Handles:
 * - Heroic/general vs class talent contexts
 * - Tree and node legality checking
 * - Prerequisite display
 * - Mentor suggestion modal
 * - Graph reuse from existing renderer
 *
 * Key principle: The graph shows structure. The details panel explains meaning.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { TalentTreeDB } from '/systems/foundryvtt-swse/scripts/data/talent-tree-db.js';
import { TalentRegistry } from '/systems/foundryvtt-swse/scripts/registries/talent-registry.js';
import { getAllowedTalentTrees } from '/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js';
import { getTalentMembership } from '/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-tree-membership-authority.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { buildDependencyGraph } from '/systems/foundryvtt-swse/scripts/apps/chargen/chargen-talent-tree-graph.js';
import { renderProgressionTalentTree } from './talent-tree-progression-renderer.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithPicker } from './mentor-step-integration.js';
import { canonicallyOrderSelections } from '../utils/selection-ordering.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { resolveClassModel, getClassTalentTreeLookupKeys } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import { getDroidTalentTreeName } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-trait-rules.js';

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function emitTalentStepTrace(label, payload = {}) {
  // Only emit traces if debug mode is explicitly enabled
  if (!game?.settings?.get?.('foundryvtt-swse', 'debugMode')) {
    return;
  }
  try {
    console.debug(`SWSE [TALENT STEP TRACE] ${label}`, payload);
  } catch (_err) {
    // no-op
  }
}


function cssEscapeSelector(value) {
  const raw = String(value ?? '');
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(raw);
  return raw.replace(/[\\\"']/g, '\\$&');
}

function toDisplayText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const candidates = [
      value.value,
      value.text,
      value.raw,
      value.label,
      value.name,
      value.description,
      value.benefit,
      value.summary,
    ];
    for (const candidate of candidates) {
      const text = toDisplayText(candidate);
      if (text) return text;
    }
  }
  return '';
}

function firstDisplayText(...values) {
  for (const value of values) {
    const text = toDisplayText(value);
    if (text && text !== '[object Object]') return text;
  }
  return '';
}
export class TalentStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // Step configuration
    this._slotType = descriptor.slotType || 'heroic';  // 'heroic' or 'class'
    this._classId = descriptor.classId || null;

    // Stage state
    this._stage = 'browser';  // 'browser' or 'graph'

    // Tree browser state
    this._allTrees = [];
    this._suggestedTrees = [];
    this._focusedTreeId = null;
    this._selectedTreeId = null;
    this._searchQuery = '';

    // Tree graph state
    this._selectedTreeTalents = [];  // Talents in selected tree
    this._graphData = null;          // Dependency graph for selected tree
    this._focusedTalentId = null;    // Focused node in graph
    this._selectedTalentId = null;   // Committed talent for this slot
    this._viewMode = 'both';         // 'both', 'list', or 'map'
    this._lastGraphNodeStates = {};  // Async legality cache for the SVG renderer
    this._centerGraphAfterRender = false;

    // Event listener cleanup
    this._renderAbort = null;
    this._isDroidProgression = false;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    try {
      emitTalentStepTrace('STEP_ENTER_START', {
        stepId: this.descriptor?.stepId || null,
        slotType: this._slotType,
        actorName: shell?.actor?.name || null,
      });
      // Build talent tree database if not already done
      if (!TalentTreeDB.isBuilt) {
        const treeDbResult = await TalentTreeDB.build();
        if (!treeDbResult) {
          console.error('[TalentStep] TalentTreeDB.build() failed. Talent trees may be unavailable.');
        }
      }

      // Load all talent trees
      this._allTrees = Array.from(TalentTreeDB.trees.values());
      this._isDroidProgression = shell?.progressionSession?.subtype === 'droid';
      const existingTalent = this._getCommittedTalentForSlot(shell);
      this._selectedTalentId = this._getTalentId(existingTalent) || null;
      SWSELogger.debug(`[TalentStep] Loaded ${this._allTrees.length} talent trees from database`);
      emitTalentStepTrace('TREE_DB_LOADED', {
        dbCount: this._allTrees.length,
        sampleTreeIds: this._allTrees.slice(0, 10).map(t => t?.id || t?.name || '(unknown)'),
      });

      // Initialize TalentRegistry (fail-closed if error)
      if (!TalentRegistry.isInitialized?.()) {
        try {
          await TalentRegistry.initialize?.();
        } catch (err) {
          console.error('[TalentStep] TalentRegistry initialization failed:', err);
        }
      }

      // Filter for trees available in this context (heroic or class-specific)
      const availableTrees = await this._getAvailableTrees(shell);
      SWSELogger.debug(`[TalentStep] ${availableTrees.length} trees available for ${this._slotType} slot context`);
      emitTalentStepTrace('AVAILABLE_TREES_RESULT', {
        slotType: this._slotType,
        availableCount: availableTrees.length,
        availableTreeIds: availableTrees.map(t => t?.id || t?.name || '(unknown)'),
      });

      // Get suggested trees (pass shell so suggestion engine sees chargen choices)
      this._suggestedTrees = await this._getSuggestedTrees(shell.actor, availableTrees, shell);
      SWSELogger.debug(`[TalentStep] ${this._suggestedTrees.length} suggested trees for this build`);
      emitTalentStepTrace('SUGGESTED_TREES_RESULT', {
        suggestedCount: this._suggestedTrees.length,
        suggestedTreeIds: this._suggestedTrees.map(t => t?.id || t?.name || '(unknown)'),
      });

      // Store available trees for display
      this._allTrees = availableTrees;

      // Start in tree browser stage
      this._stage = 'browser';
      this._focusedTreeId = null;
      this._selectedTreeId = null;

      // Enable mentor
      shell.mentor.askMentorEnabled = true;
    } catch (err) {
      emitTalentStepTrace('STEP_ENTER_FAILED', {
        error: err?.message || String(err),
        stepId: this.descriptor?.stepId || null,
      });
      console.error('[TalentStep] onStepEnter failed:', err);
      // Ensure defaults are set even on failure (fail-closed, empty trees)
      this._allTrees = [];
      this._suggestedTrees = [];
      this._stage = 'browser';
      this._focusedTreeId = null;
      this._selectedTreeId = null;
      shell.mentor.askMentorEnabled = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Action Handling
  // ---------------------------------------------------------------------------

  /**
   * Handle delegated talent actions (focus, enter tree, exit tree, commit)
   * @param {string} action - The action name
   * @param {Event} event - The triggering event
   * @param {Element} target - The element that triggered the action
   * @param {Object} shell - The progression shell context
   * @returns {boolean} - True if action was handled
   */
  handleAction(action, event, target, shell) {
    // Only handle talent-specific actions
    const isHandled = action && (
      action.startsWith('focus-') ||
      action.startsWith('enter-') ||
      action === 'exit-tree' ||
      action === 'set-talent-view' ||
      action === 'fit-talent-tree' ||
      action === 'center-talent-node' ||
      action === 'commit-item'
    );

    if (!isHandled) {
      return false;
    }

    event?.preventDefault?.();
    event?.stopPropagation?.();

    try {
      switch (action) {
        case 'focus-tree': {
          const treeId = target?.dataset?.treeId || target?.closest('[data-tree-id]')?.dataset?.treeId;
          if (treeId) {
            this._focusedTreeId = treeId;
            shell?.render?.();
          }
          return true;
        }

        case 'enter-tree': {
          const treeId = target?.dataset?.treeId || target?.closest('[data-tree-id]')?.dataset?.treeId || this._focusedTreeId;
          if (treeId) {
            this._enterTree(treeId, shell);
          }
          return true;
        }

        case 'exit-tree': {
          this._exitTree(shell);
          return true;
        }

        case 'set-talent-view': {
          const mode = target?.dataset?.viewMode || target?.closest('[data-view-mode]')?.dataset?.viewMode;
          if (['both', 'list', 'map'].includes(mode)) {
            this._viewMode = mode;
            shell?.render?.();
          }
          return true;
        }

        case 'fit-talent-tree': {
          this._viewMode = this._viewMode === 'list' ? 'both' : this._viewMode;
          shell?.render?.();
          return true;
        }

        case 'center-talent-node': {
          this._centerGraphAfterRender = true;
          if (this._viewMode === 'list') this._viewMode = 'both';
          shell?.render?.();
          return true;
        }

        case 'focus-talent': {
          const talentId = target?.dataset?.talentId || target?.closest('[data-talent-id]')?.dataset?.talentId;
          if (talentId) {
            this._focusedTalentId = talentId;
            shell?.render?.();
          }
          return true;
        }

        case 'commit-item': {
          const talentId = target?.dataset?.itemId || target?.closest('[data-item-id]')?.dataset?.itemId;
          if (talentId && this._stage === 'graph') {
            this.onItemCommitted(talentId, shell);
          }
          return true;
        }

        default:
          return false;
      }
    } catch (err) {
      SWSELogger.error(`[TalentStep] Action "${action}" failed:`, err);
      return false;
    }
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const onSearch = e => {
      this._searchQuery = e.detail?.query || '';
      shell.render();
    };
    shell.element.addEventListener('prog:utility:search', onSearch, { signal });


    // Wire tree card focus (Stage 1)
    const treeCards = shell.element.querySelectorAll('[data-action="focus-tree"]');
    treeCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const treeId = card.dataset.treeId;
        this._focusedTreeId = treeId;
        shell.render();
      }, { signal });
    });

    // Wire tree card enter (Stage 1 → Stage 2)
    const treeEnters = shell.element.querySelectorAll('[data-action="enter-tree"]');
    treeEnters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const treeId = btn.dataset.treeId;
        this._enterTree(treeId, shell);
      }, { signal });
    });

    // Wire exit tree button (Stage 2 → Stage 1)
    const exitBtn = shell.element.querySelector('[data-action="exit-tree"]');
    if (exitBtn) {
      exitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._exitTree(shell);
      }, { signal });
    }

    // Wire planner view controls (Stage 2)
    shell.element.querySelectorAll('[data-action="set-talent-view"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = btn.dataset.viewMode;
        if (['both', 'list', 'map'].includes(mode)) {
          this._viewMode = mode;
          shell.render();
        }
      }, { signal });
    });

    shell.element.querySelectorAll('[data-action="fit-talent-tree"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this._viewMode === 'list') this._viewMode = 'both';
        shell.render();
      }, { signal });
    });

    shell.element.querySelectorAll('[data-action="center-talent-node"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._centerGraphAfterRender = true;
        if (this._viewMode === 'list') this._viewMode = 'both';
        shell.render();
      }, { signal });
    });

    // Wire talent row focus (Stage 2)
    const talentNodes = shell.element.querySelectorAll('[data-action="focus-talent"]');
    talentNodes.forEach(node => {
      const focusTalent = (e) => {
        if (e?.target?.closest?.('button')) return;
        e.preventDefault();
        const talentId = node.dataset.talentId;
        this._focusedTalentId = talentId;
        shell.render();
      };
      node.addEventListener('click', focusTalent, { signal });
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') focusTalent(e);
      }, { signal });
    });
  }

  async afterRender(shell, workSurfaceEl) {
    if (!workSurfaceEl) return;

    // Render graph visualization when in graph stage
    if (this._stage === 'graph' && this._graphData) {
      const canvas = workSurfaceEl.querySelector('.talent-graph-canvas[data-graph-id]');
      if (canvas) {
        try {
          await renderProgressionTalentTree(canvas, {
            graphData: this._graphData,
            nodeStates: this._lastGraphNodeStates || this._buildNodeStates(),
            focusedTalentId: this._focusedTalentId,
            onFocus: async (talentId) => {
              this._focusedTalentId = talentId;
              shell?.render?.();
            },
            onCommit: async (talentId) => {
              await this.onItemCommitted(talentId, shell);
            }
          });

          if (this._centerGraphAfterRender) {
            const targetId = this._focusedTalentId || this._selectedTalentId;
            const node = targetId ? canvas.querySelector(`[data-node-id="${cssEscapeSelector(targetId)}"]`) : null;
            node?.focus?.();
            node?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
            this._centerGraphAfterRender = false;
          }
        } catch (err) {
          SWSELogger.warn('[TalentStep] Graph rendering failed:', err);
        }
      }
    }
  }

  async onStepExit(shell) {
    // Commit selected talent to actor
    if (this._selectedTalentId) {
      const talent = this._getTalent(this._selectedTalentId);
      if (talent) {
        // Grant talent to actor (implementation per TalentEngine)
        // await TalentEngine.learn(shell.actor, talent.name);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Stage Navigation
  // ---------------------------------------------------------------------------

  async _enterTree(treeId, shell) {
    emitTalentStepTrace('ENTER_TREE_START', {
      treeId,
      slotType: this._slotType,
      actorName: shell?.actor?.name || null,
    });
    this._selectedTreeId = treeId;

    // Load talents for this tree
    const tree = this._getTree(treeId);
    if (!tree) {
      emitTalentStepTrace('ENTER_TREE_FAILED', {
        reason: 'tree-not-found',
        treeId,
      });
      return;
    }

    // Get talents in this tree
    this._selectedTreeTalents = await this._getTalentsForTree(tree, shell.actor);
    emitTalentStepTrace('TREE_TALENT_RESOLUTION', {
      treeId: tree?.id || treeId,
      treeName: tree?.name || null,
      talentIdsCount: (tree?.talentIds || tree?.system?.talentIds || []).length,
      resolvedTalentCount: this._selectedTreeTalents.length,
      resolvedTalentNames: this._selectedTreeTalents.map(t => t?.name || t?.id || '(unknown)'),
    });

    // Build dependency graph
    this._graphData = buildDependencyGraph(this._selectedTreeTalents);
    emitTalentStepTrace('TREE_GRAPH_BUILT', {
      treeId: tree?.id || treeId,
      nodeCount: this._graphData?.nodes?.size || 0,
      edgeCount: this._graphData?.edges?.length || 0,
      emptyGraph: !this._graphData || (this._graphData?.nodes?.size || 0) === 0,
    });

    // Enter planner stage. Default to the hybrid list + map view.
    this._stage = 'graph';
    this._viewMode = 'both';
    this._focusedTalentId = null;
    this._lastGraphNodeStates = {};

    shell.render();
  }

  _exitTree(shell) {
    // Return to tree browser
    this._stage = 'browser';
    this._selectedTreeId = null;
    this._selectedTreeTalents = [];
    this._graphData = null;
    this._focusedTalentId = null;
    this._lastGraphNodeStates = {};
    this._centerGraphAfterRender = false;

    shell.render();
  }

  // ---------------------------------------------------------------------------
  // Data Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Get talent trees available in current context
   * HARDENED: Use class-resolution helper to resolve class model first
   */
  async _getAvailableTrees(shell) {
    const actor = shell?.actor || null;
    const allTrees = this._allTrees || [];
    const committedClass = shell?.committedSelections?.get?.('class') || shell?.buildIntent?.getSelection?.('class') || null;

    // Resolve class model using canonical helper (primary source)
    let classModel = null;
    let allowedIds = [];

    emitTalentStepTrace('AVAILABLE_TREES_START', {
      slotType: this._slotType,
      actorName: actor?.name || null,
      committedClass: committedClass?.name || committedClass?.id || committedClass || null,
      allTreeCount: allTrees.length,
    });

    if (committedClass) {
      classModel = resolveClassModel(committedClass);
      if (classModel) {
        // Use canonical class model talent tree IDs (primary source)
        // getClassTalentTreeLookupKeys returns an object { treeIds: [], treeNames: [] }
        const lookup = getClassTalentTreeLookupKeys(classModel) || {};
        allowedIds = [
          ...(lookup.treeIds || []),
          ...(lookup.treeNames || []),
          ...(classModel.talentTreeIds || []),
          ...(classModel.talentTreeSourceIds || []),
          ...(classModel.talentTreeNames || [])
        ].filter(Boolean);
        SWSELogger.debug(`[TalentStep] Resolved class model "${classModel.name}" with ${allowedIds.length} talent tree access keys`);
      }
    }

    // Fallback: Use actor authority only for levelup context when class is unresolved
    if (actor && allowedIds.length === 0 && !committedClass) {
      const slot = { slotType: this._slotType, classId: this._classId || null };
      try {
        allowedIds = getAllowedTalentTrees(actor, slot) || [];
        SWSELogger.debug(`[TalentStep] Fallback to actor authority: ${allowedIds.length} trees allowed`);
      } catch (err) {
        console.warn('[TalentStep] Tree authority lookup failed:', err);
      }
    }

    // Fail-closed for class slots with no allowed trees
    if (this._slotType === 'class' && (!allowedIds || allowedIds.length === 0)) {
      emitTalentStepTrace('AVAILABLE_TREES_EMPTY', {
        reason: 'class-slot-no-allowed-ids',
        slotType: this._slotType,
        committedClass: committedClass?.name || committedClass?.id || committedClass || null,
        resolvedClassModel: classModel?.name || null,
      });
      console.warn('[TalentStep] No class talent trees allowed in this context (fail-closed)');
      return [];
    }

    // For heroic slots, use all available trees if no restriction
    const normalizedAllowed = new Set((allowedIds || []).map(id => String(id).toLowerCase()));
    let available = allTrees.filter(tree => {
      if (!normalizedAllowed.size) return this._slotType === 'heroic';  // heroic: allow all if no restriction
      const treeIds = [tree.id, tree.sourceId, tree.name].filter(Boolean).map(v => String(v).toLowerCase());
      return treeIds.some(id => normalizedAllowed.has(id));
    });

    emitTalentStepTrace('AVAILABLE_TREES_FILTERED', {
      slotType: this._slotType,
      allowedIds,
      resolvedClassModel: classModel?.name || null,
      availableTreeIds: available.map(t => t?.id || t?.name || '(unknown)'),
    });
    return available;
  }

  /**
   * Get suggested trees from SuggestionService
   * CRITICAL: Pass characterData (chargen choices so far) for coherent suggestions
   */
  async _getSuggestedTrees(actor, availableTrees, shell) {
    try {
      // ✓ Build characterData from shell's committedSelections
      // This ensures suggestion engine understands the build-in-progress
      const characterData = this._buildCharacterDataFromShell(shell);

      const mode = shell?.mode || this.descriptor?.mode || 'chargen';
      const pendingData = SuggestionContextBuilder.buildPendingData(actor, characterData);
      pendingData.activeSlotContext = {
        slotKind: 'talent',
        slotType: this._slotType,
        classId: this._classId || null,
        activeSlotIndex: 0,
        domains: Array.isArray(this._allowedTreeIds) ? [...this._allowedTreeIds] : null
      };
      pendingData.allowedTalentTrees = (availableTrees || []).map((tree) => tree?.id || tree?._id || tree?.sourceId || tree?.name).filter(Boolean);
      const pendingAbilityData = this._buildPendingAbilityData(shell);
      Object.assign(pendingData, pendingAbilityData || {});

      const suggested = await SuggestionService.getSuggestions(actor, mode, {
        domain: 'talents',
        available: availableTrees,
        pendingData,
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      return (suggested || []).slice(0, 4);  // Top ranked trees
    } catch (err) {
      console.warn('[TalentStep] Suggestion service error:', err);
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

    return {
      classes: selections?.class ? [selections.class] : (committed?.get?.('class') ? [committed.get('class')] : []),
      species: selections?.species || committed?.get?.('species'),
      feats: selections?.feats || committed?.get?.('feats') || [],
      talents: selections?.talents || committed?.get?.('talents') || [],
      skills: selections?.skills || committed?.get?.('skills') || {},
      abilityIncreases: selections?.attributes || committed?.get?.('attributes') || {},
    };
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

  _buildNodeStates() {
    // Build node state mapping for graph visualization
    // Maps talent IDs to their visual state (owned, focused, etc.)
    const nodeStates = {};

    if (this._selectedTreeTalents && Array.isArray(this._selectedTreeTalents)) {
      for (const talent of this._selectedTreeTalents) {
        const talentId = talent?.id || talent?._id;
        if (talentId) {
          nodeStates[talentId] = {
            owned: this._selectedTalentId === talentId,
            focused: this._focusedTalentId === talentId,
            available: true
          };
        }
      }
    }

    return nodeStates;
  }

  _getCommittedTalentSelections(shell) {
    return Array.isArray(shell?.progressionSession?.draftSelections?.talents)
      ? [...shell.progressionSession.draftSelections.talents]
      : [];
  }

  _getCommittedTalentForSlot(shell) {
    return this._getCommittedTalentSelections(shell).find(talent => talent?.slotType === this._slotType) || null;
  }

  _buildCanonicalTalentSelection(talent) {
    if (!talent) return null;
    return {
      id: talent.id || talent._id,
      name: talent.name || '',
      type: talent.type || 'talent',
      system: talent.system || {},
      img: talent.img || undefined,
      slotType: this._slotType,
      source: this._slotType,
      treeId: this._selectedTreeId || talent.talent_tree || talent.system?.talent_tree || null,
    };
  }

  /**
   * Get talents for a specific tree
   * HARDENED: Verify registry initialization, log missing talents, provide diagnostics
   */
  async _getTalentsForTree(tree, actor) {
    if (!tree) return [];

    // Ensure registry is initialized and ready
    if (!TalentRegistry.isInitialized?.()) {
      console.warn('[TalentStep] TalentRegistry not initialized before talent resolution. Initializing now...');
      await TalentRegistry.initialize?.();
    }

    // Use talent tree membership authority for deterministic, registry-based membership
    const talents = await getTalentMembership(tree);

    // Diagnostic logging (once per tree enter)
    emitTalentStepTrace('TREE_TALENT_LOOKUP', {
      treeId: tree?.id || null,
      treeName: tree?.name || null,
      resolvedTalentNames: talents.map(t => t?.name || t?.id || '(unknown)'),
      talentCount: talents.length,
    });

    if (talents.length > 0) {
      SWSELogger.debug(
        `[TalentStep] Tree "${tree.name}" (${tree.id}): ` +
        `${talents.length} talents from registry`
      );
    }

    return talents;
  }

  /**
   * Get a tree by ID
   */
  _getTree(treeId) {
    // Use canonical resolver for robust tree lookup
    // Supports ID, sourceID, name, and normalized names
    return TalentTreeDB.get?.(treeId)
        || TalentTreeDB.byId?.(treeId)
        || TalentTreeDB.bySourceId?.(treeId)
        || TalentTreeDB.byName?.(treeId)
        || TalentTreeDB.trees?.get?.(treeId)
        || null;
  }

  /**
   * Get a talent by ID
   */
  _getTalent(talentId) {
    return TalentRegistry.getById?.(talentId) || TalentRegistry.getByName?.(talentId) || null;
  }

  /**
   * Check if a talent node is legal
   */
  async _isLegal(actor, talent, pending = {}) {
    const assessment = AbilityEngine.evaluateAcquisition(actor, talent, pending);
    return assessment.legal;
  }

  /**
   * Get prerequisite details for a talent
   */
  async _getPrerequisiteDetails(actor, talent, pending = {}) {
    const assessment = AbilityEngine.evaluateAcquisition(actor, talent, pending);

    return {
      legal: assessment.legal,
      missing: assessment.missingPrereqs || [],
      blocking: assessment.blockingReasons || [],
    };
  }

  // ---------------------------------------------------------------------------
  // Step Plugin Methods
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    if (this._stage === 'browser') {
      return this._getTreeBrowserData(context);
    } else if (this._stage === 'graph') {
      return this._getTreeGraphData(context);
    }

    return {};
  }

  /**
   * Data for Stage 1: Tree Browser
   * HARDENED: Use canonical tree fields, consistent ID handling
   */
  _getTreeBrowserData(context) {
    let filteredTrees = this._filterTreesBySearch(this._allTrees);

    // SWSE RAW: Filter droid talent trees by degree if droid progression
    if (this._isDroidProgression) {
      const droidDegree = context?.shell?.progressionSession?.draftSelections?.droid?.droidDegree ||
                         context?.shell?.actor?.system?.droidDegree ||
                         '1st-degree';
      const allowedTreeName = getDroidTalentTreeName(droidDegree);

      // Filter to show only the degree-appropriate talent tree + any universal droid talents
      filteredTrees = filteredTrees.filter(tree =>
        tree.name === allowedTreeName ||
        tree.tags?.includes('droid-universal') ||
        tree.category === 'droid-universal'
      );
    }

    // Continue with filtered trees

    // Get committed talents from session and order them canonically
    const committedTalents = context?.shell?.progressionSession?.draftSelections?.talents || [];
    const orderedSelections = canonicallyOrderSelections(committedTalents);
    const slotSelections = committedTalents.filter(talent => talent?.slotType === this._slotType);

    // PHASE 2 UX: Micro-progress — show slot progress
    const selectedCount = slotSelections.length;
    const requiredCount = 1; // Single talent slot per step
    const remainingCount = Math.max(0, requiredCount - selectedCount);
    const isComplete = remainingCount === 0;

    const slotProgress = {
      selectedCount,
      requiredCount,
      remainingCount,
      isComplete,
      progressLabel: `${selectedCount} of ${requiredCount} talent${requiredCount === 1 ? '' : 's'}`,
      remainingLabel: remainingCount > 0
        ? `${remainingCount} talent${remainingCount === 1 ? '' : 's'} remaining`
        : 'Complete',
    };

    return {
      stage: 'browser',
      slotType: this._slotType,
      allTrees: filteredTrees.map(tree => ({
        // Use canonical tree.id field (normalized trees always have this)
        id: tree.id,
        name: tree.name,
        summary: tree.description || tree.system?.description || '',
        // Use canonical talentIds field (top-level, not system.talentIds)
        nodeCount: (tree.talentIds || []).length,
        isSuggested: this._suggestedTrees.some(s => s.id === tree.id),
        isFocused: tree.id === this._focusedTreeId,
        // Determine slot type from context or fallback (normalized trees don't have classRestricted)
        slotType: tree.category === 'droid' || tree.tags?.includes('class-only') ? 'class' : 'heroic',
      })),
      suggestedTrees: this._suggestedTrees.map(t => ({
        id: t.id,
        name: t.name,
      })),
      searchQuery: this._searchQuery,
      orderedSelections,
      // PHASE 2 UX: Slot progress
      slotProgress,
    };
  }

  _getTalentId(talent) {
    return talent?.id || talent?._id || talent?.uuid || talent?.name || null;
  }

  _getTalentDescription(talent) {
    return firstDisplayText(
      talent?.system?.description,
      talent?.description,
      talent?.system?.details?.description,
      talent?.system?.flavor,
    );
  }

  _getTalentBenefit(talent) {
    return firstDisplayText(
      talent?.system?.benefit,
      talent?.benefit,
      talent?.system?.effect,
      talent?.system?.rules,
    );
  }

  _getTalentPrerequisiteText(talent) {
    return firstDisplayText(
      talent?.system?.prerequisites,
      talent?.system?.prerequisite,
      talent?.prerequisites,
      talent?.prerequisite,
    );
  }

  _getTalentSummary(talent) {
    const description = this._getTalentDescription(talent);
    const benefit = this._getTalentBenefit(talent);
    const text = firstDisplayText(description, benefit, this._getTalentPrerequisiteText(talent));
    if (text) return text.length > 132 ? `${text.slice(0, 129).trim()}…` : text;
    return 'No rules text has been defined for this talent yet.';
  }

  _buildPrerequisitePathForTalent(talent, nodeStates = {}) {
    const talentId = this._getTalentId(talent);
    const node = talentId && this._graphData?.nodes?.get?.(talentId);
    if (!node?.prerequisites?.length) return [];

    const rows = [];
    const seen = new Set();
    const visit = (nodeId) => {
      if (!nodeId || seen.has(nodeId)) return;
      seen.add(nodeId);
      const prereqNode = this._graphData?.nodes?.get?.(nodeId);
      if (!prereqNode) return;
      for (const nestedId of prereqNode.prerequisites || []) visit(nestedId);
      const state = nodeStates?.[nodeId] || {};
      rows.push({
        id: nodeId,
        name: prereqNode.name || nodeId,
        isMissing: state.legal === false && !state.selected && !state.owned,
      });
    };

    for (const prereqId of node.prerequisites) visit(prereqId);
    rows.push({ id: talentId, name: talent?.name || talentId, isMissing: false });
    return rows;
  }

  _filterTalentRowsBySearch(rows) {
    if (!this._searchQuery) return rows;
    const q = String(this._searchQuery || '').toLowerCase();
    return rows.filter(row => [row.name, row.summary, row.prerequisites, row.lockReason]
      .some(value => String(value || '').toLowerCase().includes(q)));
  }

  _buildTalentRows(nodeStates = {}) {
    const rows = (this._selectedTreeTalents || []).map(talent => {
      const id = this._getTalentId(talent);
      const state = nodeStates?.[id] || {};
      const isSelected = id === this._selectedTalentId || !!state.selected;
      const isOwned = !!state.owned || isSelected;
      const meetsPrereqs = state.legal !== false;
      const missing = Array.isArray(state.missing) ? state.missing.map(toDisplayText).filter(Boolean) : [];
      const prerequisites = this._getTalentPrerequisiteText(talent);
      const summary = this._getTalentSummary(talent);
      const lockReason = meetsPrereqs
        ? ''
        : (missing[0] || prerequisites || 'Prerequisite path incomplete.');

      return {
        id,
        name: talent?.name || id || 'Unknown Talent',
        summary,
        prerequisites,
        lockReason,
        isSelected,
        isOwned,
        meetsPrereqs,
        isSelectable: meetsPrereqs || isSelected,
        isFocused: id === this._focusedTalentId,
        prerequisitePath: this._buildPrerequisitePathForTalent(talent, nodeStates),
      };
    }).filter(row => row.id);

    rows.sort((left, right) => {
      if (left.isSelected !== right.isSelected) return left.isSelected ? -1 : 1;
      if (left.meetsPrereqs !== right.meetsPrereqs) return left.meetsPrereqs ? -1 : 1;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });

    return this._filterTalentRowsBySearch(rows);
  }

  /**
   * Data for Stage 2: Talent Planner
   * HARDENED: Validate talents resolved, use canonical tree fields
   */
  async _getTreeGraphData(context) {
    const selectedTree = this._getTree(this._selectedTreeId);
    if (!selectedTree) {
      console.warn(`[TalentStep] Selected tree not found: ${this._selectedTreeId}`);
      emitTalentStepTrace('GRAPH_DATA_EMPTY', {
        reason: 'selected-tree-not-found',
        selectedTreeId: this._selectedTreeId,
      });
      return { stage: 'graph', error: 'Tree not found' };
    }

    // Validate that talents actually resolved
    if (!this._graphData || !this._selectedTreeTalents || this._selectedTreeTalents.length === 0) {
      emitTalentStepTrace('GRAPH_DATA_EMPTY', {
        reason: 'no-resolved-talents',
        selectedTreeId: this._selectedTreeId,
        selectedTreeName: selectedTree?.name || null,
        talentIdsCount: (selectedTree.talentIds || []).length,
        resolvedTalentCount: this._selectedTreeTalents?.length || 0,
      });
      console.warn(
        `[TalentStep] Tree "${selectedTree.name}" has no resolved talents. ` +
        `talentIds count: ${(selectedTree.talentIds || []).length}, resolved: ${this._selectedTreeTalents?.length || 0}`
      );
      // Still render, but with empty graph/list (better than crashing)
    }

    // Prepare node states once for both the list and the graph renderer.
    const nodeStates = {};
    const pendingAbilityData = this._buildPendingAbilityData(context?.shell);
    if (this._graphData?.nodes) {
      for (const [nodeId, node] of this._graphData.nodes) {
        const talent = node.talent;
        let prereqDetails = { legal: true, missing: [], blocking: [] };
        try {
          prereqDetails = await this._getPrerequisiteDetails(context?.shell?.actor, talent, pendingAbilityData);
        } catch (_err) {
          prereqDetails = { legal: true, missing: [], blocking: [] };
        }
        const isSelected = nodeId === this._selectedTalentId;
        const isOwned = isSelected;
        const isSuggested = this._suggestedTrees.some(t => t.id === this._selectedTreeId);

        nodeStates[nodeId] = {
          legal: prereqDetails.legal !== false,
          owned: isOwned,
          selected: isSelected,
          suggested: isSuggested,
          missing: prereqDetails.missing || [],
          blocking: prereqDetails.blocking || [],
        };
      }
    }
    this._lastGraphNodeStates = nodeStates;

    // Get committed talents from session and order them canonically
    const committedTalents = context?.shell?.progressionSession?.draftSelections?.talents || [];
    const orderedSelections = canonicallyOrderSelections(committedTalents);
    const slotSelections = committedTalents.filter(talent => talent?.slotType === this._slotType);

    // PHASE 2 UX: Micro-progress — show slot progress
    const selectedCount = slotSelections.length;
    const requiredCount = 1; // Single talent slot per step
    const remainingCount = Math.max(0, requiredCount - selectedCount);
    const isComplete = remainingCount === 0;

    const slotProgress = {
      selectedCount,
      requiredCount,
      remainingCount,
      isComplete,
      progressLabel: `${selectedCount} of ${requiredCount} talent${requiredCount === 1 ? '' : 's'}`,
      remainingLabel: remainingCount > 0
        ? `${remainingCount} talent${remainingCount === 1 ? '' : 's'} remaining`
        : 'Complete',
    };

    const talentRows = this._buildTalentRows(nodeStates);
    const availableTalents = talentRows.filter(row => row.isSelectable);
    const lockedTalents = talentRows.filter(row => !row.isSelectable);
    const selectedTalent = talentRows.find(row => row.isSelected) || null;

    emitTalentStepTrace('GRAPH_DATA_READY', {
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree?.name || null,
      nodeCount: this._graphData?.nodes?.size || 0,
      edgeCount: this._graphData?.edges?.length || 0,
      focusedTalentId: this._focusedTalentId,
      selectedTalentId: this._selectedTalentId,
      availableCount: availableTalents.length,
      lockedCount: lockedTalents.length,
      viewMode: this._viewMode,
    });

    return {
      stage: 'graph',
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree.name,
      nodeStates,
      graphData: this._graphData,
      orderedSelections,
      viewMode: this._viewMode,
      availableTalents,
      lockedTalents,
      selectedTalent,
      // PHASE 2 UX: Slot progress
      slotProgress,
    };
  }

  /**
   * Filter trees by search
   */
  _filterTreesBySearch(trees) {
    if (!this._searchQuery) return trees;

    const q = this._searchQuery.toLowerCase();
    return trees.filter(tree =>
      tree.name.toLowerCase().includes(q) ||
      (tree.system?.description || '').toLowerCase().includes(q)
    );
  }

  getSelection() {
    const isComplete = !!this._selectedTalentId;
    return {
      selected: this._selectedTalentId ? [this._selectedTalentId] : [],
      count: this._selectedTalentId ? 1 : 0,
      isComplete,
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    if (stepData.stage === 'graph') {
      return {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/talent-tree-graph.hbs',
        data: stepData,
      };
    }

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/talent-tree-browser.hbs',
      data: stepData,
    };
  }

  async renderDetailsPanel(focusedItem, shell) {
    if (this._stage === 'browser') {
      emitTalentStepTrace('DETAILS_EMPTY', {
        reason: 'browser-stage-no-details',
        focusedTreeId: this._focusedTreeId,
        selectedTreeId: this._selectedTreeId,
      });
      return this.renderDetailsPanelEmptyState();
    }

    if (!this._focusedTalentId) {
      emitTalentStepTrace('DETAILS_EMPTY', {
        reason: 'no-focused-talent-id',
        selectedTreeId: this._selectedTreeId,
        selectedTalentId: this._selectedTalentId,
      });
      return this.renderDetailsPanelEmptyState();
    }

    const talent = this._getTalent(this._focusedTalentId);
    if (!talent) {
      emitTalentStepTrace('DETAILS_EMPTY', {
        reason: 'focused-talent-not-found',
        focusedTalentId: this._focusedTalentId,
        selectedTreeId: this._selectedTreeId,
      });
      console.warn(`[TalentStep] Focused talent not found: ${this._focusedTalentId}`);
      return this.renderDetailsPanelEmptyState();
    }

    const talentId = this._getTalentId(talent);
    const isSelected = talentId === this._selectedTalentId;
    const isOwned = isSelected;
    const selectedTree = this._getTree(this._selectedTreeId);

    // Evaluate talent legality using the same pending state as the planner list.
    const actor = shell?.actor || null;
    const pendingAbilityData = this._buildPendingAbilityData(shell);
    const prereqDetails = actor ? await this._getPrerequisiteDetails(actor, talent, pendingAbilityData) : { legal: true, missing: [], blocking: [] };
    const meetsPrereqs = prereqDetails.legal !== false;
    const missingPrereqs = (prereqDetails.missing || prereqDetails.blocking || [])
      .map(toDisplayText)
      .filter(Boolean);
    const hasMissingPrereqs = missingPrereqs.length > 0;

    // Normalize detail panel data for canonical display, then sanitize any object-shaped values.
    const normalized = normalizeDetailPanelData(talent, 'talent', {
      treeName: selectedTree?.name || '',
    });

    const mechanicalBenefit = this._getTalentBenefit(talent);
    const canonicalDescription = firstDisplayText(
      normalized.description,
      this._getTalentDescription(talent),
      mechanicalBenefit,
      `${talent?.name || 'This talent'} is part of the ${selectedTree?.name || 'selected'} talent tree.`
    );
    const prerequisites = firstDisplayText(
      normalized.prerequisites ? normalized.prerequisites[0] : null,
      this._getTalentPrerequisiteText(talent)
    );
    const prerequisitePath = this._buildPrerequisitePathForTalent(talent, this._lastGraphNodeStates);
    const recommendationText = this._suggestedTrees.some(t => t.id === this._selectedTreeId)
      ? 'This tree is currently suggested for the build you have been shaping. Use the available list to choose the legal talent that best supports your concept.'
      : '';
    const statusText = isSelected
      ? 'This talent is selected for the current slot.'
      : meetsPrereqs
        ? 'This talent is available now and can be chosen for the current slot.'
        : 'This talent is locked until its prerequisite path is complete.';

    emitTalentStepTrace('DETAILS_READY', {
      focusedTalentId: this._focusedTalentId,
      talentId,
      talentName: talent?.name || null,
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree?.name || null,
      isSelected,
      isOwned,
      meetsPrereqs,
      hasMissingPrereqs,
      prerequisiteText: prerequisites || null,
    });

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/talent-details.hbs',
      data: {
        talent,
        talentId,
        treeName: selectedTree?.name || '',
        isSelected,
        isOwned,
        meetsPrereqs,
        hasMissingPrereqs,
        missingPrereqs,
        prerequisites,
        canonicalDescription,
        mechanicalBenefit,
        prerequisitePath,
        recommendationText,
        statusText,
        metadataTags: normalized.metadataTags || [],
        hasMentorProse: !!normalized.fallbacks?.hasMentorProse,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Focus/Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(item) {
    if (this._stage === 'graph') {
      // item is a string ID from the shell event extraction
      this._focusedTalentId = item;
      emitTalentStepTrace('ITEM_FOCUSED', {
        stage: this._stage,
        focusedTalentId: this._focusedTalentId,
      });
    }
  }

  async onItemCommitted(item, shell) {
    if (!item) return;

    // item is a string ID extracted from data-item-id or data-tree-id attributes
    if (this._stage === 'browser') {
      // Entering tree on commit (item is a tree ID string)
      emitTalentStepTrace('ITEM_COMMITTED', {
        stage: this._stage,
        treeId: item,
        action: 'enter-tree',
      });
      this._enterTree(item, shell);
    } else if (this._stage === 'graph') {
      // Toggle selection in graph (item is a talent ID string)
      const talentId = item;
      const talent = this._getTalent(talentId);
      emitTalentStepTrace('ITEM_COMMIT_TALENT_START', {
        stage: this._stage,
        talentId,
        talentName: talent?.name || null,
      });

      const currentSelections = this._getCommittedTalentSelections(shell);
      const slotSelections = currentSelections.filter(entry => entry?.slotType !== this._slotType);
      const isTogglingOff = this._selectedTalentId === talentId;
      const nextSelection = (!isTogglingOff && talent) ? this._buildCanonicalTalentSelection(talent) : null;
      const nextSelections = nextSelection ? [...slotSelections, nextSelection] : slotSelections;

      this._selectedTalentId = nextSelection?.id || null;

      emitTalentStepTrace('ITEM_COMMIT_TALENT_RESULT', {
        selectedTalentId: this._selectedTalentId,
        talentId,
        totalSelections: nextSelections.length,
      });

      await this._commitNormalized(shell, 'talents', nextSelections);

      if (shell?.committedSelections && this.descriptor?.stepId) {
        shell.committedSelections.set(this.descriptor.stepId, nextSelection);
      }
      if (shell?.buildIntent && this.descriptor?.stepId) {
        shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, nextSelection);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Mentor Integration
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    if (this._suggestedTrees?.length) {
      await handleAskMentorWithPicker(shell.actor, 'general-talent', this._suggestedTrees, shell, {
        domain: 'talents',
        archetype: 'your talent path',
        stepLabel: 'talent trees'
      }, async (selected) => {
        const id = selected?.id || selected?._id || selected?.treeId;
        if (!id) return;
        this._stage = 'browser';
        await this.onItemFocused(id);
        await this.onItemCommitted(id, shell);
        shell.render();
      });
      return;
    }
    await handleAskMentor(shell.actor, 'general-talent', shell);
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'general-talent');
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance
    if (this.isChargen(shell)) {
      return 'Talents define your path. Choose a discipline that resonates with your vision for this character.';
    } else if (this.isLevelup(shell)) {
      return 'Your talents grow with experience. Choose a new discipline to specialize further in your abilities.';
    }

    return 'Select a talent that defines you.';
  }

  getMentorMode() {
    return 'interactive';
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const issues = [];

    if (!this._selectedTalentId) {
      issues.push('No talent selected');
    }

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings: [],
    };
  }

  getBlockingIssues() {
    if (!this._selectedTalentId) {
      return [`Select a ${this._slotType === 'class' ? 'Class' : 'Heroic'} Talent`];
    }
    return [];
  }

  /**
   * PHASE 3 UX: Specific, actionable explanation for why Next is blocked
   */
  getBlockerExplanation() {
    if (!this._selectedTalentId) {
      if (this._stage === 'browser') {
        return 'Choose a talent tree to view available talents';
      } else {
        const slotTypeLabel = this._slotType === 'class' ? 'Class' : 'Heroic';
        return `Select a ${slotTypeLabel} Talent to continue`;
      }
    }
    return null;
  }


  // ---------------------------------------------------------------------------
  // Utility Bar
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: this._isDroidProgression ? (this._stage === 'browser' ? 'Search droid talent trees…' : 'Search droid talents…') : (this._stage === 'browser' ? 'Search talent trees…' : 'Search talents…') },
      sorts: [
        { id: 'alpha', label: 'A–Z' },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  getFooterConfig() {
    const slotTypeLabel = this._slotType === 'class' ? 'Class' : 'Heroic';
    const stageName = this._stage === 'browser' ? 'Browsing Trees' : `Viewing: ${this._getTree(this._selectedTreeId)?.name || '...'}`;

    let statusText = '';
    if (this._selectedTalentId) {
      const talent = this._getTalent(this._selectedTalentId);
      statusText = `${slotTypeLabel} Talent: ${talent?.name || 'Selected'}`;
    } else {
      statusText = `${slotTypeLabel} Talent not yet chosen`;
    }

    return {
      mode: 'talent-selection',
      statusText,
      isComplete: !!this._selectedTalentId,
      slotType: this._slotType,
      stageName,
    };
  }
}

/**
 * GeneralTalentStep — Instance for heroic/general talent slots
 */
export class GeneralTalentStep extends TalentStep {
  constructor(descriptor) {
    super({
      ...descriptor,
      slotType: 'heroic',
    });
  }
}

/**
 * ClassTalentStep — Instance for class talent slots
 */
export class ClassTalentStep extends TalentStep {
  constructor(descriptor) {
    super({
      ...descriptor,
      slotType: 'class',
    });
  }
}
