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
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { buildDependencyGraph } from '/systems/foundryvtt-swse/scripts/apps/chargen/chargen-talent-tree-graph.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { canonicallyOrderSelections } from '../utils/selection-ordering.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { resolveClassModel, getClassTalentTreeLookupKeys } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import { getDroidTalentTreeName } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-trait-rules.js';

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function emitTalentStepTrace(label, payload = {}) {
  try {
    console.warn(`SWSE [TALENT STEP TRACE] ${label}`, payload);
  } catch (_err) {
    // no-op
  }
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
      this._selectedTalentId = existingTalent?.id || null;
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

    // Wire talent node focus (Stage 2)
    const talentNodes = shell.element.querySelectorAll('[data-action="focus-talent"]');
    talentNodes.forEach(node => {
      node.addEventListener('click', (e) => {
        e.preventDefault();
        const talentId = node.dataset.talentId;
        this._focusedTalentId = talentId;
        shell.render();
      }, { signal });
    });
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

    // Enter graph stage
    this._stage = 'graph';
    this._focusedTalentId = null;

    shell.render();
  }

  _exitTree(shell) {
    // Return to tree browser
    this._stage = 'browser';
    this._selectedTreeId = null;
    this._selectedTreeTalents = [];
    this._graphData = null;
    this._focusedTalentId = null;

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
        allowedIds = getClassTalentTreeLookupKeys(classModel) || [];
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

      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'talents',
        available: availableTrees,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
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
    };

    // Derive class-granted features (feats, proficiencies, force sensitivity)
    if (selectedClass && shell?.actor) {
      const ledger = buildClassGrantLedger(shell.actor, selectedClass, basePending);
      return mergeLedgerIntoPending(basePending, ledger);
    }

    return basePending;
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

    // Use canonical tree shape: prefer top-level talentIds over system.talentIds
    const talentIds = tree.talentIds || tree.system?.talentIds || [];
    const talents = [];
    const missingIds = [];

    for (const talentId of talentIds) {
      const talent = TalentRegistry.getById?.(talentId) || TalentRegistry.getByName?.(talentId);
      if (talent) {
        talents.push(talent);
      } else {
        missingIds.push(talentId);
      }
    }

    // Diagnostic logging (once per tree enter)
    emitTalentStepTrace('TREE_TALENT_LOOKUP', {
      treeId: tree?.id || null,
      treeName: tree?.name || null,
      talentIds,
      resolvedTalentNames: talents.map(t => t?.name || t?.id || '(unknown)'),
      missingIds,
    });
    if (talentIds.length > 0) {
      SWSELogger.debug(
        `[TalentStep] Tree "${tree.name}" (${tree.id}): ` +
        `${talentIds.length} talent IDs → ${talents.length} resolved ` +
        `${missingIds.length > 0 ? `(${missingIds.length} missing: ${missingIds.join(', ')})` : '(all resolved)'}`
      );
    }

    return talents;
  }

  /**
   * Get a tree by ID
   */
  _getTree(treeId) {
    return TalentTreeDB.trees.get(treeId);
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

  /**
   * Data for Stage 2: Tree Graph
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
      // Still render, but with empty graph (better than crashing)
    }

    // Prepare node states
    const nodeStates = {};
    const pendingAbilityData = this._buildPendingAbilityData(context?.shell);
    if (this._graphData?.nodes) {
      for (const [nodeId, node] of this._graphData.nodes) {
        const talent = node.talent;
        const isLegal = await this._isLegal(context?.shell?.actor, talent, pendingAbilityData);
        const isOwned = false;  // planned: check if already owned
        const isSelected = nodeId === this._selectedTalentId;
        const isSuggested = this._suggestedTrees.some(t => t.id === this._selectedTreeId);

        nodeStates[nodeId] = {
          legal: isLegal,
          owned: isOwned,
          selected: isSelected,
          suggested: isSuggested,
        };
      }
    }

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

    emitTalentStepTrace('GRAPH_DATA_READY', {
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree?.name || null,
      nodeCount: this._graphData?.nodes?.size || 0,
      edgeCount: this._graphData?.edges?.length || 0,
      focusedTalentId: this._focusedTalentId,
      selectedTalentId: this._selectedTalentId,
    });

    return {
      stage: 'graph',
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree.name,
      nodeStates,
      graphData: this._graphData,
      orderedSelections,
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

  renderDetailsPanel(focusedItem) {
    if (this._stage === 'browser') {
      emitTalentStepTrace('DETAILS_EMPTY', {
        reason: 'browser-stage-no-details',
        focusedTreeId: this._focusedTreeId,
        selectedTreeId: this._selectedTreeId,
      });
      // Tree browser doesn't use details panel
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

    // Use canonical talent.id field (from TalentRegistry normalized entry)
    const talentId = talent.id;
    const isSelected = talentId === this._selectedTalentId;
    const selectedTree = this._getTree(this._selectedTreeId);

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(talent, 'talent', {
      treeName: selectedTree?.name || '',
    });

    emitTalentStepTrace('DETAILS_READY', {
      focusedTalentId: this._focusedTalentId,
      talentId,
      talentName: talent?.name || null,
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree?.name || null,
      isSelected,
      prerequisiteText: normalized.prerequisites ? normalized.prerequisites[0] : null,
    });

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/talent-details.hbs',
      data: {
        // Pass talent with canonical id field only (no artificial _id injection)
        talent,
        talentId,  // Expose canonical ID explicitly for template
        treeName: selectedTree?.name || '',
        isSelected,
        description: talent.description || talent.system?.description || '',
        // Use normalized prerequisites from normalizer (avoids fabrication)
        prerequisites: normalized.prerequisites ? normalized.prerequisites[0] : null,
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
    return 'context-only';
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
