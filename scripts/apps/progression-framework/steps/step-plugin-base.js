/**
 * ProgressionStepPlugin — abstract base class for all step plugins.
 *
 * Each step in the progression shell is backed by a ProgressionStepPlugin
 * subclass. The shell calls lifecycle hooks and delegates all step-specific
 * rendering, validation, and mentor context to the plugin.
 *
 * OWNERSHIP CONTRACT:
 * - Progression legality         → Rules engine only
 * - Prerequisite checks          → Rules engine validators
 * - Mutation application         → Governance / ActorEngine
 * - Selection state              → Step plugin (this class)
 * - UI rendering                 → Step plugin + shell template
 * - Suggestion ranking           → SuggestionEngineCoordinator (called by plugin)
 * - Mentor dialogue              → MentorRail + plugin's getMentorContext()
 * - Validation display           → Shell action footer (data from plugin)
 * - Modal display                → Shell modal host
 * - Step discovery               → Progression engine (queried by shell)
 */

import { ProgressionReconciler } from '../shell/progression-reconciler.js';
import { ActiveStepComputer } from '../shell/active-step-computer.js';
import { ProjectionEngine } from '../shell/projection-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Sentinel error thrown by all unimplemented methods.
 */
class NotImplementedError extends Error {
  constructor(methodName, pluginClass) {
    super(`${pluginClass}.${methodName}() is not implemented`);
    this.name = 'NotImplementedError';
  }
}

export class ProgressionStepPlugin {
  constructor(descriptor) {
    if (!descriptor) throw new Error('ProgressionStepPlugin requires a StepDescriptor');
    this._descriptor = descriptor;
  }

  // ---------------------------------------------------------------------------
  // Identity (from StepDescriptor)
  // ---------------------------------------------------------------------------

  /** @returns {import('./step-descriptor.js').StepDescriptor} */
  get descriptor() {
    return this._descriptor;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Called when the shell navigates TO this step.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onStepEnter(shell) {
    // Default: no-op. Subclasses may load data, update mentor, etc.
  }

  /**
   * Called when the shell navigates AWAY from this step.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onStepExit(shell) {
    // Default: no-op. Subclasses may clean up state.
  }

  /**
   * Called when async data is available for this step.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onDataReady(shell) {
    // Default: no-op. Subclasses load lists, populate options, etc.
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  /**
   * Return data needed by the work-surface template.
   * @param {Object} context - Shell context
   * @returns {Promise<Object>}
   */
  async getStepData(context) {
    throw new NotImplementedError('getStepData', this.constructor.name);
  }

  /**
   * Return current selection state for this step.
   * @returns {{ selected: string[], count: number, isComplete: boolean }}
   */
  getSelection() {
    throw new NotImplementedError('getSelection', this.constructor.name);
  }

  /**
   * Called when a user focuses an item (single click — details panel updates, no commit).
   * @param {string} itemId
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onItemFocused(itemId, shell) {
    // Default: no-op. Subclasses update focusedItem on shell.
  }

  /**
   * Called when a user hovers over an item (visual polish only — no commit, no details update).
   * @param {string} itemId
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onItemHovered(itemId, shell) {
    // Default: no-op. Subclasses may trigger lightweight mentor flavor.
  }

  /**
   * Called when a user commits an item (Choose button or footer Next/Confirm).
   * This is the ONLY way to commit — single click and hover must never commit.
   * @param {string} itemId
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onItemCommitted(itemId, shell) {
    throw new NotImplementedError('onItemCommitted', this.constructor.name);
  }

  /**
   * Called when a user deselects an item.
   * @param {string} itemId
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onItemDeselected(itemId, shell) {
    // Default: no-op.
  }

  // ---------------------------------------------------------------------------
  // Validation (data from engine validators — plugin does NOT own rules)
  // ---------------------------------------------------------------------------

  /**
   * Run engine validators and return result.
   * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
   */
  validate() {
    throw new NotImplementedError('validate', this.constructor.name);
  }

  /**
   * Return blocking issues that prevent advancing to the next step.
   * @returns {string[]}
   */
  getBlockingIssues() {
    throw new NotImplementedError('getBlockingIssues', this.constructor.name);
  }

  /**
   * Return non-blocking warnings to display in the footer.
   * @returns {string[]}
   */
  getWarnings() {
    return [];
  }

  /**
   * PHASE 3 UX: Return user-friendly explanation when step is blocked.
   * Provides specific, actionable reason why Next button is disabled.
   * Examples: "Select 1 more Talent to continue", "Resolve errors before continuing"
   * @returns {string|null} Explanation text, or null if no specific explanation
   */
  getBlockerExplanation() {
    // Default: return null (no specific explanation)
    // Subclasses should override to provide specific, actionable messages
    return null;
  }

  /**
   * Return remaining pick counts for the footer center display.
   * Returns an array to support dual talent counts (heroic + class).
   * @returns {Array<{ label: string, count: number, isWarning: boolean }>}
   */
  getRemainingPicks() {
    return [];
  }

  // ---------------------------------------------------------------------------
  // UI Region Content
  // ---------------------------------------------------------------------------

  /**
   * Return template spec for the summary panel (left column).
   * Override in subclasses to provide build-summary context.
   * Return null to leave the panel empty (default behavior).
   * @param {Object} context - Shell context
   * @returns {{ template: string, data: Object } | null}
   */
  renderSummaryPanel(context) {
    return null;
  }

  /**
   * Return template spec for the work-surface region.
   * @param {Object} stepData - Data from getStepData()
   * @returns {{ template: string, data: Object } | null}
   */
  renderWorkSurface(stepData) {
    throw new NotImplementedError('renderWorkSurface', this.constructor.name);
  }

  /**
   * Return template spec for the details panel when an item is focused.
   * Must always return a template — return renderDetailsPanelEmptyState() when focusedItem is null.
   * @param {Object|null} focusedItem
   * @returns {{ template: string, data: Object }}
   */
  renderDetailsPanel(focusedItem) {
    if (!focusedItem) return this.renderDetailsPanelEmptyState();
    throw new NotImplementedError('renderDetailsPanel', this.constructor.name);
  }

  /**
   * Return empty-state template spec for the details panel.
   * Called when nothing is focused. Must always return a valid template.
   * @returns {{ template: string, data: Object }}
   */
  renderDetailsPanelEmptyState() {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: {
        message: 'Select an item to see details.',
        icon: this._descriptor.icon,
      },
    };
  }

  /**
   * Return utility bar configuration for this step.
   * Must always return a config — never null.
   * @returns {import('../shell/utility-bar.js').UtilityBarConfig}
   */
  getUtilityBarConfig() {
    return { mode: 'minimal' };
  }

  /**
   * Return the utility bar display mode for this step.
   * @returns {'rich' | 'compact' | 'minimal' | 'summary'}
   */
  getUtilityBarMode() {
    return 'minimal';
  }

  /**
   * Return footer overrides for this step, or null to use shell defaults.
   * @returns {{ nextLabel?: string, confirmLabel?: string } | null}
   */
  getFooterConfig() {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Mentor
  // ---------------------------------------------------------------------------

  /**
   * Return mentor guidance text for this step (spoken on step enter via AurebeshTranslator).
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {string}
   */
  getMentorContext(shell) {
    return '';
  }

  /**
   * Called when the user clicks "Ask Mentor".
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onAskMentor(shell) {
    // Default: no-op. Subclasses open suggestion modal or speak guidance.
  }

  /**
   * Return mentor interaction mode for this step.
   * - 'context-only': mentor speaks via dialogue box (AurebeshTranslator)
   * - 'interactive': opens suggestion modal (feat/talent steps)
   * @returns {'context-only' | 'interactive'}
   */
  getMentorMode() {
    return 'context-only';
  }

  /**
   * Get the current global validation state for this build.
   * Phase 2: Global Validation - use this in steps that need to check build coherence.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {{ isValid: boolean, errors: string[], warnings: string[], conflicts: string[], suggestions: string[] }}
   */
  getGlobalValidation(shell) {
    if (!shell?.validateBuild) return { isValid: true, errors: [], warnings: [], conflicts: [], suggestions: [] };
    return shell.validateBuild();
  }

  // ---------------------------------------------------------------------------
  // Post-Render Lifecycle (Wiring fine-grained DOM handlers)
  // ---------------------------------------------------------------------------

  /**
   * Called by shell._onRender() after every render with the work-surface element.
   * Use to wire fine-grained DOM event handlers (e.g. Near-Human builder controls).
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @param {HTMLElement} workSurfaceEl
   * @returns {Promise<void>}
   */
  async afterRender(shell, workSurfaceEl) {
    // Default: no-op
  }

  // ---------------------------------------------------------------------------
  // Mode Awareness (Phase 6)
  // ---------------------------------------------------------------------------

  /**
   * Check if this step is running in a specific mode.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @param {'chargen' | 'levelup'} mode
   * @returns {boolean}
   */
  isMode(shell, mode) {
    return shell?.mode === mode;
  }

  /**
   * Check if this step is running in chargen mode.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {boolean}
   */
  isChargen(shell) {
    return this.isMode(shell, 'chargen');
  }

  /**
   * Check if this step is running in levelup mode.
   * @param {import('../shell/progression-framework/shell').ProgressionShell} shell
   * @returns {boolean}
   */
  isLevelup(shell) {
    return this.isMode(shell, 'levelup');
  }

  // ---------------------------------------------------------------------------
  // Suggestion Display (Phase 7)
  // ---------------------------------------------------------------------------

  /**
   * Format suggestion data for display in UI.
   * Converts suggestion array to a Set of IDs and metadata object.
   * Includes confidence information for each suggestion.
   *
   * @param {Array} suggestionsArray - Array of suggestion objects from SuggestionService
   * @returns {{ suggestedIds: Set<string>, hasSuggestions: boolean, suggestions: Array, confidenceMap: Map }}
   */
  formatSuggestionsForDisplay(suggestionsArray = []) {
    const suggestedIds = new Set((suggestionsArray || []).map(s => s.id || s));

    // Build confidence map for display (id → confidence info)
    const confidenceMap = new Map();
    (suggestionsArray || []).forEach(s => {
      const confidence = s.suggestion?.confidence || 0.5;
      const confidencePercent = Math.round(confidence * 100);
      confidenceMap.set(s.id || s, {
        confidence,
        confidencePercent,
        confidenceLabel: `${confidencePercent}% match`,
        confidenceLevel: this._getConfidenceLevel(confidence) // 'high', 'medium', 'low'
      });
    });

    return {
      suggestedIds,
      hasSuggestions: suggestedIds.size > 0,
      suggestions: suggestionsArray || [],
      confidenceMap,
    };
  }

  /**
   * Get confidence level label from percentage.
   * @private
   * @param {number} confidence - Confidence value 0.0-1.0
   * @returns {string} 'high', 'medium', or 'low'
   */
  _getConfidenceLevel(confidence) {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Check if an item is suggested.
   * Useful in formatting methods to add suggestion markers.
   *
   * @param {string} itemId - The item ID to check
   * @param {Set<string>} suggestedIds - Set of suggested item IDs
   * @returns {boolean}
   */
  isSuggestedItem(itemId, suggestedIds = new Set()) {
    return suggestedIds.has(itemId);
  }

  // ---------------------------------------------------------------------------
  // PHASE 1: Normalized commit helpers
  // ---------------------------------------------------------------------------

  /**
   * Commit a normalized selection to the progression session.
   *
   * PHASE 1: This is the recommended API for steps to commit selections.
   * Writes to progressionSession.draftSelections with validation.
   *
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @param {string} selectionKey - Canonical key (species, class, feats, etc.)
   * @param {*} normalizedValue - Pre-normalized value matching canonical schema
   * @returns {boolean} true if successful
   *
   * Usage:
   *   this._commitNormalized(shell, 'species', normalizedSpeciesObject);
   *   this._commitNormalized(shell, 'feats', normalizedFeatsArray);
   */
  async _commitNormalized(shell, selectionKey, normalizedValue) {
    if (!shell?.progressionSession) {
      swseLogger.warn(
        `[${this.constructor.name}] No progressionSession available for commit`
      );
      return false;
    }

    try {
      const nodeId = this.descriptor.stepId;
      const success = shell.progressionSession.commitSelection(
        nodeId,
        selectionKey,
        normalizedValue
      );

      if (!success) {
        return false;
      }

      // Also update buildIntent for backward compatibility
      if (shell.buildIntent) {
        shell.buildIntent.commitSelection(nodeId, selectionKey, normalizedValue);
      }

      // Also update committedSelections for backward compatibility during migration
      // Store the normalized value directly so legacy readers can consume it without unwrapping.
      if (shell.committedSelections) {
        shell.committedSelections.set(selectionKey, normalizedValue);
      }

      // PHASE 2: Trigger post-commit reconciliation
      // This invalidates/dirtifies affected downstream nodes
      try {
        const reconciler = new ProgressionReconciler();
        const computer = new ActiveStepComputer();
        const mode = shell.mode || 'chargen';
        const subtype = shell.actor?.type === 'npc' ? 'npc' : 'actor';

        const reconciliationReport = await reconciler.reconcileAfterCommit(
          nodeId,
          shell.actor,
          shell.progressionSession,
          {
            activeStepComputer: computer,
            currentStepId: shell.steps[shell.currentStepIndex]?.stepId,
            mode,
            subtype,
          }
        );

        if (reconciliationReport.actionsTaken.length > 0) {
          swseLogger.log('[ProgressionStepPlugin] Post-commit reconciliation:', reconciliationReport);
        }
      } catch (reconcileErr) {
        swseLogger.error(
          '[ProgressionStepPlugin] Error during post-commit reconciliation:',
          reconcileErr
        );
        // Don't fail the commit if reconciliation fails
      }

      // PHASE 3: Build projected character from selections
      // This derives what the character looks like with current selections applied
      try {
        const projection = ProjectionEngine.buildProjection(
          shell.progressionSession,
          shell.actor
        );
        // Store in session for access by summary and other steps
        shell.progressionSession.currentProjection = projection;
        swseLogger.debug('[ProgressionStepPlugin] Projection rebuilt:', {
          hasIdentity: !!projection?.identity?.species,
          skillsCount: projection?.skills?.trained?.length || 0,
        });
      } catch (projErr) {
        swseLogger.error(
          '[ProgressionStepPlugin] Error building projection:',
          projErr
        );
        // Don't fail the commit if projection building fails
      }

      return true;
    } catch (err) {
      swseLogger.error('[ProgressionStepPlugin] Error during commit:', err);
      return false;
    }
  }
}
