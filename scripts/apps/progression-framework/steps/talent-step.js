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
import { FeatChoiceResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js';
import { FeatChoiceDialog } from '/systems/foundryvtt-swse/scripts/apps/choices/feat-choice-dialog.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { buildDependencyGraph } from '/systems/foundryvtt-swse/scripts/apps/chargen/chargen-talent-tree-graph.js';
import { renderProgressionTalentTree } from './talent-tree-progression-renderer.js';
import { buildTalentTreeMentorRead } from './talent-tree-mentor-commentary.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithPicker } from './mentor-step-integration.js';
import { canonicallyOrderSelections } from '../utils/selection-ordering.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { resolveClassModel, getClassTalentTreeLookupKeys } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import { getDroidTalentTreeName } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-trait-rules.js';

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleTalentCombination } from '/systems/foundryvtt-swse/scripts/houserules/houserule-talent-combination.js';

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

const talentStepHydrationAuditCache = new Set();

function normalizeTalentAuditName(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function normalizeTalentTreeAccessKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

function isRepeatableTalentEntry(talent = {}) {
  const system = talent?.system || {};
  if (talent?.repeatable === true || system.repeatable === true || system.canRepeat === true || system.allowDuplicates === true) return true;
  const text = [
    talent?.name,
    talent?.description,
    talent?.benefit,
    talent?.special,
    system.description,
    system.benefit,
    system.special,
    system.details,
    system.summary,
  ].map(toDisplayText).join(' ').toLowerCase();
  return /(?:can|may)\s+(?:select|take|choose)\s+this\s+talent\s+multiple\s+times/.test(text)
    || /may\s+be\s+taken\s+multiple\s+times/.test(text)
    || /can\s+be\s+taken\s+multiple\s+times/.test(text)
    || /may\s+be\s+selected\s+multiple\s+times/.test(text)
    || /taken\s+multiple\s+times/.test(text);
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
    this._treeRecommendationById = new Map();
    this._talentRecommendationById = new Map();
    this._treeTalentCache = new Map();
    this._focusedTreeId = null;
    this._selectedTreeId = null;
    this._searchQuery = '';

    // Tree graph state
    this._selectedTreeTalents = [];  // Talents in selected tree
    this._graphData = null;          // Dependency graph for selected tree
    this._focusedTalentId = null;    // Focused node in graph
    this._focusedTalentItem = null;  // Resolved focused talent payload for details rail
    this._selectedTalentId = null;   // Committed talent for this slot
    this._viewMode = 'both';         // 'both', 'list', or 'map'
    this._lastGraphNodeStates = {};  // Async legality cache for the SVG renderer
    this._centerGraphAfterRender = false;

    // Event listener cleanup
    this._renderAbort = null;
    this._isDroidProgression = false;
    this._lastMentorTreeSpeechId = null;
    this._treeDescriptionFallbacks = null;
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
        const classes = Array.from(el.classList || []).filter(name => /^(prog|swse|talent)-/.test(name)).slice(0, 3).join('.');
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
      this._treeTalentCache = new Map();
      this._talentRecommendationById = new Map();
      this._treeRecommendationById = new Map();
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

      await this._loadTreeDescriptionFallbacks();

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
            this._focusTree(treeId, shell);
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
            this._renderPreservingScroll(shell);
          }
          return true;
        }

        case 'fit-talent-tree': {
          this._viewMode = this._viewMode === 'list' ? 'both' : this._viewMode;
          this._renderPreservingScroll(shell);
          return true;
        }

        case 'center-talent-node': {
          this._centerGraphAfterRender = true;
          if (this._viewMode === 'list') this._viewMode = 'both';
          this._renderPreservingScroll(shell);
          return true;
        }

        case 'focus-talent': {
          const talentId = target?.dataset?.talentId || target?.closest('[data-talent-id]')?.dataset?.talentId;
          if (talentId) {
            this._focusedTalentId = talentId;
            this._renderPreservingScroll(shell);
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
      this._renderPreservingScroll(shell);
    };
    shell.element.addEventListener('prog:utility:search', onSearch, { signal });


    // Wire tree card focus (Stage 1)
    const treeCards = shell.element.querySelectorAll('[data-action="focus-tree"]');
    treeCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const treeId = card.dataset.treeId;
        this._focusTree(treeId, shell);
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
          this._renderPreservingScroll(shell);
        }
      }, { signal });
    });

    shell.element.querySelectorAll('[data-action="fit-talent-tree"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this._viewMode === 'list') this._viewMode = 'both';
        this._renderPreservingScroll(shell);
      }, { signal });
    });

    shell.element.querySelectorAll('[data-action="center-talent-node"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._centerGraphAfterRender = true;
        if (this._viewMode === 'list') this._viewMode = 'both';
        this._renderPreservingScroll(shell);
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
        this._renderPreservingScroll(shell);
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
    if (this._stage === 'graph') {
      if (!this._graphData) {
        SWSELogger.warn('[TalentStep] Graph stage reached with no graph data', {
          selectedTreeId: this._selectedTreeId,
          selectedTalentCount: this._selectedTreeTalents?.length || 0,
        });
        return;
      }

      const canvas = workSurfaceEl.querySelector('.talent-graph-canvas[data-graph-id]');
      if (canvas) {
        try {
          await renderProgressionTalentTree(canvas, {
            graphData: this._graphData,
            nodeStates: this._lastGraphNodeStates || this._buildNodeStates(),
            focusedTalentId: this._focusedTalentId,
            onFocus: async (talentId) => {
              await this.onItemFocused(talentId, shell);
              this._renderPreservingScroll(shell);
            },
            onCommit: async (talentId) => {
              await this.onItemCommitted(this._resolveTalentFocusId(talentId), shell);
            }
          });

          canvas.addEventListener('click', async (event) => {
            const node = event.target?.closest?.('.prog-talent-orb-node[data-node-id]');
            if (!node || !canvas.contains(node)) return;
            event.preventDefault();
            event.stopPropagation();
            await this.onItemFocused(node.dataset.nodeId, shell);
            this._renderPreservingScroll(shell);
          }, { signal: this._renderAbort?.signal });

          canvas.addEventListener('dblclick', async (event) => {
            const node = event.target?.closest?.('.prog-talent-orb-node[data-node-id]');
            if (!node || !canvas.contains(node)) return;
            event.preventDefault();
            event.stopPropagation();
            await this.onItemCommitted(this._resolveTalentFocusId(node.dataset.nodeId), shell);
          }, { signal: this._renderAbort?.signal });

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
      } else {
        SWSELogger.warn('[TalentStep] Graph canvas missing from talent planner template', {
          selectedTreeId: this._selectedTreeId,
          workSurfaceClasses: workSurfaceEl?.className || null,
        });
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

  _focusTree(treeId, shell, { speak = true } = {}) {
    this._focusedTreeId = treeId;
    if (speak) this._speakTreeMentorCommentary(treeId, shell);
    this._renderPreservingScroll(shell);
  }

  _speakTreeMentorCommentary(treeId, shell) {
    const tree = this._getTree(treeId);
    if (!tree || !shell?.mentor) return;
    const treeKey = tree?.id || tree?.name || treeId;
    if (this._lastMentorTreeSpeechId === treeKey) return;
    this._lastMentorTreeSpeechId = treeKey;

    const recommendation = this._treeRecommendationById.get(tree?.id) || this._treeRecommendationById.get(tree?.name) || null;
    const mentorRead = this._buildMentorTreeCommentary(tree, shell, recommendation);
    if (!mentorRead?.text) return;

    shell.mentor.currentDialogue = mentorRead.text;
    try {
      shell.mentorRail?.speak?.(mentorRead.text, mentorRead.tone || 'thoughtful');
    } catch (_err) {
      // Mentor speech is presentation-only. The detail rail still displays the read.
    }
  }

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
    this._selectedTreeTalents = await this._getTalentsForTreeCached(tree, shell.actor);
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
    this._focusedTalentItem = null;
    this._lastGraphNodeStates = {};

    this._renderPreservingScroll(shell);
  }

  _exitTree(shell) {
    // Return to tree browser
    this._stage = 'browser';
    this._selectedTreeId = null;
    this._selectedTreeTalents = [];
    this._graphData = null;
    this._focusedTalentId = null;
    this._focusedTalentItem = null;
    this._lastGraphNodeStates = {};
    this._centerGraphAfterRender = false;

    this._renderPreservingScroll(shell);
  }

  // ---------------------------------------------------------------------------
  // Data Retrieval
  // ---------------------------------------------------------------------------


  _getClassTalentTreeAccessKeys(classModel) {
    if (!classModel) return [];
    const lookup = getClassTalentTreeLookupKeys(classModel) || {};
    return [
      ...(lookup.treeIds || []),
      ...(lookup.treeNames || []),
      ...(classModel.talentTreeIds || []),
      ...(classModel.talentTreeSourceIds || []),
      ...(classModel.talentTreeNames || []),
      ...(classModel.talentTrees || []),
      ...(classModel.system?.talentTreeIds || []),
      ...(classModel.system?.talent_tree_ids || []),
      ...(classModel.system?.talent_trees || []),
      ...(classModel.system?.talentTreeNames || []),
    ].filter(Boolean);
  }

  _collectActorUnlockedTalentTreeKeys(actor) {
    const keys = [];
    const addClass = (candidate) => {
      const model = resolveClassModel(candidate) || candidate;
      keys.push(...this._getClassTalentTreeAccessKeys(model));
    };
    const rawItems = actor?.items?.contents || actor?.items || [];
    const items = Array.isArray(rawItems) ? rawItems : Array.from(rawItems || []);
    items.filter(item => item?.type === 'class').forEach(item => addClass({
      id: item.system?.classId || item.id,
      name: item.name || item.system?.class_name,
      system: item.system || {},
    }));
    const systemClasses = actor?.system?.classes || {};
    for (const [className, classData] of Object.entries(systemClasses || {})) {
      addClass({ name: className, system: classData || {} });
    }
    return keys;
  }

  _getSelectedClassForTreeAuthority(shell) {
    const selections = shell?.progressionSession?.draftSelections || {};
    const committed = shell?.committedSelections || null;
    const candidates = [
      selections.class,
      selections.selectedClass,
      selections.classSelection,
      selections.progressionClass,
      committed?.get?.('class'),
      shell?.buildIntent?.getSelection?.('class'),
      this._classId ? { id: this._classId, name: this._classId } : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const model = resolveClassModel(candidate);
      if (model) return model;
      if (candidate?.name || candidate?.id || candidate?.system) return candidate;
    }
    return null;
  }

  _getDroidDegreeForTreeAuthority(shell) {
    const activeShell = globalThis.game?.__swseActiveProgressionShell;
    const candidateShell = shell || activeShell;
    const selections = candidateShell?.progressionSession?.draftSelections || {};
    const droid = selections.droid || selections.droidBuild || selections.droidPackage || selections.droidSystems || {};
    const candidates = [
      droid.degree,
      droid.droidDegree,
      droid.selectedDegree,
      droid.chassis?.degree,
      droid.chassis?.droidDegree,
      selections.droidDegree,
      selections.pendingDroidContext?.degree,
      selections.pendingDroidContext?.droidDegree,
      candidateShell?.actor?.system?.droidDegree,
      candidateShell?.actor?.system?.species,
      candidateShell?.actor?.system?.details?.species,
    ];
    for (const value of candidates) {
      const text = String(value || '').toLowerCase();
      const match = text.match(/([1-5])(?:st|nd|rd|th)?[-_\s]*degree/);
      if (match) return `${match[1]}${match[1] === '1' ? 'st' : match[1] === '2' ? 'nd' : match[1] === '3' ? 'rd' : 'th'}-degree`;
      const wordMap = { first: '1st-degree', second: '2nd-degree', third: '3rd-degree', fourth: '4th-degree', fifth: '5th-degree' };
      for (const [word, degree] of Object.entries(wordMap)) {
        if (text.includes(word)) return degree;
      }
    }
    return null;
  }

  _getDroidTalentTreeAccessKeys(shell) {
    const degree = this._getDroidDegreeForTreeAuthority(shell);
    const treeName = degree ? getDroidTalentTreeName(degree) : null;
    if (!treeName) return [];
    const compact = treeName.replace(/\s*Talent\s+Tree$/i, '');
    return [treeName, compact, compact.replace(/-/g, ' '), compact.replace(/[\s-]+/g, '')]
      .map(value => String(value || '').trim())
      .filter(Boolean);
  }

  _slotKey() {
    return String(this.descriptor?.stepId || this.descriptor?.id || this._slotType || 'talent-slot');
  }

  _entryMatchesCurrentSlot(entry) {
    const key = this._slotKey();
    const entryKey = entry?.slotKey || entry?.stepId || entry?.sourceStep || entry?.source;
    if (entryKey) return String(entryKey) === key;
    return entry?.slotType === this._slotType;
  }

  /**
   * Get talent trees available in current context
   * HARDENED: Use class-resolution helper to resolve class model first
   */
  async _getAvailableTrees(shell) {
    const actor = shell?.actor || null;
    const allTrees = this._allTrees || [];
    const selectedClass = this._getSelectedClassForTreeAuthority(shell);

    // Resolve class model using canonical helper (primary source)
    let classModel = null;
    let allowedIds = [];

    emitTalentStepTrace('AVAILABLE_TREES_START', {
      slotType: this._slotType,
      actorName: actor?.name || null,
      selectedClass: selectedClass?.name || selectedClass?.id || null,
      allTreeCount: allTrees.length,
    });

    // Classes that grant access to all Force Talent Trees in their class slot.
    const FORCE_TALENT_TREES = [
      'alter', 'control', 'dark-side', 'sense', 'light-side', 'guardian-spirit'
    ];
    const FORCE_SENSITIVE_CLASSES = new Set([
      'jedi', 'jedi-knight', 'force-adept', 'force-disciple',
      'jedi-master', 'sith-apprentice', 'sith-lord', 'imperial-knight'
    ]);

    if (selectedClass) {
      classModel = resolveClassModel(selectedClass) || selectedClass;
      if (classModel) {
        allowedIds = this._getClassTalentTreeAccessKeys(classModel);
        SWSELogger.debug(`[TalentStep] Resolved class model "${classModel.name || selectedClass?.name || selectedClass?.id}" with ${allowedIds.length} talent tree access keys`);

        // RAW: These force-using classes may select Force Talent Trees in their class slot.
        const classKey = String(
          classModel.id || classModel.classId || classModel.name || selectedClass?.id || selectedClass?.name || ''
        ).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        if (FORCE_SENSITIVE_CLASSES.has(classKey)) {
          allowedIds = [...new Set([...allowedIds, ...FORCE_TALENT_TREES])];
          SWSELogger.debug(`[TalentStep] Force Talent Trees added for force-using class "${classKey}"`);
        }
      }
    }

    if (this._slotType === 'heroic') {
      // RAW: Force Sensitivity grants access to all Force Talent Trees.
      // Detect it from actor-owned feats OR pending draft selections in the shell.
      // (FORCE_TALENT_TREES is defined above, shared with the class slot block)

      const actorHasForceSensitivity = (actor?.items?.contents ?? actor?.items ?? [])
        .some(i => i?.type === 'feat' && /force sensitiv(?:e|ity)/i.test(String(i?.name || '')));

      const pendingFeats = shell?.progressionSession?.draftSelections?.feats
        ?? shell?.buildIntent?.getSelection?.('feats')
        ?? [];
      const pendingHasForceSensitivity = Array.isArray(pendingFeats)
        && pendingFeats.some(f => /force sensitiv(?:e|ity)/i.test(String(f?.name || f || '')));

      // Also check class-granted force sensitivity (e.g. Jedi)
      const classGrantsForceSensitivity = (() => {
        try {
          const sel = this._getSelectedClassForTreeAuthority(shell);
          if (!sel || !actor) return false;
          const ledger = buildClassGrantLedger(actor, sel, {});
          return ledger?.forceSensitive === true
            || Array.from(ledger?.grantedFeats || []).some(g =>
              /force sensitiv(?:e|ity)/i.test(String(g?.name || ''))
            );
        } catch { return false; }
      })();

      const hasForceSensitivity = actorHasForceSensitivity || pendingHasForceSensitivity || classGrantsForceSensitivity;

      allowedIds = Array.from(new Set([
        ...this._collectActorUnlockedTalentTreeKeys(actor),
        ...allowedIds,
        ...this._getDroidTalentTreeAccessKeys(shell),
        ...(hasForceSensitivity ? FORCE_TALENT_TREES : []),
      ].map(value => String(value || '').trim()).filter(Boolean)));
    }

    // Fallback: Use actor authority only for levelup context when class is unresolved.
    // Pass the selected class and droid degree as slot context so authority can be additive.
    if (actor && allowedIds.length === 0 && !selectedClass) {
      const slot = {
        slotType: this._slotType,
        classId: this._classId || null,
        classModel,
        selectedClass,
        droidDegree: this._getDroidDegreeForTreeAuthority(shell),
        shell,
      };
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
        selectedClass: selectedClass?.name || selectedClass?.id || null,
        resolvedClassModel: classModel?.name || null,
      });
      console.warn('[TalentStep] No class talent trees allowed in this context (fail-closed)');
      return [];
    }

    // For heroic slots, use all available trees if no restriction. Droid degree trees
    // are additive to class access; they must never replace Noble/Soldier/etc. trees.
    const normalizedAllowed = new Set((allowedIds || []).map(normalizeTalentTreeAccessKey).filter(Boolean));
    const available = allTrees.filter(tree => {
      if (!normalizedAllowed.size) return this._slotType === 'heroic';
      const treeIds = [tree.id, tree.sourceId, tree.name, tree.key, tree.displayName].filter(Boolean).map(normalizeTalentTreeAccessKey);
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
    this._treeRecommendationById = new Map();
    try {
      const mode = shell?.mode || this.descriptor?.mode || 'chargen';
      const pendingData = this._buildTalentSuggestionPendingData(shell, availableTrees);
      const recommendations = [];

      for (const tree of availableTrees || []) {
        const legalTalents = await this._getSelectableTalentsForTreeSuggestion(tree, shell, pendingData);
        if (!legalTalents.length) {
          this._treeRecommendationById.set(tree?.id || tree?.name, {
            treeId: tree?.id || tree?.name,
            legalChoiceCount: 0,
            label: 'No Legal Picks',
            reason: 'This tree has no selectable talents for the current slot, so it is not considered by the suggestion engine.',
            reasons: ['No selectable talents are legal right now.'],
            score: -1,
            isTopSuggestion: false,
          });
          continue;
        }

        const candidateTalents = legalTalents.map(talent => this._toSuggestionTalentCandidate(talent, tree));
        const treePendingData = {
          ...pendingData,
          selectedTree: { id: tree?.id || null, name: tree?.name || null },
          allowedTalentTrees: [tree?.id, tree?.sourceId, tree?.name].filter(Boolean),
        };

        const suggestedTalents = await SuggestionService.getSuggestions(actor, mode, {
          domain: 'talents',
          available: candidateTalents,
          pendingData: treePendingData,
          focus: `talent-tree:${tree?.id || tree?.name}:tree-mode`,
          engineOptions: { includeFutureAvailability: false },
          persist: false
        });

        const legalKeys = new Set(candidateTalents.flatMap(talent => this._getTalentIdentityKeys(talent)));
        const rankedTalents = this._sortSuggestionResults((suggestedTalents || [])
          .filter(talent => this._getTalentIdentityKeys(talent).some(key => legalKeys.has(key))));
        const topTalent = rankedTalents[0] || candidateTalents[0];
        const recommendation = this._buildTreeRecommendation(tree, topTalent, rankedTalents, legalTalents, pendingData);
        this._treeRecommendationById.set(tree?.id || tree?.name, recommendation);
        recommendations.push(recommendation);
      }

      recommendations.sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (right.legalChoiceCount !== left.legalChoiceCount) return right.legalChoiceCount - left.legalChoiceCount;
        return String(left.treeName || '').localeCompare(String(right.treeName || ''));
      });

      recommendations.forEach((recommendation, index) => {
        recommendation.rank = index + 1;
        recommendation.isTopSuggestion = index < 4;
      });

      return recommendations.slice(0, 4).map(recommendation => recommendation.tree);
    } catch (err) {
      console.warn('[TalentStep] Suggestion service error:', err);
      return [];
    }
  }

  _buildTalentSuggestionPendingData(shell, availableTrees = []) {
    const actor = shell?.actor || null;
    const characterData = this._buildCharacterDataFromShell(shell);
    const pendingData = SuggestionContextBuilder.buildPendingData(actor, characterData) || {};
    pendingData.activeSlotContext = {
      slotKind: 'talent',
      slotType: this._slotType,
      classId: this._classId || null,
      activeSlotIndex: 0,
      domains: Array.isArray(this._allowedTreeIds) ? [...this._allowedTreeIds] : null,
    };
    pendingData.allowedTalentTrees = (availableTrees || [])
      .map((tree) => tree?.id || tree?._id || tree?.sourceId || tree?.name)
      .filter(Boolean);
    Object.assign(pendingData, this._buildPendingAbilityData(shell) || {});
    return pendingData;
  }

  _toSuggestionTalentCandidate(talent, tree = null) {
    const base = talent?.toObject ? talent.toObject() : { ...(talent || {}) };
    const system = { ...(base.system || talent?.system || {}) };

    // The step already uses tree-authority and per-node legality. Remove broad
    // tree authority fields from the suggestion copy so the older talent scorer
    // cannot re-filter legal class-tree candidates using heroic-slot authority.
    delete system.talent_tree;
    delete system.talentTree;
    system.tree = system.tree || tree?.name || tree?.id || '';

    return {
      ...base,
      id: base.id || base._id || talent?.id || talent?._id || talent?.name,
      _id: base._id || base.id || talent?._id || talent?.id || talent?.name,
      name: base.name || talent?.name || 'Unknown Talent',
      type: base.type || talent?.type || 'talent',
      system,
      isQualified: true,
      sourceTreeId: tree?.id || null,
      sourceTreeName: tree?.name || null,
    };
  }

  async _getSelectableTalentsForTreeSuggestion(tree, shell, pendingData = {}) {
    const talents = await this._getTalentsForTreeCached(tree, shell?.actor);
    const otherSelectedKeys = this._getSelectedTalentKeys(shell, { excludeSlotType: this._slotType });
    const ownedTalentKeys = this._getOwnedTalentKeys(shell?.actor);
    const legal = [];

    for (const talent of talents || []) {
      const identityKeys = this._getTalentIdentityKeys(talent);
      const repeatable = isRepeatableTalentEntry(talent);
      if (!repeatable && identityKeys.some(key => otherSelectedKeys.has(key) || ownedTalentKeys.has(key))) continue;

      let prereqDetails = { legal: true };
      try {
        prereqDetails = shell?.actor
          ? await this._getPrerequisiteDetails(shell.actor, talent, pendingData)
          : { legal: true };
      } catch (_err) {
        prereqDetails = { legal: false };
      }

      if (prereqDetails.legal !== false) legal.push(talent);
    }

    return legal;
  }

  async _getTalentsForTreeCached(tree, actor) {
    const key = tree?.id || tree?.sourceId || tree?.name;
    if (!key) return [];
    if (this._treeTalentCache.has(key)) return this._treeTalentCache.get(key) || [];
    const talents = await this._getTalentsForTree(tree, actor);
    this._treeTalentCache.set(key, talents || []);
    return talents || [];
  }

  _getSuggestionScalar(item) {
    const candidates = [
      item?.suggestion?.score,
      item?.suggestion?.finalScore,
      item?.suggestion?.scoring?.final,
      item?.suggestion?.scoring?.finalScore,
      item?.suggestion?.confidence,
      item?.scoring?.finalScore,
      0,
    ];
    for (const value of candidates) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
    return 0;
  }

  _getSuggestionTier(item) {
    const tier = Number(item?.suggestion?.tier ?? item?.recommendation?.tier ?? 0);
    return Number.isFinite(tier) ? tier : 0;
  }

  _sortSuggestionResults(items = []) {
    return [...items].sort((left, right) => {
      const tierDelta = this._getSuggestionTier(right) - this._getSuggestionTier(left);
      if (Math.abs(tierDelta) > 0.0001) return tierDelta;
      const scoreDelta = this._getSuggestionScalar(right) - this._getSuggestionScalar(left);
      if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;
      return String(left?.name || '').localeCompare(String(right?.name || ''));
    });
  }

  _getRecommendationLabel(item, { rank = null } = {}) {
    const tier = this._getSuggestionTier(item);
    if (rank === 1 && tier >= 1) return 'Top Pick';
    if (tier >= 5) return 'Priority Path';
    if (tier >= 4) return 'Recommended';
    if (tier >= 2) return 'Strong Fit';
    if (tier >= 1) return 'Good Fit';
    return 'Legal Option';
  }

  _extractSuggestionReasons(item, fallback = []) {
    const suggestion = item?.suggestion || {};
    const reasonCode = suggestion.reasonCode || suggestion.reason?.tierAssignedBy || null;
    const reasons = [
      ...(Array.isArray(suggestion.reasons) ? suggestion.reasons : []),
      ...(Array.isArray(suggestion.reasonBullets) ? suggestion.reasonBullets : []),
      ...(Array.isArray(item?.reasonBullets) ? item.reasonBullets : []),
      suggestion.reasonText,
      suggestion.reason,
      reasonCode ? this._humanizeSuggestionReasonCode(reasonCode, item) : null,
      ...fallback,
    ].map(toDisplayText).filter(Boolean);

    return [...new Set(reasons)].slice(0, 4);
  }

  _humanizeSuggestionReasonCode(reasonCode, item = {}) {
    const code = String(reasonCode || '').toUpperCase();
    const name = item?.name || 'this choice';
    if (code.includes('PRESTIGE')) return `${name} supports a longer prestige or advanced path.`;
    if (code.includes('WISHLIST')) return `${name} moves you toward something already marked as desirable for this build.`;
    if (code.includes('META')) return `${name} has a known synergy with your current build signals.`;
    if (code.includes('CHAIN')) return `${name} continues a prerequisite chain you have already started.`;
    if (code.includes('SPECIES')) return `${name} lines up with your species or heritage signals.`;
    if (code.includes('SKILL')) return `${name} uses skills your character is already developing.`;
    if (code.includes('ABILITY')) return `${name} leans into one of your stronger ability scores.`;
    if (code.includes('CLASS')) return `${name} fits the class path you are currently pursuing.`;
    return `${name} is legal now and fits the current talent slot.`;
  }

  _buildTreeRecommendation(tree, topTalent, rankedTalents = [], legalTalents = [], pendingData = {}) {
    const topTier = this._getSuggestionTier(topTalent);
    const topScore = this._getSuggestionScalar(topTalent);
    const investmentBonus = 0;
    const legalChoiceCount = legalTalents.length;
    const score = (topTier * 1000) + (topScore * 100) + Math.min(legalChoiceCount, 6) * 8 + investmentBonus;
    const label = this._getRecommendationLabel(topTalent);
    const fallback = [
      topTalent?.name ? `${topTalent.name} is the strongest legal pick currently visible in this tree.` : null,
      `${tree?.name || 'This tree'} has ${legalChoiceCount} legal talent${legalChoiceCount === 1 ? '' : 's'} available for this slot.`,
    ].filter(Boolean);
    const reasons = this._extractSuggestionReasons(topTalent, fallback);
    const treeWithRecommendation = {
      ...tree,
      suggestion: {
        ...(tree?.suggestion || {}),
        mode: 'tree',
        tier: topTier,
        score,
        reason: reasons[0],
        reasons,
        reasonBullets: reasons,
        topTalentId: topTalent?.id || topTalent?._id || topTalent?.name || null,
        topTalentName: topTalent?.name || null,
        legalChoiceCount,
      },
      reasonBullets: reasons,
      isSuggested: topTier > 0,
    };

    return {
      mode: 'tree',
      tree: treeWithRecommendation,
      treeId: tree?.id || tree?.name,
      treeName: tree?.name || tree?.id || 'Talent Tree',
      topTalentId: topTalent?.id || topTalent?._id || topTalent?.name || null,
      topTalentName: topTalent?.name || null,
      rankedTalentNames: rankedTalents.slice(0, 3).map(talent => talent?.name).filter(Boolean),
      legalChoiceCount,
      tier: topTier,
      score,
      label,
      reason: reasons[0] || `${tree?.name || 'This tree'} has legal options available now.`,
      reasons,
      isTopSuggestion: false,
      rank: null,
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
    return this._getCommittedTalentSelections(shell).find(talent => this._entryMatchesCurrentSlot(talent)) || null;
  }

  _normalizeTalentKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-');
  }

  _getTalentIdentityKeys(talent) {
    return [talent?.id, talent?._id, talent?.uuid, talent?.name, talent?.label]
      .filter(Boolean)
      .map(value => this._normalizeTalentKey(value))
      .filter(Boolean);
  }

  _getOwnedTalentKeys(actor) {
    const keys = new Set();
    for (const item of actor?.items || []) {
      if (item?.type !== 'talent') continue;
      for (const key of this._getTalentIdentityKeys(item)) keys.add(key);
    }
    return keys;
  }

  _getSelectedTalentKeys(shell, { excludeSlotType = null } = {}) {
    const keys = new Set();
    for (const selection of this._getCommittedTalentSelections(shell)) {
      if (excludeSlotType && selection?.slotType === excludeSlotType) continue;
      for (const key of this._getTalentIdentityKeys(selection)) keys.add(key);
    }
    return keys;
  }

  _isTalentAlreadyTakenElsewhere(talent, shell) {
    if (isRepeatableTalentEntry(talent)) return false;
    const keys = this._getTalentIdentityKeys(talent);
    if (!keys.length) return false;
    const otherSelected = this._getSelectedTalentKeys(shell, { excludeSlotType: this._slotType });
    const owned = this._getOwnedTalentKeys(shell?.actor);
    return keys.some(key => otherSelected.has(key) || owned.has(key));
  }

  _buildCanonicalTalentSelection(talent) {
    if (!talent) return null;
    const repeatable = isRepeatableTalentEntry(talent);
    return {
      id: talent.id || talent._id,
      name: talent.name || '',
      type: talent.type || 'talent',
      description: talent.description || talent.system?.description || '',
      repeatable,
      system: {
        ...(talent.system || {}),
        ...(repeatable ? { repeatable: true } : {}),
      },
      img: talent.img || undefined,
      slotType: this._slotType,
      slotKey: this._slotKey(),
      stepId: this.descriptor?.stepId || this.descriptor?.id || null,
      source: this._slotType,
      treeId: this._selectedTreeId || talent.talent_tree || talent.system?.talent_tree || null,
    };
  }


  _emitTreeHydrationAudit(tree, talents = []) {
    const expectedNames = [
      ...(Array.isArray(tree?.talentNames) ? tree.talentNames : []),
      ...(Array.isArray(tree?.system?.talentNames) ? tree.system.talentNames : []),
    ].map(value => String(value ?? '').trim()).filter(Boolean);
    const expectedCount = Math.max(Number(tree?.talentCount) || 0, expectedNames.length);
    const resolvedNames = new Set((talents || []).map(talent => normalizeTalentAuditName(talent?.name || talent?.id || talent?._id)).filter(Boolean));
    const missingExpectedNames = expectedNames.filter(name => !resolvedNames.has(normalizeTalentAuditName(name)));

    const shouldWarn = missingExpectedNames.length > 0 || (expectedCount > 0 && talents.length < expectedCount);
    const key = `${shouldWarn ? 'warn' : 'debug'}:${tree?.id || tree?.name}:${talents.length}:${missingExpectedNames.join('|')}`;
    if (talentStepHydrationAuditCache.has(key)) return;
    talentStepHydrationAuditCache.add(key);

    const payload = {
      treeId: tree?.id || null,
      treeName: tree?.name || null,
      expectedCount,
      expectedNames,
      resolvedCount: talents.length,
      resolvedTalentNames: talents.map(talent => talent?.name || talent?.id || '(unknown)'),
      missingExpectedNames,
    };

    if (shouldWarn) {
      SWSELogger.warn('[TalentStep] Talent tree hydration incomplete after membership resolution', payload);
    } else {
      emitTalentStepTrace('TREE_TALENT_HYDRATION_AUDIT', payload);
    }
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
    let talents = await getTalentMembership(tree);
    talents = HouseRuleTalentCombination.processBlockDeflectCombination(talents);

    // Diagnostic logging (once per tree enter)
    emitTalentStepTrace('TREE_TALENT_LOOKUP', {
      treeId: tree?.id || null,
      treeName: tree?.name || null,
      resolvedTalentNames: talents.map(t => t?.name || t?.id || '(unknown)'),
      talentCount: talents.length,
    });
    this._emitTreeHydrationAudit(tree, talents);

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
  _normalizeTalentLookupKey(value) {
    if (value === null || value === undefined) return '';
    const raw = typeof value === 'object'
      ? value.id || value._id || value.uuid || value.key || value.slug || value.name || value.label || ''
      : value;
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  _getTalentIdentityCandidates(talent) {
    if (!talent) return [];
    return [
      talent.id,
      talent._id,
      talent.uuid,
      talent.key,
      talent.slug,
      talent.name,
      talent.label,
      talent.system?.slug,
      talent.system?.key,
      talent.system?.id,
      talent.flags?.swse?.id,
    ].filter(Boolean);
  }

  _resolveTalentFocusId(talentId) {
    if (!talentId) return null;
    const directNode = this._graphData?.nodes?.get?.(talentId);
    const directTalent = directNode?.talent || directNode;
    const directId = this._getTalentIdentityCandidates(directTalent)[0];
    if (directId) return directId;

    const lookup = this._normalizeTalentLookupKey(talentId);
    for (const talent of this._selectedTreeTalents || []) {
      const match = this._getTalentIdentityCandidates(talent)
        .some(candidate => this._normalizeTalentLookupKey(candidate) === lookup);
      if (match) return this._getTalentIdentityCandidates(talent)[0] || talentId;
    }

    for (const [nodeId, node] of this._graphData?.nodes || []) {
      const talent = node?.talent || node;
      const match = [nodeId, ...(this._getTalentIdentityCandidates(talent))]
        .some(candidate => this._normalizeTalentLookupKey(candidate) === lookup);
      if (match) return this._getTalentIdentityCandidates(talent)[0] || nodeId;
    }

    return talentId;
  }

  /**
   * Get a talent by ID, graph node id, source id, slug, or name.
   */
  _getTalent(talentId) {
    if (!talentId) return null;
    const direct = TalentRegistry.getById?.(talentId) || TalentRegistry.getByName?.(talentId);
    if (direct) return direct;

    const graphNode = this._graphData?.nodes?.get?.(talentId);
    if (graphNode?.talent) return graphNode.talent;
    if (graphNode?.name) {
      const registryTalent = TalentRegistry.getByName?.(graphNode.name);
      if (registryTalent) return registryTalent;
      return graphNode.talent || graphNode;
    }

    const lookup = this._normalizeTalentLookupKey(talentId);
    for (const talent of this._selectedTreeTalents || []) {
      const match = this._getTalentIdentityCandidates(talent)
        .some(candidate => this._normalizeTalentLookupKey(candidate) === lookup);
      if (match) return talent;
    }

    for (const [, node] of this._graphData?.nodes || []) {
      const talent = node?.talent || node;
      const match = this._getTalentIdentityCandidates(talent)
        .some(candidate => this._normalizeTalentLookupKey(candidate) === lookup);
      if (match) return talent;
    }

    return null;
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

    // Droid degree trees are already handled by _getAvailableTrees as additive
    // authority. Do not re-filter here, or class trees disappear for droid heroes.

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
      allTrees: filteredTrees.map(tree => {
        const visual = this._getTreeVisualIdentity(tree);
        const nodeCount = tree.talentCount || (tree.talentNames || []).length || (tree.talentIds || []).length;
        const investmentCount = this._getTreeInvestmentCount(tree, committedTalents, context?.shell?.actor);
        const treeRecommendation = this._treeRecommendationById.get(tree.id) || this._treeRecommendationById.get(tree.name) || null;
        const isSuggested = !!treeRecommendation?.isTopSuggestion || this._suggestedTrees.some(s => s.id === tree.id);
        const cardSlotType = tree.category === 'droid' || tree.tags?.includes('class-only') ? 'class' : 'heroic';
        return {
          // Use canonical tree.id field (normalized trees always have this)
          id: tree.id,
          name: tree.name,
          summary: this._truncateDisplayText(this._getTreeDescription(tree) || `${tree.name} talent tree. Open the holomap to inspect legal talents and prerequisite paths.`, 160),
          // Prefer audited membership count when available; compendium talentIds may be stale.
          nodeCount,
          investmentCount,
          hasInvestment: investmentCount > 0,
          isSuggested,
          isFocused: tree.id === this._focusedTreeId,
          // Determine slot type from context or fallback (normalized trees don't have classRestricted)
          slotType: cardSlotType,
          slotTypeLabel: cardSlotType === 'class' ? 'Class' : 'Heroic',
          readinessLabel: treeRecommendation?.label || (isSuggested ? 'Mentor Fit' : (investmentCount > 0 ? 'Invested Path' : 'Available')),
          legalChoiceCount: treeRecommendation?.legalChoiceCount ?? null,
          recommendationRank: treeRecommendation?.rank || null,
          recommendationLabel: treeRecommendation?.label || '',
          recommendationReason: treeRecommendation?.reason || '',
          recommendationTalentName: treeRecommendation?.topTalentName || '',
          recommendationReasons: treeRecommendation?.reasons || [],
          visualKey: visual.key,
          visualIcon: visual.icon,
          visualKicker: visual.kicker,
          visualRole: visual.role,
          visualMotion: visual.motion,
          visualSignal: visual.signal,
          visualThemeClass: visual.themeClass,
        };
      }),
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

  async _loadTreeDescriptionFallbacks() {
    if (this._treeDescriptionFallbacks) return this._treeDescriptionFallbacks;
    try {
      const response = await fetch('/systems/foundryvtt-swse/data/talent-tree-descriptions.json');
      this._treeDescriptionFallbacks = response?.ok ? await response.json() : {};
    } catch (_err) {
      this._treeDescriptionFallbacks = {};
    }
    return this._treeDescriptionFallbacks;
  }

  _normalizeTalentTreeNameKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  _getTreeDescriptionFallback(tree) {
    const fallbacks = this._treeDescriptionFallbacks || {};
    const candidates = [tree?.name, tree?.id, tree?._id, tree?.slug, tree?.key]
      .map(value => String(value || '').trim())
      .filter(Boolean);
    for (const candidate of candidates) {
      if (fallbacks[candidate]) return fallbacks[candidate];
    }
    const normalizedCandidates = new Set(candidates.map(value => this._normalizeTalentTreeNameKey(value)));
    for (const [key, description] of Object.entries(fallbacks)) {
      if (normalizedCandidates.has(this._normalizeTalentTreeNameKey(key))) return description;
    }
    return '';
  }

  _getTreeDescription(tree) {
    return firstDisplayText(
      tree?.description,
      tree?.summary,
      tree?.system?.description,
      tree?.system?.summary,
      tree?.details,
      tree?.system?.details,
      this._getTreeDescriptionFallback(tree)
    );
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

  _truncateDisplayText(value, limit = 150) {
    const text = String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1)).trim()}…` : text;
  }

  _getTreeVisualIdentity(tree = {}) {
    const name = String(tree?.name || '').toLowerCase();
    const category = String(tree?.category || '').toLowerCase();
    const tags = Array.isArray(tree?.tags) ? tree.tags.map(t => String(t).toLowerCase()) : [];
    const source = `${name} ${category} ${tags.join(' ')}`;

    const makeTheme = (key, icon, kicker, role, motion, signal) => ({
      key,
      icon,
      kicker,
      role,
      motion,
      signal,
      themeClass: `talent-holomap-theme--${key}`,
      cardClass: `talent-tree-card--${key}`,
    });

    if (/sith|dark side|darkside|dark|rage|hatred|corruption|fear/.test(source)) {
      return makeTheme('sith', '◆', 'Holocron Channel', 'Aggression', 'Unstable pulse', 'CRIMSON / FRACTURE');
    }
    if (/jedi|lightsaber|force|adept|disciple|master|knight|light side|lightside|guardian|consular/.test(source)) {
      return makeTheme('jedi', '✦', 'Archive Channel', 'Force', 'Breathing aura', 'AZURE / HARMONIC');
    }
    if (/soldier|commando|weapon|armor|trooper|battle|combat|tactical|military|squad|elite/.test(source)) {
      return makeTheme('military', '⌖', 'Tactical Channel', 'Combat', 'Target sweep', 'AMBER / VECTOR');
    }
    if (/noble|leader|leadership|inspire|presence|influence|lineage|wealth|command/.test(source)) {
      return makeTheme('noble', '◇', 'Command Channel', 'Leadership', 'Regal shimmer', 'VIOLET / COURT');
    }
    if (/scoundrel|criminal|smuggler|fortune|gambler|sneak|trick|misfortune|outlaw/.test(source)) {
      return makeTheme('scoundrel', '◈', 'Shadow Channel', 'Cunning', 'Shadow drift', 'MAGENTA / CIPHER');
    }
    if (/scout|survival|exploration|fringer|pathfinder|outcast|awareness|evasion/.test(source)) {
      return makeTheme('scout', '△', 'Recon Channel', 'Exploration', 'Sensor ping', 'GREEN / RECON');
    }
    if (/droid|automaton|protocol|astromech|degree|mechanical|processor/.test(source)) {
      return makeTheme('droid', '⬡', 'Logic Channel', 'Systems', 'Diagnostic flicker', 'CYAN / LOGIC');
    }
    return makeTheme('default', '◇', 'Datapad Channel', 'Discipline', 'Datapad scan', 'CYAN / GENERAL');
  }

  _getMentorIdentity(shell) {
    const name = shell?.mentor?.name || shell?.mentor?.mentorId || 'Mentor';
    const id = shell?.mentor?.mentorId || shell?.mentor?.id || name;
    const key = String(`${id} ${name}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return { id, name, key };
  }

  _buildMentorTreeCommentary(tree = {}, shell = null, recommendation = null) {
    return buildTalentTreeMentorRead({
      tree,
      shell,
      visual: this._getTreeVisualIdentity(tree),
      recommendation,
    });
  }

  _getTreeInvestmentCount(tree, committedTalents = [], actor = null) {
    const treeKeys = new Set([tree?.id, tree?.name, tree?.sourceId].filter(Boolean).map(value => this._normalizeTalentKey(value)));
    let count = 0;

    for (const talent of committedTalents || []) {
      const talentTreeKey = this._normalizeTalentKey(talent?.treeId || talent?.system?.talent_tree || talent?.talent_tree || '');
      if (talentTreeKey && treeKeys.has(talentTreeKey)) count += 1;
    }

    // Actor-owned talents cannot always be mapped to a tree cheaply here, but when
    // canonical tree fields exist, include them to make the card readout useful.
    for (const item of actor?.items || []) {
      if (item?.type !== 'talent') continue;
      const itemTreeKey = this._normalizeTalentKey(item?.system?.talent_tree || item?.system?.treeId || item?.treeId || '');
      if (itemTreeKey && treeKeys.has(itemTreeKey)) count += 1;
    }

    return count;
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
      const chosenElsewhere = !!state.chosenElsewhere;
      const isActorOwned = !!state.actorOwned;
      const isOwned = !!state.owned || isSelected || chosenElsewhere || isActorOwned;
      const meetsPrereqs = state.legal !== false && !chosenElsewhere && !isActorOwned;
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
        chosenElsewhere,
        isActorOwned,
        meetsPrereqs,
        isSelectable: (meetsPrereqs || isSelected) && !chosenElsewhere && !isActorOwned,
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

  async _buildTalentRecommendationsForTree(shell, selectedTree, availableTalentRows = [], pendingAbilityData = {}) {
    const recommendationById = new Map();
    if (!selectedTree || !availableTalentRows.length) return recommendationById;

    try {
      const mode = shell?.mode || this.descriptor?.mode || 'chargen';
      const availableIds = new Set(availableTalentRows.map(row => row.id).filter(Boolean));
      const candidates = availableTalentRows
        .map(row => this._getTalent(row.id))
        .filter(Boolean)
        .map(talent => this._toSuggestionTalentCandidate(talent, selectedTree));

      if (!candidates.length) return recommendationById;

      const pendingData = this._buildTalentSuggestionPendingData(shell, [selectedTree]);
      Object.assign(pendingData, pendingAbilityData || {});
      pendingData.selectedTree = { id: selectedTree?.id || null, name: selectedTree?.name || null };
      pendingData.allowedTalentTrees = [selectedTree?.id, selectedTree?.sourceId, selectedTree?.name].filter(Boolean);

      const suggested = await SuggestionService.getSuggestions(shell?.actor, mode, {
        domain: 'talents',
        available: candidates,
        pendingData,
        focus: `talent-tree:${selectedTree?.id || selectedTree?.name}:talent-mode`,
        engineOptions: { includeFutureAvailability: false },
        persist: false,
      });

      const ranked = this._sortSuggestionResults((suggested || [])
        .filter(talent => this._getTalentIdentityKeys(talent).some(key => {
          for (const id of availableIds) {
            const source = this._getTalent(id);
            if (source && this._getTalentIdentityKeys(source).includes(key)) return true;
          }
          return availableIds.has(talent?.id) || availableIds.has(talent?._id) || availableIds.has(talent?.name);
        })));

      ranked.slice(0, Math.min(3, ranked.length)).forEach((talent, index) => {
        const originalRow = availableTalentRows.find(row => {
          if (row.id === talent?.id || row.id === talent?._id || row.id === talent?.name) return true;
          const source = this._getTalent(row.id);
          const rowKeys = source ? this._getTalentIdentityKeys(source) : [this._normalizeTalentKey(row.id), this._normalizeTalentKey(row.name)];
          return this._getTalentIdentityKeys(talent).some(key => rowKeys.includes(key));
        });
        if (!originalRow) return;

        const rank = index + 1;
        const reasons = this._extractSuggestionReasons(talent, [
          `${originalRow.name} is legal in ${selectedTree.name} right now.`,
          rank === 1 ? 'This is the strongest legal talent suggestion in the selected tree.' : 'This is a strong legal alternative in the selected tree.',
        ]);
        recommendationById.set(originalRow.id, {
          mode: 'talent',
          rank,
          tier: this._getSuggestionTier(talent),
          score: this._getSuggestionScalar(talent),
          label: this._getRecommendationLabel(talent, { rank }),
          reason: reasons[0] || `${originalRow.name} is a legal fit for this build.`,
          reasons,
          source: talent,
        });
      });
    } catch (err) {
      console.warn('[TalentStep] Talent recommendation mode failed:', err);
    }

    return recommendationById;
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
    const shell = context?.shell || null;
    const pendingAbilityData = this._buildPendingAbilityData(shell);
    const otherSelectedKeys = this._getSelectedTalentKeys(shell, { excludeSlotType: this._slotType });
    const ownedTalentKeys = this._getOwnedTalentKeys(shell?.actor);
    if (this._graphData?.nodes) {
      for (const [nodeId, node] of this._graphData.nodes) {
        const talent = node.talent;
        let prereqDetails = { legal: true, missing: [], blocking: [] };
        try {
          prereqDetails = await this._getPrerequisiteDetails(shell?.actor, talent, pendingAbilityData);
        } catch (_err) {
          prereqDetails = { legal: true, missing: [], blocking: [] };
        }
        const identityKeys = this._getTalentIdentityKeys(talent);
        const isSelected = nodeId === this._selectedTalentId;
        const repeatable = isRepeatableTalentEntry(talent);
        const chosenElsewhere = !repeatable && identityKeys.some(key => otherSelectedKeys.has(key));
        const isActorOwned = !repeatable && identityKeys.some(key => ownedTalentKeys.has(key));
        const isOwned = isSelected || chosenElsewhere || isActorOwned;
        nodeStates[nodeId] = {
          legal: prereqDetails.legal !== false && !chosenElsewhere && !isActorOwned,
          owned: isOwned,
          selected: isSelected,
          repeatable,
          chosenElsewhere,
          actorOwned: isActorOwned,
          suggested: false,
          missing: chosenElsewhere ? ['Already selected in another talent slot.'] : (isActorOwned ? ['Already known.'] : (prereqDetails.missing || [])),
          blocking: chosenElsewhere ? ['Already selected in another talent slot.'] : (isActorOwned ? ['Already known.'] : (prereqDetails.blocking || [])),
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

    const talentRows = this._buildTalentRows(nodeStates);
    const availableTalents = talentRows.filter(row => row.isSelectable);
    const lockedTalents = talentRows.filter(row => !row.isSelectable);
    const selectedTalent = talentRows.find(row => row.isSelected) || null;
    const visual = this._getTreeVisualIdentity(selectedTree);
    const talentRecommendations = await this._buildTalentRecommendationsForTree(shell, selectedTree, availableTalents, pendingAbilityData);
    this._talentRecommendationById = talentRecommendations;

    for (const row of availableTalents) {
      const recommendation = talentRecommendations.get(row.id);
      if (!recommendation) continue;
      row.isSuggestedTalent = true;
      row.recommendation = recommendation;
      row.recommendationRank = recommendation.rank;
      row.recommendationLabel = recommendation.label;
      row.recommendationReason = recommendation.reason;
      row.recommendationReasons = recommendation.reasons || [];
      if (nodeStates[row.id]) {
        nodeStates[row.id].suggested = true;
        nodeStates[row.id].recommendationRank = recommendation.rank;
        nodeStates[row.id].recommendationLabel = recommendation.label;
        nodeStates[row.id].recommendationReason = recommendation.reason;
      }
    }

    availableTalents.sort((left, right) => {
      const leftRank = left.recommendationRank || 999;
      const rightRank = right.recommendationRank || 999;
      if (leftRank !== rightRank) return leftRank - rightRank;
      if (left.isSelected !== right.isSelected) return left.isSelected ? -1 : 1;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });

    this._lastGraphNodeStates = nodeStates;
    const recommendedTalentCount = talentRecommendations.size;

    emitTalentStepTrace('GRAPH_DATA_READY', {
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree?.name || null,
      nodeCount: this._graphData?.nodes?.size || 0,
      edgeCount: this._graphData?.edges?.length || 0,
      focusedTalentId: this._focusedTalentId,
      selectedTalentId: this._selectedTalentId,
      availableCount: availableTalents.length,
      lockedCount: lockedTalents.length,
      recommendedTalentCount,
      viewMode: this._viewMode,
    });

    return {
      stage: 'graph',
      selectedTreeId: this._selectedTreeId,
      selectedTreeName: selectedTree.name,
      visualKey: visual.key,
      visualIcon: visual.icon,
      visualKicker: visual.kicker,
      visualRole: visual.role,
      visualMotion: visual.motion,
      visualSignal: visual.signal,
      visualThemeClass: visual.themeClass,
      nodeStates,
      graphData: this._graphData,
      orderedSelections,
      viewMode: this._viewMode,
      availableTalents,
      lockedTalents,
      lockedTalentCount: lockedTalents.length,
      selectedTalent,
      recommendedTalentCount,
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
      const tree = this._focusedTreeId ? this._getTree(this._focusedTreeId) : null;
      if (!tree) {
        emitTalentStepTrace('DETAILS_EMPTY', {
          reason: 'browser-stage-no-focused-tree',
          focusedTreeId: this._focusedTreeId,
          selectedTreeId: this._selectedTreeId,
        });
        return this.renderDetailsPanelEmptyState();
      }

      const visual = this._getTreeVisualIdentity(tree);
      const committedTalents = shell?.progressionSession?.draftSelections?.talents || [];
      const investmentCount = this._getTreeInvestmentCount(tree, committedTalents, shell?.actor);
      const nodeCount = tree.talentCount || (tree.talentNames || []).length || (tree.talentIds || []).length;
      const treeRecommendation = this._treeRecommendationById.get(tree.id) || this._treeRecommendationById.get(tree.name) || null;
      const isSuggested = !!treeRecommendation?.isTopSuggestion || this._suggestedTrees.some(s => s.id === tree.id);
      const cardSlotType = tree.category === 'droid' || tree.tags?.includes('class-only') ? 'class' : 'heroic';
      const mentorRead = this._buildMentorTreeCommentary(tree, shell, treeRecommendation);
      return {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/talent-tree-details.hbs',
        data: {
          tree,
          treeId: tree.id,
          treeName: tree.name,
          summary: this._truncateDisplayText(this._getTreeDescription(tree) || `${tree.name} talent tree. Open the holomap to inspect legal talents and prerequisite paths.`, 320),
          nodeCount,
          investmentCount,
          isSuggested,
          legalChoiceCount: treeRecommendation?.legalChoiceCount ?? null,
          recommendationLabel: treeRecommendation?.label || '',
          recommendationReason: treeRecommendation?.reason || '',
          recommendationTalentName: treeRecommendation?.topTalentName || '',
          recommendationReasons: treeRecommendation?.reasons || [],
          mentorRead,
          slotTypeLabel: cardSlotType === 'class' ? 'Class' : 'Heroic',
          visualKey: visual.key,
          visualIcon: visual.icon,
          visualRole: visual.role,
          visualMotion: visual.motion,
          visualSignal: visual.signal,
          visualThemeClass: visual.themeClass,
          statusText: isSuggested
            ? `Your mentor currently sees this tree as a strong fit. ${treeRecommendation?.topTalentName ? `${treeRecommendation.topTalentName} is the cleanest legal next pick from this tree.` : ''}`
            : (investmentCount > 0
              ? 'You already have momentum in this discipline. Opening the holomap will show the next legal branches.'
              : 'This discipline is available. Opening the holomap will reveal legal activations and locked future branches.'),
        },
      };
    }

    const focusId = this._focusedTalentId || focusedItem?.id || focusedItem?._id || focusedItem?.name || null;
    if (!focusId && !this._focusedTalentItem) {
      emitTalentStepTrace('DETAILS_EMPTY', {
        reason: 'no-focused-talent-id',
        selectedTreeId: this._selectedTreeId,
        selectedTalentId: this._selectedTalentId,
      });
      return this.renderDetailsPanelEmptyState();
    }

    const talent = this._getTalent(focusId) || this._focusedTalentItem || focusedItem;
    if (!talent) {
      emitTalentStepTrace('DETAILS_EMPTY', {
        reason: 'focused-talent-not-found',
        focusedTalentId: focusId,
        selectedTreeId: this._selectedTreeId,
      });
      console.warn(`[TalentStep] Focused talent not found: ${this._focusedTalentId}`);
      return this.renderDetailsPanelEmptyState();
    }

    const talentId = this._getTalentId(talent);
    const isSelected = talentId === this._selectedTalentId;
    const isOwned = isSelected;
    const selectedTree = this._getTree(this._selectedTreeId);
    const visual = this._getTreeVisualIdentity(selectedTree || {});

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
    const talentRecommendation = this._talentRecommendationById.get(talentId)
      || this._talentRecommendationById.get(focusId)
      || this._talentRecommendationById.get(talent?.name)
      || null;
    const treeRecommendation = this._treeRecommendationById.get(this._selectedTreeId) || this._treeRecommendationById.get(selectedTree?.name) || null;
    const recommendationText = talentRecommendation?.reason || '';
    const statusText = isSelected
      ? 'This talent is selected for the current slot.'
      : meetsPrereqs
        ? 'This talent is available now and can be chosen for the current slot.'
        : 'This talent is locked until its prerequisite path is complete.';
    const graphNode = (talentId ? this._graphData?.nodes?.get?.(talentId) : null)
      || (focusId ? this._graphData?.nodes?.get?.(focusId) : null)
      || null;
    const downstreamUnlocks = (graphNode?.dependents || [])
      .map(id => this._graphData?.nodes?.get?.(id))
      .filter(Boolean)
      .map(node => ({ id: node.id, name: node.name || node.id }))
      .slice(0, 6);

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
        visualKey: visual.key,
        visualIcon: visual.icon,
        visualRole: visual.role,
        visualMotion: visual.motion,
        visualThemeClass: visual.themeClass,
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
        recommendation: talentRecommendation,
        isSuggestedTalent: !!talentRecommendation,
        recommendationLabel: talentRecommendation?.label || '',
        recommendationRank: talentRecommendation?.rank || null,
        recommendationReasons: talentRecommendation?.reasons || [],
        statusText,
        downstreamUnlocks,
        metadataTags: normalized.metadataTags || [],
        hasMentorProse: !!normalized.fallbacks?.hasMentorProse,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Focus/Commit
  // ---------------------------------------------------------------------------

  _buildFocusedTalentPayload(talentId) {
    const resolvedId = this._resolveTalentFocusId(talentId);
    const talent = this._getTalent(resolvedId);
    if (!talent) return resolvedId ? { id: resolvedId, _id: resolvedId } : null;
    return {
      ...talent,
      id: talent.id || talent._id || resolvedId,
      _id: talent._id || talent.id || resolvedId,
    };
  }

  async onItemFocused(item, shell = null) {
    if (this._stage === 'browser') {
      const treeId = item?.id || item?._id || item?.treeId || item;
      if (treeId) this._focusedTreeId = treeId;
      return;
    }

    // Graph nodes can report a graph node id, a talent id, a name, or a payload.
    // Resolve all of them into both a stable focus id and a concrete item so the
    // details rail hydrates from map-node clicks exactly like list clicks.
    const incomingId = item?.id || item?._id || item?.uuid || item?.name || item;
    const resolvedId = this._resolveTalentFocusId(incomingId);
    const focusedTalent = this._getTalent(resolvedId) || this._getTalent(incomingId) || this._buildFocusedTalentPayload(resolvedId);

    this._focusedTalentId = this._getTalentId(focusedTalent) || resolvedId || incomingId || null;
    this._focusedTalentItem = focusedTalent || null;
    shell?.setFocusedItem?.(focusedTalent || (this._focusedTalentId ? { id: this._focusedTalentId, _id: this._focusedTalentId } : null));

    emitTalentStepTrace('ITEM_FOCUSED', {
      stage: this._stage,
      incomingId,
      resolvedId,
      focusedTalentId: this._focusedTalentId,
      focusedTalentName: focusedTalent?.name || null,
    });
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
      const talentId = this._resolveTalentFocusId(item);
      const talent = this._getTalent(talentId);
      emitTalentStepTrace('ITEM_COMMIT_TALENT_START', {
        stage: this._stage,
        talentId,
        talentName: talent?.name || null,
      });

      const currentSelections = this._getCommittedTalentSelections(shell);
      const currentSlotKey = this._slotKey();
      const slotSelections = currentSelections.filter(entry => {
        const entryKey = entry?.slotKey || entry?.stepId || entry?.sourceStep || entry?.source;
        if (entryKey) return String(entryKey) !== currentSlotKey;
        return entry?.slotType !== this._slotType;
      });
      const isTogglingOff = this._selectedTalentId === talentId;

      if (!isTogglingOff && this._isTalentAlreadyTakenElsewhere(talent, shell)) {
        SWSELogger.warn('[TalentStep] Duplicate talent selection blocked', {
          talentId,
          talentName: talent?.name || null,
          slotType: this._slotType,
        });
        ui?.notifications?.warn?.(`${talent?.name || 'That talent'} is already selected or known.`);
        this._focusedTalentId = talentId;
        this._renderPreservingScroll(shell);
        return;
      }

      let nextSelection = (!isTogglingOff && talent) ? this._buildCanonicalTalentSelection(talent) : null;
      if (nextSelection) {
        const choiceMeta = FeatChoiceResolver.getChoiceMeta(talent);
        const choiceSource = FeatChoiceResolver.inferChoiceSource(talent);
        if (choiceMeta?.required && choiceSource !== 'grantPool') {
          const pendingForChoice = this._buildPendingAbilityData(shell);
          pendingForChoice.selectedTalents = currentSelections;
          const selectedChoice = await FeatChoiceDialog.prompt(shell.actor, talent, {
            title: `Choose: ${talent.name}`,
            context: { pending: pendingForChoice }
          });
          if (!selectedChoice) {
            emitTalentStepTrace('ITEM_COMMIT_CANCELLED_FOR_CHOICE', {
              talentId,
              talentName: talent?.name || null,
              choiceKind: choiceMeta?.choiceKind || null,
            });
            return;
          }

          const choiceValidation = await FeatChoiceResolver.validateSelectedChoice(shell.actor, talent, selectedChoice, { pending: pendingForChoice });
          if (!choiceValidation.valid) {
            ui.notifications?.warn?.(choiceValidation.errors?.join(' ') || 'That talent choice is not currently legal.');
            emitTalentStepTrace('ITEM_COMMIT_REJECTED_FOR_CHOICE_LEGALITY', {
              talentId,
              talentName: talent?.name || null,
              choiceKind: choiceMeta?.choiceKind || null,
              errors: choiceValidation.errors || [],
            });
            return;
          }

          const candidateWithChoice = {
            ...talent,
            system: {
              ...(talent.system || {}),
              selectedChoice
            }
          };
          const choiceAwareAssessment = AbilityEngine.evaluateAcquisition(shell.actor, candidateWithChoice, {
            ...pendingForChoice,
            selectedChoice,
            candidateChoice: selectedChoice
          });
          if (choiceAwareAssessment?.legal === false) {
            const reasons = choiceAwareAssessment?.blockingReasons || choiceAwareAssessment?.missingPrereqs || ['Talent prerequisites are not met for that selected choice.'];
            ui.notifications?.warn?.(reasons.join(' '));
            emitTalentStepTrace('ITEM_COMMIT_REJECTED_FOR_PREREQ_LEGALITY', {
              talentId,
              talentName: talent?.name || null,
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

      this._selectedTalentId = nextSelection?.id || null;

      const expectedSlots = new Set([currentSlotKey, ...slotSelections.map(entry => entry?.slotKey || entry?.stepId || entry?.sourceStep || entry?.source || entry?.slotType).filter(Boolean).map(String)]);
      const cappedSelections = nextSelections.filter((entry, index, list) => {
        const entryKey = String(entry?.slotKey || entry?.stepId || entry?.sourceStep || entry?.source || entry?.slotType || `legacy-${index}`);
        return list.findIndex(other => String(other?.slotKey || other?.stepId || other?.sourceStep || other?.source || other?.slotType || '') === entryKey) === index;
      }).slice(0, Math.max(1, expectedSlots.size));

      emitTalentStepTrace('ITEM_COMMIT_TALENT_RESULT', {
        selectedTalentId: this._selectedTalentId,
        talentId,
        totalSelections: cappedSelections.length,
      });

      await this._commitNormalized(shell, 'talents', cappedSelections);

      if (shell?.committedSelections && this.descriptor?.stepId) {
        shell.committedSelections.set(this.descriptor.stepId, nextSelection);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Mentor Integration
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    if (this._stage === 'graph' && this._talentRecommendationById?.size) {
      const talentSuggestions = Array.from(this._talentRecommendationById.values())
        .sort((left, right) => (left.rank || 999) - (right.rank || 999))
        .map(recommendation => ({
          ...(recommendation.source || {}),
          id: recommendation.source?.id || recommendation.source?._id || recommendation.source?.name,
          name: recommendation.source?.name || 'Suggested Talent',
          suggestion: {
            ...(recommendation.source?.suggestion || {}),
            mode: 'talent',
            tier: recommendation.tier,
            reason: recommendation.reason,
            reasons: recommendation.reasons,
            reasonBullets: recommendation.reasons,
          },
          reasonBullets: recommendation.reasons,
        }));

      await handleAskMentorWithPicker(shell.actor, 'general-talent', talentSuggestions, shell, {
        domain: 'talents',
        archetype: this._getTree(this._selectedTreeId)?.name || 'this talent tree',
        stepLabel: 'legal talents in this tree'
      }, async (selected) => {
        const id = selected?.id || selected?._id || selected?.name;
        if (!id) return;
        this._focusedTalentId = id;
        await this.onItemCommitted(id, shell);
        this._renderPreservingScroll(shell);
      });
      return;
    }

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
        this._renderPreservingScroll(shell);
      });
      return;
    }
    await handleAskMentor(shell.actor, 'general-talent', shell);
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'general-talent', shell);
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

  getRemainingPicks() {
    const selected = this._selectedTalentId ? 1 : 0;
    return [{
      label: this._slotType === 'class' ? 'Class Talent' : 'Heroic Talent',
      count: Math.max(0, 1 - selected),
      total: 1,
      selected,
      isWarning: selected === 0,
    }];
  }

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
