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
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { buildDependencyGraph } from '/systems/foundryvtt-swse/scripts/apps/chargen/chargen-talent-tree-graph.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { canonicallyOrderSelections } from '../utils/selection-ordering.js';

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
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Build talent tree database if not already done
    if (!TalentTreeDB.isBuilt) {
      await TalentTreeDB.build();
    }

    // Load all talent trees
    this._allTrees = Array.from(TalentTreeDB.trees.values());

    // Filter for trees available in this context (heroic or class-specific)
    const availableTrees = await this._getAvailableTrees(shell.actor);

    // Get suggested trees (pass shell so suggestion engine sees chargen choices)
    this._suggestedTrees = await this._getSuggestedTrees(shell.actor, availableTrees, shell);

    // Store available trees for display
    this._allTrees = availableTrees;

    // Start in tree browser stage
    this._stage = 'browser';
    this._focusedTreeId = null;
    this._selectedTreeId = null;

    // Enable mentor
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire search input (Stage 1)
    const searchInput = shell.element.querySelector('.talent-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        shell.render();
      }, { signal });
    }

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
    this._selectedTreeId = treeId;

    // Load talents for this tree
    const tree = this._getTree(treeId);
    if (!tree) return;

    // Get talents in this tree
    this._selectedTreeTalents = await this._getTalentsForTree(tree, shell.actor);

    // Build dependency graph
    this._graphData = buildDependencyGraph(this._selectedTreeTalents);

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
   */
  async _getAvailableTrees(actor) {
    if (!actor) return [];

    // Filter by slot type
    const available = this._allTrees.filter(tree => {
      // Check if tree is available in this slot context
      if (this._slotType === 'class' && tree.system?.classRestricted !== true) {
        return false;  // Class slot, but tree is not class-specific
      }

      // Check tree legality
      return true;  // TODO: Add legality checks if trees have prerequisites
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

      return (suggested || []).slice(0, 3);  // Top 3 trees
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
   * Get talents for a specific tree
   */
  async _getTalentsForTree(tree, actor) {
    if (!tree) return [];

    const talentIds = tree.system?.talentIds || [];
    const talents = [];

    for (const talentId of talentIds) {
      const talent = TalentRegistry.get?.(talentId);
      if (talent) {
        talents.push(talent);
      }
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
    return TalentRegistry.get?.(talentId);
  }

  /**
   * Check if a talent node is legal
   */
  async _isLegal(actor, talent) {
    const assessment = AbilityEngine.evaluateAcquisition(actor, talent);
    return assessment.legal;
  }

  /**
   * Get prerequisite details for a talent
   */
  async _getPrerequisiteDetails(actor, talent) {
    const assessment = AbilityEngine.evaluateAcquisition(actor, talent);

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
   */
  _getTreeBrowserData(context) {
    const filteredTrees = this._filterTreesBySearch(this._allTrees);

    // Get committed talents from session and order them canonically
    const committedTalents = context?.shell?.progressionSession?.draftSelections?.talents || [];
    const orderedSelections = canonicallyOrderSelections(committedTalents);

    return {
      stage: 'browser',
      slotType: this._slotType,
      allTrees: filteredTrees.map(tree => ({
        _id: tree._id || tree.id,
        name: tree.name,
        summary: tree.system?.description || '',
        nodeCount: (tree.system?.talentIds || []).length,
        isSuggested: this._suggestedTrees.some(s => s._id === tree._id || s.id === tree.id),
        isFocused: (tree._id || tree.id) === this._focusedTreeId,
        slotType: tree.system?.classRestricted ? 'class' : 'heroic',
      })),
      suggestedTrees: this._suggestedTrees.map(t => ({
        _id: t._id || t.id,
        name: t.name,
      })),
      searchQuery: this._searchQuery,
      orderedSelections,
    };
  }

  /**
   * Data for Stage 2: Tree Graph
   */
  async _getTreeGraphData(context) {
    const selectedTree = this._getTree(this._selectedTreeId);
    if (!selectedTree || !this._graphData) {
      return { stage: 'graph', error: 'Tree not found' };
    }

    // Prepare node states
    const nodeStates = {};
    for (const [nodeId, node] of this._graphData.nodes) {
      const talent = node.talent;
      const isLegal = await this._isLegal({}, talent);  // TODO: pass actual actor
      const isOwned = false;  // TODO: check if already owned
      const isSelected = nodeId === this._selectedTalentId;
      const isSuggested = this._suggestedTrees.some(t => t._id === this._selectedTreeId);

      nodeStates[nodeId] = {
        legal: isLegal,
        owned: isOwned,
        selected: isSelected,
        suggested: isSuggested,
      };
    }

    // Get committed talents from session and order them canonically
    const committedTalents = context?.shell?.progressionSession?.draftSelections?.talents || [];
    const orderedSelections = canonicallyOrderSelections(committedTalents);

    return {
      stage: 'graph',
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree.name,
      nodeStates,
      graphData: this._graphData,
      orderedSelections,
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
      // Tree browser doesn't use details panel
      return this.renderDetailsPanelEmptyState();
    }

    if (!this._focusedTalentId) {
      return this.renderDetailsPanelEmptyState();
    }

    const talent = this._getTalent(this._focusedTalentId);
    if (!talent) {
      return this.renderDetailsPanelEmptyState();
    }

    const isSelected = talent._id === this._selectedTalentId;
    const selectedTree = this._getTree(this._selectedTreeId);

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/talent-details.hbs',
      data: {
        talent,
        treeName: selectedTree?.name || '',
        isSelected,
        description: talent.system?.description || '',
        prerequisites: talent.system?.prerequisites || talent.system?.prerequisite || '',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Focus/Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(item) {
    if (this._stage === 'graph') {
      this._focusedTalentId = item?.id || item;
    }
  }

  async onItemCommitted(item, shell) {
    if (!item) return;

    if (this._stage === 'browser') {
      // Entering tree on commit
      this._enterTree(item._id || item, {});  // TODO: pass shell
    } else if (this._stage === 'graph') {
      // Toggle selection in graph
      const talentId = item._id || item;
      if (this._selectedTalentId === talentId) {
        this._selectedTalentId = null;
      } else {
        this._selectedTalentId = talentId;
      }

      // Update observable build intent (Phase 6 solution)
      // Each talent slot (general/class) commits to shell.committedSelections with its own stepId,
      // and also updates buildIntent for cross-step visibility
      if (shell?.buildIntent && this.descriptor?.stepId) {
        const selectedTalentData = this._selectedTalentId
          ? { talentId: this._selectedTalentId, slotType: this._slotType }
          : null;
        shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, selectedTalentData);
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
